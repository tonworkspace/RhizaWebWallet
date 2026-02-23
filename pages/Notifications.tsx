import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  Archive, 
  Filter,
  ExternalLink
} from 'lucide-react';
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

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { address } = useWallet();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!address) return;

    setLoading(true);
    const result = await notificationService.getNotifications(address, {
      limit: 100,
      includeRead: filter !== 'unread',
      includeArchived: false,
      type: typeFilter !== 'all' ? typeFilter : undefined
    });

    if (result.success && result.notifications) {
      let filtered = result.notifications;
      
      if (filter === 'unread') {
        filtered = filtered.filter(n => !n.is_read);
      } else if (filter === 'read') {
        filtered = filtered.filter(n => n.is_read);
      }
      
      setNotifications(filtered);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, [address, filter, typeFilter]);

  // Mark as read
  const handleMarkAsRead = async (notificationId: string) => {
    await notificationService.markAsRead(notificationId);
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    if (!address) return;
    
    await notificationService.markAllAsRead(address);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
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
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }

    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  // Get notification style
  const getNotificationStyle = (type: Notification['type']) => {
    const styles = {
      transaction_received: { icon: '💰', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
      transaction_sent: { icon: '📤', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
      transaction_confirmed: { icon: '✅', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
      transaction_failed: { icon: '❌', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
      referral_earned: { icon: '🎁', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
      referral_joined: { icon: '👥', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
      reward_claimed: { icon: '🏆', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
      system_announcement: { icon: '📢', color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
      security_alert: { icon: '🔒', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
      achievement_unlocked: { icon: '🎖️', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' }
    };

    return styles[type] || { icon: '🔔', color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20' };
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 page-enter pb-8 sm:pb-12 px-3 sm:px-4 md:px-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <button 
            onClick={() => navigate('/wallet/dashboard')} 
            className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">Notifications</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-2 px-3 py-2 bg-[#00FF88]/10 text-[#00FF88] rounded-xl hover:bg-[#00FF88]/20 transition-all text-xs font-bold"
          >
            <CheckCheck size={14} />
            <span className="hidden sm:inline">Mark All Read</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Status Filter */}
        <div className="flex gap-2 bg-slate-900 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              filter === 'all'
                ? 'bg-[#00FF88] text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              filter === 'unread'
                ? 'bg-[#00FF88] text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              filter === 'read'
                ? 'bg-[#00FF88] text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Read
          </button>
        </div>

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#00FF88]/50"
        >
          <option value="all">All Types</option>
          <option value="transaction_received">Received</option>
          <option value="transaction_sent">Sent</option>
          <option value="transaction_confirmed">Confirmed</option>
          <option value="transaction_failed">Failed</option>
          <option value="referral_earned">Referral Earned</option>
          <option value="referral_joined">Referral Joined</option>
          <option value="reward_claimed">Rewards</option>
          <option value="system_announcement">System</option>
          <option value="security_alert">Security</option>
        </select>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-[#00FF88] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm text-gray-400">Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <Bell size={32} className="text-gray-600" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Notifications</h3>
          <p className="text-sm text-gray-400 text-center max-w-sm">
            {filter === 'unread' 
              ? "You're all caught up! No unread notifications."
              : filter === 'read'
              ? "No read notifications yet."
              : "We'll notify you about transactions, referrals, and more."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const style = getNotificationStyle(notification.type);
            
            return (
              <div
                key={notification.id}
                className={`luxury-card p-4 sm:p-5 rounded-2xl cursor-pointer hover:scale-[1.01] transition-all ${
                  !notification.is_read ? 'ring-2 ring-[#00FF88]/20' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 ${style.bg} border ${style.border} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <span className="text-2xl">{style.icon}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className={`text-sm font-bold ${style.color}`}>
                        {notification.title}
                      </h4>
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-[#00FF88] rounded-full flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-sm text-gray-400 mb-3">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {timeAgo(notification.created_at)}
                      </span>
                      {notification.action_label && (
                        <span className="text-xs text-[#00FF88] font-bold flex items-center gap-1">
                          {notification.action_label}
                          <ExternalLink size={12} />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    {!notification.is_read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification.id);
                        }}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="Mark as read"
                      >
                        <Check size={16} className="text-gray-400" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArchive(notification.id);
                      }}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      title="Archive"
                    >
                      <Archive size={16} className="text-gray-400" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(notification.id);
                      }}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} className="text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notifications;
