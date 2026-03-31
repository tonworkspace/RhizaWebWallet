import React, { useState, useEffect } from 'react';
import { Layers, ChevronDown, Check } from 'lucide-react';
import { WalletManager } from '../utils/walletManager';

interface ChainSelectorProps {
  selectedChain: 'primary' | 'multichain-evm' | 'multichain-btc' | 'multichain-ton';
  onChainChange: (chain: 'primary' | 'multichain-evm' | 'multichain-btc' | 'multichain-ton') => void;
  multiChainBalances?: {
    evmBalance: string;
    tonBalance: string;
    btcBalance: string;
  } | null;
  className?: string;
  compact?: boolean;
}

const ChainSelector: React.FC<ChainSelectorProps> = ({
  selectedChain,
  onChainChange,
  multiChainBalances,
  className = '',
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMultiChainAvailable, setIsMultiChainAvailable] = useState(false);

  useEffect(() => {
    const checkMultiChainAvailability = async () => {
      const allWallets = WalletManager.getWallets();
      const multiChainWallet = allWallets.find(w => w.type === 'secondary');
      
      if (multiChainWallet) {
        setIsMultiChainAvailable(true);
        return;
      }
      
      // Check for legacy multi-chain wallet
      try {
        const { tetherWdkService } = await import('../services/tetherWdkService');
        setIsMultiChainAvailable(tetherWdkService.hasStoredWallet());
      } catch (error) {
        console.error('Failed to check legacy wallet:', error);
        setIsMultiChainAvailable(false);
      }
    };
    
    checkMultiChainAvailability();
  }, []);

  const chains = [
    {
      id: 'primary' as const,
      name: 'TON Vault',
      symbol: 'TON',
      icon: '💎',
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      textColor: 'text-blue-400',
      description: '24-word wallet',
      available: true
    },
    {
      id: 'multichain-evm' as const,
      name: 'EVM Chain',
      symbol: 'ETH',
      icon: '⟠',
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      textColor: 'text-purple-400',
      description: 'Polygon Network',
      balance: multiChainBalances?.evmBalance,
      available: isMultiChainAvailable
    },
    {
      id: 'multichain-ton' as const,
      name: 'TON Chain',
      symbol: 'TON',
      icon: '💠',
      color: 'from-blue-500 to-indigo-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      textColor: 'text-blue-400',
      description: 'WDK Multi-Chain',
      balance: multiChainBalances?.tonBalance,
      available: isMultiChainAvailable
    },
    {
      id: 'multichain-btc' as const,
      name: 'Bitcoin',
      symbol: 'BTC',
      icon: '₿',
      color: 'from-orange-500 to-amber-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20',
      textColor: 'text-orange-400',
      description: 'Bitcoin Network',
      balance: multiChainBalances?.btcBalance,
      available: isMultiChainAvailable
    }
  ];

  const selectedChainData = chains.find(c => c.id === selectedChain);
  const availableChains = chains.filter(c => c.available);

  if (compact) {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
        >
          <span className="text-lg">{selectedChainData?.icon}</span>
          <span className="text-xs font-bold">{selectedChainData?.symbol}</span>
          <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute top-full right-0 mt-2 w-64 bg-[#0a0a0a] border-2 border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
              {availableChains.map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => {
                    onChainChange(chain.id);
                    setIsOpen(false);
                  }}
                  className={`w-full p-3 flex items-center gap-3 transition-colors ${
                    selectedChain === chain.id
                      ? `${chain.bgColor} ${chain.borderColor} border-l-4`
                      : 'hover:bg-white/5'
                  }`}
                >
                  <span className="text-2xl">{chain.icon}</span>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{chain.name}</span>
                      {selectedChain === chain.id && (
                        <Check size={12} className={chain.textColor} />
                      )}
                    </div>
                    <span className="text-[10px] text-gray-500">{chain.description}</span>
                    {chain.balance && (
                      <div className="text-[10px] font-mono text-gray-400 mt-0.5">
                        {parseFloat(chain.balance).toFixed(6)} {chain.symbol}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Layers size={16} className="text-primary" />
        <span className="text-sm font-bold text-white">Select Chain</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {availableChains.map((chain) => (
          <button
            key={chain.id}
            onClick={() => onChainChange(chain.id)}
            disabled={!chain.available}
            className={`relative p-4 rounded-2xl border-2 transition-all ${
              selectedChain === chain.id
                ? `${chain.borderColor} ${chain.bgColor} shadow-lg`
                : chain.available
                ? 'border-white/10 bg-white/5 hover:bg-white/10'
                : 'border-white/5 bg-white/5 opacity-50 cursor-not-allowed'
            }`}
          >
            {/* Selected indicator */}
            {selectedChain === chain.id && (
              <div className="absolute top-3 right-3">
                <div className={`w-6 h-6 rounded-full ${chain.bgColor} flex items-center justify-center`}>
                  <Check size={14} className={chain.textColor} />
                </div>
              </div>
            )}

            {/* Chain icon and info */}
            <div className="flex items-start gap-3">
              <div className={`text-3xl p-2 rounded-xl ${chain.bgColor}`}>
                {chain.icon}
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-sm font-bold text-white mb-0.5">{chain.name}</h3>
                <p className="text-[10px] text-gray-500 mb-2">{chain.description}</p>
                
                {/* Balance display */}
                {chain.balance !== undefined && (
                  <div className={`text-xs font-mono ${chain.textColor}`}>
                    {parseFloat(chain.balance).toFixed(6)} {chain.symbol}
                  </div>
                )}

                {/* Unavailable badge */}
                {!chain.available && (
                  <span className="inline-block mt-2 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-gray-500/20 text-gray-500 rounded">
                    Create Multi-Chain Wallet
                  </span>
                )}
              </div>
            </div>

            {/* Gradient border effect when selected */}
            {selectedChain === chain.id && (
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${chain.color} opacity-10 pointer-events-none`} />
            )}
          </button>
        ))}
      </div>

      {/* Info message */}
      {!isMultiChainAvailable && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <p className="text-[10px] text-amber-400">
            💡 Create a Multi-Chain wallet to access EVM, TON, and BTC networks with a single 12-word phrase.
          </p>
        </div>
      )}
    </div>
  );
};

export default ChainSelector;
