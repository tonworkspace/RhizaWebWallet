import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { CHAIN_META } from '../constants';
import { tetherWdkService, type EvmChain } from '../services/tetherWdkService';
import { useToast } from '../context/ToastContext';

const GlobalNetworkModal: React.FC = () => {
  const { isNetworkModalOpen, setIsNetworkModalOpen, refreshData, currentEvmChain, setCurrentEvmChain } = useWallet();
  const { showToast } = useToast();
  const [isSwitching, setIsSwitching] = useState(false);
  const evmChain = currentEvmChain;

  if (!isNetworkModalOpen) return null;

  const handleNetworkSelect = async (chainKey: EvmChain) => {
    setIsSwitching(true);
    
    // Switch chain in WDK
    await tetherWdkService.switchEvmChain(chainKey);
    
    // Sync the context so all components re-render with correct symbol
    if (setCurrentEvmChain) setCurrentEvmChain(chainKey);
    
    // Refresh global wallet data so all pages update balances
    await refreshData();
    
    setIsSwitching(false);
    setIsNetworkModalOpen(false);
    showToast(`Switched to ${CHAIN_META[chainKey]?.name || chainKey} network`, 'success');
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm" onClick={() => !isSwitching && setIsNetworkModalOpen(false)} />
      <div className="fixed z-[101] bottom-0 left-0 right-0 bg-white dark:bg-[#111] rounded-t-3xl p-5 shadow-2xl border-t border-gray-200 dark:border-white/10 max-w-xl mx-auto animate-in slide-in-from-bottom-full duration-300">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-gray-900 dark:text-white">Select Network</h3>
          <button 
            onClick={() => !isSwitching && setIsNetworkModalOpen(false)} 
            disabled={isSwitching}
            className="p-2 bg-gray-100 dark:bg-white/5 rounded-full text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pb-4 custom-scrollbar relative">
          {isSwitching && (
             <div className="absolute inset-0 z-10 bg-white/50 dark:bg-black/50 backdrop-blur-[1px] flex flex-col items-center py-6">
                 <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                 <p className="mt-3 text-sm font-bold text-gray-900 dark:text-white">Switching Network...</p>
             </div>
          )}
          {(Object.keys(CHAIN_META) as EvmChain[]).map((chainKey) => {
            const meta = CHAIN_META[chainKey];
            return (
              <button
                key={chainKey}
                disabled={isSwitching}
                onClick={() => handleNetworkSelect(chainKey)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  evmChain === chainKey 
                    ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30' 
                    : 'bg-transparent border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <img src={meta.logo} alt={meta.name} className="w-8 h-8 rounded-full shadow-sm" />
                  <span className={`font-bold ${evmChain === chainKey ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                    {meta.name}
                  </span>
                </div>
                {evmChain === chainKey && <Check size={18} className="text-blue-500" />}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default GlobalNetworkModal;
