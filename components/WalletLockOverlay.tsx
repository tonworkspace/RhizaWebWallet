import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { useActivationModal } from '../context/ActivationModalContext';
import { X, Sparkles, ArrowRight, CheckCircle, FileText, Zap } from 'lucide-react';

const WalletLockOverlay: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { address } = useWallet();
  const { isModalOpen, hideActivationModal, showActivationModal } = useActivationModal();
  const [isNavigating, setIsNavigating] = useState(false);
  const [activeTab, setActiveTab] = useState<'welcome' | 'changelog'>('welcome');

  // Check if user should see modal (3 times per day)
  const shouldShowModal = () => {
    const lastShownKey = 'rhiza_modal_last_shown';
    const showCountKey = 'rhiza_modal_show_count';
    const lastShown = localStorage.getItem(lastShownKey);
    const showCount = parseInt(localStorage.getItem(showCountKey) || '0');
    
    const now = Date.now();
    const eightHours = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
    
    // If never shown or last shown was more than 8 hours ago
    if (!lastShown || (now - parseInt(lastShown)) > eightHours) {
      // Reset count if it's a new day
      const lastShownDate = lastShown ? new Date(parseInt(lastShown)).toDateString() : '';
      const todayDate = new Date().toDateString();
      
      if (lastShownDate !== todayDate) {
        localStorage.setItem(showCountKey, '0');
        return true;
      }
      
      // Show if count is less than 3
      if (showCount < 3) {
        return true;
      }
    }
    
    return false;
  };

  const markModalShown = () => {
    const lastShownKey = 'rhiza_modal_last_shown';
    const showCountKey = 'rhiza_modal_show_count';
    const showCount = parseInt(localStorage.getItem(showCountKey) || '0');
    
    localStorage.setItem(lastShownKey, Date.now().toString());
    localStorage.setItem(showCountKey, (showCount + 1).toString());
  };

  // Auto-show welcome modal 3 times per day
  useEffect(() => {
    if (address && !isModalOpen && shouldShowModal()) {
      const timer = setTimeout(() => {
        const skipPages = ['/wallet/login', '/wallet/register'];
        if (!skipPages.some(page => location.pathname.includes(page))) {
          showActivationModal();
          markModalShown();
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [address, location.pathname, isModalOpen, showActivationModal]);

  // Reset navigation state and tab when modal closes
  useEffect(() => {
    if (!isModalOpen) {
      setIsNavigating(false);
      setActiveTab('welcome');
    }
  }, [isModalOpen]);

  const handleDismiss = () => {
    hideActivationModal();
  };

  const handleBuyRZC = () => {
    setIsNavigating(true);
    hideActivationModal();
    setTimeout(() => {
      navigate('/wallet/sales-package');
    }, 100);
  };

  const handleExplore = () => {
    hideActivationModal();
  };

  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-3 sm:p-4">
      <div className="relative w-full max-w-lg bg-gradient-to-br from-white via-white to-emerald-50/30 dark:from-[#0a0a0a] dark:via-[#0a0a0a] dark:to-emerald-950/20 rounded-3xl shadow-2xl border-2 border-emerald-200/50 dark:border-emerald-500/20 overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">

        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-400/20 to-pink-400/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          disabled={isNavigating}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors z-10 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Dismiss"
        >
          <X size={20} className="text-gray-600 dark:text-gray-400" />
        </button>

        {/* Loading Overlay */}
        {isNavigating && (
          <div className="absolute inset-0 bg-white/90 dark:bg-black/90 backdrop-blur-sm z-20 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                Loading...
              </p>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="relative border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-center gap-2 px-6 pt-6">
            <button
              onClick={() => setActiveTab('welcome')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold text-sm transition-all ${
                activeTab === 'welcome'
                  ? 'bg-white dark:bg-white/10 text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Sparkles size={16} />
              Welcome
            </button>
            <button
              onClick={() => setActiveTab('changelog')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold text-sm transition-all ${
                activeTab === 'changelog'
                  ? 'bg-white dark:bg-white/10 text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <FileText size={16} />
              What's New
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="relative p-6 sm:p-8 text-center space-y-5">

          {/* Welcome Tab Content */}
          {activeTab === 'welcome' && (
            <>
              {/* Welcome Icon */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center ring-8 ring-emerald-100/50 dark:ring-emerald-500/20 shadow-lg">
                    <Sparkles size={36} className="text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center animate-bounce">
                    <span className="text-lg">👋</span>
                  </div>
                </div>
              </div>

          {/* Welcome Message */}
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white leading-tight">
              Welcome to RhizaCore!
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 font-medium max-w-md mx-auto leading-relaxed">
              Your decentralized identity and affiliate income network on TON blockchain
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-3 gap-3 py-4">
            {[
              { icon: '💰', label: 'Earn RZC', desc: 'Buy & hold' },
              { icon: '🎁', label: 'Referrals', desc: 'Get bonuses' },
              { icon: '⚡', label: 'Fast', desc: 'Instant' }
            ].map((feature, index) => (
              <div
                key={index}
                className="p-3 bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-2xl hover:scale-105 transition-transform"
              >
                <div className="text-2xl mb-1">{feature.icon}</div>
                <p className="text-xs font-black text-gray-900 dark:text-white mb-0.5">
                  {feature.label}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Get Started Section */}
          <div className="space-y-3 pt-2">
            <p className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-600">
              Get Started Today
            </p>
            
            {/* Buy RZC - Primary CTA */}
            <button
              onClick={handleBuyRZC}
              disabled={isNavigating}
              className="w-full p-5 bg-gradient-to-br from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-50 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:scale-100 text-center group shadow-lg shadow-emerald-500/30"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Sparkles size={32} className="text-white" />
                </div>
                <div>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <p className="text-xl font-black text-white uppercase tracking-wide">
                      Buy RZC Tokens
                    </p>
                    <span className="text-[9px] font-black px-2 py-0.5 bg-white/30 text-white rounded-full uppercase tracking-wider">
                      HOT
                    </span>
                  </div>
                  <p className="text-sm text-white/90 font-medium leading-relaxed mb-3">
                    Start earning with RZC tokens and unlock exclusive features
                  </p>
                  <div className="flex items-center justify-center gap-1 text-white font-bold text-sm uppercase tracking-wider">
                    Get Started Now <ArrowRight size={16} />
                  </div>
                </div>
              </div>
            </button>

            {/* Benefits Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-emerald-200 dark:border-emerald-500/20 rounded-xl">
                <div className="text-2xl mb-1">🎁</div>
                <p className="text-xs font-black text-gray-900 dark:text-white">
                  Referral Bonuses
                </p>
                <p className="text-[10px] text-gray-600 dark:text-gray-400">
                  Earn from network
                </p>
              </div>
              <div className="p-3 bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-emerald-200 dark:border-emerald-500/20 rounded-xl">
                <div className="text-2xl mb-1">📈</div>
                <p className="text-xs font-black text-gray-900 dark:text-white">
                  Early Access
                </p>
                <p className="text-[10px] text-gray-600 dark:text-gray-400">
                  ICO pricing
                </p>
              </div>
            </div>

            {/* Explore Button */}
            <button
              onClick={handleExplore}
              disabled={isNavigating}
              className="w-full py-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:text-gray-400 dark:disabled:text-gray-600 font-bold text-sm transition-colors disabled:cursor-not-allowed"
            >
              I'll Explore First
            </button>
          </div>

              {/* Trust Indicators */}
              <div className="pt-4 border-t border-gray-200 dark:border-white/10">
                <div className="flex items-center justify-center gap-6 text-xs text-gray-500 dark:text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="font-bold">Secure</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <span className="font-bold">On-Chain</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                    <span className="font-bold">Non-Custodial</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Changelog Tab Content */}
          {activeTab === 'changelog' && (
            <>
              {/* Changelog Icon */}
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center ring-8 ring-blue-100/50 dark:ring-blue-500/20 shadow-lg">
                  <Zap size={36} className="text-white" />
                </div>
              </div>

              {/* Changelog Header */}
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white leading-tight">
                  System Updates
                </h2>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 font-medium max-w-md mx-auto leading-relaxed">
                  All systems are now fully operational
                </p>
              </div>

              {/* Changelog Items */}
              <div className="space-y-3 text-left max-h-[400px] overflow-y-auto">
                {/* Latest Update */}
                <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/20 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
                      <CheckCircle size={18} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-black text-emerald-900 dark:text-emerald-300">
                          All Systems Operational
                        </h3>
                        <span className="text-[9px] font-black px-2 py-0.5 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-full">
                          LIVE
                        </span>
                      </div>
                      <p className="text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
                        Platform running at 100% capacity. All features are now available.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Feature Updates */}
                <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <Sparkles size={18} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-black text-blue-900 dark:text-blue-300 mb-1">
                        Enhanced Features
                      </h3>
                      <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                        <li>✅ Multi-chain wallet support (BTC, ETH, SOL, TRON)</li>
                        <li>✅ Real-time portfolio tracking</li>
                        <li>✅ Enhanced security & encryption</li>
                        <li>✅ Improved notification system</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Performance Updates */}
                <div className="p-4 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center flex-shrink-0">
                      <Zap size={18} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-black text-purple-900 dark:text-purple-300 mb-1">
                        Performance Improvements
                      </h3>
                      <ul className="text-xs text-purple-800 dark:text-purple-200 space-y-1">
                        <li>⚡ 50% faster transaction processing</li>
                        <li>⚡ Optimized balance syncing</li>
                        <li>⚡ Reduced API response times</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Bug Fixes */}
                <div className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-500 flex items-center justify-center flex-shrink-0">
                      <CheckCircle size={18} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-black text-gray-900 dark:text-white mb-1">
                        Bug Fixes & Stability
                      </h3>
                      <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
                        <li>🔧 Fixed ICO banner display issues</li>
                        <li>🔧 Resolved balance verification bugs</li>
                        <li>🔧 Improved modal behavior</li>
                        <li>🔧 Enhanced error handling</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={handleExplore}
                disabled={isNavigating}
                className="w-full py-3 bg-gradient-to-br from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 text-white font-bold text-sm rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Got It!
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletLockOverlay;
