import React, { useEffect, useState } from 'react';
import { Trophy, TrendingUp, Users, Coins, Award, Crown, Medal, Star } from 'lucide-react';
import { supabaseService } from '../services/supabaseService';

interface LeaderboardEntry {
  rank: number;
  name: string;
  masked_address: string;
  rzc_balance: number;
  is_activated: boolean;
  total_referrals: number;
  referral_earnings: number;
  days_active: number;
  created_at: string;
}

interface LeaderboardStats {
  total_holders: number;
  total_rzc_in_circulation: number;
  average_balance: number;
  highest_balance: number;
  median_balance: number;
  holders_over_1k: number;
  holders_over_10k: number;
  holders_over_100k: number;
}

const RZCLeaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<LeaderboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await supabaseService.getTopRZCHolders(100);

      if (result.success && result.data) {
        setLeaderboard(result.data);
        if (result.stats) {
          setStats(result.stats);
        }
      } else {
        setError(result.error || 'Failed to load leaderboard');
      }
    } catch (err: any) {
      console.error('❌ Leaderboard load error:', err);
      setError(err.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown size={18} className="text-yellow-500" />;
    if (rank === 2) return <Medal size={18} className="text-gray-400" />;
    if (rank === 3) return <Medal size={18} className="text-amber-600" />;
    return null;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black';
    if (rank === 2) return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white';
    if (rank === 3) return 'bg-gradient-to-r from-amber-600 to-amber-700 text-white';
    if (rank <= 10) return 'bg-primary/20 text-primary border border-primary/30';
    return 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-gray-300';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toFixed(2);
  };

  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-[1.5rem] bg-white dark:bg-black border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative overflow-hidden rounded-[1.5rem] bg-white dark:bg-black border border-red-200 dark:border-red-500/20 shadow-sm">
        <div className="p-5 sm:p-6">
          <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20">
            <div className="flex items-center gap-2 mb-1">
              <Users size={14} className="text-primary" />
              <span className="text-[9px] font-heading font-black uppercase tracking-widest text-slate-600 dark:text-gray-400">Holders</span>
            </div>
            <p className="text-lg font-numbers font-black text-slate-900 dark:text-white tabular-nums">{stats.total_holders.toLocaleString()}</p>
          </div>

          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Coins size={14} className="text-emerald-500" />
              <span className="text-[9px] font-heading font-black uppercase tracking-widest text-slate-600 dark:text-gray-400">Total RZC</span>
            </div>
            <p className="text-lg font-numbers font-black text-slate-900 dark:text-white tabular-nums">{formatNumber(stats.total_rzc_in_circulation)}</p>
          </div>

          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-blue-500" />
              <span className="text-[9px] font-heading font-black uppercase tracking-widest text-slate-600 dark:text-gray-400">Average</span>
            </div>
            <p className="text-lg font-numbers font-black text-slate-900 dark:text-white tabular-nums">{formatNumber(stats.average_balance)}</p>
          </div>

          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Trophy size={14} className="text-purple-500" />
              <span className="text-[9px] font-heading font-black uppercase tracking-widest text-slate-600 dark:text-gray-400">Top Holder</span>
            </div>
            <p className="text-lg font-numbers font-black text-slate-900 dark:text-white tabular-nums">{formatNumber(stats.highest_balance)}</p>
          </div>
        </div>
      )}

      {/* Leaderboard Card */}
      <div className="relative overflow-hidden rounded-[1.5rem] bg-white dark:bg-black border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="p-5 sm:p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
              <Trophy size={20} className="text-black" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-heading font-black text-slate-900 dark:text-white uppercase tracking-widest leading-tight">
                Top 100 RZC Holders
              </h2>
              <p className="text-[11px] font-body text-slate-500 dark:text-gray-400 mt-1.5">
                Real-time leaderboard of the biggest RZC holders
              </p>
            </div>
          </div>

          {/* Leaderboard List */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {leaderboard.map((entry) => (
              <div
                key={entry.rank}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  entry.rank <= 3
                    ? 'bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20 hover:border-primary/40'
                    : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 hover:border-primary/20'
                }`}
              >
                {/* Rank */}
                <div className={`flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 ${getRankBadge(entry.rank)}`}>
                  {getRankIcon(entry.rank) || (
                    <span className="text-xs font-heading font-black">{entry.rank}</span>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-heading font-bold text-slate-900 dark:text-white truncate">
                      {entry.name}
                    </p>
                    {entry.is_activated && (
                      <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                        <Award size={10} className="text-white" />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] font-mono text-slate-500 dark:text-gray-500 truncate">
                    {entry.masked_address}
                  </p>
                </div>

                {/* Balance */}
                <div className="text-right">
                  <p className="text-sm font-numbers font-black text-slate-900 dark:text-white tabular-nums">
                    {formatNumber(entry.rzc_balance)}
                  </p>
                  <p className="text-[9px] font-heading font-black uppercase tracking-widest text-primary">
                    RZC
                  </p>
                </div>

                {/* Stats */}
                {entry.total_referrals > 0 && (
                  <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-white/50 dark:bg-white/5 rounded-lg border border-slate-100 dark:border-white/5">
                    <Users size={10} className="text-slate-500 dark:text-gray-500" />
                    <span className="text-[10px] font-numbers font-bold text-slate-600 dark:text-gray-400 tabular-nums">
                      {entry.total_referrals}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer Note */}
          <div className="pt-3 border-t border-slate-100 dark:border-white/5">
            <p className="text-[10px] font-body text-slate-400 dark:text-gray-500 text-center leading-relaxed">
              Leaderboard updates in real-time. Admin accounts excluded.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RZCLeaderboard;
