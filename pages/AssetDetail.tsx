import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary';
import {
  ArrowLeft,
  Send,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  Activity,
  History,
  Repeat,
  RefreshCw,
  ChevronDown,
  ExternalLink
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { CHAIN_META, getNetworkConfig } from '../constants';
import { useTransactions } from '../hooks/useTransactions';
import { useToast } from '../context/ToastContext';
import { getExplorerUrl, getTransactionUrl } from '../constants';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip } from 'recharts';
import { supabaseService } from '../services/supabaseService';
import { formatBalance, parseBalanceToNumber, formatAssetBalance } from '../utils/balanceFormatter';
import { usdtMultiChainService } from '../services/usdtMultiChainService';
import { tetherWdkService } from '../services/tetherWdkService';
import { safeGet } from '../utils/safeAccess';

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

/**
 * Validate and sanitize CoinGecko price history data
 */
function validatePriceHistory(data: any[]): { time: number; price: number }[] {
  if (!Array.isArray(data)) {
    console.warn('[CoinGecko] Invalid data format: not an array');
    return [];
  }

  const validated: { time: number; price: number }[] = [];

  for (const item of data) {
    // Expect [timestamp, price] format
    if (!Array.isArray(item) || item.length < 2) {
      continue;
    }

    const [ts, price] = item;

    // Validate timestamp
    if (typeof ts !== 'number' || !isFinite(ts) || ts <= 0) {
      continue;
    }

    // Validate price
    if (typeof price !== 'number' || !isFinite(price) || price < 0 || isNaN(price)) {
      continue;
    }

    validated.push({ time: ts, price });
  }

  return validated;
}

/**
 * Map time range to CoinGecko API parameters
 */
function getTimeRangeParams(timeRange: '1H' | '1D' | '1W' | '1M' | '1Y' | 'ALL'): { days: string; interval: string } {
  switch (timeRange) {
    case '1H':
      return { days: '0.042', interval: 'minutely' }; // ~1 hour (1/24 day)
    case '1D':
      return { days: '1', interval: 'hourly' };
    case '1W':
      return { days: '7', interval: 'hourly' };
    case '1M':
      return { days: '30', interval: 'daily' };
    case '1Y':
      return { days: '365', interval: 'daily' };
    case 'ALL':
      return { days: 'max', interval: 'daily' };
    default:
      return { days: '1', interval: 'hourly' };
  }
}

/**
 * Fetch price history from CoinGecko with comprehensive validation and error handling
 */
async function fetchCoinGeckoHistory(
  coinId: string,
  timeRange: '1H' | '1D' | '1W' | '1M' | '1Y' | 'ALL' = '1D',
  retries = 2
): Promise<{ time: number; price: number }[]> {
  const { days, interval } = getTimeRangeParams(timeRange);
  const url =
    `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart` +
    `?vs_currency=usd&days=${days}&interval=${interval}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      // Handle rate limiting
      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 2000 * (attempt + 1);

        console.warn(`[CoinGecko] Rate limited, retrying after ${waitTime}ms...`);

        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        throw new Error('CoinGecko rate limit exceeded');
      }

      if (!res.ok) {
        throw new Error(`CoinGecko HTTP ${res.status}`);
      }

      const data = await res.json();

      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format');
      }

      if (!data.prices || !Array.isArray(data.prices)) {
        throw new Error('Missing or invalid prices array');
      }

      // Validate and sanitize price data
      const validated = validatePriceHistory(data.prices);

      if (validated.length === 0) {
        throw new Error('No valid price data after validation');
      }

      console.log(`✅ CoinGecko: Fetched ${validated.length} valid price points for ${coinId}`);
      return validated;

    } catch (error: any) {
      // Don't retry on abort
      if (error.name === 'AbortError') {
        console.warn('[CoinGecko] Request timeout');
        throw new Error('Request timeout');
      }

      // Last attempt - throw error
      if (attempt === retries) {
        console.error(`[CoinGecko] Failed after ${retries + 1} attempts:`, error.message);
        throw error;
      }

      // Wait before retry
      const backoff = 1000 * Math.pow(2, attempt);
      console.warn(`[CoinGecko] Attempt ${attempt + 1} failed, retrying in ${backoff}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoff));
    }
  }

  // Should never reach here, but TypeScript needs it
  throw new Error('Failed to fetch price history');
}

/**
 * Generate mock price history for fallback
 */
function generateMockPriceHistory(
  currentPrice: number,
  points = 24
): { time: number; price: number }[] {
  const now = Date.now();
  const hourMs = 60 * 60 * 1000;

  return Array.from({ length: points }, (_, i) => {
    const time = now - (points - i - 1) * hourMs;
    // Add small random variation (±2%)
    const variation = 1 + (Math.random() - 0.5) * 0.04;
    const price = currentPrice * variation;

    return { time, price };
  });
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
  const { address, network, refreshData, setIsNetworkModalOpen, multiChainBalances, isNetworkModalOpen, currentEvmChain, userProfile } = useWallet();
  const { showToast } = useToast();
  const { transactions, isLoading: txLoading, refreshTransactions } = useTransactions();

  const assetData = location.state as AssetDetailProps;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1H' | '1D' | '1W' | '1M' | '1Y' | 'ALL'>('1D');
  const evmChain = currentEvmChain;
  const [activeBalance, setActiveBalance] = useState<string>(assetData?.balance || '0');
  const [isNetworkSwitching, setIsNetworkSwitching] = useState(false);

  // RZC-specific direct transaction fetch (bypasses useTransactions hook userId race)
  const [rzcTxHistory, setRzcTxHistory] = useState<any[]>([]);
  const [rzcTxLoading, setRzcTxLoading] = useState(false);

  // ── USDT MULTI-CHAIN DETAIL BREAKOUT STATES ─────────────────────────────────
  const [usdtBreakdown, setUsdtBreakdown] = useState<{
    ton: string;
    bsc: string;
    ethereum: string;
    tron: string;
    total: string;
  } | null>(null);
  const [derivedEvmAddr, setDerivedEvmAddr] = useState<string | null>(null);
  const [derivedTronAddr, setDerivedTronAddr] = useState<string | null>(null);
  const [isLoadingBreakdown, setIsLoadingBreakdown] = useState(false);
  const [activeChainFilter, setActiveChainFilter] = useState<'all' | 'ton' | 'bsc' | 'ethereum' | 'tron'>('all');
  const [usdtTransactions, setUsdtTransactions] = useState<any[]>([]);
  const [isLoadingUsdtTxs, setIsLoadingUsdtTxs] = useState(false);
  const isSecondary = useMemo(() => {
    const activeWalletType = typeof localStorage !== 'undefined' ? localStorage.getItem('rhiza_active_wallet_type') : null;
    return activeWalletType === 'secondary';
  }, []);

  const fetchUsdtData = useCallback(async () => {
    if (!address || assetData?.symbol !== 'USDT') return;

    setIsLoadingBreakdown(true);
    setIsLoadingUsdtTxs(true);

    try {
      // 1. Derive EVM and TRON addresses
      const evmAddr = await usdtMultiChainService.deriveEvmAddress(address);
      setDerivedEvmAddr(evmAddr);

      const addrs = await tetherWdkService.getAddresses();
      const tronAddr = addrs?.tronAddress ?? null;
      setDerivedTronAddr(tronAddr);

      // 2. Fetch balances
      const balances = await usdtMultiChainService.getUSDTBalances(address, evmAddr, tronAddr || null, network as 'mainnet' | 'testnet');
      setUsdtBreakdown(balances);

      // 3. Fetch unified transactions
      // a) TON transactions from TonAPI (filtered for USDT)
      let tonUsdtTxs: any[] = [];
      try {
        const config = getNetworkConfig(network);
        const tonApiEndpoint = network === 'mainnet' ? 'https://tonapi.io/v2' : 'https://testnet.tonapi.io/v2';
        const USDT_JETTON_MASTER = 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs';

        const response = await fetch(`${tonApiEndpoint}/accounts/${address}/jettons/${USDT_JETTON_MASTER}/history?limit=30`, {
          headers: { 'Authorization': `Bearer ${config.TONAPI_KEY}` }
        });

        if (response.ok) {
          const data = await response.json();
          for (const evt of data.events || []) {
            for (const act of evt.actions || []) {
              if (act.type === 'JettonTransfer' && act.JettonTransfer) {
                const transfer = act.JettonTransfer;
                const isIncoming = transfer.recipient?.address === address;
                const amt = (Number(transfer.amount) / 1e6).toFixed(2);
                tonUsdtTxs.push({
                  id: evt.event_id || evt.lt?.toString(),
                  type: isIncoming ? 'receive' : 'send',
                  amount: amt,
                  asset: 'USDT',
                  timestamp: evt.timestamp * 1000,
                  status: evt.in_progress ? 'pending' : 'completed',
                  address: isIncoming ? transfer.sender?.address : transfer.recipient?.address,
                  hash: evt.event_id,
                  fee: evt.extra ? (Number(evt.extra) / 1e9).toFixed(4) : '0',
                  comment: transfer.comment || '',
                  chain: 'ton'
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn('⚠️ TON USDT Jetton transaction fetch failed:', err);
      }

      // b) EVM transactions from Supabase (filtered for USDT)
      let evmUsdtTxs: any[] = [];
      if (evmAddr) {
        try {
          const result = await supabaseService.getTransactions(evmAddr, 50);
          if (result.success && result.data) {
            evmUsdtTxs = result.data
              .filter(tx => tx.asset === 'USDT')
              .map(tx => ({
                id: tx.id,
                type: tx.type,
                amount: tx.amount,
                asset: 'USDT',
                timestamp: tx.metadata?.timestamp ? Number(tx.metadata.timestamp) * 1000 : new Date(tx.created_at).getTime(),
                status: tx.status === 'confirmed' ? 'completed' : tx.status,
                address: tx.type === 'send' ? tx.to_address : tx.from_address,
                hash: tx.tx_hash,
                fee: tx.metadata?.fee || '0',
                comment: tx.metadata?.network || 'EVM',
                chain: tx.metadata?.chain || 'ethereum'
              }));
          }
        } catch (err) {
          console.warn('⚠️ EVM USDT transaction fetch failed:', err);
        }
      }

      // c) TRON transactions from TronGrid API
      let tronUsdtTxs: any[] = [];
      if (tronAddr) {
        try {
          const baseUrl = network === 'mainnet' ? 'https://api.trongrid.io' : 'https://api.shasta.trongrid.io';
          const TRON_USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
          const response = await fetch(`${baseUrl}/v1/accounts/${tronAddr}/transactions/trc20?contract_address=${TRON_USDT_CONTRACT}&limit=50`);
          if (response.ok) {
            const data = await response.json();
            for (const tx of data.data || []) {
              const isIncoming = tx.to === tronAddr;
              const amt = (Number(tx.value) / 1e6).toFixed(2);
              tronUsdtTxs.push({
                id: tx.transaction_id,
                type: isIncoming ? 'receive' : 'send',
                amount: amt,
                asset: 'USDT',
                timestamp: tx.block_timestamp,
                status: 'completed',
                address: isIncoming ? tx.from : tx.to,
                hash: tx.transaction_id,
                fee: '0',
                comment: 'TRC-20',
                chain: 'tron'
              });
            }
          }
        } catch (err) {
          console.warn('⚠️ TRON USDT transaction fetch failed:', err);
        }
      }

      // d) Merge and sort
      const merged = [...tonUsdtTxs, ...evmUsdtTxs, ...tronUsdtTxs].sort((a, b) => b.timestamp - a.timestamp);
      setUsdtTransactions(merged);
    } catch (e) {
      console.error('❌ Failed to fetch multi-chain USDT breakdown:', e);
      showToast('Failed to load multi-chain USDT assets', 'error');
    } finally {
      setIsLoadingBreakdown(false);
      setIsLoadingUsdtTxs(false);
    }
  }, [address, network, isSecondary, assetData?.symbol, showToast]);

  useEffect(() => {
    if (assetData?.symbol === 'USDT') {
      fetchUsdtData();
    }
  }, [assetData?.symbol, fetchUsdtData]);

  const fetchRzcHistory = useCallback(async (signal?: AbortSignal) => {
    if (!address || !userProfile?.id) return;

    setRzcTxLoading(true);
    try {
      const result = await supabaseService.getRZCTransactions(userProfile.id, 50);

      if (signal?.aborted) return;

      if (result.success && result.data) {
        setRzcTxHistory(result.data);
      }
    } catch (err) {
      if ((err as any).name === 'AbortError') return;
      console.error('Failed to fetch RZC history:', err);
    } finally {
      if (!signal?.aborted) {
        setRzcTxLoading(false);
      }
    }
  }, [address, userProfile?.id]);

  useEffect(() => {
    if (assetData?.type !== 'RZC') return;

    const controller = new AbortController();
    fetchRzcHistory(controller.signal);

    return () => controller.abort();
  }, [assetData?.type, fetchRzcHistory]);

  // ── CONSOLIDATED BALANCE RESOLUTION ──────────────────────────────────────────
  // Single source of truth for balance updates — eliminates race conditions
  const resolveActiveBalance = useCallback((): string => {
    if (!assetData) return '0';

    // RZC balance comes from assetData (already set from userProfile)
    if (assetData.type === 'RZC') {
      return assetData.balance;
    }

    // Multi-chain balances take priority when available
    if (!multiChainBalances) {
      return assetData.balance;
    }

    switch (assetData.type) {
      case 'TON':
        // WDK W5 wallet balance
        if (!multiChainBalances.ton) return assetData.balance;

        const wdkTon = parseFloat(multiChainBalances.ton);
        if (wdkTon <= 0) return assetData.balance;

        // Navigation sources differ:
        //   - Dashboard (decimals=0):  balance is human-readable float, e.g. "5.2342"
        //   - Assets.tsx (decimals=9): balance is nanotons, e.g. "5234200000"
        if (assetData.decimals === 0) {
          return multiChainBalances.ton; // Human-readable float
        } else {
          return Math.round(wdkTon * 1e9).toString(); // Convert to nanotons
        }

      case 'EVM':
      case 'ETH':
        // USDT uses dedicated balance, native tokens use EVM balance
        return assetData.symbol === 'USDT'
          ? multiChainBalances.usdt
          : multiChainBalances.evm;

      case 'SOL':
        return multiChainBalances.sol;

      case 'TRON':
        return multiChainBalances.tron;

      case 'BTC':
        return multiChainBalances.btc;

      default:
        return assetData.balance;
    }
  }, [assetData, multiChainBalances]);

  // Single useEffect to update activeBalance whenever dependencies change
  useEffect(() => {
    const newBalance = resolveActiveBalance();
    setActiveBalance(newBalance);
  }, [resolveActiveBalance]);

  // ── NETWORK SWITCH DETECTION ─────────────────────────────────────────────────
  // Listen for EVM network changes and refresh balance
  useEffect(() => {
    const handleNetworkChange = async () => {
      setIsNetworkSwitching(true);

      // Refresh balance after network switch
      try {
        await refreshData(false, true);
      } catch (err) {
        console.error('Failed to refresh after network switch:', err);
      } finally {
        setTimeout(() => setIsNetworkSwitching(false), 500);
      }
    };

    window.addEventListener('evm-network-changed', handleNetworkChange);
    return () => window.removeEventListener('evm-network-changed', handleNetworkChange);
  }, [refreshData]);

  useEffect(() => {
    // USDT is a stablecoin — show a flat $1 line, no API call needed
    if (assetData?.symbol === 'USDT') {
      setPriceHistory(generateMockPriceHistory(assetData.price || 1.0, 24));
      setIsChartLoading(false);
      return;
    }

    if (!assetData || assetData.type === 'RZC' || assetData.type === 'JETTON') {
      setPriceHistory(generateMockPriceHistory(assetData?.price || 0, 24));
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

        const coinId = safeGet(COINGECKO_IDS, symbol);
        if (!coinId) {
          console.warn(`[PriceChart] No CoinGecko ID for ${symbol}, using mock data`);
          throw new Error(`No CoinGecko ID for ${symbol}`);
        }

        const history = await fetchCoinGeckoHistory(coinId, selectedTimeRange);

        if (history.length > 0) {
          setPriceHistory(history);
          console.log(`✅ Price chart loaded: ${history.length} points for ${symbol} (${selectedTimeRange})`);
        } else {
          throw new Error('Empty history after validation');
        }
      } catch (err: any) {
        console.warn(`[PriceChart] Falling back to mock data:`, err.message);

        // Use mock data as fallback
        setPriceHistory(generateMockPriceHistory(assetData.price || 0, 24));

        // Show user-friendly message for rate limiting
        if (err.message?.includes('rate limit')) {
          showToast('Price chart temporarily unavailable', 'info');
        }
      } finally {
        setIsChartLoading(false);
      }
    };

    fetchHistory();
  }, [assetData, evmChain, selectedTimeRange, showToast]);

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
      // Fallback: copy the page URL when Web Share API is not available
      navigator.clipboard.writeText(window.location.href).catch(() => {});
      showToast('Link copied!', 'success');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);

    try {
      // Execute all refresh operations in parallel
      await Promise.all([
        refreshData(false, true),  // force-bust cache so deposits reflect immediately
        (async () => {
          refreshTransactions();
          // refreshTransactions is not async, but we wrap it for consistency
        })(),
        assetData?.type === 'RZC' ? fetchRzcHistory() : Promise.resolve(),
        assetData?.symbol === 'USDT' ? fetchUsdtData() : Promise.resolve()
      ]);

      showToast('Balance updated', 'success');
    } catch (err) {
      console.error('Refresh failed:', err);
      showToast('Failed to refresh balance', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  // ── BALANCE CALCULATIONS ─────────────────────────────────────────────────────
  // Use the new balance formatter for precision-safe calculations

  const balanceNum = (() => {
    const raw = assetData.type === 'RZC'
      ? parseFloat(activeBalance) // RZC is already in human-readable format
      : parseBalanceToNumber(activeBalance, assetData.decimals);
    return isNaN(raw) || !isFinite(raw) ? 0 : raw;
  })();

  const usdValue = assetData.price ? balanceNum * assetData.price : 0;

  const assetTransactions = transactions.filter(tx => {
    if (assetData.type === 'TON') return tx.asset === 'TON';
    if (assetData.type === 'RZC') return tx.asset === 'RZC';
    if (assetData.type === 'BTC') return tx.asset === 'BTC';
    if (assetData.type === 'SOL') return tx.asset === 'SOL';
    if (assetData.type === 'TRON') return tx.asset === 'TRX';
    if (assetData.type === 'ETH' || assetData.type === 'EVM') {
      // Match the native EVM symbol for the active chain (ETH, BNB, MATIC, AVAX…)
      const evmSymbol = CHAIN_META[evmChain]?.symbol ?? 'ETH';
      return tx.asset === evmSymbol || tx.asset === 'ETH';
    }
    if (assetData.type === 'JETTON') return tx.asset === assetData.symbol;
    return tx.asset === assetData.symbol;
  });

  const firstPrice = priceHistory.length > 0 ? (priceHistory[0]?.price ?? 0) : 0;
  const lastPrice = priceHistory.length > 0 ? (priceHistory.at(-1)?.price ?? 0) : 0;
  const isPositive = lastPrice >= firstPrice;
  const priceChange = priceHistory.length > 1 && firstPrice > 0
    ? ((lastPrice - firstPrice) / firstPrice) * 100
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

  const accentClasses: Record<string, { bg: string; border: string; text: string; badge: string; hex: string }> = {
    orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-500 dark:text-orange-400', badge: 'bg-orange-500', hex: '#f97316' },
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-500 dark:text-blue-400', badge: 'bg-blue-600', hex: '#3b82f6' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-500 dark:text-emerald-400', badge: 'bg-emerald-500', hex: '#10b981' },
    violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-500 dark:text-violet-400', badge: 'bg-violet-600', hex: '#8b5cf6' },
    sky: { bg: 'bg-sky-500/10', border: 'border-sky-500/20', text: 'text-sky-500 dark:text-sky-400', badge: 'bg-sky-600', hex: '#0ea5e9' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-500 dark:text-purple-400', badge: 'bg-purple-600', hex: '#a855f7' },
    red: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-500 dark:text-red-400', badge: 'bg-red-600', hex: '#ef4444' },
  };

  const ac = accentClasses[accent];

  // C4: Extracted helper — shared by USDT and generic tx rows
  const getChainExplorerLink = (txHash: string, chain: string) => {
    if (chain === 'bsc') return `https://bscscan.com/tx/${txHash}`;
    if (chain === 'ethereum') return `https://etherscan.io/tx/${txHash}`;
    if (chain === 'tron') return `https://tronscan.org/#/transaction/${txHash}`;
    return getTransactionUrl(txHash, network);
  };

  if (assetData?.symbol === 'USDT') {

    // TON Jetton is the primary/main USDT balance
    const tonVal = parseFloat(usdtBreakdown?.ton || activeBalance || '0');
    const bscVal = parseFloat(usdtBreakdown?.bsc || '0');
    const ethVal = parseFloat(usdtBreakdown?.ethereum || '0');
    const tronVal = parseFloat(usdtBreakdown?.tron || '0');
    const allChainsTotal = parseFloat(usdtBreakdown?.total || '0');
    // Show cross-chain total pill only when other chains have a meaningful balance
    const hasMultiChain = allChainsTotal > tonVal + 0.001;

    const tonPct = allChainsTotal > 0 ? (tonVal / allChainsTotal) * 100 : 100;
    const bscPct = allChainsTotal > 0 ? (bscVal / allChainsTotal) * 100 : 0;
    const ethPct = allChainsTotal > 0 ? (ethVal / allChainsTotal) * 100 : 0;

    const filteredBreakdownTxs = usdtTransactions.filter(tx => {
      if (activeChainFilter === 'all') return true;
      return tx.chain === activeChainFilter;
    });

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white pb-28">
        {/* Compact Header */}
        <div className="sticky top-0 z-50 bg-gray-50/90 dark:bg-black/90 backdrop-blur-md px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate('/wallet/assets')}
            className="p-2 -ml-2 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-all"
          >
            <ArrowLeft size={22} />
          </button>
          <h2 className="text-[17px] font-semibold tracking-tight">Tether USD</h2>
          <button
            onClick={handleRefresh}
            className="p-2 -mr-2 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-all"
          >
            <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="max-w-xl mx-auto px-4 pt-8 pb-4 flex flex-col items-center relative">
          {/* Background Glow */}
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/20 rounded-full blur-[80px] pointer-events-none" />

          {/* Central Balance Area */}
          <div className="relative w-16 h-16 mb-5 group">
            <div className="absolute inset-0 bg-emerald-500 rounded-full blur-md opacity-40 group-hover:opacity-70 transition-opacity duration-500" />
            <div className="relative w-full h-full rounded-full bg-white dark:bg-[#111] shadow-xl border border-gray-100 dark:border-white/10 flex items-center justify-center overflow-hidden z-10 p-1">
              <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png" alt="USDT Logo" className="w-full h-full object-cover rounded-full" />
            </div>
          </div>
          
          <h1 className="text-[42px] font-black font-value font-glow tracking-tight flex items-baseline gap-1.5 text-gray-900 dark:text-white drop-shadow-sm">
            {tonVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-[20px] text-gray-400 font-bold tracking-normal">USDT</span>
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="px-3 py-1 bg-gray-100/50 dark:bg-white/5 rounded-full border border-gray-200/50 dark:border-white/5 backdrop-blur-sm">
              <p className="text-[14px] text-gray-500 dark:text-zinc-400 font-medium">TON Jetton · ≈ ${tonVal.toFixed(2)}</p>
            </div>
            {hasMultiChain && (
              <div className="px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                <p className="text-[13px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  +${(allChainsTotal - tonVal).toFixed(2)} other chains
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-6 mt-8 w-full">
            <button
              onClick={() => navigate('/wallet/transfer', { state: { asset: 'USDT' } })}
              aria-label="Send USDT"
              className="flex flex-col items-center gap-2.5 group outline-none"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-white to-gray-50 dark:from-[#222] dark:to-[#111] shadow-sm border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-700 dark:text-gray-300 group-hover:scale-105 group-hover:border-emerald-500/50 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 group-active:scale-95 transition-all duration-300 relative overflow-hidden">
                <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <ArrowUpRight size={22} className="relative z-10" />
              </div>
              <span className="text-[13px] font-bold text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Send</span>
            </button>
            <button
              onClick={() => navigate('/wallet/receive', { state: { preselect: 'multichain-usdt' } })}
              aria-label="Receive USDT"
              className="flex flex-col items-center gap-2.5 group outline-none"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-white to-gray-50 dark:from-[#222] dark:to-[#111] shadow-sm border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-700 dark:text-gray-300 group-hover:scale-105 group-hover:border-emerald-500/50 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 group-active:scale-95 transition-all duration-300 relative overflow-hidden">
                <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <ArrowDownLeft size={22} className="relative z-10" />
              </div>
              <span className="text-[13px] font-bold text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Receive</span>
            </button>
            <button
              onClick={() => navigate('/wallet/swap')}
              aria-label="Swap USDT"
              className="flex flex-col items-center gap-2.5 group outline-none"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-white to-gray-50 dark:from-[#222] dark:to-[#111] shadow-sm border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-700 dark:text-gray-300 group-hover:scale-105 group-hover:border-emerald-500/50 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 group-active:scale-95 transition-all duration-300 relative overflow-hidden">
                <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <Repeat size={22} className="relative z-10" />
              </div>
              <span className="text-[13px] font-bold text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Swap</span>
            </button>
          </div>
        </div>

        <div className="max-w-xl mx-auto px-4 mt-6 space-y-6">
          {/* Multi-Chain Portfolio List */}
          <div>
            <h3 className="text-[14px] font-bold text-gray-900 dark:text-white mb-3 pl-1 uppercase tracking-wider opacity-80">Portfolio Breakdown</h3>
            <div className="bg-white/50 dark:bg-[#111]/50 backdrop-blur-xl rounded-3xl border border-gray-200/80 dark:border-white/10 overflow-hidden shadow-lg shadow-black/5 dark:shadow-none">
              
              <div className="group flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/5 hover:bg-white dark:hover:bg-white/5 transition-colors duration-300">
                <div className="flex items-center gap-3.5">
                  <div className="relative">
                    <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ton/info/logo.png" alt="TON" className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-[#111] z-10 relative shadow-sm" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[16px] font-bold text-gray-900 dark:text-white leading-tight">TON</p>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-500 text-white rounded-full leading-none">MAIN</span>
                    </div>
                    <p className="text-[13px] text-gray-500 font-medium tracking-wide">TON Jetton</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[16px] font-bold text-gray-900 dark:text-white leading-tight font-numbers">{tonVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p className="text-[13px] text-gray-500 font-medium font-numbers">${tonVal.toFixed(2)}</p>
                </div>
              </div>

              <div className="group flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/5 hover:bg-white dark:hover:bg-white/5 transition-colors duration-300">
                <div className="flex items-center gap-3.5">
                  <div className="relative">
                    <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/info/logo.png" alt="BSC" className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-[#111] z-10 relative shadow-sm" />
                  </div>
                  <div>
                    <p className="text-[16px] font-bold text-gray-900 dark:text-white leading-tight">BSC</p>
                    <p className="text-[13px] text-gray-500 font-medium tracking-wide">BEP-20</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[16px] font-bold text-gray-900 dark:text-white leading-tight font-numbers">{bscVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p className="text-[13px] text-gray-500 font-medium font-numbers">${bscVal.toFixed(2)}</p>
                </div>
              </div>

              <div className="group flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/5 hover:bg-white dark:hover:bg-white/5 transition-colors duration-300">
                <div className="flex items-center gap-3.5">
                  <div className="relative">
                    <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png" alt="ETH" className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-[#111] z-10 relative shadow-sm" />
                  </div>
                  <div>
                    <p className="text-[16px] font-bold text-gray-900 dark:text-white leading-tight">Ethereum</p>
                    <p className="text-[13px] text-gray-500 font-medium tracking-wide">ERC-20</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[16px] font-bold text-gray-900 dark:text-white leading-tight font-numbers">{ethVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p className="text-[13px] text-gray-500 font-medium font-numbers">${ethVal.toFixed(2)}</p>
                </div>
              </div>

              <div className="group flex items-center justify-between p-4 hover:bg-white dark:hover:bg-white/5 transition-colors duration-300">
                <div className="flex items-center gap-3.5">
                  <div className="relative">
                    <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/tron/info/logo.png" alt="TRON" className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-[#111] z-10 relative shadow-sm" />
                  </div>
                  <div>
                    <p className="text-[16px] font-bold text-gray-900 dark:text-white leading-tight">TRON</p>
                    <p className="text-[13px] text-gray-500 font-medium tracking-wide">TRC-20</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[16px] font-bold text-gray-900 dark:text-white leading-tight font-numbers">{tronVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p className="text-[13px] text-gray-500 font-medium font-numbers">${tronVal.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Transactions List */}
          <div>
            <div className="flex items-center justify-between pl-1 mb-4">
              <h3 className="text-[15px] font-bold text-gray-900 dark:text-white uppercase tracking-wider opacity-80">Transactions</h3>
              <div className="flex items-center gap-1 text-[12px] font-bold text-gray-500 bg-gray-100 dark:bg-white/5 rounded-full p-1 border border-gray-200/50 dark:border-white/5 shadow-inner">
                {(['all', 'ton', 'bsc', 'ethereum', 'tron'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveChainFilter(filter)}
                    className={`px-3 py-1 rounded-full transition-all duration-300 ${activeChainFilter === filter ? 'bg-white dark:bg-[#333] text-gray-900 dark:text-white shadow-sm scale-100' : 'hover:text-gray-700 dark:hover:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 scale-95 hover:scale-100'}`}
                  >
                    {filter === 'all' ? 'All' : filter === 'ethereum' ? 'ETH' : filter.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {isLoadingBreakdown || isLoadingUsdtTxs ? (
              <div className="space-y-2">
                <LoadingSkeleton height={68} />
                <LoadingSkeleton height={68} />
                <LoadingSkeleton height={68} />
              </div>
            ) : filteredBreakdownTxs.length === 0 ? (
              <div className="py-12 flex flex-col items-center text-center bg-white dark:bg-[#111] border border-gray-200 dark:border-white/5 rounded-2xl shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-3">
                  <History size={24} className="text-gray-300 dark:text-zinc-600" />
                </div>
                <h4 className="text-sm font-bold text-gray-700 dark:text-white mb-1">No Transactions</h4>
                <p className="text-[13px] text-gray-500">Your USDT history will appear here</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
                {filteredBreakdownTxs.map((tx, idx) => {
                  const isIncoming = tx.type === 'receive' || tx.type === 'purchase';
                  const chainLabel = tx.chain === 'bsc' ? 'BSC' : tx.chain === 'ethereum' ? 'ERC20' : tx.chain === 'tron' ? 'TRC20' : 'TON';

                  const dateStr = new Date(tx.timestamp).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <div
                      key={tx.id}
                      onClick={() => tx.hash && window.open(getChainExplorerLink(tx.hash, tx.chain), '_blank')}
                      onKeyDown={(e) => e.key === 'Enter' && tx.hash && window.open(getChainExplorerLink(tx.hash, tx.chain), '_blank')}
                      role="button"
                      tabIndex={0}
                      className={`flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400 ${idx !== filteredBreakdownTxs.length - 1 ? 'border-b border-gray-100 dark:border-white/5' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-700 dark:text-gray-300 shrink-0">
                          {isIncoming ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                        </div>
                        <div>
                          <p className="text-[15px] font-semibold text-gray-900 dark:text-white leading-tight flex items-center gap-2">
                            {isIncoming ? 'Receive' : 'Send'}
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 uppercase">{chainLabel}</span>
                          </p>
                          <p className="text-[13px] text-gray-500 font-medium mt-0.5">
                            {dateStr}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-[15px] font-semibold leading-tight ${isIncoming ? 'text-emerald-500 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
                          {isIncoming ? '+' : '-'}{tx.amount}
                        </p>
                        <p className="text-[13px] text-gray-500 font-medium">
                          ${(parseFloat(tx.amount) * 1).toFixed(2)}
                        </p>
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
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white pb-28">
      {/* Compact Header */}
      <div className="sticky top-0 z-50 bg-gray-50/90 dark:bg-black/90 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate('/wallet/assets')}
          className="p-2 -ml-2 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-all"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="flex flex-col items-center">
          <h2 className="text-[17px] font-semibold tracking-tight">{assetData.name}</h2>
          {assetData.type === 'ETH' || assetData.type === 'EVM' ? (
            <button
              onClick={() => setIsNetworkModalOpen(true)}
              className="flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white"
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ac?.badge || 'bg-blue-600'}`} />
              {CHAIN_META[evmChain]?.name || 'Unknown'} <ChevronDown size={10} />
            </button>
          ) : (
            <span className="text-[11px] font-medium text-gray-500">{networkLabel}</span>
          )}
        </div>
        <button
          onClick={handleRefresh}
          className="p-2 -mr-2 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-all"
        >
          <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-6 pb-4 flex flex-col items-center">

        {/* Central Balance Area */}
        <div className="w-14 h-14 rounded-full bg-white dark:bg-[#111] shadow-sm border border-gray-100 dark:border-white/5 flex items-center justify-center overflow-hidden mb-4 relative">
          {assetData.type === 'RZC' ? (
            <span className="text-emerald-500 font-black text-xl">RZC</span>
          ) : logo ? (
            <img src={assetData.type === 'ETH' || assetData.type === 'EVM' ? (CHAIN_META[evmChain]?.logo || logo) : logo} alt={assetData.symbol} className="w-full h-full object-cover rounded-full" />
          ) : (
            <span className="text-2xl">{assetData.emoji || '🪙'}</span>
          )}
          {assetData.verified && (
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-[2px] border-2 border-white dark:border-[#111]">
              <ShieldCheck size={10} className="text-white" />
            </div>
          )}
        </div>

        <h1 className={`text-[36px] font-bold font-value font-glow tracking-tight flex items-baseline gap-1.5 justify-center text-gray-900 dark:text-white transition-opacity duration-300 ${isNetworkModalOpen || isNetworkSwitching ? 'opacity-30' : 'opacity-100'}`}>
          {assetData.type === 'RZC'
            ? parseFloat(activeBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })
            : formatAssetBalance(activeBalance, assetData.type, assetData.decimals)
          }
          <span className="text-[18px] text-gray-400 font-semibold">
            {(assetData.type === 'ETH' || assetData.type === 'EVM') ? (CHAIN_META[evmChain]?.symbol || 'ETH') : assetData.symbol}
          </span>
        </h1>

        {assetData.price && (
          <div className="flex items-center gap-2 mt-0.5 text-base font-semibold text-gray-500 dark:text-zinc-400">
            <span>≈ ${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className={`text-sm ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
              {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
            </span>
          </div>
        )}

        {/* Clean Circular Action Buttons */}
        <div className="flex items-center justify-center gap-7 mt-8 w-full">
          <button
            onClick={() => navigate('/wallet/transfer', {
              state: {
                asset: assetData.type === 'JETTON' ? 'JETTON'
                  : assetData.type === 'RZC' ? 'RZC'
                    : assetData.type === 'BTC' ? 'BTC'
                      : assetData.type === 'SOL' ? 'SOL'
                        : assetData.type === 'TRON' ? 'TRON'
                          : assetData.type === 'ETH' || assetData.type === 'EVM'
                            ? 'EVM'
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
            aria-label={`Send ${assetData.symbol}`}
            className="flex flex-col items-center gap-2 group active:scale-95 transition-all"
          >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors group-hover:opacity-80 ${ac?.bg || 'bg-gray-200 dark:bg-white/10'} ${ac?.text || 'text-gray-900 dark:text-white'}`}>
              <ArrowUpRight size={24} />
            </div>
            <span className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">Send</span>
          </button>
          <button
            onClick={() => navigate('/wallet/receive', {
              state: {
                preselect: assetData.type === 'BTC' ? 'multichain-btc'
                  : assetData.type === 'SOL' ? 'multichain-sol'
                    : assetData.type === 'TRON' ? 'multichain-tron'
                      : assetData.type === 'ETH' || assetData.type === 'EVM'
                        ? 'multichain-evm'
                        : assetData.type === 'RZC' ? 'primary-rzc'
                          : assetData.name === 'TON (W5)' ? 'multichain-ton'
                            : 'primary'
              }
            })}
            aria-label={`Receive ${assetData.symbol}`}
            className="flex flex-col items-center gap-2 group active:scale-95 transition-all"
          >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors group-hover:opacity-80 ${ac?.bg || 'bg-gray-200 dark:bg-white/10'} ${ac?.text || 'text-gray-900 dark:text-white'}`}>
              <ArrowDownLeft size={24} />
            </div>
            <span className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">Receive</span>
          </button>
          <button
            onClick={() => navigate('/wallet/swap')}
            aria-label={`Swap ${assetData.symbol}`}
            className="flex flex-col items-center gap-2 group active:scale-95 transition-all"
          >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors group-hover:opacity-80 ${ac?.bg || 'bg-gray-200 dark:bg-white/10'} ${ac?.text || 'text-gray-900 dark:text-white'}`}>
              <Repeat size={24} />
            </div>
            <span className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">Swap</span>
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 mt-4 space-y-6">
        {/* Price Chart */}
        {assetData.price && priceHistory.length > 0 && (
          <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/5 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={15} className={ac?.text || 'text-blue-500'} />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  {(assetData.type === 'ETH' || assetData.type === 'EVM')
                    ? `${CHAIN_META[evmChain]?.symbol ?? 'ETH'} Price Performance`
                    : `${assetData.symbol} Price Performance`}
                </h3>
              </div>
              <span className="text-xs font-medium text-gray-400 dark:text-zinc-500">
                {selectedTimeRange === '1H' ? '1 Hour' :
                  selectedTimeRange === '1D' ? '24 Hours' :
                    selectedTimeRange === '1W' ? '7 Days' :
                      selectedTimeRange === '1M' ? '30 Days' :
                        selectedTimeRange === '1Y' ? '1 Year' : 'All Time'}
              </span>
            </div>
            <div className="h-[160px] w-full" role="img" aria-label={`${assetData.symbol} price chart, ${selectedTimeRange} period`}>
              {isChartLoading ? (
                <div className="h-full flex items-center justify-center">
                  <RefreshCw size={22} className="animate-spin text-gray-300 dark:text-zinc-700" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={priceHistory}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isPositive ? (ac?.hex || '#10b981') : '#f43f5e'} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={isPositive ? (ac?.hex || '#10b981') : '#f43f5e'} stopOpacity={0} />
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
                      formatter={(value: number) => [`$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`, 'Price']}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke={isPositive ? (ac?.hex || '#10b981') : '#f43f5e'}
                      fillOpacity={1}
                      fill="url(#colorPrice)"
                      strokeWidth={2.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex items-center flex-wrap gap-1.5 pt-2 border-t border-gray-100 dark:border-white/5">
              {(['1H', '1D', '1W', '1M', '1Y', 'ALL'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedTimeRange(period)}
                  disabled={isChartLoading}
                  className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all flex-shrink-0 ${period === selectedTimeRange
                    ? `${ac?.badge || 'bg-blue-600'} text-white shadow-sm`
                    : 'text-gray-400 dark:text-zinc-600 hover:text-gray-700 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/5'
                    } ${isChartLoading ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Transaction History */}
        <div className="space-y-3 pb-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <History size={15} className="text-gray-400" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Transaction History</h3>
            </div>
            {(assetData.type === 'RZC' ? rzcTxHistory.length > 10 : assetTransactions.length > 10) && (
              <button
                onClick={() => navigate('/wallet/history')}
                className={`text-xs font-bold hover:underline ${ac?.text || 'text-blue-600 dark:text-blue-400'}`}
              >
                View All
              </button>
            )}
          </div>

          {assetData.type === 'RZC' ? (
            rzcTxLoading ? (
              <div className="space-y-2">
                <LoadingSkeleton height={72} />
                <LoadingSkeleton height={72} />
                <LoadingSkeleton height={72} />
              </div>
            ) : rzcTxHistory.length === 0 ? (
              <div className="py-12 flex flex-col items-center text-center bg-white dark:bg-[#111] border border-gray-200 dark:border-white/5 rounded-2xl shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-3">
                  <History size={24} className="text-gray-300 dark:text-zinc-600" />
                </div>
                <h4 className="text-sm font-bold text-gray-700 dark:text-white mb-1">No RZC transactions yet</h4>
                <p className="text-xs text-gray-400 dark:text-zinc-500">Your RZC activity will appear here</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
                {rzcTxHistory.slice(0, 10).map((tx, idx) => {
                  const isCredit = tx.amount > 0;
                  const typeLabel: Record<string, string> = {
                    activation_bonus: 'Activation Bonus', signup_bonus: 'Signup Reward',
                    referral_bonus: 'Referral Reward', squad_mining: 'Squad Mining',
                    migration: 'Migration Credit', transfer_sent: 'Sent',
                    transfer_received: 'Received', transfer: 'Transfer',
                    purchase: 'Purchase', airdrop: 'Airdrop',
                  };
                  const label = safeGet(typeLabel, tx.type) ?? tx.type.replace(/_/g, ' ');
                  return (
                    <div key={tx.id} className={`px-4 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/[0.02] cursor-pointer transition-colors ${idx !== Math.min(rzcTxHistory.length, 10) - 1 ? 'border-b border-gray-100 dark:border-white/5' : ''}`}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isCredit ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                          {isCredit ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 dark:text-white capitalize">{label}</p>
                          <p className="text-xs text-gray-400 dark:text-zinc-500 truncate mt-0.5">
                            {new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {isCredit ? '+' : ''}{Math.abs(tx.amount).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">RZC</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : txLoading ? (
            <div className="space-y-2">
              <LoadingSkeleton height={72} />
              <LoadingSkeleton height={72} />
              <LoadingSkeleton height={72} />
            </div>
          ) : assetTransactions.length === 0 ? (
            <div className="py-12 flex flex-col items-center text-center bg-white dark:bg-[#111] border border-gray-200 dark:border-white/5 rounded-2xl shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-3">
                <History size={24} className="text-gray-300 dark:text-zinc-600" />
              </div>
              <h4 className="text-sm font-bold text-gray-700 dark:text-white mb-1">No transactions yet</h4>
              <p className="text-xs text-gray-400 dark:text-zinc-500">
                Your {assetData.symbol} transactions will appear here
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
              {assetTransactions.slice(0, 10).map((tx, idx) => {
                const isIncoming = tx.type === 'receive' || tx.type === 'purchase';
                const canOpenExplorer = !!tx.hash;
                const typeLabel = tx.type === 'purchase' ? 'Received' : tx.type === 'receive' ? 'Received' : tx.type === 'send' ? 'Sent' : tx.type;
                const subLabel = tx.counterpartyUsername
                  ? `@${tx.counterpartyUsername}`
                  : tx.comment
                    ? tx.comment
                    : new Date(tx.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                return (
                  <div
                    key={tx.id}
                    onClick={() => canOpenExplorer && window.open(getTransactionUrl(tx.hash!, network), '_blank')}
                    onKeyDown={(e) => e.key === 'Enter' && canOpenExplorer && window.open(getTransactionUrl(tx.hash!, network), '_blank')}
                    role={canOpenExplorer ? 'button' : undefined}
                    tabIndex={canOpenExplorer ? 0 : undefined}
                    className={`px-4 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group outline-none ${canOpenExplorer ? 'cursor-pointer focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400' : 'cursor-default'} ${idx !== Math.min(assetTransactions.length, 10) - 1 ? 'border-b border-gray-100 dark:border-white/5' : ''}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isIncoming ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                        {isIncoming ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white capitalize">{typeLabel}</p>
                        <p className="text-xs text-gray-400 dark:text-zinc-500 truncate mt-0.5">{subLabel}</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <div>
                        <p className={`text-sm font-bold ${isIncoming ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
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

// Wrap with Error Boundary for graceful error handling
function AssetDetailWithErrorBoundary() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <ErrorBoundary
      resetKeys={[location.pathname]}
      onError={(error, errorInfo) => {
        console.error('AssetDetail Error:', error, errorInfo);
        // In production, send to error tracking service
        // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
      }}
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-[#050505]">
          <div className="max-w-md w-full bg-white dark:bg-[#0a0a0a] border-2 border-red-200 dark:border-red-500/20 rounded-3xl p-6 shadow-lg">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-500/10 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">
              Failed to load asset details
            </h2>
            <p className="text-sm text-center text-gray-600 dark:text-gray-400 mb-6">
              We couldn't load the asset information. This might be due to a network issue or invalid data.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all active:scale-95"
              >
                Reload Page
              </button>
              <button
                onClick={() => navigate('/wallet/assets')}
                className="w-full py-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 rounded-xl font-bold transition-all active:scale-95"
              >
                Back to Assets
              </button>
            </div>
          </div>
        </div>
      }
    >
      <AssetDetail />
    </ErrorBoundary>
  );
}

export default AssetDetailWithErrorBoundary;
