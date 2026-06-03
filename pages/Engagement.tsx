
import React, { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { supabaseService } from '../services/supabaseService';
import {
  Rocket, CheckCircle2, Clock, XCircle, Shield, Zap, Users,
  ArrowRight, AlertCircle, Wallet, Globe, Mail, User, Phone,
  RefreshCw, Star, TrendingUp, Lock, ChevronRight, Copy, Check
} from 'lucide-react';

type EngagementStatus = 'idle' | 'loading' | 'submitted' | 'verified' | 'rejected' | 'error';

interface EngagementForm {
  full_name: string;
  email: string;
  telegram: string;
  phone: string;
  country: string;
  wallet_address: string;
  rzc_balance_claim: string;
  premining_amount: string;
  rzc_migrated: string;
  coins_bought: string;
  hear_about: string;
  has_balance_issue: boolean | null;  // null = unanswered
  balance_issue_query: string;
  agree_terms: boolean;
}

const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria',
  'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
  'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Côte d\'Ivoire', 'Cabo Verde',
  'Cambodia', 'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo (Congo-Brazzaville)',
  'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czechia (Czech Republic)', 'Democratic Republic of the Congo', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic',
  'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland',
  'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea',
  'Guinea-Bissau', 'Guyana', 'Haiti', 'Holy See', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran',
  'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati',
  'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania',
  'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius',
  'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia',
  'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway',
  'Oman', 'Pakistan', 'Palau', 'Palestine State', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland',
  'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino',
  'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands',
  'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland',
  'Syria', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey',
  'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu',
  'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe', 'Other'
];

const HEAR_ABOUT_OPTIONS = [
  'Telegram', 'Twitter/X', 'YouTube', 'Friend/Referral',
  'Discord', 'LinkedIn', 'Google Search', 'Other'
];

const Engagement: React.FC = () => {
  const { address, userProfile, rzcPrice } = useWallet();
  const [status, setStatus] = useState<EngagementStatus>('idle');
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<EngagementForm>({
    full_name: userProfile?.name || '',
    email: userProfile?.email || '',
    telegram: '',
    phone: '',
    country: '',
    wallet_address: address || '',
    rzc_balance_claim: '',
    premining_amount: '',
    rzc_migrated: '',
    coins_bought: '',
    hear_about: '',
    has_balance_issue: null,
    balance_issue_query: '',
    agree_terms: false,
  });
  const [existingRecord, setExistingRecord] = useState<any>(null);
  const [errors, setErrors] = useState<Partial<EngagementForm>>({});
  const [copied, setCopied] = useState(false);
  const [balanceVerifying, setBalanceVerifying] = useState(false);
  const [balanceResult, setBalanceResult] = useState<'verified' | 'mismatch' | null>(null);
  const [liveRzcBalance, setLiveRzcBalance] = useState<number | null>(null);
  const [countryOpen, setCountryOpen] = useState(false);

  // Close country dropdown on outside click
  useEffect(() => {
    if (!countryOpen) return;
    const close = () => setCountryOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [countryOpen]);

  // Load existing submission on mount
  useEffect(() => {
    if (!address) return;
    const load = async () => {
      try {
        const client = supabaseService.getClient();
        if (!client) return;
        const { data } = await client
          .from('mainnet_engagement')
          .select('*')
          .eq('wallet_address', address)
          .single();
        if (data) {
          setExistingRecord(data);
          setStatus(data.status === 'verified' ? 'verified' : data.status === 'rejected' ? 'rejected' : 'submitted');
        }
      } catch { /* no record yet */ }
    };
    load();
  }, [address]);

  // Pre-fill wallet address
  useEffect(() => {
    if (address) setForm(f => ({ ...f, wallet_address: address }));
    if (userProfile?.name) setForm(f => ({ ...f, full_name: userProfile.name || '' }));
  }, [address, userProfile]);

  const validateStep = (currentStep: number) => {
    const errs: Partial<EngagementForm> = {};
    if (currentStep === 1) {
      if (!form.full_name.trim()) errs.full_name = 'Name is required';
      if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Valid email required';
      if (!form.country) errs.country = 'Country is required';
    } else if (currentStep === 2) {
      if (!form.wallet_address.trim()) errs.wallet_address = 'Wallet address is required';
      if (!form.rzc_balance_claim.trim() || isNaN(Number(form.rzc_balance_claim))) errs.rzc_balance_claim = 'Enter your RZC balance';
      if (form.premining_amount && isNaN(Number(form.premining_amount))) errs.premining_amount = 'Must be a valid number';
      if (form.rzc_migrated && isNaN(Number(form.rzc_migrated))) errs.rzc_migrated = 'Must be a valid number';
      if (form.coins_bought && isNaN(Number(form.coins_bought))) errs.coins_bought = 'Must be a valid number';
    } else if (currentStep === 3) {
      if (form.has_balance_issue === null) (errs as any).has_balance_issue = 'Please answer the balance issue question';
      if (form.has_balance_issue && !form.balance_issue_query.trim()) (errs as any).balance_issue_query = 'Please describe your balance issue';
      if (!form.hear_about) errs.hear_about = 'Please select an option';
      if (!form.agree_terms) errs.agree_terms = 'You must agree to terms' as any;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(s => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    setStep(s => s - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(3)) return;
    setStatus('loading');
    try {
      const client = supabaseService.getClient();
      if (!client) throw new Error('Supabase not configured');
      const payload = {
        full_name: form.full_name,
        email: form.email,
        telegram: form.telegram || null,
        phone: form.phone || null,
        country: form.country,
        wallet_address: form.wallet_address,
        hear_about: form.hear_about || null,
        has_balance_issue: form.has_balance_issue ?? false,
        balance_issue_query: form.has_balance_issue ? (form.balance_issue_query || null) : null,
        rzc_balance_claim: parseFloat(form.rzc_balance_claim),
        premining_amount: form.premining_amount ? parseFloat(form.premining_amount) : 0,
        rzc_migrated: form.rzc_migrated ? parseFloat(form.rzc_migrated) : 0,
        coins_bought: form.coins_bought ? parseFloat(form.coins_bought) : 0,
        status: 'pending',
        submitted_at: new Date().toISOString(),
      };
      const { error } = await client
        .from('mainnet_engagement')
        .upsert(payload, { onConflict: 'wallet_address' });
      if (error) throw error;
      setExistingRecord(payload);
      setStatus('submitted');
    } catch (err: any) {
      console.error('Engagement submit error:', err);
      setStatus('error');
    }
  };

  const handleVerifyBalance = async () => {
    setBalanceVerifying(true);
    setBalanceResult(null);
    try {
      // Fetch live RZC balance from supabase profile
      const profile = await supabaseService.getProfile(address || '');
      if (profile.success && profile.data) {
        const live = Number(profile.data.rzc_balance ?? 0);
        setLiveRzcBalance(live);
        const claimed = parseFloat(form.rzc_balance_claim || '0');
        const diff = Math.abs(live - claimed) / Math.max(live, 1);
        setBalanceResult(diff <= 0.1 ? 'verified' : 'mismatch');
      }
    } catch (err) {
      console.error('Balance verify error:', err);
    }
    setBalanceVerifying(false);
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(form.wallet_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const field = (id: keyof EngagementForm, label: string, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-[10px] font-black text-slate-700 dark:text-gray-300 mb-1 uppercase tracking-widest">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={form[id] as string}
        onChange={e => {
          setForm(f => ({ ...f, [id]: e.target.value }));
          if (errors[id]) setErrors(errs => ({ ...errs, [id]: undefined }));
        }}
        placeholder={placeholder}
        className={`w-full px-3 py-2.5 rounded-lg border bg-white/50 dark:bg-black/20 text-slate-900 dark:text-white text-xs transition-all outline-none
          ${errors[id] ? 'border-red-500/50' : 'border-slate-200 dark:border-white/10 focus:border-emerald-500/50'}`}
      />
      {errors[id] && <p className="text-red-500 text-[10px] mt-1 font-semibold">{errors[id]}</p>}
    </div>
  );

  // ── Status screens ──────────────────────────────────────────────────────────
  if (status === 'submitted' || status === 'verified' || status === 'rejected') {
    const cfg = {
      submitted: {
        icon: Clock, color: 'amber', bg: 'from-amber-500/10 to-orange-500/10',
        border: 'border-amber-500/20', iconBg: 'bg-amber-500',
        title: 'Application Received!', badge: 'Under Review',
        msg: 'Your mainnet engagement application has been submitted. Our team will verify your RZC balance and contact you within 24–48 hours.',
      },
      verified: {
        icon: CheckCircle2, color: 'emerald', bg: 'from-emerald-500/10 to-teal-500/10',
        border: 'border-emerald-500/20', iconBg: 'bg-emerald-500',
        title: 'Balance Verified!', badge: 'Approved',
        msg: 'Congratulations! Your RZC balance has been verified. You are now eligible for the RhizaCore mainnet phase.',
      },
      rejected: {
        icon: XCircle, color: 'red', bg: 'from-red-500/10 to-rose-500/10',
        border: 'border-red-500/20', iconBg: 'bg-red-500',
        title: 'Verification Failed', badge: 'Rejected',
        msg: 'Your application was not approved. Please ensure your RZC balance matches and resubmit.',
      },
    }[status];
    const Icon = cfg.icon;
    return (
      <div className="max-w-xl mx-auto px-3 sm:px-0 py-6 space-y-5 animate-in fade-in duration-500">
        <div className={`p-4 sm:p-5 rounded-2xl bg-gradient-to-br ${cfg.bg} border ${cfg.border} text-center space-y-3`}>
          <div className={`w-12 h-12 ${cfg.iconBg} rounded-2xl flex items-center justify-center mx-auto shadow-lg`}>
            <Icon size={24} className="text-white" />
          </div>
          <div>
            <span className={`inline-block text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-${cfg.color}-500/15 text-${cfg.color}-600 dark:text-${cfg.color}-400 mb-1.5`}>
              {cfg.badge}
            </span>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight">{cfg.title}</h2>
            <p className="text-xs text-slate-600 dark:text-gray-400 mt-1.5 leading-relaxed">{cfg.msg}</p>
          </div>
          {existingRecord && (
            <div className="bg-white/50 dark:bg-white/5 rounded-xl p-3 sm:p-4 text-left space-y-1.5">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-500 mb-1.5">Submission Details</p>
              {[
                ['Name', existingRecord.full_name],
                ['Email', existingRecord.email],
                ['RZC Claimed', `${parseFloat(existingRecord.rzc_balance_claim || '0').toLocaleString()} RZC`],
                ['Pre-Mining', `${parseFloat(existingRecord.premining_amount || '0').toLocaleString()} RZC`],
                ['Migrated', `${parseFloat(existingRecord.rzc_migrated || '0').toLocaleString()} RZC`],
                ['Bought', `${parseFloat(existingRecord.coins_bought || '0').toLocaleString()} RZC`],
                ['Submitted', new Date(existingRecord.submitted_at).toLocaleDateString()],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-gray-500 font-semibold">{k}</span>
                  <span className="text-slate-800 dark:text-gray-200 font-bold">{v}</span>
                </div>
              ))}
            </div>
          )}
          {status === 'rejected' && (
            <button
              onClick={() => { setStatus('idle'); setExistingRecord(null); }}
              className="px-5 py-2.5 rounded-xl bg-red-500 text-white text-[11px] font-black hover:bg-red-600 active:scale-95 transition-all"
            >
              Resubmit Application
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Main Form ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-xl mx-auto px-3 sm:px-0 py-4 space-y-5 animate-in fade-in duration-500">

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-4 sm:p-5 text-white shadow-xl shadow-emerald-500/20">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-white/5 rounded-full blur-xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
              <Rocket size={14} className="text-white" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full">
              Phase: Mainnet
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black leading-tight mb-1.5">
            RhizaCore Mainnet<br />Engagement Program
          </h1>
          <p className="text-xs text-white/80 leading-relaxed mb-3">
            Register your interest for the mainnet launch. Verify your RZC holdings to secure your position and unlock early access benefits.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-[10px] text-white/70">
            <span className="flex items-center gap-1"><Users size={10} /> Early Access</span>
            <span className="flex items-center gap-1"><Shield size={10} /> Verified</span>
            <span className="flex items-center gap-1"><Zap size={10} /> ${rzcPrice} / RZC</span>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'RZC Price', value: `$${rzcPrice}`, icon: TrendingUp, color: 'emerald' },
          { label: 'Phase', value: 'Mainnet', icon: Rocket, color: 'blue' },
          { label: 'Status', value: 'Open', icon: Star, color: 'amber' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`p-2 rounded-xl bg-${color}-50 dark:bg-${color}-500/10 border border-${color}-200 dark:border-${color}-500/20 text-center`}>
            <Icon size={12} className={`text-${color}-600 dark:text-${color}-400 mx-auto mb-0.5`} />
            <p className={`text-[11px] font-black text-${color}-700 dark:text-${color}-300 leading-tight`}>{value}</p>
            <p className={`text-[8px] font-semibold text-${color}-500/70 uppercase tracking-widest`}>{label}</p>
          </div>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white/50 dark:bg-[#0a0a0a]/50 border border-slate-200 dark:border-white/5 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm relative overflow-hidden">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100 dark:bg-white/5">
          <div 
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <div>
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
            Registration Form <span className="text-slate-400 font-medium ml-2">Step {step} of 3</span>
          </h2>
          <p className="text-[10px] text-slate-500 dark:text-gray-500 mt-0.5">
            {step === 1 ? 'Fill in your personal details' : step === 2 ? 'Verify your wallet and balance' : 'Final details and submission'}
          </p>
        </div>

        {/* Step 1: Personal Info */}
        {step === 1 && (
          <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-600 flex items-center gap-1.5">
              <User size={10} /> Personal Information
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {field('full_name', 'Full Name *', 'text', 'Your legal name')}
              {field('email', 'Email Address *', 'email', 'you@example.com')}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {field('telegram', 'Telegram Handle', 'text', '@username (optional)')}
              {field('phone', 'Phone Number', 'tel', '+1 234 567 8900 (optional)')}
            </div>

            {/* Country selector */}
            <div className="relative">
              <label className="block text-[10px] font-black text-slate-700 dark:text-gray-300 mb-1 uppercase tracking-widest">
                Country *
              </label>
              <button
                type="button"
                onClick={() => setCountryOpen(o => !o)}
                className={`w-full px-3 py-2.5 rounded-lg border bg-white/50 dark:bg-black/20 text-xs transition-all outline-none text-left flex items-center justify-between
                  ${errors.country ? 'border-red-500/50' : 'border-slate-200 dark:border-white/10 focus:border-emerald-500/50'}
                  ${form.country ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-gray-600'}`}
              >
                <span>{form.country || 'Select your country...'}</span>
                <ChevronRight size={12} className={`text-slate-400 transition-transform ${countryOpen ? 'rotate-90' : ''}`} />
              </button>
              {countryOpen && (
                <div
                  onMouseDown={e => e.stopPropagation()}
                  className="absolute z-50 mt-1 w-full bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl max-h-52 overflow-y-auto"
                >                {COUNTRIES.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setForm(f => ({ ...f, country: c }));
                      setCountryOpen(false);
                      if (errors.country) setErrors(errs => ({ ...errs, country: undefined }));
                    }}
                    className={`w-full px-3 py-2 text-left text-xs transition-colors
                        ${form.country === c
                        ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold'
                        : 'text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                  >
                    {c}
                  </button>
                ))}
                </div>
              )}
              {errors.country && <p className="text-red-500 text-[10px] mt-1 font-semibold">{errors.country}</p>}
            </div>
          </div>
        )}

        {/* Step 2: Wallet & Balance */}
        {step === 2 && (
          <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-600 flex items-center gap-1.5">
              <Wallet size={10} /> Wallet & Balance
            </p>

            {/* Wallet Address (auto-filled, read-only) */}
            <div>
              <label className="block text-[10px] font-black text-slate-700 dark:text-gray-300 mb-1 uppercase tracking-widest">
                Wallet Address *
              </label>
              <div className="flex gap-1.5">
                <div className="flex-1 px-3 py-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-slate-900 dark:text-white text-xs font-mono truncate">
                  {form.wallet_address || 'Not connected'}
                </div>
                <button
                  type="button"
                  onClick={copyAddress}
                  className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-black/20 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
                >
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-slate-400" />}
                </button>
              </div>
              <p className="text-[9px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold flex items-center gap-1">
                <Shield size={8} /> Auto-filled from your connected wallet
              </p>
            </div>

            {/* RZC Balance Claim */}
            <div>
              <label className="block text-[10px] font-black text-slate-700 dark:text-gray-300 mb-1 uppercase tracking-widest">
                Your RZC Balance *
              </label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.rzc_balance_claim}
                  onChange={e => {
                    setForm(f => ({ ...f, rzc_balance_claim: e.target.value }));
                    setBalanceResult(null);
                    if (errors.rzc_balance_claim) setErrors(errs => ({ ...errs, rzc_balance_claim: undefined }));
                  }}
                  placeholder="e.g. 5000"
                  className={`flex-1 px-3 py-2.5 rounded-lg border bg-white/50 dark:bg-black/20 text-slate-900 dark:text-white text-xs transition-all outline-none
                    ${errors.rzc_balance_claim ? 'border-red-500/50' : 'border-slate-200 dark:border-white/10 focus:border-emerald-500/50'}`}
                />
                <button
                  type="button"
                  onClick={handleVerifyBalance}
                  disabled={balanceVerifying || !form.rzc_balance_claim}
                  className="px-3 py-2.5 rounded-lg bg-emerald-500 text-white text-[11px] font-black hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-1 whitespace-nowrap"
                >
                  {balanceVerifying ? <RefreshCw size={12} className="animate-spin" /> : <Shield size={12} />}
                  Verify
                </button>
              </div>
              {errors.rzc_balance_claim && <p className="text-red-500 text-[10px] mt-1 font-semibold">{errors.rzc_balance_claim}</p>}

              {/* Balance Verification Result */}
              {balanceResult === 'verified' && (
                <div className="mt-2 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">Balance Verified!</p>
                    <p className="text-[9px] text-emerald-600/80 dark:text-emerald-400/70">
                      On-chain balance: {liveRzcBalance?.toLocaleString()} RZC ≈ ${((liveRzcBalance || 0) * rzcPrice).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
              {balanceResult === 'mismatch' && (
                <div className="mt-2 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertCircle size={12} className="text-red-500 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-red-600 dark:text-red-400">Balance Mismatch</p>
                    <p className="text-[9px] text-red-600/80 dark:text-red-400/70">
                      Your on-chain balance is {liveRzcBalance?.toLocaleString()} RZC. Please correct your entry.
                    </p>
                  </div>
                </div>
              )}

              {form.rzc_balance_claim && !isNaN(Number(form.rzc_balance_claim)) && (
                <p className="text-[9px] text-slate-500 dark:text-gray-500 mt-1">
                  ≈ ${(parseFloat(form.rzc_balance_claim) * rzcPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })} USD at current price
                </p>
              )}
            </div>

            {/* Pre-mining Season Amount */}
            <div>
              <label className="block text-[10px] font-black text-slate-700 dark:text-gray-300 mb-1 uppercase tracking-widest">
                Pre-Mining Season RZC <span className="text-slate-400 dark:text-gray-600 font-normal normal-case tracking-normal">(optional)</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.premining_amount}
                onChange={e => {
                  setForm(f => ({ ...f, premining_amount: e.target.value }));
                  if (errors.premining_amount) setErrors(errs => ({ ...errs, premining_amount: undefined }));
                }}
                placeholder="Total RZC mined during pre-mining season"
                className={`w-full px-3 py-2.5 rounded-lg border bg-white/50 dark:bg-black/20 text-slate-900 dark:text-white text-xs transition-all outline-none
                  ${errors.premining_amount ? 'border-red-500/50' : 'border-slate-200 dark:border-white/10 focus:border-emerald-500/50'}`}
              />
              {errors.premining_amount && <p className="text-red-500 text-[10px] mt-1 font-semibold">{errors.premining_amount}</p>}
              <p className="text-[9px] text-slate-400 dark:text-gray-600 mt-1">
                ⛏️ Enter the total RZC you accumulated during the pre-mining / early mining season. Leave blank if you did not participate.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* RZC Coins Migrated */}
              <div>
                <label className="block text-[10px] font-black text-slate-700 dark:text-gray-300 mb-1 uppercase tracking-widest">
                  RZC Coins Migrated <span className="text-slate-400 dark:text-gray-600 font-normal normal-case tracking-normal">(optional)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.rzc_migrated}
                  onChange={e => {
                    setForm(f => ({ ...f, rzc_migrated: e.target.value }));
                    if (errors.rzc_migrated) setErrors(errs => ({ ...errs, rzc_migrated: undefined }));
                  }}
                  placeholder="e.g. 1000"
                  className={`w-full px-3 py-2.5 rounded-lg border bg-white/50 dark:bg-black/20 text-slate-900 dark:text-white text-xs transition-all outline-none
                    ${errors.rzc_migrated ? 'border-red-500/50' : 'border-slate-200 dark:border-white/10 focus:border-emerald-500/50'}`}
                />
                {errors.rzc_migrated && <p className="text-red-500 text-[10px] mt-1 font-semibold">{errors.rzc_migrated}</p>}
              </div>

              {/* RZC Coins Bought */}
              <div>
                <label className="block text-[10px] font-black text-slate-700 dark:text-gray-300 mb-1 uppercase tracking-widest">
                  RZC Coins Bought <span className="text-slate-400 dark:text-gray-600 font-normal normal-case tracking-normal">(optional)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.coins_bought}
                  onChange={e => {
                    setForm(f => ({ ...f, coins_bought: e.target.value }));
                    if (errors.coins_bought) setErrors(errs => ({ ...errs, coins_bought: undefined }));
                  }}
                  placeholder="e.g. 5000"
                  className={`w-full px-3 py-2.5 rounded-lg border bg-white/50 dark:bg-black/20 text-slate-900 dark:text-white text-xs transition-all outline-none
                    ${errors.coins_bought ? 'border-red-500/50' : 'border-slate-200 dark:border-white/10 focus:border-emerald-500/50'}`}
                />
                {errors.coins_bought && <p className="text-red-500 text-[10px] mt-1 font-semibold">{errors.coins_bought}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Source, Issues, and Terms */}
        {step === 3 && (
          <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
            {/* Section: Source */}
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-600 flex items-center gap-1.5">
                <Globe size={10} /> Discovery
              </p>
              <div>
                <label className="block text-[10px] font-black text-slate-700 dark:text-gray-300 mb-1 uppercase tracking-widest">
                  How did you hear about us? *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {HEAR_ABOUT_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setForm(f => ({ ...f, hear_about: opt }));
                        if (errors.hear_about) setErrors(errs => ({ ...errs, hear_about: undefined }));
                      }}
                      className={`px-2 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all
                        ${form.hear_about === opt
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-500 hover:border-slate-300 dark:hover:border-white/20'
                        }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                {errors.hear_about && <p className="text-red-500 text-[10px] mt-1 font-semibold">{errors.hear_about}</p>}
              </div>
            </div>

            {/* Section: Balance Issue */}
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-600 flex items-center gap-1.5">
                <AlertCircle size={10} /> Balance Issue
              </p>
              <div>
                <label className="block text-[10px] font-black text-slate-700 dark:text-gray-300 mb-1.5 uppercase tracking-widest">
                  Do you have an issue with your RZC balance? *
                </label>
                <div className="flex gap-2">
                  {[{ val: false, label: 'No, all good', color: 'emerald' }, { val: true, label: 'Yes, issue', color: 'red' }].map(({ val, label, color }) => (
                    <button
                      key={String(val)}
                      type="button"
                      onClick={() => {
                        setForm(f => ({ ...f, has_balance_issue: val, balance_issue_query: val ? f.balance_issue_query : '' }));
                        if ((errors as any).has_balance_issue) setErrors(errs => ({ ...errs, has_balance_issue: undefined }));
                      }}
                      className={`flex-1 py-2 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all
                        ${form.has_balance_issue === val
                          ? `border-${color}-500/50 bg-${color}-500/10 text-${color}-600 dark:text-${color}-400`
                          : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-500 hover:border-slate-300 dark:hover:border-white/20'}`}
                    >
                      {val ? '⚠️ ' : '✅ '}{label}
                    </button>
                  ))}
                </div>
                {(errors as any).has_balance_issue && (
                  <p className="text-red-500 text-[10px] mt-1 font-semibold">{(errors as any).has_balance_issue}</p>
                )}
              </div>

              {/* Conditional query textbox */}
              {form.has_balance_issue === true && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="block text-[10px] font-black text-slate-700 dark:text-gray-300 mb-1 uppercase tracking-widest">
                    Describe your balance issue *
                  </label>
                  <textarea
                    rows={3}
                    value={form.balance_issue_query}
                    onChange={e => {
                      setForm(f => ({ ...f, balance_issue_query: e.target.value }));
                      if ((errors as any).balance_issue_query) setErrors(errs => ({ ...errs, balance_issue_query: undefined }));
                    }}
                    placeholder="e.g. My RZC balance shows 0 but I purchased 5000 RZC..."
                    className={`w-full px-3 py-2.5 rounded-lg border bg-white/50 dark:bg-black/20 text-slate-900 dark:text-white text-xs transition-all outline-none resize-none
                      ${(errors as any).balance_issue_query ? 'border-red-500/50' : 'border-slate-200 dark:border-white/10 focus:border-red-500/50'}`}
                  />
                  {(errors as any).balance_issue_query && (
                    <p className="text-red-500 text-[10px] mt-1 font-semibold">{(errors as any).balance_issue_query}</p>
                  )}
                  <p className="text-[9px] text-slate-400 dark:text-gray-600 mt-1">
                    Include any relevant transaction IDs, dates, or amounts to help us investigate.
                  </p>
                </div>
              )}
            </div>

            {/* Terms */}
            <div className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${errors.agree_terms ? 'border-red-500/50 bg-red-500/5' : 'border-slate-200 dark:border-white/10'}`}>
              <button
                type="button"
                onClick={() => {
                  setForm(f => ({ ...f, agree_terms: !f.agree_terms }));
                  if (errors.agree_terms) setErrors(errs => ({ ...errs, agree_terms: undefined }));
                }}
                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all
                  ${form.agree_terms ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-white/20'}`}
              >
                {form.agree_terms && <Check size={10} className="text-white" strokeWidth={3} />}
              </button>
              <p className="text-[11px] text-slate-600 dark:text-gray-400 leading-snug">
                I confirm that the information provided is accurate and I agree to the{' '}
                <a href="/terms" target="_blank" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="/privacy" target="_blank" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">Privacy Policy</a>.
                I understand that my RZC balance will be verified on-chain.
              </p>
            </div>
            
            {/* Error state */}
            {status === 'error' && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertCircle size={14} className="text-red-500 shrink-0" />
                <p className="text-xs font-semibold text-red-700 dark:text-red-300">
                  Submission failed. Please try again or contact support.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3 pt-2">
          {step > 1 && (
            <button
              type="button"
              onClick={handlePrev}
              className="flex-1 py-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-black/20 text-slate-700 dark:text-gray-300 font-black text-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
            >
              Back
            </button>
          )}
          
          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex-[2] py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-sm hover:from-emerald-600 hover:to-teal-700 active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
            >
              Continue <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={status === 'loading'}
              className="flex-[2] py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-sm hover:from-emerald-600 hover:to-teal-700 active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {status === 'loading' ? (
                <><RefreshCw size={14} className="animate-spin" /> Submitting...</>
              ) : (
                <><Rocket size={14} /> Register for Mainnet <ArrowRight size={14} /></>
              )}
            </button>
          )}
        </div>
      </form>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          {
            icon: Lock, color: 'blue',
            title: 'Secure Verification',
            desc: 'Your RZC balance is verified on-chain via the TON blockchain. No funds are moved.',
          },
          {
            icon: Star, color: 'amber',
            title: 'Early Access Benefits',
            desc: 'Verified participants get priority access to mainnet features and exclusive rewards.',
          },
        ].map(({ icon: Icon, color, title, desc }) => (
          <div key={title} className={`p-3 rounded-xl bg-${color}-50 dark:bg-${color}-500/10 border border-${color}-200 dark:border-${color}-500/20`}>
            <Icon size={14} className={`text-${color}-600 dark:text-${color}-400 mb-1.5`} />
            <p className={`text-[11px] font-black text-${color}-800 dark:text-${color}-300 mb-0.5`}>{title}</p>
            <p className={`text-[9px] text-${color}-700/80 dark:text-${color}-400/70 leading-relaxed`}>{desc}</p>
          </div>
        ))}
      </div>

    </div>
  );
};

export default Engagement;
