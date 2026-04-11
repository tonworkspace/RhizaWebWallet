/**
 * Two-Factor Authentication Service (TOTP)
 * Uses RFC 6238 Time-based One-Time Passwords — compatible with
 * Google Authenticator, Authy, and any TOTP app.
 *
 * Security model:
 *  - TOTP secret is generated client-side.
 *  - Secret is encrypted with the wallet password before being stored in Supabase.
 *  - TOTP verification happens client-side (no secret ever sent in plaintext).
 *  - Backup codes are hashed (SHA-256) before storage.
 */

import { authService } from './authService';
import { encryptMnemonic, decryptMnemonic } from '../utils/encryption';

// Helper: always use the auth-session-bearing client
function getClient() {
  return authService.getClient();
}

// ── TOTP constants ────────────────────────────────────────────────────────────
const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30; // seconds
const TOTP_ALGORITHM = 'SHA-1'; // RFC 6238 standard
const TOTP_WINDOW = 1; // Accept 1 period before/after (clock drift tolerance)
const BACKUP_CODE_COUNT = 8;

// ── Base32 helpers ────────────────────────────────────────────────────────────
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(bytes: Uint8Array): string {
  let bits = 0, value = 0, output = '';
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_CHARS[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(input: string): Uint8Array {
  const str = input.toUpperCase().replace(/=+$/, '');
  let bits = 0, value = 0;
  const output: number[] = [];
  for (const char of str) {
    const idx = BASE32_CHARS.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(output);
}

// ── HMAC-SHA1 via Web Crypto ──────────────────────────────────────────────────
async function hmacSha1(keyBytes: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw', keyBytes.buffer as ArrayBuffer, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, data.buffer as ArrayBuffer);
  return new Uint8Array(sig);
}

// ── TOTP generation ───────────────────────────────────────────────────────────
async function generateTOTP(secret: string, counter: number): Promise<string> {
  const keyBytes = base32Decode(secret);
  const counterBytes = new Uint8Array(8);
  // Write counter as big-endian 64-bit
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = c & 0xff;
    c = Math.floor(c / 256);
  }
  const hmac = await hmacSha1(keyBytes, counterBytes);
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % Math.pow(10, TOTP_DIGITS)).padStart(TOTP_DIGITS, '0');
}

// ── Public API ────────────────────────────────────────────────────────────────

class TwoFactorService {
  /**
   * Generate a new TOTP secret (20 random bytes → base32).
   */
  generateSecret(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(20));
    return base32Encode(bytes);
  }

  /**
   * Build an otpauth:// URI for QR code display.
   */
  buildOtpAuthUri(secret: string, walletAddress: string, issuer = 'RhizaCore'): string {
    const label = encodeURIComponent(`${issuer}:${walletAddress.slice(0, 10)}...`);
    const params = new URLSearchParams({
      secret,
      issuer,
      algorithm: TOTP_ALGORITHM,
      digits: String(TOTP_DIGITS),
      period: String(TOTP_PERIOD)
    });
    return `otpauth://totp/${label}?${params.toString()}`;
  }

  /**
   * Verify a 6-digit TOTP code against a secret.
   * Accepts codes within ±TOTP_WINDOW periods for clock drift.
   */
  async verifyCode(secret: string, code: string): Promise<boolean> {
    const counter = Math.floor(Date.now() / 1000 / TOTP_PERIOD);
    for (let delta = -TOTP_WINDOW; delta <= TOTP_WINDOW; delta++) {
      const expected = await generateTOTP(secret, counter + delta);
      if (expected === code.replace(/\s/g, '')) return true;
    }
    return false;
  }

  /**
   * Generate backup codes (plain) and their SHA-256 hashes for storage.
   */
  async generateBackupCodes(): Promise<{ plain: string[]; hashed: string[] }> {
    const plain: string[] = [];
    const hashed: string[] = [];
    for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
      const bytes = crypto.getRandomValues(new Uint8Array(5));
      const code = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      const formatted = `${code.slice(0, 5)}-${code.slice(5)}`;
      plain.push(formatted);
      const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(formatted));
      hashed.push(btoa(String.fromCharCode(...new Uint8Array(hashBuf))));
    }
    return { plain, hashed };
  }

  /**
   * Verify a backup code against stored hashes. Returns the index if valid, -1 if not.
   */
  async verifyBackupCode(code: string, hashedCodes: string[]): Promise<number> {
    const normalized = code.toUpperCase().replace(/\s/g, '');
    const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
    const hash = btoa(String.fromCharCode(...new Uint8Array(hashBuf)));
    return hashedCodes.indexOf(hash);
  }

  // ── Supabase persistence ────────────────────────────────────────────────────

  /**
   * Attempt a silent re-auth using deterministic wallet credentials.
   * Does NOT block the caller — failures are logged only.
   */
  private async tryRestoreSession(walletAddress: string): Promise<void> {
    const hasSession = await authService.ensureSession();
    if (hasSession) return;

    console.warn('[2FA] No session — attempting silent re-auth for:', walletAddress);
    try {
      const result = await authService.signInWithWallet(walletAddress);
      if (result.success) {
        console.log('[2FA] Silent re-auth succeeded');
      } else {
        console.warn('[2FA] Silent re-auth failed (will proceed anyway):', result.error);
      }
    } catch (err) {
      console.warn('[2FA] Silent re-auth exception (will proceed anyway):', err);
    }
  }

  /**
   * Enable 2FA: encrypt the secret with walletPassword and save to Supabase.
   */
  async enable2FA(params: {
    userId: string;
    walletAddress: string;
    secret: string;
    walletPassword: string;
    hashedBackupCodes: string[];
  }): Promise<{ success: boolean; error?: string }> {
    await this.tryRestoreSession(params.walletAddress);

    const client = getClient();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
      // Resolve the correct wallet_users.id for the current auth session
      // (don't trust userProfile.id — it may not match auth.uid())
      const { data: { user } } = await client.auth.getUser();
      console.log('[2FA] auth.uid():', user?.id);

      let resolvedUserId = params.userId;
      if (user?.id) {
        const { data: walletUser } = await client
          .from('wallet_users')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (walletUser?.id) {
          resolvedUserId = walletUser.id;
          console.log('[2FA] resolved user_id from auth session:', resolvedUserId);
        } else {
          console.warn('[2FA] No wallet_users row found for auth.uid() — RLS will likely fail');
        }
      }

      // Encrypt secret with wallet password
      const encryptedSecret = await encryptMnemonic([params.secret], params.walletPassword);

      // Check if a record already exists for this wallet address
      const { data: existing } = await client
        .from('wallet_2fa')
        .select('id')
        .eq('wallet_address', params.walletAddress)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await client
          .from('wallet_2fa')
          .update({
            encrypted_secret: encryptedSecret,
            is_enabled: true,
            backup_codes: params.hashedBackupCodes,
            updated_at: new Date().toISOString()
          })
          .eq('wallet_address', params.walletAddress);

        if (error) throw error;
      } else {
        const { error } = await client
          .from('wallet_2fa')
          .insert({
            user_id: resolvedUserId,
            wallet_address: params.walletAddress,
            encrypted_secret: encryptedSecret,
            is_enabled: true,
            backup_codes: params.hashedBackupCodes,
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
      }

      return { success: true };
    } catch (err: any) {
      console.error('[2FA] enable2FA error:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Disable 2FA for a wallet.
   */
  async disable2FA(userId: string, walletAddress: string): Promise<{ success: boolean; error?: string }> {
    await this.tryRestoreSession(walletAddress);

    const client = getClient();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
      // Use wallet_address only — it's the RLS-checked column and always reliable
      const { error } = await client
        .from('wallet_2fa')
        .update({ is_enabled: false, updated_at: new Date().toISOString() })
        .eq('wallet_address', walletAddress);

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Fetch 2FA status for a wallet address.
   */
  async get2FAStatus(walletAddress: string): Promise<{
    enabled: boolean;
    encryptedSecret?: string;
    hashedBackupCodes?: string[];
  }> {
    await this.tryRestoreSession(walletAddress);

    const client = getClient();
    if (!client) return { enabled: false };

    try {
      const { data, error } = await client
        .from('wallet_2fa')
        .select('is_enabled, encrypted_secret, backup_codes')
        .eq('wallet_address', walletAddress)
        .maybeSingle();

      if (error) {
        console.error('[2FA] get2FAStatus error:', error);
        return { enabled: false };
      }
      if (!data) return { enabled: false };
      return {
        enabled: data.is_enabled,
        encryptedSecret: data.encrypted_secret,
        hashedBackupCodes: data.backup_codes ?? []
      };
    } catch (err) {
      console.error('[2FA] get2FAStatus exception:', err);
      return { enabled: false };
    }
  }

  /**
   * Decrypt the stored TOTP secret using the wallet password.
   */
  async decryptSecret(encryptedSecret: string, walletPassword: string): Promise<string | null> {
    try {
      const words = await decryptMnemonic(encryptedSecret, walletPassword);
      return words[0] ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Consume a backup code (remove it from the stored list after use).
   */
  async consumeBackupCode(walletAddress: string, codeIndex: number): Promise<void> {
    const client = getClient();
    if (!client) return;

    try {
      const { data } = await client
        .from('wallet_2fa')
        .select('backup_codes')
        .eq('wallet_address', walletAddress)
        .single();

      if (!data?.backup_codes) return;

      const updated = [...data.backup_codes];
      updated.splice(codeIndex, 1); // Remove used code

      await client
        .from('wallet_2fa')
        .update({ backup_codes: updated, updated_at: new Date().toISOString() })
        .eq('wallet_address', walletAddress);
    } catch (err) {
      console.error('[2FA] Failed to consume backup code:', err);
    }
  }
}

export const twoFactorService = new TwoFactorService();
