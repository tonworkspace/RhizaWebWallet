/**
 * TON Presale Payment Component
 * Handles TON-based payments for launchpad presales
 */

import React, { useState, useEffect } from 'react';
import { Loader2, AlertTriangle, Info, CheckCircle2, ExternalLink } from 'lucide-react';
import { tonWalletService } from '../services/tonWalletService';
import { tetherWdkService } from '../services/tetherWdkService';
import { launchpadService, LaunchpadProject } from '../services/launchpadService';

interface TonPresalePaymentProps {
  project: LaunchpadProject;
  userAddress: string;
  onSuccess: (txHash: string, tokensReceived: number) => void;
  onError: (error: string) => void;
}

export const TonPresalePayment: React.FC<TonPresalePaymentProps> = ({
  project,
  userAddress,
  onSuccess,
  onError,
}) => {
  const [amountTon, setAmountTon] = useState('');
  const [tonUsdPrice, setTonUsdPrice] = useState<number | null>(null);
  const [tonBalance, setTonBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingPrice, setIsFetchingPrice] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Fetch TON price on mount
  useEffect(() => {
    fetchTonPrice();
    fetchTonBalance();
  }, []);

  const fetchTonPrice = async () => {
    setIsFetchingPrice(true);
    const result = await launchpadService.getTonUsdPrice();
    if (result.success && result.price) {
      setTonUsdPrice(result.price);
    } else {
      setError('Failed to fetch TON price. Please try again.');
    }
    setIsFetchingPrice(false);
  };

  const fetchTonBalance = async () => {
    try {
      // Try WDK service first (if initialized)
      if (tetherWdkService.isTonReady()) {
        const balances = await tetherWdkService.getBalances();
        if (balances?.tonBalance) {
          setTonBalance(balances.tonBalance);
          return;
        }
      }

      // Fallback to tonWalletService
      if (tonWalletService.isInitialized()) {
        const result = await tonWalletService.getBalance();
        if (result.success) {
          setTonBalance(result.balance);
        }
      }
    } catch (err) {
      console.error('Failed to fetch TON balance:', err);
    }
  };

  const calculateUsdcEquivalent = (ton: string): number => {
    if (!ton || !tonUsdPrice) return 0;
    return parseFloat(ton) * tonUsdPrice;
  };

  const calculateTokens = (ton: string): number => {
    const usdcEquiv = calculateUsdcEquivalent(ton);
    return usdcEquiv * project.presale_rate;
  };

  const validateAmount = (val: string): string | null => {
    if (!val || !tonUsdPrice) return null;

    const tonNum = parseFloat(val);
    const usdcEquiv = calculateUsdcEquivalent(val);

    if (isNaN(tonNum) || tonNum <= 0) return 'Invalid amount';
    if (tonNum > parseFloat(tonBalance)) return 'Insufficient TON balance';
    if (usdcEquiv < project.min_purchase) {
      const minTon = (project.min_purchase / tonUsdPrice).toFixed(2);
      return `Minimum ${minTon} TON (~$${project.min_purchase})`;
    }
    if (usdcEquiv > project.max_purchase) {
      const maxTon = (project.max_purchase / tonUsdPrice).toFixed(2);
      return `Maximum ${maxTon} TON (~$${project.max_purchase})`;
    }
    if (project.raised_amount + usdcEquiv > project.hard_cap) {
      const remaining = project.hard_cap - project.raised_amount;
      const remainingTon = (remaining / tonUsdPrice).toFixed(2);
      return `Only ${remainingTon} TON remaining (~$${remaining.toFixed(2)})`;
    }

    return null;
  };

  const handleAmountChange = (val: string) => {
    setAmountTon(val);
    setError(validateAmount(val));
  };

  const handleBuy = () => {
    const validationError = validateAmount(amountTon);
    if (validationError) {
      setError(validationError);
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirm = async () => {
    if (!tonUsdPrice) {
      setError('TON price not available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const tonAmount = parseFloat(amountTon);
      
      // Determine which wallet service to use
      const walletService = tetherWdkService.isTonReady() 
        ? tetherWdkService 
        : tonWalletService;

      // Get presale wallet address (should be set in project)
      const presaleWallet = project.presale_wallet_address || project.presale_contract_address;
      
      if (!presaleWallet) {
        throw new Error('Presale wallet address not configured');
      }

      // Process payment through launchpad service
      const result = await launchpadService.processTonPayment({
        projectId: project.id,
        userAddress,
        amountTon: tonAmount,
        tonUsdPrice,
        walletService,
        presaleWalletAddress: presaleWallet,
      });

      if (!result.success) {
        throw new Error(result.error || 'Payment failed');
      }

      // Success!
      setShowConfirmModal(false);
      setAmountTon('');
      onSuccess(result.txHash!, result.tokensReceived!);
      
      // Refresh balance
      await fetchTonBalance();
    } catch (err: any) {
      console.error('TON payment failed:', err);
      const errorMsg = err.message || 'Transaction failed. Please try again.';
      setError(errorMsg);
      onError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const usdcEquivalent = calculateUsdcEquivalent(amountTon);
  const tokensToReceive = calculateTokens(amountTon);

  if (isFetchingPrice) {
    return (
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-slate-200 dark:border-white/10 shadow-sm p-6 text-center">
        <Loader2 size={32} className="text-emerald-500 animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-600 dark:text-slate-400">Loading TON price...</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
        {/* Info Banner */}
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-2.5 flex items-center justify-center gap-2">
          <Info size={14} className="text-white" />
          <span className="text-[10px] font-medium text-white">
            Pay with TON • Current Rate: ${tonUsdPrice?.toFixed(2)} USD
          </span>
        </div>

        <div className="p-4 space-y-4">
          {/* Balance Display */}
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 dark:text-slate-400">Your TON Balance</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {parseFloat(tonBalance).toFixed(4)} TON
            </span>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <div className="flex justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span>Amount (TON)</span>
              {amountTon && tonUsdPrice && (
                <span className="text-emerald-600 dark:text-emerald-400">
                  ≈ ${usdcEquivalent.toFixed(2)} USD
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                placeholder="0.0"
                value={amountTon}
                onChange={(e) => handleAmountChange(e.target.value)}
                step="0.01"
                className={`w-full bg-slate-50 dark:bg-[#12141A] border ${
                  error 
                    ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-400' 
                    : 'border-slate-200 dark:border-white/10 focus:border-blue-400 focus:ring-blue-400'
                } px-3 py-2.5 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-1 transition-all font-medium pr-16 text-sm`}
              />
              <button
                onClick={() => {
                  const maxTon = Math.min(
                    parseFloat(tonBalance),
                    project.max_purchase / (tonUsdPrice || 1)
                  );
                  handleAmountChange(maxTon.toFixed(4));
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors uppercase tracking-wider"
              >
                MAX
              </button>
            </div>

            {error && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                <AlertTriangle size={11} /> {error}
              </p>
            )}

            {amountTon && !error && tokensToReceive > 0 && (
              <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-lg p-2.5 border border-emerald-100 dark:border-emerald-500/20">
                <p className="text-[11px] text-emerald-900 dark:text-emerald-300 font-medium">
                  You will receive: <span className="font-bold">{tokensToReceive.toLocaleString()} {project.symbol}</span>
                </p>
              </div>
            )}
          </div>

          {/* Rate Info */}
          <div className="bg-slate-50 dark:bg-[#12141A] rounded-lg p-3 space-y-2 text-[11px] border border-slate-200 dark:border-white/10">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">TON Price</span>
              <span className="font-semibold text-slate-900 dark:text-white">${tonUsdPrice?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Token Rate</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                1 USD = {project.presale_rate} {project.symbol}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-white/10">
              <span className="text-slate-500 dark:text-slate-400">Network Fee</span>
              <span className="font-semibold text-slate-900 dark:text-white">~0.01 TON</span>
            </div>
          </div>

          {/* Buy Button */}
          <button
            onClick={handleBuy}
            disabled={!amountTon || !!error || isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-slate-200 disabled:to-slate-200 disabled:dark:from-slate-800 disabled:dark:to-slate-800 disabled:text-slate-400 text-white font-medium py-2.5 rounded-lg transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Processing...
              </>
            ) : (
              'Buy with TON'
            )}
          </button>

          {/* Info */}
          <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-blue-900 dark:text-blue-300 leading-relaxed">
                Payment will be sent directly to the project's TON wallet. Transaction is final and cannot be reversed.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-slate-200 dark:border-white/10 shadow-2xl max-w-md w-full animate-slideUp">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Confirm TON Payment</h3>
            </div>

            <div className="p-4 space-y-3">
              <div className="bg-slate-50 dark:bg-[#12141A] rounded-lg p-3 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Amount</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{amountTon} TON</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">USD Value</span>
                  <span className="font-semibold text-slate-900 dark:text-white">${usdcEquivalent.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">You receive</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {tokensToReceive.toLocaleString()} {project.symbol}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-slate-200 dark:border-white/10">
                  <span className="text-slate-500 dark:text-slate-400">Network Fee</span>
                  <span className="font-semibold text-slate-900 dark:text-white">~0.01 TON</span>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-900 dark:text-blue-300 leading-relaxed">
                    Please review carefully. This transaction cannot be reversed.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 p-4 border-t border-slate-200 dark:border-white/10">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Confirm Payment'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
