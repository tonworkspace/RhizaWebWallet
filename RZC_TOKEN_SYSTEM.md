# RZC Community Token System

## Overview
RhizaCore (RZC) is the community token that users earn for participating in the ecosystem. Users receive RZC tokens for creating wallets, referring friends, and reaching milestones.

---

## 🪙 What is RZC?

**RZC (RhizaCore Token)** is a community reward token that:
- Rewards user participation and growth
- Incentivizes referrals beyond TON rewards
- Creates community engagement
- Can be used for future platform features

**Key Difference from TON Rewards:**
- **TON Rewards**: Real cryptocurrency earned from transaction fees (claimable)
- **RZC Tokens**: Community points earned for actions (stored in database)

---

## 💰 How Users Earn RZC

### 1. Signup Bonus
**Amount:** 100 RZC  
**When:** Immediately upon wallet creation  
**Purpose:** Welcome bonus to get started

```typescript
// Automatically awarded in CreateWallet.tsx
await rzcRewardService.awardSignupBonus(userId);
// User receives: 100 RZC
```

### 2. Referral Bonus
**Amount:** 50 RZC per referral  
**When:** Each time someone signs up using your referral link  
**Purpose:** Reward for growing the community

```typescript
// Automatically awarded when referred user creates wallet
await rzcRewardService.awardReferralBonus(
  referrerId,
  referredUserId,
  referredUserAddress
);
// Referrer receives: 50 RZC
```

### 3. Milestone Bonuses
**When:** Reaching referral count milestones  
**Purpose:** Extra rewards for top referrers

| Milestone | Referrals | Bonus RZC |
|-----------|-----------|-----------|
| Bronze | 10 | 500 RZC |
| Silver | 50 | 2,500 RZC |
| Gold | 100 | 10,000 RZC |

```typescript
// Automatically awarded when milestone reached
// Example: User refers 10th person
// → Receives 50 RZC (referral) + 500 RZC (milestone) = 550 RZC total
```

### 4. Transaction Bonus (Future)
**Amount:** 1 RZC per transaction  
**When:** Each transaction completed  
**Purpose:** Reward active users

### 5. Daily Login Bonus (Future)
**Amount:** 5 RZC per day  
**When:** First login each day  
**Purpose:** Encourage daily engagement

---

## 📊 RZC Balance Display

### Dashboard
Users see their RZC balance prominently displayed:

```
┌─────────────────────────────────────┐
│ Welcome back, Alice                 │
│ Rank: Silver Node • 15 Referrals    │
│                                     │
│ RZC Balance                         │
│ 1,250                               │
│ Community Tokens                    │
└─────────────────────────────────────┘
```

### Referral Page
RZC balance shown in rewards overview:

```
┌─────────────────────────────────────┐
│        Community Tokens             │
│                                     │
│         1,250 RZC                   │
│                                     │
│ Earn 50 RZC per referral +          │
│ milestone bonuses!                  │
└─────────────────────────────────────┘
```

---

## 🔄 Complete User Journey

### Example: Alice's RZC Journey

**Day 1: Wallet Creation**
```
Alice creates wallet
→ Receives 100 RZC signup bonus
→ Balance: 100 RZC
```

**Day 2: First Referral**
```
Alice refers Bob
→ Bob creates wallet
→ Alice receives 50 RZC referral bonus
→ Balance: 150 RZC
```

**Week 1: Growing Network**
```
Alice refers 9 more people (total: 10)
→ Receives 50 RZC × 9 = 450 RZC
→ Reaches 10 referral milestone
→ Receives 500 RZC milestone bonus
→ Balance: 1,100 RZC
```

**Month 1: Silver Tier**
```
Alice refers 40 more people (total: 50)
→ Receives 50 RZC × 40 = 2,000 RZC
→ Reaches 50 referral milestone
→ Receives 2,500 RZC milestone bonus
→ Balance: 5,600 RZC
```

**Month 3: Gold Tier**
```
Alice refers 50 more people (total: 100)
→ Receives 50 RZC × 50 = 2,500 RZC
→ Reaches 100 referral milestone
→ Receives 10,000 RZC milestone bonus
→ Balance: 18,100 RZC
```

---

## 💾 Database Structure

### wallet_users Table
```sql
CREATE TABLE wallet_users (
  id UUID PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL,
  rzc_balance NUMERIC(20, 8) DEFAULT 100.0, -- Initial 100 RZC
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### wallet_rzc_transactions Table
```sql
CREATE TABLE wallet_rzc_transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES wallet_users(id),
  type TEXT NOT NULL,              -- signup_bonus, referral_bonus, milestone_bonus, etc.
  amount NUMERIC(20, 8) NOT NULL,  -- Amount awarded
  balance_after NUMERIC(20, 8),    -- Balance after transaction
  description TEXT,                -- Human-readable description
  metadata JSONB,                  -- Additional data
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Transaction Types:**
- `signup_bonus` - Initial 100 RZC
- `referral_bonus` - 50 RZC per referral
- `milestone_bonus` - Milestone rewards
- `transaction_bonus` - Per-transaction rewards
- `daily_login` - Daily login bonus

---

## 🔧 Technical Implementation

### Award RZC Function (Database)
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
  SET rzc_balance = rzc_balance + p_amount,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING rzc_balance INTO v_new_balance;
  
  -- Record transaction
  INSERT INTO wallet_rzc_transactions (
    user_id, type, amount, balance_after, description, metadata
  ) VALUES (
    p_user_id, p_type, p_amount, v_new_balance, p_description, p_metadata
  );
END;
$$ LANGUAGE plpgsql;
```

### RZC Reward Service (TypeScript)
```typescript
// services/rzcRewardService.ts

export const RZC_REWARDS = {
  SIGNUP_BONUS: 100,
  REFERRAL_BONUS: 50,
  REFERRAL_MILESTONE_10: 500,
  REFERRAL_MILESTONE_50: 2500,
  REFERRAL_MILESTONE_100: 10000
};

// Award signup bonus
await rzcRewardService.awardSignupBonus(userId);

// Award referral bonus
await rzcRewardService.awardReferralBonus(
  referrerId,
  referredUserId,
  referredUserAddress
);
```

### Integration Points

**1. CreateWallet.tsx**
```typescript
// After profile created
await rzcRewardService.awardSignupBonus(profileResult.data.id);

// If user was referred
if (referrerId) {
  await rzcRewardService.awardReferralBonus(
    referrerId,
    profileResult.data.id,
    walletAddress
  );
}
```

**2. Dashboard.tsx**
```typescript
// Display RZC balance
<p className="text-2xl font-black text-[#00FF88]">
  {userProfile.rzc_balance?.toLocaleString() || '0'}
</p>
```

**3. Referral.tsx**
```typescript
// Show RZC balance in rewards section
<h3 className="text-4xl font-black text-[#00FF88]">
  {userProfile.rzc_balance?.toLocaleString() || '0'} RZC
</h3>
```

---

## 📈 RZC Economics

### Initial Distribution
- **Signup Bonus**: 100 RZC per user
- **Expected Users**: 10,000
- **Total Distributed**: 1,000,000 RZC

### Referral Distribution
- **Per Referral**: 50 RZC
- **Average Referrals**: 5 per user
- **Total Distributed**: 2,500,000 RZC

### Milestone Distribution
- **10 Referrals**: 500 RZC (10% of users)
- **50 Referrals**: 2,500 RZC (2% of users)
- **100 Referrals**: 10,000 RZC (0.5% of users)
- **Total Distributed**: ~1,000,000 RZC

### Total Supply Estimate
- **Year 1**: ~5,000,000 RZC
- **Inflation**: Controlled by reward rates
- **Utility**: Future platform features

---

## 🎯 Future Use Cases for RZC

### Phase 1: Governance (Planned)
- Vote on platform features
- Propose improvements
- Community decisions

### Phase 2: Premium Features (Planned)
- Priority support
- Advanced analytics
- Custom referral links
- Higher transaction limits

### Phase 3: Marketplace (Planned)
- Trade RZC for TON
- Purchase NFTs
- Access exclusive features
- Staking rewards

### Phase 4: Token Conversion (Future)
- Convert RZC to actual cryptocurrency
- Liquidity pools
- DEX listing
- Real trading value

---

## 🔍 Tracking & Analytics

### User RZC History
```sql
-- Get user's RZC transaction history
SELECT 
  type,
  amount,
  balance_after,
  description,
  created_at
FROM wallet_rzc_transactions
WHERE user_id = 'USER_ID'
ORDER BY created_at DESC;
```

### Top RZC Holders
```sql
-- Get leaderboard
SELECT 
  name,
  wallet_address,
  rzc_balance,
  (SELECT COUNT(*) FROM wallet_referrals WHERE referrer_id = wallet_users.id) as referrals
FROM wallet_users
ORDER BY rzc_balance DESC
LIMIT 100;
```

### RZC Distribution Stats
```sql
-- Get total RZC in circulation
SELECT 
  SUM(rzc_balance) as total_rzc,
  AVG(rzc_balance) as avg_rzc,
  COUNT(*) as total_users
FROM wallet_users;
```

---

## 🧪 Testing

### Test Signup Bonus
```bash
1. Create new wallet
2. Check database: rzc_balance should be 100
3. Check wallet_rzc_transactions for signup_bonus entry
```

### Test Referral Bonus
```bash
1. User A gets referral code
2. User B signs up with code
3. Check User A's rzc_balance increased by 50
4. Check wallet_rzc_transactions for referral_bonus entry
```

### Test Milestone Bonus
```bash
1. User A refers 10 people
2. Check User A's rzc_balance increased by 500 (milestone)
3. Check wallet_rzc_transactions for milestone_bonus entry
```

### Database Queries
```sql
-- Check user's RZC balance
SELECT rzc_balance FROM wallet_users WHERE id = 'USER_ID';

-- Check RZC transactions
SELECT * FROM wallet_rzc_transactions 
WHERE user_id = 'USER_ID' 
ORDER BY created_at DESC;

-- Verify milestone bonus
SELECT * FROM wallet_rzc_transactions 
WHERE type = 'milestone_bonus' 
AND user_id = 'USER_ID';
```

---

## 📊 RZC vs TON Rewards Comparison

| Feature | RZC Tokens | TON Rewards |
|---------|------------|-------------|
| **Type** | Community points | Real cryptocurrency |
| **Earned From** | Signups, referrals, milestones | Transaction fees |
| **Claimable** | No (stored in DB) | Yes (withdraw to wallet) |
| **Initial Amount** | 100 RZC | 0 TON |
| **Per Referral** | 50 RZC | 5-15% of fees |
| **Milestones** | Yes (500-10,000 RZC) | No |
| **Future Use** | Platform features | Spend anywhere |
| **Transferable** | No (currently) | Yes |

---

## ✅ Implementation Checklist

- [x] Add `rzc_balance` field to wallet_users table
- [x] Create wallet_rzc_transactions table
- [x] Create award_rzc_tokens database function
- [x] Create RZCRewardService
- [x] Integrate signup bonus in CreateWallet
- [x] Integrate referral bonus in CreateWallet
- [x] Display RZC balance in Dashboard
- [x] Display RZC balance in Referral page
- [x] Add milestone bonus logic
- [ ] Add transaction bonus (future)
- [ ] Add daily login bonus (future)
- [ ] Create RZC leaderboard page (future)
- [ ] Implement RZC utility features (future)

---

## 🚀 Summary

The RZC token system is now fully implemented:

1. ✅ Users receive 100 RZC on signup
2. ✅ Users earn 50 RZC per referral
3. ✅ Milestone bonuses at 10, 50, 100 referrals
4. ✅ Balance displayed in Dashboard and Referral pages
5. ✅ Full transaction history tracked
6. ✅ Database functions for atomic updates

**Next Steps:**
1. Test the system with real signups
2. Monitor RZC distribution
3. Plan future utility features
4. Consider token conversion options

---

**Status:** ✅ Fully Implemented  
**Build:** ✅ Successful (18.49s)  
**Ready for:** Testing & Production
