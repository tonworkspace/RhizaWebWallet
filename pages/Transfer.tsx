
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Send, 
  ChevronDown, 
  Info, 
  Zap, 
  ShieldCheck,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';

const Transfer: React.FC = () => {
  const navigate = useNavigate();
  const { balance, jettons } = useWallet();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  const [selectedAsset, setSelectedAsset] = useState({ symbol: 'TON', balance: balance, icon: '💎' });
  const [step, setStep] = useState<'form' | 'confirm' | 'status'>('form');
  const [status, setStatus] = useState<'success' | 'error' | null>(null);

  const handleMax = () => {
    // Leave some for gas
    const max = Math.max(0, Number(selectedAsset.balance) - 0.1).toString();
    setAmount(max);
  };

  const handleNext = () => setStep('confirm');

  const handleConfirm = async () => {
    // Simulating transaction process
    setStep('status');
    setTimeout(() => {
        setStatus('success');
    }, 2000);
  };

  const isValid = recipient.length > 20 && Number(amount) > 0;

  return (
    <div className="max-w-xl mx-auto space-y-8 page-enter pb-12">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/wallet/dashboard')} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-black text-white">Send Assets</h1>
      </div>

      {step === 'form' && (
        <div className="space-y-6">
          <div className="luxury-card p-8 rounded-[2.5rem] space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-2">Select Asset</label>
              <button className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-all">
                <div className="flex items-center gap-4">
                  <div className="text-xl">{selectedAsset.icon}</div>
                  <div className="text-left">
                    <div className="font-bold text-sm text-white">{selectedAsset.symbol}</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Balance: {selectedAsset.balance}</div>
                  </div>
                </div>
                <ChevronDown size={18} className="text-gray-600" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-2">Recipient Address</label>
              <input 
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="EQ... or UQ..."
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold text-sm outline-none focus:border-[#00FF88]/50 transition-all placeholder:text-gray-700"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between ml-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Amount</label>
                <button onClick={handleMax} className="text-[9px] font-black text-[#00FF88] uppercase tracking-widest hover:opacity-70">Send Max</button>
              </div>
              <div className="relative">
                <input 
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-black text-2xl outline-none focus:border-[#00FF88]/50 transition-all placeholder:text-gray-800"
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-[#00FF88] text-sm">{selectedAsset.symbol}</span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-2">Comment (Optional)</label>
              <input 
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Attached message..."
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold text-sm outline-none focus:border-[#00FF88]/50 transition-all placeholder:text-gray-700"
              />
            </div>
          </div>

          <button 
            disabled={!isValid}
            onClick={handleNext}
            className={`w-full p-6 rounded-2xl flex items-center justify-center gap-3 text-sm font-black uppercase tracking-widest transition-all ${
                isValid ? 'bg-[#00FF88] text-black shadow-3xl hover:scale-[1.02]' : 'bg-white/5 text-gray-600 cursor-not-allowed'
            }`}
          >
            Review Transaction <Send size={18} />
          </button>
        </div>
      )}

      {step === 'confirm' && (
        <div className="space-y-8 animate-in zoom-in-95 duration-300">
           <div className="luxury-card p-10 rounded-[3rem] space-y-8">
              <div className="text-center space-y-4">
                 <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">You are sending</p>
                 <h2 className="text-5xl font-black text-[#00FF88] tracking-tight-custom">{amount} <span className="text-xl text-white">{selectedAsset.symbol}</span></h2>
              </div>

              <div className="space-y-4 pt-6 border-t border-white/5">
                <div className="flex justify-between items-center text-sm">
                   <span className="text-gray-500 font-bold">To</span>
                   <span className="text-white font-mono truncate max-w-[200px]">{recipient}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                   <span className="text-gray-500 font-bold">Fee</span>
                   <span className="text-[#00FF88] font-bold">~0.01 TON</span>
                </div>
                {comment && (
                  <div className="flex justify-between items-center text-sm">
                     <span className="text-gray-500 font-bold">Comment</span>
                     <span className="text-white italic">"{comment}"</span>
                  </div>
                )}
              </div>

              <div className="p-4 bg-white/5 rounded-2xl flex items-center gap-3">
                 <Info size={16} className="text-blue-400 shrink-0" />
                 <p className="text-[10px] text-gray-500 font-medium">Verify the address carefully. Transactions on TON are irreversible.</p>
              </div>
           </div>

           <div className="flex flex-col gap-4">
              <button 
                onClick={handleConfirm}
                className="w-full p-6 bg-[#00FF88] text-black rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl hover:scale-[1.02] transition-all"
              >
                Confirm & Disperse
              </button>
              <button 
                onClick={() => setStep('form')}
                className="w-full p-4 text-gray-500 font-black text-[10px] uppercase tracking-widest hover:text-white transition-colors"
              >
                Cancel & Edit
              </button>
           </div>
        </div>
      )}

      {step === 'status' && (
        <div className="flex flex-col items-center justify-center py-20 space-y-8 animate-in fade-in duration-500">
           {!status ? (
             <>
               <div className="w-20 h-20 bg-[#00FF88]/10 rounded-[2.5rem] flex items-center justify-center relative">
                  <div className="absolute inset-0 border-4 border-[#00FF88] border-t-transparent rounded-[2.5rem] animate-spin" />
                  <Zap size={32} className="text-[#00FF88] animate-pulse" />
               </div>
               <div className="text-center space-y-2">
                 <h2 className="text-2xl font-black text-white">Broadcasting...</h2>
                 <p className="text-gray-500 text-sm">Your transaction is being verified by TON validators.</p>
               </div>
             </>
           ) : status === 'success' ? (
             <>
               <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 scale-110 animate-bounce">
                  <CheckCircle2 size={64} />
               </div>
               <div className="text-center space-y-4">
                 <h2 className="text-4xl font-black text-white">Success</h2>
                 <p className="text-gray-400 max-w-xs mx-auto text-sm">Asset dispersion complete. The recipient will see the balance shortly.</p>
               </div>
               <button 
                onClick={() => navigate('/wallet/dashboard')}
                className="px-12 py-5 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#00FF88] transition-all shadow-2xl"
               >
                 Back to Dashboard
               </button>
             </>
           ) : (
             <>
               <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500">
                  <XCircle size={64} />
               </div>
               <div className="text-center space-y-4">
                 <h2 className="text-2xl font-black text-white">Transmission Failed</h2>
                 <p className="text-gray-500">Network congestion or insufficient gas fees.</p>
               </div>
               <button 
                onClick={() => setStep('form')}
                className="px-8 py-4 bg-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest"
               >
                 Try Again
               </button>
             </>
           )}
        </div>
      )}
    </div>
  );
};

export default Transfer;
