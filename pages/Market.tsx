import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  TrendingUp,
  TrendingDown,
  BarChart2,
  Zap,
  Star,
  Flame,
  ChevronRight,
} from 'lucide-react';
import { useBalance } from '../hooks/useBalance';
import { useWallet } from '../context/WalletContext';
import { getRzcChange24h } from '../services/rzcPriceService';
import {
  fmtSmall,
  MarketTokenLogo,
  COIN_PROFILES,
  Sparkline,
} from '../components/MarketShared';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Asset {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  sparklineSeed: number;
}

type TabOption = 'All' | 'Gainers' | 'Losers';

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

const SkeletonRow: React.FC = () => (
  <div className="w-full flex items-center justify-between gap-3 py-3.5 px-4 bg-white dark:bg-[#1a1b23] border border-slate-100 dark:border-[#2a2b36] rounded-2xl animate-pulse">
    <div className="flex items-center gap-3 w-1/3">
      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/10 flex-shrink-0" />
      <div className="flex flex-col gap-1.5">
        <div className="h-3 w-10 bg-slate-200 dark:bg-white/10 rounded" />
        <div className="h-2.5 w-16 bg-slate-100 dark:bg-white/5 rounded" />
      </div>
    </div>
    <div className="hidden min-[360px]:block flex-1 max-w-[70px] mx-auto">
      <div className="h-6 bg-slate-100 dark:bg-white/5 rounded" />
    </div>
    <div className="flex flex-col items-end gap-1.5 w-1/3">
      <div className="h-3 w-16 bg-slate-200 dark:bg-white/10 rounded" />
      <div className="h-5 w-12 bg-slate-100 dark:bg-white/5 rounded-md" />
    </div>
  </div>
);

// ─── RZC Candy Bomb Hero Card ─────────────────────────────────────────────────

interface RzcCandyBombProps {
  asset: Asset;
  onSelect: (a: Asset) => void;
}

const RzcCandyBomb: React.FC<RzcCandyBombProps> = ({ asset, onSelect }) => {
  const profile = COIN_PROFILES['RZC'];
  const isPositive = asset.change >= 0;

  return (
    <button
      onClick={() => onSelect(asset)}
      className="w-full text-left mb-4 group"
      aria-label="RhizaCore — featured asset"
    >
      {/* ── Outer glow ring — animated emerald halo */}
      <div className="relative rounded-3xl p-[2px] bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 shadow-[0_0_40px_rgba(16,185,129,0.35)] group-hover:shadow-[0_0_56px_rgba(16,185,129,0.50)] transition-shadow duration-500">

        {/* ── Inner card */}
        <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#0a1f14] via-[#0d2b1c] to-[#071810]">

          {/* Animated radial mesh blobs */}
          <div className="absolute -top-12 -left-12 w-52 h-52 rounded-full bg-emerald-500/20 blur-3xl animate-pulse" style={{ animationDuration: '3s' }} />
          <div className="absolute -bottom-10 -right-10 w-44 h-44 rounded-full bg-teal-400/15 blur-3xl animate-pulse" style={{ animationDuration: '4.5s', animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-cyan-500/10 blur-2xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '0.5s' }} />

          {/* Candy shimmer overlay */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.06) 0px, transparent 2px, transparent 14px, rgba(255,255,255,0.04) 16px)',
            }}
          />

          {/* Content */}
          <div className="relative z-10 p-4">

            {/* Top row — badge + live ticker */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-1 bg-emerald-400/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                  <Star size={9} className="fill-emerald-400 text-emerald-400" />
                  Featured
                </span>
                <span className="flex items-center gap-1 bg-white/5 border border-white/10 text-white/50 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full">
                  <Flame size={9} className="text-orange-400" />
                  Native Token
                </span>
              </div>
              <div className="flex items-center gap-1 text-emerald-400/60 group-hover:text-emerald-300 transition-colors">
                <span className="text-[10px] font-bold">Details</span>
                <ChevronRight size={12} />
              </div>
            </div>

            {/* Main content row */}
            <div className="flex items-center gap-3">
              {/* Logo with glow ring */}
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 rounded-full bg-emerald-500/40 blur-md scale-125" />
                <div className="relative ring-2 ring-emerald-400/50 rounded-full">
                  <MarketTokenLogo symbol="RZC" size={52} />
                </div>
              </div>

              {/* Name + price block */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[22px] font-black text-white leading-none tracking-tight">
                    ${fmtSmall(asset.price)}
                  </span>
                  <span
                    className={`flex items-center gap-0.5 text-[12px] font-extrabold px-2 py-0.5 rounded-lg ${
                      isPositive
                        ? 'bg-emerald-400/20 text-emerald-300'
                        : 'bg-red-400/20 text-red-300'
                    }`}
                  >
                    {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {isPositive ? '+' : ''}{asset.change.toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[15px] font-black text-white/80 tracking-wide">RZC</span>
                  <span className="text-[11px] text-emerald-400/60 font-semibold">RhizaCore</span>
                  {profile && (
                    <span className="text-[9px] font-bold text-white/25 bg-white/5 px-1.5 py-0.5 rounded">
                      #{profile.rank}
                    </span>
                  )}
                </div>
              </div>

              {/* Sparkline on right */}
              <div className="flex-shrink-0 w-[70px]">
                <Sparkline change={asset.change} seed={asset.sparklineSeed} />
              </div>
            </div>

            {/* Bottom stat strip */}
            {profile && (
              <div className="mt-3.5 pt-3 border-t border-white/[0.07] grid grid-cols-3 gap-2">
                {[
                  { label: 'Mkt Cap', value: profile.marketCap },
                  { label: 'Volume 24h', value: profile.volume24h },
                  { label: 'Supply', value: profile.circulatingSupply },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-400/50 mb-0.5">{label}</p>
                    <p className="text-[11px] font-black text-white/80 tabular-nums truncate">{value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Pinned label beneath the card */}
      <div className="flex items-center justify-center gap-1.5 mt-1.5">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500/50 flex items-center gap-1">
          <Zap size={8} className="fill-emerald-500/50 text-emerald-500/50" />
          Rhiza Native · Always Pinned
        </span>
        <div className="flex-1 h-px bg-gradient-to-l from-transparent via-emerald-500/30 to-transparent" />
      </div>
    </button>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS: TabOption[] = ['All', 'Gainers', 'Losers'];

const TAB_ICONS: Record<TabOption, React.ReactNode> = {
  All: <BarChart2 size={13} />,
  Gainers: <TrendingUp size={13} />,
  Losers: <TrendingDown size={13} />,
};

const Market: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const balance = useBalance();
  const { multiChainBalances, jettons } = useWallet();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabOption>('All');

  // ── RZC 24h change — same source as Dashboard ─────────────────────────────
  const [rzcChange24h, setRzcChange24h] = useState(0);
  useEffect(() => {
    const fetchRzcChange = async () => {
      const change = await getRzcChange24h();
      setRzcChange24h(change);
    };
    fetchRzcChange();
    const interval = setInterval(fetchRzcChange, 300_000);
    return () => clearInterval(interval);
  }, []);

  // Helper: navigate to full-screen CoinDetail page
  const openCoin = (asset: Asset) => {
    navigate(`/wallet/coin/${asset.symbol.toLowerCase()}`, { state: asset });
  };

  // ── Asset list ──────────────────────────────────────────────────────────────
  const allAssets = useMemo<Asset[]>(() => {
    const list: Asset[] = [
      { id: 'btc',  symbol: 'BTC',  name: 'Bitcoin',    price: balance.btcPrice,          change: balance.assetChanges.btc,        sparklineSeed: 1  },
      { id: 'eth',  symbol: 'ETH',  name: 'Ethereum',   price: balance.ethPrice,          change: balance.assetChanges.eth,        sparklineSeed: 2  },
      { id: 'ton',  symbol: 'TON',  name: 'Toncoin',    price: balance.tonPrice,          change: balance.assetChanges.ton,        sparklineSeed: 3  },
      { id: 'sol',  symbol: 'SOL',  name: 'Solana',     price: balance.solPrice,          change: balance.assetChanges.sol,        sparklineSeed: 4  },
      { id: 'bnb',  symbol: 'BNB',  name: 'BNB',        price: balance.bnbPrice,          change: balance.assetChanges.bnb,        sparklineSeed: 5  },
      { id: 'trx',  symbol: 'TRX',  name: 'TRON',       price: balance.tronPrice,         change: balance.assetChanges.tron,       sparklineSeed: 8  },
      { id: 'usdt', symbol: 'USDT', name: 'Tether USD', price: balance.usdtPrice || 1.0,  change: balance.assetChanges.usdt ?? 0, sparklineSeed: 9  },
      { id: 'rzc',  symbol: 'RZC',  name: 'RhizaCore',  price: balance.rzcPrice,          change: rzcChange24h,                   sparklineSeed: 11 },
    ];

    // Add verified jettons from wallet
    if (jettons && jettons.length > 0) {
      jettons.forEach((j: any, i: number) => {
        const isListed = j.jetton?.verified || j.jetton?.verification === 'whitelist';
        if (!isListed) return;
        const symbol: string = j.jetton?.symbol || 'TKN';
        if (symbol === 'USDT' || symbol === 'jUSDT' || symbol === 'USDC' || symbol === 'jUSDC') return;
        if (!list.find(a => a.symbol === symbol)) {
          list.push({
            id: j.jetton?.address || `jetton-${i}`,
            symbol,
            name: j.jetton?.name || 'Token',
            price: 0,
            change: 0,
            sparklineSeed: 20 + i,
          });
        }
      });
    }

    return list.filter(a => a.price > 0);
  }, [balance, jettons]);

  // RZC is always pinned — pull it out for the hero card
  const rzcAsset = useMemo(() => allAssets.find(a => a.symbol === 'RZC') ?? null, [allAssets]);

  // ── Filtered / sorted list (excludes RZC — shown in hero card) ────────────
  const displayedAssets = useMemo<Asset[]>(() => {
    // RZC is pinned in the hero card; hide it from the regular list
    let list = allAssets.filter(a => a.symbol !== 'RZC');

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a => a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q));
      // If search matches RZC, re-include it in the list (user searched for it explicitly)
      if (rzcAsset && ('rzc'.includes(q) || 'rhizacore'.includes(q) || 'rhiza'.includes(q))) {
        list = [rzcAsset, ...list];
      }
    } else if (activeTab === 'Gainers') {
      list = list.filter(a => a.change > 0).sort((a, b) => b.change - a.change);
    } else if (activeTab === 'Losers') {
      list = list.filter(a => a.change < 0).sort((a, b) => a.change - b.change);
    }

    return list;
  }, [allAssets, activeTab, searchQuery, rzcAsset]);

  // Tab counts (include RZC in totals)
  const gainersCount = useMemo(() => allAssets.filter(a => a.change > 0).length, [allAssets]);
  const losersCount  = useMemo(() => allAssets.filter(a => a.change < 0).length, [allAssets]);
  const tabCounts: Record<TabOption, number> = {
    All:     allAssets.length,
    Gainers: gainersCount,
    Losers:  losersCount,
  };

  const isMarketUp = gainersCount >= losersCount;
  const isLoading  = allAssets.length === 0;

  // Show hero card only when not searching or when search matches RZC
  const showHero = !searchQuery || ('rzc'.includes(searchQuery.toLowerCase()) || 'rhiza'.includes(searchQuery.toLowerCase()));

  return (
    <div className="pb-24 pt-4 px-4 sm:px-6 max-w-lg mx-auto w-full relative z-10 animate-in fade-in duration-500">

      {/* ── RZC Candy Bomb Hero Card (always pinned at top) ───────────────── */}
      {rzcAsset && showHero && !isLoading && (
        <RzcCandyBomb asset={rzcAsset} onSelect={openCoin} />
      )}

      {/* ── Market Stats Bar ─────────────────────────────────────────────── */}
      <div className="mb-5 flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
        <div
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold ${
            isMarketUp
              ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
              : 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20 text-red-700 dark:text-red-400'
          }`}
        >
          {isMarketUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          Market {isMarketUp ? 'Bullish' : 'Bearish'}
        </div>

        <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#1a1b23] border border-slate-100 dark:border-[#2a2b36] text-[11px] font-semibold text-slate-600 dark:text-gray-400">
          <span className="text-emerald-500 font-bold">{gainersCount}</span>
          <span>Gainers</span>
        </div>

        <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#1a1b23] border border-slate-100 dark:border-[#2a2b36] text-[11px] font-semibold text-slate-600 dark:text-gray-400">
          <span className="text-red-500 font-bold">{losersCount}</span>
          <span>Losers</span>
        </div>

        <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#1a1b23] border border-slate-100 dark:border-[#2a2b36] text-[11px] font-semibold text-slate-500 dark:text-gray-500 ml-auto">
          <Zap size={11} className="text-indigo-500" />
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live</span>
        </div>
      </div>

      {/* ── Search Bar ───────────────────────────────────────────────────── */}
      <div className="mb-5 relative">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search className="h-4.5 w-4.5 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Search assets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white dark:bg-[#1a1b23] border border-slate-100 dark:border-[#2a2b36] text-slate-900 dark:text-white pl-11 pr-10 py-3 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
          aria-label="Search assets"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-3 flex items-center justify-center w-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            aria-label="Clear search"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* ── Filter Tabs ──────────────────────────────────────────────────── */}
      <div className="flex gap-2 mb-5 bg-slate-50 dark:bg-white/[0.02] p-1 rounded-xl border border-slate-100 dark:border-white/[0.05]">
        {TABS.map((tab) => {
          const isActive = activeTab === tab && !searchQuery;
          return (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSearchQuery('');
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-bold rounded-lg transition-all ${
                isActive
                  ? 'bg-white dark:bg-[#2a2b36] text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <span className={isActive ? 'text-indigo-500' : 'text-slate-400'}>{TAB_ICONS[tab]}</span>
              {tab}
              {!searchQuery && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                    isActive
                      ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                      : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {tabCounts[tab]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Asset List ───────────────────────────────────────────────────── */}
      <div className="space-y-2.5">
        {isLoading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : displayedAssets.length === 0 ? (
          <div className="py-14 text-center bg-white dark:bg-[#1a1b23] rounded-3xl border border-slate-100 dark:border-[#2a2b36]">
            <Search size={28} className="mx-auto text-slate-300 dark:text-white/20 mb-3" />
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No assets found</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try a different search or filter</p>
          </div>
        ) : (
          displayedAssets.map((asset, idx) => {
            const isPositive = asset.change >= 0;
            const rank = COIN_PROFILES[asset.symbol]?.rank;

            return (
              <button
                key={asset.id}
                onClick={() => openCoin(asset)}
                className="w-full flex items-center justify-between gap-3 py-3.5 px-4 hover:bg-slate-50 dark:hover:bg-white/[0.04] active:scale-[0.99] rounded-2xl transition-all text-left bg-white dark:bg-[#1a1b23] border border-slate-100 dark:border-[#2a2b36] shadow-sm group"
              >
                {/* Left: rank + logo + name */}
                <div className="flex items-center gap-3 min-w-0" style={{ width: '38%' }}>
                  <span className="text-[10px] font-bold text-slate-300 dark:text-white/20 w-4 text-center flex-shrink-0 tabular-nums">
                    {rank ?? idx + 1}
                  </span>
                  <MarketTokenLogo symbol={asset.symbol} size={38} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[14px] font-extrabold text-slate-900 dark:text-white leading-tight truncate">
                      {asset.symbol}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 dark:text-gray-500 mt-0.5 truncate max-w-[72px]">
                      {asset.name}
                    </span>
                  </div>
                </div>

                {/* Middle: Sparkline */}
                <div className="hidden min-[360px]:flex flex-1 items-center justify-center max-w-[72px]">
                  <div className="w-full bg-slate-50 dark:bg-white/[0.02] rounded-lg overflow-hidden py-1">
                    <Sparkline change={asset.change} seed={asset.sparklineSeed} />
                  </div>
                </div>

                {/* Right: price + badge */}
                <div className="text-right flex flex-col items-end" style={{ width: '30%' }}>
                  <span className="text-[14px] font-bold font-numbers text-slate-900 dark:text-white leading-tight tabular-nums">
                    ${fmtSmall(asset.price)}
                  </span>
                  <span
                    className={`inline-flex items-center gap-0.5 text-[11px] font-extrabold mt-1 px-2 py-0.5 rounded-md ${
                      isPositive
                        ? 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10'
                        : 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10'
                    }`}
                  >
                    {isPositive ? '+' : ''}
                    {asset.change.toFixed(2)}%
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Market;
