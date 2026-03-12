import { supabaseService } from './supabaseService';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface MigrationRequest {
  id: string;
  wallet_address: string;
  telegram_username: string;
  mobile_number: string;
  available_balance: number;
  claimable_balance: number;
  total_balance: number;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
}

export interface MigrationSubmitData {
  wallet_address: string;
  telegram_username: string;
  mobile_number: string;
  available_balance: number;
  claimable_balance: number;
  total_balance: number;
}

export interface StkMigrationRequest {
  id: string;
  wallet_address: string;
  telegram_username: string;
  mobile_number: string;
  stk_wallet_address: string;
  nft_token_id: string;
  stk_amount: number;
  ton_staked: number;
  starfi_points: number;
  rzc_equivalent: number;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
}

export interface StkMigrationSubmitData {
  wallet_address: string;
  telegram_username: string;
  mobile_number: string;
  stk_wallet_address: string;
  nft_token_id: string;
  stk_amount: number;
  ton_staked: number;
}

// ============================================================================
// MIGRATION SERVICE CLASS
// ============================================================================

class MigrationService {
  /**
   * Submit a new migration request
   */
  async submitMigrationRequest(data: MigrationSubmitData): Promise<{
    success: boolean;
    data?: MigrationRequest;
    error?: string;
  }> {
    const client = supabaseService.getClient();
    if (!client) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      console.log('📝 Submitting migration request for:', data.wallet_address);

      // Check if user already has a pending or approved request
      const { data: existing, error: checkError } = await client
        .from('wallet_migrations')
        .select('id, status')
        .eq('wallet_address', data.wallet_address)
        .in('status', ['pending', 'approved'])
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existing) {
        return {
          success: false,
          error: existing.status === 'approved' 
            ? 'You have already completed migration'
            : 'You already have a pending migration request'
        };
      }

      // Create new migration request
      const { data: migrationData, error } = await client
        .from('wallet_migrations')
        .insert({
          wallet_address: data.wallet_address,
          telegram_username: data.telegram_username,
          mobile_number: data.mobile_number,
          available_balance: data.available_balance,
          claimable_balance: data.claimable_balance,
          total_balance: data.total_balance,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Migration request submitted:', migrationData.id);
      return { success: true, data: migrationData };
    } catch (error: any) {
      console.error('❌ Migration submission error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get migration status for a wallet
   */
  async getMigrationStatus(walletAddress: string): Promise<{
    success: boolean;
    data?: MigrationRequest | null;
    error?: string;
  }> {
    const client = supabaseService.getClient();
    if (!client) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      console.log('🔍 Checking migration status for:', walletAddress);

      const { data, error } = await client
        .from('wallet_migrations')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return { success: true, data: data || null };
    } catch (error: any) {
      console.error('❌ Get migration status error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all migration requests (admin only)
   */
  async getAllMigrationRequests(
    status?: 'pending' | 'approved' | 'rejected',
    limit: number = 100
  ): Promise<{
    success: boolean;
    data?: MigrationRequest[];
    error?: string;
  }> {
    const client = supabaseService.getClient();
    if (!client) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      let query = client
        .from('wallet_migrations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('❌ Get migration requests error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Approve a migration request (admin only)
   */
  async approveMigration(
    requestId: string,
    adminWalletAddress: string,
    adminNotes?: string
  ): Promise<{
    success: boolean;
    data?: MigrationRequest;
    message?: string;
    error?: string;
  }> {
    const client = supabaseService.getClient();
    if (!client) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      console.log('✅ Approving migration request:', requestId);

      // Get the migration request
      const { data: migration, error: fetchError } = await client
        .from('wallet_migrations')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      if (migration.status !== 'pending') {
        return {
          success: false,
          error: `Migration is already ${migration.status}`
        };
      }

      // Update migration status
      const { data: updated, error: updateError } = await client
        .from('wallet_migrations')
        .update({
          status: 'approved',
          admin_notes: adminNotes || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminWalletAddress,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Credit RZC to user's wallet
      const { data: userProfile, error: profileError } = await supabaseService.getProfile(migration.wallet_address);
      
      if (profileError) {
        console.error('❌ Failed to get user profile:', profileError);
        throw new Error('User profile not found. Migration approved but RZC not credited.');
      }
      
      if (!userProfile) {
        throw new Error('User profile not found. Migration approved but RZC not credited.');
      }

      console.log(`💰 Crediting ${migration.total_balance} RZC to user ${userProfile.id}`);
      
      const creditResult = await supabaseService.awardRZCTokens(
        userProfile.id,
        migration.total_balance,
        'migration',
        `Migration from pre-mine wallet: ${migration.total_balance} RZC`,
        {
          migration_id: requestId,
          telegram_username: migration.telegram_username,
          mobile_number: migration.mobile_number,
          available_balance: migration.available_balance,
          claimable_balance: migration.claimable_balance
        }
      );

      if (!creditResult.success) {
        console.error('❌ Failed to credit RZC:', creditResult.error);
        throw new Error(`Migration approved but RZC crediting failed: ${creditResult.error}`);
      }

      console.log(`✅ Migration approved and ${migration.total_balance} RZC credited to user. New balance: ${creditResult.newBalance}`);
      return { 
        success: true, 
        data: updated,
        message: `Migration approved! ${migration.total_balance} RZC credited to user's wallet.`
      };
    } catch (error: any) {
      console.error('❌ Approve migration error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Reject a migration request (admin only)
   */
  async rejectMigration(
    requestId: string,
    adminWalletAddress: string,
    reason: string
  ): Promise<{
    success: boolean;
    data?: MigrationRequest;
    error?: string;
  }> {
    const client = supabaseService.getClient();
    if (!client) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      console.log('❌ Rejecting migration request:', requestId);

      const { data, error } = await client
        .from('wallet_migrations')
        .update({
          status: 'rejected',
          admin_notes: reason,
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminWalletAddress,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Migration rejected');
      return { success: true, data };
    } catch (error: any) {
      console.error('❌ Reject migration error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get migration statistics (admin only)
   */
  async getMigrationStats(): Promise<{
    success: boolean;
    data?: {
      total: number;
      pending: number;
      approved: number;
      rejected: number;
      totalRzcMigrated: number;
    };
    error?: string;
  }> {
    const client = supabaseService.getClient();
    if (!client) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      const { data, error } = await client
        .from('wallet_migrations')
        .select('status, total_balance');

      if (error) throw error;

      const stats = {
        total: data.length,
        pending: data.filter(m => m.status === 'pending').length,
        approved: data.filter(m => m.status === 'approved').length,
        rejected: data.filter(m => m.status === 'rejected').length,
        totalRzcMigrated: data
          .filter(m => m.status === 'approved')
          .reduce((sum, m) => sum + m.total_balance, 0)
      };

      return { success: true, data: stats };
    } catch (error: any) {
      console.error('❌ Get migration stats error:', error);
      return { success: false, error: error.message };
    }
  }

  // ============================================================================
  // STK MIGRATION METHODS
  // ============================================================================

  /**
   * Submit a new STK migration request
   * Conversion: 10,000,000 STK = 8 RZC
   */
  async submitStkMigrationRequest(data: StkMigrationSubmitData): Promise<{
    success: boolean;
    data?: StkMigrationRequest;
    error?: string;
  }> {
    const client = supabaseService.getClient();
    if (!client) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      console.log('📝 Submitting STK migration request for:', data.wallet_address);

      // Check if user already has a pending or approved request
      const { data: existing, error: checkError } = await client
        .from('stk_migrations')
        .select('id, status')
        .eq('wallet_address', data.wallet_address)
        .in('status', ['pending', 'approved'])
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existing) {
        return {
          success: false,
          error: existing.status === 'approved' 
            ? 'You have already completed STK migration'
            : 'You already have a pending STK migration request'
        };
      }

      // Calculate conversions
      const starfiPoints = data.stk_amount; // 1:1
      const rzcEquivalent = (data.stk_amount / 10000000) * 8; // 10M STK = 8 RZC

      // Create new STK migration request
      const { data: migrationData, error } = await client
        .from('stk_migrations')
        .insert({
          wallet_address: data.wallet_address,
          telegram_username: data.telegram_username,
          mobile_number: data.mobile_number,
          stk_wallet_address: data.stk_wallet_address,
          nft_token_id: data.nft_token_id,
          stk_amount: data.stk_amount,
          ton_staked: data.ton_staked,
          starfi_points: starfiPoints,
          rzc_equivalent: rzcEquivalent,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ STK migration request submitted:', migrationData.id);
      return { success: true, data: migrationData };
    } catch (error: any) {
      console.error('❌ STK migration submission error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get STK migration status for a wallet
   */
  async getStkMigrationStatus(walletAddress: string): Promise<{
    success: boolean;
    data?: StkMigrationRequest | null;
    error?: string;
  }> {
    const client = supabaseService.getClient();
    if (!client) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      console.log('🔍 Checking STK migration status for:', walletAddress);

      const { data, error } = await client
        .from('stk_migrations')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return { success: true, data: data || null };
    } catch (error: any) {
      console.error('❌ Get STK migration status error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all STK migration requests (admin only)
   */
  async getAllStkMigrationRequests(
    status?: 'pending' | 'approved' | 'rejected',
    limit: number = 100
  ): Promise<{
    success: boolean;
    data?: StkMigrationRequest[];
    error?: string;
  }> {
    const client = supabaseService.getClient();
    if (!client) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      let query = client
        .from('stk_migrations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('❌ Get STK migration requests error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Approve an STK migration request (admin only)
   */
  async approveStkMigration(
    requestId: string,
    adminWalletAddress: string,
    adminNotes?: string
  ): Promise<{
    success: boolean;
    data?: StkMigrationRequest;
    message?: string;
    error?: string;
  }> {
    const client = supabaseService.getClient();
    if (!client) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      console.log('✅ Approving STK migration request:', requestId);

      // Get the STK migration request
      const { data: migration, error: fetchError } = await client
        .from('stk_migrations')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      if (migration.status !== 'pending') {
        return {
          success: false,
          error: `STK migration is already ${migration.status}`
        };
      }

      // Update migration status
      const { data: updated, error: updateError } = await client
        .from('stk_migrations')
        .update({
          status: 'approved',
          admin_notes: adminNotes || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminWalletAddress,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Credit RZC to user's wallet
      const { data: userProfile, error: profileError } = await supabaseService.getProfile(migration.wallet_address);
      
      if (profileError) {
        console.error('❌ Failed to get user profile:', profileError);
        throw new Error('User profile not found. STK migration approved but RZC not credited.');
      }
      
      if (!userProfile) {
        throw new Error('User profile not found. STK migration approved but RZC not credited.');
      }

      console.log(`💰 Crediting ${migration.rzc_equivalent} RZC to user ${userProfile.id}`);
      
      const creditResult = await supabaseService.awardRZCTokens(
        userProfile.id,
        migration.rzc_equivalent,
        'stk_migration',
        `STK to StarFi migration: ${migration.stk_amount.toLocaleString()} STK + ${migration.ton_staked} TON = ${migration.rzc_equivalent} RZC`,
        {
          migration_id: requestId,
          telegram_username: migration.telegram_username,
          mobile_number: migration.mobile_number,
          stk_wallet_address: migration.stk_wallet_address,
          nft_token_id: migration.nft_token_id,
          stk_amount: migration.stk_amount,
          ton_staked: migration.ton_staked,
          starfi_points: migration.starfi_points
        }
      );

      if (!creditResult.success) {
        console.error('❌ Failed to credit RZC:', creditResult.error);
        throw new Error(`STK migration approved but RZC crediting failed: ${creditResult.error}`);
      }

      console.log(`✅ STK migration approved and ${migration.rzc_equivalent} RZC credited to user. New balance: ${creditResult.newBalance}`);
      return { 
        success: true, 
        data: updated,
        message: `STK migration approved! ${migration.rzc_equivalent} RZC credited to user's wallet.`
      };
    } catch (error: any) {
      console.error('❌ Approve STK migration error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Reject an STK migration request (admin only)
   */
  async rejectStkMigration(
    requestId: string,
    adminWalletAddress: string,
    reason: string
  ): Promise<{
    success: boolean;
    data?: StkMigrationRequest;
    error?: string;
  }> {
    const client = supabaseService.getClient();
    if (!client) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      console.log('❌ Rejecting STK migration request:', requestId);

      const { data, error } = await client
        .from('stk_migrations')
        .update({
          status: 'rejected',
          admin_notes: reason,
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminWalletAddress,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ STK migration rejected');
      return { success: true, data };
    } catch (error: any) {
      console.error('❌ Reject STK migration error:', error);
      return { success: false, error: error.message };
    }
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const migrationService = new MigrationService();
