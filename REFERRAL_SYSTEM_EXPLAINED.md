# Referral System - How It Works

## Current Implementation Status

### ✅ What's Working Now

1. **Referral Code Generation**
   - Each user gets a unique referral code (last 8 chars of wallet address)
   - Stored in `wallet_referrals` table
   - Displayed in Referral UI

2. **Database Structure**
   - `wallet_users` table tracks `referrer_code` (who referred this user)
   - `wallet_referrals` table stores referral stats
   - `wallet_referral_earnings` table ready for tracking individual earnings

3. **UI Display**
   - Shows referral code and link
   - Displays total referrals count
   - Lists referred users
   - Shows conversion rate

### ❌ What's NOT Working Yet

1. **Referral Code Tracking During Signup**
   - URL parameter `?ref=CODE` is not being captured
   - New users are not linked to their referrer
   - `referrer_code` field stays null

2. **Reward Calculation**
   - No automatic reward calculation on transactions
   - `total_earned` stays at 0
   - No entries in `wallet_referral_earnings` table

3. **Referral Count Updates**
   - `total_referrals` is not automatically incremented
   - Manual count from database queries only

---

## How Referral System SHOULD Work

### Step 1: User Shares Referral Link
```
User A has referral code: "A1B2C3D4"
Shares link: https://rhizacore.com/#/create-wallet?ref=A1B2C3D4
```

### Step 2: New User Signs Up
```
User B clicks link → CreateWallet page loads
→ Extract "ref=A1B2C3D4" from URL
→ Store in state during wallet creation
→ When profile created, set referrer_code = "A1B2C3D4"
```

### Step 3: Link Referrer to Referred User
```
1. Look up User A by referral_code "A1B2C3D4"
2. Get User A's user_id
3. Set User B's referrer_id = User A's user_id in wallet_referrals table
4. Increment User A's total_referrals count
```

### Step 4: Calculate Rewards on Transactions
```
When User B makes a transaction:
1. Check if User B has a referrer (referrer_id exists)
2. Calculate reward: transaction_fee × commission_percentage
3. Add reward to User A's total_earned
4. Create entry in wallet_referral_earnings table
5. Optionally: Credit TON to User A's wallet
```

---

## Database Schema Explained

### wallet_users
```sql
id                  -- Unique user ID
wallet_address      -- User's TON wallet address
referrer_code       -- Code of person who referred THIS user
```

### wallet_referrals
```sql
id                  -- Unique referral record ID
user_id             -- User who owns this referral code
referrer_id         -- User who referred THIS user (can be null)
referral_code       -- THIS user's unique code to share
total_earned        -- Total TON earned from referrals
total_referrals     -- Count of users referred by THIS user
rank                -- Referral tier (Bronze, Silver, Gold, etc.)
level               -- Referral level (1-10)
```

### wallet_referral_earnings
```sql
id                  -- Unique earning record ID
referrer_id         -- User who earned the reward
referred_user_id    -- User who generated the transaction
amount              -- Amount of TON earned
percentage          -- Commission percentage used (5%, 10%, etc.)
transaction_id      -- Link to the transaction that generated reward
```

---

## Implementation Plan

### Phase 1: Capture Referral Code During Signup ⚠️ PRIORITY

**File to modify:** `pages/CreateWallet.tsx`

```typescript
import { useSearchParams } from 'react-router-dom';

const CreateWallet: React.FC = () => {
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref'); // Get ?ref=CODE from URL
  
  // ... existing code ...
  
  const handleComplete = async () => {
    // ... existing wallet creation code ...
    
    // When creating profile:
    let referrerId = null;
    
    if (referralCode) {
      // Look up referrer by code
      const referrerResult = await supabaseService.getUserByReferralCode(referralCode);
      if (referrerResult.success && referrerResult.data) {
        referrerId = referrerResult.data.user_id;
        console.log('✅ Referrer found:', referrerId);
      }
    }
    
    // Create profile with referrer_code
    const profileResult = await supabaseService.createOrUpdateProfile({
      wallet_address: walletAddress,
      name: `Rhiza User #${walletAddress.slice(-4)}`,
      avatar: '🌱',
      role: 'user',
      is_active: true,
      referrer_code: referralCode || null // Store who referred this user
    });
    
    // Create referral record with referrer_id
    const referralResult = await supabaseService.createReferralCode(
      profileResult.data.id,
      walletAddress,
      referrerId // Pass referrer's user_id
    );
    
    // If referrer exists, increment their referral count
    if (referrerId) {
      await supabaseService.incrementReferralCount(referrerId);
    }
  };
};
```

### Phase 2: Implement Reward Calculation

**File to create:** `services/referralRewardService.ts`

```typescript
import { supabaseService } from './supabaseService';

export class ReferralRewardService {
  // Commission tiers
  private static COMMISSION_TIERS = {
    'Bronze': 0.05,    // 5%
    'Silver': 0.075,   // 7.5%
    'Gold': 0.10,      // 10%
    'Platinum': 0.15   // 15%
  };
  
  /**
   * Calculate and credit referral reward for a transaction
   */
  static async processReferralReward(
    transactionId: string,
    userId: string,
    transactionFee: number // in TON
  ): Promise<void> {
    // 1. Get user's referral data
    const userReferralResult = await supabaseService.getReferralData(userId);
    if (!userReferralResult.success || !userReferralResult.data) {
      return; // User has no referral record
    }
    
    const userReferral = userReferralResult.data;
    
    // 2. Check if user has a referrer
    if (!userReferral.referrer_id) {
      return; // No referrer to reward
    }
    
    // 3. Get referrer's rank to determine commission
    const referrerResult = await supabaseService.getReferralData(userReferral.referrer_id);
    if (!referrerResult.success || !referrerResult.data) {
      return;
    }
    
    const referrer = referrerResult.data;
    const commissionRate = this.COMMISSION_TIERS[referrer.rank] || 0.05;
    
    // 4. Calculate reward
    const rewardAmount = transactionFee * commissionRate;
    
    // 5. Record the earning
    await supabaseService.recordReferralEarning({
      referrer_id: referrer.user_id,
      referred_user_id: userId,
      amount: rewardAmount,
      percentage: commissionRate * 100,
      transaction_id: transactionId
    });
    
    // 6. Update referrer's total_earned
    const newTotalEarned = referrer.total_earned + rewardAmount;
    await supabaseService.updateReferralStats(
      referrer.user_id,
      newTotalEarned,
      referrer.total_referrals
    );
    
    console.log(`💰 Referral reward: ${rewardAmount} TON credited to referrer`);
  }
}
```

**When to call this:**
- After every confirmed transaction
- In `services/transactionSync.ts` when syncing transactions
- When transaction status changes to 'confirmed'

### Phase 3: Add Missing Supabase Methods

**File to modify:** `services/supabaseService.ts`

```typescript
/**
 * Increment referral count for a user
 */
async incrementReferralCount(userId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!this.client) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { error } = await this.client.rpc('increment_referral_count', {
      user_id: userId
    });

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('❌ Increment referral count error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Record a referral earning
 */
async recordReferralEarning(earning: {
  referrer_id: string;
  referred_user_id: string;
  amount: number;
  percentage: number;
  transaction_id?: string | null;
}): Promise<{
  success: boolean;
  data?: ReferralEarning;
  error?: string;
}> {
  if (!this.client) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await this.client
      .from('wallet_referral_earnings')
      .insert(earning)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('❌ Record earning error:', error);
    return { success: false, error: error.message };
  }
}
```

### Phase 4: Add Database Function

**SQL to run in Supabase:**

```sql
-- Function to increment referral count atomically
CREATE OR REPLACE FUNCTION increment_referral_count(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE wallet_referrals
  SET 
    total_referrals = total_referrals + 1,
    updated_at = NOW()
  WHERE user_id = user_id;
END;
$$ LANGUAGE plpgsql;
```

---

## Reward Calculation Examples

### Example 1: Basic Referral Reward
```
User A refers User B
User B makes transaction with 0.1 TON fee
User A is Bronze tier (5% commission)

Reward = 0.1 TON × 5% = 0.005 TON
User A's total_earned += 0.005 TON
```

### Example 2: Multiple Referrals
```
User A refers 3 users (B, C, D)
User A reaches Silver tier (7.5% commission)

User B transaction: 0.2 TON fee → 0.015 TON reward
User C transaction: 0.15 TON fee → 0.01125 TON reward
User D transaction: 0.3 TON fee → 0.0225 TON reward

Total earned = 0.04875 TON
```

### Example 3: Tier Progression
```
Referrals 0-10: Bronze (5%)
Referrals 11-50: Silver (7.5%)
Referrals 51-100: Gold (10%)
Referrals 100+: Platinum (15%)

As User A gets more referrals, commission rate increases
All future earnings use new rate
```

---

## Testing Checklist

### Test 1: Referral Code Capture
- [ ] Create wallet with `?ref=CODE` in URL
- [ ] Check `wallet_users.referrer_code` is set
- [ ] Check `wallet_referrals.referrer_id` is set
- [ ] Check referrer's `total_referrals` incremented

### Test 2: Reward Calculation
- [ ] Referred user makes transaction
- [ ] Check `wallet_referral_earnings` has new entry
- [ ] Check referrer's `total_earned` increased
- [ ] Verify correct commission percentage used

### Test 3: Multiple Referrals
- [ ] Create 3 wallets with same referral code
- [ ] Check `total_referrals` = 3
- [ ] Each referred user makes transaction
- [ ] Check `total_earned` accumulates correctly

### Test 4: No Referrer
- [ ] Create wallet without `?ref=` parameter
- [ ] User makes transaction
- [ ] No referral earnings created
- [ ] No errors in console

---

## Current Limitations

1. **No Automatic TON Transfer**
   - Rewards tracked in database only
   - Not automatically sent to referrer's wallet
   - Would require smart contract or manual payout system

2. **Transaction Fees Not Tracked**
   - TON blockchain transactions have fees
   - Currently not extracting fee amount from transactions
   - Need to calculate or estimate fees

3. **No Tier Auto-Upgrade**
   - User rank stays at "Core Node"
   - Need logic to upgrade based on referral count
   - Should update rank when thresholds reached

4. **No Fraud Prevention**
   - Users could create multiple wallets
   - No IP tracking or device fingerprinting
   - No minimum transaction amount

---

## Next Steps Priority

1. **HIGH PRIORITY**: Implement referral code capture in CreateWallet
2. **HIGH PRIORITY**: Add incrementReferralCount method
3. **MEDIUM PRIORITY**: Implement reward calculation service
4. **MEDIUM PRIORITY**: Integrate with transaction sync
5. **LOW PRIORITY**: Add tier auto-upgrade logic
6. **LOW PRIORITY**: Implement payout system

---

## Questions to Consider

1. **Where do rewards come from?**
   - Platform takes cut of transaction fees?
   - Separate reward pool?
   - Token minting?

2. **When are rewards paid out?**
   - Immediately on each transaction?
   - Weekly/monthly batch payouts?
   - Minimum threshold before payout?

3. **What transactions count?**
   - All transactions?
   - Only sends (not receives)?
   - Minimum transaction amount?

4. **How to prevent abuse?**
   - KYC requirements?
   - Minimum holding period?
   - Transaction velocity limits?
