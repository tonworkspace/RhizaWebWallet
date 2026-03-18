import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Key,
  X,
  Eye,
  EyeOff,
  AlertCircle,
  Check,
  Copy,
  Timer,
  LogOut,
  Trash2
} from 'lucide-react';
import { useSettingsModal } from '../context/SettingsModalContext';
import { useWallet } from '../context/WalletContext';
import { useToast } from '../context/ToastContext';

const SettingsModals: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { logout } = useWallet();
  const { showToast } = useToast();
  
  const {
    exportMode,
    exportPassword,
    exportPasswordVisible,
    exportError,
    exportLoading,
    revealedWords,
    wordsCopied,
    countdown,
    showLogoutConfirm,
    showDeleteConfirm,
    setExportPassword,
    setExportPasswordVisible,
    setShowLogoutConfirm,
    setShowDeleteConfirm,
    closeExportModal,
    handleConfirmExport,
    handleCopyWords,
    setExportError
  } = useSettingsModal();

  const handleLogout = () => {
    logout();
    navigate('/login');
    showToast(t('settings.loggedOut'), 'success');
    setShowLogoutConfirm(false);
  };

  const handleDeleteWallet = () => {
    // In production, this should require password confirmation
    logout();
    navigate('/onboarding');
    showToast(t('settings.walletDeleted'), 'success');
    setShowDeleteConfirm(false);
  };

  return (
    <>
      {/* Secure Export Modal */}
      {exportMode && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a0a0a] border-2 border-amber-300 dark:border-amber-500/30 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            {revealedWords.length === 0 ? (
              /* Password entry step */
              <>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 dark:bg-amber-500/10 rounded-xl flex items-center justify-center">
                      <Key size={18} className="text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-gray-950 dark:text-white">
                        {exportMode === 'mnemonic' ? 'Backup Recovery Phrase' : 'Export Private Key'}
                      </h3>
                      <p className="text-[10px] text-gray-500 dark:text-gray-500 font-semibold">
                        {exportMode === 'mnemonic' ? '24-word phrase' : 'Raw private key'}
                      </p>
                    </div>
                  </div>
                  <button onClick={closeExportModal} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors">
                    <X size={16} className="text-gray-500" />
                  </button>
                </div>

                <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl mb-4">
                  <p className="text-xs font-bold text-red-700 dark:text-red-400 leading-snug">
                    ⚠️ Never share this with anyone. Anyone with access to your recovery phrase can steal all your funds.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-500">
                    Enter wallet password to continue
                  </label>
                  <div className="relative">
                    <input
                      type={exportPasswordVisible ? 'text' : 'password'}
                      value={exportPassword}
                      onChange={e => { setExportPassword(e.target.value); setExportError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleConfirmExport()}
                      placeholder="Your wallet password"
                      autoComplete="off"
                      className="w-full px-4 py-3 pr-12 bg-gray-100 dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-sm font-semibold text-gray-950 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-amber-500 dark:focus:border-amber-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setExportPasswordVisible(!exportPasswordVisible)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {exportPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {exportError && (
                    <p className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                      <AlertCircle size={12} /> {exportError}
                    </p>
                  )}
                </div>

                <div className="flex gap-3 mt-5">
                  <button onClick={closeExportModal} className="flex-1 px-4 py-3 bg-gray-100 dark:bg-white/5 text-gray-950 dark:text-white rounded-xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-white/10 transition-all">
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmExport}
                    disabled={exportLoading || !exportPassword}
                    className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all active:scale-95"
                  >
                    {exportLoading ? 'Verifying...' : 'Reveal'}
                  </button>
                </div>
              </>
            ) : (
              /* Words revealed step */
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-gray-950 dark:text-white">
                      {exportMode === 'mnemonic' ? '24-Word Recovery Phrase' : 'Recovery Phrase'}
                    </h3>
                    <span className="flex items-center gap-1 text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/10 px-2 py-0.5 rounded-full">
                      <Timer size={10} /> {countdown}s
                    </span>
                  </div>
                  <button onClick={closeExportModal} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors">
                    <X size={16} className="text-gray-500" />
                  </button>
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl mb-4">
                  <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                    🔒 Write these down offline. This screen closes in {countdown}s.
                  </p>
                </div>

                {/* 24-word grid */}
                <div className="grid grid-cols-3 gap-1.5 mb-4 max-h-64 overflow-y-auto">
                  {revealedWords.map((word, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1.5">
                      <span className="text-[9px] font-black text-gray-400 dark:text-gray-600 w-4 flex-shrink-0">{i + 1}</span>
                      <span className="text-xs font-bold text-gray-950 dark:text-white truncate">{word}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleCopyWords}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-950 dark:text-white rounded-xl font-bold text-sm transition-all"
                  >
                    {wordsCopied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                    {wordsCopied ? 'Copied!' : 'Copy All'}
                  </button>
                  <button onClick={closeExportModal} className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all active:scale-95">
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a0a0a] border-2 border-gray-300 dark:border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <LogOut size={32} className="text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-black text-gray-950 dark:text-white mb-2">
                {t('settings.confirmLogout')}
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-400 font-semibold">
                {t('settings.confirmLogoutDesc')}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-3 bg-gray-100 dark:bg-white/5 text-gray-950 dark:text-white rounded-xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all"
              >
                {t('settings.logout')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a0a0a] border-2 border-red-300 dark:border-red-500/20 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} className="text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-black text-red-600 dark:text-red-400 mb-2">
                {t('settings.confirmDelete')}
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-400 mb-3 font-semibold">
                {t('settings.confirmDeleteDesc')}
              </p>
              <div className="p-3 bg-red-100 dark:bg-red-500/10 border-2 border-red-300 dark:border-red-500/20 rounded-xl">
                <p className="text-xs font-bold text-red-900 dark:text-red-300">
                  {t('settings.permanentAction')}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-3 bg-gray-100 dark:bg-white/5 text-gray-950 dark:text-white rounded-xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDeleteWallet}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all"
              >
                {t('settings.deleteWallet')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SettingsModals;