# Enable Automated Reward System 🤖

## Current Status: ❌ NOT AUTOMATED

The prevention system code is complete, but automation won't work until you create the `award_rzc_tokens` database function.

---

## Why It's Not Automated

The error you saw:
```
❌ Award RZC error: Object
awardRZCTokens@supabaseService.ts:1208
```

This happens because:
1. Your code calls `award_rzc_tokens` database function
2. The function doesn't exist in Supabase
3. Supabase returns an error
4. All automated rewards fail

---

## What's Already Coded (But Not Working Yet)

### ✅ Auto-Claim on Login
**File:** `context/WalletContext.tsx` (lines 170-185)
- Checks for missing bonuses when you log in
- Automatically claims them
- **Status:** Code ready, but needs database function

### ✅ Auto-Award on Signup
**File:** `pages/CreateWallet.tsx` (lines 189-197)
- Awards 50 RZC when someone uses your referral code
- Awards milestone bonuses at 10, 50, 100 referrals
- **Status:** Code ready, but needs database function

### ✅ Manual Claim UI
**File:** `components/ClaimMissingRewards.tsx`
- Shows alert if rewards are missing
- One-click claim button
- **Status:** Code ready, but needs database function

### ✅ Signup Bonus
**File:** `pages/CreateWallet.tsx` (lines 159-166)
- Awards 100 RZC to new users
- **Status:** Code ready, but needs database function

---

## Enable Automation (3 Steps - 2 Minutes)

### Step 1: Create the Database Function

Open Supabase SQL Editor and run this:

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
GRANT EXECUTE ON FUNCTION award_rzc_tokens TO service_role;
```

### Step 2: Test the Function

```sql
-- Test with 1 RZC
SELECT award_rzc_tokens(
  '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'::uuid,
  1,
  'test_bonus',
  'Test automated system',
  jsonb_build_object('test', true)
);

-- Verify it worked
SELECT rzc_balance FROM wallet_users 
WHERE id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641';
```

If you see your balance increased by 1, it's working! ✅

### Step 3: Claim Your Missing 50 RZC

```sql
SELECT award_rzc_tokens(
  '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'::uuid,
  50,
  'referral_bonus',
  'Referral bonus - retroactive claim',
  jsonb_build_object(
    'referred_user_id', 'ce852b0e-a3cb-468b-9c85-5bb4a23e0f94',
    'retroactive', true
  )
);
```

---

## After Creating the Function

### ✅ Everything Will Work Automatically:

1. **New Signups**
   - User signs up with your referral code
   - You automatically get 50 RZC
   - They automatically get 100 RZC signup bonus
   - Notifications sent to both

2. **Auto-Claim on Login**
   - You log in
   - System checks for missing bonuses
   - Automatically claims them
   - Balance updated

3. **Manual Claim UI**
   - Go to Referral page
   - See yellow alert if rewards missing
   - Click "Claim" button
   - Instantly receive RZC

4. **Milestone Bonuses**
   - Reach 10 referrals → Auto-award 500 RZC
   - Reach 50 referrals → Auto-award 2,500 RZC
   - Reach 100 referrals → Auto-award 10,000 RZC

---

## Test the Automation

### Test 1: Auto-Claim on Login
1. Create the function (Step 1 above)
2. Logout from your wallet
3. Login again
4. Check console: Should see "🎁 Auto-claimed..."
5. Check balance: Should increase

### Test 2: New Referral Signup
1. Share your referral link
2. Have someone sign up
3. Check your balance: Should increase by 50 RZC immediately
4. Check notifications: Should see "New Referral Signup!"
5. Check their balance: Should have 100 RZC signup bonus

### Test 3: Manual Claim UI
1. Deploy the code
2. Go to Referral page
3. If missing rewards, see yellow alert
4. Click "Claim" button
5. Balance updates instantly

---

## Console Messages After Automation

### On New Signup (Referrer's Console):
```
💰 Attempting to award referral bonus...
🪙 Awarding 50 RZC to user: [referrer_id]
✅ RZC awarded. New balance: [new_balance]
🎁 Referral bonus awarded: 50 RZC
📬 Notification sent to referrer
```

### On Login (If Missing Rewards):
```
🔍 Checking for missing referral bonuses for user: [user_id]
⚠️ Found 1 missing bonuses
💰 Claiming missing referral bonuses for user: [user_id]
🪙 Awarding 50 RZC to user: [user_id]
✅ RZC awarded. New balance: [new_balance]
🎁 Auto-claimed 1 missing referral bonuses (50 RZC)
```

### On Manual Claim:
```
💰 Claiming missing referral bonuses for user: [user_id]
🪙 Awarding 50 RZC to user: [user_id]
✅ RZC awarded. New balance: [new_balance]
✅ Claimed bonus for [user_name]
```

---

## Files to Use

1. **CREATE_AWARD_FUNCTION_NOW.sql** - Complete setup with tests
2. **ENABLE_AUTOMATION_NOW.md** - This guide
3. **DIRECT_CLAIM_50_RZC.sql** - Alternative if function fails

---

## Summary

**Current Status:** ❌ Not automated (missing database function)

**To Enable Automation:**
1. Run Step 1 SQL (create function) - 30 seconds
2. Run Step 2 SQL (test function) - 10 seconds
3. Run Step 3 SQL (claim your 50 RZC) - 10 seconds

**After Setup:** ✅ Fully automated
- Auto-claim on login
- Auto-award on signup
- Manual claim UI
- Milestone bonuses
- Notifications

**Total Time:** 2 minutes to enable full automation! 🚀

---

## Quick Action

Copy this entire block and run in Supabase SQL Editor:

```sql
-- Create function
CREATE OR REPLACE FUNCTION award_rzc_tokens(p_user_id UUID, p_amount NUMERIC, p_type TEXT, p_description TEXT, p_metadata JSONB DEFAULT NULL)
RETURNS VOID AS $$
DECLARE v_new_balance NUMERIC;
BEGIN
  UPDATE wallet_users SET rzc_balance = rzc_balance + p_amount, updated_at = NOW() WHERE id = p_user_id RETURNING rzc_balance INTO v_new_balance;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found: %', p_user_id; END IF;
  INSERT INTO wallet_rzc_transactions (user_id, type, amount, balance_after, description, metadata, created_at) VALUES (p_user_id, p_type, p_amount, v_new_balance, p_description, p_metadata, NOW());
  IF p_type = 'referral_bonus' THEN UPDATE wallet_referrals SET total_earned = total_earned + p_amount, updated_at = NOW() WHERE user_id = p_user_id; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION award_rzc_tokens TO authenticated, anon, service_role;

-- Claim your 50 RZC
SELECT award_rzc_tokens('99c8c1fd-7174-4bad-848f-4c0cc0bb4641'::uuid, 50, 'referral_bonus', 'Referral bonus - retroactive claim', jsonb_build_object('referred_user_id', 'ce852b0e-a3cb-468b-9c85-5bb4a23e0f94', 'retroactive', true));

-- Verify
SELECT name, rzc_balance FROM wallet_users WHERE id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641';
```

Done! Automation enabled and 50 RZC claimed! ✅
