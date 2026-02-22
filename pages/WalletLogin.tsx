import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Wallet, 
  Clock,
  Plus,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { WalletManager, WalletMetadata } from '../utils/walletManager';
import { useToast } from '../context/ToastContext';

const WalletLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useWallet();
  const { showToast } = useToast();
  
  const [wallets, setWallets] = useState<WalletMetadata[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load wallets
    const loadedWallets = WalletManager.getWallets();
    setWallets(loadedWallets);
    
    // Auto-select last used wallet
    const activeWallet = WalletManager.getActiveWallet();
    if (activeWallet) {
      setSelectedWallet(activeWallet.id);
    } else if (loadedWallets.length > 0) {
      // Select most recently used
      const sorted = [...loadedWallets].sort((a, b) => b.lastUsed - a.lastUsed);
      setSelectedWallet(sorted[0].id);
    }
  }, []);

  const handleUnlock = async () => {
    if (!selectedWallet || !password) {
      setError('Please select a wallet and enter your password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get mnemonic with password
      const result = await WalletManager.getWalletMnemonic(selectedWallet, password);
      
      if (!result.success || !result.mnemonic) {
        setError(result.error || 'Failed to decrypt wallet');
        showToast('Invalid password', 'error');
        setIsLoading(false);
        return;
      }

      // Login with mnemonic
      const success = await login(result.mnemonic, password);
      
      if (success) {
        // Set as active wallet
        WalletManager.setActiveWallet(selectedWallet);
        showToast('Wallet unlocked successfully', 'success');
        navigate('/wallet/dashboard');
      } else {
        setError('Failed to initialize wallet');
        showToast('Failed to initialize wallet', 'error');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      showToast('An unexpected error occurred', 'error');
    }

    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && selectedWallet && password) {
      handleUnlock();
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  if (wallets.length === 0) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto">
            <Wallet className="text-gray-500" size={40} />
          </div>
          <h2 className="text-2xl font-black text-white">No Wallets Found</h2>
          <p className="text-gray-400 leading-relaxed">
            You don't have any wallets yet. Create a new wallet or import an existing one to get started.
          </p>
          <div className="flex flex-col gap-3 pt-4">
            <button
              onClick={() => navigate('/create-wallet')}
              className="w-full p-4 bg-[#00FF88] text-black rounded-2xl font-black text-sm uppercase tracking-wider hover:scale-105 transition-all"
            >
              Create New Wallet
            </button>
            <button
              onClick={() => navigate('/import-wallet')}
              className="w-full p-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-white/10 transition-all"
            >
              Import Existing Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-8 page-enter">
      <div className="w-full max-w-2xl space-y-8">
        
        <button 
          onClick={() => navigate('/onboarding')}
          className="flex items-center gap-3 text-gray-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest"
        >
          <ChevronLeft size={16} /> Back
        </button>

        <div className="space-y-4">
          <h1 className="text-4xl font-black text-white tracking-tight-custom">
            Welcome Back
          </h1>
          <p className="text-gray-400 text-lg font-medium leading-relaxed">
            Select your wallet and enter your password to unlock.
          </p>
        </div>

        {/* Wallet Selection */}
        <div className="space-y-4">
          <label className="text-sm font-black text-white uppercase tracking-wider">
            Select Wallet
          </label>
          <div className="space-y-3">
            {wallets.map((wallet) => (
              <button
                key={wallet.id}
                onClick={() => {
                  setSelectedWallet(wallet.id);
                  setError(null);
                }}
                className={`w-full p-5 rounded-2xl border-2 transition-all text-left ${
                  selectedWallet === wallet.id
                    ? 'bg-[#00FF88]/10 border-[#00FF88] shadow-lg'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      selectedWallet === wallet.id
                        ? 'bg-[#00FF88]/20 text-[#00FF88]'
                        : 'bg-white/5 text-gray-400'
                    }`}>
                      <Wallet size={24} />
                    </div>
                    <div>
                      <h3 className="font-black text-white text-base">{wallet.name}</h3>
                      <p className="text-xs text-gray-500 font-mono mt-1">
                        {shortenAddress(wallet.address)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock size={12} />
                    {formatDate(wallet.lastUsed)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Password Input */}
        <div className="space-y-3">
          <label className="text-sm font-black text-white uppercase tracking-wider">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 outline-none focus:border-[#00FF88]/50 transition-all font-medium"
              placeholder="Enter your password"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-red-400 font-medium">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-4">
          <button 
            onClick={handleUnlock}
            disabled={!selectedWallet || !password || isLoading}
            className="w-full p-6 bg-[#00FF88] text-black rounded-2xl flex items-center justify-center gap-4 text-sm font-black uppercase tracking-widest transition-all hover:scale-[1.03] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-2xl"
          >
            {isLoading ? (
              <>
                <RefreshCw className="animate-spin" size={20} />
                Unlocking...
              </>
            ) : (
              <>
                Unlock Wallet <ArrowRight size={20} />
              </>
            )}
          </button>

          <button
            onClick={() => navigate('/import-wallet')}
            className="w-full p-4 bg-white/5 border border-white/10 text-white rounded-2xl flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all"
          >
            <Plus size={16} />
            Add Another Wallet
          </button>
        </div>

        <div className="text-center pt-4">
          <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest">
            Secured by AES-256-GCM Encryption
          </p>
        </div>
      </div>
    </div>
  );
};

export default WalletLogin;
