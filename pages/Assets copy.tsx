
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
  Lock
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { tonWalletService } from '../services/tonWalletService';
import { getExplorerUrl } from '../constants';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { getJettonRegistryData, enhanceJettonData, getJettonPrice, getAllRegistryTokens } from '../services/jettonRegistry';
import TokenImage from '../components/TokenImage';
import { useToast } from '../context/ToastContext';
import { RZC_CONFIG } from '../config/rzcConfig';
import BalanceVerification from '../components/BalanceVerification';
import { useBalance } from '../hooks/useBalance';

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
  const { address, network, balance: tonBalance, userProfile, refreshData } = useWallet();
  const { tonPrice, btcPrice, ethPrice } = useBalance();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'tokens' | 'nfts'>('tokens');
  const [jettons, setJettons] = useState<Jetton[]>([]);
  const [nfts, setNFTs] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingNFTs, setIsLoadingNFTs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nftError, setNftError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tokenFilter, setTokenFilter] = useState<'all' | 'listed' | 'unlisted'>('all');
  const [canSendRzc, setCanSendRzc] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [multiChainBalances, setMultiChainBalances] = useState<{ evm: string, btc: string } | null>(null);

  useEffect(() => {
    const fetchMultiChainAssets = async () => {
      const { WalletManager } = await import('../utils/walletManager');
      const allWallets = WalletManager.getWallets();
      // Show multi-chain assets if ANY secondary wallet exists
      const secondaryWallet = allWallets.find(w => w.type === 'secondary');
      if (secondaryWallet) {
        try {
          const { tetherWdkService } = await import('../services/tetherWdkService');
          // Try live balances (WDK managers already initialised from login)
          const bals = await tetherWdkService.getBalances();
          if (bals) {
            setMultiChainBalances({ evm: bals.evmBalance, btc: bals.btcBalance });
          } else {
            // WDK session not active (e.g. page reload on primary wallet)
            // Still show cards with correct zero balances using stored address metadata
            setMultiChainBalances({ evm: '0.0000', btc: '0.00000000' });
          }
        } catch (e) {
          console.error("Failed fetching Multi-Chain EVM/BTC assets", e);
          setMultiChainBalances({ evm: '0.0000', btc: '0.00000000' });
        }
      } else {
        setMultiChainBalances(null);
      }
    };
    fetchMultiChainAssets();
    
    fetchJettons();
    // Refresh wallet balance when component mounts
    if (refreshData) {
      refreshData();
    }
  }, [address, network]);

  // Re-run whenever userProfile changes (e.g. after approval + refresh)
  useEffect(() => {
    checkRzcTransferStatus();
  }, [userProfile]);

  const checkRzcTransferStatus = async () => {
    if (!userProfile) return;
    
    // balance_locked = true means locked (cannot send), false means unlocked
    // balance_verified = true means verified
    const verified = (userProfile as any).balance_verified === true;
    const locked = (userProfile as any).balance_locked !== false; // default to locked if missing
    
    setIsVerified(verified);
    setCanSendRzc(verified && !locked);
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

    return matchesSearch && matchesFilter;
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
  const rzcPrice = RZC_CONFIG.RZC_PRICE_USD; // Config

  const evmNum = multiChainBalances ? parseFloat(multiChainBalances.evm) || 0 : 0;
  const btcNum = multiChainBalances ? parseFloat(multiChainBalances.btc) || 0 : 0;

  const totalValue = (tonBalanceNum * tonPrice) + (rzcBalance * rzcPrice) + (evmNum * ethPrice) + (btcNum * btcPrice);

  console.log('🔍 Assets Debug:', {
    tonBalance,
    tonBalanceType: typeof tonBalance,
    tonBalanceNum,
    totalValue
  });

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
    <div className="max-w-xl mx-auto space-y-5 sm:space-y-6 page-enter px-3 sm:px-4 md:px-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">{t('assets.title')}</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-500 font-medium mt-0.5 sm:mt-1">
            {t('assets.totalValue')}: ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 sm:p-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl text-slate-500 dark:text-gray-500 hover:text-primary transition-all disabled:opacity-50 active:scale-95"
            title="Refresh"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex p-1 bg-slate-100 dark:bg-white/5 rounded-xl sm:rounded-[1.25rem] border border-slate-200 dark:border-white/5">
        <button
          onClick={() => setActiveTab('tokens')}
          className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 rounded-lg sm:rounded-[1rem] text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 active:scale-95 ${activeTab === 'tokens'
              ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-lg'
              : 'text-slate-500 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300'
            }`}
        >
          <Coins size={14} /> {t('assets.tokens')}
        </button>
        <button
          onClick={() => setActiveTab('nfts')}
          className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 rounded-lg sm:rounded-[1rem] text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 active:scale-95 ${activeTab === 'nfts'
              ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-lg'
              : 'text-slate-500 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300'
            }`}
        >
          <LayoutGrid size={14} /> {t('assets.nfts')}
        </button>
      </div>

      {/* Search and Filter */}
      {activeTab === 'tokens' && (
        <div className="space-y-3">
          <div className="relative group">
            <Search size={14} className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-700 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder={t('history.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-xl sm:rounded-2xl py-2.5 sm:py-3 pl-10 sm:pl-11 pr-3 sm:pr-4 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-slate-400 dark:placeholder:text-gray-800"
            />
          </div>

          {/* Token Filter Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setTokenFilter('all')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${tokenFilter === 'all'
                  ? 'bg-primary text-black'
                  : 'bg-white dark:bg-white/5 text-slate-500 dark:text-gray-500 hover:bg-slate-100 dark:hover:bg-white/10'
                }`}
            >
              All Tokens
            </button>
            <button
              onClick={() => setTokenFilter('listed')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${tokenFilter === 'listed'
                  ? 'bg-green-500 text-white'
                  : 'bg-white dark:bg-white/5 text-slate-500 dark:text-gray-500 hover:bg-slate-100 dark:hover:bg-white/10'
                }`}
            >
              ✓ Listed
            </button>
            <button
              onClick={() => setTokenFilter('unlisted')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${tokenFilter === 'unlisted'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white dark:bg-white/5 text-slate-500 dark:text-gray-500 hover:bg-slate-100 dark:hover:bg-white/10'
                }`}
            >
              Unlisted
            </button>
          </div>
        </div>
      )}

      {activeTab === 'nfts' && (
        <div className="relative group">
          <Search size={14} className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-700 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder={t('history.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-xl sm:rounded-2xl py-2.5 sm:py-3 pl-10 sm:pl-11 pr-3 sm:pr-4 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-slate-400 dark:placeholder:text-gray-800"
          />
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
              <div className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-[2rem] overflow-hidden divide-y divide-slate-100 dark:divide-white/5">
              {/* RZC Balance Verification Banner - Only show if NOT verified */}
              {!canSendRzc && (
                <div className="mx-4 mt-3 mb-1 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 flex items-start gap-2.5">
                  <Lock size={14} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider">RZC Balance Verification Required</p>
                    <p className="text-[10px] text-amber-700 dark:text-amber-400/80 font-medium mt-0.5 leading-snug">
                      RZC transfers are temporarily disabled while we verify your balance. Check the verification section below for status.
                    </p>
                  </div>
                </div>
              )}

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
                  className="py-4 px-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 group-hover:scale-105 transition-transform">
                      💎
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">Toncoin</h4>
                        <span className="text-[10px] text-green-500">✓</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-gray-500 font-bold tracking-tight">
                        {tonBalanceNum.toFixed(4)} <span className="text-slate-400 dark:text-gray-700">TON</span>
                        {/* Debug: show raw balance */}
                        {process.env.NODE_ENV === 'development' && (
                          <span className="text-[8px] text-red-500 ml-2">Raw: {String(tonBalance)}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-black text-sm text-slate-900 dark:text-white">
                        ${(tonBalanceNum * tonPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] font-black text-slate-400 dark:text-gray-600">
                        Native
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/wallet/transfer', { state: { asset: 'TON' } });
                      }}
                      className="p-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-all active:scale-95"
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
                    className="py-4 px-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl bg-gradient-to-br from-[#00FF88]/10 to-[#00CCFF]/10 border border-[#00FF88]/20 group-hover:scale-105 transition-transform">
                        ⚡
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">RhizaCore Token</h4>
                          <span className="text-[10px] text-[#00FF88]">✓</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-gray-500 font-bold tracking-tight">
                          {((userProfile as any).rzc_balance || 0).toLocaleString()} <span className="text-slate-400 dark:text-gray-700">RZC</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-black text-sm text-[#00FF88]">
                          ${(((userProfile as any).rzc_balance || 0) * RZC_CONFIG.RZC_PRICE_USD).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] font-black text-slate-400 dark:text-gray-600">
                          Community {isVerified && '✓'}
                        </div>
                      </div>
                      {/* RZC Transfer - Dynamic based on verification status */}
                      {canSendRzc ? (
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
                          className="p-2 bg-[#00FF88]/10 hover:bg-[#00FF88]/20 text-[#00FF88] rounded-xl transition-all active:scale-95"
                          title="Send RZC"
                        >
                          <Send size={16} />
                        </button>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <div
                            title="RZC transfers disabled — balance verification required"
                            className="p-2 bg-amber-500/10 text-amber-500 rounded-xl cursor-not-allowed"
                          >
                            <Lock size={16} />
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Scroll to verification section
                              const verificationSection = document.querySelector('[data-verification-section]');
                              if (verificationSection) {
                                verificationSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }
                            }}
                            className="text-[8px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider hover:underline whitespace-nowrap"
                          >
                            Check Status
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* EVM Balance */}
                {multiChainBalances && (
                  <div
                    onClick={() => navigate('/wallet/asset-detail', {
                      state: {
                        symbol: 'ETH/EVM',
                        name: 'EVM Multi-Chain',
                        balance: multiChainBalances.evm,
                        decimals: 18,
                        emoji: '⟠',
                        price: ethPrice,
                        verified: true,
                        type: 'ETH'
                      }
                    })}
                    className="py-4 px-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl bg-blue-500/10 border border-blue-500/20 group-hover:scale-105 transition-transform text-blue-500">
                        ⟠
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">Polygon / Ethereum</h4>
                          <span className="text-[10px] text-[#00FF88]">✓</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-gray-500 font-bold tracking-tight">
                          {parseFloat(multiChainBalances.evm).toFixed(4)} <span className="text-slate-400 dark:text-gray-700">ETH</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-black text-sm text-blue-400">
                          ${(parseFloat(multiChainBalances.evm) * ethPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] font-black text-slate-400 dark:text-gray-600">
                          WDK Hub
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/wallet/transfer', { state: { asset: 'EVM' } });
                        }}
                        className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-xl transition-all active:scale-95"
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
                        name: 'Bitcoin Origin',
                        balance: multiChainBalances.btc,
                        decimals: 8,
                        emoji: '₿',
                        price: btcPrice,
                        verified: true,
                        type: 'BTC'
                      }
                    })}
                    className="py-4 px-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl bg-orange-500/10 border border-orange-500/20 group-hover:scale-105 transition-transform text-orange-500">
                        ₿
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">Bitcoin Mainnet</h4>
                          <span className="text-[10px] text-[#00FF88]">✓</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-gray-500 font-bold tracking-tight">
                          {parseFloat(multiChainBalances.btc).toFixed(5)} <span className="text-slate-400 dark:text-gray-700">BTC</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-black text-sm text-orange-400">
                          ${(parseFloat(multiChainBalances.btc) * btcPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] font-black text-slate-400 dark:text-gray-600">
                          WDK Hub
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/wallet/transfer', { state: { asset: 'BTC' } });
                        }}
                        className="p-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 rounded-xl transition-all active:scale-95"
                        title="Send BTC"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Jettons */}
                {filteredJettons.length === 0 && !isLoading ? (
                  <div className="py-12 px-5 text-center">
                    <Coins size={32} className="mx-auto mb-3 text-slate-300 dark:text-gray-700" />
                    <h4 className="font-bold text-slate-900 dark:text-white mb-1">
                      {searchQuery ? 'No tokens found' : 'No jettons yet'}
                    </h4>
                    <p className="text-sm text-slate-500 dark:text-gray-400">
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
                        className={`py-4 px-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-all group cursor-pointer ${!hasBalance ? 'opacity-60' : ''
                          }`}
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 group-hover:scale-105 transition-transform overflow-hidden">
                            <TokenImage
                              src={jetton.jetton.image}
                              alt={jetton.jetton.symbol}
                              emoji={fallbackEmoji}
                              className="w-full h-full"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{jetton.jetton.name}</h4>
                              {getVerificationBadge(jetton.jetton.verification, (jetton.jetton as any).verified)}
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-gray-500 font-bold tracking-tight">
                              {hasBalance ? formatBalance(jetton.balance, jetton.jetton.decimals) : '0'} <span className="text-slate-400 dark:text-gray-700">{jetton.jetton.symbol}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right ml-3">
                            {jetton.price?.usd ? (
                              <>
                                <div className="font-black text-sm text-slate-900 dark:text-white whitespace-nowrap">
                                  {hasBalance ? formatUsdValue(jetton.balance, jetton.jetton.decimals, jetton.price.usd) : '$0.00'}
                                </div>
                                <div className="text-[10px] font-black text-slate-400 dark:text-gray-600">
                                  ${jetton.price.usd.toFixed(jetton.price.usd < 0.01 ? 4 : 2)}
                                </div>
                              </>
                            ) : (
                              <div className="text-[10px] font-black text-slate-400 dark:text-gray-600">
                                No price
                              </div>
                            )}
                          </div>
                          {hasBalance ? (
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
                              className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl transition-all active:scale-95"
                              title={`Send ${jetton.jetton.symbol}`}
                            >
                              <Send size={16} />
                            </button>
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
                              className="p-2 bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 rounded-xl transition-all active:scale-95"
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
              <div className="p-12 text-center bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl">
                <LayoutGrid size={32} className="mx-auto mb-3 text-slate-300 dark:text-gray-700" />
                <h4 className="font-bold text-slate-900 dark:text-white mb-1">
                  {searchQuery ? 'No NFTs found' : 'No NFTs yet'}
                </h4>
                <p className="text-sm text-slate-500 dark:text-gray-400">
                  {searchQuery ? 'Try a different search term' : 'NFTs will appear here when you receive them'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredNFTs.map((nft) => (
                  <div
                    key={`${nft.address}-${nft.index}`}
                    className="aspect-square rounded-[2rem] bg-slate-100 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 overflow-hidden group cursor-pointer relative shadow-xl hover:border-primary transition-all"
                  >
                    {getNFTImage(nft) ? (
                      <img
                        src={getNFTImage(nft)}
                        alt={nft.metadata?.name || 'NFT'}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`${getNFTImage(nft) ? 'hidden' : ''} absolute inset-0 flex items-center justify-center text-4xl bg-gradient-to-br from-primary/10 to-secondary/10`}>
                      🖼️
                    </div>
                    {nft.verified && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">
                        ✓
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/60 to-transparent backdrop-blur-sm">
                      <p className="text-[10px] font-black text-white tracking-wide truncate">
                        {nft.metadata?.name || `NFT #${nft.index}`}
                      </p>
                      {nft.collection?.name && (
                        <p className="text-[8px] text-white/70 truncate mt-0.5">
                          {nft.collection.name}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* RZC Balance Verification Module */}
      {activeTab === 'tokens' && userProfile && (
        <div data-verification-section>
          <BalanceVerification />
        </div>
      )}

      {/* Explorer Link */}
      {address && (
        <button
          onClick={() => window.open(getExplorerUrl(address, network), '_blank')}
          className="w-full py-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-white/10 transition-all text-slate-500 dark:text-gray-500 group"
        >
          <ExternalLink size={14} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">View in Explorer</span>
        </button>
      )}
    </div>
  );
};

export default Assets;
