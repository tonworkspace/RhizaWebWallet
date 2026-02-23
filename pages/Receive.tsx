
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
import { QRCodeSVG } from 'qrcode.react';

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

  const handleDownloadQR = () => {
    if (!address) return;
    
    // Get the QR code SVG element
    const svg = document.querySelector('.qr-code-container svg');
    if (!svg) return;

    // Convert SVG to data URL
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    // Create download link
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `rhizacore-wallet-${address.slice(0, 8)}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 sm:space-y-8 page-enter pb-8 sm:pb-12 px-3 sm:px-4 md:px-0">
      <div className="flex items-center gap-3 sm:gap-4">
        <button onClick={() => navigate('/wallet/dashboard')} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 active:scale-95">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl sm:text-2xl font-black text-white">Receive Assets</h1>
      </div>

      <div className="luxury-card p-6 sm:p-8 md:p-10 rounded-[2rem] sm:rounded-[3rem] flex flex-col items-center space-y-6 sm:space-y-8 md:space-y-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00FF88] to-transparent opacity-50" />
        
        <div className="text-center space-y-1.5 sm:space-y-2">
           <h2 className="text-base sm:text-lg font-black text-white tracking-tight">Your Vault Key</h2>
           <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em]">TON Network • Mainnet</p>
        </div>

        {/* Real QR Code */}
        <div className="relative group">
           <div className="absolute -inset-4 bg-[#00FF88]/10 rounded-[2.5rem] blur-2xl group-hover:bg-[#00FF88]/20 transition-all duration-700" />
           <div className="qr-code-container w-56 h-56 sm:w-64 sm:h-64 bg-white p-4 sm:p-5 rounded-[2rem] sm:rounded-[2.5rem] relative shadow-2xl overflow-hidden flex items-center justify-center">
              {address ? (
                <QRCodeSVG
                  value={address}
                  size={window.innerWidth < 640 ? 192 : 224}
                  level="H"
                  includeMargin={false}
                  imageSettings={{
                    src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2'%3E%3Cpath d='M13 2L3 14h9l-1 8 10-12h-9l1-8z'/%3E%3C/svg%3E",
                    height: 48,
                    width: 48,
                    excavate: true,
                  }}
                />
              ) : (
                <div className="flex items-center justify-center text-gray-400">
                  <QrCode size={64} />
                </div>
              )}
           </div>
        </div>

        <div className="w-full space-y-3 sm:space-y-4">
          <div onClick={handleCopy} className="p-4 sm:p-5 bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl group cursor-pointer hover:border-[#00FF88]/40 transition-all active:scale-[0.98]">
             <div className="flex justify-between items-center mb-1">
                <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Vault Address</span>
                {copied ? <Check size={14} className="text-[#00FF88]" /> : <Copy size={14} className="text-gray-500 group-hover:text-[#00FF88]" />}
             </div>
             <p className="text-[11px] sm:text-xs font-mono text-white break-all leading-relaxed">{address}</p>
          </div>

          <div className="flex gap-2.5 sm:gap-4">
             <button onClick={handleShare} className="flex-1 py-3 sm:py-4 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2 active:scale-95">
               <Share2 size={14} className="sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Share Link</span><span className="sm:hidden">Share</span>
             </button>
             <button onClick={handleDownloadQR} className="flex-1 py-3 sm:py-4 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2 active:scale-95">
               <Download size={14} className="sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Save QR</span><span className="sm:hidden">Save</span>
             </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
         <div className="p-5 sm:p-6 bg-white/5 border border-white/5 rounded-xl sm:rounded-2xl space-y-2">
            <div className="w-8 h-8 rounded-lg bg-[#00FF88]/10 flex items-center justify-center text-[#00FF88]">
               <ShieldCheck size={18} />
            </div>
            <h4 className="font-bold text-sm text-white">Direct Transfer</h4>
            <p className="text-xs text-gray-500 leading-relaxed">Accepts TON and all Jetton assets (USDT, NOT, etc.) directly into your vault.</p>
         </div>
         <div className="p-5 sm:p-6 bg-white/5 border border-white/5 rounded-xl sm:rounded-2xl space-y-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
               <Info size={18} />
            </div>
            <h4 className="font-bold text-sm text-white">Security Tip</h4>
            <p className="text-xs text-gray-500 leading-relaxed">Always verify the network is TON before confirming large inbound transfers.</p>
         </div>
      </div>
      
      <div className="text-center pt-2 sm:pt-4">
         <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest">Powered by Rhiza Node Protocol</p>
      </div>
    </div>
  );
};

export default Receive;
