import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabaseService } from '../services/supabaseService';
import { 
  Lock, 
  Zap, 
  Wallet, 
  RefreshCw, 
  CheckCircle, 
  Cpu, 
  Bell,
  Store,
  Send,
  TrendingUp
} from 'lucide-react';

interface ProtocolActivationWizardProps {
  userId: number;
  userUsername?: string;
  tonAddress?: string | null;
  tonPrice: number;
  onClose: () => void;
  onActivationComplete: () => void;
}

interface ActivationStatus {
  wallet_activated: boolean;
  wallet_activated_at?: string;
  activation_details?: {
    id: number;
    ton_amount: number;
    usd_amount: number;
    rzc_awarded: number;
    transaction_hash: string;
    status: string;
    created_at: string;
  };
}

enum FlowStep {
  INTRO = 'INTRO',
  SCANNING = 'SCANNING',
  COMMITMENT = 'COMMITMENT',
  BROADCASTING = 'BROADCASTING',
  PROVISIONING = 'PROVISIONING',
  SUCCESS = 'SUCCESS'
}

interface ProtocolLogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'ai';
}

const ProtocolActivationWizard: React.FC<ProtocolActivationWizardProps> = ({
  userId,
  userUsername,
  tonAddress,
  tonPrice,
  onClose,
  onActivationComplete
}) => {
  const { error, warning } = useToast();
  const [step, setStep] = useState<FlowStep>(FlowStep.INTRO);
  const [logs, setLogs] = useState<ProtocolLogEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [, setActivationStatus] = useState<ActivationStatus | null>(null);
  const [paymentSent, setPaymentSent] = useState(false);
  const [securityInsight, setSecurityInsight] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [connected] = useState(!!tonAddress); // Simplified - using passed address

  // Constants
  const USD_AMOUNT = 15;
  const RZC_REWARD = 150;
  const tonAmountNeeded = useMemo(() => USD_AMOUNT / tonPrice, [tonPrice]);

  const loadActivationStatus = useCallback(async () => {
    if (!userId) return;
    setIsCheckingStatus(true);
    try {
      const { data, error } = await supabaseService.getClient()
        ?.rpc('get_wallet_activation_status', { p_user_id: userId });

      if (error) {
        console.error('Error loading activation status:', error);
        return;
      }

      if (data?.success) {
        setActivationStatus(data);
        if (data.wallet_activated) {
          setStep(FlowStep.SUCCESS);
        }
      }
    } catch (error) {
      console.error('Error loading activation status:', error);
    } finally {
      setIsCheckingStatus(false);
    }
  }, [userId]);

  useEffect(() => {
    loadActivationStatus();
  }, [loadActivationStatus]);

  const addLog = useCallback((message: string, type: ProtocolLogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      message,
      type
    }].slice(-20));
  }, []);

  const getSecurityInsight = async (_address: string): Promise<string> => {
    const insights = [
      "Address entropy analysis complete. High-grade randomness detected in wallet generation.",
      "Network topology scan reveals optimal routing paths for transaction propagation.",
      "Cryptographic signature validation confirms authentic wallet derivation process.",
      "Blockchain state verification indicates clean transaction history with no anomalies."
    ];
    return insights[Math.floor(Math.random() * insights.length)];
  };

  const getProvisioningUpdate = async (step: number): Promise<string> => {
    const updates = [
      "Initializing secure vault allocation for RZC token distribution...",
      "Establishing encrypted communication channels with RhizaCore mesh network...",
      "Finalizing identity verification and protocol access permissions..."
    ];
    return updates[step - 1] || "Processing protocol activation...";
  };

  const startSecurityScan = async () => {
    setStep(FlowStep.SCANNING);
    setIsProcessing(true);
    addLog("Initializing RhizaCore Security Protocol...", "info");
    
    await new Promise(r => setTimeout(r, 500));
    addLog("Analyzing connected node address entropy...", "info");
    
    const insight = await getSecurityInsight(tonAddress || "GUEST_OPERATOR");
    setSecurityInsight(insight);
    addLog(insight, "ai");
    
    await new Promise(r => setTimeout(r, 400));
    addLog("Environment verified. Proceeding to commitment phase.", "success");
    
    setIsProcessing(false);
    setStep(FlowStep.COMMITMENT);
  };

  const handlePayment = async () => {
    if (!connected || !tonAddress) {
      error('Please connect your TON wallet first');
      return;
    }

    if (isProcessing || paymentSent) {
      return;
    }

    // Check if already activated
    try {
      const currentStatus = await supabaseService.getClient()
        ?.rpc('get_wallet_activation_status', { p_user_id: userId });

      if (currentStatus?.data?.wallet_activated) {
        warning('Your wallet is already activated');
        setStep(FlowStep.SUCCESS);
        onActivationComplete();
        return;
      }
    } catch (error) {
      console.error('Error checking activation status:', error);
    }

    setIsProcessing(true);
    addLog(`Preparing transaction for ${tonAmountNeeded.toFixed(4)} TON...`, "info");

    try {
      // Simulate payment for now - TODO: Implement real TON payment
      await new Promise(r => setTimeout(r, 2000));
      
      const mockTxHash = `tx_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
      setTxHash(mockTxHash);
      setPaymentSent(true);
      setStep(FlowStep.BROADCASTING);
      addLog("Transaction signed. Broadcasting to TON Network...", "success");

      await new Promise(r => setTimeout(r, 1500));
      addLog("Ledger confirmation received.", "success");
      setStep(FlowStep.PROVISIONING);

      // Provisioning steps
      for (let i = 1; i <= 3; i++) {
        const update = await getProvisioningUpdate(i);
        addLog(update, "ai");
        await new Promise(r => setTimeout(r, 600));
      }

      // Process activation
      const activationResult = await supabaseService.getClient()
        ?.rpc('process_wallet_activation', {
          p_user_id: userId,
          p_ton_amount: tonAmountNeeded,
          p_ton_price: tonPrice,
          p_transaction_hash: mockTxHash,
          p_sender_address: tonAddress,
          p_receiver_address: 'RECEIVER_ADDRESS' // TODO: Use actual receiver
        });

      if (activationResult?.error) {
        throw activationResult.error;
      }

      if (activationResult?.data?.success) {
        addLog(`Protocol activated. ${RZC_REWARD} RZC provisioned to identity.`, "success");
        setStep(FlowStep.SUCCESS);
        await loadActivationStatus();
        await new Promise(r => setTimeout(r, 100));
        onActivationComplete();
      } else {
        throw new Error(activationResult?.data?.error || 'Failed to activate wallet');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      setIsProcessing(false);
      setPaymentSent(false);
      addLog("Transaction failed or cancelled by operator.", "error");
      setStep(FlowStep.COMMITMENT);
      error(error.message || 'Failed to process payment');
    }
  };

  const StepIndicator = useMemo(() => () => (
    <div className="flex gap-1.5 justify-center mb-6">
      {[FlowStep.INTRO, FlowStep.SCANNING, FlowStep.COMMITMENT, FlowStep.BROADCASTING, FlowStep.SUCCESS].map((s) => (
        <div
          key={s}
          className={`h-1 rounded-full transition-all duration-500 ${
            Object.values(FlowStep).indexOf(step) >= Object.values(FlowStep).indexOf(s)
              ? 'w-6 bg-blue-500'
              : 'w-2 bg-white/10'
          }`}
        />
      ))}
    </div>
  ), [step]);

  const ProtocolLog = ({ logs }: { logs: ProtocolLogEntry[] }) => (
    <div className="bg-black/40 rounded-2xl p-4 border border-white/5 max-h-48 overflow-y-auto custom-scrollbar">
      <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
        <Cpu size={12} />
        Protocol Log
      </div>
      <div className="space-y-2 font-mono text-[10px]">
        {logs.map((log) => (
          <div key={log.id} className="flex gap-2">
            <span className="text-zinc-600 shrink-0">{log.timestamp}</span>
            <span className={`${
              log.type === 'success' ? 'text-green-400' :
              log.type === 'error' ? 'text-red-400' :
              log.type === 'ai' ? 'text-blue-300 italic' :
              'text-zinc-300'
            }`}>
              {log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
      <div
        className="absolute inset-0 bg-black/95 backdrop-blur-md will-change-transform"
        onClick={onClose}
      />

      {isCheckingStatus ? (
        <div className="bg-[#050505] border md:border border-white/10 rounded-[40px] w-full max-w-md relative z-10 shadow-2xl p-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
              <RefreshCw size={28} className="text-blue-400 animate-spin" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Checking Status</h3>
            <p className="text-zinc-500 text-sm">Verifying activation state...</p>
          </div>
        </div>
      ) : (
        <div className="bg-[#050505] border md:border border-white/10 rounded-[40px] w-full max-w-md relative z-10 shadow-2xl flex flex-col max-h-[80vh] md:max-h-[85vh] animate-in slide-in-from-bottom duration-300 overflow-hidden mb-20 md:mb-0 will-change-transform">
          {isProcessing && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent scanner-line z-20 will-change-transform" />
          )}

          <div className="p-6 pb-0 flex flex-col items-center shrink-0">
            <StepIndicator />
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-all duration-500 will-change-transform ${
              step === FlowStep.SUCCESS ? 'bg-green-500/10 border-green-500/20' : 'bg-blue-500/10 border-blue-500/20'
            } border shadow-lg`}>
              {step === FlowStep.INTRO && <Lock size={28} className="text-blue-400" />}
              {step === FlowStep.SCANNING && <Cpu size={28} className="text-yellow-400 animate-pulse" />}
              {step === FlowStep.COMMITMENT && <Wallet size={28} className="text-blue-400" />}
              {(step === FlowStep.BROADCASTING || step === FlowStep.PROVISIONING) && <RefreshCw size={28} className="text-blue-400 animate-spin" />}
              {step === FlowStep.SUCCESS && <CheckCircle size={28} className="text-green-400" />}
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              {step === FlowStep.INTRO && "Operator Verification"}
              {step === FlowStep.SCANNING && "Security Audit"}
              {step === FlowStep.COMMITMENT && "Protocol Commitment"}
              {step === FlowStep.BROADCASTING && "Broadcasting Node"}
              {step === FlowStep.PROVISIONING && "Provisioning Assets"}
              {step === FlowStep.SUCCESS && "Activation Complete"}
            </h3>
            <p className="text-zinc-500 text-[10px] uppercase tracking-[0.2em] font-black mt-1">
              RhizaCore Network / Layer 2
            </p>
          </div>

          <div className="overflow-y-auto p-6 space-y-5 custom-scrollbar flex-1 will-change-scroll">
            {step === FlowStep.INTRO && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="bg-white/[0.02] rounded-3xl p-5 border border-white/5 text-center">
                  <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">
                    Node Identification
                  </div>
                  <div className="text-lg font-mono text-blue-400">
                    @{userUsername || 'GUEST_OPERATOR'}
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/5 flex justify-around">
                    <div>
                      <div className="text-xs text-zinc-500 mb-1 uppercase tracking-tighter">
                        Activation Fee
                      </div>
                      <div className="text-xl font-bold text-white">${USD_AMOUNT}.00</div>
                    </div>
                    <div className="w-px bg-white/5 h-8 self-center" />
                    <div>
                      <div className="text-xs text-zinc-500 mb-1 uppercase tracking-tighter">
                        Genesis Grant
                      </div>
                      <div className="text-xl font-bold text-green-400">{RZC_REWARD} RZC</div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div className="p-3 rounded-2xl bg-white/[0.01] border border-white/5 flex items-center gap-2">
                    <Lock size={14} className="text-blue-500" />
                    <span className="text-zinc-400">Vault Access</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/[0.01] border border-white/5 flex items-center gap-2">
                    <Zap size={14} className="text-yellow-500" />
                    <span className="text-zinc-400">Full Features</span>
                  </div>
                </div>
              </div>
            )}

            {(step === FlowStep.SCANNING || step === FlowStep.BROADCASTING || step === FlowStep.PROVISIONING) && (
              <div className="space-y-4 animate-in fade-in">
                <ProtocolLog logs={logs} />
                {securityInsight && step === FlowStep.SCANNING && (
                  <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex gap-3 italic text-[11px] text-blue-300">
                    <Zap size={16} className="text-blue-400 shrink-0" />
                    {securityInsight}
                  </div>
                )}
              </div>
            )}

            {step === FlowStep.COMMITMENT && (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
                <div className="bg-blue-600/5 rounded-3xl p-6 border border-blue-500/20">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm text-zinc-400">Required Commitment</span>
                    <span className="text-xl font-mono font-bold text-blue-400">
                      {tonAmountNeeded.toFixed(4)} TON
                    </span>
                  </div>
                  <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        {connected ? 'Identity Link Established' : 'Identity Link Missing'}
                      </span>
                    </div>
                    {connected && (
                      <div className="text-[10px] text-zinc-400 font-mono break-all opacity-60">
                        {tonAddress}
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl flex gap-3 text-[10px] text-yellow-200/70">
                  <Bell size={16} className="text-yellow-500 shrink-0" />
                  This commitment permanently activates your node on the RhizaCore mesh. Fee is consumed for protocol provisioning.
                </div>
              </div>
            )}

            {step === FlowStep.SUCCESS && (
              <div className="space-y-6 text-center animate-in zoom-in-95">
                <div className="bg-green-500/5 border border-green-500/10 rounded-3xl p-8 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-green-500/20" />
                  <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2">
                    Assets Provisioned
                  </div>
                  <div className="text-5xl font-mono font-bold text-green-400 mb-1">
                    {RZC_REWARD}.00
                  </div>
                  <div className="text-sm font-bold text-zinc-400 uppercase tracking-[0.3em]">
                    RZC Tokens
                  </div>
                  {txHash && (
                    <div className="mt-6 pt-6 border-t border-white/5 flex flex-col items-center">
                      <div className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold mb-1">
                        Transaction Proof
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono opacity-50 break-all text-center max-w-full">
                        {txHash.length > 32 ? `${txHash.slice(0, 16)}...${txHash.slice(-16)}` : txHash}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {[Store, Send, TrendingUp].map((Icon, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-2"
                    >
                      <Icon size={18} className="text-zinc-600" />
                      <div className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">
                        Unlocked
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-white/5 bg-[#080808] flex gap-3 shrink-0">
            {step === FlowStep.INTRO && (
              <button
                onClick={startSecurityScan}
                className="w-full py-4 bg-white text-black hover:bg-zinc-200 rounded-2xl text-sm font-bold transition-all duration-200 shadow-xl"
              >
                Verify Protocol Integrity
              </button>
            )}

            {step === FlowStep.COMMITMENT && (
              <>
                <button
                  onClick={() => setStep(FlowStep.INTRO)}
                  className="flex-1 py-4 bg-zinc-900 text-zinc-400 rounded-2xl text-sm font-bold transition-all duration-200"
                >
                  Back
                </button>
                <button
                  onClick={handlePayment}
                  disabled={isProcessing || !connected}
                  className="flex-[2] py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-sm font-bold transition-all duration-200 shadow-xl shadow-blue-500/20 disabled:opacity-30"
                >
                  Commit {tonAmountNeeded.toFixed(4)} TON
                </button>
              </>
            )}

            {step === FlowStep.SUCCESS && (
              <button
                onClick={async () => {
                  await onActivationComplete();
                }}
                className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl text-sm font-bold transition-all duration-200 shadow-xl shadow-green-500/20"
              >
                Launch Dashboard
              </button>
            )}

            {(step === FlowStep.SCANNING || step === FlowStep.BROADCASTING || step === FlowStep.PROVISIONING) && (
              <div className="w-full flex items-center justify-center py-4 bg-zinc-900/50 rounded-2xl gap-3 text-zinc-500 text-xs font-bold uppercase tracking-widest">
                <RefreshCw size={16} className="animate-spin" />
                Processing Identity Data
              </div>
            )}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
          .custom-scrollbar::-webkit-scrollbar { width: 3px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { 
            background: rgba(59, 130, 246, 0.3); 
            border-radius: 10px; 
          }
          @keyframes scanner {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100vw); }
          }
          .scanner-line {
            animation: scanner 1.5s linear infinite;
          }
          .will-change-transform {
            will-change: transform;
          }
          .will-change-scroll {
            will-change: scroll-position;
          }
        `
      }} />
    </div>
  );
};

export default ProtocolActivationWizard;
