import React from 'react';
import { Gift, Star, ArrowRight, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AirdropPreview: React.FC = () => {
  const navigate = useNavigate();

  const previewTasks = [
    { title: 'Create RhizaCore Wallet', reward: 150, completed: false },
    { title: 'Follow @RhizaCore on X', reward: 100, completed: false },
    { title: 'Join Telegram Community', reward: 125, completed: false },
    { title: 'Refer 3 Friends', reward: 300, completed: false },
    { title: 'Complete Profile', reward: 150, completed: false },
    { title: 'Daily Check-in', reward: 50, completed: false }
  ];

  const totalReward = previewTasks.reduce((sum, task) => sum + task.reward, 0);

  return (
    <div className="bg-gradient-to-br from-primary/5 via-secondary/5 to-primary/5 border border-primary/20 rounded-2xl p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
      <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-secondary/10 rounded-full blur-xl" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-primary to-secondary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Gift size={32} className="text-white" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
            Social Airdrop
          </h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Complete simple tasks and earn up to <span className="font-black text-primary">{totalReward} RZC</span>
          </p>
        </div>

        {/* Task Preview */}
        <div className="space-y-3 mb-6">
          {previewTasks.slice(0, 4).map((task, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200/50 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg border-2 border-gray-300 dark:border-white/20 flex items-center justify-center">
                  <Check size={16} className="text-gray-400" />
                </div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {task.title}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Star size={12} className="text-primary" />
                <span className="text-xs font-black text-primary">+{task.reward}</span>
              </div>
            </div>
          ))}
          
          {previewTasks.length > 4 && (
            <div className="text-center py-2">
              <span className="text-xs text-gray-500 font-medium">
                +{previewTasks.length - 4} more tasks available
              </span>
            </div>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate('/create-wallet')}
          className="w-full bg-gradient-to-r from-primary to-secondary text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg"
        >
          <Gift size={18} />
          Start Earning Now
          <ArrowRight size={16} />
        </button>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200/50 dark:border-white/10">
          <div className="text-center">
            <div className="text-lg font-black text-primary">{previewTasks.length}</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">Tasks</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-black text-secondary">{totalReward}</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">Max RZC</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-black text-emerald-600">Free</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">To Join</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AirdropPreview;