import React, { useEffect, useState } from 'react';
import { Shield, CheckCircle, Star, Crown, Award } from 'lucide-react';
import { balanceVerificationService } from '../services/balanceVerificationService';
import { useWallet } from '../context/WalletContext';

interface BalanceStatus {
  balance_verified: boolean;
  balance_locked: boolean;
  verification_level: string;
  verification_badge_earned_at: string | null;
  rzc_balance: number;
  can_send_rzc: boolean;
  verification_badges: Array<{
    badge_type: string;
    badge_level: string;
    earned_at: string;
    is_active: boolean;
    metadata: any;
  }>;
}

interface VerificationBadgeProps {
  className?: string;
  showDetails?: boolean;
}

const VerificationBadge: React.FC<VerificationBadgeProps> = ({ 
  className = '', 
  showDetails = false 
}) => {
  const { address, isLoggedIn } = useWallet();
  const [balanceStatus, setBalanceStatus] = useState<BalanceStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only load balance status if user is logged in and has an address
    if (isLoggedIn && address) {
      loadBalanceStatus();
    } else {
      // If not logged in, set loading to false and clear status
      setLoading(false);
      setBalanceStatus(null);
    }
  }, [isLoggedIn, address]);

  const loadBalanceStatus = async () => {
    try {
      const result = await balanceVerificationService.getUserBalanceStatus();
      if (result.success) {
        setBalanceStatus(result.balance_status);
      } else {
        console.warn('Failed to load balance status:', result.error);
        setBalanceStatus(null);
      }
    } catch (error) {
      console.error('Failed to load balance status:', error);
      setBalanceStatus(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-6 h-6 bg-slate-200 dark:bg-white/10 rounded-full animate-pulse" />
        {showDetails && (
          <div className="w-20 h-4 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
        )}
      </div>
    );
  }

  // Don't render anything if user is not logged in or no balance status
  if (!isLoggedIn || !address || !balanceStatus) {
    return null;
  }

  const getBadgeIcon = (level: string) => {
    switch (level) {
      case 'gold': return Crown;
      case 'premium': return Star;
      case 'basic': return CheckCircle;
      default: return Shield;
    }
  };

  const getBadgeColor = (level: string, verified: boolean) => {
    if (!verified) return 'text-slate-400 dark:text-gray-600';
    
    switch (level) {
      case 'gold': return 'text-yellow-500';
      case 'premium': return 'text-purple-500';
      case 'basic': return 'text-green-500';
      default: return 'text-blue-500';
    }
  };

  const getBadgeBackground = (level: string, verified: boolean) => {
    if (!verified) return 'bg-slate-100 dark:bg-white/5';
    
    switch (level) {
      case 'gold': return 'bg-yellow-50 dark:bg-yellow-500/10';
      case 'premium': return 'bg-purple-50 dark:bg-purple-500/10';
      case 'basic': return 'bg-green-50 dark:bg-green-500/10';
      default: return 'bg-blue-50 dark:bg-blue-500/10';
    }
  };

  const BadgeIcon = getBadgeIcon(balanceStatus.verification_level);
  const iconColor = getBadgeColor(balanceStatus.verification_level, balanceStatus.balance_verified);
  const bgColor = getBadgeBackground(balanceStatus.verification_level, balanceStatus.balance_verified);

  if (!showDetails) {
    // Simple badge icon
    return (
      <div className={`inline-flex items-center gap-1 ${className}`} title={
        balanceStatus.balance_verified 
          ? `Verified ${balanceStatus.verification_level} • Balance Unlocked`
          : 'Balance Locked • Verification Required'
      }>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${bgColor}`}>
          <BadgeIcon size={14} className={iconColor} />
        </div>
        {balanceStatus.balance_verified && (
          <span className="text-xs font-bold text-green-600 dark:text-green-400">
            Verified
          </span>
        )}
      </div>
    );
  }

  // Detailed badge display
  return (
    <div className={`${bgColor} rounded-xl p-4 border border-slate-200 dark:border-white/10 ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          balanceStatus.balance_verified ? bgColor : 'bg-slate-200 dark:bg-white/10'
        }`}>
          <BadgeIcon size={20} className={iconColor} />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white">
            {balanceStatus.balance_verified ? 'Balance Verified' : 'Verification Required'}
          </h3>
          <p className="text-xs text-slate-600 dark:text-gray-400">
            {balanceStatus.balance_verified 
              ? `${balanceStatus.verification_level.charAt(0).toUpperCase() + balanceStatus.verification_level.slice(1)} Level`
              : 'Complete verification to unlock transfers'
            }
          </p>
        </div>
      </div>

      {/* Status indicators */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600 dark:text-gray-400">Balance Status:</span>
          <span className={`font-bold ${
            balanceStatus.can_send_rzc 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-red-600 dark:text-red-400'
          }`}>
            {balanceStatus.can_send_rzc ? 'Unlocked' : 'Locked'}
          </span>
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600 dark:text-gray-400">RZC Transfers:</span>
          <span className={`font-bold ${
            balanceStatus.can_send_rzc 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-red-600 dark:text-red-400'
          }`}>
            {balanceStatus.can_send_rzc ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        {balanceStatus.verification_badge_earned_at && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-gray-400">Verified:</span>
            <span className="font-bold text-green-600 dark:text-green-400">
              {new Date(balanceStatus.verification_badge_earned_at).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {/* Verification badges */}
      {balanceStatus.verification_badges.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10">
          <p className="text-xs font-bold text-slate-600 dark:text-gray-400 mb-2">Badges Earned:</p>
          <div className="flex flex-wrap gap-1">
            {balanceStatus.verification_badges.map((badge, index) => (
              <div
                key={index}
                className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-black/20 rounded-lg text-xs font-bold"
              >
                <Award size={10} className="text-yellow-500" />
                <span className="text-slate-700 dark:text-gray-300">
                  {badge.badge_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificationBadge;