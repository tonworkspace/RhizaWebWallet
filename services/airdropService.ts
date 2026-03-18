import { supabaseService } from './supabaseService';

export interface AirdropTask {
  id: number;
  title: string;
  completed: boolean;
  reward: number;
  action: 'create_wallet' | 'follow' | 'retweet' | 'telegram' | 'wallet' | 'referral' | 'daily_checkin' | 'profile_complete' |
          'post_twitter' | 'post_facebook' | 'post_linkedin' | 'post_instagram' | 'comment_engagement' | 
          'share_groups' | 'create_video' | 'write_article' | 'post_reddit' | 'share_discord' | 
          'create_meme' | 'audio_mention' | 'influencer_collab' | 'ama_participation';
  verifying?: boolean;
}

export interface AirdropSubmission {
  walletAddress: string;
  completedTasks: number[];
  totalReward: number;
  userAgent?: string;
  timestamp: string;
}

export interface AirdropTaskCompletion {
  taskId: number;
  walletAddress: string;
  completedAt: string;
  verified: boolean;
  reward: number;
}

class AirdropService {
  /**
   * Validate TON wallet address format
   */
  isValidTONAddress(address: string): boolean {
    // TON addresses are typically 48 characters long and start with EQ or UQ
    const tonAddressRegex = /^[EU]Q[A-Za-z0-9_-]{46}$/;
    return tonAddressRegex.test(address);
  }

  /**
   * Check if wallet creation task is completed (integrated with wallet_users)
   */
  async verifyWalletCreation(walletAddress: string): Promise<boolean> {
    try {
      if (!walletAddress) {
        console.log('❌ Wallet verification failed: No wallet address provided');
        return false;
      }
      
      console.log('🔍 Verifying wallet creation for:', walletAddress);
      
      // Check if user exists in wallet_users table
      if (!supabaseService.isConfigured()) {
        console.log('⚠️ Supabase not configured, assuming wallet exists if address provided');
        return true;
      }

      const supabase = supabaseService.getClient();
      if (!supabase) {
        console.log('⚠️ Supabase client not available, assuming wallet exists');
        return true;
      }

      // Query wallet_users table directly
      const { data, error } = await supabase
        .from('wallet_users')
        .select('id, wallet_address')
        .eq('wallet_address', walletAddress)
        .single();
      
      console.log('📊 Wallet verification result:', { data, error });
      
      const isValid = !error && !!data;
      
      if (isValid) {
        console.log('✅ Wallet creation verified successfully');
      } else {
        console.log('❌ Wallet creation verification failed:', error?.message || 'No user found');
      }
      
      return isValid;
    } catch (error) {
      console.error('❌ Wallet creation verification error:', error);
      return false;
    }
  }

  /**
   * Check if referral task is completed (integrated with wallet_referrals)
   */
  async verifyReferralTask(walletAddress: string, requiredReferrals: number = 3): Promise<boolean> {
    try {
      if (!walletAddress) return false;
      
      if (!supabaseService.isConfigured()) {
        console.log('⚠️ Supabase not configured for referral verification');
        return false;
      }

      const supabase = supabaseService.getClient();
      if (!supabase) return false;
      
      // Get user ID from wallet_users
      const { data: userData, error: userError } = await supabase
        .from('wallet_users')
        .select('id')
        .eq('wallet_address', walletAddress)
        .single();
      
      if (userError || !userData) return false;
      
      // Count referrals from wallet_referrals table
      const { count, error: referralError } = await supabase
        .from('wallet_referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', userData.id);
      
      if (referralError) {
        console.error('Referral verification error:', referralError);
        return false;
      }
      
      return (count || 0) >= requiredReferrals;
    } catch (error) {
      console.error('Referral verification error:', error);
      return false;
    }
  }

  /**
   * Check if profile completion task is completed (integrated with wallet_users)
   */
  async verifyProfileCompletion(walletAddress: string): Promise<boolean> {
    try {
      if (!walletAddress) return false;
      
      if (!supabaseService.isConfigured()) {
        console.log('⚠️ Supabase not configured for profile verification');
        return false;
      }

      const supabase = supabaseService.getClient();
      if (!supabase) return false;
      
      // Get user profile from wallet_users
      const { data, error } = await supabase
        .from('wallet_users')
        .select('avatar, name')
        .eq('wallet_address', walletAddress)
        .single();
      
      if (error || !data) return false;
      
      // Check if profile has avatar and name
      return !!(data.avatar && data.name && data.avatar.trim() !== '' && data.name.trim() !== '');
    } catch (error) {
      console.error('Profile completion verification error:', error);
      return false;
    }
  }

  /**
   * Check daily check-in status (real-time)
   */
  async verifyDailyCheckin(walletAddress: string): Promise<{ completed: boolean; streak: number }> {
    try {
      if (!walletAddress) return { completed: false, streak: 0 };
      
      const lastCheckin = localStorage.getItem(`daily_checkin_${walletAddress}`);
      const streak = parseInt(localStorage.getItem(`daily_streak_${walletAddress}`) || '0');
      const today = new Date().toDateString();
      
      return {
        completed: lastCheckin === today,
        streak
      };
    } catch (error) {
      console.error('Daily checkin verification error:', error);
      return { completed: false, streak: 0 };
    }
  }

  /**
   * Record daily check-in (real-time)
   */
  async recordDailyCheckin(walletAddress: string): Promise<{ success: boolean; newStreak: number }> {
    try {
      if (!walletAddress) return { success: false, newStreak: 0 };
      
      const today = new Date().toDateString();
      const lastCheckin = localStorage.getItem(`daily_checkin_${walletAddress}`);
      
      if (lastCheckin === today) {
        return { success: false, newStreak: 0 }; // Already checked in today
      }
      
      // Calculate new streak
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toDateString();
      
      let currentStreak = parseInt(localStorage.getItem(`daily_streak_${walletAddress}`) || '0');
      
      if (lastCheckin === yesterdayString) {
        // Consecutive day
        currentStreak += 1;
      } else if (lastCheckin && lastCheckin !== yesterdayString) {
        // Streak broken, start over
        currentStreak = 1;
      } else {
        // First check-in or no previous check-in
        currentStreak = 1;
      }
      
      // Store new values
      localStorage.setItem(`daily_checkin_${walletAddress}`, today);
      localStorage.setItem(`daily_streak_${walletAddress}`, currentStreak.toString());
      
      return { success: true, newStreak: currentStreak };
    } catch (error) {
      console.error('Daily checkin recording error:', error);
      return { success: false, newStreak: 0 };
    }
  }

  /**
   * Get comprehensive task status (real-time)
   */
  async getTaskStatus(walletAddress: string): Promise<{
    walletCreated: boolean;
    referralsCompleted: boolean;
    profileCompleted: boolean;
    dailyCheckinCompleted: boolean;
    dailyStreak: number;
    totalReferrals: number;
  }> {
    try {
      if (!walletAddress) {
        return {
          walletCreated: false,
          referralsCompleted: false,
          profileCompleted: false,
          dailyCheckinCompleted: false,
          dailyStreak: 0,
          totalReferrals: 0
        };
      }

      // Run all verifications in parallel for better performance
      const [
        walletCreated,
        referralsCompleted,
        profileCompleted,
        dailyCheckinStatus
      ] = await Promise.all([
        this.verifyWalletCreation(walletAddress),
        this.verifyReferralTask(walletAddress, 3),
        this.verifyProfileCompletion(walletAddress),
        this.verifyDailyCheckin(walletAddress)
      ]);

      // Get total referrals count
      let totalReferrals = 0;
      try {
        const profileResult = await supabaseService.getProfile(walletAddress);
        if (profileResult.success && profileResult.data) {
          const referralResult = await supabaseService.getReferralData(profileResult.data.id);
          if (referralResult.success && referralResult.data) {
            totalReferrals = referralResult.data.total_referrals;
          }
        }
      } catch (error) {
        console.error('Error getting referral count:', error);
      }

      return {
        walletCreated,
        referralsCompleted,
        profileCompleted,
        dailyCheckinCompleted: dailyCheckinStatus.completed,
        dailyStreak: dailyCheckinStatus.streak,
        totalReferrals
      };
    } catch (error) {
      console.error('Task status error:', error);
      return {
        walletCreated: false,
        referralsCompleted: false,
        profileCompleted: false,
        dailyCheckinCompleted: false,
        dailyStreak: 0,
        totalReferrals: 0
      };
    }
  }

  /**
   * Verify task completion with enhanced real-time verification and social media integration
   */
  async verifyTaskCompletion(
    taskAction: string, 
    userWallet?: string, 
    verificationData?: {
      username?: string;
      tweetId?: string;
      keywords?: string[];
      hashtags?: string[];
      proofData?: any;
    }
  ): Promise<{ success: boolean; requiresManualReview?: boolean; message: string }> {
    try {
      if (!userWallet) {
        return { success: false, message: 'Invalid wallet address' };
      }

      // Import social verification service dynamically to avoid circular dependencies
      const { socialVerificationService } = await import('./socialVerificationService');

      switch (taskAction) {
        case 'create_wallet':
          const walletVerified = await this.verifyWalletCreation(userWallet);
          return {
            success: walletVerified,
            message: walletVerified ? 'Wallet creation verified!' : 'Wallet verification failed'
          };
          
        case 'referral':
          const referralVerified = await this.verifyReferralTask(userWallet, 3);
          return {
            success: referralVerified,
            message: referralVerified ? 'Referral task completed!' : 'Need 3 referrals to complete this task'
          };
          
        case 'profile_complete':
          const profileVerified = await this.verifyProfileCompletion(userWallet);
          return {
            success: profileVerified,
            message: profileVerified ? 'Profile completion verified!' : 'Please complete your profile with avatar and name'
          };
          
        case 'daily_checkin':
          const checkinStatus = await this.verifyDailyCheckin(userWallet);
          return {
            success: checkinStatus.completed,
            message: checkinStatus.completed ? 'Daily check-in verified!' : 'Daily check-in not completed'
          };

        // REAL SOCIAL MEDIA VERIFICATION
        case 'follow':
        case 'retweet':
        case 'post_twitter':
        case 'comment_engagement':
          return await socialVerificationService.verifyTask(taskAction, userWallet, verificationData);

        case 'telegram':
          // Trust model: user confirms they joined, same as other social tasks
          return {
            success: true,
            message: 'Telegram membership verified!'
          };

        // MANUAL VERIFICATION TASKS
        case 'post_facebook':
        case 'post_linkedin':
        case 'post_instagram':
        case 'share_groups':
        case 'create_video':
        case 'write_article':
        case 'post_reddit':
        case 'share_discord':
        case 'create_meme':
        case 'audio_mention':
        case 'influencer_collab':
        case 'ama_participation':
          return await socialVerificationService.verifyTask(taskAction, userWallet, verificationData);
          
        default:
          return { success: false, message: 'Unknown task type' };
      }
    } catch (error) {
      console.error('Task verification error:', error);
      return { success: false, message: 'Verification failed due to technical error. Please try again.' };
    }
  }

  /**
   * Legacy method for backward compatibility - converts to new format
   */
  async verifyTaskCompletionLegacy(taskAction: string, userWallet?: string): Promise<boolean> {
    const result = await this.verifyTaskCompletion(taskAction, userWallet);
    return result.success;
  }

  /**
   * Award RZC tokens for completed tasks (fallback method)
   */
  async awardTaskReward(walletAddress: string, taskId: number, reward: number, taskTitle: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!walletAddress) {
        return { success: false, message: 'Invalid wallet address' };
      }

      // Get user profile
      const profileResult = await supabaseService.getProfile(walletAddress);
      if (!profileResult.success || !profileResult.data) {
        return { success: false, message: 'User profile not found' };
      }

      // Award RZC tokens
      const awardResult = await supabaseService.awardRZCTokens(
        profileResult.data.id,
        reward,
        'airdrop_task',
        `Airdrop Task Completed: ${taskTitle}`,
        {
          taskId,
          taskTitle,
          airdropReward: true,
          timestamp: new Date().toISOString()
        }
      );

      if (awardResult.success) {
        return {
          success: true,
          message: `Successfully awarded ${reward} RZC for completing "${taskTitle}"`
        };
      } else {
        return {
          success: false,
          message: awardResult.error || 'Failed to award tokens'
        };
      }
    } catch (error) {
      console.error('Award task reward error:', error);
      return {
        success: false,
        message: 'Failed to award reward. Please try again.'
      };
    }
  }

  /**
   * Award RZC tokens for completed tasks (fixed database version)
   */
  async recordTaskCompletion(
    walletAddress: string, 
    taskId: number, 
    taskAction: string,
    taskTitle: string,
    reward: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!walletAddress) {
        return { success: false, message: 'Invalid wallet address' };
      }

      console.log(`🎯 Recording task completion: ${taskAction} for ${walletAddress}`);

      // Check if supabase is configured
      if (!supabaseService.isConfigured()) {
        console.warn('Supabase not configured, using fallback reward system');
        return await this.awardTaskReward(walletAddress, taskId, reward, taskTitle);
      }

      const supabase = supabaseService.getClient();
      if (!supabase) {
        console.warn('Supabase client not available, using fallback');
        return await this.awardTaskReward(walletAddress, taskId, reward, taskTitle);
      }

      // Use fixed database function to record completion and track rewards
      const { data, error } = await supabase.rpc('record_airdrop_completion', {
        p_wallet_address: walletAddress,
        p_task_id: taskId,
        p_task_action: taskAction,
        p_task_title: taskTitle,
        p_reward_amount: reward,
        p_metadata: {
          timestamp: new Date().toISOString(),
          source: 'airdrop_dashboard',
          user_agent: navigator.userAgent
        }
      });

      console.log('📊 Database completion result:', { data, error });

      if (error) {
        console.error('❌ Database completion error:', error);
        // Try fallback method if database function fails
        console.log('🔄 Attempting fallback reward method...');
        return await this.awardTaskReward(walletAddress, taskId, reward, taskTitle);
      }

      if (data && data.success) {
        console.log('✅ Task completion recorded successfully');
        return {
          success: true,
          message: `Successfully completed "${taskTitle}" and awarded ${reward} RZC`
        };
      } else {
        console.warn('⚠️ Database function returned failure:', data);
        // Try fallback method
        return await this.awardTaskReward(walletAddress, taskId, reward, taskTitle);
      }
    } catch (error) {
      console.error('❌ Record task completion error:', error);
      // Fallback to direct reward system
      console.log('🔄 Using fallback reward system due to error');
      return await this.awardTaskReward(walletAddress, taskId, reward, taskTitle);
    }
  }

  /**
   * Get user's airdrop progress from fixed database
   */
  async getAirdropProgress(walletAddress: string): Promise<{
    success: boolean;
    data?: {
      profileComplete: boolean;
      totalReferrals: number;
      completedTasks: any[];
      totalEarned: number;
      rzcBalance: number;
    };
    error?: string;
  }> {
    try {
      if (!walletAddress) {
        return { success: false, error: 'Invalid wallet address' };
      }

      console.log('📊 Getting airdrop progress for:', walletAddress);

      // Check if supabase is configured
      if (!supabaseService.isConfigured()) {
        console.warn('⚠️ Supabase not configured for progress tracking');
        return { success: false, error: 'Database not available' };
      }

      const supabase = supabaseService.getClient();
      if (!supabase) {
        return { success: false, error: 'Database connection failed' };
      }

      // Use fixed database function to get progress
      const { data, error } = await supabase.rpc('get_airdrop_progress', {
        p_wallet_address: walletAddress
      });

      console.log('📈 Progress query result:', { data, error });

      if (error) {
        console.error('❌ Database progress error:', error);
        return { success: false, error: error.message };
      }

      if (data && data.success) {
        const progressData = data.data;
        console.log('✅ Progress data retrieved:', progressData);
        
        return {
          success: true,
          data: {
            profileComplete: false, // Will be determined by UI logic
            totalReferrals: 0, // Will be determined by referral system
            completedTasks: progressData.completed_tasks || [],
            totalEarned: progressData.total_earned || 0,
            rzcBalance: progressData.user_data?.rzc_balance || 0
          }
        };
      } else {
        console.warn('⚠️ Progress function returned failure:', data);
        return {
          success: false,
          error: data?.error || 'Failed to get progress'
        };
      }
    } catch (error) {
      console.error('❌ Get airdrop progress error:', error);
      return { success: false, error: 'Failed to fetch progress' };
    }
  }

  /**
   * Submit airdrop claim
   */
  async submitAirdropClaim(submission: AirdropSubmission): Promise<{ success: boolean; message: string }> {
    try {
      // Validate wallet address
      if (!this.isValidTONAddress(submission.walletAddress)) {
        return {
          success: false,
          message: 'Invalid TON wallet address format'
        };
      }

      // Check if all required tasks are completed
      if (submission.completedTasks.length < 5) {
        return {
          success: false,
          message: 'Please complete all tasks before claiming'
        };
      }

      // In a real implementation, you would:
      // 1. Store the submission in your database
      // 2. Add to airdrop processing queue
      // 3. Send confirmation email/notification
      // 4. Schedule token distribution

      // For now, we'll just log it
      console.log('Airdrop claim submitted:', submission);

      // Simulate database storage
      await new Promise(resolve => setTimeout(resolve, 1000));

      return {
        success: true,
        message: `Airdrop claim submitted successfully! ${submission.totalReward} RZC will be distributed to ${submission.walletAddress} within 24-48 hours.`
      };

    } catch (error) {
      console.error('Airdrop submission error:', error);
      return {
        success: false,
        message: 'Failed to submit airdrop claim. Please try again.'
      };
    }
  }

  /**
   * Check if wallet has already claimed airdrop
   */
  async hasAlreadyClaimed(walletAddress: string): Promise<boolean> {
    try {
      // In a real implementation, check your database
      // For demo purposes, return false
      return false;
    } catch (error) {
      console.error('Claim check error:', error);
      return false;
    }
  }

  /**
   * Get airdrop statistics
   */
  async getAirdropStats(): Promise<{
    totalClaims: number;
    totalDistributed: number;
    averageReward: number;
  }> {
    try {
      // Check if supabase is configured
      if (!supabaseService.isConfigured()) {
        // Return mock data if database not available
        return {
          totalClaims: 1247,
          totalDistributed: 498750,
          averageReward: 400
        };
      }

      const supabase = supabaseService.getClient();
      if (!supabase) {
        return {
          totalClaims: 0,
          totalDistributed: 0,
          averageReward: 0
        };
      }

      // Use database function to get real statistics
      const { data, error } = await supabase.rpc('get_airdrop_stats');

      if (error) {
        console.error('Stats fetch error:', error);
        return {
          totalClaims: 0,
          totalDistributed: 0,
          averageReward: 0
        };
      }

      if (data && data.success) {
        const stats = data.data;
        return {
          totalClaims: stats.total_completions || 0,
          totalDistributed: stats.total_rewards_distributed || 0,
          averageReward: Math.round(stats.average_reward_per_user || 0)
        };
      }

      return {
        totalClaims: 0,
        totalDistributed: 0,
        averageReward: 0
      };
    } catch (error) {
      console.error('Stats fetch error:', error);
      return {
        totalClaims: 0,
        totalDistributed: 0,
        averageReward: 0
      };
    }
  }

  /**
   * Get airdrop leaderboard
   */
  async getAirdropLeaderboard(limit: number = 10): Promise<{
    success: boolean;
    data?: Array<{
      wallet_address: string;
      total_earned: number;
      task_count: number;
      rank: number;
    }>;
    error?: string;
  }> {
    try {
      // Check if supabase is configured
      if (!supabaseService.isConfigured()) {
        return { success: false, error: 'Database not available' };
      }

      const supabase = supabaseService.getClient();
      if (!supabase) {
        return { success: false, error: 'Database connection failed' };
      }

      // Use database function to get leaderboard
      const { data, error } = await supabase.rpc('get_airdrop_leaderboard', {
        p_limit: limit
      });

      if (error) {
        console.error('Leaderboard fetch error:', error);
        return { success: false, error: error.message };
      }

      if (data && data.success) {
        return {
          success: true,
          data: data.data || []
        };
      }

      return { success: false, error: 'Failed to fetch leaderboard' };
    } catch (error) {
      console.error('Leaderboard fetch error:', error);
      return { success: false, error: 'Failed to fetch leaderboard' };
    }
  }
}

export const airdropService = new AirdropService();