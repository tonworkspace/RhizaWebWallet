# Referral System Fix Summary 🎯

## What Was Fixed

### 1. Downline Query Issue ✅
**Problem:** The `getDownline()` function was using a complex join that might fail if foreign keys weren't properly set up.

**Solution:** Changed to use two separate queries:
1. First query gets referral records from `wallet_referrals`
2. Second query gets user details from `wallet_users`
3. Combines the data in JavaScript

**File:** `services/supabaseService.ts` (Line 1340)

**Status:** ✅ Already applied

---

### 2. Enhanced Logging ✅
**Problem:** Not enough visibility into what's happening during signup.

**Solution:** Added comprehensive console logging throughout the referral flow.

**Files:**
- `services/supabaseService.ts` - Added logs in `getDownline()`
- `pages/CreateWallet.tsx` - Already has detailed logs

**Status:** ✅ Already applied

---

## What to Check

### 1. Database Function
Verify the `award_rzc_tokens` function exists:

```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'award_rzc_tokens';
```

**Expected:** Should return 1 row

**If missing:** Run `supabase_rzc_migration.sql`

---

### 2. Foreign Keys
Verify foreign keys exist on `wallet_referrals`:

```sql
SELECT
  tc.table_name, 
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

**Expected:** Should show FKs for `user_id` and `referrer_id`

**If missing:** Run these commands:
```sql
ALTER TABLE wallet_referrals
ADD CONSTRAINT fk_wallet_referrals_user
FOREIGN KEY (user_id) REFERENCES wallet_users(id) ON DELETE CASCADE;

ALTER TABLE wallet_referrals
ADD CONSTRAINT fk_wallet_referrals_referrer
FOREIGN KEY (referrer_id) REFERENCES wallet_users(id) ON DELETE SET NULL;
```

---

### 3. Test the Flow

**Quick Test:**
1. Open browser console (F12)
2. Navigate to `/#/create-wallet`
3. Create a new wallet
4. Check console for:
   - ✅ "Signup bonus awarded: 100 RZC"
   - ✅ "Referral code created: [CODE]"

**Full Test:**
1. Get referral code from User A
2. Open new incognito window
3. Navigate to `/#/join?ref=[CODE]`
4. Create wallet as User B
5. Check console for:
   - ✅ "Referrer found: [USER_A_ID]"
   - ✅ "Signup bonus awarded: 100 RZC" (User B)
   - ✅ "Referral bonus awarded: 50 RZC" (User A)
6. Login as User A
7. Go to Referral page
8. Check User B appears in downline

---

## Files Created

1. **REFERRAL_SYSTEM_FIX.md** - Detailed analysis and fixes
2. **diagnose_referral_system.sql** - SQL queries to diagnose issues
3. **REFERRAL_SYSTEM_TEST_GUIDE.md** - Comprehensive testing guide
4. **REFERRAL_FIX_SUMMARY.md** - This file

---

## Quick Diagnostic Commands

### Check if downline is working:
```sql
-- Replace USER_ID with actual user ID
SELECT 
  u.name,
  u.wallet_address,
  u.rzc_balance,
  r.total_referrals
FROM wallet_referrals r
JOIN wallet_users u ON r.user_id = u.id
WHERE r.referrer_id = 'USER_ID';
```

### Check if bonuses are being awarded:
```sql
SELECT 
  u.name,
  t.type,
  t.amount,
  t.created_at
FROM wallet_rzc_transactions t
JOIN wallet_users u ON t.user_id = u.id
WHERE t.type IN ('signup_bonus', 'referral_bonus')
ORDER BY t.created_at DESC
LIMIT 20;
```

### Check referral relationships:
```sql
SELECT 
  u.name as user_name,
  r.referral_code as my_code,
  r.total_referrals,
  ref.name as referred_by
FROM wallet_users u
JOIN wallet_referrals r ON u.id = r.user_id
LEFT JOIN wallet_users ref ON r.referrer_id = ref.id
ORDER BY u.created_at DESC
LIMIT 20;
```

---

## Common Issues & Quick Fixes

### Issue: "No downline members found" but count shows referrals

**Fix:**
1. Check console logs for errors
2. Run diagnostic query #3 from `diagnose_referral_system.sql`
3. Verify foreign keys exist
4. Check if `getDownline()` has the updated code

### Issue: Referral bonus not awarded

**Fix:**
1. Check if `award_rzc_tokens` function exists
2. Verify `awardReferralBonus()` is called in CreateWallet.tsx (line ~195)
3. Check console logs for errors
4. Manually award bonus:
   ```sql
   SELECT award_rzc_tokens(
     'REFERRER_ID'::uuid,
     50,
     'referral_bonus',
     'Manual correction',
     jsonb_build_object('referred_user_id', 'NEW_USER_ID')
   );
   ```

### Issue: Signup bonus not awarded

**Fix:**
1. Check if `award_rzc_tokens` function exists
2. Verify `awardSignupBonus()` is called in CreateWallet.tsx (line ~175)
3. Manually award bonus:
   ```sql
   SELECT award_rzc_tokens(
     'USER_ID'::uuid,
     100,
     'signup_bonus',
     'Welcome bonus',
     jsonb_build_object('bonus_type', 'signup')
   );
   ```

---

## Testing Checklist

- [ ] Run `diagnose_referral_system.sql` queries
- [ ] Verify `award_rzc_tokens` function exists
- [ ] Verify foreign keys exist
- [ ] Test new user signup without referral code
- [ ] Test new user signup with referral code
- [ ] Verify downline displays correctly
- [ ] Verify upline displays correctly
- [ ] Test milestone bonus (10 referrals)
- [ ] Test invalid referral code handling

---

## Expected Behavior

### When User B signs up with User A's referral code:

1. **User B receives:**
   - ✅ 100 RZC signup bonus
   - ✅ Own referral code generated
   - ✅ `referrer_id` set to User A's ID

2. **User A receives:**
   - ✅ 50 RZC referral bonus
   - ✅ `total_referrals` increments by 1
   - ✅ Notification about new referral

3. **Database records:**
   - ✅ 2 entries in `wallet_rzc_transactions` (signup + referral bonus)
   - ✅ User B's record in `wallet_referrals` with `referrer_id = User A`
   - ✅ User A's `total_referrals` updated

4. **UI displays:**
   - ✅ User A sees User B in downline
   - ✅ User B sees User A in upline
   - ✅ Stats update correctly

---

## Next Steps

1. **Run diagnostics:** Execute queries from `diagnose_referral_system.sql`
2. **Test the flow:** Follow `REFERRAL_SYSTEM_TEST_GUIDE.md`
3. **Fix any issues:** Use quick fixes above
4. **Verify in production:** Test with real users

---

## Support

If issues persist after following this guide:

1. Check browser console for errors
2. Run all diagnostic queries
3. Verify database schema matches expected structure
4. Check Supabase logs for RPC errors
5. Review `REFERRAL_SYSTEM_FIX.md` for detailed analysis

---

## Summary

The referral system should now be working correctly. The main fix was updating the `getDownline()` query to use separate queries instead of a complex join. All other components (bonus awarding, code generation, etc.) were already implemented correctly.

**Key takeaway:** The issue was likely in how the downline data was being fetched, not in the reward distribution logic.

Good luck! 🚀
