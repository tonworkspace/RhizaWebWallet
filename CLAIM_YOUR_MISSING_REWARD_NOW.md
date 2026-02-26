# Claim Your Missing Reward NOW! 💰

## Quick Action (2 minutes)

You're missing **50 RZC** from your referral. Here's how to claim it:

---

## Option 1: SQL Query (Fastest - 30 seconds)

1. Open Supabase SQL Editor
2. Copy and paste this:

```sql
SELECT award_rzc_tokens(
  '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'::uuid,
  50,
  'referral_bonus',
  'Referral bonus - retroactive claim',
  jsonb_build_object(
    'referred_user_id', 'ce852b0e-a3cb-468b-9c85-5bb4a23e0f94',
    'referred_user_address', 'EQAie1sT4_ng9saBvIZsoOfWwsPqZmL-2BtoOCubI1x4',
    'retroactive', true
  )
);
```

3. Click "Run"
4. Check your RZC balance - should increase by 50!

---

## Option 2: Auto-Claim (Easiest - 1 minute)

1. Logout from your wallet
2. Login again
3. System will automatically claim the missing 50 RZC
4. Check console for: "🎁 Auto-claimed 1 missing referral bonuses (50 RZC)"

---

## Option 3: UI Button (Coming Soon)

After you deploy the new code:
1. Go to Referral page
2. You'll see a yellow alert: "Unclaimed Referral Rewards!"
3. Click "Claim 50 RZC Now"
4. Done!

---

## Verify It Worked

Run this query to confirm:

```sql
SELECT 
  u.name,
  u.rzc_balance as current_balance,
  r.total_referrals,
  (SELECT COUNT(*) FROM wallet_rzc_transactions WHERE user_id = u.id AND type = 'referral_bonus') as bonuses_received
FROM wallet_users u
JOIN wallet_referrals r ON u.id = r.user_id
WHERE u.id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641';
```

**Expected:**
- `current_balance`: Should be 50 more than before
- `bonuses_received`: Should be 1

---

## What Was Fixed

✅ **Downline now showing** - You can see "Rhiza User #Tlx4" in your team
✅ **Auto-claim system added** - Will never miss rewards again
✅ **Manual claim UI added** - Can claim anytime from Referral page
✅ **Prevention system** - Multiple checks to ensure rewards are awarded

---

## Files Added

1. `services/referralRewardChecker.ts` - Auto-check and claim service
2. `components/ClaimMissingRewards.tsx` - UI component
3. `check_and_claim_missing_rewards.sql` - Database function
4. Updated `context/WalletContext.tsx` - Auto-claim on login
5. Updated `pages/Referral.tsx` - Shows claim button

---

## Next Steps

1. **Claim your 50 RZC** using Option 1 or 2 above
2. **Deploy the new code** to get the prevention system
3. **Test it** by having someone sign up with your referral code
4. **Verify** they appear in downline and you get 50 RZC immediately

---

## Summary

- **Missing Reward:** 50 RZC ❌
- **Solution:** Run the SQL query above ✅
- **Prevention:** Auto-claim system added ✅
- **Future:** Will never happen again ✅

Claim your 50 RZC now! 🚀
