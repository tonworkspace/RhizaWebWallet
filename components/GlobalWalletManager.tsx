/**
 * GlobalWalletManager — renders at root level in App.tsx.
 * Contains the full account sheet + all password-gated modals.
 * Opened via useWalletManager().openSheet() from anywhere.
 */
import React, { useState, useEffect } from 'react';
import {
  X, Plus, Check, Edit2, Trash2, Download, MoreHorizontal,
  Copy, Eye, EyeOff, AlertCircle, RefreshCw, Layers, Wallet
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { WalletManager, WalletMetadata } from '../utils/walletManager';
import { useWallet } from '../context/WalletContext';
import { useToast } from '../context/ToastContext';
import { useWalletManager } from '../context/WalletManagerContext';
import { avatarColor, short } from './WalletSwitcher';

type ModalType = 'rename' | 'delete' | 'export' | 'unlock' | null;

const GlobalWalletManager: React.FC = () => {
  const navigate = useNavigate();
  const { address, login, logout } = useWallet();
  const { showToast } = useToast();
  const { isSheetOpen, closeSheet } = useWalletManager();

  const [wallets, setWallets] = useState<WalletMetadata[]>([]);
  const [modal, setModal] = useState<ModalType>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);

  // Normalize a TON address to raw form for format-agnostic comparison
  const toRaw = async (addr: string): Promise<string> => {
    try {
      const { Address } = await import('@ton/ton');
      return Address.parse(addr).toRawString();
    } catch { return addr; }
  };

  const isActiveWallet = (walletAddr: string): boolean => {
    if (!address) return false;
    if (walletAddr === address) return true;
    // For the sync check in render, also compare via WalletManager active record
    const stored = WalletManager.getActiveWallet();
    if (stored && stored.address === walletAddr) return true;
    return false;
  };

  useEffect(() => {
    if (isSheetOpen) loadWallets();
  }, [isSheetOpen]);

  const loadWallets = () => setWallets(WalletManager.getWallets());

  const selectedWallet = wallets.find(w => w.id === selectedId);

  const openModal = (type: ModalType, id: string) => {
    setSelectedId(id);
    setModal(type);
    setMenuId(null);
    if (type === 'rename') setNewName(wallets.find(w => w.id === id)?.name || '');
  };

  const closeModal = () => {
    setModal(null);
    setSelectedId(null);
    setPassword('');
    setNewName('');
    setShowPw(false);
  };

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleSwitch = async () => {
    if (!selectedId || !password) return;
    setBusy(true);
    try {
      const result = await WalletManager.getWalletMnemonic(selectedId, password);
      if (!result.success || !result.mnemonic) { showToast('Invalid password', 'error'); setBusy(false); return; }
      const type = selectedWallet?.type === 'secondary' ? 'secondary' : 'primary';
      logout();
      const ok = await login(result.mnemonic, password || undefined, type);
      if (ok) {
        WalletManager.setActiveWallet(selectedId);
        showToast(`Switched to ${selectedWallet?.name}`, 'success');
        loadWallets();
        closeModal();
        closeSheet();
      } else {
        showToast('Failed to switch wallet', 'error');
      }
    } catch { showToast('An error occurred', 'error'); }
    setBusy(false);
  };

  const handleRename = () => {
    if (!selectedId || !newName.trim()) return;
    WalletManager.renameWallet(selectedId, newName.trim())
      ? (showToast('Renamed', 'success'), loadWallets(), closeModal())
      : showToast('Failed to rename', 'error');
  };

  const handleDelete = async () => {
    if (!selectedId || !password) return;
    setBusy(true);
    try {
      if (!await WalletManager.verifyPassword(selectedId, password)) { showToast('Invalid password', 'error'); setBusy(false); return; }
      const isActive = selectedWallet ? isActiveWallet(selectedWallet.address) : false;
      if (WalletManager.removeWallet(selectedId)) {
        showToast('Wallet removed', 'success');
        loadWallets();
        closeModal();
        if (isActive) { logout(); navigate('/onboarding'); closeSheet(); }
      }
    } catch { showToast('An error occurred', 'error'); }
    setBusy(false);
  };

  const handleExport = async () => {
    if (!selectedId || !password) return;
    setBusy(true);
    try {
      const result = await WalletManager.exportWallet(selectedId, password);
      if (!result.success || !result.data) { showToast(result.error || 'Export failed', 'error'); setBusy(false); return; }
      const blob = new Blob([result.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedWallet?.name.replace(/\s+/g, '-')}-backup.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Exported', 'success');
      closeModal();
    } catch { showToast('An error occurred', 'error'); }
    setBusy(false);
  };

  const handleCopy = (addr: string) => {
    navigator.clipboard.writeText(addr);
    showToast('Address copied', 'success');
    setMenuId(null);
  };

  if (!isSheetOpen && !modal) return null;

  return (
    <>
      {/* ── Bottom Sheet ─────────────────────────────────────────────────── */}
      {isSheetOpen && (
        <>
          <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm" onClick={closeSheet} />
          <div className="fixed bottom-0 left-0 right-0 z-[111] bg-white dark:bg-[#111] rounded-t-[2rem] shadow-2xl border-t border-gray-100 dark:border-white/10 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300 max-w-xl mx-auto">

            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 bg-gray-300 dark:bg-white/20 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-white/5 flex-shrink-0">
              <h3 className="text-base font-black text-gray-900 dark:text-white">Accounts</h3>
              <button onClick={closeSheet} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-500 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Account list */}
            <div className="overflow-y-auto flex-1 px-4 py-3 space-y-1">
              {wallets.map((wallet) => {
                const isWdk = wallet.type === 'secondary';

                return (
                  <div key={wallet.id} className="relative">
                    <button
                      onClick={() => { if (!isActiveWallet(wallet.address)) openModal('unlock', wallet.id); }}
                      className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl transition-all text-left ${
                        isActiveWallet(wallet.address)
                          ? 'bg-emerald-50 dark:bg-emerald-500/10'
                          : 'hover:bg-gray-50 dark:hover:bg-white/5 active:scale-[0.98]'
                      }`}
                    >
                      {/* Avatar */}
                      <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarColor(wallet.address)} flex items-center justify-center text-white font-black text-base flex-shrink-0 shadow-sm`}>
                        {wallet.name.charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-gray-900 dark:text-white truncate">{wallet.name}</span>
                          <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                            isWdk
                              ? 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300'
                              : 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                          }`}>
                            {isWdk ? 'Multi-Chain' : 'TON'}
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-gray-500 mt-0.5">{short(wallet.address)}</p>
                        {isWdk && (
                          <p className="text-[9px] text-violet-500 dark:text-violet-400 font-medium mt-0.5">EVM · TON W5 · BTC</p>
                        )}
                      </div>

                      {/* Active check */}
                      {isActiveWallet(wallet.address) && (
                        <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                          <Check size={11} className="text-white" strokeWidth={3} />
                        </div>
                      )}
                    </button>

                    {/* Context menu trigger */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuId(menuId === wallet.id ? null : wallet.id); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-400 transition-colors"
                    >
                      <MoreHorizontal size={16} />
                    </button>

                    {/* Dropdown */}
                    {menuId === wallet.id && (
                      <>
                        <div className="fixed inset-0 z-[112]" onClick={() => setMenuId(null)} />
                        <div className="absolute right-2 top-full mt-1 z-[113] bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden min-w-[160px] animate-in fade-in zoom-in-95 duration-150">
                          <button onClick={() => handleCopy(wallet.address)} className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                            <Copy size={13} /> Copy Address
                          </button>
                          <button onClick={() => openModal('rename', wallet.id)} className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                            <Edit2 size={13} /> Rename
                          </button>
                          <button onClick={() => openModal('export', wallet.id)} className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                            <Download size={13} /> Export Backup
                          </button>
                          <div className="h-px bg-gray-100 dark:bg-white/5" />
                          <button onClick={() => openModal('delete', wallet.id)} className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                            <Trash2 size={13} /> Remove
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add account */}
            <div className="px-4 py-4 border-t border-gray-100 dark:border-white/5 flex-shrink-0">
              <button
                onClick={() => { closeSheet(); navigate('/onboarding'); }}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-emerald-400 dark:hover:border-emerald-500/50 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all text-sm font-bold"
              >
                <Plus size={16} /> Add Account
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Modals (z-[120] — above sheet and nav) ────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111] border border-gray-100 dark:border-white/10 rounded-3xl p-6 w-full max-w-sm space-y-5 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">

            {/* Rename */}
            {modal === 'rename' && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-gray-900 dark:text-white">Rename Account</h3>
                  <button onClick={closeModal} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-400"><X size={16} /></button>
                </div>
                <input
                  type="text" value={newName} onChange={e => setNewName(e.target.value)}
                  className="w-full p-3.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white outline-none focus:border-emerald-500 text-sm font-medium"
                  placeholder="Account name" autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={closeModal} className="flex-1 py-3 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-xl font-black text-xs uppercase">Cancel</button>
                  <button onClick={handleRename} disabled={!newName.trim()} className="flex-1 py-3 bg-emerald-600 dark:bg-primary text-white dark:text-black rounded-xl font-black text-xs uppercase disabled:opacity-40">Save</button>
                </div>
              </>
            )}

            {/* Switch */}
            {modal === 'unlock' && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-gray-900 dark:text-white">Switch Account</h3>
                  <button onClick={closeModal} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-400"><X size={16} /></button>
                </div>
                {selectedWallet && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor(selectedWallet.address)} flex items-center justify-center text-white font-black text-sm`}>
                      {selectedWallet.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedWallet.name}</p>
                      <p className="text-[10px] font-mono text-gray-500">{short(selectedWallet.address)}</p>
                    </div>
                  </div>
                )}
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSwitch()}
                    className="w-full p-3.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white outline-none focus:border-emerald-500 text-sm font-medium pr-11"
                    placeholder="Wallet password" autoFocus
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button onClick={closeModal} className="flex-1 py-3 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-xl font-black text-xs uppercase">Cancel</button>
                  <button onClick={handleSwitch} disabled={!password || busy} className="flex-1 py-3 bg-emerald-600 dark:bg-primary text-white dark:text-black rounded-xl font-black text-xs uppercase disabled:opacity-40 flex items-center justify-center gap-1.5">
                    {busy ? <><RefreshCw size={12} className="animate-spin" /> Switching...</> : 'Switch'}
                  </button>
                </div>
              </>
            )}

            {/* Delete */}
            {modal === 'delete' && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-gray-900 dark:text-white">Remove Account</h3>
                  <button onClick={closeModal} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-400"><X size={16} /></button>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl flex items-start gap-2">
                  <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 dark:text-red-400 font-medium">Back up your recovery phrase before removing.</p>
                </div>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full p-3.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white outline-none focus:border-red-500 text-sm font-medium pr-11"
                    placeholder="Enter password to confirm"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button onClick={closeModal} className="flex-1 py-3 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-xl font-black text-xs uppercase">Cancel</button>
                  <button onClick={handleDelete} disabled={!password || busy} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-black text-xs uppercase disabled:opacity-40 flex items-center justify-center gap-1.5">
                    {busy ? <><RefreshCw size={12} className="animate-spin" /> Removing...</> : 'Remove'}
                  </button>
                </div>
              </>
            )}

            {/* Export */}
            {modal === 'export' && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-gray-900 dark:text-white">Export Backup</h3>
                  <button onClick={closeModal} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-400"><X size={16} /></button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Enter your password to download a backup file. Keep it secure.</p>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full p-3.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white outline-none focus:border-emerald-500 text-sm font-medium pr-11"
                    placeholder="Enter password"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button onClick={closeModal} className="flex-1 py-3 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-xl font-black text-xs uppercase">Cancel</button>
                  <button onClick={handleExport} disabled={!password || busy} className="flex-1 py-3 bg-emerald-600 dark:bg-primary text-white dark:text-black rounded-xl font-black text-xs uppercase disabled:opacity-40 flex items-center justify-center gap-1.5">
                    {busy ? <><RefreshCw size={12} className="animate-spin" /> Exporting...</> : 'Export'}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </>
  );
};

export default GlobalWalletManager;
