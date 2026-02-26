import React, { useState, useEffect } from 'react';
import { Gift, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { referralRewardChecker } from '../services/referralRewardChecker';
import { useToast } from '../context/ToastContext';

interface ClaimMissingRewardsProps {
  userId: string;
  onClaimed?: () => void;
}

const ClaimMissingRewards: React.FC<ClaimMissingRewardsProps> = ({ userId, onClaimed }) => {
  const { showToast } = useToast();
  const [checking, setChecking] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [hasMissing, setHasMissing] = useState(false);
  const [missingCount, setMissingCount] = useState(0);
  const [missingAmount, setMissingAmount] = useState(0);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    checkForMissing();
  }, [userId]);

  const checkForMissing = async () => {
    if (!userId) return;
    
    setChecking(true);
    try {
      const result = await referralRewardChecker.checkMissingBonuses(userId);
      if (result.success) {
        setHasMissing(result.hasMissing);
        setMissingCount(result.missingCount || 0);
        setMissingAmount(result.missingAmount || 0);
        setChecked(true);
      }
    } catch (error) {
      console.error('Error checking missing rewards:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const result = await referralRewardChecker.claimMissingBonuses(userId);
      if (result.success) {
        showToast(
          `Successfully claimed ${result.claimed} referral bonuses! +${result.amount} RZC`,
          'success'
        );
        setHasMissing(false);
        setMissingCount(0);
        setMissingAmount(0);
        if (onClaimed) onClaimed();
      } else {
        showToast(result.error || 'Failed to claim rewards', 'error');
      }
    } catch (error: any) {
      showToast(error.message || 'An error occurred', 'error');
    } finally {
      setClaiming(false);
    }
  };

  if (checking) {
    return (
      <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3">
        <Loader size={20} className="text-[#00FF88] animate-spin" />
        <span className="text-sm text-gray-400">Checking for unclaimed rewards...</span>
      </div>
    );
  }

  if (!checked || !hasMissing) {
    return null;
  }

  return (
    <div className="p-4 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20 rounded-xl space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center shrink-0">
          <AlertCircle size={20} className="text-yellow-400" />
        </div>
        <div className="flex-1">
          <h4 className="font-black text-sm text-white mb-1">
            Unclaimed Referral Rewards!
          </h4>
          <p className="text-xs text-gray-400 mb-2">
            You have {missingCount} unclaimed referral {missingCount === 1 ? 'bonus' : 'bonuses'} worth {missingAmount} RZC
          </p>
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="px-4 py-2 bg-yellow-500 text-black rounded-lg text-xs font-black hover:bg-yellow-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {claiming ? (
              <>
                <Loader size={14} className="animate-spin" />
                Claiming...
              </>
            ) : (
              <>
                <Gift size={14} />
                Claim {missingAmount} RZC Now
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClaimMissingRewards;
