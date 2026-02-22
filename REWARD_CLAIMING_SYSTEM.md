# Reward Claiming System

## Overview
Users can now claim their referral rewards directly from the Referral page. The system tracks earned rewards, claimed amounts, and manages the payout process.

---

## 🎯 How It Works

### User Flow
```
1. User earns referral rewards (tracked in database)
2. User navigates to Referral page
3. System shows:
   - Total Earned: All-time earnings
   - Already Claimed: Previously claimed amount
   - Available to Claim: Claimable balance
4. User clicks "CLAIM REWARDS" button
5. System validates:
   - Minimum amount (0.1 TON)
   - Cooldown period (24 hours since last claim)
6. Claim request created with status "pending"
7. Admin/system processes payout (manual or automated)
8. User receives TON in their wallet
9. Claim status updated to "completed"
```

### Technical Flow
```
Referral Page
  ↓ Loads claim stats
  ↓ Checks if can claim
  ↓ User clicks "Claim"
  
RewardClaimService
  ↓ Validates minimum amount
  ↓ Checks cooldown period
  ↓ Creates claim request
  
Database
  ↓ Stores claim in wallet_reward_claims
  ↓ Status: "pending"
  
Admin/System (Future)
  ↓ Processes payout
  ↓ Sends TON transaction
  ↓ Updates status to "completed"
  ↓ Records tx_hash
```

---

## 💾 Database Schema

### New Table: wallet_reward_claims
```sql
CREATE TABLE wallet_reward_claims (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES wallet_users(id),
  amount NUMERIC(20, 8) NOT NULL,
  wallet_address TEXT NOT NULL,
  status TEXT DEFAULT 'pending',  -- pending, processing, completed, failed
  tx_hash TEXT,                    -- Transaction hash after payout
  claimed_at TIMESTAMPTZ,          -- When claim was requested
  processed_at TIMESTAMPTZ         -- When payout was completed
);
```

### Claim Statuses
- **pending**: Claim request submitted, awaiting processing
- **processing**: Payout in progress
- **completed**: TON successfully sent to user
- **failed**: Payout failed, needs retry

---

## 🔧 New Services & Methods

### RewardClaimService (NEW)

#### `canClaim(userId)`
Checks if user is eligible to claim rewards.

**Validations:**
- Minimum amount: 0.1 TON
- Cooldown period: 24 hours since last claim

**Returns:**
```typescript
{
  canClaim: boolean,
  reason?: string,
  claimable?: number,
  nextClaimDate?: Date
}
```

#### `initiateClaimRequest(userId, walletAddress)`
Creates a claim request in the database.

**Process:**
1. Validates eligibility
2. Calculates claimable amount
3. Creates database record
4. Returns claim ID

**Returns:**
```typescript
{
  success: boolean,
  claimId?: string,
  amount?: number,
  error?: string
}
```

#### `getClaimStats(userId)`
Gets comprehensive claim statistics.

**Returns:**
```typescript
{
  totalEarned: number,      // All-time earnings
  totalClaimed: number,     // Total claimed so far
  claimable: number,        // Available to claim now
  pendingClaims: number,    // Claims awaiting processing
  completedClaims: number,  // Successfully processed claims
  lastClaimDate: string     // Last claim timestamp
}
```

### SupabaseService (Updated)

#### `getClaimableRewards(userId)`
Calculates claimable balance.

**Formula:**
```
Claimable = Total Earned - Total Claimed
```

#### `createRewardClaim(userId, amount, walletAddress)`
Creates a new claim record.

#### `getClaimHistory(userId, limit)`
Fetches user's claim history.

---

## 🎨 UI Components

### Claim Button
Located in Referral page rewards overview section.

**States:**
1. **Enabled** (Green): Can claim now
   - Shows "CLAIM REWARDS"
   - Clickable, triggers claim process

2. **Disabled** (Gray): Cannot claim
   - Shows "CLAIM UNAVAILABLE"
   - Displays reason below button

3. **Processing** (Gray): Claim in progress
   - Shows "PROCESSING..."
   - Button disabled

### Claim Information Display
```
Available to Claim: 0.1234 TON
Already Claimed: 0.5678 TON

[CLAIM REWARDS Button]

⏰ You can claim again in 12 hours
⚠️ 1 claim pending processing
```

---

## ⚙️ Configuration

### Minimum Claim Amount
```typescript
const MIN_CLAIM_AMOUNT = 0.1; // 0.1 TON
```

**Purpose:** Prevent spam claims and reduce transaction costs.

**Recommendation:** Adjust based on:
- Average transaction fees
- User feedback
- Business requirements

### Claim Cooldown Period
```typescript
const CLAIM_COOLDOWN_HOURS = 24; // 24 hours
```

**Purpose:** Prevent frequent small claims.

**Recommendation:** Balance between:
- User convenience (shorter = better UX)
- System load (longer = fewer transactions)
- Fraud prevention (longer = safer)

---

## 🚀 Payout Processing

### Current Implementation
Claims are created with status "pending" but **not automatically processed**.

### Payout Options

#### Option 1: Manual Admin Processing (Simplest)
**Process:**
1. Admin views pending claims in Admin Dashboard
2. Admin manually sends TON to user's wallet
3. Admin updates claim status to "completed"
4. Admin records transaction hash

**Pros:**
- Simple to implement
- Full control over payouts
- Easy fraud detection

**Cons:**
- Manual work required
- Slower processing
- Not scalable

#### Option 2: Hot Wallet Automation (Recommended)
**Process:**
1. System maintains a "hot wallet" with TON balance
2. Cron job checks for pending claims
3. Automatically sends TON transactions
4. Updates claim status and records tx_hash

**Pros:**
- Automated processing
- Fast payouts
- Scalable

**Cons:**
- Requires hot wallet security
- Need transaction monitoring
- More complex setup

#### Option 3: Smart Contract (Advanced)
**Process:**
1. Deploy smart contract with reward pool
2. Users claim directly from contract
3. On-chain verification and payout
4. Fully decentralized

**Pros:**
- Trustless system
- Transparent
- No manual intervention

**Cons:**
- Complex development
- Gas costs
- Contract security critical

---

## 🔒 Security Considerations

### Implemented
- ✅ Minimum claim amount (prevent spam)
- ✅ Cooldown period (prevent abuse)
- ✅ Database validation
- ✅ User authentication required

### To Implement
- ⚠️ Maximum claim amount per period
- ⚠️ Fraud detection algorithms
- ⚠️ IP/device tracking
- ⚠️ KYC for large claims
- ⚠️ Multi-signature approval for large amounts
- ⚠️ Hot wallet security (if automated)
- ⚠️ Transaction monitoring and alerts

---

## 🧪 Testing Guide

### Test 1: View Claimable Balance
```bash
1. Login to wallet
2. Navigate to Referral page
3. Check "Available to Claim" amount
4. Verify it matches: Total Earned - Already Claimed
```

### Test 2: Claim Rewards (Eligible)
```bash
1. Ensure claimable balance >= 0.1 TON
2. Ensure 24 hours passed since last claim
3. Click "CLAIM REWARDS" button
4. Verify success message
5. Check database for new claim record
```

### Test 3: Claim Blocked (Minimum Amount)
```bash
1. Ensure claimable balance < 0.1 TON
2. Button should be disabled
3. Message: "Minimum claim amount is 0.1 TON"
```

### Test 4: Claim Blocked (Cooldown)
```bash
1. Make a claim
2. Try to claim again immediately
3. Button should be disabled
4. Message: "You can claim again in X hours"
```

### Test 5: Pending Claims Display
```bash
1. Make a claim (status: pending)
2. Refresh page
3. Verify yellow banner: "1 claim pending processing"
```

### Database Queries
```sql
-- Check claimable amount
SELECT 
  r.total_earned,
  COALESCE(SUM(c.amount), 0) as total_claimed,
  r.total_earned - COALESCE(SUM(c.amount), 0) as claimable
FROM wallet_referrals r
LEFT JOIN wallet_reward_claims c ON r.user_id = c.user_id
WHERE r.user_id = 'USER_ID'
GROUP BY r.user_id, r.total_earned;

-- Check pending claims
SELECT * FROM wallet_reward_claims 
WHERE user_id = 'USER_ID' 
AND status = 'pending'
ORDER BY claimed_at DESC;

-- Check claim history
SELECT 
  amount,
  status,
  claimed_at,
  processed_at,
  tx_hash
FROM wallet_reward_claims
WHERE user_id = 'USER_ID'
ORDER BY claimed_at DESC;
```

---

## 📊 Admin Dashboard Integration (Future)

### Pending Claims View
```
Claim ID | User | Amount | Date | Status | Actions
---------|------|--------|------|--------|--------
abc-123  | EQ.. | 0.5 TON| 2h ago| Pending| [Process] [Reject]
def-456  | UQ.. | 1.2 TON| 5h ago| Pending| [Process] [Reject]
```

### Process Claim Workflow
```
1. Admin clicks "Process"
2. System shows claim details
3. Admin confirms wallet address
4. System sends TON transaction
5. Admin enters transaction hash
6. Claim status updated to "completed"
```

---

## 💡 Best Practices

### For Users
1. **Wait for minimum balance**: Don't claim tiny amounts
2. **Check cooldown**: Plan claims strategically
3. **Verify wallet address**: Ensure correct address before claiming
4. **Track claims**: Monitor pending claims status

### For Developers
1. **Validate everything**: Never trust client-side validation
2. **Log all claims**: Full audit trail
3. **Monitor hot wallet**: If automated, track balance
4. **Handle failures**: Retry logic for failed payouts
5. **Alert on anomalies**: Unusual claim patterns

### For Admins
1. **Review large claims**: Manual approval for big amounts
2. **Check for fraud**: Suspicious patterns
3. **Maintain hot wallet**: Keep sufficient balance
4. **Process regularly**: Don't let claims pile up
5. **Communicate delays**: Inform users of processing times

---

## 🐛 Troubleshooting

### Issue: Button disabled but should be enabled
**Check:**
- Claimable balance >= 0.1 TON?
- 24 hours passed since last claim?
- User logged in?
- Database connection working?

### Issue: Claim created but not showing
**Check:**
- Database record exists?
- Status is "pending"?
- User ID matches?
- Page refreshed?

### Issue: Claimable amount incorrect
**Check:**
- Total earned correct in wallet_referrals?
- All claims counted in wallet_reward_claims?
- Database query correct?
- Decimal precision issues?

### Issue: Cooldown not working
**Check:**
- Last claim timestamp correct?
- Timezone issues?
- Cooldown constant set correctly?
- Date calculation logic?

---

## 📈 Future Enhancements

### Phase 1: Basic Automation
- [ ] Admin dashboard for claim management
- [ ] Email notifications for pending claims
- [ ] Claim status tracking page

### Phase 2: Hot Wallet Integration
- [ ] Hot wallet setup and security
- [ ] Automated payout processing
- [ ] Transaction monitoring
- [ ] Failure handling and retries

### Phase 3: Advanced Features
- [ ] Instant claims (no cooldown for small amounts)
- [ ] Claim scheduling (choose payout date)
- [ ] Batch processing (multiple claims at once)
- [ ] Claim history export

### Phase 4: Smart Contract
- [ ] Deploy reward distribution contract
- [ ] On-chain claim verification
- [ ] Decentralized payout system
- [ ] Governance for claim rules

---

## 📝 Files Modified/Created

### Modified (3 files)
1. `services/supabaseService.ts` - Added 3 claim methods
2. `pages/Referral.tsx` - Added claim UI and logic
3. `supabase_setup_simple.sql` - Added wallet_reward_claims table

### Created (2 files)
1. `services/rewardClaimService.ts` - Claim logic and validation
2. `REWARD_CLAIMING_SYSTEM.md` - This documentation

---

## ✅ Summary

The reward claiming system is now implemented with:

1. ✅ Claim eligibility validation
2. ✅ Minimum amount threshold (0.1 TON)
3. ✅ Cooldown period (24 hours)
4. ✅ Claim request creation
5. ✅ Claim statistics display
6. ✅ User-friendly UI
7. ✅ Database tracking
8. ✅ Error handling

**Status:** Ready for testing
**Next Step:** Implement payout processing (manual or automated)
**Production Ready:** Requires payout system implementation

---

## 🚀 Quick Start

### Update Database
```sql
-- Run in Supabase SQL Editor
-- (Already added to supabase_setup_simple.sql)
CREATE TABLE wallet_reward_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES wallet_users(id),
  amount NUMERIC(20, 8) NOT NULL,
  wallet_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  tx_hash TEXT,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);
```

### Test Claiming
```bash
1. Earn some referral rewards (refer users, they make transactions)
2. Navigate to Referral page
3. Check "Available to Claim" amount
4. Click "CLAIM REWARDS" if eligible
5. Check database for claim record
```

### Process Claims (Manual)
```bash
1. Query pending claims from database
2. Send TON to user's wallet address
3. Update claim status to "completed"
4. Record transaction hash
```

---

**Implementation Complete!** 🎉
Users can now claim their referral rewards through the UI.
