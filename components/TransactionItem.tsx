import React from 'react';
import { ArrowUpRight, ArrowDownLeft, RefreshCw, ShoppingBag, ExternalLink } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { getTransactionUrl } from '../constants';

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

interface TransactionItemProps {
  transaction: Transaction;
  onClick?: () => void;
}

const TransactionItem: React.FC<TransactionItemProps> = ({ transaction, onClick }) => {
  const { network } = useWallet();
  
  const getIcon = () => {
    switch (transaction.type) {
      case 'send':
        return <ArrowUpRight size={18} className="text-red-500" />;
      case 'receive':
        return <ArrowDownLeft size={18} className="text-green-500" />;
      case 'swap':
        return <RefreshCw size={18} className="text-blue-500" />;
      case 'purchase':
        return <ShoppingBag size={18} className="text-purple-500" />;
    }
  };

  const getStatusColor = () => {
    switch (transaction.status) {
      case 'completed':
        return 'text-green-500';
      case 'pending':
        return 'text-yellow-500';
      case 'failed':
        return 'text-red-500';
    }
  };

  const formatTime = (timestamp: number) => {
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
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleExplorerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (transaction.hash) {
      const url = getTransactionUrl(transaction.hash, network);
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      onClick={onClick}
      className="p-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/10 transition-all cursor-pointer group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900 dark:text-white capitalize">
                {transaction.type}
              </span>
              <span className={`text-xs font-bold ${getStatusColor()}`}>
                {transaction.status}
              </span>
              {transaction.hash && (
                <button
                  onClick={handleExplorerClick}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors"
                  title="View on explorer"
                >
                  <ExternalLink size={12} className="text-slate-400 dark:text-gray-500" />
                </button>
              )}
            </div>
            <div className="text-xs text-slate-500 dark:text-gray-400 font-medium truncate">
              {transaction.comment ? (
                <span className="italic text-[8px]">"{transaction.comment}"</span>
              ) : transaction.address ? (
                formatAddress(transaction.address)
              ) : (
                formatTime(transaction.timestamp)
              )}
            </div>
            {transaction.fee && parseFloat(transaction.fee) > 0 && (
              <div className="text-[10px] text-slate-400 dark:text-gray-500">
                Fee: {transaction.fee} TON
              </div>
            )}
          </div>
        </div>
        <div className="text-right ml-3">
          <div className={`font-black text-sm whitespace-nowrap ${
            transaction.type === 'receive' ? 'text-green-500' : 'text-slate-900 dark:text-white'
          }`}>
            {transaction.type === 'receive' ? '+' : '-'}{transaction.amount} {transaction.asset}
          </div>
          <div className="text-xs text-slate-400 dark:text-gray-500">
            {formatTime(transaction.timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionItem;
