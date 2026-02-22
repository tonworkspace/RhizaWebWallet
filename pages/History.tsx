
import React, { useState } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ExternalLink,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Calendar,
  Hash,
  Coins,
  MessageSquare,
  XCircle
} from 'lucide-react';
import { useTransactions } from '../hooks/useTransactions';
import { useWallet } from '../context/WalletContext';
import { getTransactionUrl, getExplorerUrl } from '../constants';
import LoadingSkeleton from '../components/LoadingSkeleton';

interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'swap' | 'purchase';
  amount: string;
  asset: string;
  timestamp: number;
  status: 'completed' | 'pending' | 'failed';
  address?: string;
  hash?: string;
  fee?: string;
  comment?: string;
}

const History: React.FC = () => {
  const { transactions, isLoading, error, refreshTransactions } = useTransactions();
  const { network } = useWallet();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'send' | 'receive'>('all');
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
  };

  const formatFullDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatRelativeTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const formatAddress = (addr?: string) => {
    if (!addr) return 'Unknown';
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'send':
        return <ArrowUpRight size={20} />;
      case 'receive':
        return <ArrowDownLeft size={20} />;
      case 'swap':
        return <RefreshCw size={20} />;
      default:
        return <ArrowUpRight size={20} />;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'send':
        return 'bg-red-500/10 text-red-500';
      case 'receive':
        return 'bg-emerald-500/10 text-emerald-500';
      case 'swap':
        return 'bg-amber-500/10 text-amber-500';
      default:
        return 'bg-white/5 text-gray-400';
    }
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = 
      tx.hash?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.comment?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterType === 'all' || tx.type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  // Group transactions by date
  const groupedTransactions = filteredTransactions.reduce((groups, tx) => {
    const date = new Date(tx.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let key: string;
    if (date.toDateString() === today.toDateString()) {
      key = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      key = 'Yesterday';
    } else {
      key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(tx);
    return groups;
  }, {} as Record<string, Transaction[]>);

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 page-enter px-3 sm:px-4 md:px-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Transaction History</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-500 font-medium mt-0.5 sm:mt-1">
            {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button 
          onClick={refreshTransactions}
          disabled={isLoading}
          className="p-2.5 sm:p-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl text-slate-500 dark:text-gray-500 hover:text-primary transition-all disabled:opacity-50 active:scale-95"
          title="Refresh"
        >
          <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
        <div className="relative flex-1 group">
          <Search size={14} className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-700 group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-xl sm:rounded-2xl py-2.5 sm:py-3 pl-10 sm:pl-11 pr-3 sm:pr-4 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-slate-400 dark:placeholder:text-gray-800"
          />
        </div>
        <div className="flex gap-1.5 sm:gap-2 bg-slate-100 dark:bg-white/5 rounded-xl sm:rounded-2xl p-1 border border-slate-200 dark:border-white/5">
          <button
            onClick={() => setFilterType('all')}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 ${
              filterType === 'all'
                ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-lg'
                : 'text-slate-500 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType('send')}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 ${
              filterType === 'send'
                ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-lg'
                : 'text-slate-500 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300'
            }`}
          >
            Sent
          </button>
          <button
            onClick={() => setFilterType('receive')}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 ${
              filterType === 'receive'
                ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-lg'
                : 'text-slate-500 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300'
            }`}
          >
            Received
          </button>
        </div>
      </div>

      {/* Transaction List */}
      <div className="space-y-4 sm:space-y-6">
        {error ? (
          <div className="p-4 sm:p-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl sm:rounded-2xl">
            <div className="flex items-start gap-2.5 sm:gap-3">
              <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <h4 className="font-bold text-sm sm:text-base text-red-900 dark:text-red-300 mb-1">Failed to load transactions</h4>
                <p className="text-xs sm:text-sm text-red-700 dark:text-red-400 mb-2.5 sm:mb-3">{error}</p>
                <button 
                  onClick={refreshTransactions}
                  className="px-3.5 sm:px-4 py-2 bg-red-600 text-white rounded-lg sm:rounded-xl text-xs font-black uppercase hover:bg-red-700 transition-all active:scale-95"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        ) : isLoading ? (
          <div className="space-y-2.5 sm:space-y-3">
            <LoadingSkeleton height={100} />
            <LoadingSkeleton height={100} />
            <LoadingSkeleton height={100} />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-8 sm:p-12 text-center bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl sm:rounded-2xl">
            <Coins size={40} className="sm:w-12 sm:h-12 mx-auto mb-2.5 sm:mb-3 text-slate-300 dark:text-gray-700" />
            <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white mb-1">
              {searchQuery ? 'No transactions found' : 'No transactions yet'}
            </h4>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">
              {searchQuery ? 'Try a different search term' : 'Your transaction history will appear here'}
            </p>
          </div>
        ) : (
          Object.entries(groupedTransactions).map(([date, txs]) => (
            <div key={date} className="space-y-2">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-gray-600 pl-1 sm:pl-2">
                {date}
              </h3>
              <div className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-2xl sm:rounded-[2rem] overflow-hidden divide-y divide-slate-100 dark:divide-white/5">
                {txs.map((tx) => (
                  <div key={tx.id}>
                    <div 
                      onClick={() => setExpandedTx(expandedTx === tx.id ? null : tx.id)}
                      className="p-3.5 sm:p-4 md:p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer group active:bg-slate-100 dark:active:bg-white/10"
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4 flex-1 min-w-0">
                        <div className={`w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 ${getIconBg(tx.type)}`}>
                          {getIcon(tx.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white capitalize">{tx.type}</h4>
                            {tx.status === 'completed' ? (
                              <CheckCircle2 size={12} className="text-emerald-500 flex-shrink-0" />
                            ) : tx.status === 'failed' ? (
                              <XCircle size={12} className="text-red-500 flex-shrink-0" />
                            ) : (
                              <Clock size={12} className="text-amber-500 animate-pulse flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-gray-500 font-mono mt-0.5 sm:mt-1 truncate">
                            {tx.comment ? (
                              <span className="italic">"{tx.comment}"</span>
                            ) : (
                              <span className="hidden sm:inline">{tx.type === 'send' ? 'To' : 'From'}: {formatAddress(tx.address)}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-1.5 sm:gap-2 md:gap-3 ml-2 sm:ml-3">
                        <div>
                          <div className={`font-black text-xs sm:text-sm whitespace-nowrap ${
                            tx.type === 'receive' ? 'text-emerald-500' : 'text-slate-900 dark:text-white'
                          }`}>
                            {tx.type === 'receive' ? '+' : '-'}{tx.amount} {tx.asset}
                          </div>
                          <p className="text-[10px] text-slate-400 dark:text-gray-600 font-bold mt-0.5 hidden sm:block">
                            {formatRelativeTime(tx.timestamp)}
                          </p>
                        </div>
                        {expandedTx === tx.id ? (
                          <ChevronUp size={16} className="text-slate-400 dark:text-gray-600 flex-shrink-0" />
                        ) : (
                          <ChevronDown size={16} className="text-slate-400 dark:text-gray-600 flex-shrink-0" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedTx === tx.id && (
                      <div className="px-3.5 sm:px-4 md:px-5 pb-3.5 sm:pb-4 md:pb-5 pt-2 bg-slate-50 dark:bg-white/5 space-y-2.5 sm:space-y-3 border-t border-slate-100 dark:border-white/5">
                        {/* Transaction Hash */}
                        {tx.hash && (
                          <div className="flex items-start gap-2 sm:gap-3">
                            <Hash size={14} className="text-slate-400 dark:text-gray-600 mt-1 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-gray-600 mb-1">
                                Transaction Hash
                              </p>
                              <div className="flex items-center gap-2">
                                <p className="text-[11px] sm:text-xs font-mono text-slate-700 dark:text-gray-300 break-all">
                                  {tx.hash}
                                </p>
                                <button
                                  onClick={() => handleCopyHash(tx.hash!)}
                                  className="p-1.5 sm:p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors flex-shrink-0 active:scale-95"
                                  title="Copy hash"
                                >
                                  {copiedHash === tx.hash ? (
                                    <CheckCircle2 size={12} className="text-green-500" />
                                  ) : (
                                    <Copy size={12} className="text-slate-400 dark:text-gray-500" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Address */}
                        {tx.address && (
                          <div className="flex items-start gap-2 sm:gap-3">
                            <ExternalLink size={14} className="text-slate-400 dark:text-gray-600 mt-1 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-gray-600 mb-1">
                                {tx.type === 'send' ? 'Recipient' : 'Sender'}
                              </p>
                              <div className="flex items-center gap-2">
                                <p className="text-[11px] sm:text-xs font-mono text-slate-700 dark:text-gray-300 break-all">
                                  {tx.address}
                                </p>
                                <button
                                  onClick={() => handleCopyAddress(tx.address!)}
                                  className="p-1.5 sm:p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors flex-shrink-0 active:scale-95"
                                  title="Copy address"
                                >
                                  <Copy size={12} className="text-slate-400 dark:text-gray-500" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Timestamp */}
                        <div className="flex items-start gap-2 sm:gap-3">
                          <Calendar size={14} className="text-slate-400 dark:text-gray-600 mt-1 flex-shrink-0" />
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-gray-600 mb-1">
                              Timestamp
                            </p>
                            <p className="text-[11px] sm:text-xs text-slate-700 dark:text-gray-300">
                              {formatFullDate(tx.timestamp)}
                            </p>
                          </div>
                        </div>

                        {/* Fee */}
                        {tx.fee && parseFloat(tx.fee) > 0 && (
                          <div className="flex items-start gap-2 sm:gap-3">
                            <Coins size={14} className="text-slate-400 dark:text-gray-600 mt-1 flex-shrink-0" />
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-gray-600 mb-1">
                                Network Fee
                              </p>
                              <p className="text-[11px] sm:text-xs text-slate-700 dark:text-gray-300">
                                {tx.fee} TON
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Comment */}
                        {tx.comment && (
                          <div className="flex items-start gap-2 sm:gap-3">
                            <MessageSquare size={14} className="text-slate-400 dark:text-gray-600 mt-1 flex-shrink-0" />
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-gray-600 mb-1">
                                Comment
                              </p>
                              <p className="text-[11px] sm:text-xs text-slate-700 dark:text-gray-300 italic">
                                "{tx.comment}"
                              </p>
                            </div>
                          </div>
                        )}

                        {/* View in Explorer */}
                        {tx.hash && (
                          <button
                            onClick={() => window.open(getTransactionUrl(tx.hash!, network), '_blank')}
                            className="w-full mt-1 sm:mt-2 py-2.5 px-4 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95"
                          >
                            <ExternalLink size={14} />
                            View in Explorer
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default History;
