import { supabaseService } from './supabaseService';

/**
 * Referral Reward Service
 * Handles calculation and distribution of referral rewards
 */

// Commission tiers based on referral rank
const COMMISSION_TIERS: Record<string, number> = {
  'Core Node': 0.05,      // Bronze - 5%
  'Silver Node': 0.075,   // Silver - 7.5%
  'Gold Node': 0.10,      // Gold - 10%
  'Elite Partner': 0.15   // Platinum - 15%
};

// Minimum transaction fee to trigger rewards (prevent spam)
const MIN_FEE_FOR_REWARD = 0.001; // 0.001 TON

export class ReferralRewardService {
  /**
   * Process referral reward for a transaction
   * Called after a transaction is confirmed
   */
  static async processReferralReward(
    transactionId: string,
    userId: string,
    transactionFee: number // in TON
  ): Promise<{
    success: boolean;
    rewardAmount?: number;
    error?: string;
  }> {
    try {
      console.log('🎁 Processing referral reward for transaction:', transactionId);

      // Check if fee meets minimum threshold
      if (transactionFee < MIN_FEE_FOR_REWARD) {
        console.log('⚠️ Transaction fee too low for reward:', transactionFee);
        return { success: true, rewardAmount: 0 };
      }

      // 1. Get user's referral data
      const userReferralResult = await supabaseService.getReferralData(userId);
      if (!userReferralResult.success || !userReferralResult.data) {
        console.log('ℹ️ User has no referral record');
        return { success: true, rewardAmount: 0 };
      }

      const userReferral = userReferralResult.data;

      // 2. Check if user has a referrer
      if (!userReferral.referrer_id) {
        console.log('ℹ️ User has no referrer');
        return { success: true, rewardAmount: 0 };
      }

      console.log('✅ User has referrer:', userReferral.referrer_id);

      // 3. Get referrer's rank to determine commission
      const referrerResult = await supabaseService.getReferralData(
        userReferral.referrer_id
      );
      if (!referrerResult.success || !referrerResult.data) {
        console.warn('⚠️ Referrer data not found');
        return { success: false, error: 'Referrer data not found' };
      }

      const referrer = referrerResult.data;
      const commissionRate = COMMISSION_TIERS[referrer.rank] || 0.05;

      console.log(`💰 Commission rate: ${commissionRate * 100}% (${referrer.rank})`);

      // 4. Calculate reward
      const rewardAmount = transactionFee * commissionRate;

      console.log(`💵 Reward amount: ${rewardAmount} TON`);

      // 5. Record the earning
      const earningResult = await supabaseService.recordReferralEarning({
        referrer_id: referrer.user_id,
        referred_user_id: userId,
        amount: rewardAmount,
        percentage: commissionRate * 100,
        transaction_id: transactionId
      });

      if (!earningResult.success) {
        console.error('❌ Failed to record earning:', earningResult.error);
        return { success: false, error: earningResult.error };
      }

      // 6. Update referrer's total_earned
      const newTotalEarned = referrer.total_earned + rewardAmount;
      const updateResult = await supabaseService.updateReferralStats(
        referrer.user_id,
        newTotalEarned,
        referrer.total_referrals
      );

      if (!updateResult.success) {
        console.error('❌ Failed to update referrer stats:', updateResult.error);
        return { success: false, error: updateResult.error };
      }

      console.log(`✅ Referral reward processed: ${rewardAmount} TON credited to referrer`);

      return { success: true, rewardAmount };
    } catch (error: any) {
      console.error('❌ Referral reward processing error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate potential reward for a transaction
   * Used for preview/display purposes
   */
  static calculatePotentialReward(
    transactionFee: number,
    referrerRank: string
  ): number {
    const commissionRate = COMMISSION_TIERS[referrerRank] || 0.05;
    return transactionFee * commissionRate;
  }

  /**
   * Get commission rate for a rank
   */
  static getCommissionRate(rank: string): number {
    return COMMISSION_TIERS[rank] || 0.05;
  }

  /**
   * Get all commission tiers
   */
  static getCommissionTiers(): Record<string, number> {
    return { ...COMMISSION_TIERS };
  }

  /**
   * Estimate transaction fee (simplified)
   * In production, this should use actual TON blockchain fee calculation
   */
  static estimateTransactionFee(amount: number): number {
    // Simplified fee estimation
    // Actual TON fees vary based on network conditions
    const baseFee = 0.01; // 0.01 TON base fee
    const percentageFee = amount * 0.001; // 0.1% of amount
    return Math.max(baseFee, percentageFee);
  }
}

export const referralRewardService = ReferralRewardService;
