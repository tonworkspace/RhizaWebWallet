import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ChevronLeft, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Wallet, 
  Clock,
  Plus,
  RefreshCw,
  AlertCircle,
  Gift,
  Users
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { WalletManager, WalletMetadata } from '../utils/walletManager';
import { useToast } from '../context/ToastContext';

const WalletLogin: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useWallet();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  
  // Get referral code from URL parameter
  const referralCode = searchParams.get('ref');
  
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
          {/* Referral Banner */}
          {referralCode && (
            <div className="p-4 bg-gradient-to-br from-emerald-50 to-white dark:from-[#00FF88]/10 dark:via-[#00FF88]/5 dark:to-transparent border-2 border-emerald-200 dark:border-[#00FF88]/20 rounded-2xl shadow-sm">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Gift size={20} className="text-emerald-700 dark:text-[#00FF88]" />
                <h3 className="text-sm font-black text-emerald-700 dark:text-[#00FF88] uppercase tracking-wider">
                  You've Been Invited!
                </h3>
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-400 font-semibold">
                Create a wallet to claim your welcome bonus
              </p>
            </div>
          )}
          
          <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto">
            <Wallet className="text-gray-500 dark:text-gray-500" size={40} />
          </div>
          <h2 className="text-2xl font-black text-gray-950 dark:text-white">No Wallets Found</h2>
          <p className="text-gray-700 dark:text-gray-400 leading-relaxed font-semibold">
            You don't have any wallets yet. Create a new wallet or import an existing one to get started.
          </p>
          <div className="flex flex-col gap-3 pt-4">
            <button
              onClick={() => navigate(referralCode ? `/create-wallet?ref=${referralCode}` : '/create-wallet')}
              className="w-full p-4 bg-[#00FF88] text-black rounded-2xl font-black text-sm uppercase tracking-wider hover:scale-105 transition-all shadow-lg"
            >
              Create New Wallet
            </button>
            <button
              onClick={() => navigate('/import-wallet')}
              className="w-full p-4 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 text-gray-950 dark:text-white rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-white/10 transition-all shadow-sm"
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
          className="flex items-center gap-3 text-gray-600 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white transition-colors text-xs font-black uppercase tracking-widest"
        >
          <ChevronLeft size={16} /> Back
        </button>

        {/* Referral Banner */}
        {referralCode && (
          <div className="p-4 bg-gradient-to-br from-emerald-50 to-white dark:from-[#00FF88]/10 dark:via-[#00FF88]/5 dark:to-transparent border-2 border-emerald-200 dark:border-[#00FF88]/20 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-200 dark:bg-[#00FF88]/20 flex items-center justify-center shrink-0">
                <Users size={24} className="text-emerald-700 dark:text-[#00FF88]" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-black text-emerald-700 dark:text-[#00FF88] uppercase tracking-wider">
                  You've Been Invited!
                </h3>
                <p className="text-xs text-gray-700 dark:text-gray-400 font-semibold mt-0.5">
                  Join with referral code: <span className="font-mono text-emerald-700 dark:text-[#00FF88]">{referralCode}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h1 className="text-4xl font-black text-gray-950 dark:text-white tracking-tight-custom">
            {t('auth.welcomeBack')}
          </h1>
          <p className="text-gray-700 dark:text-gray-400 text-lg font-semibold leading-relaxed">
            {t('auth.enterPassword')}
          </p>
        </div>

        {/* Wallet Selection */}
        <div className="space-y-4">
          <label className="text-sm font-black text-gray-950 dark:text-white uppercase tracking-wider">
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
                className={`w-full p-5 rounded-2xl border-2 transition-all text-left shadow-sm ${
                  selectedWallet === wallet.id
                    ? 'bg-[#00FF88]/10 border-[#00FF88] shadow-lg'
                    : 'bg-white dark:bg-white/5 border-gray-300 dark:border-white/10 hover:border-[#00FF88]/50 dark:hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      selectedWallet === wallet.id
                        ? 'bg-[#00FF88]/20 text-[#00FF88]'
                        : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400'
                    }`}>
                      <Wallet size={24} />
                    </div>
                    <div>
                      <h3 className="font-black text-gray-950 dark:text-white text-base">{wallet.name}</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-500 font-mono mt-1">
                        {shortenAddress(wallet.address)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-500 font-semibold">
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
          <label className="text-sm font-black text-gray-950 dark:text-white uppercase tracking-wider">
            {t('auth.password')}
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
              className="w-full p-4 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-2xl text-gray-950 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 outline-none focus:border-[#00FF88] transition-all font-semibold shadow-sm"
              placeholder={t('auth.password')}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white transition-colors"
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
                {t('common.loading')}
              </>
            ) : (
              <>
                {t('auth.login')} <ArrowRight size={20} />
              </>
            )}
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate(referralCode ? `/create-wallet?ref=${referralCode}` : '/create-wallet')}
              className="p-4 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 text-gray-950 dark:text-white rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest hover:bg-gray-50 hover:border-[#00FF88] dark:hover:bg-white/10 dark:hover:border-[#00FF88]/30 transition-all shadow-sm"
            >
              <Plus size={16} />
              Create Wallet
            </button>
            <button
              onClick={() => navigate('/import-wallet')}
              className="p-4 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 text-gray-950 dark:text-white rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest hover:bg-gray-50 hover:border-[#00FF88] dark:hover:bg-white/10 dark:hover:border-[#00FF88]/30 transition-all shadow-sm"
            >
              <Plus size={16} />
              Import Wallet
            </button>
          </div>
        </div>

        <div className="text-center pt-4">
          <p className="text-[10px] text-gray-600 dark:text-gray-700 font-black uppercase tracking-widest">
            Secured by AES-256-GCM Encryption
          </p>
        </div>
      </div>
    </div>
  );
};

export default WalletLogin;
