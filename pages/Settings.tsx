
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Bell, 
  Globe, 
  Lock, 
  Eye, 
  Copy, 
  ChevronRight, 
  LogOut, 
  Info,
  Server,
  Smartphone,
  Check
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { profile, address, logout, network, switchNetwork } = useWallet();
  const [privacyMode, setPrivacyMode] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

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
        {value && <span className="text-xs text-gray-500 font-mono font-bold uppercase tracking-wider">{value}</span>}
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
      <div className="p-6 rounded-[2rem] bg-gradient-to-br from-white/5 to-transparent border border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#00FF88] to-[#00CCFF] p-1 shadow-xl">
             <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-2xl">
               {profile.avatar}
             </div>
          </div>
          <div>
            <h2 className="font-bold text-lg">{profile.name}</h2>
            <div onClick={handleCopy} className="flex items-center gap-2 text-[10px] text-gray-500 font-mono cursor-pointer hover:text-white transition-colors bg-white/5 px-2 py-1 rounded-lg mt-1 border border-white/5">
              <span>{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'No Address'}</span>
              {copied ? <Check size={10} className="text-[#00FF88]" /> : <Copy size={10} />}
            </div>
          </div>
        </div>
        <button 
          onClick={() => navigate('/profile-setup')}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all border border-white/10"
        >
          Edit Profile
        </button>
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
          <SettingRow icon={Shield} label="Backup Recovery Phrase" onClick={() => navigate('/create-wallet')} />
        </div>
      </div>

      {/* Preferences Section */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 pl-4">Preferences</h3>
        <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] overflow-hidden divide-y divide-white/5">
          <SettingRow icon={Globe} label="Language" value="English" />
          <SettingRow 
            icon={Server} 
            label="Active Network" 
            value={network} 
            onClick={() => switchNetwork(network === 'mainnet' ? 'testnet' : 'mainnet')}
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
          <SettingRow icon={LogOut} label="Log Out Wallet" destructive onClick={handleLogout} />
        </div>
      </div>

      <div className="text-center space-y-2">
        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Powered by Rhiza Labs</p>
        <div className="flex justify-center gap-4 text-gray-700">
           <div className={`w-1.5 h-1.5 rounded-full ${network === 'mainnet' ? 'bg-[#00FF88]' : 'bg-amber-500'}`} />
           <div className="w-1.5 h-1.5 rounded-full bg-[#00CCFF]" />
           <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
        </div>
      </div>
    </div>
  );
};

export default Settings;
