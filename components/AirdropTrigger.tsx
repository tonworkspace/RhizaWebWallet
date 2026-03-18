import React from 'react';
import { Gift } from 'lucide-react';
import { useAirdrop } from '../context/AirdropContext';
import { useWallet } from '../context/WalletContext';

interface AirdropTriggerProps {
  variant?: 'button' | 'fab' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
}

const AirdropTrigger: React.FC<AirdropTriggerProps> = ({ 
  variant = 'button', 
  size = 'md', 
  className = '',
  showLabel = true 
}) => {
  const { openAirdropModal } = useAirdrop();
  const { isLoggedIn } = useWallet();

  // Don't render if user is not logged in
  if (!isLoggedIn) return null;

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24
  };

  if (variant === 'fab') {
    return (
      <button
        onClick={openAirdropModal}
        className={`fixed bottom-20 right-4 z-40 ${sizeClasses[size]} bg-gradient-to-r from-primary to-secondary rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center group ${className}`}
        aria-label="Open airdrop tasks"
      >
        <Gift size={iconSizes[size]} className="text-white group-hover:scale-110 transition-transform" />
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
      </button>
    );
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={openAirdropModal}
        className={`${sizeClasses[size]} bg-primary/10 hover:bg-primary/20 rounded-xl transition-all active:scale-95 flex items-center justify-center relative ${className}`}
        aria-label="Open airdrop tasks"
      >
        <Gift size={iconSizes[size]} className="text-primary" />
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
      </button>
    );
  }

  return (
    <button
      onClick={openAirdropModal}
      className={`px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all active:scale-95 flex items-center gap-2 relative ${className}`}
    >
      <Gift size={iconSizes[size]} />
      {showLabel && 'Airdrop'}
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
    </button>
  );
};

export default AirdropTrigger;