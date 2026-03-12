// ============================================================================
// RZC TRANSFER SERVICE
// ============================================================================
// Service for sending and receiving RZC tokens
// Supports transfers using wallet addresses or usernames
// ============================================================================

import { supabaseService } from './supabaseService';
import { usernameService } from './usernameService';

export interface RZCTransferResult {
  success: boolean;
  message: string;
  transactionId?: string;
  recipientUserId?: string;
  recipientUsername?: string;
  newSenderBalance?: number;
  newRecipientBalance?: number;
  error?: string;
}

export interface RZCTransferHistory {
  transactionId: string;
  amount: number;
  type: 'transfer_sent' | 'transfer_received';
  description: string;
  counterpartyUsername?: string;
  counterpartyWallet?: string;
  comment?: string;
  createdAt: string;
}

class RZCTransferService {
  /**
   * Transfer RZC to another user using username or wallet address
   */
  async transferRZC(
    senderUserId: string,
    recipient: string,  // Can be @username, username, or wallet address
    amount: number,
    comment?: string
  ): Promise<RZCTransferResult> {
    try {
      if (!senderUserId) {
        return {
          success: false,
          message: 'Sender user ID is required',
          error: 'SENDER_REQUIRED'
        };
      }

      if (!recipient || !recipient.trim()) {
        return {
          success: false,
          message: 'Recipient is required',
          error: 'RECIPIENT_REQUIRED'
        };
      }

      if (amount <= 0) {
        return {
          success: false,
          message: 'Amount must be greater than 0',
          error: 'INVALID_AMOUNT'
        };
      }

      const client = supabaseService.getClient();
      if (!client) {
        return {
          success: false,
          message: 'Database connection not available',
          error: 'NO_CONNECTION'
        };
      }

      // Call the transfer function
      const { data, error } = await client.rpc('transfer_rzc', {
        p_sender_user_id: senderUserId,
        p_recipient_identifier: recipient.trim(),
        p_amount: amount,
        p_comment: comment || null
      });

      if (error) {
        console.error('RZC transfer error:', error);
        return {
          success: false,
          message: error.message || 'Transfer failed',
          error: error.code || 'TRANSFER_ERROR'
        };
      }

      if (!data || data.length === 0) {
        return {
          success: false,
          message: 'Transfer failed - no response',
          error: 'NO_RESPONSE'
        };
      }

      const result = data[0];

      if (!result.success) {
        return {
          success: false,
          message: result.message || 'Transfer failed',
          error: 'TRANSFER_FAILED'
        };
      }

      return {
        success: true,
        message: result.message || 'Transfer successful',
        transactionId: result.transaction_id,
        recipientUserId: result.recipient_user_id,
        recipientUsername: result.recipient_username,
        newSenderBalance: result.new_sender_balance,
        newRecipientBalance: result.new_recipient_balance
      };
    } catch (error) {
      console.error('RZC transfer service error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        error: 'EXCEPTION'
      };
    }
  }

  /**
   * Get RZC transfer history for a user
   */
  async getTransferHistory(
    userId: string,
    limit: number = 50
  ): Promise<RZCTransferHistory[]> {
    try {
      const client = supabaseService.getClient();
      if (!client) {
        return [];
      }

      const { data, error } = await client.rpc('get_rzc_transfer_history', {
        p_user_id: userId,
        p_limit: limit
      });

      if (error) {
        console.error('Get transfer history error:', error);
        return [];
      }

      if (!data) {
        return [];
      }

      return data.map((tx: any) => ({
        transactionId: tx.transaction_id,
        amount: parseFloat(tx.amount),
        type: tx.type,
        description: tx.description,
        counterpartyUsername: tx.counterparty_username,
        counterpartyWallet: tx.counterparty_wallet,
        comment: tx.comment,
        createdAt: tx.created_at
      }));
    } catch (error) {
      console.error('Get transfer history service error:', error);
      return [];
    }
  }

  /**
   * Get recent RZC transfers (last N hours)
   */
  async getRecentTransfers(
    userId: string,
    hours: number = 24
  ): Promise<Array<RZCTransferHistory & { timeAgo: string }>> {
    try {
      const client = supabaseService.getClient();
      if (!client) {
        return [];
      }

      const { data, error } = await client.rpc('get_recent_rzc_transfers', {
        p_user_id: userId,
        p_hours: hours
      });

      if (error) {
        console.error('Get recent transfers error:', error);
        return [];
      }

      if (!data) {
        return [];
      }

      return data.map((tx: any) => ({
        transactionId: tx.transaction_id,
        amount: parseFloat(tx.amount),
        type: tx.type,
        counterpartyUsername: tx.counterparty_username,
        counterpartyWallet: tx.counterparty_wallet,
        createdAt: tx.created_at,
        timeAgo: tx.time_ago,
        description: '', // Not included in recent transfers
        comment: undefined
      }));
    } catch (error) {
      console.error('Get recent transfers service error:', error);
      return [];
    }
  }

  /**
   * Validate recipient before transfer
   */
  async validateRecipient(recipient: string): Promise<{
    valid: boolean;
    walletAddress?: string;
    username?: string;
    name?: string;
    avatar?: string;
    error?: string;
  }> {
    try {
      const result = await usernameService.resolveRecipient(recipient);
      
      if (!result.success) {
        return {
          valid: false,
          error: result.error
        };
      }

      return {
        valid: true,
        walletAddress: result.walletAddress,
        username: result.username,
        name: result.name,
        avatar: result.avatar
      };
    } catch (error) {
      console.error('Validate recipient error:', error);
      return {
        valid: false,
        error: 'Failed to validate recipient'
      };
    }
  }

  /**
   * Format transfer display text
   */
  formatTransferDisplay(
    type: 'transfer_sent' | 'transfer_received',
    amount: number,
    counterpartyUsername?: string,
    counterpartyWallet?: string
  ): string {
    const amountStr = Math.abs(amount).toLocaleString();
    const recipient = counterpartyUsername 
      ? `@${counterpartyUsername}` 
      : counterpartyWallet 
        ? `${counterpartyWallet.slice(0, 6)}...${counterpartyWallet.slice(-4)}`
        : 'Unknown';

    if (type === 'transfer_sent') {
      return `Sent ${amountStr} RZC to ${recipient}`;
    } else {
      return `Received ${amountStr} RZC from ${recipient}`;
    }
  }

  /**
   * Get RZC balance for a user
   */
  async getRZCBalance(userId: string): Promise<number> {
    try {
      const result = await supabaseService.getRZCBalance(userId);
      if (result.success && result.balance !== undefined) {
        return result.balance;
      }
      return 0;
    } catch (error) {
      console.error('Get RZC balance error:', error);
      return 0;
    }
  }
}

export const rzcTransferService = new RZCTransferService();
export default rzcTransferService;
