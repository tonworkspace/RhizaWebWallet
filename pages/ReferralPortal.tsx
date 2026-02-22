import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Gift, Users, DollarSign, Copy, Share2, TrendingUp, Award, CheckCircle } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { useToast } from '../context/ToastContext';
import { supabaseService } from '../services/supabaseService';

const ReferralPortal: React.FC = () => {
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

  const copyReferralLink = () => {
    if (!referralData?.referral_code) {
      showToast('Referral code not available', 'error');
      return;
    }

    const link = `${window.location.origin}/#/create-wallet?ref=${referralData.referral_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    showToast('Referral link copied!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCode = () => {
    if (!referralData?.referral_code) return;
    
    navigator.clipboard.writeText(referralData.referral_code);
    showToast('Referral code copied!', 'success');
  };

  const stats = {
    totalReferrals: referralData?.total_referrals || 0,
    activeReferrals: referredUsers.filter(u => u.is_active).length,
    totalEarned: referralData?.total_earned || 0,
    pendingRewards: 0 // Calculate from pending transactions
  };

  const tiers = [
    { name: 'Bronze', referrals: '0-10', commission: '5%', bonus: '$10', color: 'from-orange-400 to-orange-600' },
    { name: 'Silver', referrals: '11-50', commission: '7.5%', bonus: '$50', color: 'from-gray-300 to-gray-500' },
    { name: 'Gold', referrals: '51-100', commission: '10%', bonus: '$150', color: 'from-yellow-400 to-yellow-600' },
    { name: 'Platinum', referrals: '100+', commission: '15%', bonus: '$500', color: 'from-purple-400 to-purple-600' }
  ];

  const recentReferrals = referredUsers.slice(0, 10).map((user, index) => ({
    name: user.name || `User #${user.wallet_address.slice(-4)}`,
    date: new Date(user.created_at).toLocaleDateString(),
    status: user.is_active ? 'Active' : 'Inactive',
    earned: '0' // Calculate from transactions
  }));

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-300">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-b border-slate-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-6">
          <div className="flex items-center justify-between mb-6">
            <Link to="/" className="flex items-center gap-2 text-slate-600 dark:text-gray-400 hover:text-primary transition-colors group">
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              <span className="font-bold">Back to Home</span>
            </Link>
            <Link
              to="/onboarding"
              className="px-6 py-2 bg-primary text-black rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all"
            >
              Get Started
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center">
              <Gift className="text-black" size={24} />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white">Referral Portal</h1>
              <p className="text-slate-600 dark:text-gray-400 font-medium">Earn rewards by inviting friends</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
        {/* Hero */}
        <div className="p-8 bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 rounded-3xl mb-12">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Earn Up to 15% Commission</h2>
          <p className="text-slate-600 dark:text-gray-300 text-lg mb-6">
            Invite friends to RhizaCore and earn $RZC for every transaction they make. 
            The more you refer, the higher your commission rate.
          </p>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={copyReferralLink}
              className="px-8 py-4 bg-primary text-black rounded-xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2"
            >
              <Copy size={18} />
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            <button className="px-8 py-4 bg-white dark:bg-black border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2">
              <Share2 size={18} />
              Share
            </button>
          </div>
        </div>

        {/* Stats Dashboard */}
        <section className="mb-16">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8">Your Performance</h2>
          
          {/* Referral Code Display */}
          {referralData && (
            <div className="mb-8 p-6 bg-gradient-to-r from-[#00FF88]/10 to-[#00CCFF]/10 border border-[#00FF88]/20 rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-2">Your Referral Code</p>
                  <div className="flex items-center gap-3">
                    <h3 className="text-4xl font-black text-white font-mono">{referralData.referral_code}</h3>
                    <button
                      onClick={copyCode}
                      className="p-2 bg-[#00FF88]/20 hover:bg-[#00FF88]/30 rounded-lg transition-colors"
                    >
                      <Copy size={20} className="text-[#00FF88]" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Current Rank: {referralData.rank}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid md:grid-cols-4 gap-6">
            <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl">
              <Users className="text-primary mb-3" size={28} />
              <div className="text-3xl font-black text-slate-900 dark:text-white mb-1">{stats.totalReferrals}</div>
              <div className="text-sm text-slate-600 dark:text-gray-400 font-bold">Total Referrals</div>
            </div>
            <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl">
              <CheckCircle className="text-green-500 mb-3" size={28} />
              <div className="text-3xl font-black text-slate-900 dark:text-white mb-1">{stats.activeReferrals}</div>
              <div className="text-sm text-slate-600 dark:text-gray-400 font-bold">Active Users</div>
            </div>
            <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl">
              <DollarSign className="text-primary mb-3" size={28} />
              <div className="text-3xl font-black text-slate-900 dark:text-white mb-1">{stats.totalEarned} $RZC</div>
              <div className="text-sm text-slate-600 dark:text-gray-400 font-bold">Total Earned</div>
            </div>
            <div className="p-6 bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 rounded-2xl">
              <TrendingUp className="text-primary mb-3" size={28} />
              <div className="text-3xl font-black text-slate-900 dark:text-white mb-1">{stats.pendingRewards} $RZC</div>
              <div className="text-sm text-slate-600 dark:text-gray-400 font-bold">Pending Rewards</div>
            </div>
          </div>
        </section>

        {/* Referral Link */}
        <section className="mb-16">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8">Your Referral Link</h2>
          <div className="p-6 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <label className="text-sm font-bold text-slate-600 dark:text-gray-400 mb-2 block">Referral Code</label>
                <input
                  type="text"
                  value={referralCode}
                  readOnly
                  className="w-full bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>
              <button
                onClick={copyReferralLink}
                className="mt-7 px-6 py-3 bg-primary text-black rounded-xl font-black text-sm uppercase hover:scale-105 transition-all"
              >
                <Copy size={18} />
              </button>
            </div>
            <div className="p-4 bg-white dark:bg-black rounded-xl">
              <div className="text-xs font-bold text-slate-500 dark:text-gray-400 mb-2">Full Link</div>
              <code className="text-sm text-primary font-mono break-all">
                https://rhizacore.com/ref/{referralCode}
              </code>
            </div>
          </div>
        </section>

        {/* Commission Tiers */}
        <section className="mb-16">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8">Commission Tiers</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {tiers.map((tier, idx) => (
              <div 
                key={idx} 
                className={`p-6 rounded-2xl border-2 ${
                  idx === 1 ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a]'
                } relative overflow-hidden`}
              >
                {idx === 1 && (
                  <div className="absolute -top-2 -right-2 px-3 py-1 bg-primary text-black text-xs font-black uppercase rounded-bl-xl">
                    Current
                  </div>
                )}
                <div className={`w-12 h-12 bg-gradient-to-br ${tier.color} rounded-xl flex items-center justify-center mb-4`}>
                  <Award className="text-white" size={24} />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{tier.name}</h3>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-gray-400">Referrals</span>
                    <span className="font-bold text-slate-900 dark:text-white">{tier.referrals}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-gray-400">Commission</span>
                    <span className="font-bold text-primary">{tier.commission}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-gray-400">Bonus</span>
                    <span className="font-bold text-slate-900 dark:text-white">{tier.bonus}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-16">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '1', title: 'Share Your Link', desc: 'Send your unique referral link to friends' },
              { step: '2', title: 'They Sign Up', desc: 'Friend creates wallet using your link' },
              { step: '3', title: 'They Transact', desc: 'Friend makes transactions with $RZC' },
              { step: '4', title: 'You Earn', desc: 'Get commission on their transaction fees' }
            ].map((item, idx) => (
              <div key={idx} className="p-6 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl">
                <div className="w-12 h-12 bg-primary text-black rounded-xl flex items-center justify-center font-black text-xl mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 dark:text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Referrals */}
        <section className="mb-16">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8">Recent Referrals</h2>
          <div className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-black text-slate-600 dark:text-gray-400 uppercase tracking-widest">User</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-slate-600 dark:text-gray-400 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-slate-600 dark:text-gray-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-black text-slate-600 dark:text-gray-400 uppercase tracking-widest">Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                  {recentReferrals.map((referral, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">{referral.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-gray-400">{referral.date}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                          referral.status === 'Active'
                            ? 'bg-green-100 dark:bg-green-500/20 text-green-900 dark:text-green-300'
                            : 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-900 dark:text-yellow-300'
                        }`}>
                          {referral.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-black text-primary">{referral.earned} $RZC</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="mb-16">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8">Referral Benefits</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: 'Lifetime Earnings', desc: 'Earn commission for as long as your referrals stay active', icon: '♾️' },
              { title: 'No Limits', desc: 'Refer unlimited friends, no cap on earnings', icon: '🚀' },
              { title: 'Instant Payouts', desc: 'Rewards credited to your wallet immediately', icon: '⚡' },
              { title: 'Tier Bonuses', desc: 'Unlock bonus rewards as you reach new tiers', icon: '🎁' },
              { title: 'Leaderboard', desc: 'Compete for top spots and extra prizes', icon: '🏆' },
              { title: 'Marketing Tools', desc: 'Get banners, templates, and tracking', icon: '📊' }
            ].map((benefit, idx) => (
              <div key={idx} className="p-6 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl hover:border-primary/30 transition-all">
                <div className="text-4xl mb-4">{benefit.icon}</div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">{benefit.title}</h3>
                <p className="text-sm text-slate-600 dark:text-gray-400">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tips */}
        <section className="mb-16">
          <div className="p-8 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-500/10 dark:to-blue-600/10 border border-blue-200 dark:border-blue-500/20 rounded-3xl">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4">Tips to Maximize Earnings</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                'Share on social media platforms (Twitter, Facebook, Reddit)',
                'Create content explaining RhizaCore benefits',
                'Join crypto communities and share your experience',
                'Help your referrals get started and stay active',
                'Use our marketing materials for better conversion',
                'Track your performance and optimize your strategy'
              ].map((tip, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle className="text-primary flex-shrink-0 mt-1" size={20} />
                  <p className="text-slate-700 dark:text-gray-300 font-medium">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="p-8 bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 rounded-3xl text-center">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Start Earning Today</h2>
          <p className="text-slate-600 dark:text-gray-300 text-lg mb-6 max-w-2xl mx-auto">
            Join thousands of users earning passive income through our referral program. 
            The more you share, the more you earn.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button 
              onClick={copyReferralLink}
              className="px-8 py-4 bg-primary text-black rounded-xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all"
            >
              Copy Referral Link
            </button>
            <Link
              to="/onboarding"
              className="px-8 py-4 bg-white dark:bg-black border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all inline-block"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralPortal;
