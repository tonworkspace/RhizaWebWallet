/**
 * Notification Service
 * Handles in-app notifications and user activity tracking
 */

import { supabaseService } from './supabaseService';

// Get the supabase client through a helper
const getSupabaseClient = () => {
  // Access the client through supabaseService
  // We'll use supabaseService methods instead of direct client access
  return (supabaseService as any).client;
};

export interface Notification {
  id: string;
  user_id: string | null;
  wallet_address: string;
  type: 'transaction_received' | 'transaction_sent' | 'transaction_confirmed' | 'transaction_failed' | 
        'referral_earned' | 'referral_joined' | 'reward_claimed' | 'system_announcement' | 
        'security_alert' | 'achievement_unlocked';
  title: string;
  message: string;
  data: Record<string, any>;
  is_read: boolean;
  is_archived: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  action_url: string | null;
  action_label: string | null;
  created_at: string;
  read_at: string | null;
  expires_at: string | null;
}

export interface UserActivity {
  id: string;
  user_id: string | null;
  wallet_address: string;
  activity_type: 'login' | 'logout' | 'wallet_created' | 'wallet_imported' | 
                 'transaction_sent' | 'transaction_received' | 'profile_updated' | 
                 'settings_changed' | 'referral_code_used' | 'referral_code_shared' | 
                 'reward_claimed' | 'page_viewed' | 'feature_used';
  description: string;
  metadata: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  device_type: string | null;
  created_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  wallet_address: string;
  enable_transaction_notifications: boolean;
  enable_referral_notifications: boolean;
  enable_reward_notifications: boolean;
  enable_system_notifications: boolean;
  enable_security_notifications: boolean;
  enable_push_notifications: boolean;
  enable_email_notifications: boolean;
  created_at: string;
  updated_at: string;
}

class NotificationService {
  /**
   * Get notifications for a wallet
   */
  async getNotifications(
    walletAddress: string,
    options: {
      limit?: number;
      includeRead?: boolean;
      includeArchived?: boolean;
      type?: string;
    } = {}
  ): Promise<{ success: boolean; notifications?: Notification[]; error?: string }> {
    try {
      const { limit = 50, includeRead = true, includeArchived = false, type } = options;
      const supabase = getSupabaseClient();

      let query = supabase
        .from('wallet_notifications')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!includeRead) {
        query = query.eq('is_read', false);
      }

      if (!includeArchived) {
        query = query.eq('is_archived', false);
      }

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching notifications:', error);
        return { success: false, error: error.message };
      }

      return { success: true, notifications: data || [] };
    } catch (error) {
      console.error('❌ Error in getNotifications:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(walletAddress: string): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('wallet_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('wallet_address', walletAddress)
        .eq('is_read', false)
        .eq('is_archived', false);

      if (error) {
        console.error('❌ Error fetching unread count:', error);
        return { success: false, error: error.message };
      }

      return { success: true, count: data || 0 };
    } catch (error) {
      console.error('❌ Error in getUnreadCount:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.rpc('mark_notification_read', {
        p_notification_id: notificationId
      });

      if (error) {
        console.error('❌ Error marking notification as read:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error in markAsRead:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(walletAddress: string): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.rpc('mark_all_notifications_read', {
        p_wallet_address: walletAddress
      });

      if (error) {
        console.error('❌ Error marking all as read:', error);
        return { success: false, error: error.message };
      }

      return { success: true, count: data };
    } catch (error) {
      console.error('❌ Error in markAllAsRead:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Archive notification
   */
  async archiveNotification(notificationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('wallet_notifications')
        .update({ is_archived: true })
        .eq('id', notificationId);

      if (error) {
        console.error('❌ Error archiving notification:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error in archiveNotification:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('wallet_notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('❌ Error deleting notification:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error in deleteNotification:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Create manual notification (for testing or admin)
   */
  async createNotification(
    walletAddress: string,
    type: Notification['type'],
    title: string,
    message: string,
    options: {
      data?: Record<string, any>;
      priority?: Notification['priority'];
      actionUrl?: string;
      actionLabel?: string;
    } = {}
  ): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.rpc('create_notification', {
        p_wallet_address: walletAddress,
        p_type: type,
        p_title: title,
        p_message: message,
        p_data: options.data || {},
        p_priority: options.priority || 'normal',
        p_action_url: options.actionUrl || null,
        p_action_label: options.actionLabel || null
      });

      if (error) {
        console.error('❌ Error creating notification:', error);
        return { success: false, error: error.message };
      }

      return { success: true, notificationId: data };
    } catch (error) {
      console.error('❌ Error in createNotification:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get user activity
   */
  async getUserActivity(
    walletAddress: string,
    options: {
      limit?: number;
      activityType?: string;
    } = {}
  ): Promise<{ success: boolean; activities?: UserActivity[]; error?: string }> {
    try {
      const { limit = 50, activityType } = options;
      const supabase = getSupabaseClient();

      let query = supabase
        .from('wallet_user_activity')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (activityType) {
        query = query.eq('activity_type', activityType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching user activity:', error);
        return { success: false, error: error.message };
      }

      return { success: true, activities: data || [] };
    } catch (error) {
      console.error('❌ Error in getUserActivity:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Log user activity
   */
  async logActivity(
    walletAddress: string,
    activityType: UserActivity['activity_type'],
    description: string,
    metadata: Record<string, any> = {}
  ): Promise<{ success: boolean; activityId?: string; error?: string }> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.rpc('log_user_activity', {
        p_wallet_address: walletAddress,
        p_activity_type: activityType,
        p_description: description,
        p_metadata: metadata
      });

      if (error) {
        console.error('❌ Error logging activity:', error);
        return { success: false, error: error.message };
      }

      return { success: true, activityId: data };
    } catch (error) {
      console.error('❌ Error in logActivity:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get notification preferences
   */
  async getPreferences(walletAddress: string): Promise<{ 
    success: boolean; 
    preferences?: NotificationPreferences; 
    error?: string 
  }> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('wallet_notification_preferences')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ Error fetching preferences:', error);
        return { success: false, error: error.message };
      }

      return { success: true, preferences: data || undefined };
    } catch (error) {
      console.error('❌ Error in getPreferences:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    walletAddress: string,
    preferences: Partial<Omit<NotificationPreferences, 'id' | 'user_id' | 'wallet_address' | 'created_at' | 'updated_at'>>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('wallet_notification_preferences')
        .upsert({
          wallet_address: walletAddress,
          ...preferences
        }, {
          onConflict: 'wallet_address'
        });

      if (error) {
        console.error('❌ Error updating preferences:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error in updatePreferences:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Subscribe to real-time notifications
   */
  subscribeToNotifications(
    walletAddress: string,
    callback: (notification: Notification) => void
  ) {
    const supabase = getSupabaseClient();
    const subscription = supabase
      .channel(`notifications:${walletAddress}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wallet_notifications',
          filter: `wallet_address=eq.${walletAddress}`
        },
        (payload) => {
          console.log('🔔 New notification received:', payload.new);
          callback(payload.new as Notification);
        }
      )
      .subscribe();

    return subscription;
  }
}

export const notificationService = new NotificationService();

// Re-export types for convenience
export type { Notification, UserActivity, NotificationPreferences };
