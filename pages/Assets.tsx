
import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  Search, 
  Coins, 
  LayoutGrid,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Info
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';

const Assets: React.FC = () => {
  const { jettons, nfts, refreshData, isLoading, balance } = useWallet();
  const [activeTab, setActiveTab] = useState<'tokens' | 'nfts'>('tokens');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    refreshData();
  }, []);

  const filteredJettons = jettons.filter(j => 
    j.jetton.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    j.jetton.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredNfts = nfts.filter(n => 
    (n.metadata?.name || 'Unnamed NFT').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (n.collection?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">My Assets</h1>
        <button 
          onClick={refreshData}
          className={`p-2 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-[#00FF88] transition-all ${isLoading ? 'animate-spin' : ''}`}
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center p-1 bg-white/5 rounded-xl border border-white/5">
        <button 
          onClick={() => setActiveTab('tokens')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'tokens' ? 'bg-white/10 text-[#00FF88]' : 'text-gray-500'}`}
        >
          <Coins size={14} /> Tokens
        </button>
        <button 
          onClick={() => setActiveTab('nfts')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'nfts' ? 'bg-white/10 text-[#00FF88]' : 'text-gray-500'}`}
        >
          <LayoutGrid size={14} /> NFTs
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for asset or address..."
          className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm outline-none focus:border-[#00FF88]/30 transition-all placeholder:text-gray-600"
        />
      </div>

      <div className="animate-in fade-in slide-in-from-top-2 duration-300">
        {activeTab === 'tokens' && (
          <div className="space-y-1">
            {/* Primary TON Balance Row */}
            {!searchQuery && (
              <div className="p-4 rounded-2xl flex items-center justify-between bg-[#00FF88]/5 border border-[#00FF88]/10 transition-all cursor-pointer group mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl bg-[#00FF88]/10 border border-[#00FF88]/20 shadow-sm text-[#00FF88]">
                    💎
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Toncoin</h4>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                      <span>Native Network Asset</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-bold text-sm text-white">
                      {balance} TON
                    </div>
                    <div className="text-[10px] font-bold text-emerald-500">
                      LIVE
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-gray-700 group-hover:text-[#00FF88] transition-colors" />
                </div>
              </div>
            )}

            {filteredJettons.length > 0 ? filteredJettons.map((j, idx) => {
              const formattedBalance = (Number(j.balance) / Math.pow(10, j.jetton.decimals || 9)).toLocaleString(undefined, { maximumFractionDigits: 4 });
              return (
                <div key={idx} className="p-4 rounded-2xl flex items-center justify-between hover:bg-white/5 border border-transparent hover:border-white/5 transition-all cursor-pointer group active:scale-[0.98]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl bg-white/5 border border-white/5 shadow-sm overflow-hidden">
                      {j.jetton.image ? <img src={j.jetton.image} className="w-full h-full object-cover" /> : '🪙'}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">{j.jetton.name}</h4>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                        <span>{formattedBalance} {j.jetton.symbol}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-bold text-sm text-white">
                        {j.jetton.symbol}
                      </div>
                      <div className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">
                        JETTON
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-gray-700 group-hover:text-gray-400 transition-colors" />
                  </div>
                </div>
              );
            }) : (
              !isLoading && searchQuery && (
                <div className="p-12 text-center text-gray-600">
                   <p className="text-xs font-black uppercase tracking-[0.2em]">No tokens found matching "{searchQuery}"</p>
                </div>
              )
            )}
            
            {jettons.length === 0 && !isLoading && !searchQuery && (
              <div className="p-12 text-center text-gray-600 bg-white/5 rounded-[2rem] border border-dashed border-white/5">
                <Info className="mx-auto mb-4 opacity-20" size={32} />
                <p className="text-xs font-black uppercase tracking-[0.2em]">No Jettons in this vault</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'nfts' && (
          <div className="grid grid-cols-2 gap-4 pb-8">
            {filteredNfts.length > 0 ? filteredNfts.map((nft, idx) => (
              <div key={idx} className="aspect-square rounded-[2rem] bg-[#0a0a0a] border border-white/5 overflow-hidden group cursor-pointer relative shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-[#00FF88]/10 via-transparent to-transparent opacity-40 group-hover:opacity-60 transition-opacity" />
                <div className="h-full w-full flex items-center justify-center overflow-hidden">
                  {nft.metadata?.image ? (
                    <img src={nft.metadata.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={nft.metadata.name} />
                  ) : (
                    <span className="text-4xl">🖼️</span>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/60 backdrop-blur-md border-t border-white/5">
                  <p className="text-[10px] font-black text-white tracking-wide uppercase truncate">
                    {nft.metadata?.name || 'Unnamed Asset'}
                  </p>
                  <p className="text-[9px] text-[#00FF88] font-black uppercase tracking-widest mt-1 truncate">
                    {nft.collection?.name || 'Individual Item'}
                  </p>
                </div>
              </div>
            )) : (
              !isLoading && (
                <div className="col-span-2 p-12 text-center text-gray-600 bg-white/5 rounded-[2rem] border border-dashed border-white/5">
                  <LayoutGrid className="mx-auto mb-4 opacity-20" size={32} />
                  <p className="text-xs font-black uppercase tracking-[0.2em]">No NFTs discovered in this vault</p>
                </div>
              )
            )}
          </div>
        )}
      </div>

      <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between group cursor-pointer hover:bg-white/10 transition-all">
        <div className="flex items-center gap-3 text-gray-400">
          <ExternalLink size={14} />
          <span className="text-xs font-bold">View full vault in TON Explorer</span>
        </div>
        <ChevronRight size={14} className="text-gray-700" />
      </div>
    </div>
  );
};

export default Assets;
