import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Package,
  TrendingUp,
  Shield,
  Crown,
  Check,
  Sparkles,
  Users,
  Percent,
  Gift,
  ArrowRight,
  Info,
  Wallet as WalletIcon,
  AlertCircle,
  ExternalLink,
  DollarSign,
  Store,
  ShieldCheck,
  Star,
  Lock,
  Zap,
  X
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { useToast } from '../context/ToastContext';
import { useBalance } from '../hooks/useBalance';
import { usePurchaseModal } from '../context/PurchaseModalContext';
import { SalesPackage } from '../types';
import StoreUI from '../components/StoreUI';



const MiningNodes: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { address, network, isActivated, activatedAt, activationFeePaid, userProfile } = useWallet();
  const { tonBalance, tonPrice, isLoading: balanceLoading } = useBalance();
  const toast = useToast();
  const [selectedTier, setSelectedTier] = useState<'starter' | 'professional' | 'enterprise' | 'store'>('starter');
  const { openPurchaseModal } = usePurchaseModal();
  const [purchasedPackages, setPurchasedPackages] = useState<string[]>([]);
  const [showActivationBanner, setShowActivationBanner] = useState(true);

  // Auto-hide the activation banner to save screen space
  useEffect(() => {
    if (showActivationBanner) {
      const timer = setTimeout(() => {
        setShowActivationBanner(false);
      }, 8000); // 8 seconds before auto-dismiss
      return () => clearTimeout(timer);
    }
  }, [showActivationBanner]);

  // Check if tier was passed from navigation state (e.g., from activation modal)
  useEffect(() => {
    if (location.state?.selectedTier) {
      setSelectedTier(location.state.selectedTier);
      // Clear the state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Load purchased packages from localStorage
  useEffect(() => {
    if (address) {
      const stored = localStorage.getItem(`purchased_packages_${address}`);
      if (stored) {
        try {
          setPurchasedPackages(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse purchased packages:', e);
        }
      }
    }
  }, [address]);

  const salesPackages: SalesPackage[] = [
    // Test Package (Only visible in testnet or development)
    ...(network === 'testnet' || import.meta.env.DEV ? [{
      id: 'test-001',
      tier: 'starter' as const,
      tierName: 'Test Package',
      pricePoint: 0,
      activationFee: 0.01, // Always 0.2 TON for testing
      rzcReward: 10,
      directReferralBonus: 10,
      teamSalesBonus: 1,
      features: ['Test Activation', '10 RZC Instant', 'For Testing Only', '0.2 TON Only'],
      gradient: 'from-green-600 to-emerald-600',
      icon: Package,
      badge: 'Test'
    }] : []),

    // Activation Only - $18 One-Time Fee
    {
      id: 'activation-only',
      tier: 'starter',
      tierName: 'Wallet Activation',
      pricePoint: 0,
      activationFee: 18,
      rzcReward: 42, // $5 worth at $0.12/RZC
      directReferralBonus: 10,
      teamSalesBonus: 0,
      features: [
        'Unlock Full Wallet Access',
        '$5 Welcome Bonus (42 RZC)',
        '10% Referral Commission Earned',
        'One-Time Payment',
        'Access All Features',
        'Lifetime Activation'
      ],
      gradient: 'from-blue-600 to-indigo-600',
      icon: Shield,
      badge: 'Activation'
    },

    // Starter Tier - Entry Level Packages
    {
      id: 'starter-100',
      tier: 'starter',
      tierName: 'Bronze Package',
      pricePoint: 100,
      activationFee: isActivated ? 0 : 18,
      rzcReward: 833,
      directReferralBonus: 10,
      teamSalesBonus: 1,
      features: ['833 RZC Instant', '10% Direct Referral Bonus', '1% Weekly Team Sales', 'Standard Support'],
      gradient: 'from-amber-600 to-orange-600',
      icon: Package
    },
    {
      id: 'starter-200',
      tier: 'starter',
      tierName: 'Bronze+ Package',
      pricePoint: 200,
      activationFee: isActivated ? 0 : 18,
      rzcReward: 2083,
      directReferralBonus: 10,
      teamSalesBonus: 1,
      features: ['2,083 RZC Instant', '10% Direct Referral Bonus', '1% Weekly Team Sales', 'Standard Support'],
      gradient: 'from-amber-600 to-orange-600',
      icon: Package,
      badge: 'Popular'
    },
    {
      id: 'starter-300',
      tier: 'starter',
      tierName: 'Silver Package',
      pricePoint: 300,
      activationFee: isActivated ? 0 : 18,
      rzcReward: 3333,
      directReferralBonus: 10,
      teamSalesBonus: 1,
      features: ['3,333 RZC Instant', '10% Direct Referral Bonus', '1% Weekly Team Sales', 'Priority Support'],
      gradient: 'from-gray-400 to-gray-600',
      icon: Package
    },
    {
      id: 'starter-400',
      tier: 'starter',
      tierName: 'Silver+ Package',
      pricePoint: 400,
      activationFee: isActivated ? 0 : 18,
      rzcReward: 5000,
      directReferralBonus: 10,
      teamSalesBonus: 1,
      features: ['5,000 RZC Instant', '10% Direct Referral Bonus', '1% Weekly Team Sales', 'Priority Support'],
      gradient: 'from-gray-400 to-gray-600',
      icon: Package
    },

    // Professional Tier - Mid-Level Packages
    {
      id: 'pro-500',
      tier: 'professional',
      tierName: 'Gold Package',
      pricePoint: 500,
      activationFee: isActivated ? 0 : 18,
      rzcReward: 8333,
      directReferralBonus: 10,
      teamSalesBonus: 1,
      features: ['8,333 RZC Instant', '10% Direct Referral Bonus', '1% Weekly Team Sales', 'Premium Support', 'Early Beta Access'],
      gradient: 'from-yellow-500 to-amber-600',
      icon: TrendingUp,
      badge: 'Best Value'
    },
    {
      id: 'pro-600',
      tier: 'professional',
      tierName: 'Gold+ Package',
      pricePoint: 600,
      activationFee: isActivated ? 0 : 18,
      rzcReward: 10833,
      directReferralBonus: 10,
      teamSalesBonus: 1,
      features: ['10,833 RZC Instant', '10% Direct Referral Bonus', '1% Weekly Team Sales', 'Premium Support', 'Early Beta Access'],
      gradient: 'from-yellow-500 to-amber-600',
      icon: TrendingUp
    },
    {
      id: 'pro-700',
      tier: 'professional',
      tierName: 'Platinum Package',
      pricePoint: 700,
      activationFee: isActivated ? 0 : 18,
      rzcReward: 13333,
      directReferralBonus: 10,
      teamSalesBonus: 1,
      features: ['13,333 RZC Instant', '10% Direct Referral Bonus', '1% Weekly Team Sales', 'VIP Support', 'Early Beta Access'],
      gradient: 'from-cyan-500 to-blue-600',
      icon: TrendingUp
    },
    {
      id: 'pro-1000',
      tier: 'professional',
      tierName: 'Platinum+ Package',
      pricePoint: 1000,
      activationFee: isActivated ? 0 : 18,
      rzcReward: 20833,
      directReferralBonus: 10,
      teamSalesBonus: 1,
      features: ['20,833 RZC Instant', '10% Direct Referral Bonus', '1% Weekly Team Sales', 'VIP Support', 'Early Beta Access'],
      gradient: 'from-cyan-500 to-blue-600',
      icon: TrendingUp
    },

    // Enterprise Tier - Premium Packages
    {
      id: 'enterprise-2000',
      tier: 'enterprise',
      tierName: 'Diamond Package',
      pricePoint: 2000,
      activationFee: isActivated ? 0 : 18,
      rzcReward: 33333,
      directReferralBonus: 10,
      teamSalesBonus: 1,
      features: ['33,333 RZC Instant', '10% Direct Referral Bonus', '1% Weekly Team Sales', 'White-Glove Support', 'Exclusive Airdrops', 'Private Community'],
      gradient: 'from-purple-600 to-pink-600',
      icon: Crown,
      badge: 'Premium'
    },
    {
      id: 'enterprise-5000',
      tier: 'enterprise',
      tierName: 'Elite Package',
      pricePoint: 5000,
      activationFee: isActivated ? 0 : 18,
      rzcReward: 100000,
      directReferralBonus: 10,
      teamSalesBonus: 1,
      features: ['100,000 RZC Instant', '10% Direct Referral Bonus', '1% Weekly Team Sales', 'Dedicated Support', 'Priority Airdrops', 'Strategy Calls'],
      gradient: 'from-purple-600 to-pink-600',
      icon: Crown,
      badge: 'Elite'
    },
    {
      id: 'enterprise-10000',
      tier: 'enterprise',
      tierName: 'Ultimate Package',
      pricePoint: 10000,
      activationFee: isActivated ? 0 : 18,
      rzcReward: 250000,
      directReferralBonus: 10,
      teamSalesBonus: 1,
      features: ['250,000 RZC Instant', '10% Direct Referral Bonus', '1% Weekly Team Sales', 'Core Team Access', 'Guaranteed Airdrops', 'Quarterly Calls'],
      gradient: 'from-purple-600 to-pink-600',
      icon: Crown,
      badge: 'Ultimate'
    }
  ];

  // Show all tier packages conditionally. Hide activation package if already activated. Hide test package.
  const filteredPackages = salesPackages.filter(pkg => {
    if (pkg.id === 'test-001') return false;
    if (pkg.id === 'activation-only' && isActivated) return false;
    return pkg.tier === selectedTier;
  });

  const handlePurchase = (pkg: SalesPackage) => {
    if (!address) {
      navigate('/wallet/login');
      return;
    }
    openPurchaseModal(pkg, (packageId) => {
      const updated = [...purchasedPackages, packageId];
      setPurchasedPackages(updated);
      if (address) {
        localStorage.setItem(`purchased_packages_${address}`, JSON.stringify(updated));
      }
    });
  };

  return (
    <div className="space-y-6 p-4 sm:p-0">
      {/* Premium UI Header */}
      <div className="relative mb-8 mt-2">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-2xl opacity-50 pointer-events-none"></div>
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/5 border border-white/10 p-5 rounded-2xl shadow-xl backdrop-blur-md">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(79,70,229,0.3)]">
              <Package size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                Nodes Packages
              </h1>
              <p className="text-xs text-gray-400 font-medium mt-1">
                {isActivated
                  ? 'Acquire protocol allocations & instantly earn RZC rewards.'
                  : 'Activate your wallet matrix to unlock the ecosystem.'
                }
              </p>
            </div>
          </div>
          {isActivated && (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl shadow-[inset_0_0_10px_rgba(16,185,129,0.1)]">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_5px_#10b981]"></div>
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                Activated Matrix
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Activation Status Card - Show when activated */}
      {showActivationBanner && isActivated && activatedAt && (
        <div className="relative overflow-hidden p-6 bg-gradient-to-br from-[#0a1510] to-[#042013] border border-emerald-500/30 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.1)] group">
          <button onClick={() => setShowActivationBanner(false)} className="absolute top-4 right-4 text-emerald-500/50 hover:text-emerald-400 z-10 transition-colors">
            <X size={18} />
          </button>
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.1)_0%,_transparent_50%)]"></div>

          <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.4)] ring-1 ring-white/20">
                <ShieldCheck size={32} className="text-white drop-shadow-md" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#0a1510] rounded-full flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]"></div>
              </div>
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mb-2">
                <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-100 to-teal-200">
                  Protocol Matrix Activated
                </h3>
                <span className="px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] bg-emerald-500/10 text-emerald-300 rounded-full border border-emerald-500/20 shadow-inner">
                  Online
                </span>
              </div>

              <div className="space-y-1.5 mb-4 border-l-2 border-emerald-500/20 pl-4 py-1">
                <p className="text-xs text-emerald-200/60 font-mono tracking-tight">
                  <span className="text-emerald-500/50">TIMESTAMP //</span> {new Date(activatedAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
                {activationFeePaid > 0 && (
                  <p className="text-xs text-emerald-200/60 font-mono tracking-tight">
                    <span className="text-emerald-500/50">NETWORK_FEE //</span> {activationFeePaid.toFixed(4)} TON
                  </p>
                )}
                {purchasedPackages.length > 0 && (
                  <p className="text-xs text-emerald-400 font-mono tracking-tight font-bold">
                    <span className="text-emerald-500/50">ALLOCATIONS //</span> {purchasedPackages.length} Node{purchasedPackages.length > 1 ? 's' : ''} Secured
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-teal-300 font-bold bg-white/5 px-3 py-2 rounded-lg border border-white/10">
                  <Check size={14} className="text-teal-400" /> Matrix Unlock
                </div>
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-emerald-300 font-bold bg-white/5 px-3 py-2 rounded-lg border border-white/10">
                  <Zap size={14} className="text-emerald-400" /> Yield Active
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activation Required Banner - Only show when not activated */}
      {showActivationBanner && !isActivated && (
        <div className="relative overflow-hidden p-6 bg-gradient-to-br from-[#110c1f] to-[#17102e] border border-blue-500/30 rounded-2xl shadow-2xl group">
          <button onClick={() => setShowActivationBanner(false)} className="absolute top-4 right-4 text-blue-500/50 hover:text-blue-400 z-10 transition-colors">
            <X size={18} />
          </button>
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-1000"></div>

          <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(59,130,246,0.3)] ring-1 ring-white/10">
                <Lock size={32} className="text-white drop-shadow-md" />
              </div>
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mb-2">
                <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-100 to-white">
                  Protocol Initialization Required
                </h3>
              </div>
              <p className="text-sm text-blue-200/70 font-medium mb-4 leading-relaxed max-w-2xl">
                A one-time network initialization fee of $18 is required to sync your wallet with the RhizaCore matrix. This permanently unlocks custom node purchasing, instant RZC token yields, and global ecosystem reward claims.
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-indigo-300 font-bold bg-blue-500/10 px-3 py-2 rounded-lg border border-blue-500/20 shadow-[inset_0_1px_rgba(255,255,255,0.1)]">
                  <ShieldCheck size={14} className="text-blue-400" /> Secure Encryption
                </div>
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-blue-200 font-bold bg-white/5 px-3 py-2 rounded-lg border border-white/10 shadow-[inset_0_1px_rgba(255,255,255,0.05)]">
                  <Star size={14} className="text-yellow-400" /> Lifetime Matrix Access
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Semi-Compact Wallet Balance Banner */}
      <div className="relative overflow-hidden p-3 sm:p-4 bg-gradient-to-r from-[#0a0f18] to-[#12182b] border border-blue-500/20 rounded-xl shadow-lg ring-1 ring-white/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 shadow-[inset_0_0_10px_rgba(59,130,246,0.1)]">
              <WalletIcon size={18} className="text-blue-400 drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black text-blue-200 uppercase tracking-wider">
                  Wallet Balance
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest bg-white/5 text-blue-400 border border-white/5">
                  {network === 'mainnet' ? 'MAINNET' : 'TESTNET'}
                </span>
              </div>
              {balanceLoading ? (
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-3 h-3 border-2 border-blue-500/50 border-t-blue-400 rounded-full animate-spin"></div>
                  <span className="text-xs text-blue-400/70 font-mono">Syncing...</span>
                </div>
              ) : (
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-lg font-black text-white font-mono tracking-tight drop-shadow-sm">
                    {tonBalance.toFixed(2)} <span className="text-sm">TON</span>
                  </span>
                  <span className="text-xs text-blue-400/80 font-mono font-semibold">
                    ≈ ${(tonBalance * tonPrice).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {!balanceLoading && tonBalance < 0.1 && (
            <div className="flex-1 sm:max-w-xs flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg backdrop-blur-md">
              <AlertCircle size={14} className="text-amber-400 flex-shrink-0" />
              <p className="text-[10px] text-amber-200/90 leading-tight">
                <strong>Low Balance.</strong> Fund wallet to purchase nodes.
              </p>
              <button
                onClick={() => navigate('/wallet/receive')}
                className="ml-auto flex items-center gap-1 px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 rounded text-[9px] font-black uppercase tracking-wider transition-all"
              >
                Deposit <ExternalLink size={10} />
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Glassmorphic Tier Selector */}
      <div className="relative z-10 p-1.5 bg-[#0a0f18]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-wrap sm:flex-nowrap gap-1.5 w-full">
        <button
          onClick={() => setSelectedTier('starter')}
          className={`flex-1 min-w-[100px] px-2 sm:px-4 py-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${selectedTier === 'starter'
            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] ring-1 ring-white/20'
            : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300 border border-transparent hover:border-white/5'
            }`}
        >
          <Package size={16} className={selectedTier === 'starter' ? 'animate-pulse' : ''} />
          <span>Starter</span>
        </button>
        <button
          onClick={() => setSelectedTier('professional')}
          className={`flex-1 min-w-[100px] px-2 sm:px-4 py-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${selectedTier === 'professional'
            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] ring-1 ring-white/20'
            : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300 border border-transparent hover:border-white/5'
            }`}
        >
          <TrendingUp size={16} className={selectedTier === 'professional' ? 'animate-pulse' : ''} />
          <span>Pro</span>
        </button>
        <button
          onClick={() => setSelectedTier('enterprise')}
          className={`flex-1 min-w-[100px] px-2 sm:px-4 py-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${selectedTier === 'enterprise'
            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.5)] ring-1 ring-white/20'
            : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300 border border-transparent hover:border-white/5'
            }`}
        >
          <Crown size={18} className={selectedTier === 'enterprise' ? 'animate-pulse' : ''} />
          <span>VIP</span>
        </button>
        <div className="w-px bg-white/10 hidden sm:block mx-1 my-2"></div>
        <button
          onClick={() => setSelectedTier('store')}
          className={`flex-1 min-w-[100px] px-2 sm:px-4 py-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${selectedTier === 'store'
            ? 'bg-gradient-to-r from-zinc-800 to-black text-white shadow-[0_0_15px_rgba(255,255,255,0.1)] ring-1 ring-white/20'
            : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300 border border-transparent hover:border-white/5'
            }`}
        >
          <Store size={16} className={selectedTier === 'store' ? 'text-green-400' : ''} />
          <span>Custom</span>
        </button>
      </div>

      {/* Info Banner for Enterprise */}
      {selectedTier === 'enterprise' && (
        <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-gray-900 via-purple-950/80 to-gray-900 border border-purple-500/30 shadow-2xl group mt-2 mb-6">
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-1000"></div>

          <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0 shadow-[0_0_30px_rgba(168,85,247,0.4)] ring-1 ring-white/20">
                <Crown size={32} className="text-white drop-shadow-md" />
              </div>
              <div className="absolute -top-2 -right-2 transform hover:rotate-180 transition-transform duration-700">
                <Sparkles size={24} className="text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]" />
              </div>
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mb-2">
                <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-200">
                  Enterprise Elite Status
                </h3>
                <span className="px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30 shadow-inner">
                  VIP Exclusive
                </span>
              </div>
              <p className="text-sm text-purple-200/70 leading-relaxed font-medium max-w-2xl">
                Unlock the absolute highest tier of Protocol Allocation multipliers. Enterprise nodes receive exclusive white-glove advisory, massive RZC instant yields, and front-of-line priority for all future network airdrops.
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-pink-300 font-bold bg-white/5 px-3 py-2 rounded-lg border border-white/10 shadow-[inset_0_1px_rgba(255,255,255,0.1)]">
                  <Shield size={14} className="text-pink-400" /> White-Glove Support
                </div>
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-purple-300 font-bold bg-white/5 px-3 py-2 rounded-lg border border-white/10 shadow-[inset_0_1px_rgba(255,255,255,0.1)]">
                  <Gift size={14} className="text-purple-400" /> Priority Airdrops
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section Title */}
      {!isActivated && (
        <div className="space-y-2">
          <h2 className="text-xl font-black text-gray-950 dark:text-white">
            Activate Your Wallet
          </h2>
          <p className="text-sm text-gray-700 dark:text-gray-400 font-semibold">
            Complete the one-time activation to unlock node packages and all wallet features.
          </p>
        </div>
      )}

      {/* Package Cards Grid */}
      {selectedTier === 'store' ? (
        <div className="bg-[#0a0a0a] border-2 border-gray-300 dark:border-white/10 rounded-2xl h-[700px] overflow-hidden">
          <StoreUI
            tonPrice={tonPrice || 0.1}
            tonAddress={address}
            walletActivated={isActivated}
            onActivateWallet={() => setSelectedTier('starter')}
            userId={userProfile?.id}
            showSnackbar={({ message, description, type }) => {
              const fullMessage = description ? `${message}: ${description}` : message;
              if (type === 'error' && toast.error) toast.error(fullMessage);
              else if (type === 'success' && toast.success) toast.success(fullMessage);
              else if (toast.info) toast.info(fullMessage);
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPackages.map((pkg) => {
            const Icon = pkg.icon;
            const isPurchased = purchasedPackages.includes(pkg.id);

            return (
              <div
                key={pkg.id}
                className={`relative group bg-white dark:bg-white/5 border-2 rounded-2xl p-5 transition-all duration-300 hover:shadow-xl ${isPurchased
                  ? 'border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/5 ring-2 ring-emerald-200 dark:ring-emerald-500/20'
                  : 'border-gray-300 dark:border-white/10 hover:border-primary/50 dark:hover:border-primary/50 hover:shadow-primary/10'
                  }`}
              >
                {/* Purchased Badge */}
                {isPurchased && (
                  <div className="absolute -top-2 -right-2 z-10">
                    <div className="relative">
                      <div className="absolute inset-0 bg-emerald-500 rounded-full blur-md opacity-50 animate-pulse"></div>
                      <span className="relative flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-emerald-500 text-white px-3 py-1.5 rounded-full shadow-lg">
                        <Check size={12} className="animate-bounce" />
                        Purchased
                      </span>
                    </div>
                  </div>
                )}

                {/* Badge */}
                {pkg.badge && !isPurchased && (
                  <div className="absolute top-4 right-4">
                    <span className="text-[8px] font-black uppercase tracking-wider bg-primary/10 text-primary px-2 py-1 rounded-full">
                      {pkg.badge}
                    </span>
                  </div>
                )}

                {/* Icon & Title */}
                <div className="flex items-start gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${pkg.gradient} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={24} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-950 dark:text-white">
                      {pkg.tierName}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold">
                      {pkg.rzcReward > 0 ? `${pkg.rzcReward.toLocaleString()} RZC Instant` : 'Activation Only'}
                    </p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-4 pb-4 border-b-2 border-gray-200 dark:border-white/10">
                  {pkg.pricePoint > 0 ? (
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-gray-950 dark:text-white">
                          ${pkg.pricePoint}
                        </span>
                        {pkg.activationFee > 0 ? (
                          <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                            + ${pkg.activationFee} activation
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-600 dark:text-primary font-bold">
                            No activation fee
                          </span>
                        )}
                      </div>
                      {isActivated && pkg.activationFee === 0 && (
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1">
                          <Check size={12} />
                          Wallet activated - Pay package price only
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-gray-950 dark:text-white">
                          ${pkg.activationFee}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                          one-time
                        </span>
                      </div>
                      <p className="text-xs text-blue-700 dark:text-blue-400 font-bold mt-1">
                        Activation Only - No Package Purchase
                      </p>
                    </div>
                  )}
                  {pkg.directReferralBonus > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        <Percent size={14} />
                        {pkg.directReferralBonus}% Direct Referral Bonus
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-400">
                        <Users size={14} />
                        {pkg.teamSalesBonus}% Weekly Team Sales
                      </div>
                    </div>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-2 mb-5">
                  {pkg.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-400 font-semibold">
                      <Check size={14} className="text-emerald-600 dark:text-primary flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Purchase Button */}
                <button
                  onClick={() => handlePurchase(pkg)}
                  disabled={isPurchased}
                  className={`w-full py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 ${isPurchased
                    ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 cursor-not-allowed border-2 border-emerald-300 dark:border-emerald-500/30'
                    : 'bg-emerald-600 dark:bg-primary text-white dark:text-black hover:bg-emerald-700 dark:hover:bg-[#00dd77] active:scale-95'
                    }`}
                >
                  {isPurchased ? (
                    <>
                      <Check size={16} className="animate-pulse" />
                      ✅ Package Activated
                    </>
                  ) : (
                    <>
                      Purchase Package
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

export default MiningNodes;
