// ============================================================================
// USERNAME SERVICE
// ============================================================================
// Service for resolving usernames to wallet addresses and vice versa
// Enables user-friendly transfers using @username instead of wallet addresses
// ============================================================================

import { supabaseService } from './supabaseService';

export interface UsernameResolution {
  success: boolean;
  walletAddress?: string;
  username?: string;
  name?: string;
  avatar?: string;
  error?: string;
}

class UsernameService {
  /**
   * Resolve a username or wallet address to a wallet address
   * Supports multiple formats:
   * - @username
   * - username
   * - wallet address (returns as-is if valid)
   */
  async resolveRecipient(input: string): Promise<UsernameResolution> {
    if (!input || !input.trim()) {
      return {
        success: false,
        error: 'Please enter a recipient'
      };
    }

    const trimmed = input.trim();

    // Check if it's a wallet address (starts with UQ, EQ, or kQ and is long enough)
    if (this.isWalletAddress(trimmed)) {
      return {
        success: true,
        walletAddress: trimmed
      };
    }

    // It's a username - resolve it
    return await this.resolveUsername(trimmed);
  }

  /**
   * Check if a string is a valid TON wallet address
   */
  private isWalletAddress(input: string): boolean {
    // TON addresses start with UQ, EQ, or kQ and are typically 48 characters
    const addressPattern = /^(UQ|EQ|kQ)[a-zA-Z0-9_-]{46}$/;
    return addressPattern.test(input);
  }

  /**
   * Resolve a username to wallet address
   * Supports @username or username format
   */
  async resolveUsername(username: string): Promise<UsernameResolution> {
    try {
      // Remove @ if present
      const cleanUsername = username.startsWith('@') ? username.slice(1) : username;

      if (!cleanUsername) {
        return {
          success: false,
          error: 'Invalid username'
        };
      }

      // Query database for user with this name
      const client = supabaseService.getClient();
      if (!client) {
        return {
          success: false,
          error: 'Database connection not available'
        };
      }

      const { data, error } = await client
        .from('wallet_users')
        .select('wallet_address, name, avatar')
        .ilike('name', cleanUsername)
        .single();

      if (error || !data) {
        return {
          success: false,
          error: `User "${cleanUsername}" not found`
        };
      }

      return {
        success: true,
        walletAddress: data.wallet_address,
        username: cleanUsername,
        name: data.name,
        avatar: data.avatar
      };
    } catch (error) {
      console.error('Username resolution error:', error);
      return {
        success: false,
        error: 'Failed to resolve username'
      };
    }
  }

  /**
   * Get username from wallet address
   */
  async getUsername(walletAddress: string): Promise<UsernameResolution> {
    try {
      const client = supabaseService.getClient();
      if (!client) {
        return {
          success: false,
          error: 'Database connection not available'
        };
      }

      const { data, error } = await client
        .from('wallet_users')
        .select('name, avatar')
        .eq('wallet_address', walletAddress)
        .single();

      if (error || !data) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      return {
        success: true,
        walletAddress,
        username: data.name,
        name: data.name,
        avatar: data.avatar
      };
    } catch (error) {
      console.error('Get username error:', error);
      return {
        success: false,
        error: 'Failed to get username'
      };
    }
  }

  /**
   * Search for users by name (for autocomplete)
   */
  async searchUsers(query: string, limit: number = 10): Promise<Array<{
    username: string;
    name: string;
    walletAddress: string;
    avatar?: string;
  }>> {
    try {
      if (!query || query.length < 2) {
        return [];
      }

      const client = supabaseService.getClient();
      if (!client) {
        return [];
      }

      // Remove @ if present
      const cleanQuery = query.startsWith('@') ? query.slice(1) : query;

      const { data, error } = await client
        .from('wallet_users')
        .select('wallet_address, name, avatar')
        .ilike('name', `%${cleanQuery}%`)
        .limit(limit);

      if (error || !data) {
        return [];
      }

      return data.map(user => ({
        username: user.name,
        name: user.name,
        walletAddress: user.wallet_address,
        avatar: user.avatar
      }));
    } catch (error) {
      console.error('Search users error:', error);
      return [];
    }
  }

  /**
   * Check if a username is available
   */
  async isUsernameAvailable(username: string): Promise<boolean> {
    try {
      const client = supabaseService.getClient();
      if (!client) {
        return false;
      }

      const { data, error } = await client
        .from('wallet_users')
        .select('id')
        .ilike('name', username)
        .single();

      // Username is available if no user found
      return error !== null || data === null;
    } catch (error) {
      console.error('Check username availability error:', error);
      return false;
    }
  }

  /**
   * Format recipient display (shows username if available, otherwise shortened address)
   */
  formatRecipientDisplay(walletAddress: string, username?: string): string {
    if (username) {
      return `@${username}`;
    }
    // Shorten address: UQx1...abc
    if (walletAddress.length > 10) {
      return `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
    }
    return walletAddress;
  }
}

export const usernameService = new UsernameService();
export default usernameService;
