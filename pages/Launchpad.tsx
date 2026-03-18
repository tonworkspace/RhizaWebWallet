import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Rocket, Clock, Bell, TrendingUp, Shield, Users } from 'lucide-react';

const Launchpad: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-300 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-b border-slate-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-600 dark:text-gray-400 hover:text-primary transition-colors group">
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold text-sm">Back</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <Rocket className="text-black" size={14} />
            </div>
            <span className="font-black text-slate-900 dark:text-white text-sm">Launchpad</span>
          </div>
          <div className="w-16" /> {/* spacer */}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        {/* Glow */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150" />
          <div className="relative w-24 h-24 bg-gradient-to-br from-primary to-emerald-400 rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/30">
            <Rocket size={44} className="text-black" />
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full mb-6">
          <Clock size={12} className="text-primary" />
          <span className="text-[11px] font-black uppercase tracking-widest text-primary">Coming Soon</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white mb-4 leading-tight">
          RhizaCore<br />Launchpad
        </h1>
        <p className="text-slate-600 dark:text-gray-400 text-lg max-w-md mb-10 leading-relaxed">
          Early access to vetted crypto projects. Invest with RZC and be part of the next big thing — before it hits exchanges.
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {[
            { icon: Shield, label: 'Vetted Projects' },
            { icon: TrendingUp, label: 'Early Access' },
            { icon: Users, label: 'Community Driven' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full">
              <Icon size={13} className="text-primary" />
              <span className="text-xs font-black text-slate-700 dark:text-gray-300">{label}</span>
            </div>
          ))}
        </div>

        {/* Notify CTA */}
        <div className="w-full max-w-sm">
          <div className="p-5 bg-gradient-to-br from-primary/10 to-emerald-500/5 border border-primary/20 rounded-2xl">
            <Bell size={20} className="text-primary mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">Be the first to know</p>
            <p className="text-xs text-slate-500 dark:text-gray-400 mb-4">We'll notify you when Launchpad goes live.</p>
            <Link
              to="/wallet"
              className="block w-full py-3 bg-primary text-black rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 active:scale-95 transition-all"
            >
              Go to Wallet
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Launchpad;
