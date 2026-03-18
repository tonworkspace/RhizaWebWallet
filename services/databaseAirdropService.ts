import { supabaseService } from './supabaseService';

export interface DatabaseAirdropTask {
  id: number;
  title: string;
  description: string;
  reward: number;
  action: string;
  category: 'social' | 'engagement' | 'growth' | 'content';
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  is_active: boolean;
  instructions?: string;
  time_limit?: string;
  verification_type: 'automatic' | 'manual' | 'social_api';
  requirements?: Record<string, any>;
  sort_order: number;
  total_completions?: number;
  total_rewards_distributed?: number;
  last_completion_at?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface CreateTaskData {
  title: string;
  description: string;
  reward: number;
  action: string;
  category: 'social' | 'engagement' | 'growth' | 'content';
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  instructions?: string;
  time_limit?: string;
  verification_type?: 'automatic' | 'manual' | 'social_api';
  requirements?: Record<string, any>;
  sort_order?: number;
}

export interface UpdateTaskData extends CreateTaskData {
  is_active: boolean;
}

class DatabaseAirdropService {
  /**
   * Get all active airdrop tasks from database
   */
  async getActiveTasks(): Promise<{
    success: boolean;
    data?: DatabaseAirdropTask[];
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

      const { data, error } = await supabase.rpc('get_active_airdrop_tasks');

      if (error) {
        console.error('Failed to fetch active tasks:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('Get active tasks error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all airdrop tasks (for admin dashboard)
   */
  async getAllTasks(): Promise<{
    success: boolean;
    data?: DatabaseAirdropTask[];
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

      const { data, error } = await supabase.rpc('get_all_airdrop_tasks');

      if (error) {
        console.error('Failed to fetch all tasks:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('Get all tasks error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get single task by ID
   */
  async getTaskById(taskId: number): Promise<{
    success: boolean;
    data?: DatabaseAirdropTask;
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
        .from('airdrop_tasks')
        .select(`
          *,
          airdrop_task_stats (
            total_completions,
            total_rewards_distributed,
            last_completion_at
          )
        `)
        .eq('id', taskId)
        .single();

      if (error) {
        console.error('Failed to fetch task:', error);
        return { success: false, error: error.message };
      }

      // Flatten the stats data
      const task = {
        ...data,
        total_completions: data.airdrop_task_stats?.total_completions || 0,
        total_rewards_distributed: data.airdrop_task_stats?.total_rewards_distributed || 0,
        last_completion_at: data.airdrop_task_stats?.last_completion_at
      };
      delete task.airdrop_task_stats;

      return { success: true, data: task };
    } catch (error: any) {
      console.error('Get task by ID error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create new airdrop task
   */
  async createTask(
    taskData: CreateTaskData,
    createdBy?: string
  ): Promise<{
    success: boolean;
    data?: { id: number };
    message: string;
  }> {
    try {
      if (!supabaseService.isConfigured()) {
        return { success: false, message: 'Database not configured' };
      }

      const supabase = supabaseService.getClient();
      if (!supabase) {
        return { success: false, message: 'Database connection failed' };
      }

      const { data, error } = await supabase.rpc('create_airdrop_task', {
        p_title: taskData.title,
        p_description: taskData.description,
        p_reward: taskData.reward,
        p_action: taskData.action,
        p_category: taskData.category,
        p_difficulty: taskData.difficulty,
        p_instructions: taskData.instructions || null,
        p_time_limit: taskData.time_limit || null,
        p_verification_type: taskData.verification_type || 'manual',
        p_requirements: taskData.requirements || {},
        p_sort_order: taskData.sort_order || null,
        p_created_by: createdBy || null
      });

      if (error) {
        console.error('Failed to create task:', error);
        return { success: false, message: error.message };
      }

      return {
        success: true,
        data: { id: data },
        message: 'Task created successfully'
      };
    } catch (error: any) {
      console.error('Create task error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Update existing airdrop task
   */
  async updateTask(
    taskId: number,
    taskData: UpdateTaskData,
    updatedBy?: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      if (!supabaseService.isConfigured()) {
        return { success: false, message: 'Database not configured' };
      }

      const supabase = supabaseService.getClient();
      if (!supabase) {
        return { success: false, message: 'Database connection failed' };
      }

      const { data, error } = await supabase.rpc('update_airdrop_task', {
        p_task_id: taskId,
        p_title: taskData.title,
        p_description: taskData.description,
        p_reward: taskData.reward,
        p_action: taskData.action,
        p_category: taskData.category,
        p_difficulty: taskData.difficulty,
        p_is_active: taskData.is_active,
        p_instructions: taskData.instructions || null,
        p_time_limit: taskData.time_limit || null,
        p_verification_type: taskData.verification_type || 'manual',
        p_requirements: taskData.requirements || {},
        p_sort_order: taskData.sort_order || null,
        p_updated_by: updatedBy || null
      });

      if (error) {
        console.error('Failed to update task:', error);
        return { success: false, message: error.message };
      }

      if (!data) {
        return { success: false, message: 'Task not found' };
      }

      return { success: true, message: 'Task updated successfully' };
    } catch (error: any) {
      console.error('Update task error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Delete (deactivate) airdrop task
   */
  async deleteTask(
    taskId: number,
    deletedBy?: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      if (!supabaseService.isConfigured()) {
        return { success: false, message: 'Database not configured' };
      }

      const supabase = supabaseService.getClient();
      if (!supabase) {
        return { success: false, message: 'Database connection failed' };
      }

      const { data, error } = await supabase.rpc('delete_airdrop_task', {
        p_task_id: taskId,
        p_deleted_by: deletedBy || null
      });

      if (error) {
        console.error('Failed to delete task:', error);
        return { success: false, message: error.message };
      }

      if (!data) {
        return { success: false, message: 'Task not found' };
      }

      return { success: true, message: 'Task deactivated successfully' };
    } catch (error: any) {
      console.error('Delete task error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Reorder tasks
   */
  async reorderTasks(
    taskIds: number[],
    updatedBy?: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      if (!supabaseService.isConfigured()) {
        return { success: false, message: 'Database not configured' };
      }

      const supabase = supabaseService.getClient();
      if (!supabase) {
        return { success: false, message: 'Database connection failed' };
      }

      const { data, error } = await supabase.rpc('reorder_airdrop_tasks', {
        p_task_ids: taskIds,
        p_updated_by: updatedBy || null
      });

      if (error) {
        console.error('Failed to reorder tasks:', error);
        return { success: false, message: error.message };
      }

      return { success: true, message: 'Tasks reordered successfully' };
    } catch (error: any) {
      console.error('Reorder tasks error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get airdrop statistics
   */
  async getAirdropStats(): Promise<{
    success: boolean;
    data?: {
      totalTasks: number;
      activeTasks: number;
      totalRewards: number;
      totalCompletions: number;
      totalDistributed: number;
      averageReward: number;
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

      const { data, error } = await supabase
        .from('airdrop_tasks')
        .select(`
          id,
          reward,
          is_active,
          airdrop_task_stats (
            total_completions,
            total_rewards_distributed
          )
        `);

      if (error) {
        console.error('Failed to fetch airdrop stats:', error);
        return { success: false, error: error.message };
      }

      const stats = data.reduce(
        (acc, task) => {
          acc.totalTasks++;
          if (task.is_active) {
            acc.activeTasks++;
            acc.totalRewards += task.reward;
          }
          acc.totalCompletions += task.airdrop_task_stats?.total_completions || 0;
          acc.totalDistributed += task.airdrop_task_stats?.total_rewards_distributed || 0;
          return acc;
        },
        {
          totalTasks: 0,
          activeTasks: 0,
          totalRewards: 0,
          totalCompletions: 0,
          totalDistributed: 0,
          averageReward: 0
        }
      );

      stats.averageReward = stats.activeTasks > 0 ? Math.round(stats.totalRewards / stats.activeTasks) : 0;

      return { success: true, data: stats };
    } catch (error: any) {
      console.error('Get airdrop stats error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get tasks by category
   */
  async getTasksByCategory(category: string): Promise<{
    success: boolean;
    data?: DatabaseAirdropTask[];
    error?: string;
  }> {
    try {
      const result = await this.getActiveTasks();
      if (!result.success) {
        return result;
      }

      const filteredTasks = result.data?.filter(task => task.category === category) || [];
      return { success: true, data: filteredTasks };
    } catch (error: any) {
      console.error('Get tasks by category error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get tasks by difficulty
   */
  async getTasksByDifficulty(difficulty: string): Promise<{
    success: boolean;
    data?: DatabaseAirdropTask[];
    error?: string;
  }> {
    try {
      const result = await this.getActiveTasks();
      if (!result.success) {
        return result;
      }

      const filteredTasks = result.data?.filter(task => task.difficulty === difficulty) || [];
      return { success: true, data: filteredTasks };
    } catch (error: any) {
      console.error('Get tasks by difficulty error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Search tasks by title or description
   */
  async searchTasks(query: string): Promise<{
    success: boolean;
    data?: DatabaseAirdropTask[];
    error?: string;
  }> {
    try {
      const result = await this.getActiveTasks();
      if (!result.success) {
        return result;
      }

      const searchQuery = query.toLowerCase();
      const filteredTasks = result.data?.filter(task => 
        task.title.toLowerCase().includes(searchQuery) ||
        task.description.toLowerCase().includes(searchQuery) ||
        task.instructions?.toLowerCase().includes(searchQuery)
      ) || [];

      return { success: true, data: filteredTasks };
    } catch (error: any) {
      console.error('Search tasks error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Toggle task active status
   */
  async toggleTaskStatus(
    taskId: number,
    updatedBy?: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // First get the current task
      const taskResult = await this.getTaskById(taskId);
      if (!taskResult.success || !taskResult.data) {
        return { success: false, message: 'Task not found' };
      }

      // Update with opposite status
      const updateData: UpdateTaskData = {
        ...taskResult.data,
        is_active: !taskResult.data.is_active
      };

      return await this.updateTask(taskId, updateData, updatedBy);
    } catch (error: any) {
      console.error('Toggle task status error:', error);
      return { success: false, message: error.message };
    }
  }
}

export const databaseAirdropService = new DatabaseAirdropService();