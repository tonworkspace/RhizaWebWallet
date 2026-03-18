import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../context/WalletContext';
import { supabaseService } from '../services/supabaseService';
import { RZC_CONFIG } from '../config/rzcConfig';

interface RZCBalanceData {
  balance: number;
  price: number; // USD price per RZC
  usdValue: number;
  isLoading: boolean;
  error: string | null;
}

export const useRZCBalance = () => {
  const { userProfile, address } = useWallet();
  
  const [balanceData, setBalanceData] = useState<RZCBalanceData>({
    balance: 0,
    price: RZC_CONFIG.RZC_PRICE_USD,
    usdValue: 0,
    isLoading: false,
    error: null
  });

  const fetchRZCBalance = useCallback(async () => {
    if (!userProfile?.id || !address) {
      setBalanceData(prev => ({ ...prev, balance: 0, usdValue: 0 }));
      return;
    }

    setBalanceData(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await supabaseService.getRZCBalance(userProfile.id);
      
      if (result.success && result.balance !== undefined) {
        const balance = result.balance;
        const price = RZC_CONFIG.RZC_PRICE_USD;
        const usdValue = balance * price;
        
        setBalanceData({
          balance,
          price,
          usdValue,
          isLoading: false,
          error: null
        });
      } else {
        throw new Error(result.error || 'Failed to fetch RZC balance');
      }
    } catch (error) {
      console.error('❌ Error fetching RZC balance:', error);
      setBalanceData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, [userProfile?.id, address]);

  // Refresh balance when user profile changes
  useEffect(() => {
    if (userProfile?.rzc_balance !== undefined) {
      const balance = userProfile.rzc_balance;
      const price = RZC_CONFIG.RZC_PRICE_USD;
      const usdValue = balance * price;
      
      setBalanceData({
        balance,
        price,
        usdValue,
        isLoading: false,
        error: null
      });
    }
  }, [userProfile?.rzc_balance]);

  const refreshBalance = useCallback(() => {
    fetchRZCBalance();
  }, [fetchRZCBalance]);

  return {
    ...balanceData,
    refreshBalance
  };
};