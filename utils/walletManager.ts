/**
 * Multi-Wallet Manager
 * Manages multiple encrypted wallets with switching capability
 */

import { encryptMnemonic, decryptMnemonic, needsMigration, migrateEncryption } from './encryption';
import { sanitizeWalletName } from './sanitization';

export interface StoredWallet {
  id: string;
  name: string;
  address: string;
  encryptedMnemonic: string;
  createdAt: number;
  lastUsed: number;
  isActive: boolean;
  type?: 'primary' | 'secondary';
  addresses?: { evm?: string; ton?: string; btc?: string; sol?: string; tron?: string };
}

export interface WalletMetadata {
  id: string;
  name: string;
  address: string;
  createdAt: number;
  lastUsed: number;
  type?: 'primary' | 'secondary';
  addresses?: { evm?: string; ton?: string; btc?: string; sol?: string; tron?: string };
}

const STORAGE_KEY = 'rhiza_wallets';
const ACTIVE_WALLET_KEY = 'rhiza_active_wallet';

export class WalletManager {
  /**
   * Get all stored wallet metadata (without mnemonics)
   */
  static getWallets(): WalletMetadata[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      
      const wallets: StoredWallet[] = JSON.parse(data);
      return wallets.map(w => ({
        id: w.id,
        name: w.name,
        address: w.address,
        createdAt: w.createdAt,
        lastUsed: w.lastUsed,
        type: w.type || 'primary',
        addresses: w.addresses
      }));
    } catch (error) {
      console.error('Failed to get wallets:', error);
      return [];
    }
  }

  /**
   * Get active wallet ID
   */
  static getActiveWalletId(): string | null {
    return localStorage.getItem(ACTIVE_WALLET_KEY);
  }

  /**
   * Get active wallet metadata
   */
  static getActiveWallet(): WalletMetadata | null {
    const activeId = this.getActiveWalletId();
    if (!activeId) return null;
    
    const wallets = this.getWallets();
    return wallets.find(w => w.id === activeId) || null;
  }

  /**
   * Add a new wallet
   */
  static async addWallet(
    mnemonic: string[],
    password: string,
    address: string,
    name?: string,
    type: 'primary' | 'secondary' = 'primary',
    addresses?: { evm?: string; ton?: string; btc?: string; sol?: string; tron?: string }
  ): Promise<{ success: boolean; walletId?: string; error?: string }> {
    try {
      // ── SECURITY FIX #19: Sanitize wallet name ────────────────────────────
      const safeName = name ? sanitizeWalletName(name) : `Wallet ${this.getWallets().length + 1}`;
      
      if (!safeName) {
        return { success: false, error: 'Invalid wallet name' };
      }
      
      // Encrypt mnemonic
      const encryptedMnemonic = await encryptMnemonic(mnemonic, password);
      
      // Generate wallet ID
      const walletId = `wallet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create wallet object
      const wallet: StoredWallet = {
        id: walletId,
        name: safeName,
        address,
        encryptedMnemonic,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        isActive: false,
        type,
        addresses
      };
      
      // Get existing wallets
      const wallets = this.getAllWallets();
      
      // Check if wallet already exists (by address)
      let exists = wallets.find(w => w.address === address);
      
      if (!exists) {
        // Try exact match with TON raw addresses formatting if they look like TON addresses
        try {
          const { Address } = await import('@ton/ton');
          const incomingRaw = Address.parse(address).toRawString();
          exists = wallets.find(w => {
            try { return Address.parse(w.address).toRawString() === incomingRaw; } 
            catch { return false; }
          });
        } catch(e) {
          // Ignore if string is not a valid TON address
        }
      }

      if (exists) {
        return { success: false, error: 'Wallet already exists' };
      }
      
      // Add new wallet
      wallets.push(wallet);
      
      // Save to storage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wallets));
      
      return { success: true, walletId };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get wallet mnemonic (requires password)
   * Automatically migrates legacy wallets to new encryption format
   */
  static async getWalletMnemonic(
    walletId: string,
    password: string
  ): Promise<{ success: boolean; mnemonic?: string[]; error?: string; migrated?: boolean }> {
    try {
      const wallets = this.getAllWallets();
      const wallet = wallets.find(w => w.id === walletId);
      
      if (!wallet) {
        return { success: false, error: 'Wallet not found' };
      }
      
      // Decrypt mnemonic (works with both old and new formats)
      const mnemonic = await decryptMnemonic(wallet.encryptedMnemonic, password);

      // Auto-migrate if needed — re-use already-decrypted mnemonic, no second PBKDF2 run
      if (needsMigration(wallet.encryptedMnemonic)) {
        console.log('🔄 Auto-migrating wallet to new encryption format...');
        try {
          const newEncryptedData = await encryptMnemonic(mnemonic, password);
          wallet.encryptedMnemonic = newEncryptedData;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(wallets));
          console.log('✅ Wallet migrated successfully');
          return { success: true, mnemonic, migrated: true };
        } catch (migErr) {
          console.warn('⚠️ Migration failed, but wallet still accessible:', migErr);
          return { success: true, mnemonic, migrated: false };
        }
      }

      return { success: true, mnemonic, migrated: false };
    } catch (error) {
      return { success: false, error: 'Invalid password or corrupted data' };
    }
  }

  /**
   * Set active wallet
   */
  static setActiveWallet(walletId: string): boolean {
    try {
      const wallets = this.getAllWallets();
      const wallet = wallets.find(w => w.id === walletId);
      
      if (!wallet) return false;
      
      // Update last used timestamp
      wallet.lastUsed = Date.now();
      
      // Save wallets
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wallets));
      
      // Set active wallet
      localStorage.setItem(ACTIVE_WALLET_KEY, walletId);
      
      return true;
    } catch (error) {
      console.error('Failed to set active wallet:', error);
      return false;
    }
  }

  /**
   * Remove wallet
   */
  static removeWallet(walletId: string): boolean {
    try {
      const wallets = this.getAllWallets();
      const filtered = wallets.filter(w => w.id !== walletId);
      
      if (filtered.length === wallets.length) {
        return false; // Wallet not found
      }
      
      // Save updated list
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      
      // Clear active wallet if it was removed
      if (this.getActiveWalletId() === walletId) {
        localStorage.removeItem(ACTIVE_WALLET_KEY);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to remove wallet:', error);
      return false;
    }
  }

  /**
   * Re-encrypt a wallet's mnemonic with a new password.
   * Used when re-importing an existing wallet with a different password.
   */
  static async updateWalletPassword(
    walletId: string,
    mnemonic: string[],
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const wallets = this.getAllWallets();
      const wallet = wallets.find(w => w.id === walletId);
      if (!wallet) return { success: false, error: 'Wallet not found' };

      wallet.encryptedMnemonic = await encryptMnemonic(mnemonic, newPassword);
      wallet.lastUsed = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wallets));
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Update the addresses for a specific wallet
   */
  static updateWalletAddresses(
    walletId: string, 
    addresses: { evm?: string; ton?: string; btc?: string; sol?: string; tron?: string }
  ): boolean {
    try {
      const wallets = this.getAllWallets();
      const wallet = wallets.find(w => w.id === walletId);
      
      if (!wallet) return false;
      
      wallet.addresses = { ...wallet.addresses, ...addresses };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wallets));
      
      return true;
    } catch (error) {
      console.error('Failed to update wallet addresses:', error);
      return false;
    }
  }

  /**
   * Rename wallet
   */
  static renameWallet(walletId: string, newName: string): boolean {
    try {
      // ── SECURITY FIX #19: Sanitize wallet name ────────────────────────────
      const safeName = sanitizeWalletName(newName);
      
      if (!safeName) {
        console.error('Invalid wallet name after sanitization');
        return false;
      }
      
      const wallets = this.getAllWallets();
      const wallet = wallets.find(w => w.id === walletId);
      
      if (!wallet) return false;
      
      wallet.name = safeName;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wallets));
      
      return true;
    } catch (error) {
      console.error('Failed to rename wallet:', error);
      return false;
    }
  }

  /**
   * Clear all wallets (logout all)
   */
  static clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ACTIVE_WALLET_KEY);
  }

  /**
   * Check if any wallets exist
   */
  static hasWallets(): boolean {
    return this.getWallets().length > 0;
  }

  /**
   * Get wallet count
   */
  static getWalletCount(): number {
    return this.getWallets().length;
  }

  /**
   * Private: Get all wallets with encrypted data
   */
  private static getAllWallets(): StoredWallet[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to get all wallets:', error);
      return [];
    }
  }

  /**
   * Export wallet (for backup)
   */
  static async exportWallet(
    walletId: string,
    password: string
  ): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      const result = await this.getWalletMnemonic(walletId, password);
      if (!result.success || !result.mnemonic) {
        return { success: false, error: result.error };
      }
      
      const wallet = this.getWallets().find(w => w.id === walletId);
      if (!wallet) {
        return { success: false, error: 'Wallet not found' };
      }
      
      const exportData = {
        version: 1,
        name: wallet.name,
        address: wallet.address,
        mnemonic: result.mnemonic.join(' '),
        exportedAt: new Date().toISOString()
      };
      
      return { success: true, data: JSON.stringify(exportData, null, 2) };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Verify password for wallet
   */
  static async verifyPassword(walletId: string, password: string): Promise<boolean> {
    const result = await this.getWalletMnemonic(walletId, password);
    return result.success;
  }
}
