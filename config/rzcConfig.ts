// ============================================================================
// RZC TOKEN CONFIGURATION
// ============================================================================
// Centralized configuration for RZC token pricing and conversion rates
// Update this file to change the RZC price across the entire application
// ============================================================================

/**
 * RZC Token Price Configuration
 * 
 * IMPORTANT: When updating the RZC price:
 * 1. Update RZC_PRICE_USD here
 * 2. Run update_rzc_price.sql in Supabase to update database functions
 * 3. Clear any cached values in the application
 */

export const RZC_CONFIG = {
  // Current RZC price in USD
  RZC_PRICE_USD: 0.12,
  
  // Token symbol
  SYMBOL: 'RZC',
  
  // Token name
  NAME: 'RhizaCore',
  
  // Decimals for display
  DECIMALS: 0, // RZC is displayed as whole numbers
  
  // Minimum RZC amount for transactions
  MIN_AMOUNT: 1000,
  
  // Maximum RZC amount for single transaction (optional)
  MAX_AMOUNT: 1000000,
} as const;

import { getPriceOverrides } from '../utils/priceConfig';

// ... (other parts of RZC_CONFIG)

/**
 * Convert USD to RZC
 * @param usdAmount - Amount in USD
 * @returns Amount in RZC tokens
 */
export function usdToRzc(usdAmount: number): number {
  const currentPrice = getPriceOverrides().rzc || RZC_CONFIG.RZC_PRICE_USD;
  return Math.floor(usdAmount / currentPrice);
}

/**
 * Convert RZC to USD
 * @param rzcAmount - Amount in RZC tokens
 * @returns Amount in USD
 */
export function rzcToUsd(rzcAmount: number): number {
  const currentPrice = getPriceOverrides().rzc || RZC_CONFIG.RZC_PRICE_USD;
  return rzcAmount * currentPrice;
}

/**
 * Format RZC amount for display
 * @param amount - RZC amount
 * @param includeSymbol - Whether to include the RZC symbol
 * @returns Formatted string
 */
export function formatRzc(amount: number, includeSymbol: boolean = true): string {
  const formatted = amount.toLocaleString();
  return includeSymbol ? `${formatted} ${RZC_CONFIG.SYMBOL}` : formatted;
}

/**
 * Format USD equivalent of RZC
 * @param rzcAmount - Amount in RZC
 * @returns Formatted USD string
 */
export function formatRzcAsUsd(rzcAmount: number): string {
  const usdValue = rzcToUsd(rzcAmount);
  return `$${usdValue.toFixed(2)}`;
}

/**
 * Get current RZC price (reads from admin-configured overrides)
 */
export function getRzcPrice(): number {
  return getPriceOverrides().rzc || RZC_CONFIG.RZC_PRICE_USD;
}

/**
 * Calculate commission in RZC
 * @param usdAmount - Amount in USD
 * @param percentage - Commission percentage (e.g., 10 for 10%)
 * @returns Commission amount in RZC
 */
export function calculateCommissionRzc(usdAmount: number, percentage: number): number {
  const commissionUsd = usdAmount * (percentage / 100);
  return usdToRzc(commissionUsd);
}

// Export for use in other modules
export default RZC_CONFIG;
