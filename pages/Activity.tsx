import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Activity as ActivityIcon,
  LogIn,
  LogOut,
  Wallet,
  Send,
  Download,
  User,
  Settings,
  Users,
  Gift,
  Eye,
  Zap,
  Filter
} from 'lucide-react';
import { notificationService, type UserActivity } from '../services/notificationService';
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

// Format date
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const Activity: React.FC = () => {
  const navigate = useNavigate();
  const { address } = useWallet();
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Fetch activities
  const fetchActivities = async () => {
    if (!address) return;

    setLoading(true);
    const result = await notificationService.getUserActivity(address, {
      limit: 100,
      activityType: typeFilter !== 'all' ? typeFilter : undefined
    });

    if (result.success && result.activities) {
      setActivities(result.activities);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchActivities();
  }, [address, typeFilter]);

  // Get activity icon and style
  const getActivityStyle = (type: UserActivity['activity_type']) => {
    const styles = {
      login: { icon: LogIn, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
      logout: { icon: LogOut, color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
      wallet_created: { icon: Wallet, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
      wallet_imported: { icon: Download, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
      transaction_sent: { icon: Send, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
      transaction_received: { icon: Download, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
      profile_updated: { icon: User, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
      settings_changed: { icon: Settings, color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
      referral_code_used: { icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
      referral_code_shared: { icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
      reward_claimed: { icon: Gift, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
      page_viewed: { icon: Eye, color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
      feature_used: { icon: Zap, color: 'text-[#00FF88]', bg: 'bg-[#00FF88]/10', border: 'border-[#00FF88]/20' }
    };

    return styles[type] || { icon: ActivityIcon, color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20' };
  };

  // Group activities by date
  const groupedActivities = activities.reduce((groups, activity) => {
    const date = new Date(activity.created_at).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {} as Record<string, UserActivity[]>);

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
            <h1 className="text-xl sm:text-2xl font-black text-white">Activity Log</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {activities.length} {activities.length === 1 ? 'activity' : 'activities'} recorded
            </p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="flex-1 px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#00FF88]/50"
        >
          <option value="all">All Activities</option>
          <option value="login">Login</option>
          <option value="logout">Logout</option>
          <option value="wallet_created">Wallet Created</option>
          <option value="wallet_imported">Wallet Imported</option>
          <option value="transaction_sent">Transactions Sent</option>
          <option value="transaction_received">Transactions Received</option>
          <option value="profile_updated">Profile Updates</option>
          <option value="settings_changed">Settings Changes</option>
          <option value="referral_code_used">Referral Used</option>
          <option value="referral_code_shared">Referral Shared</option>
          <option value="reward_claimed">Rewards Claimed</option>
          <option value="page_viewed">Page Views</option>
          <option value="feature_used">Features Used</option>
        </select>
      </div>

      {/* Activities List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-[#00FF88] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm text-gray-400">Loading activity log...</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <ActivityIcon size={32} className="text-gray-600" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Activity Yet</h3>
          <p className="text-sm text-gray-400 text-center max-w-sm">
            Your activity will appear here as you use the wallet.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedActivities).map(([date, dateActivities]) => (
            <div key={date} className="space-y-3">
              {/* Date Header */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-700" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {date}
                </span>
                <div className="h-px flex-1 bg-slate-700" />
              </div>

              {/* Activities for this date */}
              <div className="space-y-2">
                {dateActivities.map((activity) => {
                  const style = getActivityStyle(activity.activity_type);
                  const Icon = style.icon;
                  
                  return (
                    <div
                      key={activity.id}
                      className="luxury-card p-4 rounded-xl hover:scale-[1.01] transition-all"
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`w-10 h-10 ${style.bg} border ${style.border} rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <Icon size={18} className={style.color} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className={`text-sm font-bold ${style.color}`}>
                              {activity.description}
                            </h4>
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {timeAgo(activity.created_at)}
                            </span>
                          </div>
                          
                          {/* Metadata */}
                          {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                            <div className="mt-2 p-2 bg-slate-800/50 rounded-lg">
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {Object.entries(activity.metadata).map(([key, value]) => (
                                  <div key={key} className="flex flex-col">
                                    <span className="text-gray-500 capitalize">
                                      {key.replace(/_/g, ' ')}:
                                    </span>
                                    <span className="text-white font-mono truncate">
                                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Full timestamp */}
                          <p className="text-[10px] text-gray-600 mt-2">
                            {formatDate(activity.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Activity;
