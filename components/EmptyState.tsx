import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-20 h-20 rounded-[2rem] bg-white/5 border border-white/5 flex items-center justify-center mb-6 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-[#00FF88]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <Icon size={32} className="text-gray-600 relative z-10" />
      </div>
      <h3 className="text-xl font-black text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mb-6 leading-relaxed">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-3 bg-[#00FF88] text-black rounded-xl font-bold text-sm hover:scale-105 transition-all"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
