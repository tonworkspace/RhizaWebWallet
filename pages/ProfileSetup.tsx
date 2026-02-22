
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Check, ArrowRight, Shield } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { authService } from '../services/authService';

const AVATARS = ['🌱', '💎', '🦁', '⚡', '👑', '🦅', '🌊', '🧿'];

const ProfileSetup: React.FC = () => {
  const navigate = useNavigate();
  const { updateProfile, profile } = useWallet();
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);

  const handleFinish = async () => {
    const finalName = name.trim() || 'Rhiza Sovereign';
    const finalAvatar = selectedAvatar;
    
    // Update local profile
    updateProfile({ 
      name: finalName, 
      avatar: finalAvatar 
    });

    // Update Supabase profile if user is authenticated
    try {
      const { user } = await authService.getCurrentUser();
      if (user) {
        const walletUser = await authService.getWalletUser(user.id);
        if (walletUser) {
          await authService.updateWalletUser(walletUser.id, {
            name: finalName,
            avatar: finalAvatar
          });
        }
      }
    } catch (error) {
      console.error('Failed to update Supabase profile:', error);
      // Continue anyway - local profile is updated
    }

    navigate('/wallet/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 page-enter">
      <div className="w-full max-w-xl space-y-12">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
            <User className="text-[#00FF88]" size={32} />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight-custom">Personalize Your Vault</h1>
          <p className="text-gray-400 font-medium">Define your identity within the RhizaCore ecosystem.</p>
        </div>

        <div className="luxury-card p-10 rounded-[3rem] space-y-10">
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 pl-2">Vault Identity (Alias)</label>
            <input 
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Satoshi Nakamoto"
              className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-[#00FF88]/50 transition-all placeholder:text-gray-700"
            />
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 pl-2">Choose Sigil</label>
            <div className="grid grid-cols-4 gap-4">
              {AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setSelectedAvatar(emoji)}
                  className={`aspect-square text-3xl flex items-center justify-center rounded-2xl transition-all border ${
                    selectedAvatar === emoji 
                      ? 'bg-[#00FF88]/10 border-[#00FF88] scale-110 shadow-[0_0_20px_rgba(0,255,136,0.2)]' 
                      : 'bg-white/5 border-transparent hover:border-white/20'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={handleFinish}
            className="w-full p-6 bg-[#00FF88] text-black rounded-2xl flex items-center justify-center gap-4 text-sm font-black uppercase tracking-widest transition-all hover:scale-[1.03] shadow-2xl"
          >
            Enter The Terminal <ArrowRight size={20} />
          </button>
        </div>

        <div className="flex items-center justify-center gap-3 text-gray-700">
          <Shield size={14} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Data Stored Locally In Your Vault</span>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
