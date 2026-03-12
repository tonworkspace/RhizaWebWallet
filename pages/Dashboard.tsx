
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
  Lock
} from 'lucide-react';
import { MOCK_PORTFOLIO_HISTORY, getNetworkConfig, getExplorerUrl, getTransactionUrl } from '../constants';
import { useWallet } from '../context/WalletContext';
import { useBalance } from '../hooks/useBalance';
import { useTransactions } from '../hooks/useTransactions';
import TransactionItem from '../components/TransactionItem';
import LoadingSkeleton from '../components/LoadingSkeleton';
import LanguageSelector from '../components/LanguageSelector';
import ClaimActivationBonus from '../components/ClaimActivationBonus';
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
      ${primary
        ? 'bg-emerald-600 dark:bg-primary text-white dark:text-black hover:bg-emerald-700 dark:hover:bg-[#00dd77] shadow-xl active:scale-95 transition-colors'
        : 'bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/5 text-gray-950 dark:text-white hover:bg-gray-50 dark:hover:bg-white/10 active:scale-95'}
    `}
  >
    <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center ${primary ? 'bg-white/20 dark:bg-black/5' : 'bg-gray-100 dark:bg-white/5'}`}>
      <Icon size={18} strokeWidth={2.5} />
    </div>
    <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { balance, address, refreshData, network, switchNetwork, userProfile, referralData, isActivated, activatedAt } = useWallet();
  const networkConfig = getNetworkConfig(network);
  const {
    tonBalance,
    tonPrice,
    totalUsdValue,
    change24h,
    changePercent24h,
    isLoading: balanceLoading,
    error: balanceError,
    refreshBalance
  } = useBalance();
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

  // Calculate combined portfolio value (TON + RZC)
  const rzcBalance = (userProfile as any)?.rzc_balance || 0;
  const rzcPrice = 0.10; // 1 RZC = $0.10
  const rzcUsdValue = rzcBalance * rzcPrice;
  const combinedPortfolioValue = totalUsdValue + rzcUsdValue;

  // Currency conversion rates (mock data - should be fetched from API)
  const conversionRates = {
    USD: 1,
    BTC: 0.000015, // 1 USD = 0.000015 BTC (approx $66,666 per BTC)
    TON: 0.408, // 1 USD = 0.408 TON (approx $2.45 per TON)
    USDT: 1, // 1 USD = 1 USDT (stablecoin)
    EUR: 0.92, // 1 USD = 0.92 EUR
  };

  // Currency symbols
  const currencySymbols = {
    USD: '$',
    BTC: '₿',
    TON: 'TON',
    USDT: '$',
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
    if (timeframe === 'SEED') return baseValue * 1.0;
    if (timeframe === 'PRESALE') return baseValue * (0.25 / 0.12);
    return baseValue * (0.50 / 0.12);
  }, [timeframe, convertedValue]);

  // Currency display options
  const currencies: Array<'USD' | 'BTC' | 'TON' | 'USDT' | 'EUR'> = ['USD', 'BTC', 'TON', 'USDT', 'EUR'];
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);
  const [latestConfirmation, setLatestConfirmation] = useState<any>(null);
  const [migrationStatus, setMigrationStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');

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
        message: "✅ Your RZC/STK migration was approved. Tokens credited to your wallet!",
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
        title: "Migrate RZC/STK",
        badge: "Required",
        ping: true,
        message: "🔄 Transfer tokens from Telegram bot • 24-48h review • Tap to start",
        onClick: () => navigate('/wallet/migration'),
        theme: 'purple' as const,
        icon: TrendingUp
      });
    }

    // 3. RZC Balance Verification Notice
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
  }, [isActivated, activatedAt, navigate, migrationStatus]);

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

  return (
    <>
      {/* Main Dashboard Content */}
      <div className="max-w-2xl mx-auto space-y-3.5 sm:space-y-5 page-enter px-3 sm:px-4 md:px-0 pb-4">

        {/* Transaction Confirmation Action Card */}
        {latestConfirmation && (
          <div className="relative group p-4 bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-300 dark:border-emerald-500/30 rounded-2xl shadow-sm transition-all animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-md">
                <ShieldCheck size={20} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="text-sm font-black text-emerald-900 dark:text-emerald-300 leading-tight truncate">
                    {latestConfirmation.title}
                  </h3>
                  <button
                    onClick={(e) => { e.stopPropagation(); dismissConfirmation(); }}
                    className="p-1 px-1.5 bg-emerald-200/50 hover:bg-emerald-300/50 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/40 rounded-lg text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-200 transition-colors text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-400/90 leading-snug">
                  {latestConfirmation.message}
                </p>
                {latestConfirmation.data?.txHash && (
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-600/10 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-md">
                      Verified On-Chain
                    </span>
                    <a
                      href={getTransactionUrl(latestConfirmation.data.txHash, network)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:underline flex items-center gap-0.5"
                    >
                      View Tx <ExternalLink size={10} />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* System & Actions Carousel Shoutbox */}
        <div key={currentAnnouncement.id} className="relative group cursor-pointer animate-in fade-in slide-in-from-right-4 duration-500" onClick={currentAnnouncement.onClick}>
          <div className={`absolute -inset-0.5 bg-gradient-to-r ${currentTheme.glow} rounded-2xl blur-lg opacity-40 group-hover:opacity-60 transition-opacity duration-500`} />
          <div className={`relative p-3 sm:p-4 rounded-xl bg-gradient-to-br ${currentTheme.bg} border-2 backdrop-blur-sm shadow-lg overflow-hidden transition-all w-full active:scale-[0.98]`}>
            {/* Background design accents */}
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
            
            <div className="flex items-center gap-3 sm:gap-3.5">
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${currentTheme.iconBg} flex items-center justify-center flex-shrink-0 shadow-md relative z-10 border border-white/10`}>
                <CurrentIcon size={18} className="text-white drop-shadow-md" />
              </div>
              
              <div className="flex-1 min-w-0 relative z-10 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <h3 className={`text-[10px] sm:text-[11px] font-black uppercase tracking-widest ${currentTheme.title} leading-none`}>{currentAnnouncement.title}</h3>
                  <div className="flex items-center gap-1.5">
                    {currentAnnouncement.ping && (
                      <span className="relative flex h-2 w-2">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${currentTheme.badgePing} opacity-75`}></span>
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${currentTheme.badgeDot}`}></span>
                      </span>
                    )}
                    <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md leading-none shadow-sm border ${currentTheme.badgeBg}`}>
                      {currentAnnouncement.badge}
                    </span>
                  </div>
                </div>
                
                <div className="w-full">
                  <p className={`text-[11px] sm:text-[11.5px] font-bold ${currentTheme.message} leading-snug line-clamp-2 sm:truncate sm:whitespace-nowrap`}>
                    {currentAnnouncement.message}
                  </p>
                </div>
              </div>
              
              <div className="flex-shrink-0 pl-1 relative z-10 hidden sm:block">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-chevron-right ${currentTheme.chevron} opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300`}><path d="m9 18 6-6-6-6"></path></svg>
              </div>
            </div>

            {/* Slide progress dots */}
            <div className="flex items-center justify-center gap-1.5 mt-2.5 relative z-10">
              {announcements.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setCurrentAnnouncementIndex(idx); }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentAnnouncementIndex ? 'w-4 bg-current opacity-80' : 'w-1.5 opacity-30 bg-current'}`}
                  style={{ color: 'inherit' }}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Claim Missing Activation Bonus */}
        <ClaimActivationBonus />

        {/* Network Switcher - Compact */}
        <div className="flex items-center justify-between hidden">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${network === 'mainnet' ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`} />
            <span className="text-[10px] font-bold text-gray-600 dark:text-gray-500 uppercase tracking-wider">
              {networkConfig.NAME}
            </span>
            <button
              onClick={() => setShowNetworkInfo(!showNetworkInfo)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Network info"
            >
              <Info size={12} className="text-gray-600 dark:text-gray-500" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector compact />
            <button
              onClick={() => switchNetwork(network === 'mainnet' ? 'testnet' : 'mainnet')}
              className="px-3 py-1.5 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-emerald-600 dark:hover:text-primary transition-all active:scale-95 shadow-sm"
            >
              {t('dashboard.switch')}
            </button>
          </div>
        </div>

        {/* Network Info Panel - Compact */}
        {showNetworkInfo && (
          <div className="p-3 sm:p-4 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl sm:rounded-2xl space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-400">{t('dashboard.networkDetails')}</h4>
              <button
                onClick={() => setShowNetworkInfo(false)}
                className="text-gray-600 hover:text-gray-950 dark:text-gray-400 dark:hover:text-gray-300 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div>
                <p className="text-gray-600 dark:text-gray-500 font-medium mb-0.5 text-[10px]">{t('dashboard.network')}</p>
                <p className="text-gray-950 dark:text-white font-bold text-xs">{networkConfig.NAME}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-500 font-medium mb-0.5 text-[10px]">{t('dashboard.chainId')}</p>
                <p className="text-gray-950 dark:text-white font-bold text-xs">{networkConfig.CHAIN_ID}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-600 dark:text-gray-500 font-medium mb-0.5 text-[10px]">{t('dashboard.explorer')}</p>
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

        {/* Portfolio Terminal Card - Compact */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-200/50 to-cyan-200/50 dark:from-primary/20 dark:to-secondary/20 rounded-2xl sm:rounded-[2rem] blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
          <div className="relative bg-white dark:bg-[#0a0a0a]/80 backdrop-blur-xl border-2 border-gray-300 dark:border-white/5 rounded-2xl sm:rounded-[2rem] overflow-hidden p-5 sm:p-6 shadow-lg">

            {balanceError ? (
              <div className="p-4 sm:p-5 bg-red-100 dark:bg-red-500/10 border-2 border-red-300 dark:border-red-500/20 rounded-xl sm:rounded-2xl shadow-sm">
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
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5 sm:space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600 dark:text-gray-500">
                      <ShieldCheck size={12} className="text-emerald-600 dark:text-primary flex-shrink-0" />
                      <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest truncate">{t('dashboard.totalPortfolio')}</span>
                    </div>

                    {balanceLoading ? (
                      <LoadingSkeleton width={200} height={40} />
                    ) : (
                      <h2 className="text-3xl sm:text-4xl font-black tracking-tight-custom text-gray-950 dark:text-white">
                        {balanceVisible ? (
                          <>
                            {selectedCurrency === 'USD' || selectedCurrency === 'USDT' || selectedCurrency === 'EUR' ? currencySymbols[selectedCurrency] : ''}
                            {formatValue(convertedValue, selectedCurrency)}
                            <span className="text-base sm:text-lg font-bold text-gray-600 dark:text-gray-600"> {selectedCurrency === 'BTC' || selectedCurrency === 'TON' ? selectedCurrency : ''}</span>
                          </>
                        ) : (
                          <span className="text-gray-600 dark:text-gray-600">••••••</span>
                        )}
                      </h2>
                    )}

                    {balanceLoading ? (
                      <LoadingSkeleton width={120} height={14} />
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <div className={`flex items-center gap-1.5 font-bold text-[10px] sm:text-xs transition-colors duration-300 ${change24h >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'
                            }`}>
                            <TrendingUp size={10} className={`transition-transform duration-300 ${change24h < 0 ? 'rotate-180' : ''}`} />
                            <span>
                              {balanceVisible ? (
                                change24h === 0 ? 'No change' : `${change24h >= 0 ? '+' : ''}$${Math.abs(change24h).toFixed(2)} (${changePercent24h >= 0 ? '+' : ''}${changePercent24h.toFixed(2)}%)`
                              ) : (
                                '•••••'
                              )}
                            </span>
                          </div>
                          <span className="text-[8px] text-gray-600 dark:text-gray-600 font-medium">24h</span>
                        </div>
                        {balanceVisible && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-gray-700 dark:text-gray-500 font-medium">
                              {tonBalance.toFixed(4)} TON
                            </span>
                            <span className="text-[10px] text-gray-600 dark:text-gray-600">•</span>
                            <span className="text-[10px] text-emerald-700 dark:text-[#00FF88] font-medium">
                              {rzcBalance.toLocaleString()} RZC
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex gap-1.5 sm:gap-2">
                    {/* Currency Selector - Hidden on Mobile */}
                    <div className="relative currency-selector hidden sm:block">
                      <button
                        onClick={() => setShowCurrencyMenu(!showCurrencyMenu)}
                        className="p-2 sm:p-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-all text-gray-700 dark:text-gray-400 active:scale-90 text-[10px] font-black min-w-[44px] flex items-center justify-center shadow-sm"
                        aria-label="Select currency"
                      >
                        {selectedCurrency}
                      </button>

                      {showCurrencyMenu && (
                        <div className="absolute right-0 top-full mt-2 bg-white dark:bg-[#0a0a0a] border-2 border-gray-300 dark:border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden min-w-[120px] animate-in fade-in slide-in-from-top-2 duration-200">
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
                      className="p-2 sm:p-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-all text-gray-700 dark:text-gray-400 active:scale-90 shadow-sm"
                      aria-label={balanceVisible ? t('dashboard.hideBalance') : t('dashboard.showBalance')}
                    >
                      {balanceVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className="p-2 sm:p-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-all text-gray-700 dark:text-gray-400 active:scale-90 disabled:opacity-50 shadow-sm"
                      aria-label={t('dashboard.refreshBalance')}
                    >
                      <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>

                <div className="mt-8 mb-2">
                  <div className="flex bg-black/50 dark:bg-black/80 rounded-lg p-1 border border-black/10 dark:border-white/5 shadow-inner w-full mb-6">
                    {(['SEED', 'PRESALE', 'PUBLIC'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setTimeframe(t)}
                        className={`flex-1 py-1.5 rounded-md text-[9px] font-black tracking-widest transition-all ${timeframe === t
                          ? 'bg-emerald-500 text-white shadow-lg'
                          : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300'
                          }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  <div className="h-28 w-full relative mb-6">
                    {/* Start Marker */}
                    <div className="absolute left-0 bottom-[22px] w-2.5 h-2.5 bg-white rounded-full border-2 border-emerald-500 z-20 shadow-[0_0_10px_#10b981]" />

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

                  <div className="flex justify-between gap-1 text-zinc-500 dark:text-zinc-400 text-[9px] sm:text-[10px] font-black uppercase tracking-widest border-t border-black/10 dark:border-white/10 pt-3 sm:pt-4 relative z-10 font-mono">
                    <div className="flex flex-col">
                      <span className="opacity-70 text-[8px] mb-1">Current Base</span>
                      <span className="text-gray-900 dark:text-white text-[11px] sm:text-xs">
                        {currencySymbols[selectedCurrency] || ''}{formatValue(convertedValue, selectedCurrency)}
                      </span>
                    </div>
                    <div className="flex flex-col text-center">
                      <span className="opacity-70 text-[8px] mb-1">Multiplier</span>
                      <span className="text-emerald-600 dark:text-emerald-500 text-[11px] sm:text-xs shadow-emerald-500/50 drop-shadow-md">
                        {convertedValue > 0 ? (projectedValue / convertedValue).toFixed(1) : '1.0'}x
                      </span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="opacity-70 text-[8px] mb-1">{timeframe} Target</span>
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

        {/* Functional Action Grid - Compact */}
        <div className="flex gap-2 sm:gap-2.5">
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
            onClick={() => navigate('/wallet/sales-package')}
          />
        </div>

        {/* Mining Nodes CTA - Links to Mining Tab */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
          <div
            onClick={() => navigate('/wallet/sales-package')}
            className="relative p-4 rounded-xl bg-gradient-to-br from-emerald-50 via-cyan-50 to-emerald-50 dark:from-emerald-500/15 dark:via-cyan-500/15 dark:to-emerald-500/15 border-2 border-emerald-400 dark:border-emerald-500/30 cursor-pointer active:scale-[0.98] transition-all hover:border-emerald-500 dark:hover:border-emerald-400/50 shadow-xl hover:shadow-emerald-500/20"
          >
            <div className="absolute -top-2 -right-2 z-10">
              <div className="relative">
                <div className="absolute inset-0 bg-red-500 rounded-full blur-sm animate-pulse"></div>
                <div className="relative px-2 py-1 bg-gradient-to-r from-red-600 to-orange-600 rounded-full border-2 border-white dark:border-gray-900 shadow-md">
                  <span className="text-[8px] font-black text-white uppercase tracking-wider flex items-center gap-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clock" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>
                    Limited
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="relative flex-shrink-0">
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-cyan-600 rounded-lg blur-sm opacity-50 animate-pulse"></div>
                      <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-600 to-cyan-600 flex items-center justify-center flex-shrink-0 shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-zap text-white" aria-hidden="true"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"></path></svg>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-black text-emerald-900 dark:text-emerald-300 leading-tight mb-0.5">🚀 BUY RZC at $0.12!</h3>
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[8px] font-black uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-cyan-600 text-white px-1.5 py-0.5 rounded-full">Early Bird</span>
                        <span className="text-[8px] font-black uppercase tracking-wider bg-red-600 text-white px-1.5 py-0.5 rounded-full animate-pulse">🔥 Hot</span>
                      </div>
                    </div>
                  </div>
                  <div className="mb-2 p-2 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-500/10 dark:to-orange-500/10 border-l-2 border-orange-500 rounded">
                    <p className="text-[10px] font-black text-orange-900 dark:text-orange-300 leading-tight">⚡ Price Increases Soon! Instant RZC + 10% referral bonus</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <div className="flex items-center gap-1 text-[9px] font-black text-emerald-900 dark:text-emerald-300 bg-white/70 dark:bg-white/15 px-2 py-1 rounded-md">
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sparkles text-yellow-500" aria-hidden="true"><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"></path><path d="M20 2v4"></path><path d="M22 4h-4"></path><circle cx="4" cy="20" r="2"></circle></svg>
                      <span>Instant</span>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] font-black text-emerald-900 dark:text-emerald-300 bg-white/70 dark:bg-white/15 px-2 py-1 rounded-md">
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trending-up text-green-500" aria-hidden="true"><path d="M16 7h6v6"></path><path d="m22 7-8.5 8.5-5-5L2 17"></path></svg>
                      <span>10% Bonus</span>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] font-black text-emerald-900 dark:text-emerald-300 bg-white/70 dark:bg-white/15 px-2 py-1 rounded-md">
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-shield-check text-blue-500" aria-hidden="true"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path><path d="m9 12 2 2 4-4"></path></svg>
                      <span>$100-$10K</span>
                    </div>
                  </div>
                </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-external-link text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 group-hover:scale-110 transition-all flex-shrink-0 mt-1" aria-hidden="true"><path d="M15 3h6v6"></path><path d="M10 14 21 3"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path></svg>
            </div>
          </div>
        </div>

        {/* Migration CTA */}


        {/* Transaction History - Compact */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-500 flex items-center gap-1.5">
              <History size={12} />
              {t('dashboard.recentActivity')}
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
                    onClick={refreshTransactions}
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
            <div className="p-6 sm:p-8 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl sm:rounded-2xl text-center">
              <History size={28} className="mx-auto mb-2.5 text-slate-300 dark:text-gray-700" />
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
            <div className="space-y-2.5">
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
        <div
          onClick={() => navigate('/marketplace')}
          className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-secondary/10 to-transparent border border-secondary/20 flex items-center justify-between gap-2 group cursor-pointer active:scale-[0.98] transition-all hover:border-secondary/40 shadow-sm"
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-secondary/20 flex items-center justify-center text-secondary flex-shrink-0">
              <ShoppingBag size={18} />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">{t('dashboard.marketplaceBanner')}</h4>
              <p className="text-[10px] text-slate-600 dark:text-gray-400 font-medium line-clamp-1">{t('dashboard.marketplaceBannerDesc')}</p>
            </div>
          </div>
          <ExternalLink size={14} className="text-secondary group-hover:translate-x-1 transition-transform flex-shrink-0" />
        </div>
      </div>
    </>
  );
};

export default Dashboard;
