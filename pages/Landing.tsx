
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Zap, 
  Shield, 
  Cpu, 
  Globe, 
  ArrowRight, 
  ChevronRight,
  ShieldCheck,
  BarChart3,
  MousePointer2,
  Lock
} from 'lucide-react';

const FeatureCard = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
  <div className="glass-card p-10 rounded-[2.5rem] group">
    <div className="w-14 h-14 bg-[#00FF88]/5 border border-[#00FF88]/20 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-[#00FF88]/10 transition-all duration-500">
      <Icon className="text-[#00FF88]" size={28} />
    </div>
    <h3 className="text-2xl font-black mb-4 tracking-tight-custom">{title}</h3>
    <p className="text-gray-400 leading-relaxed text-sm">{description}</p>
  </div>
);

const Landing: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Premium Header */}
      <nav className="flex items-center justify-between px-8 lg:px-24 py-10 sticky top-0 z-50 bg-[#020202]/60 backdrop-blur-2xl border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#00FF88] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(0,255,136,0.3)]">
            <Zap className="text-black fill-current" size={24} />
          </div>
          <span className="text-2xl font-black tracking-tight-custom">RhizaCore</span>
        </div>
        <div className="hidden lg:flex items-center gap-12 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
          <a href="#vision" className="hover:text-[#00FF88] transition-colors">Institutional Vision</a>
          <a href="#security" className="hover:text-[#00FF88] transition-colors">Security Core</a>
          <a href="#infrastructure" className="hover:text-[#00FF88] transition-colors">Infrastructure</a>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/onboarding" className="hidden sm:flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white hover:text-[#00FF88] transition-colors">
            Sign In
          </Link>
          <Link to="/onboarding" className="bg-white text-black px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#00FF88] transition-all flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95">
            Launch Terminal <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* Luxury Hero Section */}
      <section className="px-8 lg:px-24 pt-24 pb-32 relative text-center lg:text-left">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-10">
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/5 border border-white/10 text-[#00FF88] text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">
              <ShieldCheck size={14} /> Global Standard for TON Custody
            </div>
            <h1 className="text-6xl lg:text-8xl font-black leading-[1] tracking-tight-custom">
              Capital Efficiency <br />
              <span className="gradient-text">Redefined.</span>
            </h1>
            <p className="text-lg lg:text-xl text-gray-400 max-w-xl leading-relaxed">
              Experience the pinnacle of non-custodial asset management. RhizaCore provides institutional-grade infrastructure for the next generation of the Open Network.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Link to="/onboarding" className="w-full sm:w-auto px-12 py-5 bg-[#00FF88] text-black font-black text-sm uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-[0_0_30px_rgba(0,255,136,0.2)]">
                Create Secure Wallet
              </Link>
              <button className="w-full sm:w-auto px-12 py-5 bg-white/5 border border-white/10 text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all">
                The Rhiza Whitepaper
              </button>
            </div>
            <div className="flex items-center justify-center lg:justify-start gap-8 pt-8 opacity-40">
              <div className="flex items-center gap-2 font-black text-[10px] tracking-widest grayscale"><Lock size={14}/> AES-256</div>
              <div className="flex items-center gap-2 font-black text-[10px] tracking-widest grayscale"><Globe size={14}/> GLOBAL NODES</div>
              <div className="flex items-center gap-2 font-black text-[10px] tracking-widest grayscale"><Cpu size={14}/> GEMINI AI</div>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#00FF88]/20 to-transparent blur-[120px] rounded-full animate-pulse" />
            <div className="relative glass-card p-4 rounded-[3rem] border-white/10 shadow-2xl rotate-2">
               <div className="bg-[#020202] rounded-[2.5rem] overflow-hidden">
                 <img src="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&q=80&w=1200" alt="Interface" className="opacity-60 grayscale hover:grayscale-0 transition-all duration-1000" />
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="px-8 lg:px-24 py-32 bg-[#020202]/50">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mb-24 space-y-4">
             <h4 className="text-[#00FF88] text-xs font-black uppercase tracking-[0.4em]">Core Competencies</h4>
             <h2 className="text-5xl font-black tracking-tight-custom">Engineered for absolute <br /> precision and security.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={BarChart3} 
              title="Real-time Analytics" 
              description="Deep-trace transaction analysis and portfolio attribution models powered by proprietary TON indexers."
            />
            <FeatureCard 
              icon={Lock} 
              title="Vault Protocol" 
              description="Hardware-agnostic security layers combined with local biometric derivation for total asset sovereignty."
            />
            <FeatureCard 
              icon={MousePointer2} 
              title="Seamless DApps" 
              description="Our universal bridge allows instant interaction with every smart contract in the TON ecosystem."
            />
          </div>
        </div>
      </section>

      {/* Startup Traction */}
      <section className="px-8 lg:px-24 py-32 border-y border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full bg-[#00FF88]/5 rotate-12 translate-x-1/2 blur-[150px] pointer-events-none" />
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-16 relative z-10">
          {[
            { label: "Locked Value", value: "$4.1B+" },
            { label: "Verification Speed", value: "< 0.2s" },
            { label: "Nodes Operated", value: "1,240+" },
            { label: "User Retention", value: "98.4%" }
          ].map((stat, i) => (
            <div key={i} className="space-y-2">
              <div className="text-5xl lg:text-7xl font-black tracking-tighter text-white">{stat.value}</div>
              <div className="text-[#00FF88] text-[10px] font-black uppercase tracking-[0.3em]">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-8 lg:px-24 py-40 text-center">
        <div className="max-w-4xl mx-auto glass p-20 rounded-[4rem] border-white/10 space-y-10">
          <h2 className="text-4xl lg:text-6xl font-black tracking-tight-custom">Secure your stake in <br /> the future of TON.</h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Join thousands of professional traders and developers already using RhizaCore for their primary TON operations.
          </p>
          <Link to="/onboarding" className="inline-flex items-center gap-4 px-12 py-5 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-[#00FF88] transition-all shadow-2xl">
            Initialize Access <ChevronRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="px-8 lg:px-24 py-24 border-t border-white/5 bg-[#010101]">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-10">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <Zap className="text-black" size={18} />
              </div>
              <span className="text-lg font-black tracking-tight-custom">RhizaCore Labs</span>
           </div>
           <div className="flex gap-12 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
             <a href="#" className="hover:text-white transition-colors">Privacy</a>
             <a href="#" className="hover:text-white transition-colors">Legal</a>
             <a href="#" className="hover:text-white transition-colors">Compliance</a>
           </div>
           <div className="text-[10px] font-black text-gray-700 uppercase tracking-widest">
             © 2024 LUXURY CUSTODY SYSTEMS
           </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
