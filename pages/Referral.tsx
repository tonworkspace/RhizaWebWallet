
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  Activity,
  RefreshCw,
  Clock,
  Loader
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { supabaseService } from '../services/supabaseService';
import { useToast } from '../context/ToastContext';
import ClaimMissingRewards from '../components/ClaimMissingRewards';
import squadMiningService, { SquadMiningStats } from '../services/squadMiningService';

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
  const { t } = useTranslation();
  const { userProfile, referralData } = useWallet();
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [referredUsers, setReferredUsers] = useState<any[]>([]);
  const [upline, setUpline] = useState<any | null>(null);
  const [downline, setDownline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Squad Mining State
  const [squadStats, setSquadStats] = useState<SquadMiningStats | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimMessage, setClaimMessage] = useState<string>('');
  const [timeUntilClaim, setTimeUntilClaim] = useState<{
    hours: number;
    minutes: number;
    canClaim: boolean;
  }>({ hours: 0, minutes: 0, canClaim: true });

  useEffect(() => {
    loadReferralNetwork();
    loadSquadMiningData();
  }, [userProfile?.id]); // Only depend on user ID

  const loadReferralNetwork = async () => {
    if (!userProfile?.id) {
      console.log('⚠️ No user profile ID available');
      setLoading(false);
      return;
    }

    console.log('🔄 Loading referral network for user:', userProfile.id);
    setLoading(true);

    try {
      // Load upline (who referred me)
      const uplineResult = await supabaseService.getUpline(userProfile.id);
      console.log('📊 Upline result:', uplineResult);
      if (uplineResult.success && uplineResult.data) {
        setUpline(uplineResult.data);
      } else {
        setUpline(null);
      }

      // Load downline (who I referred)
      const downlineResult = await supabaseService.getDownline(userProfile.id);
      console.log('📊 Downline result:', downlineResult);
      if (downlineResult.success && downlineResult.data) {
        console.log('✅ Setting downline with', downlineResult.data.length, 'members');
        setDownline(downlineResult.data);
      } else {
        console.log('⚠️ No downline data or error:', downlineResult.error);
        setDownline([]);
      }

      // Also load referred users by code (for backward compatibility)
      if (referralData?.referral_code) {
        const result = await supabaseService.getReferredUsers(referralData.referral_code);
        console.log('📊 Referred users result:', result);
        if (result.success && result.data) {
          setReferredUsers(result.data);
        }
      }
    } catch (error) {
      console.error('❌ Error loading referral network:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSquadMiningData = async () => {
    if (!userProfile?.id) return;

    try {
      const stats = await squadMiningService.getSquadMiningStats(userProfile.id);
      setSquadStats(stats);
    } catch (error) {
      console.error('❌ Error loading squad mining data:', error);
    }
  };

  const updateTimeUntilClaim = () => {
    if (!squadStats?.last_claim_at) {
      setTimeUntilClaim({ hours: 0, minutes: 0, canClaim: true });
      return;
    }

    const result = squadMiningService.calculateTimeUntilNextClaim(squadStats.last_claim_at);
    setTimeUntilClaim({
      hours: result.hoursRemaining,
      minutes: result.minutesRemaining,
      canClaim: result.canClaim
    });
  };

  const claimSquadRewards = async () => {
    if (!userProfile?.id || !squadStats?.can_claim || isClaiming) return;

    setIsClaiming(true);
    setClaimMessage('');

    try {
      const transactionId = squadMiningService.generateTransactionId(userProfile.id);
      const result = await squadMiningService.claimSquadRewards(userProfile.id, transactionId);

      if (result.success) {
        setClaimMessage(`Successfully claimed ${result.reward_amount?.toLocaleString()} RZC from ${result.squad_size} squad members!`);
        showToast(`Claimed ${result.reward_amount?.toLocaleString()} RZC!`, 'success');
        
        // Reload data
        await loadSquadMiningData();
        await loadReferralNetwork();
      } else {
        setClaimMessage(result.error || 'Failed to claim rewards');
        showToast(result.error || 'Failed to claim rewards', 'error');
      }
    } catch (error) {
      console.error('Error claiming squad rewards:', error);
      setClaimMessage('Failed to claim rewards. Please try again.');
      showToast('Failed to claim rewards', 'error');
    } finally {
      setIsClaiming(false);
      setTimeout(() => setClaimMessage(''), 5000);
    }
  };

  // Update timer every minute
  useEffect(() => {
    updateTimeUntilClaim();
    const interval = setInterval(updateTimeUntilClaim, 60000);
    return () => clearInterval(interval);
  }, [squadStats?.last_claim_at]);

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
          <h1 className="text-2xl font-black text-gray-950 dark:text-white">{t('referral.title')}</h1>
          <p className="text-[10px] text-gray-600 dark:text-gray-500 font-semibold">{t('referral.inviteFriends')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadReferralNetwork}
            disabled={loading}
            className="p-2 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border-2 border-gray-300 dark:border-white/10 rounded-lg transition-all disabled:opacity-50 shadow-sm"
            title="Refresh"
          >
            <RefreshCw size={14} className={`text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-100 to-cyan-100 dark:from-[#00FF88]/20 dark:to-[#00CCFF]/20 border-2 border-emerald-300 dark:border-[#00FF88]/30 rounded-full shadow-sm">
            <Crown size={12} className="text-emerald-700 dark:text-[#00FF88]" />
            <span className="text-emerald-700 dark:text-[#00FF88] text-[10px] font-black uppercase tracking-wider">
              {referralData?.rank || 'Core Node'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Overview Grid */}
      <div className="grid grid-cols-3 gap-2">
        {/* RZC Balance */}
        <div className="col-span-3 p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-white dark:from-[#00FF88]/10 dark:via-[#00FF88]/5 dark:to-transparent border-2 border-emerald-200 dark:border-[#00FF88]/20 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-100 dark:bg-[#00FF88]/10 blur-[40px] rounded-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-200 dark:bg-[#00FF88]/20 flex items-center justify-center">
                <Gift size={16} className="text-emerald-700 dark:text-[#00FF88]" />
              </div>
              <span className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider">{t('referral.totalEarnings')}</span>
            </div>
            <h2 className="text-3xl font-black text-emerald-700 dark:text-[#00FF88] mb-1">
              {(userProfile as any).rzc_balance?.toLocaleString() || '0'}
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-400 font-bold">
              ≈ ${(((userProfile as any).rzc_balance || 0) * 0.10).toFixed(2)} USD
            </p>
          </div>
        </div>

        {/* Total Referrals */}
        <div className="p-3 rounded-xl bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <Users size={12} className="text-blue-400" />
            <span className="text-[9px] font-bold text-gray-600 dark:text-gray-500 uppercase tracking-wider">{t('referral.totalReferrals')}</span>
          </div>
          <p className="text-2xl font-black text-gray-950 dark:text-white">{loading ? '...' : referralData?.total_referrals || 0}</p>
        </div>

        {/* Active Rate */}
        <div className="p-3 rounded-xl bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity size={12} className="text-green-400" />
            <span className="text-[9px] font-bold text-gray-600 dark:text-gray-500 uppercase tracking-wider">Active</span>
          </div>
          <p className="text-2xl font-black text-gray-950 dark:text-white">
            {loading ? '...' : downline.length > 0 
              ? ((downline.filter(u => u.is_active).length / downline.length) * 100).toFixed(0) 
              : '0'}%
          </p>
        </div>

        {/* Rank Level */}
        <div className="p-3 rounded-xl bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <Star size={12} className="text-yellow-400" />
            <span className="text-[9px] font-bold text-gray-600 dark:text-gray-500 uppercase tracking-wider">Level</span>
          </div>
          <p className="text-2xl font-black text-gray-950 dark:text-white">{referralData?.level || 1}</p>
        </div>
      </div>

      {/* Share Link Card */}
      <div className="p-4 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-2xl space-y-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-200 dark:bg-[#00FF88]/20 flex items-center justify-center">
            <Share2 size={16} className="text-emerald-700 dark:text-[#00FF88]" />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-950 dark:text-white">{t('referral.yourCode')}</h3>
            <p className="text-[9px] text-gray-600 dark:text-gray-500 font-semibold">{t('referral.shareLink')}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-black/40 rounded-xl border-2 border-gray-300 dark:border-white/10 shadow-sm">
          <span className="text-[8px] font-mono text-gray-700 dark:text-gray-300 truncate flex-1 font-semibold">
            {loading ? t('common.loading') : referralLink}
          </span>
          <button 
            onClick={handleCopy}
            disabled={!referralData?.referral_code}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-1.5 shrink-0 shadow-sm ${
              copied 
                ? 'bg-emerald-200 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-500' 
                : referralData?.referral_code
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-[#00FF88] dark:text-black dark:hover:bg-[#00FF88]/90'
                  : 'bg-gray-300 dark:bg-gray-500/20 text-gray-500 dark:text-gray-500 cursor-not-allowed'
            }`}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'COPIED' : 'COPY'}
          </button>
        </div>
      </div>

      {/* Claim Missing Rewards */}
      {userProfile?.id && (
        <ClaimMissingRewards 
          userId={userProfile.id} 
          onClaimed={loadReferralNetwork}
        />
      )}

      {/* Squad Mining Claim Card */}
      <div className="hidden p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-white dark:from-[#00FF88]/10 dark:via-[#00FF88]/5 dark:to-transparent border-2 border-emerald-200 dark:border-[#00FF88]/20 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-100 dark:bg-[#00FF88]/10 blur-[40px] rounded-full" />
        
        <div className="relative z-10 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-200 dark:bg-[#00FF88]/20 flex items-center justify-center">
                <Zap size={16} className="text-emerald-700 dark:text-[#00FF88]" />
              </div>
              <div>
                <h3 className="text-sm font-black text-gray-950 dark:text-white">Squad Mining</h3>
                <p className="text-[9px] text-gray-600 dark:text-gray-500 font-semibold">Claim every 8 hours</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <Clock size={12} className="text-blue-600 dark:text-blue-400" />
              <span className="text-blue-600 dark:text-blue-400 font-mono font-bold">
                {timeUntilClaim.canClaim ? 'Ready!' : `${timeUntilClaim.hours}h ${timeUntilClaim.minutes}m`}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/10">
              <span className="text-[9px] text-gray-600 dark:text-gray-500 block font-bold">Squad Size</span>
              <span className="text-lg font-black text-gray-950 dark:text-white">{squadStats?.squad_size || 0}</span>
            </div>
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/10">
              <span className="text-[9px] text-gray-600 dark:text-gray-500 block font-bold">Per Claim</span>
              <span className="text-lg font-black text-emerald-700 dark:text-[#00FF88]">{squadStats?.potential_reward || 0}</span>
            </div>
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/10">
              <span className="text-[9px] text-gray-600 dark:text-gray-500 block font-bold">Total Earned</span>
              <span className="text-lg font-black text-purple-700 dark:text-purple-400">{squadStats?.total_rewards_earned || 0}</span>
            </div>
          </div>

          {/* Claim Button */}
          <button
            onClick={claimSquadRewards}
            disabled={!timeUntilClaim.canClaim || isClaiming || (squadStats?.squad_size || 0) === 0}
            className={`w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all shadow-sm ${
              timeUntilClaim.canClaim && (squadStats?.squad_size || 0) > 0 && !isClaiming
                ? 'bg-emerald-600 dark:bg-[#00FF88] text-white dark:text-black hover:bg-emerald-700 dark:hover:bg-[#00FF88]/90'
                : 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed'
            }`}
          >
            {isClaiming ? (
              <>
                <Loader className="animate-spin" size={16} />
                Claiming...
              </>
            ) : timeUntilClaim.canClaim ? (
              <>
                <Zap size={16} />
                Claim {squadStats?.potential_reward?.toLocaleString() || '0'} RZC
              </>
            ) : (
              <>
                <Clock size={16} />
                Next Claim in {timeUntilClaim.hours}h {timeUntilClaim.minutes}m
              </>
            )}
          </button>

          {/* Claim Message */}
          {claimMessage && (
            <div className={`text-xs p-2 rounded-lg text-center font-bold ${
              claimMessage.includes('Successfully') 
                ? 'bg-green-100 text-green-700 border border-green-300 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20' 
                : 'bg-red-100 text-red-700 border border-red-300 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
            }`}>
              {claimMessage}
            </div>
          )}

          {/* Info */}
          <p className="text-[10px] text-gray-700 dark:text-gray-500 text-center italic font-semibold">
            Earn 2 RZC per member every 8 hours. Premium members earn 5 RZC each!
          </p>
        </div>
      </div>

      {/* Network Structure */}
      <div className="space-y-3">
        <h3 className="text-sm font-black text-gray-950 dark:text-white px-1">Network Structure</h3>
        
        {/* Upline Section */}
        {upline && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <ArrowUp size={12} className="text-blue-400" />
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-600 dark:text-gray-500">Upline (Sponsor)</span>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-2 border-blue-500/20 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/30 to-blue-500/10 flex items-center justify-center text-xl shrink-0 border-2 border-blue-500/30">
                  {upline.avatar || '👤'}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-sm text-gray-950 dark:text-white truncate">
                    {upline.name || `User #${upline.wallet_address.slice(-4)}`}
                  </h4>
                  <p className="text-[10px] text-gray-600 dark:text-gray-400 font-semibold">
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
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-600 dark:text-gray-500">Downline (Your Team)</span>
            </div>
            <span className="text-[10px] font-black text-[#00FF88]">
              {loading ? '...' : downline.length} {downline.length === 1 ? 'Member' : 'Members'}
            </span>
          </div>
          
          <div className="rounded-xl bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 overflow-hidden shadow-sm">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-10 h-10 border-3 border-gray-300 dark:border-gray-700 border-t-[#00FF88] rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-xs text-gray-600 dark:text-gray-500 font-bold">Loading your network...</p>
              </div>
            ) : downline.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-3">
                  <Users size={28} className="text-gray-500 dark:text-gray-600" />
                </div>
                <p className="text-sm font-bold text-gray-950 dark:text-white mb-1">No team members yet</p>
                <p className="text-[10px] text-gray-600 dark:text-gray-500 mb-4 font-semibold">Share your link to start building your network</p>
                <button 
                  onClick={handleCopy}
                  className="px-4 py-2 bg-[#00FF88] text-black rounded-lg text-[11px] font-black hover:bg-[#00FF88]/90 transition-all shadow-sm"
                >
                  Copy Referral Link
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-white/5 max-h-[400px] overflow-y-auto">
                {downline.map((user, index) => {
                  const timeAgo = getTimeAgo(new Date(user.created_at));
                  return (
                    <div 
                      key={user.id} 
                      className="p-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00FF88]/20 to-[#00FF88]/5 flex items-center justify-center text-base shrink-0 border border-[#00FF88]/20">
                            {user.avatar || '👤'}
                          </div>
                          {user.is_active && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#00FF88] rounded-full border-2 border-white dark:border-black"></div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-[12px] text-gray-950 dark:text-white truncate">
                              {user.name || `User #${user.wallet_address.slice(-4)}`}
                            </h4>
                            {index === 0 && (
                              <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 text-[8px] font-black uppercase rounded">
                                Latest
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[9px] text-gray-600 dark:text-gray-500 font-semibold mt-0.5">
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
                          <div className="text-[9px] text-gray-600 dark:text-gray-500 font-bold">
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
        <h3 className="text-sm font-black text-gray-950 dark:text-white px-1">Earning Rewards</h3>
        <div className="grid gap-2">
          {[
            { 
              icon: Gift, 
              title: "Signup Bonus", 
              amount: "$5 (50 RZC)", 
              desc: "Per referral signup",
              color: "from-[#00FF88]/20 to-[#00FF88]/5",
              border: "border-[#00FF88]/20",
              iconBg: "bg-[#00FF88]/20",
              iconColor: "text-[#00FF88]"
            },
            { 
              icon: Award, 
              title: "Package Commission", 
              amount: "10% of Purchase", 
              desc: "When referral buys package",
              color: "from-yellow-500/20 to-yellow-500/5",
              border: "border-yellow-500/20",
              iconBg: "bg-yellow-500/20",
              iconColor: "text-yellow-400"
            },
            { 
              icon: TrendingUp, 
              title: "Team Sales Bonus", 
              amount: "1% Weekly", 
              desc: "From all team sales",
              color: "from-purple-500/20 to-purple-500/5",
              border: "border-purple-500/20",
              iconBg: "bg-purple-500/20",
              iconColor: "text-purple-400"
            },
          ].map((item, index) => (
            <div 
              key={index} 
              className={`p-3 rounded-xl bg-gradient-to-br ${item.color} border ${item.border} shadow-sm`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${item.iconBg} flex items-center justify-center shrink-0`}>
                  <item.icon size={18} className={item.iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-950 dark:text-white text-[11px] leading-tight">{item.title}</h4>
                  <p className="text-[9px] text-gray-700 dark:text-gray-400 leading-tight font-semibold">{item.desc}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] font-black text-gray-950 dark:text-white">{item.amount}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Creator Program CTA */}
      <div className="hidden p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-white dark:from-[#00FF88]/10 dark:via-[#00FF88]/5 dark:to-transparent border-2 border-emerald-200 dark:border-[#00FF88]/20 cursor-pointer hover:border-emerald-400 dark:hover:border-[#00FF88]/40 transition-all group shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 dark:bg-[#00FF88] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Crown size={22} className="text-white dark:text-black" />
            </div>
            <div>
              <h4 className="font-black text-sm text-gray-950 dark:text-white">Creator Program</h4>
              <p className="text-[10px] text-gray-700 dark:text-gray-400 font-semibold">Exclusive benefits for influencers</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-emerald-600 dark:text-[#00FF88] group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  );
};

export default Referral;
