# Fix Award Function Error 🔧

## Error Details
```
❌ Award RZC error: Object
awardRZCTokens@supabaseService.ts:1208
```

This error occurs when the `award_rzc_tokens` database function either:
1. Doesn't exist in your Supabase database
2. Has incorrect permissions
3. Has a different signature than expected

---

## Quick Fix: Direct SQL Claim (Recommended) ⚡

Use this method to claim your 50 RZC immediately without relying on the function:

### Run this in Supabase SQL Editor:

```sql
-- Update balance
UPDATE wallet_users
SET 
  rzc_balance = rzc_balance + 50,
  updated_at = NOW()
WHERE id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641';

-- Insert transaction record
INSERT INTO wallet_rzc_transactions (
  user_id,
  type,
  amount,
  balance_after,
  description,
  metadata,
  created_at
)
SELECT 
  '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'::uuid,
  'referral_bonus',
  50,
  rzc_balance,
  'Referral bonus - retroactive claim',
  jsonb_build_object(
    'referred_user_id', 'ce852b0e-a3cb-468b-9c85-5bb4a23e0f94',
    'retroactive', true
  ),
  NOW()
FROM wallet_users
WHERE id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641';

-- Update referral earnings
UPDATE wallet_referrals
SET 
  total_earned = total_earned + 50,
  updated_at = NOW()
WHERE user_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641';
```

**This will:**
- Add 50 RZC to your balance
- Create a transaction record
- Update your referral earnings
- Work without any database functions

---

## Long-term Fix: Create the Database Function

### Step 1: Check if function exists

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'award_rzc_tokens'
  AND routine_schema = 'public';
```

If it returns no rows, the function doesn't exist.

### Step 2: Create the function

```sql
CREATE OR REPLACE FUNCTION award_rzc_tokens(
  p_user_id UUID,
  p_amount NUMERIC,
  p_type TEXT,
  p_description TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  -- Update user's RZC balance
  UPDATE wallet_users
  SET 
    rzc_balance = rzc_balance + p_amount,
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING rzc_balance INTO v_new_balance;

  -- Check if user exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- Insert transaction record
  INSERT INTO wallet_rzc_transactions (
    user_id,
    type,
    amount,
    balance_after,
    description,
    metadata,
    created_at
  ) VALUES (
    p_user_id,
    p_type,
    p_amount,
    v_new_balance,
    p_description,
    p_metadata,
    NOW()
  );

  -- Update referral earnings if it's a referral bonus
  IF p_type = 'referral_bonus' THEN
    UPDATE wallet_referrals
    SET 
      total_earned = total_earned + p_amount,
      updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;

  RAISE NOTICE 'Awarded % RZC to user %. New balance: %', p_amount, p_user_id, v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION award_rzc_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION award_rzc_tokens TO anon;
```

### Step 3: Test the function

```sql
SELECT award_rzc_tokens(
  '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'::uuid,
  50,
  'referral_bonus',
  'Test referral bonus',
  jsonb_build_object('test', true)
);
```

---

## Code Fix Applied ✅

I've already updated `services/supabaseService.ts` to provide better error messages:

```typescript
} catch (error: any) {
  console.error('❌ Award RZC error:', error);
  const errorMessage = error?.message || error?.error_description || error?.hint || JSON.stringify(error);
  return { success: false, error: errorMessage };
}
```

This will now show the actual error message instead of just "Object".

---

## What to Do Now

### Option 1: Quick Claim (Recommended)
1. Open Supabase SQL Editor
2. Copy the "Quick Fix" SQL from above
3. Run it
4. Your balance will increase by 50 RZC immediately

### Option 2: Fix Function + Claim
1. Run Step 1 to check if function exists
2. If not, run Step 2 to create it
3. Run Step 3 to test it
4. Then use the prevention system normally

---

## Prevention System Status

The prevention system code is still valid and will work once the database function is created:

✅ Auto-claim on login (WalletContext.tsx)
✅ Manual claim UI (ClaimMissingRewards.tsx)
✅ Reward checker service (referralRewardChecker.ts)
✅ Better error handling (supabaseService.ts)

The only issue is the missing database function, which you can create using the SQL above.

---

## Files to Use

1. **DIRECT_CLAIM_50_RZC.sql** - Direct SQL claim (no function needed)
2. **check_award_function.sql** - Check and create the function
3. **FIX_AWARD_FUNCTION_ERROR.md** - This guide

---

## Summary

**Problem:** `award_rzc_tokens` database function doesn't exist or has wrong permissions

**Quick Solution:** Use direct SQL to claim your 50 RZC (see "Quick Fix" above)

**Long-term Solution:** Create the database function using the SQL provided

**Status:** Code is fixed, just need to run SQL queries

Claim your 50 RZC now using the direct SQL method! 🚀
