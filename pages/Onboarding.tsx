
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PlusCircle, Key, Zap, ShieldCheck, ArrowLeft, CheckCircle2, Lock, Users, LogIn, ArrowRight, X, Sparkles, Wallet, Gift, TrendingUp } from 'lucide-react';
import { WalletManager } from '../utils/walletManager';

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const [hasWallets, setHasWallets] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Check if user has existing wallets
    const walletCount = WalletManager.getWalletCount();
    setHasWallets(walletCount > 0);

    // Check if this is first visit
    const hasVisited = localStorage.getItem('rhiza_has_visited');
    if (!hasVisited && walletCount === 0) {
      setShowWelcome(true);
      localStorage.setItem('rhiza_has_visited', 'true');
    }
  }, []);

  const welcomeSteps = [
    {
      icon: Wallet,
      title: "Welcome to RhizaCore",
      description: "Your gateway to decentralized finance on the TON blockchain. Create your wallet in under 2 minutes.",
      color: "from-[#00FF88]/20 to-[#00FF88]/5",
      iconBg: "bg-[#00FF88]/20",
      iconColor: "text-[#00FF88]"
    },
    {
      icon: Gift,
      title: "Get 50 RZC Welcome Bonus",
      description: "Start your journey with 50 RZC tokens instantly credited to your new wallet. No strings attached!",
      color: "from-yellow-500/20 to-yellow-500/5",
      iconBg: "bg-yellow-500/20",
      iconColor: "text-yellow-400"
    },
    {
      icon: Users,
      title: "Earn 25 RZC Per Referral",
      description: "Share your referral link and earn 25 RZC for every friend who joins. Plus milestone bonuses up to 5,000 RZC!",
      color: "from-purple-500/20 to-purple-500/5",
      iconBg: "bg-purple-500/20",
      iconColor: "text-purple-400"
    },
    {
      icon: ShieldCheck,
      title: "Your Keys, Your Control",
      description: "Non-custodial wallet with military-grade encryption. Only you have access to your funds. Always.",
      color: "from-blue-500/20 to-blue-500/5",
      iconBg: "bg-blue-500/20",
      iconColor: "text-blue-400"
    }
  ];

  const handleNextStep = () => {
    if (currentStep < welcomeSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowWelcome(false);
    }
  };

  const handleSkip = () => {
    setShowWelcome(false);
  };

  return (
    <>
      {/* First-Time Visitor Welcome Modal */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="relative w-full max-w-2xl">
            {/* Skip Button */}
            <button
              onClick={handleSkip}
              className="absolute -top-12 right-0 text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-bold"
            >
              <span>Skip</span>
              <X size={16} />
            </button>

            {/* Welcome Card */}
            <div className={`relative bg-gradient-to-br ${welcomeSteps[currentStep].color} border border-white/10 rounded-3xl p-8 md:p-12 animate-in slide-in-from-bottom-4 duration-500`}>
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 blur-3xl rounded-full" />

              {/* Content */}
              <div className="relative z-10 space-y-8">
                {/* Icon */}
                <div className={`w-20 h-20 ${welcomeSteps[currentStep].iconBg} rounded-2xl flex items-center justify-center mx-auto shadow-2xl`}>
                  {React.createElement(welcomeSteps[currentStep].icon, {
                    size: 40,
                    className: welcomeSteps[currentStep].iconColor
                  })}
                </div>

                {/* Text Content */}
                <div className="text-center space-y-4">
                  <h2 className="text-3xl md:text-4xl font-black text-white leading-tight">
                    {welcomeSteps[currentStep].title}
                  </h2>
                  <p className="text-lg text-gray-300 font-medium leading-relaxed max-w-xl mx-auto">
                    {welcomeSteps[currentStep].description}
                  </p>
                </div>

                {/* Progress Dots */}
                <div className="flex items-center justify-center gap-2">
                  {welcomeSteps.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentStep(index)}
                      className={`h-2 rounded-full transition-all ${
                        index === currentStep
                          ? 'w-8 bg-[#00FF88]'
                          : 'w-2 bg-white/20 hover:bg-white/40'
                      }`}
                    />
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-center gap-4">
                  {currentStep > 0 && (
                    <button
                      onClick={() => setCurrentStep(currentStep - 1)}
                      className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-black text-sm transition-all"
                    >
                      Back
                    </button>
                  )}
                  <button
                    onClick={handleNextStep}
                    className="px-8 py-3 bg-[#00FF88] hover:bg-[#00e67a] text-black rounded-xl font-black text-sm transition-all flex items-center gap-2 shadow-xl shadow-[#00FF88]/20"
                  >
                    {currentStep === welcomeSteps.length - 1 ? (
                      <>
                        Get Started
                        <Sparkles size={16} />
                      </>
                    ) : (
                      <>
                        Next
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>

                {/* Step Counter */}
                <div className="text-center">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Step {currentStep + 1} of {welcomeSteps.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Decorative Glow */}
            <div className={`absolute inset-0 ${welcomeSteps[currentStep].iconBg} blur-3xl opacity-20 rounded-3xl -z-10`} />
          </div>
        </div>
      )}

      {/* Main Onboarding Page */}
      <div className="fixed inset-0 bg-[#050505] flex flex-col overflow-y-auto animate-in fade-in duration-700">
        {/* Floating "New Here?" Button for returning visitors */}
        {!showWelcome && !hasWallets && (
          <button
            onClick={() => setShowWelcome(true)}
            className="fixed bottom-6 right-6 z-40 px-4 py-3 bg-[#00FF88] hover:bg-[#00e67a] text-black rounded-full font-black text-sm shadow-2xl shadow-[#00FF88]/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 animate-in slide-in-from-bottom-4 duration-700"
          >
            <Sparkles size={16} />
            <span>New Here? Take a Tour</span>
          </button>
        )}
        
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00FF88]/5 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00CCFF]/5 blur-[120px] rounded-full" />
        </div>

        {/* Back Button */}
        <div className="relative z-10 w-full max-w-6xl mx-auto p-6 pt-8">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-black text-sm uppercase tracking-wider">Back to Home</span>
          </Link>
        </div>

        <div className="relative z-10 w-full max-w-6xl mx-auto flex-1 flex items-center p-6 pb-24">
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
    </>
  );
};

export default Onboarding;
