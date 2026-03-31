import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft, ArrowRight, Eye, EyeOff, Wallet, Clock,
  Plus, RefreshCw, AlertCircle, Gift, Users, ShieldOff, Lock, Check
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { WalletManager, WalletMetadata } from '../utils/walletManager';
import { useToast } from '../context/ToastContext';
import { supabaseService } from '../services/supabaseService';

// ─── Security constants ────────────────────────────────────────────────────
const MAX_ATTEMPTS = 5;        // Max failed attempts before lockout
const LOCKOUT_SECONDS = 300;   // Lockout duration in seconds (5 minutes)
const MIN_ATTEMPT_DELAY = 600; // Min ms before showing result (prevents timing attacks)

// ──────────────────────────────────────────────────────────────────────────

const WalletLogin: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useWallet();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref');

  const [wallets, setWallets] = useState<WalletMetadata[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Brute-force protection state
  const [attemptCount, setAttemptCount] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockCountdown, setLockCountdown] = useState(0);
  const lockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Load wallets + check server-side rate limit ─────────────────────────
  useEffect(() => {
    const loadedWallets = WalletManager.getWallets();
    setWallets(loadedWallets);

    const activeWallet = WalletManager.getActiveWallet();
    const defaultId = activeWallet?.id
      ?? (loadedWallets.length > 0
        ? [...loadedWallets].sort((a, b) => b.lastUsed - a.lastUsed)[0].id
        : null);

    if (defaultId) {
      setSelectedWallet(defaultId);
      // Check server-side rate limit status
      checkRateLimitStatus(defaultId);
    }
  }, []);

  // ─── Check server-side rate limit status ──────────────────────────────────
  const checkRateLimitStatus = async (walletId: string) => {
    const wallet = wallets.find(w => w.id === walletId);
    if (!wallet || !supabaseService.isConfigured()) return;

    try {
      const result = await supabaseService.attemptWalletLogin(
        wallet.address,
        MAX_ATTEMPTS,
        LOCKOUT_SECONDS
      );

      if (result.success && result.locked) {
        setLockedUntil(new Date(result.lockedUntil!).getTime());
        setAttemptCount(MAX_ATTEMPTS);
      } else if (result.success && result.allowed) {
        setAttemptCount(MAX_ATTEMPTS - (result.attemptsRemaining || MAX_ATTEMPTS));
      }
    } catch (error) {
      console.warn('⚠️ Failed to check rate limit status:', error);
    }
  };

  // ─── Lockout countdown timer ──────────────────────────────────────────────
  useEffect(() => {
    if (lockedUntil && lockedUntil > Date.now()) {
      const tick = () => {
        const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
        if (remaining <= 0) {
          setLockCountdown(0);
          setLockedUntil(null);
          setAttemptCount(0);
          setError(null);
          if (lockTimerRef.current) clearInterval(lockTimerRef.current);
        } else {
          setLockCountdown(remaining);
        }
      };
      tick();
      lockTimerRef.current = setInterval(tick, 1000);
      return () => { if (lockTimerRef.current) clearInterval(lockTimerRef.current); };
    }
  }, [lockedUntil]);

  // ─── When wallet selection changes, check server-side rate limit ─────────
  const handleSelectWallet = (id: string) => {
    if (lockTimerRef.current) clearInterval(lockTimerRef.current);
    setSelectedWallet(id);
    setError(null);
    setPassword('');
    setAttemptCount(0);
    setLockedUntil(null);
    
    // Check server-side rate limit for this wallet
    checkRateLimitStatus(id);
  };

  // ─── Unlock handler with server-side rate limiting ────────────────────────
  const handleUnlock = useCallback(async () => {
    if (!selectedWallet || !password) return;

    // Check lockout
    if (lockedUntil && lockedUntil > Date.now()) return;

    const wallet = wallets.find(w => w.id === selectedWallet);
    if (!wallet) return;

    setIsLoading(true);
    setError(null);

    // ── Step 1: Check server-side rate limit (if Supabase configured) ────────
    if (supabaseService.isConfigured()) {
      try {
        const rateLimitCheck = await supabaseService.attemptWalletLogin(
          wallet.address,
          MAX_ATTEMPTS,
          LOCKOUT_SECONDS
        );

        if (rateLimitCheck.success && !rateLimitCheck.allowed) {
          // Account is locked server-side
          if (rateLimitCheck.locked && rateLimitCheck.lockedUntil) {
            const lockExpiry = new Date(rateLimitCheck.lockedUntil).getTime();
            setLockedUntil(lockExpiry);
            setAttemptCount(MAX_ATTEMPTS);
            setError(null);
            setPassword('');
            showToast('Account locked due to too many failed attempts', 'error');
            setIsLoading(false);
            return;
          }
        }
      } catch (error) {
        console.warn('⚠️ Rate limit check failed, continuing with local validation:', error);
      }
    }

    // ── Step 2: Enforce minimum delay (prevents timing attacks) ──────────────
    const startTime = Date.now();

    let success = false;
    let mnemonic: string[] | undefined;

    try {
      const result = await WalletManager.getWalletMnemonic(selectedWallet, password);
      if (result.success && result.mnemonic) {
        mnemonic = result.mnemonic;
        success = true;
      }
    } catch {
      success = false;
    }

    // Constant-time: always wait the minimum delay before responding
    const elapsed = Date.now() - startTime;
    if (elapsed < MIN_ATTEMPT_DELAY) {
      await new Promise(resolve => setTimeout(resolve, MIN_ATTEMPT_DELAY - elapsed));
    }

    // ── Step 3: Handle success or failure ─────────────────────────────────────
    if (success && mnemonic) {
      // ── Success: reset server-side counter, log in ──────────────────────────
      if (supabaseService.isConfigured()) {
        try {
          await supabaseService.resetLoginAttempts(wallet.address);
        } catch (error) {
          console.warn('⚠️ Failed to reset server-side attempts:', error);
        }
      }

      setAttemptCount(0);
      setLockedUntil(null);

      const activeWalletMeta = wallets.find(w => w.id === selectedWallet);
      const walletType = activeWalletMeta?.type || 'primary';

      const loginSuccess = await login(mnemonic, password, walletType);
      if (loginSuccess) {
        WalletManager.setActiveWallet(selectedWallet);
        showToast('Wallet unlocked', 'success');
        navigate('/wallet/dashboard');
      } else {
        setError('Failed to initialize wallet session. Please try again.');
      }
    } else {
      // ── Failed: record server-side failure ──────────────────────────────────
      let serverLocked = false;
      let serverAttemptsRemaining = MAX_ATTEMPTS - attemptCount - 1;

      if (supabaseService.isConfigured()) {
        try {
          const failureResult = await supabaseService.recordFailedLogin(
            wallet.address,
            MAX_ATTEMPTS,
            LOCKOUT_SECONDS
          );

          if (failureResult.success) {
            serverLocked = failureResult.locked;
            serverAttemptsRemaining = failureResult.attemptsRemaining;

            if (serverLocked && failureResult.lockedUntil) {
              const lockExpiry = new Date(failureResult.lockedUntil).getTime();
              setLockedUntil(lockExpiry);
              setAttemptCount(MAX_ATTEMPTS);
              setError(null);
              setPassword('');
              showToast('Too many failed attempts. Account locked.', 'error');
              setIsLoading(false);
              return;
            }
          }
        } catch (error) {
          console.warn('⚠️ Failed to record server-side failure:', error);
        }
      }

      // Update local state
      const newCount = attemptCount + 1;
      setAttemptCount(newCount);

      if (serverLocked || newCount >= MAX_ATTEMPTS) {
        // Lock out locally as fallback
        const lockExpiry = Date.now() + LOCKOUT_SECONDS * 1000;
        setLockedUntil(lockExpiry);
        setError(null);
        setPassword('');
        showToast('Too many failed attempts. Wallet locked.', 'error');
      } else {
        const remaining = serverAttemptsRemaining >= 0 ? serverAttemptsRemaining : MAX_ATTEMPTS - newCount;

        if (remaining <= 2) {
          setError(`Incorrect password. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining before lockout.`);
        } else {
          setError('Incorrect password. Please try again.');
        }
        showToast('Incorrect password', 'error');
      }
    }

    setIsLoading(false);
  }, [selectedWallet, password, attemptCount, lockedUntil, login, navigate, showToast, wallets]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && selectedWallet && password && !isLoading && !lockedUntil) {
      handleUnlock();
    }
  };

  const formatDate = (timestamp: number) => {
    const diffMs = Date.now() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const shortenAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-6)}`;

  const isLocked = !!(lockedUntil && lockedUntil > Date.now());
  const attemptsLeft = MAX_ATTEMPTS - attemptCount;

  // ─── Empty state ──────────────────────────────────────────────────────────
  if (wallets.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-10">
          {referralCode && (
            <div className="flex items-center gap-4 p-4 bg-[#00FF88]/10 border border-[#00FF88]/20 rounded-2xl shadow-[0_0_20px_rgba(0,255,136,0.15)] transition-all">
              <Gift size={20} className="text-[#00FF88] shrink-0" />
              <p className="text-sm text-[#00FF88] font-medium text-left">
                You've been invited! Create a wallet to claim your <span className="font-bold">welcome bonus</span>.
              </p>
            </div>
          )}

          <div className="space-y-6">
            {/* Icon with glow */}
            <div className="relative w-28 h-28 mx-auto">
              <div className="absolute inset-0 rounded-[2rem] bg-[#00FF88]/15 blur-2xl animate-pulse" />
              <div className="relative w-full h-full rounded-[2rem] bg-gradient-to-br from-white/10 to-white/5 border border-white/20 flex items-center justify-center backdrop-blur-sm shadow-xl">
                <Wallet className="text-gray-300" size={50} strokeWidth={1.5} />
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 tracking-tight">No Wallets Found</h2>
              <p className="text-gray-400 text-base mt-3 leading-relaxed max-w-[260px] mx-auto font-medium">
                Create a new wallet or import an existing one to begin.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <button
              onClick={() => navigate(referralCode ? `/create-wallet?ref=${referralCode}` : '/create-wallet')}
              className="w-full py-4 bg-[#00FF88] text-black rounded-2xl font-extrabold text-base hover:brightness-110 active:scale-[0.98] transition-all duration-200 shadow-[0_0_20px_rgba(0,255,136,0.3)] hover:shadow-[0_0_30px_rgba(0,255,136,0.4)]"
            >
              Create New Wallet
            </button>
            <button
              onClick={() => navigate('/import-wallet')}
              className="w-full py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-bold text-base hover:bg-white/10 hover:border-white/20 active:scale-[0.98] transition-all duration-200"
            >
              Import Existing Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'transparent' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <button
          onClick={() => navigate('/onboarding')}
          className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00FF88]/8 border border-[#00FF88]/15 rounded-full">
          <Lock size={9} className="text-[#00FF88]" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-[#00FF88]/80">AES-256-GCM</span>
        </div>
        <div className="w-9" />
      </div>

      <div className="flex-1 flex flex-col px-6 pb-8 max-w-lg mx-auto w-full space-y-5 pt-4">

        {/* Referral banner */}
        {referralCode && (
          <div className="flex items-center gap-3 p-4 bg-[#00FF88]/10 border border-[#00FF88]/25 rounded-2xl shadow-[0_0_15px_rgba(0,255,136,0.1)]">
            <Users size={18} className="text-[#00FF88] shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-[#00FF88] font-bold">
                Referral: <span className="font-mono bg-[#00FF88]/20 px-1.5 py-0.5 rounded text-[#00FF88] ml-1">{referralCode}</span>
              </p>
              <p className="text-xs text-[#00FF88]/80 mt-1 font-medium">Create a new wallet to claim your bonus</p>
            </div>
          </div>
        )}

        {/* Title */}
        <div className="pb-3 text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 tracking-tight">
            {t('auth.welcomeBack')}
          </h1>
          <p className="text-gray-400 text-sm sm:text-base mt-2 font-medium">
            {t('auth.enterPassword')}
          </p>
        </div>

        {/* Wallet cards */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Your Wallets</label>
          <div className="space-y-3">
            {wallets.map((wallet, idx) => {
              const isSelected = selectedWallet === wallet.id;
              // Generate a stable color from wallet address
              const colors = [
                { bg: 'bg-violet-500/20', text: 'text-violet-400', glow: '#8b5cf6' },
                { bg: 'bg-blue-500/20', text: 'text-blue-400', glow: '#3b82f6' },
                { bg: 'bg-amber-500/20', text: 'text-amber-400', glow: '#f59e0b' },
                { bg: 'bg-rose-500/20', text: 'text-rose-400', glow: '#f43f5e' },
                { bg: 'bg-cyan-500/20', text: 'text-cyan-400', glow: '#06b6d4' },
              ];
              const color = colors[idx % colors.length];
              const initials = wallet.name.slice(0, 2).toUpperCase();

              return (
                <button
                  key={wallet.id}
                  onClick={() => handleSelectWallet(wallet.id)}
                  style={isSelected ? { boxShadow: `0 0 0 1.5px ${color.glow}55, 0 0 24px ${color.glow}20` } : {}}
                  className={`w-full p-4 rounded-2xl border text-left transition-all duration-300 ${
                    isSelected
                      ? `bg-white/10 border-white/30 backdrop-blur-md`
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 font-black text-base shadow-inner ${color.bg} ${color.text}`}>
                      {initials}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-bold text-base tracking-wide ${isSelected ? 'text-white' : 'text-gray-300'}`}>{wallet.name}</p>
                        {wallet.type === 'secondary' ? (
                          <span className="px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400 text-[9px] font-bold uppercase tracking-wider">Multi-Chain</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 text-[9px] font-bold uppercase tracking-wider">TON Vault</span>
                        )}
                      </div>
                      <p className={`text-[13px] font-mono mt-0.5 truncate ${isSelected ? 'text-gray-400' : 'text-gray-500'}`}>{shortenAddress(wallet.address)}</p>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right hidden sm:block">
                        <div className={`flex items-center gap-1.5 text-[11px] font-medium justify-end ${isSelected ? 'text-gray-400' : 'text-gray-500'}`}>
                          <Clock size={12} /> {formatDate(wallet.lastUsed)}
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                        isSelected ? 'bg-[#00FF88] border-[#00FF88] shadow-[0_0_10px_rgba(0,255,136,0.5)]' : 'border-white/20'
                      }`}>
                        {isSelected && <Check size={14} className="text-black" strokeWidth={3.5} />}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Lockout panel */}
        {isLocked ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 overflow-hidden">
            <div className="p-5 flex flex-col items-center text-center gap-3">
              <div className="relative w-16 h-16">
                {/* Animated ring */}
                <svg className="absolute inset-0 w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(239,68,68,0.15)" strokeWidth="4" />
                  <circle
                    cx="32" cy="32" r="28" fill="none" stroke="#ef4444" strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    strokeDashoffset={`${2 * Math.PI * 28 * (1 - lockCountdown / LOCKOUT_SECONDS)}`}
                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <ShieldOff size={20} className="text-red-400" />
                </div>
              </div>
              <div>
                <p className="text-base font-bold text-red-400">Wallet Locked</p>
                <p className="text-sm text-gray-400 mt-1 font-medium">{MAX_ATTEMPTS} failed attempts detected</p>
              </div>
              <div className="px-6 py-3 bg-red-500/10 rounded-xl border border-red-500/20 shadow-inner">
                <p className="text-3xl font-bold text-white font-mono tabular-nums tracking-wider">{lockCountdown}<span className="text-base text-gray-500 ml-1.5 uppercase tracking-wider font-sans">sec</span></p>
              </div>
              <p className="text-xs text-gray-500 font-medium">Password entry will resume after the cooldown (5 minutes)</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {/* Password input */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">
                  {t('auth.password')}
                </label>
                {attemptCount >= 2 && (
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm ${
                    attemptsLeft <= 2
                      ? 'text-red-400 bg-red-500/15 border border-red-500/30'
                      : 'text-amber-400 bg-amber-500/15 border border-amber-500/30'
                  }`}>
                    {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} left
                  </span>
                )}
              </div>
              <div className="relative group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(null); }}
                  onKeyDown={handleKeyDown}
                  disabled={isLocked}
                  className={`w-full px-5 py-4 bg-white/5 border rounded-2xl text-white placeholder-gray-500 outline-none focus:ring-2 transition-all font-medium text-base shadow-inner ${
                    error
                      ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
                      : 'border-white/10 group-hover:border-white/20 focus:border-[#00FF88] focus:ring-[#00FF88]/20 focus:bg-white/10'
                  }`}
                  placeholder="Enter your password to unlock"
                  autoFocus
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {error && (
                <div className={`flex items-center gap-3 p-3.5 rounded-xl border shadow-sm animate-in fade-in slide-in-from-top-2 ${
                  attemptsLeft <= 2
                    ? 'bg-red-500/15 border-red-500/40'
                    : 'bg-red-500/10 border-red-500/20'
                }`}>
                  <AlertCircle size={16} className="text-red-400 shrink-0" />
                  <p className="text-sm text-red-300 font-semibold">{error}</p>
                </div>
              )}
            </div>

            {/* Unlock button */}
            <button
              onClick={handleUnlock}
              disabled={!selectedWallet || !password || isLoading}
              className="w-full py-4 bg-[#00FF88] text-black rounded-2xl font-extrabold text-base hover:brightness-110 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,255,136,0.2)] hover:shadow-[0_0_30px_rgba(0,255,136,0.3)] disabled:shadow-none flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <><RefreshCw className="animate-spin" size={18} /> Unlocking...</>
              ) : (
                <>{t('auth.login')} <ArrowRight size={18} strokeWidth={2.5} /></>
              )}
            </button>
          </div>
        )}

        {/* Add wallet actions */}
        <div className="grid grid-cols-2 gap-3 pt-6 pb-4">
          <button
            onClick={() => navigate(referralCode ? `/create-wallet?ref=${referralCode}` : '/create-wallet')}
            className="py-3.5 bg-white/5 border border-white/10 text-gray-300 rounded-xl flex items-center justify-center gap-2 text-sm font-bold hover:bg-white/10 hover:text-white hover:border-white/20 transition-all duration-200 shadow-sm"
          >
            <Plus size={16} strokeWidth={2.5} /> New Wallet
          </button>
          <button
            onClick={() => navigate('/import-wallet')}
            className="py-3.5 bg-white/5 border border-white/10 text-gray-300 rounded-xl flex items-center justify-center gap-2 text-sm font-bold hover:bg-white/10 hover:text-white hover:border-white/20 transition-all duration-200 shadow-sm"
          >
            <Plus size={16} strokeWidth={2.5} /> Import Wallet
          </button>
        </div>

      </div>
    </div>
  );
};

export default WalletLogin;
