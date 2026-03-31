import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Copy, ExternalLink, RefreshCw, ArrowRight, Wallet, Lock } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { useToast } from '../context/ToastContext';
import { WalletManager } from '../utils/walletManager';
import ChainSelector from '../components/ChainSelector';

const MultiChain: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isActivated } = useWallet();
  const [multiChainBalances, setMultiChainBalances] = useState<any>(null);
  const [multiChainAddresses, setMultiChainAddresses] = useState<any>(null);
  const [selectedChain, setSelectedChain] = useState<'primary' | 'multichain-evm' | 'multichain-btc' | 'multichain-ton'>('multichain-evm');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const allWallets = WalletManager.getWallets();
  const multiChainWallet = allWallets.find(w => w.type === 'secondary');
  
  // Check if tetherWdkService has a stored wallet (for legacy users)
  const [hasLegacyMultiChain, setHasLegacyMultiChain] = useState(false);
  
  useEffect(() => {
    const checkLegacyWallet = async () => {
      try {
        const { tetherWdkService } = await import('../services/tetherWdkService');
        setHasLegacyMultiChain(tetherWdkService.hasStoredWallet());
      } catch (error) {
        console.error('Failed to check legacy wallet:', error);
      }
    };
    checkLegacyWallet();
  }, []);
  
  const hasMultiChainWallet = !!multiChainWallet || hasLegacyMultiChain;

  useEffect(() => {
    if (hasMultiChainWallet) {
      fetchMultiChainData();
    } else if (!hasLegacyMultiChain && !multiChainWallet) {
      setIsLoading(false);
    }
  }, [hasMultiChainWallet, hasLegacyMultiChain, multiChainWallet]);

  const fetchMultiChainData = async () => {
    try {
      const { tetherWdkService } = await import('../services/tetherWdkService');
      
      // Get addresses
      const addresses = await tetherWdkService.getAddresses();
      if (addresses) {
        setMultiChainAddresses({
          evmAddress: addresses.evmAddress,
          tonAddress: addresses.tonAddress,
          btcAddress: addresses.btcAddress
        });
      }

      // Get balances
      const balances = await tetherWdkService.getBalances();
      if (balances) {
        setMultiChainBalances(balances);
      }
    } catch (error) {
      console.error('Failed to fetch multi-chain data:', error);
      showToast('Failed to load multi-chain wallet data', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchMultiChainData();
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard`, 'success');
  };

  const getChainInfo = () => {
    switch (selectedChain) {
      case 'multichain-evm':
        return {
          name: 'EVM (Polygon)',
          symbol: 'ETH',
          icon: '⟠',
          address: multiChainAddresses?.evmAddress,
          balance: multiChainBalances?.evmBalance,
          explorer: 'https://polygonscan.com/address/',
          color: 'purple'
        };
      case 'multichain-ton':
        return {
          name: 'TON',
          symbol: 'TON',
          icon: '💠',
          address: multiChainAddresses?.tonAddress,
          balance: multiChainBalances?.tonBalance,
          explorer: 'https://tonviewer.com/',
          color: 'blue'
        };
      case 'multichain-btc':
        return {
          name: 'Bitcoin',
          symbol: 'BTC',
          icon: '₿',
          address: multiChainAddresses?.btcAddress,
          balance: multiChainBalances?.btcBalance,
          explorer: 'https://blockstream.info/address/',
          color: 'orange'
        };
      default:
        return null;
    }
  };

  const chainInfo = getChainInfo();

  if (!isActivated) {
    return (
      <div className="p-6 sm:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-2 border-amber-500/20 rounded-3xl p-8 text-center">
            <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock size={32} className="text-amber-400" />
            </div>
            <h2 className="text-2xl font-black mb-3">Activation Required</h2>
            <p className="text-gray-400 mb-6">
              Multi-chain wallet access requires wallet activation. Activate your wallet to unlock EVM, TON, and Bitcoin support.
            </p>
            <button
              onClick={() => navigate('/wallet/dashboard')}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 sm:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="animate-spin text-primary" size={32} />
          </div>
        </div>
      </div>
    );
  }

  if (!hasMultiChainWallet) {
    return (
      <div className="p-6 sm:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-2 border-violet-500/20 rounded-3xl p-8 text-center">
            <div className="w-16 h-16 bg-violet-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Layers size={32} className="text-violet-400" />
            </div>
            <h2 className="text-2xl font-black mb-3">No Multi-Chain Wallet</h2>
            <p className="text-gray-400 mb-6">
              Create a multi-chain wallet to access EVM (Polygon), TON, and Bitcoin networks with a single 12-word phrase.
            </p>
            <button
              onClick={() => navigate('/wallet/create')}
              className="px-6 py-3 bg-violet-500 hover:bg-violet-600 text-white font-bold rounded-xl transition-colors"
            >
              Create Multi-Chain Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black mb-2">Multi-Chain Wallet</h1>
            <p className="text-gray-400 text-sm">
              Manage your EVM, TON, and Bitcoin assets in one place
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors disabled:opacity-50"
          >
            <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Chain Selector */}
        <ChainSelector
          selectedChain={selectedChain}
          onChainChange={setSelectedChain}
          multiChainBalances={multiChainBalances}
        />

        {/* Selected Chain Details */}
        {chainInfo && (
          <div className="bg-white/5 border-2 border-white/10 rounded-3xl p-6 space-y-6">
            {/* Balance Card */}
            <div className={`bg-gradient-to-br from-${chainInfo.color}-500/10 to-${chainInfo.color}-600/10 border-2 border-${chainInfo.color}-500/20 rounded-2xl p-6`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{chainInfo.icon}</span>
                  <div>
                    <h3 className="text-lg font-bold">{chainInfo.name}</h3>
                    <p className="text-xs text-gray-500">Available Balance</p>
                  </div>
                </div>
              </div>
              <div className="text-3xl font-black mb-2">
                {chainInfo.balance ? parseFloat(chainInfo.balance).toFixed(6) : '0.000000'} {chainInfo.symbol}
              </div>
            </div>

            {/* Address Card */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Wallet Address</h4>
              <div className="bg-black/20 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <code className="text-xs font-mono text-gray-300 break-all flex-1">
                    {chainInfo.address || 'Loading...'}
                  </code>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(chainInfo.address, 'Address')}
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                      title="Copy address"
                    >
                      <Copy size={16} />
                    </button>
                    <a
                      href={`${chainInfo.explorer}${chainInfo.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                      title="View on explorer"
                    >
                      <ExternalLink size={16} />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/wallet/transfer', { 
                  state: { 
                    asset: selectedChain === 'multichain-evm' ? 'EVM' : selectedChain === 'multichain-btc' ? 'BTC' : 'TON' 
                  } 
                })}
                className="flex items-center justify-center gap-2 px-6 py-4 bg-primary hover:bg-primary/90 text-black font-bold rounded-xl transition-colors"
              >
                <ArrowRight size={20} />
                Send {chainInfo.symbol}
              </button>
              <button
                onClick={() => navigate('/wallet/assets')}
                className="flex items-center justify-center gap-2 px-6 py-4 bg-white/5 hover:bg-white/10 border-2 border-white/10 font-bold rounded-xl transition-colors"
              >
                <Wallet size={20} />
                View Assets
              </button>
            </div>
          </div>
        )}

        {/* Info Card */}
        <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-2 border-blue-500/20 rounded-2xl p-6">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <span className="text-blue-400">ℹ️</span>
            About Multi-Chain Wallet
          </h3>
          <ul className="space-y-2 text-sm text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>One 12-word phrase controls all three chains (EVM, TON, BTC)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Powered by Tether's Wallet Development Kit (WDK)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Each chain has its own unique address derived from your seed phrase</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Network (mainnet/testnet) applies to all chains simultaneously</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MultiChain;
