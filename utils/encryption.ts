/**
 * Encryption utilities for secure mnemonic storage
 * Uses Web Crypto API with AES-256-GCM encryption
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM
const SALT_LENGTH = 16;
const ITERATIONS = 100000; // PBKDF2 iterations

/**
 * Derives an encryption key from a password using PBKDF2
 */
async function deriveKey(password: string, salt: BufferSource): Promise<CryptoKey> {
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
      iterations: ITERATIONS,
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
 */
export async function encryptMnemonic(mnemonic: string[], password: string): Promise<string> {
  try {
    const mnemonicString = mnemonic.join(' ');
    const encoder = new TextEncoder();
    const data = encoder.encode(mnemonicString);

    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH)) as Uint8Array<ArrayBuffer>;
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH)) as Uint8Array<ArrayBuffer>;

    // Derive encryption key from password
    const key = await deriveKey(password, salt);

    // Encrypt the data
    const encryptedData = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv: iv },
      key,
      data
    );

    // Combine salt + iv + encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encryptedData), salt.length + iv.length);

    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt mnemonic');
  }
}

/**
 * Decrypts mnemonic with password
 */
export async function decryptMnemonic(encryptedData: string, password: string): Promise<string[]> {
  try {
    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

    // Extract salt, iv, and encrypted data
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH);

    // Derive decryption key from password
    const key = await deriveKey(password, salt);

    // Decrypt the data
    const decryptedData = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv: iv },
      key,
      encrypted
    );

    // Convert back to string and split into words
    const decoder = new TextDecoder();
    const mnemonicString = decoder.decode(decryptedData);
    return mnemonicString.split(' ');
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt mnemonic. Invalid password or corrupted data.');
  }
}

/**
 * Validates password strength
 */
export function validatePassword(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
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
