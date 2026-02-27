import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { useBalance } from '../hooks/useBalance';
import { Copy, Check, ExternalLink, Wallet as WalletIcon, AlertCircle } from 'lucide-react';

const WalletLockOverlay: React.FC = () => {
  const navigate = useNavigate();
  const { address, network } = useWallet();
  const { tonBalance, tonPrice, isLoading } = useBalance();
  const [copied, setCopied] = useState(false);
  const [showWalletInfo, setShowWalletInfo] = useState(false);

  const handleActivate = () => {
    navigate('/wallet/mining');
  };

  const handleCopyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const hasLowBalance = tonBalance < 0.5; // Minimum recommended balance

  return (
    <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center animate-in fade-in slide-in-from-bottom-8 duration-500">
        <div className="w-20 h-20 bg-gray-900 dark:bg-white/5 border-2 border-gray-700 dark:border-white/10 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
          <svg className="w-8 h-8 text-gray-500 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-4xl font-black tracking-tight mb-4 text-white">
          RhizaCore Wallet
        </h1>
        <p className="text-gray-400 text-lg mb-6 font-semibold">
          Your wallet is currently inactive. Fund your wallet and purchase a mining node to unlock the ecosystem.
        </p>

        {/* Wallet Balance Card */}
        <div className="mb-6 p-4 bg-white/5 border-2 border-white/10 rounded-2xl text-left">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <WalletIcon size={16} className="text-gray-400" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Your Balance ({network === 'mainnet' ? 'Mainnet' : 'Testnet'})
              </span>
            </div>
            {hasLowBalance && (
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                <AlertCircle size={12} />
                Low
              </span>
            )}
          </div>
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-gray-400 font-semibold">Loading...</span>
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-2xl font-black text-white">
                  {tonBalance.toFixed(4)} TON
                </span>
                <span className="text-sm text-gray-400 font-semibold">
                  ≈ ${(tonBalance * tonPrice).toFixed(2)}
                </span>
              </div>
              {hasLowBalance && (
                <p className="text-xs text-amber-400 font-semibold mt-2">
                  You need at least 0.5 TON to purchase a mining node
                </p>
              )}
            </>
          )}
        </div>

        {/* Wallet Address Section */}
        {!showWalletInfo ? (
          <button
            onClick={() => setShowWalletInfo(true)}
            className="w-full mb-4 py-3 bg-white/10 hover:bg-white/20 border-2 border-white/20 text-white rounded-2xl font-bold text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <WalletIcon size={18} />
            Show Wallet Address
          </button>
        ) : (
          <div className="mb-4 p-4 bg-white/5 border-2 border-white/10 rounded-2xl text-left animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Deposit Address
              </span>
              <button
                onClick={() => setShowWalletInfo(false)}
                className="text-xs text-gray-400 hover:text-white font-semibold"
              >
                Hide
              </button>
            </div>
            <div className="p-3 bg-black/30 rounded-xl mb-3 break-all">
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
                    Copy Address
                  </>
                )}
              </button>
              <button
                onClick={() => navigate('/wallet/receive')}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <ExternalLink size={14} />
                View QR Code
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">
              Send TON to this address from an exchange or another wallet
            </p>
          </div>
        )}

        {/* Main Action Button */}
        <button
          onClick={handleActivate}
          className="w-full py-5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-3xl font-bold text-lg shadow-2xl shadow-blue-500/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          View Mining Nodes
        </button>
        <p className="mt-8 text-xs text-gray-600 uppercase tracking-widest font-bold">
          Step 1: Fund Wallet • Step 2: Purchase Node
        </p>
      </div>
    </div>
  );
};

export default WalletLockOverlay;
