import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { useBalance } from '../hooks/useBalance';
import { Copy, Check, ExternalLink, Wallet as WalletIcon, AlertCircle, X, ChevronDown, ChevronUp } from 'lucide-react';

const WalletLockOverlay: React.FC = () => {
  const navigate = useNavigate();
  const { address, network } = useWallet();
  const { tonBalance, tonPrice, isLoading } = useBalance();
  const [copied, setCopied] = useState(false);
  const [showWalletInfo, setShowWalletInfo] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleActivate = () => {
    navigate('/wallet/sales-package');
  };

  const handleMigrate = () => {
    navigate('/wallet/migration');
  };

  const handleCopyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    // Store dismissal in localStorage so it doesn't show again this session
    localStorage.setItem('activation-banner-dismissed', 'true');
  };

  // Check if banner was previously dismissed
  React.useEffect(() => {
    const wasDismissed = localStorage.getItem('activation-banner-dismissed');
    if (wasDismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const hasLowBalance = tonBalance < 0.5; // Minimum recommended balance

  if (isDismissed) return null;

  return (
    <div className="fixed top-20 left-0 right-0 z-50 px-3 sm:px-6 animate-in slide-in-from-top-4 duration-500">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-br from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 rounded-2xl shadow-2xl border-2 border-blue-400 dark:border-blue-300 overflow-hidden">
          {/* Header Bar */}
          <div className="flex items-center justify-between p-4 bg-black/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-black text-sm sm:text-base">Wallet Not Activated</h3>
                <p className="text-white/80 text-xs">Activate to unlock full features</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? (
                  <ChevronUp size={20} className="text-white" />
                ) : (
                  <ChevronDown size={20} className="text-white" />
                )}
              </button>
              <button
                onClick={handleDismiss}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Dismiss"
              >
                <X size={20} className="text-white" />
              </button>
            </div>
          </div>

          {/* Expandable Content */}
          {isExpanded && (
            <div className="p-4 sm:p-6 space-y-4">
              <p className="text-white/90 text-sm sm:text-base">
                Choose how you'd like to get started with RhizaCore:
              </p>

              {/* Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Purchase Node Option */}
                <button
                  onClick={handleActivate}
                  className="p-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm border-2 border-white/20 rounded-xl transition-all text-left group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <WalletIcon size={20} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-bold text-sm mb-1">Purchase RhizaCore Node</h4>
                      <p className="text-white/70 text-xs">
                        Fund your wallet and buy a node to start earning
                      </p>
                    </div>
                  </div>
                </button>

                {/* Migrate Option */}
                <button
                  onClick={handleMigrate}
                  className="p-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm border-2 border-white/20 rounded-xl transition-all text-left group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <ExternalLink size={20} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-bold text-sm mb-1">Migrate from Pre-Mine</h4>
                      <p className="text-white/70 text-xs">
                        Transfer your RZC from old wallet to mainnet
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              {/* Wallet Balance Card */}
              <div className="p-4 bg-black/20 backdrop-blur-sm border border-white/20 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <WalletIcon size={14} className="text-white/70" />
                    <span className="text-xs font-bold text-white/70 uppercase tracking-wider">
                      Balance ({network === 'mainnet' ? 'Mainnet' : 'Testnet'})
                    </span>
                  </div>
                  {hasLowBalance && (
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                      <AlertCircle size={12} />
                      Low
                    </span>
                  )}
                </div>
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/50 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm text-white/70 font-semibold">Loading...</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-2xl font-black text-white">
                        {tonBalance.toFixed(4)} TON
                      </span>
                      <span className="text-sm text-white/70 font-semibold">
                        ≈ ${(tonBalance * tonPrice).toFixed(2)}
                      </span>
                    </div>
                    {hasLowBalance && (
                      <p className="text-xs text-amber-300 font-semibold mt-2">
                        You need at least 11 TON to purchase a node
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Wallet Address Section */}
              {!showWalletInfo ? (
                <button
                  onClick={() => setShowWalletInfo(true)}
                  className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                >
                  <WalletIcon size={16} />
                  Show Deposit Address
                </button>
              ) : (
                <div className="p-4 bg-black/20 backdrop-blur-sm border border-white/20 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white/70 uppercase tracking-wider">
                      Deposit Address
                    </span>
                    <button
                      onClick={() => setShowWalletInfo(false)}
                      className="text-xs text-white/70 hover:text-white font-semibold"
                    >
                      Hide
                    </button>
                  </div>
                  <div className="p-3 bg-black/30 rounded-lg mb-3 break-all">
                    <p className="text-xs font-mono text-white">
                      {address}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyAddress}
                      className="flex-1 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      {copied ? (
                        <>
                          <Check size={14} />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          Copy
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => navigate('/wallet/receive')}
                      className="flex-1 py-2 bg-white hover:bg-white/90 text-blue-600 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink size={14} />
                      QR Code
                    </button>
                  </div>
                  <p className="text-xs text-white/60 mt-3 text-center">
                    Send TON to this address from an exchange or wallet
                  </p>
                </div>
              )}

              {/* Dismiss Note */}
              <p className="text-xs text-white/60 text-center">
                You can dismiss this banner and explore the wallet. Activate anytime from the More menu.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletLockOverlay;
