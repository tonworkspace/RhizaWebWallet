import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ChevronRight } from 'lucide-react';

const AffiliateHubBanner: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate('/wallet/referral')}
      className="relative group cursor-pointer active:scale-[0.98] transition-all rounded-2xl overflow-hidden shadow-md hover:shadow-emerald-500/25 dark:hover:shadow-[#00FF88]/10 transition-shadow"
    >
      {/* Background — rich emerald in light, near-black in dark */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-100 dark:from-[#0a0a0a] dark:via-[#0d1a0d] dark:to-[#050d0a]" />

      {/* Border overlay */}
      <div className="absolute inset-0 rounded-2xl border border-emerald-300/60 dark:border-[#00FF88]/20" />

      {/* Glow orb — top right */}
      <div className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none opacity-40 dark:opacity-20"
        style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)', transform: 'translate(30%, -30%)' }}
      />

      {/* Bottom-left accent orb */}
      <div className="absolute bottom-0 left-8 w-20 h-20 rounded-full pointer-events-none opacity-20 dark:opacity-10"
        style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)', transform: 'translateY(50%)' }}
      />

      <div className="relative z-10 flex items-center gap-4 p-4">
        {/* Icon */}
        <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 dark:bg-[#00FF88]/10 border border-emerald-400/50 dark:border-[#00FF88]/30 flex items-center justify-center shrink-0 shadow-inner">
          <Users size={20} className="text-emerald-700 dark:text-[#00FF88]" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-emerald-900 dark:text-white tracking-tight">Affiliate Hub</p>
          <p className="text-[11px] text-emerald-700/80 dark:text-gray-400 font-semibold mt-0.5">
            Earn 50 RZC per referral + 10% commissions
          </p>
        </div>

        {/* CTA */}
        <div className="shrink-0 flex items-center gap-0.5 pl-3 pr-2 py-1.5 rounded-xl text-[11px] font-black text-white bg-emerald-600 dark:bg-[#00FF88] dark:text-black shadow-md shadow-emerald-500/30 dark:shadow-none group-hover:scale-105 transition-transform">
          Earn <ChevronRight size={12} />
        </div>
      </div>
    </div>
  );
};

export default AffiliateHubBanner;
