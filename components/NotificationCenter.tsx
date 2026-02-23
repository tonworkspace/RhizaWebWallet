import React, { useState, useEffect } from 'react';
import { Bell, X, Check, CheckCheck, Trash2, Archive, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationService, type Notification } from '../services/notificationService';
import { useWallet } from '../context/WalletContext';

// Simple time ago formatter
const timeAgo = (date: string) => {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };
  
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
    }
  }
  
  return 'just now';
};

const NotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const { address } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!address) return;

    setLoading(true);
    const result = await notificationService.getNotifications(address, {
      limit: 20,
      includeRead: true,
      includeArchived: false
    });

    if (result.success && result.notifications) {
      setNotifications(result.notifications);
    }
    setLoading(false);
  };

  // Fetch unread count
  const fetchUnreadCount = async () => {
    if (!address) return;

    const result = await notificationService.getUnreadCount(address);
    if (result.success && result.count !== undefined) {
      setUnreadCount(result.count);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (address) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [address]);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!address) return;

    const subscription = notificationService.subscribeToNotifications(
      address,
      (newNotification) => {
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Show browser notification if supported
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(newNotification.title, {
            body: newNotification.message,
            icon: '/logo.png',
            badge: '/logo.png'
          });
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [address]);

  // Mark as read
  const handleMarkAsRead = async (notificationId: string) => {
    await notificationService.markAsRead(notificationId);
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    if (!address) return;
    
    await notificationService.markAllAsRead(address);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  // Archive notification
  const handleArchive = async (notificationId: string) => {
    await notificationService.archiveNotification(notificationId);
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  // Delete notification
  const handleDelete = async (notificationId: string) => {
    await notificationService.deleteNotification(notificationId);
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    if (notifications.find(n => n.id === notificationId && !n.is_read)) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }

    if (notification.action_url) {
      navigate(notification.action_url);
      setIsOpen(false);
    }
  };

  // Get notification icon and color
  const getNotificationStyle = (type: Notification['type'], priority: Notification['priority']) => {
    const styles = {
      transaction_received: { icon: '💰', color: 'text-green-400', bg: 'bg-green-500/10' },
      transaction_sent: { icon: '📤', color: 'text-blue-400', bg: 'bg-blue-500/10' },
      transaction_confirmed: { icon: '✅', color: 'text-green-400', bg: 'bg-green-500/10' },
      transaction_failed: { icon: '❌', color: 'text-red-400', bg: 'bg-red-500/10' },
      referral_earned: { icon: '🎁', color: 'text-purple-400', bg: 'bg-purple-500/10' },
      referral_joined: { icon: '👥', color: 'text-blue-400', bg: 'bg-blue-500/10' },
      reward_claimed: { icon: '🏆', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
      system_announcement: { icon: '📢', color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
      security_alert: { icon: '🔒', color: 'text-red-400', bg: 'bg-red-500/10' },
      achievement_unlocked: { icon: '🎖️', color: 'text-yellow-400', bg: 'bg-yellow-500/10' }
    };

    return styles[type] || { icon: '🔔', color: 'text-gray-400', bg: 'bg-gray-500/10' };
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors"
      >
        <Bell size={20} className="text-slate-600 dark:text-gray-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel - Full screen on mobile, dropdown on desktop */}
          <div className="fixed inset-0 sm:absolute sm:inset-auto sm:right-0 sm:top-12 sm:w-96 bg-white dark:bg-slate-900 border-0 sm:border border-slate-200 dark:border-slate-700 sm:rounded-2xl shadow-2xl z-50 flex flex-col sm:max-h-[600px]">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Notifications</h3>
                <p className="text-xs text-slate-500 dark:text-gray-400">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                    title="Mark all as read"
                  >
                    <CheckCheck size={16} className="text-slate-600 dark:text-gray-400" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={16} className="text-slate-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="w-8 h-8 border-2 border-[#00FF88] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-slate-600 dark:text-gray-400">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell size={48} className="text-slate-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-600 dark:text-gray-400">No notifications yet</p>
                  <p className="text-xs text-slate-500 dark:text-gray-500 mt-1">
                    We'll notify you about transactions, referrals, and more
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {notifications.map((notification) => {
                    const style = getNotificationStyle(notification.type, notification.priority);
                    
                    return (
                      <div
                        key={notification.id}
                        className={`p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer ${
                          !notification.is_read ? 'bg-slate-50 dark:bg-white/5' : ''
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <div className={`w-10 h-10 ${style.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                            <span className="text-lg">{style.icon}</span>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4 className={`text-sm font-bold ${style.color}`}>
                                {notification.title}
                              </h4>
                              {!notification.is_read && (
                                <div className="w-2 h-2 bg-[#00FF88] rounded-full flex-shrink-0 mt-1" />
                              )}
                            </div>
                            <p className="text-xs text-slate-600 dark:text-gray-400 mb-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-slate-500 dark:text-gray-500">
                                {timeAgo(notification.created_at)}
                              </span>
                              {notification.action_label && (
                                <span className="text-[10px] text-[#00FF88] font-bold flex items-center gap-1">
                                  {notification.action_label}
                                  <ExternalLink size={10} />
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-1">
                            {!notification.is_read && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsRead(notification.id);
                                }}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                title="Mark as read"
                              >
                                <Check size={14} className="text-slate-600 dark:text-gray-400" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleArchive(notification.id);
                              }}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                              title="Archive"
                            >
                              <Archive size={14} className="text-slate-600 dark:text-gray-400" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(notification.id);
                              }}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={14} className="text-slate-600 dark:text-gray-400" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-slate-200 dark:border-slate-700 flex-shrink-0 pb-safe">
                <button
                  onClick={() => {
                    navigate('/wallet/notifications');
                    setIsOpen(false);
                  }}
                  className="w-full text-xs text-[#00FF88] font-bold hover:opacity-70 transition-opacity py-2"
                >
                  View All Notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;
