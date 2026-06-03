/**
 * RZC Price Service
 * 
 * Handles RZC price change calculations.
 * Uses mock price history generation (same as AssetDetail) for consistent display.
 */

import { supabaseService } from './supabaseService';

/**
 * Generate mock price history for RZC (same logic as AssetDetail)
 */
function generateMockPriceHistory(
  currentPrice: number,
  points = 24
): { time: number; price: number }[] {
  const now = Date.now();
  const hourMs = 60 * 60 * 1000;
  
  return Array.from({ length: points }, (_, i) => {
    const time = now - (points - i - 1) * hourMs;
    // Add small random variation (±2%)
    const variation = 1 + (Math.random() - 0.5) * 0.04;
    const price = currentPrice * variation;
    
    return { time, price };
  });
}

/**
 * Calculate RZC 24h price change percentage
 * Uses mock price history generation for consistent display across all pages
 * 
 * @returns Promise<number> - Percentage change (e.g., -0.32 for -0.32%)
 */
export async function getRzcChange24h(): Promise<number> {
  try {
    console.log('🔍 [RZC Service] Starting 24h change calculation...');
    
    const client = supabaseService.getClient();
    if (!client) {
      console.warn('⚠️ [RZC Service] Supabase client not available');
      return 0;
    }

    // Get current price from rzc_config
    const { data: rzcConfigData, error: configError } = await client
      .from('rzc_config')
      .select('value')
      .eq('key', 'RZC_PRICE')
      .single();
    
    if (configError || !rzcConfigData) {
      console.warn('⚠️ [RZC Service] Could not fetch RZC price:', configError?.message);
      return 0;
    }

    const currentPrice = parseFloat(rzcConfigData.value);
    if (isNaN(currentPrice) || currentPrice <= 0) {
      console.warn('⚠️ [RZC Service] Invalid RZC price:', rzcConfigData.value);
      return 0;
    }

    // Generate mock price history (same as AssetDetail)
    const priceHistory = generateMockPriceHistory(currentPrice, 24);
    
    // Calculate percentage change from first to last price
    const firstPrice = priceHistory[0]?.price || currentPrice;
    const lastPrice = priceHistory[priceHistory.length - 1]?.price || currentPrice;
    
    const change = ((lastPrice - firstPrice) / firstPrice) * 100;

    console.log(`📊 [RZC Service] ✅ RZC 24h change: ${change >= 0 ? '+' : ''}${change.toFixed(2)}% (mock data)`);
    return change;

  } catch (error) {
    console.error('❌ [RZC Service] Error calculating RZC 24h change:', error);
    return 0;
  }
}

/**
 * Get RZC price change for a custom time period
 * Uses mock price history generation
 * 
 * @param hoursAgo - Number of hours to look back (default: 24)
 * @returns Promise<number> - Percentage change
 */
export async function getRzcChangeCustom(hoursAgo: number = 24): Promise<number> {
  try {
    const client = supabaseService.getClient();
    if (!client) return 0;

    // Get current price from rzc_config
    const { data: rzcConfigData } = await client
      .from('rzc_config')
      .select('value')
      .eq('key', 'RZC_PRICE')
      .single();
    
    if (!rzcConfigData || !rzcConfigData.value) return 0;
    
    const currentPrice = parseFloat(rzcConfigData.value);
    if (isNaN(currentPrice) || currentPrice <= 0) return 0;

    // Generate mock price history
    const points = Math.ceil(hoursAgo);
    const priceHistory = generateMockPriceHistory(currentPrice, points);
    
    // Calculate percentage change
    const firstPrice = priceHistory[0]?.price || currentPrice;
    const lastPrice = priceHistory[priceHistory.length - 1]?.price || currentPrice;
    
    const change = ((lastPrice - firstPrice) / firstPrice) * 100;

    return change;
  } catch (error) {
    console.error('Error calculating custom RZC change:', error);
    return 0;
  }
}
