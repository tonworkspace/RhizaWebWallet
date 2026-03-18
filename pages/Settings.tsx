import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  User,
  Shield,
  Bell,
  Globe,
  Moon,
  Sun,
  Key,
  Download,
  Trash2,
  LogOut,
  ChevronRight,
  Copy,
  Check,
  AlertCircle,
  Wallet,
  Lock,
  Edit
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { useToast } from '../context/ToastContext';
import { useSettingsModal } from '../context/SettingsModalContext';
import LanguageSelector from '../components/LanguageSelector';
import WalletSwitcher from '../components/WalletSwitcher';
import { WalletManager } from '../utils/walletManager';

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, children }) => (
  <div className="space-y-3">
    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-500 px-1">
      {title}
    </h3>
    <div className="space-y-2">
      {children}
    </div>
  </div>
);

interface SettingsItemProps {
  icon: any;
  label: string;
  value?: string;
  onClick?: () => void;
  danger?: boolean;
  children?: React.ReactNode;
}

const SettingsItem: React.FC<SettingsItemProps> = ({ 
  icon: Icon, 
  label, 
  value, 
  onClick, 
  danger = false,
  children 
}) => (
  <div 
    onClick={onClick}
    className={`p-4 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-2xl flex items-center justify-between transition-all shadow-sm ${
      onClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-white/10 active:scale-[0.98]' : ''
    } ${danger ? 'border-red-300 dark:border-red-500/20' : ''}`}
  >
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
        danger 
          ? 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400' 
          : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400'
      }`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold ${
          danger ? 'text-red-600 dark:text-red-400' : 'text-gray-950 dark:text-white'
        }`}>
          {label}
        </p>
        {value && (
          <p className="text-xs text-gray-600 dark:text-gray-500 truncate font-semibold">{value}</p>
        )}
      </div>
    </div>
    {children || (onClick && (
      <ChevronRight size={18} className="text-gray-600 dark:text-gray-500 flex-shrink-0" />
    ))}
  </div>
);

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { 
    address, 
    userProfile, 
    theme, 
    toggleTheme, 
    network,
    switchNetwork,
    isActivated,
    activatedAt,
    activationFeePaid
  } = useWallet();
  const { showToast } = useToast();
  const {
    openExportModal,
    setShowLogoutConfirm,
    setShowDeleteConfirm
  } = useSettingsModal();

  const [addressCopied, setAddressCopied] = useState(false);
  const [walletCount, setWalletCount] = useState(0);

  useEffect(() => {
    // Check wallet count
    const wallets = WalletManager.getWallets();
    setWalletCount(wallets.length);
  }, []);

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setAddressCopied(true);
      showToast(t('settings.addressCopied'), 'success');
      setTimeout(() => setAddressCopied(false), 2000);
    }
  };

  const handleExportMnemonic = () => {
    openExportModal('mnemonic');
  };

  const handleExportPrivateKey = () => {
    openExportModal('privatekey');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 page-enter px-3 sm:px-4 md:px-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-950 dark:text-white">
          {t('settings.title')}
        </h1>
      </div>

      {/* Profile Card */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-200/50 to-cyan-200/50 dark:from-primary/20 dark:to-secondary/20 rounded-2xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
        <div className="relative bg-white dark:bg-[#0a0a0a]/80 backdrop-blur-xl border-2 border-gray-300 dark:border-white/5 rounded-2xl p-5 sm:p-6 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="text-4xl">{userProfile?.avatar || '👤'}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-black text-gray-950 dark:text-white">
                  {userProfile?.name || t('settings.anonymous')}
                </h2>
                <button
                  onClick={() => navigate('/wallet/profile')}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-all active:scale-90 group"
                  title="Edit Profile"
                >
                  <Edit size={14} className="text-gray-600 dark:text-gray-500 group-hover:text-primary dark:group-hover:text-primary" />
                </button>
              </div>
              {userProfile?.email && (
                <p className="text-xs text-gray-600 dark:text-gray-500 mb-2 font-semibold">
                  {userProfile.email}
                </p>
              )}
              <div className="flex items-center gap-2 mb-3">
                <p className="text-xs font-mono text-gray-600 dark:text-gray-500 truncate font-semibold">
                  {address ? `${address.slice(0, 8)}...${address.slice(-6)}` : ''}
                </p>
                <button
                  onClick={handleCopyAddress}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-all active:scale-90"
                  aria-label={t('common.copy')}
                >
                  {addressCopied ? (
                    <Check size={14} className="text-emerald-600 dark:text-primary" />
                  ) : (
                    <Copy size={14} className="text-gray-600 dark:text-gray-500" />
                  )}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                  network === 'mainnet'
                    ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400'
                    : 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
                }`}>
                  {network === 'mainnet' ? t('settings.mainnet') : t('settings.testnet')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Management - Only show if more than 1 wallet */}
      {walletCount > 1 && (
        <SettingsSection title={t('settings.walletManagement')}>
          <div className="p-4 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-2xl shadow-sm">
            <WalletSwitcher />
          </div>
        </SettingsSection>
      )}

      {/* Activation Status */}
      <SettingsSection title="Wallet Status">
        <div className={`p-4 border-2 rounded-2xl shadow-sm ${
          isActivated 
            ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
            : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isActivated
                ? 'bg-emerald-600 dark:bg-emerald-500'
                : 'bg-amber-600 dark:bg-amber-500'
            }`}>
              <Shield size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className={`text-sm font-bold ${
                  isActivated
                    ? 'text-emerald-900 dark:text-emerald-300'
                    : 'text-amber-900 dark:text-amber-300'
                }`}>
                  {isActivated ? 'Wallet Activated' : 'Wallet Not Activated'}
                </p>
                <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-full text-white ${
                  isActivated
                    ? 'bg-emerald-600 dark:bg-emerald-500'
                    : 'bg-amber-600 dark:bg-amber-500'
                }`}>
                  {isActivated ? 'Active' : 'Inactive'}
                </span>
              </div>
              {isActivated && activatedAt ? (
                <div className="space-y-1">
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                    Activated on {new Date(activatedAt).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  {activationFeePaid > 0 && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-500 font-semibold">
                      Activation Fee: {activationFeePaid.toFixed(4)} TON
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">
                    Purchase a node or pay the activation fee to unlock full wallet access.
                  </p>
                  <button
                    onClick={() => navigate('/wallet/sales-package')}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95"
                  >
                    Activate Wallet
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Preferences */}
      <SettingsSection title={t('settings.preferences')}>
        <SettingsItem
          icon={theme === 'dark' ? Moon : Sun}
          label={t('settings.theme')}
          value={theme === 'dark' ? t('settings.darkMode') : t('settings.lightMode')}
          onClick={toggleTheme}
        />
        
        <div className="p-4 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-600 dark:text-gray-400">
                <Globe size={18} />
              </div>
              <p className="text-sm font-bold text-gray-950 dark:text-white">
                {t('settings.language')}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <LanguageSelector />
          </div>
        </div>

        <SettingsItem
          icon={Bell}
          label={t('settings.notifications')}
          value={t('settings.manageNotifications')}
          onClick={() => navigate('/wallet/notifications')}
        />
      </SettingsSection>

      {/* Network */}
      <SettingsSection title={t('settings.network')}>
        <div className="p-4 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-600 dark:text-gray-400">
                <Globe size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-950 dark:text-white">
                  {t('settings.currentNetwork')}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-500 font-semibold">
                  {network === 'mainnet' ? 'TON Mainnet' : 'TON Testnet'}
                </p>
              </div>
            </div>
            <button
              onClick={() => switchNetwork(network === 'mainnet' ? 'testnet' : 'mainnet')}
              className="px-4 py-2 bg-emerald-600 dark:bg-primary text-white dark:text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all active:scale-95 shadow-sm"
            >
              {t('settings.switch')}
            </button>
          </div>
        </div>
      </SettingsSection>

      {/* Security */}
      <SettingsSection title={t('settings.security')}>
        <SettingsItem
          icon={Key}
          label={t('settings.backupRecoveryPhrase')}
          value="Export your 24-word recovery phrase"
          onClick={handleExportMnemonic}
        />
        
        <SettingsItem
          icon={Lock}
          label={t('settings.exportPrivateKey')}
          value={t('settings.advancedUsers')}
          onClick={handleExportPrivateKey}
        />

        <div className="p-4 bg-amber-100 dark:bg-amber-500/10 border-2 border-amber-300 dark:border-amber-500/20 rounded-2xl shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-900 dark:text-amber-300 mb-1">
                {t('settings.securityWarning')}
              </p>
              <p className="text-[10px] text-amber-800 dark:text-amber-400 leading-relaxed font-semibold">
                {t('settings.securityWarningDesc')}
              </p>
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Danger Zone */}
      <SettingsSection title={t('settings.dangerZone')}>
        <SettingsItem
          icon={LogOut}
          label={t('settings.logout')}
          value={t('settings.logoutDesc')}
          onClick={() => setShowLogoutConfirm(true)}
          danger
        />
        
        <SettingsItem
          icon={Trash2}
          label={t('settings.deleteWallet')}
          value={t('settings.deleteWalletDesc')}
          onClick={() => setShowDeleteConfirm(true)}
          danger
        />
      </SettingsSection>

      {/* App Version */}
      <div className="text-center py-6">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-600">
          RhizaCore v1.0.4-LXC
        </p>
      </div>
    </div>
  );
};

export default Settings;
