
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Gift, 
  Share2, 
  Copy, 
  Check, 
  TrendingUp, 
  ChevronRight, 
  Award,
  Zap,
  Network,
  BarChart3,
  MessageSquare,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';

const Referral: React.FC = () => {
  const { address, referralStats, refreshData, isLoading } = useWallet();
  const [copied, setCopied] = useState(false);
  
  const referralCode = address ? address.slice(-8).toUpperCase() : 'RHIZA';
  const referralLink = `https://rhiza.core/invite/${referralCode}`;

  useEffect(() => {
    refreshData();
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareTelegram = () => {
    const text = encodeURIComponent(`Secure your TON assets with RhizaCore. Join my elite network and start earning passive TON rewards.\n\nInitialize access here: ${referralLink}`);
    window.open(`https://t.me/share/url?url=${referralLink}&text=${text}`, '_blank');
  };

  if (!referralStats) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
      <div className="w-10 h-10 border-2 border-[#00FF88] border-t-transparent rounded-full animate-spin" />
      <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Accessing Network Ledger...</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black text-white">Referral Terminal</h1>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
             <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
             <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">LIVE SYNC</span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-[#00FF88]/10 border border-[#00FF88]/20 rounded-full text-[#00FF88] text-[10px] font-black uppercase tracking-widest">
          <Award size={14} /> {referralStats.rank}
        </div>
      </div>

      {/* Rewards Overview & Rank Progress */}
      <div className="relative p-10 rounded-[3rem] bg-[#0a0a0a] border border-white/5 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#00FF88]/5 blur-[100px] rounded-full" />
        
        <div className="relative z-10 space-y-8">
          <div className="flex flex-col items-center text-center space-y-2">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Cumulative Earnings</p>
            <h2 className="text-6xl font-black tracking-tighter text-white">
              {referralStats.totalEarned.toFixed(2)} <span className="text-[#00FF88] text-2xl font-bold">TON</span>
            </h2>
          </div>

          <div className="space-y-3">
             <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
               <span className="text-gray-500">Next Tier: Supernode</span>
               <span className="text-[#00FF88]">{referralStats.nextRankProgress}%</span>
             </div>
             <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
               <div className="h-full bg-[#00FF88] shadow-[0_0_15px_rgba(0,255,136,0.5)] transition-all duration-1000" style={{ width: `${referralStats.nextRankProgress}%` }} />
             </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4">
            {referralStats.levels.map((lvl) => (
              <div key={lvl.level} className="text-center p-4 luxury-card rounded-2xl border-white/5">
                <p className="text-xs font-black text-[#00FF88] mb-1">{lvl.count}</p>
                <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest leading-none">Level {lvl.level}</p>
                <p className="text-[9px] text-white font-mono mt-2">{lvl.earned.toFixed(1)} TON</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Referral Link & Share Grid */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 pl-4">Network Activation</h3>
        <div className="flex flex-col gap-3">
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between group">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 shrink-0">
                <Share2 size={18} />
              </div>
              <span className="text-sm font-mono text-gray-300 truncate">{referralLink}</span>
            </div>
            <button 
              onClick={handleCopy}
              className={`px-6 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${copied ? 'bg-emerald-500/20 text-emerald-500' : 'bg-[#00FF88] text-black hover:scale-105 active:scale-95'}`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'COPIED' : 'COPY'}
            </button>
          </div>
          
          <button 
            onClick={handleShareTelegram}
            className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest text-[#00CCFF] hover:bg-white/10 transition-all"
          >
            <MessageSquare size={16} /> Broadcast to Telegram
          </button>
        </div>
      </div>

      {/* Live Network Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600">Recent Network Activity</h3>
          <button 
            onClick={() => refreshData()} 
            disabled={isLoading}
            className="flex items-center gap-2 text-[9px] font-black text-[#00FF88] uppercase tracking-widest disabled:opacity-50"
          >
            <RefreshCw size={10} className={isLoading ? 'animate-spin' : ''} /> Manual Refetch
          </button>
        </div>
        <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] overflow-hidden divide-y divide-white/5">
          {referralStats.recentInvites.map((ref, idx) => (
            <div key={idx} className="p-6 flex items-center justify-between hover:bg-white/5 transition-all group">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ref.level === 1 ? 'bg-[#00FF88]/10 text-[#00FF88]' : 'bg-white/5 text-gray-500'}`}>
                   {ref.level === 1 ? <Users size={18} /> : <Network size={18} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-xs text-white">{ref.address}</h4>
                    <span className="text-[8px] bg-white/5 px-1.5 py-0.5 rounded uppercase font-black tracking-tighter text-gray-500">Tier {ref.level}</span>
                  </div>
                  <p className="text-[10px] text-gray-600 font-bold mt-1">{ref.time}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="font-black text-xs text-[#00FF88]">{ref.reward}</div>
                <div className="flex items-center gap-1 justify-end mt-1">
                  <ShieldCheck size={10} className="text-emerald-500/50" />
                  <span className="text-[8px] text-gray-700 uppercase font-black tracking-widest">Verified</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Partner Footer */}
      <div className="p-8 rounded-[3rem] bg-gradient-to-tr from-[#00FF88]/10 to-transparent border border-[#00FF88]/20 flex flex-col md:flex-row items-center justify-between gap-6 group cursor-pointer hover:bg-[#00FF88]/15 transition-all">
        <div className="space-y-2 text-center md:text-left">
          <h4 className="font-black text-lg text-white">Institutional Partner Program</h4>
          <p className="text-xs text-gray-500 max-w-sm leading-relaxed font-medium">Have a large community? Apply for RhizaCore Pro to unlock 15% Level 1 commissions and custom domain white-labeling.</p>
        </div>
        <button className="px-8 py-3.5 bg-white text-black rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-[#00FF88] transition-all">
          Apply Now <ArrowUpRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default Referral;
