/**
 * Multi-Wallet Manager
 * Manages multiple encrypted wallets with switching capability
 */

import { encryptMnemonic, decryptMnemonic } from './encryption';

export interface StoredWallet {
  id: string;
  name: string;
  address: string;
  encryptedMnemonic: string;
  createdAt: number;
  lastUsed: number;
  isActive: boolean;
}

export interface WalletMetadata {
  id: string;
  name: string;
  address: string;
  createdAt: number;
  lastUsed: number;
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
        lastUsed: w.lastUsed
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
    name?: string
  ): Promise<{ success: boolean; walletId?: string; error?: string }> {
    try {
      // Encrypt mnemonic
      const encryptedMnemonic = await encryptMnemonic(mnemonic, password);
      
      // Generate wallet ID
      const walletId = `wallet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create wallet object
      const wallet: StoredWallet = {
        id: walletId,
        name: name || `Wallet ${this.getWallets().length + 1}`,
        address,
        encryptedMnemonic,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        isActive: false
      };
      
      // Get existing wallets
      const wallets = this.getAllWallets();
      
      // Check if wallet already exists (by address)
      const exists = wallets.find(w => w.address === address);
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
   */
  static async getWalletMnemonic(
    walletId: string,
    password: string
  ): Promise<{ success: boolean; mnemonic?: string[]; error?: string }> {
    try {
      const wallets = this.getAllWallets();
      const wallet = wallets.find(w => w.id === walletId);
      
      if (!wallet) {
        return { success: false, error: 'Wallet not found' };
      }
      
      // Decrypt mnemonic
      const mnemonic = await decryptMnemonic(wallet.encryptedMnemonic, password);
      
      return { success: true, mnemonic };
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
   * Rename wallet
   */
  static renameWallet(walletId: string, newName: string): boolean {
    try {
      const wallets = this.getAllWallets();
      const wallet = wallets.find(w => w.id === walletId);
      
      if (!wallet) return false;
      
      wallet.name = newName;
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
