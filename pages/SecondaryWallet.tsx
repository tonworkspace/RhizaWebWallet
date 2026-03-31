import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers, Copy, Check, RefreshCw, ChevronLeft, Globe, ExternalLink, Trash2, Eye, EyeOff, KeyRound
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { WalletManager } from '../utils/walletManager';
import { useToast } from '../context/ToastContext';
import { QRCodeSVG } from 'qrcode.react';

const SecondaryWallet: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { address, isLoggedIn, logout } = useWallet();

  const [addresses, setAddresses] = useState<any>(null);
  const [balances, setBalances] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // WDK re-init state — when page refreshed, managers need to be restored
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [showUnlockPassword, setShowUnlockPassword] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [evmChain, setEvmChain] = useState<string>('polygon');

  const [showQR, setShowQR] = useState<null | 'evm' | 'ton' | 'btc'>(null);
  const [copiedAddr, setCopiedAddr] = useState<null | 'evm' | 'ton' | 'btc'>(null);

  // Determine if user has a multi-chain wallet (doesn't need to be the active one)
  const activeWallet = WalletManager.getWallets().find(w => w.address === address);
  const multiChainWallet = WalletManager.getWallets().find(w => w.type === 'secondary');
  const hasStoredSecondary = !!localStorage.getItem('rhiza_secondary_wallet');
  const isMultiChain = !!multiChainWallet || hasStoredSecondary;

  const loadMultiChainData = async () => {
    if (!isMultiChain) return;

    setIsLoading(true);
    setError(null);
    setNeedsUnlock(false);
    try {
      const { tetherWdkService } = await import('../services/tetherWdkService');
      const addrs = await tetherWdkService.getAddresses();

      if (addrs) {
        setAddresses(addrs);
        setEvmChain(tetherWdkService.getCurrentEvmChain());
        const bals = await tetherWdkService.getBalances();
        if (bals) setBalances(bals);
      } else {
        // WDK session not active (page reload) — check if we have a stored wallet to restore
        if (multiChainWallet?.addresses) {
          setAddresses({
            evmAddress: multiChainWallet.addresses.evm,
            tonAddress: multiChainWallet.addresses.ton,
            btcAddress: multiChainWallet.addresses.btc
          });
        }
        // Signal that the engine needs to be unlocked to fetch live balances
        const hasStored = tetherWdkService.hasStoredWallet();
        if (hasStored) {
          setNeedsUnlock(true);
        } else {
          setError('Multi-chain engine not active. Re-login to restore balances.');
        }
      }
    } catch (err) {
      console.error('Failed to load multi-chain data', err);
      setError('Could not connect to Multi-Chain RPC endpoints.');
    }
    setIsLoading(false);
  };

  const handleUnlock = async () => {
    setIsUnlocking(true);
    setError(null);
    try {
      const { tetherWdkService } = await import('../services/tetherWdkService');
      const phrase = await tetherWdkService.getStoredWallet(unlockPassword || undefined);
      if (!phrase) {
        setError('Incorrect password. Please try again.');
        setIsUnlocking(false);
        return;
      }
      const addrs = await tetherWdkService.initializeManagers(phrase);
      setAddresses(addrs);
      setNeedsUnlock(false);
      // Now fetch live balances
      const bals = await tetherWdkService.getBalances();
      if (bals) setBalances(bals);
      showToast('Multi-Chain Wallet unlocked!', 'success');
    } catch (e: any) {
      setError(e?.message || 'Failed to unlock wallet.');
    }
    setIsUnlocking(false);
  };

  useEffect(() => {
    if (isLoggedIn && isMultiChain) {
      loadMultiChainData();
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, isMultiChain]);

  // ---- Helpers ----
  const copyToClipboard = async (text: string, type: 'evm' | 'ton' | 'btc') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAddr(type);
      showToast('Address copied!', 'success');
      setTimeout(() => setCopiedAddr(null), 2000);
    } catch {
      showToast('Failed to copy', 'error');
    }
  };

  const removeWallet = () => {
    if (confirm('Delete this multi-chain wallet? Make sure you have backed up your 12-word phrase.')) {
      if (multiChainWallet) {
        WalletManager.removeWallet(multiChainWallet.id);
      }
      localStorage.removeItem('rhiza_secondary_wallet');
      localStorage.removeItem('rhiza_secondary_wallet_encrypted');
      showToast('Multi-Chain Wallet Removed', 'success');

      if (activeWallet?.type === 'secondary') {
        logout();
        navigate('/login');
      } else {
        window.location.reload();
      }
    }
  };

  // ==========================
  // RENDER
  // ==========================

  if (!isMultiChain) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 space-y-6 flex flex-col items-center justify-center text-center page-enter">
        <div className="w-20 h-20 rounded-3xl bg-violet-500/10 flex items-center justify-center mb-4">
          <Layers size={32} className="text-violet-500" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Not a Multi-Chain Wallet</h1>
        <p className="text-slate-500 dark:text-gray-400 font-medium max-w-md">
          You are currently logged into a standard TON Vault. To access EVM, Polygon, and Bitcoin integrations, please link or create a 12-word Multi-Chain Wallet.
        </p>
        <button
          onClick={() => navigate('/onboarding')}
          className="mt-6 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-bold transition-all"
        >
          Create / Import Multi-Chain Wallet
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 page-enter">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/wallet/dashboard')}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Layers size={22} className="text-violet-500" />
            Multi-Chain Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-500 font-medium mt-0.5">
            12-word BIP39 · EVM (ETH/Polygon) + TON (W5) + BTC
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold">
          {error}
        </div>
      )}

      {/* WDK Unlock Card — shown after page reload when session is not active */}
      {needsUnlock && (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-2 border-amber-500/30 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center">
              <KeyRound size={20} className="text-amber-400" />
            </div>
            <div>
              <h3 className="font-black text-white text-sm">Unlock Multi-Chain Engine</h3>
              <p className="text-[10px] text-amber-400/80 font-medium mt-0.5">Enter your wallet password to restore live balances</p>
            </div>
          </div>
          <div className="relative">
            <input
              type={showUnlockPassword ? 'text' : 'password'}
              value={unlockPassword}
              onChange={e => setUnlockPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUnlock()}
              placeholder="Wallet password (leave blank if none)"
              className="w-full bg-black/40 border border-amber-500/30 rounded-xl p-3.5 text-white text-sm font-medium outline-none focus:border-amber-400/60 pr-10"
            />
            <button
              onClick={() => setShowUnlockPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              {showUnlockPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <button
            onClick={handleUnlock}
            disabled={isUnlocking}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isUnlocking ? <RefreshCw size={14} className="animate-spin" /> : <KeyRound size={14} />}
            {isUnlocking ? 'Unlocking...' : 'Unlock & Refresh'}
          </button>
        </div>
      )}

      {/* Info card */}
      <div className="hidden p-6 rounded-3xl bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-500/10 dark:to-indigo-500/10 border-2 border-violet-200 dark:border-violet-500/20 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
            <Globe size={24} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="font-black text-slate-900 dark:text-white text-base">Tether WDK Powered</h2>
            <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">One seed phrase → Multiple blockchains</p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { chain: 'EVM', icon: '⟠', desc: 'EVM-compatible mapping', color: 'from-blue-500/10 to-indigo-500/10 border-blue-200 dark:border-blue-500/20' },
            { chain: 'TON Wallet', icon: '💎', desc: 'TON W5 Standard', color: 'from-sky-500/10 to-cyan-500/10 border-sky-200 dark:border-sky-500/20' },
            { chain: 'BTC Wallet', icon: '₿', desc: 'Bitcoin Mainnet', color: 'from-orange-500/10 to-amber-500/10 border-orange-200 dark:border-orange-500/20' },
          ].map(item => (
            <div key={item.chain} className={`p-4 rounded-2xl bg-gradient-to-br ${item.color} border`}>
              <div className="text-2xl mb-1">{item.icon}</div>
              <p className="text-xs font-black text-slate-900 dark:text-white">{item.chain}</p>
              <p className="text-[10px] text-slate-500 dark:text-gray-400 font-medium leading-tight mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <RefreshCw className="animate-spin text-violet-500" size={32} />
        </div>
      ) : addresses ? (
        <div className="space-y-5">
          {/* EVM */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 border-2 border-blue-200 dark:border-blue-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-lg">⟠</div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-black text-blue-800 dark:text-blue-300 uppercase tracking-widest">EVM Wallet</p>
                    <select 
                      value={evmChain}
                      onChange={async (e) => {
                        const newChain = e.target.value as any;
                        setEvmChain(newChain);
                        const { tetherWdkService } = await import('../services/tetherWdkService');
                        await tetherWdkService.switchEvmChain(newChain);
                        loadMultiChainData();
                        showToast(`Switched to ${newChain}`, 'success');
                      }}
                      className="bg-white/50 dark:bg-blue-900/30 text-[10px] font-bold text-blue-800 dark:text-blue-300 rounded px-1.5 py-0.5 border border-blue-200 dark:border-blue-500/30 outline-none"
                    >
                      <option value="ethereum">Ethereum</option>
                      <option value="polygon">Polygon</option>
                      <option value="arbitrum">Arbitrum</option>
                      <option value="bsc">BSC</option>
                      <option value="avalanche">Avalanche</option>
                      <option value="plasma">Plasma</option>
                      <option value="stable">Stable</option>
                      <option value="sepolia">Sepolia Testnet</option>
                    </select>
                  </div>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">Multi-Chain Interoperability</p>
                </div>
              </div>
              {balances && balances.evmBalance !== undefined && (
                <span className="text-sm font-black text-blue-900 dark:text-blue-200">
                  {parseFloat(balances.evmBalance).toFixed(4)} ETH
                </span>
              )}
            </div>

            <div className="p-3 rounded-xl bg-white/70 dark:bg-white/5 border border-blue-100 dark:border-white/10 space-y-2">
              <p className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest">Address</p>
              <p className="text-xs font-mono text-slate-600 dark:text-gray-300 break-all">{addresses.evmAddress}</p>

              <div className="flex gap-2 pt-1 flex-wrap">
                <button
                  onClick={() => copyToClipboard(addresses.evmAddress, 'evm')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-bold hover:scale-105 transition-all"
                >
                  {copiedAddr === 'evm' ? <Check size={12} /> : <Copy size={12} />}
                  {copiedAddr === 'evm' ? 'Copied' : 'Copy'}
                </button>
                <button
                  onClick={() => setShowQR(showQR === 'evm' ? null : 'evm')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-bold hover:scale-105 transition-all"
                >
                  QR
                </button>
                <a
                  href={`https://polygonscan.com/address/${addresses.evmAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-bold hover:scale-105 transition-all"
                >
                  <ExternalLink size={12} /> Explorer
                </a>
              </div>

              {showQR === 'evm' && (
                <div className="flex justify-center pt-2">
                  <div className="p-3 rounded-xl bg-white">
                    <QRCodeSVG value={addresses.evmAddress} size={140} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* TON */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-sky-500/10 dark:to-cyan-500/10 border-2 border-sky-200 dark:border-sky-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-500/20 flex items-center justify-center text-lg">💎</div>
                <div>
                  <p className="text-xs font-black text-sky-800 dark:text-sky-300 uppercase tracking-widest">TON Wallet (W5)</p>
                  <p className="text-[10px] text-sky-600 dark:text-sky-400 font-medium">BIP44 derivation</p>
                </div>
              </div>
              {balances && balances.tonBalance !== undefined && (
                <span className="text-sm font-black text-sky-900 dark:text-sky-200">
                  {balances.tonBalance} TON
                </span>
              )}
            </div>

            <div className="p-3 rounded-xl bg-white/70 dark:bg-white/5 border border-sky-100 dark:border-white/10 space-y-2">
              <p className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest">Address</p>
              <p className="text-xs font-mono text-slate-600 dark:text-gray-300 break-all">{addresses.tonAddress}</p>

              <div className="flex gap-2 pt-1 flex-wrap">
                <button
                  onClick={() => copyToClipboard(addresses.tonAddress, 'ton')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 text-xs font-bold hover:scale-105 transition-all"
                >
                  {copiedAddr === 'ton' ? <Check size={12} /> : <Copy size={12} />}
                  {copiedAddr === 'ton' ? 'Copied' : 'Copy'}
                </button>
                <button
                  onClick={() => setShowQR(showQR === 'ton' ? null : 'ton')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 text-xs font-bold hover:scale-105 transition-all"
                >
                  QR
                </button>
                <a
                  href={`https://tonscan.org/address/${addresses.tonAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 text-xs font-bold hover:scale-105 transition-all"
                >
                  <ExternalLink size={12} /> Explorer
                </a>
              </div>

              {showQR === 'ton' && (
                <div className="flex justify-center pt-2">
                  <div className="p-3 rounded-xl bg-white">
                    <QRCodeSVG value={addresses.tonAddress} size={140} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* BTC */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-500/10 dark:to-amber-500/10 border-2 border-orange-200 dark:border-orange-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center text-lg">₿</div>
                <div>
                  <p className="text-xs font-black text-orange-800 dark:text-orange-300 uppercase tracking-widest">BTC Wallet</p>
                  <p className="text-[10px] text-orange-600 dark:text-orange-400 font-medium">Bitcoin Network</p>
                </div>
              </div>
              {balances && balances.btcBalance !== undefined && (
                <span className="text-sm font-black text-orange-900 dark:text-orange-200">
                  {balances.btcBalance} BTC
                </span>
              )}
            </div>

            <div className="p-3 rounded-xl bg-white/70 dark:bg-white/5 border border-orange-100 dark:border-white/10 space-y-2">
              <p className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest">Address</p>
              <p className="text-xs font-mono text-slate-600 dark:text-gray-300 break-all">{addresses.btcAddress}</p>

              <div className="flex gap-2 pt-1 flex-wrap">
                <button
                  onClick={() => copyToClipboard(addresses.btcAddress, 'btc')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 text-xs font-bold hover:scale-105 transition-all"
                >
                  {copiedAddr === 'btc' ? <Check size={12} /> : <Copy size={12} />}
                  {copiedAddr === 'btc' ? 'Copied' : 'Copy'}
                </button>
                <button
                  onClick={() => setShowQR(showQR === 'btc' ? null : 'btc')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 text-xs font-bold hover:scale-105 transition-all"
                >
                  QR
                </button>
                <a
                  href={`https://mempool.space/address/${addresses.btcAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 text-xs font-bold hover:scale-105 transition-all"
                >
                  <ExternalLink size={12} /> Explorer
                </a>
              </div>

              {showQR === 'btc' && (
                <div className="flex justify-center pt-2">
                  <div className="p-3 rounded-xl bg-white">
                    <QRCodeSVG value={addresses.btcAddress} size={140} />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={loadMultiChainData}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 p-3.5 rounded-2xl border-2 border-slate-200 dark:border-white/10 hover:border-violet-400 dark:hover:border-violet-500/30 text-slate-600 dark:text-gray-300 text-sm font-bold transition-all hover:scale-[1.02]"
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} /> Refresh Balances
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 size={14} className="text-red-500" />
                <span className="text-xs font-black text-red-700 dark:text-red-400">Remove Internal Data</span>
              </div>
              <button
                onClick={removeWallet}
                className="text-xs font-bold text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
              >
                Delete
              </button>
            </div>
            <p className="text-[11px] text-red-600 dark:text-red-400/70 font-medium mt-1.5">
              Only this device's local record will be removed. Your crypto remains safely stored on the blockchain.
            </p>
          </div>

        </div>
      ) : null}
    </div>
  );
};

export default SecondaryWallet;
