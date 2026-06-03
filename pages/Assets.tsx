import { safeGet } from '../utils/safeAccess';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  Search,
  Coins,
  LayoutGrid,
  ExternalLink,
  Filter,
  AlertCircle,
  RefreshCw,
  Send,
  QrCode,
  ShieldCheck,
  TrendingUp,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { tonWalletService } from '../services/tonWalletService';
import { getExplorerUrl } from '../constants';
import LoadingSkeleton from '../components/LoadingSkeleton';

import VerificationBadge from '../components/VerificationBadge';
import { getJettonRegistryData, enhanceJettonData, getJettonPrice, getAllRegistryTokens, getJettonPriceChange } from '../services/jettonRegistry';
import TokenImage from '../components/TokenImage';
import { useToast } from '../context/ToastContext';
import { RZC_CONFIG } from '../config/rzcConfig';
import { useBalance } from '../hooks/useBalance';
import { CHAIN_META } from '../constants';
import { formatBalance, formatUsdValue as formatUsd, formatAssetBalance } from '../utils/balanceFormatter';
import { getRzcChange24h } from '../services/rzcPriceService';

interface Jetton {
  balance: string;
  jetton: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    image?: string;
    verification?: string;
    verified?: boolean;
    description?: string;
    emoji?: string; // Fallback emoji
  };
  price?: {
    usd: number;
  };
}

interface NFT {
  address: string;
  index: number;
  owner?: {
    address: string;
  };
  collection?: {
    address: string;
    name: string;
    description?: string;
  };
  verified: boolean;
  metadata: {
    name?: string;
    description?: string;
    image?: string;
    attributes?: Array<{
      trait_type: string;
      value: string;
    }>;
  };
  previews?: Array<{
    resolution: string;
    url: string;
  }>;
}

const Assets: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { address, network, balance: tonBalance, userProfile, refreshData, multiChainBalances, currentEvmChain, jettons: contextJettons } = useWallet();
  const { tonPrice, btcPrice, ethPrice, bnbPrice, maticPrice, avaxPrice, solPrice, tronPrice, usdtPrice, usdcPrice, rzcPrice, changePercent24h, assetChanges } = useBalance();

  // Pick the correct native token price for the active EVM chain
  const evmNativePrice: Record<string, number> = {
    ethereum: ethPrice,
    arbitrum: ethPrice,
    plasma: ethPrice,
    stable: ethPrice,
    sepolia: ethPrice,
    polygon: maticPrice,
    bsc: bnbPrice,
    avalanche: avaxPrice,
  };
  const activeEvmPrice = safeGet(evmNativePrice, currentEvmChain) ?? ethPrice;
  const { showToast } = useToast();
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'BTC' | 'TON' | 'USDT' | 'EUR'>('USD');
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'tokens' | 'nfts'>('tokens');

  // Close currency menu on outside click
  useEffect(() => {
    if (!showCurrencyMenu) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.assets-currency-selector')) {
        setShowCurrencyMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCurrencyMenu]);
  const [jettons, setJettons] = useState<Jetton[]>([]);
  const [nfts, setNFTs] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingNFTs, setIsLoadingNFTs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nftError, setNftError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tokenFilter, setTokenFilter] = useState<'all' | 'listed' | 'unlisted'>('all');
  const [canSendRzc, setCanSendRzc] = useState(true);
  const [isVerified, setIsVerified] = useState(true);
  const [rzcChange24h, setRzcChange24h] = useState(0);

  useEffect(() => {
    fetchJettons();
    if (refreshData) {
      refreshData();
    }

    // Refresh data periodically — only when tab is visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchJettons();
        if (refreshData) refreshData();
      }
    }, 10_000); // 10s to match Dashboard polling

    return () => clearInterval(interval);
  }, [address, network]);

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

  // Re-run whenever userProfile changes (e.g. after approval + refresh)
  useEffect(() => {
    checkRzcTransferStatus();
  }, [userProfile]);

  const checkRzcTransferStatus = async () => {
    // RZC transfers are always enabled
    setIsVerified(true);
    setCanSendRzc(true);
  };

  useEffect(() => {
    if (activeTab === 'nfts' && nfts.length === 0) {
      fetchNFTs();
    }
  }, [activeTab, address, network]);

  const fetchJettons = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get all tokens from registry first
      const registryTokens = getAllRegistryTokens();
      console.log(`📋 Found ${registryTokens.length} tokens in registry`);

      // ── Build user balance map from two sources:
      //   1. TonCenter V3 (via tonWalletService) — used for primary wallets
      //   2. contextJettons from WalletContext — includes WDK-injected tokens (e.g. TON-native USDT)
      const userBalances = new Map<string, any>();

      // Source 1: on-chain fetch (only when we have an address)
      if (address) {
        console.log(`🪙 Fetching jettons for ${address}...`);
        const result = await tonWalletService.getJettons(address);
        if (result.success && result.jettons) {
          result.jettons.forEach(jetton => {
            userBalances.set(jetton.jetton.address.toLowerCase(), jetton);
          });
        }
      }

      // Source 2: WalletContext jettons (WDK-injected / already-fetched)
      // These take priority only if TonCenter didn't already return that address
      if (contextJettons && contextJettons.length > 0) {
        contextJettons.forEach((jetton: any) => {
          const key = jetton.jetton?.address?.toLowerCase();
          if (key && !userBalances.has(key)) {
            userBalances.set(key, jetton);
          }
        });
      }

      // Merge registry tokens with user balances
      const mergedJettons: Jetton[] = registryTokens.map(registryToken => {
        const userJetton = userBalances.get(registryToken.address.toLowerCase());

        if (userJetton) {
          // User has this token - use their balance
          const enhanced = enhanceJettonData(userJetton, registryToken);
          const price = getJettonPrice(registryToken.address);

          return {
            ...enhanced,
            price: price !== null ? { usd: price } : undefined,
          };
        } else {
          // User doesn't have this token - show with 0 balance (registry tokens only)
          return {
            balance: '0',
            jetton: {
              address: registryToken.address,
              name: registryToken.name,
              symbol: registryToken.symbol,
              decimals: registryToken.decimals,
              image: registryToken.image,
              verified: registryToken.verified,
              verification: 'whitelist',
              emoji: registryToken.emoji,
            },
            price: registryToken.rateUsd > 0 ? { usd: registryToken.rateUsd } : undefined,
          };
        }
      });

      // Add any extra user jettons not in the registry (only if they have a balance)
      userBalances.forEach((userJetton, key) => {
        const isInRegistry = registryTokens.some(
          rt => rt.address.toLowerCase() === key
        );
        const hasBalance = userJetton.balance !== '0' && parseFloat(userJetton.balance) > 0;

        if (!isInRegistry && hasBalance) {
          const registryData = getJettonRegistryData(userJetton.jetton.address);
          const enhanced = enhanceJettonData(userJetton, registryData || undefined);
          const price = getJettonPrice(userJetton.jetton.address);

          mergedJettons.push({
            ...enhanced,
            price: price !== null ? { usd: price } : undefined,
          });
        }
      });

      setJettons(mergedJettons);
      console.log(`✅ Loaded ${mergedJettons.length} total jettons (${mergedJettons.filter(j => j.jetton.verified).length} verified, ${mergedJettons.filter(j => j.balance !== '0').length} with balance)`);

    } catch (err) {
      console.error('❌ Jettons fetch failed:', err);
      setError('Failed to load tokens');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNFTs = async () => {
    if (!address) {
      setNFTs([]);
      setIsLoadingNFTs(false);
      return;
    }

    setIsLoadingNFTs(true);
    setNftError(null);

    try {
      console.log(`🖼️ Fetching NFTs for ${address}...`);
      const result = await tonWalletService.getNFTs(address);

      if (result.success) {
        setNFTs(result.nfts || []);
        console.log(`✅ Loaded ${result.nfts?.length || 0} NFTs`);
      } else {
        throw new Error(result.error || 'Failed to fetch NFTs');
      }
    } catch (err) {
      console.error('❌ NFTs fetch failed:', err);
      setNftError('Failed to load NFTs');
    } finally {
      setIsLoadingNFTs(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);

    // Refresh wallet balance — force-bust cache so deposits reflect immediately
    if (refreshData) {
      await refreshData(false, true);
    }

    // Refresh tokens or NFTs based on active tab
    if (activeTab === 'tokens') {
      await fetchJettons();
    } else {
      await fetchNFTs();
    }

    setIsRefreshing(false);
  };

  const formatBalance = (balance: string, decimals: number) => {
    const num = Number(balance) / Math.pow(10, decimals);
    if (num === 0) return '0';
    return num.toLocaleString(undefined, { maximumFractionDigits: 9 });
  };

  const formatUsdValue = (balance: string, decimals: number, priceUsd?: number) => {
    if (!priceUsd) return null;
    const num = Number(balance) / Math.pow(10, decimals);
    const usdValue = num * priceUsd;
    if (usdValue < 0.01) return '< $0.01';
    return `$${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getVerificationBadge = (verification?: string, verified?: boolean) => {
    // Check registry verification first
    if (verified) {
      return <span className="text-[10px] text-green-500" title="Verified by Registry">✓</span>;
    }
    // Fallback to API verification
    if (verification === 'whitelist') {
      return <span className="text-[10px] text-green-500" title="Verified">✓</span>;
    }
    return null;
  };

  // Filter jettons based on search query and listing status
  const filteredJettons = jettons.filter(jetton => {
    // Search filter
    const matchesSearch = jetton.jetton.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      jetton.jetton.symbol.toLowerCase().includes(searchQuery.toLowerCase());

    // Listing filter
    const isListed = jetton.jetton.verified || jetton.jetton.verification === 'whitelist';
    const matchesFilter = tokenFilter === 'all' ||
      (tokenFilter === 'listed' && isListed) ||
      (tokenFilter === 'unlisted' && !isListed);

    // Hide zero balance jettons by default, but show them if the user is explicitly searching
    const hasBalance = jetton.balance !== '0' && parseFloat(jetton.balance) > 0;
    const isSearching = searchQuery.trim().length > 0;

    return matchesSearch && matchesFilter && (hasBalance || isSearching);
  });

  // Filter NFTs based on search query
  const filteredNFTs = nfts.filter(nft =>
    nft.metadata?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    nft.collection?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate total portfolio value
  // Parse TON balance - handle both string and number formats
  // Prefer multiChainBalances.ton (live WDK W5 balance) when available,
  // fall back to the primary wallet balance state.
  const activeWalletType = localStorage.getItem('rhiza_active_wallet_type');
  const isWdk = activeWalletType === 'secondary';
  const tonName = isWdk ? 'Toncoin (W5)' : 'Toncoin';
  const tonPreselectReceive = isWdk ? 'multichain-ton' : 'primary';
  const tonAssetTransfer = isWdk ? 'MULTICHAIN-TON' : 'TON';

  const tonBalanceNum = (() => {
    if (isWdk) {
        // Only W5 wallet balance
        return multiChainBalances?.ton ? parseFloat(multiChainBalances.ton) : 0;
    } else {
        // Native wallet balance
        if (typeof tonBalance === 'number') return tonBalance;
        if (typeof tonBalance === 'string') {
          const cleaned = tonBalance.replace(/[^\d.]/g, '');
          const parsed = parseFloat(cleaned);
          return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
    }
  })();

  const rzcBalance = (userProfile as any)?.rzc_balance || 0;
  // Use price from useBalance (which uses admin overrides/database) or fallback to config
  const currentRzcPrice = rzcPrice || RZC_CONFIG.RZC_PRICE_USD;

  const jettonsUsdValue = jettons.reduce((total, j) => {
    const num = Number(j.balance) / Math.pow(10, j.jetton.decimals);
    return total + (num * (j.price?.usd || 0));
  }, 0);

  const totalValue = (tonBalanceNum * tonPrice) + (rzcBalance * currentRzcPrice) + jettonsUsdValue;

  // Calculate true portfolio 24h change (weighted across all assets)
  const tonUsdValue = tonBalanceNum * tonPrice;
  const rzcUsdValue = rzcBalance * currentRzcPrice;
  
  // Calculate 24h change for each asset
  const tonChange24h = tonUsdValue * (changePercent24h / 100);
  const rzcChange24hValue = rzcUsdValue * (rzcChange24h / 100); // ← Now uses calculated 24h change from price history
  
  // Calculate jettons 24h change
  const jettonsChange24h = jettons.reduce((total, j) => {
    const num = Number(j.balance) / Math.pow(10, j.jetton.decimals);
    const jettonUsdValue = num * (j.price?.usd || 0);
    
    // Get per-jetton change
    const symbol = j.jetton.symbol;
    let jettonChangePercent = 0;
    
    if (symbol === 'USDT' || symbol === 'jUSDT') {
      jettonChangePercent = assetChanges.usdt;
    } else if (symbol === 'USDC' || symbol === 'jUSDC') {
      jettonChangePercent = assetChanges.usdc;
    } else {
      jettonChangePercent = getJettonPriceChange(j.jetton.address);
    }
    
    return total + (jettonUsdValue * (jettonChangePercent / 100));
  }, 0);
  
  // Total portfolio change
  const totalChange24h = tonChange24h + rzcChange24hValue + jettonsChange24h;
  const portfolioChangePercent = totalValue > 0 ? (totalChange24h / totalValue) * 100 : 0;

  const evmChain = currentEvmChain;
  const evmLabel = CHAIN_META[evmChain]?.name ?? evmChain.toUpperCase();

  // Currency conversion
  const currencies: Array<'USD' | 'BTC' | 'TON' | 'USDT' | 'EUR'> = ['USD', 'BTC', 'TON', 'USDT', 'EUR'];
  const conversionRates = {
    USD: 1,
    BTC: btcPrice > 0 ? 1 / btcPrice : 0.000015,
    TON: tonPrice > 0 ? 1 / tonPrice : 0.408,
    USDT: usdtPrice > 0 ? 1 / usdtPrice : 1,
    EUR: 0.92,
  };
  const currencySymbols: Record<string, string> = { USD: '$', BTC: '₿', TON: 'T', USDT: '₮', EUR: '€' };
  const convertedTotal = totalValue * safeGet(conversionRates, selectedCurrency);
  const formatConverted = (val: number) => {
    if (selectedCurrency === 'BTC') return val.toFixed(8);
    if (selectedCurrency === 'TON') return val.toFixed(4);
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getNFTImage = (nft: NFT) => {
    // Try previews first
    if (nft.previews && nft.previews.length > 0) {
      const preview = nft.previews.find(p => p.resolution === '500x500') || nft.previews[0];
      return preview.url;
    }
    // Fallback to metadata image
    return nft.metadata?.image;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-3.5 sm:space-y-5 page-enter px-3 sm:px-4 md:px-0 pb-4">

      {/* Currency dropdown — rendered at page level to escape overflow:hidden on the card */}
      {showCurrencyMenu && (
        <div className="assets-currency-selector fixed top-[160px] right-4 sm:right-auto z-[100] bg-white dark:bg-[#0a0a0a] border-2 border-gray-300 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[110px] animate-in fade-in slide-in-from-top-2 duration-150">
          {currencies.map(c => (
            <button
              key={c}
              onClick={() => { setSelectedCurrency(c); setShowCurrencyMenu(false); }}
              className={`w-full px-3 py-2.5 text-left text-xs font-bold transition-colors flex items-center justify-between gap-3 ${selectedCurrency === c
                ? 'bg-emerald-100 dark:bg-primary/10 text-emerald-700 dark:text-primary'
                : 'text-gray-800 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                }`}
            >
              <span>{c}</span>
              {selectedCurrency === c && <span className="text-emerald-600 dark:text-primary">✓</span>}
            </button>
          ))}
        </div>
      )}
      {/* Portfolio Header */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-200/50 to-cyan-200/50 dark:from-primary/20 dark:to-secondary/20 rounded-2xl sm:rounded-[2rem] blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
        <div className="relative bg-white dark:bg-[#0a0a0a]/80 backdrop-blur-xl border-2 border-gray-300 dark:border-white/5 rounded-2xl sm:rounded-[2rem] overflow-hidden shadow-lg">
          <div className="h-[3px] w-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-blue-500" />
          <div className="p-5 sm:p-6 pb-4">
            <div className="flex items-start justify-between">
              <div className="space-y-0.5 sm:space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600 dark:text-gray-500">
                  <ShieldCheck size={12} className="text-emerald-600 dark:text-primary flex-shrink-0" />
                  <span className="text-[10px] sm:text-[11px] font-heading font-bold uppercase tracking-widest truncate">Total Portfolio Value</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-numbers font-black tracking-tight text-gray-950 dark:text-white">
                  {balanceVisible ? (
                    <span className="inline-flex items-baseline gap-1">
                      <span className="text-emerald-700 dark:text-[#00FF88] font-black opacity-90">
                        {safeGet(currencySymbols, selectedCurrency)}
                      </span>
                      <span className="luxury-gradient-text font-glow">
                        {formatConverted(convertedTotal)}
                      </span>
                    </span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-700">••••••••</span>
                  )}
                </h2>
                <div className="flex items-center gap-1.5 sm:gap-2 pt-1">
                  <span className={`text-[10px] sm:text-xs font-heading font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${portfolioChangePercent >= 0
                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/20'
                    : 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/20'
                    }`}>
                    <TrendingUp size={10} className={portfolioChangePercent < 0 ? 'rotate-180' : ''} />
                    {portfolioChangePercent >= 0 ? '+' : ''}{portfolioChangePercent.toFixed(2)}% 24h
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Currency selector — dropdown uses fixed positioning to escape overflow:hidden */}
                <div className="relative assets-currency-selector">
                  <button
                    onClick={() => setShowCurrencyMenu(!showCurrencyMenu)}
                    className="p-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-600 dark:text-gray-400 text-[10px] font-black min-w-[40px] flex items-center justify-center"
                  >
                    {selectedCurrency}
                  </button>
                </div>

                {/* Hide/show balance */}
                <button
                  onClick={() => setBalanceVisible(!balanceVisible)}
                  className="p-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-primary transition-all active:scale-95"
                >
                  {balanceVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>

                {/* Refresh */}
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="p-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-primary hover:bg-emerald-50 dark:hover:bg-white/10 transition-all active:scale-95"
                >
                  <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          </div>

          {/* Live price ticker */}
          {(() => {
            const priceItems = [
              tonPrice > 0 && { symbol: 'TON', price: `$${tonPrice.toFixed(2)}`, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-500/15' },
              btcPrice > 0 && { symbol: 'BTC', price: `$${btcPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-500/15' },
              ethPrice > 0 && { symbol: 'ETH', price: `$${ethPrice.toFixed(2)}`, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-500/15' },
              solPrice > 0 && { symbol: 'SOL', price: `$${solPrice.toFixed(2)}`, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-500/15' },
              bnbPrice > 0 && { symbol: 'BNB', price: `$${bnbPrice.toFixed(2)}`, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-500/15' },
              tronPrice > 0 && { symbol: 'TRX', price: `$${tronPrice.toFixed(4)}`, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-500/15' },
              usdtPrice > 0 && { symbol: 'USDT', price: `$${usdtPrice.toFixed(3)}`, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-100 dark:bg-teal-500/15' },
              currentRzcPrice > 0 && { symbol: 'RZC', price: `$${currentRzcPrice.toFixed(4)}`, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-500/15' },
            ].filter(Boolean) as { symbol: string; price: string; color: string; bg: string }[];
            if (priceItems.length === 0) return null;
            const doubled = [...priceItems, ...priceItems];
            return (
              <div className="border-t border-gray-100 dark:border-white/5 overflow-hidden" style={{ contain: 'paint' }}>
                <div className="flex items-stretch">
                  <div className="flex-shrink-0 px-2.5 bg-gradient-to-b from-slate-800 to-slate-900 dark:from-white/10 dark:to-white/5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-white dark:text-white/70">Live</span>
                  </div>
                  <div className="flex-1 overflow-hidden py-1.5">
                    <div className="flex animate-marquee whitespace-nowrap gap-5 px-3" style={{ width: 'max-content' }}>
                      {doubled.map((item, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1.5">
                          <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${item.bg} ${item.color}`}>{item.symbol}</span>
                          <span className="text-[10px] font-numbers font-bold text-slate-700 dark:text-slate-300">{item.price}</span>
                          <span className="text-slate-300 dark:text-white/10 text-[10px]">·</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>


      {/* Tab Switcher */}
      <div className="flex p-1 bg-white dark:bg-[#0a0a0a]/80 border-2 border-gray-300 dark:border-white/5 rounded-2xl shadow-sm">
        <button
          onClick={() => setActiveTab('tokens')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-heading font-bold transition-all ${activeTab === 'tokens'
            ? 'bg-emerald-600 dark:bg-primary text-white dark:text-black shadow-md'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
        >
          <Coins size={14} /> {t('assets.tokens')}
        </button>
        <button
          onClick={() => setActiveTab('nfts')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-heading font-bold transition-all ${activeTab === 'nfts'
            ? 'bg-emerald-600 dark:bg-primary text-white dark:text-black shadow-md'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
        >
          <LayoutGrid size={14} /> {t('assets.nfts')}
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative group">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 group-focus-within:text-emerald-500 dark:group-focus-within:text-primary transition-colors" />
        <input
          type="text"
          placeholder={`Search ${activeTab === 'tokens' ? 'tokens' : 'NFTs'}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white dark:bg-[#0a0a0a]/80 border-2 border-gray-300 dark:border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-heading font-semibold text-gray-900 dark:text-white outline-none focus:border-emerald-500/50 dark:focus:border-primary/50 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 shadow-sm"
        />
      </div>

      {/* Token Filter Tabs */}
      {activeTab === 'tokens' && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setTokenFilter('all')}
            className={`px-4 py-2 flex-shrink-0 rounded-xl text-xs font-heading font-bold transition-all ${tokenFilter === 'all'
              ? 'bg-emerald-600 dark:bg-primary text-white dark:text-black shadow-sm'
              : 'bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10'
              }`}
          >
            All Tokens
          </button>
          <button
            onClick={() => setTokenFilter('listed')}
            className={`px-4 py-2 flex-shrink-0 rounded-xl text-xs font-heading font-bold transition-all flex items-center gap-1 ${tokenFilter === 'listed'
              ? 'bg-emerald-600 dark:bg-primary text-white dark:text-black shadow-sm'
              : 'bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10'
              }`}
          >
            <ShieldCheck size={14} className={tokenFilter === 'listed' ? '' : 'text-emerald-500'} /> Listed
          </button>
          <button
            onClick={() => setTokenFilter('unlisted')}
            className={`px-4 py-2 flex-shrink-0 rounded-xl text-xs font-heading font-bold transition-all ${tokenFilter === 'unlisted'
              ? 'bg-emerald-600 dark:bg-primary text-white dark:text-black shadow-sm'
              : 'bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10'
              }`}
          >
            Unlisted
          </button>
        </div>
      )}

      {/* Asset List */}
      <div className="min-h-[400px]">
        {activeTab === 'tokens' && (
          <>
            {error ? (
              <div className="p-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-bold text-red-900 dark:text-red-300 mb-1">Failed to load tokens</h4>
                    <p className="text-sm text-red-700 dark:text-red-400 mb-3">{error}</p>
                    <button
                      onClick={handleRefresh}
                      className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black uppercase hover:bg-red-700 transition-all"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              </div>
            ) : isLoading ? (
              <div className="space-y-3">
                <LoadingSkeleton height={80} />
                <LoadingSkeleton height={80} />
                <LoadingSkeleton height={80} />
              </div>
            ) : (
              <div className="bg-white dark:bg-[#0a0a0a]/80 border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-100 dark:divide-white/5">
                {/* TON Balance (Always first) */}
                <div
                  onClick={() => navigate('/wallet/asset-detail', {
                    state: {
                      symbol: 'TON',
                      name: tonName,
                      balance: String(tonBalanceNum * Math.pow(10, 9)),
                      decimals: 9,
                      emoji: '💎',
                      price: tonPrice,
                      verified: true,
                      type: 'TON'
                    }
                  })}
                  className="p-3 sm:p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full relative group-hover:scale-105 transition-transform shrink-0 shadow-sm border border-gray-100 dark:border-white/10">
                      <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ton/info/logo.png" alt="TON" className="w-full h-full rounded-full object-cover" />
                      <div className="absolute -bottom-1 -right-1 bg-emerald-500 dark:bg-emerald-600 rounded-full p-0.5 border-2 border-white dark:border-[#0a0a0a]">
                        <ShieldCheck size={8} className="text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-heading font-bold text-gray-900 dark:text-white truncate">{tonName}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-numbers text-gray-500 dark:text-gray-400 font-medium truncate">
                          ${tonPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          {changePercent24h !== undefined && (
                            <span className={`ml-1.5 font-bold ${changePercent24h >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {changePercent24h >= 0 ? '+' : ''}{changePercent24h.toFixed(2)}%
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <p className="text-sm font-numbers font-black text-gray-900 dark:text-white">
                          {tonBalanceNum.toLocaleString(undefined, { maximumFractionDigits: 4 })} TON
                        </p>
                      </div>
                      <span className="text-[11px] font-numbers font-semibold text-gray-500 dark:text-gray-400">
                        ${(tonBalanceNum * tonPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* RZC Balance (Community Token) */}
                {userProfile && (
                  <div
                    onClick={() => navigate('/wallet/asset-detail', {
                      state: {
                        symbol: 'RZC',
                        name: 'RhizaCore Token',
                        balance: String((userProfile as any).rzc_balance || 0),
                        decimals: 0,
                        emoji: '⚡',
                        price: rzcPrice,
                        verified: true,
                        type: 'RZC'
                      }
                    })}
                    className="p-3 sm:p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-white font-black text-[10px] relative group-hover:scale-105 transition-transform shrink-0 shadow-md shadow-emerald-500/20">
                        RZC
                        <div className="absolute -bottom-1 -right-1 bg-emerald-500 dark:bg-emerald-600 rounded-full p-0.5 border-2 border-white dark:border-[#0a0a0a]">
                          <ShieldCheck size={8} className="text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-heading font-bold text-gray-900 dark:text-white truncate">RhizaCore Token</h4>
                          <VerificationBadge />
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-numbers text-gray-500 dark:text-gray-400 font-medium truncate">
                            ${currentRzcPrice.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <p className="text-sm font-numbers font-black text-gray-900 dark:text-white">
                            {((userProfile as any).rzc_balance || 0).toLocaleString()} RZC
                          </p>
                        </div>
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-[11px] font-numbers font-semibold text-emerald-600 dark:text-primary">
                            ${(((userProfile as any).rzc_balance || 0) * currentRzcPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className={`text-[9px] font-numbers font-bold ${rzcChange24h >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {rzcChange24h >= 0 ? '+' : ''}{rzcChange24h.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* USDT Balance (Multi-Chain) */}
                {(() => {
                  const unifiedUsdtBalance = multiChainBalances ? parseFloat(multiChainBalances.usdt || '0') : 0;
                  const unifiedUsdtUsdValue = unifiedUsdtBalance * (usdtPrice || 1.0);
                  
                  return (
                    <div
                      onClick={() => navigate('/wallet/asset-detail', {
                        state: {
                          symbol: 'USDT',
                          name: 'Tether USD',
                          balance: String(unifiedUsdtBalance),
                          decimals: 0,
                          emoji: '₮',
                          price: usdtPrice || 1.0,
                          verified: true,
                          type: 'EVM'
                        }
                      })}
                      className="p-3 sm:p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-full relative group-hover:scale-105 transition-transform shrink-0 shadow-sm border border-gray-100 dark:border-white/10">
                          <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png" alt="USDT" className="w-full h-full rounded-full object-cover" />
                          <div className="absolute -bottom-1 -right-1 bg-emerald-500 dark:bg-emerald-600 rounded-full p-0.5 border-2 border-white dark:border-[#0a0a0a]">
                            <ShieldCheck size={8} className="text-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-heading font-bold text-gray-900 dark:text-white truncate">Tether USD</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] font-numbers text-gray-500 dark:text-gray-400 font-medium truncate">
                              ${(usdtPrice || 1.0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              {assetChanges?.usdt !== undefined && (
                                <span className={`ml-1.5 font-bold ${assetChanges.usdt >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                  {assetChanges.usdt >= 0 ? '+' : ''}{assetChanges.usdt.toFixed(2)}%
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <p className="text-sm font-numbers font-black text-gray-900 dark:text-white">
                              {balanceVisible ? unifiedUsdtBalance.toLocaleString(undefined, { maximumFractionDigits: 4 }) : '••••'} USDT
                            </p>
                          </div>
                          <span className="text-[11px] font-numbers font-semibold text-gray-500 dark:text-gray-400">
                            {balanceVisible ? `$${unifiedUsdtUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* TRON Balance (Multi-Chain) */}
                {(() => {
                  const unifiedTronBalance = multiChainBalances ? parseFloat(multiChainBalances.tron || '0') : 0;
                  const unifiedTronUsdValue = unifiedTronBalance * (tronPrice || 0);
                  
                  return (
                    <div
                      onClick={() => navigate('/wallet/asset-detail', {
                        state: {
                          symbol: 'TRX',
                          name: 'TRON',
                          balance: String(unifiedTronBalance),
                          decimals: 0,
                          emoji: '₮',
                          price: tronPrice || 0,
                          verified: true,
                          type: 'TRON'
                        }
                      })}
                      className="p-3 sm:p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-full relative group-hover:scale-105 transition-transform shrink-0 shadow-sm border border-gray-100 dark:border-white/10">
                          <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/tron/info/logo.png" alt="TRX" className="w-full h-full rounded-full object-cover" />
                          <div className="absolute -bottom-1 -right-1 bg-emerald-500 dark:bg-emerald-600 rounded-full p-0.5 border-2 border-white dark:border-[#0a0a0a]">
                            <ShieldCheck size={8} className="text-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-heading font-bold text-gray-900 dark:text-white truncate">TRON</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] font-numbers text-gray-500 dark:text-gray-400 font-medium truncate">
                              ${(tronPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              {assetChanges?.tron !== undefined && (
                                <span className={`ml-1.5 font-bold ${assetChanges.tron >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                  {assetChanges.tron >= 0 ? '+' : ''}{assetChanges.tron.toFixed(2)}%
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <p className="text-sm font-numbers font-black text-gray-900 dark:text-white">
                              {balanceVisible ? unifiedTronBalance.toLocaleString(undefined, { maximumFractionDigits: 4 }) : '••••'} TRX
                            </p>
                          </div>
                          <span className="text-[11px] font-numbers font-semibold text-gray-500 dark:text-gray-400">
                            {balanceVisible ? `$${unifiedTronUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Jettons removed as requested */}
              </div>
            )}
          </>
        )}

        {activeTab === 'nfts' && (
          <>
            {nftError ? (
              <div className="p-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-bold text-red-900 dark:text-red-300 mb-1">Failed to load NFTs</h4>
                    <p className="text-sm text-red-700 dark:text-red-400 mb-3">{nftError}</p>
                    <button
                      onClick={handleRefresh}
                      className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black uppercase hover:bg-red-700 transition-all"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              </div>
            ) : isLoadingNFTs ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <LoadingSkeleton key={i} height={200} />
                ))}
              </div>
            ) : filteredNFTs.length === 0 ? (
              <div className="py-12 text-center bg-white dark:bg-[#0a0a0a]/80 border-2 border-gray-200 dark:border-white/5 rounded-2xl shadow-sm">
                <LayoutGrid size={24} className="mx-auto text-gray-400 dark:text-zinc-600 mb-2" />
                <h4 className="text-xs font-heading font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">
                  {searchQuery ? 'No NFTs found' : 'No NFTs yet'}
                </h4>
                <p className="text-[11px] font-medium text-gray-400 dark:text-zinc-500">
                  {searchQuery ? 'Try a different search term' : 'NFTs will appear here when you receive them'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {filteredNFTs.map((nft) => (
                  <div
                    key={`${nft.address}-${nft.index}`}
                    className="bg-white dark:bg-[#0a0a0a]/80 border-2 border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden group cursor-pointer hover:border-emerald-500/30 transition-all shadow-sm hover:shadow-md"
                  >
                    <div className="aspect-square relative overflow-hidden bg-gray-100 dark:bg-white/5">
                      {getNFTImage(nft) ? (
                        <img
                          src={getNFTImage(nft)}
                          alt={nft.metadata?.name || 'NFT'}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`${getNFTImage(nft) ? 'hidden' : ''} absolute inset-0 flex items-center justify-center text-4xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10`}>
                        🖼️
                      </div>
                      {nft.verified && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-emerald-500 dark:bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-lg border border-white/20">
                          <ShieldCheck size={12} />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-gray-900/90 dark:from-black/90 to-transparent">
                        <p className="text-sm font-heading font-bold text-white truncate leading-tight">
                          {nft.metadata?.name || `NFT #${nft.index}`}
                        </p>
                        {nft.collection?.name && (
                          <p className="text-[10px] font-heading font-medium text-gray-300 dark:text-zinc-400 uppercase truncate mt-0.5">
                            {nft.collection.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Explorer Link - Footer */}
      {address && (
        <button
          onClick={() => window.open(getExplorerUrl(address, network), '_blank')}
          className="w-full py-4 bg-white dark:bg-[#0a0a0a]/80 border-2 border-gray-200 dark:border-white/5 rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-gray-600 dark:text-gray-400 shadow-sm group"
        >
          <ExternalLink size={14} className="group-hover:text-emerald-500 dark:group-hover:text-primary transition-colors" />
          <span className="text-xs font-heading font-bold uppercase tracking-widest group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
            Audit Node on Explorer
          </span>
        </button>
      )}
    </div>
  );
};

export default Assets;
