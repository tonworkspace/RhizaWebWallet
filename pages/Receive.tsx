
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Copy, 
  Check, 
  Share2, 
  ShieldCheck, 
  Info,
  Download,
  QrCode,
  Zap,
  Layers
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { WalletManager } from '../utils/walletManager';
import { QRCodeSVG } from 'qrcode.react';

type WalletType = 'primary' | 'primary-rzc' | 'multichain-evm' | 'multichain-usdt' | 'multichain-ton' | 'multichain-btc';

const Receive: React.FC = () => {
  const navigate = useNavigate();
  const { address } = useWallet();
  const allWallets = WalletManager.getWallets();
  const multiChainWallet = allWallets.find(w => w.type === 'secondary');
  const isMultiChainActive = address && multiChainWallet?.address === address;
  const multiChainAddresses = multiChainWallet && multiChainWallet.addresses ? {
    evmAddress: multiChainWallet.addresses.evm,
    tonAddress: multiChainWallet.addresses.ton,
    btcAddress: multiChainWallet.addresses.btc
  } : null;
  const [copied, setCopied] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<WalletType>('primary');

  // Get current address based on selected wallet
  const currentAddress = (selectedWallet === 'primary' || selectedWallet === 'primary-rzc') 
    ? address 
    : (selectedWallet === 'multichain-evm' || selectedWallet === 'multichain-usdt')
    ? multiChainAddresses?.evmAddress
    : selectedWallet === 'multichain-btc'
    ? multiChainAddresses?.btcAddress
    : multiChainAddresses?.tonAddress;

  const currentNetwork = selectedWallet === 'primary'
    ? 'TON Network • Mainnet Vault'
    : selectedWallet === 'primary-rzc'
    ? 'TON Network • Community Token'
    : selectedWallet === 'multichain-evm'
    ? 'EVM Network • ETH / Polygon'
    : selectedWallet === 'multichain-usdt'
    ? 'EVM Network • Tether USD'
    : selectedWallet === 'multichain-btc'
    ? 'Bitcoin • Mainnet'
    : 'TON Network • W5 Multi-Chain';

  const handleCopy = () => {
    if (currentAddress) {
      navigator.clipboard.writeText(currentAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = () => {
    if (navigator.share && currentAddress) {
      const walletName = selectedWallet === 'primary' 
        ? 'TON Wallet' 
        : selectedWallet === 'primary-rzc'
        ? 'RZC Token'
        : selectedWallet === 'multichain-evm'
        ? 'EVM Wallet'
        : selectedWallet === 'multichain-usdt'
        ? 'USDT'
        : selectedWallet === 'multichain-btc'
        ? 'BTC'
        : 'TON W5 Wallet';
      navigator.share({
        title: `My ${walletName} Address`,
        text: `Send assets to my RhizaCore ${walletName}: ${currentAddress}`,
        url: window.location.href
      });
    }
  };

  const handleDownloadQR = () => {
    if (!currentAddress) return;
    
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
    const walletPrefix = selectedWallet === 'primary' ? 'ton' : selectedWallet === 'multichain-evm' ? 'evm' : 'ton-w5';
    downloadLink.download = `rhizacore-${walletPrefix}-${currentAddress.slice(0, 8)}.svg`;
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

      <div className="luxury-card p-5 sm:p-7 md:p-8 rounded-[2rem] sm:rounded-[2.5rem] flex flex-col items-center space-y-5 sm:space-y-6 md:space-y-7 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00FF88] to-transparent opacity-50" />
        
        {/* Wallet Selector - Semi-Compact Horizontal Tray */}
        <div className="w-full space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">Select Asset</span>
            {isMultiChainActive && (
              <span className="text-[8px] font-bold text-violet-500 py-0.5 px-2 bg-violet-500/10 rounded-full border border-violet-500/20 uppercase tracking-widest">Multi-Chain</span>
            )}
          </div>
          
          <div className="overflow-x-auto pb-2 hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex gap-2.5 min-w-max">
              {[
                { 
                  id: 'primary', 
                  name: 'TON', 
                  icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ton/info/logo.png',
                  isEmoji: false,
                  net: 'Native' 
                },
                { 
                  id: 'primary-rzc', 
                  name: 'RZC', 
                  icon: '⚡', 
                  isEmoji: true,
                  bg: 'bg-emerald-500/10',
                  color: 'text-[#00FF88]',
                  net: 'Community' 
                },
                ...(isMultiChainActive && multiChainAddresses ? [
                  { 
                    id: 'multichain-evm', 
                    name: 'EVM', 
                    icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
                    isEmoji: false,
                    net: 'ETH/Poly' 
                  },
                  { 
                    id: 'multichain-usdt', 
                    name: 'USDT', 
                    icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
                    isEmoji: false,
                    net: 'Tether' 
                  },
                  { 
                    id: 'multichain-btc', 
                    name: 'BTC', 
                    icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png',
                    isEmoji: false,
                    net: 'Bitcoin' 
                  },
                  { 
                    id: 'multichain-ton', 
                    name: 'W5', 
                    icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ton/info/logo.png',
                    isEmoji: false,
                    net: 'Multi-TON' 
                  }
                ] : [])
              ].map((asset) => (
                <motion.button
                  key={asset.id}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedWallet(asset.id as WalletType)}
                  className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 min-w-[85px] w-[85px] sm:w-[95px] sm:min-w-[95px] relative ${
                    selectedWallet === asset.id
                      ? 'bg-white/10 border-white/20'
                      : 'bg-white/5 border-white/5 opacity-40 hover:opacity-100'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center overflow-hidden ${
                    asset.isEmoji ? (asset.bg || 'bg-white/5') : 'bg-transparent'
                  }`}>
                    {asset.isEmoji ? (
                      <span className={`text-lg ${asset.color}`}>{asset.icon}</span>
                    ) : (
                      <img src={asset.icon} alt={asset.name} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="text-center">
                    <p className={`text-[11px] font-black tracking-tight leading-none ${
                        selectedWallet === asset.id ? 'text-white' : 'text-gray-400'
                    }`}>{asset.name}</p>
                    <p className="text-[7px] font-bold text-gray-500 uppercase tracking-tighter mt-0.5">{asset.net}</p>
                  </div>
                  {selectedWallet === asset.id && (
                    <motion.div 
                      layoutId="active-indicator"
                      className="absolute -bottom-1 w-1.5 h-1 bg-white rounded-full shadow-[0_0_8px_white]"
                    />
                  )}
                </motion.button>
              ))}

              {!isMultiChainActive && (
                <button
                  onClick={() => navigate('/wallet/multi-chain')}
                  className="p-3 rounded-2xl border-2 border-dashed border-violet-500/20 bg-violet-500/5 transition-all flex flex-col items-center justify-center gap-1.5 min-w-[85px] w-[85px] sm:w-[95px] sm:min-w-[95px] opacity-60 hover:opacity-100"
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center bg-violet-500/10 text-violet-400">
                    <Layers size={16} />
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] font-black text-violet-400 leading-none">HUB</p>
                    <p className="text-[7px] font-bold text-violet-500/50 uppercase tracking-tighter mt-0.5">Setup</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="text-center space-y-1.5 sm:space-y-2">
           <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
            {selectedWallet === 'primary' ? 'Native Vault Key' : selectedWallet === 'primary-rzc' ? 'RhizaCore Vault' : selectedWallet === 'multichain-evm' ? 'EVM Address' : selectedWallet === 'multichain-usdt' ? 'USDT Receiver' : selectedWallet === 'multichain-btc' ? 'BTC Address' : 'TON W5 Address'}
           </h2>
           <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em]">{currentNetwork}</p>
        </div>

        {/* QR Code Section with Professional Animations */}
        <div className="relative group min-h-[220px] sm:min-h-[250px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedWallet}
              initial={{ opacity: 0, scale: 0.95, filter: 'blur(8px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 1.05, filter: 'blur(8px)' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="relative flex flex-col items-center"
            >
              <div className={`absolute -inset-6 rounded-full blur-3xl transition-all duration-700 opacity-15 ${
                (selectedWallet === 'primary' || selectedWallet === 'primary-rzc')
                  ? 'bg-[#00FF88]'
                  : (selectedWallet === 'multichain-evm' || selectedWallet === 'multichain-usdt')
                  ? 'bg-blue-500'
                  : selectedWallet === 'multichain-btc'
                  ? 'bg-orange-500'
                  : 'bg-sky-500'
              }`} />
              
              <div className="qr-code-container w-48 h-48 sm:w-56 sm:h-56 bg-white p-3.5 sm:p-4 rounded-[2rem] relative shadow-2xl overflow-hidden flex items-center justify-center border-2 border-white/20">
                {currentAddress ? (
                  <QRCodeSVG
                    value={currentAddress}
                    size={window.innerWidth < 640 ? 160 : 192}
                    level="H"
                    includeMargin={false}
                    imageSettings={{
                      src: selectedWallet === 'primary-rzc'
                        ? "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2310b981'%3E%3Cpath d='M13 2L3 14h9l-1 8 10-12h-9l1-8z'/%3E%3C/svg%3E"
                        : selectedWallet === 'multichain-usdt'
                        ? "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png"
                        : selectedWallet === 'multichain-evm'
                        ? "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png"
                        : selectedWallet === 'multichain-btc'
                        ? "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png"
                        : "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ton/info/logo.png",
                      height: 40,
                      width: 40,
                      excavate: true,
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center text-gray-400">
                    <QrCode size={48} />
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="w-full space-y-3 sm:space-y-4">
          <div onClick={handleCopy} className="p-4 sm:p-5 bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl group cursor-pointer hover:border-[#00FF88]/40 transition-all active:scale-[0.98]">
             <div className="flex justify-between items-center mb-1">
                <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">
                  {selectedWallet === 'primary' ? 'Main Vault Address' : selectedWallet === 'primary-rzc' ? 'RZC Community Address' : (selectedWallet === 'multichain-evm' || selectedWallet === 'multichain-usdt') ? 'EVM Hub Address' : selectedWallet === 'multichain-btc' ? 'Bitcoin Mainnet Address' : 'TON W5 Address'}
                </span>
                {copied ? <Check size={14} className="text-[#00FF88]" /> : <Copy size={14} className="text-gray-500 group-hover:text-[#00FF88]" />}
             </div>
             <p className="text-[11px] sm:text-xs font-mono text-white break-all leading-relaxed">{currentAddress}</p>
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
            <p className="text-xs text-gray-500 leading-relaxed">
              {selectedWallet === 'primary' || selectedWallet === 'primary-rzc'
                ? 'Accepts TON and all Jetton assets (USDT, NOT, etc.) directly into your vault.'
                : selectedWallet === 'multichain-evm' || selectedWallet === 'multichain-usdt'
                ? 'Accepts ETH, USDT, and all ERC-20 tokens on Ethereum and Polygon networks.'
                : selectedWallet === 'multichain-btc'
                ? 'Accepts BTC on the Bitcoin mainnet. Use SegWit-compatible wallets for best fees.'
                : 'Accepts TON and Jetton assets via your Multi-Chain W5 wallet.'}
            </p>
         </div>
         <div className="p-5 sm:p-6 bg-white/5 border border-white/5 rounded-xl sm:rounded-2xl space-y-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
               <Info size={18} />
            </div>
            <h4 className="font-bold text-sm text-white">Security Tip</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              {selectedWallet === 'primary' || selectedWallet === 'primary-rzc'
                ? 'Always verify the network is TON before confirming large inbound transfers.'
                : (selectedWallet === 'multichain-evm' || selectedWallet === 'multichain-usdt')
                ? 'Verify you\'re sending on the correct EVM network (Ethereum or Polygon) before confirming.'
                : selectedWallet === 'multichain-btc'
                ? 'Ensure you are sending via the Bitcoin Mainnet. Minimum dusting limit is 294 sats.'
                : 'This is your Multi-Chain TON W5 address. Verify the network before large transfers.'}
            </p>
         </div>
      </div>
      
      <div className="text-center pt-2 sm:pt-4">
         <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest">Powered by Rhiza Node Protocol</p>
      </div>
    </div>
  );
};

export default Receive;
