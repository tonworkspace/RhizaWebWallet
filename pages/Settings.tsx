
import React, { useState } from 'react';
import { 
  Shield, 
  Bell, 
  Globe, 
  Moon, 
  CreditCard, 
  Lock, 
  Eye, 
  EyeOff, 
  Copy, 
  ChevronRight, 
  LogOut, 
  Info,
  Server,
  Smartphone,
  Check,
  Wallet,
  Edit2
} from 'lucide-react';
import WalletSwitcher from '../components/WalletSwitcher';
import { useWallet } from '../context/WalletContext';
import { useToast } from '../context/ToastContext';
import { supabaseService } from '../services/supabaseService';

const Settings: React.FC = () => {
  const { userProfile, referralData, address, network, switchNetwork, logout } = useWallet();
  const { showToast } = useToast();
  
  const [privacyMode, setPrivacyMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeNetwork, setActiveNetwork] = useState<'mainnet' | 'testnet'>(network);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(userProfile?.name || '');
  const [editAvatar, setEditAvatar] = useState(userProfile?.avatar || '🌱');

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

  const avatarOptions = ['🌱', '🚀', '💎', '⚡', '🔥', '🌟', '🎯', '🏆', '👑', '🦄'];

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

      {/* Wallet Manager Section */}
      <div className="p-6 rounded-[2rem] bg-gradient-to-br from-white/5 to-transparent border border-white/5">
        <WalletSwitcher />
      </div>

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
                  className="flex items-center gap-2 text-[10px] text-gray-500 font-mono cursor-pointer hover:text-white transition-colors bg-white/5 px-2 py-1 rounded-lg mt-1 border border-white/5"
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

      {/* Security Section */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 pl-4">Security & Privacy</h3>
        <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] overflow-hidden divide-y divide-white/5">
          <SettingRow icon={Lock} label="Security Passcode" value="Enabled" />
          <SettingRow icon={Smartphone} label="Biometric ID" toggle={true} />
          <SettingRow 
            icon={Eye} 
            label="Privacy Mode" 
            toggle={privacyMode} 
            onClick={() => setPrivacyMode(!privacyMode)}
          />
          <SettingRow icon={Shield} label="Backup Recovery Phrase" />
        </div>
      </div>

      {/* Preferences Section */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 pl-4">Preferences</h3>
        <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] overflow-hidden divide-y divide-white/5">
          <SettingRow icon={CreditCard} label="Primary Currency" value="USD ($)" />
          <SettingRow icon={Globe} label="Language" value="English" />
          <SettingRow 
            icon={Server} 
            label="Network" 
            value={activeNetwork === 'mainnet' ? 'TON Mainnet' : 'Testnet'} 
            onClick={() => setActiveNetwork(activeNetwork === 'mainnet' ? 'testnet' : 'mainnet')}
          />
          <SettingRow icon={Bell} label="Notifications" value="All" />
        </div>
      </div>

      {/* Startup & App Info */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 pl-4">RhizaCore Wallet</h3>
        <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] overflow-hidden divide-y divide-white/5">
          <SettingRow icon={Info} label="About RhizaCore" value="v1.0.4" />
          <SettingRow icon={Shield} label="Terms of Service" />
          <SettingRow icon={LogOut} label="Log Out Wallet" destructive />
        </div>
      </div>

      <div className="text-center space-y-2">
        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Powered by Rhiza Labs</p>
        <div className="flex justify-center gap-4 text-gray-700">
           <div className="w-1.5 h-1.5 rounded-full bg-[#00FF88]" />
           <div className="w-1.5 h-1.5 rounded-full bg-[#00CCFF]" />
           <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
        </div>
      </div>
    </div>
  );
};

export default Settings;
