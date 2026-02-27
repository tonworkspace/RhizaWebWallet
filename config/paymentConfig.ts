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
 * IMPORTANT: Update these addresses with your actual payment wallet addresses
 */
export const PAYMENT_CONFIG: PaymentConfig = {
  mainnet: {
    // TODO: Replace with your actual mainnet payment wallet address
    walletAddress: 'EQDX5XHmQJctY7Wm2McEgIkr8eb0nHqaWbsvb3X2plc5AJ6F',
    memo: 'RhizaCore Payment',
    activationFeeUSD: 15 // $15 activation fee for mainnet
  },
  testnet: {
    // TODO: Replace with your actual testnet payment wallet address
    walletAddress: 'EQDX5XHmQJctY7Wm2McEgIkr8eb0nHqaWbsvb3X2plc5AJ6F',
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
  
  // Check if address is not the placeholder
  if (address.includes('YOUR_') || address.includes('...')) {
    console.error(`❌ Payment wallet address not configured for ${network}`);
    return false;
  }
  
  // Basic validation for TON address format
  if (network === 'mainnet' && !address.startsWith('EQ')) {
    console.error(`❌ Invalid mainnet address format: ${address}`);
    return false;
  }
  
  if (network === 'testnet' && !address.startsWith('kQ') && !address.startsWith('EQ')) {
    console.error(`❌ Invalid testnet address format: ${address}`);
    return false;
  }
  
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
