
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Key, Zap, ShieldCheck } from 'lucide-react';

const Onboarding: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 animate-in fade-in duration-700">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00FF88]/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00CCFF]/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-12">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-[#00FF88] rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-[#00FF88]/20 rotate-3">
            <Zap className="text-black fill-current" size={40} />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white">RhizaCore</h1>
          <p className="text-gray-400 font-medium">Your gateway to the TON ecosystem</p>
        </div>

        <div className="space-y-4">
          <button 
            onClick={() => navigate('/create-wallet')}
            className="w-full p-6 bg-[#00FF88] hover:bg-[#00e67a] text-black rounded-3xl flex items-center gap-5 transition-all hover:scale-[1.02] active:scale-[0.98] group"
          >
            <div className="w-12 h-12 bg-black/10 rounded-2xl flex items-center justify-center">
              <PlusCircle size={24} />
            </div>
            <div className="text-left">
              <div className="font-black text-lg leading-none">Create New Wallet</div>
              <div className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-70">Generate 24-word phrase</div>
            </div>
          </button>

          <button 
            onClick={() => navigate('/import-wallet')}
            className="w-full p-6 bg-white/5 border border-white/10 hover:border-white/20 text-white rounded-3xl flex items-center gap-5 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
              <Key size={24} className="text-[#00FF88]" />
            </div>
            <div className="text-left">
              <div className="font-black text-lg leading-none">Import Wallet</div>
              <div className="text-[10px] font-bold uppercase tracking-widest mt-1 text-gray-500">Restore using seed phrase</div>
            </div>
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 text-gray-600">
          <ShieldCheck size={14} />
          <span className="text-[10px] font-black uppercase tracking-widest">Non-Custodial & Secure</span>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
