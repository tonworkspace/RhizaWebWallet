import { safeGet } from '../utils/safeAccess';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Download,
  Send,
  ArrowLeftRight,
  LayoutGrid,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Zap,
  RefreshCw,
  History,
  ArrowRight,
  AlertCircle,
  Layers,
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { useTransactions } from '../hooks/useTransactions';
import { supabaseService } from '../services/supabaseService';
import TransactionItem from './TransactionItem';
import LoadingSkeleton from './LoadingSkeleton';
import FlashNews from './FlashNews';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AssetItem {
  id: string;
  symbol: string;
  name: string;
  balance: number;
  usdValue: number;
  price: number;
  color: string;
  bg: string;
  logo: string | null;
  change?: number;
  isCore?: boolean;
}

export interface PriceItem {
  symbol: string;
  price: string;
  color: string;
}

export interface MarketItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  color: string;
  sparklineSeed: number;
}

interface WalletViewProps {
  combinedPortfolioValue: number;
  change24h: number;
  changePercent24h: number;
  balanceVisible: boolean;
  setBalanceVisible: (v: boolean) => void;
  assetList: AssetItem[];
  tonPrice: number;
  btcPrice: number;
  ethPrice: number;
  solPrice: number;
  rzcPrice: number;
  priceItems: PriceItem[];
  marketItems?: MarketItem[];
  isRefreshing: boolean;
  onRefresh: () => void;
  onToggleView: () => void;
  network: string;
  // Optional additional props forwarded from Dashboard
  isActivated?: boolean;
  activatedAt?: string | null;
  verificationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtSmall = (n: number) => {
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (n >= 1) return n.toFixed(2);
  if (n >= 0.001) return n.toFixed(4);
  return n.toFixed(6);
};

const ChangeChip: React.FC<{ value: number; compact?: boolean }> = ({ value, compact }) => {
  const positive = value >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  const abs = Math.abs(value);
  const label = compact ? `${abs.toFixed(2)}%` : `${positive ? '+' : '-'}${abs.toFixed(2)}%`;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-bold font-numbers ${positive ? 'text-emerald-500' : 'text-red-500'
        }`}
    >
      <Icon size={9} strokeWidth={3} />
      {label}
    </span>
  );
};

// ─── Sparkline Trend Graph ───────────────────────────────────────────────────

const Sparkline: React.FC<{ change: number; seed: number }> = ({ change, seed }) => {
  const isPositive = change >= 0;
  const points: number[] = [];
  const count = 8;

  // Create deterministic wavy path based on seed and percentage change
  for (let i = 0; i < count; i++) {
    const trend = isPositive ? (i / count) * 8 : -(i / count) * 8;
    const sineVal = Math.sin((i + seed) * 1.5) * 16;
    const point = 50 - trend + sineVal;
    points.push(Math.max(15, Math.min(85, point)));
  }

  const width = 80;
  const height = 30;
  const pathData = points
    .map((val, idx) => {
      const x = (idx / (count - 1)) * width;
      const y = (val / 100) * height;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  const strokeColor = isPositive ? '#10b981' : '#ef4444'; // Tailwind emerald-500 or red-500

  return (
    <svg width="60" height="24" viewBox={`0 0 ${width} ${height}`} className="opacity-80 mx-auto">
      <path
        d={pathData}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// ─── Market Token Logo ────────────────────────────────────────────────────────

const MarketTokenLogo: React.FC<{ symbol: string; size?: number }> = ({ symbol, size = 38 }) => {
  const [imgError, setImgError] = useState(false);
  const s = `${size}px`;

  // Popular high-fidelity CDN icons (CoinGecko)
  const logos: Record<string, string> = {
    BTC: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
    ETH: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
    // TON: TrustWallet CDN — same source as Dashboard
    TON: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ton/info/logo.png',
    // RZC: no external image — rendered as branded gradient fallback
    BNB: 'https://assets.coingecko.com/coins/images/825/large/binance-coin-logo.png',
    SOL: 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
    MATIC: 'https://assets.coingecko.com/coins/images/4713/large/polygon.png',
    AVAX: 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedColors.png',
    TRX: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/tron/info/logo.png',
    USDT: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
    USDC: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png',
  };

  // RZC has no external image — falls to gradient avatar below
  const logoUrl = safeGet(logos, symbol);

  if (logoUrl && !imgError) {
    return (
      <img
        src={logoUrl}
        alt={symbol}
        style={{ width: s, height: s }}
        className="rounded-full object-cover flex-shrink-0"
        onError={() => setImgError(true)}
      />
    );
  }

  // Fallback - elegant gradient with emblem initials
  const colorMap: Record<string, string> = {
    RZC: 'from-emerald-500 to-teal-600',
    TON: 'from-blue-500 to-cyan-600',
    BTC: 'from-orange-400 to-amber-500',
    ETH: 'from-indigo-500 to-purple-600',
    BNB: 'from-yellow-400 to-amber-500',
    SOL: 'from-purple-500 to-indigo-600',
    USDT: 'from-teal-500 to-emerald-600',
    USDC: 'from-blue-400 to-blue-600',
    TRX: 'from-rose-500 to-red-600',
  };
  const grad = safeGet(colorMap, symbol) || 'from-slate-400 to-slate-600';

  return (
    <div
      style={{ width: s, height: s }}
      className={`rounded-full bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0`}
    >
      <span className="text-white font-bold" style={{ fontSize: `${size * 0.32}px` }}>
        {symbol.slice(0, 3)}
      </span>
    </div>
  );
};

// ─── Asset Token Logo ─────────────────────────────────────────────────────────

const TokenLogo: React.FC<{ asset: AssetItem; size?: number }> = ({ asset, size = 38 }) => {
  const [imgError, setImgError] = useState(false);
  const s = `${size}px`;

  if (asset.logo && !imgError) {
    return (
      <img
        src={asset.logo}
        alt={asset.symbol}
        style={{ width: s, height: s }}
        className="rounded-full object-cover flex-shrink-0"
        onError={() => setImgError(true)}
      />
    );
  }

  // Fallback — colored circle with initials
  const colorMap: Record<string, string> = {
    RZC: 'from-emerald-500 to-teal-600',
    TON: 'from-blue-500 to-cyan-600',
    BTC: 'from-orange-400 to-amber-500',
    ETH: 'from-indigo-500 to-purple-600',
    BNB: 'from-yellow-400 to-amber-500',
    USDT: 'from-teal-500 to-emerald-600',
    USDC: 'from-blue-400 to-blue-600',
    TRX: 'from-rose-500 to-red-600',
  };
  const grad = safeGet(colorMap, asset.symbol) || 'from-slate-400 to-slate-600';

  return (
    <div
      style={{ width: s, height: s }}
      className={`rounded-full bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0`}
    >
      <span className="text-white font-bold" style={{ fontSize: `${size * 0.28}px` }}>
        {asset.symbol.slice(0, 3)}
      </span>
    </div>
  );
};

// ─── Quick Action Button ──────────────────────────────────────────────────────

const QuickAction: React.FC<{
  icon: React.ElementType;
  label: string;
  primary?: boolean;
  onClick: () => void;
}> = ({ icon: Icon, label, primary, onClick }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-1.5 flex-1 group"
  >
    <div
      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-sm ${primary
          ? 'bg-primary text-black shadow-primary/30'
          : 'bg-slate-100 dark:bg-white/[0.08] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-white'
        }`}
    >
      <Icon size={20} strokeWidth={primary ? 2.5 : 2} />
    </div>
    <span className="text-[11px] font-semibold text-slate-600 dark:text-gray-400 group-active:text-primary transition-colors">
      {label}
    </span>
  </button>
);

// ─── Asset Row ────────────────────────────────────────────────────────────────

const AssetRow: React.FC<{ asset: AssetItem; hasPending?: boolean; onClick: () => void }> = ({ asset, hasPending, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 py-2.5 px-1 hover:bg-slate-50 dark:hover:bg-white/[0.03] rounded-xl transition-colors active:scale-[0.99] text-left relative"
  >
    <TokenLogo asset={asset} size={40} />

    {hasPending && (
      <div className="absolute top-2 left-8 w-3 h-3 bg-amber-500 border-2 border-white dark:border-[#0a0a0a] rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
    )}

    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-slate-900 dark:text-white leading-tight">
          {asset.name}
        </span>
        <span className="text-[13px] font-bold font-numbers text-slate-900 dark:text-white tabular-nums">
          ${fmtSmall(asset.price)}
        </span>
      </div>
      <div className="flex items-center justify-between mt-0.5">
        <span className="text-[11px] text-slate-400 dark:text-gray-500">
          {asset.symbol} · {fmtSmall(asset.balance)} {asset.symbol}
        </span>
        {asset.change !== undefined ? (
          <ChangeChip value={asset.change} compact />
        ) : (
          <span className="text-[10px] text-slate-300 dark:text-gray-700">—</span>
        )}
      </div>
    </div>
  </button>
);

// ─── CoinMarketCap Coin Profiles ──────────────────────────────────────────────

const COIN_PROFILES: Record<string, {
  rank: number;
  marketCap: string;
  volume24h: string;
  circulatingSupply: string;
  ath: string;
  description: string;
}> = {
  BTC: {
    rank: 1,
    marketCap: '$1.32T',
    volume24h: '$26.4B',
    circulatingSupply: '19.70M BTC',
    ath: '$73,750.07',
    description: 'Bitcoin is the world\'s first decentralized digital currency. Created in 2009 by the pseudonymous Satoshi Nakamoto, it runs on a global proof-of-work blockchain without central authorities.'
  },
  ETH: {
    rank: 2,
    marketCap: '$458.2B',
    volume24h: '$14.8B',
    circulatingSupply: '120.1M ETH',
    ath: '$4,891.70',
    description: 'Ethereum is a decentralized, open-source blockchain platform featuring smart contract functionality. Ether (ETH) is the native cryptocurrency token of the platform.'
  },
  TON: {
    rank: 12,
    marketCap: '$24.5B',
    volume24h: '$412.5M',
    circulatingSupply: '3.47B TON',
    ath: '$8.28',
    description: 'The Open Network (TON) is a fully decentralized layer-1 blockchain designed by Telegram to onboard billions of users. It features ultra-fast transaction execution and dynamic sharding.'
  },
  RZC: {
    rank: 88,
    marketCap: '$48.6M',
    volume24h: '$1.2M',
    circulatingSupply: '25.0M RZC',
    ath: '$4.25',
    description: 'Rhiza Coin (RZC) is the native utility and governance token of the Rhiza Ecosystem. It powers the secure payment gateways, node validations, and staking yields across Rhiza Web3.'
  },
  BNB: {
    rank: 4,
    marketCap: '$88.4B',
    volume24h: '$1.9B',
    circulatingSupply: '147.5M BNB',
    ath: '$720.67',
    description: 'BNB powers the BNB Chain ecosystem. It is the native token of the Binance Smart Chain (BSC) network, utilized for transaction fees, staking, and token launches.'
  },
  SOL: {
    rank: 5,
    marketCap: '$72.1B',
    volume24h: '$3.5B',
    circulatingSupply: '448.2M SOL',
    ath: '$260.06',
    description: 'Solana is a highly efficient Layer-1 blockchain supporting builder scale. Built with Proof of History (PoH), it yields thousands of transactions per second at sub-penny fees.'
  },
  USDT: {
    rank: 3,
    marketCap: '$112.5B',
    volume24h: '$48.2B',
    circulatingSupply: '112.5B USDT',
    ath: '$1.32',
    description: 'Tether (USDT) is a stablecoin pegged to the US Dollar. Launched in 2014, it is the most widely used stablecoin in the crypto ecosystem, backed 100% by Tether\'s reserves.'
  }
};

// ─── Large Interactive Sparkline for Profile Modal ─────────────────────────

const LargeSparkline: React.FC<{ change: number; seed: number; isPositive: boolean }> = ({ change, seed, isPositive }) => {
  const points: number[] = [];
  const count = 16; // higher resolution

  for (let i = 0; i < count; i++) {
    const trend = isPositive ? (i / count) * 12 : -(i / count) * 12;
    const sineVal = Math.sin((i + seed) * 1.2) * 18;
    const secondSine = Math.sin((i * 2 + seed) * 0.8) * 8;
    const point = 50 - trend + sineVal + secondSine;
    points.push(Math.max(10, Math.min(90, point)));
  }

  const width = 300;
  const height = 100;

  const pathData = points
    .map((val, idx) => {
      const x = (idx / (count - 1)) * width;
      const y = (val / 100) * height;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  const areaData = `${pathData} L ${width} ${height} L 0 ${height} Z`;

  const strokeColor = isPositive ? '#10b981' : '#ef4444';

  return (
    <div className="w-full relative h-[100px] bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.05] rounded-xl overflow-hidden mt-3 mb-1">
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="absolute inset-0">
        <defs>
          <linearGradient id="gradientGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity={0.2} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <path d={areaData} fill="url(#gradientGlow)" />
        <path
          d={pathData}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = 'top' | 'core' | 'chains' | 'all' | 'nfts';

const WalletView: React.FC<WalletViewProps> = ({
  combinedPortfolioValue,
  change24h,
  changePercent24h,
  balanceVisible,
  setBalanceVisible,
  assetList,
  tonPrice,
  btcPrice,
  ethPrice,
  solPrice,
  rzcPrice,
  priceItems,
  marketItems,
  isRefreshing,
  onRefresh,
  onToggleView,
  network,
  isActivated = false,
  activatedAt = null,
  verificationStatus = 'none',
}) => {
  const { pendingTransactions, address, userProfile, switchNetwork } = useWallet();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('top');
  const isPositive = change24h >= 0;

  // ── Multi-currency balance toggle ────────────────────────────────────────────
  type BaseCurrency = 'USD' | 'BTC' | 'TON' | 'USDT' | 'EUR';
  const CURRENCIES: BaseCurrency[] = ['USD', 'BTC', 'TON', 'USDT', 'EUR'];

  const [baseCurrency, setBaseCurrency] = useState<BaseCurrency>(() => {
    try { return (localStorage.getItem('walletBaseCurrency') as BaseCurrency) || 'USD'; }
    catch { return 'USD'; }
  });
  const [currencyFlip, setCurrencyFlip] = useState(false);

  const cycleCurrency = () => {
    const next = CURRENCIES[(CURRENCIES.indexOf(baseCurrency) + 1) % CURRENCIES.length];
    setBaseCurrency(next);
    setCurrencyFlip(true);
    setTimeout(() => setCurrencyFlip(false), 300);
    try { localStorage.setItem('walletBaseCurrency', next); } catch { /* ignore */ }
  };

  // EUR approximation: 1 USD ≈ 0.92 EUR (static fallback until a live feed is wired)
  const EUR_RATE = 0.92;

  const convertedBalance = useMemo(() => {
    const usd = combinedPortfolioValue;
    if (baseCurrency === 'USD')  return { value: usd,                                         symbol: '$',  code: 'USD', decimals: 2 };
    if (baseCurrency === 'EUR')  return { value: usd * EUR_RATE,                              symbol: '€',  code: 'EUR', decimals: 2 };
    if (baseCurrency === 'USDT') return { value: usd,                                         symbol: '₮',  code: 'USDT', decimals: 2 };
    if (baseCurrency === 'BTC' && btcPrice > 0) return { value: usd / btcPrice,              symbol: '₿',  code: 'BTC',  decimals: 6 };
    if (baseCurrency === 'TON' && tonPrice > 0) return { value: usd / tonPrice,              symbol: '◈',  code: 'TON',  decimals: 4 };
    // Fallback if price not loaded yet
    return { value: usd, symbol: '$', code: 'USD', decimals: 2 };
  }, [baseCurrency, combinedPortfolioValue, btcPrice, tonPrice]);

  const fmtConverted = (n: number, decimals: number) => {
    if (decimals === 6) return n.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 });
    if (decimals === 4) return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // ── Transaction History ──────────────────────────────────────────────────────
  const { transactions, isLoading: txLoading, error: txError, refreshTransactions } = useTransactions();
  const [rzcTransactions, setRzcTransactions] = useState<any[]>([]);

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

  // ── Announcements ────────────────────────────────────────────────────────────
  const announcements = useMemo(() => {
    const items: Array<{ id: string; badge: string; message: string; ping: boolean; theme: 'emerald' | 'amber' | 'red' | 'blue' | 'purple'; onClick: () => void }> = [];

    if (isActivated && activatedAt) {
      items.push({
        id: 'activated',
        badge: 'Active',
        message: `✅ Wallet activated on ${new Date(activatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
        ping: false,
        theme: 'emerald',
        onClick: () => {},
      });
    } else {
      items.push({
        id: 'not-activated',
        badge: 'Pending',
        message: '⚠️ Wallet not activated. Claim bonus or deposit to activate.',
        ping: true,
        theme: 'amber',
        onClick: () => {},
      });
    }

    if (verificationStatus === 'approved') {
      items.push({ id: 'ver-ok', badge: 'Approved', message: '✅ RZC balance verified. Transfers unlocked!', ping: false, theme: 'emerald', onClick: () => navigate('/wallet/market') });
    } else if (verificationStatus === 'pending') {
      items.push({ id: 'ver-pending', badge: 'In Review', message: '⏳ Balance verification under review • Transfers paused • Funds safe', ping: true, theme: 'amber', onClick: () => navigate('/wallet/market') });
    } else if (verificationStatus === 'rejected') {
      items.push({ id: 'ver-rejected', badge: 'Action Needed', message: '❌ Verification rejected. Tap to resubmit.', ping: true, theme: 'red', onClick: () => navigate('/wallet/market') });
    } else {
      items.push({ id: 'rzc-locked', badge: 'Verification', message: '🔒 RZC transfers paused • Balances being verified • Funds safe', ping: true, theme: 'amber', onClick: () => navigate('/wallet/market') });
    }

    items.push({
      id: 'mainnet',
      badge: 'Register Now',
      message: '🚀 RhizaCore mainnet is here! Register your interest & verify your RZC balance.',
      ping: true,
      theme: 'emerald',
      onClick: () => navigate('/wallet/engagement'),
    });

    items.push({
      id: 'system-ok',
      badge: 'Operational',
      message: '✅ All systems fully operational • Platform running at 100%',
      ping: false,
      theme: 'emerald',
      onClick: () => {},
    });

    return items;
  }, [isActivated, activatedAt, verificationStatus, navigate]);

  const [announcementIdx, setAnnouncementIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setAnnouncementIdx(i => (i + 1) % announcements.length), 5000);
    return () => clearInterval(timer);
  }, [announcements.length]);

  const currentAnnouncement = announcements[announcementIdx] || announcements[0];

  const themeColor = (theme: string, variant: 'bg' | 'text' | 'dot') => {
    const map: Record<string, Record<string, string>> = {
      emerald: { bg: 'from-emerald-500 to-teal-600', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400', ping: 'bg-emerald-400' },
      amber:   { bg: 'from-amber-500 to-orange-600',  text: 'text-amber-700 dark:text-amber-300',   dot: 'bg-amber-500',   badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',   ping: 'bg-amber-400' },
      red:     { bg: 'from-red-500 to-rose-600',       text: 'text-red-700 dark:text-red-300',       dot: 'bg-red-500',     badge: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',         ping: 'bg-red-400' },
      blue:    { bg: 'from-blue-500 to-indigo-600',    text: 'text-blue-700 dark:text-blue-300',     dot: 'bg-blue-500',    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',     ping: 'bg-blue-400' },
      purple:  { bg: 'from-purple-500 to-fuchsia-600', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-500',  badge: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400', ping: 'bg-purple-400' },
    };
    return safeGet(map, theme)?.[variant] ?? map.blue[variant];
  };

  // ── Tab filtering ──────────────────────────────────────────────────────────
  const tabAssets = (activeTab === 'nfts' ? [] : {
    top: [...assetList].sort((a, b) => b.usdValue - a.usdValue).slice(0, 10),
    core: assetList.filter(a => a.isCore),
    chains: assetList.filter(a => !a.isCore),
    all: assetList,
  }[activeTab as Exclude<Tab, 'nfts'>]) ?? [];

  // ── Trending strip data (Blend of Global Markets and Wallet Assets Movers) ──
  const trendingItems = useMemo(() => {
    const itemsMap = new Map<string, any>();

    // 1. Add all market items as AssetItem conformant objects
    if (marketItems) {
      marketItems.forEach(m => {
        const logos: Record<string, string> = {
          BTC: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
          ETH: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
          // TON: TrustWallet CDN — same source as Dashboard
          TON: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ton/info/logo.png',
          // RZC: no external image — falls to branded gradient
          BNB: 'https://assets.coingecko.com/coins/images/825/large/binance-coin-logo.png',
          SOL: 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
        };

        itemsMap.set(m.symbol, {
          id: m.symbol.toLowerCase(),
          symbol: m.symbol,
          name: m.name,
          balance: 0,
          usdValue: 0,
          price: m.price,
          color: m.color,
          bg: '',
          logo: safeGet(logos, m.symbol) || null,
          change: m.change,
        });
      });
    }

    // 2. Add / override with owned wallet asset movers
    assetList.forEach(a => {
      if (a.change !== undefined) {
        const existing = itemsMap.get(a.symbol);
        itemsMap.set(a.symbol, {
          id: a.id,
          symbol: a.symbol,
          name: a.name,
          balance: a.balance,
          usdValue: a.usdValue,
          price: a.price,
          color: a.color,
          bg: a.bg,
          logo: a.logo || existing?.logo || null,
          change: a.change,
        });
      }
    });

    // 3. Sort by absolute highest 24h change (biggest positive gainers and biggest negative losers)
    return Array.from(itemsMap.values())
      .filter(item => item.change !== undefined)
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 8);
  }, [marketItems, assetList]);

  // Market summary for bottom bar
  const marketSummary = [
    { symbol: 'BTC', price: btcPrice, color: 'text-orange-500' },
    { symbol: 'ETH', price: ethPrice, color: 'text-indigo-500' },
    { symbol: 'TON', price: tonPrice, color: 'text-blue-500' },
    { symbol: 'SOL', price: solPrice, color: 'text-purple-500' },
    { symbol: 'RZC', price: rzcPrice, color: 'text-emerald-500' },
  ].filter(m => m.price > 0);

  const TABS: { key: Tab; label: string }[] = [
    { key: 'top', label: 'Top' },
    { key: 'core', label: 'Core' },
    { key: 'chains', label: 'Chains' },
    { key: 'all', label: 'All' },
    { key: 'nfts', label: 'NFTs' },
  ];

  // ── Smooth Auto-Scroll & Manual Drag / Wheel Interaction for Trending strip ──
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isHoveredRef = useRef(false);
  const isDraggingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftStartRef = useRef(0);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || trendingItems.length === 0) return;

    let animationFrameId: number;
    let lastTime = performance.now();
    const speed = 40; // Pixels per second

    // Set initial scroll position to the second (middle) set of items to allow infinite seamless left/right scrolling
    const initScroll = () => {
      if (container.scrollWidth > 0) {
        container.scrollLeft = container.scrollWidth / 3;
      } else {
        setTimeout(initScroll, 50);
      }
    };
    initScroll();

    const step = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      if (container) {
        const oneThird = container.scrollWidth / 3;
        if (oneThird > 0) {
          // Seamless infinite wrap-around checks (runs every frame to support drag/touch/wheel)
          if (container.scrollLeft >= oneThird * 2) {
            container.scrollLeft -= oneThird;
          } else if (container.scrollLeft <= oneThird) {
            container.scrollLeft += oneThird;
          }
        }

        // Auto-scroll only if not hovered/dragged
        if (!isHoveredRef.current && !isDraggingRef.current) {
          container.scrollLeft += speed * delta;
        }
      }

      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [trendingItems]);

  // Translate vertical mouse wheel to horizontal scroll inside trending strip
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || trendingItems.length === 0) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        container.style.scrollBehavior = 'auto'; // Disable browser default transitions for instant responsive scrolling
        container.scrollLeft += e.deltaY * 0.8;
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [trendingItems]);

  // Desktop Drag-to-Scroll support
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    isDraggingRef.current = true;
    dragMovedRef.current = false;
    startXRef.current = e.pageX - scrollContainerRef.current.offsetLeft;
    scrollLeftStartRef.current = scrollContainerRef.current.scrollLeft;
    scrollContainerRef.current.style.scrollBehavior = 'auto';
    scrollContainerRef.current.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    if (Math.abs(walk) > 5) {
      dragMovedRef.current = true;
    }
    scrollContainerRef.current.scrollLeft = scrollLeftStartRef.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = 'grab';
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-3 duration-400 space-y-3">

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. HERO BALANCE CARD                                               */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a1a10] via-[#071510] to-[#060e0a] border border-white/[0.07] shadow-2xl shadow-black/40 p-5">
        {/* Ambient glow orbs */}
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-primary/15 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500/8 rounded-full blur-[60px] pointer-events-none" />
        {/* Subtle dot grid */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)', backgroundSize: '20px 20px' }} />

        {/* Top row — Network badge + controls */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary/90">
              {network === 'mainnet' ? 'Mainnet' : 'Testnet'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-lg hover:bg-white/[0.08] transition-colors"
            >
              <RefreshCw size={13} className={`text-white/40 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onToggleView}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.06] transition-all active:scale-95"
              title="Switch to Portfolio View"
            >
              <LayoutGrid size={11} className="text-white/50" />
              <span className="text-[10px] font-semibold text-white/50 leading-none">Portfolio</span>
            </button>
          </div>
        </div>

        {/* Balance block */}
        <div className="relative z-10">

          {/* Currency selector strip */}
          <div className="flex items-center gap-1 mb-3">
            {CURRENCIES.map(c => (
              <button
                key={c}
                onClick={() => {
                  setBaseCurrency(c);
                  setCurrencyFlip(true);
                  setTimeout(() => setCurrencyFlip(false), 300);
                  try { localStorage.setItem('walletBaseCurrency', c); } catch { /* ignore */ }
                }}
                className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all ${
                  baseCurrency === c
                    ? 'bg-primary text-black shadow-sm shadow-primary/40'
                    : 'text-white/30 hover:text-white/60'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Tappable balance — cycles currency on click */}
          <button
            onClick={cycleCurrency}
            className="flex items-end gap-2.5 mb-3 group active:scale-[0.98] transition-transform text-left w-full"
            title={`Tap to switch currency (${baseCurrency})`}
          >
            <div className={`transition-all duration-300 ${currencyFlip ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'}`}>
              {balanceVisible ? (
                <span className="text-[42px] sm:text-5xl font-black text-white leading-none tracking-tight font-numbers">
                  {convertedBalance.symbol}{fmtConverted(convertedBalance.value, convertedBalance.decimals)}
                </span>
              ) : (
                <span className="text-[42px] font-black text-white/30 leading-none tracking-tight select-none">
                  ••••••••
                </span>
              )}
            </div>
            {/* Cycle icon hint */}
            <div className="mb-2 opacity-0 group-hover:opacity-40 transition-opacity flex-shrink-0">
              <RefreshCw size={13} className="text-white" />
            </div>
          </button>

          {/* Bottom row: hide/show + 24h change */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* 24h change pill — always in USD */}
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
              isPositive
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                : 'bg-red-500/15 text-red-400 border border-red-500/20'
            }`}>
              {isPositive ? (
                <TrendingUp size={11} strokeWidth={2.5} />
              ) : (
                <TrendingDown size={11} strokeWidth={2.5} />
              )}
              <span className="font-numbers">
                {isPositive ? '+' : ''}${fmt(Math.abs(change24h))} ({isPositive ? '+' : ''}{changePercent24h.toFixed(2)}%)
              </span>
              <span className="text-[9px] font-normal opacity-60 ml-0.5">24h</span>
            </div>

            {/* Spacer + hide toggle */}
            <button
              onClick={() => setBalanceVisible(!balanceVisible)}
              className="ml-auto p-1.5 rounded-lg hover:bg-white/[0.08] transition-colors flex-shrink-0 flex items-center gap-1.5"
            >
              {balanceVisible ? (
                <EyeOff size={14} className="text-white/40" />
              ) : (
                <Eye size={14} className="text-white/40" />
              )}
              <span className="text-[10px] text-white/30">{balanceVisible ? 'Hide' : 'Show'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. QUICK ACTIONS                                                   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2 px-0.5">
        {[
          { icon: Download, label: 'Deposit', primary: true, path: '/wallet/receive' },
          { icon: Send, label: 'Send', primary: false, path: '/wallet/transfer' },
          { icon: ArrowLeftRight, label: 'Swap', primary: false, path: '/wallet/simulator' },
          { icon: Zap, label: 'Store', primary: false, path: '/wallet/store' },
        ].map(({ icon: Icon, label, primary, path }) => (
          <button
            key={label}
            onClick={() => navigate(path)}
            className="flex flex-col items-center gap-2 group"
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-90 shadow-sm ${
              primary
                ? 'bg-primary text-black shadow-primary/25 shadow-lg'
                : 'bg-slate-100 dark:bg-white/[0.07] border border-slate-200 dark:border-white/[0.07] text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-white/[0.12]'
            }`}>
              <Icon size={22} strokeWidth={primary ? 2.5 : 2} />
            </div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-gray-400 group-active:text-primary transition-colors">
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* Testnet Warning Prompt */}
      {network === 'testnet' && (
        <div className="relative group p-4 bg-red-500/10 border border-red-500/20 rounded-2xl shadow-sm transition-all animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 dark:bg-red-500 flex items-center justify-center flex-shrink-0 shadow-md">
              <AlertCircle size={20} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-red-950 dark:text-red-300 leading-tight">
                You are currently on Testnet
              </h3>
              <p className="text-xs text-red-900/80 dark:text-red-400/90 leading-snug mt-1 font-medium">
                RhizaCore wallet features are optimized for Mainnet. We recommend switching to Mainnet for live wallet transactions.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => { switchNetwork('mainnet'); }}
                  className="px-3 py-1.5 bg-red-600 dark:bg-[#00FF88] text-white dark:text-black rounded-lg text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-md"
                >
                  Switch to Mainnet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3. ANNOUNCEMENT TICKER                                             */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {announcements.length > 0 && currentAnnouncement && (
        <div
          className="overflow-hidden rounded-xl bg-white dark:bg-[#111] border border-slate-200 dark:border-white/[0.08] cursor-pointer active:scale-[0.99] transition-all shadow-sm"
          onClick={currentAnnouncement.onClick}
        >
          <div className="flex items-stretch min-h-[44px]">
            {/* Colored left accent */}
            <div className={`flex-shrink-0 w-1 bg-gradient-to-b ${themeColor(currentAnnouncement.theme, 'bg')}`} />

            <div className="flex-1 flex items-center gap-3 py-2 px-3 overflow-hidden min-w-0">
              <span className={`flex-shrink-0 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${themeColor(currentAnnouncement.theme, 'badge' as any)}`}>
                {currentAnnouncement.badge}
              </span>
              <span className="flex-1 text-[11px] font-medium text-slate-700 dark:text-zinc-300 truncate">
                {currentAnnouncement.message.replace(/[\u2705\u26a0\ufe0f\u23f3\u274c\ud83d\udd12\ud83d\ude80]/g, '').trim()}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0">
                {announcements.map((_, i) => (
                  <button
                    key={i}
                    onClick={e => { e.stopPropagation(); setAnnouncementIdx(i); }}
                    className={`rounded-full transition-all duration-300 ${
                      i === announcementIdx
                        ? `w-3 h-1.5 ${themeColor(currentAnnouncement.theme, 'dot')}`
                        : 'w-1.5 h-1.5 bg-slate-200 dark:bg-white/10'
                    }`}
                  />
                ))}
                {currentAnnouncement.ping && (
                  <span className="relative flex h-1.5 w-1.5 ml-1">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${themeColor(currentAnnouncement.theme, 'ping' as any)}`} />
                    <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${themeColor(currentAnnouncement.theme, 'dot')}`} />
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 4. ASSET LIST + TABS                                               */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#0d0d0d] border border-slate-200 dark:border-white/[0.07] rounded-2xl overflow-hidden shadow-sm">
        {/* Section header */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-1">
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-gray-500">My Assets</span>
          <button
            onClick={() => navigate('/wallet/market')}
            className="text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Market →
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex px-4 gap-1 border-b border-slate-100 dark:border-white/[0.05] mt-1">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-2.5 pt-1.5 px-2 text-[12px] font-semibold transition-all relative ${
                activeTab === tab.key
                  ? 'text-primary'
                  : 'text-slate-400 dark:text-gray-600 hover:text-slate-600 dark:hover:text-gray-400'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Asset list */}
        <div className="px-2 divide-y divide-slate-50 dark:divide-white/[0.04]">
          {activeTab === 'nfts' ? (
            <div className="py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-500/10 dark:to-blue-500/10 flex items-center justify-center mx-auto mb-3 border border-purple-200/50 dark:border-purple-500/20">
                <Layers size={24} className="text-purple-500" />
              </div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white mb-1">Digital Collectibles</h3>
              <p className="text-[11px] text-slate-400 dark:text-gray-500 max-w-[180px] mx-auto">Your NFTs will appear here across all supported networks.</p>
              <span className="inline-block mt-3 text-[9px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-500/20 px-3 py-1 rounded-full border border-purple-200 dark:border-purple-500/30">Coming Soon</span>
            </div>
          ) : tabAssets.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-[12px] text-slate-400 dark:text-gray-600">No assets in this category</p>
            </div>
          ) : (
            tabAssets.map(asset => {
              const hasPending = pendingTransactions?.some(pt => pt.symbol.toLowerCase() === asset.symbol.toLowerCase());
              return (
                <button
                  key={asset.id}
                  onClick={() =>
                    navigate('/wallet/asset-detail', {
                      state: {
                        symbol: asset.symbol,
                        name: asset.name,
                        balance: asset.balance.toString(),
                        decimals: 0,
                        price: asset.price,
                        // USDT is a Jetton on TON — pass master contract so AssetDetail wires send correctly
                        type: asset.id === 'rzc' ? 'RZC'
                          : asset.id === 'usdt' ? 'JETTON'
                          : asset.id === 'tron' ? 'TRON'
                          : asset.id === 'sol' ? 'SOL'
                          : asset.id === 'btc' ? 'BTC'
                          : asset.id === 'bnb' ? 'BNB'
                          : asset.id === 'eth' ? 'ETH'
                          : asset.id === 'evm' ? 'EVM'
                          : 'TON',
                        address: asset.id === 'usdt'
                          ? 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs'
                          : undefined,
                        image: asset.logo ?? undefined,
                        verified: ['ton', 'usdt', 'bnb', 'eth'].includes(asset.id),
                      },
                    })
                  }
                  className="w-full flex items-center gap-3 py-3 px-2 hover:bg-slate-50 dark:hover:bg-white/[0.03] rounded-xl transition-all active:scale-[0.99] text-left relative"
                >
                  {/* Logo with pending indicator */}
                  <div className="relative flex-shrink-0">
                    <TokenLogo asset={asset} size={42} />
                    {hasPending && (
                      <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-500 border-2 border-white dark:border-[#0d0d0d] rounded-full shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
                    )}
                  </div>

                  {/* Name + balance */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-slate-900 dark:text-white leading-tight">
                      {asset.name}
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-gray-500 mt-0.5">
                      {fmtSmall(asset.balance)} {asset.symbol}
                    </div>
                  </div>

                  {/* USD value + change — right-aligned */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-[13px] font-bold font-numbers text-slate-900 dark:text-white tabular-nums leading-tight">
                      {balanceVisible ? `$${fmtSmall(asset.usdValue)}` : '••••'}
                    </div>
                    <div className="mt-0.5">
                      {asset.change !== undefined ? (
                        <ChangeChip value={asset.change} compact />
                      ) : (
                        <span className="text-[10px] text-slate-300 dark:text-gray-700">—</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* View all footer */}
        {assetList.length > 5 && activeTab !== 'nfts' && (
          <div className="border-t border-slate-100 dark:border-white/[0.05]">
            <button
              onClick={() => navigate('/wallet/market')}
              className="w-full flex items-center justify-center gap-1.5 py-3.5 text-[11px] font-bold text-primary hover:text-primary/80 transition-colors"
            >
              View All in Market <ChevronRight size={12} />
            </button>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 5. TRENDING MOVERS                                                 */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {trendingItems.length > 0 && (
        <div className="bg-white dark:bg-[#0d0d0d] border border-slate-200 dark:border-white/[0.07] rounded-2xl overflow-hidden shadow-sm py-3">
          <div className="flex items-center justify-between px-4 mb-2.5">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-gray-500">Trending</span>
            <span className="text-[9px] font-bold text-slate-300 dark:text-gray-700 uppercase tracking-widest">24h movers</span>
          </div>
          <div
            ref={scrollContainerRef}
            onMouseEnter={() => { isHoveredRef.current = true; }}
            onMouseLeave={() => { isHoveredRef.current = false; handleMouseUpOrLeave(); }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            className="flex gap-2 overflow-x-auto pb-0.5 px-4 scrollbar-none select-none"
            style={{ cursor: 'grab', WebkitOverflowScrolling: 'touch' }}
          >
            {[...trendingItems, ...trendingItems, ...trendingItems].map((asset, index) => (
              <button
                key={`${asset.id}-${index}`}
                onClick={() => {
                  if (dragMovedRef.current) return;
                  const mCoin = marketItems?.find(m => m.symbol === asset.symbol);
                  if (mCoin) {
                    navigate(`/wallet/coin/${mCoin.symbol}`);
                  } else {
                    navigate('/wallet/asset-detail', {
                      state: {
                        symbol: asset.symbol,
                        name: asset.name,
                        balance: asset.balance.toString(),
                        decimals: 0,
                        price: asset.price,
                        type: asset.id === 'rzc' ? 'RZC' : asset.id === 'usdt' ? 'JETTON' : asset.id === 'tron' ? 'TRON' : asset.id === 'sol' ? 'SOL' : asset.id === 'btc' ? 'BTC' : asset.id === 'bnb' ? 'BNB' : asset.id === 'eth' ? 'ETH' : asset.id === 'evm' ? 'EVM' : 'TON',
                        image: asset.logo ?? undefined,
                        verified: ['ton', 'usdt', 'bnb', 'eth'].includes(asset.id),
                      }
                    });
                  }
                }}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.07] hover:bg-slate-200 dark:hover:bg-white/[0.10] transition-colors active:scale-95"
              >
                <TokenLogo asset={asset} size={18} />
                <span className="text-[11px] font-bold text-slate-800 dark:text-white">{asset.symbol}</span>
                {asset.change !== undefined && <ChangeChip value={asset.change} compact />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 6. LIVE MARKETS                                                    */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {marketItems && marketItems.length > 0 ? (
        <div className="bg-white dark:bg-[#0d0d0d] border border-slate-200 dark:border-white/[0.07] rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-white/[0.05]">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-gray-500">
              Live Markets
            </span>
            <button
              onClick={() => navigate('/wallet/market')}
              className="text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              See All →
            </button>
          </div>

          <div className="divide-y divide-slate-50 dark:divide-white/[0.04] px-1">
            {marketItems.map(m => {
              const mPositive = m.change >= 0;
              return (
                <button
                  key={m.symbol}
                  onClick={() => navigate(`/wallet/coin/${m.symbol}`)}
                  className="w-full flex items-center justify-between gap-3 py-3 px-3 hover:bg-slate-50 dark:hover:bg-white/[0.02] rounded-xl transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <MarketTokenLogo symbol={m.symbol} size={38} />
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight">{m.symbol}</span>
                      <span className="text-[10px] text-slate-400 dark:text-gray-500 mt-0.5">{m.name}</span>
                    </div>
                  </div>

                  <div className="hidden min-[360px]:block flex-1 max-w-[60px] mx-auto">
                    <Sparkline change={m.change} seed={m.sparklineSeed} />
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <span className="text-[13px] font-bold font-numbers text-slate-900 dark:text-white tabular-nums leading-tight">
                      ${fmtSmall(m.price)}
                    </span>
                    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold mt-0.5 px-1.5 py-0.5 rounded-md ${
                      mPositive
                        ? 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10'
                        : 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10'
                    }`}>
                      {mPositive ? '+' : ''}{m.change.toFixed(2)}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : marketSummary.length > 0 && (
        <div className="bg-white dark:bg-[#0d0d0d] border border-slate-200 dark:border-white/[0.07] rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-white/[0.05]">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-gray-500">Markets</span>
            <button onClick={() => navigate('/wallet/market')} className="text-[11px] font-semibold text-primary">All prices →</button>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-white/[0.04]">
            {marketSummary.map(m => (
              <button
                key={m.symbol}
                onClick={() => navigate(`/wallet/coin/${m.symbol}`)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors text-left"
              >
                <span className={`text-[13px] font-bold ${m.color}`}>{m.symbol}</span>
                <span className="text-[13px] font-bold font-numbers text-slate-800 dark:text-white tabular-nums">
                  ${fmtSmall(m.price)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 7. RECENT ACTIVITY                                                 */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <History size={13} className="text-slate-400 dark:text-slate-500" />
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">Recent Activity</span>
          </div>
          <button
            onClick={() => navigate('/wallet/history')}
            className="text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            View All <ArrowRight size={10} />
          </button>
        </div>

        {txLoading ? (
          <div className="space-y-2.5">
            <LoadingSkeleton height={70} />
            <LoadingSkeleton height={70} />
          </div>
        ) : txError ? (
          <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
              <div>
                <p className="font-bold text-sm text-red-900 dark:text-red-300 mb-2">Failed to load transactions</p>
                <button
                  onClick={() => refreshTransactions()}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase hover:bg-red-700 transition-all active:scale-95"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        ) : transactions.length === 0 && rzcTransactions.length === 0 ? (
          <div className="p-6 bg-white dark:bg-[#0d0d0d] border border-slate-200 dark:border-white/[0.07] rounded-2xl text-center shadow-sm">
            <History size={24} className="mx-auto mb-2 text-slate-300 dark:text-gray-700" />
            <p className="font-bold text-sm text-slate-900 dark:text-white mb-1">No transactions yet</p>
            <p className="text-[11px] text-slate-400 dark:text-gray-500 mb-3">Your activity will appear here.</p>
            <button
              onClick={() => navigate('/wallet/transfer')}
              className="px-5 py-2 bg-primary text-black rounded-xl text-[10px] font-black uppercase hover:scale-105 transition-all active:scale-95 shadow-sm shadow-primary/30"
            >
              Make First Transaction
            </button>
          </div>
        ) : (() => {
          const typeLabel: Record<string, string> = {
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
          const nonRzc = transactions.filter(tx => tx.asset !== 'RZC');
          const merged = [...nonRzc, ...rzcMapped].sort((a, b) => b.timestamp - a.timestamp);
          return (
            <div className="space-y-2">
              {merged.slice(0, 5).map(tx => (
                <TransactionItem
                  key={tx.id}
                  transaction={tx}
                  onClick={() => navigate('/wallet/history')}
                />
              ))}
            </div>
          );
        })()}
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 8. BLOG / FLASH NEWS                                               */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <FlashNews />

    </div>
  );
};

export default WalletView;
