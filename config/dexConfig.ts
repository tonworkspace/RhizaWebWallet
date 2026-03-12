/**
 * DEX Configuration for Token Swaps
 * 
 * This file contains DEX smart contract addresses and configurations
 * for executing real token swaps on the TON blockchain.
 * 
 * Primary DEX: DeDust (https://dedust.io)
 * Backup: STON.fi (https://ston.fi)
 */

import { Address } from '@ton/ton';

export interface DEXConfig {
  name: string;
  factoryAddress: string;
  routerAddress: string;
  apiUrl: string;
  explorerUrl: string;
}

// DeDust DEX Configuration
export const DEDUST_CONFIG: Record<'mainnet' | 'testnet', DEXConfig> = {
  mainnet: {
    name: 'DeDust',
    factoryAddress: 'EQBfBWT7X2BHg9tXAxzhz2aKiNTU1tpt5NsiK0uSDW_YAJ67', // DeDust Factory
    routerAddress: 'EQBfBWT7X2BHg9tXAxzhz2aKiNTU1tpt5NsiK0uSDW_YAJ67', // DeDust Router
    apiUrl: 'https://api.dedust.io/v2',
    explorerUrl: 'https://tonscan.org',
  },
  testnet: {
    name: 'DeDust Testnet',
    factoryAddress: 'EQDHcHOJ1_LRS6_VLrP8Fk_DZv-bCCZKVCsS8KvKDEjqVJJZ', // DeDust Testnet Factory
    routerAddress: 'EQDHcHOJ1_LRS6_VLrP8Fk_DZv-bCCZKVCsS8KvKDEjqVJJZ', // DeDust Testnet Router
    apiUrl: 'https://api.dedust.io/v2',
    explorerUrl: 'https://testnet.tonscan.org',
  },
};

// STON.fi DEX Configuration (Backup)
export const STONFI_CONFIG: Record<'mainnet' | 'testnet', DEXConfig> = {
  mainnet: {
    name: 'STON.fi',
    factoryAddress: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs', // STON.fi Router
    routerAddress: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
    apiUrl: 'https://api.ston.fi/v1',
    explorerUrl: 'https://tonscan.org',
  },
  testnet: {
    name: 'STON.fi Testnet',
    factoryAddress: 'kQALh-JBBIKK7gr0o4AVf9JZnEsFndqO0qTCyT-D-yBsWk0v', // STON.fi Testnet
    routerAddress: 'kQALh-JBBIKK7gr0o4AVf9JZnEsFndqO0qTCyT-D-yBsWk0v',
    apiUrl: 'https://api.ston.fi/v1',
    explorerUrl: 'https://testnet.tonscan.org',
  },
};

// Popular Token Addresses on TON
export const TOKEN_ADDRESSES: Record<'mainnet' | 'testnet', Record<string, string>> = {
  mainnet: {
    // Native TON
    TON: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c',
    
    // Stablecoins
    USDT: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs', // Tether USD
    USDC: 'EQC_1YoM8RBixN95lz7odcF3Vrkc_N8Ne7gQi7Abtlet_Efi', // USD Coin
    jUSDT: 'EQBynBO23ywHy_CgarY9NK9FTz0yDsG82PtcbSTQgGoXwiuA', // Bridged USDT
    jUSDC: 'EQC61IQRl0_la95t27xhIpjxZt32vl1QQVF2UgTNuvD18W-4', // Bridged USDC
    
    // Other tokens
    NOT: 'EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT', // Notcoin
    SCALE: 'EQBlqsm144Dq6SjbPI4jjZvA1hqTIP3CvHovbIfW_t-SCALE', // SCALE
  },
  testnet: {
    // Testnet tokens
    TON: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c',
    USDT: 'kQALh-JBBIKK7gr0o4AVf9JZnEsFndqO0qTCyT-D-yBsWk0v', // Test USDT
    USDC: 'kQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_test', // Test USDC
  },
};

// Token Metadata
export interface TokenMetadata {
  symbol: string;
  name: string;
  decimals: number;
  icon: string;
  address: string;
  isNative?: boolean;
}

export const TOKEN_METADATA: Record<string, TokenMetadata> = {
  TON: {
    symbol: 'TON',
    name: 'Toncoin',
    decimals: 9,
    icon: '💎',
    address: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c',
    isNative: true,
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    icon: '💵',
    address: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    icon: '💵',
    address: 'EQC_1YoM8RBixN95lz7odcF3Vrkc_N8Ne7gQi7Abtlet_Efi',
  },
  jUSDT: {
    symbol: 'jUSDT',
    name: 'Bridged USDT',
    decimals: 6,
    icon: '💵',
    address: 'EQBynBO23ywHy_CgarY9NK9FTz0yDsG82PtcbSTQgGoXwiuA',
  },
  NOT: {
    symbol: 'NOT',
    name: 'Notcoin',
    decimals: 9,
    icon: '🎮',
    address: 'EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT',
  },
};

// Swap Configuration
export const SWAP_CONFIG = {
  // Minimum amounts
  MIN_TON_AMOUNT: 0.1, // Minimum 0.1 TON
  MIN_JETTON_AMOUNT: 1, // Minimum 1 jetton unit
  
  // Gas fees
  SWAP_GAS_FEE: '0.25', // 0.25 TON for swap transaction
  JETTON_TRANSFER_FEE: '0.05', // 0.05 TON for jetton transfer
  
  // Slippage
  DEFAULT_SLIPPAGE: 1.0, // 1%
  MAX_SLIPPAGE: 50.0, // 50%
  
  // Timeouts
  QUOTE_TIMEOUT: 30000, // 30 seconds
  TRANSACTION_TIMEOUT: 60000, // 60 seconds
  
  // API
  API_RETRY_ATTEMPTS: 3,
  API_RETRY_DELAY: 1000, // 1 second
};

// Helper function to get DEX config
export function getDEXConfig(network: 'mainnet' | 'testnet' = 'mainnet'): DEXConfig {
  return DEDUST_CONFIG[network];
}

// Helper function to get token address
export function getTokenAddress(symbol: string, network: 'mainnet' | 'testnet' = 'mainnet'): string {
  return TOKEN_ADDRESSES[network][symbol] || '';
}

// Helper function to parse token address
export function parseTokenAddress(address: string): Address {
  try {
    return Address.parse(address);
  } catch (error) {
    throw new Error(`Invalid token address: ${address}`);
  }
}

// Helper function to format token amount
export function formatTokenAmount(amount: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals);
  const integerPart = amount / divisor;
  const fractionalPart = amount % divisor;
  
  if (fractionalPart === BigInt(0)) {
    return integerPart.toString();
  }
  
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  return `${integerPart}.${fractionalStr}`.replace(/\.?0+$/, '');
}

// Helper function to parse token amount
export function parseTokenAmount(amount: string, decimals: number): bigint {
  const [integerPart, fractionalPart = ''] = amount.split('.');
  const paddedFractional = fractionalPart.padEnd(decimals, '0').slice(0, decimals);
  const fullAmount = integerPart + paddedFractional;
  return BigInt(fullAmount);
}
