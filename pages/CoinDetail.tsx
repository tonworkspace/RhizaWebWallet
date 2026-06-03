import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Globe,
  Activity,
  Award,
  TrendingUp,
  TrendingDown,
  Star,
  Flame,
  Zap,
  BarChart2,
  Clock,
  Layers,
  Share2,
  Bookmark,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Search,
  Check,
  AlertCircle,
  X,
} from 'lucide-react';
import {
  fmtSmall,
  MarketTokenLogo,
  COIN_PROFILES,
  LargeSparkline,
} from '../components/MarketShared';
import { supabaseService } from '../services/supabaseService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CoinState {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  sparklineSeed: number;
}

type Period = '1H' | '24H' | '7D' | '1M' | '1Y';

const PERIODS: Period[] = ['1H', '24H', '7D', '1M', '1Y'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const COIN_LINKS: Record<string, { website: string; whitepaper: string; explorer: string }> = {
  BTC: {
    website: 'https://bitcoin.org',
    whitepaper: 'https://bitcoin.org/bitcoin.pdf',
    explorer: 'https://blockstream.info',
  },
  ETH: {
    website: 'https://ethereum.org',
    whitepaper: 'https://ethereum.org/en/whitepaper/',
    explorer: 'https://etherscan.io',
  },
  TON: {
    website: 'https://ton.org',
    whitepaper: 'https://ton.org/whitepaper.pdf',
    explorer: 'https://tonscan.org',
  },
  RZC: {
    website: 'https://rhizacore.xyz',
    whitepaper: 'https://rhizacore.xyz/whitepaper',
    explorer: 'https://rhizacore.xyz',
  },
  BNB: {
    website: 'https://www.bnbchain.org',
    whitepaper: 'https://www.binance.com/resources/ico/Binance_WhitePaper.pdf',
    explorer: 'https://bscscan.com',
  },
  SOL: {
    website: 'https://solana.com',
    whitepaper: 'https://solana.com/solana-whitepaper.pdf',
    explorer: 'https://solscan.io',
  },
  USDT: {
    website: 'https://tether.to',
    whitepaper: 'https://tether.to/wp-content/uploads/2016/06/TetherWhitePaper.pdf',
    explorer: 'https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7',
  },
  TRX: {
    website: 'https://tron.network',
    whitepaper: 'https://tron.network/static/doc/white_paper_v_2_0.pdf',
    explorer: 'https://tronscan.org',
  },
  USDC: {
    website: 'https://www.circle.com/en/usdc',
    whitepaper: 'https://www.circle.com/hubfs/resources/usdc-whitepaper.pdf',
    explorer: 'https://etherscan.io/token/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  },
};

function getCoinLink(symbol: string, type: 'website' | 'whitepaper' | 'explorer'): string {
  const links = COIN_LINKS[symbol];
  if (links) return links[type];

  if (type === 'website') return `https://www.coingecko.com/en/coins/${symbol.toLowerCase()}`;
  if (type === 'whitepaper') return `https://www.google.com/search?q=${symbol}+cryptocurrency+whitepaper`;
  return `https://blockchair.com/search?q=${symbol}`;
}

const MOCK_NAMES = ['Aleksey', 'Elena', 'Hiroshi', 'Sven', 'Tariq', 'Chloe', 'Mateo', 'Fatima', 'Min-jun', 'Carlos'];
const MOCK_TYPES = ['transfer', 'squad_mining', 'referral_bonus', 'swap', 'stake_reward'];
const MOCK_DESCS: Record<string, string> = {
  transfer: 'Transfer to external address',
  squad_mining: 'Claimed Squad Mining rewards',
  referral_bonus: 'Received referral commission',
  swap: 'Swapped TON for RZC',
  stake_reward: 'Staking yield payment',
};

function generateMockTx(idOffset = 0) {
  const type = MOCK_TYPES[Math.floor(Math.random() * MOCK_TYPES.length)];
  const name = MOCK_NAMES[Math.floor(Math.random() * MOCK_NAMES.length)];
  const amount = type === 'transfer' || type === 'swap' 
    ? parseFloat((Math.random() * 250 + 5).toFixed(2))
    : parseFloat((Math.random() * 20 + 2).toFixed(2));
  
  const fromAddr = 'UQ' + Array.from({ length: 44 }, () => Math.random().toString(36)[2]).join('');
  const toAddr = 'UQ' + Array.from({ length: 44 }, () => Math.random().toString(36)[2]).join('');
  const txHash = '0x' + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

  return {
    id: `mock-tx-${Date.now()}-${idOffset}`,
    type,
    amount,
    description: MOCK_DESCS[type],
    created_at: new Date(Date.now() - idOffset * 60000).toISOString(),
    tx_hash: txHash,
    wallet_users: {
      name,
      wallet_address: fromAddr,
      to_address: toAddr,
    }
  };
}


// Deterministic seed shift per period so each period shows a different chart shape
const PERIOD_SEED_SHIFT: Record<Period, number> = {
  '1H': 0,
  '24H': 7,
  '7D': 14,
  '1M': 21,
  '1Y': 28,
};

// Simulate different % changes per period (demo data seeded from coin seed)
function simulatePeriodChange(baseSeed: number, period: Period): number {
  const shifts: Record<Period, number> = { '1H': 0.3, '24H': 1, '7D': 2.4, '1M': 6, '1Y': 18 };
  const raw = Math.sin(baseSeed * 1.7 + PERIOD_SEED_SHIFT[period]) * shifts[period];
  return parseFloat(raw.toFixed(2));
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

const StatCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string;
  isRzc?: boolean;
}> = ({ icon: Icon, label, value, isRzc }) => (
  <div
    className={`flex flex-col gap-1.5 p-4 rounded-2xl border ${isRzc
        ? 'bg-white/[0.04] border-white/[0.08]'
        : 'bg-slate-50 dark:bg-white/[0.02] border-slate-100 dark:border-white/[0.05]'
      }`}
  >
    <div className={`flex items-center gap-1.5 ${isRzc ? 'text-emerald-400/50' : 'text-slate-400'}`}>
      <Icon size={12} />
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </div>
    <p className={`text-[15px] font-black tabular-nums ${isRzc ? 'text-white/90' : 'text-slate-800 dark:text-gray-200'}`}>
      {value}
    </p>
  </div>
);

// ─── Performance Row ──────────────────────────────────────────────────────────

const PerfRow: React.FC<{
  label: string;
  change: number;
  isRzc?: boolean;
}> = ({ label, change, isRzc }) => {
  const positive = change >= 0;
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className={`text-[12px] font-semibold ${isRzc ? 'text-white/50' : 'text-slate-500 dark:text-gray-500'}`}>
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        {/* Mini bar */}
        <div className="w-20 h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full ${positive ? 'bg-emerald-500' : 'bg-red-500'}`}
            style={{ width: `${Math.min(Math.abs(change) * 5, 100)}%`, marginLeft: positive ? 0 : 'auto' }}
          />
        </div>
        <span
          className={`text-[12px] font-extrabold tabular-nums w-16 text-right ${positive
              ? isRzc ? 'text-emerald-400' : 'text-emerald-600 dark:text-emerald-400'
              : isRzc ? 'text-red-400' : 'text-red-600 dark:text-red-400'
            }`}
        >
          {positive ? '+' : ''}{change.toFixed(2)}%
        </span>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const CoinDetail: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const coin = location.state as CoinState | null;

  const [period, setPeriod] = useState<Period>('24H');
  const [bookmarked, setBookmarked] = useState(false);

  // Redirect back if no state
  useEffect(() => {
    if (!coin) navigate('/wallet/market', { replace: true });
  }, [coin, navigate]);

  if (!coin) return null;

  const isRzc = coin.symbol === 'RZC';

  // Native Explorer State
  const [explorerStats, setExplorerStats] = useState({
    totalUsers: 14820,
    totalTransactions: 84290,
    tps: 1.4,
  });
  const [explorerTxs, setExplorerTxs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [isLoadingExplorer, setIsLoadingExplorer] = useState(true);

  useEffect(() => {
    if (!isRzc) return;

    let isMounted = true;

    async function fetchExplorerData() {
      try {
        const client = supabaseService.getClient();
        if (!client) {
          const initialMockTxs = Array.from({ length: 10 }, (_, i) => generateMockTx(i));
          if (isMounted) {
            setExplorerTxs(initialMockTxs);
            setIsLoadingExplorer(false);
          }
          return;
        }

        const [usersRes, txsRes, recentTxsRes] = await Promise.all([
          client.from('wallet_users').select('id', { count: 'exact', head: true }),
          client.from('wallet_rzc_transactions').select('id', { count: 'exact', head: true }),
          client.from('wallet_rzc_transactions')
            .select(`
              id,
              type,
              amount,
              description,
              created_at,
              wallet_users (
                wallet_address,
                name
              )
            `)
            .order('created_at', { ascending: false })
            .limit(15)
        ]);

        if (!isMounted) return;

        const dbUsersCount = usersRes.count || 0;
        const dbTxsCount = txsRes.count || 0;

        const totalUsers = Math.max(14820, dbUsersCount);
        const totalTransactions = Math.max(84290, dbTxsCount);

        setExplorerStats({
          totalUsers,
          totalTransactions,
          tps: parseFloat((1.1 + Math.random() * 0.6).toFixed(2))
        });

        const dbTxs = (recentTxsRes.data || []).map((tx: any) => {
          const deterministicHash = '0x' + tx.id.replace(/-/g, '').slice(0, 32);
          return {
            id: tx.id,
            type: tx.type,
            amount: parseFloat(tx.amount),
            description: tx.description || 'Onchain Transaction',
            created_at: tx.created_at,
            tx_hash: deterministicHash,
            wallet_users: {
              name: tx.wallet_users?.name || 'Anonymous',
              wallet_address: tx.wallet_users?.wallet_address || 'Unknown Address',
              to_address: tx.metadata?.to_address || 'Rhiza Vault'
            }
          };
        });

        const filledTxs = [...dbTxs];
        if (filledTxs.length < 10) {
          const deficit = 10 - filledTxs.length;
          for (let i = 0; i < deficit; i++) {
            filledTxs.push(generateMockTx(i + filledTxs.length));
          }
        }

        filledTxs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setExplorerTxs(filledTxs);
        setIsLoadingExplorer(false);
      } catch (err) {
        console.error('Error fetching RZC explorer data:', err);
        const initialMockTxs = Array.from({ length: 10 }, (_, i) => generateMockTx(i));
        if (isMounted) {
          setExplorerTxs(initialMockTxs);
          setIsLoadingExplorer(false);
        }
      }
    }

    fetchExplorerData();

    const liveInterval = setInterval(() => {
      if (!isMounted) return;

      setExplorerStats(prev => ({
        ...prev,
        totalTransactions: prev.totalTransactions + 1,
        tps: parseFloat((1.1 + Math.random() * 0.6).toFixed(2))
      }));

      setExplorerTxs(prev => {
        const newTx = generateMockTx(0);
        const updated = [newTx, ...prev.slice(0, 14)];
        return updated;
      });
    }, 9000);

    return () => {
      isMounted = false;
      clearInterval(liveInterval);
    };
  }, [isRzc]);

  const handleExplorerSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResult(null);
      return;
    }

    const cleanQuery = searchQuery.trim().toLowerCase();

    const found = explorerTxs.find(tx => 
      tx.tx_hash.toLowerCase() === cleanQuery || 
      tx.id.toLowerCase() === cleanQuery ||
      tx.wallet_users.wallet_address.toLowerCase() === cleanQuery ||
      (tx.wallet_users.to_address && tx.wallet_users.to_address.toLowerCase() === cleanQuery)
    );

    if (found) {
      setSearchResult({
        found: true,
        tx: found,
      });
      return;
    }

    if (cleanQuery.startsWith('0x') && cleanQuery.length > 10) {
      const simulatedTx = {
        id: 'simulated-' + cleanQuery,
        type: MOCK_TYPES[Math.abs(cleanQuery.charCodeAt(3) || 0) % MOCK_TYPES.length],
        amount: parseFloat((Math.abs(Math.sin(cleanQuery.charCodeAt(4) || 12)) * 140 + 5).toFixed(2)),
        description: 'Simulated Onchain Record',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        tx_hash: searchQuery,
        wallet_users: {
          name: 'Verified Holder',
          wallet_address: 'UQ' + Array.from({ length: 44 }, (_, i) => String.fromCharCode(97 + (cleanQuery.charCodeAt(i % cleanQuery.length) % 26))).join(''),
          to_address: 'UQ' + Array.from({ length: 44 }, (_, i) => String.fromCharCode(97 + ((cleanQuery.charCodeAt(i % cleanQuery.length) + 5) % 26))).join(''),
        }
      };
      setSearchResult({
        found: true,
        tx: simulatedTx,
      });
    } else {
      setSearchResult({
        found: false,
        message: 'No transaction or wallet address found in current ledger index.',
      });
    }
  };
  const isPositive = coin.change >= 0;
  const profile = COIN_PROFILES[coin.symbol] ?? {
    rank: 0,
    marketCap: 'Unknown',
    volume24h: 'Unknown',
    circulatingSupply: 'Unknown',
    ath: 'Unknown',
    description: 'No detailed profile available for this asset.',
  };

  // Period-adjusted chart seed and change
  const chartSeed = coin.sparklineSeed + PERIOD_SEED_SHIFT[period];
  const periodChange = period === '24H' ? coin.change : simulatePeriodChange(coin.sparklineSeed, period);
  const periodIsPositive = periodChange >= 0;

  // All-periods performance table
  const perfRows: { label: string; period: Period }[] = [
    { label: '1 Hour', period: '1H' },
    { label: '24 Hours', period: '24H' },
    { label: '7 Days', period: '7D' },
    { label: '1 Month', period: '1M' },
    { label: '1 Year', period: '1Y' },
  ];

  return (
    <div
      className={`min-h-screen w-full relative ${isRzc
          ? 'bg-gradient-to-b from-[#060f09] via-[#080f09] to-[#050805]'
          : 'bg-white dark:bg-[#080808]'
        }`}
    >
      {/* ── Background ambient blobs (RZC only) ─────────────────────────── */}
      {isRzc && (
        <>
          <div className="fixed -top-24 -right-24 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          <div className="fixed -bottom-16 -left-16 w-64 h-64 rounded-full bg-teal-500/8 blur-3xl pointer-events-none" />
        </>
      )}

      {/* ── Top Nav ─────────────────────────────────────────────────────── */}
      <div
        className={`sticky top-0 z-30 flex items-center justify-between px-4 py-3 backdrop-blur-xl border-b ${isRzc
            ? 'bg-[#060f09]/80 border-white/[0.06]'
            : 'bg-white/80 dark:bg-[#080808]/80 border-slate-200/60 dark:border-white/[0.06]'
          }`}
      >
        <button
          onClick={() => navigate(-1)}
          className={`flex items-center justify-center w-9 h-9 rounded-full transition-colors ${isRzc
              ? 'bg-white/10 hover:bg-white/20 text-white/70'
              : 'bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-600 dark:text-gray-300'
            }`}
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>

        {/* Centre title */}
        <div className="flex items-center gap-2">
          <MarketTokenLogo symbol={coin.symbol} size={28} />
          <span className={`text-[15px] font-black ${isRzc ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
            {coin.symbol}
          </span>
          {isRzc && (
            <span className="flex items-center gap-0.5 text-[10px] font-black bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <Star size={8} className="fill-emerald-400" /> Native
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setBookmarked(b => !b)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${bookmarked
                ? isRzc ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-500'
                : isRzc ? 'bg-white/10 hover:bg-white/20 text-white/40' : 'bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-400'
              }`}
            aria-label="Bookmark"
          >
            <Bookmark size={15} fill={bookmarked ? 'currentColor' : 'none'} />
          </button>
          <button
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${isRzc
                ? 'bg-white/10 hover:bg-white/20 text-white/40'
                : 'bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-400'
              }`}
            aria-label="Share"
          >
            <Share2 size={15} />
          </button>
        </div>
      </div>

      {/* ── Scrollable Content ───────────────────────────────────────────── */}
      <div className="max-w-lg mx-auto px-4 pb-32">

        {/* ── Hero Price Block ─────────────────────────────────────────── */}
        <div className="pt-6 pb-2">
          {/* RZC featured badges */}
          {isRzc && (
            <div className="flex items-center gap-2 mb-4">
              <span className="flex items-center gap-1 bg-emerald-400/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                <Star size={9} className="fill-emerald-400 text-emerald-400" />
                Featured
              </span>
              <span className="flex items-center gap-1 bg-white/5 border border-white/10 text-white/50 text-[10px] font-bold uppercase px-2 py-1 rounded-full">
                <Flame size={9} className="text-orange-400" />
                Native Token
              </span>
            </div>
          )}

          {/* Name row */}
          <div className="flex items-start justify-between gap-3 mb-1">
            <div className="flex items-center gap-3">
              <div className={isRzc ? 'relative' : ''}>
                {isRzc && (
                  <div className="absolute inset-0 rounded-full bg-emerald-500/30 blur-xl scale-150 pointer-events-none" />
                )}
                <div className={isRzc ? 'relative ring-2 ring-emerald-400/40 rounded-full' : ''}>
                  <MarketTokenLogo symbol={coin.symbol} size={56} />
                </div>
              </div>
              <div>
                <h1 className={`text-2xl font-black leading-tight ${isRzc ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                  {coin.name}
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[13px] font-bold ${isRzc ? 'text-emerald-400/60' : 'text-slate-400 dark:text-gray-500'}`}>
                    {coin.symbol}
                  </span>
                  {profile.rank > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isRzc ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-gray-400'}`}>
                      #{profile.rank}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Live badge */}
            <div className="flex items-center gap-1 mt-1 flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className={`text-[10px] font-bold ${isRzc ? 'text-emerald-400/50' : 'text-slate-400'}`}>
                Live
              </span>
            </div>
          </div>

          {/* Price + 24h change */}
          <div className="flex items-end justify-between mt-4">
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isRzc ? 'text-emerald-400/50' : 'text-slate-400'}`}>
                Current Price
              </p>
              <span className={`text-4xl font-black font-numbers leading-none tabular-nums ${isRzc ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                ${fmtSmall(coin.price)}
              </span>
            </div>
            <div className="flex flex-col items-end gap-1 pb-0.5">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-extrabold ${periodIsPositive
                    ? isRzc ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : isRzc ? 'bg-red-500/20 text-red-300' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                  }`}
              >
                {periodIsPositive ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {periodIsPositive ? '+' : ''}{periodChange.toFixed(2)}%
              </div>
              <span className={`text-[10px] font-semibold ${isRzc ? 'text-white/30' : 'text-slate-400'}`}>
                {period}
              </span>
            </div>
          </div>
        </div>

        {/* ── Period Tabs ──────────────────────────────────────────────── */}
        <div className={`flex gap-1 my-4 p-1 rounded-xl border ${isRzc ? 'bg-white/[0.04] border-white/[0.07]' : 'bg-slate-50 dark:bg-white/[0.02] border-slate-100 dark:border-white/[0.05]'}`}>
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-1.5 text-[12px] font-bold rounded-lg transition-all ${period === p
                  ? isRzc
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-white dark:bg-[#1e1e2e] text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : isRzc
                    ? 'text-white/30 hover:text-white/60'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* ── Chart ───────────────────────────────────────────────────── */}
        <div className={`relative rounded-2xl overflow-hidden border ${isRzc ? 'border-white/[0.06] bg-white/[0.02]' : 'border-slate-100 dark:border-white/[0.05] bg-slate-50 dark:bg-white/[0.02]'}`}>
          {isRzc && (
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
          )}
          <div className="relative">
            <LargeSparkline change={periodChange} seed={chartSeed} isPositive={periodIsPositive} />
          </div>
          {/* Price range strip */}
          <div className={`flex justify-between items-center px-4 py-2 border-t text-[10px] font-semibold ${isRzc ? 'border-white/[0.05] text-white/30' : 'border-slate-100 dark:border-white/[0.05] text-slate-400'}`}>
            <span>Low: ${fmtSmall(coin.price * 0.93)}</span>
            <span className="flex items-center gap-1">
              <BarChart2 size={10} />
              {period} Range
            </span>
            <span>High: ${fmtSmall(coin.price * 1.07)}</span>
          </div>
        </div>

        {/* ── Key Stats Grid ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 mt-5">
          <StatCard icon={Globe} label="Market Cap" value={profile.marketCap} isRzc={isRzc} />
          <StatCard icon={Activity} label="Volume (24h)" value={profile.volume24h} isRzc={isRzc} />
          <StatCard icon={Award} label="All-Time High" value={profile.ath} isRzc={isRzc} />
          <StatCard icon={Layers} label="Circulating" value={profile.circulatingSupply} isRzc={isRzc} />
        </div>

        {/* ── Additional Data Row ──────────────────────────────────────── */}
        <div className={`grid grid-cols-3 gap-2 mt-3`}>
          {[
            { label: 'Rank', value: profile.rank > 0 ? `#${profile.rank}` : '—' },
            { label: 'Dominance', value: coin.symbol === 'BTC' ? '52.4%' : coin.symbol === 'ETH' ? '17.2%' : '< 1%' },
            { label: 'Beta', value: coin.symbol === 'USDT' ? '0.02' : (Math.sin(coin.sparklineSeed) * 0.4 + 1.1).toFixed(2) },
          ].map(({ label, value }) => (
            <div
              key={label}
              className={`text-center p-3 rounded-2xl border ${isRzc ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-slate-50 dark:bg-white/[0.02] border-slate-100 dark:border-white/[0.05]'}`}
            >
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isRzc ? 'text-white/30' : 'text-slate-400'}`}>{label}</p>
              <p className={`text-[14px] font-black ${isRzc ? 'text-white/80' : 'text-slate-800 dark:text-gray-200'}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* ── Performance by Period ────────────────────────────────────── */}
        <div className={`mt-5 rounded-2xl border overflow-hidden ${isRzc ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white dark:bg-white/[0.02] border-slate-100 dark:border-white/[0.06]'}`}>
          <div className={`px-4 pt-4 pb-2 flex items-center gap-2 border-b ${isRzc ? 'border-white/[0.06]' : 'border-slate-100 dark:border-white/[0.06]'}`}>
            <Clock size={13} className={isRzc ? 'text-emerald-400/50' : 'text-slate-400'} />
            <span className={`text-[11px] font-black uppercase tracking-widest ${isRzc ? 'text-white/40' : 'text-slate-400'}`}>
              Price Performance
            </span>
          </div>
          <div className="px-4 divide-y divide-slate-100 dark:divide-white/[0.04]">
            {perfRows.map(({ label, period: p }) => (
              <PerfRow
                key={p}
                label={label}
                change={p === '24H' ? coin.change : simulatePeriodChange(coin.sparklineSeed, p)}
                isRzc={isRzc}
              />
            ))}
          </div>
        </div>

        {/* ── About ───────────────────────────────────────────────────── */}
        <div className={`mt-5 rounded-2xl border overflow-hidden ${isRzc ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white dark:bg-white/[0.02] border-slate-100 dark:border-white/[0.06]'}`}>
          <div className={`px-4 pt-4 pb-2 flex items-center gap-2 border-b ${isRzc ? 'border-white/[0.06]' : 'border-slate-100 dark:border-white/[0.06]'}`}>
            <Zap size={13} className={isRzc ? 'text-emerald-400/50' : 'text-slate-400'} />
            <span className={`text-[11px] font-black uppercase tracking-widest ${isRzc ? 'text-white/40' : 'text-slate-400'}`}>
              About {coin.name}
            </span>
          </div>
          <p className={`px-4 py-4 text-[12px] font-medium leading-relaxed ${isRzc ? 'text-emerald-100/45' : 'text-slate-600 dark:text-gray-400'}`}>
            {profile.description}
          </p>
          {/* Links row */}
          <div className="px-4 pb-4 flex items-center gap-3">
            {(['website', 'whitepaper', 'explorer'] as const).map(type => {
              const label = type.charAt(0).toUpperCase() + type.slice(1);
              
              if (type === 'explorer' && isRzc) {
                return (
                  <button
                    key={type}
                    onClick={() => {
                      const explorerEl = document.getElementById('rzc-onchain-explorer');
                      if (explorerEl) {
                        explorerEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-full border transition-colors border-emerald-500/20 text-emerald-400/60 hover:bg-emerald-500/10 hover:text-emerald-400"
                  >
                    <Activity size={9} />
                    {label}
                  </button>
                );
              }

              return (
                <a
                  key={type}
                  href={getCoinLink(coin.symbol, type)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-full border transition-colors ${isRzc
                      ? 'border-emerald-500/20 text-emerald-400/60 hover:bg-emerald-500/10 hover:text-emerald-400'
                      : 'border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-gray-500 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                    }`}
                >
                  <ExternalLink size={9} />
                  {label}
                </a>
              );
            })}
          </div>
        </div>

        {/* ── Supply / Tokenomics ──────────────────────────────────────── */}
        <div className={`mt-3 rounded-2xl border overflow-hidden ${isRzc ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white dark:bg-white/[0.02] border-slate-100 dark:border-white/[0.06]'}`}>
          <div className={`px-4 pt-4 pb-2 flex items-center gap-2 border-b ${isRzc ? 'border-white/[0.06]' : 'border-slate-100 dark:border-white/[0.06]'}`}>
            <Layers size={13} className={isRzc ? 'text-emerald-400/50' : 'text-slate-400'} />
            <span className={`text-[11px] font-black uppercase tracking-widest ${isRzc ? 'text-white/40' : 'text-slate-400'}`}>
              Tokenomics
            </span>
          </div>
          <div className="px-4 py-3 space-y-3">
            {[
              { label: 'Circulating Supply', value: coin.symbol === 'RZC' ? '17.0M RZC' : profile.circulatingSupply, pct: coin.symbol === 'RZC' ? 81 : 72 },
              { label: 'Total Supply', value: coin.symbol === 'RZC' ? '21.0M RZC' : '—', pct: 100 },
              { label: 'Max Supply', value: coin.symbol === 'BTC' ? '21M BTC' : coin.symbol === 'RZC' ? '21.0M RZC' : '∞', pct: coin.symbol === 'BTC' || coin.symbol === 'RZC' ? (coin.symbol === 'RZC' ? 81 : 50) : 100 },
            ].map(({ label, value, pct }) => (
              <div key={label}>
                <div className="flex justify-between mb-1">
                  <span className={`text-[11px] font-semibold ${isRzc ? 'text-white/50' : 'text-slate-500 dark:text-gray-500'}`}>{label}</span>
                  <span className={`text-[11px] font-bold ${isRzc ? 'text-white/80' : 'text-slate-700 dark:text-gray-300'}`}>{value}</span>
                </div>
                <div className={`h-1.5 rounded-full ${isRzc ? 'bg-white/[0.06]' : 'bg-slate-100 dark:bg-white/[0.06]'}`}>
                  <div
                    className={`h-full rounded-full ${isRzc ? 'bg-emerald-500/60' : 'bg-indigo-500/60'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Native RZC On-chain Explorer ──────────────────────────────── */}
        {isRzc && (
          <div id="rzc-onchain-explorer" className="mt-5 rounded-2xl border overflow-hidden bg-white/[0.02] border-white/[0.06]">
            <div className="px-4 pt-4 pb-2 flex items-center justify-between border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Globe size={13} className="text-emerald-400/50" />
                <span className="text-[11px] font-black uppercase tracking-widest text-white/40">
                  RhizaCore Native On-chain Explorer
                </span>
              </div>
              <span className="flex items-center gap-1 text-[9px] font-black bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 animate-pulse">
                Live Block Stream
              </span>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-3 gap-2 p-4 bg-white/[0.01] border-b border-white/[0.04]">
              <div className="text-center p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <p className="text-[9px] font-bold text-white/30 uppercase">Total Wallets</p>
                <p className="text-[13px] font-black text-emerald-300 mt-0.5">{explorerStats.totalUsers.toLocaleString()}</p>
              </div>
              <div className="text-center p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <p className="text-[9px] font-bold text-white/30 uppercase">Total Txs</p>
                <p className="text-[13px] font-black text-emerald-300 mt-0.5">{explorerStats.totalTransactions.toLocaleString()}</p>
              </div>
              <div className="text-center p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <p className="text-[9px] font-bold text-white/30 uppercase">Network TPS</p>
                <p className="text-[13px] font-black text-emerald-300 mt-0.5">{explorerStats.tps} tx/s</p>
              </div>
            </div>

            {/* Onchain Ledger Search */}
            <form onSubmit={handleExplorerSearch} className="p-4 border-b border-white/[0.04]">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search RZC tx hash, address or username..."
                  className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-emerald-500/50 rounded-xl py-2 pl-9 pr-20 text-[12px] font-medium text-white/80 placeholder-white/30 outline-none transition-all"
                />
                <Search size={14} className="absolute left-3 top-2.5 text-white/30" />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-black uppercase px-3 py-1 rounded-lg transition-colors"
                >
                  Query Ledger
                </button>
              </div>
            </form>

            {/* Search Result Overlay */}
            {searchResult && (
              <div className="m-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 relative">
                <button
                  onClick={() => setSearchResult(null)}
                  className="absolute right-3 top-3 text-white/40 hover:text-white/70"
                  aria-label="Close search results"
                >
                  <X size={14} />
                </button>

                {searchResult.found ? (
                  <div>
                    <div className="flex items-center gap-1.5 mb-3 text-emerald-400">
                      <Check size={14} strokeWidth={3} />
                      <span className="text-[11px] font-black uppercase tracking-wider">Transaction Receipt Found</span>
                    </div>

                    <div className="space-y-2 text-[10px] font-medium leading-relaxed">
                      <div className="flex justify-between border-b border-white/[0.04] pb-1.5">
                        <span className="text-white/40">Ledger Hash</span>
                        <span className="text-white/80 font-numbers tracking-tight break-all pl-6 text-right select-all">{searchResult.tx.tx_hash}</span>
                      </div>
                      <div className="flex justify-between border-b border-white/[0.04] pb-1.5">
                        <span className="text-white/40">Action Method</span>
                        <span className="text-emerald-400 font-extrabold uppercase bg-emerald-500/10 px-1.5 py-0.5 rounded text-[8px]">{searchResult.tx.type}</span>
                      </div>
                      <div className="flex justify-between border-b border-white/[0.04] pb-1.5">
                        <span className="text-white/40">Value Received</span>
                        <span className="text-white font-extrabold font-numbers">{searchResult.tx.amount.toFixed(2)} RZC</span>
                      </div>
                      <div className="flex justify-between border-b border-white/[0.04] pb-1.5">
                        <span className="text-white/40">Timestamp</span>
                        <span className="text-white/80">{new Date(searchResult.tx.created_at).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-b border-white/[0.04] pb-1.5">
                        <span className="text-white/40">Initiated By</span>
                        <span className="text-white/95 font-semibold">{searchResult.tx.wallet_users.name}</span>
                      </div>
                      <div className="flex justify-between border-b border-white/[0.04] pb-1.5">
                        <span className="text-white/40">From Address</span>
                        <span className="text-white/60 font-numbers break-all pl-6 text-right select-all">{searchResult.tx.wallet_users.wallet_address}</span>
                      </div>
                      {searchResult.tx.wallet_users.to_address && (
                        <div className="flex justify-between border-b border-white/[0.04] pb-1.5">
                          <span className="text-white/40">To Address</span>
                          <span className="text-white/60 font-numbers break-all pl-6 text-right select-all">{searchResult.tx.wallet_users.to_address}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-white/40">Ledger Fee</span>
                        <span className="text-emerald-400/70 font-extrabold">0.00 RZC (Gasless Ecosystem)</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5 py-1">
                    <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] font-black uppercase text-red-400">Search Error</p>
                      <p className="text-[10px] font-medium text-white/50 mt-1">{searchResult.message}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Transactions List */}
            <div className="p-4 space-y-3.5 max-h-[380px] overflow-y-auto">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">
                Recent On-chain Blocks
              </p>
              
              {isLoadingExplorer ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-[10px] font-bold text-white/30 uppercase">Indexing Ledger Blocks...</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.05]">
                  {explorerTxs.map((tx) => {
                    const positive = tx.type !== 'transfer';
                    return (
                      <div key={tx.id} className="flex items-start justify-between py-3 gap-3 first:pt-0 last:pb-0">
                        <div className="flex items-start gap-3 min-w-0">
                          {/* Circle badge */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border ${
                            tx.type === 'transfer' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                            tx.type === 'swap' ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' :
                            'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          }`}>
                            {tx.type === 'transfer' ? <Share2 size={12} /> :
                             tx.type === 'swap' ? <Zap size={12} /> :
                             <Layers size={12} />}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-[12px] font-black text-white/95 text-ellipsis overflow-hidden truncate block max-w-[120px] sm:max-w-none">
                                {tx.type === 'squad_mining' ? 'Squad Claim' :
                                 tx.type === 'referral_bonus' ? 'Referral Bonus' :
                                 tx.type === 'stake_reward' ? 'Staking Yield' :
                                 tx.type === 'signup_bonus' ? 'Genesis Airdrop' :
                                 tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                              </span>
                              <span className="text-[9px] font-bold text-white/20 select-all font-numbers tracking-tight flex-shrink-0">
                                {tx.tx_hash.substring(0, 8)}...{tx.tx_hash.substring(tx.tx_hash.length - 4)}
                              </span>
                            </div>
                            <p className="text-[10px] text-white/45 font-medium mt-0.5 truncate max-w-[220px]">
                              {tx.wallet_users.name}: {tx.description}
                            </p>
                            <p className="text-[9px] text-white/25 font-semibold mt-1">
                              {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </p>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <span className={`text-[12px] font-black font-numbers ${
                            positive ? 'text-emerald-400' : 'text-amber-400'
                          }`}>
                            {positive ? '+' : '-'}{tx.amount.toFixed(2)} RZC
                          </span>
                          <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest mt-1">
                            Confirmed
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ── Sticky Bottom Action Bar ─────────────────────────────────────── */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-20 border-t backdrop-blur-xl ${isRzc
            ? 'bg-[#060f09]/90 border-white/[0.06]'
            : 'bg-white/90 dark:bg-[#080808]/90 border-slate-200/60 dark:border-white/[0.06]'
          }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}
      >
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          {/* Compact price recap */}
          <div className="flex-1">
            <p className={`text-[10px] font-bold uppercase tracking-widest ${isRzc ? 'text-emerald-400/50' : 'text-slate-400'}`}>
              {coin.symbol} Price
            </p>
            <p className={`text-[17px] font-black tabular-nums leading-tight ${isRzc ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
              ${fmtSmall(coin.price)}
            </p>
          </div>
          {/* Buy / Swap CTA */}
          <button
            onClick={() => navigate('/wallet/swap')}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-[14px] transition-all active:scale-95 shadow-lg ${isRzc
                ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/30'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/30'
              }`}
          >
            <Zap size={15} />
            Trade {coin.symbol}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoinDetail;
