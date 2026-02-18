
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Copy, 
  Check, 
  Share2, 
  ShieldCheck, 
  Info,
  Download,
  QrCode,
  Zap
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';

const Receive: React.FC = () => {
  const navigate = useNavigate();
  const { address } = useWallet();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'My TON Wallet Address',
        text: `Send assets to my RhizaCore vault: ${address}`,
        url: window.location.href
      });
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 page-enter pb-12">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/wallet/dashboard')} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-black text-white">Receive Assets</h1>
      </div>

      <div className="luxury-card p-10 rounded-[3rem] flex flex-col items-center space-y-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00FF88] to-transparent opacity-50" />
        
        <div className="text-center space-y-2">
           <h2 className="text-lg font-black text-white tracking-tight">Your Vault Key</h2>
           <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em]">TON Network • Mainnet</p>
        </div>

        {/* Professional QR Concept */}
        <div className="relative group">
           <div className="absolute -inset-4 bg-[#00FF88]/10 rounded-[2.5rem] blur-2xl group-hover:bg-[#00FF88]/20 transition-all duration-700" />
           <div className="w-64 h-64 bg-white p-6 rounded-[2.5rem] relative shadow-2xl overflow-hidden flex items-center justify-center">
              {/* This would be a real QR generator in production */}
              <div className="w-full h-full border-[10px] border-black flex flex-wrap gap-1 p-2 opacity-90">
                 {Array.from({length: 100}).map((_, i) => (
                   <div key={i} className={`w-[8%] h-[8%] ${Math.random() > 0.5 ? 'bg-black' : 'bg-transparent'}`} />
                 ))}
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl border-2 border-black">
                   <Zap size={32} className="text-black fill-current" />
                </div>
              </div>
           </div>
        </div>

        <div className="w-full space-y-4">
          <div onClick={handleCopy} className="p-5 bg-black/40 border border-white/10 rounded-2xl group cursor-pointer hover:border-[#00FF88]/40 transition-all active:scale-[0.98]">
             <div className="flex justify-between items-center mb-1">
                <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Vault Address</span>
                {copied ? <Check size={14} className="text-[#00FF88]" /> : <Copy size={14} className="text-gray-500 group-hover:text-[#00FF88]" />}
             </div>
             <p className="text-xs font-mono text-white break-all leading-relaxed">{address}</p>
          </div>

          <div className="flex gap-4">
             <button onClick={handleShare} className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2">
               <Share2 size={16} /> Share Link
             </button>
             <button className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2">
               <Download size={16} /> Save QR
             </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="p-6 bg-white/5 border border-white/5 rounded-2xl space-y-2">
            <div className="w-8 h-8 rounded-lg bg-[#00FF88]/10 flex items-center justify-center text-[#00FF88]">
               <ShieldCheck size={18} />
            </div>
            <h4 className="font-bold text-sm text-white">Direct Transfer</h4>
            <p className="text-xs text-gray-500 leading-relaxed">Accepts TON and all Jetton assets (USDT, NOT, etc.) directly into your vault.</p>
         </div>
         <div className="p-6 bg-white/5 border border-white/5 rounded-2xl space-y-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
               <Info size={18} />
            </div>
            <h4 className="font-bold text-sm text-white">Security Tip</h4>
            <p className="text-xs text-gray-500 leading-relaxed">Always verify the network is TON before confirming large inbound transfers.</p>
         </div>
      </div>
      
      <div className="text-center pt-4">
         <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest">Powered by Rhiza Node Protocol</p>
      </div>
    </div>
  );
};

export default Receive;
