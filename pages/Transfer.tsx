
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Send, 
  ChevronDown, 
  Info, 
  Zap, 
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { tonWalletService } from '../services/tonWalletService';
import { transactionSyncService } from '../services/transactionSync';
import { useToast } from '../context/ToastContext';

const Transfer: React.FC = () => {
  const navigate = useNavigate();
  const { balance, jettons, address, refreshData } = useWallet();
  const { showToast } = useToast();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  const [step, setStep] = useState<'form' | 'confirm' | 'status'>('form');
  const [status, setStatus] = useState<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [txHash, setTxHash] = useState('');
  const [isSendingAll, setIsSendingAll] = useState(false);

  // Use current balance directly instead of storing in state
  const currentBalance = parseFloat(balance || '0');
  const sendAmount = parseFloat(amount || '0');
  const estimatedFee = 0.01;
  const totalRequired = sendAmount + estimatedFee;
  const isLargeTransaction = sendAmount > currentBalance * 0.5;

  const handleMax = () => {
    // Leave 0.05 TON for gas (safer buffer)
    const max = Math.max(0, currentBalance - 0.05);
    setAmount(max.toFixed(4));
  };

  const handleSendAll = async () => {
    if (!recipient.trim() || recipient.length < 40) {
      showToast('Please enter a valid recipient address first', 'error');
      return;
    }

    setIsSendingAll(true);
    setStep('status');
    setStatus(null);
    setErrorMessage('');

    try {
      // Calculate send all amount (leave 0.05 TON for gas)
      const gasReserve = 0.05;
      const sendAllAmount = Math.max(0, currentBalance - gasReserve);

      if (sendAllAmount <= 0) {
        throw new Error('Insufficient balance for gas fees');
      }

      const result = await tonWalletService.sendTransaction(
        recipient,
        sendAllAmount.toFixed(4),
        comment || undefined
      );

      if (result.success) {
        setStatus('success');
        setTxHash(result.txHash || '');
        showToast('All funds sent successfully!', 'success');

        // Sync transaction to Supabase
        if (address && result.txHash) {
          try {
            await transactionSyncService.syncSingleTransaction(address, result.txHash);
          } catch (syncError) {
            console.error('Failed to sync transaction:', syncError);
          }
        }

        // Refresh wallet data
        setTimeout(() => {
          refreshData();
        }, 2000);
      } else {
        setStatus('error');
        setErrorMessage(result.error || 'Transaction failed');
        showToast(result.error || 'Transaction failed', 'error');
      }
    } catch (error) {
      console.error('Send All error:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
      showToast('Transaction failed', 'error');
    } finally {
      setIsSendingAll(false);
    }
  };

  const handleNext = () => setStep('confirm');

  const handleConfirm = async () => {
    setStep('status');
    setStatus(null);
    setErrorMessage('');
    
    try {
      // Send real TON transaction
      const result = await tonWalletService.sendTransaction(
        recipient,
        amount,
        comment || undefined
      );
      
      if (result.success) {
        setStatus('success');
        setTxHash(result.txHash || '');
        showToast('Transaction sent successfully!', 'success');
        
        // Sync transaction to Supabase
        if (address && result.txHash) {
          try {
            await transactionSyncService.syncSingleTransaction(address, result.txHash);
          } catch (syncError) {
            console.error('Failed to sync transaction:', syncError);
            // Don't fail the whole transaction if sync fails
          }
        }
        
        // Refresh wallet data
        setTimeout(() => {
          refreshData();
        }, 2000);
      } else {
        setStatus('error');
        setErrorMessage(result.error || 'Transaction failed');
        showToast(result.error || 'Transaction failed', 'error');
      }
    } catch (error) {
      console.error('Transaction error:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
      showToast('Transaction failed', 'error');
    }
  };

  const isValid = recipient.length > 20 && sendAmount > 0 && totalRequired <= currentBalance;

  return (
    <div className="max-w-xl mx-auto space-y-6 sm:space-y-8 page-enter pb-8 sm:pb-12 px-3 sm:px-4 md:px-0">
      <div className="flex items-center gap-3 sm:gap-4">
        <button onClick={() => navigate('/wallet/dashboard')} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 active:scale-95">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl sm:text-2xl font-black text-white">Send Assets</h1>
      </div>

      {step === 'form' && (
        <div className="space-y-5 sm:space-y-6">
          <div className="luxury-card p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-6 sm:space-y-8">
            <div className="space-y-2.5 sm:space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-2">Select Asset</label>
              <button className="w-full p-4 sm:p-5 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl flex items-center justify-between hover:bg-white/10 transition-all active:scale-[0.98]">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="text-lg sm:text-xl">💎</div>
                  <div className="text-left">
                    <div className="font-bold text-sm text-white">TON</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Balance: {balance}</div>
                  </div>
                </div>
                <ChevronDown size={18} className="text-gray-600" />
              </button>
            </div>

            <div className="space-y-2.5 sm:space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-2">Recipient Address</label>
              <input 
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="EQ... or UQ..."
                className="w-full bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-5 text-white font-bold text-sm outline-none focus:border-[#00FF88]/50 transition-all placeholder:text-gray-700"
              />
            </div>

            <div className="space-y-2.5 sm:space-y-3">
              <div className="flex items-center justify-between ml-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Amount</label>
                <div className="flex gap-2">
                  <button 
                    onClick={handleMax} 
                    className="text-[9px] font-black text-[#00FF88] uppercase tracking-widest hover:opacity-70 active:scale-95 px-2 py-1 bg-[#00FF88]/10 rounded"
                  >
                    Send Max
                  </button>
                  <button 
                    onClick={handleSendAll}
                    disabled={!recipient.trim() || recipient.length < 40 || isSendingAll}
                    className="text-[9px] font-black text-orange-400 uppercase tracking-widest hover:opacity-70 active:scale-95 px-2 py-1 bg-orange-500/10 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Send entire balance (gas fees calculated automatically)"
                  >
                    Send All
                  </button>
                </div>
              </div>
              <div className="relative">
                <input 
                  type="number"
                  step="0.0001"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-5 text-white font-black text-xl sm:text-2xl outline-none focus:border-[#00FF88]/50 transition-all placeholder:text-gray-800"
                />
                <span className="absolute right-5 sm:right-6 top-1/2 -translate-y-1/2 font-black text-[#00FF88] text-sm">TON</span>
              </div>
              <p className="text-[9px] text-gray-500 ml-2">💡 "Send All" transfers your entire balance with gas fees calculated automatically</p>
            </div>

            <div className="space-y-2.5 sm:space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-2">Comment (Optional)</label>
              <input 
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Attached message..."
                className="w-full bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-5 text-white font-bold text-sm outline-none focus:border-[#00FF88]/50 transition-all placeholder:text-gray-700"
              />
            </div>

            {/* Transaction Summary */}
            {amount && sendAmount > 0 && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">Transaction Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-bold">Amount:</span>
                    <span className="text-white font-mono">{sendAmount.toFixed(4)} TON</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-bold">Network Fee:</span>
                    <span className="text-white font-mono">~{estimatedFee.toFixed(4)} TON</span>
                  </div>
                  <div className="border-t border-blue-500/20 pt-2 mt-2">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-blue-300">Total Required:</span>
                      <span className="text-white font-mono">{totalRequired.toFixed(4)} TON</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-bold">Remaining Balance:</span>
                    <span className={`font-mono ${currentBalance - totalRequired >= 0 ? 'text-[#00FF88]' : 'text-red-400'}`}>
                      {(currentBalance - totalRequired).toFixed(4)} TON
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Large Transaction Warning */}
            {isLargeTransaction && sendAmount > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl sm:rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-yellow-400 mb-1">Large Transaction</p>
                  <p className="text-xs text-yellow-300/80">You're sending more than 50% of your balance. Please double-check the recipient address.</p>
                </div>
              </div>
            )}

            {/* Insufficient Balance Warning */}
            {amount && sendAmount > 0 && totalRequired > currentBalance && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl sm:rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-red-400 mb-1">Insufficient Balance</p>
                  <p className="text-xs text-red-300/80">
                    You need {totalRequired.toFixed(4)} TON (including fees) but only have {currentBalance.toFixed(4)} TON.
                  </p>
                </div>
              </div>
            )}
          </div>

          <button 
            disabled={!isValid}
            onClick={handleNext}
            className={`w-full p-5 sm:p-6 rounded-xl sm:rounded-2xl flex items-center justify-center gap-3 text-sm font-black uppercase tracking-widest transition-all ${
                isValid ? 'bg-[#00FF88] text-black shadow-3xl hover:scale-[1.02] active:scale-[0.98]' : 'bg-white/5 text-gray-600 cursor-not-allowed'
            }`}
          >
            Review Transaction <Send size={18} />
          </button>
        </div>
      )}

      {step === 'confirm' && (
        <div className="space-y-6 sm:space-y-8 animate-in zoom-in-95 duration-300">
           <div className="luxury-card p-8 sm:p-10 rounded-[2rem] sm:rounded-[3rem] space-y-6 sm:space-y-8">
              <div className="text-center space-y-3 sm:space-y-4">
                 <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">You are sending</p>
                 <h2 className="text-4xl sm:text-5xl font-black text-[#00FF88] tracking-tight-custom">{amount} <span className="text-lg sm:text-xl text-white">TON</span></h2>
              </div>

              <div className="space-y-3 sm:space-y-4 pt-4 sm:pt-6 border-t border-white/5">
                <div className="flex justify-between items-center text-sm">
                   <span className="text-gray-500 font-bold">To</span>
                   <span className="text-white font-mono text-xs truncate max-w-[150px] sm:max-w-[200px]">{recipient}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                   <span className="text-gray-500 font-bold">Amount</span>
                   <span className="text-white font-bold">{sendAmount.toFixed(4)} TON</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                   <span className="text-gray-500 font-bold">Network Fee</span>
                   <span className="text-[#00FF88] font-bold">~{estimatedFee.toFixed(4)} TON</span>
                </div>
                <div className="border-t border-white/5 pt-3 mt-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 font-bold">Total Cost</span>
                    <span className="text-white font-bold">{totalRequired.toFixed(4)} TON</span>
                  </div>
                </div>
                {comment && (
                  <div className="flex justify-between items-center text-sm pt-2 border-t border-white/5">
                     <span className="text-gray-500 font-bold">Comment</span>
                     <span className="text-white italic text-xs truncate max-w-[150px] sm:max-w-[200px]">"{comment}"</span>
                  </div>
                )}
              </div>

              <div className="p-3.5 sm:p-4 bg-white/5 rounded-xl sm:rounded-2xl flex items-center gap-2.5 sm:gap-3">
                 <Info size={16} className="text-blue-400 shrink-0" />
                 <p className="text-[10px] text-gray-500 font-medium">Verify the address carefully. Transactions on TON are irreversible.</p>
              </div>
           </div>

           <div className="flex flex-col gap-3 sm:gap-4">
              <button 
                onClick={handleConfirm}
                className="w-full p-5 sm:p-6 bg-[#00FF88] text-black rounded-xl sm:rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Confirm & Disperse
              </button>
              <button 
                onClick={() => setStep('form')}
                className="w-full p-3 sm:p-4 text-gray-500 font-black text-[10px] uppercase tracking-widest hover:text-white transition-colors active:scale-95"
              >
                Cancel & Edit
              </button>
           </div>
        </div>
      )}

      {step === 'status' && (
        <div className="flex flex-col items-center justify-center py-20 space-y-8 animate-in fade-in duration-500">
           {!status ? (
             <>
               <div className="w-20 h-20 bg-[#00FF88]/10 rounded-[2.5rem] flex items-center justify-center relative">
                  <div className="absolute inset-0 border-4 border-[#00FF88] border-t-transparent rounded-[2.5rem] animate-spin" />
                  <Zap size={32} className="text-[#00FF88] animate-pulse" />
               </div>
               <div className="text-center space-y-2">
                 <h2 className="text-2xl font-black text-white">Broadcasting...</h2>
                 <p className="text-gray-500 text-sm">Your transaction is being verified by TON validators.</p>
               </div>
             </>
           ) : status === 'success' ? (
             <>
               <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 scale-110 animate-bounce">
                  <CheckCircle2 size={64} />
               </div>
               <div className="text-center space-y-4 max-w-md">
                 <h2 className="text-4xl font-black text-white">Success</h2>
                 <p className="text-gray-400 text-sm">Asset dispersion complete. The recipient will see the balance shortly.</p>
                 {txHash && (
                   <div className="p-4 bg-white/5 rounded-xl">
                     <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Transaction ID</p>
                     <p className="text-xs font-mono text-[#00FF88] break-all">{txHash}</p>
                   </div>
                 )}
               </div>
               <button 
                onClick={() => navigate('/wallet/dashboard')}
                className="px-12 py-5 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#00FF88] transition-all shadow-2xl"
               >
                 Back to Dashboard
               </button>
             </>
           ) : (
             <>
               <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500">
                  <XCircle size={64} />
               </div>
               <div className="text-center space-y-4 max-w-md">
                 <h2 className="text-2xl font-black text-white">Transmission Failed</h2>
                 <p className="text-gray-500 text-sm">{errorMessage || 'Network congestion or insufficient gas fees.'}</p>
               </div>
               <button 
                onClick={() => setStep('form')}
                className="px-8 py-4 bg-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/20 transition-all"
               >
                 Try Again
               </button>
             </>
           )}
        </div>
      )}
    </div>
  );
};

export default Transfer;
