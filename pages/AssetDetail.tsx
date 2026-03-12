import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, 
  Send, 
  Download, 
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  ExternalLink,
  TrendingUp,
  Info,
  RefreshCw,
  MoreVertical,
  Share2
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { useTransactions } from '../hooks/useTransactions';
import { useToast } from '../context/ToastContext';
import { getExplorerUrl, getTransactionUrl } from '../constants';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

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
  type: 'TON' | 'RZC' | 'JETTON';
}

const AssetDetail: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { address, network } = useWallet();
  const { showToast } = useToast();
  const { transactions, isLoading: txLoading, refreshTransactions } = useTransactions();
  
  // Get asset data from navigation state
  const assetData = location.state as AssetDetailProps;
  
  const [showMenu, setShowMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Mock price history data (replace with real API)
  const priceHistory = Array.from({ length: 24 }, (_, i) => ({
    time: i,
    price: assetData.price ? assetData.price * (1 + (Math.random() - 0.5) * 0.1) : 0
  }));

  useEffect(() => {
    if (!assetData) {
      navigate('/wallet/assets');
    }
  }, [assetData, navigate]);

  if (!assetData) {
    return null;
  }

  const handleCopyAddress = () => {
    if (assetData.address) {
      navigator.clipboard.writeText(assetData.address);
      showToast('Address copied!', 'success');
    } else if (address) {
      navigator.clipboard.writeText(address);
      showToast('Wallet address copied!', 'success');
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `${assetData.name} (${assetData.symbol})`,
      text: `Check out my ${assetData.symbol} balance: ${assetData.balance}`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share cancelled');
      }
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
    ? parseFloat(assetData.balance)
    : Number(assetData.balance) / Math.pow(10, assetData.decimals);
  
  const usdValue = assetData.price ? balanceNum * assetData.price : 0;

  // Filter transactions for this asset
  const assetTransactions = transactions.filter(tx => {
    if (assetData.type === 'TON') {
      return tx.asset === 'TON';
    } else if (assetData.type === 'RZC') {
      return tx.asset === 'RZC';
    } else {
      return tx.asset === assetData.symbol;
    }
  });

  return (
    <div className="max-w-xl mx-auto space-y-5 sm:space-y-6 page-enter px-3 sm:px-4 md:px-0 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate('/wallet/assets')}
          className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 active:scale-95"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex gap-2">
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 active:scale-95"
            >
              <MoreVertical size={18} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-2 bg-white dark:bg-[#0a0a0a] border-2 border-gray-300 dark:border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden min-w-[180px] animate-in fade-in slide-in-from-top-2 duration-200">
                <button
                  onClick={() => {
                    handleCopyAddress();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm font-bold text-gray-800 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-3"
                >
                  <Copy size={16} />
                  Copy Address
                </button>
                <button
                  onClick={() => {
                    handleShare();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm font-bold text-gray-800 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-3"
                >
                  <Share2 size={16} />
                  Share
                </button>
                {assetData.address && (
                  <button
                    onClick={() => {
                      window.open(getExplorerUrl(assetData.address!, network), '_blank');
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left text-sm font-bold text-gray-800 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-3"
                  >
                    <ExternalLink size={16} />
                    View in Explorer
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Asset Info Card */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-200/50 to-cyan-200/50 dark:from-primary/20 dark:to-secondary/20 rounded-[2rem] blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
        <div className="relative bg-white dark:bg-[#0a0a0a]/80 backdrop-blur-xl border-2 border-gray-300 dark:border-white/5 rounded-[2rem] overflow-hidden p-6 sm:p-8 shadow-lg">
          {/* Token Icon & Name */}
          <div className="flex flex-col items-center text-center space-y-4 mb-6">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl bg-slate-100 dark:bg-white/5 border-2 border-slate-200 dark:border-white/5 shadow-xl">
              {assetData.image ? (
                <img src={assetData.image} alt={assetData.symbol} className="w-full h-full object-cover rounded-3xl" />
              ) : (
                <span>{assetData.emoji || '🪙'}</span>
              )}
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">{assetData.name}</h2>
                {assetData.verified && (
                  <span className="text-green-500 text-sm">✓</span>
                )}
              </div>
              <p className="text-sm text-slate-500 dark:text-gray-500 font-bold">{assetData.symbol}</p>
            </div>
          </div>

          {/* Balance */}
          <div className="text-center space-y-2 mb-6">
            <h3 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              {assetData.type === 'RZC' 
                ? parseFloat(assetData.balance).toLocaleString()
                : formatBalance(assetData.balance, assetData.decimals)
              }
            </h3>
            <p className="text-sm text-slate-500 dark:text-gray-500 font-bold">
              {assetData.symbol}
            </p>
            {assetData.price && (
              <div className="space-y-1">
                <p className="text-2xl font-bold text-slate-700 dark:text-gray-300">
                  ${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-slate-400 dark:text-gray-600">
                  @ ${assetData.price.toFixed(assetData.price < 0.01 ? 4 : 2)} per {assetData.symbol}
                </p>
              </div>
            )}
          </div>

          {/* Price Chart */}
          {assetData.price && priceHistory.length > 0 && (
            <div className="h-32 w-full mb-6 opacity-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={priceHistory}>
                  <defs>
                    <linearGradient id="assetChartFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00FF88" stopOpacity={0.15}/>
                      <stop offset="100%" stopColor="#00FF88" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#00FF88" 
                    strokeWidth={2}
                    fill="url(#assetChartFill)" 
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/wallet/transfer', { 
                state: { 
                  asset: assetData.type,
                  ...(assetData.type === 'JETTON' && {
                    jettonAddress: assetData.address,
                    jettonName: assetData.name,
                    jettonSymbol: assetData.symbol,
                    jettonDecimals: assetData.decimals,
                    jettonBalance: assetData.balance
                  })
                } 
              })}
              className="flex-1 py-4 bg-primary text-black rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl"
            >
              <Send size={18} />
              Send
            </button>
            <button
              onClick={() => navigate('/wallet/receive')}
              className="flex-1 py-4 bg-white dark:bg-white/10 border-2 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-white/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Download size={18} />
              Receive
            </button>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 dark:text-gray-600">
            Transactions
          </h3>
          {assetTransactions.length > 0 && (
            <button
              onClick={() => navigate('/wallet/history')}
              className="text-xs font-bold text-primary hover:underline"
            >
              View All
            </button>
          )}
        </div>

        {txLoading ? (
          <div className="space-y-2">
            <LoadingSkeleton height={80} />
            <LoadingSkeleton height={80} />
            <LoadingSkeleton height={80} />
          </div>
        ) : assetTransactions.length === 0 ? (
          <div className="p-12 text-center bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl">
            <Info size={32} className="mx-auto mb-3 text-slate-300 dark:text-gray-700" />
            <h4 className="font-bold text-slate-900 dark:text-white mb-1">No transactions yet</h4>
            <p className="text-sm text-slate-500 dark:text-gray-400">
              Your {assetData.symbol} transactions will appear here
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-white/5">
            {assetTransactions.slice(0, 10).map((tx) => (
              <div 
                key={tx.id}
                onClick={() => tx.hash && window.open(getTransactionUrl(tx.hash, network), '_blank')}
                className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
                    tx.type === 'receive' 
                      ? 'bg-emerald-500/10 text-emerald-500' 
                      : 'bg-red-500/10 text-red-500'
                  }`}>
                    {tx.type === 'receive' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white capitalize">
                      {tx.type}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-gray-500 truncate">
                      {new Date(tx.timestamp).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-2">
                  <div>
                    <div className={`font-black text-sm ${
                      tx.type === 'receive' ? 'text-emerald-500' : 'text-slate-900 dark:text-white'
                    }`}>
                      {tx.type === 'receive' ? '+' : '-'}{tx.amount}
                    </div>
                    <p className="text-xs text-slate-400 dark:text-gray-600">
                      {tx.asset}
                    </p>
                  </div>
                  <ExternalLink size={14} className="text-slate-400 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Asset Info */}
      {assetData.address && (
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl p-5 space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-gray-600">
            Token Information
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between items-start">
              <span className="text-sm text-slate-500 dark:text-gray-500 font-medium">Contract Address</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-900 dark:text-white font-mono text-right">
                  {assetData.address.slice(0, 6)}...{assetData.address.slice(-4)}
                </span>
                <button
                  onClick={handleCopyAddress}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded transition-colors"
                >
                  <Copy size={14} className="text-slate-400 dark:text-gray-500" />
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500 dark:text-gray-500 font-medium">Decimals</span>
              <span className="text-sm text-slate-900 dark:text-white font-bold">{assetData.decimals}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500 dark:text-gray-500 font-medium">Network</span>
              <span className="text-sm text-slate-900 dark:text-white font-bold capitalize">{network}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetDetail;
