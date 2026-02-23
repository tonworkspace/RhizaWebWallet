
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Zap, 
  ShieldCheck, 
  ArrowRight, 
  ChevronRight,
  BarChart3,
  Lock,
  Menu,
  X,
  Target,
  Layers,
  ShoppingBag,
  Heart,
  Store,
  UserCheck,
  Sun,
  Moon,
  Rocket,
  TrendingUp,
  Users,
  Briefcase,
  Globe,
  Twitter,
  Github,
  MessageCircle,
  ExternalLink,
  Mail,
  Gift,
  Repeat,
  Image
} from 'lucide-react';
import { RHIZA_TOKENOMICS, RHIZA_UTILITIES, RHIZA_BUSINESS_MODEL, RHIZA_OPPORTUNITIES, SOCIAL_LINKS } from '../constants';
import { useWallet } from '../context/WalletContext';
import { useToast } from '../context/ToastContext';
import TokenomicsChart from '../components/TokenomicsChart';
import TokenomicsCalculator from '../components/TokenomicsCalculator';
import { supabaseService } from '../services/supabaseService';
import { notificationService } from '../services/notificationService';

const FeatureCard: React.FC<{ icon: any, title: string, description: string }> = ({ icon: Icon, title, description }) => (
  <div className="glass p-8 rounded-[2rem] border-black/5 dark:border-white/5 group hover:border-primary/20 transition-all duration-500 hover:-translate-y-1">
    <div className="w-12 h-12 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-all duration-500">
      <Icon className="text-primary" size={24} />
    </div>
    <h3 className="text-xl font-black mb-3 tracking-tight-custom text-slate-900 dark:text-white">{title}</h3>
    <p className="text-slate-600 dark:text-gray-300 leading-relaxed text-sm font-medium">{description}</p>
  </div>
);

const UtilityCard: React.FC<{ icon: any, title: string, desc: string }> = ({ icon: Icon, title, desc }) => (
  <div className="p-6 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-3xl hover:bg-black/10 dark:hover:bg-white/10 transition-all cursor-default">
    <Icon className="text-secondary mb-4" size={28} />
    <h4 className="text-lg font-black text-slate-900 dark:text-white mb-2">{title}</h4>
    <p className="text-slate-600 dark:text-gray-300 text-sm font-medium leading-relaxed">{desc}</p>
  </div>
);

const TokenomicsItem: React.FC<{ data: typeof RHIZA_TOKENOMICS[0] }> = ({ data }) => (
  <div className="p-6 bg-black/5 dark:bg-white/5 rounded-3xl border border-black/5 dark:border-white/5 space-y-4 hover:bg-black/10 dark:hover:bg-white/10 transition-all">
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-gray-400">{data.label}</span>
      <span className="text-xl font-black text-slate-900 dark:text-white">{data.percentage}%</span>
    </div>
    <div className="w-full h-1.5 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
      <div 
        className="h-full rounded-full transition-all duration-1000" 
        style={{ width: `${data.percentage}%`, backgroundColor: data.color }}
      />
    </div>
    <p className="text-[11px] text-slate-600 dark:text-gray-300 font-medium leading-relaxed">{data.description}</p>
  </div>
);

const Landing: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const { theme, toggleTheme, isLoggedIn, userProfile, referralData } = useWallet();
  const { showToast } = useToast();

  // Scroll detection for navbar styling
  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      
      // Detect active section
      const sections = ['about', 'utility', 'business', 'tokenomics'];
      const current = sections.find(section => {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          return rect.top <= 150 && rect.bottom >= 150;
        }
        return false;
      });
      setActiveSection(current || '');
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getIcon = (name: string) => {
    switch(name) {
      case 'rocket': return <Rocket size={24} />;
      case 'trending-up': return <TrendingUp size={28} />;
      case 'users': return <Users size={28} />;
      case 'shopping-bag': return <ShoppingBag size={28} />;
      case 'store': return <Store size={28} />;
      case 'zap': return <Zap size={28} />;
      case 'repeat': return <Repeat size={28} />;
      case 'image': return <Image size={28} />;
      case 'layers': return <Layers size={28} />;
      case 'gift': return <Gift size={28} />;
      case 'shield-check': return <ShieldCheck size={28} />;
      default: return <Target size={24} />;
    }
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
    setMobileMenuOpen(false);
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newsletterEmail.trim()) {
      showToast('Please enter your email address', 'error');
      return;
    }

    setNewsletterLoading(true);

    try {
      // Subscribe to newsletter
      const result = await supabaseService.subscribeToNewsletter(
        newsletterEmail,
        {
          source: 'landing_page',
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      );

      if (result.success) {
        showToast(result.message, 'success');
        setNewsletterEmail(''); // Clear input on success

        // Track newsletter subscription activity
        if (isLoggedIn && userProfile) {
          await notificationService.logActivity(
            userProfile.wallet_address,
            'feature_used',
            'Subscribed to newsletter',
            {
              email: newsletterEmail,
              source: 'landing_page',
              timestamp: new Date().toISOString()
            }
          );
        }
      } else {
        showToast(result.message || 'Failed to subscribe', 'error');
      }
    } catch (error: any) {
      console.error('Newsletter subscription error:', error);
      showToast('An error occurred. Please try again.', 'error');
    } finally {
      setNewsletterLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative transition-colors duration-300">
      {/* Enhanced Interactive Header */}
      <nav className={`flex items-center justify-between px-6 lg:px-24 py-4 sticky top-0 z-[60] transition-all duration-500 ${
        scrolled 
          ? 'bg-white/95 dark:bg-black/95 backdrop-blur-3xl border-b border-slate-200 dark:border-primary/20 shadow-lg shadow-primary/5' 
          : 'bg-white/80 dark:bg-black/60 backdrop-blur-3xl border-b border-slate-200 dark:border-white/5'
      }`}>
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className={`w-9 h-9 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 ${
            scrolled ? 'shadow-primary/20' : ''
          }`}>
            <Zap className="fill-current" size={18} />
          </div>
          <span className="text-xl font-black tracking-tight-custom text-slate-900 dark:text-white transition-all group-hover:text-primary">RhizaCore</span>
        </div>

        {/* Enhanced Desktop Nav */}
        <div className="hidden lg:flex items-center gap-8 text-[10px] font-black uppercase tracking-[0.2em]">
          {[
            { id: 'about', label: 'VISION' },
            { id: 'utility', label: 'USAGE' },
            { id: 'business', label: 'MODEL' },
            { id: 'tokenomics', label: 'ECONOMY' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className={`relative px-3 py-2 rounded-lg transition-all duration-300 group ${
                activeSection === item.id
                  ? 'text-primary'
                  : 'text-slate-400 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {item.label}
              <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-primary transition-all duration-300 ${
                activeSection === item.id ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0 group-hover:opacity-50 group-hover:scale-x-100'
              }`} />
            </button>
          ))}
          <Link 
            to="/whitepaper"
            className="relative px-3 py-2 rounded-lg transition-all duration-300 group text-slate-400 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
          >
            DOCS
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary transition-all duration-300 opacity-0 scale-x-0 group-hover:opacity-50 group-hover:scale-x-100" />
          </Link>
          <button 
            onClick={toggleTheme} 
            className="p-2.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all duration-300 hover:scale-110 hover:rotate-12 relative group"
          >
            {theme === 'dark' ? (
              <Sun size={18} className="transition-transform group-hover:rotate-180 duration-500" />
            ) : (
              <Moon size={18} className="transition-transform group-hover:-rotate-12 duration-500" />
            )}
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[8px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap uppercase">
              {theme === 'dark' ? 'LIGHT' : 'DARK'}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <Link 
            to="/onboarding" 
            className="bg-primary text-black px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest hover:brightness-110 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 sm:gap-2 shadow-xl shadow-primary/20 group"
          >
            <span className="hidden sm:inline">Open Wallet</span>
            <span className="sm:hidden">Wallet</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="lg:hidden p-2.5 bg-black/5 dark:bg-white/5 rounded-xl text-slate-900 dark:text-white hover:scale-110 active:scale-95 transition-all"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Enhanced Mobile Menu Overlay */}
      <div className={`fixed inset-0 z-[55] bg-white/98 dark:bg-black/98 backdrop-blur-3xl lg:hidden transition-all duration-500 flex flex-col items-center justify-center p-10 gap-8 ${
        mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        {[
          { id: 'about', label: 'How it Works' },
          { id: 'utility', label: 'The Marketplace' },
          { id: 'business', label: 'Business Model' },
          { id: 'tokenomics', label: 'Token Economy' }
        ].map((item, idx) => (
          <button
            key={item.id}
            onClick={() => scrollToSection(item.id)}
            className="text-3xl font-black text-slate-900 dark:text-white hover:text-primary transition-all hover:scale-110 uppercase"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            {item.label}
          </button>
        ))}
        <Link
          to="/whitepaper"
          className="text-3xl font-black text-slate-900 dark:text-white hover:text-primary transition-all hover:scale-110 uppercase"
          style={{ animationDelay: '200ms' }}
        >
          Whitepaper
        </Link>
        <button 
          onClick={() => { toggleTheme(); setMobileMenuOpen(false); }} 
          className="text-xl font-black text-slate-500 dark:text-gray-400 hover:text-primary flex items-center gap-2 transition-all hover:scale-110 uppercase"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />} 
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>
        <Link 
          to="/onboarding" 
          className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-black text-sm uppercase tracking-widest text-center shadow-2xl hover:scale-105 active:scale-95 transition-all"
        >
          Launch App
        </Link>
      </div>

      {/* Hero Section */}
      <section className="px-6 lg:px-24 pt-16 lg:pt-32 pb-24 relative overflow-hidden">
        {/* Profile Greeting for Logged-in Users */}
        {isLoggedIn && userProfile && (
          <div className="max-w-7xl mx-auto mb-8">
            <div className="flex items-center gap-3 p-3 sm:p-4 bg-gradient-to-r from-[#00FF88]/10 to-[#00CCFF]/10 border border-[#00FF88]/20 rounded-xl sm:rounded-2xl">
              <div className="text-2xl sm:text-3xl">{userProfile.avatar}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs text-gray-500">Welcome back,</p>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">{userProfile.name}</h1>
                {referralData && (
                  <p className="text-[9px] sm:text-[10px] text-[#00FF88] font-mono mt-0.5">
                    {referralData.rank} • {referralData.total_referrals} Refs
                  </p>
                )}
              </div>
              {/* RZC Balance Badge - Compact */}
              <div className="text-right">
                <div className="flex items-center gap-1.5 justify-end mb-0.5">
                  <p className="text-[8px] sm:text-[9px] text-gray-500 uppercase tracking-wider font-bold">RZC</p>
                  <div className="px-1.5 py-0.5 bg-[#00FF88]/10 border border-[#00FF88]/20 rounded text-[8px] font-black text-[#00FF88]">
                    $0.10
                  </div>
                </div>
                <p className="text-lg sm:text-xl font-black text-[#00FF88]">
                  {(userProfile as any).rzc_balance?.toLocaleString() || '0'}
                </p>
                <p className="text-[8px] sm:text-[9px] text-gray-600 font-bold">
                  ≈ ${(((userProfile as any).rzc_balance || 0) * 0.10).toFixed(2)}
                </p>
              </div>
              {/* Quick Access to Wallet */}
              <Link 
                to="/wallet/dashboard"
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all"
              >
                <Zap size={14} />
                Wallet
              </Link>
            </div>
          </div>
        )}
        
        <div className="max-w-7xl mx-auto text-center lg:text-left grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-primary text-[10px] font-black uppercase tracking-widest transition-colors">
              <UserCheck size={14} /> Built for Everyone
            </div>
            <h1 className="text-5xl lg:text-8xl font-black leading-[1.05] tracking-tight-custom text-slate-900 dark:text-white">
              Money That <br />
              <span className="luxury-gradient-text">Works for You.</span>
            </h1>
            <p className="text-lg lg:text-xl text-slate-600 dark:text-gray-300 max-w-xl leading-relaxed mx-auto lg:mx-0 font-medium">
              A digital wallet where you can shop, save, and send money anywhere in the world. You control it completely—no banks, no middlemen.
            </p>
            <p className="text-sm text-slate-500 dark:text-gray-400 max-w-xl mx-auto lg:mx-0">
              <span className="font-bold text-slate-700 dark:text-gray-300">For experts:</span> Non-custodial commerce protocol on TON with institutional-grade infrastructure.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link to="/onboarding" className="w-full sm:w-auto px-12 py-5 bg-primary text-black font-black text-xs uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-lg">
                Start Your Journey
              </Link>
              <Link to="/whitepaper" className="w-full sm:w-auto px-10 py-5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 transition-all">
                Read Whitepaper
              </Link>
            </div>
          </div>
          <div className="hidden lg:block relative">
             <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent blur-3xl rounded-full animate-pulse" />
             <div className="relative glass p-6 rounded-[3rem] border-slate-200 dark:border-white/10 shadow-2xl rotate-3">
                <div className="bg-slate-50 dark:bg-[#050505] rounded-[2.5rem] p-8 border border-slate-100 dark:border-white/5 space-y-6">
                   <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-600 dark:text-gray-400 uppercase">Your $RZC Balance</span>
                      <Zap size={20} className="text-primary" />
                   </div>
                   <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">50,000.00 <span className="text-lg text-slate-500 dark:text-gray-400">RZC</span></h3>
                   <div className="h-24 w-full bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-center">
                      <p className="text-[10px] text-slate-600 dark:text-gray-400 font-bold uppercase tracking-widest">Global Rewards Active</p>
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-center">
                         <ShoppingBag size={18} className="mx-auto text-secondary mb-2" />
                         <span className="text-[9px] font-black text-slate-600 dark:text-gray-400 uppercase">Shop</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-primary text-black text-center shadow-lg">
                         <Target size={18} className="mx-auto mb-2" />
                         <span className="text-[9px] font-black uppercase">Earn</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Simplified "How it Works" */}
      <section id="about" className="px-6 lg:px-24 py-24 bg-black/[0.02] dark:bg-white/[0.02] border-y border-slate-200 dark:border-white/5 transition-colors">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20 space-y-4">
             <h4 className="text-primary text-[10px] font-black uppercase tracking-widest">Three Simple Steps</h4>
             <h2 className="text-3xl lg:text-5xl font-black text-slate-900 dark:text-white">Get Started in Minutes</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Create Your Wallet", desc: "Make a secret password (like a super-secure lock). Only you know it. No email, no ID needed.", technical: "Generate a non-custodial wallet with BIP39 mnemonic phrase." },
              { step: "02", title: "Get Some $RZC", desc: "Buy $RZC coins with your credit card, or swap other crypto you already have.", technical: "On-ramp via fiat gateway or DEX integration for token acquisition." },
              { step: "03", title: "Start Using It", desc: "Shop at stores, send to friends, or save it to earn more. Your money, your choice.", technical: "Utilize $RZC for P2P transfers, merchant payments, or yield-generating staking." }
            ].map((item, idx) => (
              <div key={idx} className="p-10 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-[2.5rem] relative overflow-hidden group shadow-sm">
                 <span className="absolute -top-6 -right-2 text-8xl font-black text-slate-100 dark:text-white/5 group-hover:text-primary/10 transition-colors">{item.step}</span>
                 <h4 className="text-xl font-black text-slate-900 dark:text-white mb-4 relative z-10">{item.title}</h4>
                 <p className="text-slate-600 dark:text-gray-300 text-sm font-medium leading-relaxed relative z-10">{item.desc}</p>
                 <p className="text-xs text-slate-500 dark:text-gray-400 mt-3 relative z-10 italic">{item.technical}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Utility Section */}
      <section id="utility" className="px-6 lg:px-24 py-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
             <div className="inline-flex items-center gap-2 text-secondary text-[10px] font-black uppercase tracking-[0.4em]">
                <Store size={14} /> Commerce & Web3
             </div>
             <h2 className="text-4xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight">
               What Can You Do With $RZC?
             </h2>
             <p className="text-lg text-slate-600 dark:text-gray-300 leading-relaxed font-medium max-w-3xl mx-auto">
                From everyday transactions to advanced DeFi—$RZC powers a complete commerce and Web3 ecosystem.
             </p>
             <p className="text-sm text-slate-500 dark:text-gray-400 italic max-w-2xl mx-auto">
                Technical: Multi-utility token with merchant payment rails, P2P marketplace, cross-chain interoperability, and DeFi integration.
             </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
             {RHIZA_UTILITIES.map((util, idx) => (
               <div key={idx} className="p-5 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-2xl hover:border-secondary/30 dark:hover:border-secondary/30 transition-all cursor-default group shadow-sm">
                 <div className="text-secondary mb-3 group-hover:scale-110 transition-transform">
                   {getIcon(util.icon)}
                 </div>
                 <h4 className="text-base font-black text-slate-900 dark:text-white mb-2">{util.title}</h4>
                 <p className="text-slate-600 dark:text-gray-300 text-xs font-medium leading-relaxed mb-2">{util.desc}</p>
                 <p className="text-[9px] text-slate-500 dark:text-gray-400 leading-relaxed italic">{util.technical}</p>
               </div>
             ))}
          </div>

          <div className="text-center">
            <Link to="/whitepaper" className="inline-flex items-center gap-3 text-primary font-black uppercase tracking-widest text-xs group hover:gap-4 transition-all">
               View Full Whitepaper <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Business Model & Opportunities Matrix */}
      <section id="business" className="px-6 lg:px-24 py-32 bg-slate-900/5 dark:bg-white/[0.02] border-y border-slate-200 dark:border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24 space-y-4">
             <h4 className="text-secondary text-[10px] font-black uppercase tracking-widest">How We Make Money</h4>
             <h2 className="text-4xl lg:text-6xl font-black text-slate-900 dark:text-white">Built to Last</h2>
             <p className="text-slate-600 dark:text-gray-300 max-w-2xl mx-auto text-base lg:text-lg font-medium">
               RhizaCore makes money in simple, fair ways. This keeps the platform running and growing for everyone.
             </p>
             <p className="text-xs text-slate-500 dark:text-gray-400 max-w-xl mx-auto italic">
               Technical: Multi-layered revenue model creating sustainable circular economy dynamics.
             </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 mb-24">
             {RHIZA_BUSINESS_MODEL.map((model, idx) => (
               <div key={idx} className="p-8 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-[2.5rem] shadow-sm hover:border-secondary/30 transition-all group">
                  <div className="flex items-center justify-between mb-6">
                    <Briefcase className="text-secondary" size={24} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-secondary bg-secondary/10 px-3 py-1 rounded-full">{model.metric}</span>
                  </div>
                  <h4 className="text-xl font-black text-slate-900 dark:text-white mb-4">{model.title}</h4>
                  <p className="text-slate-600 dark:text-gray-300 text-sm font-medium leading-relaxed mb-3">{model.desc}</p>
                  <p className="text-xs text-slate-500 dark:text-gray-400 italic leading-relaxed">{model.technical}</p>
               </div>
             ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
             <div className="space-y-8">
               <h2 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight">What's In It <br /><span className="text-primary">For You?</span></h2>
               <p className="text-lg text-slate-600 dark:text-gray-300 font-medium">
                 Using RhizaCore isn't just about having a wallet. You get real benefits that grow over time.
               </p>
               <div className="flex items-center gap-4 p-5 bg-primary/10 border border-primary/20 rounded-[2rem]">
                  <Globe className="text-primary" size={32} />
                  <div>
                    <h5 className="font-black text-sm text-slate-900 dark:text-white">Send Money Anywhere</h5>
                    <p className="text-xs text-slate-600 dark:text-gray-300 font-medium">Send $RZC to 190+ countries instantly. No bank fees, no waiting days, no currency exchange costs.</p>
                    <p className="text-[10px] text-slate-500 dark:text-gray-400 mt-1 italic">Cross-border arbitrage with instant settlement infrastructure.</p>
                  </div>
               </div>
             </div>

             <div className="grid gap-4">
                {RHIZA_OPPORTUNITIES.map((opp, idx) => (
                  <div key={idx} className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-3xl flex items-start gap-6 hover:translate-x-2 transition-transform cursor-default group">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-all">
                      {getIcon(opp.icon)}
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-primary">{opp.tag}</span>
                      <h4 className="font-black text-lg text-slate-900 dark:text-white mb-1">{opp.title}</h4>
                      <p className="text-sm text-slate-600 dark:text-gray-300 leading-relaxed font-medium mb-2">{opp.desc}</p>
                      <p className="text-[10px] text-slate-500 dark:text-gray-400 leading-relaxed italic">{opp.technical}</p>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </section>

      {/* Tokenomics - Economy Section */}
      <section id="tokenomics" className="px-6 lg:px-24 py-24">
        <div className="max-w-7xl mx-auto">
           <div className="text-center space-y-4 mb-16">
              <div className="inline-flex items-center gap-2 text-[#00FF88] text-[10px] font-black uppercase tracking-[0.4em]">
                <Layers size={14} /> 60/40 Structure
              </div>
              <h2 className="text-4xl lg:text-6xl font-black text-slate-900 dark:text-white">How $RZC Coins Work</h2>
              <p className="text-slate-600 dark:text-gray-300 max-w-2xl mx-auto text-base lg:text-lg font-medium">
                We use a 60/40 tokenomic structure to heavily reward early community members while securing capital for long-term development.
              </p>
              <p className="text-xs text-slate-500 dark:text-gray-400 max-w-xl mx-auto italic">
                Technical: Deflationary tokenomics with Proof of Activity mining, vesting schedules, and 0.05% burn mechanism.
              </p>
           </div>

           <div className="grid lg:grid-cols-2 gap-12 items-start mb-16">
             <div className="p-8 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-[2.5rem] space-y-6 relative overflow-hidden group shadow-sm">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#00FF88]/5 blur-[60px] rounded-full" />
                <div className="relative z-10 flex items-center gap-4">
                   <div className="w-12 h-12 bg-[#00FF88] text-black rounded-2xl flex items-center justify-center">
                      <Target size={24} />
                   </div>
                   <div>
                      <h4 className="font-black text-xl text-slate-900 dark:text-white">Fixed Supply</h4>
                      <p className="text-[10px] text-slate-600 dark:text-gray-400 font-black uppercase tracking-widest">No New Tokens Ever Created</p>
                   </div>
                </div>
                <div className="space-y-3">
                   <div className="flex items-center justify-between text-[11px] font-black text-slate-600 dark:text-gray-300 uppercase tracking-widest border-b border-slate-100 dark:border-white/5 pb-2">
                      <span>Token Utility</span>
                   </div>
                   <ul className="grid sm:grid-cols-2 gap-3">
                     <li className="flex items-center gap-3 text-sm font-bold text-slate-600 dark:text-gray-300">
                       <div className="w-1.5 h-1.5 rounded-full bg-[#00FF88]" /> Merchant Payments
                     </li>
                     <li className="flex items-center gap-3 text-sm font-bold text-slate-600 dark:text-gray-300">
                       <div className="w-1.5 h-1.5 rounded-full bg-[#00FF88]" /> P2P Marketplace
                     </li>
                     <li className="flex items-center gap-3 text-sm font-bold text-slate-600 dark:text-gray-300">
                       <div className="w-1.5 h-1.5 rounded-full bg-[#00FF88]" /> Daily Transactions
                     </li>
                     <li className="flex items-center gap-3 text-sm font-bold text-slate-600 dark:text-gray-300">
                       <div className="w-1.5 h-1.5 rounded-full bg-[#00FF88]" /> Staking Rewards
                     </li>
                     <li className="flex items-center gap-3 text-sm font-bold text-slate-600 dark:text-gray-300">
                       <div className="w-1.5 h-1.5 rounded-full bg-[#00FF88]" /> Cross-Chain Swaps
                     </li>
                     <li className="flex items-center gap-3 text-sm font-bold text-slate-600 dark:text-gray-300">
                       <div className="w-1.5 h-1.5 rounded-full bg-[#00FF88]" /> NFT Trading
                     </li>
                     <li className="flex items-center gap-3 text-sm font-bold text-slate-600 dark:text-gray-300">
                       <div className="w-1.5 h-1.5 rounded-full bg-[#00FF88]" /> DAO Governance
                     </li>
                     <li className="flex items-center gap-3 text-sm font-bold text-slate-600 dark:text-gray-300">
                       <div className="w-1.5 h-1.5 rounded-full bg-[#00FF88]" /> DeFi Access
                     </li>
                   </ul>
                </div>
             </div>
             <div className="grid sm:grid-cols-2 gap-3">
               {RHIZA_TOKENOMICS.map((item, idx) => (
                 <TokenomicsItem key={idx} data={item} />
               ))}
             </div>
           </div>

           {/* Tokenomics Chart */}
           <div className="mb-16">
             <div className="text-center mb-8">
               <h3 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white mb-3">
                 Token Distribution Breakdown
               </h3>
               <p className="text-slate-500 dark:text-gray-400 text-sm">
                 Visual representation of our 60/40 tokenomic structure
               </p>
             </div>
             <div className="max-w-4xl mx-auto p-6 lg:p-10 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-[2.5rem] shadow-sm">
               <TokenomicsChart />
             </div>
           </div>

           {/* ROI Calculator */}
           <div>
             <div className="text-center mb-8">
               <h3 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white mb-3">
                 Calculate Your Returns
               </h3>
               <p className="text-slate-500 dark:text-gray-400 text-sm">
                 Estimate your potential earnings with our interactive calculator
               </p>
             </div>
             <div className="max-w-4xl mx-auto p-6 lg:p-10 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-[2.5rem] shadow-sm">
               <TokenomicsCalculator />
             </div>
           </div>
        </div>
      </section>

      {/* Final Professional Business CTA */}
      <section className="px-6 lg:px-24 py-40">
        <div className="max-w-6xl mx-auto glass p-10 lg:p-20 rounded-[3rem] lg:rounded-[5rem] border-slate-200 dark:border-white/10 shadow-3xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
          
          <div className="relative z-10 text-center space-y-12">
            <div className="space-y-6">
              <h2 className="text-4xl lg:text-8xl font-black text-slate-900 dark:text-white leading-tight tracking-tight-custom">
                Join the <br /><span className="luxury-gradient-text">Global Economy.</span>
              </h2>
              <p className="text-slate-500 dark:text-gray-400 text-lg lg:text-xl max-w-2xl mx-auto font-medium">
                Whether you are a merchant looking to expand globally or a user seeking total financial sovereignty, RhizaCore is your protocol.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <Link to="/onboarding" className="group p-8 bg-slate-900 dark:bg-white text-white dark:text-black rounded-[2.5rem] text-left space-y-4 hover:scale-105 transition-all shadow-2xl">
                 <div className="w-12 h-12 rounded-2xl bg-white/10 dark:bg-black/5 flex items-center justify-center">
                    <UserCheck size={28} />
                 </div>
                 <div>
                    <h4 className="text-xl font-black uppercase tracking-tight">Personal Access</h4>
                    <p className="text-xs opacity-60 font-bold uppercase tracking-widest">Initialize Your Private Vault</p>
                 </div>
                 <div className="pt-4 flex items-center justify-between border-t border-white/10 dark:border-black/5">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Start Now</span>
                    <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                 </div>
              </Link>

              <button className="group p-8 bg-white dark:bg-black/40 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-[2.5rem] text-left space-y-4 hover:bg-primary hover:text-black hover:border-primary transition-all shadow-xl">
                 <div className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/10 flex items-center justify-center group-hover:bg-black/10">
                    <Store size={28} />
                 </div>
                 <div>
                    <h4 className="text-xl font-black uppercase tracking-tight">Merchant Portal</h4>
                    <p className="text-xs opacity-60 font-bold uppercase tracking-widest">Launch Your Global Storefront</p>
                 </div>
                 <div className="pt-4 flex items-center justify-between border-t border-black/5 dark:border-white/10 group-hover:border-black/20">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Request Access</span>
                    <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                 </div>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* DETAILED PROFESSIONAL FOOTER */}
      <footer className="bg-white dark:bg-[#010101] border-t border-slate-200 dark:border-white/5 pt-24 pb-12 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 lg:px-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 mb-24">
            
            {/* Column 1: Brand & Identity */}
            <div className="lg:col-span-2 space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl flex items-center justify-center shadow-lg">
                  <Zap className="fill-current" size={20} />
                </div>
                <span className="text-2xl font-black tracking-tight-custom text-slate-900 dark:text-white">RhizaCore</span>
              </div>
              <p className="text-slate-500 dark:text-gray-400 text-sm font-medium leading-relaxed max-w-sm">
                The definitive institutional-grade commerce protocol on The Open Network. Built for merchants, designed for sovereignty.
              </p>
              
              {/* Newsletter */}
              <div className="space-y-4 pt-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-gray-400 flex items-center gap-2">
                  <Mail size={14} /> Join the Intelligence
                </h4>
                <form onSubmit={handleNewsletterSubmit} className="flex max-w-sm relative group">
                  <input 
                    type="email" 
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Enter terminal email..." 
                    disabled={newsletterLoading}
                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-5 py-3 text-xs outline-none focus:border-primary/50 transition-all font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                  />
                  <button 
                    type="submit"
                    disabled={newsletterLoading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-primary text-black rounded-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {newsletterLoading ? (
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ArrowRight size={14} />
                    )}
                  </button>
                </form>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-primary">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                  All Systems Operational
                </div>
                <span className="text-slate-400 dark:text-gray-500">v1.0.4-LXC</span>
              </div>
            </div>

            {/* Column 2: Product */}
            <div className="space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Product</h4>
              <ul className="space-y-4">
                <li><Link to="/onboarding" className="text-sm text-slate-500 dark:text-gray-400 hover:text-primary transition-colors font-medium">Dashboard</Link></li>
                <li><a href="#utility" className="text-sm text-slate-500 dark:text-gray-400 hover:text-primary transition-colors font-medium">Marketplace</a></li>
                <li><a href="#" className="text-sm text-slate-500 dark:text-gray-400 hover:text-primary transition-colors font-medium">Launchpad</a></li>
                <li><Link to="/wallet/referral" className="text-sm text-slate-500 dark:text-gray-400 hover:text-primary transition-colors font-medium">Referral Portal</Link></li>
              </ul>
            </div>

            {/* Column 3: Ecosystem */}
            <div className="space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Ecosystem</h4>
              <ul className="space-y-4">
                <li><Link to="/marketplace" className="text-sm text-slate-500 dark:text-gray-400 hover:text-primary transition-colors font-medium">Product Marketplace</Link></li>
                <li><Link to="/launchpad" className="text-sm text-slate-500 dark:text-gray-400 hover:text-primary transition-colors font-medium">Launchpad</Link></li>
                <li><Link to="/referral" className="text-sm text-slate-500 dark:text-gray-400 hover:text-primary transition-colors font-medium">Referral Portal</Link></li>
                <li><Link to="/merchant-api" className="text-sm text-slate-500 dark:text-gray-400 hover:text-primary transition-colors font-medium">Merchant API</Link></li>
                <li><Link to="/developers" className="text-sm text-slate-500 dark:text-gray-400 hover:text-primary transition-colors font-medium">Developer Hub</Link></li>
                <li><Link to="/staking" className="text-sm text-slate-500 dark:text-gray-400 hover:text-primary transition-colors font-medium">Staking Engine</Link></li>
                <li><Link to="/whitepaper" className="text-sm text-slate-500 dark:text-gray-400 hover:text-primary transition-colors font-medium">Whitepaper <ExternalLink size={10} className="inline ml-1" /></Link></li>
              </ul>
            </div>

            {/* Column 4: Resources */}
            <div className="space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Resources</h4>
              <ul className="space-y-4">
                <li><Link to="/guide" className="text-sm text-slate-500 dark:text-gray-400 hover:text-primary transition-colors font-medium">User Guide</Link></li>
                <li><Link to="/help" className="text-sm text-slate-500 dark:text-gray-400 hover:text-primary transition-colors font-medium">Help Center</Link></li>
                <li><Link to="/faq" className="text-sm text-slate-500 dark:text-gray-400 hover:text-primary transition-colors font-medium">FAQ</Link></li>
                <li><Link to="/tutorials" className="text-sm text-slate-500 dark:text-gray-400 hover:text-primary transition-colors font-medium">Video Tutorials</Link></li>
              </ul>
            </div>

            {/* Column 5: Legal */}
            <div className="space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Governance</h4>
              <ul className="space-y-4">
                <li><Link to="/privacy" className="text-sm text-slate-500 dark:text-gray-400 hover:text-primary transition-colors font-medium">Privacy Policy</Link></li>
                <li><Link to="/terms" className="text-sm text-slate-500 dark:text-gray-400 hover:text-primary transition-colors font-medium">Terms of Service</Link></li>
                <li><Link to="/security" className="text-sm text-slate-500 dark:text-gray-400 hover:text-primary transition-colors font-medium">Security Audit</Link></li>
                <li><Link to="/compliance" className="text-sm text-slate-500 dark:text-gray-400 hover:text-primary transition-colors font-medium">Compliance</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-12 border-t border-slate-200 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-[10px] font-black text-slate-500 dark:text-gray-400 uppercase tracking-[0.3em] text-center md:text-left">
              © 2024 RhizaCore Labs • Powering the future of TON commerce
            </div>
            
            {/* Official Social Links */}
            <div className="flex items-center gap-4">
              {SOCIAL_LINKS.map((social) => (
                <a 
                  key={social.name}
                  href={social.url} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-gray-400 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all group"
                  title={social.label}
                >
                  {social.icon === 'telegram' && (
                    <svg className="w-[18px] h-[18px] group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                    </svg>
                  )}
                  {social.icon === 'facebook' && (
                    <svg className="w-[18px] h-[18px] group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  )}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-4 text-[10px] font-black text-slate-500 dark:text-gray-400 uppercase tracking-widest">
              <span className="flex items-center gap-2"><div className="w-1 h-1 bg-slate-400 dark:bg-gray-500 rounded-full" /> TON MAINNET</span>
              <span className="flex items-center gap-2"><div className="w-1 h-1 bg-slate-400 dark:bg-gray-500 rounded-full" /> SECURE PROTOCOL</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
