
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ArrowRight, Clipboard, ShieldCheck, AlertCircle } from 'lucide-react';
import { useWallet } from '../context/WalletContext';

const ImportWallet: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useWallet();
  const [words, setWords] = useState<string[]>(Array(24).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleInputChange = (idx: number, value: string) => {
    setError(null);
    if (value.includes(' ') || value.includes('\n')) {
      const splitWords = value.trim().split(/[\s\n]+/).slice(0, 24 - idx);
      const newWords = [...words];
      splitWords.forEach((word, i) => {
        if (idx + i < 24) {
          newWords[idx + i] = word.toLowerCase().trim();
        }
      });
      setWords(newWords);
    } else {
      const newWords = [...words];
      newWords[idx] = value.toLowerCase().trim();
      setWords(newWords);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const splitWords = text.trim().split(/[\s\n]+/).slice(0, 24);
      if (splitWords.length > 0) {
        const newWords = Array(24).fill('');
        splitWords.forEach((word, i) => {
          if (i < 24) newWords[i] = word.toLowerCase().trim();
        });
        setWords(newWords);
        setError(null);
      }
    } catch (err) {
      setError("Clipboard access blocked. Please paste your phrase directly into the first box.");
    }
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    const success = await login(words);
    if (success) {
      navigate('/profile-setup');
    } else {
      setError("Invalid recovery phrase. Please check the words and try again.");
    }
    setIsVerifying(false);
  };

  const isReady = words.every(w => w.length > 0);

  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-8 page-enter">
      <div className="w-full max-w-3xl space-y-8">
        
        <button 
          onClick={() => navigate('/onboarding')}
          className="flex items-center gap-3 text-gray-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest"
        >
          <ChevronLeft size={16} /> Back to Entry
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-white tracking-tight-custom">Initialize Access</h1>
            <p className="text-gray-400 text-sm font-medium">Reconstitute your private keys using your 24-word sequence.</p>
          </div>
          <button 
            onClick={handlePaste}
            className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-300 hover:text-[#00FF88] transition-all flex items-center justify-center gap-2"
          >
            <Clipboard size={14} /> Paste Sequence
          </button>
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-500 text-xs font-bold animate-in fade-in zoom-in duration-300">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {words.map((word, idx) => (
            <div key={idx} className="relative group">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-mono text-gray-600 pointer-events-none font-bold">
                {idx + 1}
              </span>
              <input 
                type="text"
                value={word}
                onChange={(e) => handleInputChange(idx, e.target.value)}
                className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl py-4 pl-9 pr-3 text-xs font-black text-white outline-none focus:border-[#00FF88]/50 transition-all placeholder:text-gray-800"
                placeholder="..."
              />
            </div>
          ))}
        </div>

        <div className="pt-4 space-y-6">
          <button 
            disabled={!isReady || isVerifying}
            onClick={handleVerify}
            className={`w-full p-6 rounded-2xl flex items-center justify-center gap-3 text-sm font-black uppercase tracking-widest transition-all ${
              isReady && !isVerifying
                ? 'bg-white text-black hover:bg-[#00FF88] shadow-3xl' 
                : 'bg-white/5 text-gray-600 border border-white/5 cursor-not-allowed'
            }`}
          >
            {isVerifying ? 'Decrypting Vault...' : 'Authorize Vault Access'} <ArrowRight size={18} />
          </button>

          <div className="flex items-center justify-center gap-2 text-gray-600">
            <ShieldCheck size={14} className="text-[#00FF88]/50" />
            <span className="text-[10px] font-black uppercase tracking-widest">End-to-End Encryption Enabled</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportWallet;
