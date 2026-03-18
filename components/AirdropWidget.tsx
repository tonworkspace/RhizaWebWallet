import React, { useState, useEffect } from 'react';
import { Gift, ArrowRight, Star } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { useAirdrop } from '../context/AirdropContext';
import { getActiveAirdropTasksSync, getTotalAirdropRewards } from '../config/airdropTasks';
import { airdropService } from '../services/airdropService';

const AirdropWidget: React.FC = () => {
  const { address } = useWallet();
  const { openAirdropModal } = useAirdrop();
  const [stats, setStats] = useState({ completed: 0, total: 0, earned: 0, available: 0 });

  useEffect(() => {
    if (!address) return;

    const load = async () => {
      const allTasks = getActiveAirdropTasksSync();
      const total = allTasks.length;
      const available = getTotalAirdropRewards();

      // Collect completed IDs from localStorage
      let completedIds: number[] = [];
      try {
        completedIds = JSON.parse(localStorage.getItem(`airdrop_completed_${address}`) || '[]');
      } catch { /* ignore */ }

      // Merge with DB completions
      try {
        const progress = await airdropService.getAirdropProgress(address);
        if (progress.success && progress.data?.completedTasks) {
          progress.data.completedTasks.forEach((c: any) => {
            if (c.task_id != null && !completedIds.includes(Number(c.task_id))) {
              completedIds.push(Number(c.task_id));
            }
          });
        }
      } catch { /* non-fatal */ }

      const completedSet = new Set(completedIds);
      const completedTasks = allTasks.filter(t => completedSet.has(t.id));
      const earned = completedTasks.reduce((sum, t) => sum + t.reward, 0);

      setStats({ completed: completedTasks.length, total, earned, available });
    };

    load();
  }, [address]);

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div
      onClick={openAirdropModal}
      className="p-4 bg-gradient-to-r from-primary/10 via-secondary/5 to-primary/10 border border-primary/20 rounded-xl cursor-pointer group hover:border-primary/40 transition-all active:scale-[0.98] relative overflow-hidden"
    >
      <div className="absolute -top-4 -right-4 w-16 h-16 bg-primary/10 rounded-full blur-xl" />

      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-r from-primary to-secondary rounded-xl flex items-center justify-center">
              <Gift size={20} className="text-white" />
            </div>
            {stats.completed > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                <span className="text-[10px] font-black text-white">{stats.completed}</span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-black text-gray-900 dark:text-white text-sm mb-1">Social Airdrop</h4>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Star size={12} className="text-primary" />
                <span className="text-xs font-black text-primary">{stats.earned} RZC</span>
              </div>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                {stats.completed}/{stats.total} tasks
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-xs font-black text-gray-900 dark:text-white">{completionRate}%</div>
            <div className="w-12 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-1000"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
          <ArrowRight size={16} className="text-primary group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  );
};

export default AirdropWidget;
