/**
 * Launchpad Service
 * Handles all launchpad-related operations including projects and presale transactions
 */

import { supabaseService } from './supabaseService';

// Get supabase client from supabaseService
const supabase = supabaseService.getClient();

// ── Types ──────────────────────────────────────────────────────────────────

export interface LaunchpadProject {
  id: string;
  name: string;
  symbol: string;
  tagline: string;
  description: string;
  logo_url: string;
  status: 'live' | 'upcoming' | 'ended' | 'success';
  
  // Financial
  total_supply: number;
  presale_allocation: number;
  presale_rate: number;
  listing_rate: number;
  soft_cap: number;
  hard_cap: number;
  raised_amount: number;
  min_purchase: number;
  max_purchase: number;
  
  // Timing
  presale_start: string;
  presale_end: string;
  listing_date: string | null;
  
  // Verification
  kyc_verified: boolean;
  audit_verified: boolean;
  safu_verified: boolean;
  doxxed: boolean;
  
  // Social
  website_url: string | null;
  twitter_url: string | null;
  telegram_url: string | null;
  discord_url: string | null;
  etherscan_url: string | null;
  
  // Contracts
  presale_contract_address: string | null;
  token_contract_address: string | null;
  
  // Distribution
  distribution_presale: number;
  distribution_liquidity: number;
  distribution_team: number;
  distribution_marketing: number;
  distribution_reserve: number;
  
  // Vesting
  tge_unlock_percent: number;
  vesting_months: number;
  monthly_unlock_percent: number;
  
  // Liquidity
  liquidity_lock_days: number;
  liquidity_percent: number;
  
  // Metadata
  featured: boolean;
  trending: boolean;
  participant_count: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface PresaleTransaction {
  id: string;
  project_id: string;
  user_id: string | null;
  user_address: string;
  amount_usdc: number;
  tokens_received: number;
  tx_hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  block_number: number | null;
  gas_used: number | null;
  gas_price: number | null;
  created_at: string;
  confirmed_at: string | null;
  failed_at: string | null;
  error_message: string | null;
}

export interface ProjectProgress {
  progress_percent: number;
  time_remaining: string;
  is_active: boolean;
  can_purchase: boolean;
}

export interface ProjectStats {
  total_projects: number;
  live_projects: number;
  total_raised: number;
  total_participants: number;
}

// ── Service Class ──────────────────────────────────────────────────────────

class LaunchpadService {
  /**
   * Get all projects with optional filtering
   */
  async getProjects(filters?: {
    status?: 'live' | 'upcoming' | 'ended' | 'success' | 'all';
    featured?: boolean;
    trending?: boolean;
    search?: string;
  }) {
    try {
      let query = supabase
        .from('launchpad_projects')
        .select('*');

      // Apply filters
      if (filters?.status && filters.status !== 'all') {
        if (filters.status === 'ended') {
          query = query.in('status', ['ended', 'success']);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      if (filters?.featured !== undefined) {
        query = query.eq('featured', filters.featured);
      }

      if (filters?.trending !== undefined) {
        query = query.eq('trending', filters.trending);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,symbol.ilike.%${filters.search}%`);
      }

      // Order by status priority, then by presale_start
      query = query.order('status', { ascending: true })
                   .order('presale_start', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching projects:', error);
        return { success: false, error: error.message, data: null };
      }

      return { success: true, data: data as LaunchpadProject[], error: null };
    } catch (error: any) {
      console.error('Exception in getProjects:', error);
      return { success: false, error: error.message, data: null };
    }
  }

  /**
   * Get a single project by ID
   */
  async getProject(projectId: string) {
    try {
      const { data, error } = await supabase
        .from('launchpad_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) {
        console.error('Error fetching project:', error);
        return { success: false, error: error.message, data: null };
      }

      return { success: true, data: data as LaunchpadProject, error: null };
    } catch (error: any) {
      console.error('Exception in getProject:', error);
      return { success: false, error: error.message, data: null };
    }
  }

  /**
   * Get project progress and status
   */
  async getProjectProgress(projectId: string) {
    try {
      const { data, error } = await supabase
        .rpc('get_project_progress', { project_uuid: projectId });

      if (error) {
        console.error('Error fetching project progress:', error);
        return { success: false, error: error.message, data: null };
      }

      return { success: true, data: data[0] as ProjectProgress, error: null };
    } catch (error: any) {
      console.error('Exception in getProjectProgress:', error);
      return { success: false, error: error.message, data: null };
    }
  }

  /**
   * Get overall launchpad statistics
   */
  async getStats(): Promise<{ success: boolean; data: ProjectStats | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('launchpad_projects')
        .select('status, raised_amount, participant_count');

      if (error) {
        console.error('Error fetching stats:', error);
        return { success: false, error: error.message, data: null };
      }

      const stats: ProjectStats = {
        total_projects: data.length,
        live_projects: data.filter(p => p.status === 'live').length,
        total_raised: data.reduce((sum, p) => sum + (Number(p.raised_amount) || 0), 0),
        total_participants: data.reduce((sum, p) => sum + (Number(p.participant_count) || 0), 0),
      };

      return { success: true, data: stats, error: null };
    } catch (error: any) {
      console.error('Exception in getStats:', error);
      return { success: false, error: error.message, data: null };
    }
  }

  /**
   * Create a presale transaction (record intent)
   * Supports both USDC (EVM) and TON payments
   */
  async createTransaction(params: {
    projectId: string;
    userAddress: string;
    amountUsdc: number;
    tokensReceived: number;
    txHash: string;
    paymentMethod?: 'usdc' | 'ton'; // Payment method
    amountTon?: number; // TON amount if paying with TON
  }) {
    try {
      // Get user profile to link transaction (FIXED: Uses wallet_users)
      const { data: profile } = await supabase
        .from('wallet_users')
        .select('id')
        .eq('wallet_address', params.userAddress)
        .single();

      const { data, error } = await supabase
        .from('presale_transactions')
        .insert({
          project_id: params.projectId,
          user_id: profile?.id || null,
          user_address: params.userAddress,
          amount_usdc: params.amountUsdc,
          tokens_received: params.tokensReceived,
          tx_hash: params.txHash,
          status: 'pending',
          payment_method: params.paymentMethod || 'usdc',
          amount_ton: params.amountTon || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating transaction:', error);
        return { success: false, error: error.message, data: null };
      }

      return { success: true, data: data as PresaleTransaction, error: null };
    } catch (error: any) {
      console.error('Exception in createTransaction:', error);
      return { success: false, error: error.message, data: null };
    }
  }

  /**
   * Update transaction status (typically called by backend after blockchain confirmation)
   */
  async updateTransactionStatus(params: {
    txHash: string;
    status: 'confirmed' | 'failed';
    blockNumber?: number;
    gasUsed?: number;
    gasPrice?: number;
    errorMessage?: string;
  }) {
    try {
      const updateData: any = {
        status: params.status,
        block_number: params.blockNumber || null,
        gas_used: params.gasUsed || null,
        gas_price: params.gasPrice || null,
        error_message: params.errorMessage || null,
      };

      if (params.status === 'confirmed') {
        updateData.confirmed_at = new Date().toISOString();
      } else if (params.status === 'failed') {
        updateData.failed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('presale_transactions')
        .update(updateData)
        .eq('tx_hash', params.txHash)
        .select()
        .single();

      if (error) {
        console.error('Error updating transaction:', error);
        return { success: false, error: error.message, data: null };
      }

      return { success: true, data: data as PresaleTransaction, error: null };
    } catch (error: any) {
      console.error('Exception in updateTransactionStatus:', error);
      return { success: false, error: error.message, data: null };
    }
  }

  /**
   * Get user's transactions for a specific project
   */
  async getUserTransactions(userAddress: string, projectId?: string) {
    try {
      let query = supabase
        .from('presale_transactions')
        .select('*')
        .eq('user_address', userAddress);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching user transactions:', error);
        return { success: false, error: error.message, data: null };
      }

      return { success: true, data: data as PresaleTransaction[], error: null };
    } catch (error: any) {
      console.error('Exception in getUserTransactions:', error);
      return { success: false, error: error.message, data: null };
    }
  }

  /**
   * Get recent contributions for a project (for social proof)
   */
  async getRecentContributions(projectId: string, limit: number = 10) {
    try {
      const { data, error } = await supabase
        .from('presale_transactions')
        .select('user_address, amount_usdc, created_at')
        .eq('project_id', projectId)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching recent contributions:', error);
        return { success: false, error: error.message, data: null };
      }

      return { success: true, data, error: null };
    } catch (error: any) {
      console.error('Exception in getRecentContributions:', error);
      return { success: false, error: error.message, data: null };
    }
  }

  /**
   * Process TON payment for presale
   * Handles the complete flow: validation → transaction → database update
   */
  async processTonPayment(params: {
    projectId: string;
    userAddress: string;
    amountTon: number;
    tonUsdPrice: number; // Current TON/USD price
    walletService: any; // tonWalletService or tetherWdkService
    presaleWalletAddress: string; // Project's receiving wallet
  }): Promise<{ success: boolean; txHash?: string; tokensReceived?: number; error?: string }> {
    try {
      // 1. Get project details
      const projectResult = await this.getProject(params.projectId);
      if (!projectResult.success || !projectResult.data) {
        return { success: false, error: 'Project not found' };
      }

      const project = projectResult.data;

      // 2. Calculate USDC equivalent
      const usdcEquivalent = params.amountTon * params.tonUsdPrice;

      // 3. Validate purchase
      const canPurchase = await this.canUserPurchase({
        projectId: params.projectId,
        userAddress: params.userAddress,
        amount: usdcEquivalent,
      });

      if (!canPurchase.success || !canPurchase.canPurchase) {
        return { success: false, error: canPurchase.reason || 'Purchase validation failed' };
      }

      // 4. Calculate tokens to receive
      const tokensReceived = usdcEquivalent * project.presale_rate;

      // 5. Send TON transaction
      console.log(`[Launchpad] Sending ${params.amountTon} TON to ${params.presaleWalletAddress}`);
      
      const txResult = await params.walletService.sendTransaction(
        params.presaleWalletAddress,
        params.amountTon.toString(),
        `Presale: ${project.symbol} - ${tokensReceived.toFixed(2)} tokens`
      );

      if (!txResult.success || !txResult.txHash) {
        return { success: false, error: txResult.error || 'Transaction failed' };
      }

      // 6. Record transaction in database
      const dbResult = await this.createTransaction({
        projectId: params.projectId,
        userAddress: params.userAddress,
        amountUsdc: usdcEquivalent,
        tokensReceived,
        txHash: txResult.txHash,
        paymentMethod: 'ton',
        amountTon: params.amountTon,
      });

      if (!dbResult.success) {
        console.warn('[Launchpad] Transaction sent but DB record failed:', dbResult.error);
        // Transaction was sent, so we still return success
      }

      // 7. Update project stats (raised_amount, participant_count)
      await this.updateProjectStats(params.projectId, usdcEquivalent, params.userAddress);

      return {
        success: true,
        txHash: txResult.txHash,
        tokensReceived,
      };
    } catch (error: any) {
      console.error('[Launchpad] TON payment processing failed:', error);
      return { success: false, error: error.message || 'Payment processing failed' };
    }
  }

  /**
   * Update project statistics after a successful purchase
   */
  private async updateProjectStats(projectId: string, amountUsdc: number, userAddress: string) {
    try {
      // Get current project data
      const { data: project } = await supabase
        .from('launchpad_projects')
        .select('raised_amount, participant_count')
        .eq('id', projectId)
        .single();

      if (!project) return;

      // Check if this is a new participant
      const { data: existingTxs } = await supabase
        .from('presale_transactions')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_address', userAddress)
        .eq('status', 'confirmed')
        .limit(1);

      const isNewParticipant = !existingTxs || existingTxs.length === 0;

      // Update project
      await supabase
        .from('launchpad_projects')
        .update({
          raised_amount: project.raised_amount + amountUsdc,
          participant_count: project.participant_count + (isNewParticipant ? 1 : 0),
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId);

      console.log(`[Launchpad] Updated project stats: +${amountUsdc} USDC, ${isNewParticipant ? '+1 participant' : 'existing participant'}`);
    } catch (error) {
      console.error('[Launchpad] Failed to update project stats:', error);
    }
  }

  /**
   * Get current TON/USD price from exchange
   * Uses multiple sources for reliability
   */
  async getTonUsdPrice(): Promise<{ success: boolean; price?: number; error?: string }> {
    try {
      // Try CoinGecko first
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd');
      
      if (!response.ok) {
        throw new Error('Failed to fetch TON price');
      }

      const data = await response.json();
      const price = data['the-open-network']?.usd;

      if (!price) {
        throw new Error('Invalid price data');
      }

      console.log(`[Launchpad] Current TON/USD price: $${price}`);
      return { success: true, price };
    } catch (error: any) {
      console.error('[Launchpad] Failed to fetch TON price:', error);
      
      // Fallback: use a cached/default price (should be updated regularly)
      const fallbackPrice = 5.50; // Update this regularly or use a cached value
      console.warn(`[Launchpad] Using fallback TON price: $${fallbackPrice}`);
      
      return { success: true, price: fallbackPrice };
    }
  }

  /**
   * Check if user can purchase (validation)
   */
  async canUserPurchase(params: {
    projectId: string;
    userAddress: string;
    amount: number;
  }): Promise<{ success: boolean; canPurchase: boolean; reason?: string }> {
    try {
      // Get project details
      const projectResult = await this.getProject(params.projectId);
      if (!projectResult.success || !projectResult.data) {
        return { success: false, canPurchase: false, reason: 'Project not found' };
      }

      const project = projectResult.data;

      // Check if presale is active
      if (project.status !== 'live') {
        return { success: true, canPurchase: false, reason: 'Presale is not active' };
      }

      // Check if presale has ended
      const now = new Date();
      const presaleEnd = new Date(project.presale_end);
      if (now > presaleEnd) {
        return { success: true, canPurchase: false, reason: 'Presale has ended' };
      }

      // Check if hard cap reached
      if (project.raised_amount >= project.hard_cap) {
        return { success: true, canPurchase: false, reason: 'Hard cap reached' };
      }

      // Check min/max purchase limits
      if (params.amount < project.min_purchase) {
        return { success: true, canPurchase: false, reason: `Minimum purchase is ${project.min_purchase} USDC` };
      }

      if (params.amount > project.max_purchase) {
        return { success: true, canPurchase: false, reason: `Maximum purchase is ${project.max_purchase} USDC` };
      }

      // Check if purchase would exceed hard cap
      if (project.raised_amount + params.amount > project.hard_cap) {
        const remaining = project.hard_cap - project.raised_amount;
        return { success: true, canPurchase: false, reason: `Only ${remaining.toFixed(2)} USDC remaining` };
      }

      return { success: true, canPurchase: true };
    } catch (error: any) {
      console.error('Exception in canUserPurchase:', error);
      return { success: false, canPurchase: false, reason: error.message };
    }
  }

  /**
   * Subscribe to real-time project updates
   */
  subscribeToProject(projectId: string, callback: (project: LaunchpadProject) => void) {
    const subscription = supabase
      .channel(`project:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'launchpad_projects',
          filter: `id=eq.${projectId}`,
        },
        (payload) => {
          callback(payload.new as LaunchpadProject);
        }
      )
      .subscribe();

    return subscription;
  }

  /**
   * Subscribe to real-time transaction updates for a user
   */
  subscribeToUserTransactions(userAddress: string, callback: (transaction: PresaleTransaction) => void) {
    const subscription = supabase
      .channel(`transactions:${userAddress}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'presale_transactions',
          filter: `user_address=eq.${userAddress}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            callback(payload.new as PresaleTransaction);
          }
        }
      )
      .subscribe();

    return subscription;
  }

  /**
   * Admin: Create a new project
   */
  async createProject(project: Partial<LaunchpadProject>) {
    try {
      const { data, error } = await supabase
        .from('launchpad_projects')
        .insert(project)
        .select()
        .single();

      if (error) {
        console.error('Error creating project:', error);
        return { success: false, error: error.message, data: null };
      }

      return { success: true, data: data as LaunchpadProject, error: null };
    } catch (error: any) {
      console.error('Exception in createProject:', error);
      return { success: false, error: error.message, data: null };
    }
  }

  /**
   * Admin: Update a project
   */
  async updateProject(projectId: string, updates: Partial<LaunchpadProject>) {
    try {
      const { data, error } = await supabase
        .from('launchpad_projects')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', projectId)
        .select()
        .single();

      if (error) {
        console.error('Error updating project:', error);
        return { success: false, error: error.message, data: null };
      }

      return { success: true, data: data as LaunchpadProject, error: null };
    } catch (error: any) {
      console.error('Exception in updateProject:', error);
      return { success: false, error: error.message, data: null };
    }
  }

  /**
   * Admin: Delete a project
   */
  async deleteProject(projectId: string) {
    try {
      const { error } = await supabase
        .from('launchpad_projects')
        .delete()
        .eq('id', projectId);

      if (error) {
        console.error('Error deleting project:', error);
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error: any) {
      console.error('Exception in deleteProject:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const launchpadService = new LaunchpadService();
