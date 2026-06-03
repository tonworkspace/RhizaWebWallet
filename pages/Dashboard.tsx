import { safeGet } from '../utils/safeAccess';
import React, { useEffect, useState, useMemo } from 'react';
import WalletView from '../components/WalletView';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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
  Layers,
  Wrench,
  Database,
  ArrowRight,
  ArrowDownUp,
  Share2,
  Copy,
  Check,
  Shield,
  Target,
  Star,
  ChevronRight,
  Wallet
} from 'lucide-react';
import { MOCK_PORTFOLIO_HISTORY, getNetworkConfig, getExplorerUrl, getTransactionUrl, CHAIN_META } from '../constants';
import { getNodeActivationMilestoneRZC } from '../config/paymentConfig';
import { getJettonPrice, getJettonPriceChange } from '../services/jettonRegistry';
import { getRzcChange24h } from '../services/rzcPriceService';
import { useWallet } from '../context/WalletContext';
import { useBalance } from '../hooks/useBalance';
import { isJettonVerified } from '../services/jettonRegistry';
import { useRZCBalance } from '../hooks/useRZCBalance';
import { useTransactions } from '../hooks/useTransactions';
import { useToast } from '../context/ToastContext';
import TransactionItem from '../components/TransactionItem';
import LoadingSkeleton from '../components/LoadingSkeleton';
import LanguageSelector from '../components/LanguageSelector';
import ClaimActivationBonus from '../components/ClaimActivationBonus';
import AffiliateHubBanner from '../components/AffiliateHubBanner';
import FlashNews from '../components/FlashNews';
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
      flex flex-col items-center gap-1 p-3 rounded-2xl transition-all duration-200 flex-1
      group relative overflow-hidden
      ${primary
        ? 'bg-emerald-500 dark:bg-primary text-white dark:text-black hover:bg-emerald-600 dark:hover:bg-[#00dd77] shadow-lg shadow-emerald-500/25 dark:shadow-primary/20 active:scale-95'
        : 'bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95'}
    `}
  >
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all group-hover:scale-105 ${primary ? 'bg-white/20 dark:bg-black/10' : 'bg-white dark:bg-white/5'
      }`}>
      <Icon size={18} strokeWidth={2} className={primary ? 'text-white dark:text-black' : 'text-slate-600 dark:text-white/80'} />
    </div>
    <span className={`text-[10px] font-extrabold uppercase tracking-wider mt-0.5 ${primary ? 'text-white dark:text-black/80' : 'text-slate-500 dark:text-white/50'
      }`}>{label}</span>
  </button>
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { balance, address, refreshData, network, switchNetwork, userProfile, referralData, isActivated, activatedAt, multiChainBalances, currentEvmChain, rzcPrice: contextRzcPrice, jettons, dashView, setDashView } = useWallet();
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
    assetChanges,
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

  // Fetch RZC transactions directly (bypasses useTransactions userId race condition)
  const [rzcTransactions, setRzcTransactions] = useState<any[]>([]);

  // RZC 24h price change from price history
  const [rzcChange24h, setRzcChange24h] = useState(0);

  useEffect(() => {
    if (!address) return;
    const fetchRzc = async () => {
      try {
        const profile = await supabaseService.getProfile(address);
        if (!profile.success || !profile.data) return;
        const result = await supabaseService.getRZCTransactions(profile.data.id, 20);
        if (result.success && result.data) setRzcTransactions(result.data);
      } catch { /* silent */ }
    };
    fetchRzc();
  }, [address]);

  // Fetch RZC 24h price change
  useEffect(() => {
    const fetchRzcChange = async () => {
      const change = await getRzcChange24h();
      setRzcChange24h(change);
    };

    fetchRzcChange();
    // Refresh every 5 minutes
    const interval = setInterval(fetchRzcChange, 300_000);
    return () => clearInterval(interval);
  }, []);

  const [balanceVisible, setBalanceVisible] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showNetworkInfo, setShowNetworkInfo] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'BTC' | 'TON' | 'USDT' | 'EUR'>('USD');
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | 'ALL'>('1D');
  const [hideDust, setHideDust] = useState(true);
  const [activeTab, setActiveTab] = useState<'tokens' | 'nfts'>('tokens');

  // ── Market items for WalletView (Trust Wallet style) ─────────────────────
  const marketItems = useMemo(() => {
    return [
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        price: btcPrice,
        change: assetChanges?.btc ?? 0,
        color: 'text-orange-500',
        sparklineSeed: 101,
      },
      {
        symbol: 'ETH',
        name: 'Ethereum',
        price: ethPrice,
        change: assetChanges?.eth ?? 0,
        color: 'text-indigo-500',
        sparklineSeed: 202,
      },
      {
        symbol: 'TON',
        name: 'The Open Network',
        price: tonPrice,
        change: assetChanges?.ton ?? 0,
        color: 'text-blue-500',
        sparklineSeed: 303,
      },
      {
        symbol: 'RZC',
        name: 'Rhiza Coin',
        price: contextRzcPrice,
        change: rzcChange24h ?? 0,
        color: 'text-emerald-500',
        sparklineSeed: 404,
      },
      {
        symbol: 'BNB',
        name: 'BNB',
        price: bnbPrice,
        change: assetChanges?.bnb ?? 0,
        color: 'text-yellow-500',
        sparklineSeed: 505,
      },
      {
        symbol: 'SOL',
        name: 'Solana',
        price: solPrice,
        change: assetChanges?.sol ?? 0,
        color: 'text-purple-500',
        sparklineSeed: 606,
      },
      {
        symbol: 'USDT',
        name: 'Tether USD',
        price: usdtPrice || 1.0,
        change: assetChanges?.usdt ?? 0,
        color: 'text-teal-500',
        sparklineSeed: 707,
      },
    ].filter(m => m.price > 0);
  }, [btcPrice, ethPrice, tonPrice, contextRzcPrice, bnbPrice, solPrice, assetChanges, rzcChange24h]);

  // ── Wallet View Toggle ──────────────────────────────────────────────────
  const toggleDashView = () => {
    setDashView(dashView === 'portfolio' ? 'wallet' : 'portfolio');
  };

  // Smart greeting helper
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = useMemo(() => {
    const p = userProfile as any;
    if (p?.username) return p.username;
    if (p?.full_name) return p.full_name.split(' ')[0];
    if (address) return `${address.slice(0, 6)}…${address.slice(-4)}`;
    return 'Wallet';
  }, [userProfile, address]);

  // Native EVM price based on active chain
  const evmNativePriceMap: Record<string, number> = {
    ethereum: ethPrice, arbitrum: ethPrice, plasma: ethPrice, stable: ethPrice, sepolia: ethPrice,
    polygon: maticPrice, bsc: bnbPrice, avalanche: avaxPrice,
  };
  const activeEvmPrice = safeGet(evmNativePriceMap, currentEvmChain) ?? ethPrice;

  // Calculate Jettons USD Value (excluding USDT jettons as they are tracked via unified USDT)
  let jettonsUsdValue = 0;
  if (jettons && jettons.length > 0) {
    jettons.forEach((j: any) => {
      const symbol = j.jetton?.symbol || 'TKN';
      if (symbol === 'USDT' || symbol === 'jUSDT') return;
      const price = getJettonPrice(j.jetton?.address);
      if (price > 0 && j.balance) {
        const balNum = parseFloat(j.balance) / Math.pow(10, j.jetton?.decimals || 9);
        jettonsUsdValue += balNum * price;
      }
    });
  }

  const unifiedUsdtBalance = multiChainBalances ? parseFloat(multiChainBalances.usdt || '0') : 0;
  const unifiedUsdtUsdValue = unifiedUsdtBalance * (usdtPrice || 1.0);

  const unifiedTronBalance = multiChainBalances ? parseFloat(multiChainBalances.tron || '0') : 0;
  const unifiedTronUsdValue = unifiedTronBalance * (tronPrice || 0);

  // Calculate combined portfolio value (TON + RZC + Jettons + Unified USDT + Unified TRON)
  // `totalUsdValue` uses `balance` from useWallet, which is synced to the active wallet.
  const combinedPortfolioValue = totalUsdValue + rzcUsdValue + jettonsUsdValue + unifiedUsdtUsdValue + unifiedTronUsdValue;

  // Node Activation Progressive Milestone
  const nodeMilestoneTotal = getNodeActivationMilestoneRZC(network || 'mainnet');
  const userRzcBalance = (userProfile as any)?.rzc_balance || Number(rzcBalance) || 0;
  const isNodeActivated = userRzcBalance >= nodeMilestoneTotal || (userProfile as any)?.node_activated;
  const nodeMilestoneProgress = Math.min((userRzcBalance / nodeMilestoneTotal) * 100, 100);

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
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
    USDT: '₮',
    EUR: '€',
  };

  // Convert portfolio value to selected currency
  const convertedValue = combinedPortfolioValue * (safeGet(conversionRates, selectedCurrency) || 1);

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

  const chartData = useMemo(() => {
    // Generate realistic looking mock data based on convertedValue and timeframe
    const baseVal = convertedValue || 1000;
    const pointsCount = timeframe === '1D' ? 24 : timeframe === '1W' ? 7 : timeframe === '1M' ? 30 : 100;
    const volatility = timeframe === '1D' ? 0.02 : timeframe === '1W' ? 0.05 : timeframe === '1M' ? 0.15 : 0.4;

    let currentVal = baseVal * (1 - volatility); // start a bit lower based on volatility
    const data = [];

    for (let i = 0; i < pointsCount; i++) {
      const change = (Math.random() - 0.45) * (volatility / 2) * baseVal; // slight upward bias
      currentVal += change;
      data.push({
        time: `P${i}`,
        value: currentVal
      });
    }
    // Snap the final data point to the actual current portfolio value
    if (data.length > 0) {
      const last = data.at(-1); if (last) last.value = baseVal;
    }
    return data;
  }, [timeframe, convertedValue]);

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
        onClick: () => { },
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

    // 3. Balance Verification Status — dynamic
    if (verificationStatus === 'approved') {
      items.push({
        id: 'verification-approved',
        title: "Balance Verified",
        badge: "Approved",
        ping: false,
        message: "✅ Your RZC balance has been verified. Transfers are now unlocked!",
        onClick: () => navigate('/wallet/market'),
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
        onClick: () => navigate('/wallet/market'),
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
        onClick: () => navigate('/wallet/market'),
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
        onClick: () => navigate('/wallet/market'),
        theme: 'amber' as const,
        icon: Lock
      });
    }

    items.push({
      id: 'rhizaswap-launch',
      title: "RZC Seed Round Open",
      badge: "Buy Now",
      ping: true,
      message: "RhizaSwap RZC/USDT market launching soon! Secure your RZC at seed price before Round 1 closes",
      onClick: () => navigate('/wallet/store'),
      theme: 'purple' as const,
      icon: ShoppingBag
    });

    items.push({
      id: 'mainnet-engagement',
      title: "Mainnet Phase Open",
      badge: "Register Now",
      ping: true,
      message: "🚀 RhizaCore mainnet is here! Register your interest & verify your RZC balance to secure early access.",
      onClick: () => navigate('/wallet/engagement'),
      theme: 'emerald' as const,
      icon: Zap
    });

    // 4. System Status
    items.push({
      id: 'maintenance',
      title: "System Status",
      badge: "Operational",
      ping: false,
      message: "✅ All systems fully operational • No issues detected • Platform running at 100%",
      onClick: () => { },
      theme: 'emerald' as const,
      icon: ShieldCheck
    });

    // 5. System News
    items.push({
      id: 'news',
      title: "System Update",
      badge: "Live",
      ping: true,
      message: "🚀 Enhanced portfolio charts & tracking now active. Check your updated wallet!",
      onClick: () => { },
      theme: 'blue' as const,
      icon: Zap
    });

    // 6. RhizaSwap Coming Soon


    return items;
  }, [isActivated, activatedAt, navigate, migrationStatus, verificationStatus]);

  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentAnnouncementIndex(prev => (prev + 1) % announcements.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [announcements.length]);

  const currentAnnouncement = announcements.at(currentAnnouncementIndex) || announcements[0];
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

  const currentTheme = safeGet(themeMap, currentAnnouncement.theme) || themeMap.blue;

  useEffect(() => {
    refreshData();
    // Only poll when the tab is visible — saves API quota on background tabs
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') refreshData();
    }, 10_000); // Poll every 10s so deposits reflect quickly
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
      refreshData(false, true)  // force-bust cache so deposits reflect immediately
    ]);
    setIsRefreshing(false);
  };

  // Pre-compute balance display values (avoids IIFE in JSX which confuses TSX parser)
  const balanceDisplaySym = safeGet(currencySymbols, selectedCurrency) || '';
  const balanceDisplaySuffix: string = ''; // Removed text suffixes since we now use prefix symbols for all currencies

  // Create a plain text string just for evaluating length to assign correct font sizes
  const balanceDisplayStr = `${selectedCurrency === 'USD' ? '$' : selectedCurrency === 'EUR' ? '€' : selectedCurrency === 'USDT' ? '₮' : selectedCurrency === 'BTC' ? '₿' : 'T'}${formatValue(convertedValue, selectedCurrency)}`;
  const balanceDisplayLen = balanceDisplayStr.length;
  const balanceSizeClass = balanceDisplayLen <= 7 ? 'text-5xl sm:text-6xl'
    : balanceDisplayLen <= 11 ? 'text-4xl sm:text-5xl'
      : balanceDisplayLen <= 15 ? 'text-3xl sm:text-4xl'
        : 'text-2xl sm:text-3xl';
  const balanceSuffixSizeClass = balanceDisplayLen <= 7 ? 'text-base sm:text-xl' : balanceDisplayLen <= 11 ? 'text-sm sm:text-lg' : 'text-xs sm:text-base';

  // Combine all active multi-chain assets
  const assetList = useMemo(() => {
    const list = [];

    // RZC (Native) - Always visible
    list.push({
      id: 'rzc', symbol: 'RZC', name: 'RhizaCore Token', balance: parseFloat(rzcBalance.toString()),
      usdValue: rzcUsdValue, price: contextRzcPrice, color: 'text-emerald-500',
      bg: 'bg-emerald-500',
      logo: null,
      isCore: true,
      change: rzcChange24h, // ← Now uses calculated 24h change from price history
    });

    // TON - Always visible
    const activeWalletType = localStorage.getItem('rhiza_active_wallet_type');
    const isWdk = activeWalletType === 'secondary';
    const tonName = isWdk ? 'Toncoin (W5)' : 'Toncoin';
    const effectiveTonBalance = isWdk
      ? (multiChainBalances ? parseFloat(multiChainBalances.ton || '0') : 0)
      : tonBalance;
    const effectiveTonUsdValue = effectiveTonBalance * tonPrice;

    list.push({
      id: 'ton', symbol: 'TON', name: tonName, balance: effectiveTonBalance,
      usdValue: effectiveTonUsdValue, price: tonPrice, color: 'text-blue-500',
      bg: 'bg-blue-500',
      logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ton/info/logo.png',
      change: assetChanges.ton,
    });

    // Universal Multi-Chain USDT - Visible for all wallets
    list.push({
      id: 'usdt',
      symbol: 'USDT',
      name: 'Tether USD',
      balance: unifiedUsdtBalance,
      usdValue: unifiedUsdtUsdValue,
      price: usdtPrice || 1.0,
      color: 'text-teal-500',
      bg: 'bg-teal-500',
      logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
      change: assetChanges.usdt || 0,
    });

    // Universal Multi-Chain TRON - Visible for all wallets
    list.push({
      id: 'tron',
      symbol: 'TRX',
      name: 'TRON',
      balance: unifiedTronBalance,
      usdValue: unifiedTronUsdValue,
      price: tronPrice || 0,
      color: 'text-rose-500',
      bg: 'bg-rose-500',
      logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/tron/info/logo.png',
      change: assetChanges.tron || 0,
    });

    // Jettons (on-chain TON jettons from TonCenter / WDK injection)
    if (jettons && jettons.length > 0) {
      jettons.forEach((j: any) => {
        // Skip unlisted/unknown jettons to keep dashboard clean
        const isListed = j.jetton?.verified || j.jetton?.verification === 'whitelist' || isJettonVerified(j.jetton?.address);
        if (!isListed) return;

        const symbol = j.jetton?.symbol || 'TKN';
        // Skip USDT jettons since they are already integrated in the unified USDT row
        if (symbol === 'USDT' || symbol === 'jUSDT') return;

        const price = getJettonPrice(j.jetton?.address);
        const balNum = parseFloat(j.balance) / Math.pow(10, j.jetton?.decimals || 9);
        const jUsdValue = balNum * (price || 0);

        // Get per-jetton 24h change from assetChanges or jettonRegistry
        let jettonChange = 0;
        if (symbol === 'USDC' || symbol === 'jUSDC') {
          jettonChange = assetChanges.usdc;
        } else {
          // For other jettons, use registry data (currently returns 0)
          jettonChange = getJettonPriceChange(j.jetton?.address);
        }

        if (balNum > 0 || !hideDust) {
          list.push({
            id: j.jetton?.address || Math.random().toString(),
            symbol,
            name: j.jetton?.name || 'Unknown Token',
            balance: balNum,
            usdValue: jUsdValue,
            price: price || 0,
            color: 'text-blue-500',
            bg: 'bg-blue-500',
            logo: j.jetton?.image || null,
            change: jettonChange,
          });
        }
      });
    }

    // Sort logic (highest USD value first)
    return list.sort((a, b) => b.usdValue - a.usdValue);
  }, [combinedPortfolioValue, rzcBalance, rzcUsdValue, tonBalance, totalUsdValue, multiChainBalances, currentEvmChain, activeEvmPrice, hideDust, contextRzcPrice, jettons, rzcChange24h, unifiedUsdtBalance, unifiedUsdtUsdValue, usdtPrice, unifiedTronBalance, unifiedTronUsdValue, tronPrice, assetChanges]);

  // Build navigation state for AssetDetail from a dashboard asset entry
  const getAssetDetailState = (asset: typeof assetList[0]) => {
    const typeMap: Record<string, string> = {
      rzc: 'RZC', ton: 'TON', usdt: 'EVM', tron: 'TRON'
    };
    return {
      symbol: asset.symbol,
      name: asset.name,
      // Pass human-readable balance with decimals=0 so AssetDetail displays it as-is
      balance: asset.balance.toString(),
      decimals: 0,
      price: asset.price,
      type: safeGet(typeMap, asset.id) || 'TON',
      image: asset.logo || undefined,
      verified: ['ton', 'usdt'].includes(asset.id),
    };
  };

  return (
    <>
      {/* Enhanced Animated Background with Theme Transitions - Simplified & Professional */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -1 }}>
        {/* Primary animated orbs - Reduced for cleaner UI */}
        <div className="dashboard-bg-orb absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 dark:from-emerald-500/5 dark:to-cyan-500/5 rounded-full blur-[100px]"
          style={{ animation: 'pulse 8s ease-in-out infinite, float 15s ease-in-out infinite' }} />
        <div className="dashboard-bg-orb absolute top-1/2 -right-32 w-[500px] h-[500px] bg-gradient-to-l from-blue-500/10 to-purple-500/10 dark:from-blue-500/5 dark:to-purple-500/5 rounded-full blur-[120px]"
          style={{ animation: 'pulse 10s ease-in-out infinite, float 20s ease-in-out infinite reverse' }} />

        {/* Animated grid pattern - Subtle */}
        <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.01]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.3) 1px, transparent 0)`,
            backgroundSize: '32px 32px',
            animation: 'gridMove 30s linear infinite'
          }} />

        {/* Clean gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-slate-50/30 dark:from-black/40 dark:via-transparent dark:to-black/10" />
      </div>

      <style>
        {`
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
        `}
      </style>

      {/* Main Dashboard Content with enhanced theme transitions */}
      <div className="relative z-10 max-w-2xl mx-auto space-y-3.5 sm:space-y-5 page-enter px-1 sm:px-3 md:px-0 pt-3 pb-4 animate-in fade-in slide-in-from-bottom-4 duration-700 theme-transition-bg">

        {/* ── WALLET VIEW (compact trading UI) ── */}
        {dashView === 'wallet' && (
          <WalletView
            combinedPortfolioValue={combinedPortfolioValue}
            change24h={change24h}
            changePercent24h={changePercent24h}
            balanceVisible={balanceVisible}
            setBalanceVisible={setBalanceVisible}
            assetList={assetList}
            tonPrice={tonPrice}
            btcPrice={btcPrice}
            ethPrice={ethPrice}
            rzcPrice={contextRzcPrice}
            priceItems={[
              tonPrice > 0 && { symbol: 'TON', price: `$${tonPrice.toFixed(2)}`, color: 'text-blue-500' },
              btcPrice > 0 && { symbol: 'BTC', price: `$${btcPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, color: 'text-orange-500' },
              ethPrice > 0 && { symbol: 'ETH', price: `$${ethPrice.toFixed(2)}`, color: 'text-indigo-500' },
              contextRzcPrice > 0 && { symbol: 'RZC', price: `$${contextRzcPrice.toFixed(4)}`, color: 'text-emerald-500' },
              (usdtPrice > 0 || true) && { symbol: 'USDT', price: `$${(usdtPrice || 1.0).toFixed(3)}`, color: 'text-teal-500' },
            ].filter(Boolean) as any[]}
            marketItems={marketItems}
            isRefreshing={isRefreshing}
            onRefresh={handleRefresh}
            onToggleView={toggleDashView}
            network={network}
          />
        )}

        {/* ── PORTFOLIO VIEW (existing full dashboard) ── */}
        {dashView === 'portfolio' && (<>

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

        {/* Shoutbox - Premium Announcement Ticker */}
        {announcements.length > 0 && (
          <div
            className="overflow-hidden rounded-xl bg-white/80 dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 cursor-pointer active:scale-[0.99] transition-transform mb-4"
            onClick={currentAnnouncement.onClick}
          >
            <div className="flex items-stretch">
              <div className={`flex-shrink-0 px-3 flex items-center bg-gradient-to-b ${currentAnnouncement.theme === 'emerald' ? 'from-emerald-500 to-teal-600' :
                currentAnnouncement.theme === 'amber' ? 'from-amber-500 to-orange-600' :
                  currentAnnouncement.theme === 'red' ? 'from-red-500 to-rose-600' :
                    currentAnnouncement.theme === 'purple' ? 'from-purple-500 to-fuchsia-600' :
                      'from-blue-500 to-indigo-600'
                } transition-all duration-500`}>
                <Zap size={12} className="text-white" />
              </div>

              <div className="flex-1 py-1.5 px-3 overflow-hidden min-w-0">
                <div
                  key={currentAnnouncement.id}
                  className="flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300"
                >
                  <span className={`flex-shrink-0 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${currentAnnouncement.theme === 'emerald' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                    currentAnnouncement.theme === 'amber' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                      currentAnnouncement.theme === 'red' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' :
                        currentAnnouncement.theme === 'purple' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400' :
                          'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                    }`}>
                    {currentAnnouncement.badge}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-semibold text-slate-700 dark:text-zinc-300 truncate">
                    {currentAnnouncement.message.replace(/[✅⚠️⏳❌🔄🔒🚀]/g, '').trim()}
                  </span>
                  {currentAnnouncement.ping && (
                    <span className="flex-shrink-0 relative flex h-1.5 w-1.5 ml-auto">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${currentAnnouncement.theme === 'emerald' ? 'bg-emerald-400' :
                        currentAnnouncement.theme === 'amber' ? 'bg-amber-400' :
                          currentAnnouncement.theme === 'red' ? 'bg-red-400' :
                            currentAnnouncement.theme === 'purple' ? 'bg-purple-400' :
                              'bg-blue-400'
                        }`} />
                      <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${currentAnnouncement.theme === 'emerald' ? 'bg-emerald-500' :
                        currentAnnouncement.theme === 'amber' ? 'bg-amber-500' :
                          currentAnnouncement.theme === 'red' ? 'bg-red-500' :
                            currentAnnouncement.theme === 'purple' ? 'bg-purple-500' :
                              'bg-blue-500'
                        }`} />
                    </span>
                  )}
                </div>
                {/* Progress dots */}
                <div className="flex items-center gap-1 mt-1">
                  {announcements.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => { e.stopPropagation(); setCurrentAnnouncementIndex(i); }}
                      className={`h-[2px] rounded-full transition-all duration-300 ${i === currentAnnouncementIndex
                        ? `w-4 ${currentAnnouncement.theme === 'emerald' ? 'bg-emerald-500' :
                          currentAnnouncement.theme === 'amber' ? 'bg-amber-500' :
                            currentAnnouncement.theme === 'red' ? 'bg-red-500' :
                              currentAnnouncement.theme === 'purple' ? 'bg-purple-500' :
                                'bg-blue-500'
                        }`
                        : 'w-1.5 bg-slate-200 dark:bg-white/10'
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

        {/* ── RZC Seed Round Buy Banner — shown only to users with 0 RZC ── */}
        {userRzcBalance === 0 && (
          <div
            className="relative overflow-hidden rounded-[14px] bg-gradient-to-br from-emerald-900/90 via-[#071a0f] to-black border border-emerald-500/30 shadow-xl shadow-emerald-500/10 cursor-pointer active:scale-[0.99] transition-transform"
            onClick={() => navigate('/wallet/store')}
          >
            {/* Glow orb */}
            <div className="absolute -top-10 -right-10 w-44 h-44 bg-emerald-500/20 rounded-full blur-[60px] pointer-events-none" />
            {/* Top urgency strip */}
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">🔥 Seed Round — Closing Soon</span>
              <span className="ml-auto text-[10px] font-black uppercase tracking-widest text-red-400 animate-pulse">⚠️ R1 Closing</span>
            </div>
            {/* Body */}
            <div className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black uppercase tracking-widest text-emerald-400 mb-0.5">RhizaCore Token (RZC)</p>
                <p className="text-white text-sm font-black leading-snug">Buy now at seed price — before public listing</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs font-numbers font-black text-white">${contextRzcPrice.toFixed(4)}</span>
                  <span className="text-[10px] text-emerald-400/70 font-bold">now</span>
                  <span className="text-[10px] font-black text-gray-500">→</span>
                  <span className="text-xs font-numbers font-black text-amber-400">$1.00</span>
                  <span className="text-[10px] text-amber-400/70 font-bold">at listing</span>
                  <span className="ml-1 px-1.5 py-0.5 bg-amber-500/20 border border-amber-500/30 rounded-full text-[9px] font-black text-amber-400 uppercase tracking-widest">
                    {Math.min(Math.round(1.0 / (contextRzcPrice || 0.01)), 99)}x potential
                  </span>
                </div>
              </div>
              <div className="flex-shrink-0 flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/40">
                  <ShoppingBag size={18} className="text-black" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Buy RZC</span>
              </div>
            </div>
          </div>
        )}

        {/* Unified Smart Command Center: Ticker, Announcements, Milestones, and Store CTA */}
        {(() => {
          // --- 1. Ticker Setup ---
          const priceItems = [
            tonPrice > 0 && { symbol: 'TON', price: `$${tonPrice.toFixed(2)}`, color: 'text-blue-500 dark:text-blue-400' },
            btcPrice > 0 && { symbol: 'BTC', price: `$${btcPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, color: 'text-orange-500 dark:text-orange-400' },
            ethPrice > 0 && { symbol: 'ETH', price: `$${ethPrice.toFixed(2)}`, color: 'text-indigo-500 dark:text-indigo-400' },
            bnbPrice > 0 && { symbol: 'BNB', price: `$${bnbPrice.toFixed(2)}`, color: 'text-yellow-500 dark:text-yellow-400' },
            solPrice > 0 && { symbol: 'SOL', price: `$${solPrice.toFixed(2)}`, color: 'text-purple-500 dark:text-purple-400' },
            maticPrice > 0 && { symbol: 'POL', price: `$${maticPrice.toFixed(3)}`, color: 'text-violet-500 dark:text-violet-400' },
            avaxPrice > 0 && { symbol: 'AVAX', price: `$${avaxPrice.toFixed(2)}`, color: 'text-red-500 dark:text-red-400' },
            tronPrice > 0 && { symbol: 'TRX', price: `$${tronPrice.toFixed(4)}`, color: 'text-rose-500 dark:text-rose-400' },
            usdtPrice > 0 && { symbol: 'USDT', price: `$${usdtPrice.toFixed(3)}`, color: 'text-teal-500 dark:text-teal-400' },
            contextRzcPrice > 0 && { symbol: 'RZC', price: `$${contextRzcPrice.toFixed(4)}`, color: 'text-emerald-500 dark:text-emerald-400' },
          ].filter(Boolean) as { symbol: string; price: string; color: string }[];
          const doubledPriceItems = [...priceItems, ...priceItems];

          // --- 2. Rank Setup ---
          const ranks = [
            { level: 1, name: 'Seed', threshold: 100, color: 'from-[#64748b] to-[#475569]', isKeyMilestone: false },
            { level: 2, name: 'Sprout', threshold: 1000, color: 'from-[#fbbf24] to-[#f97316]', isKeyMilestone: false },
            { level: 3, name: 'Node', threshold: nodeMilestoneTotal, color: 'from-[#34d399] to-[#06b6d4]', isKeyMilestone: true },
            { level: 4, name: 'Validator', threshold: 25000, color: 'from-[#818cf8] to-[#4f46e5]', isKeyMilestone: false },
            { level: 5, name: 'Oracle', threshold: 100000, color: 'from-[#a78bfa] to-[#7c3aed]', isKeyMilestone: false },
            { level: 6, name: 'Sovereign', threshold: 250000, color: 'from-[#f472b6] to-[#db2777]', isKeyMilestone: false },
            { level: 7, name: 'Genesis', threshold: 500000, color: 'from-[#ef4444] to-[#b91c1c]', isKeyMilestone: false },
            { level: 8, name: 'Titan', threshold: 1000000, color: 'from-[#facc15] to-[#ca8a04]', isKeyMilestone: false },
          ];

          let currentRankIndex = 0;
          for (let i = ranks.length - 1; i >= 0; i--) {
            if (userRzcBalance >= (ranks.at(i)?.threshold ?? 0)) {
              currentRankIndex = i;
              break;
            }
          }

          const currentRank = ranks[currentRankIndex];
          const nextRank = currentRankIndex < ranks.length - 1 ? ranks.at(currentRankIndex + 1) : null;

          let tierProgress = 100;
          let rzcNeeded = 0;
          if (nextRank) {
            const tierRange = nextRank.threshold - currentRank.threshold;
            const userProgressInTier = userRzcBalance - currentRank.threshold;
            tierProgress = Math.max(0, Math.min(100, (userProgressInTier / tierRange) * 100));
            rzcNeeded = nextRank.threshold - userRzcBalance;
          }

          const isNode = userRzcBalance >= nodeMilestoneTotal || (userProfile as any)?.node_activated;

          return (
            <div className="relative group overflow-hidden rounded-[14px] bg-gradient-to-b from-white/90 to-white dark:from-[#0f1712] dark:to-[#07130c] border border-slate-200 dark:border-white/5 shadow-sm mb-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
              {isNode && <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[50px] rounded-full pointer-events-none" />}

              {/* Top Bar: Announcements & Ticker (Split) */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/40 h-7 overflow-hidden">
                {/* Left: Auto-sliding Announcement or Static Op Status */}
                <div
                  className="flex-shrink-0 max-w-[40%] sm:max-w-[45%] flex items-center px-2 py-0.5 border-r border-slate-100 dark:border-white/5 h-full cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group/ticker"
                  onClick={announcements.length > 0 ? () => currentAnnouncement?.onClick?.() : undefined}
                >
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 flex-shrink-0 ${announcements.length > 0 && currentAnnouncement?.ping ? 'animate-ping bg-emerald-500' : 'bg-emerald-500'}`} />
                  <span className="text-[10px] font-bold text-slate-600 dark:text-emerald-500/80 uppercase tracking-wider truncate group-hover/ticker:text-emerald-600 dark:group-hover/ticker:text-emerald-400">
                    {announcements.length > 0 ? currentAnnouncement?.badge : 'Op Normal'}
                  </span>
                </div>

                {/* Right: Marquee Ticker */}
                <div className="flex-1 overflow-hidden h-full flex items-center bg-transparent mask-image-fade-edges">
                  <div className="flex animate-marquee whitespace-nowrap gap-4 px-2" style={{ width: 'max-content' }}>
                    {doubledPriceItems.map((item, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                          {item.symbol}
                        </span>
                        <span className={`text-[10px] font-numbers font-bold ${item.color}`}>
                          {item.price}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Main Body: Milestone Progress & Integrated CTA */}
              <div className="p-3 relative z-10">
                <div className="flex items-center gap-3">
                  {/* Rank Badge */}
                  <div className="flex-shrink-0 relative">
                    <div className={`absolute inset-0 bg-gradient-to-br ${currentRank.color} rounded-lg blur opacity-40`} />
                    <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-white dark:bg-black/80 shadow-sm dark:shadow-inner flex flex-col items-center justify-center border border-slate-200 dark:border-white/10">
                      <span className={`text-[10px] font-heading font-bold uppercase text-transparent bg-clip-text bg-gradient-to-br ${currentRank.color}`}>Lvl {currentRank.level}</span>
                      <Database size={15} className="mt-0.5 text-slate-700 dark:text-white/90" />
                    </div>
                    {isNode && (
                      <div className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-black rounded-full p-[2px] shadow-lg shadow-emerald-500/40">
                        <CheckCircle2 size={9} strokeWidth={4} />
                      </div>
                    )}
                  </div>

                  {/* Body & Progress */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs sm:text-sm font-heading font-black text-slate-900 dark:text-white/95 leading-none">{currentRank.name} Node</span>
                        <span className="text-[10px] font-numbers font-black text-emerald-600 dark:text-emerald-400">{userRzcBalance.toLocaleString()} RZC</span>
                      </div>

                      {/* Integrated Buy Button takes right real-estate */}
                      {!isNode && (
                        <div className="flex-shrink-0 flex flex-col items-end">
                          <button onClick={(e) => { e.stopPropagation(); navigate('/wallet/store'); }} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gradient-to-b from-emerald-100 to-emerald-200/50 dark:from-emerald-500/20 dark:to-emerald-500/10 border border-emerald-300/50 dark:border-emerald-500/20 hover:scale-[1.02] active:scale-95 shadow-sm shadow-emerald-500/10 transition-all group">
                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-400">Buy</span>
                            <span className="text-[9px] font-numbers text-emerald-700 dark:text-emerald-300 border-l border-emerald-400/50 dark:border-emerald-500/30 pl-1.5">${contextRzcPrice.toFixed(2)}</span>
                          </button>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-red-500/80 mt-1 animate-pulse">⚠️ R1 Closing</span>
                        </div>
                      )}
                    </div>

                    {/* Unified Timeline Tracker */}
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-black/60 rounded-full overflow-hidden flex gap-[2px] border border-slate-300 dark:border-white/5 shadow-inner">
                      {ranks.slice(1).map((rank, idx) => {
                        const tierIndex = idx + 1;
                        let fillPercent = 0;
                        if (currentRankIndex > tierIndex - 1) fillPercent = 100;
                        else if (currentRankIndex === tierIndex - 1) fillPercent = tierProgress;

                        return (
                          <div key={idx} className="h-full flex-1 relative bg-white/50 dark:bg-white/5">
                            {rank.isKeyMilestone && <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-emerald-500/80 z-20 shadow-[0_0_5px_#10b981]" />}
                            <div
                              className={`absolute top-0 bottom-0 left-0 bg-gradient-to-r ${ranks.at(tierIndex - 1)?.color} transition-all duration-1000 ease-out`}
                              style={{ width: `${fillPercent}%` }}
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* Next Milestone Footer */}
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[8.5px] font-bold text-slate-500 dark:text-slate-400/80 uppercase tracking-widest">
                        {nextRank ? `${rzcNeeded.toLocaleString()} to rank up` : 'Fully Unlocked'}
                      </span>
                      {nextRank && (
                        <span className="text-[8.5px] font-heading font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{nextRank.name} at {nextRank.threshold >= 1000000 ? (nextRank.threshold / 1000000) + 'M' : nextRank.threshold >= 1000 ? (nextRank.threshold / 1000) + 'k' : nextRank.threshold}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}


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
                <div className="p-3 sm:p-4 pb-2">
                  {/* Smart Greeting */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-[11px] font-heading font-bold text-slate-500 dark:text-slate-400">{getGreeting()},</span>
                    <span className="text-[11px] font-heading font-black text-slate-800 dark:text-white truncate max-w-[140px]">{displayName}</span>
                    {isActivated && <CheckCircle2 size={10} className="text-emerald-500 flex-shrink-0" />}
                  </div>
                  <div className="flex items-start justify-between">
                    <div className="space-y-0 flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                          <ShieldCheck size={9} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                          <span className="text-[8px] font-heading font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Portfolio</span>
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                          <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">{networkConfig.NAME}</span>
                        </span>
                        {(isRefreshing || balanceLoading) && (
                          <RefreshCw size={9} className="animate-spin text-emerald-500 flex-shrink-0" />
                        )}
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

                {/* Price Portfolio Chart */}
                <div className="px-3 sm:px-4 pb-2">
                  <div className="flex bg-gradient-to-r from-slate-100 via-emerald-50/50 to-slate-100 dark:from-white/5 dark:via-white/3 dark:to-white/5 rounded-lg p-1 border  border-primary/20   border-slate-300 dark:border-white/5 shadow-inner w-full mb-3">
                    {(['1D', '1W', '1M', 'ALL'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setTimeframe(t)}
                        className={`flex-1 py-1 rounded-md text-[9px] font-heading font-black tracking-widest transition-all uppercase ${timeframe === t
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                          : 'text-gray-600 hover:text-gray-800 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-gray-200/50 dark:hover:bg-white/5'
                          }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  <div className="h-20 sm:h-24 w-full relative mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Tooltip
                          contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }}
                          itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                          formatter={(value: number) => [`${safeGet(currencySymbols, selectedCurrency) || ''}${formatValue(value, selectedCurrency)}`, 'Balance']}
                          labelStyle={{ display: 'none' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#10b981"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorValue)"
                          isAnimationActive={true}
                          animationDuration={800}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Portfolio Allocation Bar — Coinbase-style asset composition */}
                {assetList.length > 1 && combinedPortfolioValue > 0 && (
                  <div className="px-3 sm:px-4 pb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Allocation</span>
                      {/* Best / Worst performer chips */}
                      <div className="flex items-center gap-1.5">
                        {(() => {
                          const sorted = [...assetList].filter(a => a.usdValue > 0);
                          if (sorted.length < 2) return null;
                          const best = sorted.reduce((a, b) => a.change > b.change ? a : b);
                          const worst = sorted.reduce((a, b) => a.change < b.change ? a : b);
                          return (
                            <>
                              <span className="flex items-center gap-0.5 text-[9px] font-numbers font-bold text-emerald-600 dark:text-emerald-400">
                                <TrendingUp size={8} /> {best.symbol} {best.change >= 0 ? '+' : ''}{best.change.toFixed(1)}%
                              </span>
                              <span className="text-slate-300 dark:text-slate-600 text-[9px]">•</span>
                              <span className="flex items-center gap-0.5 text-[9px] font-numbers font-bold text-red-500 dark:text-red-400">
                                <TrendingUp size={8} className="rotate-180" /> {worst.symbol} {worst.change >= 0 ? '+' : ''}{worst.change.toFixed(1)}%
                              </span>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    {/* Stacked allocation bar */}
                    <div className="h-1.5 w-full flex rounded-full overflow-hidden gap-[1px]">
                      {assetList.filter(a => a.usdValue > 0).map((asset, i) => {
                        const pct = combinedPortfolioValue > 0 ? (asset.usdValue / combinedPortfolioValue) * 100 : 0;
                        const colors = [
                          'bg-emerald-500', 'bg-blue-500', 'bg-indigo-500',
                          'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'
                        ];
                        return (
                          <div
                            key={asset.id}
                            title={`${asset.symbol}: ${pct.toFixed(1)}%`}
                            className={`${colors.at(i % colors.length)} transition-all duration-700 ease-out`}
                            style={{ width: `${pct}%`, minWidth: pct > 0 ? '2px' : '0' }}
                          />
                        );
                      })}
                    </div>
                    {/* Labels */}
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {assetList.filter(a => a.usdValue > 0).map((asset, i) => {
                        const pct = combinedPortfolioValue > 0 ? (asset.usdValue / combinedPortfolioValue) * 100 : 0;
                        const colors = [
                          'bg-emerald-500', 'bg-blue-500', 'bg-indigo-500',
                          'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'
                        ];
                        return (
                          <span key={asset.id} className="flex items-center gap-1 text-[9px] font-numbers text-slate-500 dark:text-slate-400">
                            <span className={`w-1.5 h-1.5 rounded-full ${colors.at(i % colors.length)} flex-shrink-0`} />
                            {asset.symbol} {pct.toFixed(0)}%
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Vertical Asset List - "My Assets" */}
                <div className="border-t border-gray-200/50 dark:border-white/10 bg-white/50 dark:bg-black/20 pb-2">
                  <div className="px-3 sm:px-4 pt-3 pb-1.5 flex items-center justify-between">
                    <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-lg">
                      <button
                        onClick={() => setActiveTab('tokens')}
                        className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${activeTab === 'tokens' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                      >
                        Tokens
                      </button>
                      <button
                        onClick={() => setActiveTab('nfts')}
                        className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${activeTab === 'nfts' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                      >
                        NFTs
                      </button>
                    </div>
                    <button
                      onClick={() => setHideDust(!hideDust)}
                      className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    >
                      {hideDust ? <EyeOff size={14} /> : <Eye size={14} />}
                      <span className="hidden sm:inline">{hideDust ? 'Hidden' : 'Hide Dust'}</span>
                    </button>
                  </div>

                  <div className="px-3 sm:px-4">
                    {activeTab === 'tokens' ? (
                      assetList.length > 0 ? (
                        <div className="flex flex-col divide-y divide-gray-100 dark:divide-white/5 bg-white/50 dark:bg-[#0a0a0a]/50 rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden shadow-sm">
                          {assetList.map((asset) => (
                            <div
                              key={asset.id}
                              onClick={() => navigate('/wallet/asset-detail', { state: { ...getAssetDetailState(asset), useGradientIcon: asset.isCore } })}
                              className="flex items-center justify-between p-3 sm:p-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all cursor-pointer group active:scale-[0.99]"
                            >
                              {/* Logo */}
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ring-1 ring-black/5 dark:ring-white/10 ${asset.isCore
                                  ? 'bg-gradient-to-br from-emerald-400 to-cyan-500 text-white font-black text-[9px] shadow-md shadow-emerald-500/20'
                                  : 'bg-slate-100 dark:bg-white/5'
                                  }`}>
                                  {asset.isCore ? 'RZC' : asset.logo
                                    ? <img src={asset.logo} alt={asset.symbol} className="w-full h-full rounded-full object-cover" />
                                    : <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800" />}
                                </div>
                                {/* Name + balance + allocation */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-bold text-slate-900 dark:text-white leading-none">{asset.name}</span>
                                    {asset.price > 0 && (
                                      <span className="text-[9px] font-numbers text-slate-400 dark:text-slate-500">
                                        ${asset.price < 0.01 ? asset.price.toFixed(4) : asset.price < 1 ? asset.price.toFixed(3) : asset.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] font-numbers text-slate-500 dark:text-slate-400">
                                      {balanceVisible ? asset.balance.toLocaleString(undefined, { maximumFractionDigits: 9 }) : '••••'} {asset.symbol}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {/* USD value + % change */}
                              <div className="text-right flex-shrink-0">
                                <p className="font-numbers font-bold text-[13px] text-slate-900 dark:text-white leading-none">
                                  {balanceVisible ? `${safeGet(currencySymbols, selectedCurrency) || ''}${formatValue(asset.usdValue * (safeGet(conversionRates, selectedCurrency) || 1), selectedCurrency)}` : '••••'}
                                </p>
                                <span className={`inline-flex items-center gap-0.5 mt-1 text-[9px] font-numbers font-bold px-1.5 py-0.5 rounded-full ${asset.change >= 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-red-600 dark:text-red-400'
                                  }`}>
                                  <TrendingUp size={8} className={asset.change < 0 ? 'rotate-180' : ''} />
                                  {Math.abs(asset.change).toFixed(2)}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-8 text-center">
                          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-3">
                            <RefreshCw size={20} className="text-gray-400" />
                          </div>
                          <p className="text-sm font-bold text-gray-600 dark:text-gray-400">No assets found</p>
                        </div>
                      )
                    ) : (
                      <div className="py-12 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-500/10 dark:to-blue-500/10 flex items-center justify-center mx-auto mb-4 border border-purple-200/50 dark:border-purple-500/20">
                          <Layers size={28} className="text-purple-500" />
                        </div>
                        <h3 className="text-base font-black text-gray-900 dark:text-white mb-1">Digital Collectibles</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[200px] mx-auto">Your NFTs will appear here across all supported networks.</p>
                        <span className="inline-block mt-4 text-[9px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-500/20 px-3 py-1 rounded-full">Coming Soon</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action Grid - Coinbase style pill buttons */}
        <div className="flex items-center gap-2 py-1">
          <ActionButton icon={Send} label="Send" primary onClick={() => navigate('/wallet/transfer')} />
          <ActionButton icon={Download} label={t('dashboard.receive')} onClick={() => navigate('/wallet/receive')} />
          <ActionButton icon={ArrowDownUp} label="Swap" onClick={() => navigate('/wallet/simulator')} />
          <ActionButton icon={ShoppingBag} label="Buy RZC" onClick={() => navigate('/wallet/store')} />
        </div>

        {/* Security Status Row — Coinbase-style security health chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex-shrink-0">Security</span>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold flex-shrink-0 ${isActivated
            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
            : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
            }`}>
            {isActivated ? <CheckCircle2 size={9} /> : <AlertCircle size={9} />}
            {isActivated ? 'Wallet Active' : 'Not Activated'}
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold flex-shrink-0 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
            <Shield size={9} />
            2FA {(userProfile as any)?.two_factor_enabled ? 'On' : 'Off'}
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold flex-shrink-0 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
            <ShieldCheck size={9} />
            Balance {verificationStatus === 'approved' ? 'Verified' : verificationStatus === 'pending' ? 'In Review' : 'Unverified'}
          </div>
          <div
            onClick={() => navigate('/wallet/transfer')}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold flex-shrink-0 bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-500/30 transition-colors"
          >
            <Wallet size={9} />
            {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Connect'}
          </div>
        </div>

        {/* Node Activation Progress Banner — shown only for non-node users with >0 RZC */}
        {!isNodeActivated && userRzcBalance > 0 && (
          <div
            onClick={() => navigate('/wallet/store')}
            className="flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all shadow-sm"
          >
            <div className="relative w-10 h-10 flex-shrink-0">
              <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-200 dark:text-emerald-500/20" />
                <circle
                  cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3"
                  strokeDasharray={`${nodeMilestoneProgress * 0.942} 94.2`}
                  className="text-emerald-500 dark:text-emerald-400 transition-all duration-1000"
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-emerald-700 dark:text-emerald-400">
                {Math.round(nodeMilestoneProgress)}%
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-heading font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-400 mb-0.5">Node Activation Progress</p>
              <p className="text-xs font-numbers font-bold text-slate-700 dark:text-slate-300">
                {userRzcBalance.toLocaleString()} / {nodeMilestoneTotal.toLocaleString()} RZC
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {(nodeMilestoneTotal - userRzcBalance).toLocaleString()} RZC to unlock Node • ~${((nodeMilestoneTotal - userRzcBalance) * contextRzcPrice).toFixed(0)} needed
              </p>
            </div>
            <ChevronRight size={14} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          </div>
        )}

        {/* Referral Link Quick Copy */}
        {referralData?.referral_code && (
          <div className="flex items-center gap-3 p-3 bg-white dark:bg-[#0a0a0a] rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm mt-1 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Share2 size={18} className="text-emerald-600 dark:text-[#00FF88]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-heading font-black text-gray-500 uppercase tracking-widest mb-0.5">Your Referral Link</p>
              <p className="text-xs font-mono text-gray-900 dark:text-gray-300 truncate">
                {`${window.location.origin}/#/join?ref=${referralData.referral_code}`}
              </p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/#/join?ref=${referralData.referral_code}`);
                setCopiedLink(true);
                showToast('Referral link copied!', 'success');
                setTimeout(() => setCopiedLink(false), 2000);
              }}
              className={`shrink-0 flex items-center justify-center w-9 h-9 rounded-xl transition-all ${copiedLink
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400'
                }`}
            >
              {copiedLink ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        )}

        {/* Flash News - Latest from Medium Blog */}
        <FlashNews />

        {/* Transaction History */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-2">
              <History size={13} className="text-slate-400 dark:text-slate-500" />
              <h3 className="text-[11px] font-heading font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">{t('dashboard.recentActivity')}</h3>
            </div>
            <button
              onClick={() => navigate('/wallet/history')}
              className="text-[10px] font-bold text-emerald-600 dark:text-primary hover:underline active:scale-95 flex items-center gap-1"
            >
              {t('common.viewAll')} <ArrowRight size={10} />
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
          ) : transactions.length === 0 && rzcTransactions.length === 0 ? (
            <div className="p-6 sm:p-8 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl sm:rounded-2xl text-center">
              <History size={28} className="mx-auto mb-2.5 text-slate-400 dark:text-gray-600" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">{t('dashboard.noTransactions')}</h4>
              <p className="text-xs text-slate-500 dark:text-gray-400 mb-3">
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
              {(() => {
                // Merge hook transactions with directly-fetched RZC transactions
                const typeLabel = {
                  activation_bonus: 'Activation Bonus', signup_bonus: 'Signup Reward',
                  referral_bonus: 'Referral Reward', squad_mining: 'Squad Mining',
                  migration: 'Migration Credit', transfer_sent: 'Sent',
                  transfer_received: 'Received', transfer: 'Transfer',
                  purchase: 'Purchase', airdrop: 'Airdrop',
                };
                const rzcMapped = rzcTransactions.map(row => ({
                  id: row.id,
                  type: row.amount > 0 ? 'receive' as const : 'send' as const,
                  amount: Math.abs(Number(row.amount)).toLocaleString(undefined, { maximumFractionDigits: 2 }),
                  asset: 'RZC',
                  timestamp: new Date(row.created_at).getTime(),
                  status: 'completed' as const,
                  comment: row.description ?? safeGet(typeLabel, row.type) ?? row.type.replace(/_/g, ' '),
                  counterpartyUsername: row.metadata?.recipient_username ?? row.metadata?.sender_username,
                }));
                // Remove any RZC entries already in hook transactions to avoid dupes
                const nonRzc = transactions.filter(tx => tx.asset !== 'RZC');
                const merged = [...nonRzc, ...rzcMapped].sort((a, b) => b.timestamp - a.timestamp);
                return merged.slice(0, 5).map((tx) => (
                  <TransactionItem
                    key={tx.id}
                    transaction={tx}
                    onClick={() => navigate('/wallet/history')}
                  />
                ));
              })()}
            </div>
          )}
        </div>
        {/* Marketplace Banner - Compact */}
        <AffiliateHubBanner />

        {/* Switch to Wallet View — floating button at bottom of portfolio */}
        <div className="flex justify-center pt-2 pb-1">
          <button
            onClick={toggleDashView}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] hover:bg-slate-200 dark:hover:bg-white/10 transition-colors active:scale-95 text-[12px] font-semibold text-slate-600 dark:text-gray-400"
          >
            <span>📱</span>
            Switch to Wallet View
          </button>
        </div>
        </>)}

      </div>
    </>
  );
};

export default Dashboard;
