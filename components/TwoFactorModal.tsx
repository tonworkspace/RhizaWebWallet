import React, { useState, useRef, useEffect } from 'react';
import { Shield, RefreshCw, AlertCircle, Key, ChevronDown } from 'lucide-react';
import { twoFactorService } from '../services/twoFactorService';

interface Props {
  walletAddress: string;
  walletPassword: string;
  encryptedSecret: string;
  hashedBackupCodes: string[];
  onSuccess: () => void;
  onCancel: () => void;
}

const TwoFactorModal: React.FC<Props> = ({
  walletAddress,
  walletPassword,
  encryptedSecret,
  hashedBackupCodes,
  onSuccess,
  onCancel
}) => {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Brute-force protection: max 5 attempts then lock for 60s
  const [attempts, setAttempts] = useState(0);
  const MAX_2FA_ATTEMPTS = 5;
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockCountdown, setLockCountdown] = useState(0);
  const lockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (lockedUntil && lockedUntil > Date.now()) {
      const tick = () => {
        const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
        if (remaining <= 0) {
          setLockCountdown(0);
          setLockedUntil(null);
          setAttempts(0);
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

  // ── OTP digit input ────────────────────────────────────────────────────────
  const handleDigitChange = (idx: number, value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = cleaned;
    setDigits(next);
    setError(null);

    if (cleaned && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }

    // Auto-submit when all 6 digits filled
    if (cleaned && idx === 5) {
      const code = [...next.slice(0, 5), cleaned].join('');
      if (code.length === 6) verifyTotp(code);
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
    if (e.key === 'Enter') {
      const code = digits.join('');
      if (code.length === 6) verifyTotp(code);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(''));
      verifyTotp(pasted);
    }
  };

  // ── Verify TOTP ────────────────────────────────────────────────────────────
  const verifyTotp = async (code: string) => {
    if (lockedUntil && lockedUntil > Date.now()) return;
    setVerifying(true);
    setError(null);
    try {
      const secret = await twoFactorService.decryptSecret(encryptedSecret, walletPassword);
      if (!secret) {
        setError('Failed to load 2FA secret. Try again.');
        setVerifying(false);
        return;
      }
      const valid = await twoFactorService.verifyCode(secret, code);
      if (valid) {
        onSuccess();
      } else {
        const next = attempts + 1;
        setAttempts(next);
        if (next >= MAX_2FA_ATTEMPTS) {
          setLockedUntil(Date.now() + 60_000);
          setError(null);
        } else {
          setError(`Invalid code. ${MAX_2FA_ATTEMPTS - next} attempt${MAX_2FA_ATTEMPTS - next !== 1 ? 's' : ''} remaining.`);
        }
        setDigits(Array(6).fill(''));
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError('Verification failed. Please try again.');
    }
    setVerifying(false);
  };

  // ── Verify backup code ─────────────────────────────────────────────────────
  const verifyBackup = async () => {
    if (!backupCode.trim() || (lockedUntil && lockedUntil > Date.now())) return;
    setVerifying(true);
    setError(null);
    try {
      const idx = await twoFactorService.verifyBackupCode(backupCode.trim(), hashedBackupCodes);
      if (idx >= 0) {
        await twoFactorService.consumeBackupCode(walletAddress, idx);
        onSuccess();
      } else {
        const next = attempts + 1;
        setAttempts(next);
        if (next >= MAX_2FA_ATTEMPTS) {
          setLockedUntil(Date.now() + 60_000);
          setError(null);
        } else {
          setError(`Invalid backup code. ${MAX_2FA_ATTEMPTS - next} attempt${MAX_2FA_ATTEMPTS - next !== 1 ? 's' : ''} remaining.`);
        }
      }
    } catch {
      setError('Backup code verification failed.');
    }
    setVerifying(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white dark:bg-[#0d0d0d] border-2 border-gray-200 dark:border-white/10 rounded-3xl p-6 space-y-6 shadow-2xl">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
            <Shield size={26} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-950 dark:text-white">Two-Factor Auth</h2>
            <p className="text-xs text-gray-600 dark:text-gray-500 mt-1">Enter the 6-digit code from your authenticator app</p>
          </div>
        </div>

        {lockedUntil && lockedUntil > Date.now() ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
              <AlertCircle size={22} className="text-red-500" />
            </div>
            <p className="text-sm font-black text-red-500">Too many attempts</p>
            <p className="text-xs text-gray-600 dark:text-gray-500">Try again in <span className="font-bold text-gray-900 dark:text-white">{lockCountdown}s</span></p>
          </div>
        ) : !showBackup ? (
          <>
            {/* OTP input boxes */}
            <div className="flex gap-2 justify-center" onPaste={handlePaste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => handleDigitChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  className={`w-11 h-14 text-center text-xl font-black rounded-xl border-2 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white outline-none transition-all ${
                    error
                      ? 'border-red-400 dark:border-red-500'
                      : d
                        ? 'border-emerald-400 dark:border-emerald-500'
                        : 'border-gray-200 dark:border-white/10 focus:border-emerald-400 dark:focus:border-primary'
                  }`}
                />
              ))}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
                <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-600 dark:text-red-400 font-semibold">{error}</p>
              </div>
            )}

            <button
              onClick={() => verifyTotp(digits.join(''))}
              disabled={verifying || digits.join('').length < 6}
              className="w-full py-3 bg-emerald-600 dark:bg-primary hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white dark:text-black rounded-xl text-sm font-black uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {verifying ? <RefreshCw size={15} className="animate-spin" /> : <Shield size={15} />}
              {verifying ? 'Verifying...' : 'Verify'}
            </button>

            {/* Backup code toggle */}
            <button
              onClick={() => setShowBackup(true)}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-600 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 transition-colors"
            >
              <Key size={12} /> Use a backup code
            </button>
          </>
        ) : (
          <>
            {/* Backup code input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-400">Backup Code</label>
              <input
                type="text"
                value={backupCode}
                onChange={e => { setBackupCode(e.target.value); setError(null); }}
                placeholder="XXXXX-XXXXX"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 rounded-xl text-sm font-mono font-bold text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-emerald-400 dark:focus:border-primary transition-colors"
                autoFocus
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
                <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-600 dark:text-red-400 font-semibold">{error}</p>
              </div>
            )}

            <button
              onClick={verifyBackup}
              disabled={verifying || !backupCode.trim()}
              className="w-full py-3 bg-emerald-600 dark:bg-primary hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white dark:text-black rounded-xl text-sm font-black uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {verifying ? <RefreshCw size={15} className="animate-spin" /> : <Key size={15} />}
              {verifying ? 'Verifying...' : 'Use Backup Code'}
            </button>

            <button
              onClick={() => { setShowBackup(false); setError(null); }}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-600 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 transition-colors"
            >
              <ChevronDown size={12} className="rotate-90" /> Back to authenticator code
            </button>
          </>
        )}

        <button
          onClick={onCancel}
          className="w-full py-2.5 text-xs font-bold text-gray-600 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default TwoFactorModal;
