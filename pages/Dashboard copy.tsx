
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import {
  Send,
  Download,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  ExternalLink,
  ShoppingBag,
  Eye,
  EyeOff,
  History,
  AlertCircle,
  Info,
  Zap,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
  Layers
} from 'lucide-react';
import { MOCK_PORTFOLIO_HISTORY, getNetworkConfig, getExplorerUrl, getTransactionUrl, CHAIN_META } from '../constants';
import { getJettonPrice } from '../services/jettonRegistry';
import { useWallet } from '../context/WalletContext';
import { useBalance } from '../hooks/useBalance';
import { useRZCBalance } from '../hooks/useRZCBalance';
import { useTransactions } from '../hooks/useTransactions';
import TransactionItem from '../components/TransactionItem';
import LoadingSkeleton from '../components/LoadingSkeleton';
import LanguageSelector from '../components/LanguageSelector';
import ClaimActivationBonus from '../components/ClaimActivationBonus';
import AirdropWidget from '../components/AirdropWidget';
import AffiliateHubBanner from '../components/AffiliateHubBanner';
import { supabaseService } from '../services/supabaseService';
interface ActionButtonProps {
  icon: any;
  label: string;
  primary?: boolean;
  onClick?: () => void;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon: Icon, label, primary = false, onClick }) => (
  <button
    onClick={onClick}
    className={`
      flex flex-col items-center gap-1.5 sm:gap-2 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl transition-all duration-300 flex-1 shadow-sm
      group relative overflow-hidden
      ${primary
        ? 'bg-emerald-600 dark:bg-primary text-white dark:text-black hover:bg-emerald-700 dark:hover:bg-[#00dd77] shadow-[0_10px_20px_rgba(0,255,136,0.2)] active:scale-95'
        : 'bg-gradient-to-br from-slate-50 via-white to-blue-50/60 dark:from-white/5 dark:via-white/5 dark:to-white/[0.03] border  border-primary/20   border-slate-300 dark:border-white/5 text-gray-950 dark:text-white hover:from-white hover:to-blue-100/40 dark:hover:from-white/8 dark:hover:to-white/8 active:scale-95 shadow-sm'}
    `}
  >
    {primary && (
      <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    )}
    {!primary && (
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl sm:rounded-3xl" />
    )}
    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${
      primary 
        ? 'bg-white/20 dark:bg-black/5' 
        : 'bg-gradient-to-br from-blue-100/80 to-indigo-100/60 dark:from-white/8 dark:to-white/[0.03] shadow-inner'
    }`}>
      <Icon size={primary ? 22 : 18} strokeWidth={2.5} />
    </div>
    <span className={`text-[9px] font-nav transition-all ${primary ? 'font-black' : 'font-bold'} uppercase tracking-[0.15em]`}>{label}</span>
  </button>
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { balance, address, refreshData, network, switchNetwork, userProfile, referralData, isActivated, activatedAt, multiChainBalances, currentEvmChain, rzcPrice: contextRzcPrice, jettons } = useWallet();
  const networkConfig = getNetworkConfig(network);
  const {
    tonBalance,
    tonPrice,
    btcPrice,
    ethPrice,
    bnbPrice,
    maticPrice,
    avaxPrice,
    solPrice,
    tronPrice,
    usdtPrice,
    usdcPrice,
    totalUsdValue,
    change24h,
    changePercent24h,
    isLoading: balanceLoading,
    error: balanceError,
    refreshBalance
  } = useBalance();
  const {
    balance: rzcBalance,
    usdValue: rzcUsdValue,
    isLoading: rzcLoading,
    error: rzcError,
    refreshBalance: refreshRZCBalance
  } = useRZCBalance();
  const {
    transactions,
    isLoading: txLoading,
    error: txError,
    refreshTransactions
  } = useTransactions();

  const [balanceVisible, setBalanceVisible] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNetworkInfo, setShowNetworkInfo] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'BTC' | 'TON' | 'USDT' | 'EUR'>('USD');
  const [timeframe, setTimeframe] = useState<'SEED' | 'PRESALE' | 'PUBLIC'>('SEED');

  // Native EVM price based on active chain
  const evmNativePriceMap: Record<string, number> = {
    ethereum: ethPrice, arbitrum: ethPrice, plasma: ethPrice, stable: ethPrice, sepolia: ethPrice,
    polygon: maticPrice, bsc: bnbPrice, avalanche: avaxPrice,
  };
  const activeEvmPrice = evmNativePriceMap[currentEvmChain] ?? ethPrice;

  // Multi-chain USD values
  const evmUsdValue    = multiChainBalances ? parseFloat(multiChainBalances.evm  || '0') * activeEvmPrice : 0;
  const btcUsdValue    = multiChainBalances ? parseFloat(multiChainBalances.btc  || '0') * btcPrice : 0;
  const usdtUsdValue   = multiChainBalances ? parseFloat(multiChainBalances.usdt || '0') * usdtPrice : 0;
  const wdkTonUsdValue = multiChainBalances ? parseFloat(multiChainBalances.ton  || '0') * tonPrice : 0;
  const solUsdValue    = multiChainBalances ? parseFloat(multiChainBalances.sol  || '0') * solPrice : 0;
  const tronUsdValue   = multiChainBalances ? parseFloat(multiChainBalances.tron || '0') * tronPrice : 0;

  // Calculate Jettons USD Value
  let jettonsUsdValue = 0;
  if (jettons && jettons.length > 0) {
    jettons.forEach((j: any) => {
      const price = getJettonPrice(j.jetton?.address);
      if (price > 0 && j.balance) {
        const balNum = parseFloat(j.balance) / Math.pow(10, j.jetton?.decimals || 9);
        jettonsUsdValue += balNum * price;
      }
    });
  }

  // Calculate combined portfolio value (TON + RZC + multi-chain + Jettons)
  const combinedPortfolioValue = totalUsdValue + rzcUsdValue + evmUsdValue + btcUsdValue + usdtUsdValue + wdkTonUsdValue + solUsdValue + tronUsdValue + jettonsUsdValue;

  // Currency conversion rates (dynamically fetched from WDK provider)
  const conversionRates = {
    USD: 1,
    BTC: btcPrice > 0 ? 1 / btcPrice : 0.000015,
    TON: tonPrice > 0 ? 1 / tonPrice : 0.408,
    USDT: usdtPrice > 0 ? 1 / usdtPrice : 1, // Dynamic based on admin override or market
    EUR: 0.92, // 1 USD = 0.92 EUR
  };

  // Currency symbols
  const currencySymbols: Record<string, React.ReactNode> = {
    USD: '$',
    BTC: '₿',
    TON: (
      <svg viewBox="0 0 24 24" className="w-[0.8em] h-[0.8em] inline-block -mt-[0.1em] mr-[0.05em]" fill="currentColor">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    ),
    USDT: '₮',
    EUR: '€',
  };

  // Convert portfolio value to selected currency
  const convertedValue = combinedPortfolioValue * conversionRates[selectedCurrency];

  // Format based on currency
  const formatValue = (value: number, currency: string) => {
    if (currency === 'BTC') {
      return value.toFixed(8); // BTC uses 8 decimals
    } else if (currency === 'TON') {
      return value.toFixed(4); // TON uses 4 decimals
    } else {
      return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  };

  const chartPath = useMemo(() => {
    const pointsCount = 40;
    const width = 400;
    const points = [];
    const growthMult = timeframe === 'SEED' ? 1.4 : timeframe === 'PRESALE' ? 2.5 : 4.5;

    for (let i = 0; i < pointsCount; i++) {
      const x = (i / (pointsCount - 1)) * width;
      const normalizedX = i / (pointsCount - 1);
      const progress = Math.pow(normalizedX, 2);
      const yValue = 100 - (progress * 85 * (growthMult / 4.5));
      const noise = (Math.random() - 0.5) * 1.5;
      points.push({ x, y: yValue + noise });
    }

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cp1x = prev.x + (curr.x - prev.x) / 2;
      path += ` C ${cp1x} ${prev.y}, ${cp1x} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return path;
  }, [timeframe]);

  const projectedValue = useMemo(() => {
    const baseValue = convertedValue;
    const seedPrice = contextRzcPrice > 0 ? contextRzcPrice : 0.12;
    if (timeframe === 'SEED') return baseValue * 1.0;
    if (timeframe === 'PRESALE') return baseValue * (0.25 / seedPrice);
    return baseValue * (0.50 / seedPrice);
  }, [timeframe, convertedValue, contextRzcPrice]);

  // Currency display options
  const currencies: Array<'USD' | 'BTC' | 'TON' | 'USDT' | 'EUR'> = ['USD', 'BTC', 'TON', 'USDT', 'EUR'];
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);
  const [latestConfirmation, setLatestConfirmation] = useState<any>(null);
  const [migrationStatus, setMigrationStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [verificationStatus, setVerificationStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');

  // Fetch real migration status from Supabase
  useEffect(() => {
    if (!address) return;
    const fetchMigrationStatus = async () => {
      try {
        const { migrationService } = await import('../services/migrationService');
        const res = await migrationService.getMigrationStatus(address);
        if (res.success && res.data) {
          setMigrationStatus(res.data.status as 'pending' | 'approved' | 'rejected');
        } else {
          setMigrationStatus('none');
        }
      } catch (err) {
        console.error('Error fetching migration status', err);
      }
    };
    fetchMigrationStatus();
  }, [address]);

  // Fetch balance verification status from Supabase
  useEffect(() => {
    if (!address) return;
    const fetchVerificationStatus = async () => {
      try {
        const { balanceVerificationService } = await import('../services/balanceVerificationService');
        const res = await balanceVerificationService.getUserVerificationStatus(address);
        if (res.success && res.has_request && res.request) {
          setVerificationStatus(res.request.status as 'pending' | 'approved' | 'rejected');
        } else {
          setVerificationStatus('none');
        }
      } catch (err) {
        console.error('Error fetching verification status', err);
      }
    };
    fetchVerificationStatus();
  }, [address]);

  // System Announcements logic
  const announcements = useMemo(() => {
    const items = [];
    
    // 1. Activation Status
    if (isActivated && activatedAt) {
      items.push({
        id: 'activated',
        title: "Wallet Status",
        badge: "Active",
        ping: false,
        message: `✅ Wallet activated on ${new Date(activatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
        onClick: () => {},
        theme: 'emerald' as const,
        icon: ShieldCheck
      });
    } else {
      items.push({
        id: 'not-activated',
        title: "Action Required",
        badge: "Pending",
        ping: true,
        message: "⚠️ Wallet not activated. Claim bonus or deposit to activate.",
        onClick: () => window.scrollBy({ top: 300, behavior: 'smooth' }),
        theme: 'amber' as const,
        icon: AlertCircle
      });
    }

    // 2. Migration Details — dynamic based on real status
    if (migrationStatus === 'approved') {
      items.push({
        id: 'migration-approved',
        title: "Migration Complete",
        badge: "Approved",
        ping: false,
        message: "✅ Your RZC migration was approved. Tokens credited to your wallet!",
        onClick: () => navigate('/wallet/migration'),
        theme: 'emerald' as const,
        icon: CheckCircle2
      });
    } else if (migrationStatus === 'pending') {
      items.push({
        id: 'migration-pending',
        title: "Migration In Review",
        badge: "Pending",
        ping: true,
        message: "⏳ Your migration request is under review • 24-48h • We'll notify you",
        onClick: () => navigate('/wallet/migration'),
        theme: 'amber' as const,
        icon: Clock
      });
    } else if (migrationStatus === 'rejected') {
      items.push({
        id: 'migration-rejected',
        title: "Migration Rejected",
        badge: "Action Needed",
        ping: true,
        message: "❌ Migration request was rejected. Tap to resubmit with correct details.",
        onClick: () => navigate('/wallet/migration'),
        theme: 'red' as const,
        icon: XCircle
      });
    } else {
      items.push({
        id: 'migration-none',
        title: "Migrate RZC",
        badge: "Required",
        ping: true,
        message: "🔄 Transfer tokens from Telegram bot • 24-48h review • Tap to start",
        onClick: () => navigate('/wallet/migration'),
        theme: 'purple' as const,
        icon: TrendingUp
      });
    }

    // 3. Balance Verification Status — dynamic
    if (verificationStatus === 'approved') {
      items.push({
        id: 'verification-approved',
        title: "Balance Verified",
        badge: "Approved",
        ping: false,
        message: "✅ Your RZC balance has been verified. Transfers are now unlocked!",
        onClick: () => navigate('/wallet/assets'),
        theme: 'emerald' as const,
        icon: CheckCircle2
      });
    } else if (verificationStatus === 'pending') {
      items.push({
        id: 'verification-pending',
        title: "Verification In Review",
        badge: "Pending",
        ping: true,
        message: "⏳ Balance verification under review • 24-48h • Transfers paused • Funds safe",
        onClick: () => navigate('/wallet/assets'),
        theme: 'amber' as const,
        icon: Clock
      });
    } else if (verificationStatus === 'rejected') {
      items.push({
        id: 'verification-rejected',
        title: "Verification Rejected",
        badge: "Action Needed",
        ping: true,
        message: "❌ Balance verification rejected. Tap to resubmit with correct details.",
        onClick: () => navigate('/wallet/assets'),
        theme: 'red' as const,
        icon: XCircle
      });
    } else {
      items.push({
        id: 'rzc-verification',
        title: "RZC Transfers Locked",
        badge: "Verification",
        ping: true,
        message: "🔒 RZC transfers paused • Balances being verified • Funds are safe",
        onClick: () => navigate('/wallet/assets'),
        theme: 'amber' as const,
        icon: Lock
      });
    }

    // 4. System News
    items.push({
      id: 'news',
      title: "System Update",
      badge: "Live",
      ping: true,
      message: "🚀 Enhanced portfolio charts & tracking now active. Check your updated wallet!",
      onClick: () => {},
      theme: 'blue' as const,
      icon: Zap
    });

    return items;
  }, [isActivated, activatedAt, navigate, migrationStatus, verificationStatus]);

  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentAnnouncementIndex(prev => (prev + 1) % announcements.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [announcements.length]);

  const currentAnnouncement = announcements[currentAnnouncementIndex];
  const CurrentIcon = currentAnnouncement.icon;

  const themeMap = {
    blue: {
      bg: "from-blue-50/90 via-indigo-50/90 to-purple-50/90 dark:from-blue-500/10 dark:via-indigo-500/10 dark:to-purple-500/10 border-blue-200/50 dark:border-blue-500/20",
      iconBg: "from-blue-500 to-indigo-600",
      title: "text-blue-900 dark:text-blue-300",
      badgeBg: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200/50 dark:border-blue-500/20",
      badgePing: "bg-blue-400",
      badgeDot: "bg-blue-500",
      message: "text-blue-800/80 dark:text-blue-200/70",
      chevron: "text-blue-600 dark:text-blue-400",
      glow: "from-blue-500/30 to-indigo-500/30",
    },
    amber: {
      bg: "from-amber-50/90 via-orange-50/90 to-amber-50/90 dark:from-amber-500/10 dark:via-orange-500/10 dark:to-amber-500/10 border-amber-200/50 dark:border-amber-500/20",
      iconBg: "from-amber-500 to-orange-600",
      title: "text-amber-900 dark:text-amber-300",
      badgeBg: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200/50 dark:border-amber-500/20",
      badgePing: "bg-amber-400",
      badgeDot: "bg-amber-500",
      message: "text-amber-800/80 dark:text-amber-200/70",
      chevron: "text-amber-600 dark:text-amber-400",
      glow: "from-amber-500/30 to-orange-500/30",
    },
    emerald: {
      bg: "from-emerald-50/90 via-teal-50/90 to-emerald-50/90 dark:from-emerald-500/10 dark:via-teal-500/10 dark:to-emerald-500/10 border-emerald-200/50 dark:border-emerald-500/20",
      iconBg: "from-emerald-500 to-teal-600",
      title: "text-emerald-900 dark:text-emerald-300",
      badgeBg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-500/20",
      badgePing: "bg-emerald-400",
      badgeDot: "bg-emerald-500",
      message: "text-emerald-800/80 dark:text-emerald-200/70",
      chevron: "text-emerald-600 dark:text-emerald-400",
      glow: "from-emerald-500/30 to-teal-500/30",
    },
    purple: {
      bg: "from-purple-50/90 via-fuchsia-50/90 to-purple-50/90 dark:from-purple-500/10 dark:via-fuchsia-500/10 dark:to-purple-500/10 border-purple-200/50 dark:border-purple-500/20",
      iconBg: "from-purple-500 to-fuchsia-600",
      title: "text-purple-900 dark:text-purple-300",
      badgeBg: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-200/50 dark:border-purple-500/20",
      badgePing: "bg-purple-400",
      badgeDot: "bg-purple-500",
      message: "text-purple-800/80 dark:text-purple-200/70",
      chevron: "text-purple-600 dark:text-purple-400",
      glow: "from-purple-500/30 to-fuchsia-500/30",
    },
    red: {
      bg: "from-red-50/90 via-rose-50/90 to-red-50/90 dark:from-red-500/10 dark:via-rose-500/10 dark:to-red-500/10 border-red-200/50 dark:border-red-500/20",
      iconBg: "from-red-500 to-rose-600",
      title: "text-red-900 dark:text-red-300",
      badgeBg: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-200/50 dark:border-red-500/20",
      badgePing: "bg-red-400",
      badgeDot: "bg-red-500",
      message: "text-red-800/80 dark:text-red-200/70",
      chevron: "text-red-600 dark:text-red-400",
      glow: "from-red-500/30 to-rose-500/30",
    }
  };
  
  const currentTheme = themeMap[currentAnnouncement.theme];

  useEffect(() => {
    refreshData();
    // Refresh wallet data (TON balance + profile) every 15s to update quickly on deposit
    const interval = setInterval(() => refreshData(), 15_000);
    return () => clearInterval(interval);
  }, []);

  // Refresh everything when user returns to the tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshData();
        refreshBalance();
        refreshTransactions();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Fetch latest transaction confirmation
  useEffect(() => {
    if (!address) return;

    let sub: any = null;

    const fetchConfirmation = async () => {
      try {
        const { notificationService } = await import('../services/notificationService');
        const res = await notificationService.getNotifications(address, { type: 'transaction_confirmed', limit: 1 });
        if (res.success && res.notifications && res.notifications.length > 0) {
          // Only show if it's unread
          const notif = res.notifications[0];
          if (!notif.is_read) {
            setLatestConfirmation(notif);
          }
        }
      } catch (err) {
        console.error('Error fetching confirmation', err);
      }
    };

    const setupRealtime = async () => {
      try {
        const { notificationService } = await import('../services/notificationService');
        sub = notificationService.subscribeToNotifications(address, (notif) => {
          if (notif.type === 'transaction_confirmed' && !notif.is_read) {
            setLatestConfirmation(notif);
          }
        });
      } catch (err) {
        console.error('Error setting up subscription', err);
      }
    };

    fetchConfirmation();
    setupRealtime();

    return () => {
      if (sub && typeof sub.unsubscribe === 'function') {
        sub.unsubscribe();
      }
    };
  }, [address]);

  const dismissConfirmation = async () => {
    if (!latestConfirmation) return;
    try {
      const { notificationService } = await import('../services/notificationService');
      await notificationService.markAsRead(latestConfirmation.id);
      setLatestConfirmation(null);
    } catch (err) {
      console.error('Error dismissing confirmation', err);
      setLatestConfirmation(null); // Optimistic dismiss
    }
  };

  // Close currency menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showCurrencyMenu) {
        const target = event.target as HTMLElement;
        if (!target.closest('.currency-selector')) {
          setShowCurrencyMenu(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCurrencyMenu]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refreshBalance(),
      refreshTransactions(),
      refreshData()
    ]);
    setIsRefreshing(false);
  };

  // Pre-compute balance display values (avoids IIFE in JSX which confuses TSX parser)
  const balanceDisplaySym = currencySymbols[selectedCurrency] || '';
  const balanceDisplaySuffix: string = ''; // Removed text suffixes since we now use prefix symbols for all currencies
  
  // Create a plain text string just for evaluating length to assign correct font sizes
  const balanceDisplayStr = `${selectedCurrency === 'USD' ? '$' : selectedCurrency === 'EUR' ? '€' : selectedCurrency === 'USDT' ? '₮' : selectedCurrency === 'BTC' ? '₿' : 'T'}${formatValue(convertedValue, selectedCurrency)}`;
  const balanceDisplayLen = balanceDisplayStr.length;
  const balanceSizeClass = balanceDisplayLen <= 7  ? 'text-5xl sm:text-6xl'
                         : balanceDisplayLen <= 11 ? 'text-4xl sm:text-5xl'
                         : balanceDisplayLen <= 15 ? 'text-3xl sm:text-4xl'
                         :                          'text-2xl sm:text-3xl';
  const balanceSuffixSizeClass = balanceDisplayLen <= 7 ? 'text-base sm:text-xl' : balanceDisplayLen <= 11 ? 'text-sm sm:text-lg' : 'text-xs sm:text-base';

  return (
    <>
      {/* Enhanced Animated Background with Theme Transitions */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -1 }}>
        {/* Primary animated orbs */}
        <div className="dashboard-bg-orb absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-emerald-400/20 to-cyan-400/20 dark:from-emerald-500/10 dark:to-cyan-500/10 rounded-full blur-3xl" 
             style={{ animation: 'pulse 4s ease-in-out infinite, float 8s ease-in-out infinite' }} />
        <div className="dashboard-bg-orb absolute top-3/4 right-1/4 w-80 h-80 bg-gradient-to-r from-blue-400/15 to-purple-400/15 dark:from-blue-500/8 dark:to-purple-500/8 rounded-full blur-3xl" 
             style={{ animation: 'pulse 6s ease-in-out infinite, float 10s ease-in-out infinite reverse' }} />
        <div className="dashboard-bg-orb absolute top-1/2 left-3/4 w-64 h-64 bg-gradient-to-r from-yellow-400/10 to-orange-400/10 dark:from-yellow-500/5 dark:to-orange-500/5 rounded-full blur-3xl" 
             style={{ animation: 'pulse 5s ease-in-out infinite, float 12s ease-in-out infinite' }} />
        <div className="dashboard-bg-orb absolute top-1/6 right-1/2 w-48 h-48 bg-gradient-to-r from-pink-400/8 to-rose-400/8 dark:from-pink-500/4 dark:to-rose-500/4 rounded-full blur-2xl" 
             style={{ animation: 'pulse 7s ease-in-out infinite, float 9s ease-in-out infinite' }} />
        <div className="dashboard-bg-orb absolute bottom-1/4 left-1/2 w-32 h-32 bg-gradient-to-r from-indigo-400/12 to-violet-400/12 dark:from-indigo-500/6 dark:to-violet-500/6 rounded-full blur-xl" 
             style={{ animation: 'pulse 3.5s ease-in-out infinite, float 11s ease-in-out infinite reverse' }} />
        
        {/* Floating particles */}
        <div className="absolute top-1/3 left-1/6 w-2 h-2 bg-emerald-400/40 dark:bg-emerald-400/20 rounded-full" 
             style={{ animation: 'bounce 3s ease-in-out infinite, sparkle 4s ease-in-out infinite' }} />
        <div className="absolute top-2/3 right-1/3 w-1.5 h-1.5 bg-blue-400/40 dark:bg-blue-400/20 rounded-full" 
             style={{ animation: 'bounce 4s ease-in-out infinite, sparkle 5s ease-in-out infinite' }} />
        <div className="absolute top-1/4 right-1/6 w-1 h-1 bg-purple-400/40 dark:bg-purple-400/20 rounded-full" 
             style={{ animation: 'bounce 2.5s ease-in-out infinite, sparkle 3s ease-in-out infinite' }} />
        <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-cyan-400/40 dark:bg-cyan-400/20 rounded-full" 
             style={{ animation: 'bounce 3.5s ease-in-out infinite, sparkle 4.5s ease-in-out infinite' }} />
        
        {/* Animated grid pattern */}
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.01]" 
             style={{
               backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.3) 1px, transparent 0)`,
               backgroundSize: '24px 24px',
               animation: 'gridMove 20s linear infinite'
             }} />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-emerald-50/30 dark:from-black/20 dark:via-transparent dark:to-emerald-950/10" />
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes float {
            0%, 100% { transform: translateY(0px) translateX(0px) scale(1); }
            25% { transform: translateY(-20px) translateX(10px) scale(1.02); }
            50% { transform: translateY(-10px) translateX(-5px) scale(0.98); }
            75% { transform: translateY(-15px) translateX(8px) scale(1.01); }
          }
          @keyframes gridMove {
            0% { transform: translate(0, 0); }
            100% { transform: translate(24px, 24px); }
          }
          @keyframes sparkle {
            0%, 100% { opacity: 0.4; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.2); }
          }
          /* Smooth theme transition — scoped to dashboard background only */
          .dashboard-bg-orb {
            transition: background-color 1000ms ease-in-out, opacity 1000ms ease-in-out, filter 1000ms ease-in-out;
          }
          .theme-transition-bg {
            transition: all 1000ms cubic-bezier(0.4, 0, 0.2, 1);
          }
        `
      }} />

      {/* Main Dashboard Content with enhanced theme transitions */}
      <div className="relative z-10 max-w-2xl mx-auto space-y-3.5 sm:space-y-5 page-enter px-3 sm:px-4 md:px-0 pb-4 animate-in fade-in slide-in-from-bottom-4 duration-700 theme-transition-bg">

        {/* Transaction Confirmation Action Card */}
        {latestConfirmation && (
          <div className="relative group p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl shadow-sm transition-all animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-md">
                <ShieldCheck size={20} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="text-sm font-heading font-black text-emerald-900 dark:text-emerald-300 leading-tight truncate">
                    {latestConfirmation.title}
                  </h3>
                  <button
                    onClick={(e) => { e.stopPropagation(); dismissConfirmation(); }}
                    className="p-1 px-1.5 bg-emerald-200/50 hover:bg-emerald-300/50 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/40 rounded-lg text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-200 transition-colors text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-xs font-heading font-semibold text-emerald-800 dark:text-emerald-400/90 leading-snug">
                  {latestConfirmation.message}
                </p>
                {latestConfirmation.data?.txHash && (
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <span className="text-[9px] font-heading font-black uppercase tracking-widest bg-emerald-600/10 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-md">
                      Verified On-Chain
                    </span>
                    <a
                      href={getTransactionUrl(latestConfirmation.data.txHash, network)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] font-heading font-black uppercase tracking-widest text-emerald-600 hover:underline flex items-center gap-0.5"
                    >
                      View Tx <ExternalLink size={10} />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Live Price Ticker Strip */}
        {(() => {
          const priceItems = [
            tonPrice > 0        && { symbol: 'TON',  price: `$${tonPrice.toFixed(2)}`,                                              color: 'text-blue-600 dark:text-blue-400',     bg: 'bg-blue-100 dark:bg-blue-500/15' },
            btcPrice > 0        && { symbol: 'BTC',  price: `$${btcPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,   color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-500/15' },
            ethPrice > 0        && { symbol: 'ETH',  price: `$${ethPrice.toFixed(2)}`,                                              color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-500/15' },
            bnbPrice > 0        && { symbol: 'BNB',  price: `$${bnbPrice.toFixed(2)}`,                                              color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-500/15' },
            solPrice > 0        && { symbol: 'SOL',  price: `$${solPrice.toFixed(2)}`,                                              color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-500/15' },
            maticPrice > 0      && { symbol: 'POL',  price: `$${maticPrice.toFixed(3)}`,                                            color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-500/15' },
            avaxPrice > 0       && { symbol: 'AVAX', price: `$${avaxPrice.toFixed(2)}`,                                             color: 'text-red-600 dark:text-red-400',       bg: 'bg-red-100 dark:bg-red-500/15' },
            tronPrice > 0       && { symbol: 'TRX',  price: `$${tronPrice.toFixed(4)}`,                                             color: 'text-rose-600 dark:text-rose-400',     bg: 'bg-rose-100 dark:bg-rose-500/15' },
            usdtPrice > 0       && { symbol: 'USDT', price: `$${usdtPrice.toFixed(3)}`,                                             color: 'text-teal-600 dark:text-teal-400',     bg: 'bg-teal-100 dark:bg-teal-500/15' },
            contextRzcPrice > 0 && { symbol: 'RZC',  price: `$${contextRzcPrice.toFixed(4)}`,                                       color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-500/15' },
          ].filter(Boolean) as { symbol: string; price: string; color: string; bg: string }[];

          if (priceItems.length === 0) return null;
          // Duplicate for seamless loop
          const doubled = [...priceItems, ...priceItems];

          return (
            <div className="overflow-hidden rounded-xl bg-white/80 dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10" style={{ contain: 'paint' }}>
              <div className="flex items-stretch">
                <div className="flex-shrink-0 px-2.5 bg-gradient-to-b from-slate-800 to-slate-900 dark:from-white/10 dark:to-white/5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-white dark:text-white/70">Live</span>
                </div>
                <div className="flex-1 overflow-hidden py-1.5">
                  <div className="flex animate-marquee whitespace-nowrap gap-5 px-3" style={{ width: 'max-content' }}>
                    {doubled.map((item, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5">
                        <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${item.bg} ${item.color}`}>
                          {item.symbol}
                        </span>
                        <span className="text-[10px] font-numbers font-bold text-slate-700 dark:text-slate-300">
                          {item.price}
                        </span>
                        <span className="text-slate-400 dark:text-white/10 text-[10px]">·</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Announcement Ticker — animated slide */}
        {announcements.length > 0 && (
          <div
            className="overflow-hidden rounded-xl bg-white/80 dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 cursor-pointer active:scale-[0.99] transition-transform"
            onClick={currentAnnouncement.onClick}
          >
            <div className="flex items-stretch">
              {/* Left accent — color changes with theme */}
              <div className={`flex-shrink-0 px-3 flex items-center bg-gradient-to-b ${
                currentAnnouncement.theme === 'emerald' ? 'from-emerald-500 to-teal-600' :
                currentAnnouncement.theme === 'amber'   ? 'from-amber-500 to-orange-600' :
                currentAnnouncement.theme === 'red'     ? 'from-red-500 to-rose-600' :
                currentAnnouncement.theme === 'purple'  ? 'from-purple-500 to-fuchsia-600' :
                'from-blue-500 to-indigo-600'
              } transition-all duration-500`}>
                <Zap size={12} className="text-white" />
              </div>

              {/* Content — slides in/out */}
              <div className="flex-1 py-2 px-3 overflow-hidden min-w-0">
                <div
                  key={currentAnnouncement.id}
                  className="flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300"
                >
                  {/* Badge */}
                  <span className={`flex-shrink-0 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                    currentAnnouncement.theme === 'emerald' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                    currentAnnouncement.theme === 'amber'   ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                    currentAnnouncement.theme === 'red'     ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' :
                    currentAnnouncement.theme === 'purple'  ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400' :
                    'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                  }`}>
                    {currentAnnouncement.badge}
                  </span>

                  {/* Message */}
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 truncate">
                    {currentAnnouncement.message.replace(/[✅⚠️⏳❌🔄🔒🚀]/g, '').trim()}
                  </span>

                  {/* Ping dot for active items */}
                  {currentAnnouncement.ping && (
                    <span className="flex-shrink-0 relative flex h-1.5 w-1.5 ml-auto">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        currentAnnouncement.theme === 'emerald' ? 'bg-emerald-400' :
                        currentAnnouncement.theme === 'amber'   ? 'bg-amber-400' :
                        currentAnnouncement.theme === 'red'     ? 'bg-red-400' :
                        currentAnnouncement.theme === 'purple'  ? 'bg-purple-400' :
                        'bg-blue-400'
                      }`} />
                      <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                        currentAnnouncement.theme === 'emerald' ? 'bg-emerald-500' :
                        currentAnnouncement.theme === 'amber'   ? 'bg-amber-500' :
                        currentAnnouncement.theme === 'red'     ? 'bg-red-500' :
                        currentAnnouncement.theme === 'purple'  ? 'bg-purple-500' :
                        'bg-blue-500'
                      }`} />
                    </span>
                  )}
                </div>

                {/* Progress dots */}
                <div className="flex items-center gap-1 mt-1.5">
                  {announcements.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => { e.stopPropagation(); setCurrentAnnouncementIndex(i); }}
                      className={`h-0.5 rounded-full transition-all duration-300 ${
                        i === currentAnnouncementIndex
                          ? `w-4 ${
                              currentAnnouncement.theme === 'emerald' ? 'bg-emerald-500' :
                              currentAnnouncement.theme === 'amber'   ? 'bg-amber-500' :
                              currentAnnouncement.theme === 'red'     ? 'bg-red-500' :
                              currentAnnouncement.theme === 'purple'  ? 'bg-purple-500' :
                              'bg-blue-500'
                            }`
                          : 'w-1.5 bg-slate-300 dark:bg-white/20'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Claim Missing Activation Bonus */}
        <ClaimActivationBonus />
          {/* RZC Early Bird CTA — compact */}
        <div className="relative group cursor-pointer active:scale-[0.98] transition-all" onClick={() => navigate('/wallet/store')}>
          <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/30 via-yellow-400/20 to-cyan-500/30 rounded-2xl blur-md opacity-60 group-hover:opacity-90 transition-opacity" />
          <div className="relative rounded-xl overflow-hidden border  border-primary/20 border-emerald-400 dark:border-emerald-500/30 shadow-lg">

            {/* Urgency strip */}
            <div className="bg-gradient-to-r from-red-600 via-orange-500 to-red-600 px-3 py-1 flex items-center justify-between">
              <span className="text-[8px] font-heading font-black text-white uppercase tracking-widest">⚠️ Pre-Sale — Price rises next round</span>
              <span className="text-[8px] font-heading font-black text-yellow-200 animate-pulse">Don't miss out</span>
            </div>

            {/* Body */}
            <div className="bg-gradient-to-br from-amber-50/80 via-emerald-50 to-cyan-50/80 dark:from-[#1a1a0a] dark:via-[#0a1a10] dark:to-[#0a1218] p-3 flex items-center gap-3">

              {/* Icon */}
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-yellow-400 rounded-lg blur-sm opacity-30 animate-pulse" />
                <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-400 to-emerald-500 flex items-center justify-center shadow-md text-lg">🪙</div>
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-sm font-heading font-black text-gray-900 dark:text-white">RZC</span>
                  <span className="text-lg font-numbers font-black text-yellow-600 dark:text-yellow-400">${contextRzcPrice.toFixed(2)}</span>
                  <span className="text-[9px] font-numbers text-gray-600 dark:text-gray-400 line-through">$0.18</span>
                  <span className="text-[8px] font-heading font-black bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 px-1.5 py-0.5 rounded-full">Early Bird</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[9px] font-heading text-gray-700 dark:text-gray-400">✓ Instant delivery</span>
                  <span className="text-[9px] font-heading text-gray-700 dark:text-gray-400">✓ 10% referral</span>
                  <span className="text-[9px] font-heading text-gray-700 dark:text-gray-400">✓ $100–$10K</span>
                </div>
              </div>

              {/* CTA */}
              <div className="flex-shrink-0 px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-[10px] font-heading font-black text-white shadow-md shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-all whitespace-nowrap">
                Buy Now →
              </div>
            </div>

            {/* Price ladder */}
            <div className="bg-gradient-to-r from-emerald-50 to-cyan-50 dark:from-emerald-950/40 dark:to-cyan-950/30 border-t border-emerald-100 dark:border-white/5 px-3 py-1.5 flex items-center gap-1 justify-between">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[8px] font-numbers font-black text-emerald-600 dark:text-emerald-400">R1 ${contextRzcPrice.toFixed(2)} ✅</span>
              </div>
              <span className="text-[8px] text-gray-600 dark:text-gray-600">→</span>
              <span className="text-[8px] font-numbers text-orange-500 dark:text-orange-400/70 font-bold">R2 $0.18 ⏳</span>
              <span className="text-[8px] text-gray-600 dark:text-gray-600">→</span>
              <span className="text-[8px] font-numbers text-red-500 dark:text-red-400/60 font-bold">R3 $0.25 🔒</span>
              <span className="text-[8px] text-gray-600 dark:text-gray-600">→</span>
              <span className="text-[8px] font-heading text-gray-700 dark:text-gray-500 font-bold">Exchange 🚀</span>
            </div>
          </div>
        </div>


        {/* Network Switcher - Compact */}
        <div className="flex items-center justify-between hidden">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${network === 'mainnet' ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`} />
            <span className="text-[10px] font-bold text-gray-700 dark:text-gray-500 uppercase tracking-wider">
              {networkConfig.NAME}
            </span>
            <button
              onClick={() => setShowNetworkInfo(!showNetworkInfo)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Network info"
            >
              <Info size={12} className="text-gray-700 dark:text-gray-500" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector compact />
            <button
              onClick={() => switchNetwork(network === 'mainnet' ? 'testnet' : 'mainnet')}
              className="px-3 py-1.5 bg-white dark:bg-white/5 border  border-primary/20   border-gray-300 dark:border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest text-gray-800 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-emerald-600 dark:hover:text-primary transition-all active:scale-95 shadow-sm"
            >
              {t('dashboard.switch')}
            </button>
          </div>
        </div>

        {/* Network Info Panel - Compact */}
        {showNetworkInfo && (
          <div className="p-3 sm:p-4 bg-white dark:bg-white/5 border  border-primary/20   border-gray-300 dark:border-white/10 rounded-xl sm:rounded-2xl space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-800 dark:text-gray-400">{t('dashboard.networkDetails')}</h4>
              <button
                onClick={() => setShowNetworkInfo(false)}
                className="text-gray-700 hover:text-gray-950 dark:text-gray-400 dark:hover:text-gray-300 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div>
                <p className="text-gray-700 dark:text-gray-500 font-medium mb-0.5 text-[10px]">{t('dashboard.network')}</p>
                <p className="text-gray-950 dark:text-white font-bold text-xs">{networkConfig.NAME}</p>
              </div>
              <div>
                <p className="text-gray-700 dark:text-gray-500 font-medium mb-0.5 text-[10px]">{t('dashboard.chainId')}</p>
                <p className="text-gray-950 dark:text-white font-bold text-xs">{networkConfig.CHAIN_ID}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-700 dark:text-gray-500 font-medium mb-0.5 text-[10px]">{t('dashboard.explorer')}</p>
                <a
                  href={networkConfig.EXPLORER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 dark:text-primary hover:underline font-mono text-[10px] flex items-center gap-1 break-all font-semibold"
                >
                  {networkConfig.EXPLORER_URL.replace('https://', '')}
                  <ExternalLink size={10} className="flex-shrink-0" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Portfolio Terminal Card - Enhanced with Token Breakdown and Theme Transitions */}
        <div className="relative group">
          {/* Enhanced animated background glow with smooth theme transitions */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-300/60 to-cyan-300/60 dark:from-primary/20 dark:to-secondary/20 rounded-2xl sm:rounded-[2rem] blur-lg opacity-30 group-hover:opacity-60 transition-all duration-1000 ease-in-out" 
               style={{ animation: 'pulse 3s ease-in-out infinite, themeShift 6s ease-in-out infinite alternate' }} />
          
          {/* Floating sparkles */}
          <div className="absolute top-4 right-8 w-1 h-1 bg-emerald-400/60 dark:bg-emerald-400/40 rounded-full animate-bounce" 
               style={{ animationDuration: '2s', animationDelay: '0s' }} />
          <div className="absolute top-8 right-12 w-0.5 h-0.5 bg-cyan-400/60 dark:bg-cyan-400/40 rounded-full animate-bounce" 
               style={{ animationDuration: '2.5s', animationDelay: '1s' }} />
          <div className="absolute top-6 right-16 w-0.5 h-0.5 bg-blue-400/60 dark:bg-blue-400/40 rounded-full animate-bounce" 
               style={{ animationDuration: '1.8s', animationDelay: '0.5s' }} />
          <div className="relative bg-gradient-to-br from-white via-emerald-50/40 to-cyan-50/30 dark:from-[#111] dark:via-[#0f1a14] dark:to-[#0a1018] backdrop-blur-xl border  border-primary/20   border-emerald-300 dark:border-white/10 rounded-2xl sm:rounded-[2rem] overflow-hidden shadow-xl shadow-emerald-500/15 dark:shadow-emerald-500/5">
            {/* Premium gradient top accent strip */}
            <div className="h-[3px] w-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-blue-500" />
            {/* Subtle inner glow */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-emerald-400/[0.10] dark:from-emerald-500/[0.08] to-transparent" />

            {balanceError ? (
              <div className="p-4 sm:p-5 bg-red-100 dark:bg-red-500/10 border  border-primary/20   border-red-300 dark:border-red-500/20 rounded-xl sm:rounded-2xl shadow-sm m-4 sm:m-6">
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={18} />
                  <div>
                    <h4 className="font-bold text-sm text-red-900 dark:text-red-300 mb-1">{t('dashboard.failedToLoadBalance')}</h4>
                    <p className="text-xs text-red-700 dark:text-red-400 mb-2.5 font-semibold">{balanceError}</p>
                    <button
                      onClick={handleRefresh}
                      className="px-3.5 py-1.5 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase hover:bg-red-700 transition-all active:scale-95 shadow-sm"
                    >
                      {t('common.retry')}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Header Section */}
                <div className="p-5 sm:p-6 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5 sm:space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 text-gray-700 dark:text-gray-500">
                        <ShieldCheck size={12} className="text-emerald-600 dark:text-primary flex-shrink-0" />
                        <span className="text-[9px] sm:text-[10px] font-heading font-black uppercase tracking-widest truncate">{t('dashboard.totalPortfolio')}</span>
                      </div>

                      {balanceLoading ? (
                        <LoadingSkeleton width={200} height={40} />
                      ) : (
                        <h2 className={`${balanceSizeClass} font-numbers font-black tracking-tight text-gray-950 dark:text-white transition-all duration-300`}>
                          {balanceVisible ? (
                            <span className="inline-flex items-baseline gap-0">
                              {/* Currency prefix symbol — explicit color, NOT inside gradient clip */}
                              {balanceDisplaySym && (
                                <span className={`font-black opacity-90 ${selectedCurrency === 'TON' ? 'text-[#0098EA] dark:text-[#33A5FF]' : 'text-emerald-700 dark:text-[#00FF88]'} pr-1`}>
                                  {balanceDisplaySym}
                                </span>
                              )}
                              {/* Numeric value — gradient clipped */}
                              <span className="luxury-gradient-text font-glow inline-block py-1 leading-none">
                                {formatValue(convertedValue, selectedCurrency)}
                              </span>
                              {/* Currency suffix (BTC / TON) — explicit muted color */}
                              {balanceDisplaySuffix && (
                                <span className={`${balanceSuffixSizeClass} font-numbers font-bold text-emerald-700/60 dark:text-[#00FF88]/50 ml-1`}>{balanceDisplaySuffix.trim()}</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-700">••••••••</span>
                          )}
                        </h2>
                      )}

                      {balanceLoading ? (
                        <LoadingSkeleton width={120} height={14} />
                      ) : (
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <div className={`flex items-center gap-1.5 font-numbers font-bold text-[10px] sm:text-xs transition-colors duration-300 ${change24h >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>
                            <TrendingUp size={10} className={`transition-transform duration-300 ${change24h < 0 ? 'rotate-180' : ''}`} />
                            <span>
                              {balanceVisible ? (
                                change24h === 0 ? 'No change' : `${change24h >= 0 ? '+' : ''}$${Math.abs(change24h).toFixed(2)} (${changePercent24h >= 0 ? '+' : ''}${changePercent24h.toFixed(2)}%)`
                              ) : (
                                '•••••'
                              )}
                            </span>
                          </div>
                          <span className="text-[8px] font-numbers text-gray-700 dark:text-gray-600 font-medium">24h</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-1.5 sm:gap-2">
                      {/* Currency Selector */}
                      <div className="relative currency-selector">
                        <button
                          onClick={() => setShowCurrencyMenu(!showCurrencyMenu)}
                          className="p-2 sm:p-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-all text-gray-800 dark:text-gray-400 active:scale-90 text-[10px] font-black min-w-[44px] flex items-center justify-center shadow-sm"
                          aria-label="Select currency"
                        >
                          {selectedCurrency}
                        </button>

                        {showCurrencyMenu && (
                          <div className="absolute right-0 top-full mt-2 bg-white dark:bg-[#0a0a0a] border  border-primary/20   border-gray-300 dark:border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden min-w-[120px] animate-in fade-in slide-in-from-top-2 duration-200">
                            {currencies.map((currency) => (
                              <button
                                key={currency}
                                onClick={() => {
                                  setSelectedCurrency(currency);
                                  setShowCurrencyMenu(false);
                                }}
                                className={`w-full px-4 py-2.5 text-left text-xs font-bold transition-colors flex items-center justify-between gap-2 ${selectedCurrency === currency
                                  ? 'bg-emerald-100 dark:bg-primary/10 text-emerald-700 dark:text-primary'
                                  : 'text-gray-800 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                                  }`}
                              >
                                <span>{currency}</span>
                                {selectedCurrency === currency && (
                                  <span className="text-emerald-600 dark:text-primary">✓</span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => setBalanceVisible(!balanceVisible)}
                        className="p-2 sm:p-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-all text-gray-800 dark:text-gray-400 active:scale-90 shadow-sm"
                        aria-label={balanceVisible ? t('dashboard.hideBalance') : t('dashboard.showBalance')}
                      >
                        {balanceVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="p-2 sm:p-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-all text-gray-800 dark:text-gray-400 active:scale-90 disabled:opacity-50 shadow-sm"
                        aria-label={t('dashboard.refreshBalance')}
                      >
                        <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Compact Token Breakdown */}
                <div className="px-4 sm:px-6 pb-4 sm:pb-5">
                  {/* Token Cards */}
                  <div className="flex gap-2 flex-wrap">
                    {/* TON */}
                    <div className="flex-1 min-w-[140px] rounded-xl overflow-hidden border  border-primary/20   border-blue-300 dark:border-blue-500/25 shadow-sm hover:shadow-blue-500/20 hover:shadow-md transition-all group/card">
                      <div className="h-[2.5px] w-full bg-gradient-to-r from-blue-500 to-indigo-500" />
                      <div className="p-2.5 sm:p-3 bg-gradient-to-br from-blue-100/80 via-blue-50/60 to-indigo-50/40 dark:from-blue-500/15 dark:via-blue-900/20 dark:to-indigo-900/10 flex items-center gap-2">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/25 flex-shrink-0 group-hover/card:scale-105 transition-transform">
                          <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="currentColor">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] sm:text-xs font-heading font-black text-blue-900 dark:text-blue-300">TON</span>
                            <span className="text-[8px] font-numbers font-bold text-blue-600 dark:text-blue-400 bg-blue-100/80 dark:bg-blue-500/20 px-1 py-0.5 rounded">
                              {combinedPortfolioValue > 0 ? ((totalUsdValue / combinedPortfolioValue) * 100).toFixed(0) : 0}%
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm font-numbers font-black text-blue-900 dark:text-white truncate">
                            {balanceVisible ? tonBalance.toFixed(2) : '••••'}
                          </p>
                          <p className="text-[9px] sm:text-[10px] font-numbers font-semibold text-blue-600/80 dark:text-blue-400">
                            {balanceVisible ? `${currencySymbols[selectedCurrency]}${(totalUsdValue * conversionRates[selectedCurrency]).toFixed(2)}` : '••••'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* RZC */}
                    <div className="flex-1 min-w-[140px] rounded-xl overflow-hidden border  border-primary/20   border-emerald-300 dark:border-emerald-500/25 shadow-sm hover:shadow-emerald-500/20 hover:shadow-md transition-all group/card">
                      <div className="h-[2.5px] w-full bg-gradient-to-r from-emerald-500 to-cyan-400" />
                      <div className="p-2.5 sm:p-3 bg-gradient-to-br from-emerald-100/80 via-emerald-50/60 to-cyan-50/40 dark:from-emerald-500/15 dark:via-emerald-900/20 dark:to-cyan-900/10 flex items-center gap-2">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-md shadow-emerald-500/25 flex-shrink-0 group-hover/card:scale-105 transition-transform">
                          <span className="text-white text-[9px] sm:text-[10px] font-black">RZC</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] sm:text-xs font-heading font-black text-emerald-900 dark:text-emerald-300">RZC</span>
                            <span className="text-[8px] font-numbers font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-500/20 px-1 py-0.5 rounded">
                              {combinedPortfolioValue > 0 ? ((rzcUsdValue / combinedPortfolioValue) * 100).toFixed(0) : 0}%
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm font-numbers font-black text-emerald-900 dark:text-white truncate">
                            {balanceVisible ? rzcBalance.toLocaleString() : '••••'}
                          </p>
                          <p className="text-[9px] sm:text-[10px] font-numbers font-semibold text-emerald-600/80 dark:text-emerald-400">
                            {balanceVisible ? `${currencySymbols[selectedCurrency]}${(rzcUsdValue * conversionRates[selectedCurrency]).toFixed(2)}` : '••••'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* EVM — only if multi-chain active */}
                    {multiChainBalances && evmUsdValue > 0 && (
                      <div className="flex-1 min-w-[140px] p-2.5 sm:p-3 rounded-xl bg-violet-50/80 dark:bg-violet-500/10 border border-violet-200/50 dark:border-violet-500/20 flex items-center gap-2 hover:bg-violet-100/50 dark:hover:bg-violet-500/15 transition-colors">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg overflow-hidden flex-shrink-0 border border-white/20">
                          <img src={CHAIN_META[currentEvmChain]?.logo} alt="EVM" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-monoPrecision font-black text-violet-900 dark:text-violet-300">{CHAIN_META[currentEvmChain]?.symbol ?? 'ETH'}</span>
                            <span className="text-[8px] font-monoPrecision font-bold text-violet-500 dark:text-violet-400 bg-violet-100/80 dark:bg-violet-500/20 px-1 py-0.5 rounded">
                              {combinedPortfolioValue > 0 ? ((evmUsdValue / combinedPortfolioValue) * 100).toFixed(0) : 0}%
                            </span>
                          </div>
                          <p className="text-xs font-monoPrecision font-black text-violet-900 dark:text-white truncate">
                            {balanceVisible ? parseFloat(multiChainBalances.evm).toFixed(4) : '••••'}
                          </p>
                          <p className="text-[9px] font-monoPrecision font-semibold text-violet-600 dark:text-violet-400">
                            {balanceVisible ? `$${(evmUsdValue * conversionRates[selectedCurrency]).toFixed(2)}` : '••••'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* BTC — only if multi-chain active */}
                    {multiChainBalances && btcUsdValue > 0 && (
                      <div className="flex-1 min-w-[140px] p-2.5 sm:p-3 rounded-xl bg-orange-50/80 dark:bg-orange-500/10 border border-orange-200/50 dark:border-orange-500/20 flex items-center gap-2 hover:bg-orange-100/50 dark:hover:bg-orange-500/15 transition-colors">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg overflow-hidden flex-shrink-0">
                          <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png" alt="BTC" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-monoPrecision font-black text-orange-900 dark:text-orange-300">BTC</span>
                            <span className="text-[8px] font-monoPrecision font-bold text-orange-500 dark:text-orange-400 bg-orange-100/80 dark:bg-orange-500/20 px-1 py-0.5 rounded">
                              {combinedPortfolioValue > 0 ? ((btcUsdValue / combinedPortfolioValue) * 100).toFixed(0) : 0}%
                            </span>
                          </div>
                          <p className="text-xs font-monoPrecision font-black text-orange-900 dark:text-white truncate">
                            {balanceVisible ? parseFloat(multiChainBalances.btc).toFixed(5) : '••••'}
                          </p>
                          <p className="text-[9px] font-monoPrecision font-semibold text-orange-600 dark:text-orange-400">
                            {balanceVisible ? `$${(btcUsdValue * conversionRates[selectedCurrency]).toFixed(2)}` : '••••'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* USDT — only if multi-chain active */}
                    {multiChainBalances && usdtUsdValue > 0 && (
                      <div className="flex-1 min-w-[140px] p-2.5 sm:p-3 rounded-xl bg-teal-50/80 dark:bg-teal-500/10 border border-teal-200/50 dark:border-teal-500/20 flex items-center gap-2 hover:bg-teal-100/50 dark:hover:bg-teal-500/15 transition-colors">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg overflow-hidden flex-shrink-0">
                          <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png" alt="USDT" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-monoPrecision font-black text-teal-900 dark:text-teal-300">USDT</span>
                            <span className="text-[8px] font-monoPrecision font-bold text-teal-500 dark:text-teal-400 bg-teal-100/80 dark:bg-teal-500/20 px-1 py-0.5 rounded">
                              {combinedPortfolioValue > 0 ? ((usdtUsdValue / combinedPortfolioValue) * 100).toFixed(0) : 0}%
                            </span>
                          </div>
                          <p className="text-xs font-monoPrecision font-black text-teal-900 dark:text-white truncate">
                            {balanceVisible ? parseFloat(multiChainBalances.usdt).toFixed(2) : '••••'}
                          </p>
                          <p className="text-[9px] font-monoPrecision font-semibold text-teal-600 dark:text-teal-400">
                            {balanceVisible ? `$${usdtUsdValue.toFixed(2)}` : '••••'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* SOL — only if multi-chain active */}
                    {multiChainBalances && solUsdValue > 0 && (
                      <div className="flex-1 min-w-[140px] p-2.5 sm:p-3 rounded-xl bg-purple-50/80 dark:bg-purple-500/10 border border-purple-200/50 dark:border-purple-500/20 flex items-center gap-2 hover:bg-purple-100/50 dark:hover:bg-purple-500/15 transition-colors">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg overflow-hidden flex-shrink-0">
                          <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png" alt="SOL" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-monoPrecision font-black text-purple-900 dark:text-purple-300">SOL</span>
                            <span className="text-[8px] font-monoPrecision font-bold text-purple-500 dark:text-purple-400 bg-purple-100/80 dark:bg-purple-500/20 px-1 py-0.5 rounded">
                              {combinedPortfolioValue > 0 ? ((solUsdValue / combinedPortfolioValue) * 100).toFixed(0) : 0}%
                            </span>
                          </div>
                          <p className="text-xs font-monoPrecision font-black text-purple-900 dark:text-white truncate">
                            {balanceVisible ? parseFloat(multiChainBalances.sol).toFixed(4) : '••••'}
                          </p>
                          <p className="text-[9px] font-monoPrecision font-semibold text-purple-600 dark:text-purple-400">
                            {balanceVisible ? `$${solUsdValue.toFixed(2)}` : '••••'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* TRON — only if multi-chain active */}
                    {multiChainBalances && tronUsdValue > 0 && (
                      <div className="flex-1 min-w-[140px] p-2.5 sm:p-3 rounded-xl bg-red-50/80 dark:bg-red-500/10 border border-red-200/50 dark:border-red-500/20 flex items-center gap-2 hover:bg-red-100/50 dark:hover:bg-red-500/15 transition-colors">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg overflow-hidden flex-shrink-0">
                          <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/tron/info/logo.png" alt="TRX" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-monoPrecision font-black text-red-900 dark:text-red-300">TRX</span>
                            <span className="text-[8px] font-monoPrecision font-bold text-red-500 dark:text-red-400 bg-red-100/80 dark:bg-red-500/20 px-1 py-0.5 rounded">
                              {combinedPortfolioValue > 0 ? ((tronUsdValue / combinedPortfolioValue) * 100).toFixed(0) : 0}%
                            </span>
                          </div>
                          <p className="text-xs font-monoPrecision font-black text-red-900 dark:text-white truncate">
                            {balanceVisible ? parseFloat(multiChainBalances.tron).toFixed(2) : '••••'}
                          </p>
                          <p className="text-[9px] font-monoPrecision font-semibold text-red-600 dark:text-red-400">
                            {balanceVisible ? `$${tronUsdValue.toFixed(2)}` : '••••'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* WDK TON (secondary wallet) */}
                    {multiChainBalances && wdkTonUsdValue > 0 && (
                      <div className="flex-1 min-w-[140px] p-2.5 sm:p-3 rounded-xl bg-sky-50/80 dark:bg-sky-500/10 border border-sky-200/50 dark:border-sky-500/20 flex items-center gap-2 hover:bg-sky-100/50 dark:hover:bg-sky-500/15 transition-colors">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg overflow-hidden flex-shrink-0">
                          <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ton/info/logo.png" alt="TON" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-monoPrecision font-black text-sky-900 dark:text-sky-300">TON²</span>
                            <span className="text-[8px] font-monoPrecision font-bold text-sky-500 dark:text-sky-400 bg-sky-100/80 dark:bg-sky-500/20 px-1 py-0.5 rounded">
                              {combinedPortfolioValue > 0 ? ((wdkTonUsdValue / combinedPortfolioValue) * 100).toFixed(0) : 0}%
                            </span>
                          </div>
                          <p className="text-xs font-monoPrecision font-black text-sky-900 dark:text-white truncate">
                            {balanceVisible ? parseFloat(multiChainBalances.ton).toFixed(4) : '••••'}
                          </p>
                          <p className="text-[9px] font-monoPrecision font-semibold text-sky-600 dark:text-sky-400">
                            {balanceVisible ? `$${wdkTonUsdValue.toFixed(2)}` : '••••'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Allocation Bar — dynamic segments */}
                  <div className="mt-3.5 space-y-2">
                    <div className="flex items-center gap-0.5 h-2 bg-gray-200/80 dark:bg-gray-700/80 rounded-full overflow-hidden shadow-inner">
                      {combinedPortfolioValue > 0 && [
                        { value: totalUsdValue,  color: 'bg-gradient-to-r from-blue-500 to-indigo-500' },
                        { value: rzcUsdValue,    color: 'bg-gradient-to-r from-emerald-500 to-cyan-500' },
                        { value: evmUsdValue,    color: 'bg-gradient-to-r from-violet-500 to-purple-500' },
                        { value: btcUsdValue,    color: 'bg-gradient-to-r from-orange-500 to-amber-500' },
                        { value: usdtUsdValue,   color: 'bg-gradient-to-r from-teal-500 to-green-500' },
                        { value: solUsdValue,    color: 'bg-gradient-to-r from-purple-500 to-fuchsia-500' },
                        { value: tronUsdValue,   color: 'bg-gradient-to-r from-red-500 to-rose-500' },
                        { value: wdkTonUsdValue, color: 'bg-gradient-to-r from-sky-500 to-blue-400' },
                      ].map((seg, i) => seg.value > 0 && (
                        <div key={i} className={`${seg.color} h-full transition-all duration-500`} style={{ width: `${(seg.value / combinedPortfolioValue) * 100}%` }} />
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 text-[8px] font-numbers font-bold flex-shrink-0 flex-wrap">
                      {totalUsdValue > 0 && <span className="text-blue-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />TON {((totalUsdValue / combinedPortfolioValue) * 100).toFixed(0)}%</span>}
                      {rzcUsdValue > 0 && <span className="text-emerald-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />RZC {((rzcUsdValue / combinedPortfolioValue) * 100).toFixed(0)}%</span>}
                      {evmUsdValue > 0 && <span className="text-violet-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block" />{CHAIN_META[currentEvmChain]?.symbol ?? 'ETH'} {((evmUsdValue / combinedPortfolioValue) * 100).toFixed(0)}%</span>}
                      {btcUsdValue > 0 && <span className="text-orange-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block" />BTC {((btcUsdValue / combinedPortfolioValue) * 100).toFixed(0)}%</span>}
                      {usdtUsdValue > 0 && <span className="text-teal-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block" />USDT {((usdtUsdValue / combinedPortfolioValue) * 100).toFixed(0)}%</span>}
                      {solUsdValue > 0 && <span className="text-purple-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block" />SOL {((solUsdValue / combinedPortfolioValue) * 100).toFixed(0)}%</span>}
                      {tronUsdValue > 0 && <span className="text-red-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />TRX {((tronUsdValue / combinedPortfolioValue) * 100).toFixed(0)}%</span>}
                    </div>
                  </div>
                </div>

                {/* Price Projection Chart */}
                <div className="px-5 sm:px-6 pb-5 sm:pb-6">
                  <div className="flex bg-gradient-to-r from-slate-100 via-emerald-50/50 to-slate-100 dark:from-white/5 dark:via-white/3 dark:to-white/5 rounded-xl p-1 border  border-primary/20   border-slate-300 dark:border-white/5 shadow-inner w-full mb-4">
                    {(['SEED', 'PRESALE', 'PUBLIC'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setTimeframe(t)}
                        className={`flex-1 py-1.5 rounded-lg text-[9px] font-heading font-black tracking-widest transition-all uppercase ${
                          timeframe === t
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                            : 'text-gray-600 hover:text-gray-800 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-gray-200/50 dark:hover:bg-white/5'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  <div className="h-28 w-full relative mb-4">
                    {/* Start Marker */}
                    <div className="absolute left-0 bottom-[22px] w-2.5 h-2.5 bg-white rounded-full border  border-primary/20   border-emerald-500 z-20 shadow-[0_0_10px_#10b981]" />

                    {/* Target Marker */}
                    <div
                      className="absolute right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full blur-[2px] animate-pulse z-20"
                      style={{
                        top: timeframe === 'SEED' ? '65%' : timeframe === 'PRESALE' ? '40%' : '12%'
                      }}
                    />

                    <svg viewBox="0 0 400 80" className="w-full h-full overflow-visible drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                      <defs>
                        <linearGradient id="projFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                        </linearGradient>
                      </defs>

                      {/* Baseline at 1.0x */}
                      <line x1="0" y1="65" x2="400" y2="65" stroke="#10b981" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="4 4" />

                      <path
                        d={chartPath.replace(/120/g, '80')}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3"
                        strokeLinecap="round"
                        className="animate-chart-draw"
                      />
                      <path
                        d={`${chartPath.replace(/120/g, '80')} L 400 80 L 0 80 Z`}
                        fill="url(#projFill)"
                      />
                    </svg>
                  </div>

                  <div className="flex justify-between gap-1 text-gray-700 dark:text-zinc-400 text-[9px] sm:text-[10px] font-black uppercase tracking-widest border-t border-gray-200 dark:border-white/10 pt-3 sm:pt-4 relative z-10 font-monoPrecision">
                    <div className="flex flex-col">
                      <span className="text-gray-600 dark:text-gray-500 text-[8px] mb-1">Current Base</span>
                      <span className="text-gray-900 dark:text-white text-[11px] sm:text-xs">
                        {currencySymbols[selectedCurrency] || ''}{formatValue(convertedValue, selectedCurrency)}
                      </span>
                    </div>
                    <div className="flex flex-col text-center">
                      <span className="text-gray-600 dark:text-gray-500 text-[8px] mb-1">Multiplier</span>
                      <span className="text-emerald-600 dark:text-emerald-500 text-[11px] sm:text-xs shadow-emerald-500/50 drop-shadow-md">
                        {convertedValue > 0 ? (projectedValue / convertedValue).toFixed(1) : '1.0'}x
                      </span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-gray-600 dark:text-gray-500 text-[8px] mb-1">{timeframe} Target</span>
                      <span className="text-gray-900 dark:text-white text-[11px] sm:text-xs">
                        {currencySymbols[selectedCurrency] || ''}{formatValue(projectedValue, selectedCurrency)}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Functional Action Grid - Compact with enhanced theme transitions */}
        <div className="relative">
          {/* Enhanced animated background for action buttons with smooth theme transitions */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/5 via-transparent to-blue-400/5 dark:from-emerald-500/3 dark:via-transparent dark:to-blue-500/3 rounded-2xl transition-all duration-1000 ease-in-out" 
               style={{ animation: 'pulse 4s ease-in-out infinite, gradientShift 8s ease-in-out infinite alternate' }} />
          
          <div className="relative flex gap-2 sm:gap-2.5">
          <ActionButton
            icon={Send}
            label="Send"
            primary
            onClick={() => navigate('/wallet/transfer')}
          />
          <ActionButton
            icon={Download}
            label={t('dashboard.receive')}
            onClick={() => navigate('/wallet/receive')}
          />
          <ActionButton
            icon={ShoppingBag}
            label="BUY RZC"
            onClick={() => navigate('/wallet/store')}
          />
          </div>
        </div>
        
                         <AirdropWidget />


        {/* Transaction History - Compact with enhanced theme transitions */}
        <div className="relative space-y-3">
          {/* Enhanced animated background with smooth theme transitions */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-400/3 via-transparent to-blue-400/3 dark:from-slate-500/2 dark:via-transparent dark:to-blue-500/2 rounded-xl transition-all duration-1000 ease-in-out" 
               style={{ animation: 'pulse 6s ease-in-out infinite, gradientShift 10s ease-in-out infinite alternate' }} />
          
          <div className="relative flex items-center justify-between">
            <h3 className="text-[10px] font-heading font-black uppercase tracking-widest text-slate-600 dark:text-gray-500 flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-white/5 rounded-full border  border-primary/20   border-slate-300 dark:border-white/10">
                <History size={11} />
                {t('dashboard.recentActivity')}
              </span>
            </h3>
            <button
              onClick={() => navigate('/wallet/history')}
              className="text-[9px] font-black text-primary tracking-widest hover:underline active:scale-95"
            >
              {t('common.viewAll')}
            </button>
          </div>

          {txError ? (
            <div className="p-4 sm:p-5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl sm:rounded-2xl">
              <div className="flex items-start gap-2.5 sm:gap-3">
                <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="font-bold text-sm text-red-900 dark:text-red-300 mb-1">{t('dashboard.failedToLoadTransactions')}</h4>
                  <p className="text-xs text-red-700 dark:text-red-400 mb-2.5">{txError}</p>
                  <button
                    onClick={() => refreshTransactions()}
                    className="px-3.5 py-1.5 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase hover:bg-red-700 transition-all active:scale-95"
                  >
                    {t('common.retry')}
                  </button>
                </div>
              </div>
            </div>
          ) : txLoading ? (
            <div className="space-y-2.5">
              <LoadingSkeleton height={70} />
              <LoadingSkeleton height={70} />
              <LoadingSkeleton height={70} />
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-6 sm:p-8 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:bg-[#1a1a1a] border  border-primary/20   border-slate-300 dark:border-white/10 rounded-xl sm:rounded-2xl text-center">
              <History size={28} className="mx-auto mb-2.5 text-slate-400 dark:text-gray-700" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">{t('dashboard.noTransactions')}</h4>
              <p className="text-xs text-slate-600 dark:text-gray-400 mb-3">
                {t('dashboard.noTransactionsDesc')}
              </p>
              <button
                onClick={() => navigate('/wallet/transfer')}
                className="px-5 py-2 bg-primary text-black rounded-xl text-[10px] font-black uppercase hover:scale-105 transition-all active:scale-95"
              >
                {t('dashboard.makeFirstTransaction')}
              </button>
            </div>
          ) : (
            <div className="relative space-y-2.5">
              {transactions.slice(0, 5).map((tx) => (
                <TransactionItem
                  key={tx.id}
                  transaction={tx}
                  onClick={() => navigate('/wallet/history')}
                />
              ))}
            </div>
          )}
        </div>

        {/* Marketplace Banner - Compact */}
        <AffiliateHubBanner />
      </div>
    </>
  );
};

export default Dashboard;
