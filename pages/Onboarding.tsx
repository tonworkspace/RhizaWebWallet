
import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PlusCircle, Key, Zap, ShieldCheck, ArrowLeft, CheckCircle2, Lock, Users, LogIn } from 'lucide-react';
import { WalletManager } from '../utils/walletManager';

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const [hasWallets, setHasWallets] = React.useState(false);

  useEffect(() => {
    // Check if user has existing wallets
    const walletCount = WalletManager.getWalletCount();
    setHasWallets(walletCount > 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col p-6 animate-in fade-in duration-700">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00FF88]/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00CCFF]/5 blur-[120px] rounded-full" />
      </div>

      {/* Back Button */}
      <div className="relative z-10 w-full max-w-6xl mx-auto mb-8">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-black text-sm uppercase tracking-wider">Back to Home</span>
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto flex-1 flex items-center">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 w-full items-center">
          {/* Left Side - Information */}
          <div className="space-y-8 order-2 lg:order-1">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00FF88]/10 border border-[#00FF88]/20 text-[#00FF88] text-[10px] font-black uppercase tracking-widest">
                <ShieldCheck size={14} /> Non-Custodial Wallet
              </div>
              <h2 className="text-3xl lg:text-5xl font-black text-white leading-tight">
                Your Money, <br />
                <span className="text-[#00FF88]">Your Control.</span>
              </h2>
              <p className="text-gray-400 text-lg font-medium leading-relaxed">
                Create a secure wallet in under 2 minutes. No email, no ID, no middlemen. You hold the keys.
              </p>
            </div>

            {/* Key Features */}
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
                <div className="w-10 h-10 bg-[#00FF88]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Lock className="text-[#00FF88]" size={20} />
                </div>
                <div>
                  <h4 className="font-black text-white mb-1">Military-Grade Security</h4>
                  <p className="text-sm text-gray-400 font-medium">Your wallet is encrypted with the same technology that protects military communications.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
                <div className="w-10 h-10 bg-[#00CCFF]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Zap className="text-[#00CCFF]" size={20} />
                </div>
                <div>
                  <h4 className="font-black text-white mb-1">Instant Transactions</h4>
                  <p className="text-sm text-gray-400 font-medium">Send money anywhere in the world in under 5 seconds with fees under $0.01.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Users className="text-white" size={20} />
                </div>
                <div>
                  <h4 className="font-black text-white mb-1">Join 10,000+ Users</h4>
                  <p className="text-sm text-gray-400 font-medium">Be part of the growing RhizaCore community building the future of finance.</p>
                </div>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <div className="flex items-center gap-2 text-gray-500">
                <CheckCircle2 size={16} className="text-[#00FF88]" />
                <span className="text-xs font-bold uppercase tracking-wider">Audited by CertiK</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <CheckCircle2 size={16} className="text-[#00FF88]" />
                <span className="text-xs font-bold uppercase tracking-wider">TON Blockchain</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <CheckCircle2 size={16} className="text-[#00FF88]" />
                <span className="text-xs font-bold uppercase tracking-wider">Open Source</span>
              </div>
            </div>
          </div>

          {/* Right Side - Wallet Options */}
          <div className="space-y-8 order-1 lg:order-2">
            <div className="text-center lg:text-left space-y-4">
              <div className="w-20 h-20 bg-[#00FF88] rounded-3xl flex items-center justify-center mx-auto lg:mx-0 shadow-2xl shadow-[#00FF88]/20 rotate-3">
                <Zap className="text-black fill-current" size={40} />
              </div>
              <h1 className="text-4xl font-black tracking-tight text-white">Get Started</h1>
              <p className="text-gray-400 font-medium">Choose how you want to access RhizaCore</p>
            </div>

            <div className="space-y-4">
              {hasWallets && (
                <button 
                  onClick={() => navigate('/login')}
                  className="w-full p-6 bg-[#00FF88] hover:bg-[#00e67a] text-black rounded-3xl flex items-center gap-5 transition-all hover:scale-[1.02] active:scale-[0.98] group shadow-xl shadow-[#00FF88]/20"
                >
                  <div className="w-12 h-12 bg-black/10 rounded-2xl flex items-center justify-center">
                    <LogIn size={24} />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-black text-lg leading-none">Unlock Existing Wallet</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-70">Login to your wallet</div>
                  </div>
                  <div className="text-xs font-black uppercase tracking-wider opacity-50">Recommended</div>
                </button>
              )}

              <button 
                onClick={() => navigate('/create-wallet')}
                className={`w-full p-6 ${hasWallets ? 'bg-white/5 border border-white/10 hover:border-white/20 text-white' : 'bg-[#00FF88] hover:bg-[#00e67a] text-black shadow-xl shadow-[#00FF88]/20'} rounded-3xl flex items-center gap-5 transition-all hover:scale-[1.02] active:scale-[0.98] group`}
              >
                <div className={`w-12 h-12 ${hasWallets ? 'bg-white/5' : 'bg-black/10'} rounded-2xl flex items-center justify-center`}>
                  <PlusCircle size={24} className={hasWallets ? 'text-[#00FF88]' : ''} />
                </div>
                <div className="text-left flex-1">
                  <div className="font-black text-lg leading-none">Create New Wallet</div>
                  <div className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${hasWallets ? 'text-gray-500' : 'opacity-70'}`}>Generate 24-word phrase</div>
                </div>
                {!hasWallets && <div className="text-xs font-black uppercase tracking-wider opacity-50">Recommended</div>}
              </button>

              <button 
                onClick={() => navigate('/import-wallet')}
                className="w-full p-6 bg-white/5 border border-white/10 hover:border-white/20 text-white rounded-3xl flex items-center gap-5 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                  <Key size={24} className="text-[#00FF88]" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-black text-lg leading-none">Import Wallet</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest mt-1 text-gray-500">Restore using seed phrase</div>
                </div>
              </button>
            </div>

            {/* Security Notice */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
              <div className="flex items-start gap-3">
                <ShieldCheck size={20} className="text-[#00FF88] flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h5 className="font-black text-white text-sm">Your Keys, Your Crypto</h5>
                  <p className="text-xs text-gray-400 font-medium leading-relaxed">
                    RhizaCore never stores your private keys. You have complete control and ownership of your funds at all times.
                  </p>
                </div>
              </div>
            </div>

            {/* Help Link */}
            <div className="text-center">
              <Link 
                to="/whitepaper" 
                className="inline-flex items-center gap-2 text-gray-500 hover:text-[#00FF88] transition-colors text-sm font-bold"
              >
                <span>Need help? Read our guide</span>
                <ArrowLeft size={14} className="rotate-180" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
