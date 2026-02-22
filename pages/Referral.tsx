
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
  Zap
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { supabaseService } from '../services/supabaseService';
import { useToast } from '../context/ToastContext';

// Helper function to calculate time ago
const getTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
};

const Referral: React.FC = () => {
  const { userProfile, referralData } = useWallet();
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [referredUsers, setReferredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReferredUsers();
  }, [referralData]);

  const loadReferredUsers = async () => {
    if (!referralData?.referral_code) {
      setLoading(false);
      return;
    }

    const result = await supabaseService.getReferredUsers(referralData.referral_code);
    if (result.success && result.data) {
      setReferredUsers(result.data);
    }
    setLoading(false);
  };

  const referralLink = referralData?.referral_code 
    ? `${window.location.origin}/#/create-wallet?ref=${referralData.referral_code}`
    : "rhiza.core/invite/loading...";

  const handleCopy = () => {
    if (!referralData?.referral_code) return;
    
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    showToast('Referral link copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 px-3 sm:px-4 md:px-0">
      <div className="flex items-center justify-between">
        <h1 className="text-lg sm:text-xl font-black text-white">Referrals</h1>
        <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 bg-[#00FF88]/10 border border-[#00FF88]/20 rounded-full text-[#00FF88] text-[9px] font-black uppercase tracking-widest">
          <Award size={11} /> <span className="hidden sm:inline">Elite</span><span className="sm:hidden">Elite</span>
        </div>
      </div>

      {/* Rewards Overview - Compact */}
      <div className="relative p-5 sm:p-6 rounded-2xl sm:rounded-[2rem] bg-[#0a0a0a] border border-white/5 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 bg-[#00FF88]/5 blur-[60px] sm:blur-[80px] rounded-full" />
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-2.5 sm:space-y-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#00FF88]/10 flex items-center justify-center text-[#00FF88] mb-1">
            <Gift size={20} className="sm:hidden" />
            <Gift size={24} className="hidden sm:block" />
          </div>
          
          {/* RZC Balance Display - Compact */}
          {userProfile && (
            <div className="w-full space-y-2">
              <div>
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1.5">Your RZC Balance</p>
                <h2 className="text-3xl sm:text-5xl font-black tracking-tighter text-[#00FF88]">
                  {(userProfile as any).rzc_balance?.toLocaleString() || '0'}
                </h2>
                <p className="text-base sm:text-lg font-bold text-[#00FF88]/60 mt-0.5">RZC</p>
              </div>
              
              <div className="pt-2.5 border-t border-white/5">
                <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-0.5">Estimated Value</p>
                <p className="text-xl sm:text-2xl font-black text-white">
                  ${(((userProfile as any).rzc_balance || 0) * 0.10).toFixed(2)}
                  <span className="text-xs font-medium text-gray-500 ml-1.5">USD</span>
                </p>
                <p className="text-[8px] text-gray-600 mt-1">1 RZC = $0.10 USD</p>
              </div>
            </div>
          )}
          
          <div className="w-full pt-2.5 border-t border-white/5">
            <div className="flex gap-5 sm:gap-6 justify-center">
              <div className="text-center">
                <p className="text-lg sm:text-xl font-black text-white">{loading ? '...' : referralData?.total_referrals || 0}</p>
                <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mt-0.5">Referrals</p>
              </div>
              <div className="w-px h-8 sm:h-10 bg-white/5" />
              <div className="text-center">
                <p className="text-lg sm:text-xl font-black text-white">
                  {loading ? '...' : referredUsers.length > 0 
                    ? ((referredUsers.filter(u => u.is_active).length / referredUsers.length) * 100).toFixed(1) 
                    : '0.0'}%
                </p>
                <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mt-0.5">Active</p>
              </div>
            </div>
          </div>
          
          <div className="w-full pt-2.5 border-t border-white/5">
            <div className="p-3 bg-white/5 rounded-xl">
              <p className="text-[10px] text-gray-400 mb-2">Earn RZC by referring:</p>
              <div className="space-y-1.5 text-left">
                <div className="flex items-center justify-between text-[11px] sm:text-xs">
                  <span className="text-gray-500">Per Referral</span>
                  <span className="text-[#00FF88] font-bold">+50 RZC</span>
                </div>
                <div className="flex items-center justify-between text-[11px] sm:text-xs">
                  <span className="text-gray-500">10 Refs Bonus</span>
                  <span className="text-[#00FF88] font-bold">+500 RZC</span>
                </div>
                <div className="flex items-center justify-between text-[11px] sm:text-xs">
                  <span className="text-gray-500">50 Refs Bonus</span>
                  <span className="text-[#00FF88] font-bold">+2,500 RZC</span>
                </div>
                <div className="flex items-center justify-between text-[11px] sm:text-xs">
                  <span className="text-gray-500">100 Refs Bonus</span>
                  <span className="text-[#00FF88] font-bold">+10,000 RZC</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Referral Link Section - Compact */}
      <div className="space-y-3">
        <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600 pl-2">Your Invitation Link</h3>
        <div className="p-3 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-0 sm:justify-between group">
          <div className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 shrink-0">
              <Share2 size={16} />
            </div>
            <span className="text-[11px] sm:text-xs font-mono text-gray-300 truncate">
              {loading ? 'Loading...' : referralLink}
            </span>
          </div>
          <button 
            onClick={handleCopy}
            disabled={!referralData?.referral_code}
            className={`px-3.5 py-2 rounded-lg text-[10px] font-black transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
              copied 
                ? 'bg-emerald-500/20 text-emerald-500' 
                : referralData?.referral_code
                  ? 'bg-[#00FF88] text-black hover:scale-105'
                  : 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
            }`}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'COPIED' : 'COPY'}
          </button>
        </div>
      </div>

      {/* How it Works - Compact */}
      <div className="space-y-3">
        <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600 pl-2">How it Works</h3>
        <div className="grid gap-2.5">
          {[
            { step: 1, title: "Share Link", desc: "Invite friends using your unique link.", icon: Share2 },
            { step: 2, title: "They Join", desc: "Friends create wallet with your code.", icon: Zap },
            { step: 3, title: "Earn RZC", desc: "Get 50 RZC + milestone bonuses!", icon: Gift },
          ].map((item) => (
            <div key={item.step} className="p-3.5 sm:p-4 bg-[#0a0a0a] border border-white/5 rounded-xl sm:rounded-2xl flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/5 flex items-center justify-center text-[#00FF88] font-black text-sm sm:text-base border border-white/5 shrink-0">
                {item.step}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-white text-xs sm:text-sm">{item.title}</h4>
                <p className="text-[10px] sm:text-[11px] text-gray-500 leading-relaxed mt-0.5 truncate sm:whitespace-normal">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity - Compact */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600 pl-2">Recent Referrals</h3>
        </div>
        <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-5 sm:p-6 text-center text-gray-500">
              <p className="text-xs">Loading referrals...</p>
            </div>
          ) : referredUsers.length === 0 ? (
            <div className="p-5 sm:p-6 text-center text-gray-500">
              <Users size={28} className="mx-auto mb-2.5 opacity-50" />
              <p className="text-xs font-bold">No referrals yet</p>
              <p className="text-[10px] mt-1">Share your link to start earning!</p>
            </div>
          ) : (
            referredUsers.slice(0, 5).map((user, idx) => {
              const timeAgo = getTimeAgo(new Date(user.created_at));
              return (
                <div 
                  key={user.id} 
                  className={`p-3.5 sm:p-4 flex items-center justify-between hover:bg-white/5 transition-all cursor-pointer ${
                    idx < referredUsers.length - 1 && idx < 4 ? 'border-b border-white/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-500 text-sm shrink-0">
                      {user.avatar || '👤'}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-white truncate">
                        {user.name || `User #${user.wallet_address.slice(-4)}`}
                      </h4>
                      <p className="text-[9px] text-gray-600 font-bold">{timeAgo}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <div className="font-bold text-[11px] text-[#00FF88]">+50 RZC</div>
                    <div className="text-[9px] text-gray-600">$5.00</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* CTA Footer - Compact */}
      <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-[#00FF88]/10 to-transparent border border-[#00FF88]/20 flex items-center justify-between group cursor-pointer hover:bg-[#00FF88]/15 transition-all active:scale-[0.98]">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-[#00FF88] flex items-center justify-center text-black shrink-0">
            <TrendingUp size={18} />
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-xs text-white truncate">Creator Program</h4>
            <p className="text-[9px] text-gray-400 truncate">Higher caps for influencers</p>
          </div>
        </div>
        <ChevronRight size={16} className="text-[#00FF88] group-hover:translate-x-1 transition-transform hidden sm:block shrink-0" />
      </div>
    </div>
  );
};

export default Referral;
