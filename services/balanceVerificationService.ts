// ═══════════════════════════════════════════════════════════════════════════════
// 🔐 BALANCE VERIFICATION SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

import { supabaseService } from './supabaseService';

export interface BalanceVerificationRequest {
  id: string;
  user_id: string;
  wallet_address: string;
  telegram_username: string;
  old_wallet_address: string;
  claimed_balance: number;
  current_balance: number;
  discrepancy_amount: number;
  screenshot_url?: string;
  additional_notes?: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'resolved';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  reviewed_by?: string;
  reviewed_at?: string;
  admin_notes?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
  user_info?: {
    username: string;
    display_name: string;
    created_at: string;
  };
}

export interface SubmitVerificationRequestData {
  telegram_username: string;
  old_wallet_address: string;
  claimed_balance: number;
  screenshot_url?: string;
  additional_notes?: string;
  // Balance evidence fields
  available_balance_before_migration?: number;
  claimable_balance_before_migration?: number;
  available_balance_screenshot_url?: string;
  claimable_balance_screenshot_url?: string;
  current_balance_screenshot_url?: string;
}

class BalanceVerificationService {
  
  // ─── User Functions ─────────────────────────────────────────────────────────────
  
  /**
   * Submit a new balance verification request
   */
  async submitVerificationRequest(data: SubmitVerificationRequestData) {
    try {
      console.log('🔐 Submitting balance verification request:', data);
      
      const client = supabaseService.getClient();
      if (!client) {
        return { success: false, error: 'Supabase not configured' };
      }

      // Get current wallet address from the wallet context
      // Since we don't have direct access to the context here, we'll need to pass it
      // For now, let's try the RPC first and fallback to direct insertion if auth fails
      
      try {
        const { data: result, error } = await client.rpc(
          'submit_balance_verification_request',
          {
            p_telegram_username: data.telegram_username,
            p_old_wallet_address: data.old_wallet_address,
            p_claimed_balance: data.claimed_balance,
            p_screenshot_url: data.screenshot_url || null,
            p_additional_notes: data.additional_notes || null
          }
        );

        if (error) {
          console.warn('⚠️ RPC function failed, trying direct approach:', error.message);
          throw new Error('RPC_FAILED');
        }

        if (!result.success) {
          console.error('❌ Verification request failed:', result.error);
          return { success: false, error: result.error };
        }

        console.log('✅ Verification request submitted via RPC:', result);
        return { 
          success: true, 
          request_id: result.request_id,
          message: result.message 
        };
      } catch (rpcError: any) {
        // If RPC fails due to authentication, try direct database insertion
        console.log('🔄 RPC failed, attempting direct database insertion...');
        return await this.submitVerificationRequestDirect(data);
      }

    } catch (error: any) {
      console.error('❌ Submit verification request error:', error);
      return { success: false, error: error.message };
    }
  }

  private async submitVerificationRequestDirect(data: SubmitVerificationRequestData) {
    try {
      const client = supabaseService.getClient();
      if (!client) {
        return { success: false, error: 'Supabase not configured' };
      }

      // We need to get the current wallet address from somewhere
      // Since we can't access the wallet context directly, we'll modify the interface
      // to require the current wallet address
      
      return { 
        success: false, 
        error: 'Direct submission not implemented yet. Please contact support.' 
      };

    } catch (error: any) {
      console.error('❌ Direct submission error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Submit verification request using current wallet context
   * This is the main method that should be used from components
   */
  async submitVerificationRequestFromWallet(
    walletAddress: string,
    currentRZCBalance: number,
    data: SubmitVerificationRequestData
  ) {
    try {
      console.log('🔐 Submitting wallet RZC verification request:', {
        walletAddress,
        currentRZCBalance,
        claimedBalance: data.claimed_balance
      });
      
      const client = supabaseService.getClient();
      if (!client) {
        return { success: false, error: 'Supabase not configured' };
      }

      // Calculate discrepancy
      const discrepancy = data.claimed_balance - currentRZCBalance;
      const discrepancyAmount = Math.abs(discrepancy);
      
      // Determine priority based on discrepancy
      let priority = 'normal';
      if (discrepancyAmount > 10000) priority = 'urgent';
      else if (discrepancyAmount > 1000) priority = 'high';
      else if (discrepancyAmount < 100) priority = 'low';

      console.log(`📊 Verification Details:
        • Current RZC Balance: ${currentRZCBalance.toLocaleString()}
        • Claimed Balance: ${data.claimed_balance.toLocaleString()}
        • Discrepancy: ${discrepancy > 0 ? '+' : ''}${discrepancy.toLocaleString()} RZC
        • Priority: ${priority.toUpperCase()}`);

      // Try the RPC function first
      try {
        const { data: result, error } = await client.rpc(
          'submit_balance_verification_request',
          {
            p_telegram_username: data.telegram_username,
            p_old_wallet_address: data.old_wallet_address,
            p_claimed_balance: data.claimed_balance,
            p_screenshot_url: data.screenshot_url || null,
            p_additional_notes: data.additional_notes || null
          }
        );

        if (error) {
          console.warn('⚠️ RPC function failed:', error.message);
          throw new Error('RPC_FAILED: ' + error.message);
        }

        if (!result || !result.success) {
          console.error('❌ RPC result failed:', result?.error || 'Unknown error');
          throw new Error('RPC_RESULT_FAILED: ' + (result?.error || 'Unknown error'));
        }

        console.log('✅ Wallet RZC verification request submitted successfully');
        return { 
          success: true, 
          request_id: result.request_id,
          message: result.message,
          priority: result.priority,
          discrepancy_amount: result.discrepancy_amount,
          current_balance: currentRZCBalance,
          claimed_balance: data.claimed_balance
        };

      } catch (rpcError: any) {
        console.log('🔄 RPC failed, providing manual submission instructions...');
        
        // Provide detailed manual submission instructions
        const instructions = `
🔐 RZC Balance Verification Request

Your verification request couldn't be submitted automatically. Please contact our support team with the following details:

📧 Email: support@rhiza.com
💬 Telegram: @RhizaSupport

📋 Request Information:
• Wallet Address: ${walletAddress}
• Telegram Username: ${data.telegram_username}
• Old Wallet Address: ${data.old_wallet_address}
• Current RZC Balance: ${currentRZCBalance.toLocaleString()} RZC
• Claimed Balance: ${data.claimed_balance.toLocaleString()} RZC
• Discrepancy: ${discrepancy > 0 ? '+' : ''}${discrepancy.toLocaleString()} RZC
• Priority Level: ${priority.toUpperCase()}

${data.additional_notes ? `• Additional Notes: ${data.additional_notes}` : ''}

⏱️ Expected Response Time:
• Urgent (>10K RZC): 2-6 hours
• High (>1K RZC): 12-24 hours  
• Normal: 24-48 hours
• Low (<100 RZC): 48-72 hours

📸 If you have a screenshot, please attach it to your support message.
        `.trim();
        
        return { 
          success: false, 
          error: instructions,
          isManualSubmissionRequired: true,
          verificationDetails: {
            wallet_address: walletAddress,
            current_balance: currentRZCBalance,
            claimed_balance: data.claimed_balance,
            discrepancy: discrepancy,
            discrepancy_amount: discrepancyAmount,
            priority: priority
          }
        };
      }

    } catch (error: any) {
      console.error('❌ Submit wallet verification request error:', error);
      return { success: false, error: error.message };
    }
  }

  // New method that accepts wallet address directly (no Supabase Auth required)
  async submitVerificationRequestWithWallet(
    walletAddress: string, 
    data: SubmitVerificationRequestData
  ) {
    try {
      console.log('🔐 Submitting balance verification request for wallet:', walletAddress);
      
      const client = supabaseService.getClient();
      if (!client) {
        return { success: false, error: 'Supabase not configured' };
      }

      // Use the wallet-address-based RPC (no JWT required, SECURITY DEFINER)
      const { data: result, error } = await client.rpc(
        'submit_balance_verification_request_by_wallet',
        {
          p_wallet_address: walletAddress,
          p_telegram_username: data.telegram_username,
          p_old_wallet_address: data.old_wallet_address,
          p_claimed_balance: data.claimed_balance,
          p_screenshot_url: data.screenshot_url || null,
          p_additional_notes: data.additional_notes || null,
          p_available_balance_before_migration: data.available_balance_before_migration ?? null,
          p_claimable_balance_before_migration: data.claimable_balance_before_migration ?? null,
          p_available_balance_screenshot_url: data.available_balance_screenshot_url || null,
          p_claimable_balance_screenshot_url: data.claimable_balance_screenshot_url || null,
          p_current_balance_screenshot_url: data.current_balance_screenshot_url || null,
        }
      );

      if (error) {
        console.error('❌ RPC error:', error.message);
        return { success: false, error: error.message };
      }

      if (!result || !result.success) {
        console.error('❌ Submission failed:', result?.error);
        return { success: false, error: result?.error || 'Failed to submit verification request' };
      }

      console.log('✅ Verification request submitted:', result);
      return {
        success: true,
        request_id: result.request_id,
        message: result.message,
        priority: result.priority,
        discrepancy_amount: result.discrepancy_amount,
        final_status: 'pending'
      };

    } catch (error: any) {
      console.error('❌ Submit verification request with wallet error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current user's verification request status (wallet-based, no JWT required)
   */
  async getUserVerificationStatus(walletAddress?: string) {
    try {
      const client = supabaseService.getClient();
      if (!client) {
        return { success: false, error: 'Supabase not configured' };
      }

      if (walletAddress) {
        // Use wallet-based RPC (no auth required)
        const { data: result, error } = await client.rpc(
          'get_user_verification_status_by_wallet',
          { p_wallet_address: walletAddress }
        );

        if (error) {
          console.error('❌ Error getting verification status:', error);
          return { success: false, error: error.message };
        }

        return {
          success: true,
          has_request: result?.has_request ?? false,
          request: result?.request ?? null
        };
      }

      // Fallback: original JWT-based RPC
      const { data: result, error } = await client.rpc('get_user_verification_status');
      if (error) return { success: false, error: error.message };
      return {
        success: true,
        has_request: result?.has_request ?? false,
        request: result?.request ?? null
      };

    } catch (error: any) {
      console.error('❌ Get verification status error:', error);
      return { success: false, error: error.message };
    }
  }

  // ─── Admin Functions ────────────────────────────────────────────────────────────
  
  /**
   * Get all verification requests (admin only, wallet-based auth)
   */
  async getAllVerificationRequests(
    adminWalletAddress?: string,
    status?: string,
    limit: number = 50,
    offset: number = 0
  ) {
    try {
      const client = supabaseService.getClient();
      if (!client) {
        return { success: false, error: 'Supabase not configured' };
      }

      if (adminWalletAddress) {
        // Wallet-based admin RPC (no JWT required)
        const { data: result, error } = await client.rpc(
          'get_all_verification_requests_by_wallet',
          {
            p_admin_wallet: adminWalletAddress,
            p_status: status || null,
            p_limit: limit,
            p_offset: offset
          }
        );

        if (error) {
          console.error('❌ Error getting verification requests:', error);
          return { success: false, error: error.message };
        }

        if (!result?.success) {
          return { success: false, error: result?.error || 'Failed to load requests' };
        }

        return {
          success: true,
          requests: result.requests as BalanceVerificationRequest[],
          total_count: result.total_count,
          limit: result.limit,
          offset: result.offset
        };
      }

      // Fallback: original JWT-based RPC
      const { data: result, error } = await client.rpc(
        'get_all_verification_requests',
        { p_status: status || null, p_limit: limit, p_offset: offset }
      );

      if (error) return { success: false, error: error.message };
      if (!result?.success) return { success: false, error: result?.error };

      return {
        success: true,
        requests: result.requests as BalanceVerificationRequest[],
        total_count: result.total_count,
        limit: result.limit,
        offset: result.offset
      };

    } catch (error: any) {
      console.error('❌ Get verification requests error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update verification request status (admin only, wallet-based auth)
   */
  async updateVerificationRequest(
    requestId: string,
    status: string,
    adminNotes?: string,
    resolutionNotes?: string,
    adminWalletAddress?: string
  ) {
    try {
      const client = supabaseService.getClient();
      if (!client) {
        return { success: false, error: 'Supabase not configured' };
      }

      if (adminWalletAddress) {
        // Wallet-based admin RPC (no JWT required)
        const { data: result, error } = await client.rpc(
          'admin_update_verification_request_by_wallet',
          {
            p_admin_wallet: adminWalletAddress,
            p_request_id: requestId,
            p_status: status,
            p_admin_notes: adminNotes || null,
            p_resolution_notes: resolutionNotes || null
          }
        );

        if (error) {
          console.error('❌ Error updating verification request:', error);
          return { success: false, error: error.message };
        }

        if (!result?.success) {
          return { success: false, error: result?.error || 'Failed to update request' };
        }

        return {
          success: true,
          message: result.message,
          credited_amount: result.credited_amount || 0,
          transaction_id: result.transaction_id,
          badge_id: result.badge_id,
          balance_unlocked: result.balance_unlocked || false,
          verification_badge_awarded: result.verification_badge_awarded || false,
          final_status: result.status
        };
      }

      // Fallback: original JWT-based RPC
      const { data: result, error } = await client.rpc(
        'admin_update_verification_request_with_unlock',
        {
          p_request_id: requestId,
          p_status: status,
          p_admin_notes: adminNotes || null,
          p_resolution_notes: resolutionNotes || null
        }
      );

      if (error) return { success: false, error: error.message };
      if (!result?.success) return { success: false, error: result?.error };

      return {
        success: true,
        message: result.message,
        credited_amount: result.credited_amount || 0,
        transaction_id: result.transaction_id,
        badge_id: result.badge_id,
        balance_unlocked: result.balance_unlocked || false,
        verification_badge_awarded: result.verification_badge_awarded || false,
        final_status: result.status
      };

    } catch (error: any) {
      console.error('❌ Update verification request error:', error);
      return { success: false, error: error.message };
    }
  }

  // ─── File Upload Helpers ────────────────────────────────────────────────────────
  
  /**
   * Upload screenshot to Supabase storage
   */
  async uploadScreenshot(file: File, userId: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      console.log('📤 Uploading screenshot:', file.name);
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}_${Date.now()}.${fileExt}`;
      const filePath = `verification-screenshots/${fileName}`;

      // Upload file
      const client = supabaseService.getClient();
      if (!client) {
        return { success: false, error: 'Supabase not configured' };
      }
      
      const { data, error } = await client.storage
        .from('verification-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ Screenshot upload error:', error);
        return { success: false, error: error.message };
      }

      // Get public URL
      const { data: urlData } = client.storage
        .from('verification-documents')
        .getPublicUrl(filePath);

      console.log('✅ Screenshot uploaded:', urlData.publicUrl);
      return { success: true, url: urlData.publicUrl };

    } catch (error: any) {
      console.error('❌ Upload screenshot error:', error);
      return { success: false, error: error.message };
    }
  }

  // ─── Utility Functions ──────────────────────────────────────────────────────────
  
  /**
   * Get comprehensive verification statistics (admin only)
   */
  async getVerificationStats() {
    try {
      console.log('📊 Getting verification statistics...');
      
      const client = supabaseService.getClient();
      if (!client) {
        return { success: false, error: 'Supabase not configured' };
      }
      
      const { data: result, error } = await client.rpc('get_balance_verification_stats');

      if (error) {
        console.error('❌ Error getting verification stats:', error);
        return { success: false, error: error.message };
      }

      if (!result.success) {
        console.error('❌ Get verification stats failed:', result.error);
        return { success: false, error: result.error };
      }

      console.log('✅ Verification stats loaded:', result);
      return { 
        success: true, 
        stats: result.stats
      };

    } catch (error: any) {
      console.error('❌ Get verification stats error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's verification history
   */
  async getUserVerificationHistory() {
    try {
      console.log('📜 Getting user verification history...');
      
      const client = supabaseService.getClient();
      if (!client) {
        return { success: false, error: 'Supabase not configured' };
      }
      
      const { data: result, error } = await client.rpc('get_user_verification_history');

      if (error) {
        console.error('❌ Error getting verification history:', error);
        return { success: false, error: error.message };
      }

      if (!result.success) {
        console.error('❌ Get verification history failed:', result.error);
        return { success: false, error: result.error };
      }

      console.log('✅ Verification history loaded:', result);
      return { 
        success: true, 
        history: result.history
      };

    } catch (error: any) {
      console.error('❌ Get verification history error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's balance status and verification badges (wallet-based, no JWT required)
   */
  async getUserBalanceStatus(walletAddress?: string) {
    try {
      const client = supabaseService.getClient();
      if (!client) {
        return { success: false, error: 'Supabase not configured' };
      }

      if (walletAddress) {
        const { data: result, error } = await client.rpc(
          'get_user_balance_status_by_wallet',
          { p_wallet_address: walletAddress }
        );

        if (error) {
          console.error('❌ Error getting balance status:', error);
          return { success: false, error: error.message };
        }

        return {
          success: true,
          balance_status: result?.balance_status ?? null
        };
      }

      // Fallback: original JWT-based RPC
      const { data: result, error } = await client.rpc('get_user_balance_status');
      if (error) return { success: false, error: error.message };
      return {
        success: true,
        balance_status: result?.balance_status ?? null
      };

    } catch (error: any) {
      console.error('❌ Get balance status error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all users' verification status (admin only)
   */
  async getAllUsersVerificationStatus(limit: number = 100, offset: number = 0) {
    try {
      console.log('👥 Getting all users verification status...');
      
      const client = supabaseService.getClient();
      if (!client) {
        return { success: false, error: 'Supabase not configured' };
      }
      
      const { data: result, error } = await client.rpc('get_all_users_verification_status', {
        p_limit: limit,
        p_offset: offset
      });

      if (error) {
        console.error('❌ Error getting users verification status:', error);
        return { success: false, error: error.message };
      }

      if (!result.success) {
        console.error('❌ Get users verification status failed:', result.error);
        return { success: false, error: result.error };
      }

      console.log('✅ Users verification status loaded:', result);
      return { 
        success: true, 
        users: result.users,
        total_count: result.total_count,
        limit: result.limit,
        offset: result.offset
      };

    } catch (error: any) {
      console.error('❌ Get users verification status error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get status display info
   */
  getStatusInfo(status: string) {
    const statusMap = {
      pending: { label: 'Pending Review', color: 'amber', icon: '⏳' },
      under_review: { label: 'Under Review', color: 'blue', icon: '🔍' },
      approved: { label: 'Approved', color: 'green', icon: '✅' },
      rejected: { label: 'Rejected', color: 'red', icon: '❌' },
      resolved: { label: 'Resolved', color: 'emerald', icon: '✅' }
    };
    
    return statusMap[status as keyof typeof statusMap] || statusMap.pending;
  }

  /**
   * Get priority display info
   */
  getPriorityInfo(priority: string) {
    const priorityMap = {
      low: { label: 'Low', color: 'gray', icon: '⬇️' },
      normal: { label: 'Normal', color: 'blue', icon: '➡️' },
      high: { label: 'High', color: 'orange', icon: '⬆️' },
      urgent: { label: 'Urgent', color: 'red', icon: '🚨' }
    };
    
    return priorityMap[priority as keyof typeof priorityMap] || priorityMap.normal;
  }

  /**
   * Format discrepancy amount
   */
  formatDiscrepancy(amount: number) {
    const isPositive = amount > 0;
    const absAmount = Math.abs(amount);
    const sign = isPositive ? '+' : '-';
    const color = isPositive ? 'text-red-600' : 'text-green-600';
    const label = isPositive ? 'Claiming more' : 'Claiming less';
    
    return {
      formatted: `${sign}${absAmount.toLocaleString()} RZC`,
      color,
      label,
      isPositive
    };
  }
}

export const balanceVerificationService = new BalanceVerificationService();