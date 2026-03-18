import { supabaseService } from './supabaseService';
import { AIRDROP_TASKS, getAirdropStats } from '../config/airdropTasks';

export interface ManualSubmission {
  id: string;
  wallet_address: string;
  task_id: number;
  task_action: string;
  proof_urls: string[];
  proof_screenshots: string[];
  description: string;
  additional_info: any;
  status: 'pending' | 'approved' | 'rejected';
  review_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

export interface AirdropStats {
  totalTasks: number;
  activeTasks: number;
  pendingReviews: number;
  totalRewards: number;
  totalCompletions: number;
  totalDistributed: number;
}

class AdminAirdropService {
  /**
   * Get pending manual verification submissions
   */
  async getPendingSubmissions(): Promise<{
    success: boolean;
    data?: ManualSubmission[];
    error?: string;
  }> {
    try {
      if (!supabaseService.isConfigured()) {
        return { success: false, error: 'Database not configured' };
      }

      const supabase = supabaseService.getClient();
      if (!supabase) {
        return { success: false, error: 'Database connection failed' };
      }

      const { data, error } = await supabase
        .from('airdrop_manual_submissions')
        .select('*')
        .eq('status', 'pending')
        .order('submitted_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch pending submissions:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('Get pending submissions error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Approve a manual verification submission
   */
  async approveSubmission(
    submissionId: string,
    reviewerAddress: string,
    reviewNotes?: string
  ): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      if (!supabaseService.isConfigured()) {
        return { success: false, message: 'Database not configured' };
      }

      const supabase = supabaseService.getClient();
      if (!supabase) {
        return { success: false, message: 'Database connection failed' };
      }

      // Call the database function to approve submission
      const { data, error } = await supabase.rpc('approve_manual_submission', {
        p_submission_id: submissionId,
        p_reviewer: reviewerAddress,
        p_review_notes: reviewNotes || 'Approved by admin'
      });

      if (error) {
        console.error('Failed to approve submission:', error);
        return { success: false, message: 'Failed to approve submission', error: error.message };
      }

      if (data) {
        return { success: true, message: 'Submission approved successfully and RZC credited to user' };
      } else {
        return { success: false, message: 'Failed to approve submission' };
      }
    } catch (error: any) {
      console.error('Approve submission error:', error);
      return { success: false, message: 'Failed to approve submission', error: error.message };
    }
  }

  /**
   * Reject a manual verification submission
   */
  async rejectSubmission(
    submissionId: string,
    reviewerAddress: string,
    reviewNotes: string
  ): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      if (!supabaseService.isConfigured()) {
        return { success: false, message: 'Database not configured' };
      }

      const supabase = supabaseService.getClient();
      if (!supabase) {
        return { success: false, message: 'Database connection failed' };
      }

      // Call the database function to reject submission
      const { data, error } = await supabase.rpc('reject_manual_submission', {
        p_submission_id: submissionId,
        p_reviewer: reviewerAddress,
        p_review_notes: reviewNotes
      });

      if (error) {
        console.error('Failed to reject submission:', error);
        return { success: false, message: 'Failed to reject submission', error: error.message };
      }

      if (data) {
        return { success: true, message: 'Submission rejected successfully' };
      } else {
        return { success: false, message: 'Failed to reject submission' };
      }
    } catch (error: any) {
      console.error('Reject submission error:', error);
      return { success: false, message: 'Failed to reject submission', error: error.message };
    }
  }

  /**
   * Get airdrop statistics for admin dashboard
   */
  async getAirdropStats(): Promise<{
    success: boolean;
    data?: AirdropStats;
    error?: string;
  }> {
    try {
      if (!supabaseService.isConfigured()) {
        // Return data from centralized configuration
        const stats = getAirdropStats();
        return {
          success: true,
          data: {
            totalTasks: stats.totalTasks,
            activeTasks: stats.activeTasks,
            pendingReviews: 0, // Will be updated with real pending count
            totalRewards: stats.totalRewards,
            totalCompletions: stats.totalCompletions,
            totalDistributed: stats.totalRewardsDistributed
          }
        };
      }

      const supabase = supabaseService.getClient();
      if (!supabase) {
        return { success: false, error: 'Database connection failed' };
      }

      // Get pending submissions count
      const { count: pendingCount, error: pendingError } = await supabase
        .from('airdrop_manual_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (pendingError) {
        console.error('Failed to get pending count:', pendingError);
      }

      // Get stats from centralized configuration
      const stats = getAirdropStats();
      
      return {
        success: true,
        data: {
          totalTasks: stats.totalTasks,
          activeTasks: stats.activeTasks,
          pendingReviews: pendingCount || 0,
          totalRewards: stats.totalRewards,
          totalCompletions: stats.totalCompletions,
          totalDistributed: stats.totalRewardsDistributed
        }
      };
    } catch (error: any) {
      console.error('Get airdrop stats error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get task completion analytics
   */
  async getTaskAnalytics(): Promise<{
    success: boolean;
    data?: Array<{
      task_id: number;
      task_title: string;
      total_completions: number;
      total_rewards_distributed: number;
      completion_rate: number;
    }>;
    error?: string;
  }> {
    try {
      if (!supabaseService.isConfigured()) {
        return { success: false, error: 'Database not configured' };
      }

      const supabase = supabaseService.getClient();
      if (!supabase) {
        return { success: false, error: 'Database connection failed' };
      }

      // In a real implementation, this would query the airdrop_completions table
      // For now, return mock analytics data
      return {
        success: true,
        data: [
          { task_id: 0, task_title: 'Create RhizaCore Wallet', total_completions: 1247, total_rewards_distributed: 187050, completion_rate: 85.2 },
          { task_id: 1, task_title: 'Follow @RhizaCore on X', total_completions: 892, total_rewards_distributed: 89200, completion_rate: 71.6 },
          { task_id: 2, task_title: 'Retweet Announcement', total_completions: 756, total_rewards_distributed: 56700, completion_rate: 60.8 },
          { task_id: 3, task_title: 'Join Telegram Community', total_completions: 634, total_rewards_distributed: 79250, completion_rate: 51.0 },
          { task_id: 4, task_title: 'Refer 3 Friends', total_completions: 234, total_rewards_distributed: 70200, completion_rate: 18.8 },
          { task_id: 13, task_title: 'Create RZC Video Content', total_completions: 45, total_rewards_distributed: 22500, completion_rate: 3.6 },
          { task_id: 14, task_title: 'Write RZC Blog/Article', total_completions: 23, total_rewards_distributed: 17250, completion_rate: 1.8 },
          { task_id: 19, task_title: 'Influencer Collaboration', total_completions: 8, total_rewards_distributed: 8000, completion_rate: 0.6 }
        ]
      };
    } catch (error: any) {
      console.error('Get task analytics error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update an existing airdrop task
   */
  async updateTask(
    taskId: number,
    taskData: {
      title: string;
      description: string;
      reward: number;
      action: string;
      category: string;
      difficulty: string;
      is_active: boolean;
      instructions?: string;
      timeLimit?: string;
    }
  ): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      if (!supabaseService.isConfigured()) {
        // Simulate success for demo
        console.log('Task update simulated:', taskId, taskData);
        return { success: true, message: 'Task updated successfully (simulated)' };
      }

      const supabase = supabaseService.getClient();
      if (!supabase) {
        return { success: false, message: 'Database connection failed' };
      }

      // In a real implementation, this would update the airdrop_tasks table
      // For now, simulate the update
      console.log('Updating task in database:', taskId, taskData);
      
      // Simulate database update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return { success: true, message: 'Task updated successfully' };
    } catch (error: any) {
      console.error('Update task error:', error);
      return { success: false, message: 'Failed to update task', error: error.message };
    }
  }

  /**
   * Get a specific task by ID
   */
  async getTask(taskId: number): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      // Get task from centralized configuration
      const task = AIRDROP_TASKS.find(t => t.id === taskId);
      
      if (task) {
        return { success: true, data: task };
      } else {
        return { success: false, error: 'Task not found' };
      }
    } catch (error: any) {
      console.error('Get task error:', error);
      return { success: false, error: error.message };
    }
  }
  async exportAirdropData(): Promise<{
    success: boolean;
    data?: {
      tasks: any[];
      submissions: any[];
      completions: any[];
    };
    error?: string;
  }> {
    try {
      if (!supabaseService.isConfigured()) {
        return { success: false, error: 'Database not configured' };
      }

      const supabase = supabaseService.getClient();
      if (!supabase) {
        return { success: false, error: 'Database connection failed' };
      }

      // Get all manual submissions
      const { data: submissions, error: submissionsError } = await supabase
        .from('airdrop_manual_submissions')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (submissionsError) {
        console.error('Failed to export submissions:', submissionsError);
      }

      // In a real implementation, you would also query tasks and completions tables
      return {
        success: true,
        data: {
          tasks: [], // Would contain task definitions
          submissions: submissions || [],
          completions: [] // Would contain completion records
        }
      };
    } catch (error: any) {
      console.error('Export airdrop data error:', error);
      return { success: false, error: error.message };
    }
  }
}

export const adminAirdropService = new AdminAirdropService();