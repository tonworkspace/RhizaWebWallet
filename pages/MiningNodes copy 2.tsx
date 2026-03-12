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
  Store
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { useToast } from '../context/ToastContext';
import { useBalance } from '../hooks/useBalance';
import StoreUI from '../components/StoreUI';

interface SalesPackage {
  id: string;
  tier: 'starter' | 'professional' | 'enterprise';
  tierName: string;
  pricePoint: number;
  activationFee: number;
  rzcReward: number;
  directReferralBonus: number; // 10% from direct referrals
  teamSalesBonus: number; // 1% from team sales weekly
  features: string[];
  badge?: string;
  gradient: string;
  icon: any;
}

const MiningNodes: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { address, network, isActivated, activatedAt, activationFeePaid, userProfile } = useWallet();
  const { tonBalance, tonPrice, isLoading: balanceLoading } = useBalance();
  const toast = useToast();
  const [selectedTier, setSelectedTier] = useState<'starter' | 'professional' | 'enterprise' | 'store'>('starter');
  const [selectedPackage, setSelectedPackage] = useState<SalesPackage | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchasedPackages, setPurchasedPackages] = useState<string[]>([]);

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

    // Activation Only - $15 One-Time Fee
    {
      id: 'activation-only',
      tier: 'starter',
      tierName: 'Wallet Activation',
      pricePoint: 0,
      activationFee: 15,
      rzcReward: 42, // $5 worth at $0.12/RZC
      directReferralBonus: 0,
      teamSalesBonus: 0,
      features: [
        'Unlock Full Wallet Access',
        '$5 Welcome Bonus (42 RZC)',
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
      activationFee: isActivated ? 0 : 15,
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
      activationFee: isActivated ? 0 : 15,
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
      activationFee: isActivated ? 0 : 15,
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
      activationFee: isActivated ? 0 : 15,
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
      activationFee: isActivated ? 0 : 15,
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
      activationFee: isActivated ? 0 : 15,
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
      activationFee: isActivated ? 0 : 15,
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
      activationFee: isActivated ? 0 : 15,
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
      activationFee: isActivated ? 0 : 15,
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
      activationFee: isActivated ? 0 : 15,
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
      activationFee: isActivated ? 0 : 15,
      rzcReward: 250000,
      directReferralBonus: 10,
      teamSalesBonus: 1,
      features: ['250,000 RZC Instant', '10% Direct Referral Bonus', '1% Weekly Team Sales', 'Core Team Access', 'Guaranteed Airdrops', 'Quarterly Calls'],
      gradient: 'from-purple-600 to-pink-600',
      icon: Crown,
      badge: 'Ultimate'
    }
  ];

  // If wallet is not activated, show the activation-only package first, then all packages for the selected tier (they will include the activation fee).
  // If wallet is activated, show all packages EXCEPT activation-only
  const filteredPackages = isActivated
    ? salesPackages.filter(pkg => pkg.tier === selectedTier && pkg.id !== 'activation-only' && pkg.id !== 'test-001')
    : salesPackages.filter(pkg => (pkg.id === 'activation-only' || pkg.id === 'test-001') || (pkg.tier === selectedTier));

  const handlePurchase = (pkg: SalesPackage) => {
    if (!address) {
      navigate('/wallet/login');
      return;
    }
    setSelectedPackage(pkg);
    setShowPurchaseModal(true);
  };

  return (
    <div className="space-y-6 p-4 sm:p-0">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-950 dark:text-white">
            Nodes Packages
          </h1>
          {isActivated && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-500/10 border-2 border-emerald-300 dark:border-emerald-500/20 rounded-xl">
              <Check size={16} className="text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                Wallet Activated
              </span>
            </div>
          )}
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-400 font-semibold">
          {isActivated
            ? 'Purchase packages to receive instant RZC tokens. Earn 10% from direct referrals and 1% from weekly team sales.'
            : 'Activate your wallet to unlock access to sales packages and start earning rewards.'
          }
        </p>
      </div>

      {/* Activation Status Card - Show when activated */}
      {isActivated && activatedAt && (
        <div className="p-5 bg-gradient-to-r from-emerald-50 to-cyan-50 dark:from-emerald-500/10 dark:to-cyan-500/10 border-2 border-emerald-200 dark:border-emerald-500/20 rounded-2xl shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center flex-shrink-0 animate-pulse">
              <Shield size={24} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-black text-emerald-900 dark:text-emerald-300">
                  ✅ Wallet Activated Successfully
                </h3>
                <span className="px-2 py-0.5 bg-emerald-600 text-white text-[8px] font-black uppercase tracking-wider rounded-full">
                  Active
                </span>
              </div>
              <div className="space-y-1 mb-3">
                <p className="text-sm text-emerald-700 dark:text-emerald-400 font-semibold">
                  Activated on {new Date(activatedAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
                {activationFeePaid > 0 && (
                  <p className="text-sm text-emerald-600 dark:text-emerald-500 font-semibold">
                    Activation Fee Paid: {activationFeePaid.toFixed(4)} TON
                  </p>
                )}
                {purchasedPackages.length > 0 && (
                  <p className="text-sm text-emerald-600 dark:text-emerald-500 font-semibold">
                    📦 {purchasedPackages.length} Package{purchasedPackages.length > 1 ? 's' : ''} Purchased
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-bold">
                <div className="flex items-center gap-1">
                  <Check size={14} className="flex-shrink-0" />
                  <span>Full wallet access</span>
                </div>
                <span className="text-emerald-400">•</span>
                <div className="flex items-center gap-1">
                  <Check size={14} className="flex-shrink-0" />
                  <span>All features unlocked</span>
                </div>
                <span className="text-emerald-400">•</span>
                <div className="flex items-center gap-1">
                  <Check size={14} className="flex-shrink-0" />
                  <span>Ready to earn rewards</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activation Required Banner - Only show when not activated */}
      {!isActivated && (
        <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-600 border-2 border-blue-500 rounded-2xl shadow-xl">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Shield size={24} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-black text-white mb-2">
                Wallet Activation Required
              </h3>
              <p className="text-sm text-blue-100 font-semibold mb-4 leading-relaxed">
                To access nodes packages and start earning rewards, you must first activate your wallet with a one-time $15 payment. This unlocks full access to all ecosystem features.
              </p>
              <div className="flex items-center gap-2 text-xs text-blue-100 font-bold">
                <Check size={14} className="flex-shrink-0" />
                <span>One-time payment</span>
                <span className="text-blue-300">•</span>
                <Check size={14} className="flex-shrink-0" />
                <span>Lifetime access</span>
                <span className="text-blue-300">•</span>
                <Check size={14} className="flex-shrink-0" />
                <span>Unlock all features</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Balance Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-500/10 dark:to-cyan-500/10 border-2 border-blue-200 dark:border-blue-500/20 rounded-xl shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
            <WalletIcon size={20} className="text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-blue-900 dark:text-blue-300">
                Your Wallet Balance
              </h3>
              <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                {network === 'mainnet' ? 'Mainnet' : 'Testnet'}
              </span>
            </div>
            {balanceLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-blue-700 dark:text-blue-400 font-semibold">Loading balance...</span>
              </div>
            ) : (
              <>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-2xl font-black text-blue-950 dark:text-white">
                    {tonBalance.toFixed(4)} TON
                  </span>
                  <span className="text-sm text-blue-700 dark:text-blue-400 font-semibold">
                    ≈ ${(tonBalance * tonPrice).toFixed(2)} USD
                  </span>
                </div>
                {tonBalance < 0.1 && (
                  <div className="flex items-start gap-2 p-3 bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/20 rounded-lg mt-3">
                    <AlertCircle size={16} className="text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-amber-900 dark:text-amber-300 font-bold mb-1">
                        Low Balance - Fund Your Wallet
                      </p>
                      <p className="text-xs text-amber-800 dark:text-amber-400 mb-2">
                        You need TON to purchase mining nodes. Fund your wallet to continue.
                      </p>
                      <button
                        onClick={() => navigate('/wallet/receive')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95"
                      >
                        <ExternalLink size={12} />
                        Get Wallet Address
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tier Selector */}
      <div className="flex gap-2 p-1 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl shadow-sm">
        <button
          onClick={() => setSelectedTier('starter')}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${selectedTier === 'starter'
            ? 'bg-emerald-600 dark:bg-primary text-white dark:text-black shadow-lg'
            : 'text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
        >
          <Package size={16} className="inline mr-1.5" />
          Starter
        </button>
        <button
          onClick={() => setSelectedTier('professional')}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${selectedTier === 'professional'
            ? 'bg-emerald-600 dark:bg-primary text-white dark:text-black shadow-lg'
            : 'text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
        >
          <TrendingUp size={16} className="inline mr-1.5" />
          Pro
        </button>
        <button
          onClick={() => setSelectedTier('enterprise')}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${selectedTier === 'enterprise'
            ? 'bg-emerald-600 dark:bg-primary text-white dark:text-black shadow-lg'
            : 'text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
        >
          <Crown size={16} className="inline mr-1.5" />
          VIP
        </button>
        <button
          onClick={() => setSelectedTier('store')}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${selectedTier === 'store'
            ? 'bg-emerald-600 dark:bg-primary text-white dark:text-black shadow-lg'
            : 'text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
        >
          <Store size={16} className="inline mr-1.5" />
          Store
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
            Complete the one-time activation to unlock sales packages and all wallet features.
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

      {/* Purchase Modal */}
      {showPurchaseModal && selectedPackage && (
        <PurchaseModal
          package={selectedPackage}
          onClose={() => setShowPurchaseModal(false)}
          onSuccess={(packageId) => {
            // Add to purchased packages
            const updated = [...purchasedPackages, packageId];
            setPurchasedPackages(updated);
            if (address) {
              localStorage.setItem(`purchased_packages_${address}`, JSON.stringify(updated));
            }
          }}
        />
      )}
    </div>
  );
};

// Purchase Modal Component
const PurchaseModal: React.FC<{
  package: SalesPackage;
  onClose: () => void;
  onSuccess?: (packageId: string) => void;
}> = ({ package: pkg, onClose, onSuccess }) => {
  const { address, network } = useWallet();
  const { tonBalance, tonPrice } = useBalance();
  const { success } = useToast();
  const [paymentMethod, setPaymentMethod] = useState<'ton' | 'rzc' | 'hybrid'>('ton');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const totalCost = pkg.pricePoint + pkg.activationFee;

  // Calculate TON amount needed with proper error handling
  let totalCostTON: number;

  // Check if tonPrice is valid first
  const isValidTonPrice = tonPrice && tonPrice > 0 && isFinite(tonPrice) && !isNaN(tonPrice);

  if (pkg.id === 'test-001') {
    // Test package: activation fee is already in TON (0.2 TON)
    totalCostTON = pkg.activationFee > 0 ? pkg.activationFee : 0.2;
  } else if (pkg.id === 'activation-only') {
    // Activation only: convert USD to TON
    if (isValidTonPrice) {
      totalCostTON = pkg.activationFee / tonPrice;
    } else {
      // Fallback: use approximate TON price of $2.45 if price fetch failed
      console.warn('⚠️ TON price invalid, using fallback price of $2.45');
      totalCostTON = pkg.activationFee / 2.45;
    }
  } else {
    // Regular packages: convert total USD to TON
    if (isValidTonPrice) {
      totalCostTON = totalCost / tonPrice;
    } else {
      // Fallback: use approximate TON price of $2.45 if price fetch failed
      console.warn('⚠️ TON price invalid, using fallback price of $2.45');
      totalCostTON = totalCost / 2.45;
    }
  }

  // Final validation - ensure we have a valid number
  if (isNaN(totalCostTON) || !isFinite(totalCostTON) || totalCostTON <= 0) {
    console.error('Invalid TON amount calculated:', { totalCostTON, totalCost, tonPrice, pkg });
    // Set reasonable fallback values
    if (pkg.id === 'test-001') {
      totalCostTON = 0.2;
    } else if (pkg.id === 'activation-only') {
      totalCostTON = pkg.activationFee / 2.45; // $15 / $2.45 ≈ 6.12 TON
    } else {
      totalCostTON = totalCost / 2.45;
    }
  }

  const hasEnoughBalance = tonBalance >= totalCostTON;

  const handlePurchase = async () => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }

    // Check balance before proceeding
    if (!hasEnoughBalance) {
      setError(`Insufficient balance. You need ${totalCostTON.toFixed(4)} TON but only have ${tonBalance.toFixed(4)} TON.`);
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Validate TON amount
      if (isNaN(totalCostTON) || !isFinite(totalCostTON) || totalCostTON <= 0) {
        throw new Error(`Invalid payment amount calculated. Please refresh and try again.`);
      }

      // Validate TON price and use fallback if needed
      let validTonPrice = tonPrice;
      if (isNaN(tonPrice) || tonPrice <= 0 || !isFinite(tonPrice)) {
        console.warn('⚠️ Invalid TON price detected, using fallback price of $2.45');
        validTonPrice = 2.45;

        // Recalculate totalCostTON with valid price
        if (pkg.id === 'test-001') {
          totalCostTON = pkg.activationFee > 0 ? pkg.activationFee : 0.2;
        } else if (pkg.id === 'activation-only') {
          totalCostTON = pkg.activationFee / validTonPrice;
        } else {
          totalCostTON = totalCost / validTonPrice;
        }
      }

      console.log(`💳 Payment validation passed:`, {
        totalCostTON: totalCostTON.toFixed(4),
        totalCostUSD: totalCost,
        tonPrice: validTonPrice.toFixed(2),
        packageId: pkg.id
      });

      // Match the exact amount that will be sent to the blockchain (4 decimals)
      totalCostTON = parseFloat(totalCostTON.toFixed(4));

      // Import payment configuration
      const { getPaymentAddress, validatePaymentConfig } = await import('../config/paymentConfig');
      const { tonWalletService } = await import('../services/tonWalletService');

      // Validate payment configuration
      if (!validatePaymentConfig(network)) {
        throw new Error(`Payment wallet address not configured for ${network}. Please contact support.`);
      }

      // Get payment wallet address
      const paymentAddress = getPaymentAddress(network);

      console.log(`💳 Processing payment: ${totalCostTON} TON to ${paymentAddress}`);

      // Send TON payment (sendTransaction expects amount as string in TON, not nanotons)
      const paymentResult = await tonWalletService.sendTransaction(
        paymentAddress,
        totalCostTON.toFixed(4),
        `RhizaCore ${pkg.tierName} Purchase`
      );

      if (!paymentResult.success || !paymentResult.txHash) {
        throw new Error(paymentResult.error || 'Payment failed');
      }

      console.log(`✅ Payment successful: ${paymentResult.txHash}`);

      // Log payment activity
      const { notificationService } = await import('../services/notificationService');
      await notificationService.logActivity(
        address,
        'transaction_sent',
        `Purchased ${pkg.tierName} - ${totalCostTON.toFixed(4)} TON`,
        {
          package_id: pkg.id,
          package_name: pkg.tierName,
          amount_ton: totalCostTON,
          amount_usd: pkg.pricePoint > 0 ? totalCost : pkg.activationFee * validTonPrice,
          rzc_reward: pkg.rzcReward,
          transaction_hash: paymentResult.txHash,
          network: network,
          payment_address: paymentAddress
        }
      );

      // Create a user-facing notification for transaction confirmation
      await notificationService.createNotification(
        address,
        'transaction_confirmed',
        'Payment Successful',
        `Your payment of ${totalCostTON.toFixed(4)} TON for ${pkg.tierName} was successful.`,
        {
          priority: 'high',
          data: { txHash: paymentResult.txHash, package: pkg.tierName }
        }
      );

      // Activate wallet after successful purchase
      const { supabaseService } = await import('../services/supabaseService');

      const activated = await supabaseService.activateWallet(address, {
        activation_fee_usd: pkg.pricePoint > 0 ? totalCost : pkg.activationFee * validTonPrice,
        activation_fee_ton: totalCostTON,
        ton_price: validTonPrice,
        transaction_hash: paymentResult.txHash
      });

      if (activated) {
        // Log wallet activation activity
        await notificationService.logActivity(
          address,
          'wallet_created',
          'Wallet activated successfully',
          {
            activation_fee_usd: pkg.pricePoint > 0 ? totalCost : pkg.activationFee * validTonPrice,
            activation_fee_ton: totalCostTON,
            package_purchased: pkg.tierName,
            transaction_hash: paymentResult.txHash
          }
        );

        // Award RZC tokens for package purchase
        try {
          // Get user profile to get user ID
          const profileResult = await supabaseService.getProfile(address);
          if (profileResult.success && profileResult.data) {
            const userId = profileResult.data.id;

            // Award RZC tokens based on package
            const rewardResult = await supabaseService.awardRZCTokens(
              userId,
              pkg.rzcReward,
              pkg.id === 'activation-only' ? 'activation_bonus' : 'package_purchase',
              `${pkg.tierName} purchase reward`,
              {
                package_id: pkg.id,
                package_name: pkg.tierName,
                transaction_hash: paymentResult.txHash,
                package_price_usd: pkg.pricePoint,
                activation_fee_usd: pkg.activationFee,
                total_cost_ton: totalCostTON
              }
            );

            if (rewardResult.success) {
              console.log(`✅ ${pkg.rzcReward} RZC tokens awarded`);

              // Log the reward activity
              await notificationService.logActivity(
                address,
                'reward_claimed',
                `Received ${pkg.rzcReward.toLocaleString()} RZC from ${pkg.tierName}`,
                {
                  amount: pkg.rzcReward,
                  type: pkg.id === 'activation-only' ? 'activation_bonus' : 'package_purchase',
                  package_name: pkg.tierName,
                  new_balance: rewardResult.newBalance
                }
              );

              // Notify the user of the reward
              await notificationService.createNotification(
                address,
                'reward_claimed',
                'RZC Tokens Awarded',
                `You received ${pkg.rzcReward.toLocaleString()} RZC tokens for purchasing ${pkg.tierName}!`,
                {
                  priority: 'normal',
                  data: { amount: pkg.rzcReward, package: pkg.tierName }
                }
              );

              // Award 10% commission to referrer (if package purchase, not activation-only)
              if (pkg.pricePoint > 0) {
                try {
                  const client = supabaseService.getClient();
                  if (client) {
                    const commissionResult = await client.rpc('award_package_purchase_commission', {
                      p_buyer_user_id: userId,
                      p_package_price_usd: pkg.pricePoint,
                      p_package_name: pkg.tierName,
                      p_transaction_hash: paymentResult.txHash
                    });

                    if (commissionResult.error) {
                      console.error('❌ Failed to award referral commission:', commissionResult.error);
                    } else if (commissionResult.data && commissionResult.data.length > 0) {
                      const commission = commissionResult.data[0];
                      if (commission.success) {
                        console.log(`✅ Referral commission awarded: ${commission.commission_amount} RZC to referrer`);
                      } else {
                        console.log(`ℹ️ No commission awarded: ${commission.message}`);
                      }
                    }
                  }
                } catch (commissionError) {
                  console.error('❌ Error awarding referral commission:', commissionError);
                  // Don't fail the purchase if commission fails
                }
              }
            } else {
              console.error('❌ Failed to award RZC tokens:', rewardResult.error);
            }
          }
        } catch (rewardError) {
          console.error('❌ Error awarding RZC tokens:', rewardError);
          // Don't fail the activation if reward fails
        }

        const successMessage = pkg.pricePoint > 0
          ? `🎉 Success! You've purchased ${pkg.tierName} and received ${pkg.rzcReward.toLocaleString()} RZC tokens! Start earning 10% from referrals and 1% from team sales.`
          : `🎉 Success! Your wallet has been activated! You now have full access to all features and received $5 (${pkg.rzcReward} RZC) as a welcome bonus!`;
        success(successMessage);

        // Call onSuccess callback to update purchased packages
        if (onSuccess) {
          onSuccess(pkg.id);
        }

        onClose();
        // Refresh the page to update activation status
        window.location.reload();
      } else {
        throw new Error('Failed to activate wallet');
      }
    } catch (err: any) {
      console.error('Purchase error:', err);
      setError(err.message || 'Purchase failed. Please try again.');

      // Log failed purchase activity
      try {
        const { notificationService } = await import('../services/notificationService');
        await notificationService.logActivity(
          address,
          'transaction_sent',
          `Failed to purchase ${pkg.tierName}`,
          {
            package_id: pkg.id,
            package_name: pkg.tierName,
            amount_ton: totalCostTON,
            error: err.message,
            network: network
          }
        );
      } catch (logError) {
        console.error('Failed to log error activity:', logError);
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md bg-white dark:bg-[#0a0a0a] border-2 border-gray-300 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b-2 border-gray-200 dark:border-white/10">
          <h2 className="text-xl font-black text-gray-950 dark:text-white">
            {pkg.pricePoint > 0 ? `Purchase ${pkg.tierName}` : 'Activate Wallet'}
          </h2>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-semibold">
            {pkg.pricePoint > 0
              ? `Complete your purchase to receive ${pkg.rzcReward.toLocaleString()} RZC tokens instantly`
              : 'One-time payment to unlock full wallet access'
            }
          </p>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-500/10 border-2 border-red-200 dark:border-red-500/20 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 dark:text-red-400 font-semibold">{error}</p>
              </div>
            </div>
          )}

          {/* TON Price Warning */}
          {(!tonPrice || tonPrice <= 0 || !isFinite(tonPrice) || isNaN(tonPrice)) && (
            <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/20 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-amber-900 dark:text-amber-300 font-bold mb-1">
                    Price Data Loading
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-400 font-semibold">
                    Using fallback TON price of $2.45. Calculations may be approximate.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Wallet Balance */}
          <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-500/20 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider">
                Your Balance ({network === 'mainnet' ? 'Mainnet' : 'Testnet'})
              </span>
              {!hasEnoughBalance && (
                <span className="text-xs font-bold text-red-600 dark:text-red-400">
                  Insufficient
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-blue-950 dark:text-white">
                {tonBalance.toFixed(4)} TON
              </span>
              <span className="text-xs text-blue-700 dark:text-blue-400 font-semibold">
                ≈ ${(tonBalance * (tonPrice > 0 && isFinite(tonPrice) ? tonPrice : 2.45)).toFixed(2)}
              </span>
            </div>
            {!hasEnoughBalance && (
              <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-500/20">
                <p className="text-xs text-blue-800 dark:text-blue-300 font-semibold mb-2">
                  You need {totalCostTON.toFixed(4)} TON (${totalCost}) to purchase this node.
                </p>
                <button
                  onClick={() => {
                    onClose();
                    navigate('/wallet/receive');
                  }}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <WalletIcon size={14} />
                  Fund Wallet
                </button>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl space-y-2">
            {pkg.pricePoint > 0 ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 font-semibold">Package Price</span>
                  <span className="font-bold text-gray-950 dark:text-white">${pkg.pricePoint}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 font-semibold">RZC Reward</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{pkg.rzcReward.toLocaleString()} RZC</span>
                </div>
                {pkg.activationFee > 0 ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 font-semibold">Activation Fee</span>
                    <span className="font-bold text-gray-950 dark:text-white">${pkg.activationFee}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 font-semibold">Activation Fee</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Check size={14} />
                      Wallet Activated
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400 font-semibold">
                  {pkg.id === 'test-001' ? 'Test Activation Fee' : 'Activation Fee'}
                </span>
                <span className="font-bold text-gray-950 dark:text-white">
                  {pkg.id === 'test-001' ? `${pkg.activationFee} TON` : `$${pkg.activationFee}`}
                </span>
              </div>
            )}
            <div className="pt-2 border-t-2 border-gray-200 dark:border-white/10 space-y-1">
              <div className="flex justify-between">
                <span className="font-bold text-gray-950 dark:text-white">
                  {pkg.id === 'test-001' || pkg.id === 'activation-only' ? 'Total' : 'Total (USD)'}
                </span>
                <span className="text-lg font-black text-gray-950 dark:text-white">
                  {pkg.id === 'test-001'
                    ? `${totalCostTON} TON`
                    : pkg.id === 'activation-only'
                      ? `$${totalCost}`
                      : `$${totalCost}`
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-400 font-semibold">
                  {pkg.id === 'test-001' ? 'Equivalent USD' : 'Total (TON)'}
                </span>
                <span className="text-sm font-bold text-primary">
                  {pkg.id === 'test-001'
                    ? `≈ $${(totalCostTON * tonPrice).toFixed(2)}`
                    : `${totalCostTON.toFixed(4)} TON`
                  }
                </span>
              </div>
            </div>
            {pkg.pricePoint === 0 && (
              <div className="pt-2 border-t border-gray-200 dark:border-white/10">
                <p className="text-xs text-blue-700 dark:text-blue-400 font-semibold">
                  {pkg.id === 'test-001'
                    ? '🧪 Test package for testing activation flow on testnet.'
                    : `ℹ️ This is a one-time activation fee. Includes ${pkg.rzcReward} RZC welcome bonus.`
                  }
                </p>
              </div>
            )}
            {pkg.directReferralBonus > 0 && pkg.pricePoint > 0 && (
              <div className="pt-2 border-t border-gray-200 dark:border-white/10 space-y-1">
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <Percent size={12} />
                  Earn {pkg.directReferralBonus}% from direct referral purchases
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-400 font-bold flex items-center gap-1">
                  <Users size={12} />
                  Earn {pkg.teamSalesBonus}% from weekly team sales
                </p>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-500">
              Payment Method
            </label>
            <div className="space-y-2">
              <button
                onClick={() => setPaymentMethod('ton')}
                className={`w-full p-3 rounded-xl border-2 transition-all text-left ${paymentMethod === 'ton'
                  ? 'border-primary bg-primary/10'
                  : 'border-gray-300 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/20'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-950 dark:text-white">TON Payment</span>
                  <span className="text-xs text-emerald-600 dark:text-primary font-bold">Secure</span>
                </div>
              </button>
            </div>
          </div>

          {/* Payment Address Info */}
          <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/20 rounded-xl">
            <div className="flex items-start gap-2">
              <AlertCircle size={14} className="text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-amber-900 dark:text-amber-300 font-bold mb-1">
                  Payment will be sent to RhizaCore payment wallet
                </p>
                <p className="text-[10px] text-amber-800 dark:text-amber-400 font-semibold">
                  Your wallet will send {totalCostTON.toFixed(4)} TON to our secure payment address. Transaction will be confirmed on the blockchain.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t-2 border-gray-200 dark:border-white/10 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-200 dark:bg-white/10 text-gray-950 dark:text-white rounded-xl text-sm font-bold hover:bg-gray-300 dark:hover:bg-white/20 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handlePurchase}
            disabled={processing || !hasEnoughBalance}
            className="flex-1 py-3 bg-emerald-600 dark:bg-primary text-white dark:text-black rounded-xl text-sm font-bold hover:bg-emerald-700 dark:hover:bg-[#00dd77] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? 'Processing...' : !hasEnoughBalance ? 'Insufficient Balance' : 'Confirm Purchase'}
          </button>
        </div>
      </div>
    </>
  );
};

export default MiningNodes;
