
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
  Crown,
  Star,
  ArrowUp,
  ArrowDown,
  Activity
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
  const [upline, setUpline] = useState<any | null>(null);
  const [downline, setDownline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReferralNetwork();
  }, [referralData, userProfile]);

  const loadReferralNetwork = async () => {
    if (!userProfile?.id) {
      setLoading(false);
      return;
    }

    // Load upline (who referred me)
    const uplineResult = await supabaseService.getUpline(userProfile.id);
    if (uplineResult.success && uplineResult.data) {
      setUpline(uplineResult.data);
    }

    // Load downline (who I referred)
    const downlineResult = await supabaseService.getDownline(userProfile.id);
    if (downlineResult.success && downlineResult.data) {
      setDownline(downlineResult.data);
    }

    // Also load referred users by code (for backward compatibility)
    if (referralData?.referral_code) {
      const result = await supabaseService.getReferredUsers(referralData.referral_code);
      if (result.success && result.data) {
        setReferredUsers(result.data);
      }
    }

    setLoading(false);
  };

  const referralLink = referralData?.referral_code 
    ? `${window.location.origin}/#/join?ref=${referralData.referral_code}`
    : "Loading...";

  const handleCopy = () => {
    if (!referralData?.referral_code) return;
    
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    showToast('Referral link copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16 px-3">
      {/* Enhanced Header with Rank Badge */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Referral Network</h1>
          <p className="text-[10px] text-gray-500 font-medium">Build your team and earn rewards</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#00FF88]/20 to-[#00CCFF]/20 border border-[#00FF88]/30 rounded-full">
          <Crown size={12} className="text-[#00FF88]" />
          <span className="text-[#00FF88] text-[10px] font-black uppercase tracking-wider">
            {referralData?.rank || 'Core Node'}
          </span>
        </div>
      </div>

      {/* Stats Overview Grid */}
      <div className="grid grid-cols-3 gap-2">
        {/* RZC Balance */}
        <div className="col-span-3 p-4 rounded-2xl bg-gradient-to-br from-[#00FF88]/10 via-[#00FF88]/5 to-transparent border border-[#00FF88]/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#00FF88]/10 blur-[40px] rounded-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#00FF88]/20 flex items-center justify-center">
                <Gift size={16} className="text-[#00FF88]" />
              </div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Total RZC Earned</span>
            </div>
            <h2 className="text-3xl font-black text-[#00FF88] mb-1">
              {(userProfile as any).rzc_balance?.toLocaleString() || '0'}
            </h2>
            <p className="text-sm text-gray-400 font-bold">
              ≈ ${(((userProfile as any).rzc_balance || 0) * 0.10).toFixed(2)} USD
            </p>
          </div>
        </div>

        {/* Total Referrals */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-1.5 mb-1">
            <Users size={12} className="text-blue-400" />
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Referrals</span>
          </div>
          <p className="text-2xl font-black text-white">{loading ? '...' : referralData?.total_referrals || 0}</p>
        </div>

        {/* Active Rate */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity size={12} className="text-green-400" />
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Active</span>
          </div>
          <p className="text-2xl font-black text-white">
            {loading ? '...' : downline.length > 0 
              ? ((downline.filter(u => u.is_active).length / downline.length) * 100).toFixed(0) 
              : '0'}%
          </p>
        </div>

        {/* Rank Level */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-1.5 mb-1">
            <Star size={12} className="text-yellow-400" />
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Level</span>
          </div>
          <p className="text-2xl font-black text-white">{referralData?.level || 1}</p>
        </div>
      </div>

      {/* Share Link Card */}
      <div className="p-4 bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-2xl space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#00FF88]/20 flex items-center justify-center">
            <Share2 size={16} className="text-[#00FF88]" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">Your Referral Link</h3>
            <p className="text-[9px] text-gray-500">Share to earn 50 RZC per signup</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 p-3 bg-black/40 rounded-xl border border-white/10">
          <span className="text-[11px] font-mono text-gray-300 truncate flex-1">
            {loading ? 'Loading...' : referralLink}
          </span>
          <button 
            onClick={handleCopy}
            disabled={!referralData?.referral_code}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-1.5 shrink-0 ${
              copied 
                ? 'bg-emerald-500/20 text-emerald-500' 
                : referralData?.referral_code
                  ? 'bg-[#00FF88] text-black hover:bg-[#00FF88]/90'
                  : 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
            }`}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'COPIED' : 'COPY'}
          </button>
        </div>
      </div>

      {/* Network Structure */}
      <div className="space-y-3">
        <h3 className="text-sm font-black text-white px-1">Network Structure</h3>
        
        {/* Upline Section */}
        {upline && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <ArrowUp size={12} className="text-blue-400" />
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Upline (Sponsor)</span>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/30 to-blue-500/10 flex items-center justify-center text-xl shrink-0 border-2 border-blue-500/30">
                  {upline.avatar || '👤'}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-sm text-white truncate">
                    {upline.name || `User #${upline.wallet_address.slice(-4)}`}
                  </h4>
                  <p className="text-[10px] text-gray-400 font-medium">
                    {upline.wallet_address.slice(0, 8)}...{upline.wallet_address.slice(-6)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="px-2 py-1 bg-blue-500/20 rounded-lg">
                    <span className="text-[9px] font-black text-blue-400 uppercase">Sponsor</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Downline Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <ArrowDown size={12} className="text-[#00FF88]" />
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Downline (Your Team)</span>
            </div>
            <span className="text-[10px] font-black text-[#00FF88]">
              {loading ? '...' : downline.length} {downline.length === 1 ? 'Member' : 'Members'}
            </span>
          </div>
          
          <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-10 h-10 border-3 border-gray-700 border-t-[#00FF88] rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-xs text-gray-500 font-bold">Loading your network...</p>
              </div>
            ) : downline.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                  <Users size={28} className="text-gray-600" />
                </div>
                <p className="text-sm font-bold text-white mb-1">No team members yet</p>
                <p className="text-[10px] text-gray-500 mb-4">Share your link to start building your network</p>
                <button 
                  onClick={handleCopy}
                  className="px-4 py-2 bg-[#00FF88] text-black rounded-lg text-[11px] font-black hover:bg-[#00FF88]/90 transition-all"
                >
                  Copy Referral Link
                </button>
              </div>
            ) : (
              <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
                {downline.map((user, index) => {
                  const timeAgo = getTimeAgo(new Date(user.created_at));
                  return (
                    <div 
                      key={user.id} 
                      className="p-3 hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00FF88]/20 to-[#00FF88]/5 flex items-center justify-center text-base shrink-0 border border-[#00FF88]/20">
                            {user.avatar || '👤'}
                          </div>
                          {user.is_active && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#00FF88] rounded-full border-2 border-black"></div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-[12px] text-white truncate">
                              {user.name || `User #${user.wallet_address.slice(-4)}`}
                            </h4>
                            {index === 0 && (
                              <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 text-[8px] font-black uppercase rounded">
                                Latest
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[9px] text-gray-500 font-medium mt-0.5">
                            <span>{timeAgo}</span>
                            {user.total_referrals > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-[#00FF88]">{user.total_referrals} refs</span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right shrink-0">
                          <div className={`text-[11px] font-black ${user.is_active ? 'text-[#00FF88]' : 'text-gray-500'}`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </div>
                          <div className="text-[9px] text-gray-500 font-bold">
                            {user.rzc_balance?.toLocaleString() || '0'} RZC
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rewards Info */}
      <div className="space-y-2">
        <h3 className="text-sm font-black text-white px-1">Earning Rewards</h3>
        <div className="grid gap-2">
          {[
            { 
              icon: Gift, 
              title: "Signup Bonus", 
              amount: "50 RZC", 
              desc: "Per referral signup",
              color: "from-[#00FF88]/20 to-[#00FF88]/5",
              border: "border-[#00FF88]/20",
              iconBg: "bg-[#00FF88]/20",
              iconColor: "text-[#00FF88]"
            },
            { 
              icon: Award, 
              title: "Milestone Bonus", 
              amount: "Up to 10,000 RZC", 
              desc: "At 10, 50, 100 referrals",
              color: "from-yellow-500/20 to-yellow-500/5",
              border: "border-yellow-500/20",
              iconBg: "bg-yellow-500/20",
              iconColor: "text-yellow-400"
            },
            { 
              icon: TrendingUp, 
              title: "Rank Upgrade", 
              amount: "Higher Commissions", 
              desc: "Earn more as you grow",
              color: "from-purple-500/20 to-purple-500/5",
              border: "border-purple-500/20",
              iconBg: "bg-purple-500/20",
              iconColor: "text-purple-400"
            },
          ].map((item, index) => (
            <div 
              key={index} 
              className={`p-3 rounded-xl bg-gradient-to-br ${item.color} border ${item.border}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${item.iconBg} flex items-center justify-center shrink-0`}>
                  <item.icon size={18} className={item.iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-white text-[11px] leading-tight">{item.title}</h4>
                  <p className="text-[9px] text-gray-400 leading-tight">{item.desc}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] font-black text-white">{item.amount}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Creator Program CTA */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-[#00FF88]/10 via-[#00FF88]/5 to-transparent border border-[#00FF88]/20 cursor-pointer hover:border-[#00FF88]/40 transition-all group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#00FF88] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Crown size={22} className="text-black" />
            </div>
            <div>
              <h4 className="font-black text-sm text-white">Creator Program</h4>
              <p className="text-[10px] text-gray-400">Exclusive benefits for influencers</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-[#00FF88] group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  );
};

export default Referral;
