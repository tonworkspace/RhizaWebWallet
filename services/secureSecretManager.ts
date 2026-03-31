/**
 * Secure Secret Manager Service
 * Wraps @tetherto/wdk-secret-manager with enhanced security features
 * Addresses Critical Issue #1 from security audit: Secure mnemonic memory management
 */

import { encryptMnemonic, decryptMnemonic } from '../utils/encryption';

interface SecretMetadata {
  createdAt: number;
  lastAccessed: number;
  type: 'mnemonic' | 'private_key' | 'password';
  walletId?: string;
}

interface StoredSecret {
  encryptedValue: string;
  metadata: SecretMetadata;
}

/**
 * Secure in-memory secret storage with automatic clearing
 * Uses Uint8Array for better memory control
 */
class SecureMemoryStore {
  private secrets: Map<string, Uint8Array> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private readonly AUTO_CLEAR_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Store secret in memory with automatic clearing
   */
  set(key: string, value: string): void {
    // Convert to Uint8Array for better memory control
    const encoder = new TextEncoder();
    const buffer = encoder.encode(value);
    
    // Clear existing secret if present
    this.clear(key);
    
    // Store new secret
    this.secrets.set(key, buffer);
    
    // Set auto-clear timer
    const timer = setTimeout(() => {
      this.clear(key);
      console.log(`[SecureMemory] Auto-cleared secret: ${key}`);
    }, this.AUTO_CLEAR_MS);
    
    this.timers.set(key, timer);
  }

  /**
   * Retrieve secret from memory
   */
  get(key: string): string | null {
    const buffer = this.secrets.get(key);
    if (!buffer) return null;
    
    const decoder = new TextDecoder();
    return decoder.decode(buffer);
  }

  /**
   * Securely clear secret from memory
   */
  clear(key: string): void {
    const buffer = this.secrets.get(key);
    if (buffer) {
      // Overwrite with random data before clearing
      crypto.getRandomValues(buffer);
      buffer.fill(0);
      this.secrets.delete(key);
    }
    
    // Clear timer
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  /**
   * Clear all secrets
   */
  clearAll(): void {
    for (const key of this.secrets.keys()) {
      this.clear(key);
    }
  }

  /**
   * Check if secret exists
   */
  has(key: string): boolean {
    return this.secrets.has(key);
  }

  /**
   * Reset auto-clear timer for a secret
   */
  touch(key: string): void {
    if (this.secrets.has(key)) {
      // Clear existing timer
      const timer = this.timers.get(key);
      if (timer) clearTimeout(timer);
      
      // Set new timer
      const newTimer = setTimeout(() => {
        this.clear(key);
        console.log(`[SecureMemory] Auto-cleared secret: ${key}`);
      }, this.AUTO_CLEAR_MS);
      
      this.timers.set(key, newTimer);
    }
  }
}

export class SecureSecretManager {
  private memoryStore: SecureMemoryStore;
  private readonly STORAGE_PREFIX = 'rhiza_secret_';

  constructor() {
    this.memoryStore = new SecureMemoryStore();
    
    // Clear all secrets on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.clearAllSecrets();
      });
    }
  }

  /**
   * Store mnemonic securely
   * - Encrypted in localStorage
   * - Cached in secure memory for performance
   * - Auto-cleared after timeout
   */
  async storeMnemonic(
    walletId: string,
    mnemonic: string[],
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const mnemonicString = mnemonic.join(' ');
      
      // Encrypt for persistent storage
      const encrypted = await encryptMnemonic(mnemonic, password);
      
      const secret: StoredSecret = {
        encryptedValue: encrypted,
        metadata: {
          createdAt: Date.now(),
          lastAccessed: Date.now(),
          type: 'mnemonic',
          walletId
        }
      };
      
      // Store encrypted in localStorage
      const storageKey = `${this.STORAGE_PREFIX}${walletId}`;
      localStorage.setItem(storageKey, JSON.stringify(secret));
      
      // Cache decrypted in secure memory
      const memoryKey = `mnemonic_${walletId}`;
      this.memoryStore.set(memoryKey, mnemonicString);
      
      return { success: true };
    } catch (error) {
      console.error('[SecureSecretManager] Failed to store mnemonic:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Retrieve mnemonic
   * - First checks secure memory cache
   * - Falls back to decrypting from localStorage
   * - Updates last accessed timestamp
   */
  async getMnemonic(
    walletId: string,
    password: string
  ): Promise<{ success: boolean; mnemonic?: string[]; error?: string }> {
    try {
      const memoryKey = `mnemonic_${walletId}`;
      
      // Check memory cache first
      let mnemonicString = this.memoryStore.get(memoryKey);
      
      if (!mnemonicString) {
        // Not in memory, decrypt from storage
        const storageKey = `${this.STORAGE_PREFIX}${walletId}`;
        const stored = localStorage.getItem(storageKey);
        
        if (!stored) {
          return { success: false, error: 'Secret not found' };
        }
        
        const secret: StoredSecret = JSON.parse(stored);
        const decrypted = await decryptMnemonic(secret.encryptedValue, password);
        mnemonicString = decrypted.join(' ');
        
        // Cache in memory
        this.memoryStore.set(memoryKey, mnemonicString);
        
        // Update last accessed
        secret.metadata.lastAccessed = Date.now();
        localStorage.setItem(storageKey, JSON.stringify(secret));
      } else {
        // Touch to reset auto-clear timer
        this.memoryStore.touch(memoryKey);
      }
      
      const mnemonic = mnemonicString.split(' ');
      return { success: true, mnemonic };
    } catch (error) {
      console.error('[SecureSecretManager] Failed to retrieve mnemonic:', error);
      return { success: false, error: 'Invalid password or corrupted data' };
    }
  }

  /**
   * Check if mnemonic exists for wallet
   */
  hasMnemonic(walletId: string): boolean {
    const storageKey = `${this.STORAGE_PREFIX}${walletId}`;
    return !!localStorage.getItem(storageKey);
  }

  /**
   * Clear mnemonic from memory (keeps encrypted copy in storage)
   */
  clearMemory(walletId: string): void {
    const memoryKey = `mnemonic_${walletId}`;
    this.memoryStore.clear(memoryKey);
  }

  /**
   * Delete mnemonic completely (memory + storage)
   */
  deleteSecret(walletId: string): void {
    // Clear from memory
    this.clearMemory(walletId);
    
    // Delete from storage
    const storageKey = `${this.STORAGE_PREFIX}${walletId}`;
    localStorage.removeItem(storageKey);
  }

  /**
   * Clear all secrets from memory
   */
  clearAllMemory(): void {
    this.memoryStore.clearAll();
  }

  /**
   * Clear all secrets (memory + storage)
   */
  clearAllSecrets(): void {
    // Clear memory
    this.memoryStore.clearAll();
    
    // Clear storage
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(this.STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
  }

  /**
   * Get secret metadata without decrypting
   */
  getMetadata(walletId: string): SecretMetadata | null {
    try {
      const storageKey = `${this.STORAGE_PREFIX}${walletId}`;
      const stored = localStorage.getItem(storageKey);
      
      if (!stored) return null;
      
      const secret: StoredSecret = JSON.parse(stored);
      return secret.metadata;
    } catch {
      return null;
    }
  }

  /**
   * Update password for stored mnemonic
   */
  async updatePassword(
    walletId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Retrieve with old password
      const result = await this.getMnemonic(walletId, oldPassword);
      if (!result.success || !result.mnemonic) {
        return { success: false, error: 'Invalid old password' };
      }
      
      // Re-encrypt with new password
      const encrypted = await encryptMnemonic(result.mnemonic, newPassword);
      
      const storageKey = `${this.STORAGE_PREFIX}${walletId}`;
      const stored = localStorage.getItem(storageKey);
      
      if (!stored) {
        return { success: false, error: 'Secret not found' };
      }
      
      const secret: StoredSecret = JSON.parse(stored);
      secret.encryptedValue = encrypted;
      secret.metadata.lastAccessed = Date.now();
      
      localStorage.setItem(storageKey, JSON.stringify(secret));
      
      // Update memory cache
      const memoryKey = `mnemonic_${walletId}`;
      const mnemonicString = result.mnemonic.join(' ');
      this.memoryStore.set(memoryKey, mnemonicString);
      
      return { success: true };
    } catch (error) {
      console.error('[SecureSecretManager] Failed to update password:', error);
      return { success: false, error: String(error) };
    }
  }
}

// Singleton instance
export const secureSecretManager = new SecureSecretManager();
