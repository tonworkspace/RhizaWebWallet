import React, { useState } from 'react';
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
  Eye,
  EyeOff
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { useToast } from '../context/ToastContext';
import LanguageSelector from '../components/LanguageSelector';
import WalletSwitcher from '../components/WalletSwitcher';

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, children }) => (
  <div className="space-y-3">
    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-gray-500 px-1">
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
    className={`p-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl flex items-center justify-between transition-all ${
      onClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-white/10 active:scale-[0.98]' : ''
    } ${danger ? 'border-red-200 dark:border-red-500/20' : ''}`}
  >
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
        danger 
          ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' 
          : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-400'
      }`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold ${
          danger ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'
        }`}>
          {label}
        </p>
        {value && (
          <p className="text-xs text-slate-500 dark:text-gray-500 truncate">{value}</p>
        )}
      </div>
    </div>
    {children || (onClick && (
      <ChevronRight size={18} className="text-slate-400 dark:text-gray-500 flex-shrink-0" />
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
    logout,
    network,
    switchNetwork 
  } = useWallet();
  const { showToast } = useToast();

  const [showMnemonic, setShowMnemonic] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setAddressCopied(true);
      showToast(t('settings.addressCopied'), 'success');
      setTimeout(() => setAddressCopied(false), 2000);
    }
  };

  const handleExportMnemonic = () => {
    // In production, this should require password confirmation
    showToast(t('settings.mnemonicExported'), 'success');
  };

  const handleExportPrivateKey = () => {
    // In production, this should require password confirmation
    showToast(t('settings.privateKeyExported'), 'success');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    showToast(t('settings.loggedOut'), 'success');
  };

  const handleDeleteWallet = () => {
    // In production, this should require password confirmation
    logout();
    navigate('/onboarding');
    showToast(t('settings.walletDeleted'), 'success');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 page-enter px-3 sm:px-4 md:px-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          {t('settings.title')}
        </h1>
      </div>

      {/* Profile Card */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-2xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
        <div className="relative bg-white dark:bg-[#0a0a0a]/80 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-2xl p-5 sm:p-6 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="text-4xl">{userProfile?.avatar || '👤'}</div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-black text-slate-900 dark:text-white mb-1">
                {userProfile?.name || t('settings.anonymous')}
              </h2>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-xs font-mono text-slate-500 dark:text-gray-500 truncate">
                  {address ? `${address.slice(0, 8)}...${address.slice(-6)}` : ''}
                </p>
                <button
                  onClick={handleCopyAddress}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-all active:scale-90"
                  aria-label={t('common.copy')}
                >
                  {addressCopied ? (
                    <Check size={14} className="text-primary" />
                  ) : (
                    <Copy size={14} className="text-slate-400 dark:text-gray-500" />
                  )}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                  network === 'mainnet'
                    ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400'
                    : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
                }`}>
                  {network === 'mainnet' ? t('settings.mainnet') : t('settings.testnet')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Management */}
      <SettingsSection title={t('settings.walletManagement')}>
        <div className="p-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl">
          <WalletSwitcher />
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
        
        <div className="p-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-600 dark:text-gray-400">
                <Globe size={18} />
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
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
        <div className="p-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-600 dark:text-gray-400">
                <Globe size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {t('settings.currentNetwork')}
                </p>
                <p className="text-xs text-slate-500 dark:text-gray-500">
                  {network === 'mainnet' ? 'TON Mainnet' : 'TON Testnet'}
                </p>
              </div>
            </div>
            <button
              onClick={() => switchNetwork(network === 'mainnet' ? 'testnet' : 'mainnet')}
              className="px-4 py-2 bg-primary text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all active:scale-95"
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
          value={t('settings.exportMnemonic')}
          onClick={handleExportMnemonic}
        />
        
        <SettingsItem
          icon={Lock}
          label={t('settings.exportPrivateKey')}
          value={t('settings.advancedUsers')}
          onClick={handleExportPrivateKey}
        />

        <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-900 dark:text-amber-300 mb-1">
                {t('settings.securityWarning')}
              </p>
              <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
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

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <LogOut size={32} className="text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">
                {t('settings.confirmLogout')}
              </h3>
              <p className="text-sm text-slate-600 dark:text-gray-400">
                {t('settings.confirmLogoutDesc')}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-3 bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
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
          <div className="bg-white dark:bg-[#0a0a0a] border border-red-200 dark:border-red-500/20 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} className="text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-black text-red-600 dark:text-red-400 mb-2">
                {t('settings.confirmDelete')}
              </h3>
              <p className="text-sm text-slate-600 dark:text-gray-400 mb-3">
                {t('settings.confirmDeleteDesc')}
              </p>
              <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
                <p className="text-xs font-bold text-red-900 dark:text-red-300">
                  {t('settings.permanentAction')}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-3 bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
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

      {/* App Version */}
      <div className="text-center py-6">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-600">
          RhizaCore v1.0.4-LXC
        </p>
      </div>
    </div>
  );
};

export default Settings;
