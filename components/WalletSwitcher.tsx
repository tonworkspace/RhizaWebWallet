import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Check, 
  Plus, 
  Edit2, 
  Trash2, 
  Download,
  AlertCircle,
  X,
  Eye,
  EyeOff
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { WalletManager, WalletMetadata } from '../utils/walletManager';
import { useWallet } from '../context/WalletContext';
import { useToast } from '../context/ToastContext';

const WalletSwitcher: React.FC = () => {
  const navigate = useNavigate();
  const { address, login, logout } = useWallet();
  const { showToast } = useToast();
  
  const [wallets, setWallets] = useState<WalletMetadata[]>([]);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadWallets();
  }, []);

  const loadWallets = () => {
    const loadedWallets = WalletManager.getWallets();
    setWallets(loadedWallets);
  };

  const handleSwitchWallet = async (walletId: string) => {
    const wallet = wallets.find(w => w.id === walletId);
    if (!wallet) return;

    // If already active, do nothing
    if (wallet.address === address) {
      showToast('This wallet is already active', 'info');
      return;
    }

    // Prompt for password
    const password = prompt('Enter password to unlock this wallet:');
    if (!password) return;

    setIsProcessing(true);

    try {
      // Get mnemonic
      const result = await WalletManager.getWalletMnemonic(walletId, password);
      
      if (!result.success || !result.mnemonic) {
        showToast('Invalid password', 'error');
        setIsProcessing(false);
        return;
      }

      // Logout current wallet
      logout();

      // Login with new wallet
      const success = await login(result.mnemonic, password);
      
      if (success) {
        WalletManager.setActiveWallet(walletId);
        showToast(`Switched to ${wallet.name}`, 'success');
        loadWallets();
      } else {
        showToast('Failed to switch wallet', 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    }

    setIsProcessing(false);
  };

  const handleRename = () => {
    if (!selectedWallet || !newName.trim()) return;

    const success = WalletManager.renameWallet(selectedWallet, newName.trim());
    
    if (success) {
      showToast('Wallet renamed successfully', 'success');
      loadWallets();
      setShowRenameModal(false);
      setNewName('');
      setSelectedWallet(null);
    } else {
      showToast('Failed to rename wallet', 'error');
    }
  };

  const handleDelete = async () => {
    if (!selectedWallet || !password) return;

    setIsProcessing(true);

    try {
      // Verify password before deleting
      const isValid = await WalletManager.verifyPassword(selectedWallet, password);
      
      if (!isValid) {
        showToast('Invalid password', 'error');
        setIsProcessing(false);
        return;
      }

      const wallet = wallets.find(w => w.id === selectedWallet);
      const isActive = wallet?.address === address;

      const success = WalletManager.removeWallet(selectedWallet);
      
      if (success) {
        showToast('Wallet removed successfully', 'success');
        loadWallets();
        setShowDeleteModal(false);
        setPassword('');
        setSelectedWallet(null);

        // If deleted active wallet, logout
        if (isActive) {
          logout();
          navigate('/onboarding');
        }
      } else {
        showToast('Failed to remove wallet', 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    }

    setIsProcessing(false);
  };

  const handleExport = async () => {
    if (!selectedWallet || !password) return;

    setIsProcessing(true);

    try {
      const result = await WalletManager.exportWallet(selectedWallet, password);
      
      if (!result.success || !result.data) {
        showToast(result.error || 'Failed to export wallet', 'error');
        setIsProcessing(false);
        return;
      }

      // Download as JSON file
      const wallet = wallets.find(w => w.id === selectedWallet);
      const blob = new Blob([result.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${wallet?.name.replace(/\s+/g, '-')}-backup.json`;
      a.click();
      URL.revokeObjectURL(url);

      showToast('Wallet exported successfully', 'success');
      setShowExportModal(false);
      setPassword('');
      setSelectedWallet(null);
    } catch (error) {
      showToast('An error occurred', 'error');
    }

    setIsProcessing(false);
  };

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-white">Wallet Manager</h3>
          <p className="text-xs text-gray-500 mt-1">Manage and switch between your wallets</p>
        </div>
        <button
          onClick={() => navigate('/import-wallet')}
          className="px-4 py-2 bg-[#00FF88] text-black rounded-xl font-black text-xs uppercase tracking-wider hover:scale-105 transition-all flex items-center gap-2"
        >
          <Plus size={14} />
          Add Wallet
        </button>
      </div>

      <div className="space-y-3">
        {wallets.map((wallet) => {
          const isActive = wallet.address === address;
          
          return (
            <div
              key={wallet.id}
              className={`p-5 rounded-2xl border-2 transition-all ${
                isActive
                  ? 'bg-[#00FF88]/10 border-[#00FF88]'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    isActive
                      ? 'bg-[#00FF88]/20 text-[#00FF88]'
                      : 'bg-white/5 text-gray-400'
                  }`}>
                    <Wallet size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-white">{wallet.name}</h4>
                      {isActive && (
                        <span className="px-2 py-0.5 bg-[#00FF88]/20 text-[#00FF88] rounded-lg text-[9px] font-black uppercase tracking-wider">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 font-mono mt-1">
                      {shortenAddress(wallet.address)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isActive && (
                    <button
                      onClick={() => handleSwitchWallet(wallet.id)}
                      disabled={isProcessing}
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all disabled:opacity-50"
                      title="Switch to this wallet"
                    >
                      <Check size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedWallet(wallet.id);
                      setNewName(wallet.name);
                      setShowRenameModal(true);
                    }}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all"
                    title="Rename wallet"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedWallet(wallet.id);
                      setShowExportModal(true);
                    }}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all"
                    title="Export wallet"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedWallet(wallet.id);
                      setShowDeleteModal(true);
                    }}
                    className="p-2 bg-white/5 hover:bg-red-500/10 rounded-xl text-gray-400 hover:text-red-500 transition-all"
                    title="Remove wallet"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rename Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 max-w-md w-full space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-white">Rename Wallet</h3>
              <button
                onClick={() => {
                  setShowRenameModal(false);
                  setNewName('');
                  setSelectedWallet(null);
                }}
                className="p-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 outline-none focus:border-[#00FF88]/50 transition-all font-medium"
              placeholder="Enter new name"
              autoFocus
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRenameModal(false);
                  setNewName('');
                  setSelectedWallet(null);
                }}
                className="flex-1 p-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleRename}
                disabled={!newName.trim()}
                className="flex-1 p-4 bg-[#00FF88] text-black rounded-2xl font-black text-sm uppercase tracking-wider hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 max-w-md w-full space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-white">Remove Wallet</h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setPassword('');
                  setSelectedWallet(null);
                }}
                className="p-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-red-400 font-medium">
                This action cannot be undone. Make sure you have backed up your recovery phrase.
              </p>
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 outline-none focus:border-[#00FF88]/50 transition-all font-medium"
                placeholder="Enter password to confirm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setPassword('');
                  setSelectedWallet(null);
                }}
                className="flex-1 p-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={!password || isProcessing}
                className="flex-1 p-4 bg-red-500 text-white rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 max-w-md w-full space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-white">Export Wallet</h3>
              <button
                onClick={() => {
                  setShowExportModal(false);
                  setPassword('');
                  setSelectedWallet(null);
                }}
                className="p-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-gray-400">
              Enter your password to export this wallet as a backup file. Keep this file secure.
            </p>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 outline-none focus:border-[#00FF88]/50 transition-all font-medium"
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowExportModal(false);
                  setPassword('');
                  setSelectedWallet(null);
                }}
                className="flex-1 p-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={!password || isProcessing}
                className="flex-1 p-4 bg-[#00FF88] text-black rounded-2xl font-black text-sm uppercase tracking-wider hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Exporting...' : 'Export'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletSwitcher;
