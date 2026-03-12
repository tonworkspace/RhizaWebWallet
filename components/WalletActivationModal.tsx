import React, { useState } from 'react';
import { X, Lock, CheckCircle, AlertCircle, Zap, TrendingUp, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';

interface WalletActivationModalProps {
  onClose: () => void;
  onActivationComplete: () => void;
}

const WalletActivationModal: React.FC<WalletActivationModalProps> = ({
  onClose,
  onActivationComplete
}) => {
  const navigate = useNavigate();
  const { address } = useWallet();

  const handleSelectNode = (tier: 'standard' | 'premium' | 'vip') => {
    onClose();
    navigate('/wallet/sales-package', { state: { selectedTier: tier } });
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[400]" onClick={onClose} />

      {/* Modal - Responsive Container */}
      <div className="fixed inset-0 z-[401] flex items-center justify-center p-3 sm:p-4">
        <div className="w-full max-w-2xl bg-white dark:bg-[#0a0a0a] border-2 border-gray-300 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col">
          {/* Header - Sticky */}
          <div className="p-4 sm:p-6 border-b-2 border-gray-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a] flex-shrink-0">
            <div className="flex items-start sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <Lock size={20} className="sm:hidden text-white" />
                  <Lock size={24} className="hidden sm:block text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base sm:text-xl font-black text-gray-950 dark:text-white leading-tight">
                    Activate Your Wallet
                  </h2>
                  <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-semibold mt-0.5">
                    Choose a mining node to unlock your wallet
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
              >
                <X size={18} className="sm:hidden text-gray-600 dark:text-gray-400" />
                <X size={20} className="hidden sm:block text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
            {/* Info Box */}
            <div className="p-3 sm:p-4 bg-purple-50 dark:bg-purple-500/10 border-2 border-purple-200 dark:border-purple-500/20 rounded-xl">
              <h3 className="text-xs sm:text-sm font-bold text-purple-900 dark:text-purple-300 mb-1.5 sm:mb-2">
                Activate by Purchasing a Mining Node
              </h3>
              <p className="text-[10px] sm:text-xs text-purple-700 dark:text-purple-400 font-semibold leading-relaxed">
                Your wallet activation is included when you purchase any mining node. Start earning daily RZC rewards immediately while unlocking full wallet features!
              </p>
            </div>

            {/* Node Tiers */}
            <div className="space-y-2.5 sm:space-y-3">
              <h3 className="text-[10px] sm:text-sm font-black uppercase tracking-widest text-gray-600 dark:text-gray-500">
                Choose Your Node Tier
              </h3>

              {/* Standard Tier */}
              <button
                onClick={() => handleSelectNode('standard')}
                className="w-full p-3.5 sm:p-5 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 hover:border-emerald-500 dark:hover:border-primary rounded-xl transition-all text-left group active:scale-[0.98]"
              >
                <div className="flex items-start gap-2.5 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-amber-600 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Zap size={20} className="sm:hidden text-white" fill="white" />
                    <Zap size={24} className="hidden sm:block text-white" fill="white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5 sm:mb-2 gap-2">
                      <h4 className="text-sm sm:text-lg font-black text-gray-950 dark:text-white">
                        Standard Nodes
                      </h4>
                      <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-primary whitespace-nowrap">
                        $100 - $400
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-semibold mb-2 sm:mb-3 leading-relaxed">
                      Perfect for beginners. Start earning 10-60 RZC per day with base mining speed.
                    </p>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      <span className="text-[9px] sm:text-[10px] font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/10 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                        10-60 RZC/day
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/10 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                        $15 activation
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/10 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                        5% referral
                      </span>
                    </div>
                  </div>
                </div>
              </button>

              {/* Premium Tier */}
              <button
                onClick={() => handleSelectNode('premium')}
                className="w-full p-3.5 sm:p-5 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-500/10 dark:to-amber-500/10 border-2 border-yellow-300 dark:border-yellow-500/30 hover:border-yellow-500 dark:hover:border-yellow-400 rounded-xl transition-all text-left group relative overflow-hidden active:scale-[0.98]"
              >
                <div className="absolute top-2 sm:top-3 right-2 sm:right-3">
                  <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-wider bg-yellow-600 text-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
                    Best Value
                  </span>
                </div>
                <div className="flex items-start gap-2.5 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <TrendingUp size={20} className="sm:hidden text-white" />
                    <TrendingUp size={24} className="hidden sm:block text-white" />
                  </div>
                  <div className="flex-1 min-w-0 pr-12 sm:pr-16">
                    <div className="flex items-center justify-between mb-1.5 sm:mb-2 gap-2">
                      <h4 className="text-sm sm:text-lg font-black text-gray-950 dark:text-white">
                        Premium Nodes
                      </h4>
                      <span className="text-xs sm:text-sm font-bold text-yellow-700 dark:text-yellow-400 whitespace-nowrap">
                        $500 - $1K
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300 font-semibold mb-2 sm:mb-3 leading-relaxed">
                      For serious miners. 2-4x mining power with instant withdrawals and early access.
                    </p>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      <span className="text-[9px] sm:text-[10px] font-bold text-yellow-800 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-500/20 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                        100-250 RZC/day
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-bold text-yellow-800 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-500/20 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                        $45 activation
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-bold text-yellow-800 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-500/20 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                        7% referral
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-bold text-yellow-800 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-500/20 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                        Priority support
                      </span>
                    </div>
                  </div>
                </div>
              </button>

              {/* VIP Tier */}
              <button
                onClick={() => handleSelectNode('vip')}
                className="w-full p-3.5 sm:p-5 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-500/10 dark:to-pink-500/10 border-2 border-purple-300 dark:border-purple-500/30 hover:border-purple-500 dark:hover:border-purple-400 rounded-xl transition-all text-left group relative overflow-hidden active:scale-[0.98]"
              >
                <div className="absolute top-2 sm:top-3 right-2 sm:right-3">
                  <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-wider bg-gradient-to-r from-purple-600 to-pink-600 text-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
                    Shareholder
                  </span>
                </div>
                <div className="flex items-start gap-2.5 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Crown size={20} className="sm:hidden text-white" />
                    <Crown size={24} className="hidden sm:block text-white" />
                  </div>
                  <div className="flex-1 min-w-0 pr-16 sm:pr-20">
                    <div className="flex items-center justify-between mb-1.5 sm:mb-2 gap-2">
                      <h4 className="text-sm sm:text-lg font-black text-gray-950 dark:text-white leading-tight">
                        VIP Shareholder
                      </h4>
                      <span className="text-xs sm:text-sm font-bold text-purple-700 dark:text-purple-400 whitespace-nowrap">
                        $2K - $10K
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300 font-semibold mb-2 sm:mb-3 leading-relaxed">
                      Become an ecosystem shareholder. Earn up to 3000 RZC/day + 20% monthly revenue share + NFT certificate.
                    </p>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      <span className="text-[9px] sm:text-[10px] font-bold text-purple-800 dark:text-purple-300 bg-purple-100 dark:bg-purple-500/20 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                        400-3000 RZC/day
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-bold text-purple-800 dark:text-purple-300 bg-purple-100 dark:bg-purple-500/20 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                        $120 activation
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-bold text-purple-800 dark:text-purple-300 bg-purple-100 dark:bg-purple-500/20 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                        5-20% revenue
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-bold text-purple-800 dark:text-purple-300 bg-purple-100 dark:bg-purple-500/20 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                        NFT certificate
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-bold text-purple-800 dark:text-purple-300 bg-purple-100 dark:bg-purple-500/20 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                        Governance
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* Benefits */}
            <div className="hidden p-3 sm:p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
              <h4 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-500 mb-2 sm:mb-3">
                What You Get
              </h4>
              <ul className="space-y-1.5 sm:space-y-2 text-[10px] sm:text-xs text-gray-700 dark:text-gray-400 font-semibold">
                <li className="flex items-start gap-1.5 sm:gap-2">
                  <CheckCircle size={12} className="sm:hidden text-emerald-600 dark:text-primary flex-shrink-0 mt-0.5" />
                  <CheckCircle size={14} className="hidden sm:block text-emerald-600 dark:text-primary flex-shrink-0 mt-0.5" />
                  <span>Wallet fully activated with all features unlocked</span>
                </li>
                <li className="flex items-start gap-1.5 sm:gap-2">
                  <CheckCircle size={12} className="sm:hidden text-emerald-600 dark:text-primary flex-shrink-0 mt-0.5" />
                  <CheckCircle size={14} className="hidden sm:block text-emerald-600 dark:text-primary flex-shrink-0 mt-0.5" />
                  <span>Daily RZC rewards automatically credited</span>
                </li>
                <li className="flex items-start gap-1.5 sm:gap-2">
                  <CheckCircle size={12} className="sm:hidden text-emerald-600 dark:text-primary flex-shrink-0 mt-0.5" />
                  <CheckCircle size={14} className="hidden sm:block text-emerald-600 dark:text-primary flex-shrink-0 mt-0.5" />
                  <span>Access to referral system and earn commissions</span>
                </li>
                <li className="flex items-start gap-1.5 sm:gap-2">
                  <CheckCircle size={12} className="sm:hidden text-emerald-600 dark:text-primary flex-shrink-0 mt-0.5" />
                  <CheckCircle size={14} className="hidden sm:block text-emerald-600 dark:text-primary flex-shrink-0 mt-0.5" />
                  <span>Full ecosystem access (staking, marketplace, etc.)</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Footer - Sticky */}
          <div className="p-4 sm:p-6 border-t-2 border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex-shrink-0">
            <p className="text-[10px] sm:text-xs text-center text-gray-600 dark:text-gray-400 font-semibold leading-relaxed">
              Your wallet will be automatically activated upon successful node purchase
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default WalletActivationModal;
