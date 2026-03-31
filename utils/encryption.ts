/**
 * Encryption utilities for secure mnemonic storage
 * Uses Web Crypto API with AES-256-GCM encryption
 * 
 * BACKWARD COMPATIBILITY:
 * - Old wallets: 100,000 iterations (legacy)
 * - New wallets: 600,000 iterations (OWASP 2023)
 * - Auto-migration on successful decryption
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM
const SALT_LENGTH = 16;
const ITERATIONS_NEW = 600000; // OWASP 2023 recommendation
const ITERATIONS_LEGACY = 100000; // Legacy iteration count for backward compatibility
const VERSION_BYTE_LENGTH = 1; // Version byte to identify encryption format

/**
 * Derives an encryption key from a password using PBKDF2
 */
async function deriveKey(password: string, salt: BufferSource, iterations: number): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive actual encryption key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: iterations,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts mnemonic with password using AES-256-GCM
 * Always uses new iteration count (600,000) for new encryptions
 */
export async function encryptMnemonic(mnemonic: string[], password: string): Promise<string> {
  try {
    const mnemonicString = mnemonic.join(' ');
    const encoder = new TextEncoder();
    const data = encoder.encode(mnemonicString);

    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH)) as Uint8Array<ArrayBuffer>;
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH)) as Uint8Array<ArrayBuffer>;

    // Derive encryption key from password with NEW iterations
    const key = await deriveKey(password, salt, ITERATIONS_NEW);

    // Encrypt the data
    const encryptedData = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv: iv },
      key,
      data
    );

    // Combine version + salt + iv + encrypted data
    // Version 2 = 600k iterations
    const version = new Uint8Array([2]);
    const combined = new Uint8Array(version.length + salt.length + iv.length + encryptedData.byteLength);
    combined.set(version, 0);
    combined.set(salt, version.length);
    combined.set(iv, version.length + salt.length);
    combined.set(new Uint8Array(encryptedData), version.length + salt.length + iv.length);

    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt mnemonic');
  }
}

/**
 * Decrypts mnemonic with password
 * Supports both legacy (100k) and new (600k) iteration counts
 * Returns metadata about whether migration is needed
 */
export async function decryptMnemonic(
  encryptedData: string, 
  password: string
): Promise<string[]> {
  try {
    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

    // Check if this is a versioned format (version byte present)
    let version = 1; // Default to version 1 (legacy, no version byte)
    let offset = 0;

    // Version 2+ has a version byte at the start
    // Version 1 (legacy) starts directly with salt
    // We can detect version 2 by checking if first byte is 2
    if (combined[0] === 2) {
      version = 2;
      offset = VERSION_BYTE_LENGTH;
    }

    // Determine iteration count based on version
    const iterations = version === 2 ? ITERATIONS_NEW : ITERATIONS_LEGACY;

    // Extract salt, iv, and encrypted data
    const salt = combined.slice(offset, offset + SALT_LENGTH);
    const iv = combined.slice(offset + SALT_LENGTH, offset + SALT_LENGTH + IV_LENGTH);
    const encrypted = combined.slice(offset + SALT_LENGTH + IV_LENGTH);

    // Derive decryption key from password with appropriate iterations
    const key = await deriveKey(password, salt, iterations);

    // Decrypt the data
    const decryptedData = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv: iv },
      key,
      encrypted
    );

    // Convert back to string and split into words
    const decoder = new TextDecoder();
    const mnemonicString = decoder.decode(decryptedData);
    
    // Log migration info for debugging
    if (version === 1) {
      console.log('🔄 Legacy wallet detected (100k iterations). Will auto-migrate on next save.');
    }
    
    return mnemonicString.split(' ');
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt mnemonic. Invalid password or corrupted data.');
  }
}

/**
 * Check if encrypted data needs migration to new format
 */
export function needsMigration(encryptedData: string): boolean {
  try {
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    // Version 1 (legacy) doesn't have version byte, so first byte is part of salt
    // Version 2 has version byte = 2
    return combined[0] !== 2;
  } catch {
    return false;
  }
}

/**
 * Migrate legacy encrypted data to new format
 * Decrypts with old iterations and re-encrypts with new iterations
 */
export async function migrateEncryption(
  encryptedData: string,
  password: string
): Promise<{ success: boolean; newEncryptedData?: string; error?: string }> {
  try {
    // Check if migration is needed
    if (!needsMigration(encryptedData)) {
      return { success: true, newEncryptedData: encryptedData };
    }

    console.log('🔄 Migrating wallet encryption to 600k iterations...');

    // Decrypt with old format
    const mnemonic = await decryptMnemonic(encryptedData, password);

    // Re-encrypt with new format
    const newEncryptedData = await encryptMnemonic(mnemonic, password);

    console.log('✅ Wallet encryption migrated successfully');

    return { success: true, newEncryptedData };
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Validates password strength
 * Enhanced with better requirements per security audit
 */
export function validatePassword(password: string): { valid: boolean; message: string } {
  if (password.length < 12) {
    return { valid: false, message: 'Password must be at least 12 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character' };
  }
  
  // Check for common weak passwords
  const commonPasswords = [
    'password', 'password1', 'password123', '12345678', 'qwerty123',
    'abc123456', 'password!', 'welcome123', 'admin123', 'letmein123'
  ];
  if (commonPasswords.includes(password.toLowerCase())) {
    return { valid: false, message: 'This password is too common. Please choose a stronger password.' };
  }
  
  return { valid: true, message: 'Password is strong' };
}

/**
 * Generates a random verification challenge
 * Returns 3 random positions from 0-23
 */
export function generateVerificationChallenge(): number[] {
  const positions: number[] = [];
  while (positions.length < 3) {
    const pos = Math.floor(Math.random() * 24);
    if (!positions.includes(pos)) {
      positions.push(pos);
    }
  }
  return positions.sort((a, b) => a - b);
}

/**
 * Verifies user input matches mnemonic at given positions
 */
export function verifyMnemonicWords(
  mnemonic: string[],
  userInput: string[],
  positions: number[]
): boolean {
  return positions.every((pos, idx) => 
    mnemonic[pos].toLowerCase().trim() === userInput[idx].toLowerCase().trim()
  );
}
