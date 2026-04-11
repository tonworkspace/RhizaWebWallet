/**
 * Admin Service
 * Handles administrative operations for user management
 */

import { supabaseService } from './supabaseService';

export interface AdminUser {
  id: string;
  wallet_address: string;
  name: string;
  email?: string;
  role: string;
  is_active: boolean;
  is_activated: boolean;
  activated_at?: string;
  activation_fee_paid?: number;
  rzc_balance: number;
  referrer_code?: string;
  created_at: string;
  updated_at: string;
}

export interface ActivationAction {
  wallet_address: string;
  action: 'activate' | 'deactivate';
  reason: string;
  admin_wallet: string;
}

class AdminService {
  /**
   * Check if current user is admin
   */
  async isAdmin(walletAddress: string): Promise<boolean> {
    try {
      const profileResult = await supabaseService.getProfile(walletAddress);
      if (!profileResult.success || !profileResult.data) {
        return false;
      }

      // Check if user has admin role
      return profileResult.data.role === 'admin' || profileResult.data.role === 'super_admin';
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  /**
   * Get all users (admin only)
   */
  async getAllUsers(options: {
    limit?: number;
    offset?: number;
    search?: string;
    filter?: 'all' | 'activated' | 'not_activated' | 'active' | 'inactive';
  } = {}): Promise<{
    success: boolean;
    users?: AdminUser[];
    total?: number;
    error?: string;
  }> {
    try {
      const { limit = 50, offset = 0, search, filter = 'all' } = options;
      const client = supabaseService.getClient();
      
      if (!client) {
        return { success: false, error: 'Supabase not configured' };
      }

      let query = client
        .from('wallet_users')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply search filter
      if (search) {
        query = query.or(`wallet_address.ilike.%${search}%,name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      // Apply status filter
      if (filter === 'activated') {
        query = query.eq('is_activated', true);
      } else if (filter === 'not_activated') {
        query = query.eq('is_activated', false);
      } else if (filter === 'active') {
        query = query.eq('is_active', true);
      } else if (filter === 'inactive') {
        query = query.eq('is_active', false);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching users:', error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        users: data || [],
        total: count || 0
      };
    } catch (error: any) {
      console.error('Error in getAllUsers:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Manually activate a user's wallet (admin only)
   */
  async activateUser(
    walletAddress: string,
    adminWallet: string,
    reason: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const client = supabaseService.getClient();
      if (!client) {
        return { success: false, error: 'Supabase not configured' };
      }

      // Update user activation status
      const { error: updateError } = await client
        .from('wallet_users')
        .update({
          is_activated: true,
          activated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('wallet_address', walletAddress);

      if (updateError) {
        throw updateError;
      }

      // Create activation record
      // Note: Get user_id first for the activation record
      const { data: userData } = await client
        .from('wallet_users')
        .select('id')
        .eq('wallet_address', walletAddress)
        .single();

      if (userData) {
        const { error: activationError } = await client
          .from('wallet_activations')
          .insert({
            user_id: userData.id,
            wallet_address: walletAddress,
            activation_fee_usd: 0,
            activation_fee_ton: 0,
            ton_price_at_activation: 0,
            transaction_hash: null,
            status: 'completed',
            completed_at: new Date().toISOString()
          });

        if (activationError && activationError.code !== '23505') { // Ignore duplicate key error
          console.warn('Activation record error:', activationError);
        }
      }

      // Log activity
      const { notificationService } = await import('./notificationService');
      await notificationService.logActivity(
        walletAddress,
        'wallet_created',
        `Wallet manually activated by admin`,
        {
          admin_wallet: adminWallet,
          reason: reason,
          manual_activation: true
        }
      );

      // Create notification for user
      await client
        .from('wallet_notifications')
        .insert({
          wallet_address: walletAddress,
          type: 'system_announcement',
          title: '✅ Wallet Activated',
          message: 'Your wallet has been activated by an administrator. You now have full access to all features.',
          data: {
            admin_activated: true,
            reason: reason
          },
          priority: 'high'
        });

      console.log(`✅ User ${walletAddress} activated by admin ${adminWallet}`);
      return { success: true };
    } catch (error: any) {
      console.error('Error activating user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Deactivate a user's wallet (admin only)
   */
  async deactivateUser(
    walletAddress: string,
    adminWallet: string,
    reason: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const client = supabaseService.getClient();
      if (!client) {
        return { success: false, error: 'Supabase not configured' };
      }

      // Update user activation status
      const { error: updateError } = await client
        .from('wallet_users')
        .update({
          is_activated: false,
          updated_at: new Date().toISOString()
        })
        .eq('wallet_address', walletAddress);

      if (updateError) {
        throw updateError;
      }

      // Log activity
      const { notificationService } = await import('./notificationService');
      await notificationService.logActivity(
        walletAddress,
        'settings_changed',
        `Wallet deactivated by admin`,
        {
          admin_wallet: adminWallet,
          reason: reason,
          manual_deactivation: true
        }
      );

      // Create notification for user
      await client
        .from('wallet_notifications')
        .insert({
          wallet_address: walletAddress,
          type: 'security_alert',
          title: '⚠️ Wallet Deactivated',
          message: `Your wallet has been deactivated by an administrator. Reason: ${reason}`,
          data: {
            admin_deactivated: true,
            reason: reason
          },
          priority: 'urgent'
        });

      console.log(`⚠️ User ${walletAddress} deactivated by admin ${adminWallet}`);
      return { success: true };
    } catch (error: any) {
      console.error('Error deactivating user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user account details (admin only)
   */
  async updateUserAccount(
    walletAddress: string,
    updates: {
      name?: string;
      email?: string;
      role?: string;
      is_active?: boolean;
      rzc_balance?: number;
    },
    adminWallet: string,
    reason: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const client = supabaseService.getClient();
      if (!client) {
        return { success: false, error: 'Supabase not configured' };
      }

      // Update user account
      const { error: updateError } = await client
        .from('wallet_users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('wallet_address', walletAddress);

      if (updateError) {
        throw updateError;
      }

      // Log activity
      const { notificationService } = await import('./notificationService');
      await notificationService.logActivity(
        walletAddress,
        'settings_changed',
        `Account updated by admin`,
        {
          admin_wallet: adminWallet,
          reason: reason,
          updates: updates,
          admin_update: true
        }
      );

      // Create notification for user
      await client
        .from('wallet_notifications')
        .insert({
          wallet_address: walletAddress,
          type: 'system_announcement',
          title: 'ℹ️ Account Updated',
          message: `Your account has been updated by an administrator. Reason: ${reason}`,
          data: {
            admin_updated: true,
            reason: reason,
            changes: Object.keys(updates)
          },
          priority: 'normal'
        });

      console.log(`✅ User ${walletAddress} updated by admin ${adminWallet}`);
      return { success: true };
    } catch (error: any) {
      console.error('Error updating user account:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Award RZC to user (admin only)
   */
  async awardRZCToUser(
    walletAddress: string,
    amount: number,
    reason: string,
    adminWallet: string
  ): Promise<{
    success: boolean;
    newBalance?: number;
    error?: string;
  }> {
    try {
      // Get user profile
      const profileResult = await supabaseService.getProfile(walletAddress);
      if (!profileResult.success || !profileResult.data) {
        return { success: false, error: 'User not found' };
      }

      const userId = profileResult.data.id;

      // Award RZC
      const result = await supabaseService.awardRZCTokens(
        userId,
        amount,
        'admin_award',
        `Admin award: ${reason}`,
        {
          admin_wallet: adminWallet,
          reason: reason,
          manual_award: true
        }
      );

      if (result.success) {
        // Log activity
        const { notificationService } = await import('./notificationService');
        await notificationService.logActivity(
          walletAddress,
          'reward_claimed',
          `Received ${amount} RZC from admin`,
          {
            amount: amount,
            admin_wallet: adminWallet,
            reason: reason
          }
        );
      }

      return result;
    } catch (error: any) {
      console.error('Error awarding RZC:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user activation history
   */
  async getUserActivationHistory(walletAddress: string): Promise<{
    success: boolean;
    history?: any[];
    error?: string;
  }> {
    try {
      const client = supabaseService.getClient();
      if (!client) {
        return { success: false, error: 'Supabase not configured' };
      }

      const { data, error } = await client
        .from('wallet_activations')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return { success: true, history: data || [] };
    } catch (error: any) {
      console.error('Error fetching activation history:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get recent wallet activations with payment details
   */
  async getRecentActivations(options: {
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    success: boolean;
    activations?: any[];
    total?: number;
    error?: string;
  }> {
    try {
      const { limit = 50, offset = 0 } = options;
      const client = supabaseService.getClient();
      
      if (!client) {
        return { success: false, error: 'Supabase not configured' };
      }

      console.log('🔍 Fetching activations with limit:', limit, 'offset:', offset);

      // Fetch activations with user details using LEFT JOIN
      const { data, error, count } = await client
        .from('wallet_activations')
        .select(`
          id,
          wallet_address,
          activation_fee_usd,
          activation_fee_ton,
          ton_price_at_activation,
          transaction_hash,
          status,
          completed_at,
          created_at,
          wallet_users!left(
            name,
            email,
            rzc_balance
          )
        `, { count: 'exact' })
        .order('completed_at', { ascending: false, nullsFirst: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('❌ Error fetching activations:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Fetched activations:', data?.length || 0, 'total:', count || 0);

      return {
        success: true,
        activations: data || [],
        total: count || 0
      };
    } catch (error: any) {
      console.error('❌ Error in getRecentActivations:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all asset rates from database
   */
  async getAssetRates(): Promise<{
    success: boolean;
    rates?: Record<string, number>;
    error?: string;
  }> {
    try {
      const result = await supabaseService.getConfig();
      if (result.success) {
        return { success: true, rates: result.data };
      }
      return { success: false, error: result.error };
    } catch (error: any) {
      console.error('Error fetching asset rates:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update an asset rate in the database
   */
  async updateAssetRate(
    key: string,
    value: number,
    adminWallet: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // First verify admin status (redundant but safe)
      const isAdmin = await this.isAdmin(adminWallet);
      if (!isAdmin) {
        return { success: false, error: 'Unauthorized: Admin access required' };
      }

      const result = await supabaseService.setConfig(key, value, adminWallet);
      
      if (result.success) {
        // Log activity
        const { notificationService } = await import('./notificationService');
        await notificationService.logActivity(
          adminWallet,
          'settings_changed',
          `Asset rate updated: ${key} = ${value}`,
          { key, value, admin_update: true }
        );
      }
      
      return result;
    } catch (error: any) {
      console.error('Error updating asset rate:', error);
      return { success: false, error: error.message };
    }
  }
}

export const adminService = new AdminService();
