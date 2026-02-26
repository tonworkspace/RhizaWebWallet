import React from 'react';
import { Check, Zap, Rocket, TrendingUp, Globe } from 'lucide-react';

interface RoadmapPhase {
  phase: number;
  title: string;
  status: 'completed' | 'active' | 'upcoming';
  date: string;
  description: string;
  items?: string[];
  badge?: string;
}

const ROADMAP_PHASES: RoadmapPhase[] = [
  {
    phase: 1,
    title: 'ACQUISITION',
    status: 'completed',
    date: 'Completed Jan 15, 2026',
    description: 'Launch Telegram Mini App. 100 Days of Mining. Premining Season conclusion.',
    items: [
      'Telegram Mini App Launch',
      '100 Days Mining Campaign',
      'Premining Season Complete'
    ]
  },
  {
    phase: 2,
    title: 'THE BRIDGE',
    status: 'active',
    date: 'Live Now',
    description: 'Protocol Online. Withdrawals open. Node Deployment on TON Network.',
    items: [
      'Bridge Interface Active',
      'Node Activation Live',
      'RZC Marketplace Opening'
    ],
    badge: 'LIVE NOW'
  },
  {
    phase: 3,
    title: 'UTILITY & STAKING',
    status: 'upcoming',
    date: 'Q2 2026',
    description: 'Enable $RZC staking, governance voting, and initial DApp integrations within the Core Wallet.',
    items: [
      'Staking Platform Launch',
      'Governance Voting System',
      'DApp Integration Suite'
    ]
  },
  {
    phase: 4,
    title: 'MASS ADOPTION',
    status: 'upcoming',
    date: 'Q4 2026',
    description: 'Global Marketing Blitz targeting 1B+ Telegram users. Decentralized Marketplace launch.',
    items: [
      'Global Marketing Campaign',
      'Decentralized Marketplace',
      'Cross-Chain Integration'
    ]
  }
];

const PhaseIcon: React.FC<{ phase: number; status: string }> = ({ phase, status }) => {
  if (status === 'completed') {
    return (
      <div className="w-12 h-12 rounded-2xl bg-primary/20 border-2 border-primary flex items-center justify-center">
        <Check size={24} className="text-primary" strokeWidth={3} />
      </div>
    );
  }
  
  if (status === 'active') {
    return (
      <div className="w-12 h-12 rounded-2xl bg-primary border-2 border-primary flex items-center justify-center relative">
        <span className="text-black font-black text-xl">{phase}</span>
        <div className="absolute -inset-1 bg-primary/30 rounded-2xl blur-md animate-pulse" />
      </div>
    );
  }
  
  return (
    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 flex items-center justify-center">
      <span className="text-slate-600 dark:text-gray-400 font-black text-xl">{phase}</span>
    </div>
  );
};

const RoadmapTimeline: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {ROADMAP_PHASES.map((phase, index) => (
        <div 
          key={phase.phase}
          className={`relative ${
            phase.status === 'completed' 
              ? 'opacity-60' 
              : phase.status === 'active' 
              ? '' 
              : 'opacity-80'
          }`}
        >
          {/* Connecting Line */}
          {index < ROADMAP_PHASES.length - 1 && (
            <div className={`absolute left-6 top-16 w-0.5 h-full ${
              phase.status === 'completed' 
                ? 'bg-primary/30' 
                : 'bg-slate-200 dark:bg-white/10'
            }`} />
          )}
          
          {/* Phase Card */}
          <div className={`relative p-6 lg:p-8 rounded-[2rem] border transition-all duration-300 ${
            phase.status === 'completed'
              ? 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10'
              : phase.status === 'active'
              ? 'bg-white dark:bg-[#0a0a0a] border-primary/30 shadow-xl shadow-primary/10'
              : 'bg-white dark:bg-[#0a0a0a] border-slate-200 dark:border-white/10'
          }`}>
            <div className="flex items-start gap-6">
              {/* Icon */}
              <div className="relative z-10">
                <PhaseIcon phase={phase.phase} status={phase.status} />
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className={`text-xl lg:text-2xl font-black tracking-tight ${
                      phase.status === 'completed'
                        ? 'text-slate-600 dark:text-gray-400 line-through'
                        : phase.status === 'active'
                        ? 'text-primary'
                        : 'text-slate-900 dark:text-white'
                    }`}>
                      PHASE {phase.phase}: {phase.title}
                    </h3>
                    {phase.badge && (
                      <span className="px-3 py-1 bg-primary text-black rounded-lg text-[10px] font-black uppercase tracking-widest">
                        {phase.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    {phase.date}
                  </span>
                </div>
                
                <p className={`text-sm lg:text-base font-medium leading-relaxed mb-4 ${
                  phase.status === 'completed'
                    ? 'text-slate-500 dark:text-gray-500'
                    : phase.status === 'active'
                    ? 'text-slate-900 dark:text-white font-semibold'
                    : 'text-slate-600 dark:text-gray-300'
                }`}>
                  {phase.description}
                </p>
                
                {phase.items && (
                  <ul className="space-y-2">
                    {phase.items.map((item, idx) => (
                      <li 
                        key={idx}
                        className={`flex items-center gap-3 text-sm font-medium ${
                          phase.status === 'completed'
                            ? 'text-slate-500 dark:text-gray-500'
                            : phase.status === 'active'
                            ? 'text-slate-700 dark:text-gray-300'
                            : 'text-slate-600 dark:text-gray-400'
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          phase.status === 'completed'
                            ? 'bg-primary/50'
                            : phase.status === 'active'
                            ? 'bg-primary'
                            : 'bg-slate-400 dark:bg-gray-500'
                        }`} />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RoadmapTimeline;
