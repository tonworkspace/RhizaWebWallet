# Referral System Quick Reference 🚀

## 🎯 Start Here

### Is the UI getting data?
**YES** ✅ - The UI is properly configured. If you see issues, it's a data problem, not a UI problem.

### Quick Test
1. Open Referral page
2. Press F12 (open console)
3. Copy/paste contents of `test_referral_ui.js`
4. Check results

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `IMMEDIATE_ACTION_ITEMS.md` | **START HERE** - Step-by-step checklist |
| `diagnose_referral_system.sql` | Database diagnostic queries (FIXED ✅) |
| `SQL_FIX_APPLIED.md` | Info about SQL fix |
| `UI_VERIFICATION_SUMMARY.md` | UI data flow explanation |
| `test_referral_ui.js` | Browser console test script |
| `REFERRAL_SYSTEM_FIX.md` | Detailed technical analysis |
| `REFERRAL_SYSTEM_TEST_GUIDE.md` | Complete testing procedures |

---

## 🔍 Quick Diagnostics

### Check 1: Database Function Exists
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'award_rzc_tokens';
```
**Expected:** 1 row

### Check 2: User Has Referral Code
```sql
SELECT referral_code, total_referrals 
FROM wallet_referrals 
WHERE user_id = 'YOUR_USER_ID';
```
**Expected:** 1 row with referral code

### Check 3: Downline Exists
```sql
SELECT COUNT(*) FROM wallet_referrals 
WHERE referrer_id = 'YOUR_USER_ID';
```
**Expected:** Count matches total_referrals

### Check 4: Bonuses Were Awarded
```sql
SELECT type, amount, created_at 
FROM wallet_rzc_transactions 
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC;
```
**Expected:** signup_bonus (100 RZC) and referral_bonus (50 RZC per referral)

---

## 🐛 Common Issues

### Issue: Downline empty but has referrals
**Fix:** Already applied in `services/supabaseService.ts`
**Verify:** Check browser console for errors

### Issue: RZC balance is 0
**Check:** Run Check 4 above
**Fix:** Verify `award_rzc_tokens` function exists (Check 1)

### Issue: Referral link shows "Loading..."
**Check:** Run Check 2 above
**Fix:** Referral code wasn't created during signup

### Issue: Active rate shows 0%
**Check:** `SELECT is_active FROM wallet_users;`
**Fix:** `UPDATE wallet_users SET is_active = true WHERE is_active IS NULL;`

---

## 🧪 Testing Flow

### Test 1: Basic Signup (5 min)
1. Create new wallet
2. Check console: "Signup bonus awarded: 100 RZC"
3. Note referral code

### Test 2: Referral Signup (5 min)
1. Open incognito window
2. Visit `/#/join?ref=[CODE]`
3. Create wallet
4. Check console: "Referral bonus awarded: 50 RZC"

### Test 3: Downline Display (2 min)
1. Login as first user
2. Go to Referral page
3. Click refresh
4. Verify second user appears in downline

---

## 📊 Expected Data Structure

### userProfile
```javascript
{
  id: "uuid",
  wallet_address: "0:abc...",
  name: "User Name",
  avatar: "🌱",
  rzc_balance: 150,  // 100 signup + 50 referral
  is_active: true,
  referrer_code: "ABC123" or null
}
```

### referralData
```javascript
{
  user_id: "uuid",
  referral_code: "ABC12345",
  total_referrals: 1,
  total_earned: 50,
  rank: "Core Node",
  level: 1,
  referrer_id: "uuid" or null
}
```

### downline
```javascript
[
  {
    id: "uuid",
    name: "User Name",
    avatar: "👤",
    wallet_address: "0:def...",
    rzc_balance: 100,
    is_active: true,
    total_referrals: 0,
    created_at: "2024-01-02T00:00:00Z"
  }
]
```

---

## 🎨 UI Data Mapping

| UI Element | Data Source | Field |
|------------|-------------|-------|
| Rank Badge | `referralData` | `rank` |
| RZC Balance | `userProfile` | `rzc_balance` |
| Total Referrals | `referralData` | `total_referrals` |
| Active Rate | `downline` | Calculated from `is_active` |
| Level | `referralData` | `level` |
| Referral Link | `referralData` | `referral_code` |
| Upline | `upline` | Full profile |
| Downline List | `downline` | Array of profiles |

---

## 🔧 Quick Fixes

### Manually Award Signup Bonus
```sql
SELECT award_rzc_tokens(
  'USER_ID'::uuid,
  100,
  'signup_bonus',
  'Welcome bonus',
  jsonb_build_object('bonus_type', 'signup')
);
```

### Manually Award Referral Bonus
```sql
SELECT award_rzc_tokens(
  'REFERRER_ID'::uuid,
  50,
  'referral_bonus',
  'Referral bonus',
  jsonb_build_object('referred_user_id', 'NEW_USER_ID')
);
```

### Set All Users Active
```sql
UPDATE wallet_users SET is_active = true WHERE is_active IS NULL;
```

### Add Missing Foreign Keys
```sql
ALTER TABLE wallet_referrals
ADD CONSTRAINT fk_wallet_referrals_user
FOREIGN KEY (user_id) REFERENCES wallet_users(id) ON DELETE CASCADE;

ALTER TABLE wallet_referrals
ADD CONSTRAINT fk_wallet_referrals_referrer
FOREIGN KEY (referrer_id) REFERENCES wallet_users(id) ON DELETE SET NULL;
```

---

## 📞 Support Checklist

When reporting issues, provide:

1. **Browser Console Output**
   - Any error messages
   - Results from `test_referral_ui.js`

2. **Database State**
   - Results from diagnostic queries
   - User ID and wallet address

3. **Steps to Reproduce**
   - Exact steps that caused the issue
   - Expected vs actual behavior

4. **Screenshots**
   - Referral page showing the issue
   - Browser console showing errors

---

## ✅ Success Criteria

System is working when:

- [ ] New users receive 100 RZC signup bonus
- [ ] Referrers receive 50 RZC per referral
- [ ] Downline displays all referred users
- [ ] Referral counts are accurate
- [ ] Active rate calculates correctly
- [ ] Referral link is copyable
- [ ] No console errors

---

## 🚀 Quick Start

1. **Read:** `IMMEDIATE_ACTION_ITEMS.md`
2. **Run:** Database checks (5 min)
3. **Test:** Create test users (10 min)
4. **Verify:** Run `test_referral_ui.js`
5. **Fix:** Apply any needed fixes
6. **Celebrate:** 🎉

---

## 💡 Key Insights

1. **UI is fine** - It's properly configured to receive data
2. **Check data layer** - Issues are usually in database or API
3. **Use diagnostic tools** - SQL queries and test scripts
4. **Fix was applied** - `getDownline()` now uses separate queries
5. **Test thoroughly** - Follow the test guide

---

## 📚 Learn More

- **Data Flow:** See `REFERRAL_UI_DATA_FLOW.md`
- **Testing:** See `REFERRAL_SYSTEM_TEST_GUIDE.md`
- **Technical Details:** See `REFERRAL_SYSTEM_FIX.md`

---

**Remember:** The UI code is solid. Focus on verifying the data! 🎯
