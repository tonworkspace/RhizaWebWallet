
import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  Search, 
  Coins, 
  LayoutGrid,
  ExternalLink,
  Filter,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { tonWalletService } from '../services/tonWalletService';
import { getExplorerUrl } from '../constants';
import LoadingSkeleton from '../components/LoadingSkeleton';

interface Jetton {
  balance: string;
  jetton: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    image?: string;
    verification?: string;
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
  const { address, network, balance: tonBalance, userProfile } = useWallet();
  const [activeTab, setActiveTab] = useState<'tokens' | 'nfts'>('tokens');
  const [jettons, setJettons] = useState<Jetton[]>([]);
  const [nfts, setNFTs] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingNFTs, setIsLoadingNFTs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nftError, setNftError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchJettons();
  }, [address, network]);

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
      const result = await tonWalletService.getJettons(address);
      
      if (result.success) {
        setJettons(result.jettons || []);
        console.log(`✅ Loaded ${result.jettons?.length || 0} jettons`);
      } else {
        throw new Error(result.error || 'Failed to fetch jettons');
      }
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

  const handleRefresh = () => {
    if (activeTab === 'tokens') {
      fetchJettons();
    } else {
      fetchNFTs();
    }
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

  const getVerificationBadge = (verification?: string) => {
    if (verification === 'whitelist') {
      return <span className="text-[10px] text-green-500" title="Verified">✓</span>;
    }
    return null;
  };

  // Filter jettons based on search query
  const filteredJettons = jettons.filter(jetton => 
    jetton.jetton.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    jetton.jetton.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter NFTs based on search query
  const filteredNFTs = nfts.filter(nft =>
    nft.metadata?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    nft.collection?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate total portfolio value
  const tonBalanceNum = parseFloat(tonBalance) || 0;
  const tonPrice = 2.45; // TODO: Get from price API
  const rzcBalance = (userProfile as any)?.rzc_balance || 0;
  const rzcPrice = 0.10; // 1 RZC = $0.10
  const totalValue = (tonBalanceNum * tonPrice) + (rzcBalance * rzcPrice);

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
          <h1 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Portfolio Assets</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-500 font-medium mt-0.5 sm:mt-1">
            Total Value: ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2.5 sm:p-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl text-slate-500 dark:text-gray-500 hover:text-primary transition-all disabled:opacity-50 active:scale-95"
            title="Refresh"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex p-1 bg-slate-100 dark:bg-white/5 rounded-xl sm:rounded-[1.25rem] border border-slate-200 dark:border-white/5">
        <button 
          onClick={() => setActiveTab('tokens')}
          className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 rounded-lg sm:rounded-[1rem] text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 active:scale-95 ${
            activeTab === 'tokens' 
              ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-lg' 
              : 'text-slate-500 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300'
          }`}
        >
          <Coins size={14} /> Tokens
        </button>
        <button 
          onClick={() => setActiveTab('nfts')}
          className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 rounded-lg sm:rounded-[1rem] text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 active:scale-95 ${
            activeTab === 'nfts' 
              ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-lg' 
              : 'text-slate-500 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300'
          }`}
        >
          <LayoutGrid size={14} /> NFTs
        </button>
      </div>

      {/* Search */}
      {(activeTab === 'tokens' || activeTab === 'nfts') && (
        <div className="relative group">
          <Search size={14} className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-700 group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder={activeTab === 'tokens' ? 'Search tokens...' : 'Search NFTs...'}
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
                {/* TON Balance (Always first) */}
                <div className="py-4 px-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 group-hover:scale-105 transition-transform">
                      💎
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">Toncoin</h4>
                        <span className="text-[10px] text-green-500">✓</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-gray-500 font-bold tracking-tight">
                        {tonBalanceNum.toFixed(4)} <span className="text-slate-400 dark:text-gray-700">TON</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-sm text-slate-900 dark:text-white">
                      ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] font-black text-slate-400 dark:text-gray-600">
                      Native
                    </div>
                  </div>
                </div>

                {/* RZC Balance (Community Token) */}
                {userProfile && (
                  <div className="py-4 px-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl bg-gradient-to-br from-[#00FF88]/10 to-[#00CCFF]/10 border border-[#00FF88]/20 group-hover:scale-105 transition-transform">
                        ⚡
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">RhizaCore Token</h4>
                          <span className="text-[10px] text-[#00FF88]">✓</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-gray-500 font-bold tracking-tight">
                          {((userProfile as any).rzc_balance || 0).toLocaleString()} <span className="text-slate-400 dark:text-gray-700">RZC</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-sm text-[#00FF88]">
                        ${(((userProfile as any).rzc_balance || 0) * 0.10).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] font-black text-slate-400 dark:text-gray-600">
                        Community
                      </div>
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
                  filteredJettons.map((jetton) => (
                    <div 
                      key={jetton.jetton.address} 
                      className="py-4 px-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 group-hover:scale-105 transition-transform overflow-hidden">
                          {jetton.jetton.image ? (
                            <img src={jetton.jetton.image} alt={jetton.jetton.symbol} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm">🪙</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{jetton.jetton.name}</h4>
                            {getVerificationBadge(jetton.jetton.verification)}
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-gray-500 font-bold tracking-tight">
                            {formatBalance(jetton.balance, jetton.jetton.decimals)} <span className="text-slate-400 dark:text-gray-700">{jetton.jetton.symbol}</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right ml-3">
                        {jetton.price?.usd ? (
                          <>
                            <div className="font-black text-sm text-slate-900 dark:text-white whitespace-nowrap">
                              {formatUsdValue(jetton.balance, jetton.jetton.decimals, jetton.price.usd)}
                            </div>
                            <div className="text-[10px] font-black text-slate-400 dark:text-gray-600">
                              ${jetton.price.usd.toFixed(4)}
                            </div>
                          </>
                        ) : (
                          <div className="text-[10px] font-black text-slate-400 dark:text-gray-600">
                            No price
                          </div>
                        )}
                      </div>
                    </div>
                  ))
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
