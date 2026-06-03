import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Crown, Share2, Video, MessageCircle, Twitter, Users, ChevronRight, Upload, 
  ArrowRight, ShieldCheck, CheckCircle2, FileText, Link as LinkIcon, Instagram,
  MessageSquare
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { supabaseService } from '../services/supabaseService';
import { useToast } from '../context/ToastContext';

// ─── Constants ────────────────────────────────────────────────────────────────
const VANGUARD_TASKS = [
  {
    id: 'twitter_post',
    title: 'Post on X (Twitter)',
    description: 'Share your RhizaCore referral link and tag @RhizaCore. Earn rewards for engagement.',
    reward: '50 RZC',
    icon: Twitter,
    color: 'text-[#1DA1F2]',
    bg: 'bg-[#1DA1F2]/10',
    linkType: 'Tweet URL'
  },
  {
    id: 'youtube_review',
    title: 'YouTube Review',
    description: 'Create a video review of the RhizaCore Web3 Wallet. Minimum 3 minutes long.',
    reward: '500 RZC',
    icon: Video,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    linkType: 'Video URL'
  },
  {
    id: 'telegram_share',
    title: 'Share in Telegram Groups',
    description: 'Post about RhizaCore in crypto-related Telegram groups (1k+ members).',
    reward: '30 RZC',
    icon: MessageCircle,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    linkType: 'Message Link'
  }
];

type VanguardState = 'loading' | 'unregistered' | 'onboarding' | 'dashboard';

// ─── Main Component ───────────────────────────────────────────────────────────
const Vanguard: React.FC = () => {
  const { t } = useTranslation();
  const { userProfile } = useWallet();
  const { showToast } = useToast();

  const [viewState, setViewState] = useState<VanguardState>('loading');
  
  // Registration Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    country: '',
    twitterHandle: '',
    bio: '',
    referralSource: 'Social Media',
    reason: '',
    primaryPlatform: 'Twitter',
    audienceSize: '1k-5k',
    monthlySales: '$100 - $1,000',
    expectedEngagement: '1k - 10k views',
    primaryLink: '',
    videoLink: '',
    agreedToTerms: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dashboard State
  const [level1Count, setLevel1Count] = useState(0);
  const [level2Count, setLevel2Count] = useState(0);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [submissionLink, setSubmissionLink] = useState('');
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // Load Initial State
  useEffect(() => {
    const checkVanguardStatus = async () => {
      if (!userProfile?.id) return;
      try {
        const res = await supabaseService.getVanguardApplication(userProfile.id);
        if (res.success && res.data) {
          if (res.data.status === 'approved') {
            setViewState('dashboard');
          } else {
            // pending or rejected
            setViewState('onboarding');
          }
        } else {
          setViewState('unregistered');
        }
      } catch (err) {
        console.error('Error fetching vanguard status', err);
        setViewState('unregistered');
      }
    };
    checkVanguardStatus();
  }, [userProfile?.id]);

  // Load Dashboard Data
  useEffect(() => {
    if (viewState === 'dashboard') {
      loadReferralNetwork();
    }
  }, [viewState, userProfile?.id]);

  const loadReferralNetwork = async () => {
    if (!userProfile?.id) return;
    try {
      setDashboardLoading(true);
      const downlineRes = await supabaseService.getDownline(userProfile.id);
      let l1 = 0;
      let l2 = 0;

      if (downlineRes.success && downlineRes.data) {
        const directReferrals = downlineRes.data;
        l1 = directReferrals.length;
        for (const ref of directReferrals) {
          const l2Res = await supabaseService.getDownline(ref.id);
          if (l2Res.success && l2Res.data) l2 += l2Res.data.length;
        }
      }
      setLevel1Count(l1);
      setLevel2Count(l2);
    } catch (err) {
      console.error('Failed to load vanguard network:', err);
    } finally {
      setDashboardLoading(false);
    }
  };

  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.id) {
      showToast('You must be logged in to apply.', 'error');
      return;
    }
    if (!formData.agreedToTerms) {
      showToast('You must agree to the Vanguard Terms and Conditions.', 'error');
      return;
    }
    
    setIsSubmitting(true);
    const res = await supabaseService.submitVanguardApplication({
      user_id: userProfile.id,
      full_name: formData.fullName,
      email: formData.email,
      country: formData.country,
      twitter_handle: formData.twitterHandle,
      bio: formData.bio,
      referral_source: formData.referralSource,
      reason: formData.reason,
      primary_platform: formData.primaryPlatform,
      audience_size: formData.audienceSize,
      monthly_sales: formData.monthlySales,
      expected_engagement: formData.expectedEngagement,
      primary_link: formData.primaryLink,
      video_link: formData.videoLink
    });

    setIsSubmitting(false);

    if (res.success) {
      setViewState('onboarding');
      window.scrollTo(0, 0);
    } else {
      showToast(res.error || 'Failed to submit application. Try again.', 'error');
    }
  };

  const completeOnboarding = () => {
    // Usually they are stuck in onboarding until an admin approves them in the DB.
    // For demo purposes, we can let them bypass to the dashboard if they click it,
    // or we can strictly enforce waiting. Let's strictly enforce waiting:
    showToast('Your application is still pending review. Please wait for an admin to approve you.', 'info');
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.id) return;
    if (!submissionLink.trim() || !selectedTask) {
      showToast('Please provide a valid link.', 'error');
      return;
    }

    setIsSubmitting(true);
    const res = await supabaseService.submitVanguardTask(userProfile.id, selectedTask, submissionLink);
    setIsSubmitting(false);

    if (res.success) {
      showToast('Task submitted for review! Rewards will be distributed after verification.', 'success');
      setSubmissionLink('');
      setSelectedTask(null);
    } else {
      showToast(res.error || 'Failed to submit task proof.', 'error');
    }
  };

  // ─── Renderers ────────────────────────────────────────────────────────────────

  if (viewState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  // 1. REGISTRATION FORM
  if (viewState === 'unregistered') {
    return (
      <div className="max-w-xl mx-auto space-y-6 pb-24 page-enter px-3 sm:px-4 md:px-0">
        <div className="pt-2 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 p-[2px] mx-auto mb-4">
            <div className="w-full h-full rounded-full bg-[#111] flex items-center justify-center">
              <Crown className="text-amber-400" size={28} />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-black tracking-widest text-gray-950 dark:text-white uppercase">
            Vanguard Application
          </h1>
          <p className="text-[11px] sm:text-xs font-body text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto leading-relaxed">
            Join the elite RhizaCore Ambassador Program. Monetize your audience, share content, and earn exclusive RZC rewards.
          </p>
        </div>

        <form onSubmit={handleRegistrationSubmit} className="space-y-4">
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-4 text-center mb-4">
            <p className="text-xs font-heading font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest">
              Up to $1,000 in Rewards Available
            </p>
          </div>

          {/* 1. Personal Details */}
          <div className="bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-white/5 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
            <h3 className="text-[11px] font-heading font-black text-gray-500 uppercase tracking-widest border-b border-gray-100 dark:border-white/5 pb-2">
              Personal Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-heading font-black text-gray-500 uppercase tracking-widest mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  placeholder="John Doe"
                  className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-3 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-heading font-black text-gray-500 uppercase tracking-widest mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="john@example.com"
                  className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-3 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-heading font-black text-gray-500 uppercase tracking-widest mb-1.5">
                  Country
                </label>
                <input
                  type="text"
                  required
                  value={formData.country}
                  onChange={(e) => setFormData({...formData, country: e.target.value})}
                  placeholder="Your Country"
                  className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-3 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-heading font-black text-gray-500 uppercase tracking-widest mb-1.5">
                  Brief Bio
                </label>
                <input
                  type="text"
                  required
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  placeholder="I am a crypto educator..."
                  className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-3 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                />
              </div>
            </div>
          </div>

          {/* 2. Social Presence */}
          <div className="bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-white/5 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
            <h3 className="text-[11px] font-heading font-black text-gray-500 uppercase tracking-widest border-b border-gray-100 dark:border-white/5 pb-2">
              Social Presence
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-heading font-black text-gray-500 uppercase tracking-widest mb-1.5">
                  Twitter/X Handle
                </label>
                <input
                  type="text"
                  required
                  value={formData.twitterHandle}
                  onChange={(e) => setFormData({...formData, twitterHandle: e.target.value})}
                  placeholder="@username"
                  className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-3 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-heading font-black text-gray-500 uppercase tracking-widest mb-1.5">
                  Primary Profile Link
                </label>
                <input
                  type="url"
                  required
                  value={formData.primaryLink}
                  onChange={(e) => setFormData({...formData, primaryLink: e.target.value})}
                  placeholder="https://x.com/yourprofile"
                  className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-3 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-heading font-black text-gray-500 uppercase tracking-widest mb-1.5">
                  Primary Platform
                </label>
                <select
                  value={formData.primaryPlatform}
                  onChange={(e) => setFormData({...formData, primaryPlatform: e.target.value})}
                  className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-3 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                >
                  <option value="Twitter">X (Twitter)</option>
                  <option value="YouTube">YouTube</option>
                  <option value="Telegram">Telegram</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="TikTok">TikTok</option>
                  <option value="Instagram">Instagram</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-heading font-black text-gray-500 uppercase tracking-widest mb-1.5">
                  Audience Size
                </label>
                <select
                  value={formData.audienceSize}
                  onChange={(e) => setFormData({...formData, audienceSize: e.target.value})}
                  className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-3 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                >
                  <option value="<1k">Under 1,000</option>
                  <option value="1k-5k">1,000 - 5,000</option>
                  <option value="5k-20k">5,000 - 20,000</option>
                  <option value="20k+">20,000+</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. Sales & Motivation */}
          <div className="bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-white/5 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
            <h3 className="text-[11px] font-heading font-black text-gray-500 uppercase tracking-widest border-b border-gray-100 dark:border-white/5 pb-2">
              Sales & Motivation
            </h3>
            <div>
              <label className="block text-[10px] font-heading font-black text-gray-500 uppercase tracking-widest mb-1.5">
                Why are you interested in Vanguard?
              </label>
              <textarea
                required
                rows={2}
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                placeholder="I love RhizaCore's vision and want to..."
                className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-3 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all resize-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-heading font-black text-gray-500 uppercase tracking-widest mb-1.5">
                  Projected Monthly Sales / Volume
                </label>
                <select
                  value={formData.monthlySales}
                  onChange={(e) => setFormData({...formData, monthlySales: e.target.value})}
                  className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-3 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                >
                  <option value="<$100">Under $100</option>
                  <option value="$100-$1000">$100 - $1,000</option>
                  <option value="$1k-$5k">$1,000 - $5,000</option>
                  <option value="$5k+">$5,000+</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-heading font-black text-gray-500 uppercase tracking-widest mb-1.5">
                  Expected Monthly Engagement (Salary Tier)
                </label>
                <select
                  value={formData.expectedEngagement}
                  onChange={(e) => setFormData({...formData, expectedEngagement: e.target.value})}
                  className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-3 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                >
                  <option value="<1k views">Under 1,000 Views</option>
                  <option value="1k-10k views">1,000 - 10,000 Views</option>
                  <option value="10k-50k views">10,000 - 50,000 Views</option>
                  <option value="50k+ views">50,000+ Views</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-heading font-black text-gray-500 uppercase tracking-widest mb-1.5">
                How did you hear about us?
              </label>
              <select
                value={formData.referralSource}
                onChange={(e) => setFormData({...formData, referralSource: e.target.value})}
                className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-3 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
              >
                <option value="Social Media">Social Media</option>
                <option value="Friend/Colleague">Friend/Colleague</option>
                <option value="Web Search">Web Search</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* 4. Verification & Terms */}
          <div className="bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-white/5 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
            <h3 className="text-[11px] font-heading font-black text-gray-500 uppercase tracking-widest border-b border-gray-100 dark:border-white/5 pb-2">
              Verification
            </h3>
            <div>
              <label className="block text-[10px] font-heading font-black text-gray-500 uppercase tracking-widest mb-1.5">
                Introductory Video Link (Required)
              </label>
              <p className="text-[9px] text-gray-500 dark:text-gray-400 mb-2">
                Provide a link to a short video introducing RhizaCore to your audience. This is required for approval.
              </p>
              <div className="relative">
                <Video size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="url"
                  required
                  value={formData.videoLink}
                  onChange={(e) => setFormData({...formData, videoLink: e.target.value})}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl pl-9 pr-3.5 py-3 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 shadow-sm">
            <label className="flex items-start gap-3 cursor-pointer">
              <div className="relative flex items-center justify-center mt-0.5">
                <input
                  type="checkbox"
                  required
                  checked={formData.agreedToTerms}
                  onChange={(e) => setFormData({...formData, agreedToTerms: e.target.checked})}
                  className="peer w-4 h-4 rounded border-amber-300 dark:border-amber-500/30 bg-white dark:bg-black/20 text-amber-500 focus:ring-amber-500/20 appearance-none transition-all cursor-pointer"
                />
                <CheckCircle2 size={12} className="absolute text-white dark:text-black opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                <div className="absolute inset-0 rounded bg-amber-500 opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none -z-10" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-heading font-black text-amber-900 dark:text-amber-400 uppercase tracking-widest">
                  Ambassador Agreement
                </p>
                <p className="text-[9px] font-body text-amber-700 dark:text-amber-500/80 mt-1 leading-relaxed">
                  I agree to represent RhizaCore professionally. I understand that my content will be reviewed and fake engagement or spam will result in immediate termination of Vanguard status and forfeiture of rewards.
                </p>
              </div>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !formData.agreedToTerms}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-white py-3.5 rounded-xl text-xs font-heading font-black uppercase tracking-widest transition-all shadow-md shadow-amber-500/20"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck size={16} />
                Submit Application
              </>
            )}
          </button>
        </form>
      </div>
    );
  }

  // 2. ONBOARDING (MANDATORY SOCIAL CHANNELS)
  if (viewState === 'onboarding') {
    return (
      <div className="max-w-xl mx-auto space-y-6 pb-24 page-enter px-3 sm:px-4 md:px-0">
        <div className="pt-6 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mx-auto mb-2 text-emerald-500">
            <CheckCircle2 size={32} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-black tracking-widest text-gray-950 dark:text-white uppercase">
            Application Received
          </h1>
          <p className="text-[11px] sm:text-xs font-body text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
            Your application is under review. While you wait, you <span className="font-bold text-gray-800 dark:text-gray-200">MUST</span> join our official ambassador channels to receive task updates and communicate with admins.
          </p>
        </div>

        <div className="space-y-3">
          <a
            href="https://chat.whatsapp.com/your-whatsapp-link"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 bg-green-50 dark:bg-[#25D366]/10 border border-green-200 dark:border-[#25D366]/20 rounded-2xl hover:scale-[1.02] transition-transform"
          >
            <div className="w-12 h-12 rounded-xl bg-[#25D366] flex items-center justify-center shrink-0 shadow-lg shadow-[#25D366]/20">
              <MessageSquare size={24} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-heading font-black text-gray-900 dark:text-white uppercase tracking-widest">
                Vanguard WhatsApp
              </h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                Official communication and direct admin support.
              </p>
            </div>
            <ArrowRight size={16} className="text-gray-400 shrink-0" />
          </a>

          <a
            href="https://t.me/rhizacore"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-[#0088cc]/10 border border-blue-200 dark:border-[#0088cc]/20 rounded-2xl hover:scale-[1.02] transition-transform"
          >
            <div className="w-12 h-12 rounded-xl bg-[#0088cc] flex items-center justify-center shrink-0 shadow-lg shadow-[#0088cc]/20">
              <MessageCircle size={24} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-heading font-black text-gray-900 dark:text-white uppercase tracking-widest">
                Official Telegram
              </h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                Join the main RhizaCore community channel.
              </p>
            </div>
            <ArrowRight size={16} className="text-gray-400 shrink-0" />
          </a>
        </div>

        <button
          onClick={completeOnboarding}
          className="w-full flex items-center justify-center gap-2 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-black py-4 rounded-xl text-xs font-heading font-black uppercase tracking-widest transition-all mt-4"
        >
          I have joined all channels <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  // 3. DASHBOARD
  return (
    <div className="max-w-xl mx-auto space-y-6 pb-24 page-enter px-3 sm:px-4 md:px-0">
      
      {/* ── Page Header ── */}
      <div className="pt-1 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-black tracking-widest text-gray-950 dark:text-white uppercase flex items-center gap-2">
            <Crown className="text-amber-500" size={24} />
            Vanguard
          </h1>
          <p className="text-[11px] font-body text-gray-500 dark:text-gray-500 mt-0.5">
            Ambassador Dashboard
          </p>
        </div>
        <div className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <span className="text-[9px] font-heading font-black text-amber-500 uppercase tracking-widest">
            Active
          </span>
        </div>
      </div>

      {/* ── Referral Network Stats ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Level 1 */}
        <div className="bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-white/5 rounded-xl p-4 flex flex-col items-center text-center shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-2">
            <Users className="text-emerald-500" size={16} />
          </div>
          <p className="text-2xl font-numbers font-black text-gray-900 dark:text-white">
            {dashboardLoading ? '-' : level1Count}
          </p>
          <p className="text-[9px] font-heading font-black text-gray-500 uppercase tracking-widest mt-1">
            Level 1 (Direct)
          </p>
        </div>

        {/* Level 2 */}
        <div className="bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-white/5 rounded-xl p-4 flex flex-col items-center text-center shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center mb-2">
            <Share2 className="text-blue-500" size={16} />
          </div>
          <p className="text-2xl font-numbers font-black text-gray-900 dark:text-white">
            {dashboardLoading ? '-' : level2Count}
          </p>
          <p className="text-[9px] font-heading font-black text-gray-500 uppercase tracking-widest mt-1">
            Level 2 (Indirect)
          </p>
        </div>
      </div>

      {/* ── Ambassador Tasks ── */}
      <div>
        <h3 className="text-[11px] font-heading font-black text-gray-500 uppercase tracking-widest mb-3 px-1">
          Active Campaigns
        </h3>
        <div className="space-y-3">
          {VANGUARD_TASKS.map((task) => {
            const isSelected = selectedTask === task.id;
            const Icon = task.icon;

            return (
              <div 
                key={task.id}
                className={`bg-white/50 dark:bg-black/20 border rounded-xl overflow-hidden shadow-sm transition-all ${
                  isSelected ? 'border-amber-500/30 ring-1 ring-amber-500/20' : 'border-gray-200 dark:border-white/5'
                }`}
              >
                {/* Task Header */}
                <div 
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  onClick={() => setSelectedTask(isSelected ? null : task.id)}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${task.bg}`}>
                    <Icon size={18} className={task.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-heading font-black text-gray-900 dark:text-white uppercase tracking-widest truncate">
                        {task.title}
                      </p>
                      <span className="text-[10px] font-numbers font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full shrink-0">
                        {task.reward}
                      </span>
                    </div>
                    <p className="text-[10px] font-body text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                      {task.description}
                    </p>
                  </div>
                  <ChevronRight 
                    size={16} 
                    className={`text-gray-400 transition-transform duration-300 ${isSelected ? 'rotate-90' : ''}`} 
                  />
                </div>

                {/* Task Submission Form */}
                {isSelected && (
                  <div className="p-3 pt-0 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                    <form onSubmit={handleTaskSubmit} className="mt-3 space-y-3">
                      <div>
                        <label className="block text-[10px] font-heading font-black text-gray-500 uppercase tracking-widest mb-1.5">
                          Submit {task.linkType}
                        </label>
                        <input
                          type="url"
                          required
                          value={submissionLink}
                          onChange={(e) => setSubmissionLink(e.target.value)}
                          placeholder={`https://...`}
                          className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-3 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isSubmitting || !submissionLink.trim()}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-white disabled:text-gray-500 py-3 rounded-xl text-[11px] font-heading font-black uppercase tracking-widest transition-all shadow-md shadow-amber-500/20"
                      >
                        {isSubmitting ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Upload size={14} />
                            Submit Proof
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default Vanguard;
