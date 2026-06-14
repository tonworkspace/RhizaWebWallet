import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Copy, ExternalLink, RefreshCw, ArrowRight, Wallet, Lock, KeyRound, Eye, EyeOff, Trash2, AlertCircle } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { useToast } from '../context/ToastContext';
import { WalletManager } from '../utils/walletManager';
import ChainSelector from '../components/ChainSelector';

const MultiChain: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isActivated, logout } = useWallet();
  const [multiChainBalances, setMultiChainBalances] = useState<any>(null);
  const [multiChainAddresses, setMultiChainAddresses] = useState<any>(null);
  const [selectedChain, setSelectedChain] = useState<'primary' | 'multichain-evm' | 'multichain-btc' | 'multichain-ton' | 'multichain-sol'>('multichain-evm');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Unlock state variables
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const allWallets = WalletManager.getWallets();
  const activeWallet = WalletManager.getActiveWallet();
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
  
  const hasMultiChainWallet = 
    !!multiChainWallet || 
    hasLegacyMultiChain || 
    activeWallet?.type === 'primary' || 
    localStorage.getItem('rhiza_active_wallet_type') === 'primary';

  useEffect(() => {
    if (hasMultiChainWallet) {
      fetchMultiChainData();
    } else {
      setIsLoading(false);
    }
  }, [hasMultiChainWallet]);

  const fetchMultiChainData = async () => {
    try {
      const { tetherWdkService } = await import('../services/tetherWdkService');
      
      // If the engine isn't initialized, try to auto-unlock from WDK storage or primary session
      if (!tetherWdkService.isInitialized()) {
        let phrase: string | null = null;
        if (tetherWdkService.hasStoredWallet()) {
          phrase = await tetherWdkService.getStoredWallet(); // Tries to auto-unlock (device-encrypted or plaintext)
        } else {
          const { tonWalletService } = await import('../services/tonWalletService');
          if (tonWalletService.hasStoredSession()) {
            const mnemonic = await tonWalletService.getStoredSession('');
            if (mnemonic) {
              phrase = mnemonic.join(' ');
            }
          }
        }

        if (phrase) {
          await tetherWdkService.initializeManagers(phrase);
        } else {
          // Password required
          setNeedsUnlock(true);
          setIsLoading(false);
          return;
        }
      }

      // Check if initialization is complete
      if (!tetherWdkService.isInitialized()) {
        setNeedsUnlock(true);
        setIsLoading(false);
        return;
      }
      
      // Get addresses
      const addresses = await tetherWdkService.getAddresses();
      if (addresses) {
        setMultiChainAddresses({
          evmAddress: addresses.evmAddress,
          tonAddress: addresses.tonAddress,
          btcAddress: addresses.btcAddress,
          solAddress: addresses.solAddress
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

  const handleUnlock = async () => {
    if (!password) return;
    setIsUnlocking(true);
    setUnlockError(null);
    try {
      const { tetherWdkService } = await import('../services/tetherWdkService');
      let phrase: string | null = null;

      if (tetherWdkService.hasStoredWallet()) {
        phrase = await tetherWdkService.getStoredWallet(password);
      } else {
        const { tonWalletService } = await import('../services/tonWalletService');
        const mnemonic = await tonWalletService.getStoredSession(password);
        if (mnemonic) {
          phrase = mnemonic.join(' ');
        }
      }

      if (!phrase) {
        setUnlockError('Incorrect password. Please try again.');
        setIsUnlocking(false);
        return;
      }
      
      await tetherWdkService.initializeManagers(phrase);
      setNeedsUnlock(false);
      setIsLoading(true);
      await fetchMultiChainData();
      showToast('Multi-Chain Wallet unlocked successfully!', 'success');
    } catch (error: any) {
      console.error('Unlock error:', error);
      setUnlockError(error?.message || 'Failed to unlock wallet. Please check password.');
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleDeleteWallet = () => {
    if (window.confirm('Are you sure you want to delete this Multi-Chain Wallet from this device? Make sure you have backed up your 12-word recovery phrase. This action cannot be undone.')) {
      if (multiChainWallet) {
        WalletManager.removeWallet(multiChainWallet.id);
      }
      localStorage.removeItem('rhiza_secondary_wallet');
      localStorage.removeItem('rhiza_secondary_wallet_encrypted');
      try {
        import('../services/tetherWdkService').then(({ tetherWdkService }) => {
          tetherWdkService.deleteWallet();
        });
      } catch (e) {
        console.error('Failed to call tetherWdkService.deleteWallet:', e);
      }
      showToast('Multi-Chain Wallet local data deleted.', 'success');

      if (activeWallet?.type === 'secondary') {
        logout();
        navigate('/login');
      } else {
        window.location.reload();
      }
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
      case 'multichain-sol':
        return {
          name: 'Solana',
          symbol: 'SOL',
          icon: '◎',
          address: multiChainAddresses?.solAddress,
          balance: multiChainBalances?.sol,
          explorer: 'https://explorer.solana.com/address/',
          color: 'purple'
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
          <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-2 border-amber-500/20 rounded-3xl p-8 text-center luxury-card page-enter">
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
          <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-2 border-violet-500/20 rounded-3xl p-8 text-center luxury-card page-enter font-heading">
            <div className="w-16 h-16 bg-violet-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Layers size={32} className="text-violet-400" />
            </div>
            <h2 className="text-2xl font-black mb-3 text-slate-900 dark:text-white">No Multi-Chain Wallet</h2>
            <p className="text-slate-500 dark:text-gray-400 mb-6 text-sm leading-relaxed">
              Create a multi-chain wallet to access EVM (Polygon), TON, and Bitcoin networks with a single 12-word phrase.
            </p>
            <button
              onClick={() => navigate('/wallet/create')}
              className="px-6 py-3.5 bg-violet-500 hover:bg-violet-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30"
            >
              Create Multi-Chain Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (needsUnlock) {
    return (
      <div className="p-6 sm:p-8">
        <div className="max-w-md mx-auto">
          <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-2 border-amber-500/20 rounded-3xl p-6 sm:p-8 space-y-6 luxury-card page-enter font-heading">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0">
                <KeyRound size={24} className="text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Unlock Multi-Chain Wallet</h3>
                <p className="text-xs text-amber-500 dark:text-amber-400 font-semibold mt-0.5">Enter password to restore live balances</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="relative group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setUnlockError(null); }}
                  onKeyDown={e => e.key === 'Enter' && password && !isUnlocking && handleUnlock()}
                  placeholder="Enter your wallet password"
                  className="w-full bg-black/40 border border-amber-500/30 dark:border-white/10 group-hover:border-white/20 focus:border-amber-400/60 dark:focus:border-amber-400 rounded-xl p-3.5 text-slate-900 dark:text-white text-sm font-medium outline-none focus:ring-2 focus:ring-amber-500/20 transition-all pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {unlockError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-xs font-semibold">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{unlockError}</span>
                </div>
              )}

              <button
                onClick={handleUnlock}
                disabled={isUnlocking || !password}
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20"
              >
                {isUnlocking ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Unlocking...</span>
                  </>
                ) : (
                  <>
                    <KeyRound size={16} />
                    <span>Unlock & Refresh</span>
                  </>
                )}
              </button>
            </div>

            <div className="border-t border-slate-200 dark:border-white/10 pt-4 flex flex-col items-center gap-2 text-center">
              <span className="text-[11px] text-slate-500 dark:text-gray-500 font-medium">Forgot password or want to start fresh?</span>
              <button
                onClick={handleDeleteWallet}
                className="text-xs text-red-500 hover:text-red-600 hover:underline font-bold flex items-center gap-1"
              >
                <Trash2 size={12} />
                <span>Delete local wallet data</span>
              </button>
            </div>
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
                    asset: selectedChain === 'multichain-evm' ? 'EVM' : selectedChain === 'multichain-btc' ? 'BTC' : selectedChain === 'multichain-sol' ? 'SOL' : 'TON' 
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
