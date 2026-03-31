/**
 * Address Validation Utilities
 * Provides comprehensive address validation for different blockchain networks
 */

import { Address } from '@ton/core';
import { ethers } from 'ethers';
import { NetworkType } from '../constants';

/**
 * Validate TON address with network and checksum verification
 * 
 * @param address - TON address to validate
 * @param network - Current network (mainnet/testnet)
 * @returns Validation result with details
 */
export function validateTonAddress(
  address: string,
  network: NetworkType
): {
  valid: boolean;
  error?: string;
  normalized?: string;
  workchain?: number;
} {
  try {
    // Parse address
    const addr = Address.parse(address);
    
    // Check workchain for network compatibility
    // Mainnet typically uses workchain 0
    // Testnet can use workchain -1 or 0
    if (network === 'testnet' && addr.workChain !== -1 && addr.workChain !== 0) {
      return {
        valid: false,
        error: 'Invalid testnet address. Testnet addresses should use workchain -1 or 0.'
      };
    }
    
    if (network === 'mainnet' && addr.workChain !== 0) {
      return {
        valid: false,
        error: 'Invalid mainnet address. Mainnet addresses should use workchain 0.'
      };
    }
    
    // Normalize address (get canonical form)
    const normalized = addr.toString();
    
    // Check if provided address matches normalized form
    // If not, there might be a checksum issue
    if (normalized !== address) {
      console.warn('⚠️ Address checksum mismatch. Using normalized form.');
    }
    
    return {
      valid: true,
      normalized,
      workchain: addr.workChain
    };
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid TON address format. Please check the address and try again.'
    };
  }
}

/**
 * Validate EVM address (Ethereum, Polygon, etc.)
 * 
 * @param address - EVM address to validate
 * @returns Validation result with details
 */
export function validateEvmAddress(address: string): {
  valid: boolean;
  error?: string;
  checksummed?: string;
} {
  try {
    // Check if address is valid
    if (!ethers.isAddress(address)) {
      return {
        valid: false,
        error: 'Invalid EVM address format. Please check the address and try again.'
      };
    }
    
    // Get checksummed address
    const checksummed = ethers.getAddress(address);
    
    // Warn if checksum doesn't match
    if (checksummed !== address && address.toLowerCase() !== address && address.toUpperCase() !== address) {
      console.warn('⚠️ EVM address checksum mismatch. Using checksummed form.');
    }
    
    return {
      valid: true,
      checksummed
    };
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid EVM address format. Please check the address and try again.'
    };
  }
}

/**
 * Validate Bitcoin address (basic validation)
 * 
 * @param address - Bitcoin address to validate
 * @param network - Current network (mainnet/testnet)
 * @returns Validation result
 */
export function validateBtcAddress(
  address: string,
  network: NetworkType
): {
  valid: boolean;
  error?: string;
  type?: 'legacy' | 'segwit' | 'taproot';
} {
  try {
    // Basic format validation
    if (!address || address.length < 26 || address.length > 90) {
      return {
        valid: false,
        error: 'Invalid Bitcoin address length.'
      };
    }
    
    // Determine address type based on prefix
    let type: 'legacy' | 'segwit' | 'taproot' | undefined;
    
    if (network === 'mainnet') {
      if (address.startsWith('1')) {
        type = 'legacy'; // P2PKH
      } else if (address.startsWith('3')) {
        type = 'legacy'; // P2SH
      } else if (address.startsWith('bc1q')) {
        type = 'segwit'; // Bech32 (SegWit)
      } else if (address.startsWith('bc1p')) {
        type = 'taproot'; // Bech32m (Taproot)
      } else {
        return {
          valid: false,
          error: 'Invalid Bitcoin mainnet address prefix.'
        };
      }
    } else {
      // Testnet
      if (address.startsWith('m') || address.startsWith('n')) {
        type = 'legacy';
      } else if (address.startsWith('2')) {
        type = 'legacy';
      } else if (address.startsWith('tb1q')) {
        type = 'segwit';
      } else if (address.startsWith('tb1p')) {
        type = 'taproot';
      } else {
        return {
          valid: false,
          error: 'Invalid Bitcoin testnet address prefix.'
        };
      }
    }
    
    // Basic character validation (alphanumeric, no special chars except for bech32)
    const validChars = type === 'segwit' || type === 'taproot'
      ? /^[a-z0-9]+$/i
      : /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;
    
    if (!validChars.test(address)) {
      return {
        valid: false,
        error: 'Invalid characters in Bitcoin address.'
      };
    }
    
    return {
      valid: true,
      type
    };
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid Bitcoin address format.'
    };
  }
}

/**
 * Validate address for any supported blockchain
 * 
 * @param address - Address to validate
 * @param blockchain - Blockchain type ('ton' | 'evm' | 'btc')
 * @param network - Current network
 * @returns Validation result
 */
export function validateAddress(
  address: string,
  blockchain: 'ton' | 'evm' | 'btc',
  network: NetworkType
): {
  valid: boolean;
  error?: string;
  normalized?: string;
} {
  if (!address || !address.trim()) {
    return {
      valid: false,
      error: 'Address is required.'
    };
  }
  
  switch (blockchain) {
    case 'ton':
      return validateTonAddress(address, network);
    
    case 'evm':
      const evmResult = validateEvmAddress(address);
      return {
        valid: evmResult.valid,
        error: evmResult.error,
        normalized: evmResult.checksummed
      };
    
    case 'btc':
      return validateBtcAddress(address, network);
    
    default:
      return {
        valid: false,
        error: 'Unsupported blockchain type.'
      };
  }
}

/**
 * Format address for display (truncate middle)
 * 
 * @param address - Address to format
 * @param startChars - Number of characters to show at start (default: 6)
 * @param endChars - Number of characters to show at end (default: 4)
 * @returns Formatted address
 */
export function formatAddress(
  address: string,
  startChars: number = 6,
  endChars: number = 4
): string {
  if (!address || address.length <= startChars + endChars) {
    return address;
  }
  
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Check if two addresses are the same (case-insensitive for EVM)
 * 
 * @param address1 - First address
 * @param address2 - Second address
 * @param blockchain - Blockchain type
 * @returns True if addresses match
 */
export function addressesMatch(
  address1: string,
  address2: string,
  blockchain: 'ton' | 'evm' | 'btc'
): boolean {
  if (!address1 || !address2) return false;
  
  if (blockchain === 'evm') {
    // EVM addresses are case-insensitive
    return address1.toLowerCase() === address2.toLowerCase();
  }
  
  // TON and BTC addresses are case-sensitive
  return address1 === address2;
}
