import { useState, useCallback } from 'react';
import { useWallet } from '../context/WalletContext';
import { useRZCBalance } from './useRZCBalance';
import { balanceVerificationService, SubmitVerificationRequestData } from '../services/balanceVerificationService';

interface WalletVerificationState {
  isSubmitting: boolean;
  hasActiveRequest: boolean;
  verificationStatus: any;
  error: string | null;
}

export const useWalletVerification = () => {
  const { address, userProfile } = useWallet();
  const { balance: currentRZCBalance, refreshBalance } = useRZCBalance();
  
  const [state, setState] = useState<WalletVerificationState>({
    isSubmitting: false,
    hasActiveRequest: false,
    verificationStatus: null,
    error: null
  });

  /**
   * Submit RZC balance verification for current wallet
   */
  const submitRZCVerification = useCallback(async (data: SubmitVerificationRequestData) => {
    if (!address) {
      return { success: false, error: 'No wallet connected' };
    }

    if (!userProfile) {
      return { success: false, error: 'User profile not loaded' };
    }

    setState(prev => ({ ...prev, isSubmitting: true, error: null }));

    try {
      const result = await balanceVerificationService.submitVerificationRequestFromWallet(
        address,
        currentRZCBalance,
        data
      );

      if (result.success) {
        setState(prev => ({ 
          ...prev, 
          isSubmitting: false, 
          hasActiveRequest: true 
        }));
        
        // Refresh balance after successful submission
        refreshBalance();
      } else {
        setState(prev => ({ 
          ...prev, 
          isSubmitting: false, 
          error: result.error 
        }));
      }

      return result;
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        isSubmitting: false, 
        error: error.message 
      }));
      
      return { success: false, error: error.message };
    }
  }, [address, userProfile, currentRZCBalance, refreshBalance]);

  /**
   * Check current verification status
   */
  const checkVerificationStatus = useCallback(async () => {
    if (!address) return;

    try {
      const result = await balanceVerificationService.getUserVerificationStatus();
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          hasActiveRequest: result.has_request,
          verificationStatus: result.request,
          error: null
        }));
      }
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
    }
  }, [address]);

  /**
   * Get user's balance status and verification badges
   */
  const getBalanceStatus = useCallback(async () => {
    try {
      const result = await balanceVerificationService.getUserBalanceStatus();
      return result;
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      return { success: false, error: error.message };
    }
  }, []);

  /**
   * Get verification history
   */
  const getVerificationHistory = useCallback(async () => {
    try {
      const result = await balanceVerificationService.getUserVerificationHistory();
      return result;
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      return { success: false, error: error.message };
    }
  }, []);

  return {
    // State
    ...state,
    
    // Wallet info
    walletAddress: address,
    currentRZCBalance,
    userProfile,
    
    // Actions
    submitRZCVerification,
    checkVerificationStatus,
    getBalanceStatus,
    getVerificationHistory,
    refreshBalance,
    
    // Helpers
    canSubmitVerification: !!address && !!userProfile && !state.isSubmitting,
    verificationDetails: {
      wallet_address: address,
      current_balance: currentRZCBalance,
      user_id: userProfile?.id
    }
  };
};