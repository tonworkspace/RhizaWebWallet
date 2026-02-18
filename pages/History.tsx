
import React, { useEffect } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ExternalLink,
  Info,
  AlertCircle
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';

const History: React.FC = () => {
  const { transactions, isLoading, refreshData, address } = useWallet();

  useEffect(() => {
    refreshData();
  }, []);

  const formatEvent = (event: any) => {
    const isOut = event.actions.some((a: any) => {
      if (a.type === 'TonTransfer') return a.TonTransfer.sender.address === address;
      if (a.type === 'JettonTransfer') return a.JettonTransfer.sender?.address === address;
      return false;
    });

    let type: 'send' | 'receive' | 'swap' | 'contract' = isOut ? 'send' : 'receive';
    let amount = '0';
    let asset = 'TON';
    let targetAddress = 'Unknown';

    // Simple heuristic for common actions
    const action = event.actions[0];
    if (action.type === 'TonTransfer') {
      amount = (Number(action.TonTransfer.amount) / 1e9).toFixed(2);
      targetAddress = isOut ? action.TonTransfer.recipient.address : action.TonTransfer.sender.address;
    } else if (action.type === 'JettonTransfer') {
      amount = (Number(action.JettonTransfer.amount) / Math.pow(10, action.JettonTransfer.jetton.decimals)).toFixed(2);
      asset = action.JettonTransfer.jetton.symbol;
      targetAddress = isOut ? action.JettonTransfer.recipient?.address : action.JettonTransfer.sender?.address;
    } else {
      type = 'contract';
    }

    return {
      id: event.event_id,
      type,
      amount,
      asset,
      timestamp: event.timestamp * 1000,
      status: event.in_progress ? 'pending' : 'confirmed',
      address: targetAddress || 'Smart Contract'
    };
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">Transaction History</h1>
        <div className="flex gap-2">
           <button 
             onClick={refreshData}
             className={`p-2 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-[#00FF88] transition-all ${isLoading ? 'animate-spin' : ''}`}
           >
            <RefreshCw size={18} />
          </button>
           <button className="p-2 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-colors">
            <Search size={18} />
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {isLoading && transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
             <div className="w-10 h-10 border-2 border-[#00FF88] border-t-transparent rounded-full animate-spin" />
             <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Querying Blockchain...</p>
          </div>
        ) : transactions.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 pl-2">Recent Events</h3>
            <div className="bg-[#0a0a0a]/50 border border-white/5 rounded-[2rem] overflow-hidden">
              {transactions.map((event, idx) => {
                const tx = formatEvent(event);
                return (
                  <div 
                    key={tx.id} 
                    className={`p-5 flex items-center justify-between hover:bg-white/5 transition-all cursor-pointer group ${idx !== transactions.length - 1 ? 'border-b border-white/5' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg ${
                        tx.type === 'receive' 
                          ? 'bg-emerald-500/10 text-emerald-500' 
                          : tx.type === 'contract' 
                            ? 'bg-blue-500/10 text-blue-500' 
                            : 'bg-white/5 text-gray-400'
                      }`}>
                        {tx.type === 'receive' ? <ArrowDownLeft size={20} /> : tx.type === 'contract' ? <Info size={20} /> : <ArrowUpRight size={20} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-white capitalize">{tx.type}</h4>
                          {tx.status === 'confirmed' ? (
                            <CheckCircle2 size={12} className="text-emerald-500" />
                          ) : (
                            <Clock size={12} className="text-amber-500 animate-pulse" />
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500 font-mono mt-1">
                          {tx.address.substring(0, 8)}...{tx.address.substring(tx.address.length - 8)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <div className={`font-black text-sm ${tx.type === 'receive' ? 'text-emerald-500' : 'text-white'}`}>
                          {tx.type === 'receive' ? '+' : '-'}{tx.amount} {tx.asset}
                        </div>
                        <p className="text-[10px] text-gray-600 font-bold mt-0.5">
                          {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <a 
                        href={`https://tonviewer.com/transaction/${tx.id}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-1 hover:text-[#00FF88] transition-colors"
                      >
                        <ExternalLink size={14} className="text-gray-800 group-hover:text-gray-500" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center bg-white/5 border border-dashed border-white/10 rounded-[2rem] space-y-4">
            <AlertCircle className="mx-auto text-gray-700" size={32} />
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">No activity found in this vault.</p>
          </div>
        )}

        <div className="text-center p-4">
           <p className="text-[9px] text-gray-700 font-black uppercase tracking-[0.3em]">Data synced with TON Mainnet</p>
        </div>
      </div>
    </div>
  );
};

export default History;
