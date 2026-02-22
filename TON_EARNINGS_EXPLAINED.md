# TON Earnings System - Complete Explanation

## 🎯 Overview

The TON earnings system allows users to earn actual TON cryptocurrency through referrals. When someone you refer makes transactions, you earn a percentage of their transaction fees.

**Key Difference from RZC:**
- **RZC Tokens:** Community points (not cryptocurrency)
- **TON Earnings:** Real cryptocurrency that can be claimed and withdrawn

---

## 💰 How TON Earnings Work

### Commission Structure

Users earn a percentage of transaction fees based on their referral rank:

| Rank | Referrals Required | Commission Rate | Example Earning |
|------|-------------------|-----------------|-----------------|
| Core Node (Bronze) | 0-9 | 5% | 0.01 TON fee → 0.0005 TON earned |
| Silver Node | 10-50 | 7.5% | 0.01 TON fee → 0.00075 TON earned |
| Gold Node | 51-100 | 10% | 0.01 TON fee → 0.001 TON earned |
| Elite Partner (Platinum) | 100+ | 15% | 0.01 TON fee → 0.0015 TON earned |

### Earning Flow

```
1. User A refers User B
   └─> User B creates wallet with referral code

2. User B makes a transaction (send TON)
   └─> Transaction fee: 0.01 TON
   └─> User A's rank: Silver Node (7.5%)
   └─> User A earns: 0.01 × 0.075 = 0.00075 TON

3. Earning is recorded in database
   └─> Added to User A's total_earned
   └─> Can be claimed when minimum reached

4. User A claims rewards
   └─> Minimum: 0.1 TON
   └─> Cooldown: 24 hours between claims
   └─> Status: Pending → Processing → Completed
```

---

## 🔄 Technical Implementation

### 1. Transaction Monitoring

**File:** `services/transactionSync.ts`

The system automatically monitors blockchain transactions:

```typescript
// Runs every 30 seconds
transactionSyncService.startAutoSync(walletAddress, userId, 30000);

// Process:
1. Fetch transactions from TON blockchain
2. Compare with database records
3. Identify new transactions
4. Save to database
5. Calculate and award referral rewards
```

**Key Code:**
```typescript
// When a new transaction is detected
if (isSend && result.data && tx.fee) {
  const feeInTon = Number(tx.fee) / 1e9;
  
  // Process referral reward
  referralRewardService.processReferralReward(
    result.data.id,
    userId,
    feeInTon
  );
}
```

### 2. Reward Calculation

**File:** `services/referralRewardService.ts`

```typescript
// Commission tiers
const COMMISSION_TIERS = {
  'Core Node': 0.05,      // 5%
  'Silver Node': 0.075,   // 7.5%
  'Gold Node': 0.10,      // 10%
  'Elite Partner': 0.15   // 15%
};

// Calculate reward
const rewardAmount = transactionFee × commissionRate;

// Example:
// Fee: 0.01 TON
// Rank: Silver Node (7.5%)
// Reward: 0.01 × 0.075 = 0.00075 TON
```

**Process Flow:**
```typescript
processReferralReward(transactionId, userId, transactionFee) {
  1. Check if fee meets minimum (0.001 TON)
  2. Get user's referral data
  3. Check if user has a referrer
  4. Get referrer's rank
  5. Calculate commission based on rank
  6. Record earning in database
  7. Update referrer's total_earned
}
```

### 3. Reward Claiming

**File:** `services/rewardClaimService.ts`

```typescript
// Claim requirements
MIN_CLAIM_AMOUNT = 0.1 TON
CLAIM_COOLDOWN = 24 hours

// Claim process
canClaim(userId) {
  1. Check if claimable amount ≥ 0.1 TON
  2. Check if 24 hours passed since last claim
  3. Return eligibility status
}

initiateClaimRequest(userId, walletAddress) {
  1. Verify eligibility
  2. Create claim record in database
  3. Set status to "pending"
  4. Return claim ID
}
```

---

## 📊 Database Schema

### wallet_referral_earnings Table

Stores individual earning records:

```sql
CREATE TABLE wallet_referral_earnings (
  id UUID PRIMARY KEY,
  referrer_id UUID,              -- Who earned the reward
  referred_user_id UUID,         -- Who generated the transaction
  amount NUMERIC(20, 8),         -- Amount earned in TON
  percentage NUMERIC(5, 2),      -- Commission percentage used
  transaction_id UUID,           -- Source transaction
  created_at TIMESTAMPTZ
);
```

### wallet_referrals Table

Tracks total earnings:

```sql
CREATE TABLE wallet_referrals (
  id UUID PRIMARY KEY,
  user_id UUID,
  referrer_id UUID,
  referral_code TEXT,
  total_earned NUMERIC(20, 8),   -- Total TON earned
  total_referrals INTEGER,       -- Number of referrals
  rank TEXT,                     -- Current rank
  level INTEGER,                 -- Rank level (1-4)
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### wallet_reward_claims Table

Tracks claim requests:

```sql
CREATE TABLE wallet_reward_claims (
  id UUID PRIMARY KEY,
  user_id UUID,
  amount NUMERIC(20, 8),         -- Amount being claimed
  wallet_address TEXT,           -- Where to send TON
  status TEXT,                   -- pending, processing, completed, failed
  tx_hash TEXT,                  -- Payout transaction hash
  claimed_at TIMESTAMPTZ,        -- When claim was requested
  processed_at TIMESTAMPTZ       -- When payout was sent
);
```

---

## 💡 Example Scenarios

### Scenario 1: First Referral Earning

```
User A (Core Node - 5% commission):
├─> Refers User B
├─> User B makes transaction with 0.01 TON fee
├─> User A earns: 0.01 × 0.05 = 0.0005 TON
└─> Total earned: 0.0005 TON (cannot claim yet, minimum is 0.1 TON)
```

### Scenario 2: Reaching Claim Threshold

```
User A (Silver Node - 7.5% commission):
├─> Has 15 active referrals
├─> Each referral makes ~10 transactions/month
├─> Average fee: 0.01 TON per transaction
├─> Monthly earnings: 15 × 10 × 0.01 × 0.075 = 0.1125 TON
└─> Can claim after 1 month!
```

### Scenario 3: Rank Progression

```
User A starts as Core Node (5%):
├─> Earns from 9 referrals: ~0.045 TON/month
│
├─> Reaches 10 referrals → Silver Node (7.5%)
├─> Earns from 10 referrals: ~0.075 TON/month
│
├─> Reaches 51 referrals → Gold Node (10%)
├─> Earns from 51 referrals: ~0.51 TON/month
│
└─> Reaches 100 referrals → Elite Partner (15%)
    └─> Earns from 100 referrals: ~1.5 TON/month
```

---

## 🎮 User Experience

### In the Referral Page

**Total TON Rewards Earned:**
- Shows cumulative earnings from all referrals
- Updates automatically when referred users make transactions
- Displayed prominently at top of page

**Available to Claim:**
- Shows amount that can be withdrawn
- Calculated as: `total_earned - total_claimed`
- Must be ≥ 0.1 TON to claim

**Claim Button:**
- Enabled when claimable ≥ 0.1 TON AND 24 hours passed
- Disabled with reason if requirements not met
- Shows pending claims count

**Recent Referrals:**
- Lists referred users
- Shows "+0.00 TON" (placeholder for actual earnings per user)
- Displays active/inactive status

---

## 🔧 Current Implementation Status

### ✅ Implemented

1. **Transaction Monitoring**
   - Automatic sync every 30 seconds
   - Detects new transactions from blockchain
   - Saves to database

2. **Reward Calculation**
   - Commission tiers based on rank
   - Automatic calculation on transaction detection
   - Records earnings in database

3. **Earning Tracking**
   - Individual earning records
   - Total earned per user
   - Rank-based commission rates

4. **Claim System**
   - Minimum amount check (0.1 TON)
   - Cooldown period (24 hours)
   - Claim request creation
   - Status tracking

5. **UI Display**
   - Total earned display
   - Claimable amount display
   - Claim button with eligibility check
   - Pending claims indicator

### ⚠️ Not Implemented (Manual Process)

1. **Automated Payouts**
   - Currently requires manual processing
   - Admin must send TON manually
   - No hot wallet integration

2. **Transaction Hash Recording**
   - Payout tx_hash not automatically recorded
   - Must be updated manually after payout

3. **Fraud Detection**
   - No automated fraud checks
   - No suspicious activity alerts

---

## 🚀 How to Enable Automated Payouts

To fully automate the payout process, you need to:

### Option 1: Hot Wallet (Recommended for Small Scale)

```typescript
// Create a hot wallet for automated payouts
const HOT_WALLET_MNEMONIC = process.env.HOT_WALLET_MNEMONIC;

async function processAutomatedPayout(claimId: string) {
  // 1. Get claim details
  const claim = await getClaimDetails(claimId);
  
  // 2. Initialize hot wallet
  await tonWalletService.initializeWallet(
    HOT_WALLET_MNEMONIC.split(' '),
    HOT_WALLET_PASSWORD
  );
  
  // 3. Send TON
  const result = await tonWalletService.sendTransaction(
    claim.wallet_address,
    claim.amount.toString(),
    'Referral reward payout'
  );
  
  // 4. Update claim status
  await updateClaimStatus(claimId, 'completed', result.txHash);
}
```

### Option 2: Smart Contract (Recommended for Large Scale)

See `SMART_CONTRACT_REWARD_SYSTEM.md` for complete implementation guide.

### Option 3: Manual Processing (Current)

1. Admin reviews pending claims in database
2. Admin sends TON manually from their wallet
3. Admin updates claim status with tx_hash

```sql
-- Get pending claims
SELECT * FROM wallet_reward_claims WHERE status = 'pending';

-- After manual payout, update status
UPDATE wallet_reward_claims
SET status = 'completed',
    tx_hash = 'TRANSACTION_HASH_HERE',
    processed_at = NOW()
WHERE id = 'CLAIM_ID_HERE';
```

---

## 📈 Monitoring & Analytics

### Check Total Earnings

```sql
SELECT 
  u.name,
  u.wallet_address,
  r.total_earned,
  r.total_referrals,
  r.rank,
  COUNT(e.id) as earning_count
FROM wallet_users u
JOIN wallet_referrals r ON u.id = r.user_id
LEFT JOIN wallet_referral_earnings e ON u.id = e.referrer_id
GROUP BY u.id, u.name, u.wallet_address, r.total_earned, r.total_referrals, r.rank
ORDER BY r.total_earned DESC
LIMIT 20;
```

### Check Pending Claims

```sql
SELECT 
  u.name,
  u.wallet_address,
  c.amount,
  c.claimed_at,
  c.status
FROM wallet_reward_claims c
JOIN wallet_users u ON c.user_id = u.id
WHERE c.status = 'pending'
ORDER BY c.claimed_at ASC;
```

### Check Earning History

```sql
SELECT 
  referrer.name as referrer_name,
  referred.name as referred_name,
  e.amount,
  e.percentage,
  e.created_at
FROM wallet_referral_earnings e
JOIN wallet_users referrer ON e.referrer_id = referrer.id
JOIN wallet_users referred ON e.referred_user_id = referred.id
ORDER BY e.created_at DESC
LIMIT 50;
```

---

## 🎯 Key Differences: RZC vs TON Earnings

| Feature | RZC Tokens | TON Earnings |
|---------|-----------|--------------|
| **Type** | Community points | Cryptocurrency |
| **Earning Method** | Signup, referrals, milestones | Transaction fees from referrals |
| **Claimable** | No (internal use only) | Yes (withdraw to wallet) |
| **Minimum** | N/A | 0.1 TON |
| **Cooldown** | N/A | 24 hours |
| **Value** | No monetary value | Real TON value |
| **Purpose** | Gamification, future utility | Passive income |
| **Display** | Dashboard, Referral page | Referral page only |
| **Automatic** | Yes (instant) | Yes (on transaction) |
| **Payout** | N/A | Manual/automated |

---

## 🔐 Security Considerations

1. **Minimum Fee Threshold**
   - Prevents spam transactions from generating rewards
   - Set to 0.001 TON minimum

2. **Claim Cooldown**
   - Prevents frequent small claims
   - Reduces transaction costs

3. **Minimum Claim Amount**
   - Ensures claims are economically viable
   - Covers transaction fees

4. **Status Tracking**
   - Prevents double-claiming
   - Tracks payout lifecycle

5. **Database Validation**
   - Referrer must exist
   - User must have referrer
   - Transaction must be confirmed

---

## 📞 Summary

**TON Earnings System:**
- ✅ Monitors transactions automatically
- ✅ Calculates rewards based on rank
- ✅ Records earnings in database
- ✅ Allows claiming with requirements
- ⚠️ Requires manual payout processing (for now)

**To fully automate:**
- Set up hot wallet for payouts
- Implement automated payout function
- Add fraud detection
- Set up monitoring alerts

**Current Status:** Fully functional for tracking and claiming, requires manual payout processing.

---

**Last Updated:** February 21, 2026  
**Version:** 1.0  
**Status:** Production Ready (with manual payouts)
