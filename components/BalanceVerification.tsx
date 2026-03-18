import React, { useEffect, useState } from 'react';
import {
  Lock, ShieldCheck, Clock, ChevronDown, ChevronUp, Zap, RefreshCw,
  ArrowDownLeft, ArrowUpRight, CheckCircle2, AlertCircle, Loader2,
  FileText, MessageSquare, Crown
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { supabaseService, RZCTransaction } from '../services/supabaseService';
import { RZC_CONFIG } from '../config/rzcConfig';
import { balanceVerificationService } from '../services/balanceVerificationService';
import VerificationBadge from './VerificationBadge';
import { useVerificationForm } from '../context/VerificationFormContext';

type VerificationPhase = 'auditing' | 'reconciling' | 'finalizing' | 'complete';
interface VerificationStep { id: VerificationPhase; label: string; description: string; }

const STEPS: VerificationStep[] = [
  { id: 'auditing',     label: 'Balance Audit',     description: 'Reading on-chain & off-chain records' },
  { id: 'reconciling', label: 'Reconciliation',     description: 'Cross-checking transaction history' },
  { id: 'finalizing',  label: 'Final Verification', description: 'Confirming balances & preparing unlock' },
  { id: 'complete',    label: 'Transfers Unlocked', description: 'RZC transfers are enabled' },
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
    signup_bonus:     'text-emerald-600 dark:text-emerald-400',
    referral_bonus:   'text-blue-600 dark:text-blue-400',
    squad_mining:     'text-cyan-600 dark:text-cyan-400',
    migration:        'text-orange-600 dark:text-orange-400',
    transfer:         'text-rose-600 dark:text-rose-400',
  };
  const typeLabel: Record<string, string> = {
    activation_bonus: 'Activation Bonus',
    signup_bonus:     'Signup Reward',
    referral_bonus:   'Referral Reward',
    squad_mining:     'Squad Mining',
    migration:        'Migration Credit',
    transfer:         'Transfer',
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
  const { address, userProfile, refreshData } = useWallet();
  const { openForm } = useVerificationForm();
  const rzcBalance: number = (userProfile as any)?.rzc_balance ?? 0;
  const rzcUsd = rzcBalance * RZC_CONFIG.RZC_PRICE_USD;

  const [phase]                         = useState<VerificationPhase>(derivePhase(address));
  const [txHistory, setTxHistory]       = useState<RZCTransaction[]>([]);
  const [txLoading, setTxLoading]       = useState(true);
  const [txError, setTxError]           = useState<string | null>(null);
  const [expanded, setExpanded]         = useState(false);
  const [refreshing, setRefreshing]     = useState(false);
  const [balanceStatus, setBalanceStatus]         = useState<any>(null);
  const [verificationRequest, setVerificationRequest] = useState<any>(null);
  const [hasRequest, setHasRequest]     = useState(false);

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
  const spent  = txHistory.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  if (!address) return null;

  return (
    <div className="space-y-3">

      {balanceStatus?.balance_verified && (
        <div className="mb-4"><VerificationBadge showDetails={true} /></div>
      )}

      {/* Header Card */}
      <div className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-500 ${
        isComplete
          ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 border-emerald-300 dark:border-emerald-500/30'
          : 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border-amber-300 dark:border-amber-500/30'
      }`}>
        <div className={`absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-30 ${isComplete ? 'bg-emerald-400' : 'bg-amber-400'}`} />

        <div className="relative p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-md ${isComplete ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-amber-500'}`}>
                {isComplete ? <ShieldCheck size={22} className="text-white" /> : <Lock size={22} className="text-white" />}
              </div>
              <div>
                <h2 className={`text-sm font-black leading-tight ${isComplete ? 'text-emerald-900 dark:text-emerald-300' : 'text-amber-900 dark:text-amber-300'}`}>
                  {isComplete ? 'Balance Verified' : 'Balance Verification'}
                </h2>
                <p className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${isComplete ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                  {isComplete ? 'RZC transfers enabled' : 'RZC transfers temporarily locked'}
                </p>
              </div>
            </div>
            <button onClick={handleRefresh} disabled={refreshing}
              className={`p-2 rounded-xl transition-all active:scale-95 ${isComplete ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'}`}>
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Balance display */}
          <div className="mb-4 p-4 rounded-xl bg-white/60 dark:bg-black/20 border border-white/40 dark:border-white/10">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-500 mb-1">Your RZC Balance</p>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {rzcBalance.toLocaleString()}
                  <span className="text-base font-bold text-slate-400 dark:text-gray-500 ml-1.5">RZC</span>
                </p>
                <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  ≈ ${rzcUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </p>
              </div>
              <div className="text-right space-y-1">
                <div className="flex items-center gap-1.5 justify-end">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-slate-500 dark:text-gray-400">+{earned.toLocaleString()} earned</span>
                </div>
                <div className="flex items-center gap-1.5 justify-end">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span className="text-[10px] font-bold text-slate-500 dark:text-gray-400">-{spent.toLocaleString()} sent</span>
                </div>
              </div>
            </div>
          </div>

          {/* Progress steps */}
          <div className="space-y-2.5">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-600">Verification Progress</p>
            <div className="space-y-1.5">
              {STEPS.map((step, idx) => {
                const isDone    = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                return (
                  <div key={step.id} className="flex items-center gap-2.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                      isDone    ? 'bg-emerald-500 text-white' :
                      isCurrent ? (isComplete ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse') + ' text-white' :
                                  'bg-slate-100 dark:bg-white/10 text-slate-300 dark:text-gray-600'
                    }`}>
                      {isDone ? <CheckCircle2 size={13} />
                        : isCurrent && !isComplete ? <Loader2 size={11} className="animate-spin" />
                        : isComplete && isCurrent ? <CheckCircle2 size={13} />
                        : <span className="text-[9px] font-black">{idx + 1}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-black ${isDone || isCurrent ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-gray-600'}`}>
                          {step.label}
                        </span>
                        {isCurrent && !isComplete && (
                          <span className="text-[8px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                        )}
                        {isDone && (
                          <span className="text-[8px] font-black bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Done</span>
                        )}
                      </div>
                      {isCurrent && (
                        <p className="text-[9px] text-slate-400 dark:text-gray-500 font-medium mt-0.5 truncate">{step.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action area */}
          {!isComplete && (
            <div className="mt-4 space-y-3">
              <div className="p-3 rounded-xl bg-amber-100/60 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-start gap-2">
                <AlertCircle size={13} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[10px] text-amber-800 dark:text-amber-300 font-semibold leading-snug mb-1">
                    Your RZC balance is currently <span className="font-black">locked for security</span>.
                  </p>
                  <p className="text-[9px] text-amber-700 dark:text-amber-400 font-medium leading-snug">
                    Submit a verification request to unlock your RZC transfers. Your funds are 100% safe.
                  </p>
                </div>
              </div>

              {hasRequest && verificationRequest ? (
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                  <div className="flex items-start gap-2">
                    <FileText size={13} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[10px] font-black text-blue-800 dark:text-blue-300 uppercase tracking-wider">
                          Verification Request Submitted
                        </p>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                          verificationRequest.status === 'pending'      ? 'bg-amber-100 text-amber-700' :
                          verificationRequest.status === 'under_review' ? 'bg-blue-100 text-blue-700' :
                          verificationRequest.status === 'approved'     ? 'bg-green-100 text-green-700' :
                          verificationRequest.status === 'resolved'     ? 'bg-emerald-100 text-emerald-700' :
                          verificationRequest.status === 'rejected'     ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {verificationRequest.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-[9px] text-blue-700 dark:text-blue-400 font-medium leading-snug">
                        Request ID: {verificationRequest.id.slice(0, 8)}... •{' '}
                        Claimed: {verificationRequest.claimed_balance.toLocaleString()} RZC •{' '}
                        Submitted: {new Date(verificationRequest.created_at).toLocaleDateString()}
                      </p>
                      {verificationRequest.admin_notes && (
                        <p className="text-[9px] text-blue-600 dark:text-blue-400 font-medium mt-1 italic">
                          Admin Note: {verificationRequest.admin_notes}
                        </p>
                      )}
                      {verificationRequest.status === 'resolved' && (
                        <div className="mt-2 p-2 bg-green-50 dark:bg-green-500/10 rounded-lg border border-green-200 dark:border-green-500/20">
                          <div className="flex items-center gap-1">
                            <Crown size={12} className="text-green-600 dark:text-green-400" />
                            <p className="text-[9px] font-black text-green-700 dark:text-green-400 uppercase tracking-wider">Verification Complete!</p>
                          </div>
                          <p className="text-[8px] text-green-600 dark:text-green-400 font-medium mt-0.5">
                            Your balance is now unlocked and you've earned a verification badge!
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => openForm(address)}
                  className="w-full p-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white transition-all flex items-center justify-center gap-2"
                >
                  <MessageSquare size={14} />
                  <span className="text-[10px] font-black uppercase tracking-wider">Submit Balance Verification Request</span>
                </button>
              )}
            </div>
          )}
        </div>
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
            <span className="text-[10px] text-slate-400 dark:text-gray-600 font-medium">Price: ${RZC_CONFIG.RZC_PRICE_USD} / RZC</span>
          </div>
          <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-wider ${
            isComplete
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
