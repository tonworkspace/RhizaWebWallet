import React from 'react';
import { Lock, TrendingUp, Zap } from 'lucide-react';
import { useWallet } from '../context/WalletContext';

interface WalletActivationGateProps {
  onActivate: () => void;
  roundProgress?: number;
}

const NEXT_ROUND_PRICE = 0.018;
const LISTING_PRICE = 1.00;

const WalletActivationGate: React.FC<WalletActivationGateProps> = ({
  onActivate,
  roundProgress = 92.4,
}) => {
  const { rzcPrice } = useWallet();
  const RZC_PRICE_USD = rzcPrice;
  const multiplier = Math.round(LISTING_PRICE / RZC_PRICE_USD);

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="w-full sm:max-w-md bg-[#0d0d0d] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:fade-in duration-300">

        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-500" />

        {/* Handle (mobile) */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Icon + badge */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/10">
                <Lock size={28} className="text-emerald-400" />
              </div>
              <span className="absolute -top-2 -right-2 text-[10px] font-black bg-orange-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                Live
              </span>
            </div>
            <div>
              <p className="text-[10px] font-mono font-black text-emerald-400 uppercase tracking-widest mb-1">
                🔥 Seed Round — Limited Time
              </p>
              <h2 className="text-xl font-mono font-black text-white tracking-tight">
                RZC Token Store
              </h2>
              <p className="text-sm text-zinc-400 font-mono mt-1">
                Activate your wallet to unlock access
              </p>
            </div>
          </div>

          {/* Price comparison */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-3 text-center">
              <p className="text-[9px] font-mono font-black text-emerald-400 uppercase tracking-wider mb-1">Now</p>
              <p className="text-base font-mono font-black text-white">${RZC_PRICE_USD}</p>
              <p className="text-[9px] text-emerald-400 font-bold mt-0.5">← Buy here</p>
            </div>
            <div className="bg-white/[0.03] border border-white/8 rounded-xl p-3 text-center">
              <p className="text-[9px] font-mono font-black text-zinc-500 uppercase tracking-wider mb-1">Round 2</p>
              <p className="text-base font-mono font-black text-zinc-300">${NEXT_ROUND_PRICE}</p>
              <p className="text-[9px] text-zinc-600 font-bold mt-0.5">+50%</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
              <p className="text-[9px] font-mono font-black text-amber-400 uppercase tracking-wider mb-1">Listing</p>
              <p className="text-base font-mono font-black text-amber-300">${LISTING_PRICE.toFixed(2)}</p>
              <p className="text-[9px] text-amber-400 font-bold mt-0.5">{multiplier}x</p>
            </div>
          </div>

          {/* Projection note */}
          <div className="flex items-center gap-2.5 p-3 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-xl">
            <TrendingUp size={14} className="text-emerald-400 shrink-0" />
            <p className="text-xs font-mono text-zinc-300 leading-relaxed">
              Every <span className="text-white font-black">$10</span> at seed price becomes{' '}
              <span className="text-emerald-300 font-black">~${10 * multiplier}</span> at listing —{' '}
              <span className="text-white font-black">{multiplier}x</span> potential return.
            </p>
          </div>

          {/* Round progress */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-mono font-semibold">
              <span className="text-zinc-500">Seed Round Progress</span>
              <span className="text-orange-400 font-bold">{roundProgress}% sold — {(100 - roundProgress).toFixed(1)}% left</span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                style={{ width: `${roundProgress}%` }}
              />
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={onActivate}
            className="relative w-full h-14 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-black rounded-xl text-sm uppercase tracking-widest transition-all duration-200 active:scale-[0.98] shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <span className="relative z-10 flex items-center justify-center gap-2">
              <Zap size={16} fill="currentColor" />
              Activate Wallet to Continue
            </span>
          </button>

          <p className="text-center text-[10px] font-mono text-zinc-600">
            Free to activate · No credit card · Instant access
          </p>
        </div>
      </div>
    </div>
  );
};

export default WalletActivationGate;
