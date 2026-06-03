import { useState, useEffect } from 'react';
import { rewardConfigService, RewardConfig } from '../services/rewardConfigService';

/**
 * Hook to fetch and cache reward configuration values
 * Provides real-time reward amounts from database
 */
export function useRewardConfig() {
  const [rewards, setRewards] = useState<Record<string, number>>({
    SIGNUP_BONUS: 4,
    ACTIVATION_BONUS: 15,
    REFERRAL_BONUS: 50,
    REFERRAL_MILESTONE_10: 53,
    REFERRAL_MILESTONE_50: 88,
    REFERRAL_MILESTONE_100: 350,
    REFERRAL_MILESTONE_250: 560,
    REFERRAL_MILESTONE_500: 1050,
    DAILY_LOGIN: 0.75,
    TRANSACTION_BONUS: 1,
    PACKAGE_COMMISSION_PERCENT: 10,
    TON_COMMISSION_PERCENT: 10,
    SQUAD_MINING_BASE_REWARD: 1,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRewards();
  }, []);

  const loadRewards = async () => {
    try {
      setLoading(true);
      setError(null);

      const allRewards = await rewardConfigService.getAllRewards();
      
      if (allRewards.length > 0) {
        const rewardMap: Record<string, number> = {};
        allRewards.forEach(reward => {
          rewardMap[reward.key] = reward.value;
        });
        setRewards(rewardMap);
        console.log('✅ Loaded reward config:', rewardMap);
      }
    } catch (err: any) {
      console.error('❌ Failed to load reward config:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    rewardConfigService.clearCache();
    loadRewards();
  };

  return {
    rewards,
    loading,
    error,
    refresh,
    // Convenience getters
    signupBonus: rewards.SIGNUP_BONUS,
    activationBonus: rewards.ACTIVATION_BONUS,
    referralBonus: rewards.REFERRAL_BONUS,
    dailyLogin: rewards.DAILY_LOGIN,
    packageCommission: rewards.PACKAGE_COMMISSION_PERCENT,
    tonCommission: rewards.TON_COMMISSION_PERCENT,
  };
}
