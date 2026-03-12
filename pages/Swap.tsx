import React from 'react';
import {
  TrendingUp,
  ShieldCheck,
  Globe,
  ExternalLink,
  Sparkles
} from 'lucide-react';

// ─── Listing tokens (coming soon) ─────────────────────────────────────────────
const LISTING_TOKENS = [
  { symbol: 'BTC',  icon: '₿',  name: 'Bitcoin',    category: 'Giants' },
  { symbol: 'ETH',  icon: '⟠',  name: 'Ethereum',   category: 'Giants' },
  { symbol: 'BNB',  icon: '🔶', name: 'BNB',         category: 'Giants' },
  { symbol: 'PI',   icon: '🥧', name: 'Pi Network',  category: 'Community' },
  { symbol: 'DOGE', icon: '🐕', name: 'Dogecoin',    category: 'Community' },
  { symbol: 'SHIB', icon: '🐕', name: 'Shiba Inu',   category: 'Community' },
  { symbol: 'SOL',  icon: '☀️', name: 'Solana',      category: 'L1' },
  { symbol: 'SUI',  icon: '💧', name: 'Sui',          category: 'L1' },
  { symbol: 'AVAX', icon: '🔺', name: 'Avalanche',   category: 'L1' },
  { symbol: 'APT',  icon: '🔗', name: 'Aptos',        category: 'L1' },
  { symbol: 'XRP',  icon: '✖️', name: 'XRP',          category: 'Utility' },
  { symbol: 'ADA',  icon: '₳',  name: 'Cardano',     category: 'Utility' },
  { symbol: 'HBAR', icon: 'ℏ',  name: 'Hedera',      category: 'Utility' },
  { symbol: 'LINK', icon: '🔗', name: 'Chainlink',   category: 'Utility' },
  { symbol: 'XLM',  icon: '🚀', name: 'Stellar',     category: 'Utility' },
  { symbol: 'NEAR', icon: 'Ⓝ',  name: 'NEAR',        category: 'Innovators' },
  { symbol: 'ONDO', icon: '🏛️', name: 'Ondo',        category: 'Innovators' },
  { symbol: 'TAO',  icon: '🧠', name: 'Bittensor',   category: 'Innovators' },
  { symbol: 'RZC',  icon: '⚡', name: 'RhizaCore',   category: 'Native' },
  { symbol: 'TON',  icon: '💎', name: 'Toncoin',     category: 'Native' },
];

const Swap: React.FC = () => {
  return (
    <div className="max-w-lg mx-auto space-y-4 px-3 sm:px-4 md:px-0 pb-24 sm:pb-8">

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Swap</h1>
        <p className="text-[11px] text-slate-500 dark:text-gray-500 font-medium mt-0.5">
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
                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-primary/20 text-primary rounded-full border border-primary/30">
                  Mainnet Loading
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                The Elite 20 — Coming to RhizaCore
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5 leading-snug">
                Swap, store and manage the world's top utility assets in one place — including{' '}
                <span className="font-black text-primary">$PI Network</span>.
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
                <span className="text-[9px] font-black text-slate-700 dark:text-white">${t.symbol}</span>
              </div>
            ))}
          </div>

          {/* Why section */}
          <div className="space-y-2">
            {[
              { icon: ShieldCheck, color: 'text-emerald-500', label: 'Trademarked Security', desc: 'RhizaCore™ — globally recognized non-custodial standard.' },
              { icon: Globe,       color: 'text-blue-500',    label: 'Global Distribution',  desc: 'Connecting 50M+ Pi Pioneers and institutional traders.' },
              { icon: TrendingUp,  color: 'text-primary',     label: 'Ecosystem Staking',    desc: 'Built-in StakersFi integration for passive yield.' },
            ].map(({ icon: Icon, color, label, desc }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center justify-center flex-shrink-0">
                  <Icon size={13} className={color} />
                </div>
                <div>
                  <p className="text-[11px] font-black text-slate-900 dark:text-white">{label}</p>
                  <p className="text-[10px] text-slate-400 dark:text-gray-500 font-medium">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quote */}
          <div className="p-3.5 rounded-xl bg-white/40 dark:bg-white/5 border-l-4 border-primary">
            <p className="text-[11px] italic text-slate-600 dark:text-gray-300 leading-snug">
              "By including Pi, we are connecting with over 50 million Pioneers. RhizaCore Wallet isn't just a tool — it's a global distribution hub."
            </p>
            <p className="text-[10px] font-black text-slate-700 dark:text-white mt-1.5">— RhizaCore Board</p>
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
            <div className="px-3 py-2 bg-white/50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl text-[10px] font-black text-slate-600 dark:text-gray-300">
              💬 @Rhizaman
            </div>
            <div className="px-3 py-2 bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/10 rounded-xl text-[10px] font-black text-slate-700 dark:text-gray-200">
              #RZC #PiNetwork
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Swap;
