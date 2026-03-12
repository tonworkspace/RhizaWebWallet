/**
 * Payment Configuration
 * 
 * This file contains payment wallet addresses and pricing for receiving payments
 * on different networks (mainnet and testnet).
 */

export interface NetworkConfig {
  walletAddress: string;
  memo?: string;
  activationFeeUSD: number;
  testNodeFeeTON?: number; // Only for testnet
}

export interface PaymentConfig {
  mainnet: NetworkConfig;
  testnet: NetworkConfig;
}

/**
 * Payment wallet addresses and pricing for receiving node purchases and activations
 * 
 * IMPORTANT: These are the actual payment wallet addresses for RhizaCore
 */
export const PAYMENT_CONFIG: PaymentConfig = {
  mainnet: {
    // RhizaCore mainnet payment wallet address
    walletAddress: 'UQDck6IU82sfLqAD1el005JcqzPwC8JSgLfOGsF_IUCyEf96',
    memo: 'RhizaCore Payment',
    activationFeeUSD: 15 // $15 activation fee for mainnet
  },
  testnet: {
    // RhizaCore testnet payment wallet address
    walletAddress: 'UQDck6IU82sfLqAD1el005JcqzPwC8JSgLfOGsF_IUCyEf96',
    memo: 'RhizaCore Test Payment',
    activationFeeUSD: 15, // $15 activation fee for testnet
    testNodeFeeTON: 0.5 // 0.5 TON for test node (testnet only)
  }
};

/**
 * Get payment wallet address for current network
 */
export const getPaymentAddress = (network: 'mainnet' | 'testnet'): string => {
  return PAYMENT_CONFIG[network].walletAddress;
};

/**
 * Get payment memo for current network
 */
export const getPaymentMemo = (network: 'mainnet' | 'testnet'): string | undefined => {
  return PAYMENT_CONFIG[network].memo;
};

/**
 * Get activation fee in USD for current network
 */
export const getActivationFeeUSD = (network: 'mainnet' | 'testnet'): number => {
  return PAYMENT_CONFIG[network].activationFeeUSD;
};

/**
 * Get test node fee in TON (testnet only)
 */
export const getTestNodeFeeTON = (): number => {
  return PAYMENT_CONFIG.testnet.testNodeFeeTON || 0.5;
};

/**
 * Calculate activation fee in TON based on current TON price
 */
export const calculateActivationFeeTON = (network: 'mainnet' | 'testnet', tonPriceUSD: number): number => {
  const feeUSD = getActivationFeeUSD(network);
  return feeUSD / tonPriceUSD;
};

/**
 * Validate payment configuration
 */
export const validatePaymentConfig = (network: 'mainnet' | 'testnet'): boolean => {
  const address = PAYMENT_CONFIG[network].walletAddress;
  
  // Check if address exists and is not empty
  if (!address || address.trim() === '') {
    console.error(`❌ Payment wallet address not configured for ${network}`);
    return false;
  }
  
  // Check if address is not a placeholder (common placeholder patterns)
  if (address.includes('YOUR_') || address.includes('...') || address.includes('TODO') || address.includes('REPLACE')) {
    console.error(`❌ Payment wallet address not configured for ${network} - still contains placeholder`);
    return false;
  }
  
  // Basic validation for TON address format (both UQ and EQ are valid prefixes)
  if (!address.startsWith('UQ') && !address.startsWith('EQ') && !address.startsWith('kQ')) {
    console.error(`❌ Invalid TON address format for ${network}: ${address}`);
    return false;
  }
  
  // Check minimum address length (TON addresses are typically 48 characters)
  if (address.length < 40) {
    console.error(`❌ TON address too short for ${network}: ${address}`);
    return false;
  }
  
  console.log(`✅ Payment configuration valid for ${network}: ${address.substring(0, 10)}...`);
  return true;
};

/**
 * Format payment amount in nanotons
 * 1 TON = 1,000,000,000 nanotons
 */
export const toNano = (amount: number): string => {
  return (amount * 1_000_000_000).toString();
};

/**
 * Format payment amount from nanotons to TON
 */
export const fromNano = (nanotons: string): number => {
  return parseInt(nanotons) / 1_000_000_000;
};
