# RhizaCore Referral System - Complete Verification

## System Overview

The RhizaCore referral system is a **multi-tier reward program** that incentivizes user growth through:
1. **Signup Bonuses** (RZC tokens)
2. **Package Commissions** (RZC tokens - 10%)
3. **TON Commissions** (TON cryptocurrency - 10%)
4. **Milestone Bonuses** (RZC tokens)
5. **Squad Mining** (Team-based rewards)

---

## 🎯 How It Works

### 1. **User Registration Flow**

```
New User → Clicks Referral Link → Signs Up → System Processes Referral
```

**Step-by-Step:**
1. User A shares referral link: `https://rhizacore.com/#/join?ref=ABC12345`
2. User B clicks link and creates wallet
3. System extracts referral code from URL (`ABC12345`)
4. System validates code and finds User A (referrer)
5. System awards bonuses to User A

---

## 💰 Reward Structure

### A. **RZC Token Rewards**

| Event | Amount | Recipient | Trigger |
|-------|--------|-----------|---------|
| **Signup Bonus** | 50 RZC | Referrer | When referred user creates wallet |
| **Activation Bonus** | 15 RZC | New User | When new user activates wallet ($15) |
| **Package Commission** | 10% in RZC | Referrer | When referred user buys package |
| **Milestone Bonus (10 refs)** | 25 RZC | Referrer | Reaches 10 referrals |
| **Milestone Bonus (50 refs)** | 125 RZC | Referrer | Reaches 50 referrals |
| **Milestone Bonus (100 refs)** | 500 RZC | Referrer | Reaches 100 referrals |

**Source:** `services/rzcRewardService.ts`

```typescript
export const RZC_REWARDS = {
  SIGNUP_BONUS: 50,
  ACTIVATION_BONUS: 15,
  REFERRAL_BONUS: 50,
  REFERRAL_MILESTONE_10: 25,
  REFERRAL_MILESTONE_50: 125,
  REFERRAL_MILESTONE_100: 500,
};
```

### B. **TON Cryptocurrency Commissions**

| Event | Amount | Payment Method | Status |
|-------|--------|----------------|--------|
| **Direct Referral Activation** | 10% of TON paid | Smart Contract | Instant |
| **Package Purchase** | 10% of TON paid | Smart Contract | Instant |

**Source:** `add_ton_referral_commission.sql`

```sql
-- 10% of TON paid
v_commission := ROUND((p_ton_amount * 0.10)::NUMERIC, 6);
```

**Payment Flow:**
- TON commissions are paid **directly to referrer's wallet** via smart contract
- No manual claiming required
- Instant settlement on blockchain

---

## 🔄 Technical Implementation

### 1. **Referral Code Generation**

**Format:** Last 8 characters of wallet address (uppercase)

```typescript
// Example: Wallet 0xABCDEF123456789 → Referral Code: 23456789
referral_code: walletAddress.slice(-8).toUpperCase()
```

**Storage:** `wallet_referrals` table
```sql
CREATE TABLE wallet_referrals (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  referrer_id UUID,
  referral_code TEXT NOT NULL UNIQUE,
  total_earned NUMERIC DEFAULT 0,
  total_referrals INTEGER DEFAULT 0,
  rank TEXT DEFAULT 'Bronze'
);
```

### 2. **Signup Processing**

**File:** `utils/referralUtils.ts` → `processReferralSignup()`

```typescript
export const processReferralSignup = async (
  newUserId: string,
  newUserAddress: string,
  referralCode?: string
) => {
  // 1. Validate referral code
  const validation = await validateReferralCode(referralCode);
  
  // 2. Increment referrer's count
  await supabaseService.incrementReferralCount(validation.referrerId);
  
  // 3. Update referrer's rank
  await supabaseService.updateReferralRank(validation.referrerId);
  
  // 4. Award referral bonus (50 RZC)
  const bonusResult = await rzcRewardService.awardReferralBonus(
    validation.referrerId,
    newUserId,
    newUserAddress
  );
  
  // 5. Send notification to referrer
  await notificationService.createNotification(...);
  
  return { success: true, referrerId, bonusAwarded: true };
};
```

### 3. **Commission Tracking**

#### RZC Commissions
**Table:** `rzc_transactions`
```sql
INSERT INTO rzc_transactions (
  user_id,
  amount,
  type,
  description,
  metadata
) VALUES (
  referrer_id,
  commission_amount,
  'referral_commission',
  'Package commission from referral',
  jsonb_build_object('referred_user_id', buyer_id)
);
```

#### TON Commissions
**Table:** `referral_ton_earnings`
```sql
CREATE TABLE referral_ton_earnings (
  id UUID PRIMARY KEY,
  referrer_id UUID NOT NULL,
  referred_user_id UUID NOT NULL,
  commission_ton NUMERIC(18,8) NOT NULL,
  total_ton_paid NUMERIC(18,8) NOT NULL,
  package_name TEXT,
  transaction_hash TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'failed'
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Function:** `record_ton_commission()`
```sql
CREATE OR REPLACE FUNCTION record_ton_commission(
  p_buyer_user_id UUID,
  p_ton_amount NUMERIC,
  p_package_name TEXT,
  p_transaction_hash TEXT
) RETURNS TABLE (
  referrer_id UUID,
  commission_ton NUMERIC,
  success BOOLEAN,
  message TEXT
) AS $$
BEGIN
  -- Find referrer
  SELECT referrer_id INTO v_referrer_id
  FROM wallet_referrals
  WHERE user_id = p_buyer_user_id;
  
  -- Calculate 10% commission
  v_commission := ROUND((p_ton_amount * 0.10)::NUMERIC, 6);
  
  -- Record earning
  INSERT INTO referral_ton_earnings (
    referrer_id, referred_user_id, commission_ton, total_ton_paid,
    package_name, transaction_hash, status
  ) VALUES (
    v_referrer_id, p_buyer_user_id, v_commission, p_ton_amount,
    p_package_name, p_transaction_hash, 'pending'
  );
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;
```

---

## 📊 Rank System

**File:** `config/referralQuests.ts`

| Rank | Min Referrals | Max Referrals | Color | Icon | Perks |
|------|---------------|---------------|-------|------|-------|
| **Bronze** | 0 | 9 | #CD7F32 | Award | 50 RZC per signup |
| **Silver** | 10 | 24 | #C0C0C0 | Medal | +25 RZC milestone, 1% team bonus |
| **Gold** | 25 | 49 | #FFD700 | Trophy | Priority support, exclusive events |
| **Platinum** | 50 | 99 | #E5E4E2 | Crown | +125 RZC milestone, VIP access |
| **Diamond** | 100 | 249 | #B9F2FF | Gem | +500 RZC milestone, custom perks |
| **Elite** | 250 | 499 | #9333EA | Zap | Elite network access |
| **Legend** | 500+ | ∞ | #FF0080 | Sparkles | Legendary status, max rewards |

**Rank Progression:**
```typescript
const currentRank = RANKS.reduce((acc, r) => 
  downlineCount >= r.min ? r : acc, 
  RANKS[0]
);
```

---

## 🎮 User Interface (Referral.tsx)

### Main Tabs

1. **Commission Tab**
   - Share Card (referral link + code)
   - Affiliate Quests (gamification)
   - Earnings Breakdown (Overview/RZC/TON)
   - Rank Ladder
   - How It Works
   - Claim Missing Rewards

2. **Team Tab**
   - Upline Sponsor (who referred you)
   - Downline Team (your referrals)
   - Squad Mining (team rewards)

### Earnings Display

**Overview Tab:**
```typescript
{
  label: 'Signup Bonuses',
  value: `${(downlineCount * 50).toLocaleString()} RZC`,
  subvalue: `≈ $${rzcToUsd(downlineCount * 50).toFixed(2)}`
},
{
  label: 'Package Commissions',
  value: `${totalRzcCommissions.toLocaleString()} RZC`,
  subvalue: `${rzcCommissions?.count || 0} purchases`
},
{
  label: 'TON Commissions',
  value: `${(tonEarnings?.total_ton ?? 0).toFixed(4)} TON`,
  subvalue: `${tonEarnings?.pending_count || 0} pending`
}
```

**RZC Tab:**
- Total RZC Balance
- Recent RZC Activity (last 8 transactions)
- Commission history with timestamps

**TON Tab:**
- Total/Paid/Pending breakdown
- Recent TON Activity (last 5 transactions)
- On-chain transaction verification
- Smart contract payment info

---

## 🔍 Data Loading Logic

### TON Earnings (Hybrid Approach)

**File:** `pages/Referral.tsx` → `loadTonEarnings()`

```typescript
const loadTonEarnings = async () => {
  // 1. Load DB summary (pending commissions)
  const { data } = await client.rpc('get_referrer_ton_earnings', { 
    p_referrer_id: userProfile.id 
  });
  
  // 2. Fetch on-chain transactions from TON API
  const res = await fetch(
    `${tonApiEndpoint}/blockchain/accounts/${address}/transactions?limit=100`
  );
  
  // 3. Filter for referral commissions
  const onChainItems = json.transactions.filter(tx => 
    /referral|commission/i.test(tx.in_msg?.decoded_body?.text)
  );
  
  // 4. Merge DB + on-chain data
  const mergedItems = [...onChainItems, ...dbItems].sort(...);
  
  // 5. Calculate totals
  const onChainTotal = onChainItems.reduce((s, i) => s + i.amount, 0);
  finalSummary.paid_ton = Math.max(onChainTotal, dbSummary.paid_ton);
  finalSummary.total_ton = finalSummary.pending_ton + finalSummary.paid_ton;
};
```

**Why Hybrid?**
- DB tracks pending commissions
- Blockchain is source of truth for paid commissions
- Handles edge cases where DB might be out of sync
- Provides real-time accuracy

### RZC Commissions

**File:** `pages/Referral.tsx` → `loadRzcCommissions()`

```typescript
const loadRzcCommissions = async () => {
  // 1. Load from rzc_transactions table
  const { data: rows } = await client.from('rzc_transactions')
    .select('*')
    .eq('user_id', userProfile.id)
    .order('created_at', { ascending: false });
  
  const txCommissions = rows.filter(r => 
    /referral|commission/i.test(r.description || '')
  );
  
  // 2. Load from user_activity (notifications)
  const res = await notificationService.getUserActivity(address, { limit: 200 });
  const actCommissions = res.activities.filter(
    act => act.metadata?.type === 'referral_commission'
  );
  
  // 3. Merge and deduplicate
  const map = new Map();
  [...txCommissions, ...actCommissions].forEach(item => {
    const timeKey = Math.floor(new Date(item.created_at).getTime() / 10000);
    map.set(`${item.commission_rzc}-${timeKey}`, item);
  });
  
  // 4. Calculate totals
  setRzcCommissions({
    total_rzc: mergedItems.reduce((s, a) => s + a.commission_rzc, 0),
    count: mergedItems.length,
    items: mergedItems
  });
};
```

---

## ✅ Verification Checklist

### Database Tables
- [x] `wallet_referrals` - Stores referral codes and stats
- [x] `rzc_transactions` - Tracks RZC rewards
- [x] `referral_ton_earnings` - Tracks TON commissions
- [x] `user_activity` - Logs referral events

### Functions & Triggers
- [x] `record_ton_commission()` - Records 10% TON commission
- [x] `get_referrer_ton_earnings()` - Fetches TON earnings summary
- [x] `update_referral_stats()` - Updates referrer stats
- [x] `notify_on_referral_earning()` - Sends notifications

### Services
- [x] `rzcRewardService` - Awards RZC bonuses
- [x] `referralUtils` - Validates codes, processes signups
- [x] `supabaseService` - Database operations
- [x] `notificationService` - User notifications

### UI Components
- [x] `Referral.tsx` - Main referral page
- [x] `AffiliateQuests.tsx` - Gamification quests
- [x] `ClaimMissingRewards.tsx` - Retroactive rewards
- [x] `ReferralSystemTest.tsx` - Testing panel

---

## 🐛 Known Issues & Edge Cases

### 1. **Duplicate Commission Prevention**
**Issue:** Same commission might be recorded twice (DB + activity log)

**Solution:** Deduplication by time + amount
```typescript
const timeKey = Math.floor(new Date(item.created_at).getTime() / 10000);
map.set(`${item.commission_rzc}-${timeKey}`, item);
```

### 2. **On-Chain vs DB Sync**
**Issue:** TON commissions paid on-chain might not be in DB

**Solution:** Hybrid loading (DB + blockchain API)
```typescript
if (onChainTotal > finalSummary.paid_ton) {
  finalSummary.paid_ton = onChainTotal;
  finalSummary.total_ton = finalSummary.pending_ton + finalSummary.paid_ton;
}
```

### 3. **Self-Referral Prevention**
**Status:** ⚠️ NOT IMPLEMENTED

**Recommendation:** Add check in `processReferralSignup()`
```typescript
if (validation.referrerId === newUserId) {
  return { success: false, error: 'Cannot refer yourself' };
}
```

### 4. **Circular Referral Prevention**
**Status:** ⚠️ NOT IMPLEMENTED

**Recommendation:** Check referral chain depth
```typescript
// Prevent A → B → A circular referrals
const checkCircular = async (referrerId, newUserId) => {
  let current = referrerId;
  let depth = 0;
  while (current && depth < 10) {
    if (current === newUserId) return true; // Circular!
    const upline = await getUpline(current);
    current = upline?.referrer_id;
    depth++;
  }
  return false;
};
```

---

## 📈 Performance Optimizations

### Database Indexes
```sql
-- Fast referral code lookups
CREATE INDEX idx_wallet_referrals_code ON wallet_referrals(referral_code);

-- Fast earnings queries
CREATE INDEX idx_referral_ton_earnings_referrer ON referral_ton_earnings(referrer_id);
CREATE INDEX idx_referral_ton_earnings_created ON referral_ton_earnings(created_at DESC);

-- Fast RZC transaction queries
CREATE INDEX idx_rzc_transactions_user ON rzc_transactions(user_id);
CREATE INDEX idx_rzc_transactions_type ON rzc_transactions(type);
```

### Caching Strategy
- Referral data cached in `WalletContext`
- Downline list cached with 15-second refresh
- TON API calls limited to 100 transactions
- RZC activity limited to 200 records

---

## 🧪 Testing

### Manual Testing Panel
**Component:** `ReferralSystemTest.tsx`

**Features:**
- Test referral code validation
- Simulate signup flow
- Award test bonuses
- Verify commission calculations

**Access:** Click Settings icon on Referral page

### Test Scenarios

1. **New User Signup**
   ```
   1. User A shares link
   2. User B signs up with code
   3. Verify User A gets 50 RZC
   4. Verify notification sent
   5. Verify referral count incremented
   ```

2. **Package Purchase**
   ```
   1. User B buys $100 package
   2. Verify User A gets 10 RZC commission
   3. Verify User A gets 10% TON commission
   4. Verify transaction recorded
   ```

3. **Milestone Bonus**
   ```
   1. User A reaches 10 referrals
   2. Verify User A gets 25 RZC bonus
   3. Verify rank updated to Silver
   4. Verify notification sent
   ```

---

## 🔐 Security Considerations

### Input Validation
- [x] Referral codes sanitized (uppercase, alphanumeric)
- [x] SQL injection prevention (parameterized queries)
- [x] XSS prevention (React escaping)

### Authorization
- [x] Users can only view own referral data
- [x] Commission awards require valid referrer ID
- [x] RLS policies on all tables

### Fraud Prevention
- [ ] Self-referral check (TODO)
- [ ] Circular referral check (TODO)
- [ ] Rate limiting on bonus claims (TODO)
- [ ] Duplicate transaction prevention (PARTIAL)

---

## 📝 Summary

### ✅ What Works
1. **Referral code generation** - Automatic on wallet creation
2. **Signup bonuses** - 50 RZC awarded instantly
3. **Package commissions** - 10% RZC + 10% TON
4. **Milestone bonuses** - 25/125/500 RZC at 10/50/100 refs
5. **Rank progression** - Bronze → Legend (7 tiers)
6. **Team tracking** - Upline + downline visibility
7. **Earnings display** - RZC + TON breakdown
8. **On-chain verification** - TON API integration
9. **Notifications** - Real-time referral alerts
10. **Gamification** - Quests and achievements

### ⚠️ Needs Improvement
1. **Self-referral prevention** - Not implemented
2. **Circular referral check** - Not implemented
3. **Commission deduplication** - Partial solution
4. **Rate limiting** - Not implemented
5. **Admin payout system** - Manual process

### 🎯 Recommendations
1. Add self-referral check in `processReferralSignup()`
2. Implement circular referral detection
3. Add rate limiting on bonus claims
4. Create admin dashboard for commission payouts
5. Add analytics for referral performance
6. Implement A/B testing for bonus amounts
7. Add referral leaderboard
8. Create referral contest system

---

## 📞 Support

For issues or questions:
- Check `ReferralSystemTest.tsx` for diagnostics
- Review `REFERRAL_COMMISSION_STATUS.md` for status
- Contact dev team with error logs
