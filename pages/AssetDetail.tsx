import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Info,
  RefreshCw,
  Share2,
  ShieldCheck,
  Activity,
  Globe,
  Zap,
  History,
  Repeat,
  Download,
  ChevronDown,
  X,
  Check
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { CHAIN_META } from '../constants';
import { useTransactions } from '../hooks/useTransactions';
import { useToast } from '../context/ToastContext';
import { getExplorerUrl, getTransactionUrl } from '../constants';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip } from 'recharts';

// CoinGecko coin IDs for supported assets
const COINGECKO_IDS: Record<string, string> = {
  TON: 'the-open-network',
  BTC: 'bitcoin',
  ETH: 'ethereum',
  MATIC: 'matic-network',
  BNB: 'binancecoin',
  AVAX: 'avalanche-2',
  SOL: 'solana',
  TRX: 'tron',
};

async function fetchCoinGeckoHistory(coinId: string): Promise<{ time: number; price: number }[]> {
  const url =
    `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart` +
    `?vs_currency=usd&days=1&interval=hourly`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
  const data = await res.json();
  return (data.prices as [number, number][]).map(([ts, price]) => ({ time: ts, price }));
}

interface AssetDetailProps {
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  image?: string;
  emoji?: string;
  price?: number;
  verified?: boolean;
  address?: string;
  type: 'TON' | 'RZC' | 'JETTON' | 'BTC' | 'ETH' | 'EVM' | 'SOL' | 'TRON';
}

const AssetDetail: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { address, network, refreshData, setIsNetworkModalOpen, multiChainBalances, isNetworkModalOpen, currentEvmChain } = useWallet();
  const { showToast } = useToast();
  const { transactions, isLoading: txLoading, refreshTransactions } = useTransactions();

  const assetData = location.state as AssetDetailProps;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [isChartLoading, setIsChartLoading] = useState(true);
  const evmChain = currentEvmChain; // reactive from context
  const [activeBalance, setActiveBalance] = useState<string>(assetData?.balance || '0');
  const [isNetworkSwitching, setIsNetworkSwitching] = useState(false);

  useEffect(() => {
    if (multiChainBalances) {
      if (assetData?.symbol !== 'USDT' && (assetData?.type === 'EVM' || assetData?.type === 'ETH')) {
        setActiveBalance(multiChainBalances.evm);
      } else if (assetData?.symbol === 'USDT') {
        setActiveBalance(multiChainBalances.usdt);
      } else if (assetData?.type === 'SOL') {
        setActiveBalance(multiChainBalances.sol);
      } else if (assetData?.type === 'TRON') {
        setActiveBalance(multiChainBalances.tron);
      }
    }
  }, [multiChainBalances, assetData]);

  useEffect(() => {
    // USDT is a stablecoin — show a flat $1 line, no API call needed
    if (assetData?.symbol === 'USDT') {
      setPriceHistory(Array.from({ length: 24 }, (_, i) => ({ time: i, price: assetData.price || 1.0 })));
      setIsChartLoading(false);
      return;
    }

    if (!assetData || assetData.type === 'RZC' || assetData.type === 'JETTON') {
      setPriceHistory(Array.from({ length: 24 }, (_, i) => ({
        time: i,
        price: assetData?.price ? assetData.price * (1 + (Math.random() - 0.5) * 0.05) : 0
      })));
      setIsChartLoading(false);
      return;
    }

    const fetchHistory = async () => {
      setIsChartLoading(true);
      try {
        let symbol: string;
        if (assetData.type === 'BTC') {
          symbol = 'BTC';
        } else if (assetData.type === 'ETH' || assetData.type === 'EVM') {
          symbol = CHAIN_META[evmChain]?.symbol ?? 'ETH';
        } else if (assetData.type === 'SOL') {
          symbol = 'SOL';
        } else if (assetData.type === 'TRON') {
          symbol = 'TRX';
        } else {
          symbol = 'TON';
        }
        const coinId = COINGECKO_IDS[symbol];
        if (!coinId) throw new Error(`No CoinGecko ID for ${symbol}`);
        const history = await fetchCoinGeckoHistory(coinId);
        if (history.length > 0) {
          setPriceHistory(history);
        } else throw new Error('Empty history');
      } catch (err) {
        console.error('Failed to fetch chart data:', err);
        setPriceHistory(Array.from({ length: 24 }, (_, i) => ({ time: i, price: assetData.price || 0 })));
      } finally {
        setIsChartLoading(false);
      }
    };
    fetchHistory();
  }, [assetData, evmChain]);

  useEffect(() => {
    if (!assetData) navigate('/wallet/assets');
  }, [assetData, navigate]);

  if (!assetData) return null;

  const handleCopyAddress = () => {
    const addr = assetData.address || address;
    if (addr) {
      navigator.clipboard.writeText(addr);
      showToast('Address copied!', 'success');
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `${assetData.name} (${assetData.symbol})`,
      text: `My ${assetData.symbol} balance: ${activeBalance}`,
      url: window.location.href
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { }
    } else {
      handleCopyAddress();
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshTransactions();
    setIsRefreshing(false);
  };

  const formatBalance = (balance: string, decimals: number) => {
    const num = Number(balance) / Math.pow(10, decimals);
    if (num === 0) return '0';
    if (num < 0.0001) return '< 0.0001';
    if (num < 1) return num.toFixed(4);
    if (num < 1000) return num.toFixed(2);
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const balanceNum = assetData.type === 'RZC'
    ? parseFloat(activeBalance)
    : Number(activeBalance) / Math.pow(10, assetData.decimals);

  const usdValue = assetData.price ? balanceNum * assetData.price : 0;

  const assetTransactions = transactions.filter(tx => {
    if (assetData.type === 'TON') return tx.asset === 'TON';
    if (assetData.type === 'RZC') return tx.asset === 'RZC';
    return tx.asset === assetData.symbol;
  });

  const isPositive = (priceHistory[priceHistory.length - 1]?.price || 0) >= (priceHistory[0]?.price || 0);
  const priceChange = priceHistory.length > 1
    ? (((priceHistory[priceHistory.length - 1]?.price || 0) - (priceHistory[0]?.price || 0)) / (priceHistory[0]?.price || 1)) * 100
    : 0;

  // Logo resolution
  const getAssetLogo = () => {
    if (assetData.image) return assetData.image;
    if (assetData.symbol === 'USDT') return 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png';
    if (assetData.type === 'TON') return 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ton/info/logo.png';
    if (assetData.type === 'BTC') return 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png';
    if (assetData.type === 'ETH' || assetData.type === 'EVM') return 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png';
    if (assetData.type === 'SOL') return 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png';
    if (assetData.type === 'TRON') return 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/tron/info/logo.png';
    return null;
  };

  const logo = getAssetLogo();

  const evmLabel = CHAIN_META[evmChain]?.name ?? evmChain.charAt(0).toUpperCase() + evmChain.slice(1);

  // Network label
  const networkLabel = assetData.type === 'BTC' ? 'Bitcoin Mainnet'
    : assetData.type === 'ETH' || assetData.type === 'EVM' ? `${evmLabel} Network`
      : assetData.type === 'RZC' ? 'Rhiza Network'
        : assetData.type === 'JETTON' ? 'TON Jetton'
          : assetData.type === 'SOL' ? 'Solana Mainnet'
            : assetData.type === 'TRON' ? 'TRON Mainnet'
              : 'TON Network';

  // Accent colors per asset type
  const accent = assetData.type === 'BTC' ? 'orange'
    : assetData.type === 'ETH' || assetData.type === 'EVM' ? 'blue'
      : assetData.type === 'RZC' ? 'emerald'
        : assetData.type === 'JETTON' ? 'violet'
          : assetData.type === 'SOL' ? 'purple'
            : assetData.type === 'TRON' ? 'red'
              : 'sky';

  const accentClasses: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-500 dark:text-orange-400', badge: 'bg-orange-500' },
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-500 dark:text-blue-400', badge: 'bg-blue-600' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-500 dark:text-emerald-400', badge: 'bg-emerald-500' },
    violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-500 dark:text-violet-400', badge: 'bg-violet-600' },
    sky: { bg: 'bg-sky-500/10', border: 'border-sky-500/20', text: 'text-sky-500 dark:text-sky-400', badge: 'bg-sky-600' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-500 dark:text-purple-400', badge: 'bg-purple-600' },
    red: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-500 dark:text-red-400', badge: 'bg-red-600' },
  };

  const ac = accentClasses[accent];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#050505] text-gray-900 dark:text-white pb-28">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-[#050505]/80 backdrop-blur-md border-b border-gray-200 dark:border-white/5 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate('/wallet/assets')}
          className="p-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-all active:scale-95"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex flex-col items-center">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">
            {assetData.name}
          </h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className={`w-1.5 h-1.5 rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'} ${isNetworkSwitching ? 'animate-bounce' : 'animate-pulse'}`} />

            {assetData.type === 'ETH' || assetData.type === 'EVM' ? (
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-medium text-gray-400 dark:text-zinc-500">Live ·</span>
                <button
                  onClick={() => setIsNetworkModalOpen(true)}
                  disabled={isNetworkModalOpen}
                  className="flex items-center gap-1.5 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 px-2 py-1 rounded-md border border-gray-100 dark:border-white/5 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors shadow-sm"
                >
                  <img src={CHAIN_META[evmChain]?.logo || CHAIN_META.ethereum.logo} alt="Network" className="w-3.5 h-3.5 rounded-full object-cover" />
                  <span className="text-[10px] font-bold">{CHAIN_META[evmChain]?.name || 'Unknown'}</span>
                  <ChevronDown size={12} className="text-gray-500" />
                </button>
              </div>
            ) : (
              <span className="text-[10px] font-medium text-gray-400 dark:text-zinc-500">
                Live · {networkLabel}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="p-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-all active:scale-95"
        >
          <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="max-w-xl mx-auto px-4 space-y-5 pt-6">

        {/* Hero Card */}
        <div className={`rounded-3xl ${ac.bg} border ${ac.border} p-6 flex flex-col items-center text-center space-y-4`}>
          <div className="relative">
            <div className={`w-20 h-20 rounded-2xl ${assetData.type === 'RZC' ? 'bg-gradient-to-br from-emerald-400 to-cyan-500' : 'bg-white dark:bg-zinc-900'} border border-gray-200 dark:border-white/10 flex items-center justify-center shadow-lg overflow-hidden`}>
              {assetData.type === 'RZC' ? (
                <span className="text-white font-black text-2xl">RZC</span>
              ) : logo ? (
                <img src={assetData.type === 'ETH' || assetData.type === 'EVM' ? (assetData.symbol === 'USDT' ? logo : CHAIN_META[evmChain]?.logo || logo) : logo} alt={assetData.symbol} className={`${(assetData.type === 'ETH' || assetData.type === 'EVM') && assetData.symbol !== 'USDT' ? 'w-full h-full object-cover p-2' : 'w-14 h-14 object-contain'}`} />
              ) : (
                <span className="text-4xl">{assetData.emoji || '🪙'}</span>
              )}
            </div>
            {assetData.verified && assetData.symbol !== 'USDT' && (
              <div className="absolute -bottom-2 -right-2 bg-emerald-500 rounded-full p-1 border-2 border-white dark:border-[#050505]">
                <ShieldCheck size={12} className="text-white" />
              </div>
            )}
            {assetData.symbol === 'USDT' && (
              <div className="absolute -bottom-2 -right-2 bg-white dark:bg-[#050505] rounded-full p-[3px] border border-gray-100 dark:border-white/10 shadow-lg">
                <img src={CHAIN_META[evmChain]?.logo || CHAIN_META.ethereum.logo} alt="Network" className="w-6 h-6 rounded-full object-cover" />
              </div>
            )}
          </div>
          <div>
            <h1 className={`text-4xl font-bold tracking-tight text-gray-900 dark:text-white transition-opacity duration-300 ${isNetworkModalOpen ? 'opacity-30' : 'opacity-100'}`}>
              {assetData.type === 'RZC'
                ? parseFloat(activeBalance).toLocaleString()
                : formatBalance(activeBalance, assetData.decimals)
              }
              {' '}
              <span className="text-gray-400 dark:text-zinc-400 text-3xl">{(assetData.type === 'ETH' || assetData.type === 'EVM') && assetData.symbol !== 'USDT' ? (CHAIN_META[evmChain]?.symbol || 'ETH') : assetData.symbol}</span>
            </h1>
            {assetData.price && (
              <p className="text-base font-semibold text-gray-500 dark:text-zinc-400 mt-1">
                ≈ ${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}
            {assetData.price && (
              <div className={`inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full text-xs font-bold ${isPositive
                  ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400'
                }`}>
                {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {isPositive ? '+' : ''}{priceChange.toFixed(2)}% (24h)
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => navigate('/wallet/transfer', {
              state: {
                asset: assetData.type === 'JETTON' ? 'JETTON'
                  : assetData.type === 'RZC' ? 'RZC'
                    : assetData.type === 'BTC' ? 'BTC'
                      : assetData.type === 'SOL' ? 'SOL'
                        : assetData.type === 'TRON' ? 'TRON'
                          : assetData.type === 'ETH' || assetData.type === 'EVM'
                            ? (assetData.symbol === 'USDT' ? 'USDT' : 'EVM')
                            : 'TON',
                ...(assetData.type === 'JETTON' && {
                  jettonAddress: assetData.address,
                  jettonName: assetData.name,
                  jettonSymbol: assetData.symbol,
                  jettonDecimals: assetData.decimals,
                  jettonBalance: assetData.balance,
                  jettonWalletAddress: assetData.address
                })
              }
            })}
            className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/5 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all group shadow-sm"
          >
            <div className="w-11 h-11 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-[0_4px_14px_rgba(59,130,246,0.4)] group-hover:scale-110 transition-transform">
              <ArrowUpRight size={18} />
            </div>
            <span className="text-xs font-bold text-gray-600 dark:text-zinc-400">Send</span>
          </button>
          <button
            onClick={() => navigate('/wallet/receive', {
              state: {
                preselect: assetData.type === 'BTC' ? 'multichain-btc'
                  : assetData.type === 'SOL' ? 'multichain-sol'
                    : assetData.type === 'TRON' ? 'multichain-tron'
                      : assetData.type === 'ETH' || assetData.type === 'EVM'
                        ? (assetData.symbol === 'USDT' ? 'multichain-usdt' : 'multichain-evm')
                        : assetData.type === 'RZC' ? 'primary-rzc'
                          : assetData.name === 'TON (W5)' ? 'multichain-ton'
                            : 'primary'
              }
            })}
            className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/5 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all group shadow-sm"
          >
            <div className="w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-[0_4px_14px_rgba(16,185,129,0.4)] group-hover:scale-110 transition-transform">
              <ArrowDownLeft size={18} />
            </div>
            <span className="text-xs font-bold text-gray-600 dark:text-zinc-400">Receive</span>
          </button>
          <button
            onClick={() => navigate('/wallet/swap')}
            className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/5 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all group shadow-sm"
          >
            <div className="w-11 h-11 rounded-full bg-amber-500 flex items-center justify-center text-white shadow-[0_4px_14px_rgba(245,158,11,0.4)] group-hover:scale-110 transition-transform">
              <Repeat size={18} />
            </div>
            <span className="text-xs font-bold text-gray-600 dark:text-zinc-400">Swap</span>
          </button>
        </div>

        {/* Price Chart */}
        {assetData.price && priceHistory.length > 0 && (
          <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/5 rounded-3xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={15} className="text-blue-500" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  {assetData.symbol === 'USDT'
                    ? `USDT · Stable $${(assetData.price || 1.0).toFixed(2)}`
                    : (assetData.type === 'ETH' || assetData.type === 'EVM')
                      ? `${CHAIN_META[evmChain]?.symbol ?? 'ETH'} Price Performance`
                      : 'Price Performance'}
                </h3>
              </div>
              <span className="text-xs font-medium text-gray-400 dark:text-zinc-500">24h</span>
            </div>
            <div className="h-[160px] w-full">
              {isChartLoading ? (
                <div className="h-full flex items-center justify-center">
                  <RefreshCw size={22} className="animate-spin text-gray-300 dark:text-zinc-700" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={priceHistory}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isPositive ? "#10b981" : "#f43f5e"} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={isPositive ? "#10b981" : "#f43f5e"} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <YAxis domain={['auto', 'auto']} hide />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--tw-bg, #fff)',
                        border: '1px solid rgba(0,0,0,0.08)',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
                      }}
                      itemStyle={{ color: '#374151' }}
                      formatter={(value: number) => [`$${value.toFixed(4)}`, 'Price']}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke={isPositive ? "#10b981" : "#f43f5e"}
                      fillOpacity={1}
                      fill="url(#colorPrice)"
                      strokeWidth={2.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-white/5">
              {['1H', '1D', '1W', '1M', '1Y', 'ALL'].map((period) => (
                <button
                  key={period}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${period === '1D'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-400 dark:text-zinc-600 hover:text-gray-700 dark:hover:text-zinc-300'
                    }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Asset Info */}
        {(assetData.address || assetData.type !== 'JETTON') && (
          <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/5 rounded-3xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5 flex items-center gap-2">
              <Zap size={15} className="text-blue-500" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Asset Information</h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-white/5">
              {/* Network */}
              <div className="px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe size={13} className="text-gray-400" />
                  <span className="text-sm text-gray-500 dark:text-zinc-400 font-medium">Network</span>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{networkLabel}</span>
              </div>
              {/* Status */}
              <div className="px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={13} className="text-gray-400" />
                  <span className="text-sm text-gray-500 dark:text-zinc-400 font-medium">Status</span>
                </div>
                <span className={`text-sm font-bold ${assetData.verified ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {assetData.verified ? '✓ Verified' : 'Unverified'}
                </span>
              </div>
              {/* Price */}
              {assetData.price && (
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={13} className="text-gray-400" />
                    <span className="text-sm text-gray-500 dark:text-zinc-400 font-medium">Unit Price</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    ${assetData.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                  </span>
                </div>
              )}
              {/* Contract address */}
              {assetData.address && (
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Copy size={13} className="text-gray-400" />
                    <span className="text-sm text-gray-500 dark:text-zinc-400 font-medium">Contract</span>
                  </div>
                  <button
                    onClick={handleCopyAddress}
                    className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {assetData.address.slice(0, 6)}…{assetData.address.slice(-6)}
                  </button>
                </div>
              )}
              {/* Explorer */}
              {assetData.address && (
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ExternalLink size={13} className="text-gray-400" />
                    <span className="text-sm text-gray-500 dark:text-zinc-400 font-medium">Explorer</span>
                  </div>
                  <button
                    onClick={() => window.open(getExplorerUrl(assetData.address!, network), '_blank')}
                    className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    View on Tonscan ↗
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleCopyAddress}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/5 rounded-2xl text-sm font-bold text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-all shadow-sm active:scale-95"
          >
            <Copy size={15} />
            Copy Address
          </button>
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/5 rounded-2xl text-sm font-bold text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-all shadow-sm active:scale-95"
          >
            <Share2 size={15} />
            Share
          </button>
        </div>

        {/* Transaction History */}
        <div className="space-y-3 pb-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <History size={15} className="text-gray-400" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Transaction History</h3>
            </div>
            {assetTransactions.length > 0 && (
              <button
                onClick={() => navigate('/wallet/history')}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                View All
              </button>
            )}
          </div>

          {txLoading ? (
            <div className="space-y-2">
              <LoadingSkeleton height={72} />
              <LoadingSkeleton height={72} />
              <LoadingSkeleton height={72} />
            </div>
          ) : assetTransactions.length === 0 ? (
            <div className="py-12 flex flex-col items-center text-center bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/5 rounded-3xl shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-3">
                <History size={24} className="text-gray-300 dark:text-zinc-600" />
              </div>
              <h4 className="text-sm font-bold text-gray-700 dark:text-white mb-1">No transactions yet</h4>
              <p className="text-xs text-gray-400 dark:text-zinc-500">
                Your {assetData.symbol} transactions will appear here
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/5 rounded-3xl overflow-hidden shadow-sm divide-y divide-gray-100 dark:divide-white/5">
              {assetTransactions.slice(0, 10).map((tx) => {
                const isIncoming = tx.type === 'receive' || tx.type === 'purchase';
                const isRZC = tx.asset === 'RZC';
                const canOpenExplorer = !isRZC && !!tx.hash;

                const typeLabel = tx.type === 'purchase' ? 'Received'
                  : tx.type === 'receive' ? 'Received'
                    : tx.type === 'send' ? 'Sent' : tx.type;

                const subLabel = tx.counterpartyUsername
                  ? `@${tx.counterpartyUsername}`
                  : tx.comment
                    ? tx.comment
                    : new Date(tx.timestamp).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    });

                return (
                  <div
                    key={tx.id}
                    onClick={() => canOpenExplorer && window.open(getTransactionUrl(tx.hash!, network), '_blank')}
                    className={`px-5 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-all group ${canOpenExplorer ? 'cursor-pointer' : 'cursor-default'
                      }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isIncoming
                          ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        }`}>
                        {isIncoming ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white capitalize">{typeLabel}</p>
                        <p className="text-xs text-gray-400 dark:text-zinc-500 truncate mt-0.5">{subLabel}</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <div>
                        <p className={`text-sm font-bold ${isIncoming ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                          {isIncoming ? '+' : '-'}{tx.amount}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">{tx.asset}</p>
                      </div>
                      {canOpenExplorer && (
                        <ExternalLink size={13} className="text-gray-300 dark:text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssetDetail;
