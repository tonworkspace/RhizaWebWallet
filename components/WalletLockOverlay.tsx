import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { useBalance } from '../hooks/useBalance';
import { useActivationModal } from '../context/ActivationModalContext';
import { Copy, Check, ExternalLink, Wallet as WalletIcon, AlertCircle, X, CheckCircle, Lock, ArrowRight } from 'lucide-react';

const WalletLockOverlay: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { address, network, isActivated } = useWallet();
  const { tonBalance, tonPrice, isLoading } = useBalance();
  const { isModalOpen, hideActivationModal } = useActivationModal();
  const [copied, setCopied] = useState(false);
  const [showWalletInfo, setShowWalletInfo] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Auto-close modal when user is activated or navigates to activation pages
  useEffect(() => {
    if (isActivated) {
      hideActivationModal();
      return;
    }

    // Auto-close when navigating to activation-related pages
    const activationPages = ['/wallet/sales-package', '/wallet/migration', '/wallet/receive'];
    if (activationPages.some(page => location.pathname.startsWith(page))) {
      hideActivationModal();
    }
  }, [isActivated, location.pathname, hideActivationModal]);

  // Reset navigation state when modal closes
  useEffect(() => {
    if (!isModalOpen) {
      setIsNavigating(false);
    }
  }, [isModalOpen]);

  const handleActivate = () => {
    setIsNavigating(true);
    hideActivationModal();
    // Small delay to ensure modal closes before navigation
    setTimeout(() => {
      navigate('/wallet/sales-package');
    }, 100);
  };

  const handleMigrate = () => {
    setIsNavigating(true);
    hideActivationModal();
    setTimeout(() => {
      navigate('/wallet/migration');
    }, 100);
  };

  const handleCopyAddress = async () => {
    if (address) {
      try {
        await navigator.clipboard.writeText(address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy address:', error);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = address;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleReceiveQR = () => {
    hideActivationModal();
    setTimeout(() => {
      navigate('/wallet/receive');
    }, 100);
  };

  const handleDismiss = () => {
    hideActivationModal();
    // Modal will reappear when user clicks restricted features
  };

  const hasLowBalance = tonBalance < 0.5;

  if (!isModalOpen || isActivated) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-3 sm:p-4">
      <div className="relative w-full max-w-md bg-white dark:bg-[#0a0a0a] rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-gray-200 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          disabled={isNavigating}
          className="absolute top-3 right-3 p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors z-10 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Dismiss"
        >
          <X size={18} className="text-gray-600 dark:text-gray-400" />
        </button>

        {/* Loading Overlay */}
        {isNavigating && (
          <div className="absolute inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-sm z-20 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                Opening activation page...
              </p>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-5 sm:p-7 text-center space-y-4 sm:space-y-5">

          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center ring-4 ring-amber-100/50 dark:ring-amber-500/10">
              <Lock size={28} className="text-amber-600 dark:text-amber-400" />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-tight">
              Node Activation Required
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium px-2">
              Unlock all platform features with node activation
            </p>
          </div>

          {/* Benefits List - Professional Grid Layout */}
          <div className="space-y-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-600">
              Activation Benefits
            </p>
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {[
                { icon: '🎯', title: 'Full Access', desc: 'All features unlocked' },
                { icon: '💰', title: 'Earn Rewards', desc: 'Referral bonuses' },
                { icon: '📈', title: 'Higher Limits', desc: 'Trade & stake more' },
                { icon: '⚡', title: 'Priority Support', desc: 'Fast assistance' }
              ].map((benefit, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-left hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg leading-none">{benefit.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-gray-900 dark:text-white leading-tight">
                        {benefit.title}
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                        {benefit.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Balance Info (if low) - Enhanced */}
          {hasLowBalance && !isLoading && (
            <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <AlertCircle size={14} className="text-amber-600 dark:text-amber-400" />
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Balance Check
                </span>
              </div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                {tonBalance.toFixed(4)} TON ≈ ${(tonBalance * tonPrice).toFixed(2)}
              </p>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                Minimum $18 worth of TON required for node activation.
              </p>
            </div>
          )}

          {/* Action Buttons - Enhanced with loading states */}
          <div className="space-y-2.5 pt-1">
            <button
              onClick={handleActivate}
              disabled={isNavigating}
              className="w-full py-3 sm:py-3.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 text-white rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2"
            >
              {isNavigating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Opening...
                </>
              ) : (
                <>
                  Activate Now
                  <ArrowRight size={14} />
                </>
              )}
            </button>

            <button
              onClick={handleMigrate}
              disabled={isNavigating}
              className="w-full py-3 sm:py-3.5 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 disabled:bg-gray-100 dark:disabled:bg-white/5 border-2 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white disabled:text-gray-500 dark:disabled:text-gray-500 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2"
            >
              {isNavigating ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin" />
                  Opening...
                </>
              ) : (
                <>
                  Migrate Pre-Mine
                  <ArrowRight size={14} />
                </>
              )}
            </button>

            <button
              onClick={handleDismiss}
              disabled={isNavigating}
              className="w-full py-2.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:text-gray-400 dark:disabled:text-gray-600 font-bold text-xs sm:text-sm transition-colors disabled:cursor-not-allowed"
            >
              Explore First
            </button>
          </div>

          {/* Wallet Info Toggle - Compact */}
          {!showWalletInfo ? (
            <button
              onClick={() => setShowWalletInfo(true)}
              className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-bold underline transition-colors"
            >
              Need to deposit? Show address
            </button>
          ) : (
            <div className="p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-600">
                  Deposit Address
                </span>
                <button
                  onClick={() => setShowWalletInfo(false)}
                  className="text-[10px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-bold"
                >
                  Hide
                </button>
              </div>
              <div className="p-2.5 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg break-all">
                <p className="text-[10px] sm:text-xs font-mono text-gray-700 dark:text-gray-300">
                  {address}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyAddress}
                  className="flex-1 py-2 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1"
                >
                  {copied ? (
                    <>
                      <Check size={12} />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      Copy
                    </>
                  )}
                </button>
                <button
                  onClick={handleReceiveQR}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1"
                >
                  <ExternalLink size={12} />
                  QR Code
                </button>
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-600 text-center">
                Send TON from exchange or wallet
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletLockOverlay;
