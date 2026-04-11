import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Cloud, CloudOff, Upload, Download, Trash2,
  Eye, EyeOff, Shield, AlertCircle, Check, RefreshCw, Lock
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { useToast } from '../context/ToastContext';
import { cloudBackupService } from '../services/cloudBackupService';
import { WalletManager } from '../utils/walletManager';
import { validatePassword } from '../utils/encryption';

type Tab = 'backup' | 'restore';

const CloudBackup: React.FC = () => {
  const navigate = useNavigate();
  const { address, userProfile } = useWallet();
  const { showToast } = useToast();

  const [tab, setTab] = useState<Tab>('backup');
  const [backups, setBackups] = useState<any[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);

  // Backup form
  const [walletPassword, setWalletPassword] = useState('');
  const [backupPassword, setBackupPassword] = useState('');
  const [confirmBackupPassword, setConfirmBackupPassword] = useState('');
  const [showWalletPw, setShowWalletPw] = useState(false);
  const [showBackupPw, setShowBackupPw] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

  // Restore form
  const [restoreAddress, setRestoreAddress] = useState('');
  const [restoreBackupPassword, setRestoreBackupPassword] = useState('');
  const [restoreWalletPassword, setRestoreWalletPassword] = useState('');
  const [showRestorePw, setShowRestorePw] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const userId = userProfile?.id;

  const loadBackups = useCallback(async () => {
    if (!userId) return;
    setLoadingBackups(true);
    const result = await cloudBackupService.listBackups(userId);
    if (result.success) setBackups(result.data ?? []);
    setLoadingBackups(false);
  }, [userId]);

  useEffect(() => {
    loadBackups();
  }, [loadBackups]);

  // ── Backup ────────────────────────────────────────────────────────────────

  const handleBackup = async () => {
    if (!userId || !address) return;

    const pwCheck = validatePassword(backupPassword);
    if (!pwCheck.valid) { showToast(pwCheck.message, 'error'); return; }
    if (backupPassword !== confirmBackupPassword) {
      showToast('Backup passwords do not match', 'error'); return;
    }

    setBackingUp(true);
    try {
      // Get active wallet metadata
      const activeWallet = WalletManager.getActiveWallet();
      if (!activeWallet) { showToast('No active wallet found', 'error'); return; }

      // Decrypt mnemonic with wallet password
      const mnemonicResult = await WalletManager.getWalletMnemonic(activeWallet.id, walletPassword);
      if (!mnemonicResult.success || !mnemonicResult.mnemonic) {
        showToast('Wrong wallet password', 'error'); return;
      }

      const result = await cloudBackupService.backupWallet({
        userId,
        walletAddress: address,
        walletName: activeWallet.name,
        mnemonic: mnemonicResult.mnemonic,
        backupPassword,
        walletType: activeWallet.type === 'secondary' ? 'multi-12' : 'ton-24'
      });

      if (result.success) {
        showToast('Wallet backed up to cloud', 'success');
        setWalletPassword('');
        setBackupPassword('');
        setConfirmBackupPassword('');
        loadBackups();
      } else {
        showToast(result.error ?? 'Backup failed', 'error');
      }
    } finally {
      setBackingUp(false);
    }
  };

  // ── Restore ───────────────────────────────────────────────────────────────

  const handleRestore = async () => {
    if (!userId) return;
    if (!restoreAddress) { showToast('Select a backup to restore', 'error'); return; }

    setRestoring(true);
    try {
      const result = await cloudBackupService.restoreWallet({
        userId,
        walletAddress: restoreAddress,
        backupPassword: restoreBackupPassword
      });

      if (!result.success || !result.mnemonic) {
        showToast(result.error ?? 'Restore failed', 'error'); return;
      }

      // Import the restored wallet with the new wallet password
      const pwCheck = validatePassword(restoreWalletPassword);
      if (!pwCheck.valid) { showToast(pwCheck.message, 'error'); return; }

      const addResult = await WalletManager.addWallet(
        result.mnemonic,
        restoreWalletPassword,
        restoreAddress,
        result.walletName ?? 'Restored Wallet'
      );

      if (addResult.success) {
        showToast('Wallet restored successfully', 'success');
        navigate('/wallet/import');
      } else {
        showToast(addResult.error ?? 'Failed to import restored wallet', 'error');
      }
    } finally {
      setRestoring(false);
    }
  };

  // ── Delete backup ─────────────────────────────────────────────────────────

  const handleDelete = async (walletAddress: string) => {
    if (!userId) return;
    const result = await cloudBackupService.deleteBackup(userId, walletAddress);
    if (result.success) {
      showToast('Backup deleted', 'success');
      loadBackups();
    } else {
      showToast(result.error ?? 'Delete failed', 'error');
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 page-enter px-3 sm:px-4 md:px-0">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-all active:scale-90"
        >
          <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-950 dark:text-white">Cloud Backup</h1>
          <p className="text-xs text-gray-500 dark:text-gray-500 font-semibold">End-to-end encrypted</p>
        </div>
      </div>

      {/* Security notice */}
      <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/20 rounded-2xl flex items-start gap-3">
        <Shield size={18} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-emerald-900 dark:text-emerald-300 mb-1">Zero-knowledge backup</p>
          <p className="text-[11px] text-emerald-800 dark:text-emerald-400 leading-relaxed">
            Your seed phrase is encrypted on your device before upload. RhizaCore servers only store ciphertext and cannot decrypt your wallet.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-white/5 rounded-2xl">
        {(['backup', 'restore'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              tab === t
                ? 'bg-white dark:bg-white/10 text-gray-950 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t === 'backup' ? <span className="flex items-center justify-center gap-1.5"><Upload size={12} /> Backup</span>
              : <span className="flex items-center justify-center gap-1.5"><Download size={12} /> Restore</span>}
          </button>
        ))}
      </div>

      {/* ── BACKUP TAB ── */}
      {tab === 'backup' && (
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 rounded-2xl space-y-4">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest">Step 1 — Verify wallet</p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Wallet Password</label>
              <div className="relative">
                <input
                  type={showWalletPw ? 'text' : 'password'}
                  value={walletPassword}
                  onChange={e => setWalletPassword(e.target.value)}
                  placeholder="Enter your wallet unlock password"
                  className="w-full px-4 py-3 pr-10 bg-gray-50 dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 rounded-xl text-sm font-semibold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-emerald-400 dark:focus:border-primary transition-colors"
                />
                <button onClick={() => setShowWalletPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showWalletPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest pt-2">Step 2 — Set backup password</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-500">Use a different password from your wallet password. Store it safely — you'll need it to restore.</p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Backup Password</label>
              <div className="relative">
                <input
                  type={showBackupPw ? 'text' : 'password'}
                  value={backupPassword}
                  onChange={e => setBackupPassword(e.target.value)}
                  placeholder="Min 12 chars, upper, lower, number, symbol"
                  className="w-full px-4 py-3 pr-10 bg-gray-50 dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 rounded-xl text-sm font-semibold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-emerald-400 dark:focus:border-primary transition-colors"
                />
                <button onClick={() => setShowBackupPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showBackupPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Confirm Backup Password</label>
              <input
                type="password"
                value={confirmBackupPassword}
                onChange={e => setConfirmBackupPassword(e.target.value)}
                placeholder="Repeat backup password"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 rounded-xl text-sm font-semibold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-emerald-400 dark:focus:border-primary transition-colors"
              />
            </div>

            <button
              onClick={handleBackup}
              disabled={backingUp || !walletPassword || !backupPassword || !confirmBackupPassword}
              className="w-full py-3 bg-emerald-600 dark:bg-primary hover:bg-emerald-700 dark:hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white dark:text-black rounded-xl text-sm font-black uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {backingUp ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
              {backingUp ? 'Encrypting & Uploading...' : 'Backup to Cloud'}
            </button>
          </div>

          {/* Existing backups */}
          {backups.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-500 px-1">Your Cloud Backups</p>
              {backups.map(b => (
                <div key={b.id} className="p-4 bg-white dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
                      <Cloud size={16} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{b.wallet_name}</p>
                      <p className="text-[10px] text-gray-500 font-mono">{b.wallet_address.slice(0, 10)}...{b.wallet_address.slice(-6)}</p>
                      <p className="text-[10px] text-gray-400">{new Date(b.updated_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(b.wallet_address)}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all text-red-500"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── RESTORE TAB ── */}
      {tab === 'restore' && (
        <div className="space-y-4">
          {loadingBackups ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw size={20} className="animate-spin text-gray-400" />
            </div>
          ) : backups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <CloudOff size={32} className="text-gray-300 dark:text-gray-600" />
              <p className="text-sm font-bold text-gray-500 dark:text-gray-500">No cloud backups found</p>
              <p className="text-xs text-gray-400 dark:text-gray-600">Back up a wallet first to restore it here.</p>
            </div>
          ) : (
            <div className="p-4 bg-white dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 rounded-2xl space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Select Backup</label>
                <select
                  value={restoreAddress}
                  onChange={e => setRestoreAddress(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:border-emerald-400 dark:focus:border-primary transition-colors"
                >
                  <option value="">Choose a wallet backup...</option>
                  {backups.map(b => (
                    <option key={b.id} value={b.wallet_address}>
                      {b.wallet_name} — {b.wallet_address.slice(0, 8)}...
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Backup Password</label>
                <div className="relative">
                  <input
                    type={showRestorePw ? 'text' : 'password'}
                    value={restoreBackupPassword}
                    onChange={e => setRestoreBackupPassword(e.target.value)}
                    placeholder="Password used when backing up"
                    className="w-full px-4 py-3 pr-10 bg-gray-50 dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 rounded-xl text-sm font-semibold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-emerald-400 dark:focus:border-primary transition-colors"
                  />
                  <button onClick={() => setShowRestorePw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showRestorePw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">New Wallet Password</label>
                <input
                  type="password"
                  value={restoreWalletPassword}
                  onChange={e => setRestoreWalletPassword(e.target.value)}
                  placeholder="Set a new password for this wallet"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 rounded-xl text-sm font-semibold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-emerald-400 dark:focus:border-primary transition-colors"
                />
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl flex items-start gap-2">
                <AlertCircle size={14} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 dark:text-amber-400 font-semibold">
                  If this wallet already exists on this device, the restore will be skipped. Use Import Wallet instead.
                </p>
              </div>

              <button
                onClick={handleRestore}
                disabled={restoring || !restoreAddress || !restoreBackupPassword || !restoreWalletPassword}
                className="w-full py-3 bg-emerald-600 dark:bg-primary hover:bg-emerald-700 dark:hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white dark:text-black rounded-xl text-sm font-black uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {restoring ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                {restoring ? 'Decrypting & Restoring...' : 'Restore Wallet'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CloudBackup;
