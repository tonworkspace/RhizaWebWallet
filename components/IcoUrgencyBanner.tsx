import React, { useState, useEffect } from 'react';
import { AlertTriangle, Flame, Clock, X } from 'lucide-react';
import { useSaleRound } from '../hooks/useSaleRound';
import { useNavigate } from 'react-router-dom';

interface IcoUrgencyBannerProps {
  /** Optional: Hide on specific pages */
  hideOnPages?: string[];
  /** Optional: Allow users to dismiss the banner */
  dismissible?: boolean;
}

function useCountdown(targetDate: Date) {
  const calc = () => {
    const diff = targetDate.getTime() - Date.now();
    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, ended: true };
    }
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
      ended: false
    };
  };
  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return time;
}

const IcoUrgencyBanner: React.FC<IcoUrgencyBannerProps> = ({ 
  hideOnPages = [], 
  dismissible = true 
}) => {
  const navigate = useNavigate();
  const [isDismissed, setIsDismissed] = useState(() => {
    // Check if user dismissed the banner (stored in localStorage)
    return localStorage.getItem('ico_banner_dismissed') === 'true';
  });

  const {
    activeRound,
    roundProgress,
    isSoldOut,
    saleEndDate,
  } = useSaleRound();

  const countdown = useCountdown(saleEndDate);

  // Check if current page should hide the banner
  const currentPath = window.location.pathname;
  const shouldHide = hideOnPages.some(page => currentPath.includes(page));

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('ico_banner_dismissed', 'true');
    // Auto-show again after 24 hours
    setTimeout(() => {
      localStorage.removeItem('ico_banner_dismissed');
    }, 24 * 60 * 60 * 1000);
  };

  const handleClick = () => {
    navigate('/store');
  };

  // Don't render if dismissed or should be hidden on this page
  if (isDismissed || shouldHide) return null;

  return (
    <div 
      className={`border-b px-4 py-2.5 sticky top-0 z-50 backdrop-blur-md cursor-pointer transition-all hover:opacity-90 ${
        isSoldOut 
          ? 'bg-gradient-to-r from-red-100/80 dark:from-red-950/60 via-red-100/60 dark:via-red-950/40 to-red-100/80 dark:to-red-950/60 border-red-300 dark:border-red-500/20'
          : 'bg-gradient-to-r from-red-100/80 dark:from-red-950/60 via-orange-100/60 dark:via-orange-950/40 to-red-100/80 dark:to-red-950/60 border-red-300 dark:border-red-500/20'
      }`}
      onClick={handleClick}
    >
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2 flex-1">
          {isSoldOut ? (
            <>
              <AlertTriangle size={12} className="text-red-500 animate-pulse flex-shrink-0" />
              <span className="text-[10px] font-heading font-black text-red-500 uppercase tracking-widest">
                {activeRound.round_name} Sold Out — Next Round Opening Soon
              </span>
            </>
          ) : (
            <>
              <Flame size={12} className="text-orange-400 animate-pulse flex-shrink-0" />
              <span className="text-[10px] font-heading font-black text-orange-400 uppercase tracking-widest">
                Only <span className="font-numbers">{Math.max(0, 100 - roundProgress).toFixed(1)}%</span> of {activeRound.round_name.toLowerCase()} left
              </span>
            </>
          )}
        </div>

        {!isSoldOut && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Clock size={10} className="text-gray-400 dark:text-zinc-400" />
            <span className="text-[10px] font-heading font-black text-gray-600 dark:text-zinc-300 uppercase tracking-widest">
              <span className="font-numbers">{String(countdown.days).padStart(2, '0')}</span>D{' '}
              <span className="font-numbers">{String(countdown.hours).padStart(2, '0')}</span>H{' '}
              <span className="font-numbers">{String(countdown.minutes).padStart(2, '0')}</span>M{' '}
              <span className="text-orange-400 font-numbers">{String(countdown.seconds).padStart(2, '0')}</span>S
            </span>
          </div>
        )}

        {dismissible && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss();
            }}
            className="ml-3 p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors flex-shrink-0"
            aria-label="Dismiss banner"
          >
            <X size={12} className="text-gray-500 dark:text-zinc-400" />
          </button>
        )}
      </div>
    </div>
  );
};

export default IcoUrgencyBanner;
