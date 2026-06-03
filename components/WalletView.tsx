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
  X,
  Info,
  Globe,
  Activity,
  Award,
} from 'lucide-react';

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
  rzcPrice: number;
  priceItems: PriceItem[];
  marketItems?: MarketItem[];
  isRefreshing: boolean;
  onRefresh: () => void;
  onToggleView: () => void;
  network: string;
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
      className={`inline-flex items-center gap-0.5 text-[10px] font-bold font-numbers ${
        positive ? 'text-emerald-500' : 'text-red-500'
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
      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-sm ${
        primary
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

const AssetRow: React.FC<{ asset: AssetItem; onClick: () => void }> = ({ asset, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 py-2.5 px-1 hover:bg-slate-50 dark:hover:bg-white/[0.03] rounded-xl transition-colors active:scale-[0.99] text-left"
  >
    <TokenLogo asset={asset} size={40} />

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

type Tab = 'top' | 'core' | 'chains' | 'all';

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
  rzcPrice,
  priceItems,
  marketItems,
  isRefreshing,
  onRefresh,
  onToggleView,
  network,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('top');
  const [selectedCoin, setSelectedCoin] = useState<MarketItem | null>(null);
  const isPositive = change24h >= 0;

  // ── Tab filtering ──────────────────────────────────────────────────────────
  const tabAssets = {
    top: [...assetList].sort((a, b) => b.usdValue - a.usdValue).slice(0, 10),
    core: assetList.filter(a => a.isCore),
    chains: assetList.filter(a => !a.isCore),
    all: assetList,
  }[activeTab];

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
    { symbol: 'RZC', price: rzcPrice, color: 'text-emerald-500' },
  ].filter(m => m.price > 0);

  const TABS: { key: Tab; label: string }[] = [
    { key: 'top', label: 'Top' },
    { key: 'core', label: 'Core' },
    { key: 'chains', label: 'Chains' },
    { key: 'all', label: 'All' },
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

      {/* ── 1. Hero Balance Card ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-[#050f08] dark:via-[#071510] dark:to-[#050f08] border border-white/[0.08] shadow-xl shadow-black/20 p-4">
        {/* Glow orb */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top row */}
        <div className="flex items-center justify-between mb-3 relative z-10">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary/80">
              {network === 'mainnet' ? 'Mainnet' : 'Testnet'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {/* Refresh */}
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <RefreshCw size={13} className={`text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            {/* Switch to portfolio view */}
            <button
              onClick={onToggleView}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/15 transition-colors"
              title="Switch to Portfolio View"
            >
              <LayoutGrid size={12} className="text-gray-400" />
              <span className="text-[10px] font-semibold text-gray-400 leading-none">Portfolio</span>
            </button>
          </div>
        </div>

        {/* Balance */}
        <div className="relative z-10 mb-0.5">
          <p className="text-[11px] font-semibold text-gray-400 mb-1">Your balance</p>
          <div className="flex items-end gap-2">
            {balanceVisible ? (
              <span className="text-4xl sm:text-5xl font-black text-white font-numbers leading-none tracking-tight">
                ${fmt(combinedPortfolioValue)}
              </span>
            ) : (
              <span className="text-4xl font-black text-white leading-none tracking-tight">
                ••••••
              </span>
            )}
            <button
              onClick={() => setBalanceVisible(!balanceVisible)}
              className="mb-1 p-1 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
            >
              {balanceVisible ? (
                <Eye size={16} className="text-gray-400" />
              ) : (
                <EyeOff size={16} className="text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* 24h change */}
        <div className="relative z-10 flex items-center gap-1.5 mt-1">
          {isPositive ? (
            <TrendingUp size={12} className="text-emerald-400" strokeWidth={3} />
          ) : (
            <TrendingDown size={12} className="text-red-400" strokeWidth={3} />
          )}
          <span className={`text-[12px] font-bold font-numbers ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{fmt(change24h)} ({isPositive ? '+' : ''}{changePercent24h.toFixed(2)}%)
          </span>
          <span className="text-[10px] text-gray-600">24h</span>
        </div>
      </div>

      {/* ── 2. Quick Actions ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 px-1">
        <QuickAction
          icon={Download}
          label="Deposit"
          primary
          onClick={() => navigate('/wallet/receive')}
        />
        <QuickAction
          icon={Send}
          label="Send"
          onClick={() => navigate('/wallet/transfer')}
        />
        <QuickAction
          icon={ArrowLeftRight}
          label="Swap"
          onClick={() => navigate('/wallet/simulator')}
        />
        <QuickAction
          icon={Zap}
          label="Store"
          onClick={() => navigate('/wallet/store')}
        />
      </div>

      {/* ── 3. Trending Strip ────────────────────────────────────────────── */}
      {trendingItems.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-600 mb-2 px-1">
            Trending
          </p>
          <div
            ref={scrollContainerRef}
            onMouseEnter={() => { isHoveredRef.current = true; }}
            onMouseLeave={() => { isHoveredRef.current = false; handleMouseUpOrLeave(); }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            className="flex gap-2 overflow-x-auto pb-1 scrollbar-none select-none"
            style={{ cursor: 'grab', WebkitOverflowScrolling: 'touch' }}
          >
            {[...trendingItems, ...trendingItems, ...trendingItems].map((asset, index) => (
              <button
                key={`${asset.id}-${index}`}
                onClick={() => {
                  if (dragMovedRef.current) return;
                  const mCoin = marketItems?.find(m => m.symbol === asset.symbol);
                  if (mCoin) {
                    setSelectedCoin(mCoin);
                  } else {
                    navigate('/wallet/asset-detail', {
                      state: {
                        symbol: asset.symbol,
                        name: asset.name,
                        balance: asset.balance.toString(),
                        decimals: 0,
                        price: asset.price,
                        type: asset.id === 'rzc' ? 'RZC' : asset.id === 'usdt' ? 'EVM' : asset.id === 'tron' ? 'TRON' : 'TON',
                        image: asset.logo ?? undefined,
                        verified: ['ton', 'usdt'].includes(asset.id),
                      }
                    });
                  }
                }}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] hover:bg-slate-200 dark:hover:bg-white/10 transition-colors active:scale-95 pointer-events-auto"
              >
                <TokenLogo asset={asset} size={18} />
                <span className="text-[11px] font-bold text-slate-800 dark:text-white">{asset.symbol}</span>
                {asset.change !== undefined && <ChangeChip value={asset.change} compact />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 4. Asset List with Tabs ──────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/[0.07] rounded-2xl overflow-hidden shadow-sm">
        {/* Tab bar */}
        <div className="flex border-b border-slate-100 dark:border-white/[0.06]">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 text-[12px] font-semibold transition-colors relative ${
                activeTab === tab.key
                  ? 'text-primary'
                  : 'text-slate-400 dark:text-gray-600 hover:text-slate-600 dark:hover:text-gray-400'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Asset list */}
        <div className="px-3 divide-y divide-slate-50 dark:divide-white/[0.04]">
          {tabAssets.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-[12px] text-slate-400 dark:text-gray-600">No assets in this category</p>
            </div>
          ) : (
            tabAssets.map(asset => (
              <AssetRow
                key={asset.id}
                asset={asset}
                onClick={() =>
                  navigate('/wallet/asset-detail', {
                    state: {
                      symbol: asset.symbol,
                      name: asset.name,
                      balance: asset.balance.toString(),
                      decimals: 0,
                      price: asset.price,
                      type: asset.id === 'rzc' ? 'RZC' : asset.id === 'usdt' ? 'EVM' : asset.id === 'tron' ? 'TRON' : 'TON',
                      image: asset.logo ?? undefined,
                      verified: ['ton', 'usdt'].includes(asset.id),
                    },
                  })
                }
              />
            ))
          )}
        </div>

        {/* View all link */}
        {assetList.length > 5 && (
          <div className="border-t border-slate-100 dark:border-white/[0.06]">
            <button
              onClick={() => navigate('/wallet/market')}
              className="w-full flex items-center justify-center gap-1.5 py-3 text-[12px] font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              View Market Analysis <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>

      {/* ── 5. Market Overview ───────────────────────────────────────────── */}
      {marketItems && marketItems.length > 0 ? (
        <div className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/[0.07] rounded-2xl overflow-hidden shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/[0.06]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
              Live Crypto Markets
            </span>
            <button
              onClick={() => navigate('/wallet/market')}
              className="text-[11px] font-bold text-primary hover:underline transition-all"
            >
              See All
            </button>
          </div>

          {/* List */}
          <div className="divide-y divide-slate-50 dark:divide-white/[0.04] px-1">
            {marketItems.map(m => {
              const isPositive = m.change >= 0;
              return (
                <button
                  key={m.symbol}
                  onClick={() => setSelectedCoin(m)}
                  className="w-full flex items-center justify-between gap-3 py-2.5 px-3 hover:bg-slate-50 dark:hover:bg-white/[0.02] rounded-xl transition-colors text-left"
                >
                  {/* Left Side: Logo + Name */}
                  <div className="flex items-center gap-3">
                    <MarketTokenLogo symbol={m.symbol} size={36} />
                    <div className="flex flex-col">
                      <span className="text-[13px] font-extrabold text-slate-900 dark:text-white leading-tight">
                        {m.symbol}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-gray-500 mt-0.5">
                        {m.name}
                      </span>
                    </div>
                  </div>

                  {/* Center: Sparkline (hidden on very small screens) */}
                  <div className="hidden min-[360px]:block flex-1 max-w-[60px] mx-auto">
                    <Sparkline change={m.change} seed={m.sparklineSeed} />
                  </div>

                  {/* Right Side: Price + % Change */}
                  <div className="text-right flex flex-col items-end">
                    <span className="text-[13px] font-bold font-numbers text-slate-900 dark:text-white leading-tight tabular-nums">
                      ${fmtSmall(m.price)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-0.5 text-[10px] font-extrabold mt-0.5 px-1.5 py-0.5 rounded-md ${
                        isPositive
                          ? 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10'
                          : 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10'
                      }`}
                    >
                      {isPositive ? '+' : ''}
                      {m.change.toFixed(2)}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        marketSummary.length > 0 && (
          <div className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/[0.07] rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-white/[0.06]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-600">
                Market
              </span>
              <button
                onClick={() => navigate('/wallet/market')}
                className="text-[11px] font-semibold text-primary"
              >
                All prices
              </button>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-white/[0.04]">
              {marketSummary.map(m => (
                <div key={m.symbol} className="flex items-center justify-between px-4 py-2.5">
                  <span className={`text-[13px] font-bold ${m.color}`}>{m.symbol}</span>
                  <span className="text-[13px] font-bold font-numbers text-slate-800 dark:text-white tabular-nums">
                    ${fmtSmall(m.price)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* ── Coin Profile Modal (CoinMarketCap style) ─────────────────────── */}
      {selectedCoin && (() => {
        // Resolve live price updates in real-time from active marketItems list
        const liveCoin = marketItems?.find(m => m.symbol === selectedCoin.symbol) || selectedCoin;
        
        const profile = safeGet(COIN_PROFILES, liveCoin.symbol) || {
          rank: 99,
          marketCap: '--',
          volume24h: '--',
          circulatingSupply: `-- ${liveCoin.symbol}`,
          ath: '--',
          description: 'No description available for this coin profile.'
        };
        const isPositive = liveCoin.change >= 0;
        
        return (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 animate-in fade-in duration-200">
            {/* Backdrop overlay */}
            <div 
              onClick={() => setSelectedCoin(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
            />

            {/* Modal Box */}
            <div className="relative w-full sm:max-w-md bg-white dark:bg-[#0a0a0a] border-t sm:border border-slate-200 dark:border-white/[0.08] rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] sm:max-h-[90vh] flex flex-col z-10 animate-in slide-in-from-bottom duration-300 ease-out">
              {/* Decorative top handle for mobile */}
              <div className="flex sm:hidden justify-center py-2.5">
                <div className="w-10 h-1 bg-slate-200 dark:bg-zinc-800 rounded-full" />
              </div>

              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-white/[0.05]">
                <div className="flex items-center gap-3">
                  <MarketTokenLogo symbol={liveCoin.symbol} size={36} />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-black text-slate-900 dark:text-white leading-tight">
                        {liveCoin.name}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500 bg-slate-100 dark:bg-white/[0.05] px-1.5 py-0.5 rounded">
                        {liveCoin.symbol}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Award size={10} className="text-amber-500" />
                      <span className="text-[10px] font-bold text-amber-500">
                        Rank #{profile.rank}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCoin(null)}
                  className="p-1.5 bg-slate-100 dark:bg-white/5 border border-slate-200/55 dark:border-white/10 rounded-full text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="px-5 py-4 overflow-y-auto space-y-4 scrollbar-none flex-1">
                {/* Price Display */}
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                    Live Price
                  </span>
                  <div className="flex items-baseline gap-2.5 mt-0.5">
                    <span className="text-3xl font-black font-numbers text-slate-900 dark:text-white tracking-tight tabular-nums">
                      ${fmtSmall(liveCoin.price)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-0.5 text-xs font-black px-2 py-0.5 rounded-full ${
                        isPositive
                          ? 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10'
                          : 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10'
                      }`}
                    >
                      {isPositive ? '+' : ''}
                      {liveCoin.change.toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Live Area Chart */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                    <span>24h Performance</span>
                    <span className={isPositive ? 'text-emerald-500' : 'text-red-500'}>
                      {isPositive ? 'Bullish ↑' : 'Bearish ↓'}
                    </span>
                  </div>
                  <LargeSparkline change={liveCoin.change} seed={liveCoin.sparklineSeed} isPositive={isPositive} />
                </div>

                {/* Coin Description */}
                <div className="space-y-1 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04] p-3.5 rounded-xl">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                    <Info size={11} />
                    <span>Description</span>
                  </div>
                  <p className="text-[12px] font-medium text-slate-600 dark:text-gray-400 leading-relaxed pt-1">
                    {profile.description}
                  </p>
                </div>

                {/* Market Cap & Supply Stats Grid */}
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500 block mb-2">
                    CoinMarketCap Statistics
                  </span>
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Market Cap */}
                    <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04] p-3 rounded-xl flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                        Market Cap
                      </span>
                      <span className="text-[13px] font-black text-slate-900 dark:text-white mt-1 tabular-nums">
                        {profile.marketCap}
                      </span>
                    </div>

                    {/* 24h Volume */}
                    <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04] p-3 rounded-xl flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                        24h Volume
                      </span>
                      <span className="text-[13px] font-black text-slate-900 dark:text-white mt-1 tabular-nums">
                        {profile.volume24h}
                      </span>
                    </div>

                    {/* Circulating Supply */}
                    <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04] p-3 rounded-xl flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                        Circulating Supply
                      </span>
                      <span className="text-[13px] font-black text-slate-900 dark:text-white mt-1 tabular-nums">
                        {profile.circulatingSupply}
                      </span>
                    </div>

                    {/* All-Time High */}
                    <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04] p-3 rounded-xl flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                        All-Time High (ATH)
                      </span>
                      <span className="text-[13px] font-black text-slate-900 dark:text-white mt-1 tabular-nums">
                        {profile.ath}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Action Buttons Footer */}
              <div className="p-4 border-t border-slate-100 dark:border-white/[0.05] bg-slate-50 dark:bg-white/[0.02] flex gap-2">
                <button
                  onClick={() => {
                    setSelectedCoin(null);
                    // Look up asset details from user owned balance
                    const owned = assetList.find(a => a.symbol === liveCoin.symbol);
                    navigate('/wallet/receive', {
                      state: {
                        preselect: liveCoin.symbol === 'BTC' ? 'multichain-btc'
                          : liveCoin.symbol === 'SOL' ? 'multichain-sol'
                          : liveCoin.symbol === 'ETH' ? 'multichain-evm'
                          : liveCoin.symbol === 'RZC' ? 'primary-rzc'
                          : liveCoin.symbol === 'TON' ? 'multichain-ton'
                          : 'primary'
                      }
                    });
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl text-[13px] font-black text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-white/5 active:scale-[0.98] transition-all shadow-sm"
                >
                  <Download size={14} />
                  Deposit {liveCoin.symbol}
                </button>
                <button
                  onClick={() => {
                    setSelectedCoin(null);
                    navigate('/wallet/simulator');
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-primary text-black rounded-xl text-[13px] font-black hover:bg-primary/95 active:scale-[0.98] transition-all shadow-md shadow-primary/20"
                >
                  <ArrowLeftRight size={14} strokeWidth={2.5} />
                  Trade {liveCoin.symbol}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default WalletView;
