import React, { useEffect, useState } from 'react';
import {
  Lock, ShieldCheck, Clock, ChevronDown, ChevronUp, Zap, RefreshCw,
  ArrowDownLeft, ArrowUpRight, CheckCircle2, AlertCircle, Loader2,
  FileText, MessageSquare, Crown
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { supabaseService, RZCTransaction } from '../services/supabaseService';
import { balanceVerificationService } from '../services/balanceVerificationService';
import VerificationBadge from './VerificationBadge';
import { useVerificationForm } from '../context/VerificationFormContext';

type VerificationPhase = 'auditing' | 'reconciling' | 'finalizing' | 'complete';
interface VerificationStep { id: VerificationPhase; label: string; description: string; }

const STEPS: VerificationStep[] = [
  { id: 'auditing', label: 'Balance Audit', description: 'Reading on-chain & off-chain records' },
  { id: 'reconciling', label: 'Reconciliation', description: 'Cross-checking transaction history' },
  { id: 'finalizing', label: 'Final Verification', description: 'Confirming balances & preparing unlock' },
  { id: 'complete', label: 'Transfers Unlocked', description: 'RZC transfers are enabled' },
];

function derivePhase(address: string | null): VerificationPhase {
  if (!address) return 'auditing';
  const code = address.charCodeAt(address.length - 1) % 3;
  if (code === 0) return 'auditing';
  if (code === 1) return 'reconciling';
  return 'finalizing';
}

const TxRow: React.FC<{ tx: RZCTransaction }> = ({ tx }) => {
  const isCredit = tx.amount > 0;
  const typeColors: Record<string, string> = {
    activation_bonus: 'text-purple-600 dark:text-purple-400',
    signup_bonus: 'text-emerald-600 dark:text-emerald-400',
    referral_bonus: 'text-blue-600 dark:text-blue-400',
    squad_mining: 'text-cyan-600 dark:text-cyan-400',
    migration: 'text-orange-600 dark:text-orange-400',
    transfer: 'text-rose-600 dark:text-rose-400',
  };
  const typeLabel: Record<string, string> = {
    activation_bonus: 'Activation Bonus',
    signup_bonus: 'Signup Reward',
    referral_bonus: 'Referral Reward',
    squad_mining: 'Squad Mining',
    migration: 'Migration Credit',
    transfer: 'Transfer',
  };
  const colorClass = typeColors[tx.type] ?? 'text-slate-500 dark:text-gray-400';
  const label = typeLabel[tx.type] ?? tx.type.replace(/_/g, ' ');
  return (
    <div className="flex items-center justify-between py-2.5 px-1 border-b border-slate-100 dark:border-white/5 last:border-0">
      <div className="flex items-center gap-2.5">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isCredit ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
          {isCredit ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
        </div>
        <div>
          <p className={`text-[11px] font-black leading-none capitalize ${colorClass}`}>{label}</p>
          <p className="text-[9px] text-slate-400 dark:text-gray-600 font-medium mt-0.5">
            {new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-[12px] font-black ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
          {isCredit ? '+' : ''}{tx.amount.toLocaleString()} RZC
        </p>
        <p className="text-[9px] text-slate-400 dark:text-gray-600 font-medium">Bal: {tx.balance_after.toLocaleString()}</p>
      </div>
    </div>
  );
};

const BalanceVerification: React.FC = () => {
  const { address, userProfile, refreshData, rzcPrice } = useWallet();
  const { openForm } = useVerificationForm();
  const rzcBalance: number = (userProfile as any)?.rzc_balance ?? 0;
  const rzcUsd = rzcBalance * rzcPrice;

  const [phase] = useState<VerificationPhase>(derivePhase(address));
  const [txHistory, setTxHistory] = useState<RZCTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [txError, setTxError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [balanceStatus, setBalanceStatus] = useState<any>(null);
  const [verificationRequest, setVerificationRequest] = useState<any>(null);
  const [hasRequest, setHasRequest] = useState(false);
  const [isMigratedUser, setIsMigratedUser] = useState<boolean | null>(null);

  // Check if user is a migrated user by looking for migration transactions or profile flag
  const checkIfMigratedUser = async (userId: string) => {
    try {
      // First check if user profile has a migration flag (more reliable)
      if (userProfile && (userProfile as any).is_migrated_user) {
        setIsMigratedUser(true);
        return;
      }

      // Fallback: Check for migration transactions
      const txResult = await supabaseService.getRZCTransactions(userId, 100);
      if (txResult.success && txResult.data) {
        // Check if user has any migration-type transactions
        const hasMigrationTx = txResult.data.some(tx => tx.type === 'migration');

        // Also check if user has any RZC balance from migration
        // New users typically start with 0 or only have activation/signup bonuses
        const hasSignificantBalance = rzcBalance > 100; // Threshold for migrated users
        const hasOnlyNewUserTransactions = txResult.data.every(tx =>
          tx.type === 'activation_bonus' ||
          tx.type === 'signup_bonus' ||
          tx.type === 'referral_bonus' ||
          tx.type === 'squad_mining'
        );

        // User is migrated if they have migration transactions OR significant balance with non-new-user transactions
        setIsMigratedUser(hasMigrationTx || (hasSignificantBalance && !hasOnlyNewUserTransactions));
      } else {
        // If no transactions or error, assume new user
        setIsMigratedUser(false);
      }
    } catch (error) {
      console.error('Error checking migration status:', error);
      // Default to false (new user) on error
      setIsMigratedUser(false);
    }
  };

  const loadVerificationStatus = async (addr: string) => {
    const vr = await balanceVerificationService.getUserVerificationStatus(addr);
    if (vr.success) { setHasRequest(vr.has_request); setVerificationRequest(vr.request); }
    const bs = await balanceVerificationService.getUserBalanceStatus(addr);
    if (bs.success) setBalanceStatus(bs.balance_status);
  };

  useEffect(() => {
    if (!address) { setTxLoading(false); return; }
    const load = async () => {
      setTxLoading(true); setTxError(null);
      try {
        const profile = await supabaseService.getProfile(address);
        if (!profile.success || !profile.data) throw new Error('Profile not found');

        // Check if user is migrated first
        await checkIfMigratedUser(profile.data.id);

        const txResult = await supabaseService.getRZCTransactions(profile.data.id, 20);
        if (!txResult.success) throw new Error(txResult.error);
        setTxHistory(txResult.data ?? []);
        await loadVerificationStatus(address);
      } catch (err: any) {
        setTxError(err.message ?? 'Failed to load history');
      } finally {
        setTxLoading(false);
      }
    };
    load();
  }, [address]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    if (address) await loadVerificationStatus(address);
    setRefreshing(false);
  };

  const currentStepIndex = STEPS.findIndex(s => s.id === phase);
  const isComplete = phase === 'complete' || (balanceStatus?.balance_verified && balanceStatus?.can_send_rzc);
  const earned = txHistory.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const spent = txHistory.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  // Don't render anything if address is missing or still checking migration status
  if (!address || isMigratedUser === null) return null;

  // Don't render for new users (non-migrated users)
  if (!isMigratedUser) return null;

  return (
    <div className="space-y-3">

      {balanceStatus?.balance_verified && (
        <div className="mb-4"><VerificationBadge showDetails={true} /></div>
      )}

      {/* Header Card (Compact) */}
      <div className={`p-4 rounded-xl border flex flex-col gap-3 transition-colors ${isComplete
        ? 'bg-emerald-50/50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
        : 'bg-amber-50/50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20'
        }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isComplete ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
              }`}>
              {isComplete ? <ShieldCheck size={20} /> : <Lock size={20} />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {isComplete ? 'Balance Verified' : 'Verification Required'}
              </h2>
              <p className="text-xs text-slate-600 dark:text-gray-400">
                {isComplete ? 'RZC transfers are enabled' : 'RZC transfers temporarily locked'}
              </p>
            </div>
          </div>
          <button onClick={handleRefresh} disabled={refreshing}
            className={`p-1.5 rounded-lg transition-colors ${isComplete ? 'hover:bg-emerald-200 dark:hover:bg-emerald-500/30 text-emerald-600'
              : 'hover:bg-amber-200 dark:hover:bg-amber-500/30 text-amber-600'
              }`}>
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Compact Balance */}
        <div className="flex items-center justify-between py-2.5 px-3 bg-white/60 dark:bg-black/20 rounded-lg border border-slate-200/50 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-gray-400 font-medium block">Balance</span>
              <span className="text-sm font-numbers font-bold text-slate-900 dark:text-white">{rzcBalance.toLocaleString()} RZC</span>
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-white/10" />
            <div>
              <span className="text-[11px] text-slate-500 dark:text-gray-400 font-medium block">Value</span>
              <span className="text-sm font-numbers font-bold text-emerald-600 dark:text-emerald-400">${rzcUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Progress Indicators */}
          {!isComplete && (
            <div className="flex items-center gap-1.5" title={`${STEPS[currentStepIndex]?.label}`}>
              {STEPS.map((step, idx) => {
                const isDone = idx < currentStepIndex;
                const isCurr = idx === currentStepIndex;
                return (
                  <div key={step.id} className={`w-2 h-2 rounded-full ${isDone ? 'bg-emerald-500' : isCurr ? 'bg-amber-500 animate-pulse' : 'bg-slate-300 dark:bg-gray-600'
                    }`} />
                )
              })}
            </div>
          )}
        </div>

        {/* Action area */}
        {!isComplete ? (
          <div className="mt-1 space-y-2.5">
            {!hasRequest && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20">
                <AlertCircle size={14} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold text-amber-900 dark:text-amber-300 mb-0.5">Security Assurance & Verification</p>
                  <p className="text-[9px] text-amber-800 dark:text-amber-400 leading-snug">
                    To maintain ecosystem integrity, native RZC transfers are temporarily locked. Please submit a request to verify your balance. <strong className="font-bold">Your funds are 100% safe.</strong>
                  </p>
                </div>
              </div>
            )}
            
            {hasRequest && verificationRequest ? (
              <div className="py-2.5 px-3 bg-blue-50/50 dark:bg-blue-500/5 rounded-lg border border-blue-100 dark:border-blue-500/20">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-bold text-blue-900 dark:text-blue-300">Request Submitted</span>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${verificationRequest.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                    verificationRequest.status === 'under_review' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' :
                      'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-gray-300'
                    }`}>
                    {verificationRequest.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-[10px] text-blue-700 dark:text-blue-400 flex items-center justify-between">
                  <span>ID: <span className="font-numbers">{verificationRequest.id.slice(0, 8)}</span></span>
                  <span>Claim: <span className="font-numbers">{verificationRequest.claimed_balance.toLocaleString()}</span></span>
                </div>
              </div>
            ) : (
              <button
                onClick={() => openForm(address)}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <MessageSquare size={14} />
                Submit Verification Request
              </button>
            )}
          </div>
        ) : (
          <div className="mt-1">
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
              <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold text-emerald-900 dark:text-emerald-300 mb-0.5">100% Secure & Verified</p>
                <p className="text-[9px] text-emerald-800 dark:text-emerald-400 leading-snug">
                  Your RhizaCore balance has been audited and successfully verified. Full transfer capabilities are permanently unlocked.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transaction History Card */}
      <div className="rounded-2xl bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
              <Zap size={13} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-left">
              <p className="text-[11px] font-black text-slate-900 dark:text-white">RZC Transaction History</p>
              {!txLoading && (
                <p className="text-[9px] text-slate-400 dark:text-gray-600 font-medium">{txHistory.length} records loaded</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {txLoading && <Loader2 size={13} className="text-slate-400 animate-spin" />}
            {expanded ? <ChevronUp size={15} className="text-slate-400 dark:text-gray-600" /> : <ChevronDown size={15} className="text-slate-400 dark:text-gray-600" />}
          </div>
        </button>

        {expanded && (
          <div className="border-t border-slate-100 dark:border-white/5 px-5 py-1 max-h-72 overflow-y-auto">
            {txLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-slate-400 dark:text-gray-600">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-xs font-bold">Loading history…</span>
              </div>
            ) : txError ? (
              <div className="flex items-center gap-2 py-5 text-red-500">
                <AlertCircle size={14} />
                <span className="text-xs font-bold">{txError}</span>
              </div>
            ) : txHistory.length === 0 ? (
              <div className="py-8 text-center">
                <Zap size={24} className="mx-auto mb-2 text-slate-200 dark:text-gray-700" />
                <p className="text-xs font-bold text-slate-400 dark:text-gray-600">No RZC transactions yet</p>
              </div>
            ) : (
              <div>{txHistory.map(tx => <TxRow key={tx.id} tx={tx} />)}</div>
            )}
          </div>
        )}

        <div className="px-5 py-3 flex items-center justify-between border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-1.5">
            <Clock size={11} className="text-slate-400 dark:text-gray-600" />
            <span className="text-[10px] text-slate-400 dark:text-gray-600 font-medium">Price: ${rzcPrice} / RZC</span>
          </div>
          <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-wider ${isComplete
            ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
            : 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400'
            }`}>
            {isComplete ? '✓ Verified' : '⏳ Verifying'}
          </span>
        </div>
      </div>

    </div>
  );
};

export default BalanceVerification;
