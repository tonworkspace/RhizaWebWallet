
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Bell, 
  Globe, 
  CreditCard, 
  Lock, 
  Copy, 
  ChevronRight, 
  LogOut, 
  Info,
  Server,
  Check,
  Edit2,
  X,
  AlertCircle,
  Wallet,
  ExternalLink
} from 'lucide-react';
import WalletSwitcher from '../components/WalletSwitcher';
import { useWallet } from '../context/WalletContext';
import { useToast } from '../context/ToastContext';
import { supabaseService } from '../services/supabaseService';
import { notificationService, type NotificationPreferences } from '../services/notificationService';
import { SOCIAL_LINKS } from '../constants';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile, referralData, address, network, switchNetwork, logout } = useWallet();
  const { showToast } = useToast();
  
  const [privacyMode, setPrivacyMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeNetwork, setActiveNetwork] = useState<'mainnet' | 'testnet'>(network);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(userProfile?.name || '');
  const [editAvatar, setEditAvatar] = useState(userProfile?.avatar || '🌱');
  const [showNotificationPrefs, setShowNotificationPrefs] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences | null>(null);
  const [loadingPrefs, setLoadingPrefs] = useState(false);
  const [showBackupPhrase, setShowBackupPhrase] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [showWalletManager, setShowWalletManager] = useState(false);

  // Load notification preferences
  useEffect(() => {
    const loadPrefs = async () => {
      if (!address) return;
      
      const result = await notificationService.getPreferences(address);
      if (result.success && result.preferences) {
        setNotificationPrefs(result.preferences);
      }
    };
    
    if (showNotificationPrefs) {
      loadPrefs();
    }
  }, [address, showNotificationPrefs]);

  // Load saved currency and language preferences
  useEffect(() => {
    const savedCurrency = localStorage.getItem('preferred_currency');
    const savedLanguage = localStorage.getItem('preferred_language');
    
    if (savedCurrency) {
      setSelectedCurrency(savedCurrency);
    }
    
    if (savedLanguage) {
      const language = languages.find(l => l.code === savedLanguage);
      if (language) {
        setSelectedLanguage(language.name);
      }
    }
  }, []);

  // Update notification preference
  const handleToggleNotificationPref = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!address) return;

    setLoadingPrefs(true);
    const result = await notificationService.updatePreferences(address, {
      [key]: value
    });

    if (result.success) {
      setNotificationPrefs(prev => prev ? { ...prev, [key]: value } : null);
      showToast('Notification preferences updated', 'success');
    } else {
      showToast('Failed to update preferences', 'error');
    }
    setLoadingPrefs(false);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast(`${label} copied to clipboard`, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNetworkSwitch = async (newNetwork: 'mainnet' | 'testnet') => {
    setActiveNetwork(newNetwork);
    await switchNetwork(newNetwork);
    showToast(`Switched to ${newNetwork}`, 'success');
  };

  const handleSaveProfile = async () => {
    if (!address) return;

    const result = await supabaseService.updateProfile(address, {
      name: editName,
      avatar: editAvatar
    });

    if (result.success) {
      showToast('Profile updated successfully!', 'success');
      setIsEditingProfile(false);
      // Refresh page to update context
      window.location.reload();
    } else {
      showToast('Failed to update profile', 'error');
    }
  };

  const handleCurrencySelect = (currency: typeof currencies[0]) => {
    setSelectedCurrency(currency.code);
    localStorage.setItem('preferred_currency', currency.code);
    showToast(`Currency changed to ${currency.name}`, 'success');
    setShowCurrencyPicker(false);
  };

  const handleLanguageSelect = (language: typeof languages[0]) => {
    setSelectedLanguage(language.name);
    localStorage.setItem('preferred_language', language.code);
    showToast(`Language changed to ${language.name}`, 'success');
    setShowLanguagePicker(false);
  };

  const avatarOptions = ['🌱', '🚀', '💎', '⚡', '🔥', '🌟', '🎯', '🏆', '👑', '🦄'];
  
  const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
    { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  ];

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  ];

  const SettingRow = ({ 
    icon: Icon, 
    label, 
    value, 
    onClick, 
    destructive = false,
    toggle = null
  }: { 
    icon: any, 
    label: string, 
    value?: string, 
    onClick?: () => void, 
    destructive?: boolean,
    toggle?: boolean | null
  }) => (
    <div 
      onClick={onClick}
      className={`p-4 flex items-center justify-between hover:bg-white/5 transition-all cursor-pointer group ${destructive ? 'text-rose-500' : 'text-white'}`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${destructive ? 'bg-rose-500/10' : 'bg-white/5 group-hover:bg-[#00FF88]/10 group-hover:text-[#00FF88]'} transition-colors`}>
          <Icon size={18} />
        </div>
        <span className="text-sm font-bold">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="text-xs text-gray-500 font-mono">{value}</span>}
        {toggle !== null ? (
          <div className={`w-10 h-5 rounded-full transition-colors relative ${toggle ? 'bg-[#00FF88]' : 'bg-white/10'}`}>
            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${toggle ? 'right-1' : 'left-1'}`} />
          </div>
        ) : (
          <ChevronRight size={16} className="text-gray-700 group-hover:text-gray-400" />
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <h1 className="text-2xl font-black text-white px-2">Settings</h1>

      {/* Profile Header */}
      <div className="p-6 rounded-[2rem] bg-gradient-to-br from-white/5 to-transparent border border-white/5">
        {!isEditingProfile ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#00FF88] to-[#00CCFF] p-1 shadow-xl">
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-2xl">
                  {userProfile?.avatar || '🌱'}
                </div>
              </div>
              <div>
                <h2 className="font-bold text-lg">{userProfile?.name || 'Rhiza User'}</h2>
                <div 
                  onClick={() => handleCopy(address || '', 'Address')} 
                  className="hidden flex items-center gap-2 text-[10px] text-gray-500 font-mono cursor-pointer hover:text-white transition-colors bg-white/5 px-2 py-1 rounded-lg mt-1 border border-white/5"
                >
                  <span>{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'No address'}</span>
                  {copied ? <Check size={10} className="text-[#00FF88]" /> : <Copy size={10} />}
                </div>
                {referralData && (
                  <div 
                    onClick={() => handleCopy(referralData.referral_code, 'Referral code')}
                    className="flex items-center gap-2 text-[10px] text-[#00FF88] font-mono cursor-pointer hover:text-[#00CCFF] transition-colors bg-[#00FF88]/10 px-2 py-1 rounded-lg mt-1 border border-[#00FF88]/20"
                  >
                    <span>Code: {referralData.referral_code}</span>
                    <Copy size={10} />
                  </div>
                )}
              </div>
            </div>
            <button 
              onClick={() => {
                setEditName(userProfile?.name || '');
                setEditAvatar(userProfile?.avatar || '🌱');
                setIsEditingProfile(true);
              }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all border border-white/10 flex items-center gap-2"
            >
              <Edit2 size={14} />
              Edit Profile
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Edit Profile</h3>
            
            {/* Avatar Selection */}
            <div className="space-y-2">
              <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Avatar</label>
              <div className="flex gap-2 flex-wrap">
                {avatarOptions.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setEditAvatar(emoji)}
                    className={`w-12 h-12 rounded-xl text-2xl transition-all ${
                      editAvatar === emoji
                        ? 'bg-[#00FF88]/20 border-2 border-[#00FF88] scale-110'
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Name Input */}
            <div className="space-y-2">
              <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Display Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter your name"
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-bold text-sm outline-none focus:border-[#00FF88]/50 transition-all"
                maxLength={30}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleSaveProfile}
                className="flex-1 px-4 py-3 bg-[#00FF88] text-black rounded-xl text-xs font-black uppercase tracking-wider hover:bg-[#00CCFF] transition-all"
              >
                Save Changes
              </button>
              <button
                onClick={() => setIsEditingProfile(false)}
                className="px-4 py-3 bg-white/10 text-white rounded-xl text-xs font-bold hover:bg-white/20 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preferences Section */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 pl-4">Preferences</h3>
        <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] overflow-hidden divide-y divide-white/5">
          <SettingRow 
            icon={Wallet} 
            label="Wallet Manager" 
            value={showWalletManager ? "Hide" : "Manage"} 
            onClick={() => setShowWalletManager(!showWalletManager)} 
          />
          
          {/* Wallet Manager Expandable Section */}
          {showWalletManager && (
            <div className="p-6 bg-white/[0.02]">
              <WalletSwitcher />
            </div>
          )}
          
          <SettingRow icon={Shield} label="Backup Recovery Phrase" onClick={() => setShowBackupPhrase(true)} />
          <SettingRow icon={CreditCard} label="Primary Currency" value={`${selectedCurrency} (${currencies.find(c => c.code === selectedCurrency)?.symbol})`} onClick={() => setShowCurrencyPicker(true)} />
          <SettingRow icon={Globe} label="Language" value={selectedLanguage} onClick={() => setShowLanguagePicker(true)} />
          <SettingRow 
            icon={Server} 
            label="Network" 
            value={activeNetwork === 'mainnet' ? 'TON Mainnet' : 'Testnet'} 
            onClick={() => handleNetworkSwitch(activeNetwork === 'mainnet' ? 'testnet' : 'mainnet')}
          />
          <SettingRow icon={Bell} label="Notifications" value="Manage" onClick={() => setShowNotificationPrefs(true)} />
        </div>
      </div>

      {/* Startup & App Info */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 pl-4">RhizaCore Wallet</h3>
        <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] overflow-hidden divide-y divide-white/5">
          <SettingRow icon={Info} label="About RhizaCore" value="v1.0.4" onClick={() => navigate('/whitepaper')} />
          <SettingRow icon={Shield} label="Terms of Service" onClick={() => navigate('/terms')} />
          <SettingRow 
            icon={LogOut} 
            label="Log Out Wallet" 
            destructive 
            onClick={() => {
              logout();
              navigate('/login');
            }}
          />
        </div>
      </div>

      {/* Social Links & Footer */}
      <div className="text-center space-y-4">
        {/* Social Links */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600">Join Our Community</h3>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {SOCIAL_LINKS.map((social) => (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 bg-[#0a0a0a] hover:bg-white/10 border border-white/5 hover:border-[#00FF88]/30 rounded-xl transition-all group w-full sm:w-auto"
              >
                <div className="w-8 h-8 rounded-lg bg-[#00FF88]/10 group-hover:bg-[#00FF88]/20 flex items-center justify-center transition-colors">
                  {social.icon === 'telegram' && (
                    <svg className="w-4 h-4 text-[#00FF88]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                    </svg>
                  )}
                  {social.icon === 'facebook' && (
                    <svg className="w-4 h-4 text-[#00FF88]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="text-xs font-bold text-white group-hover:text-[#00FF88] transition-colors">{social.label}</div>
                  <div className="text-[10px] text-gray-500">{social.name}</div>
                </div>
                <ExternalLink size={14} className="text-gray-600 group-hover:text-[#00FF88] transition-colors" />
              </a>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="space-y-2 pt-4">
          <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Powered by Rhiza Labs</p>
          <div className="flex justify-center gap-4 text-gray-700">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00FF88]" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#00CCFF]" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          </div>
        </div>
      </div>

      {/* Notification Preferences Modal */}
      {showNotificationPrefs && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Notification Preferences</h2>
                  <p className="text-sm text-gray-400">Manage your notification settings</p>
                </div>
              </div>
              <button
                onClick={() => setShowNotificationPrefs(false)}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preferences */}
            {notificationPrefs ? (
              <div className="space-y-4">
                {/* Transaction Notifications */}
                <div className="p-4 bg-slate-800/50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-sm font-bold text-white">Transaction Notifications</h3>
                      <p className="text-xs text-gray-400">Get notified about your transactions</p>
                    </div>
                    <button
                      onClick={() => handleToggleNotificationPref('enable_transaction_notifications', !notificationPrefs.enable_transaction_notifications)}
                      disabled={loadingPrefs}
                      className={`w-12 h-6 rounded-full transition-colors relative ${
                        notificationPrefs.enable_transaction_notifications ? 'bg-[#00FF88]' : 'bg-slate-700'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                        notificationPrefs.enable_transaction_notifications ? 'right-1' : 'left-1'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* Referral Notifications */}
                <div className="p-4 bg-slate-800/50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-sm font-bold text-white">Referral Notifications</h3>
                      <p className="text-xs text-gray-400">Get notified about referral earnings</p>
                    </div>
                    <button
                      onClick={() => handleToggleNotificationPref('enable_referral_notifications', !notificationPrefs.enable_referral_notifications)}
                      disabled={loadingPrefs}
                      className={`w-12 h-6 rounded-full transition-colors relative ${
                        notificationPrefs.enable_referral_notifications ? 'bg-[#00FF88]' : 'bg-slate-700'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                        notificationPrefs.enable_referral_notifications ? 'right-1' : 'left-1'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* Reward Notifications */}
                <div className="p-4 bg-slate-800/50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-sm font-bold text-white">Reward Notifications</h3>
                      <p className="text-xs text-gray-400">Get notified about rewards and achievements</p>
                    </div>
                    <button
                      onClick={() => handleToggleNotificationPref('enable_reward_notifications', !notificationPrefs.enable_reward_notifications)}
                      disabled={loadingPrefs}
                      className={`w-12 h-6 rounded-full transition-colors relative ${
                        notificationPrefs.enable_reward_notifications ? 'bg-[#00FF88]' : 'bg-slate-700'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                        notificationPrefs.enable_reward_notifications ? 'right-1' : 'left-1'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* System Notifications */}
                <div className="p-4 bg-slate-800/50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-sm font-bold text-white">System Notifications</h3>
                      <p className="text-xs text-gray-400">Get notified about system updates</p>
                    </div>
                    <button
                      onClick={() => handleToggleNotificationPref('enable_system_notifications', !notificationPrefs.enable_system_notifications)}
                      disabled={loadingPrefs}
                      className={`w-12 h-6 rounded-full transition-colors relative ${
                        notificationPrefs.enable_system_notifications ? 'bg-[#00FF88]' : 'bg-slate-700'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                        notificationPrefs.enable_system_notifications ? 'right-1' : 'left-1'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* Security Notifications */}
                <div className="p-4 bg-slate-800/50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-sm font-bold text-white">Security Alerts</h3>
                      <p className="text-xs text-gray-400">Important security notifications (recommended)</p>
                    </div>
                    <button
                      onClick={() => handleToggleNotificationPref('enable_security_notifications', !notificationPrefs.enable_security_notifications)}
                      disabled={loadingPrefs}
                      className={`w-12 h-6 rounded-full transition-colors relative ${
                        notificationPrefs.enable_security_notifications ? 'bg-[#00FF88]' : 'bg-slate-700'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                        notificationPrefs.enable_security_notifications ? 'right-1' : 'left-1'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <p className="text-xs text-blue-300">
                    💡 Notifications help you stay informed about your wallet activity. You can always change these settings later.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-[#00FF88] border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm text-gray-400">Loading preferences...</p>
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={() => setShowNotificationPrefs(false)}
              className="w-full mt-6 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Backup Recovery Phrase Modal */}
      {showBackupPhrase && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Recovery Phrase</h2>
                  <p className="text-sm text-gray-400">Keep this safe and private</p>
                </div>
              </div>
              <button
                onClick={() => setShowBackupPhrase(false)}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Warning */}
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <p className="text-xs text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Never share your recovery phrase with anyone. Anyone with this phrase can access your wallet and funds.</span>
                </p>
              </div>

              {/* Info Message */}
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <p className="text-xs text-blue-300">
                  💡 Your recovery phrase is encrypted and stored locally on your device. To view it, you'll need to re-enter your wallet password.
                </p>
              </div>

              {/* Coming Soon Message */}
              <div className="p-6 bg-slate-800/50 rounded-xl text-center">
                <Lock className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-white mb-2">Secure Backup Feature</h3>
                <p className="text-xs text-gray-400">
                  Recovery phrase viewing with password verification is coming soon. For now, please keep your original backup safe.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowBackupPhrase(false)}
              className="w-full mt-6 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Currency Picker Modal */}
      {showCurrencyPicker && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Select Currency</h2>
                  <p className="text-sm text-gray-400">Choose your display currency</p>
                </div>
              </div>
              <button
                onClick={() => setShowCurrencyPicker(false)}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {currencies.map((currency) => (
                <button
                  key={currency.code}
                  onClick={() => handleCurrencySelect(currency)}
                  className={`w-full p-4 rounded-xl text-left transition-all ${
                    selectedCurrency === currency.code
                      ? 'bg-[#00FF88]/20 border-2 border-[#00FF88]'
                      : 'bg-slate-800/50 border border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-white">{currency.name}</div>
                      <div className="text-xs text-gray-400">{currency.code}</div>
                    </div>
                    <div className="text-2xl">{currency.symbol}</div>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowCurrencyPicker(false)}
              className="w-full mt-6 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Language Picker Modal */}
      {showLanguagePicker && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Select Language</h2>
                  <p className="text-sm text-gray-400">Choose your preferred language</p>
                </div>
              </div>
              <button
                onClick={() => setShowLanguagePicker(false)}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {languages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageSelect(language)}
                  className={`w-full p-4 rounded-xl text-left transition-all ${
                    selectedLanguage === language.name
                      ? 'bg-[#00FF88]/20 border-2 border-[#00FF88]'
                      : 'bg-slate-800/50 border border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{language.flag}</span>
                      <div className="text-sm font-bold text-white">{language.name}</div>
                    </div>
                    {selectedLanguage === language.name && (
                      <Check className="w-5 h-5 text-[#00FF88]" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <p className="text-xs text-blue-300">
                💡 Language selection is currently for display purposes. Full translation support coming soon!
              </p>
            </div>

            <button
              onClick={() => setShowLanguagePicker(false)}
              className="w-full mt-4 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
