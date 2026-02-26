# Immediate Action Items - Referral System Fix 🚨

## Priority 1: Database Verification (5 minutes)

### Step 1: Check if award_rzc_tokens function exists
Open Supabase SQL Editor and run:

```sql
SELECT routine_name, routine_type 
FROM information_schema.routines
WHERE routine_name = 'award_rzc_tokens';
```

**Expected Result:** 1 row showing the function exists

**If empty:** You need to run the RZC migration:
1. Open `supabase_rzc_migration.sql`
2. Copy the entire file
3. Paste into Supabase SQL Editor
4. Execute

---

### Step 2: Check foreign keys
Run in Supabase SQL Editor:

```sql
SELECT
  tc.constraint_name,
  kcu.column_name, 
  ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'wallet_referrals' 
  AND tc.constraint_type = 'FOREIGN KEY';
```

**Expected Result:** 2 rows showing FKs for `user_id` and `referrer_id`

**If empty:** Run these commands:
```sql
ALTER TABLE wallet_referrals
ADD CONSTRAINT fk_wallet_referrals_user
FOREIGN KEY (user_id) REFERENCES wallet_users(id) ON DELETE CASCADE;

ALTER TABLE wallet_referrals
ADD CONSTRAINT fk_wallet_referrals_referrer
FOREIGN KEY (referrer_id) REFERENCES wallet_users(id) ON DELETE SET NULL;
```

---

### Step 3: Check current data state
Run in Supabase SQL Editor:

```sql
-- See all users and their referral status
SELECT 
  u.name,
  u.wallet_address,
  u.rzc_balance,
  r.referral_code,
  r.total_referrals,
  r.referrer_id,
  ref.name as referred_by
FROM wallet_users u
LEFT JOIN wallet_referrals r ON u.id = r.user_id
LEFT JOIN wallet_users ref ON r.referrer_id = ref.id
ORDER BY u.created_at DESC
LIMIT 10;
```

This shows you the current state of your users.

---

## Priority 2: Test the System (10 minutes)

### Test 1: Basic Signup (No Referral)

1. Open browser with DevTools (F12)
2. Navigate to: `http://localhost:5173/#/create-wallet` (or your URL)
3. Create a new wallet
4. Watch console logs for:
   ```
   ✅ "Signup bonus awarded: 100 RZC"
   ✅ "Referral code created: [CODE]"
   ```
5. Note the referral code

**If you see errors:** Check the console error message and search for it in `REFERRAL_SYSTEM_FIX.md`

---

### Test 2: Referral Signup

1. Copy the referral code from Test 1
2. Open new incognito/private window
3. Navigate to: `http://localhost:5173/#/join?ref=[YOUR_CODE]`
4. Create a new wallet
5. Watch console logs for:
   ```
   ✅ "Referrer found: [USER_ID]"
   ✅ "Signup bonus awarded: 100 RZC"
   ✅ "Referral bonus awarded: 50 RZC"
   ```

**If referrer not found:**
- Check if referral code is correct
- Verify code exists in database:
  ```sql
  SELECT * FROM wallet_referrals WHERE referral_code = 'YOUR_CODE';
  ```

---

### Test 3: Check Downline Display

1. Login as the first user (from Test 1)
2. Navigate to Referral page
3. Click the refresh button
4. Watch console logs for:
   ```
   ✅ "Found X referral records"
   ✅ "Found X user records"
   ✅ "Found X downline members"
   ```
5. Verify the second user appears in the downline list

**If downline is empty:**
- Check console for errors
- Run this query to verify data exists:
  ```sql
  SELECT * FROM wallet_referrals WHERE referrer_id = 'FIRST_USER_ID';
  ```

---

## Priority 3: Fix Common Issues

### Issue: Downline shows count but no users

**Quick Fix:**
1. Open `services/supabaseService.ts`
2. Find the `getDownline` function (around line 1340)
3. Verify it looks like this:

```typescript
async getDownline(userId: string): Promise<{
  // ... return type ...
}> {
  // ... validation ...
  
  // Get all referral records where this user is the referrer
  const { data: referralData, error: refError } = await this.client
    .from('wallet_referrals')
    .select('user_id, total_referrals, created_at')
    .eq('referrer_id', userId)
    .order('created_at', { ascending: false });

  // ... rest of the function
}
```

If it's different, the fix wasn't applied. Let me know and I'll apply it.

---

### Issue: Bonuses not being awarded

**Diagnostic Query:**
```sql
-- Check if bonuses are being recorded
SELECT 
  u.name,
  t.type,
  t.amount,
  t.created_at
FROM wallet_rzc_transactions t
JOIN wallet_users u ON t.user_id = u.id
WHERE t.type IN ('signup_bonus', 'referral_bonus')
ORDER BY t.created_at DESC
LIMIT 10;
```

**If no results:**
- The `award_rzc_tokens` function might not exist (see Priority 1, Step 1)
- Or there's an error in the awarding logic (check console logs)

**Manual Fix (if needed):**
```sql
-- Award signup bonus manually
SELECT award_rzc_tokens(
  'USER_ID'::uuid,
  100,
  'signup_bonus',
  'Welcome bonus',
  jsonb_build_object('bonus_type', 'signup')
);

-- Award referral bonus manually
SELECT award_rzc_tokens(
  'REFERRER_ID'::uuid,
  50,
  'referral_bonus',
  'Referral bonus',
  jsonb_build_object('referred_user_id', 'NEW_USER_ID')
);
```

---

## Priority 4: Verify Everything Works

### Final Verification Checklist

Run this comprehensive query:

```sql
-- Complete system health check
SELECT 
  'Total Users' as metric,
  COUNT(*)::text as value
FROM wallet_users
UNION ALL
SELECT 
  'Users with Referral Codes',
  COUNT(*)::text
FROM wallet_referrals
UNION ALL
SELECT 
  'Users with Referrers',
  COUNT(*)::text
FROM wallet_referrals
WHERE referrer_id IS NOT NULL
UNION ALL
SELECT 
  'Signup Bonuses Awarded',
  COUNT(*)::text
FROM wallet_rzc_transactions
WHERE type = 'signup_bonus'
UNION ALL
SELECT 
  'Referral Bonuses Awarded',
  COUNT(*)::text
FROM wallet_rzc_transactions
WHERE type = 'referral_bonus'
UNION ALL
SELECT 
  'Total RZC in Circulation',
  SUM(rzc_balance)::text
FROM wallet_users;
```

**Expected Results:**
- Total Users = Total Users with Referral Codes
- Signup Bonuses = Total Users
- Referral Bonuses = Users with Referrers
- Total RZC = (Users × 100) + (Referrals × 50) + Milestone Bonuses

---

## Quick Reference

### Important Files
- `services/supabaseService.ts` - Database operations
- `services/rzcRewardService.ts` - Reward logic
- `pages/CreateWallet.tsx` - Signup flow
- `pages/Referral.tsx` - Referral page UI

### Important Database Tables
- `wallet_users` - User profiles and RZC balances
- `wallet_referrals` - Referral codes and relationships
- `wallet_rzc_transactions` - RZC token movements

### Important Functions
- `getDownline()` - Fetches referred users
- `awardReferralBonus()` - Awards 50 RZC to referrer
- `awardSignupBonus()` - Awards 100 RZC to new user
- `award_rzc_tokens()` - Database function for atomic RZC awarding

---

## Need Help?

### If tests fail:
1. Check browser console for error messages
2. Run diagnostic queries from `diagnose_referral_system.sql`
3. Review `REFERRAL_SYSTEM_FIX.md` for detailed explanations
4. Check `REFERRAL_SYSTEM_TEST_GUIDE.md` for specific test scenarios

### If database queries fail:
1. Verify Supabase connection is working
2. Check if tables exist: `SELECT * FROM wallet_users LIMIT 1;`
3. Verify RLS policies aren't blocking queries
4. Check Supabase logs for errors

---

## Success Criteria

✅ You're done when:
1. New users receive 100 RZC signup bonus
2. Referrers receive 50 RZC per referral
3. Downline displays all referred users
4. Referral counts are accurate
5. No console errors during signup

---

## Time Estimate

- Database verification: 5 minutes
- Testing: 10 minutes
- Fixing issues (if any): 10-30 minutes
- **Total: 25-45 minutes**

---

## Start Here

1. ✅ Run Priority 1 database checks
2. ✅ Run Priority 2 tests
3. ✅ Fix any issues found
4. ✅ Run Priority 4 verification
5. ✅ Celebrate! 🎉

Good luck! The system should be working now. 🚀
