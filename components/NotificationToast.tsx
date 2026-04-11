import React, { useState, useEffect } from 'react';
import { X, Bell, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Notification } from '../services/notificationService';

interface NotificationToastProps {
  notification: Notification;
  onClose: () => void;
  onAction?: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ 
  notification, 
  onClose, 
  onAction 
}) => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for animation
  };

  const handleClick = () => {
    if (notification.action_url) {
      navigate(notification.action_url);
      onAction?.();
    }
    handleClose();
  };

  // Auto-close after 5 seconds
  useEffect(() => {
    const timer = setTimeout(handleClose, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Get notification style
  const getNotificationStyle = (type: Notification['type']) => {
    const styles = {
      transaction_received: { icon: '💰', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
      transaction_sent: { icon: '📤', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
      transaction_confirmed: { icon: '✅', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
      transaction_failed: { icon: '❌', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
      referral_earned: { icon: '🎁', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
      referral_joined: { icon: '👥', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
      reward_claimed: { icon: '🏆', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
      system_announcement: { icon: '📢', color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30' },
      security_alert: { icon: '🔒', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
      achievement_unlocked: { icon: '🎖️', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' }
    };

    return styles[type] || { icon: '🔔', color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/30' };
  };

  const style = getNotificationStyle(notification.type);

  return (
    <div
      className={`
        toast-container max-w-sm w-full
        transform transition-all duration-300 ease-out
        ${isVisible 
          ? 'translate-x-0 opacity-100 scale-100' 
          : 'translate-x-full opacity-0 scale-95'
        }
      `}
    >
      <div
        className={`
          bg-white dark:bg-slate-900 border-2 ${style.border} rounded-2xl shadow-2xl 
          backdrop-blur-xl p-4 cursor-pointer hover:scale-[1.02] transition-transform
        `}
        onClick={handleClick}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 ${style.bg} rounded-lg flex items-center justify-center`}>
              <span className="text-lg">{style.icon}</span>
            </div>
            <div className="flex items-center gap-2">
              <Bell size={12} className="text-primary animate-pulse" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                New Notification
              </span>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={14} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <h4 className={`text-sm font-bold ${style.color} leading-tight`}>
            {notification.title}
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            {notification.message}
          </p>
          
          {notification.action_label && (
            <div className="flex items-center gap-1 text-primary">
              <span className="text-[10px] font-bold">{notification.action_label}</span>
              <ExternalLink size={10} />
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full animate-[shrink_5s_linear_forwards]"
            style={{
              animation: 'shrink 5s linear forwards'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default NotificationToast;