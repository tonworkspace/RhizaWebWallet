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
  Activity,
  RefreshCw,
  Clock,
  Loader,
  Settings,
  Target,
  Rocket,
  Trophy,
  Sparkles,
  ChevronDown,
  ExternalLink,
  ShieldCheck,
  Flame,
  Lock,
  CircleDot,
  BarChart3,
  Coins,
  ArrowDownLeft,
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { useBalance } from '../hooks/useBalance';
import { supabaseService } from '../services/supabaseService';
import { notificationService } from '../services/notificationService';
import { getNetworkConfig } from '../constants';
import { useToast } from '../context/ToastContext';
import ClaimMissingRewards from '../components/ClaimMissingRewards';
import ReferralSystemTest from '../components/ReferralSystemTest';
import squadMiningService, { SquadMiningStats } from '../services/squadMiningService';
import { rzcToUsd } from '../config/rzcConfig';
import { RANKS, buildQuests } from '../config/referralQuests';
import AffiliateQuests from '../components/AffiliateQuests';

const getTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

// ─── Earnings Tab ─────────────────────────────────────────────────────────────
type EarningsTab = 'overview' | 'rzc' | 'ton';

const Referral: React.FC = () => {
  const { t } = useTranslation();
  const { userProfile, referralData, address, network } = useWallet();
  const { tonPrice } = useBalance();
  const { showToast } = useToast();

  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [downline, setDownline] = useState<any[]>([]);
  const [upline, setUpline] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [earningsTab, setEarningsTab] = useState<EarningsTab>('overview');
  const [expandedRank, setExpandedRank] = useState<number | null>(null);
  const [showAllTeam, setShowAllTeam] = useState(false);

  const [squadStats, setSquadStats] = useState<SquadMiningStats | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [timeUntilClaim, setTimeUntilClaim] = useState({ hours: 0, minutes: 0, canClaim: true });

  const [tonEarnings, setTonEarnings] = useState<{
    pending_ton: number; paid_ton: number; total_ton: number; pending_count: number;
  } | null>(null);

  const [rzcCommissions, setRzcCommissions] = useState<{
    total_rzc: number; count: number;
    items: Array<{ commission_rzc: number; package_name?: string; created_at: string }>;
  } | null>(null);

  const [tonEarningItems, setTonEarningItems] = useState<any[]>([]);
  const [loadingTonItems, setLoadingTonItems] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<'commission' | 'team'>('commission');

  useEffect(() => {
    loadAll();
  }, [userProfile?.id]);

  const loadAll = () => {
    loadReferralNetwork();
    loadSquadMiningData();
    loadTonEarnings();
    loadRzcCommissions();
  };

  const loadReferralNetwork = async () => {
    if (!userProfile?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const [uplineRes, downlineRes] = await Promise.all([
        supabaseService.getUpline(userProfile.id),
        supabaseService.getDownline(userProfile.id),
      ]);
      setUpline(uplineRes.success && uplineRes.data ? uplineRes.data : null);
      setDownline(downlineRes.success && downlineRes.data ? downlineRes.data : []);
    } catch (e) {
      console.error('Failed to load referral network:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadSquadMiningData = async () => {
    if (!userProfile?.id) return;
    try {
      const stats = await squadMiningService.getSquadMiningStats(userProfile.id);
      setSquadStats(stats);
    } catch (e) { /* silent */ }
  };

  const loadTonEarnings = async () => {
    if (!userProfile?.id || !address) return;
    setLoadingTonItems(true);
    try {
      const client = supabaseService.getClient();

      // 1. Try DB summary first (may be empty if commissions are on-chain only)
      let dbSummary: { pending_ton: number; paid_ton: number; total_ton: number; pending_count: number } | null = null;
      if (client) {
        const { data, error } = await client.rpc('get_referrer_ton_earnings', { p_referrer_id: userProfile.id });
        if (!error && data?.length > 0) dbSummary = data[0];
      }

      // 2. Fetch on-chain TON transactions and filter for referral commissions
      const config = getNetworkConfig(network);
      const tonApiEndpoint = network === 'mainnet'
        ? 'https://tonapi.io/v2'
        : 'https://testnet.tonapi.io/v2';

      const res = await fetch(
        `${tonApiEndpoint}/blockchain/accounts/${address}/transactions?limit=100`,
        { headers: { 'Authorization': `Bearer ${config.TONAPI_KEY}` } }
      );

      const onChainItems: Array<{ amount: number; created_at: string; referred_user_id?: string }> = [];

      if (res.ok) {
        const json = await res.json();
        for (const tx of json.transactions ?? []) {
          // Only incoming transactions
          if (!tx.in_msg || !(tx.in_msg.value > 0)) continue;

          const comment: string =
            tx.in_msg?.decoded_body?.text ||
            tx.out_msgs?.[0]?.decoded_body?.text || '';

          // Match variations of Referral Commission
          if (/referral|commission/i.test(comment)) {
            onChainItems.push({
              amount: Number(tx.in_msg.value) / 1e9,
              created_at: new Date(tx.utime * 1000).toISOString(),
              referred_user_id: undefined, // fallback
            });
          }
        }
      }

      // 3. Also load DB earning items
      let dbItems: any[] = [];
      if (client) {
        const itemsRes = await supabaseService.getReferralEarnings(userProfile.id);
        if (itemsRes.success && itemsRes.data) dbItems = itemsRes.data;
      }

      // 4. Merge items: Display DB items for pending status, but prepend on-chain paid items
      const mergedItems = [...onChainItems, ...dbItems].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      // Deduplicate by time/amount if needed, but simple append is safe for display limit
      setTonEarningItems(mergedItems);

      // 5. Build summary from on-chain data and DB
      const onChainTotal = onChainItems.reduce((s, i) => s + i.amount, 0);
      
      let finalSummary = {
        pending_ton: dbSummary?.pending_ton ? Number(dbSummary.pending_ton) : 0,
        paid_ton: dbSummary?.paid_ton ? Number(dbSummary.paid_ton) : 0,
        total_ton: dbSummary?.total_ton ? Number(dbSummary.total_ton) : 0,
        pending_count: dbSummary?.pending_count ? Number(dbSummary.pending_count) : 0,
      };

      // Always merge on-chain paid amounts into the total
      if (onChainTotal > finalSummary.paid_ton) {
        finalSummary.paid_ton = onChainTotal;
        finalSummary.total_ton = finalSummary.pending_ton + finalSummary.paid_ton;
      }

      setTonEarnings(finalSummary);
    } catch (e) {
      console.error('Failed to load TON earnings:', e);
    } finally {
      setLoadingTonItems(false);
    }
  };

  const loadRzcCommissions = async () => {
    if (!address || !userProfile?.id) return;
    try {
      const client = supabaseService.getClient();
      let txItems: any[] = [];
      
      if (client) {
        const { data: rows } = await client.from('rzc_transactions')
          .select('*')
          .eq('user_id', userProfile.id)
          .order('created_at', { ascending: false });
          
        if (rows) {
          const txCommissions = rows.filter(r => /referral|commission/i.test(r.description || ''));
          txItems = txCommissions.map(r => ({
            commission_rzc: Math.abs(Number(r.amount)),
            package_name: r.description || 'Commission',
            created_at: r.created_at
          }));
        }
      }

      let actItems: any[] = [];
      const res = await notificationService.getUserActivity(address, { limit: 200 });
      if (res.success && res.activities) {
        const commissions = res.activities.filter(
          (act: any) => act.metadata?.type === 'referral_commission' && act.metadata?.commission_rzc
        );
        actItems = commissions.map((a: any) => ({
          commission_rzc: Number(a.metadata.commission_rzc),
          package_name: a.metadata.package_name,
          created_at: a.created_at,
        }));
      }

      // Merge and deduplicate by time + amount string to avoid duplicate records from events and transactions
      const map = new Map<string, any>();
      [...txItems, ...actItems].forEach(item => {
        // use an approximate time key (rounded to 10 seconds) to catch slight DB-to-event delays
        const timeKey = Math.floor(new Date(item.created_at).getTime() / 10000);
        map.set(`${item.commission_rzc}-${timeKey}`, item);
      });

      const mergedItems = Array.from(map.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setRzcCommissions({
        total_rzc: mergedItems.reduce((s: number, a: any) => s + a.commission_rzc, 0),
        count: mergedItems.length,
        items: mergedItems,
      });
    } catch (e) { /* silent */ }
  };

  useEffect(() => {
    const update = () => {
      if (!squadStats?.last_claim_at) { setTimeUntilClaim({ hours: 0, minutes: 0, canClaim: true }); return; }
      const r = squadMiningService.calculateTimeUntilNextClaim(squadStats.last_claim_at);
      setTimeUntilClaim({ hours: r.hoursRemaining, minutes: r.minutesRemaining, canClaim: r.canClaim });
    };
    update();
    const i = setInterval(update, 60000);
    return () => clearInterval(i);
  }, [squadStats?.last_claim_at]);

  const claimSquadRewards = async () => {
    if (!userProfile?.id || !squadStats?.can_claim || isClaiming) return;
    setIsClaiming(true);
    try {
      const txId = squadMiningService.generateTransactionId(userProfile.id);
      const result = await squadMiningService.claimSquadRewards(userProfile.id, txId);
      if (result.success) {
        showToast(`Claimed ${result.reward_amount?.toLocaleString()} RZC!`, 'success');
        await loadSquadMiningData();
      } else {
        showToast(result.error || 'Failed to claim', 'error');
      }
    } finally {
      setIsClaiming(false);
    }
  };

  const referralLink = referralData?.referral_code
    ? `${window.location.origin}/#/join?ref=${referralData.referral_code}`
    : '';

  const handleCopy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    showToast('Referral link copied!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = () => {
    if (!referralData?.referral_code) return;
    navigator.clipboard.writeText(referralData.referral_code);
    setCopiedCode(true);
    showToast('Code copied!', 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const rzcBalance = (userProfile as any)?.rzc_balance || 0;
  const totalRzcCommissions = rzcCommissions?.total_rzc || 0;
  const downlineCount = downline.length;

  // Rank logic
  const currentRank = RANKS.reduce((acc, r) => downlineCount >= r.min ? r : acc, RANKS[0]);
  const nextRank = RANKS.find(r => r.level === currentRank.level + 1) || null;
  const rankProgress = nextRank
    ? Math.min(((downlineCount - currentRank.min) / (nextRank.min - currentRank.min)) * 100, 100)
    : 100;

  // Quest data
  const quests = buildQuests(downlineCount, rzcBalance, totalRzcCommissions);
  const completedQuests = quests.filter(q => q.progress >= q.target).length;

  const totalEarningsUsd = rzcToUsd(rzcBalance) + (tonEarnings?.total_ton || 0) * tonPrice;

  const RankIcon = currentRank.icon;

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-24 px-3 sm:px-4 animate-in fade-in duration-300">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-2xl font-heading font-black text-gray-900 dark:text-white tracking-tight">Affiliate Hub</h1>
          <p className="text-xs font-body text-gray-500 dark:text-gray-500 mt-0.5">Build your network, earn for life</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadAll}
            disabled={loading}
            className="p-2 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={`text-gray-500 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowTestPanel(!showTestPanel)}
            className="p-2 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl transition-all"
          >
            <Settings size={14} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Test Panel */}
      {showTestPanel && (
        <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-blue-900 dark:text-blue-300">System Diagnostics</h3>
            <button onClick={() => setShowTestPanel(false)} className="text-blue-600 dark:text-blue-400 text-lg leading-none">×</button>
          </div>
          <ReferralSystemTest />
        </div>
      )}

      {/* ── HERO EARNINGS BANNER ── */}
      <div className="relative rounded-3xl overflow-hidden shadow-sm" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #0d1a0d 50%, #050d0a 100%)', border: '1px solid rgba(0,255,136,0.15)' }}>
        {/* bg glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #00FF88 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
          <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #00CCFF 0%, transparent 70%)', transform: 'translate(-20%, 30%)' }} />
        </div>

        <div className="relative z-10 p-5 sm:p-6">
          {/* Rank badge row */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-black/40" style={{ border: `1.5px solid ${currentRank.color}40` }}>
                <RankIcon size={18} style={{ color: currentRank.color }} />
              </div>
              <div>
                <p className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">Current Rank</p>
                <p className="text-sm font-heading font-black text-white">{currentRank.name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">Total Value</p>
              <p className="text-lg font-numbers font-black text-white">≈ ${totalEarningsUsd.toFixed(2)}</p>
            </div>
          </div>

          {/* Big numbers */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="text-center">
              <p className="text-2xl font-numbers font-black" style={{ color: '#00FF88' }}>
                {loading ? '—' : downlineCount}
              </p>
              <p className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest mt-0.5">Members</p>
            </div>
            <div className="text-center border-x border-white/10">
              <p className="text-2xl font-numbers font-black text-white">
                {rzcBalance.toLocaleString()}
              </p>
              <p className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest mt-0.5">RZC Earned</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-numbers font-black text-blue-400">
                {(tonEarnings?.total_ton ?? 0).toFixed(3)}
              </p>
              <p className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest mt-0.5">TON Earned</p>
            </div>
          </div>

          {/* Rank progress bar */}
          {nextRank && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-heading font-bold text-gray-300 uppercase tracking-widest">
                  Progress to <span style={{ color: nextRank.color }} className="font-black">{nextRank.name}</span>
                </p>
                <p className="text-[10px] font-numbers font-bold text-gray-400 tracking-widest">{downlineCount} / {nextRank.min} refs</p>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${rankProgress}%`, background: `linear-gradient(90deg, ${currentRank.color}, ${nextRank.color})` }}
                />
              </div>
              <p className="text-[10px] font-body text-gray-500 dark:text-gray-400 mt-1.5">{nextRank.min - downlineCount} more referrals to unlock {nextRank.name}</p>
            </div>
          )}
          {!nextRank && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-2 rounded-full" style={{ background: `linear-gradient(90deg, #00FF88, #00CCFF)` }} />
              <p className="text-[10px] font-heading font-black uppercase tracking-widest" style={{ color: '#00FF88' }}>MAX RANK ✓</p>
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN TABS ── */}
      <div className="flex gap-1 bg-slate-100 dark:bg-white/5 rounded-2xl p-1.5 border border-slate-200 dark:border-white/10 mb-4">
        <button
          onClick={() => setActiveMainTab('commission')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-heading font-black uppercase tracking-widest transition-all duration-300 ${
            activeMainTab === 'commission'
              ? 'bg-white dark:bg-emerald-500/20 text-slate-900 dark:text-[#00FF88] shadow-lg scale-[1.02]'
              : 'text-slate-500 dark:text-gray-500 hover:text-slate-900 dark:hover:text-gray-300'
          }`}
        >
          <TrendingUp size={14} />
          Commission
        </button>
        <button
          onClick={() => setActiveMainTab('team')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-heading font-black uppercase tracking-widest transition-all duration-300 ${
            activeMainTab === 'team'
              ? 'bg-white dark:bg-blue-500/20 text-slate-900 dark:text-blue-400 shadow-lg scale-[1.02]'
              : 'text-slate-500 dark:text-gray-500 hover:text-slate-900 dark:hover:text-gray-300'
          }`}
        >
          <Users size={14} />
          Team
        </button>
      </div>

      {activeMainTab === 'commission' && (
      <div className="space-y-4 sm:space-y-6 page-enter">
        {/* ── SHARE CARD ── */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a] overflow-hidden shadow-sm">
        {/* gradient top bar */}
        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, #00FF88, #00CCFF, #7C3AED)' }} />
        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
              <Share2 size={15} className="text-emerald-600 dark:text-[#00FF88]" />
            </div>
            <div>
              <h3 className="text-sm font-heading font-black text-gray-900 dark:text-white">Your Referral Link</h3>
              <p className="text-[10px] font-body text-gray-500 dark:text-gray-500 mt-0.5">Earn 50 RZC for every signup</p>
            </div>
          </div>

          {/* Link box */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
            <span className="text-[11px] font-mono text-gray-600 dark:text-gray-400 truncate flex-1 select-all">
              {loading ? 'Loading...' : referralLink}
            </span>
            <button
              onClick={handleCopy}
              disabled={!referralData?.referral_code}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-heading font-black uppercase tracking-widest transition-all ${
                referralData?.referral_code 
                  ? 'bg-[#00FF88] text-black hover:bg-[#00CCFF] shadow-sm' 
                  : 'bg-gray-200 dark:bg-white/5 text-gray-500 dark:text-gray-600 cursor-not-allowed'
              }`}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Code + Share row */}
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
              <div>
                <p className="text-[9px] font-heading font-black text-gray-500 uppercase tracking-widest">Referral Code</p>
                <p className="text-sm font-numbers font-black text-gray-900 dark:text-white tracking-widest">
                  {referralData?.referral_code || '——'}
                </p>
              </div>
              <button onClick={handleCopyCode} className="ml-auto p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                {copiedCode ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} className="text-gray-500" />}
              </button>
            </div>
            {typeof navigator.share !== 'undefined' && (
              <button
                onClick={() => navigator.share?.({ title: 'Join Rhiza', text: `Use my code: ${referralData?.referral_code}`, url: referralLink })}
                className="p-3 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition-all text-gray-600 dark:text-gray-400 shadow-sm"
              >
                <ExternalLink size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

        {/* ── QUESTS ── */}
        <AffiliateQuests 
          downlineCount={downlineCount} 
          rzcBalance={rzcBalance} 
          totalRzcCommissions={totalRzcCommissions} 
        />

      {/* ── EARNINGS BREAKDOWN ── */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={15} className="text-emerald-500" />
            <h2 className="text-sm font-heading font-black text-gray-900 dark:text-white uppercase tracking-widest">Earnings Breakdown</h2>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
            {(['overview', 'rzc', 'ton'] as EarningsTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setEarningsTab(tab)}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-heading font-black uppercase tracking-widest transition-all ${
                  earningsTab === tab
                    ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-400'
                }`}
              >
                {tab === 'overview' ? 'Overview' : tab === 'rzc' ? 'RZC' : 'TON'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {earningsTab === 'overview' && (
            <div className="space-y-3">
              {[
                {
                  label: 'Signup Bonuses',
                  sublabel: '50 RZC per referral signup',
                  value: `${(downlineCount * 50).toLocaleString()} RZC`,
                  subvalue: `≈ $${rzcToUsd(downlineCount * 50).toFixed(2)}`,
                  color: '#00FF88',
                  bgLight: 'bg-emerald-50',
                  icon: Gift,
                },
                {
                  label: 'Package Commissions',
                  sublabel: '10% of each package purchase',
                  value: `${totalRzcCommissions.toLocaleString()} RZC`,
                  subvalue: `${rzcCommissions?.count || 0} purchase${rzcCommissions?.count !== 1 ? 's' : ''}`,
                  color: '#fbbf24',
                  bgLight: 'bg-amber-50',
                  icon: Award,
                },
                {
                  label: 'TON Commissions',
                  sublabel: '10% from direct joins',
                  value: `${(tonEarnings?.total_ton ?? 0).toFixed(4)} TON`,
                  subvalue: `${tonEarnings?.pending_count || 0} pending`,
                  color: '#60a5fa',
                  bgLight: 'bg-blue-50',
                  icon: TrendingUp,
                },
                {
                  label: 'Weekly Team Bonus',
                  sublabel: '1% of all team sales volume',
                  value: '0.00 RZC',
                  subvalue: 'Unlocks at Silver rank',
                  color: '#a78bfa',
                  bgLight: 'bg-purple-50',
                  icon: Flame,
                },
              ].map((item, i) => {
                const IIcon = item.icon;
                return (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.bgLight} dark:bg-black/20`} style={{ border: `1px solid ${item.color}40` }}>
                      <IIcon size={16} style={{ color: item.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-heading font-black text-gray-900 dark:text-white uppercase tracking-widest">{item.label}</p>
                      <p className="text-[10px] font-body text-gray-500">{item.sublabel}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-numbers font-black text-gray-900 dark:text-white">{item.value}</p>
                      <p className="text-[10px] font-numbers font-bold text-gray-500 tracking-widest">{item.subvalue}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {earningsTab === 'rzc' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-[#00FF88]/5 border border-emerald-100 dark:border-[#00FF88]/20">
                <div>
                  <p className="text-[10px] text-emerald-700 dark:text-gray-400 font-heading font-black uppercase tracking-widest">Total RZC Balance</p>
                  <p className="text-2xl font-numbers font-black text-emerald-600 dark:text-[#00FF88]">{rzcBalance.toLocaleString()}</p>
                  <p className="text-xs font-numbers font-bold text-emerald-700/80 dark:text-gray-500 uppercase tracking-widest">≈ ${rzcToUsd(rzcBalance).toFixed(2)} USD</p>
                </div>
                <Gift size={32} className="text-emerald-500/20" />
              </div>
              {(rzcCommissions?.items?.length ?? 0) > 0 ? (
                <div className="space-y-2">
                <p className="text-[10px] font-heading font-black text-gray-500 uppercase tracking-widest px-1 flex items-center gap-1.5">
                    <Activity size={10} /> Recent RZC Activity
                  </p>
                  <div className="space-y-1">
                    {rzcCommissions!.items.slice(0, 8).map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-all border border-gray-100 dark:border-white/5 hover:border-emerald-500/20 dark:hover:border-emerald-500/20">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                          <Gift size={14} className="text-emerald-600 dark:text-emerald-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-heading font-black text-gray-900 dark:text-white uppercase tracking-widest truncate">
                            {item.package_name || 'Commission Payout'}
                          </p>
                          <p className="text-[10px] font-numbers font-bold text-gray-500 dark:text-gray-400 tracking-widest">{getTimeAgo(new Date(item.created_at))}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-numbers font-black text-emerald-600 dark:text-emerald-400">+{item.commission_rzc.toLocaleString()} RZC</p>
                          <p className="text-[9px] font-heading font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Reward</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center bg-gray-50 dark:bg-white/5 rounded-2xl border border-dashed border-gray-200 dark:border-white/10 mx-1">
                  <TrendingUp size={24} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400">No commissions yet</p>
                </div>
              )}
            </div>
          )}

          {earningsTab === 'ton' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Total', value: `${(tonEarnings?.total_ton ?? 0).toFixed(4)}`, suffix: 'TON', color: 'text-blue-600 dark:text-blue-400' },
                  { label: 'Paid', value: `${(tonEarnings?.paid_ton ?? 0).toFixed(4)}`, suffix: 'TON', color: 'text-green-600 dark:text-green-400' },
                  { label: 'Pending', value: `${(tonEarnings?.pending_ton ?? 0).toFixed(4)}`, suffix: 'TON', color: 'text-amber-600 dark:text-amber-400' },
                ].map((s, i) => (
                  <div key={i} className="text-center p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                    <p className="text-[10px] font-heading font-black text-gray-500 uppercase tracking-widest mb-1">{s.label}</p>
                    <p className={`text-base font-numbers font-black ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] font-heading font-black text-gray-500 uppercase tracking-widest">{s.suffix}</p>
                  </div>
                ))}
              </div>

              {/* Recent Activity List - Mirrored from Dashboard style */}
              <div className="space-y-2">
                <p className="text-[10px] font-heading font-black text-gray-500 uppercase tracking-widest px-1 flex items-center gap-1.5">
                  <Activity size={10} /> Recent TON Activity
                </p>
                
                {loadingTonItems ? (
                  <div className="space-y-2 p-1">
                    {[1, 2].map(i => (
                      <div key={i} className="h-12 w-full bg-gray-100 dark:bg-white/10 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : tonEarningItems.length > 0 ? (
                  <div className="space-y-1">
                    {tonEarningItems.slice(0, 5).map((item, i) => {
                      const referredUser = downline.find(u => u.id === item.referred_user_id);
                      return (
                        <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-all border border-gray-100 dark:border-white/5 hover:border-blue-500/20 dark:hover:border-blue-500/20">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                            <ArrowDownLeft size={14} className="text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-heading font-black text-gray-900 dark:text-white uppercase tracking-widest truncate">
                              {referredUser ? `From ${referredUser.name || `User #${referredUser.wallet_address.slice(-4)}`}` : 'Commission Payout'}
                            </p>
                            <p className="text-[10px] font-numbers font-bold text-gray-500 dark:text-gray-400 tracking-widest">{getTimeAgo(new Date(item.created_at))}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-numbers font-black text-blue-600 dark:text-blue-400">+{item.amount.toFixed(4)} TON</p>
                            <p className="text-[9px] font-heading font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Reward</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-6 text-center bg-gray-50 dark:bg-white/5 rounded-xl border border-dashed border-gray-200 dark:border-white/10">
                    <TrendingUp size={24} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                    <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400">No activity yet</p>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
                <p className="text-[11px] text-blue-800 dark:text-blue-300 font-body leading-relaxed">
                  💡 TON commissions are paid directly to your wallet by smart contract when friends join using your referral link. No manual claiming required.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── RANK LADDER ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <Crown size={14} className="text-yellow-500" />
          <h2 className="text-sm font-heading font-black text-gray-900 dark:text-white uppercase tracking-widest">Rank Ladder</h2>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a] overflow-hidden divide-y divide-gray-100 dark:divide-white/5 shadow-sm">
          {RANKS.map((rank) => {
            const isActive = rank.level === currentRank.level;
            const isPast = rank.level < currentRank.level;
            const isLocked = rank.level > currentRank.level;
            const RIcon = rank.icon;
            const isExpanded = expandedRank === rank.level;

            return (
              <div key={rank.level}>
                <button
                  onClick={() => setExpandedRank(isExpanded ? null : rank.level)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/5 ${isActive ? 'bg-gray-50 dark:bg-white/5' : ''}`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isLocked
                        ? 'bg-gray-100 dark:bg-white/[0.06] border-[1.5px] border-gray-200 dark:border-white/10 opacity-50'
                        : 'bg-gray-50 dark:bg-white/[0.08]'
                    }`}
                    style={isLocked ? {} : { border: `1.5px solid ${rank.color}50` }}
                  >
                    {isLocked
                      ? <Lock size={14} className="text-gray-400 dark:text-gray-500" />
                      : <RIcon size={16} style={{ color: rank.color }} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-heading font-black uppercase tracking-widest ${isLocked ? 'text-gray-400 dark:text-gray-600' : 'text-gray-900 dark:text-white'}`}>
                        {rank.name}
                      </span>
                      {isActive && (
                        <span
                          className="text-[9px] font-heading font-black px-2 py-0.5 rounded-full border"
                          style={{ background: `${rank.color}20`, color: rank.color, borderColor: `${rank.color}40` }}
                        >
                          CURRENT
                        </span>
                      )}
                      {isPast && <Check size={12} className="text-emerald-500" />}
                    </div>
                    <p className="text-[10px] font-numbers font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest">
                      {rank.max ? `${rank.min}–${rank.max} referrals` : `${rank.min}+ referrals`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isActive && (
                      <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: rank.color }} />
                    )}
                    <ChevronDown size={14} className={`text-gray-400 dark:text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-3 pt-2 bg-gray-50 dark:bg-white/[0.04] border-t border-gray-100 dark:border-white/[0.06]">
                    <p className="text-[10px] font-heading font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Perks & Benefits</p>
                    <div className="space-y-1.5">
                      {rank.perks.map((perk, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: rank.color }} />
                          <p className="text-[11px] font-body text-gray-600 dark:text-gray-300">{perk}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-emerald-500" />
            <h2 className="text-sm font-heading font-black text-gray-900 dark:text-white">How It Works</h2>
          </div>
        </div>
        <div className="p-4">
          <div className="relative">
            {/* vertical line */}
            <div className="absolute left-[17px] top-5 bottom-5 w-px bg-gray-200 dark:bg-white/10" />
            <div className="space-y-5">
              {[
                { step: '1', text: 'Copy your unique referral link above and share it on social media, messaging apps, or directly with friends.', reward: null, color: '#00FF88' },
                { step: '2', text: 'Your friend signs up using your link. You instantly earn 50 RZC (~$5) credited to your balance.', reward: '50 RZC', color: '#60a5fa' },
                { step: '3', text: 'When they purchase any Rhiza package, you automatically earn 10% commission in RZC.', reward: '10% Commission', color: '#fbbf24' },
                { step: '4', text: 'Every week, earn 1% of your entire team\'s total sales volume — passive income that grows with your squad.', reward: '1% Weekly', color: '#a78bfa' },
              ].map(({ step, text, reward, color }) => (
                <div key={step} className="flex gap-4 relative">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 bg-white dark:bg-[#0a0a0a]" style={{ border: `1.5px solid ${color}80` }}>
                    <span className="text-[11px] font-black" style={{ color }}>{step}</span>
                  </div>
                  <div className="pt-1 flex-1">
                    <p className="text-xs text-gray-700 dark:text-gray-300 font-body leading-relaxed">{text}</p>
                    {reward && (
                      <span className="inline-block mt-1.5 text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color: color }}>
                        🎁 {reward}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── CLAIM MISSING REWARDS ── */}
      {userProfile?.id && (
        <ClaimMissingRewards userId={userProfile.id} onClaimed={loadReferralNetwork} />
      )}
      </div>
      )}

      {activeMainTab === 'team' && (
      <div className="space-y-4 sm:space-y-6 page-enter">
      {/* ── TEAM FEED ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-blue-500" />
            <h2 className="text-sm font-black text-gray-900 dark:text-white">Your Team</h2>
          </div>
          <div className="flex items-center gap-2">
            {!loading && (
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-[#00FF88]/10 dark:text-[#00FF88] border border-emerald-200 dark:border-[#00FF88]/20">
                {downlineCount} {downlineCount === 1 ? 'Member' : 'Members'}
              </span>
            )}
          </div>
        </div>

        {/* Upline sponsor */}
        {upline && (
          <div className="p-3.5 rounded-2xl border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/5">
            <p className="text-[9px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <ArrowUp size={10} /> Your Sponsor
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-base border border-blue-200 dark:border-blue-500/30">
                {upline.avatar || '👤'}
              </div>
              <div>
                <p className="text-xs font-black text-gray-900 dark:text-white">{upline.name || `User #${upline.wallet_address.slice(-4)}`}</p>
                <p className="text-[10px] text-gray-500 font-mono">{upline.wallet_address.slice(0, 8)}…{upline.wallet_address.slice(-6)}</p>
              </div>
              <div className="ml-auto">
                <span className="text-[9px] font-black px-2 py-1 rounded-lg bg-blue-200 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400">Sponsor</span>
              </div>
            </div>
          </div>
        )}

        {/* Downline */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a] overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-10 flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-gray-200 dark:border-white/10 border-t-emerald-600 dark:border-t-emerald-500 rounded-full animate-spin" />
              <p className="text-xs text-gray-500 font-semibold">Loading your network…</p>
            </div>
          ) : downline.length === 0 ? (
            <div className="p-10 flex flex-col items-center gap-3 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center justify-center">
                <Users size={24} className="text-gray-400 dark:text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-black text-gray-900 dark:text-white mb-1">No team members yet</p>
                <p className="text-[11px] text-gray-500">Share your link to start earning referral rewards</p>
              </div>
              <button
                onClick={handleCopy}
                className="mt-1 px-4 py-2 rounded-xl text-[12px] font-black transition-all bg-[#00FF88] text-black hover:bg-[#00CCFF]"
              >
                Copy Referral Link
              </button>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-100 dark:divide-white/10">
                {(showAllTeam ? downline : downline.slice(0, 6)).map((user, idx) => (
                  <div key={user.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-[#00FF88]/10 flex items-center justify-center text-base border border-emerald-200 dark:border-[#00FF88]/20">
                        {user.avatar || '👤'}
                      </div>
                      {user.is_active && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-[#0a0a0a]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-black text-gray-900 dark:text-white truncate">
                          {user.name || `User #${user.wallet_address.slice(-4)}`}
                        </p>
                        {idx === 0 && (
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400">NEW</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-gray-500">{getTimeAgo(new Date(user.created_at))}</span>
                        {user.total_referrals > 0 && (
                          <>
                            <span className="text-gray-300 dark:text-gray-700">·</span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">{user.total_referrals} refs</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-[11px] font-black ${user.is_active ? 'text-emerald-600 dark:text-emerald-500' : 'text-gray-400'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </p>
                      <p className="text-[10px] text-gray-500">{user.rzc_balance?.toLocaleString() || '0'} RZC</p>
                    </div>
                  </div>
                ))}
              </div>
              {downline.length > 6 && (
                <div className="border-t border-gray-100 dark:border-white/10">
                  <button
                    onClick={() => setShowAllTeam(v => !v)}
                    className="w-full flex items-center justify-center gap-2 py-3 text-[11px] font-black text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  >
                    {showAllTeam ? 'Show less' : `View all ${downline.length} members`}
                    <ChevronDown size={13} className={`transition-transform ${showAllTeam ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── SQUAD MINING (if available) ── */}
      {squadStats && squadStats.squad_size > 0 && (
        <div className="hidden rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-sm">
          <div className="h-0.5" style={{ background: 'linear-gradient(90deg, #00FF88, #7C3AED)' }} />
          <div className="p-4 sm:p-5 bg-white dark:bg-[#0a0a0a]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
                  <Zap size={16} className="text-emerald-600 dark:text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white">Squad Mining</h3>
                  <p className="text-[10px] text-gray-500">Claim every 8 hours</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10">
                <Clock size={11} className="text-blue-500" />
                <span className="text-[11px] font-black text-blue-600 dark:text-blue-500 font-mono">
                  {timeUntilClaim.canClaim ? 'Ready!' : `${timeUntilClaim.hours}h ${timeUntilClaim.minutes}m`}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: 'Squad', value: squadStats.squad_size, color: 'text-blue-600 dark:text-blue-400' },
                { label: 'Per Claim', value: squadStats.potential_reward, color: 'text-emerald-600 dark:text-[#00FF88]' },
                { label: 'Lifetime', value: squadStats.total_rewards_earned, color: 'text-purple-600 dark:text-purple-400' },
              ].map((s, i) => (
                <div key={i} className="text-center p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10">
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1">{s.label}</p>
                  <p className={`text-base font-black ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
            <button
              onClick={claimSquadRewards}
              disabled={!timeUntilClaim.canClaim || isClaiming}
              className={`w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all ${
                timeUntilClaim.canClaim && !isClaiming 
                  ? 'bg-[#00FF88] text-black hover:bg-[#00CCFF]' 
                  : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              }`}
            >
              {isClaiming ? (
                <><Loader size={14} className="animate-spin" /> Claiming…</>
              ) : timeUntilClaim.canClaim ? (
                <><Zap size={14} /> Claim {(squadStats.potential_reward || 0).toLocaleString()} RZC</>
              ) : (
                <><Clock size={14} /> Next Claim in {timeUntilClaim.hours}h {timeUntilClaim.minutes}m</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── BOTTOM CTA ── */}
      <div
        className="rounded-2xl p-5 text-center space-y-3 bg-emerald-50 dark:bg-transparent border border-emerald-200 dark:border-[#00FF88]/20"
        style={{
          backgroundImage: 'linear-gradient(135deg, rgba(0,255,136,0.06) 0%, rgba(124,58,237,0.06) 100%)'
        }}
      >
        <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-[#00FF88] shadow-[0_8px_24px_rgba(0,255,136,0.25)] dark:shadow-[0_8px_24px_rgba(0,255,136,0.35)]">
          <Rocket size={22} className="text-black" />
        </div>
        <div>
          <h3 className="text-base font-black text-gray-900 dark:text-white">Ready to scale your earnings?</h3>
          <p className="text-xs text-gray-500 mt-1">Share your link now and start climbing the ranks</p>
        </div>
        <button
          onClick={handleCopy}
          className="w-full py-3.5 rounded-xl text-sm font-black transition-all bg-[#00FF88] text-black shadow-[0_4px_16px_rgba(0,255,136,0.15)] dark:shadow-[0_4px_16px_rgba(0,255,136,0.25)] hover:bg-[#00CCFF]"
        >
          {copied ? '✓ Copied!' : 'Share Your Link'}
        </button>
      </div>
      </div>
      )}

    </div>
  );
};

export default Referral;
