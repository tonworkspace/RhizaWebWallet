import { supabaseService } from '../services/supabaseService';

/**
 * Utility to fix referral count mismatches
 */

export interface CountFixResult {
  success: boolean;
  fixed: boolean;
  oldCount: number;
  newCount: number;
  error?: string;
}

/**
 * Fix referral count for a specific user by counting actual downline members
 */
export const fixReferralCount = async (userId: string): Promise<CountFixResult> => {
  try {
    console.log('🔧 Fixing referral count for user:', userId);

    // Get actual downline count
    const downlineResult = await supabaseService.getDownline(userId);
    if (!downlineResult.success) {
      return {
        success: false,
        fixed: false,
        oldCount: 0,
        newCount: 0,
        error: downlineResult.error || 'Failed to get downline'
      };
    }

    const actualCount = downlineResult.data?.length || 0;

    // Get current stored count
    const statsResult = await supabaseService.getReferralData(userId);
    if (!statsResult.success) {
      return {
        success: false,
        fixed: false,
        oldCount: 0,
        newCount: actualCount,
        error: statsResult.error || 'Failed to get referral stats'
      };
    }

    const storedCount = statsResult.data?.total_referrals || 0;

    // Check if fix is needed
    if (actualCount === storedCount) {
      console.log('✅ Referral count is already correct:', actualCount);
      return {
        success: true,
        fixed: false,
        oldCount: storedCount,
        newCount: actualCount
      };
    }

    console.log(`🔄 Fixing count: ${storedCount} → ${actualCount}`);

    // Update the count in database
    const client = supabaseService.getClient();
    if (!client) {
      return {
        success: false,
        fixed: false,
        oldCount: storedCount,
        newCount: actualCount,
        error: 'Database not configured'
      };
    }

    const { error: updateError } = await client
      .from('wallet_referrals')
      .update({
        total_referrals: actualCount,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      throw updateError;
    }

    // Update rank based on new count
    await supabaseService.updateReferralRank(userId);

    console.log('✅ Referral count fixed successfully');
    return {
      success: true,
      fixed: true,
      oldCount: storedCount,
      newCount: actualCount
    };

  } catch (error: any) {
    console.error('❌ Error fixing referral count:', error);
    return {
      success: false,
      fixed: false,
      oldCount: 0,
      newCount: 0,
      error: error.message
    };
  }
};

/**
 * Check if referral count needs fixing
 */
export const checkReferralCountAccuracy = async (userId: string): Promise<{
  accurate: boolean;
  actualCount: number;
  storedCount: number;
  difference: number;
}> => {
  try {
    // Get actual downline count
    const downlineResult = await supabaseService.getDownline(userId);
    const actualCount = downlineResult.success ? (downlineResult.data?.length || 0) : 0;

    // Get stored count
    const statsResult = await supabaseService.getReferralData(userId);
    const storedCount = statsResult.success ? (statsResult.data?.total_referrals || 0) : 0;

    const difference = Math.abs(actualCount - storedCount);
    const accurate = difference === 0;

    return {
      accurate,
      actualCount,
      storedCount,
      difference
    };
  } catch (error) {
    console.error('❌ Error checking referral count accuracy:', error);
    return {
      accurate: false,
      actualCount: 0,
      storedCount: 0,
      difference: 0
    };
  }
};

/**
 * Batch fix referral counts for multiple users
 */
export const batchFixReferralCounts = async (userIds: string[]): Promise<{
  success: boolean;
  results: Array<{ userId: string; result: CountFixResult }>;
  totalFixed: number;
}> => {
  const results: Array<{ userId: string; result: CountFixResult }> = [];
  let totalFixed = 0;

  for (const userId of userIds) {
    const result = await fixReferralCount(userId);
    results.push({ userId, result });
    
    if (result.fixed) {
      totalFixed++;
    }

    // Small delay to avoid overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return {
    success: true,
    results,
    totalFixed
  };
};

/**
 * Get users with potential count mismatches
 */
export const findUsersWithCountMismatches = async (): Promise<{
  success: boolean;
  users: Array<{
    userId: string;
    userName: string;
    actualCount: number;
    storedCount: number;
    difference: number;
  }>;
  error?: string;
}> => {
  try {
    const client = supabaseService.getClient();
    if (!client) {
      return { success: false, users: [], error: 'Database not configured' };
    }

    // Get all users with referral data
    const { data: referralData, error: referralError } = await client
      .from('wallet_referrals')
      .select('user_id, total_referrals')
      .order('total_referrals', { ascending: false });

    if (referralError) {
      throw referralError;
    }

    const usersWithMismatches = [];

    for (const referral of referralData || []) {
      const accuracy = await checkReferralCountAccuracy(referral.user_id);
      
      if (!accuracy.accurate && accuracy.difference > 0) {
        // Get user name
        const profileResult = await supabaseService.getProfileById(referral.user_id);
        const userName = profileResult.success && profileResult.data 
          ? profileResult.data.name 
          : `User #${referral.user_id.slice(-4)}`;

        usersWithMismatches.push({
          userId: referral.user_id,
          userName,
          actualCount: accuracy.actualCount,
          storedCount: accuracy.storedCount,
          difference: accuracy.difference
        });
      }

      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    return {
      success: true,
      users: usersWithMismatches
    };

  } catch (error: any) {
    console.error('❌ Error finding count mismatches:', error);
    return {
      success: false,
      users: [],
      error: error.message
    };
  }
};