import { supabaseService } from './supabaseService';

export interface SquadMember {
  id: string; // Changed from number to string (UUID)
  username: string;
  wallet_address: string;
  is_active: boolean;
  is_premium: boolean;
  joined_at: string;
  rank: string;
  total_earned: number;
  avatar?: string;
  total_referrals?: number;
  rzc_balance?: number;
}

export interface SquadMiningStats {
  squad_size: number;
  potential_reward: number;
  total_rewards_earned: number;
  last_claim_at: string | null;
  can_claim: boolean;
  next_claim_at: string | null;
  hours_until_claim?: number;
}

class SquadMiningService {
  private readonly CLAIM_INTERVAL_HOURS = 8;
  private readonly REWARD_PER_MEMBER = 2; // RZC per squad member
  private readonly PREMIUM_REWARD_PER_MEMBER = 5; // RZC per premium member

  /**
   * Get squad mining statistics for a user using database function
   */
  async getSquadMiningStats(userId: string | number): Promise<SquadMiningStats> {
    const userIdStr = typeof userId === 'number' ? userId.toString() : userId;
    
    try {
      // Try to use the database function first
      const client = supabaseService.getClient();
      const { data, error } = await client
        ?.rpc('get_squad_mining_stats', { p_user_id: userIdStr })
        .single();

      if (!error && data) {
        const statsData = data as any; // Type assertion for database response
        return {
          squad_size: Number(statsData.squad_size) || 0,
          potential_reward: Number(statsData.potential_reward) || 0,
          total_rewards_earned: Number(statsData.total_rewards_earned) || 0,
          last_claim_at: statsData.last_claim_at,
          can_claim: statsData.can_claim && Number(statsData.squad_size) > 0,
          next_claim_at: statsData.can_claim ? null : this.calculateNextClaimTime(statsData.last_claim_at),
          hours_until_claim: Number(statsData.hours_until_claim) || 0
        };
      }

      // Fallback to manual calculation if function doesn't exist
      return await this.getSquadMiningStatsManual(userIdStr);
    } catch (error) {
      console.error('Error getting squad mining stats:', error);
      // Fallback to manual calculation
      return await this.getSquadMiningStatsManual(userIdStr);
    }
  }

  /**
   * Manual calculation fallback (if database function not available)
   */
  private async getSquadMiningStatsManual(userId: string): Promise<SquadMiningStats> {
    try {
      // Get squad members count
      const membersResult = await supabaseService.getDownline(userId);
      const squadSize = membersResult.success ? membersResult.data?.length || 0 : 0;

      // Calculate potential reward
      const members = membersResult.data || [];
      const potentialReward = members.reduce((total, member) => {
        const isPremium = (member as any).is_premium || false;
        return total + (isPremium ? this.PREMIUM_REWARD_PER_MEMBER : this.REWARD_PER_MEMBER);
      }, 0);

      // Get last claim time from user profile
      const client = supabaseService.getClient();
      const { data: userData } = await client
        ?.from('wallet_users')
        .select('last_squad_claim_at, total_squad_rewards')
        .eq('id', userId)
        .single() || { data: null };

      const lastClaimAt = userData?.last_squad_claim_at || null;
      const totalRewardsEarned = userData?.total_squad_rewards || 0;

      // Calculate if can claim
      const { canClaim, nextClaimAt, hoursRemaining } = this.calculateTimeUntilNextClaim(lastClaimAt);

      return {
        squad_size: squadSize,
        potential_reward: potentialReward,
        total_rewards_earned: totalRewardsEarned,
        last_claim_at: lastClaimAt,
        can_claim: canClaim && squadSize > 0,
        next_claim_at: nextClaimAt,
        hours_until_claim: hoursRemaining
      };
    } catch (error) {
      console.error('Error in manual squad stats calculation:', error);
      return {
        squad_size: 0,
        potential_reward: 0,
        total_rewards_earned: 0,
        last_claim_at: null,
        can_claim: false,
        next_claim_at: null,
        hours_until_claim: 0
      };
    }
  }

  /**
   * Calculate next claim time
   */
  private calculateNextClaimTime(lastClaimAt: string | null): string | null {
    if (!lastClaimAt) return null;
    
    const lastClaim = new Date(lastClaimAt);
    const nextClaim = new Date(lastClaim.getTime() + this.CLAIM_INTERVAL_HOURS * 60 * 60 * 1000);
    return nextClaim.toISOString();
  }

  /**
   * Get squad members for a user
   */
  async getSquadMembers(userId: string | number): Promise<SquadMember[]> {
    const userIdStr = typeof userId === 'number' ? userId.toString() : userId;
    try {
      const result = await supabaseService.getDownline(userIdStr);
      
      if (!result.success || !result.data) {
        return [];
      }

      return result.data.map(member => ({
        id: member.id,
        username: member.name || `User #${member.wallet_address.slice(-4)}`,
        wallet_address: member.wallet_address,
        is_active: member.is_active || false,
        is_premium: (member as any).is_premium || false, // Type assertion for new field
        joined_at: member.created_at,
        rank: (member as any).is_premium ? 'Elite' : 'Pro',
        total_earned: (member as any).total_squad_earned || 0,
        avatar: member.avatar,
        total_referrals: member.total_referrals || 0,
        rzc_balance: member.rzc_balance || 0
      }));
    } catch (error) {
      console.error('Error getting squad members:', error);
      return [];
    }
  }

  /**
   * Calculate time until next claim
   */
  calculateTimeUntilNextClaim(lastClaimAt: string | null): {
    canClaim: boolean;
    hoursRemaining: number;
    minutesRemaining: number;
    nextClaimAt: string | null;
  } {
    if (!lastClaimAt) {
      return {
        canClaim: true,
        hoursRemaining: 0,
        minutesRemaining: 0,
        nextClaimAt: null
      };
    }

    const lastClaim = new Date(lastClaimAt);
    const now = new Date();
    const nextClaim = new Date(lastClaim.getTime() + this.CLAIM_INTERVAL_HOURS * 60 * 60 * 1000);
    
    const timeRemaining = nextClaim.getTime() - now.getTime();
    const canClaim = timeRemaining <= 0;

    if (canClaim) {
      return {
        canClaim: true,
        hoursRemaining: 0,
        minutesRemaining: 0,
        nextClaimAt: null
      };
    }

    const hoursRemaining = Math.floor(timeRemaining / (60 * 60 * 1000));
    const minutesRemaining = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));

    return {
      canClaim: false,
      hoursRemaining,
      minutesRemaining,
      nextClaimAt: nextClaim.toISOString()
    };
  }

  /**
   * Claim squad mining rewards using database function
   */
  async claimSquadRewards(userId: string | number, transactionId: string): Promise<{
    success: boolean;
    reward_amount?: number;
    squad_size?: number;
    error?: string;
  }> {
    const userIdStr = typeof userId === 'number' ? userId.toString() : userId;
    const client = supabaseService.getClient(); // Declare once at the top
    
    try {
      // Get squad members
      const members = await this.getSquadMembers(userId);
      
      if (members.length === 0) {
        return {
          success: false,
          error: 'No squad members to claim rewards from'
        };
      }

      // Calculate total reward and premium count
      const rewardAmount = members.reduce((total, member) => {
        return total + (member.is_premium ? this.PREMIUM_REWARD_PER_MEMBER : this.REWARD_PER_MEMBER);
      }, 0);

      const premiumCount = members.filter(m => m.is_premium).length;

      // Get wallet address
      const { data: userData } = await client
        ?.from('wallet_users')
        .select('wallet_address')
        .eq('id', userIdStr)
        .single() || { data: null };

      if (!userData?.wallet_address) {
        return {
          success: false,
          error: 'User wallet address not found'
        };
      }

      // Try to use database function first
      try {
        const { data, error } = await client
          ?.rpc('claim_squad_rewards', {
            p_user_id: userIdStr,
            p_wallet_address: userData.wallet_address,
            p_squad_size: members.length,
            p_reward_amount: rewardAmount,
            p_premium_members: premiumCount,
            p_transaction_id: transactionId
          })
          .single();

        if (!error && data && (data as any)?.success) {
          return {
            success: true,
            reward_amount: rewardAmount,
            squad_size: members.length
          };
        }

        if (error) {
          console.error('Database function error:', error);
          // Fall through to manual method
        }
      } catch (dbError) {
        console.error('Error calling database function:', dbError);
        // Fall through to manual method
      }

      // Fallback to manual method using awardRZCTokens
      const awardResult = await supabaseService.awardRZCTokens(
        userIdStr,
        rewardAmount,
        'squad_mining',
        `Squad mining claim from ${members.length} members`,
        { squad_size: members.length, transaction_id: transactionId, premium_members: premiumCount }
      );

      if (!awardResult.success) {
        return {
          success: false,
          error: awardResult.error || 'Failed to award RZC'
        };
      }

      // Update last claim time manually
      // First get current total_squad_rewards
      const { data: currentData } = await client
        ?.from('wallet_users')
        .select('total_squad_rewards')
        .eq('id', userIdStr)
        .single() || { data: null };
      
      const currentTotal = currentData?.total_squad_rewards || 0;
      
      await client
        ?.from('wallet_users')
        .update({
          last_squad_claim_at: new Date().toISOString(),
          total_squad_rewards: currentTotal + rewardAmount
        })
        .eq('id', userIdStr);

      return {
        success: true,
        reward_amount: rewardAmount,
        squad_size: members.length
      };
    } catch (error) {
      console.error('Error claiming squad rewards:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate a unique transaction ID
   */
  generateTransactionId(userId: string | number): string {
    return `squad_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

export const squadMiningService = new SquadMiningService();
export default squadMiningService;
