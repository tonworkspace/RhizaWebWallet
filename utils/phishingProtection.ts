/**
 * Phishing Protection Utility
 * 
 * Security Issue #20: No Phishing Protection
 * Priority: LOW
 * Effort: 8-10 hours
 * 
 * Provides comprehensive phishing protection including:
 * - Address verification and validation
 * - Known scam address detection
 * - Domain verification for external links
 * - Address book management
 * - Security warnings and indicators
 */

import { Address } from '@ton/ton';

// ── KNOWN SCAM ADDRESSES DATABASE ────────────────────────────────────────────
// This list should be regularly updated from community reports and security feeds
const KNOWN_SCAM_ADDRESSES: Set<string> = new Set([
  // Example scam addresses (these should be real addresses from security reports)
  'EQBadScamAddress1234567890abcdefghijklmnopqrstuvwxyz',
  'EQAnotherScamAddress0987654321zyxwvutsrqponmlkjihgfedcba',
  // Add more known scam addresses here
]);

// ── SUSPICIOUS PATTERNS ──────────────────────────────────────────────────────
const SUSPICIOUS_PATTERNS = {
  // Addresses that look like official addresses but aren't
  impersonation: [
    /rhiza/i,
    /official/i,
    /support/i,
    /admin/i,
    /team/i,
    /airdrop/i,
    /giveaway/i,
  ],
  // Common phishing keywords in comments
  phishingKeywords: [
    /verify.*wallet/i,
    /claim.*reward/i,
    /urgent.*action/i,
    /suspended.*account/i,
    /confirm.*identity/i,
    /security.*alert/i,
    /update.*payment/i,
  ],
};

// ── ADDRESS BOOK STORAGE ──────────────────────────────────────────────────────
const ADDRESS_BOOK_KEY = 'rhiza_address_book';

export interface AddressBookEntry {
  address: string;
  name: string;
  note?: string;
  addedAt: number;
  lastUsed?: number;
  isTrusted: boolean;
}

export interface PhishingCheckResult {
  isSafe: boolean;
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  warnings: string[];
  recommendations: string[];
  isInAddressBook: boolean;
  addressBookEntry?: AddressBookEntry;
}

// ── ADDRESS BOOK MANAGEMENT ──────────────────────────────────────────────────

export function getAddressBook(): AddressBookEntry[] {
  try {
    const stored = localStorage.getItem(ADDRESS_BOOK_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load address book:', error);
    return [];
  }
}

export function saveAddressBook(entries: AddressBookEntry[]): boolean {
  try {
    localStorage.setItem(ADDRESS_BOOK_KEY, JSON.stringify(entries));
    return true;
  } catch (error) {
    console.error('Failed to save address book:', error);
    return false;
  }
}

export function addToAddressBook(
  address: string,
  name: string,
  note?: string,
  isTrusted: boolean = false
): { success: boolean; error?: string } {
  try {
    // Validate address format
    const validation = validateTonAddress(address);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    const normalizedAddress = validation.normalized!;
    const addressBook = getAddressBook();

    // Check if address already exists
    const existingIndex = addressBook.findIndex(
      (entry) => entry.address === normalizedAddress
    );

    if (existingIndex >= 0) {
      // Update existing entry
      addressBook[existingIndex] = {
        ...addressBook[existingIndex],
        name,
        note,
        isTrusted,
        lastUsed: Date.now(),
      };
    } else {
      // Add new entry
      addressBook.push({
        address: normalizedAddress,
        name,
        note,
        addedAt: Date.now(),
        isTrusted,
      });
    }

    saveAddressBook(addressBook);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export function removeFromAddressBook(address: string): boolean {
  try {
    const addressBook = getAddressBook();
    const filtered = addressBook.filter((entry) => entry.address !== address);
    return saveAddressBook(filtered);
  } catch (error) {
    console.error('Failed to remove from address book:', error);
    return false;
  }
}

export function findInAddressBook(address: string): AddressBookEntry | null {
  try {
    const validation = validateTonAddress(address);
    if (!validation.isValid) return null;

    const normalizedAddress = validation.normalized!;
    const addressBook = getAddressBook();
    return addressBook.find((entry) => entry.address === normalizedAddress) || null;
  } catch (error) {
    return null;
  }
}

export function updateLastUsed(address: string): void {
  try {
    const addressBook = getAddressBook();
    const entry = addressBook.find((e) => e.address === address);
    if (entry) {
      entry.lastUsed = Date.now();
      saveAddressBook(addressBook);
    }
  } catch (error) {
    console.error('Failed to update last used:', error);
  }
}

// ── ADDRESS VALIDATION ────────────────────────────────────────────────────────

export function validateTonAddress(
  address: string,
  network: 'mainnet' | 'testnet' = 'mainnet'
): {
  isValid: boolean;
  normalized?: string;
  error?: string;
  workchain?: number;
} {
  try {
    // Parse address
    const addr = Address.parse(address);

    // Check workchain matches network
    if (network === 'testnet' && addr.workChain !== -1) {
      return {
        isValid: false,
        error: 'Invalid testnet address (wrong workchain)',
      };
    }

    // Normalize address
    const normalized = addr.toString({
      bounceable: false,
      testOnly: network === 'testnet',
    });

    // Verify checksum by re-parsing
    try {
      Address.parse(normalized);
    } catch {
      return {
        isValid: false,
        error: 'Address checksum verification failed',
      };
    }

    return {
      isValid: true,
      normalized,
      workchain: addr.workChain,
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid TON address format',
    };
  }
}

// ── PHISHING DETECTION ────────────────────────────────────────────────────────

export function checkForPhishing(
  address: string,
  amount?: number,
  comment?: string,
  network: 'mainnet' | 'testnet' = 'mainnet'
): PhishingCheckResult {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  let riskLevel: PhishingCheckResult['riskLevel'] = 'safe';

  // 1. Validate address format
  const validation = validateTonAddress(address, network);
  if (!validation.isValid) {
    return {
      isSafe: false,
      riskLevel: 'critical',
      warnings: [validation.error || 'Invalid address format'],
      recommendations: ['Double-check the recipient address'],
      isInAddressBook: false,
    };
  }

  const normalizedAddress = validation.normalized!;

  // 2. Check address book
  const addressBookEntry = findInAddressBook(normalizedAddress);
  const isInAddressBook = !!addressBookEntry;

  if (addressBookEntry?.isTrusted) {
    // Trusted address - safe
    return {
      isSafe: true,
      riskLevel: 'safe',
      warnings: [],
      recommendations: [],
      isInAddressBook: true,
      addressBookEntry,
    };
  }

  // 3. Check against known scam addresses
  if (KNOWN_SCAM_ADDRESSES.has(normalizedAddress)) {
    return {
      isSafe: false,
      riskLevel: 'critical',
      warnings: [
        '⚠️ CRITICAL: This address is a known scam!',
        'This address has been reported for fraudulent activity.',
      ],
      recommendations: [
        'DO NOT send funds to this address',
        'Report this transaction attempt to support',
      ],
      isInAddressBook,
      addressBookEntry,
    };
  }

  // 4. Check for impersonation patterns
  if (comment) {
    for (const pattern of SUSPICIOUS_PATTERNS.impersonation) {
      if (pattern.test(comment)) {
        warnings.push(
          '⚠️ Suspicious comment detected - possible impersonation attempt'
        );
        riskLevel = 'high';
        recommendations.push(
          'Verify this is an official address before sending',
          'Check official channels for legitimate addresses'
        );
        break;
      }
    }

    // Check for phishing keywords
    for (const pattern of SUSPICIOUS_PATTERNS.phishingKeywords) {
      if (pattern.test(comment)) {
        warnings.push(
          '⚠️ Phishing keywords detected in comment'
        );
        if (riskLevel === 'safe') riskLevel = 'medium';
        recommendations.push(
          'Be cautious - this may be a phishing attempt',
          'Legitimate services never ask for verification via transactions'
        );
        break;
      }
    }
  }

  // 5. Check transaction amount
  if (amount !== undefined) {
    // Large transaction warning
    if (amount > 100) {
      warnings.push(
        `⚠️ Large transaction: ${amount.toFixed(2)} TON`
      );
      if (riskLevel === 'safe') riskLevel = 'low';
      recommendations.push(
        'Consider splitting large transactions',
        'Verify recipient address multiple times'
      );
    }

    // Very large transaction critical warning
    if (amount > 1000) {
      warnings.push(
        `🚨 CRITICAL: Very large transaction (${amount.toFixed(2)} TON)`
      );
      riskLevel = 'high';
      recommendations.push(
        'STOP: Verify this transaction is legitimate',
        'Contact recipient through official channels',
        'Consider using escrow for large amounts'
      );
    }
  }

  // 6. New address warning
  if (!isInAddressBook) {
    warnings.push(
      '⚠️ New address - not in your address book'
    );
    if (riskLevel === 'safe') riskLevel = 'low';
    recommendations.push(
      'Verify this address is correct',
      'Add to address book if this is a trusted contact'
    );
  }

  // 7. Testnet address on mainnet (or vice versa)
  if (network === 'mainnet' && validation.workchain === -1) {
    warnings.push(
      '⚠️ This appears to be a testnet address'
    );
    riskLevel = 'medium';
    recommendations.push(
      'Verify you are on the correct network',
      'Testnet addresses should not be used on mainnet'
    );
  }

  const isSafe = riskLevel === 'safe' || riskLevel === 'low';

  return {
    isSafe,
    riskLevel,
    warnings,
    recommendations,
    isInAddressBook,
    addressBookEntry,
  };
}

// ── DOMAIN VERIFICATION ───────────────────────────────────────────────────────

const TRUSTED_DOMAINS = new Set([
  'rhizacore.xyz',
  'ton.org',
  'toncenter.com',
  'tonapi.io',
  'tonkeeper.com',
  'ton.app',
  'getgems.io',
  'fragment.com',
]);

export function verifyDomain(url: string): {
  isTrusted: boolean;
  domain: string;
  warnings: string[];
} {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();

    // Check if domain is trusted
    const isTrusted = TRUSTED_DOMAINS.has(domain);

    const warnings: string[] = [];

    if (!isTrusted) {
      warnings.push('⚠️ This is not a verified domain');
      warnings.push('Be cautious when connecting your wallet');
    }

    // Check for common phishing patterns
    if (domain.includes('rhiza') && !TRUSTED_DOMAINS.has(domain)) {
      warnings.push('🚨 CRITICAL: Possible RhizaCore impersonation');
      warnings.push('Official domain is rhizacore.xyz');
    }

    // Check for suspicious TLDs
    const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.gq'];
    if (suspiciousTLDs.some((tld) => domain.endsWith(tld))) {
      warnings.push('⚠️ Suspicious domain extension detected');
    }

    return {
      isTrusted,
      domain,
      warnings,
    };
  } catch (error) {
    return {
      isTrusted: false,
      domain: '',
      warnings: ['⚠️ Invalid URL format'],
    };
  }
}

// ── SECURITY INDICATORS ───────────────────────────────────────────────────────

export function getSecurityIndicator(riskLevel: PhishingCheckResult['riskLevel']): {
  color: string;
  icon: string;
  label: string;
  bgColor: string;
  borderColor: string;
} {
  switch (riskLevel) {
    case 'safe':
      return {
        color: 'text-green-600 dark:text-green-400',
        icon: '✓',
        label: 'Safe',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-800',
      };
    case 'low':
      return {
        color: 'text-blue-600 dark:text-blue-400',
        icon: 'ℹ',
        label: 'Low Risk',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800',
      };
    case 'medium':
      return {
        color: 'text-yellow-600 dark:text-yellow-400',
        icon: '⚠',
        label: 'Medium Risk',
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
      };
    case 'high':
      return {
        color: 'text-orange-600 dark:text-orange-400',
        icon: '⚠',
        label: 'High Risk',
        bgColor: 'bg-orange-50 dark:bg-orange-900/20',
        borderColor: 'border-orange-200 dark:border-orange-800',
      };
    case 'critical':
      return {
        color: 'text-red-600 dark:text-red-400',
        icon: '🚨',
        label: 'CRITICAL RISK',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800',
      };
  }
}

// ── EXPORT UTILITY FUNCTIONS ──────────────────────────────────────────────────

export const phishingProtection = {
  // Address validation
  validateTonAddress,
  
  // Phishing detection
  checkForPhishing,
  
  // Address book
  getAddressBook,
  addToAddressBook,
  removeFromAddressBook,
  findInAddressBook,
  updateLastUsed,
  
  // Domain verification
  verifyDomain,
  
  // Security indicators
  getSecurityIndicator,
};

export default phishingProtection;
