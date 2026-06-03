/**
 * Payment Configuration
 * 
 * This file contains payment wallet addresses and pricing for receiving payments
 * on different networks (mainnet and testnet).
 */

export interface NetworkConfig {
  walletAddress: string;
  secondaryWalletAddress?: string;
  memo?: string;
  activationFeeUSD: number;
  storeActivationFeeUSD: number; // Easter egg: lower threshold for store purchases
  nodeActivationMilestoneUSD: number; // Full node benefits milestone
  nodeActivationMilestoneRZC: number; // Progressive holding achievement based on RZC balance
  testNodeFeeTON?: number;
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
    walletAddress: 'UQDck6IU82sfLqAD1el005JcqzPwC8JSgLfOGsF_IUCyEf96',
    secondaryWalletAddress: 'UQB2b3Ukq5akEQ-Vhu5xLZC_t1p-BiF0pCbpQcecP_Uj8',
    memo: 'RhizaCore Payment',
    activationFeeUSD: 18, // Direct activation package price
    storeActivationFeeUSD: 5, // Easter egg: store purchases activate at $5 (cheaper minimum)
    nodeActivationMilestoneUSD: 18, // Full node benefits at $18 total
    nodeActivationMilestoneRZC: 5000 // Requires holding 5000 RZC to maintain node activation
  },
  testnet: {
    walletAddress: 'UQDck6IU82sfLqAD1el005JcqzPwC8JSgLfOGsF_IUCyEf96',
    secondaryWalletAddress: 'UQB2b3Ukq5akEQ-Vhu5xLZC_t1p-BiF0pCbpQcfPcecP_Uj8',
    memo: 'RhizaCore Test Payment',
    activationFeeUSD: 15,
    storeActivationFeeUSD: 4, // Testnet: lower thresholds ($4 minimum)
    nodeActivationMilestoneUSD: 15,
    nodeActivationMilestoneRZC: 1000, // Lower RZC requirement for testnet
    testNodeFeeTON: 0.5
  }
};

/**
 * Get payment wallet address for current network
 */
export const getPaymentAddress = (network: 'mainnet' | 'testnet'): string => {
  return PAYMENT_CONFIG[network].walletAddress;
};

export const getSecondaryPaymentAddress = (network: 'mainnet' | 'testnet'): string | undefined => {
  return PAYMENT_CONFIG[network].secondaryWalletAddress;
};

export const getAllPaymentAddresses = (network: 'mainnet' | 'testnet'): string[] => {
  const config = PAYMENT_CONFIG[network];
  return [config.walletAddress, ...(config.secondaryWalletAddress ? [config.secondaryWalletAddress] : [])];
};

/**
 * Get payment memo for current network
 */
export const getPaymentMemo = (network: 'mainnet' | 'testnet'): string | undefined => {
  return PAYMENT_CONFIG[network].memo;
};

/**
 * Get activation fee in USD for current network (direct activation package)
 */
export const getActivationFeeUSD = (network: 'mainnet' | 'testnet'): number => {
  return PAYMENT_CONFIG[network].activationFeeUSD;
};

/**
 * Get store activation fee in USD (Easter egg: lower threshold for store purchases)
 */
export const getStoreActivationFeeUSD = (network: 'mainnet' | 'testnet'): number => {
  return PAYMENT_CONFIG[network].storeActivationFeeUSD;
};

/**
 * Get node activation milestone in USD (full node benefits)
 */
export const getNodeActivationMilestoneUSD = (network: 'mainnet' | 'testnet'): number => {
  return PAYMENT_CONFIG[network].nodeActivationMilestoneUSD;
};

/**
 * Get progressive node activation milestone in RZC holding balance
 */
export const getNodeActivationMilestoneRZC = (network: 'mainnet' | 'testnet'): number => {
  return PAYMENT_CONFIG[network].nodeActivationMilestoneRZC;
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
