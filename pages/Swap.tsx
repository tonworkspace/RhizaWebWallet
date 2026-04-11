import React from 'react';
import {
  TrendingUp,
  ShieldCheck,
  Globe,
  ExternalLink,
  Sparkles,
  Coins,
  PieChart,
  Target,
  BarChart3,
  Rocket,
  CheckCircle2,
  Map
} from 'lucide-react';

// ─── Listing tokens (coming soon) ─────────────────────────────────────────────
const LISTING_TOKENS = [
  { symbol: 'BTC', icon: '₿', name: 'Bitcoin', category: 'Giants' },
  { symbol: 'ETH', icon: '⟠', name: 'Ethereum', category: 'Giants' },
  { symbol: 'BNB', icon: '🔶', name: 'BNB', category: 'Giants' },
  { symbol: 'PI', icon: '🥧', name: 'Pi Network', category: 'Community' },
  { symbol: 'DOGE', icon: '🐕', name: 'Dogecoin', category: 'Community' },
  { symbol: 'SHIB', icon: '🐕', name: 'Shiba Inu', category: 'Community' },
  { symbol: 'SOL', icon: '☀️', name: 'Solana', category: 'L1' },
  { symbol: 'SUI', icon: '💧', name: 'Sui', category: 'L1' },
  { symbol: 'AVAX', icon: '🔺', name: 'Avalanche', category: 'L1' },
  { symbol: 'APT', icon: '🔗', name: 'Aptos', category: 'L1' },
  { symbol: 'XRP', icon: '✖️', name: 'XRP', category: 'Utility' },
  { symbol: 'ADA', icon: '₳', name: 'Cardano', category: 'Utility' },
  { symbol: 'HBAR', icon: 'ℏ', name: 'Hedera', category: 'Utility' },
  { symbol: 'LINK', icon: '🔗', name: 'Chainlink', category: 'Utility' },
  { symbol: 'XLM', icon: '🚀', name: 'Stellar', category: 'Utility' },
  { symbol: 'NEAR', icon: 'Ⓝ', name: 'NEAR', category: 'Innovators' },
  { symbol: 'ONDO', icon: '🏛️', name: 'Ondo', category: 'Innovators' },
  { symbol: 'TAO', icon: '🧠', name: 'Bittensor', category: 'Innovators' },
  { symbol: 'RZC', icon: '⚡', name: 'RhizaCore', category: 'Native' },
  { symbol: 'TON', icon: '💎', name: 'Toncoin', category: 'Native' },
];

const Swap: React.FC = () => {
  return (
    <div className="max-w-lg mx-auto space-y-4 px-3 sm:px-4 md:px-0 pb-24 sm:pb-8">

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-heading font-black text-slate-900 dark:text-white uppercase tracking-widest leading-relaxed">Swap</h1>
        <p className="text-[11px] font-body text-slate-500 dark:text-gray-500 leading-relaxed mt-0.5">
          Live market updates — swap interface coming soon
        </p>
      </div>

      {/* ── Announcement card ──────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[1.5rem] border border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-secondary/10">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative p-5 sm:p-6 space-y-5">

          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
              <Sparkles size={22} className="text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-heading font-black uppercase tracking-widest px-2 py-0.5 bg-primary/20 text-primary rounded-full border border-primary/30">
                  Mainnet Loading
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-heading font-black text-slate-900 dark:text-white uppercase tracking-widest leading-tight">
                The Elite 20 — Coming to RhizaCore
              </h2>
              <p className="text-[11px] font-body text-slate-500 dark:text-gray-400 mt-1.5 leading-snug">
                Swap, store and manage the world's top utility assets in one place — including{' '}
                <span className="font-body font-bold text-primary">$PI Network</span>.
              </p>
            </div>
          </div>

          {/* Token grid */}
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {LISTING_TOKENS.map(t => (
              <div
                key={t.symbol}
                className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:border-primary/30 hover:bg-primary/5 transition-all cursor-default"
              >
                <span className="text-lg leading-none">{t.icon}</span>
                <span className="text-[9px] font-heading font-black text-slate-700 dark:text-white uppercase tracking-widest">${t.symbol}</span>
              </div>
            ))}
          </div>

          {/* Why section */}
          <div className="space-y-2">
            {[
              { icon: ShieldCheck, color: 'text-emerald-500', label: 'Trademarked Security', desc: 'RhizaCore™ — globally recognized non-custodial standard.' },
              { icon: Globe, color: 'text-blue-500', label: 'Global Distribution', desc: 'Connecting 50M+ Pi Pioneers and institutional traders.' },
              { icon: TrendingUp, color: 'text-primary', label: 'Ecosystem Staking', desc: 'Built-in StakersFi integration for passive yield.' },
            ].map(({ icon: Icon, color, label, desc }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center justify-center flex-shrink-0">
                  <Icon size={13} className={color} />
                </div>
                <div>
                  <p className="text-[11px] font-heading font-black text-slate-900 dark:text-white uppercase tracking-widest">{label}</p>
                  <p className="text-[10px] font-body text-slate-400 dark:text-gray-500 leading-relaxed mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quote */}
          <div className="p-3.5 rounded-xl bg-white/40 dark:bg-white/5 border-l-4 border-primary">
            <p className="text-[11px] font-body italic text-slate-600 dark:text-gray-300 leading-snug">
              "By including Pi, we are connecting with over 50 million Pioneers. RhizaCore Wallet isn't just a tool — it's a global distribution hub."
            </p>
            <p className="text-[10px] font-heading font-black text-slate-700 dark:text-white uppercase tracking-[0.2em] mt-2">— RhizaCore Board</p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <a
              href="https://www.RhizaCore.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 rounded-xl text-[10px] font-black text-slate-900 dark:text-white transition-all active:scale-95"
            >
              <Globe size={11} /> Official Website <ExternalLink size={10} className="opacity-60" />
            </a>
            <div className="px-3 py-2 bg-white/50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl text-[10px] font-mono text-slate-600 dark:text-gray-300">
              💬 help@Rhizacore.xyz
            </div>
            <div className="px-3 py-2 bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/10 rounded-xl text-[10px] font-heading font-black text-slate-700 dark:text-gray-200 uppercase tracking-[0.2em]">
              #RZC #PiNetwork
            </div>
          </div>
        </div>
      </div>

      {/* ── Token Profile Card ──────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[1.5rem] bg-white dark:bg-black border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
              <Coins size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-heading font-black text-slate-900 dark:text-white uppercase tracking-widest leading-tight">
                RhizaCore Token Profile
              </h2>
              <p className="text-[11px] font-body text-slate-500 dark:text-gray-400 mt-1.5">
                The native currency powering the ecosystem
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Token Name', value: 'RhizaCore' },
              { label: 'Ticker Symbol', value: '$RZC' },
              { label: 'Max Supply', value: '21,000,000 RZC' },
              { label: 'Network', value: 'TON (native)' },
            ].map(item => (
              <div key={item.label} className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                <p className="text-[9px] font-heading font-black uppercase tracking-widest text-slate-400 dark:text-gray-500 mb-1">{item.label}</p>
                <span className="text-[11px] font-numbers font-black text-slate-800 dark:text-gray-200 tabular-nums">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tokenomics Card ──────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[1.5rem] bg-white dark:bg-black border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-lg">
              <PieChart size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-heading font-black text-slate-900 dark:text-white uppercase tracking-widest leading-tight">
                RZC Tokenomics
              </h2>
              <p className="text-[11px] font-body text-slate-500 dark:text-gray-400 mt-1.5">
                Sustainable distribution model
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { 
                label: 'Community Mining Pool', 
                percent: 60, 
                color: 'bg-emerald-500',
                desc: 'Distributed through Proof of Activity mining, airdrops, staking rewards, and governance incentives. Locked until Phase 2 activation.' 
              },
              { 
                label: 'Development & Infrastructure', 
                percent: 20, 
                color: 'bg-blue-500',
                desc: 'Security audits, Telegram Mini App maintenance, multi-chain integration, and marketing operations.' 
              },
              { 
                label: 'Strategic Liquidity (SLER)', 
                percent: 20, 
                color: 'bg-purple-500',
                desc: 'Team compensation (4-year vesting + 1-year cliff), Initial Liquidity Provision, and CEX listings. Multi-sig controlled.' 
              },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between items-end mb-1.5">
                  <span className="text-[11px] font-heading font-bold text-slate-700 dark:text-gray-300 uppercase tracking-widest leading-relaxed">{item.label}</span>
                  <span className="text-[11px] font-numbers font-black text-slate-900 dark:text-white tracking-widest">{item.percent}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden mb-1.5">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.percent}%` }} />
                </div>
                <p className="text-[10px] font-body text-slate-500 dark:text-gray-400 leading-relaxed mt-0.5">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Roadmap Card ──────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-slate-900 to-black border border-slate-800 dark:border-white/10 shadow-xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="p-5 sm:p-6 space-y-5 relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
              <Map size={20} className="text-black" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-heading font-black text-white uppercase tracking-widest leading-tight">
                RhizaCore Roadmap
              </h2>
              <p className="text-[11px] font-body text-gray-400 mt-1.5">
                Strategic Execution Timeline
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Phase 1 */}
            <div className="relative pl-6 pb-4 border-l border-white/10">
              <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs font-heading font-black text-white uppercase tracking-widest">PHASE 1: ACQUISITION</span>
                <span className="text-[9px] font-heading font-black uppercase tracking-wider px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30">
                  Completed Jan 15, 2026
                </span>
              </div>
              <p className="text-[10px] font-body text-gray-400 leading-relaxed mb-2">
                Launch Telegram Mini App. 100 Days of Mining. Premining Season conclusion.
              </p>
              <div className="space-y-1">
                {['Telegram Mini App Launch', '100 Days Mining Campaign', 'Premining Season Complete'].map((txt, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px] font-heading font-bold text-gray-300 uppercase tracking-widest">
                    <CheckCircle2 size={10} className="text-emerald-500 flex-shrink-0" />
                    <span>{txt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Phase 2 */}
            <div className="relative pl-6 pb-4 border-l border-white/10">
              <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-primary animate-pulse border-2 border-slate-900 shadow-[0_0_15px_rgba(250,204,21,0.6)]" />
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs font-heading font-black text-white uppercase tracking-widest">PHASE 2: THE BRIDGE</span>
                <span className="text-[9px] font-heading font-black uppercase tracking-wider px-2 py-0.5 bg-primary/20 text-primary rounded border border-primary/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" /> LIVE NOW
                </span>
              </div>
              <p className="text-[10px] font-body text-gray-400 leading-relaxed mb-2">
                Protocol Online. Withdrawals open. Node Deployment on TON Network.
              </p>
              <div className="space-y-1">
                {['Bridge Interface Active', 'Node Activation Live', 'RZC Marketplace Opening'].map((txt, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px] font-heading font-bold text-gray-300 uppercase tracking-widest">
                    <Target size={10} className="text-primary flex-shrink-0" />
                    <span>{txt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Phase 3 */}
            <div className="relative pl-6 pb-4 border-l border-white/10">
              <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-slate-700 border-2 border-slate-900" />
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs font-heading font-black text-white uppercase tracking-widest">PHASE 3: UTILITY & STAKING</span>
                <span className="text-[9px] font-heading font-black uppercase tracking-widest text-slate-500">
                  Q2 2026
                </span>
              </div>
              <p className="text-[10px] font-body text-gray-400 leading-relaxed mb-2">
                Enable $RZC staking, governance voting, and initial DApp integrations within the Core Wallet.
              </p>
              <div className="space-y-1">
                {['Staking Platform Launch', 'Governance Voting System', 'DApp Integration Suite'].map((txt, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px] font-heading font-bold text-gray-500 uppercase tracking-widest">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-600 flex-shrink-0" />
                    <span>{txt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Phase 4 */}
            <div className="relative pl-6">
              <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-slate-700 border-2 border-slate-900" />
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs font-heading font-black text-white uppercase tracking-widest">PHASE 4: MASS ADOPTION</span>
                <span className="text-[9px] font-heading font-black uppercase tracking-widest text-slate-500">
                  Q4 2026
                </span>
              </div>
              <p className="text-[10px] font-body text-gray-400 leading-relaxed mb-2">
                Global Marketing Blitz targeting 1B+ Telegram users. Decentralized Marketplace launch.
              </p>
              <div className="space-y-1">
                {['Global Marketing Campaign', 'Decentralized Marketplace', 'Cross-Chain Integration'].map((txt, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px] font-heading font-bold text-gray-500 uppercase tracking-widest">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-600 flex-shrink-0" />
                    <span>{txt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Swap;
