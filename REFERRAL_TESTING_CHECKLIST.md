# Referral System Testing Checklist

## Quick Test Guide

### Prerequisites
- [ ] Supabase database is set up and running
- [ ] Run the updated SQL script to add the new function
- [ ] Application is built and running

---

## Test 1: Referral Code Capture ⭐ PRIORITY

### Steps:
1. [ ] Login to an existing wallet (User A)
2. [ ] Go to Referral page
3. [ ] Copy your referral code (e.g., "A1B2C3D4")
4. [ ] Logout
5. [ ] Open: `http://localhost:5173/#/create-wallet?ref=A1B2C3D4`
6. [ ] Create a new wallet (User B)

### Expected Results:
- [ ] Browser console shows: "Looking up referrer with code: A1B2C3D4"
- [ ] Browser console shows: "Referrer found: [uuid]"
- [ ] Browser console shows: "Incrementing referrer count..."
- [ ] Browser console shows: "Referrer stats updated"
- [ ] No errors in console

### Database Verification:
```sql
-- Check User B has referrer_code set
SELECT wallet_address, referrer_code 
FROM wallet_users 
WHERE wallet_address = 'USER_B_ADDRESS';
-- Expected: referrer_code = 'A1B2C3D4'

-- Check User A's referral count increased
SELECT total_referrals, rank 
FROM wallet_referrals 
WHERE referral_code = 'A1B2C3D4';
-- Expected: total_referrals = 1 (or increased by 1)
```

---

## Test 2: Referral Count Display

### Steps:
1. [ ] Login as User A (the referrer)
2. [ ] Navigate to Referral page (`/#/wallet/referral`)
3. [ ] Check the statistics

### Expected Results:
- [ ] Total Invites shows: 1 (or correct count)
- [ ] Recent Referrals section shows User B
- [ ] User B's name or wallet address displayed
- [ ] Time shows "Just now" or recent time
- [ ] Status shows "Active"

---

## Test 3: Transaction Reward Calculation ⭐ PRIORITY

### Steps:
1. [ ] Login as User B (the referred user)
2. [ ] Make a transaction (send TON to any address)
3. [ ] Wait 30-60 seconds for transaction sync
4. [ ] Check browser console

### Expected Console Logs:
```
🔄 Starting transaction sync for: [address]
📦 Found X blockchain transactions
🆕 Found 1 new transactions to sync
💰 Processing referral reward for transaction fee: 0.1
🎁 Processing referral reward for transaction: [tx-id]
✅ User has referrer: [uuid]
💰 Commission rate: 5% (Core Node)
💵 Reward amount: 0.005 TON
✅ Referral reward processed: 0.005 TON credited
```

### Database Verification:
```sql
-- Check earning was recorded
SELECT * FROM wallet_referral_earnings 
WHERE referred_user_id = 'USER_B_ID'
ORDER BY created_at DESC 
LIMIT 1;
-- Expected: New row with amount and percentage

-- Check User A's total_earned increased
SELECT total_earned 
FROM wallet_referrals 
WHERE user_id = 'USER_A_ID';
-- Expected: total_earned > 0
```

---

## Test 4: Referrer Sees Earnings

### Steps:
1. [ ] Login as User A (the referrer)
2. [ ] Navigate to Referral page
3. [ ] Check earnings display

### Expected Results:
- [ ] Total Rewards Earned shows: > 0 TON
- [ ] Amount matches database total_earned
- [ ] Recent Referrals shows User B with earnings
- [ ] Earnings amount displayed (e.g., "+0.005 TON")

---

## Test 5: Rank Progression

### Steps:
1. [ ] Create 11 wallets using User A's referral code
2. [ ] Check User A's rank

### Expected Results:
- [ ] After 11 referrals, rank updates to "Silver Node"
- [ ] Commission rate increases to 7.5%
- [ ] Next transaction uses new rate

### Database Verification:
```sql
-- Check rank updated
SELECT total_referrals, rank, level 
FROM wallet_referrals 
WHERE user_id = 'USER_A_ID';
-- Expected: 
-- total_referrals = 11
-- rank = 'Silver Node'
-- level = 2
```

---

## Test 6: Invalid Referral Code

### Steps:
1. [ ] Open: `http://localhost:5173/#/create-wallet?ref=INVALID123`
2. [ ] Create a new wallet

### Expected Results:
- [ ] Console shows: "Referral code not found: INVALID123"
- [ ] Wallet creation continues normally
- [ ] No referrer linked
- [ ] No errors thrown

---

## Test 7: No Referral Code

### Steps:
1. [ ] Open: `http://localhost:5173/#/create-wallet` (no ?ref parameter)
2. [ ] Create a new wallet

### Expected Results:
- [ ] Wallet creation works normally
- [ ] No referrer lookup attempted
- [ ] User has no referrer_code in database
- [ ] User gets their own referral code

---

## Test 8: Multiple Transactions

### Steps:
1. [ ] User B makes 3 transactions
2. [ ] Wait for all to sync
3. [ ] Check User A's earnings

### Expected Results:
- [ ] 3 entries in wallet_referral_earnings
- [ ] total_earned = sum of all rewards
- [ ] Each earning has correct percentage
- [ ] All linked to correct transaction_id

---

## Test 9: Different Ranks, Different Rates

### Steps:
1. [ ] User A at Bronze (5%) refers User B
2. [ ] User B makes transaction → A earns 5%
3. [ ] User A reaches Silver (7.5%)
4. [ ] User B makes another transaction → A earns 7.5%

### Expected Results:
- [ ] First earning: 5% commission
- [ ] Second earning: 7.5% commission
- [ ] Both recorded correctly in database

---

## Test 10: Referral Chain

### Steps:
1. [ ] User A refers User B
2. [ ] User B refers User C
3. [ ] User C makes transaction

### Expected Results:
- [ ] User B earns from User C's transaction
- [ ] User A does NOT earn from User C (only 1 level)
- [ ] Each user has their own referral code

---

## Database Queries for Verification

### Check All Referrals
```sql
SELECT 
  u.wallet_address,
  u.referrer_code,
  r.referral_code as own_code,
  r.total_referrals,
  r.total_earned,
  r.rank
FROM wallet_users u
JOIN wallet_referrals r ON u.id = r.user_id
ORDER BY r.total_referrals DESC;
```

### Check All Earnings
```sql
SELECT 
  e.amount,
  e.percentage,
  e.created_at,
  referrer.wallet_address as referrer,
  referred.wallet_address as referred_user
FROM wallet_referral_earnings e
JOIN wallet_users referrer ON e.referrer_id = referrer.id
JOIN wallet_users referred ON e.referred_user_id = referred.id
ORDER BY e.created_at DESC;
```

### Check Referral Relationships
```sql
SELECT 
  u.wallet_address as user,
  u.referrer_code as referred_by,
  r.referral_code as own_code,
  r.total_referrals as people_referred
FROM wallet_users u
JOIN wallet_referrals r ON u.id = r.user_id
WHERE u.referrer_code IS NOT NULL;
```

---

## Common Issues & Solutions

### Issue: "Referrer not found"
**Cause:** Referral code doesn't exist in database
**Solution:** Verify referral code is correct, check wallet_referrals table

### Issue: Referral count not incrementing
**Cause:** Database function not created
**Solution:** Run the updated SQL script with increment_referral_count function

### Issue: No rewards calculated
**Cause:** Transaction sync not running or no fee data
**Solution:** Check transaction has fee in metadata, verify sync is running

### Issue: Wrong commission rate
**Cause:** Rank not updated after referral count changed
**Solution:** Manually call updateReferralRank or wait for next signup

### Issue: Rewards showing 0
**Cause:** Transaction fee too low (< 0.001 TON)
**Solution:** This is expected, minimum threshold prevents spam

---

## Performance Checks

### Response Times
- [ ] Referral code lookup: < 100ms
- [ ] Profile creation with referrer: < 500ms
- [ ] Reward calculation: < 200ms
- [ ] Referral page load: < 1s

### Database Load
- [ ] No slow queries (> 1s)
- [ ] Indexes working correctly
- [ ] No deadlocks or conflicts

---

## Success Criteria

All tests should pass with:
- ✅ No console errors
- ✅ Correct database records
- ✅ Accurate UI display
- ✅ Proper reward calculations
- ✅ Rank progression working
- ✅ Fast response times

---

## Next Steps After Testing

1. [ ] Fix any issues found
2. [ ] Test with multiple users simultaneously
3. [ ] Monitor production logs
4. [ ] Set up alerts for errors
5. [ ] Plan payout system implementation
6. [ ] Add fraud prevention measures

---

## Quick Test Script

Run this in browser console after creating wallet with referral:

```javascript
// Check if referral code was captured
console.log('Referral code from URL:', new URLSearchParams(window.location.hash.split('?')[1]).get('ref'));

// Check localStorage for wallet data
console.log('Stored wallets:', localStorage.getItem('rhiza_wallets'));

// Check if Supabase is configured
console.log('Supabase configured:', !!window.supabaseService);
```

---

## Test Results Template

```
Date: ___________
Tester: ___________

Test 1 - Referral Code Capture: ☐ Pass ☐ Fail
Test 2 - Referral Count Display: ☐ Pass ☐ Fail
Test 3 - Transaction Rewards: ☐ Pass ☐ Fail
Test 4 - Referrer Sees Earnings: ☐ Pass ☐ Fail
Test 5 - Rank Progression: ☐ Pass ☐ Fail
Test 6 - Invalid Code: ☐ Pass ☐ Fail
Test 7 - No Code: ☐ Pass ☐ Fail
Test 8 - Multiple Transactions: ☐ Pass ☐ Fail
Test 9 - Different Rates: ☐ Pass ☐ Fail
Test 10 - Referral Chain: ☐ Pass ☐ Fail

Notes:
_________________________________
_________________________________
_________________________________
```
