import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface UserProfile {
  id: string;
  wallet_address: string;
  name: string;
  avatar: string;
  email?: string | null;
  role: string;
  is_active: boolean;
  referrer_code?: string | null;
  rzc_balance: number;
  is_premium?: boolean; // Premium members earn 5 RZC per squad claim
  last_squad_claim_at?: string | null; // Last squad mining claim timestamp
  total_squad_rewards?: number; // Total RZC earned from squad mining
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  wallet_address: string;
  type: 'send' | 'receive' | 'swap' | 'stake';
  amount: string;
  asset: string;
  to_address?: string | null;
  from_address?: string | null;
  tx_hash?: string | null;
  status: 'pending' | 'confirmed' | 'failed';
  metadata?: any;
  created_at: string;
}

export interface ReferralData {
  id: string;
  user_id: string;
  referrer_id?: string | null;
  referral_code: string;
  total_earned: number;
  total_referrals: number;
  rank: string;
  level: number;
  created_at: string;
  updated_at: string;
}

export interface ReferralEarning {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  amount: number;
  percentage: number;
  transaction_id?: string | null;
  created_at: string;
}

export interface AnalyticsEvent {
  id: string;
  user_id?: string | null;
  event_name: string;
  properties?: any;
  created_at: string;
}

export interface RZCTransaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string;
  metadata?: any;
  created_at: string;
}

// ============================================================================
// SUPABASE SERVICE CLASS
// ============================================================================

class SupabaseService {
  private client: SupabaseClient | null = null;
  private isInitialized: boolean = false;

  constructor() {
    this.initialize();
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  private initialize() {
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      try {
        this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        this.isInitialized = true;
        console.log('✅ Supabase client initialized');
      } catch (error) {
        console.error('❌ Supabase initialization failed:', error);
        this.isInitialized = false;
      }
    } else {
      console.warn('⚠️ Supabase credentials not found in environment variables');
      this.isInitialized = false;
    }
  }

  isConfigured(): boolean {
    return this.isInitialized && this.client !== null;
  }

  getClient(): SupabaseClient | null {
    return this.client;
  }

  // ============================================================================
  // USER PROFILE MANAGEMENT
  // ============================================================================

  /**
   * Create or update user profile
   * Uses upsert to handle both create and update operations
   */
  async createOrUpdateProfile(profile: Partial<UserProfile>): Promise<{
    success: boolean;
    data?: UserProfile;
    error?: string;
  }> {
    if (!this.client) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      console.log('💾 Creating/updating profile:', profile.wallet_address);

      const { data, error } = await this.client
        .from('wallet_users')
        .upsert(
          {
            ...profile,
            updated_at: new Date().toISOString()
          },
          { 
            onConflict: 'wallet_address',
            ignoreDuplicates: false 
          }
        )
        .select()
        .single();

      if (error) {
        console.error('❌ Profile upsert error:', error);
        throw error;
      }

      console.log('✅ Profile saved:', data.id);
      return { success: true, data };
    } catch (error: any) {
      console.error('❌ Profile operation failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user profile by wallet address
   */
  async getProfile(walletAddress: string): Promise<{
    success: boolean;
    data?: UserProfile | null;
    error?: string;
  }> {
    if (!this.client) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      console.log('🔍 Fetching profile for:', walletAddress);

      const { data, error } = await this.client
        .from('wallet_users')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single();

      if (error) {
        // PGRST116 = not found, which is not an error
        if (error.code === 'PGRST116') {
          console.log('ℹ️ Profile not found');
          return { success: true, data: null };
        }
        throw error;
      }

      console.log('✅ Profile found:', data.name);
      return { success: true, data };
    } catch (error: any) {
      console.error('❌ Profile fetch error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user profile by ID
   */
  async getProfileById(userId: string): Promise<{
    success: boolean;
    data?: UserProfile | null;
    error?: string;
  }> {
    if (!this.client) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const { data, error } = await this.client
        .from('wallet_users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: true, data: null };
        }
        throw error;
      }

      return { success: true, data };
    } catch (error: any) {
      console.error('❌ Profile fetch by ID error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update profile fields
   */
  async updateProfile(
    walletAddress: string,
    updates: Partial<Pick<UserProfile, 'name' | 'avatar' | 'email'>>
  ): Promise<{
    success: boolean;
    data?: UserProfile;
    error?: string;
  }> {
    if (!this.client) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      console.log('📝 Updating profile:', walletAddress);

      const { data, error } = await this.client
        .from('wallet_users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('wallet_address', walletAddress)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Profile updated');
      return { success: true, data };
    } catch (error: any) {
      console.error('❌ Profile update error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all users (admin only)
   */
  async getAllUsers(limit: number = 100): Promise<{
    success: boolean;
    data?: UserProfile[];
    error?: string;
  }> {
    if (!this.client) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const { data, error } = await this.client
        .from('wallet_users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('❌ Get all users error:', error);
      return { success: false, error: error.message };
    }
  }

  // ============================================================================
  // TRANSACTION MANAGEMENT
  // ============================================================================

  /**
   * Save transaction to database
   */
  async saveTransaction(transaction: Partial<Transaction>): Promise<{
    success: boolean;
    data?: Transaction;
    error?: string;
  }> {
    if (!this.client) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      console.log('💾 Saving transaction:', transaction.tx_hash);

      const { data, error } = await this.client
        .from('wallet_transactions')
        .insert(transaction)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Transaction saved:', data.id);
      return { success: true, data };
    } catch (error: any) {
      console.error('❌ Transaction save error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get transactions for a wallet
   */
  async getTransactions(
    walletAddress: string,
    limit: number = 50
  ): Promise<{
    success: boolean;
    data?: Transaction[];
    error?: string;
  }> {
    if (!this.client) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      console.log('📜 Fetching transactions for:', walletAddress);

      const { data, error } = await this.client
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      console.log(`✅ Found ${data?.length || 0} transactions`);
      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('❌ Transactions fetch error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if transaction exists by hash
   */
  async transactionExists(txHash: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      const { data, error } = await this.client
        .from('wallet_transactions')
        .select('id')
        .eq('tx_hash', txHash)
        .single();

      return !error && data !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    txHash: string,
    status: 'pending' | 'confirmed' | 'failed'
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (!this.client) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const { error } = await this.client
        .from('wallet_transactions')
        .update({ status })
        .eq('tx_hash', txHash);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('❌ Transaction status update error:', error);
      return { success: false, error: error.message };
    }
  }

  // ============================================================================
  // REFERRAL SYSTEM
  // ============================================================================

  /**
   * Create referral code for user
   */
  async createReferralCode(
    userId: string,
    walletAddress: string,
    referrerId?: string | null
  ): Promise<{
    success: boolean;
    data?: ReferralData;
    error?: string;
  }> {
    if (!this.client) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      console.log('🎫 Creating referral code for user:', userId);

      // Generate referral code from last 8 characters of wallet address
      const referralCode = walletAddress.slice(-8).toUpperCase();

      const { data, error } = await this.client
        .from('wallet_referrals')
        .upsert(
          {
            user_id: userId,
            referrer_id: referrerId || null,
            referral_code: referralCode,
            total_earned: 0,
            total_referrals: 0,
            rank: 'Core Node',
            level: 1,
            updated_at: new Date().toISOString()
          },
          { 
            onConflict: 'user_id',
            ignoreDuplicates: false 
          }
        )
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Referral code created:', referralCode);
      return { success: true, data };
    } catch (error: any) {
      console.error('❌ Referral creation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get referral data for user
   */
  async getReferralData(userId: string): Promise<{
    success: boolean;
    data?: ReferralData | null;
    error?: string;
  }> {
    if (!this.client) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      console.log('🔍 Fetching referral data for user:', userId);

      const { data, error } = await this.client
        .from('wallet_referrals')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: true, data: null };
        }
        throw error;
      }

      console.log('✅ Referral data found:', data.referral_code);
      return { success: true, data };
    } catch (error: any) {
      console.error('❌ Referral fetch error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Find user by referral code
   */
  async getUserByReferralCode(referralCode: string): Promise<{
    success: boolean;
    data?: ReferralData | null;
    error?: string;
  }> {
    if (!this.client) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const { data, error } = await this.client
        .from('wallet_referrals')
        .select('*')
        .eq('referral_code', referralCode.toUpperCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: true, data: null };
        }
        throw error;
      }

      return { success: true, data };
    } catch (error: any) {
      console.error('❌ Referral code lookup error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get users referred by a referral code
   */
  async getReferredUsers(referralCode: string): Promise<{
    success: boolean;
    data?: UserProfile[];
    error?: string;
  }> {
    if (!this.client) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const { data, error } = await this.client
        .from('wallet_users')
        .select('*')
        .eq('referrer_code', referralCode)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('❌ Referred users fetch error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update referral stats
   */
  async updateReferralStats(
    userId: string,
    totalEarned: number,
    totalReferrals: number
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (!this.client) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const { error } = await this.client
        .from('wallet_referrals')
        .update({
          total_earned: totalEarned,
          total_referrals: totalReferrals,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('❌ Referral stats update error:', error);
      return { success: false, error: error.message };
    }
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  /**
   * Track analytics event
   */
  async trackEvent(
    eventName: string,
    properties: Record<string, any> = {},
    userId?: string | null
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (!this.client) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      console.log('📊 Tracking event:', eventName);

      const { error } = await this.client
        .from('wallet_analytics')
        .insert({
          user_id: userId || null,
          event_name: eventName,
          properties,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      console.log('✅ Event tracked');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Event tracking error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get analytics events
   */
  async getAnalytics(
    eventName?: string,
    limit: number = 100
  ): Promise<{
    success: boolean;
    data?: AnalyticsEvent[];
    error?: string;
  }> {
    if (!this.client) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      let query = this.client
        .from('wallet_analytics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (eventName) {
        query = query.eq('event_name', eventName);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('❌ Analytics fetch error:', error);
      return { success: false, error: error.message };
    }
  }

  // ============================================================================
  // REAL-TIME SUBSCRIPTIONS
  // ============================================================================

  /**
   * Subscribe to transaction updates for a wallet
   */
  subscribeToTransactions(
    walletAddress: string,
    callback: (payload: any) => void
  ) {
    if (!this.client) {
      console.warn('⚠️ Cannot subscribe: Supabase not configured');
      return null;
    }

    console.log('🔔 Subscribing to transactions for:', walletAddress);

    return this.client
      .channel(`transactions:${walletAddress}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallet_transactions',
          filter: `wallet_address=eq.${walletAddress}`
        },
        callback
      )
      .subscribe();
  }

  /**
   * Subscribe to profile updates
   */
  subscribeToProfile(
    walletAddress: string,
    callback: (payload: any) => void
  ) {
    if (!this.client) {
      console.warn('⚠️ Cannot subscribe: Supabase not configured');
      return null;
    }

    console.log('🔔 Subscribing to profile updates for:', walletAddress);

    return this.client
      .channel(`profile:${walletAddress}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallet_users',
          filter: `wallet_address=eq.${walletAddress}`
        },
        callback
      )
      .subscribe();
  }

  /**
   * Unsubscribe from channel
   */
  async unsubscribe(channel: any) {
    if (channel) {
      await channel.unsubscribe();
      console.log('🔕 Unsubscribed from channel');
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Test database connection
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
  }> {
    if (!this.client) {
      return {
        success: false,
        message: 'Supabase client not initialized'
      };
    }

    try {
      const { data, error } = await this.client
        .from('wallet_users')
        .select('count')
        .limit(1);

      if (error) throw error;

      return {
        success: true,
        message: 'Database connection successful'
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`
      };
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    success: boolean;
    data?: {
      totalUsers: number;
      totalTransactions: number;
      totalReferrals: number;
      totalEvents: number;
    };
    error?: string;
  }> {
    if (!this.client) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const [users, transactions, referrals, events] = await Promise.all([
        this.client.from('wallet_users').select('count', { count: 'exact', head: true }),
        this.client.from('wallet_transactions').select('count', { count: 'exact', head: true }),
        this.client.from('wallet_referrals').select('count', { count: 'exact', head: true }),
        this.client.from('wallet_analytics').select('count', { count: 'exact', head: true })
      ]);

      return {
        success: true,
        data: {
          totalUsers: users.count || 0,
          totalTransactions: transactions.count || 0,
          totalReferrals: referrals.count || 0,
          totalEvents: events.count || 0
        }
      };
    } catch (error: any) {
      console.error('❌ Stats fetch error:', error);
      return { success: false, error: error.message };
    }
  }

  // ============================================================================
  // REFERRAL REWARD METHODS
  // ============================================================================

  /**
   * Increment referral count for a user
   */
  async incrementReferralCount(userId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (!this.client) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      console.log('📈 Incrementing referral count for user:', userId);

      // Get current count
      const { data: currentData, error: fetchError } = await this.client
        .from('wallet_referrals')
        .select('total_referrals')
        .eq('user_id', userId)
        .single();

      if (fetchError) throw fetchError;

      // Increment count
      const { error: updateError } = await this.client
        .from('wallet_referrals')
        .update({
          total_referrals: (currentData?.total_referrals || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      console.log('✅ Referral count incremented');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Increment referral count error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Record a referral earning
   */
  async recordReferralEarning(earning: {
    referrer_id: string;
    referred_user_id: string;
    amount: number;
    percentage: number;
    transaction_id?: string | null;
  }): Promise<{
    success: boolean;
    data?: ReferralEarning;
    error?: string;
  }> {
    if (!this.client) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      console.log('💰 Recording referral earning:', earning.amount, 'TON');

      const { data, error } = await this.client
        .from('wallet_referral_earnings')
        .insert({
          ...earning,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Earning recorded:', data.id);
      return { success: true, data };
    } catch (error: any) {
      console.error('❌ Record earning error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get referral earnings for a user
   */
  async getReferralEarnings(
    referrerId: string,
    limit: number = 50
  ): Promise<{
    success: boolean;
    data?: ReferralEarning[];
    error?: string;
  }> {
    if (!this.client) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const { data, error } = await this.client
        .from('wallet_referral_earnings')
        .select('*')
        .eq('referrer_id', referrerId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('❌ Get earnings error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update referral rank based on total referrals
   */
  async updateReferralRank(userId: string): Promise<{
    success: boolean;
    newRank?: string;
    error?: string;
  }> {
    if (!this.client) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      // Get current referral data
      const { data: referralData, error: fetchError } = await this.client
        .from('wallet_referrals')
        .select('total_referrals, rank')
        .eq('user_id', userId)
        .single();

      if (fetchError) throw fetchError;

      const totalReferrals = referralData?.total_referrals || 0;
      let newRank = 'Core Node'; // Bronze
      let newLevel = 1;

      // Determine rank based on referral count
      if (totalReferrals >= 100) {
        newRank = 'Elite Partner'; // Platinum
        newLevel = 4;
      } else if (totalReferrals >= 51) {
        newRank = 'Gold Node'; // Gold
        newLevel = 3;
      } else if (totalReferrals >= 11) {
        newRank = 'Silver Node'; // Silver
        newLevel = 2;
      }

      // Only update if rank changed
      if (newRank !== referralData?.rank) {
        const { error: updateError } = await this.client
          .from('wallet_referrals')
          .update({
            rank: newRank,
            level: newLevel,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        if (updateError) throw updateError;

        console.log(`🎖️ Rank updated to ${newRank} for user:`, userId);
        return { success: true, newRank };
      }

      return { success: true, newRank: referralData?.rank };
    } catch (error: any) {
      console.error('❌ Update rank error:', error);
      return { success: false, error: error.message };
    }
  }

  // ============================================================================
  // REWARD CLAIMING METHODS
  // ============================================================================

  /**
   * Get claimable rewards for a user
   */
  async getClaimableRewards(userId: string): Promise<{
    success: boolean;
    data?: {
      totalEarned: number;
      totalClaimed: number;
      claimable: number;
      lastClaimDate: string | null;
    };
    error?: string;
  }> {
    if (!this.client) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      // Get referral data
      const { data: referralData, error: refError } = await this.client
        .from('wallet_referrals')
        .select('total_earned')
        .eq('user_id', userId)
        .single();

      if (refError) throw refError;

      // Get total claimed from claims table
      const { data: claimsData, error: claimsError } = await this.client
        .from('wallet_reward_claims')
        .select('amount, claimed_at')
        .eq('user_id', userId)
        .order('claimed_at', { ascending: false });

      if (claimsError && claimsError.code !== 'PGRST116') {
        throw claimsError;
      }

      const totalEarned = referralData?.total_earned || 0;
      const totalClaimed = claimsData?.reduce((sum, claim) => sum + Number(claim.amount), 0) || 0;
      const claimable = totalEarned - totalClaimed;
      const lastClaimDate = claimsData && claimsData.length > 0 ? claimsData[0].claimed_at : null;

      return {
        success: true,
        data: {
          totalEarned,
          totalClaimed,
          claimable,
          lastClaimDate
        }
      };
    } catch (error: any) {
      console.error('❌ Get claimable rewards error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a reward claim request
   */
  async createRewardClaim(
    userId: string,
    amount: number,
    walletAddress: string
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    if (!this.client) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      console.log('💰 Creating reward claim:', amount, 'TON');

      const { data, error } = await this.client
        .from('wallet_reward_claims')
        .insert({
          user_id: userId,
          amount,
          wallet_address: walletAddress,
          status: 'pending',
          claimed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Reward claim created:', data.id);
      return { success: true, data };
    } catch (error: any) {
      console.error('❌ Create reward claim error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get claim history for a user
   */
  async getClaimHistory(
    userId: string,
    limit: number = 50
  ): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }> {
    if (!this.client) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const { data, error } = await this.client
        .from('wallet_reward_claims')
        .select('*')
        .eq('user_id', userId)
        .order('claimed_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('❌ Get claim history error:', error);
      return { success: false, error: error.message };
    }
  }

  // ============================================================================
  // RZC TOKEN METHODS
  // ============================================================================

  /**
   * Award RZC tokens to a user
   */
  async awardRZCTokens(
    userId: string,
    amount: number,
    type: string,
    description: string,
    metadata?: any
  ): Promise<{
    success: boolean;
    newBalance?: number;
    error?: string;
  }> {
    if (!this.client) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      console.log(`🪙 Awarding ${amount} RZC to user:`, userId);

      // Call database function
      const { error } = await this.client.rpc('award_rzc_tokens', {
        p_user_id: userId,
        p_amount: amount,
        p_type: type,
        p_description: description,
        p_metadata: metadata || null
      });

      if (error) throw error;

      // Get updated balance
      const { data: userData, error: fetchError } = await this.client
        .from('wallet_users')
        .select('rzc_balance')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      console.log(`✅ RZC awarded. New balance: ${userData.rzc_balance}`);

      return {
        success: true,
        newBalance: userData.rzc_balance
      };
    } catch (error: any) {
      console.error('❌ Award RZC error:', error);
      const errorMessage = error?.message || error?.error_description || error?.hint || JSON.stringify(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get user's RZC balance
   */
  async getRZCBalance(userId: string): Promise<{
    success: boolean;
    balance?: number;
    error?: string;
  }> {
    if (!this.client) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const { data, error } = await this.client
        .from('wallet_users')
        .select('rzc_balance')
        .eq('id', userId)
        .single();

      if (error) throw error;

      return {
        success: true,
        balance: data.rzc_balance
      };
    } catch (error: any) {
      console.error('❌ Get RZC balance error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get RZC transaction history
   */
  async getRZCTransactions(
    userId: string,
    limit: number = 50
  ): Promise<{
    success: boolean;
    data?: RZCTransaction[];
    error?: string;
  }> {
    if (!this.client) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const { data, error } = await this.client
        .from('wallet_rzc_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('❌ Get RZC transactions error:', error);
      return { success: false, error: error.message };
    }
  }

  // ============================================================================
  // UPLINE/DOWNLINE METHODS
  // ============================================================================

  /**
   * Get upline (who referred this user)
   */
  async getUpline(userId: string): Promise<{
    success: boolean;
    data?: UserProfile | null;
    error?: string;
  }> {
    if (!this.client) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      console.log('🔍 Fetching upline for user:', userId);

      // Get user's referral data to find referrer_id
      const { data: referralData, error: refError } = await this.client
        .from('wallet_referrals')
        .select('referrer_id')
        .eq('user_id', userId)
        .single();

      if (refError) {
        if (refError.code === 'PGRST116') {
          return { success: true, data: null };
        }
        throw refError;
      }

      // If no referrer, return null
      if (!referralData?.referrer_id) {
        console.log('ℹ️ User has no upline');
        return { success: true, data: null };
      }

      // Get referrer's profile
      const { data: uplineProfile, error: profileError } = await this.client
        .from('wallet_users')
        .select('*')
        .eq('id', referralData.referrer_id)
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          return { success: true, data: null };
        }
        throw profileError;
      }

      console.log('✅ Upline found:', uplineProfile.name);
      return { success: true, data: uplineProfile };
    } catch (error: any) {
      console.error('❌ Get upline error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get downline (users referred by this user) with their stats
   */
  async getDownline(userId: string): Promise<{
      success: boolean;
      data?: Array<UserProfile & { total_referrals?: number; rzc_earned?: number }>;
      error?: string;
    }> {
      if (!this.client) {
        return { success: false, error: 'Supabase not configured' };
      }

      try {
        console.log('🔍 Fetching downline for user:', userId);

        // Get all referral records where this user is the referrer
        const { data: referralData, error: refError } = await this.client
          .from('wallet_referrals')
          .select('user_id, total_referrals, created_at')
          .eq('referrer_id', userId)
          .order('created_at', { ascending: false });

        if (refError) throw refError;

        if (!referralData || referralData.length === 0) {
          console.log('ℹ️ No downline members found');
          return { success: true, data: [] };
        }

        console.log(`📊 Found ${referralData.length} referral records`);

        // Get user details for each downline member
        const userIds = referralData.map(r => r.user_id);
        const { data: userData, error: userError } = await this.client
          .from('wallet_users')
          .select('*')
          .in('id', userIds);

        if (userError) throw userError;

        console.log(`📊 Found ${userData?.length || 0} user records`);

        // Combine the data
        const transformedData = referralData.map((ref: any) => {
          const user = userData?.find((u: any) => u.id === ref.user_id);
          if (!user) {
            console.warn(`⚠️ User not found for referral record:`, ref.user_id);
            return null;
          }
          return {
            ...user,
            total_referrals: ref.total_referrals,
            rzc_earned: (user?.rzc_balance || 0) - 100 // Subtract signup bonus
          };
        }).filter(item => item !== null); // Remove any null entries

        console.log(`✅ Found ${transformedData.length} downline members`);
        return { success: true, data: transformedData };
      } catch (error: any) {
        console.error('❌ Get downline error:', error);
        return { success: false, error: error.message };
      }
    }


  // ============================================================================
  // NEWSLETTER SUBSCRIPTION METHODS
  // ============================================================================

  /**
   * Subscribe email to newsletter
   */
  async subscribeToNewsletter(
    email: string,
    metadata?: {
      source?: string;
      ipAddress?: string;
      userAgent?: string;
      [key: string]: any;
    }
  ): Promise<{
    success: boolean;
    message: string;
    data?: any;
    error?: string;
  }> {
    if (!this.client) {
      return { 
        success: false, 
        message: 'Database not configured',
        error: 'Supabase not configured' 
      };
    }

    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return {
          success: false,
          message: 'Invalid email format',
          error: 'Invalid email format'
        };
      }

      console.log('📧 Subscribing to newsletter:', email);

      // Check if email already exists
      const { data: existing, error: checkError } = await this.client
        .from('wallet_newsletter_subscriptions')
        .select('id, status')
        .eq('email', email)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      // If already subscribed and active
      if (existing && existing.status === 'active') {
        return {
          success: true,
          message: 'You are already subscribed to our newsletter!',
          data: existing
        };
      }

      // If previously unsubscribed, reactivate
      if (existing && existing.status === 'unsubscribed') {
        const { data: updated, error: updateError } = await this.client
          .from('wallet_newsletter_subscriptions')
          .update({
            status: 'active',
            subscribed_at: new Date().toISOString(),
            unsubscribed_at: null,
            metadata: metadata || {}
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (updateError) throw updateError;

        console.log('✅ Newsletter subscription reactivated');
        return {
          success: true,
          message: 'Welcome back! You have been resubscribed to our newsletter.',
          data: updated
        };
      }

      // New subscription
      const { data, error } = await this.client
        .from('wallet_newsletter_subscriptions')
        .insert({
          email: email.toLowerCase().trim(),
          status: 'active',
          source: metadata?.source || 'landing_page',
          ip_address: metadata?.ipAddress || null,
          user_agent: metadata?.userAgent || null,
          metadata: metadata || {}
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Newsletter subscription created:', data.id);
      return {
        success: true,
        message: 'Thank you for subscribing! Check your inbox for updates.',
        data
      };

    } catch (error: any) {
      console.error('❌ Newsletter subscription failed:', error);
      return {
        success: false,
        message: 'Failed to subscribe. Please try again.',
        error: error.message
      };
    }
  }

  /**
   * Get newsletter subscription count (admin only)
   */
  async getNewsletterStats(): Promise<{
    success: boolean;
    data?: {
      total: number;
      active: number;
      unsubscribed: number;
    };
    error?: string;
  }> {
    if (!this.client) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const { data, error } = await this.client
        .from('wallet_newsletter_subscriptions')
        .select('status');

      if (error) throw error;

      const stats = {
        total: data.length,
        active: data.filter(s => s.status === 'active').length,
        unsubscribed: data.filter(s => s.status === 'unsubscribed').length
      };

      return { success: true, data: stats };
    } catch (error: any) {
      console.error('❌ Failed to get newsletter stats:', error);
      return { success: false, error: error.message };
    }
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const supabaseService = new SupabaseService();
