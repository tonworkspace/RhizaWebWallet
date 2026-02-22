import { supabaseService } from './supabaseService';
import { tonWalletService } from './tonWalletService';

/**
 * Reward Claim Service
 * Handles claiming and processing of referral rewards
 */

// Minimum claimable amount (prevent spam claims)
const MIN_CLAIM_AMOUNT = 0.1; // 0.1 TON

// Claim cooldown period (prevent frequent claims)
const CLAIM_COOLDOWN_HOURS = 24; // 24 hours

export class RewardClaimService {
  /**
   * Check if user can claim rewards
   */
  static async canClaim(userId: string): Promise<{
    canClaim: boolean;
    reason?: string;
    claimable?: number;
    nextClaimDate?: Date;
  }> {
    try {
      // Get claimable rewards
      const rewardsResult = await supabaseService.getClaimableRewards(userId);
      
      if (!rewardsResult.success || !rewardsResult.data) {
        return {
          canClaim: false,
          reason: 'Unable to fetch rewards data'
        };
      }

      const { claimable, lastClaimDate } = rewardsResult.data;

      // Check minimum amount
      if (claimable < MIN_CLAIM_AMOUNT) {
        return {
          canClaim: false,
          reason: `Minimum claim amount is ${MIN_CLAIM_AMOUNT} TON`,
          claimable
        };
      }

      // Check cooldown period
      if (lastClaimDate) {
        const lastClaim = new Date(lastClaimDate);
        const now = new Date();
        const hoursSinceLastClaim = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);

        if (hoursSinceLastClaim < CLAIM_COOLDOWN_HOURS) {
          const nextClaimDate = new Date(lastClaim.getTime() + CLAIM_COOLDOWN_HOURS * 60 * 60 * 1000);
          return {
            canClaim: false,
            reason: `You can claim again in ${Math.ceil(CLAIM_COOLDOWN_HOURS - hoursSinceLastClaim)} hours`,
            claimable,
            nextClaimDate
          };
        }
      }

      return {
        canClaim: true,
        claimable
      };
    } catch (error: any) {
      console.error('❌ Can claim check error:', error);
      return {
        canClaim: false,
        reason: 'Error checking claim eligibility'
      };
    }
  }

  /**
   * Initiate reward claim
   * Creates a claim request in the database
   */
  static async initiateClaimRequest(
    userId: string,
    walletAddress: string
  ): Promise<{
    success: boolean;
    claimId?: string;
    amount?: number;
    error?: string;
  }> {
    try {
      console.log('🎁 Initiating reward claim for user:', userId);

      // Check if user can claim
      const canClaimResult = await this.canClaim(userId);
      
      if (!canClaimResult.canClaim) {
        return {
          success: false,
          error: canClaimResult.reason || 'Cannot claim at this time'
        };
      }

      const claimAmount = canClaimResult.claimable!;

      // Create claim request
      const claimResult = await supabaseService.createRewardClaim(
        userId,
        claimAmount,
        walletAddress
      );

      if (!claimResult.success) {
        return {
          success: false,
          error: claimResult.error || 'Failed to create claim request'
        };
      }

      console.log('✅ Claim request created:', claimResult.data.id);

      return {
        success: true,
        claimId: claimResult.data.id,
        amount: claimAmount
      };
    } catch (error: any) {
      console.error('❌ Initiate claim error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process reward claim (send TON to user's wallet)
   * NOTE: This is a simplified version. In production, this should:
   * 1. Use a hot wallet or smart contract for automated payouts
   * 2. Have admin approval workflow
   * 3. Include fraud detection
   * 4. Handle transaction failures and retries
   */
  static async processClaimPayout(
    claimId: string,
    fromMnemonic: string[], // Admin/hot wallet mnemonic
    password?: string
  ): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }> {
    try {
      console.log('💸 Processing claim payout:', claimId);

      // This is a placeholder for actual payout logic
      // In production, you would:
      // 1. Get claim details from database
      // 2. Initialize hot wallet
      // 3. Send TON transaction
      // 4. Update claim status with tx_hash
      // 5. Handle errors and retries

      console.warn('⚠️ Payout processing not implemented - requires hot wallet setup');

      return {
        success: false,
        error: 'Payout processing requires hot wallet configuration'
      };
    } catch (error: any) {
      console.error('❌ Process payout error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get claim statistics
   */
  static async getClaimStats(userId: string): Promise<{
    success: boolean;
    data?: {
      totalEarned: number;
      totalClaimed: number;
      claimable: number;
      pendingClaims: number;
      completedClaims: number;
      lastClaimDate: string | null;
    };
    error?: string;
  }> {
    try {
      // Get claimable rewards
      const rewardsResult = await supabaseService.getClaimableRewards(userId);
      
      if (!rewardsResult.success || !rewardsResult.data) {
        return {
          success: false,
          error: 'Unable to fetch rewards data'
        };
      }

      // Get claim history
      const historyResult = await supabaseService.getClaimHistory(userId);
      
      if (!historyResult.success) {
        return {
          success: false,
          error: 'Unable to fetch claim history'
        };
      }

      const claims = historyResult.data || [];
      const pendingClaims = claims.filter(c => c.status === 'pending').length;
      const completedClaims = claims.filter(c => c.status === 'completed').length;

      return {
        success: true,
        data: {
          ...rewardsResult.data,
          pendingClaims,
          completedClaims
        }
      };
    } catch (error: any) {
      console.error('❌ Get claim stats error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Format claim amount for display
   */
  static formatClaimAmount(amount: number): string {
    return `${amount.toFixed(4)} TON`;
  }

  /**
   * Calculate time until next claim
   */
  static getTimeUntilNextClaim(lastClaimDate: string): {
    canClaim: boolean;
    hoursRemaining: number;
    minutesRemaining: number;
  } {
    const lastClaim = new Date(lastClaimDate);
    const now = new Date();
    const nextClaimTime = new Date(lastClaim.getTime() + CLAIM_COOLDOWN_HOURS * 60 * 60 * 1000);
    
    const msRemaining = nextClaimTime.getTime() - now.getTime();
    const hoursRemaining = Math.floor(msRemaining / (1000 * 60 * 60));
    const minutesRemaining = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));

    return {
      canClaim: msRemaining <= 0,
      hoursRemaining: Math.max(0, hoursRemaining),
      minutesRemaining: Math.max(0, minutesRemaining)
    };
  }
}

export const rewardClaimService = RewardClaimService;
