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

  const btcBalanceNum = multiChainBalances?.btc ? parseFloat(multiChainBalances.btc) : 0;
  const solBalanceNum = multiChainBalances?.sol ? parseFloat(multiChainBalances.sol) : 0;
  const tronBalanceNum = multiChainBalances?.tron ? parseFloat(multiChainBalances.tron) : 0;
  const ethBalanceNum = multiChainBalances?.eth ? parseFloat(multiChainBalances.eth) : 0;
  const bnbBalanceNum = multiChainBalances?.bnb ? parseFloat(multiChainBalances.bnb) : 0;

  const btcUsdValue = btcBalanceNum * btcPrice;
  const solUsdValue = solBalanceNum * solPrice;
  const tronUsdValue = tronBalanceNum * tronPrice;
  const ethUsdValue = ethBalanceNum * ethPrice;
  const bnbUsdValue = bnbBalanceNum * bnbPrice;

  const totalValue = (tonBalanceNum * tonPrice) + (rzcBalance * currentRzcPrice) + jettonsUsdValue + btcUsdValue + solUsdValue + tronUsdValue + ethUsdValue + bnbUsdValue;

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

  const btcChange24h = btcUsdValue * ((assetChanges?.btc || 0) / 100);
  const solChange24h = solUsdValue * ((assetChanges?.sol || 0) / 100);
  const tronChange24h = tronUsdValue * ((assetChanges?.tron || 0) / 100);
  const ethChange24h = ethUsdValue * ((assetChanges?.eth || 0) / 100);
  const bnbChange24h = bnbUsdValue * ((assetChanges?.bnb || 0) / 100);

  // Total portfolio change
  const totalChange24h = tonChange24h + rzcChange24hValue + jettonsChange24h + btcChange24h + solChange24h + tronChange24h + ethChange24h + bnbChange24h;
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
      {/* Tab Switcher */}
      <div className="flex p-1 bg-white dark:bg-[#0a0a0a]/80 border-2 border-gray-300 dark:border-white/5 rounded-2xl shadow-sm mt-4 ">
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

      {/* Market Asset List */}
      <div className="min-h-[400px]">
        {activeTab === 'tokens' && (() => {
          // Build the unified market asset list
          const tonBal = tonBalanceNum;
          const rzcBal = (userProfile as any)?.rzc_balance || 0;
          const usdtBal = multiChainBalances ? parseFloat(multiChainBalances.usdt || '0') : 0;
          const tronBal = multiChainBalances ? parseFloat(multiChainBalances.tron || '0') : 0;
          const ethBal = multiChainBalances?.eth ? parseFloat(multiChainBalances.eth) : 0;
          const bnbBal = multiChainBalances?.bnb ? parseFloat(multiChainBalances.bnb) : 0;
          const solBal = multiChainBalances?.sol ? parseFloat(multiChainBalances.sol) : 0;
          const btcBal = multiChainBalances?.btc ? parseFloat(multiChainBalances.btc) : 0;

          type MarketAsset = {
            rank: number; symbol: string; name: string; logo: string;
            price: number; change: number; balance: number; maxDecimals: number;
            navState: object; accentFrom: string; accentTo: string;
          };

          const assets: MarketAsset[] = [
            { rank: 1, symbol: 'BTC', name: 'Bitcoin', logo: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png', price: btcPrice, change: assetChanges?.btc ?? 0, balance: btcBal, maxDecimals: 8, navState: { symbol: 'BTC', name: 'Bitcoin', balance: String(btcBal), decimals: 0, emoji: '\u20bf', price: btcPrice, verified: true, type: 'BTC' }, accentFrom: 'from-orange-400', accentTo: 'to-amber-500' },
            { rank: 2, symbol: 'ETH', name: 'Ethereum', logo: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png', price: ethPrice, change: assetChanges?.eth ?? 0, balance: ethBal, maxDecimals: 6, navState: { symbol: 'ETH', name: 'Ethereum', balance: String(ethBal), decimals: 0, emoji: '\u039e', price: ethPrice, verified: true, type: 'ETH' }, accentFrom: 'from-indigo-400', accentTo: 'to-blue-500' },
            { rank: 3, symbol: 'BNB', name: 'BNB', logo: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png', price: bnbPrice, change: assetChanges?.bnb ?? 0, balance: bnbBal, maxDecimals: 6, navState: { symbol: 'BNB', name: 'BNB', balance: String(bnbBal), decimals: 0, emoji: '\ud83e\ude99', price: bnbPrice, verified: true, type: 'BNB' }, accentFrom: 'from-yellow-400', accentTo: 'to-amber-400' },
            { rank: 4, symbol: 'SOL', name: 'Solana', logo: 'https://assets.coingecko.com/coins/images/4128/large/solana.png', price: solPrice, change: assetChanges?.sol ?? 0, balance: solBal, maxDecimals: 6, navState: { symbol: 'SOL', name: 'Solana', balance: String(solBal), decimals: 0, emoji: '\u25ce', price: solPrice, verified: true, type: 'SOL' }, accentFrom: 'from-purple-400', accentTo: 'to-violet-500' },
            { rank: 5, symbol: 'TON', name: tonName, logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ton/info/logo.png', price: tonPrice, change: changePercent24h ?? 0, balance: tonBal, maxDecimals: 4, navState: { symbol: 'TON', name: tonName, balance: String(tonBal * 1e9), decimals: 9, emoji: '\ud83d\udca4', price: tonPrice, verified: true, type: 'TON' }, accentFrom: 'from-blue-400', accentTo: 'to-cyan-400' },
            { rank: 6, symbol: 'USDT', name: 'Tether USD', logo: 'https://assets.coingecko.com/coins/images/325/large/Tether.png', price: usdtPrice || 1.0, change: assetChanges?.usdt ?? 0, balance: usdtBal, maxDecimals: 4, navState: { symbol: 'USDT', name: 'Tether USD', balance: String(usdtBal), decimals: 0, emoji: '\u20ae', price: usdtPrice || 1.0, verified: true, type: 'EVM' }, accentFrom: 'from-teal-400', accentTo: 'to-emerald-400' },
            { rank: 7, symbol: 'TRX', name: 'TRON', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/tron/info/logo.png', price: tronPrice || 0, change: assetChanges?.tron ?? 0, balance: tronBal, maxDecimals: 4, navState: { symbol: 'TRX', name: 'TRON', balance: String(tronBal), decimals: 0, emoji: '\u20ae', price: tronPrice, verified: true, type: 'TRON' }, accentFrom: 'from-red-400', accentTo: 'to-rose-500' },
            { rank: 8, symbol: 'RZC', name: 'RhizaCore', logo: '', price: currentRzcPrice, change: rzcChange24h, balance: rzcBal, maxDecimals: 0, navState: { symbol: 'RZC', name: 'RhizaCore Token', balance: String(rzcBal), decimals: 0, emoji: '\u26a1', price: currentRzcPrice, verified: true, type: 'RZC' }, accentFrom: 'from-emerald-400', accentTo: 'to-cyan-500' },
          ].filter(a => !searchQuery || a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.symbol.toLowerCase().includes(searchQuery.toLowerCase()));

          const SparklineChart = ({ change, seed }: { change: number; seed: number }) => {
            const isPos = change >= 0;
            const pts: number[] = [];
            for (let i = 0; i < 8; i++) {
              const trend = isPos ? (i / 7) * 10 : -(i / 7) * 10;
              const wave = Math.sin((i + seed) * 1.4) * 12;
              pts.push(Math.max(5, Math.min(45, 25 - trend + wave)));
            }
            const path = pts.map((y, x) => `${x === 0 ? 'M' : 'L'} ${((x / 7) * 56).toFixed(1)} ${y.toFixed(1)}`).join(' ');
            const fillPath = path + ` L 56 50 L 0 50 Z`;
            const stroke = isPos ? '#10b981' : '#ef4444';
            const fill = isPos ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)';
            return (
              <svg width="58" height="32" viewBox="0 0 56 50" className="flex-shrink-0">
                <path d={fillPath} fill={fill} />
                <path d={path} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            );
          };

          return (
            <div className="space-y-0">
              {/* Column Headers */}
              <div className="flex items-center px-4 py-2 mb-1">
                <span className="w-7 text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-600">#</span>
                <span className="flex-1 text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-600">Asset</span>
                <span className="w-[58px] hidden sm:block text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-600 text-center">7D Chart</span>
                <span className="w-28 text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-600 text-right">Price / 24h</span>
              </div>

              {/* Asset rows */}
              <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-white/5 bg-white dark:bg-[#0a0a0a]/80 shadow-sm divide-y divide-gray-50 dark:divide-white/[0.04]">
                {isLoading ? (
                  <div className="divide-y divide-gray-50 dark:divide-white/[0.04]">
                    {[1, 2, 3, 4, 5].map(i => <LoadingSkeleton key={i} height={68} />)}
                  </div>
                ) : error ? (
                  <div className="p-6 flex items-center gap-3 text-red-500">
                    <AlertCircle size={18} /> <span className="text-sm font-semibold">{error}</span>
                  </div>
                ) : (
                  assets.map((asset, idx) => {
                    const isPos = asset.change >= 0;
                    const holdingsUsd = asset.balance * asset.price;
                    const hasHoldings = asset.balance > 0;
                    const priceFormatted = asset.price >= 1000
                      ? asset.price.toLocaleString('en-US', { maximumFractionDigits: 0 })
                      : asset.price >= 1
                        ? asset.price.toFixed(2)
                        : asset.price >= 0.001
                          ? asset.price.toFixed(4)
                          : asset.price.toFixed(6);
                    return (
                      <div
                        key={asset.symbol}
                        onClick={() => navigate('/wallet/asset-detail', { state: asset.navState })}
                        className="group relative flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3.5 cursor-pointer hover:bg-gray-50/80 dark:hover:bg-white/[0.025] transition-all duration-150 active:scale-[0.995]"
                      >
                        <div className={`absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b ${asset.accentFrom} ${asset.accentTo} opacity-0 group-hover:opacity-100 transition-opacity rounded-full`} />
                        <span className="w-7 text-[11px] font-black text-gray-300 dark:text-gray-700 flex-shrink-0 tabular-nums">{asset.rank}</span>
                        <div className="relative flex-shrink-0">
                          {asset.logo ? (
                            <img src={asset.logo} alt={asset.symbol} className="w-9 h-9 rounded-full object-cover border border-gray-100 dark:border-white/10 group-hover:scale-105 transition-transform shadow-sm" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          ) : (
                            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${asset.accentFrom} ${asset.accentTo} flex items-center justify-center text-white font-black text-[9px] group-hover:scale-105 transition-transform shadow-sm`}>{asset.symbol}</div>
                          )}
                          {hasHoldings && <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-gradient-to-br ${asset.accentFrom} ${asset.accentTo} border-2 border-white dark:border-[#0a0a0a]`} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-heading font-black text-gray-900 dark:text-white">{asset.name}</span>
                            <span className="text-[9px] font-black uppercase text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded-md tracking-wide">{asset.symbol}</span>
                          </div>
                          {hasHoldings ? (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[10px] font-numbers font-bold text-gray-400 dark:text-gray-500">
                                {balanceVisible ? `${asset.balance.toLocaleString(undefined, { maximumFractionDigits: asset.maxDecimals })} ${asset.symbol}` : '\u2022\u2022\u2022\u2022'}
                              </span>
                              {balanceVisible && holdingsUsd > 0.01 && (
                                <span className={`text-[9px] font-numbers font-black px-1.5 py-px rounded-full bg-gradient-to-r ${asset.accentFrom} ${asset.accentTo} text-white`}>
                                  ${holdingsUsd >= 1000 ? holdingsUsd.toLocaleString('en-US', { maximumFractionDigits: 0 }) : holdingsUsd.toFixed(2)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-300 dark:text-gray-700 font-medium mt-0.5 block">No holdings</span>
                          )}
                        </div>
                        <div className="hidden sm:block flex-shrink-0">
                          <SparklineChart change={asset.change} seed={idx * 2.5} />
                        </div>
                        <div className="text-right flex-shrink-0 w-28">
                          <p className="text-sm font-numbers font-black text-gray-900 dark:text-white tabular-nums">${priceFormatted}</p>
                          <span className={`inline-flex items-center gap-0.5 text-[10px] font-numbers font-black px-2 py-0.5 rounded-full mt-0.5 ${isPos ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400'
                            }`}>
                            {isPos ? '\u25b2' : '\u25bc'} {Math.abs(asset.change).toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* TON Jettons section */}
              {!isLoading && filteredJettons.length > 0 && (
                <div className="mt-5">
                  <div className="flex items-center gap-2 px-1 mb-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-600">TON Jettons</span>
                    <div className="flex-1 h-px bg-gray-100 dark:bg-white/5" />
                  </div>
                  <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-white/5 bg-white dark:bg-[#0a0a0a]/80 shadow-sm divide-y divide-gray-50 dark:divide-white/[0.04]">
                    {filteredJettons.map((jetton, idx) => {
                      const num = Number(jetton.balance) / Math.pow(10, jetton.jetton.decimals);
                      const change = getJettonPriceChange(jetton.jetton.address);
                      const isPos = change >= 0;
                      const holdingsUsd = num * (jetton.price?.usd || 0);
                      return (
                        <div
                          key={jetton.jetton.address}
                          onClick={() => navigate('/wallet/asset-detail', { state: { symbol: jetton.jetton.symbol, name: jetton.jetton.name, balance: jetton.balance, decimals: jetton.jetton.decimals, emoji: jetton.jetton.emoji || '\ud83e\ude99', price: jetton.price?.usd || 0, verified: jetton.jetton.verified, type: 'JETTON', jettonAddress: jetton.jetton.address } })}
                          className="group flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-gray-50/80 dark:hover:bg-white/[0.025] transition-all"
                        >
                          <span className="w-7 text-[11px] font-black text-gray-300 dark:text-gray-700 tabular-nums">{idx + 9}</span>
                          <TokenImage src={jetton.jetton.image} alt={jetton.jetton.symbol} emoji={jetton.jetton.emoji} className="w-9 h-9 rounded-full flex-shrink-0 group-hover:scale-105 transition-transform border border-gray-100 dark:border-white/10 shadow-sm" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-heading font-black text-gray-900 dark:text-white truncate">{jetton.jetton.name}</span>
                              {(jetton.jetton.verified || jetton.jetton.verification === 'whitelist') && <span className="text-[9px] text-emerald-500">\u2713</span>}
                              <span className="text-[9px] font-black uppercase text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded-md">{jetton.jetton.symbol}</span>
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[10px] font-numbers font-bold text-gray-400 dark:text-gray-500">
                                {balanceVisible ? `${num.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${jetton.jetton.symbol}` : '\u2022\u2022\u2022\u2022'}
                              </span>
                              {balanceVisible && holdingsUsd > 0.01 && (
                                <span className="text-[9px] font-numbers font-black px-1.5 py-px rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                                  ${holdingsUsd.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 w-24">
                            {jetton.price?.usd ? (
                              <>
                                <p className="text-sm font-numbers font-black text-gray-900 dark:text-white tabular-nums">${jetton.price.usd >= 0.01 ? jetton.price.usd.toFixed(2) : jetton.price.usd.toFixed(6)}</p>
                                <span className={`inline-flex items-center gap-0.5 text-[10px] font-numbers font-black px-2 py-0.5 rounded-full mt-0.5 ${isPos ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400'}`}>
                                  {isPos ? '\u25b2' : '\u25bc'} {Math.abs(change).toFixed(2)}%
                                </span>
                              </>
                            ) : <span className="text-xs text-gray-400 dark:text-gray-600">\u2014</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}


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
