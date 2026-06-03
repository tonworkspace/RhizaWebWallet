import { supabaseService } from './supabaseService';
import { rewardConfigService } from './rewardConfigService';

/**
 * RZC Token Reward Service
 * Handles RhizaCore (RZC) community token rewards
 * 
 * NOTE: Reward amounts are now fetched from database via rewardConfigService
 * Fallback values are maintained in rewardConfigService for reliability
 */

// Legacy hardcoded values (DEPRECATED - kept for reference only)
// Use rewardConfigService.getRewardAmount() instead
export const RZC_REWARDS_LEGACY = {
  SIGNUP_BONUS: 50,
  ACTIVATION_BONUS: 15,
  REFERRAL_BONUS: 50,
  REFERRAL_MILESTONE_10: 25,
  REFERRAL_MILESTONE_50: 125,
  REFERRAL_MILESTONE_100: 500,
  REFERRAL_MILESTONE_250: 1500,
  REFERRAL_MILESTONE_500: 5000,
  TRANSACTION_BONUS: 1,
  DAILY_LOGIN: 1
};

// Milestone thresholds (counts only, rewards fetched from DB)
const MILESTONE_THRESHOLDS = [
  { count: 10, key: 'REFERRAL_MILESTONE_10', name: '10 Referrals' },
  { count: 50, key: 'REFERRAL_MILESTONE_50', name: '50 Referrals' },
  { count: 100, key: 'REFERRAL_MILESTONE_100', name: '100 Referrals' },
  { count: 250, key: 'REFERRAL_MILESTONE_250', name: '250 Referrals' },
  { count: 500, key: 'REFERRAL_MILESTONE_500', name: '500 Referrals' }
];

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
        amount,
        'signup_bonus',
        'Welcome bonus for creating wallet',
        { bonus_type: 'signup' }
      );

      if (result.success) {
        console.log(`✅ Signup bonus awarded: ${amount} RZC`);
        return {
          success: true,
          amount
        };
      }

      return result;
    } catch (error: any) {
      console.error('❌ Signup bonus error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Award activation bonus for $15 wallet activation
   */
  static async awardActivationBonus(
    userId: string,
    transactionHash?: string
  ): Promise<{
    success: boolean;
    amount?: number;
    error?: string;
  }> {
    try {
      console.log('🎁 Awarding activation bonus:', userId);

      // Fetch amount from database
      const amount = await rewardConfigService.getRewardAmount('ACTIVATION_BONUS');

      const result = await supabaseService.awardRZCTokens(
        userId,
        amount,
        'activation_bonus',
        'Welcome bonus for wallet activation',
        { 
          bonus_type: 'activation',
          transaction_hash: transactionHash
        }
      );

      if (result.success) {
        console.log(`✅ Activation bonus awarded: ${amount} RZC`);
        return {
          success: true,
          amount
        };
      }

      return result;
    } catch (error: any) {
      console.error('❌ Activation bonus error:', error);
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
        amount,
        'referral_bonus',
        `Referral bonus for inviting user`,
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

        // Check if user just hit a milestone
        const milestone = MILESTONE_THRESHOLDS.find(m => m.count === totalReferrals);
        if (milestone) {
          console.log(`🎉 Milestone reached: ${milestone.name}`);

          // Fetch milestone reward from database
          const milestoneReward = await rewardConfigService.getRewardAmount(milestone.key);

          await supabaseService.awardRZCTokens(
            referrerId,
            milestoneReward,
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
            milestoneBonus: milestoneReward
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

  /**
   * Award transaction bonus
   */
  static async awardTransactionBonus(
    userId: string,
    transactionId: string
  ): Promise<{
    success: boolean;
    amount?: number;
    error?: string;
  }> {
    try {
      // Fetch amount from database
      const amount = await rewardConfigService.getRewardAmount('TRANSACTION_BONUS');

      const result = await supabaseService.awardRZCTokens(
        userId,
        amount,
        'transaction_bonus',
        'Bonus for completing transaction',
        { transaction_id: transactionId }
      );

      return {
        success: result.success,
        amount,
        error: result.error
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Award daily login bonus
   */
  static async awardDailyLoginBonus(userId: string): Promise<{
    success: boolean;
    amount?: number;
    error?: string;
  }> {
    try {
      // Check if user already got bonus today
      const today = new Date().toISOString().split('T')[0];
      const transactions = await supabaseService.getRZCTransactions(userId, 10);

      if (transactions.success && transactions.data) {
        const todayBonus = transactions.data.find(tx => 
          tx.type === 'daily_login' && 
          tx.created_at.startsWith(today)
        );

        if (todayBonus) {
          return {
            success: false,
            error: 'Daily bonus already claimed today'
          };
        }
      }

      // Fetch amount from database
      const amount = await rewardConfigService.getRewardAmount('DAILY_LOGIN');

      const result = await supabaseService.awardRZCTokens(
        userId,
        amount,
        'daily_login',
        'Daily login bonus',
        { date: today }
      );

      return {
        success: result.success,
        amount,
        error: result.error
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get next milestone info
   */
  static async getNextMilestone(currentReferrals: number): Promise<{
    milestone: number;
    reward: number;
    remaining: number;
  } | null> {
    const nextMilestone = MILESTONE_THRESHOLDS.find(m => m.count > currentReferrals);
    
    if (nextMilestone) {
      // Fetch reward from database
      const reward = await rewardConfigService.getRewardAmount(nextMilestone.key);
      
      return {
        milestone: nextMilestone.count,
        reward,
        remaining: nextMilestone.count - currentReferrals
      };
    }

    return null;
  }

  /**
   * Format RZC amount for display
   */
  static formatRZC(amount: number): string {
    return `${amount.toLocaleString()} RZC`;
  }
}

export const rzcRewardService = RZCRewardService;
