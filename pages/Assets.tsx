
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
import BalanceVerification from '../components/BalanceVerification';
import VerificationBadge from '../components/VerificationBadge';
import { getJettonRegistryData, enhanceJettonData, getJettonPrice, getAllRegistryTokens } from '../services/jettonRegistry';
import TokenImage from '../components/TokenImage';
import { useToast } from '../context/ToastContext';
import { RZC_CONFIG } from '../config/rzcConfig';
import { useBalance } from '../hooks/useBalance';
import { CHAIN_META } from '../constants';

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
  const { address, network, balance: tonBalance, userProfile, refreshData, multiChainBalances, currentEvmChain } = useWallet();
  const { tonPrice, btcPrice, ethPrice, bnbPrice, maticPrice, avaxPrice, solPrice, tronPrice, usdtPrice, usdcPrice, rzcPrice, changePercent24h } = useBalance();

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
  const activeEvmPrice = evmNativePrice[currentEvmChain] ?? ethPrice;
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

  useEffect(() => {
    fetchJettons();
    if (refreshData) {
      refreshData();
    }

    // Refresh data periodically so deposits are automatically visible
    const interval = setInterval(() => {
      fetchJettons();
      if (refreshData) {
        refreshData();
      }
    }, 15_000);

    return () => clearInterval(interval);
  }, [address, network]);

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
    if (!address) {
      setJettons([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`🪙 Fetching jettons for ${address}...`);

      // Get all tokens from registry first
      const registryTokens = getAllRegistryTokens();
      console.log(`📋 Found ${registryTokens.length} tokens in registry`);

      // Fetch user's actual balances
      const result = await tonWalletService.getJettons(address);

      // Create a map of user's jetton balances by address
      const userBalances = new Map<string, any>();
      if (result.success && result.jettons) {
        result.jettons.forEach(jetton => {
          userBalances.set(jetton.jetton.address.toLowerCase(), jetton);
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

      // Add user jettons that aren't in the registry BUT ONLY if they have a balance
      result.jettons?.forEach(userJetton => {
        const isInRegistry = registryTokens.some(
          rt => rt.address.toLowerCase() === userJetton.jetton.address.toLowerCase()
        );

        // Only add unlisted tokens if user actually has a balance
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

    // Refresh wallet balance
    if (refreshData) {
      await refreshData();
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
    if (num < 0.0001) return '< 0.0001';
    if (num < 1) return num.toFixed(4);
    if (num < 1000) return num.toFixed(2);
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
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
  const tonBalanceNum = (() => {
    if (typeof tonBalance === 'number') return tonBalance;
    if (typeof tonBalance === 'string') {
      // Remove any non-numeric characters except decimal point
      const cleaned = tonBalance.replace(/[^\d.]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  })();

  const rzcBalance = (userProfile as any)?.rzc_balance || 0;
  // Use price from useBalance (which uses admin overrides/database) or fallback to config
  const currentRzcPrice = rzcPrice || RZC_CONFIG.RZC_PRICE_USD;

  const evmNum = multiChainBalances ? parseFloat(multiChainBalances.evm) || 0 : 0;
  const btcNum = multiChainBalances ? parseFloat(multiChainBalances.btc) || 0 : 0;
  const solNum = multiChainBalances ? parseFloat(multiChainBalances.sol) || 0 : 0;
  const tronNum = multiChainBalances ? parseFloat(multiChainBalances.tron) || 0 : 0;

  // SOL and TRX prices from useBalance (live CoinGecko rates)

  // Calculate Jettons USD Value
  const jettonsUsdValue = filteredJettons.reduce((acc, j) => {
    return acc + ((parseFloat(j.balance) / Math.pow(10, j.jetton.decimals || 9)) * (j.price?.usd || 0));
  }, 0);

  const totalValue = (tonBalanceNum * tonPrice) + (rzcBalance * currentRzcPrice)
    + (evmNum * activeEvmPrice) + (btcNum * btcPrice)
    + (solNum * solPrice) + (tronNum * tronPrice)
    + (parseFloat(multiChainBalances?.usdt || '0') * usdtPrice)
    + jettonsUsdValue;

  console.log('🔍 Assets Debug:', {
    tonBalance,
    tonBalanceType: typeof tonBalance,
    tonBalanceNum,
    totalValue
  });

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
  const convertedTotal = totalValue * conversionRates[selectedCurrency];
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
                        {currencySymbols[selectedCurrency]}
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
                  <span className={`text-[10px] sm:text-xs font-heading font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${changePercent24h >= 0
                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/20'
                    : 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/20'
                    }`}>
                    <TrendingUp size={10} className={changePercent24h < 0 ? 'rotate-180' : ''} />
                    {changePercent24h >= 0 ? '+' : ''}{changePercent24h.toFixed(2)}% TON 24h
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
              <div className="space-y-1">
                {/* TON Balance (Always first) */}
                <div
                  onClick={() => navigate('/wallet/asset-detail', {
                    state: {
                      symbol: 'TON',
                      name: 'Toncoin',
                      balance: String(tonBalanceNum * Math.pow(10, 9)),
                      decimals: 9,
                      emoji: '💎',
                      price: tonPrice,
                      verified: true,
                      type: 'TON'
                    }
                  })}
                  className="bg-white dark:bg-[#0a0a0a]/80 backdrop-blur border-2 border-gray-200 dark:border-white/5 p-4 sm:p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-all group cursor-pointer shadow-sm first:rounded-t-[2rem] last:rounded-b-[2rem]"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full relative group-hover:scale-105 transition-transform shrink-0 shadow-sm border border-gray-100 dark:border-white/10">
                      <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ton/info/logo.png" alt="TON" className="w-full h-full rounded-full object-cover" />
                      <div className="absolute -bottom-1 -right-1 bg-emerald-500 dark:bg-emerald-600 rounded-full p-0.5 border-2 border-white dark:border-[#0a0a0a]">
                        <ShieldCheck size={8} className="text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-heading font-bold text-gray-900 dark:text-white truncate">Toncoin</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-numbers text-gray-500 dark:text-gray-400 font-medium truncate">
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
                      <p className="text-sm font-numbers font-bold text-gray-900 dark:text-white">
                        {tonBalanceNum.toLocaleString(undefined, { maximumFractionDigits: 4 })} TON
                      </p>
                      <span className="text-[11px] font-numbers font-medium text-gray-500 dark:text-gray-400">
                        ${(tonBalanceNum * tonPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/wallet/receive', { state: { preselect: 'primary' } });
                      }}
                      className="p-2 sm:p-2.5 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl transition-all active:scale-95"
                      title="Receive TON"
                    >
                      <QrCode size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/wallet/transfer', { state: { asset: 'TON' } });
                      }}
                      className="p-2 sm:p-2.5 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl transition-all active:scale-95"
                      title="Send TON"
                    >
                      <Send size={16} />
                    </button>
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
                    className="bg-white dark:bg-[#0a0a0a]/80 backdrop-blur border-2 border-gray-200 dark:border-white/5 p-4 sm:p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-all group cursor-pointer shadow-sm"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-white font-black text-xs relative group-hover:scale-105 transition-transform shrink-0 shadow-md shadow-emerald-500/20">
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
                          <span className="text-xs font-numbers text-gray-500 dark:text-gray-400 font-medium truncate">
                            ${currentRzcPrice.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-numbers font-bold text-gray-900 dark:text-white">
                          {((userProfile as any).rzc_balance || 0).toLocaleString()} RZC
                        </p>
                        <span className="text-[11px] font-numbers font-medium text-emerald-600 dark:text-primary">
                          ${(((userProfile as any).rzc_balance || 0) * currentRzcPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      {/* RZC Receive - Always available */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/wallet/receive', { state: { preselect: 'primary-rzc' } });
                        }}
                        className="p-2 sm:p-2.5 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl transition-all active:scale-95"
                        title="Receive RZC"
                      >
                        <QrCode size={16} />
                      </button>
                      {/* RZC Transfer - Always available */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/wallet/transfer', {
                            state: {
                              asset: 'RZC',
                              balance: (userProfile as any).rzc_balance || 0
                            }
                          });
                        }}
                        className="p-2 sm:p-2.5 bg-emerald-50 dark:bg-primary/10 hover:bg-emerald-100 dark:hover:bg-primary/20 text-emerald-600 dark:text-primary rounded-xl transition-all active:scale-95"
                        title="Send RZC"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* EVM Balance */}
                {multiChainBalances && (
                  <div
                    onClick={() => navigate('/wallet/asset-detail', {
                      state: {
                        symbol: CHAIN_META[evmChain]?.symbol ?? 'ETH',
                        name: evmLabel,
                        balance: multiChainBalances.evm,
                        decimals: 0,
                        emoji: '⟠',
                        price: activeEvmPrice,
                        verified: true,
                        type: 'ETH'
                      }
                    })}
                    className="bg-white dark:bg-[#0a0a0a]/80 backdrop-blur border-2 border-gray-200 dark:border-white/5 p-4 sm:p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-all group cursor-pointer shadow-sm"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full relative group-hover:scale-105 transition-transform shrink-0 shadow-sm border border-gray-100 dark:border-white/10 bg-white dark:bg-zinc-800">
                        <img src={CHAIN_META[evmChain]?.logo || CHAIN_META.ethereum.logo} alt={evmLabel} className="w-full h-full rounded-full object-cover p-1" />
                        <div className="absolute -bottom-1 -right-1 bg-emerald-500/10 backdrop-blur rounded-full p-0.5 border-2 border-white dark:border-[#0a0a0a]">
                          <ShieldCheck size={8} className="text-emerald-500" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-heading font-bold text-gray-900 dark:text-white truncate">{evmLabel}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-numbers text-gray-500 dark:text-gray-400 font-medium truncate">
                            ${activeEvmPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-numbers font-bold text-gray-900 dark:text-white">
                          {parseFloat(multiChainBalances.evm).toLocaleString(undefined, { maximumFractionDigits: 4 })} {CHAIN_META[evmChain]?.symbol || 'ETH'}
                        </p>
                        <span className="text-[11px] font-numbers font-medium text-gray-500 dark:text-gray-400">
                          ${(parseFloat(multiChainBalances.evm) * activeEvmPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/wallet/receive', { state: { preselect: 'multichain-evm' } });
                        }}
                        className="p-2 sm:p-2.5 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl transition-all active:scale-95"
                        title="Receive EVM"
                      >
                        <QrCode size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/wallet/transfer', { state: { asset: 'EVM' } });
                        }}
                        className="p-2 sm:p-2.5 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl transition-all active:scale-95"
                        title="Send EVM"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* BTC Balance */}
                {multiChainBalances && (
                  <div
                    onClick={() => navigate('/wallet/asset-detail', {
                      state: {
                        symbol: 'BTC',
                        name: 'Bitcoin',
                        balance: multiChainBalances.btc,
                        decimals: 0,
                        emoji: '₿',
                        price: btcPrice,
                        verified: true,
                        type: 'BTC'
                      }
                    })}
                    className="bg-white dark:bg-[#0a0a0a]/80 backdrop-blur border-2 border-gray-200 dark:border-white/5 p-4 sm:p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-all group cursor-pointer shadow-sm"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full relative group-hover:scale-105 transition-transform shrink-0 shadow-sm border border-gray-100 dark:border-white/10">
                        <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png" alt="BTC" className="w-full h-full rounded-full object-cover" />
                        <div className="absolute -bottom-1 -right-1 bg-emerald-500 dark:bg-emerald-600 rounded-full p-0.5 border-2 border-white dark:border-[#0a0a0a]">
                          <ShieldCheck size={8} className="text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-heading font-bold text-gray-900 dark:text-white truncate">Bitcoin</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-numbers text-gray-500 dark:text-gray-400 font-medium truncate">
                            ${btcPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-numbers font-bold text-gray-900 dark:text-white">
                          {parseFloat(multiChainBalances.btc).toLocaleString(undefined, { maximumFractionDigits: 5 })} BTC
                        </p>
                        <span className="text-[11px] font-numbers font-medium text-gray-500 dark:text-gray-400">
                          ${(parseFloat(multiChainBalances.btc) * btcPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/wallet/receive', { state: { preselect: 'multichain-btc' } });
                        }}
                        className="p-2 sm:p-2.5 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl transition-all active:scale-95"
                        title="Receive BTC"
                      >
                        <QrCode size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/wallet/transfer', { state: { asset: 'BTC' } });
                        }}
                        className="p-2 sm:p-2.5 bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 dark:hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-xl transition-all active:scale-95"
                        title="Send BTC"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* USDT Balance */}
                {multiChainBalances && (
                  <div
                    onClick={() => navigate('/wallet/asset-detail', {
                      state: {
                        symbol: 'USDT',
                        name: 'Tether USD',
                        balance: multiChainBalances.usdt,
                        decimals: 0, // already formatted by WDK
                        emoji: '💵',
                        price: usdtPrice,
                        verified: true,
                        type: 'EVM'
                      }
                    })}
                    className="bg-white dark:bg-[#0a0a0a]/80 backdrop-blur border-2 border-gray-200 dark:border-white/5 p-4 sm:p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-all group cursor-pointer shadow-sm"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full relative group-hover:scale-105 transition-transform shrink-0 shadow-sm border border-gray-100 dark:border-white/10 bg-white">
                        <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png" alt="USDT" className="w-full h-full rounded-full object-cover" />
                        <div className="absolute -bottom-1.5 -right-1.5 bg-white dark:bg-[#050505] rounded-full p-[2px] shadow-sm z-10 border border-gray-100 dark:border-white/10">
                          <img src={CHAIN_META[evmChain]?.logo || CHAIN_META.ethereum.logo} alt="Chain" className="w-3.5 h-3.5 rounded-full object-cover" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-heading font-bold text-gray-900 dark:text-white truncate">Tether USD</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-numbers text-gray-500 dark:text-gray-400 font-medium truncate">
                            ${usdtPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-numbers font-bold text-gray-900 dark:text-white">
                          {parseFloat(multiChainBalances.usdt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                        </p>
                        <span className="text-[11px] font-numbers font-medium text-gray-500 dark:text-gray-400">
                          ${(parseFloat(multiChainBalances.usdt) * usdtPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/wallet/receive', { state: { preselect: 'multichain-usdt' } });
                        }}
                        className="p-2 sm:p-2.5 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl transition-all active:scale-95"
                        title="Receive USDT"
                      >
                        <QrCode size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/wallet/transfer', { state: { asset: 'USDT' } });
                        }}
                        className="p-2 sm:p-2.5 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl transition-all active:scale-95"
                        title="Send USDT"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* SOL Balance */}
                {multiChainBalances && (
                  <div
                    onClick={() => navigate('/wallet/asset-detail', {
                      state: { symbol: 'SOL', name: 'Solana', balance: multiChainBalances.sol, decimals: 0, emoji: '◎', price: solPrice, verified: true, type: 'SOL' }
                    })}
                    className="bg-white dark:bg-[#0a0a0a]/80 backdrop-blur border-2 border-gray-200 dark:border-white/5 p-4 sm:p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-all group cursor-pointer shadow-sm"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full relative group-hover:scale-105 transition-transform shrink-0 shadow-sm border border-gray-100 dark:border-white/10">
                        <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png" alt="SOL" className="w-full h-full rounded-full object-cover" />
                        <div className="absolute -bottom-1 -right-1 bg-emerald-500 dark:bg-emerald-600 rounded-full p-0.5 border-2 border-white dark:border-[#0a0a0a]">
                          <ShieldCheck size={8} className="text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-heading font-bold text-gray-900 dark:text-white truncate">Solana</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-numbers text-gray-500 dark:text-gray-400 font-medium truncate">
                            ${solPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-numbers font-bold text-gray-900 dark:text-white">
                          {parseFloat(multiChainBalances.sol).toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL
                        </p>
                        <span className="text-[11px] font-numbers font-medium text-gray-500 dark:text-gray-400">
                          ${(parseFloat(multiChainBalances.sol) * solPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); navigate('/wallet/receive', { state: { preselect: 'multichain-sol' } }); }}
                        className="p-2 sm:p-2.5 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl transition-all active:scale-95"
                        title="Receive SOL"
                      >
                        <QrCode size={16} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); navigate('/wallet/transfer', { state: { asset: 'SOL' } }); }}
                        className="p-2 sm:p-2.5 bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 dark:hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl transition-all active:scale-95"
                        title="Send SOL"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* TRON Balance */}
                {multiChainBalances && (
                  <div
                    onClick={() => navigate('/wallet/asset-detail', {
                      state: { symbol: 'TRX', name: 'TRON', balance: multiChainBalances.tron, decimals: 0, emoji: '🔴', price: tronPrice, verified: true, type: 'TRON' }
                    })}
                    className="bg-white dark:bg-[#0a0a0a]/80 backdrop-blur border-2 border-gray-200 dark:border-white/5 p-4 sm:p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-all group cursor-pointer shadow-sm"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full relative group-hover:scale-105 transition-transform shrink-0 shadow-sm border border-gray-100 dark:border-white/10">
                        <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/tron/info/logo.png" alt="TRX" className="w-full h-full rounded-full object-cover" />
                        <div className="absolute -bottom-1 -right-1 bg-emerald-500 dark:bg-emerald-600 rounded-full p-0.5 border-2 border-white dark:border-[#0a0a0a]">
                          <ShieldCheck size={8} className="text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-heading font-bold text-gray-900 dark:text-white truncate">TRON</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-numbers text-gray-500 dark:text-gray-400 font-medium truncate">
                            ${tronPrice.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-numbers font-bold text-gray-900 dark:text-white">
                          {parseFloat(multiChainBalances.tron).toLocaleString(undefined, { maximumFractionDigits: 2 })} TRX
                        </p>
                        <span className="text-[11px] font-numbers font-medium text-gray-500 dark:text-gray-400">
                          ${(parseFloat(multiChainBalances.tron) * tronPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); navigate('/wallet/receive', { state: { preselect: 'multichain-tron' } }); }}
                        className="p-2 sm:p-2.5 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl transition-all active:scale-95"
                        title="Receive TRX"
                      >
                        <QrCode size={16} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); navigate('/wallet/transfer', { state: { asset: 'TRON' } }); }}
                        className="p-2 sm:p-2.5 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl transition-all active:scale-95"
                        title="Send TRX"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Multichain TON Balance (WDK) */}
                {multiChainBalances && (
                  <div
                    onClick={() => navigate('/wallet/asset-detail', {
                      state: {
                        symbol: 'TON',
                        name: 'TON (W5)',
                        balance: String(parseFloat(multiChainBalances.ton) * Math.pow(10, 9)),
                        decimals: 9,
                        emoji: '💎',
                        price: tonPrice,
                        verified: true,
                        type: 'TON'
                      }
                    })}
                    className="bg-white dark:bg-[#0a0a0a]/80 backdrop-blur border-2 border-gray-200 dark:border-white/5 p-4 sm:p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-all group cursor-pointer shadow-sm last:rounded-b-[2rem]"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full relative group-hover:scale-105 transition-transform shrink-0 shadow-sm border border-gray-100 dark:border-white/10">
                        <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ton/info/logo.png" alt="TON" className="w-full h-full rounded-full object-cover" />
                        <div className="absolute -bottom-1 -right-1 bg-emerald-500 dark:bg-emerald-600 rounded-full p-0.5 border-2 border-white dark:border-[#0a0a0a]">
                          <ShieldCheck size={8} className="text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-heading font-bold text-gray-900 dark:text-white truncate">TON (W5)</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-numbers text-gray-500 dark:text-gray-400 font-medium truncate">
                            ${tonPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-numbers font-bold text-gray-900 dark:text-white">
                          {parseFloat(multiChainBalances.ton).toLocaleString(undefined, { maximumFractionDigits: 4 })} TON
                        </p>
                        <span className="text-[11px] font-numbers font-medium text-gray-500 dark:text-gray-400">
                          ${(parseFloat(multiChainBalances.ton) * tonPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/wallet/receive', { state: { preselect: 'multichain-ton' } });
                        }}
                        className="p-2 sm:p-2.5 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl transition-all active:scale-95"
                        title="Receive TON (W5)"
                      >
                        <QrCode size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/wallet/transfer', { state: { asset: 'MULTICHAIN-TON' } });
                        }}
                        className="p-2 sm:p-2.5 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl transition-all active:scale-95"
                        title="Send TON"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Jettons */}
                {filteredJettons.length === 0 && !isLoading ? (
                  <div className="py-12 text-center bg-white dark:bg-[#0a0a0a]/80 border-2 border-gray-200 dark:border-white/5 rounded-2xl shadow-sm">
                    <Coins size={24} className="mx-auto text-gray-400 dark:text-zinc-600 mb-2" />
                    <h4 className="text-xs font-heading font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">
                      {searchQuery ? 'No tokens found' : 'No jettons yet'}
                    </h4>
                    <p className="text-[11px] font-medium text-gray-400 dark:text-zinc-500">
                      {searchQuery ? 'Try a different search term' : 'Jetton tokens will appear here when you receive them'}
                    </p>
                  </div>
                ) : (
                  filteredJettons.map((jetton) => {
                    const hasBalance = jetton.balance !== '0' && parseFloat(jetton.balance) > 0;
                    const registryData = getJettonRegistryData(jetton.jetton.address);
                    const fallbackEmoji = registryData?.emoji || '🪙';

                    return (
                      <div
                        key={jetton.jetton.address}
                        onClick={() => navigate('/wallet/asset-detail', {
                          state: {
                            symbol: jetton.jetton.symbol,
                            name: jetton.jetton.name,
                            balance: jetton.balance,
                            decimals: jetton.jetton.decimals,
                            image: jetton.jetton.image,
                            emoji: fallbackEmoji,
                            price: jetton.price?.usd,
                            verified: jetton.jetton.verified || jetton.jetton.verification === 'whitelist',
                            address: jetton.jetton.address,
                            type: 'JETTON'
                          }
                        })}
                        className={`bg-white dark:bg-[#0a0a0a]/80 backdrop-blur border-2 border-gray-200 dark:border-white/5 p-4 sm:p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-all group cursor-pointer shadow-sm ${!hasBalance ? 'opacity-60 grayscale-[0.5]' : ''}`}
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-xl relative group-hover:scale-105 transition-transform shrink-0 shadow-sm">
                            <TokenImage
                              src={jetton.jetton.image}
                              alt={jetton.jetton.symbol}
                              emoji={fallbackEmoji}
                              className="w-full h-full rounded-full object-cover"
                            />
                            {(jetton.jetton.verified || jetton.jetton.verification === 'whitelist') && (
                              <div className="absolute -bottom-1 -right-1 bg-emerald-500 dark:bg-emerald-600 rounded-full p-0.5 border-2 border-white dark:border-[#0a0a0a]">
                                <ShieldCheck size={8} className="text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-heading font-bold text-gray-900 dark:text-white truncate">
                              {jetton.jetton.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs font-numbers text-gray-500 dark:text-gray-400 font-medium truncate">
                                {jetton.price?.usd ? `$${jetton.price.usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : 'No price'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right ml-3">
                            <p className="text-sm font-numbers font-bold text-gray-900 dark:text-white whitespace-nowrap">
                              {hasBalance ? formatBalance(jetton.balance, jetton.jetton.decimals) : '0'} {jetton.jetton.symbol}
                            </p>
                            {jetton.price?.usd && (
                              <span className="text-[11px] font-numbers font-medium text-gray-500 dark:text-gray-400">
                                {hasBalance ? formatUsdValue(jetton.balance, jetton.jetton.decimals, jetton.price.usd) : '$0.00'}
                              </span>
                            )}
                          </div>
                          {hasBalance ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate('/wallet/receive', { state: { preselect: 'primary' } });
                                }}
                                className="p-2 sm:p-2.5 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl transition-all active:scale-95"
                                title="Receive"
                              >
                                <QrCode size={16} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate('/wallet/transfer', {
                                    state: {
                                      asset: 'JETTON',
                                      jettonAddress: jetton.jetton.address,
                                      jettonName: jetton.jetton.name,
                                      jettonSymbol: jetton.jetton.symbol,
                                      jettonDecimals: jetton.jetton.decimals,
                                      jettonBalance: jetton.balance,
                                      jettonWalletAddress: (jetton as any).walletAddress?.address
                                    }
                                  });
                                }}
                                className="p-2 sm:p-2.5 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl transition-all active:scale-95"
                                title={`Send ${jetton.jetton.symbol}`}
                              >
                                <Send size={16} />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate('/wallet/swap', {
                                  state: {
                                    toToken: jetton.jetton.symbol
                                  }
                                });
                              }}
                              className="p-2 sm:p-2.5 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-primary rounded-xl transition-all active:scale-95"
                              title={`Get ${jetton.jetton.symbol}`}
                            >
                              <PlusCircle size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
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

      <div className="mb-4">
        <BalanceVerification />
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
