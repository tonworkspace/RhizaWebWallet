import { supabaseService } from './supabaseService';
import { rzcRewardService } from './rzcRewardService';

/**
 * Referral Reward Checker Service
 * Checks for missing referral rewards and claims them
 */

export class ReferralRewardChecker {
  /**
   * Check if a user has missing referral bonuses
   */
  static async checkMissingBonuses(userId: string): Promise<{
    success: boolean;
    hasMissing: boolean;
    missingCount?: number;
    missingAmount?: number;
    referredUsers?: any[];
    error?: string;
  }> {
    try {
      console.log('🔍 Checking for missing referral bonuses for user:', userId);

      // Get user's referral data
      const referralResult = await supabaseService.getReferralData(userId);
      if (!referralResult.success || !referralResult.data) {
        return { success: false, hasMissing: false, error: 'No referral data found' };
      }

      const totalReferrals = referralResult.data.total_referrals;

      // Get actual bonuses received
      const transactionsResult = await supabaseService.getRZCTransactions(userId, 100);
      if (!transactionsResult.success) {
        return { success: false, hasMissing: false, error: 'Could not fetch transactions' };
      }

      const bonusesReceived = transactionsResult.data?.filter(
        tx => tx.type === 'referral_bonus'
      ).length || 0;

      const missingCount = totalReferrals - bonusesReceived;

      if (missingCount <= 0) {
        console.log('✅ No missing bonuses');
        return {
          success: true,
          hasMissing: false,
          missingCount: 0,
          missingAmount: 0
        };
      }

      console.log(`⚠️ Found ${missingCount} missing bonuses`);

      // Get the referred users who didn't trigger a bonus
      const downlineResult = await supabaseService.getDownline(userId);
      if (!downlineResult.success || !downlineResult.data) {
        return {
          success: true,
          hasMissing: true,
          missingCount,
          missingAmount: missingCount * 50,
          error: 'Could not fetch referred users'
        };
      }

      // Find which referred users didn't trigger a bonus
      const referredUsers = downlineResult.data.filter((user: any) => {
        const hasBonus = transactionsResult.data?.some(
          tx => tx.type === 'referral_bonus' && 
                tx.metadata?.referred_user_id === user.id
        );
        return !hasBonus;
      });

      return {
        success: true,
        hasMissing: true,
        missingCount,
        missingAmount: missingCount * 25, // Updated to 25 RZC per referral
        referredUsers
      };
    } catch (error: any) {
      console.error('❌ Check missing bonuses error:', error);
      return { success: false, hasMissing: false, error: error.message };
    }
  }

  /**
   * Claim missing referral bonuses
   */
  static async claimMissingBonuses(userId: string): Promise<{
    success: boolean;
    claimed?: number;
    amount?: number;
    error?: string;
  }> {
    try {
      console.log('💰 Claiming missing referral bonuses for user:', userId);

      // First check what's missing
      const checkResult = await this.checkMissingBonuses(userId);
      if (!checkResult.success || !checkResult.hasMissing) {
        return {
          success: false,
          error: checkResult.error || 'No missing bonuses to claim'
        };
      }

      if (!checkResult.referredUsers || checkResult.referredUsers.length === 0) {
        return {
          success: false,
          error: 'Could not identify referred users'
        };
      }

      console.log(`📝 Claiming ${checkResult.missingCount} missing bonuses`);

      let claimedCount = 0;
      let totalAmount = 0;

      // Award bonus for each missing referral
      for (const referredUser of checkResult.referredUsers) {
        try {
          const result = await rzcRewardService.awardReferralBonus(
            userId,
            referredUser.id,
            referredUser.wallet_address
          );

          if (result.success) {
            claimedCount++;
            totalAmount += result.amount || 25; // Updated to 25 RZC per referral
            console.log(`✅ Claimed bonus for ${referredUser.name || referredUser.wallet_address}`);
          } else {
            console.warn(`⚠️ Failed to claim bonus for ${referredUser.id}:`, result.error);
          }
        } catch (error) {
          console.error(`❌ Error claiming bonus for ${referredUser.id}:`, error);
        }
      }

      if (claimedCount === 0) {
        return {
          success: false,
          error: 'Failed to claim any bonuses'
        };
      }

      console.log(`✅ Successfully claimed ${claimedCount} bonuses (${totalAmount} RZC)`);

      return {
        success: true,
        claimed: claimedCount,
        amount: totalAmount
      };
    } catch (error: any) {
      console.error('❌ Claim missing bonuses error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Auto-check and claim on login
   * Call this when user logs in to automatically claim missing bonuses
   */
  static async autoCheckAndClaim(userId: string): Promise<{
    success: boolean;
    claimed?: number;
    amount?: number;
  }> {
    try {
      const checkResult = await this.checkMissingBonuses(userId);
      
      if (!checkResult.success || !checkResult.hasMissing) {
        return { success: true, claimed: 0, amount: 0 };
      }

      console.log(`🔄 Auto-claiming ${checkResult.missingCount} missing bonuses`);

      const claimResult = await this.claimMissingBonuses(userId);
      
      return {
        success: claimResult.success,
        claimed: claimResult.claimed || 0,
        amount: claimResult.amount || 0
      };
    } catch (error: any) {
      console.error('❌ Auto check and claim error:', error);
      return { success: false, claimed: 0, amount: 0 };
    }
  }
}

export const referralRewardChecker = ReferralRewardChecker;
