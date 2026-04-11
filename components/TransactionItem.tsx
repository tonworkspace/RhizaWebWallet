import React from 'react';
import { ArrowUpRight, ArrowDownLeft, RefreshCw, ShoppingBag, ExternalLink, Gift } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { getTransactionUrl, CHAIN_META } from '../constants';

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
  counterpartyUsername?: string;
}

interface TransactionItemProps {
  transaction: Transaction;
  onClick?: () => void;
}

// Chain-aware explorer URL for EVM and BTC transactions
function getExplorerUrl(hash: string, asset: string, evmChain: string): string {
  if (asset === 'BTC') return `https://mempool.space/tx/${hash}`;
  if (asset === 'ETH' || asset === 'ETH/Polygon') {
    const explorers: Record<string, string> = {
      ethereum: 'https://etherscan.io/tx',
      polygon: 'https://polygonscan.com/tx',
      arbitrum: 'https://arbiscan.io/tx',
      bsc: 'https://bscscan.com/tx',
      avalanche: 'https://snowtrace.io/tx',
      sepolia: 'https://sepolia.etherscan.io/tx',
    };
    return `${explorers[evmChain] ?? 'https://etherscan.io/tx'}/${hash}`;
  }
  return ''; // TON and RZC handled by getTransactionUrl
}

const TransactionItem: React.FC<TransactionItemProps> = ({ transaction, onClick }) => {
  const { network, currentEvmChain } = useWallet();

  const isEvm = transaction.asset === 'ETH' || transaction.asset === 'ETH/Polygon';
  const isBtc = transaction.asset === 'BTC';
  const isRzc = transaction.asset === 'RZC';
  const isMultiChain = isEvm || isBtc;

  const getIcon = () => {
    switch (transaction.type) {
      case 'send':    return <ArrowUpRight size={18} className="text-rose-500" />;
      case 'receive': return <ArrowDownLeft size={18} className="text-emerald-500" />;
      case 'swap':    return <RefreshCw size={18} className="text-blue-500" />;
      case 'purchase':
        // RZC rewards/bonuses use Gift icon; actual purchases use ShoppingBag
        return isRzc
          ? <Gift size={18} className="text-emerald-500" />
          : <ShoppingBag size={18} className="text-purple-500" />;
    }
  };

  const getAssetBadgeColor = () => {
    if (isRzc) return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';
    if (isEvm) return 'bg-blue-500/15 text-blue-600 dark:text-blue-400';
    if (isBtc) return 'bg-orange-500/15 text-orange-600 dark:text-orange-400';
    return '';
  };

  const getStatusColor = () => {
    switch (transaction.status) {
      case 'completed': return 'text-emerald-500';
      case 'pending':   return 'text-yellow-500';
      case 'failed':    return 'text-red-500';
    }
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const formatAddress = (addr?: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleExplorerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!transaction.hash) return;
    let url: string;
    if (isMultiChain) {
      url = getExplorerUrl(transaction.hash, transaction.asset, currentEvmChain);
    } else {
      url = getTransactionUrl(transaction.hash, network);
    }
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Display asset label — normalize ETH/Polygon to chain-aware symbol
  const assetLabel = isEvm
    ? (CHAIN_META[currentEvmChain]?.symbol ?? 'ETH')
    : transaction.asset;

  // Fee label — TON for TON txs, native symbol for EVM, BTC for BTC
  const feeLabel = isEvm
    ? CHAIN_META[currentEvmChain]?.symbol ?? 'ETH'
    : isBtc ? 'BTC' : 'TON';

  const canOpenExplorer = !isRzc && !!transaction.hash;

  return (
    <div
      onClick={onClick}
      className="p-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/[0.08] transition-all cursor-pointer group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            transaction.type === 'send'
              ? 'bg-rose-100 dark:bg-rose-500/10'
              : transaction.type === 'receive'
              ? 'bg-emerald-100 dark:bg-emerald-500/10'
              : transaction.type === 'swap'
              ? 'bg-blue-100 dark:bg-blue-500/10'
              : isRzc
              ? 'bg-emerald-100 dark:bg-emerald-500/10'
              : 'bg-purple-100 dark:bg-purple-500/10'
          }`}>
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-slate-900 dark:text-white capitalize">
                {transaction.type}
              </span>
              {(isRzc || isEvm || isBtc) && (
                <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${getAssetBadgeColor()}`}>
                  {assetLabel}
                </span>
              )}
              <span className={`text-xs font-bold ${getStatusColor()}`}>
                {transaction.status}
              </span>
              {canOpenExplorer && (
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
              ) : transaction.counterpartyUsername ? (
                <span>{transaction.type === 'send' ? 'To' : 'From'}: @{transaction.counterpartyUsername}</span>
              ) : transaction.address ? (
                formatAddress(transaction.address)
              ) : (
                formatTime(transaction.timestamp)
              )}
            </div>
            {transaction.fee && parseFloat(transaction.fee) > 0 && !isRzc && (
              <div className="text-[10px] text-slate-400 dark:text-gray-500">
                Fee: {transaction.fee} {feeLabel}
              </div>
            )}
          </div>
        </div>
        <div className="text-right ml-3">
          <div className={`font-black text-sm whitespace-nowrap ${
            transaction.type === 'receive' || transaction.type === 'purchase'
              ? 'text-emerald-500 dark:text-emerald-400'
              : 'text-rose-500 dark:text-rose-400'
          }`}>
            {transaction.type === 'receive' || transaction.type === 'purchase' ? '+' : '-'}{transaction.amount} {assetLabel}
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
