# Bonus Configuration Analysis

## Current Status: ⚠️ HARDCODED

### Summary
**All bonus amounts are currently HARDCODED** in the frontend code. They are NOT fetched from the database.

---

## 📍 Location of Hardcoded Values

### File: `services/rzcRewardService.ts`

```typescript
// RZC reward amounts - HARDCODED
export const RZC_REWARDS = {
  SIGNUP_BONUS: 50,              // Welcome bonus on wallet creation
  ACTIVATION_BONUS: 15,          // Bonus for wallet activation
  REFERRAL_BONUS: 50,            // Bonus for each successful referral
  REFERRAL_MILESTONE_10: 25,     // Bonus at 10 referrals
  REFERRAL_MILESTONE_50: 125,    // Bonus at 50 referrals
  REFERRAL_MILESTONE_100: 500,   // Bonus at 100 referrals
  TRANSACTION_BONUS: 1,          // Small bonus per transaction
  DAILY_LOGIN: 1                 // Daily login bonus
};
```

### Usage Example:
```typescript
static async awardReferralBonus(referrerId: string, ...) {
  // Uses hardcoded value
  const result = await supabaseService.awardRZCTokens(
    referrerId,
    RZC_REWARDS.REFERRAL_BONUS,  // ← HARDCODED: 50 RZC
    'referral_bonus',
    'Referral bonus for inviting user',
    { ... }
  );
}
```

---

## ❌ Problems with Hardcoded Approach

### 1. **No Admin Control**
- Cannot change bonus amounts without code deployment
- Requires developer intervention for simple changes
- No A/B testing capability

### 2. **No Flexibility**
- Cannot run promotional campaigns (e.g., "Double rewards this week!")
- Cannot adjust bonuses based on market conditions
- Cannot create time-limited offers

### 3. **Inconsistency Risk**
- If database has different values, they're ignored
- Frontend and backend can get out of sync
- No single source of truth

### 4. **Maintenance Issues**
- Changes require code updates
- Need to redeploy entire application
- Version control complexity

---

## ✅ Recommended Solution: Database-Driven Configuration

### Step 1: Create Configuration Table

```sql
-- Create rewards configuration table
CREATE TABLE IF NOT EXISTS reward_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value NUMERIC NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  min_value NUMERIC DEFAULT 0,
  max_value NUMERIC DEFAULT 10000,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX idx_reward_config_key ON reward_config(key);
CREATE INDEX idx_reward_config_category ON reward_config(category);
CREATE INDEX idx_reward_config_active ON reward_config(is_active);

-- Enable RLS
ALTER TABLE reward_config ENABLE ROW LEVEL SECURITY;

-- Allow public read (config is public data)
CREATE POLICY "Anyone can read reward config" 
  ON reward_config FOR SELECT 
  USING (is_active = true);

-- Allow admin write
CREATE POLICY "Admins can manage reward config" 
  ON reward_config FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM wallet_users 
      WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
      AND is_admin = true
    )
  );

-- Insert default values
INSERT INTO reward_config (key, value, description, category) VALUES
  ('SIGNUP_BONUS', 50, 'Welcome bonus on wallet creation', 'signup'),
  ('ACTIVATION_BONUS', 15, 'Bonus for wallet activation', 'activation'),
  ('REFERRAL_BONUS', 50, 'Bonus for each successful referral', 'referral'),
  ('REFERRAL_MILESTONE_10', 25, 'Bonus at 10 referrals', 'milestone'),
  ('REFERRAL_MILESTONE_50', 125, 'Bonus at 50 referrals', 'milestone'),
  ('REFERRAL_MILESTONE_100', 500, 'Bonus at 100 referrals', 'milestone'),
  ('TRANSACTION_BONUS', 1, 'Small bonus per transaction', 'transaction'),
  ('DAILY_LOGIN', 1, 'Daily login bonus', 'login'),
  ('PACKAGE_COMMISSION_PERCENT', 10, 'Commission percentage for package purchases', 'commission'),
  ('TON_COMMISSION_PERCENT', 10, 'Commission percentage for TON payments', 'commission')
ON CONFLICT (key) DO NOTHING;
```

### Step 2: Create Helper Function

```sql
-- Function to get reward amount by key
CREATE OR REPLACE FUNCTION get_reward_amount(p_key TEXT)
RETURNS NUMERIC AS $$
DECLARE
  v_amount NUMERIC;
BEGIN
  SELECT value INTO v_amount
  FROM reward_config
  WHERE key = p_key AND is_active = true;
  
  IF v_amount IS NULL THEN
    RAISE EXCEPTION 'Reward config not found: %', p_key;
  END IF;
  
  RETURN v_amount;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get all active rewards
CREATE OR REPLACE FUNCTION get_all_rewards()
RETURNS TABLE (
  key TEXT,
  value NUMERIC,
  description TEXT,
  category TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.key,
    r.value,
    r.description,
    r.category
  FROM reward_config r
  WHERE r.is_active = true
  ORDER BY r.category, r.key;
END;
$$ LANGUAGE plpgsql STABLE;
```

### Step 3: Update Frontend Service

```typescript
// services/rewardConfigService.ts
import { supabaseService } from './supabaseService';

interface RewardConfig {
  key: string;
  value: number;
  description: string;
  category: string;
}

class RewardConfigService {
  private cache: Map<string, number> = new Map();
  private cacheExpiry: number = 0;
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get reward amount by key (with caching)
   */
  async getRewardAmount(key: string): Promise<number> {
    // Check cache first
    if (this.isCacheValid() && this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    // Fetch from database
    await this.refreshCache();
    
    const amount = this.cache.get(key);
    if (amount === undefined) {
      console.warn(`⚠️ Reward config not found: ${key}, using fallback`);
      return this.getFallbackAmount(key);
    }

    return amount;
  }

  /**
   * Get all reward configurations
   */
  async getAllRewards(): Promise<RewardConfig[]> {
    try {
      const client = supabaseService.getClient();
      if (!client) throw new Error('Supabase client not available');

      const { data, error } = await client
        .from('reward_config')
        .select('key, value, description, category')
        .eq('is_active', true)
        .order('category')
        .order('key');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch reward configs:', error);
      return [];
    }
  }

  /**
   * Refresh cache from database
   */
  private async refreshCache(): Promise<void> {
    try {
      const rewards = await this.getAllRewards();
      this.cache.clear();
      
      rewards.forEach(reward => {
        this.cache.set(reward.key, reward.value);
      });

      this.cacheExpiry = Date.now() + this.CACHE_DURATION;
      console.log('✅ Reward config cache refreshed');
    } catch (error) {
      console.error('❌ Failed to refresh reward cache:', error);
    }
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    return Date.now() < this.cacheExpiry && this.cache.size > 0;
  }

  /**
   * Fallback amounts (same as current hardcoded values)
   */
  private getFallbackAmount(key: string): number {
    const fallbacks: Record<string, number> = {
      'SIGNUP_BONUS': 50,
      'ACTIVATION_BONUS': 15,
      'REFERRAL_BONUS': 50,
      'REFERRAL_MILESTONE_10': 25,
      'REFERRAL_MILESTONE_50': 125,
      'REFERRAL_MILESTONE_100': 500,
      'TRANSACTION_BONUS': 1,
      'DAILY_LOGIN': 1,
      'PACKAGE_COMMISSION_PERCENT': 10,
      'TON_COMMISSION_PERCENT': 10,
    };

    return fallbacks[key] || 0;
  }

  /**
   * Clear cache (useful for testing or admin updates)
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry = 0;
  }
}

export const rewardConfigService = new RewardConfigService();
```

### Step 4: Update RZC Reward Service

```typescript
// services/rzcRewardService.ts (UPDATED)
import { supabaseService } from './supabaseService';
import { rewardConfigService } from './rewardConfigService';

export class RZCRewardService {
  /**
   * Award signup bonus to new user
   */
  static async awardSignupBonus(userId: string): Promise<{
    success: boolean;
    amount?: number;
    error?: string;
  }> {
    try {
      console.log('🎁 Awarding signup bonus:', userId);

      // Fetch amount from database
      const amount = await rewardConfigService.getRewardAmount('SIGNUP_BONUS');

      const result = await supabaseService.awardRZCTokens(
        userId,
        amount,  // ← Now from database!
        'signup_bonus',
        'Welcome bonus for creating wallet',
        { bonus_type: 'signup' }
      );

      if (result.success) {
        console.log(`✅ Signup bonus awarded: ${amount} RZC`);
        return { success: true, amount };
      }

      return result;
    } catch (error: any) {
      console.error('❌ Signup bonus error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Award referral bonus to referrer
   */
  static async awardReferralBonus(
    referrerId: string,
    referredUserId: string,
    referredUserAddress: string
  ): Promise<{
    success: boolean;
    amount?: number;
    milestoneReached?: boolean;
    milestoneBonus?: number;
    error?: string;
  }> {
    try {
      console.log('🎁 Awarding referral bonus to:', referrerId);

      // Fetch amount from database
      const amount = await rewardConfigService.getRewardAmount('REFERRAL_BONUS');

      // Award base referral bonus
      const result = await supabaseService.awardRZCTokens(
        referrerId,
        amount,  // ← Now from database!
        'referral_bonus',
        'Referral bonus for inviting user',
        {
          referred_user_id: referredUserId,
          referred_user_address: referredUserAddress
        }
      );

      if (!result.success) {
        return result;
      }

      // Check for milestone bonuses
      const referralData = await supabaseService.getReferralData(referrerId);
      if (referralData.success && referralData.data) {
        const totalReferrals = referralData.data.total_referrals;

        // Fetch milestone amounts from database
        const milestones = [
          { count: 10, key: 'REFERRAL_MILESTONE_10', name: '10 Referrals' },
          { count: 50, key: 'REFERRAL_MILESTONE_50', name: '50 Referrals' },
          { count: 100, key: 'REFERRAL_MILESTONE_100', name: '100 Referrals' }
        ];

        const milestone = milestones.find(m => m.count === totalReferrals);
        if (milestone) {
          console.log(`🎉 Milestone reached: ${milestone.name}`);

          const milestoneAmount = await rewardConfigService.getRewardAmount(milestone.key);

          await supabaseService.awardRZCTokens(
            referrerId,
            milestoneAmount,  // ← Now from database!
            'milestone_bonus',
            `Milestone bonus: ${milestone.name}`,
            {
              milestone: milestone.name,
              referral_count: totalReferrals
            }
          );

          return {
            success: true,
            amount,
            milestoneReached: true,
            milestoneBonus: milestoneAmount
          };
        }
      }

      return {
        success: true,
        amount,
        milestoneReached: false
      };
    } catch (error: any) {
      console.error('❌ Referral bonus error:', error);
      return { success: false, error: error.message };
    }
  }

  // ... other methods updated similarly
}
```

---

## 🎯 Benefits of Database-Driven Approach

### 1. **Admin Control**
- Change bonuses via admin panel
- No code deployment needed
- Instant updates across platform

### 2. **Flexibility**
- Run promotional campaigns
- A/B test different bonus amounts
- Adjust based on market conditions

### 3. **Audit Trail**
- Track who changed what and when
- `updated_by` and `updated_at` fields
- Full history of changes

### 4. **Safety**
- Min/max value constraints
- Validation before applying
- Rollback capability

### 5. **Performance**
- Caching reduces database calls
- 5-minute cache duration
- Fallback to hardcoded values if DB fails

---

## 📊 Comparison

| Feature | Hardcoded (Current) | Database-Driven (Recommended) |
|---------|---------------------|-------------------------------|
| **Admin Control** | ❌ No | ✅ Yes |
| **Instant Updates** | ❌ No (requires deployment) | ✅ Yes |
| **A/B Testing** | ❌ No | ✅ Yes |
| **Promotional Campaigns** | ❌ No | ✅ Yes |
| **Audit Trail** | ❌ No | ✅ Yes |
| **Rollback** | ❌ Difficult | ✅ Easy |
| **Performance** | ✅ Fast (no DB call) | ✅ Fast (with caching) |
| **Reliability** | ✅ Always works | ⚠️ Needs fallback |
| **Maintenance** | ❌ High (code changes) | ✅ Low (admin panel) |

---

## 🚀 Implementation Plan

### Phase 1: Database Setup (1 hour)
1. Create `reward_config` table
2. Insert default values
3. Create helper functions
4. Test queries

### Phase 2: Service Layer (2 hours)
1. Create `rewardConfigService.ts`
2. Implement caching logic
3. Add fallback mechanism
4. Write unit tests

### Phase 3: Update Existing Services (2 hours)
1. Update `rzcRewardService.ts`
2. Update `referralUtils.ts`
3. Update commission calculations
4. Test all reward flows

### Phase 4: Admin Panel (4 hours)
1. Create admin page for reward config
2. Add edit/update functionality
3. Add validation
4. Add audit log display

### Phase 5: Testing & Deployment (2 hours)
1. Test all bonus scenarios
2. Verify caching works
3. Test fallback mechanism
4. Deploy to production

**Total Estimated Time: 11 hours**

---

## 🔧 Quick Fix (Temporary)

If you need to change bonuses NOW without full implementation:

1. **Update hardcoded values** in `services/rzcRewardService.ts`
2. **Redeploy application**
3. **Plan for database-driven approach** in next sprint

---

## 📝 Conclusion

**Current Status:** ⚠️ All bonuses are HARDCODED

**Recommendation:** ✅ Implement database-driven configuration

**Priority:** 🔴 HIGH - This is a critical feature for business flexibility

**Impact:** 
- Better admin control
- Faster iteration
- More promotional opportunities
- Reduced development overhead

**Next Steps:**
1. Review and approve this proposal
2. Create database migration
3. Implement service layer
4. Build admin panel
5. Test and deploy
