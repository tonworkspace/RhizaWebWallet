/**
 * AddressChangelogModal
 * One-time notification shown to existing users after the TON address format
 * was changed from bounceable (EQ...) to non-bounceable (UQ...).
 *
 * MANDATORY for users whose old EQ address has an activation record —
 * the modal cannot be dismissed until they link or explicitly skip.
 * Re-shown every login until resolved.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ArrowRight, ShieldCheck, RefreshCw, Info,
  CheckCircle2, Loader2, Link2, AlertCircle
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { supabaseService } from '../services/supabaseService';

// Address-info modal: shown once, then dismissed forever
const INFO_DISMISSED_KEY = 'rhiza_address_changelog_dismissed_v1';
// Activation-link: cleared after successful link; set after skip
const ACTIVATION_LINK_KEY = 'rhiza_activation_link_dismissed_v1';
// Tracks whether the user has a pending activation to link (re-checked every login)
const ACTIVATION_PENDING_KEY = 'rhiza_activation_link_pending';

function isInfoDismissed(): boolean {
  try { return localStorage.getItem(INFO_DISMISSED_KEY) === 'true'; } catch { return false; }
}
function dismissInfo(): void {
  try { localStorage.setItem(INFO_DISMISSED_KEY, 'true'); } catch {}
}
function isActivationLinkDone(): boolean {
  // "done" means either linked successfully or user explicitly skipped
  try { return localStorage.getItem(ACTIVATION_LINK_KEY) === 'true'; } catch { return false; }
}
function markActivationLinkDone(): void {
  try {
    localStorage.setItem(ACTIVATION_LINK_KEY, 'true');
    localStorage.removeItem(ACTIVATION_PENDING_KEY);
  } catch {}
}
function setActivationPending(): void {
  try { localStorage.setItem(ACTIVATION_PENDING_KEY, 'true'); } catch {}
}
function isActivationPending(): boolean {
  try { return localStorage.getItem(ACTIVATION_PENDING_KEY) === 'true'; } catch { return false; }
}

type Step = 'info' | 'linking' | 'done' | 'already' | 'completed';

const AddressChangelogModal: React.FC = () => {
  const { address, isLoggedIn, isActivated, userProfile, refreshData } = useWallet();
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<Step>('info');
  const [oldActivation, setOldActivation] = React.useState<{
    activated_at: string | null;
    activation_fee_paid: number;
  } | null>(null);
  const [linkError, setLinkError] = React.useState<string | null>(null);
  // checkKey increments to force the check useEffect to re-run (e.g. after Settings clears keys)
  const [checkKey, setCheckKey] = React.useState(0);

  // Listen for a custom event dispatched by Settings when it clears the dismissed keys
  React.useEffect(() => {
    const handler = () => {
      setOpen(false);
      setStep('info');
      setOldActivation(null);
      setLinkError(null);
      setCheckKey(k => k + 1);
    };
    window.addEventListener('rhiza:address_migration_trigger', handler);
    return () => window.removeEventListener('rhiza:address_migration_trigger', handler);
  }, []);

  // Derive old EQ address from current UQ address
  const eqAddress = React.useMemo(() => {
    if (!address) return null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Address } = require('@ton/ton') as typeof import('@ton/ton');
      return Address.parse(address).toString({ bounceable: true, testOnly: false });
    } catch { return null; }
  }, [address]);

  React.useEffect(() => {
    if (!isLoggedIn || !address || !eqAddress || !userProfile) return;

    const check = async () => {
      // ── Case 0: User already completed the migration previously ───────────
      // This happens when they open the modal manually from Settings after
      // having already linked or skipped. Show a "you're done" state.
      if (isActivationLinkDone() && !isInfoDismissed()) {
        // Info was reset (Settings clears it) but link is done — show completed
        setStep('completed');
        setTimeout(() => setOpen(true), 400);
        return;
      }

      // ── Case 1: Already activated — show info once, then never again ──────
      if (isActivated) {
        if (!isInfoDismissed()) {
          setStep('already');
          setTimeout(() => setOpen(true), 1200);
        }
        return;
      }

      // ── Case 2: Not activated — check for old EQ activation record ────────
      const client = supabaseService.getClient();
      let foundActivation: { activated_at: string | null; activation_fee_paid: number } | null = null;

      if (client && !isActivationLinkDone()) {
        try {
          const { data } = await client
            .from('wallet_activations')
            .select('completed_at, activation_fee_ton')
            .eq('wallet_address', eqAddress)
            .eq('status', 'completed')
            .limit(1)
            .maybeSingle();

          if (data) {
            foundActivation = {
              activated_at: data.completed_at,
              activation_fee_paid: data.activation_fee_ton || 0
            };
            setOldActivation(foundActivation);
            setActivationPending();
          }
        } catch { /* non-fatal */ }
      } else if (isActivationPending() && !isActivationLinkDone()) {
        setOldActivation({ activated_at: null, activation_fee_paid: 0 });
        foundActivation = { activated_at: null, activation_fee_paid: 0 };
      }

      const hasPendingActivation = foundActivation !== null && !isActivationLinkDone();
      const shouldShow = !isInfoDismissed() || hasPendingActivation;

      if (shouldShow) {
        setTimeout(() => setOpen(true), 1200);
      }
    };

    check();
  }, [isLoggedIn, address, eqAddress, userProfile, isActivated, checkKey]);

  const handleClose = () => {
    // Only allow closing if there's no pending activation to link
    if (oldActivation && !isActivationLinkDone()) {
      // Don't close — user must act. Shake the sheet instead (handled by CSS).
      return;
    }
    dismissInfo();
    setOpen(false);
  };

  const handleSkip = () => {
    // User explicitly skips — mark as done so it doesn't re-appear
    markActivationLinkDone();
    dismissInfo();
    setOpen(false);
  };

  const handleLinkActivation = async () => {
    if (!userProfile?.id || !address) return;
    setStep('linking');
    setLinkError(null);

    const client = supabaseService.getClient();
    if (!client) {
      setLinkError('Database not available');
      setStep('info');
      return;
    }

    try {
      // 1. Update wallet_users.is_activated
      const { error: updateErr } = await client
        .from('wallet_users')
        .update({
          is_activated: true,
          activated_at: oldActivation?.activated_at || new Date().toISOString(),
          activation_fee_paid: oldActivation?.activation_fee_paid || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', userProfile.id);

      if (updateErr) throw updateErr;

      // 2. Update wallet_activations to point to new UQ address
      if (eqAddress) {
        await client
          .from('wallet_activations')
          .update({ wallet_address: address })
          .eq('wallet_address', eqAddress)
          .eq('status', 'completed');
      }

      // 3. Refresh context — isActivated flips, WalletLockOverlay disappears
      await refreshData();

      markActivationLinkDone();
      dismissInfo();
      setStep('done');
    } catch (err: any) {
      setLinkError(err?.message || 'Failed to link activation');
      setStep('info');
    }
  };

  if (!open) return null;

  // Whether the X button should be shown (only when no mandatory action pending)
  const canDismissFreely = !oldActivation || isActivationLinkDone() || step === 'done' || step === 'completed' || step === 'already';

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — non-dismissible when activation is pending */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
            onClick={canDismissFreely ? handleClose : undefined}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed z-[201] bottom-0 left-0 right-0 max-w-xl mx-auto bg-white dark:bg-[#111] rounded-t-[2rem] shadow-2xl border-t border-gray-200 dark:border-white/10 max-h-[90vh] flex flex-col"
          >
            {/* Accent bar — amber when action required, green otherwise */}
            <div className={`h-1 w-full bg-gradient-to-r from-transparent ${oldActivation && !isActivationLinkDone() ? 'via-amber-500' : 'via-[#00FF88]'} to-transparent opacity-70 shrink-0`} />

            <div className="p-6 space-y-5 pb-8 overflow-y-auto">

              {/* ── STEP: completed (opened from Settings after already done) ── */}
              {step === 'completed' && (
                <>
                  <Header onClose={handleClose} showClose />
                  <div className="py-4 flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[#00FF88]/10 border-2 border-[#00FF88]/20 flex items-center justify-center">
                      <CheckCircle2 size={32} className="text-[#00FF88]" />
                    </div>
                    <div>
                      <p className="text-base font-heading font-black text-gray-900 dark:text-white uppercase tracking-widest">
                        Migration Complete
                      </p>
                      <p className="text-[10px] font-heading font-bold text-gray-500 uppercase tracking-widest mt-1 leading-relaxed">
                        You've already completed the address migration.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#00FF88]/5 border border-[#00FF88]/20 space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={13} className="text-[#00FF88] shrink-0" />
                      <p className="text-[9px] font-heading font-black text-[#00FF88] uppercase tracking-widest">Address Updated</p>
                    </div>
                    <p className="text-[10px] font-numbers font-bold text-gray-900 dark:text-white break-all leading-relaxed">{address}</p>
                  </div>

                  {isActivated && (
                    <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 flex items-center gap-3">
                      <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
                      <div>
                        <p className="text-[9px] font-heading font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Wallet Activated</p>
                        <p className="text-[8px] font-heading font-bold text-gray-500 uppercase tracking-widest mt-0.5">Your activation status is linked to this address.</p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleClose}
                    className="w-full py-4 rounded-2xl bg-[#00FF88] text-black text-[11px] font-heading font-black uppercase tracking-[0.2em] hover:bg-[#00FF88]/90 active:scale-[0.98] transition-all"
                  >
                    All Good — Close
                  </button>
                </>
              )}

              {/* ── STEP: already activated ── */}
              {step === 'already' && (
                <>
                  <Header onClose={handleClose} showClose />
                  <AddressBlock eqAddress={eqAddress} uqAddress={address} />
                  <InfoCards />
                  <button onClick={handleClose} className="w-full py-4 rounded-2xl bg-[#00FF88] text-black text-[11px] font-heading font-black uppercase tracking-[0.2em] hover:bg-[#00FF88]/90 active:scale-[0.98] transition-all">
                    Got It — Address Updated
                  </button>
                </>
              )}

              {/* ── STEP: info ── */}
              {step === 'info' && (
                <>
                  <Header
                    onClose={canDismissFreely ? handleClose : undefined}
                    showClose={canDismissFreely}
                    badge={oldActivation ? 'Action Required' : undefined}
                  />
                  <AddressBlock eqAddress={eqAddress} uqAddress={address} />
                  <InfoCards />

                  {/* Mandatory activation banner */}
                  {oldActivation && (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 space-y-3">
                      <div className="flex items-center gap-2">
                        <Link2 size={15} className="text-amber-500 shrink-0" />
                        <p className="text-[11px] font-heading font-black text-gray-900 dark:text-white uppercase tracking-widest">
                          Activation Found on Old Address
                        </p>
                      </div>
                      <p className="text-[10px] font-heading font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                        Your old <span className="text-amber-500 font-black">EQ...</span> address was activated
                        {oldActivation.activated_at && (
                          <> on {new Date(oldActivation.activated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>
                        )}. Tap below to restore your activated status on the new address.
                      </p>
                      {linkError && (
                        <div className="flex items-center gap-1.5 text-red-500">
                          <AlertCircle size={12} />
                          <p className="text-[9px] font-heading font-bold uppercase tracking-widest">{linkError}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {oldActivation ? (
                    <div className="space-y-2.5">
                      <button
                        onClick={handleLinkActivation}
                        className="w-full py-4 rounded-2xl bg-amber-500 text-black text-[11px] font-heading font-black uppercase tracking-[0.2em] hover:bg-amber-400 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                      >
                        <Link2 size={14} />
                        Link Activation to New Address
                      </button>
                      <button
                        onClick={handleSkip}
                        className="w-full py-3 rounded-2xl bg-black/5 dark:bg-white/5 text-gray-500 dark:text-gray-400 text-[9px] font-heading font-black uppercase tracking-[0.2em] hover:bg-black/10 dark:hover:bg-white/10 active:scale-[0.98] transition-all"
                      >
                        I'll do this later — skip for now
                      </button>
                    </div>
                  ) : (
                    <button onClick={handleClose} className="w-full py-4 rounded-2xl bg-[#00FF88] text-black text-[11px] font-heading font-black uppercase tracking-[0.2em] hover:bg-[#00FF88]/90 active:scale-[0.98] transition-all">
                      Got It — Update My Address
                    </button>
                  )}
                </>
              )}

              {/* ── STEP: linking ── */}
              {step === 'linking' && (
                <div className="py-10 flex flex-col items-center gap-4 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                    <Loader2 size={24} className="text-amber-500 animate-spin" />
                  </div>
                  <div>
                    <p className="text-sm font-heading font-black text-gray-900 dark:text-white uppercase tracking-widest">Linking Activation...</p>
                    <p className="text-[10px] font-heading font-bold text-gray-500 uppercase tracking-widest mt-1">Syncing your activation status</p>
                  </div>
                </div>
              )}

              {/* ── STEP: done ── */}
              {step === 'done' && (
                <>
                  <div className="py-6 flex flex-col items-center gap-4 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-[#00FF88]/10 flex items-center justify-center">
                      <CheckCircle2 size={28} className="text-[#00FF88]" />
                    </div>
                    <div>
                      <p className="text-base font-heading font-black text-gray-900 dark:text-white uppercase tracking-widest">Activation Linked!</p>
                      <p className="text-[10px] font-heading font-bold text-gray-500 uppercase tracking-widest mt-1 leading-relaxed">
                        Your wallet is now activated under the new address format.
                      </p>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#00FF88]/5 border border-[#00FF88]/20 space-y-1">
                    <p className="text-[9px] font-heading font-black text-[#00FF88] uppercase tracking-widest">New Active Address</p>
                    <p className="text-[10px] font-numbers font-bold text-gray-900 dark:text-white break-all leading-relaxed">{address}</p>
                  </div>
                  <button
                    onClick={() => { dismissInfo(); setOpen(false); }}
                    className="w-full py-4 rounded-2xl bg-[#00FF88] text-black text-[11px] font-heading font-black uppercase tracking-[0.2em] hover:bg-[#00FF88]/90 active:scale-[0.98] transition-all"
                  >
                    Continue to Dashboard
                  </button>
                </>
              )}

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const Header: React.FC<{
  onClose?: () => void;
  showClose?: boolean;
  badge?: string;
}> = ({ onClose, showClose, badge }) => (
  <div className="flex items-start justify-between gap-3">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${badge ? 'bg-amber-500/10' : 'bg-[#00FF88]/10'}`}>
        <RefreshCw size={18} className={badge ? 'text-amber-500' : 'text-[#00FF88]'} />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-base font-heading font-black text-gray-900 dark:text-white uppercase tracking-widest leading-tight">
            Address Update
          </h3>
          {badge && (
            <span className="text-[8px] font-heading font-black bg-amber-500 text-black px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse">
              {badge}
            </span>
          )}
        </div>
        <p className="text-[9px] font-heading font-black text-gray-500 uppercase tracking-[0.2em] mt-0.5">TON Format Change • v2.0</p>
      </div>
    </div>
    {showClose && onClose && (
      <button onClick={onClose} className="p-2 rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors shrink-0">
        <X size={16} />
      </button>
    )}
    {!showClose && (
      <div className="px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <p className="text-[8px] font-heading font-black text-amber-500 uppercase tracking-widest">Required</p>
      </div>
    )}
  </div>
);

const AddressBlock: React.FC<{ eqAddress: string | null; uqAddress: string | null }> = ({ eqAddress, uqAddress }) => (
  <div className="space-y-2.5">
    <p className="text-[11px] font-heading font-black text-gray-500 uppercase tracking-[0.2em]">What Changed</p>
    <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/8 space-y-3">
      {eqAddress && (
        <div className="space-y-1">
          <span className="text-[8px] font-heading font-black text-red-500 uppercase tracking-widest">Old Format (Bounceable)</span>
          <p className="text-[10px] font-numbers font-bold text-gray-500 dark:text-gray-400 break-all leading-relaxed line-through decoration-red-400/60">{eqAddress}</p>
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
        <ArrowRight size={12} className="text-[#00FF88] shrink-0" />
        <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
      </div>
      <div className="space-y-1">
        <span className="text-[8px] font-heading font-black text-[#00FF88] uppercase tracking-widest">New Format (Non-Bounceable)</span>
        <p className="text-[10px] font-numbers font-bold text-gray-900 dark:text-white break-all leading-relaxed">{uqAddress}</p>
      </div>
    </div>
  </div>
);

const InfoCards: React.FC = () => (
  <div className="grid grid-cols-2 gap-2.5">
    <div className="p-3.5 rounded-2xl bg-black/3 dark:bg-white/3 border border-black/8 dark:border-white/8 space-y-1.5">
      <ShieldCheck size={15} className="text-emerald-500" />
      <p className="text-[9px] font-heading font-black text-gray-900 dark:text-white uppercase tracking-widest leading-tight">Same Wallet</p>
      <p className="text-[8px] font-heading font-bold text-gray-500 uppercase tracking-widest leading-relaxed">Your funds, history and referrals are all intact.</p>
    </div>
    <div className="p-3.5 rounded-2xl bg-black/3 dark:bg-white/3 border border-black/8 dark:border-white/8 space-y-1.5">
      <Info size={15} className="text-blue-500" />
      <p className="text-[9px] font-heading font-black text-gray-900 dark:text-white uppercase tracking-widest leading-tight">Why UQ?</p>
      <p className="text-[8px] font-heading font-bold text-gray-500 uppercase tracking-widest leading-relaxed">Non-bounceable (UQ) is the recommended format for exchanges.</p>
    </div>
  </div>
);

export default AddressChangelogModal;
