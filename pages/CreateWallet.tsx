
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Copy, Check, ArrowRight, ChevronLeft, Lock, RefreshCw } from 'lucide-react';
import { tonWalletService } from '../services/tonWalletService';
import { useWallet } from '../context/WalletContext';

const CreateWallet: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useWallet();
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const generate = async () => {
      const res = await tonWalletService.generateNewWallet();
      if (res.success && res.mnemonic) {
        setMnemonic(res.mnemonic);
      }
      setIsLoading(false);
    };
    generate();
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(mnemonic.join(' '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleComplete = async () => {
    setIsLoading(true);
    const success = await login(mnemonic);
    if (success) {
        navigate('/profile-setup');
    }
    setIsLoading(false);
  };

  if (isLoading && step === 1) {
    return <div className="min-h-screen bg-black flex items-center justify-center"><RefreshCw className="text-[#00FF88] animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-8 page-enter">
      <div className="w-full max-w-3xl space-y-12">
        
        <button 
          onClick={() => step === 1 ? navigate('/onboarding') : setStep(1)}
          className="flex items-center gap-3 text-gray-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest"
        >
          <ChevronLeft size={16} /> Back to Entry
        </button>

        <div className="space-y-4">
          <h1 className="text-4xl font-black text-white tracking-tight-custom">
            {step === 1 ? 'Your Private Key Sequence' : 'Finalizing Security'}
          </h1>
          <p className="text-gray-400 text-lg font-medium leading-relaxed max-w-2xl">
            {step === 1 
              ? 'These 24 words represent your digital vault key. Write them down in order on physical paper. Never store them digitally.' 
              : 'Before we activate your terminal, confirm your understanding of self-sovereignty.'}
          </p>
        </div>

        {step === 1 ? (
          <div className="space-y-10">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-10 luxury-card rounded-[3rem] shadow-3xl">
              {mnemonic.map((word, idx) => (
                <div key={idx} className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-[#00FF88]/30 transition-all">
                  <span className="text-[9px] font-mono text-gray-700 w-4 font-bold">{idx + 1}</span>
                  <span className="text-sm font-black text-white group-hover:text-[#00FF88] transition-colors">{word}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-6">
              <button 
                onClick={handleCopy}
                className="flex-1 p-6 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-4 text-xs font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all group"
              >
                {copied ? <Check size={18} className="text-[#00FF88]" /> : <Copy size={18} className="group-hover:text-[#00FF88]" />}
                {copied ? 'Sequence Copied' : 'Secure Copy to Buffer'}
              </button>
              <button 
                onClick={() => setStep(2)}
                className="flex-1 p-6 bg-[#00FF88] text-black rounded-2xl flex items-center justify-center gap-4 text-xs font-black uppercase tracking-widest transition-all hover:scale-[1.03] shadow-2xl"
              >
                I have stored it safely <ArrowRight size={18} />
              </button>
            </div>
            
            <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex gap-6">
               <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                  <ShieldAlert className="text-amber-500" size={20} />
               </div>
               <p className="text-xs text-amber-500/80 leading-relaxed font-bold">
                 RhizaCore Labs cannot recover this phrase. If you lose it, your assets are permanently lost.
               </p>
            </div>
          </div>
        ) : (
          <div className="space-y-8 max-w-2xl">
            <div className="space-y-4">
              {[
                { title: "Physical Storage", desc: "I have written my phrase on a secure physical document." },
                { title: "No Digital Records", desc: "I will not take a photo, screenshot, or store this in the cloud." },
                { title: "Personal Responsibility", desc: "I acknowledge that I am solely responsible for my account's security." }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-6 p-6 luxury-card rounded-[2rem] border-white/5">
                   <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center text-[#00FF88] shrink-0">
                     <Check size={20} />
                   </div>
                   <div>
                     <h4 className="font-black text-sm text-white">{item.title}</h4>
                     <p className="text-xs text-gray-500 font-medium">{item.desc}</p>
                   </div>
                </div>
              ))}
            </div>

            <button 
              onClick={handleComplete}
              className="w-full p-6 bg-white text-black rounded-2xl flex items-center justify-center gap-4 text-sm font-black uppercase tracking-widest transition-all hover:bg-[#00FF88] hover:scale-[1.03]"
            >
              Initialize My Vault <ArrowRight size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateWallet;
