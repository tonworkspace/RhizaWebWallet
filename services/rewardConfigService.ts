import { supabaseService } from './supabaseService';

/**
 * Reward Configuration Service
 * Manages database-driven reward amounts with caching
 */

export interface RewardConfig {
  key: string;
  value: number;
  description: string;
  category: string;
  is_active: boolean;
  min_value: number;
  max_value: number;
  updated_at: string;
}

export interface RewardConfigAudit {
  old_value: number;
  new_value: number;
  changed_by: string;
  change_reason: string | null;
  created_at: string;
}

class RewardConfigService {
  private cache: Map<string, number> = new Map();
  private cacheExpiry: number = 0;
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private isRefreshing: boolean = false;

  /**
   * Get reward amount by key (with caching)
   */
  async getRewardAmount(key: string): Promise<number> {
    try {
      // Check cache first
      if (this.isCacheValid() && this.cache.has(key)) {
        console.log(`💰 Reward amount from cache: ${key} = ${this.cache.get(key)}`);
        return this.cache.get(key)!;
      }

      // Refresh cache if needed
      if (!this.isRefreshing) {
        await this.refreshCache();
      }

      // Get from cache after refresh
      const amount = this.cache.get(key);
      if (amount !== undefined) {
        console.log(`💰 Reward amount from DB: ${key} = ${amount}`);
        return amount;
      }

      // Fallback if not found
      console.warn(`⚠️ Reward config not found: ${key}, using fallback`);
      return this.getFallbackAmount(key);
    } catch (error) {
      console.error(`❌ Failed to get reward amount for ${key}:`, error);
      return this.getFallbackAmount(key);
    }
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
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('key');

      if (error) throw error;
      
      console.log(`✅ Fetched ${data?.length || 0} reward configs`);
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch reward configs:', error);
      return [];
    }
  }

  /**
   * Get reward config by key (full details)
   */
  async getRewardConfig(key: string): Promise<RewardConfig | null> {
    try {
      const client = supabaseService.getClient();
      if (!client) throw new Error('Supabase client not available');

      const { data, error } = await client
        .from('reward_config')
        .select('*')
        .eq('key', key)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`❌ Failed to fetch reward config for ${key}:`, error);
      return null;
    }
  }

  /**
   * Update reward config (admin only)
   */
  async updateRewardConfig(
    key: string,
    newValue: number,
    changedBy: string,
    changeReason?: string
  ): Promise<{
    success: boolean;
    message: string;
    oldValue?: number;
    newValue?: number;
  }> {
    try {
      const client = supabaseService.getClient();
      if (!client) throw new Error('Supabase client not available');

      // Call the database function
      const { data, error } = await client.rpc('update_reward_config', {
        p_key: key,
        p_new_value: newValue,
        p_changed_by: changedBy,
        p_change_reason: changeReason || null
      });

      if (error) throw error;

      const result = data?.[0];
      if (!result) throw new Error('No result from update function');

      if (result.success) {
        // Clear cache to force refresh
        this.clearCache();
        console.log(`✅ Updated ${key}: ${result.old_value} → ${result.new_value}`);
      }

      return {
        success: result.success,
        message: result.message,
        oldValue: result.old_value,
        newValue: result.new_value
      };
    } catch (error: any) {
      console.error(`❌ Failed to update reward config for ${key}:`, error);
      return {
        success: false,
        message: error.message || 'Failed to update reward config'
      };
    }
  }

  /**
   * Get reward config history
   */
  async getRewardHistory(key: string, limit: number = 10): Promise<RewardConfigAudit[]> {
    try {
      const client = supabaseService.getClient();
      if (!client) throw new Error('Supabase client not available');

      const { data, error } = await client.rpc('get_reward_config_history', {
        p_key: key,
        p_limit: limit
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`❌ Failed to fetch reward history for ${key}:`, error);
      return [];
    }
  }

  /**
   * Refresh cache from database
   */
  private async refreshCache(): Promise<void> {
    if (this.isRefreshing) {
      console.log('⏳ Cache refresh already in progress, skipping...');
      return;
    }

    this.isRefreshing = true;

    try {
      console.log('🔄 Refreshing reward config cache...');
      const rewards = await this.getAllRewards();
      
      this.cache.clear();
      rewards.forEach(reward => {
        this.cache.set(reward.key, reward.value);
      });

      this.cacheExpiry = Date.now() + this.CACHE_DURATION;
      console.log(`✅ Reward config cache refreshed (${rewards.length} configs, expires in ${this.CACHE_DURATION / 1000}s)`);
    } catch (error) {
      console.error('❌ Failed to refresh reward cache:', error);
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    const isValid = Date.now() < this.cacheExpiry && this.cache.size > 0;
    if (!isValid && this.cache.size > 0) {
      console.log('⏰ Cache expired, will refresh on next request');
    }
    return isValid;
  }

  /**
   * Fallback amounts (updated with 30% reduction, referral kept at 50)
   * Used when database is unavailable or config not found
   * Based on 1 RZC = $0.133 USD
   */
  private getFallbackAmount(key: string): number {
    const fallbacks: Record<string, number> = {
      // Signup & Activation
      'SIGNUP_BONUS': 4,          // ~$0.53 (reduced 11%)
      'ACTIVATION_BONUS': 15,     // ~$2.00 (no change)
      
      // Referral
      'REFERRAL_BONUS': 50,       // ~$6.65 (KEPT at 50 per user request)
      
      // Milestones (reduced 30%)
      'REFERRAL_MILESTONE_10': 53,    // ~$7.05 (was 75)
      'REFERRAL_MILESTONE_50': 88,    // ~$11.70 (was 125)
      'REFERRAL_MILESTONE_100': 350,  // ~$46.55 (was 500)
      'REFERRAL_MILESTONE_250': 560,  // ~$74.48 (was 800)
      'REFERRAL_MILESTONE_500': 1050, // ~$139.65 (was 1500)
      
      // Transaction & Login
      'TRANSACTION_BONUS': 1,     // ~$0.13 (no change)
      'DAILY_LOGIN': 0.75,        // ~$0.10 (reduced 25%)
      
      // Commission
      'PACKAGE_COMMISSION_PERCENT': 10,
      'TON_COMMISSION_PERCENT': 10,
      
      // Squad Mining
      'SQUAD_MINING_BASE_REWARD': 1,  // ~$0.13
      'SQUAD_MINING_COOLDOWN_HOURS': 8,
    };

    const fallbackValue = fallbacks[key] || 0;
    console.log(`🔄 Using fallback for ${key}: ${fallbackValue}`);
    return fallbackValue;
  }

  /**
   * Clear cache (useful for testing or admin updates)
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry = 0;
    console.log('🗑️ Reward config cache cleared');
  }

  /**
   * Force refresh cache (useful for admin panel)
   */
  async forceRefresh(): Promise<void> {
    this.clearCache();
    await this.refreshCache();
  }

  /**
   * Get cache status (for debugging)
   */
  getCacheStatus(): {
    size: number;
    isValid: boolean;
    expiresIn: number;
    entries: Array<{ key: string; value: number }>;
  } {
    const now = Date.now();
    const expiresIn = Math.max(0, this.cacheExpiry - now);
    
    return {
      size: this.cache.size,
      isValid: this.isCacheValid(),
      expiresIn: Math.floor(expiresIn / 1000), // seconds
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({ key, value }))
    };
  }

  /**
   * Preload cache (call on app startup)
   */
  async preloadCache(): Promise<void> {
    console.log('🚀 Preloading reward config cache...');
    await this.refreshCache();
  }
}

// Export singleton instance
export const rewardConfigService = new RewardConfigService();

// Preload cache on module load (optional, can be called explicitly)
if (typeof window !== 'undefined') {
  // Only preload in browser environment
  rewardConfigService.preloadCache().catch(err => {
    console.warn('⚠️ Failed to preload reward config cache:', err);
  });
}
