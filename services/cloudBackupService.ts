/**
 * Cloud Backup Service
 * Encrypts wallet mnemonics client-side with a separate backup password,
 * then stores the ciphertext in Supabase. The plaintext mnemonic NEVER
 * leaves the device unencrypted.
 *
 * Security model:
 *  - Backup password is independent of the wallet unlock password.
 *  - AES-256-GCM + PBKDF2 (600k iterations) — same standard as local storage.
 *  - Only the encrypted blob is sent to the server.
 *  - Server cannot decrypt without the backup password.
 */

import { authService } from './authService';
import { encryptMnemonic, decryptMnemonic } from '../utils/encryption';

// Helper: always use the auth-session-bearing client
function getClient() {
  return authService.getClient();
}

export interface CloudBackupRecord {
  id: string;
  user_id: string;
  wallet_address: string;
  wallet_name: string;
  encrypted_mnemonic: string; // AES-256-GCM ciphertext, base64
  wallet_type: 'ton-24' | 'multi-12';
  created_at: string;
  updated_at: string;
}

class CloudBackupService {
  // ── Upload ────────────────────────────────────────────────────────────────

  /**
   * Encrypt mnemonic with backupPassword and upload to Supabase.
   * The mnemonic is encrypted before this function is called by the caller
   * who already has it in memory; we re-encrypt with the backup password.
   */
  async backupWallet(params: {
    userId: string;
    walletAddress: string;
    walletName: string;
    mnemonic: string[];
    backupPassword: string;
    walletType: 'ton-24' | 'multi-12';
  }): Promise<{ success: boolean; error?: string }> {
    // Ensure auth session is restored before RLS-protected insert
    const hasSession = await authService.ensureSession();
    if (!hasSession) {
      return { success: false, error: 'No active auth session. Please log in again.' };
    }

    const client = getClient();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
      // Encrypt mnemonic with the backup password (client-side)
      const encryptedMnemonic = await encryptMnemonic(params.mnemonic, params.backupPassword);

      const { error } = await client
        .from('wallet_cloud_backups')
        .upsert(
          {
            user_id: params.userId,
            wallet_address: params.walletAddress,
            wallet_name: params.walletName,
            encrypted_mnemonic: encryptedMnemonic,
            wallet_type: params.walletType,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id,wallet_address' }
        );

      if (error) throw error;

      return { success: true };
    } catch (err: any) {
      console.error('[CloudBackup] Upload failed:', err);
      return { success: false, error: err.message };
    }
  }

  // ── List ──────────────────────────────────────────────────────────────────

  async listBackups(userId: string): Promise<{
    success: boolean;
    data?: Pick<CloudBackupRecord, 'id' | 'wallet_address' | 'wallet_name' | 'wallet_type' | 'updated_at'>[];
    error?: string;
  }> {
    const client = getClient();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
      const { data, error } = await client
        .from('wallet_cloud_backups')
        .select('id, wallet_address, wallet_name, wallet_type, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return { success: true, data: data ?? [] };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ── Restore ───────────────────────────────────────────────────────────────

  /**
   * Download encrypted backup and decrypt with backupPassword.
   * Returns the plaintext mnemonic array — caller is responsible for
   * clearing it from memory after use.
   */
  async restoreWallet(params: {
    userId: string;
    walletAddress: string;
    backupPassword: string;
  }): Promise<{ success: boolean; mnemonic?: string[]; walletName?: string; walletType?: string; error?: string }> {
    const client = getClient();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
      const { data, error } = await client
        .from('wallet_cloud_backups')
        .select('encrypted_mnemonic, wallet_name, wallet_type')
        .eq('user_id', params.userId)
        .eq('wallet_address', params.walletAddress)
        .single();

      if (error) throw error;
      if (!data) return { success: false, error: 'Backup not found' };

      // Decrypt client-side
      const mnemonic = await decryptMnemonic(data.encrypted_mnemonic, params.backupPassword);

      return {
        success: true,
        mnemonic,
        walletName: data.wallet_name,
        walletType: data.wallet_type
      };
    } catch (err: any) {
      // Distinguish wrong password from network error
      const msg = err.message?.includes('decrypt') || err.message?.includes('Failed')
        ? 'Wrong backup password or corrupted backup'
        : err.message;
      return { success: false, error: msg };
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async deleteBackup(userId: string, walletAddress: string): Promise<{ success: boolean; error?: string }> {
    const client = getClient();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
      const { error } = await client
        .from('wallet_cloud_backups')
        .delete()
        .eq('user_id', userId)
        .eq('wallet_address', walletAddress);

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

export const cloudBackupService = new CloudBackupService();
