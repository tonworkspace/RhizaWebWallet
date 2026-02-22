import { supabaseService } from './supabaseService';

/**
 * RZC Token Reward Service
 * Handles RhizaCore (RZC) community token rewards
 */

// RZC reward amounts
export const RZC_REWARDS = {
  SIGNUP_BONUS: 100,           // Initial bonus on wallet creation
  REFERRAL_BONUS: 50,          // Bonus for each successful referral
  REFERRAL_MILESTONE_10: 500,  // Bonus at 10 referrals
  REFERRAL_MILESTONE_50: 2500, // Bonus at 50 referrals
  REFERRAL_MILESTONE_100: 10000, // Bonus at 100 referrals
  TRANSACTION_BONUS: 1,        // Small bonus per transaction
  DAILY_LOGIN: 5               // Daily login bonus
};

// Milestone thresholds
const MILESTONES = [
  { count: 10, reward: RZC_REWARDS.REFERRAL_MILESTONE_10, name: '10 Referrals' },
  { count: 50, reward: RZC_REWARDS.REFERRAL_MILESTONE_50, name: '50 Referrals' },
  { count: 100, reward: RZC_REWARDS.REFERRAL_MILESTONE_100, name: '100 Referrals' }
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

      const result = await supabaseService.awardRZCTokens(
        userId,
        RZC_REWARDS.SIGNUP_BONUS,
        'signup_bonus',
        'Welcome bonus for creating wallet',
        { bonus_type: 'signup' }
      );

      if (result.success) {
        console.log(`✅ Signup bonus awarded: ${RZC_REWARDS.SIGNUP_BONUS} RZC`);
        return {
          success: true,
          amount: RZC_REWARDS.SIGNUP_BONUS
        };
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

      // Award base referral bonus
      const result = await supabaseService.awardRZCTokens(
        referrerId,
        RZC_REWARDS.REFERRAL_BONUS,
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
        const milestone = MILESTONES.find(m => m.count === totalReferrals);
        if (milestone) {
          console.log(`🎉 Milestone reached: ${milestone.name}`);

          await supabaseService.awardRZCTokens(
            referrerId,
            milestone.reward,
            'milestone_bonus',
            `Milestone bonus: ${milestone.name}`,
            {
              milestone: milestone.name,
              referral_count: totalReferrals
            }
          );

          return {
            success: true,
            amount: RZC_REWARDS.REFERRAL_BONUS,
            milestoneReached: true,
            milestoneBonus: milestone.reward
          };
        }
      }

      return {
        success: true,
        amount: RZC_REWARDS.REFERRAL_BONUS,
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
      const result = await supabaseService.awardRZCTokens(
        userId,
        RZC_REWARDS.TRANSACTION_BONUS,
        'transaction_bonus',
        'Bonus for completing transaction',
        { transaction_id: transactionId }
      );

      return {
        success: result.success,
        amount: RZC_REWARDS.TRANSACTION_BONUS,
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

      const result = await supabaseService.awardRZCTokens(
        userId,
        RZC_REWARDS.DAILY_LOGIN,
        'daily_login',
        'Daily login bonus',
        { date: today }
      );

      return {
        success: result.success,
        amount: RZC_REWARDS.DAILY_LOGIN,
        error: result.error
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get next milestone info
   */
  static getNextMilestone(currentReferrals: number): {
    milestone: number;
    reward: number;
    remaining: number;
  } | null {
    const nextMilestone = MILESTONES.find(m => m.count > currentReferrals);
    
    if (nextMilestone) {
      return {
        milestone: nextMilestone.count,
        reward: nextMilestone.reward,
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
