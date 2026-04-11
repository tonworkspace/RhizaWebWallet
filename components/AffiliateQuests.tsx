import React from 'react';
import { Target, Sparkles, Check, ChevronRight, Lock } from 'lucide-react';
import { buildQuests } from '../config/referralQuests';

interface AffiliateQuestsProps {
  downlineCount: number;
  rzcBalance: number;
  totalRzcCommissions: number;
}

const AffiliateQuests: React.FC<AffiliateQuestsProps> = ({ 
  downlineCount, 
  rzcBalance, 
  totalRzcCommissions 
}) => {
  const quests = buildQuests(downlineCount, rzcBalance, totalRzcCommissions);
  const completedCount = quests.filter(q => q.progress >= q.target).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20">
            <Target size={16} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Affiliate Quests</h2>
            <p className="text-[10px] text-slate-500 dark:text-gray-500 font-medium">Unlock ranks and bonus rewards</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 group">
          <Sparkles size={12} className="text-amber-500 group-hover:animate-pulse" />
          <span className="text-[11px] font-black text-slate-700 dark:text-gray-300">
            {completedCount}/{quests.length} <span className="hidden sm:inline">Complete</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {quests.map((quest) => {
          const QIcon = quest.icon;
          const progress = Math.min((quest.progress / quest.target) * 100, 100);
          const isDone = quest.progress >= quest.target;
          
          return (
            <div 
              key={quest.id}
              className={`group relative rounded-[1.5rem] p-4 sm:p-5 border transition-all duration-300 overflow-hidden ${
                isDone 
                  ? 'bg-white dark:bg-[#0a0a0a] border-emerald-500/10' 
                  : 'bg-white dark:bg-[#0a0a0a] border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 hover:shadow-xl hover:shadow-slate-200/20 dark:hover:shadow-black/20'
              }`}
            >
              {/* Background gradient hint */}
              <div 
                className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none group-hover:opacity-[0.05] dark:group-hover:opacity-[0.08] transition-opacity"
                style={{ background: `linear-gradient(135deg, ${quest.color}, transparent)` }}
              />
              
              {isDone && (
                <div className="absolute -top-1 -right-1">
                  <div className="w-10 h-10 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-bl-[1.5rem] flex items-center justify-center p-1.5 border-b border-l border-emerald-500/20">
                    <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/40 transform rotate-12 group-hover:rotate-0 transition-transform">
                      <Check size={12} className="text-black font-black" strokeWidth={3} />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-4 mb-4">
                <div 
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-lg transition-transform group-hover:scale-110 duration-500"
                  style={{ 
                    background: isDone ? `color-mix(in srgb, ${quest.color} 15%, transparent)` : 'var(--bg-slate-50)',
                    border: `1px solid ${isDone ? quest.color + '40' : 'rgba(255,255,255,0.05)'}`,
                    boxShadow: isDone ? `0 8px 16px -4px ${quest.color}20` : 'none'
                  }}
                >
                  <QIcon size={20} style={{ color: isDone ? quest.color : '#64748b' }} />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-black transition-colors ${isDone ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-gray-400 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                      {quest.title}
                    </h3>
                    {!isDone && <Lock size={10} className="text-slate-400 dark:text-gray-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-gray-500 font-medium leading-tight mt-0.5">
                    {quest.desc}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-gray-600 tracking-wider font-mono">
                    {quest.progress.toLocaleString()} / {quest.target.toLocaleString()}
                  </span>
                  <span 
                    className={`text-[10px] font-black uppercase tracking-widest ${isDone ? 'text-emerald-500' : 'text-slate-400 dark:text-gray-600 group-hover:text-slate-900 dark:group-hover:text-white'}`}
                  >
                    {isDone ? 'Goal Reached' : `Reward: ${quest.reward}`}
                  </span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden p-[1px] border border-slate-200 dark:border-white/5">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out relative"
                    style={{ 
                      width: `${progress}%`, 
                      background: `linear-gradient(90deg, ${quest.color}, color-mix(in srgb, ${quest.color} 70%, white))` 
                    }}
                  >
                    {!isDone && progress > 5 && (
                      <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    )}
                  </div>
                </div>
              </div>

              {!isDone && (
                <div className="mt-3 overflow-hidden h-0 group-hover:h-auto transition-all duration-300 opacity-0 group-hover:opacity-100">
                  <button className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white flex items-center justify-center gap-1.5 group/btn">
                    Quest Profile
                    <ChevronRight size={10} className="transform group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AffiliateQuests;
