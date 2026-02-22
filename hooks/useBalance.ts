import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../context/WalletContext';
import { getApiEndpoint, getApiKey } from '../constants';

interface BalanceData {
  tonBalance: number;
  tonPrice: number;
  totalUsdValue: number;
  change24h: number;
  changePercent24h: number;
}

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

  const fetchBalance = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get real TON balance from wallet
      const tonBalance = parseFloat(tonBalanceStr) || 0;
      
      // Get network configuration
      const apiEndpoint = getApiEndpoint(network);
      const apiKey = getApiKey(network);
      
      console.log(`💰 Fetching balance for ${network}:`, {
        balance: tonBalance,
        endpoint: apiEndpoint
      });
      
      // Fetch real TON price from CoinGecko API
      let tonPrice = 2.45; // Fallback price
      try {
        const priceResponse = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd&include_24hr_change=true'
        );
        if (priceResponse.ok) {
          const priceData = await priceResponse.json();
          tonPrice = priceData['the-open-network']?.usd || 2.45;
          const change24hPercent = priceData['the-open-network']?.usd_24h_change || 0;
          
          const totalUsdValue = tonBalance * tonPrice;
          const change24h = totalUsdValue * (change24hPercent / 100);
          
          setBalanceData({
            tonBalance,
            tonPrice,
            totalUsdValue,
            change24h,
            changePercent24h: change24hPercent
          });
          
          console.log(`✅ Price fetched: $${tonPrice} (${change24hPercent.toFixed(2)}% 24h)`);
        } else {
          throw new Error('Price API unavailable');
        }
      } catch (priceError) {
        console.warn('⚠️ Failed to fetch TON price, using fallback:', priceError);
        const totalUsdValue = tonBalance * tonPrice;
        setBalanceData({
          tonBalance,
          tonPrice,
          totalUsdValue,
          change24h: 0,
          changePercent24h: 0
        });
      }
    } catch (err) {
      setError('Failed to fetch balance');
      console.error('❌ Error fetching balance:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tonBalanceStr, network]);

  useEffect(() => {
    fetchBalance();
    
    // Refresh balance every 30 seconds
    const interval = setInterval(fetchBalance, 30000);
    
    return () => clearInterval(interval);
  }, [fetchBalance]);

  return {
    ...balanceData,
    isLoading,
    error,
    refreshBalance: fetchBalance
  };
};
