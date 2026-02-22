# RZC Token System - Testing Guide

## ✅ Implementation Status: COMPLETE

The RhizaCore (RZC) community token system has been fully implemented and integrated into the wallet application.

## 🎯 What is RZC?

RZC (RhizaCore Tokens) are community points that users earn for:
- Creating a wallet (100 RZC signup bonus)
- Referring new users (50 RZC per referral)
- Reaching referral milestones (500-10,000 RZC bonuses)

**Important:** RZC tokens are NOT cryptocurrency. They are community points that can be used for future features like governance, premium features, or marketplace benefits.

## 📋 Testing Checklist

### 1. Database Setup

Before testing, ensure your Supabase database has the RZC schema:

```sql
-- Run this in Supabase SQL Editor
-- Check if rzc_balance column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'wallet_users' 
AND column_name = 'rzc_balance';

-- Check if wallet_rzc_transactions table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'wallet_rzc_transactions';

-- Check if award_rzc_tokens function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'award_rzc_tokens';
```

If any of these are missing, run the complete setup script:
```bash
# Use the file: supabase_setup_simple.sql
```

### 2. Test Signup Bonus (100 RZC)

**Steps:**
1. Navigate to `/#/create-wallet`
2. Complete wallet creation process
3. After wallet is created, check the Dashboard
4. You should see "100 RZC" in the profile greeting card

**Expected Result:**
- User receives 100 RZC immediately upon wallet creation
- RZC balance displays in Dashboard profile card
- Transaction recorded in `wallet_rzc_transactions` table

**Verify in Database:**
```sql
-- Check user's RZC balance
SELECT wallet_address, name, rzc_balance 
FROM wallet_users 
ORDER BY created_at DESC 
LIMIT 5;

-- Check RZC transactions
SELECT user_id, type, amount, description, created_at
FROM wallet_rzc_transactions
WHERE type = 'signup_bonus'
ORDER BY created_at DESC
LIMIT 5;
```

### 3. Test Referral Bonus (50 RZC)

**Steps:**
1. Create User A (referrer)
2. Get User A's referral code from Dashboard or Referral page
3. Create User B using referral link: `/#/create-wallet?ref=REFERRAL_CODE`
4. Check User A's RZC balance - should increase by 50 RZC

**Expected Result:**
- User A receives 50 RZC when User B creates wallet
- User B receives 100 RZC signup bonus (not affected by referral)
- Both transactions recorded in database

**Verify in Database:**
```sql
-- Check referral bonus transactions
SELECT 
  u.name as referrer_name,
  t.amount,
  t.description,
  t.metadata,
  t.created_at
FROM wallet_rzc_transactions t
JOIN wallet_users u ON t.user_id = u.id
WHERE t.type = 'referral_bonus'
ORDER BY t.created_at DESC
LIMIT 10;
```

### 4. Test Milestone Bonuses

**Milestones:**
- 10 referrals: 500 RZC
- 50 referrals: 2,500 RZC
- 100 referrals: 10,000 RZC

**Steps:**
1. Create a user (referrer)
2. Create 10 referred users using the referrer's code
3. On the 10th referral, referrer should receive:
   - 50 RZC (referral bonus)
   - 500 RZC (milestone bonus)
   - Total: 550 RZC for that referral

**Expected Result:**
- Milestone bonus awarded automatically when threshold is reached
- Both referral_bonus and milestone_bonus transactions recorded
- User sees total RZC balance updated

**Verify in Database:**
```sql
-- Check milestone bonuses
SELECT 
  u.name,
  t.type,
  t.amount,
  t.description,
  t.metadata,
  t.created_at
FROM wallet_rzc_transactions t
JOIN wallet_users u ON t.user_id = u.id
WHERE t.type = 'milestone_bonus'
ORDER BY t.created_at DESC;

-- Check referral counts
SELECT 
  u.name,
  u.rzc_balance,
  r.total_referrals,
  r.rank
FROM wallet_users u
JOIN wallet_referrals r ON u.id = r.user_id
ORDER BY r.total_referrals DESC
LIMIT 10;
```

### 5. Test RZC Display in UI

**Dashboard Page:**
- Profile greeting card shows RZC balance
- Format: "1,000 RZC" with comma separators

**Referral Page:**
- RZC balance displayed in green badge at top
- Shows "Community Tokens" label
- Displays milestone information

**Expected Result:**
- RZC balance updates in real-time after earning
- Numbers formatted with commas (e.g., 1,000 not 1000)
- Green color (#00FF88) used for RZC amounts

### 6. Test Error Handling

**Test Cases:**
1. **Supabase not configured:**
   - RZC awards should fail gracefully
   - User can still create wallet
   - Console shows warning messages

2. **Database function fails:**
   - Transaction should rollback
   - User balance should not change
   - Error logged to console

3. **Invalid user ID:**
   - Award should fail with error message
   - No partial updates

## 🔍 Debugging Tips

### Check Console Logs

The RZC system logs all operations:
```
🎁 Awarding signup bonus: [user_id]
✅ Signup bonus awarded: 100 RZC
🎁 Awarding referral bonus to: [referrer_id]
✅ Referral bonus awarded: 50 RZC
🎉 Milestone reached: 10 Referrals
```

### Common Issues

**Issue: RZC balance not showing**
- Check if Supabase is configured (.env file)
- Verify database schema is up to date
- Check browser console for errors

**Issue: Referral bonus not awarded**
- Verify referral code is correct
- Check if referrer exists in database
- Ensure referral link includes `?ref=CODE` parameter

**Issue: Milestone bonus not triggered**
- Check referral count in database
- Verify milestone logic in `rzcRewardService.ts`
- Check if milestone was already awarded

## 📊 Database Queries for Testing

### Get User's Complete RZC History
```sql
SELECT 
  t.type,
  t.amount,
  t.balance_after,
  t.description,
  t.metadata,
  t.created_at
FROM wallet_rzc_transactions t
WHERE t.user_id = '[USER_ID]'
ORDER BY t.created_at DESC;
```

### Get Top RZC Earners
```sql
SELECT 
  name,
  wallet_address,
  rzc_balance,
  created_at
FROM wallet_users
ORDER BY rzc_balance DESC
LIMIT 20;
```

### Get Referral Statistics
```sql
SELECT 
  u.name,
  u.rzc_balance,
  r.total_referrals,
  r.rank,
  r.level,
  COUNT(ru.id) as actual_referred_count
FROM wallet_users u
JOIN wallet_referrals r ON u.id = r.user_id
LEFT JOIN wallet_users ru ON ru.referrer_code = r.referral_code
GROUP BY u.id, u.name, u.rzc_balance, r.total_referrals, r.rank, r.level
ORDER BY r.total_referrals DESC;
```

### Get RZC Transaction Summary
```sql
SELECT 
  type,
  COUNT(*) as transaction_count,
  SUM(amount) as total_amount
FROM wallet_rzc_transactions
GROUP BY type
ORDER BY total_amount DESC;
```

## 🎮 Manual Testing Scenarios

### Scenario 1: New User Journey
1. User visits landing page
2. Clicks "Create Wallet"
3. Completes wallet creation
4. **Check:** Dashboard shows 100 RZC
5. Navigate to Referral page
6. **Check:** RZC balance shows 100 RZC
7. Copy referral link
8. Share with friend

### Scenario 2: Referrer Journey
1. User A has referral code
2. User B uses referral link to create wallet
3. **Check:** User A's RZC increases by 50
4. **Check:** User B has 100 RZC (signup bonus)
5. User A checks Referral page
6. **Check:** Shows 1 referral, 50 RZC earned

### Scenario 3: Milestone Achievement
1. User has 9 referrals (450 RZC from referrals)
2. 10th user signs up with referral code
3. **Check:** User receives 50 + 500 = 550 RZC
4. **Check:** Total RZC balance updated correctly
5. **Check:** Milestone transaction recorded

## 🚀 Next Steps

After testing is complete, consider:

1. **RZC Utility Features:**
   - Governance voting (1 RZC = 1 vote)
   - Premium features unlock (e.g., 1,000 RZC for advanced analytics)
   - Marketplace discounts (spend RZC for discounts)
   - Staking rewards boost (RZC holders get higher APY)

2. **RZC Transaction History Page:**
   - Create dedicated page to view all RZC transactions
   - Filter by type (signup, referral, milestone)
   - Export transaction history

3. **RZC Leaderboard:**
   - Show top RZC holders
   - Display referral rankings
   - Gamification elements

4. **RZC Rewards Program:**
   - Daily login bonuses (5 RZC/day)
   - Transaction bonuses (1 RZC per transaction)
   - Special event bonuses

## 📝 Test Results Template

```
Date: [DATE]
Tester: [NAME]
Environment: [Testnet/Mainnet]

✅ Signup Bonus (100 RZC): PASS/FAIL
✅ Referral Bonus (50 RZC): PASS/FAIL
✅ Milestone Bonus (500 RZC): PASS/FAIL
✅ Dashboard Display: PASS/FAIL
✅ Referral Page Display: PASS/FAIL
✅ Database Integrity: PASS/FAIL

Notes:
[Any issues or observations]
```

## 🔐 Security Considerations

1. **RZC Balance Manipulation:**
   - All RZC awards go through database function
   - Frontend cannot directly modify balances
   - Atomic transactions prevent race conditions

2. **Referral Fraud Prevention:**
   - Each user can only be referred once
   - Referral code linked to user ID
   - Self-referral not possible (same wallet address)

3. **Milestone Verification:**
   - Milestones checked against actual referral count
   - Cannot claim same milestone twice
   - Database enforces referral count accuracy

## 📞 Support

If you encounter issues during testing:
1. Check browser console for error messages
2. Verify Supabase connection
3. Review database logs
4. Check this guide's debugging section
5. Review `RZC_TOKEN_SYSTEM.md` for implementation details
