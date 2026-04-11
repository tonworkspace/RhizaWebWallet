import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft, ArrowRight, Eye, EyeOff, Wallet, Clock,
  Plus, RefreshCw, AlertCircle, Gift, Users, ShieldOff, Lock,
  Check, Shield, Key, ChevronDown
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { WalletManager, WalletMetadata } from '../utils/walletManager';
import { useToast } from '../context/ToastContext';
import { supabaseService } from '../services/supabaseService';
import { twoFactorService } from '../services/twoFactorService';

// ─── Security constants ────────────────────────────────────────────────────
const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 300;
const MIN_ATTEMPT_DELAY = 600;
const MAX_2FA_ATTEMPTS = 5;

type LoginStep = 'password' | 'checking' | '2fa';

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
  const [step, setStep] = useState<LoginStep>('password');

  // Brute-force protection
  const [attemptCount, setAttemptCount] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockCountdown, setLockCountdown] = useState(0);
  const lockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 2FA state — held in memory, never stored
  const [twoFAData, setTwoFAData] = useState<{
    encryptedSecret: string;
    decryptedSecret: string; // decrypted once during checking step, reused for all verify attempts
    hashedBackupCodes: string[];
    pendingMnemonic: string[];
    pendingPassword: string;
    walletAddress: string;
  } | null>(null);
  // Ref mirror so async callbacks always see the latest value
  const twoFADataRef = useRef<typeof twoFAData>(null);
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [showBackup, setShowBackup] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const [twoFAError, setTwoFAError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [twoFAAttempts, setTwoFAAttempts] = useState(0);
  const [twoFALockedUntil, setTwoFALockedUntil] = useState<number | null>(null);
  const [twoFALockCountdown, setTwoFALockCountdown] = useState(0);
  const twoFALockRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ─── Load wallets ─────────────────────────────────────────────────────────
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
      checkRateLimitStatus(defaultId, loadedWallets);
    }
  }, []);

  // ─── Password lockout timer ───────────────────────────────────────────────
  useEffect(() => {
    if (lockedUntil && lockedUntil > Date.now()) {
      const tick = () => {
        const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
        if (remaining <= 0) {
          setLockCountdown(0); setLockedUntil(null); setAttemptCount(0); setError(null);
          if (lockTimerRef.current) clearInterval(lockTimerRef.current);
        } else { setLockCountdown(remaining); }
      };
      tick();
      lockTimerRef.current = setInterval(tick, 1000);
      return () => { if (lockTimerRef.current) clearInterval(lockTimerRef.current); };
    }
  }, [lockedUntil]);

  // ─── 2FA lockout timer ────────────────────────────────────────────────────
  useEffect(() => {
    if (twoFALockedUntil && twoFALockedUntil > Date.now()) {
      const tick = () => {
        const remaining = Math.ceil((twoFALockedUntil - Date.now()) / 1000);
        if (remaining <= 0) {
          setTwoFALockCountdown(0); setTwoFALockedUntil(null); setTwoFAAttempts(0); setTwoFAError(null);
          if (twoFALockRef.current) clearInterval(twoFALockRef.current);
        } else { setTwoFALockCountdown(remaining); }
      };
      tick();
      twoFALockRef.current = setInterval(tick, 1000);
      return () => { if (twoFALockRef.current) clearInterval(twoFALockRef.current); };
    }
  }, [twoFALockedUntil]);

  // Focus first digit box when 2FA step appears
  useEffect(() => {
    if (step === '2fa' && !showBackup) {
      setTimeout(() => digitRefs.current[0]?.focus(), 100);
    }
  }, [step, showBackup]);

  const checkRateLimitStatus = async (walletId: string, walletList: WalletMetadata[]) => {
    const wallet = walletList.find(w => w.id === walletId);
    if (!wallet || !supabaseService.isConfigured()) return;
    try {
      const result = await supabaseService.attemptWalletLogin(wallet.address, MAX_ATTEMPTS, LOCKOUT_SECONDS);
      if (result.success && result.locked) {
        setLockedUntil(new Date(result.lockedUntil!).getTime());
        setAttemptCount(MAX_ATTEMPTS);
      } else if (result.success && result.allowed) {
        setAttemptCount(MAX_ATTEMPTS - (result.attemptsRemaining || MAX_ATTEMPTS));
      }
    } catch { /* non-fatal */ }
  };

  const handleSelectWallet = (id: string) => {
    if (lockTimerRef.current) clearInterval(lockTimerRef.current);
    setSelectedWallet(id);
    setError(null); setPassword(''); setAttemptCount(0); setLockedUntil(null);
    checkRateLimitStatus(id, wallets);
  };

  // ─── Step 1: Verify password ──────────────────────────────────────────────
  const handleUnlock = useCallback(async () => {
    if (!selectedWallet || !password || (lockedUntil && lockedUntil > Date.now())) return;
    const wallet = wallets.find(w => w.id === selectedWallet);
    if (!wallet) return;

    setIsLoading(true);
    setError(null);

    // Server-side rate limit check
    if (supabaseService.isConfigured()) {
      try {
        const check = await supabaseService.attemptWalletLogin(wallet.address, MAX_ATTEMPTS, LOCKOUT_SECONDS);
        if (check.success && !check.allowed && check.locked && check.lockedUntil) {
          setLockedUntil(new Date(check.lockedUntil).getTime());
          setAttemptCount(MAX_ATTEMPTS);
          setPassword('');
          showToast('Account locked due to too many failed attempts', 'error');
          setIsLoading(false);
          return;
        }
      } catch { /* non-fatal */ }
    }

    const startTime = Date.now();
    let success = false;
    let mnemonic: string[] | undefined;

    try {
      const result = await WalletManager.getWalletMnemonic(selectedWallet, password);
      if (result.success && result.mnemonic) { mnemonic = result.mnemonic; success = true; }
    } catch { success = false; }

    const elapsed = Date.now() - startTime;
    if (elapsed < MIN_ATTEMPT_DELAY) await new Promise(r => setTimeout(r, MIN_ATTEMPT_DELAY - elapsed));

    if (success && mnemonic) {
      if (supabaseService.isConfigured()) {
        try { await supabaseService.resetLoginAttempts(wallet.address); } catch { /* non-fatal */ }
      }
      setAttemptCount(0);
      setLockedUntil(null);

      // ── Transition to "checking" — establish auth session + check 2FA ────
      setStep('checking');
      setIsLoading(false);

      try {
        // Run auth session creation and 2FA status check in parallel
        const [twoFAStatus] = await Promise.all([
          twoFactorService.get2FAStatus(wallet.address),
          supabaseService.isConfigured()
            ? import('../services/authService').then(({ authService }) => authService.signInWithWallet(wallet.address))
            : Promise.resolve()
        ]);

        if (twoFAStatus.enabled && twoFAStatus.encryptedSecret) {
          // Show 2FA UI immediately, decrypt in background
          setStep('2fa');
          setIsLoading(true);
          
          // Decrypt the TOTP secret in background (non-blocking)
          setTimeout(async () => {
            try {
              const decryptedSecret = await twoFactorService.decryptSecret(twoFAStatus.encryptedSecret, password);
              if (!decryptedSecret) {
                // Decryption failed — proceed without 2FA rather than blocking login
                await completeLogin(mnemonic, password, wallet);
                return;
              }
              const data = {
                encryptedSecret: twoFAStatus.encryptedSecret,
                decryptedSecret,
                hashedBackupCodes: twoFAStatus.hashedBackupCodes ?? [],
                pendingMnemonic: mnemonic,
                pendingPassword: password,
                walletAddress: wallet.address,
              };
              twoFADataRef.current = data;
              setTwoFAData(data);
              setIsLoading(false);
            } catch (error) {
              console.warn('⚠️ 2FA decryption failed:', error);
              // Proceed without 2FA if decryption fails
              await completeLogin(mnemonic, password, wallet);
            }
          }, 10);
        } else {
          // No 2FA — complete login directly
          await completeLogin(mnemonic, password, wallet);
        }
      } catch {
        // If 2FA check fails, proceed without it
        await completeLogin(mnemonic, password, wallet);
      }
    } else {
      // Failed password
      let serverLocked = false;
      let serverAttemptsRemaining = MAX_ATTEMPTS - attemptCount - 1;

      if (supabaseService.isConfigured()) {
        try {
          const failResult = await supabaseService.recordFailedLogin(wallet.address, MAX_ATTEMPTS, LOCKOUT_SECONDS);
          if (failResult.success) {
            serverLocked = failResult.locked;
            serverAttemptsRemaining = failResult.attemptsRemaining;
            if (serverLocked && failResult.lockedUntil) {
              setLockedUntil(new Date(failResult.lockedUntil).getTime());
              setAttemptCount(MAX_ATTEMPTS);
              setPassword('');
              showToast('Too many failed attempts. Account locked.', 'error');
              setIsLoading(false);
              return;
            }
          }
        } catch { /* non-fatal */ }
      }

      const newCount = attemptCount + 1;
      setAttemptCount(newCount);
      if (serverLocked || newCount >= MAX_ATTEMPTS) {
        setLockedUntil(Date.now() + LOCKOUT_SECONDS * 1000);
        setPassword('');
        showToast('Too many failed attempts. Wallet locked.', 'error');
      } else {
        const remaining = serverAttemptsRemaining >= 0 ? serverAttemptsRemaining : MAX_ATTEMPTS - newCount;
        setError(remaining <= 2
          ? `Incorrect password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining before lockout.`
          : 'Incorrect password. Please try again.');
        showToast('Incorrect password', 'error');
      }
      setIsLoading(false);
    }
  }, [selectedWallet, password, attemptCount, lockedUntil, wallets, showToast]);

  const completeLogin = async (mnemonic: string[], pwd: string, wallet: WalletMetadata) => {
    const walletType = (wallet.type ?? 'primary') as 'primary' | 'secondary';
    const ok = await login(mnemonic, pwd, walletType);
    if (ok) {
      WalletManager.setActiveWallet(wallet.id);
      showToast('Wallet unlocked', 'success');
      navigate('/wallet/dashboard');
    } else {
      setStep('password');
      setError('Failed to initialize wallet session. Please try again.');
    }
  };

  // ─── Step 2: Verify TOTP ──────────────────────────────────────────────────
  const handleDigitChange = (idx: number, value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = cleaned;
    setDigits(next);
    setTwoFAError(null);
    if (cleaned && idx < 5) digitRefs.current[idx + 1]?.focus();
    if (cleaned && idx === 5) {
      const code = next.join('');
      if (code.length === 6) verifyTotp(code);
    }
  };

  const handleDigitKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) digitRefs.current[idx - 1]?.focus();
    if (e.key === 'Enter') { const code = digits.join(''); if (code.length === 6) verifyTotp(code); }
  };

  const handleDigitPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) { setDigits(pasted.split('')); verifyTotp(pasted); }
  };

  const verifyTotp = async (code: string) => {
    const data = twoFADataRef.current;
    if (!data || (twoFALockedUntil && twoFALockedUntil > Date.now())) return;
    setVerifying(true);
    setTwoFAError(null);
    try {
      const secret = data.decryptedSecret;
      if (!secret) {
        setTwoFAError('Failed to load 2FA secret. Go back and try again.');
        setVerifying(false);
        return;
      }
      const valid = await twoFactorService.verifyCode(secret, code);
      if (valid) {
        const wallet = wallets.find(w => w.address === data.walletAddress);
        if (wallet) await completeLogin(data.pendingMnemonic, data.pendingPassword, wallet);
      } else {
        const next = twoFAAttempts + 1;
        setTwoFAAttempts(next);
        if (next >= MAX_2FA_ATTEMPTS) { setTwoFALockedUntil(Date.now() + 60_000); }
        else { setTwoFAError(`Invalid code. ${MAX_2FA_ATTEMPTS - next} attempt${MAX_2FA_ATTEMPTS - next !== 1 ? 's' : ''} remaining.`); }
        setDigits(Array(6).fill(''));
        setTimeout(() => digitRefs.current[0]?.focus(), 50);
      }
    } catch (err) {
      console.error('[2FA] verifyTotp error:', err);
      setTwoFAError('Verification failed. Please try again.');
    }
    setVerifying(false);
  };

  const verifyBackup = async () => {
    const data = twoFADataRef.current;
    if (!data || !backupCode.trim() || (twoFALockedUntil && twoFALockedUntil > Date.now())) return;
    setVerifying(true);
    setTwoFAError(null);
    try {
      const idx = await twoFactorService.verifyBackupCode(backupCode.trim(), data.hashedBackupCodes);
      if (idx >= 0) {
        await twoFactorService.consumeBackupCode(data.walletAddress, idx);
        const wallet = wallets.find(w => w.address === data.walletAddress);
        if (wallet) await completeLogin(data.pendingMnemonic, data.pendingPassword, wallet);
      } else {
        const next = twoFAAttempts + 1;
        setTwoFAAttempts(next);
        if (next >= MAX_2FA_ATTEMPTS) { setTwoFALockedUntil(Date.now() + 60_000); }
        else { setTwoFAError(`Invalid backup code. ${MAX_2FA_ATTEMPTS - next} attempt${MAX_2FA_ATTEMPTS - next !== 1 ? 's' : ''} remaining.`); }
      }
    } catch (err) {
      console.error('[2FA] verifyBackup error:', err);
      setTwoFAError('Backup code verification failed.');
    }
    setVerifying(false);
  };

  const handleGoBack = () => {
    twoFADataRef.current = null;
    setStep('password');
    setTwoFAData(null);
    setDigits(Array(6).fill(''));
    setBackupCode('');
    setTwoFAError(null);
    setTwoFAAttempts(0);
    setTwoFALockedUntil(null);
    setShowBackup(false);
  };

  const formatDate = (ts: number) => {
    const d = Date.now() - ts;
    const m = Math.floor(d / 60000), h = Math.floor(d / 3600000), days = Math.floor(d / 86400000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(ts).toLocaleDateString();
  };

  const shortenAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-6)}`;
  const isLocked = !!(lockedUntil && lockedUntil > Date.now());
  const attemptsLeft = MAX_ATTEMPTS - attemptCount;

  // ─── Empty state ──────────────────────────────────────────────────────────
  if (wallets.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-white dark:bg-transparent">
        <div className="max-w-md w-full text-center space-y-10">
          {referralCode && (
            <div className="flex items-center gap-4 p-4 bg-[#00FF88]/10 border border-[#00FF88]/20 rounded-2xl">
              <Gift size={20} className="text-[#00FF88] shrink-0" />
              <p className="text-sm text-[#00FF88] font-medium text-left">
                You've been invited! Create a wallet to claim your <span className="font-bold">welcome bonus</span>.
              </p>
            </div>
          )}
          <div className="space-y-6">
            <div className="relative w-28 h-28 mx-auto">
              <div className="absolute inset-0 rounded-[2rem] bg-[#00FF88]/15 blur-2xl animate-pulse" />
              <div className="relative w-full h-full rounded-[2rem] bg-gradient-to-br from-gray-100/50 to-gray-50/30 dark:from-white/10 dark:to-white/5 border border-gray-200 dark:border-white/20 flex items-center justify-center backdrop-blur-sm shadow-xl">
                <Wallet className="text-gray-600 dark:text-gray-300" size={50} strokeWidth={1.5} />
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 tracking-tight">No Wallets Found</h2>
              <p className="text-gray-600 dark:text-gray-400 text-base mt-3 leading-relaxed max-w-[260px] mx-auto font-medium">Create a new wallet or import an existing one to begin.</p>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <button onClick={() => navigate(referralCode ? `/create-wallet?ref=${referralCode}` : '/create-wallet')}
              className="w-full py-4 bg-[#00FF88] text-black rounded-2xl font-extrabold text-base hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(0,255,136,0.3)]">
              Create New Wallet
            </button>
            <button onClick={() => navigate('/import-wallet')}
              className="w-full py-4 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white rounded-2xl font-bold text-base hover:bg-gray-200 dark:hover:bg-white/10 active:scale-[0.98] transition-all">
              Import Existing Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Checking step (transitional) ─────────────────────────────────────────
  if (step === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-transparent">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 border-4 border-[#00FF88] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-600 dark:text-gray-400 text-sm font-bold">Verifying credentials...</p>
        </div>
      </div>
    );
  }

  // ─── 2FA step ─────────────────────────────────────────────────────────────
  if (step === '2fa') {
    const is2FALocked = !!(twoFALockedUntil && twoFALockedUntil > Date.now());
    return (
      <div className="min-h-screen flex flex-col bg-white dark:bg-transparent">
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <button onClick={handleGoBack}
            className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-all">
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00FF88]/8 border border-[#00FF88]/15 rounded-full">
            <Shield size={9} className="text-[#00FF88]" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#00FF88]/80">2FA Required</span>
          </div>
          <div className="w-9" />
        </div>

        <div className="flex-1 flex flex-col px-6 pb-8 max-w-lg mx-auto w-full space-y-6 pt-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center mx-auto">
              <Shield size={28} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Two-Factor Auth</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
              {showBackup ? 'Enter one of your saved backup codes' : 'Enter the 6-digit code from your authenticator app'}
            </p>
          </div>

          {is2FALocked ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <ShieldOff size={24} className="text-red-400" />
              </div>
              <div>
                <p className="text-base font-bold text-red-400">Too many failed attempts</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Try again in <span className="font-bold text-gray-900 dark:text-white font-mono">{twoFALockCountdown}s</span></p>
              </div>
            </div>
          ) : !showBackup ? (
            <div className="space-y-5">
              {/* OTP boxes */}
              <div className="flex gap-2 justify-center" onPaste={handleDigitPaste}>
                {digits.map((d, i) => (
                  <input key={i} ref={el => { digitRefs.current[i] = el; }}
                    type="text" inputMode="numeric" maxLength={1} value={d}
                    onChange={e => handleDigitChange(i, e.target.value)}
                    onKeyDown={e => handleDigitKeyDown(i, e)}
                    className={`w-12 h-16 text-center text-2xl font-black rounded-xl border-2 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white outline-none transition-all ${twoFAError ? 'border-red-500/60' : d ? 'border-emerald-500/60 dark:border-[#00FF88]/60' : 'border-gray-200 dark:border-white/10 focus:border-emerald-500/60 dark:focus:border-[#00FF88]/60'
                      }`}
                  />
                ))}
              </div>

              {twoFAError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <AlertCircle size={14} className="text-red-400 shrink-0" />
                  <p className="text-xs text-red-600 dark:text-red-300 font-semibold">{twoFAError}</p>
                </div>
              )}

              <button onClick={() => verifyTotp(digits.join(''))}
                disabled={verifying || digits.join('').length < 6}
                className="w-full py-4 bg-[#00FF88] text-black rounded-2xl font-extrabold text-base hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,255,136,0.2)]">
                {verifying ? <><RefreshCw size={18} className="animate-spin" /> Verifying...</> : <><Shield size={18} /> Confirm</>}
              </button>

              <button onClick={() => { setShowBackup(true); setTwoFAError(null); }}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-600 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 transition-colors py-2">
                <Key size={12} /> Use a backup code instead
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest">Backup Code</label>
                <input type="text" value={backupCode}
                  onChange={e => { setBackupCode(e.target.value); setTwoFAError(null); }}
                  onKeyDown={e => { if (e.key === 'Enter' && backupCode.trim()) verifyBackup(); }}
                  placeholder="XXXXX-XXXXX"
                  autoFocus
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white font-mono font-bold placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:border-emerald-500/60 dark:focus:border-[#00FF88]/60 focus:ring-2 focus:ring-emerald-500/20 dark:focus:ring-[#00FF88]/20 transition-all"
                />
              </div>

              {twoFAError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <AlertCircle size={14} className="text-red-400 shrink-0" />
                  <p className="text-xs text-red-600 dark:text-red-300 font-semibold">{twoFAError}</p>
                </div>
              )}

              <button onClick={verifyBackup}
                disabled={verifying || !backupCode.trim()}
                className="w-full py-4 bg-[#00FF88] text-black rounded-2xl font-extrabold text-base hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,255,136,0.2)]">
                {verifying ? <><RefreshCw size={18} className="animate-spin" /> Verifying...</> : <><Key size={18} /> Use Backup Code</>}
              </button>

              <button onClick={() => { setShowBackup(false); setTwoFAError(null); setBackupCode(''); }}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-600 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 transition-colors py-2">
                <ChevronDown size={12} className="rotate-90" /> Back to authenticator code
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Password step (default) ──────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-transparent">
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <button onClick={() => navigate('/onboarding')}
          className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-all">
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00FF88]/8 border border-[#00FF88]/15 rounded-full">
          <Lock size={9} className="text-[#00FF88]" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-[#00FF88]/80">AES-256-GCM</span>
        </div>
        <div className="w-9" />
      </div>

      <div className="flex-1 flex flex-col px-6 pb-8 max-w-lg mx-auto w-full space-y-5 pt-4">
        {referralCode && (
          <div className="flex items-center gap-3 p-4 bg-[#00FF88]/10 border border-[#00FF88]/25 rounded-2xl">
            <Users size={18} className="text-[#00FF88] shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-[#00FF88] font-bold">Referral: <span className="font-mono bg-[#00FF88]/20 px-1.5 py-0.5 rounded ml-1">{referralCode}</span></p>
              <p className="text-xs text-[#00FF88]/80 mt-1 font-medium">Create a new wallet to claim your bonus</p>
            </div>
          </div>
        )}

        <div className="pb-3 text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 tracking-tight">{t('auth.welcomeBack')}</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base mt-2 font-medium">{t('auth.enterPassword')}</p>
        </div>

        {/* Wallet cards */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest px-1">Your Wallets</label>
          <div className="space-y-3">
            {wallets.map((wallet, idx) => {
              const isSelected = selectedWallet === wallet.id;
              const colors = [
                { bg: 'bg-violet-500/20', text: 'text-violet-700 dark:text-violet-400', glow: '#8b5cf6' },
                { bg: 'bg-blue-500/20', text: 'text-blue-700 dark:text-blue-400', glow: '#3b82f6' },
                { bg: 'bg-amber-500/20', text: 'text-amber-700 dark:text-amber-400', glow: '#f59e0b' },
                { bg: 'bg-rose-500/20', text: 'text-rose-700 dark:text-rose-400', glow: '#f43f5e' },
                { bg: 'bg-cyan-500/20', text: 'text-cyan-700 dark:text-cyan-400', glow: '#06b6d4' },
              ];
              const color = colors[idx % colors.length];
              return (
                <button key={wallet.id} onClick={() => handleSelectWallet(wallet.id)}
                  style={isSelected ? { boxShadow: `0 0 0 1.5px ${color.glow}55, 0 0 24px ${color.glow}20` } : {}}
                  className={`w-full p-4 rounded-2xl border text-left transition-all duration-300 ${isSelected ? 'bg-emerald-50/50 dark:bg-white/10 border-emerald-500/30 dark:border-white/30 backdrop-blur-md' : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/20'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 font-black text-base shadow-inner ${color.bg} ${color.text}`}>
                      {wallet.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-bold text-base tracking-wide ${isSelected ? 'text-emerald-900 dark:text-white' : 'text-gray-800 dark:text-gray-300'}`}>{wallet.name}</p>
                        {wallet.type === 'secondary'
                          ? <span className="px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-600 dark:text-violet-400 text-[9px] font-bold uppercase tracking-wider">Multi-Chain</span>
                          : <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-600 dark:text-sky-400 text-[9px] font-bold uppercase tracking-wider">TON Vault</span>}
                      </div>
                      <p className={`text-[13px] font-mono mt-0.5 truncate ${isSelected ? 'text-gray-600 dark:text-gray-400' : 'text-gray-500 dark:text-gray-500'}`}>{shortenAddress(wallet.address)}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right hidden sm:block">
                        <div className={`flex items-center gap-1.5 text-[11px] font-medium justify-end ${isSelected ? 'text-gray-500 dark:text-gray-400' : 'text-gray-600 dark:text-gray-500'}`}>
                          <Clock size={12} /> {formatDate(wallet.lastUsed)}
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${isSelected ? 'bg-emerald-500 dark:bg-[#00FF88] border-emerald-500 dark:border-[#00FF88] shadow-md dark:shadow-[0_0_10px_rgba(0,255,136,0.5)]' : 'border-gray-300 dark:border-white/20'}`}>
                        {isSelected && <Check size={14} className="text-white dark:text-black" strokeWidth={3.5} />}
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
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 flex flex-col items-center text-center gap-3">
            <div className="relative w-16 h-16">
              <svg className="absolute inset-0 w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(239,68,68,0.15)" strokeWidth="4" />
                <circle cx="32" cy="32" r="28" fill="none" stroke="#ef4444" strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - lockCountdown / LOCKOUT_SECONDS)}`}
                  style={{ transition: 'stroke-dashoffset 1s linear' }} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center"><ShieldOff size={20} className="text-red-400" /></div>
            </div>
            <div>
              <p className="text-base font-bold text-red-400">Wallet Locked</p>
              <p className="text-sm text-gray-400 mt-1 font-medium">{MAX_ATTEMPTS} failed attempts detected</p>
            </div>
            <div className="px-6 py-3 bg-red-500/10 rounded-xl border border-red-500/20">
              <p className="text-3xl font-bold text-red-600 dark:text-white font-mono tabular-nums">{lockCountdown}<span className="text-base text-red-400 dark:text-gray-500 ml-1.5 uppercase font-body">sec</span></p>
            </div>
            <p className="text-xs text-gray-500 font-medium">Password entry will resume after the cooldown</p>
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest px-1">{t('auth.password')}</label>
                {attemptCount >= 2 && (
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${attemptsLeft <= 2 ? 'text-red-600 dark:text-red-400 bg-red-500/15 border border-red-500/30' : 'text-amber-700 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30'}`}>
                    {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} left
                  </span>
                )}
              </div>
              <div className="relative group">
                <input type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => { setPassword(e.target.value); setError(null); }}
                  onKeyDown={e => { if (e.key === 'Enter' && selectedWallet && password && !isLoading && !isLocked) handleUnlock(); }}
                  disabled={isLocked}
                  className={`w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 outline-none focus:ring-2 transition-all font-medium text-base shadow-inner ${error ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 dark:border-white/10 group-hover:border-gray-300 dark:group-hover:border-white/20 focus:border-emerald-500 dark:focus:border-[#00FF88] focus:ring-emerald-500/20 dark:focus:ring-[#00FF88]/20 focus:bg-white dark:focus:bg-white/10'}`}
                  placeholder="Enter your password to unlock"
                  autoFocus autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {error && (
                <div className={`flex items-center gap-3 p-3.5 rounded-xl border ${attemptsLeft <= 2 ? 'bg-red-500/15 border-red-500/40' : 'bg-red-500/10 border-red-500/20'}`}>
                  <AlertCircle size={16} className="text-red-400 shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-300 font-semibold">{error}</p>
                </div>
              )}
            </div>

            <button onClick={handleUnlock} disabled={!selectedWallet || !password || isLoading}
              className="w-full py-4 bg-[#00FF88] text-black rounded-2xl font-extrabold text-base hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,255,136,0.2)] hover:shadow-[0_0_30px_rgba(0,255,136,0.3)] disabled:shadow-none flex items-center justify-center gap-2">
              {isLoading ? <><RefreshCw className="animate-spin" size={18} /> Unlocking...</> : <>{t('auth.login')} <ArrowRight size={18} strokeWidth={2.5} /></>}
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-6 pb-4">
          <button onClick={() => navigate(referralCode ? `/create-wallet?ref=${referralCode}` : '/create-wallet')}
            className="py-3.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 rounded-xl flex items-center justify-center gap-2 text-sm font-bold hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-white/20 transition-all">
            <Plus size={16} strokeWidth={2.5} /> New Wallet
          </button>
          <button onClick={() => navigate('/import-wallet')}
            className="py-3.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 rounded-xl flex items-center justify-center gap-2 text-sm font-bold hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-white/20 transition-all">
            <Plus size={16} strokeWidth={2.5} /> Import Wallet
          </button>
        </div>
      </div>
    </div>
  );
};

export default WalletLogin;
