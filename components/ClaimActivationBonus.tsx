import React, { useState, useEffect } from 'react';
import { Gift, Check, AlertCircle, Loader } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { supabaseService } from '../services/supabaseService';
import { useToast } from '../context/ToastContext';

/**
 * Component for users to claim missing activation bonus
 * Shows only if user is activated but hasn't received the 150 RZC bonus
 */
const ClaimActivationBonus: React.FC = () => {
  const { address, isActivated } = useWallet();
  const { success } = useToast();
  const [isEligible, setIsEligible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkEligibility();
  }, [address, isActivated]);

  const checkEligibility = async () => {
    if (!address || !isActivated) {
      setIsEligible(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get user profile
      const profileResult = await supabaseService.getProfile(address);
      if (!profileResult.success || !profileResult.data) {
        setIsEligible(false);
        setLoading(false);
        return;
      }

      const userId = profileResult.data.id;

      // Check if user already received activation bonus
      const client = supabaseService.getClient();
      if (!client) {
        setIsEligible(false);
        setLoading(false);
        return;
      }

      const { data: transactions, error: txError } = await client
        .from('wallet_rzc_transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'activation_bonus');

      if (txError) {
        console.error('Error checking transactions:', txError);
        setIsEligible(false);
        setLoading(false);
        return;
      }

      // User is eligible if activated but no activation bonus transaction
      const hasBonus = transactions && transactions.length > 0;
      setIsEligible(!hasBonus);
      setLoading(false);
    } catch (err) {
      console.error('Error checking eligibility:', err);
      setIsEligible(false);
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!address) return;

    setClaiming(true);
    setError(null);

    try {
      // Get user profile
      const profileResult = await supabaseService.getProfile(address);
      if (!profileResult.success || !profileResult.data) {
        throw new Error('Failed to get user profile');
      }

      const userId = profileResult.data.id;

      // Award 150 RZC activation bonus
      const rewardResult = await supabaseService.awardRZCTokens(
        userId,
        150,
        'activation_bonus',
        'Retroactive activation bonus - Welcome to RhizaCore!',
        {
          bonus_type: 'activation',
          retroactive: true,
          reason: 'Activated before bonus feature was implemented',
          wallet_address: address
        }
      );

      if (!rewardResult.success) {
        throw new Error(rewardResult.error || 'Failed to award bonus');
      }

      // Log activity
      const { notificationService } = await import('../services/notificationService');
      await notificationService.logActivity(
        address,
        'reward_claimed',
        'Claimed retroactive activation bonus - 150 RZC',
        {
          amount: 150,
          type: 'activation_bonus',
          retroactive: true,
          new_balance: rewardResult.newBalance
        }
      );

      setClaimed(true);
      setIsEligible(false);

      // Show success message
      success('🎉 Success! You received 150 RZC as your activation bonus. Thank you for being an early supporter!');

      // Reload page to update balance
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      console.error('Error claiming bonus:', err);
      setError(err.message || 'Failed to claim bonus. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  // Don't show if loading or not eligible
  if (loading || !isEligible) {
    return null;
  }

  // Show claimed state
  if (claimed) {
    return (
      <div className="p-3 sm:p-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10 border-2 border-emerald-300 dark:border-emerald-500/20 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
            <Check size={16} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[11px] sm:text-xs font-black text-emerald-900 dark:text-emerald-300 leading-tight mb-0.5">
              Bonus Claimed! 🎉
            </h3>
            <p className="text-[9px] sm:text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold truncate leading-snug">
              150 RZC added to your account.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show claim interface
  return (
    <div className="p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-500/10 dark:to-pink-500/10 border-2 border-purple-300 dark:border-purple-500/20 rounded-xl shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0 shadow-md animate-pulse">
            <Gift size={16} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[11px] sm:text-xs font-black text-purple-900 dark:text-purple-300 truncate leading-tight mb-0.5">
              Early Supporter! 🎁
            </h3>
            <p className="text-[9px] sm:text-[10px] text-purple-700 dark:text-purple-400 font-semibold truncate leading-snug">
              Claim your missing 150 RZC instantly.
            </p>
            {error && <p className="text-[8px] text-red-600 dark:text-red-400 truncate mt-0.5 font-bold">{error}</p>}
          </div>
        </div>

        <button
          onClick={handleClaim}
          disabled={claiming}
          className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 flex-shrink-0"
        >
          {claiming ? (
            <>
              <Loader size={12} className="animate-spin" />
              Claiming...
            </>
          ) : (
            <>
              Claim RZC
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ClaimActivationBonus;
