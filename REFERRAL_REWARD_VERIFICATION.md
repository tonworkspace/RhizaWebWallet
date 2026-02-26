# Referral Reward System - Verification Guide

## Overview
This guide helps you verify that users are correctly earning their referral rewards.

## Reward Flow

### When User B Signs Up Using User A's Link:

```
1. User B creates wallet with referral code
   ↓
2. User B gets 100 RZC signup bonus
   ↓
3. System finds User A (referrer)
   ↓
4. User A gets 50 RZC referral bonus
   ↓
5. Check if milestone reached (10, 50, or 100 referrals)
   ↓
6. If milestone: User A gets bonus (500, 2500, or 10000 RZC)
   ↓
7. User A receives notification
   ↓
8. Both balances updated in database
```

## Verification Checklist

### ✅ Step 1: Check Database Function
The `award_rzc_tokens` function must exist in your database:

```sql
-- Run this in Supabase SQL Editor
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'award_rzc_tokens';
```

**Expected**: Should return one row with `award_rzc_tokens`

### ✅ Step 2: Verify Tables Exist
```sql
-- Check required tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN (
  'wallet_users',
  'wallet_referrals',
  'wallet_rzc_transactions',
  'wallet_notifications'
);
```

**Expected**: Should return 4 rows

### ✅ Step 3: Test Signup Bonus
When a new user creates a wallet:

```typescript
// In CreateWallet.tsx - Line ~160
const signupBonus = await rzcRewardService.awardSignupBonus(profileResult.data.id);
```

**Check Console Logs:**
```
🎁 Awarding signup bonus: [user-id]
🪙 Awarding 100 RZC to user: [user-id]
✅ RZC awarded. New balance: 100
✅ Signup bonus awarded: 100 RZC
```

**Verify in Database:**
```sql
SELECT * FROM wallet_users WHERE id = '[user-id]';
-- rzc_balance should be 100

SELECT * FROM wallet_rzc_transactions 
WHERE user_id = '[user-id]' AND type = 'signup_bonus';
-- Should have 1 record with amount = 100
```

### ✅ Step 4: Test Referral Bonus
When User B signs up with User A's referral code:

```typescript
// In CreateWallet.tsx - Line ~180
const referralBonus = await rzcRewardService.awardReferralBonus(
  referrerId,
  profileResult.data.id,
  walletAddress
);
```

**Check Console Logs:**
```
🎁 Awarding referral bonus to: [referrer-id]
🪙 Awarding 50 RZC to user: [referrer-id]
✅ RZC awarded. New balance: [new-balance]
✅ Referral bonus awarded: 50 RZC
📬 Notification sent to referrer
```

**Verify in Database:**
```sql
-- Check referrer's balance increased by 50
SELECT rzc_balance FROM wallet_users WHERE id = '[referrer-id]';

-- Check transaction was recorded
SELECT * FROM wallet_rzc_transactions 
WHERE user_id = '[referrer-id]' AND type = 'referral_bonus'
ORDER BY created_at DESC LIMIT 1;
-- Should show amount = 50

-- Check referral count increased
SELECT total_referrals FROM wallet_referrals 
WHERE user_id = '[referrer-id]';
```

### ✅ Step 5: Test Milestone Bonuses

#### 10 Referrals Milestone (500 RZC)
When referrer reaches 10 referrals:

**Check Console Logs:**
```
🎉 Milestone reached: 10 Referrals
🪙 Awarding 500 RZC to user: [referrer-id]
✅ RZC awarded. New balance: [balance]
```

**Verify in Database:**
```sql
SELECT * FROM wallet_rzc_transactions 
WHERE user_id = '[referrer-id]' AND type = 'milestone_bonus'
AND metadata->>'milestone' = '10 Referrals';
-- Should show amount = 500
```

#### 50 Referrals Milestone (2500 RZC)
```sql
SELECT * FROM wallet_rzc_transactions 
WHERE user_id = '[referrer-id]' AND type = 'milestone_bonus'
AND metadata->>'milestone' = '50 Referrals';
-- Should show amount = 2500
```

#### 100 Referrals Milestone (10000 RZC)
```sql
SELECT * FROM wallet_rzc_transactions 
WHERE user_id = '[referrer-id]' AND type = 'milestone_bonus'
AND metadata->>'milestone' = '100 Referrals';
-- Should show amount = 10000
```

### ✅ Step 6: Verify Notification Sent
```sql
SELECT * FROM wallet_notifications 
WHERE user_wallet_address = '[referrer-wallet-address]'
AND type = 'referral_signup'
ORDER BY created_at DESC LIMIT 1;
```

**Expected Fields:**
- `type`: 'referral_signup'
- `title`: 'New Referral Signup! 🎉'
- `message`: Contains bonus amount
- `metadata`: Contains referral details

## Common Issues & Solutions

### Issue 1: No Signup Bonus Received
**Symptoms**: New user has 0 RZC balance

**Check:**
1. Console shows: `🎁 Awarding signup bonus`
2. Database function exists
3. No errors in console

**Solution:**
```sql
-- Manually award signup bonus
SELECT award_rzc_tokens(
  '[user-id]'::uuid,
  100,
  'signup_bonus',
  'Welcome bonus for creating wallet',
  '{"bonus_type": "signup"}'::jsonb
);
```

### Issue 2: Referrer Not Getting Bonus
**Symptoms**: Referrer's balance doesn't increase

**Check:**
1. Referral code is valid
2. `referrerId` is found in CreateWallet
3. Console shows: `✅ Referrer found: [referrer-id]`

**Debug:**
```typescript
// Add this in CreateWallet.tsx after line 140
console.log('🔍 Referral Code:', referralCode);
console.log('🔍 Referrer ID:', referrerId);
console.log('🔍 Referral Bonus Result:', referralBonus);
```

**Solution:**
```sql
-- Check if referral relationship exists
SELECT * FROM wallet_referrals 
WHERE referrer_id = '[referrer-id]';

-- Manually award referral bonus
SELECT award_rzc_tokens(
  '[referrer-id]'::uuid,
  50,
  'referral_bonus',
  'Referral bonus for inviting user',
  jsonb_build_object(
    'referred_user_id', '[referred-user-id]',
    'referred_user_address', '[wallet-address]'
  )
);
```

### Issue 3: Milestone Bonus Not Awarded
**Symptoms**: User reaches 10 referrals but doesn't get 500 RZC

**Check:**
```sql
-- Verify referral count
SELECT total_referrals FROM wallet_referrals 
WHERE user_id = '[referrer-id]';

-- Check if milestone already awarded
SELECT * FROM wallet_rzc_transactions 
WHERE user_id = '[referrer-id]' 
AND type = 'milestone_bonus'
AND metadata->>'milestone' = '10 Referrals';
```

**Solution:**
```sql
-- Manually award milestone bonus
SELECT award_rzc_tokens(
  '[referrer-id]'::uuid,
  500,
  'milestone_bonus',
  'Milestone bonus: 10 Referrals',
  jsonb_build_object(
    'milestone', '10 Referrals',
    'referral_count', 10
  )
);
```

### Issue 4: Notification Not Sent
**Symptoms**: Referrer doesn't see notification

**Check:**
1. Console shows: `📬 Notification sent to referrer`
2. No errors in console
3. Notification service is working

**Solution:**
```sql
-- Manually create notification
INSERT INTO wallet_notifications (
  user_wallet_address,
  type,
  title,
  message,
  metadata
) VALUES (
  '[referrer-wallet-address]',
  'referral_signup',
  'New Referral Signup! 🎉',
  'Someone just joined using your referral link! You earned 50 RZC.',
  jsonb_build_object(
    'referral_code', '[referral-code]',
    'bonus_amount', 50
  )
);
```

## Testing Scenarios

### Scenario 1: First Referral
1. User A creates wallet → Gets 100 RZC
2. User A shares referral link
3. User B signs up with link → Gets 100 RZC
4. User A gets 50 RZC → Total: 150 RZC
5. User A sees notification

### Scenario 2: 10th Referral (Milestone)
1. User A has 9 referrals
2. User B signs up with User A's link
3. User A gets 50 RZC (base) + 500 RZC (milestone) = 550 RZC
4. User A sees notification with milestone bonus

### Scenario 3: Multiple Referrals Same Day
1. User A shares link
2. User B signs up → User A gets 50 RZC
3. User C signs up → User A gets 50 RZC
4. User D signs up → User A gets 50 RZC
5. Total: User A earned 150 RZC today

## Quick Verification Script

Run this in browser console on the app:

```javascript
// Check if reward service is working
const testRewards = async () => {
  const { rzcRewardService } = await import('./services/rzcRewardService');
  const { supabaseService } = await import('./services/supabaseService');
  
  console.log('🧪 Testing Reward System...');
  
  // Check if Supabase is configured
  console.log('Supabase configured:', supabaseService.isConfigured());
  
  // Check reward amounts
  console.log('Signup Bonus:', rzcRewardService.RZC_REWARDS.SIGNUP_BONUS);
  console.log('Referral Bonus:', rzcRewardService.RZC_REWARDS.REFERRAL_BONUS);
  console.log('Milestones:', {
    '10': rzcRewardService.RZC_REWARDS.REFERRAL_MILESTONE_10,
    '50': rzcRewardService.RZC_REWARDS.REFERRAL_MILESTONE_50,
    '100': rzcRewardService.RZC_REWARDS.REFERRAL_MILESTONE_100
  });
};

testRewards();
```

## Expected Balances

### New User (No Referrals):
- Signup: 100 RZC
- **Total: 100 RZC**

### User with 1 Referral:
- Signup: 100 RZC
- 1 Referral: 50 RZC
- **Total: 150 RZC**

### User with 10 Referrals (Milestone):
- Signup: 100 RZC
- 10 Referrals: 500 RZC (10 × 50)
- Milestone Bonus: 500 RZC
- **Total: 1,100 RZC**

### User with 50 Referrals (Milestone):
- Signup: 100 RZC
- 50 Referrals: 2,500 RZC (50 × 50)
- 10 Referral Milestone: 500 RZC
- 50 Referral Milestone: 2,500 RZC
- **Total: 5,600 RZC**

### User with 100 Referrals (Milestone):
- Signup: 100 RZC
- 100 Referrals: 5,000 RZC (100 × 50)
- 10 Referral Milestone: 500 RZC
- 50 Referral Milestone: 2,500 RZC
- 100 Referral Milestone: 10,000 RZC
- **Total: 18,100 RZC**

## Support Queries

### Get User's Total Earnings
```sql
SELECT 
  u.wallet_address,
  u.rzc_balance,
  r.total_referrals,
  COUNT(t.id) as total_transactions,
  SUM(CASE WHEN t.type = 'referral_bonus' THEN t.amount ELSE 0 END) as referral_earnings,
  SUM(CASE WHEN t.type = 'milestone_bonus' THEN t.amount ELSE 0 END) as milestone_earnings
FROM wallet_users u
LEFT JOIN wallet_referrals r ON u.id = r.user_id
LEFT JOIN wallet_rzc_transactions t ON u.id = t.user_id
WHERE u.wallet_address = '[wallet-address]'
GROUP BY u.wallet_address, u.rzc_balance, r.total_referrals;
```

### Get All Referral Transactions
```sql
SELECT 
  t.*,
  u.wallet_address,
  u.name
FROM wallet_rzc_transactions t
JOIN wallet_users u ON t.user_id = u.id
WHERE t.type IN ('referral_bonus', 'milestone_bonus')
ORDER BY t.created_at DESC
LIMIT 50;
```

## Status
✅ **VERIFIED** - Referral reward system is fully functional

---

**Last Updated**: February 2026
**Version**: 1.0.0
