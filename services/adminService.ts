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
  avatar?: string;
  role: string;
  is_active: boolean;
  is_activated: boolean;
  is_premium?: boolean;
  activated_at?: string;
  activation_fee_paid?: number;
  rzc_balance: number;
  referrer_code?: string;
  last_squad_claim_at?: string;
  total_squad_rewards?: number;
  // Multi-chain balances
  ton_balance?: number;
  evm_balance?: number;
  btc_balance?: number;
  sol_balance?: number;
  tron_balance?: number;
  usdt_balance?: number;
  // Verification fields
  balance_verified?: boolean;
  balance_locked?: boolean;
  verification_badge_earned_at?: string;
  verification_level?: string;
  // Security fields
  last_login_at?: string;
  failed_login_attempts?: number;
  locked_until?: string;
  last_failed_attempt?: string;
  // Node fields
  node_activated?: boolean;
  node_activated_at?: string;
  total_activation_spent?: number;
  // Sync fields
  last_balance_sync_at?: string;
  // Legacy fields
  transfer_locked?: boolean;
  transfer_lock_reason?: string;
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
   * Update user account details (admin only) - Full profile editing with all wallet_users fields
   */
  async updateUserAccount(
    walletAddress: string,
    updates: {
      name?: string;
      email?: string;
      avatar?: string;
      role?: string;
      is_active?: boolean;
      is_activated?: boolean;
      is_premium?: boolean;
      activated_at?: string;
      activation_fee_paid?: number;
      rzc_balance?: number;
      referrer_code?: string;
      last_squad_claim_at?: string;
      total_squad_rewards?: number;
      // Multi-chain balances
      ton_balance?: number;
      evm_balance?: number;
      btc_balance?: number;
      sol_balance?: number;
      tron_balance?: number;
      usdt_balance?: number;
      // Verification fields
      balance_verified?: boolean;
      balance_locked?: boolean;
      verification_badge_earned_at?: string;
      verification_level?: string;
      // Security fields
      last_login_at?: string;
      // Node fields
      node_activated?: boolean;
      node_activated_at?: string;
      total_activation_spent?: number;
      // Sync fields
      last_balance_sync_at?: string;
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

      // Prepare update object - only include defined values
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      // Add all provided fields to update
      Object.keys(updates).forEach(key => {
        const value = (updates as any)[key];
        if (value !== undefined && value !== null && value !== '') {
          updateData[key] = value;
        }
      });

      // Update user account
      const { error: updateError } = await client
        .from('wallet_users')
        .update(updateData)
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

      // If no activation records found, try to get activated users instead
      if (!data || data.length === 0) {
        console.log('⚠️ No activation records found, checking for activated users...');
        
        const { data: activatedUsers, error: usersError, count: usersCount } = await client
          .from('wallet_users')
          .select('*', { count: 'exact' })
          .eq('is_activated', true)
          .order('activated_at', { ascending: false, nullsFirst: false })
          .range(offset, offset + limit - 1);

        if (usersError) {
          console.error('❌ Error fetching activated users:', usersError);
          return { success: false, error: usersError.message };
        }

        if (activatedUsers && activatedUsers.length > 0) {
          console.log('✅ Found activated users:', activatedUsers.length);
          
          // Transform activated users to look like activation records
          const transformedData = activatedUsers.map(user => ({
            id: user.id,
            wallet_address: user.wallet_address,
            activation_fee_usd: user.activation_fee_paid || 0,
            activation_fee_ton: user.activation_fee_paid || 0,
            ton_price_at_activation: 0,
            transaction_hash: null,
            status: 'completed',
            completed_at: user.activated_at || user.created_at,
            created_at: user.created_at,
            wallet_users: {
              name: user.name,
              email: user.email,
              rzc_balance: user.rzc_balance
            }
          }));

          return {
            success: true,
            activations: transformedData,
            total: usersCount || 0
          };
        }
      }

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

  /**
   * Lock a user's transfer capability (admin only)
   */
  async lockUserTransfers(
    walletAddress: string,
    reason: string,
    adminWallet: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const client = supabaseService.getClient();
      if (!client) return { success: false, error: 'Supabase not configured' };

      const { error } = await client
        .from('wallet_users')
        .update({
          transfer_locked: true,
          transfer_lock_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('wallet_address', walletAddress);

      if (error) throw error;

      const { notificationService } = await import('./notificationService');
      await notificationService.logActivity(walletAddress, 'settings_changed', `Transfers locked by admin`, {
        admin_wallet: adminWallet, reason, action: 'transfer_lock'
      });

      await client.from('wallet_notifications').insert({
        wallet_address: walletAddress,
        type: 'security_alert',
        title: '🔒 Transfers Locked',
        message: `Your transfer capability has been temporarily suspended. Reason: ${reason}`,
        data: { admin_wallet: adminWallet, reason },
        priority: 'urgent'
      });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Unlock a user's transfer capability (admin only)
   */
  async unlockUserTransfers(
    walletAddress: string,
    reason: string,
    adminWallet: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const client = supabaseService.getClient();
      if (!client) return { success: false, error: 'Supabase not configured' };

      const { error } = await client
        .from('wallet_users')
        .update({
          transfer_locked: false,
          transfer_lock_reason: null,
          updated_at: new Date().toISOString()
        })
        .eq('wallet_address', walletAddress);

      if (error) throw error;

      const { notificationService } = await import('./notificationService');
      await notificationService.logActivity(walletAddress, 'settings_changed', `Transfers unlocked by admin`, {
        admin_wallet: adminWallet, reason, action: 'transfer_unlock'
      });

      await client.from('wallet_notifications').insert({
        wallet_address: walletAddress,
        type: 'system_announcement',
        title: '🔓 Transfers Restored',
        message: `Your transfer capability has been restored. Reason: ${reason}`,
        data: { admin_wallet: adminWallet, reason },
        priority: 'high'
      });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Deduct RZC from a user's balance (admin only)
   */
  async deductRZCFromUser(
    walletAddress: string,
    amount: number,
    reason: string,
    adminWallet: string
  ): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    try {
      const client = supabaseService.getClient();
      if (!client) return { success: false, error: 'Supabase not configured' };

      // Fetch current balance
      const { data: userData, error: fetchError } = await client
        .from('wallet_users')
        .select('id, rzc_balance')
        .eq('wallet_address', walletAddress)
        .single();

      if (fetchError || !userData) throw new Error('User not found');

      const newBalance = Math.max(0, (userData.rzc_balance || 0) - amount);

      const { error } = await client
        .from('wallet_users')
        .update({ rzc_balance: newBalance, updated_at: new Date().toISOString() })
        .eq('wallet_address', walletAddress);

      if (error) throw error;

      // Insert deduction transaction record
      await client.from('wallet_rzc_transactions').insert({
        user_id: userData.id,
        wallet_address: walletAddress,
        transaction_type: 'admin_deduction',
        amount: -amount,
        balance_after: newBalance,
        description: `Admin deduction: ${reason}`,
        metadata: { admin_wallet: adminWallet, reason }
      }).throwOnError();

      const { notificationService } = await import('./notificationService');
      await notificationService.logActivity(walletAddress, 'settings_changed', `${amount} RZC deducted by admin`, {
        admin_wallet: adminWallet, reason, amount, new_balance: newBalance
      });

      await client.from('wallet_notifications').insert({
        wallet_address: walletAddress,
        type: 'security_alert',
        title: '⚠️ RZC Balance Adjusted',
        message: `${amount.toLocaleString()} RZC has been deducted from your balance by an administrator. Reason: ${reason}`,
        data: { admin_wallet: adminWallet, reason, amount, new_balance: newBalance },
        priority: 'high'
      });

      return { success: true, newBalance };
    } catch (error: any) {
      console.error('Error deducting RZC:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send a custom notification/message to a user (admin only)
   */
  async sendUserNotification(
    walletAddress: string,
    title: string,
    message: string,
    priority: 'normal' | 'high' | 'urgent',
    adminWallet: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const client = supabaseService.getClient();
      if (!client) return { success: false, error: 'Supabase not configured' };

      await client.from('wallet_notifications').insert({
        wallet_address: walletAddress,
        type: 'system_announcement',
        title,
        message,
        data: { admin_wallet: adminWallet, admin_message: true },
        priority
      });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get a single user by ID (admin only)
   */
  async getUserById(userId: string): Promise<{ success: boolean; user?: AdminUser; error?: string }> {
    try {
      const client = supabaseService.getClient();
      if (!client) return { success: false, error: 'Supabase not configured' };

      const { data, error } = await client
        .from('wallet_users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return { success: true, user: data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user RZC transaction history (admin only)
   */
  async getUserTransactionHistory(walletAddress: string, limit = 30): Promise<{
    success: boolean;
    transactions?: any[];
    error?: string;
  }> {
    try {
      const client = supabaseService.getClient();
      if (!client) return { success: false, error: 'Supabase not configured' };

      const { data, error } = await client
        .from('wallet_rzc_transactions')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { success: true, transactions: data || [] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

export const adminService = new AdminService();
