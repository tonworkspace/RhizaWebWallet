import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Shield, ShieldOff, ShieldCheck, Copy, Check,
  Eye, EyeOff, RefreshCw, AlertCircle, Download, QrCode
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { useToast } from '../context/ToastContext';
import { twoFactorService } from '../services/twoFactorService';
import { WalletManager } from '../utils/walletManager';

type Step = 'status' | 'setup-scan' | 'setup-verify' | 'setup-backup' | 'disable-confirm';

const TwoFactorSetup: React.FC = () => {
  const navigate = useNavigate();
  const { address, userProfile } = useWallet();
  const { showToast } = useToast();

  const [step, setStep] = useState<Step>('status');
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  // Setup state
  const [secret, setSecret] = useState('');
  const [otpUri, setOtpUri] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [hashedBackupCodes, setHashedBackupCodes] = useState<string[]>([]);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);

  // Password for encrypting secret
  const [walletPassword, setWalletPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Disable confirm
  const [disablePassword, setDisablePassword] = useState('');
  const [disabling, setDisabling] = useState(false);

  useEffect(() => {
    if (address) loadStatus();
  }, [address]);

  const loadStatus = async () => {
    if (!address) return;
    setLoading(true);
    const status = await twoFactorService.get2FAStatus(address);
    setIs2FAEnabled(status.enabled);
    setLoading(false);
  };

  // ── Generate QR code as data URL using canvas ─────────────────────────────
  const generateQrDataUrl = async (uri: string): Promise<string> => {
    // Use a simple QR code via a public API (no npm package needed)
    // In production you'd use a local library like 'qrcode'
    const encoded = encodeURIComponent(uri);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}`;
  };

  // ── Start setup ───────────────────────────────────────────────────────────
  const handleStartSetup = async () => {
    if (!address) return;
    setPasswordError('');

    // Verify wallet password first
    const activeWallet = WalletManager.getActiveWallet();
    if (!activeWallet) { showToast('No active wallet', 'error'); return; }

    const valid = await WalletManager.verifyPassword(activeWallet.id, walletPassword);
    if (!valid) { setPasswordError('Incorrect wallet password'); return; }

    // Generate secret + QR
    const newSecret = twoFactorService.generateSecret();
    const uri = twoFactorService.buildOtpAuthUri(newSecret, address);
    const qr = await generateQrDataUrl(uri);

    setSecret(newSecret);
    setOtpUri(uri);
    setQrDataUrl(qr);
    setStep('setup-scan');
  };

  // ── Verify setup code ─────────────────────────────────────────────────────
  const handleVerifySetup = async () => {
    setVerifyError('');
    const valid = await twoFactorService.verifyCode(secret, verifyCode);
    if (!valid) { setVerifyError('Invalid code. Check your app and try again.'); return; }

    // Generate backup codes
    const { plain, hashed } = await twoFactorService.generateBackupCodes();
    setBackupCodes(plain);
    setHashedBackupCodes(hashed);
    setStep('setup-backup');
  };

  // ── Save and enable ───────────────────────────────────────────────────────
  const handleEnable = async () => {
    if (!address || !userProfile?.id) return;
    setLoading(true);

    const result = await twoFactorService.enable2FA({
      userId: userProfile.id,
      walletAddress: address,
      secret,
      walletPassword,
      hashedBackupCodes
    });

    if (result.success) {
      setIs2FAEnabled(true);
      showToast('2FA enabled successfully', 'success');
      setStep('status');
      setWalletPassword('');
      setSecret('');
      setVerifyCode('');
    } else {
      showToast(result.error ?? 'Failed to enable 2FA', 'error');
    }
    setLoading(false);
  };

  // ── Disable ───────────────────────────────────────────────────────────────
  const handleDisable = async () => {
    if (!address || !userProfile?.id) return;
    setDisabling(true);

    const activeWallet = WalletManager.getActiveWallet();
    if (!activeWallet) { showToast('No active wallet', 'error'); setDisabling(false); return; }

    const valid = await WalletManager.verifyPassword(activeWallet.id, disablePassword);
    if (!valid) { showToast('Incorrect wallet password', 'error'); setDisabling(false); return; }

    const result = await twoFactorService.disable2FA(userProfile.id, address);
    if (result.success) {
      setIs2FAEnabled(false);
      showToast('2FA disabled', 'success');
      setStep('status');
      setDisablePassword('');
    } else {
      showToast(result.error ?? 'Failed to disable 2FA', 'error');
    }
    setDisabling(false);
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopiedBackup(true);
    setTimeout(() => setCopiedBackup(false), 2000);
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 page-enter px-3 sm:px-4 md:px-0 bg-white dark:bg-transparent">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => step === 'status' ? navigate(-1) : setStep('status')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-all active:scale-90"
        >
          <ChevronLeft size={20} className="text-gray-700 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-950 dark:text-white">Two-Factor Auth</h1>
          <p className="text-xs text-gray-600 dark:text-gray-500 font-semibold">TOTP — works with Google Authenticator, Authy, and more</p>
        </div>
      </div>

      {loading && step === 'status' ? (
        <div className="flex justify-center py-12"><RefreshCw size={20} className="animate-spin text-gray-500 dark:text-gray-400" /></div>
      ) : (
        <>
          {/* ── STATUS ── */}
          {step === 'status' && (
            <div className="space-y-4">
              <div className={`p-5 rounded-2xl border-2 flex items-start gap-4 ${
                is2FAEnabled
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
                  : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10'
              }`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  is2FAEnabled ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-white/10'
                }`}>
                  {is2FAEnabled
                    ? <ShieldCheck size={22} className="text-white" />
                    : <ShieldOff size={22} className="text-gray-500 dark:text-gray-400" />}
                </div>
                <div className="flex-1">
                  <p className={`font-black text-sm ${is2FAEnabled ? 'text-emerald-900 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-300'}`}>
                    {is2FAEnabled ? '2FA is Active' : '2FA is Disabled'}
                  </p>
                  <p className={`text-xs mt-1 font-semibold ${is2FAEnabled ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-500'}`}>
                    {is2FAEnabled
                      ? 'Your wallet requires a 6-digit code on every login.'
                      : 'Enable 2FA to add an extra layer of security to your wallet.'}
                  </p>
                </div>
              </div>

              {!is2FAEnabled ? (
                <div className="p-5 bg-white dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 rounded-2xl space-y-4">
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-400 uppercase tracking-widest">Confirm wallet password to begin</p>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={walletPassword}
                      onChange={e => { setWalletPassword(e.target.value); setPasswordError(''); }}
                      placeholder="Wallet unlock password"
                      className="w-full px-4 py-3 pr-10 bg-gray-50 dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 rounded-xl text-sm font-semibold text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-emerald-400 dark:focus:border-primary transition-colors"
                    />
                    <button onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passwordError && (
                    <div className="flex items-center gap-2 text-xs text-red-500 font-semibold">
                      <AlertCircle size={13} /> {passwordError}
                    </div>
                  )}
                  <button
                    onClick={handleStartSetup}
                    disabled={!walletPassword}
                    className="w-full py-3 bg-emerald-600 dark:bg-primary hover:bg-emerald-700 disabled:opacity-50 text-white dark:text-black rounded-xl text-sm font-black uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <Shield size={15} /> Enable 2FA
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setStep('disable-confirm')}
                  className="w-full py-3 bg-red-50 dark:bg-red-500/10 border-2 border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-black uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <ShieldOff size={15} /> Disable 2FA
                </button>
              )}
            </div>
          )}

          {/* ── SCAN QR ── */}
          {step === 'setup-scan' && (
            <div className="space-y-4">
              <div className="p-5 bg-white dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 rounded-2xl space-y-4">
                <p className="text-sm font-bold text-gray-800 dark:text-gray-300">
                  1. Open your authenticator app (Google Authenticator, Authy, etc.)
                </p>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-300">
                  2. Scan this QR code or enter the key manually
                </p>

                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="p-3 bg-white rounded-2xl border-2 border-gray-200 dark:border-white/10">
                    <img src={qrDataUrl} alt="2FA QR Code" className="w-48 h-48" />
                  </div>
                </div>

                {/* Manual key */}
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-500">Manual entry key</p>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl">
                    <code className="flex-1 text-xs font-mono text-gray-800 dark:text-gray-300 break-all">{secret}</code>
                    <button onClick={copySecret} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-all">
                      {copiedSecret ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-gray-500 dark:text-gray-400" />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setStep('setup-verify')}
                  className="w-full py-3 bg-emerald-600 dark:bg-primary hover:bg-emerald-700 text-white dark:text-black rounded-xl text-sm font-black uppercase tracking-widest transition-all active:scale-[0.98]"
                >
                  I've scanned it — Next
                </button>
              </div>
            </div>
          )}

          {/* ── VERIFY ── */}
          {step === 'setup-verify' && (
            <div className="p-5 bg-white dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 rounded-2xl space-y-4">
              <p className="text-sm font-bold text-gray-800 dark:text-gray-300">
                Enter the 6-digit code from your authenticator app to confirm setup.
              </p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={verifyCode}
                onChange={e => { setVerifyCode(e.target.value.replace(/\D/g, '')); setVerifyError(''); }}
                placeholder="000000"
                className="w-full px-4 py-4 text-center text-2xl font-black tracking-[0.5em] bg-gray-50 dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300 focus:outline-none focus:border-emerald-400 dark:focus:border-primary transition-colors"
                autoFocus
              />
              {verifyError && (
                <div className="flex items-center gap-2 text-xs text-red-500 font-semibold">
                  <AlertCircle size={13} /> {verifyError}
                </div>
              )}
              <button
                onClick={handleVerifySetup}
                disabled={verifyCode.length < 6}
                className="w-full py-3 bg-emerald-600 dark:bg-primary hover:bg-emerald-700 disabled:opacity-50 text-white dark:text-black rounded-xl text-sm font-black uppercase tracking-widest transition-all active:scale-[0.98]"
              >
                Verify Code
              </button>
            </div>
          )}

          {/* ── BACKUP CODES ── */}
          {step === 'setup-backup' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/20 rounded-2xl flex items-start gap-3">
                <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-400 font-semibold">
                  Save these backup codes somewhere safe. Each code can only be used once. If you lose your authenticator app, these are your only way in.
                </p>
              </div>

              <div className="p-4 bg-white dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 rounded-2xl space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, i) => (
                    <div key={i} className="px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-center">
                      <code className="text-xs font-mono font-bold text-gray-700 dark:text-gray-300">{code}</code>
                    </div>
                  ))}
                </div>

                <button
                  onClick={copyBackupCodes}
                  className="w-full py-2.5 border-2 border-gray-200 dark:border-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                >
                  {copiedBackup ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  {copiedBackup ? 'Copied' : 'Copy All Codes'}
                </button>
              </div>

              <button
                onClick={handleEnable}
                disabled={loading}
                className="w-full py-3 bg-emerald-600 dark:bg-primary hover:bg-emerald-700 disabled:opacity-50 text-white dark:text-black rounded-xl text-sm font-black uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                {loading ? 'Saving...' : "I've saved my codes — Enable 2FA"}
              </button>
            </div>
          )}

          {/* ── DISABLE CONFIRM ── */}
          {step === 'disable-confirm' && (
            <div className="p-5 bg-white dark:bg-white/5 border-2 border-red-200 dark:border-red-500/20 rounded-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
                  <ShieldOff size={18} className="text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900 dark:text-white">Disable 2FA</p>
                  <p className="text-xs text-gray-500">This will remove the extra security layer from your wallet.</p>
                </div>
              </div>

              <input
                type="password"
                value={disablePassword}
                onChange={e => setDisablePassword(e.target.value)}
                placeholder="Confirm wallet password"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 rounded-xl text-sm font-semibold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-red-400 transition-colors"
                autoFocus
              />

              <button
                onClick={handleDisable}
                disabled={disabling || !disablePassword}
                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-black uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {disabling ? <RefreshCw size={15} className="animate-spin" /> : <ShieldOff size={15} />}
                {disabling ? 'Disabling...' : 'Confirm Disable'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TwoFactorSetup;
