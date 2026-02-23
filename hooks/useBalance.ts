import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '../context/WalletContext';
import { getApiEndpoint, getApiKey } from '../constants';

interface BalanceData {
  tonBalance: number;
  tonPrice: number;
  totalUsdValue: number;
  change24h: number;
  changePercent24h: number;
}

// Price cache to avoid unnecessary API calls
let priceCache: { price: number; change: number; timestamp: number } | null = null;
const CACHE_DURATION = 10000; // 10 seconds cache

export const useBalance = () => {
  const { balance: tonBalanceStr, network } = useWallet();
  
  const [balanceData, setBalanceData] = useState<BalanceData>({
    tonBalance: 0,
    tonPrice: 0,
    totalUsdValue: 0,
    change24h: 0,
    changePercent24h: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchBalance = useCallback(async (skipCache = false) => {
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get real TON balance from wallet
      const tonBalance = parseFloat(tonBalanceStr) || 0;
      
      // Check cache first
      const now = Date.now();
      if (!skipCache && priceCache && (now - priceCache.timestamp) < CACHE_DURATION) {
        const totalUsdValue = tonBalance * priceCache.price;
        const change24h = totalUsdValue * (priceCache.change / 100);
        
        setBalanceData({
          tonBalance,
          tonPrice: priceCache.price,
          totalUsdValue,
          change24h,
          changePercent24h: priceCache.change
        });
        
        setIsLoading(false);
        return;
      }
      
      // Fetch real TON price from CoinGecko API with timeout
      let tonPrice = 2.45; // Fallback price
      let change24hPercent = 0;
      
      try {
        abortControllerRef.current = new AbortController();
        const timeoutId = setTimeout(() => abortControllerRef.current?.abort(), 5000); // 5s timeout
        
        const priceResponse = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd&include_24hr_change=true',
          { signal: abortControllerRef.current.signal }
        );
        
        clearTimeout(timeoutId);
        
        if (priceResponse.ok) {
          const priceData = await priceResponse.json();
          tonPrice = priceData['the-open-network']?.usd || 2.45;
          change24hPercent = priceData['the-open-network']?.usd_24h_change || 0;
          
          // Update cache
          priceCache = {
            price: tonPrice,
            change: change24hPercent,
            timestamp: Date.now()
          };
          
          console.log(`✅ Price updated: $${tonPrice.toFixed(2)} (${change24hPercent >= 0 ? '+' : ''}${change24hPercent.toFixed(2)}%)`);
        } else {
          throw new Error('Price API unavailable');
        }
      } catch (priceError: any) {
        if (priceError.name === 'AbortError') {
          console.warn('⚠️ Price fetch timeout, using cached/fallback data');
        } else {
          console.warn('⚠️ Failed to fetch TON price:', priceError.message);
        }
        
        // Use cached data if available
        if (priceCache) {
          tonPrice = priceCache.price;
          change24hPercent = priceCache.change;
        }
      }
      
      const totalUsdValue = tonBalance * tonPrice;
      const change24h = totalUsdValue * (change24hPercent / 100);
      
      setBalanceData({
        tonBalance,
        tonPrice,
        totalUsdValue,
        change24h,
        changePercent24h: change24hPercent
      });
      
    } catch (err) {
      setError('Failed to fetch balance');
      console.error('❌ Error fetching balance:', err);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [tonBalanceStr, network]);

  useEffect(() => {
    fetchBalance();
    
    // Refresh balance every 15 seconds (faster updates)
    const interval = setInterval(() => fetchBalance(false), 15000);
    
    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchBalance]);

  return {
    ...balanceData,
    isLoading,
    error,
    refreshBalance: () => fetchBalance(true) // Force refresh bypasses cache
  };
};
