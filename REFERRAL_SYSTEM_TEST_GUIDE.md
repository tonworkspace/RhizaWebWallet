# Referral System Testing Guide 🧪

## Overview

This guide will help you test and verify that the referral system is working correctly.

---

## Pre-Testing Checklist

### 1. Database Check
Run the diagnostic queries in `diagnose_referral_system.sql`:

```bash
# Open Supabase Dashboard → SQL Editor
# Copy and paste queries from diagnose_referral_system.sql
# Run each section to check system health
```

**Expected Results:**
- ✅ Foreign keys exist on `wallet_referrals` table
- ✅ `award_rzc_tokens` function exists
- ✅ All users have corresponding referral records

### 2. Code Verification
Verify these files have the latest code:

- ✅ `services/supabaseService.ts` - `getDownline()` uses separate queries
- ✅ `services/rzcRewardService.ts` - `awardReferralBonus()` exists
- ✅ `pages/CreateWallet.tsx` - Referral flow with logging
- ✅ `pages/Referral.tsx` - Displays downline correctly

---

## Test Scenarios

### Scenario 1: New User Signup WITHOUT Referral Code

**Purpose:** Verify basic signup works and user gets signup bonus

**Steps:**
1. Open browser console (F12)
2. Navigate to `/#/create-wallet`
3. Complete wallet creation
4. Check console logs for:
   ```
   🎁 Awarding signup bonus: [USER_ID]
   ✅ Signup bonus awarded: 100 RZC
   🎫 Generating referral code...
   ✅ Referral code created: [CODE]
   ```

**Expected Results:**
- ✅ User created successfully
- ✅ User receives 100 RZC signup bonus
- ✅ User gets a referral code
- ✅ `wallet_referrals` record created with `referrer_id = NULL`

**Database Verification:**
```sql
SELECT 
  u.name,
  u.rzc_balance,
  r.referral_code,
  r.referrer_id,
  r.total_referrals
FROM wallet_users u
JOIN wallet_referrals r ON u.id = r.user_id
WHERE u.wallet_address = 'YOUR_WALLET_ADDRESS'
ORDER BY u.created_at DESC
LIMIT 1;
```

Expected: `rzc_balance = 100`, `referrer_id = NULL`, `total_referrals = 0`

---

### Scenario 2: New User Signup WITH Referral Code

**Purpose:** Verify referral system works end-to-end

**Setup:**
1. User A already exists with referral code `ABC123`
2. Note User A's current RZC balance

**Steps:**
1. Open browser console (F12)
2. Navigate to `/#/join?ref=ABC123`
3. Complete wallet creation as User B
4. Check console logs for:
   ```
   🔍 Looking up referrer with code: ABC123
   ✅ Referrer found: [USER_A_ID]
   🎁 Awarding signup bonus: [USER_B_ID]
   ✅ Signup bonus awarded: 100 RZC
   📈 Incrementing referrer count...
   💰 Attempting to award referral bonus...
   🎁 Referral bonus awarded: 50 RZC
   ✅ Referrer stats updated
   ```

**Expected Results:**
- ✅ User B created successfully
- ✅ User B receives 100 RZC signup bonus
- ✅ User A receives 50 RZC referral bonus
- ✅ User A's `total_referrals` increments by 1
- ✅ User B's `referrer_id` points to User A

**Database Verification:**
```sql
-- Check User B (new user)
SELECT 
  u.name,
  u.rzc_balance,
  r.referral_code,
  r.referrer_id,
  ref_user.name as referrer_name
FROM wallet_users u
JOIN wallet_referrals r ON u.id = r.user_id
LEFT JOIN wallet_users ref_user ON r.referrer_id = ref_user.id
WHERE u.wallet_address = 'USER_B_WALLET_ADDRESS';

-- Expected: rzc_balance = 100, referrer_id = USER_A_ID

-- Check User A (referrer)
SELECT 
  u.name,
  u.rzc_balance,
  r.total_referrals,
  r.total_earned
FROM wallet_users u
JOIN wallet_referrals r ON u.id = r.user_id
WHERE r.referral_code = 'ABC123';

-- Expected: rzc_balance increased by 50, total_referrals = 1
```

**RZC Transaction Verification:**
```sql
-- Check User A's referral bonus transaction
SELECT 
  type,
  amount,
  source,
  metadata,
  created_at
FROM wallet_rzc_transactions
WHERE user_id = 'USER_A_ID'
  AND type = 'referral_bonus'
ORDER BY created_at DESC
LIMIT 1;

-- Expected: amount = 50, metadata contains referred_user_id
```

---

### Scenario 3: Downline Display

**Purpose:** Verify downline shows correctly on Referral page

**Setup:**
1. User A has referred 3 users (B, C, D)

**Steps:**
1. Login as User A
2. Navigate to Referral page
3. Check console logs for:
   ```
   🔄 Loading referral network for user: [USER_A_ID]
   🔍 Fetching downline for user: [USER_A_ID]
   📊 Found 3 referral records
   📊 Found 3 user records
   ✅ Found 3 downline members
   ```

**Expected Results:**
- ✅ Downline section shows 3 users
- ✅ Each user shows: name, avatar, RZC balance, active status
- ✅ "Latest" badge on most recent referral
- ✅ Correct "time ago" display
- ✅ Active/Inactive status correct

**UI Verification:**
- Check "Total Referrals" stat shows 3
- Check "Active Rate" percentage is correct
- Check each downline member card displays properly
- Check refresh button works

---

### Scenario 4: Milestone Bonus (10 Referrals)

**Purpose:** Verify milestone bonuses are awarded

**Setup:**
1. User A has 9 referrals
2. Note User A's current RZC balance

**Steps:**
1. Create 10th referral (User J signs up with User A's code)
2. Check console logs for:
   ```
   🎁 Awarding referral bonus to: [USER_A_ID]
   🎉 Milestone reached: 10 Referrals
   ✅ Referral bonus awarded: 50 RZC
   ```

**Expected Results:**
- ✅ User A receives 50 RZC referral bonus
- ✅ User A receives 500 RZC milestone bonus
- ✅ Total: 550 RZC added to User A's balance
- ✅ Notification sent to User A

**Database Verification:**
```sql
-- Check milestone bonus transaction
SELECT 
  type,
  amount,
  source,
  metadata,
  created_at
FROM wallet_rzc_transactions
WHERE user_id = 'USER_A_ID'
  AND type = 'milestone_bonus'
ORDER BY created_at DESC
LIMIT 1;

-- Expected: amount = 500, metadata contains milestone info
```

---

### Scenario 5: Invalid Referral Code

**Purpose:** Verify system handles invalid codes gracefully

**Steps:**
1. Navigate to `/#/join?ref=INVALID123`
2. Complete wallet creation
3. Check console logs for:
   ```
   🔍 Looking up referrer with code: INVALID123
   ⚠️ Referral code not found: INVALID123
   ```

**Expected Results:**
- ✅ User created successfully
- ✅ User receives 100 RZC signup bonus
- ✅ No referral bonus awarded (no referrer)
- ✅ User's `referrer_id` is NULL
- ✅ No errors thrown

---

### Scenario 6: Upline Display

**Purpose:** Verify upline (sponsor) shows correctly

**Setup:**
1. User B was referred by User A

**Steps:**
1. Login as User B
2. Navigate to Referral page
3. Check "Upline (Sponsor)" section

**Expected Results:**
- ✅ Shows User A's name and avatar
- ✅ Shows User A's wallet address (truncated)
- ✅ Shows "Sponsor" badge
- ✅ Blue gradient styling

---

## Common Issues & Solutions

### Issue 1: Downline Not Showing

**Symptoms:**
- Referral count shows correct number
- But downline section is empty

**Diagnosis:**
```sql
-- Check if referral records exist
SELECT * FROM wallet_referrals WHERE referrer_id = 'USER_ID';

-- Check if user records exist
SELECT u.* FROM wallet_users u
JOIN wallet_referrals r ON u.id = r.user_id
WHERE r.referrer_id = 'USER_ID';
```

**Solutions:**
1. Verify `getDownline()` function is using separate queries (not join)
2. Check browser console for errors
3. Verify foreign keys exist on `wallet_referrals` table
4. Check RLS policies allow reading downline data

### Issue 2: Referral Bonus Not Awarded

**Symptoms:**
- New user signs up with referral code
- Referrer's count increments
- But referrer doesn't receive 50 RZC

**Diagnosis:**
```sql
-- Check if bonus transaction was created
SELECT * FROM wallet_rzc_transactions
WHERE user_id = 'REFERRER_ID'
  AND type = 'referral_bonus'
ORDER BY created_at DESC
LIMIT 5;

-- Check referrer's balance
SELECT rzc_balance FROM wallet_users WHERE id = 'REFERRER_ID';
```

**Solutions:**
1. Check if `award_rzc_tokens` function exists in database
2. Verify `awardReferralBonus()` is being called in CreateWallet.tsx
3. Check console logs for errors during bonus awarding
4. Manually award bonus using SQL:
   ```sql
   SELECT award_rzc_tokens(
     'REFERRER_ID'::uuid,
     50,
     'referral_bonus',
     'Manual correction',
     jsonb_build_object('referred_user_id', 'NEW_USER_ID')
   );
   ```

### Issue 3: Signup Bonus Not Awarded

**Symptoms:**
- New user created
- But RZC balance is 0

**Diagnosis:**
```sql
-- Check if signup bonus transaction exists
SELECT * FROM wallet_rzc_transactions
WHERE user_id = 'USER_ID'
  AND type = 'signup_bonus';
```

**Solutions:**
1. Check if `awardSignupBonus()` is being called
2. Verify `award_rzc_tokens` function exists
3. Check console logs for errors
4. Manually award bonus:
   ```sql
   SELECT award_rzc_tokens(
     'USER_ID'::uuid,
     100,
     'signup_bonus',
     'Welcome bonus',
     jsonb_build_object('bonus_type', 'signup')
   );
   ```

### Issue 4: Referral Code Not Found

**Symptoms:**
- User visits `/#/join?ref=ABC123`
- Console shows "Referral code not found"

**Diagnosis:**
```sql
-- Check if referral code exists
SELECT * FROM wallet_referrals WHERE referral_code = 'ABC123';
```

**Solutions:**
1. Verify referral code is uppercase in database
2. Check if `getUserByReferralCode()` converts to uppercase
3. Ensure referral code was created during user signup

---

## Performance Testing

### Load Test: Multiple Simultaneous Signups

**Purpose:** Verify system handles concurrent referrals

**Steps:**
1. Create 10 users simultaneously using same referral code
2. Check if all bonuses are awarded correctly
3. Verify referrer's count is accurate

**Expected Results:**
- ✅ All 10 users created
- ✅ All 10 users receive 100 RZC
- ✅ Referrer receives 500 RZC (10 × 50)
- ✅ Referrer's count = 10
- ✅ No duplicate bonuses

---

## Automated Testing Script

```javascript
// Run in browser console on Referral page
async function testReferralSystem() {
  console.log('🧪 Starting Referral System Test...');
  
  // Test 1: Load referral data
  console.log('Test 1: Loading referral data...');
  // Trigger refresh button click
  document.querySelector('[title="Refresh"]')?.click();
  await new Promise(r => setTimeout(r, 2000));
  
  // Test 2: Check downline count
  const downlineCount = document.querySelectorAll('[class*="downline"]').length;
  console.log(`Test 2: Downline count = ${downlineCount}`);
  
  // Test 3: Check stats
  const stats = Array.from(document.querySelectorAll('[class*="text-2xl"]'))
    .map(el => el.textContent);
  console.log('Test 3: Stats =', stats);
  
  console.log('✅ Tests complete!');
}

testReferralSystem();
```

---

## Reporting Issues

When reporting issues, include:

1. **Console Logs:** Full console output during the issue
2. **Database State:** Results from diagnostic queries
3. **User IDs:** Affected user IDs and wallet addresses
4. **Steps to Reproduce:** Exact steps that caused the issue
5. **Expected vs Actual:** What should happen vs what happened

---

## Success Criteria

The referral system is working correctly when:

- ✅ New users receive 100 RZC signup bonus
- ✅ Referrers receive 50 RZC per referral
- ✅ Referral counts increment correctly
- ✅ Downline displays all referred users
- ✅ Upline displays correctly for referred users
- ✅ Milestone bonuses awarded at 10, 50, 100 referrals
- ✅ Invalid referral codes handled gracefully
- ✅ No duplicate bonuses awarded
- ✅ All transactions recorded in database
- ✅ RZC balances update correctly

---

## Next Steps

After testing:

1. ✅ Run all test scenarios
2. ✅ Fix any issues found
3. ✅ Re-test after fixes
4. ✅ Document any edge cases
5. ✅ Update user documentation
6. ✅ Deploy to production

Good luck! 🚀
