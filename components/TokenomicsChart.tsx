import React from 'react';
import { RHIZA_TOKENOMICS } from '../constants';

const TokenomicsChart: React.FC = () => {
  const total = RHIZA_TOKENOMICS.reduce((sum, item) => sum + item.percentage, 0);
  
  // Calculate cumulative percentages for positioning
  let cumulative = 0;
  const segments = RHIZA_TOKENOMICS.map(item => {
    const start = cumulative;
    cumulative += item.percentage;
    return {
      ...item,
      start,
      end: cumulative
    };
  });

  return (
    <div className="w-full space-y-6">
      {/* Donut Chart */}
      <div className="relative w-full max-w-sm mx-auto aspect-square">
        <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="currentColor"
            strokeWidth="40"
            className="text-slate-100 dark:text-white/5"
          />
          
          {/* Segments */}
          {segments.map((segment, idx) => {
            const circumference = 2 * Math.PI * 80;
            const segmentLength = (segment.percentage / 100) * circumference;
            const offset = (segment.start / 100) * circumference;
            
            return (
              <circle
                key={idx}
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke={segment.color}
                strokeWidth="40"
                strokeDasharray={`${segmentLength} ${circumference}`}
                strokeDashoffset={-offset}
                className="transition-all duration-500 hover:opacity-80 cursor-pointer"
                style={{
                  filter: 'drop-shadow(0 0 8px rgba(0, 255, 136, 0.3))'
                }}
              />
            );
          })}
        </svg>
        
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-center">
            <div className="text-3xl font-black text-slate-900 dark:text-white">100%</div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-gray-500">
              Total Supply
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="grid gap-3">
        {RHIZA_TOKENOMICS.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl hover:border-primary/30 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0 group-hover:scale-110 transition-transform"
                style={{ backgroundColor: item.color }}
              />
              <div>
                <div className="text-sm font-black text-slate-900 dark:text-white">
                  {item.label}
                </div>
                <div className="text-xs text-slate-500 dark:text-gray-400 font-medium line-clamp-1">
                  {item.description}
                </div>
              </div>
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white flex-shrink-0 ml-3">
              {item.percentage}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TokenomicsChart;
