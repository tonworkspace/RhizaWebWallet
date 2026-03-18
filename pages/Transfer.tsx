
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, 
  Send, 
  ChevronDown, 
  Info, 
  Zap, 
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { tonWalletService } from '../services/tonWalletService';
import { transactionSyncService } from '../services/transactionSync';
import { useToast } from '../context/ToastContext';
import { useTransactions } from '../hooks/useTransactions';
import { getJettonTransaction, estimateJettonTransferFee } from '../utility/jettonTransfer';
import { toDecimals } from '../utility/decimals';
import { Address } from '@ton/core';

const Transfer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { balance, jettons, address, refreshData } = useWallet();
  const { showToast } = useToast();
  const { refreshTransactions } = useTransactions();
  
  // Get asset data from navigation state
  const locationState = location.state as any;
  const isJettonTransfer = locationState?.asset === 'JETTON';
  const isRzcTransfer = locationState?.asset === 'RZC';
  const jettonData = isJettonTransfer ? {
    address: locationState.jettonAddress,
    name: locationState.jettonName,
    symbol: locationState.jettonSymbol,
    decimals: locationState.jettonDecimals,
    balance: locationState.jettonBalance,
    walletAddress: locationState.jettonWalletAddress
  } : null;
  
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  const [step, setStep] = useState<'form' | 'confirm' | 'status'>('form');
  const [status, setStatus] = useState<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [txHash, setTxHash] = useState('');
  const [isSendingAll, setIsSendingAll] = useState(false);
  const [showAssetSelector, setShowAssetSelector] = useState(false);
  const [recipientInfo, setRecipientInfo] = useState<{ valid: boolean; name?: string; walletAddress?: string; error?: string } | null>(null);
  const [isValidatingRecipient, setIsValidatingRecipient] = useState(false);

  // Calculate balances and fees based on asset type
  const { userProfile } = useWallet();
  const rzcBalance = (userProfile as any)?.rzc_balance || 0;
  const rzcBalanceLocked = (userProfile as any)?.balance_locked !== false; // default locked if column missing
  const rzcVerified = (userProfile as any)?.balance_verified === true;
  const canSendRzc = rzcVerified && !rzcBalanceLocked;
  
  const currentBalance = isRzcTransfer
    ? rzcBalance
    : isJettonTransfer && jettonData
    ? parseFloat(toDecimals(BigInt(jettonData.balance), jettonData.decimals))
    : parseFloat(balance || '0');
  
  const sendAmount = parseFloat(amount || '0');
  const estimatedFee = isJettonTransfer ? parseFloat(estimateJettonTransferFee()) : isRzcTransfer ? 0 : 0.01;
  const tonBalance = parseFloat(balance || '0');
  
  // For jettons, we need TON for gas but send jettons
  // For RZC, no gas fees (internal transfer)
  const totalRequired = isRzcTransfer
    ? sendAmount // Just RZC amount, no fees
    : isJettonTransfer 
    ? sendAmount // Just the jetton amount
    : sendAmount + estimatedFee; // TON amount + fee
  
  const hasEnoughTonForGas = isRzcTransfer ? true : tonBalance >= estimatedFee;
  const isLargeTransaction = sendAmount > currentBalance * 0.5;

  const handleMax = () => {
    if (isRzcTransfer) {
      // For RZC, send max RZC balance (no gas fees)
      setAmount(currentBalance.toString());
    } else if (isJettonTransfer) {
      // For jettons, send max jetton balance
      setAmount(currentBalance.toFixed(jettonData?.decimals || 9));
    } else {
      // For TON, leave 0.05 TON for gas (safer buffer)
      const max = Math.max(0, currentBalance - 0.05);
      setAmount(max.toFixed(4));
    }
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

        // Refresh wallet data and transactions
        setTimeout(() => {
          refreshData();
          refreshTransactions(3000);
        }, 1500);
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

  const handleRecipientBlur = async () => {
    if (!isRzcTransfer || !recipient.trim()) {
      setRecipientInfo(null);
      return;
    }
    setIsValidatingRecipient(true);
    try {
      const { rzcTransferService } = await import('../services/rzcTransferService');
      const result = await rzcTransferService.validateRecipient(recipient.trim());
      setRecipientInfo(result.valid
        ? { valid: true, name: result.name || result.username, walletAddress: result.walletAddress }
        : { valid: false, error: result.error }
      );
    } catch {
      setRecipientInfo({ valid: false, error: 'Failed to validate recipient' });
    } finally {
      setIsValidatingRecipient(false);
    }
  };

  const handleConfirm = async () => {
    setStep('status');
    setStatus(null);
    setErrorMessage('');
    
    try {
      if (isRzcTransfer) {
        // Send RZC transaction (internal transfer via Supabase)
        if (!address || !userProfile?.id) {
          throw new Error('Wallet not connected');
        }
        
        // Import RZC transfer service
        const { rzcTransferService } = await import('../services/rzcTransferService');
        
        const result = await rzcTransferService.transferRZC(
          userProfile.id,  // UUID, not wallet address
          recipient,
          parseFloat(amount),
          comment || undefined
        );
        
        if (result.success) {
          setStatus('success');
          setTxHash(result.transactionId || '');
          showToast('RZC sent successfully!', 'success');
          
          // Refresh wallet data and transactions
          setTimeout(() => {
            refreshData();
            refreshTransactions();
          }, 1500);
        } else {
          throw new Error(result.message || result.error || 'RZC transfer failed');
        }
      } else if (isJettonTransfer && jettonData) {
        // Send jetton transaction using native wallet
        if (!address) {
          throw new Error('Wallet not connected');
        }
        
        if (!jettonData.walletAddress) {
          throw new Error('Jetton wallet address not available');
        }
        
        // Convert amount to bigint
        const { fromDecimals } = await import('../utility/decimals');
        const amountBigInt = fromDecimals(amount, jettonData.decimals);
        
        // Send via native wallet service
        const result = await tonWalletService.sendJettonTransaction(
          jettonData.walletAddress,
          recipient,
          amountBigInt,
          '0.01', // forward amount
          comment || undefined
        );
        
        if (result.success) {
          setStatus('success');
          setTxHash(result.txHash || '');
          showToast(`${jettonData.symbol} sent successfully!`, 'success');
          
          // Refresh wallet data and transactions (delay for blockchain indexing)
          setTimeout(() => {
            refreshData();
            refreshTransactions(3000); // extra delay for TonAPI indexing
          }, 1500);
        } else {
          throw new Error(result.error || 'Transaction failed');
        }
      } else {
        // Send regular TON transaction
        const result = await tonWalletService.sendTransaction(
          recipient,
          amount,
          comment || undefined
        );
        
        if (result.success) {
          setStatus('success');
          setTxHash(result.txHash || '');
          showToast('Transaction sent successfully!', 'success');
          
          // Refresh wallet data and transactions (delay for blockchain indexing)
          setTimeout(() => {
            refreshData();
            refreshTransactions(3000); // extra delay for TonAPI indexing
          }, 1500);
        } else {
          setStatus('error');
          setErrorMessage(result.error || 'Transaction failed');
          showToast(result.error || 'Transaction failed', 'error');
        }
      }
    } catch (error) {
      console.error('Transaction error:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
      showToast('Transaction failed', 'error');
    }
  };

  const isValid = isRzcTransfer
    ? (recipientInfo?.valid === true || recipient.length > 20) && sendAmount > 0 && sendAmount <= currentBalance
    : isJettonTransfer
    ? recipient.length > 20 && sendAmount > 0 && sendAmount <= currentBalance && hasEnoughTonForGas
    : recipient.length > 20 && sendAmount > 0 && totalRequired <= currentBalance;

  return (
    <div className="max-w-xl mx-auto space-y-6 sm:space-y-8 page-enter pb-8 sm:pb-12 px-3 sm:px-4 md:px-0">
      <div className="flex items-center gap-3 sm:gap-4">
        <button onClick={() => navigate('/wallet/dashboard')} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 active:scale-95">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl sm:text-2xl font-black text-white">{t('transfer.title')}</h1>
      </div>

      {/* RZC Transfer Lock — Balance Verification Active */}
      {isRzcTransfer && !canSendRzc && (
        <div className="flex flex-col items-center justify-center py-10 animate-in fade-in duration-500">
          <div className="w-full max-w-md p-7 rounded-[2rem] bg-amber-500/10 border-2 border-amber-500/30 flex flex-col items-center gap-4 text-center shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center">
              <Lock size={32} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-amber-300 mb-1">RZC Transfers Disabled</h2>
              <p className="text-sm text-amber-400/80 font-medium leading-relaxed">
                RhizaCore Token (RZC) transfers are temporarily suspended while we verify all user balances across the network.
              </p>
            </div>
            <div className="w-full p-3.5 rounded-xl bg-white/5 border border-amber-500/20 space-y-2 text-left">
              <p className="text-[11px] font-black text-amber-300 uppercase tracking-wider">What this means</p>
              <ul className="space-y-1.5">
                <li className="text-[11px] text-amber-400/80 font-medium flex items-start gap-2">
                  <span className="mt-0.5 flex-shrink-0">•</span>
                  Your RZC balance is safe and fully intact
                </li>
                <li className="text-[11px] text-amber-400/80 font-medium flex items-start gap-2">
                  <span className="mt-0.5 flex-shrink-0">•</span>
                  All balances are being audited to ensure accuracy
                </li>
                <li className="text-[11px] text-amber-400/80 font-medium flex items-start gap-2">
                  <span className="mt-0.5 flex-shrink-0">•</span>
                  Transfers will resume automatically once verification is complete
                </li>
              </ul>
            </div>
            <button
              onClick={() => navigate('/wallet/assets')}
              className="w-full py-3.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-black text-xs uppercase tracking-widest transition-all active:scale-95"
            >
              Back to Assets
            </button>
          </div>
        </div>
      )}

      {(!isRzcTransfer || canSendRzc) && step === 'form' && (
        <div className="space-y-5 sm:space-y-6">
          <div className="luxury-card p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-6 sm:space-y-8">
            <div className="space-y-2.5 sm:space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-2">Select Asset</label>
              <button 
                onClick={() => setShowAssetSelector(!showAssetSelector)}
                className="w-full p-4 sm:p-5 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl flex items-center justify-between hover:bg-white/10 transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="text-lg sm:text-xl">
                    {isRzcTransfer ? '⚡' : isJettonTransfer ? '🪙' : '💎'}
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sm text-white">
                      {isRzcTransfer ? 'RZC' : isJettonTransfer && jettonData ? jettonData.symbol : 'TON'}
                    </div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                      Balance: {isRzcTransfer 
                        ? currentBalance.toLocaleString()
                        : currentBalance.toFixed(isJettonTransfer && jettonData ? Math.min(jettonData.decimals, 4) : 4)
                      }
                    </div>
                  </div>
                </div>
                <ChevronDown size={18} className="text-gray-600" />
              </button>
              
              {/* Asset Selector Dropdown */}
              {showAssetSelector && (
                <div className="absolute z-50 mt-2 w-full max-w-md bg-white dark:bg-[#0a0a0a] border-2 border-gray-300 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <button
                    onClick={() => {
                      navigate('/wallet/transfer', { state: { asset: 'TON' } });
                      setShowAssetSelector(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-3 transition-colors"
                  >
                    <span className="text-xl">💎</span>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">Toncoin</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">TON</p>
                    </div>
                  </button>
                  {/* RZC — clickable if verified & unlocked, otherwise disabled */}
                  {userProfile && (
                    canSendRzc ? (
                      <button
                        onClick={() => {
                          navigate('/wallet/transfer', { state: { asset: 'RZC' } });
                          setShowAssetSelector(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-3 transition-colors"
                      >
                        <span className="text-xl">⚡</span>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">RhizaCore Token</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">RZC</p>
                        </div>
                      </button>
                    ) : (
                      <div className="w-full px-4 py-3 flex items-center gap-3 opacity-50 cursor-not-allowed">
                        <span className="text-xl">⚡</span>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">RhizaCore Token</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">RZC — Verification required</p>
                        </div>
                        <Lock size={13} className="text-amber-500" />
                      </div>
                    )
                  )}
                  <div className="px-4 py-2 bg-gray-50 dark:bg-white/5">
                    <p className="text-xs text-gray-500 dark:text-gray-600 font-medium">
                      More assets available in Assets page
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2.5 sm:space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-2">{t('transfer.recipientAddress')}</label>
              <input 
                type="text"
                value={recipient}
                onChange={(e) => { setRecipient(e.target.value); setRecipientInfo(null); }}
                onBlur={handleRecipientBlur}
                placeholder={isRzcTransfer ? "@username or wallet address" : "EQ... or UQ..."}
                className="w-full bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-5 text-white font-bold text-sm outline-none focus:border-[#00FF88]/50 transition-all placeholder:text-gray-700"
              />
              {isRzcTransfer && isValidatingRecipient && (
                <p className="text-[9px] text-gray-500 ml-2 mt-1">Resolving recipient...</p>
              )}
              {isRzcTransfer && recipientInfo && !isValidatingRecipient && (
                recipientInfo.valid ? (
                  <p className="text-[9px] text-[#00FF88] ml-2 mt-1 font-bold">
                    ✓ {recipientInfo.name ? `@${recipientInfo.name}` : recipientInfo.walletAddress?.slice(0, 8) + '...'}
                  </p>
                ) : (
                  <p className="text-[9px] text-red-400 ml-2 mt-1 font-bold">✗ {recipientInfo.error}</p>
                )
              )}
              {isRzcTransfer && (
                <p className="text-[9px] text-gray-500 ml-2">
                  💡 You can send to @username or wallet address (must be registered in RhizaCore)
                </p>
              )}
            </div>

            <div className="space-y-2.5 sm:space-y-3">
              <div className="flex items-center justify-between ml-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">{t('transfer.amount')}</label>
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
                  step={isJettonTransfer && jettonData ? `0.${'0'.repeat(jettonData.decimals - 1)}1` : "0.0001"}
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-5 text-white font-black text-xl sm:text-2xl outline-none focus:border-[#00FF88]/50 transition-all placeholder:text-gray-800"
                />
                <span className="absolute right-5 sm:right-6 top-1/2 -translate-y-1/2 font-black text-[#00FF88] text-sm">
                  {isRzcTransfer ? 'RZC' : isJettonTransfer && jettonData ? jettonData.symbol : 'TON'}
                </span>
              </div>
              <p className="text-[9px] text-gray-500 ml-2">💡 "Send All" transfers your entire balance with gas fees calculated automatically</p>
            </div>

            <div className="space-y-2.5 sm:space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-2">{t('transfer.memo')}</label>
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
                    <span className="text-gray-400 font-bold">{t('wallet.amount')}:</span>
                    <span className="text-white font-mono">
                      {isRzcTransfer 
                        ? sendAmount.toLocaleString()
                        : sendAmount.toFixed(isJettonTransfer && jettonData ? Math.min(jettonData.decimals, 4) : 4)
                      } {isRzcTransfer ? 'RZC' : isJettonTransfer && jettonData ? jettonData.symbol : 'TON'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-bold">{t('wallet.fee')}:</span>
                    <span className="text-white font-mono">
                      {isRzcTransfer ? 'Free' : `~${estimatedFee.toFixed(4)} TON`}
                    </span>
                  </div>
                  {isJettonTransfer && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 font-bold">TON Balance:</span>
                      <span className={`font-mono ${hasEnoughTonForGas ? 'text-[#00FF88]' : 'text-red-400'}`}>
                        {tonBalance.toFixed(4)} TON
                      </span>
                    </div>
                  )}
                  {!isJettonTransfer && (
                    <>
                      <div className="border-t border-blue-500/20 pt-2 mt-2">
                        <div className="flex justify-between items-center font-bold">
                          <span className="text-blue-300">{t('transfer.total')}:</span>
                          <span className="text-white font-mono">{totalRequired.toFixed(4)} TON</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 font-bold">Remaining Balance:</span>
                        <span className={`font-mono ${currentBalance - totalRequired >= 0 ? 'text-[#00FF88]' : 'text-red-400'}`}>
                          {(currentBalance - totalRequired).toFixed(4)} TON
                        </span>
                      </div>
                    </>
                  )}
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

            {/* Insufficient TON for Gas Warning (Jettons only) */}
            {isJettonTransfer && !hasEnoughTonForGas && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl sm:rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-red-400 mb-1">Insufficient TON for Gas</p>
                  <p className="text-xs text-red-300/80">
                    You need {estimatedFee.toFixed(4)} TON for gas fees but only have {tonBalance.toFixed(4)} TON.
                  </p>
                </div>
              </div>
            )}

            {/* Insufficient Balance Warning */}
            {amount && sendAmount > 0 && totalRequired > currentBalance && !isJettonTransfer && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl sm:rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-red-400 mb-1">{t('errors.insufficientBalance')}</p>
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

      {(!isRzcTransfer || canSendRzc) && step === 'confirm' && (
        <div className="space-y-6 sm:space-y-8 animate-in zoom-in-95 duration-300">
           <div className="luxury-card p-8 sm:p-10 rounded-[2rem] sm:rounded-[3rem] space-y-6 sm:space-y-8">
              <div className="text-center space-y-3 sm:space-y-4">
                 <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">You are sending</p>
                 <h2 className="text-4xl sm:text-5xl font-black text-[#00FF88] tracking-tight-custom">
                   {amount} <span className="text-lg sm:text-xl text-white">
                     {isRzcTransfer ? 'RZC' : isJettonTransfer && jettonData ? jettonData.symbol : 'TON'}
                   </span>
                 </h2>
              </div>

              <div className="space-y-3 sm:space-y-4 pt-4 sm:pt-6 border-t border-white/5">
                <div className="flex justify-between items-center text-sm">
                   <span className="text-gray-500 font-bold">{t('wallet.recipient')}</span>
                   <span className="text-white font-mono text-xs truncate max-w-[150px] sm:max-w-[200px]">{recipient}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                   <span className="text-gray-500 font-bold">{t('wallet.amount')}</span>
                   <span className="text-white font-bold">
                     {isRzcTransfer 
                       ? sendAmount.toLocaleString()
                       : sendAmount.toFixed(isJettonTransfer && jettonData ? Math.min(jettonData.decimals, 4) : 4)
                     } {isRzcTransfer ? 'RZC' : isJettonTransfer && jettonData ? jettonData.symbol : 'TON'}
                   </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                   <span className="text-gray-500 font-bold">{t('wallet.fee')}</span>
                   <span className="text-[#00FF88] font-bold">
                     {isRzcTransfer ? 'Free' : `~${estimatedFee.toFixed(4)} TON`}
                   </span>
                </div>
                {!isJettonTransfer && (
                  <div className="border-t border-white/5 pt-3 mt-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400 font-bold">{t('wallet.total')}</span>
                      <span className="text-white font-bold">{totalRequired.toFixed(4)} TON</span>
                    </div>
                  </div>
                )}
                {comment && (
                  <div className="flex justify-between items-center text-sm pt-2 border-t border-white/5">
                     <span className="text-gray-500 font-bold">{t('wallet.memo')}</span>
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

      {(!isRzcTransfer || canSendRzc) && step === 'status' && (
        <div className="flex flex-col items-center justify-center py-20 space-y-8 animate-in fade-in duration-500">
           {!status ? (
             <>
               <div className="w-20 h-20 bg-[#00FF88]/10 rounded-[2.5rem] flex items-center justify-center relative">
                  <div className="absolute inset-0 border-4 border-[#00FF88] border-t-transparent rounded-[2.5rem] animate-spin" />
                  <Zap size={32} className="text-[#00FF88] animate-pulse" />
               </div>
               <div className="text-center space-y-2">
                 <h2 className="text-2xl font-black text-white">{t('common.loading')}</h2>
                 <p className="text-gray-500 text-sm">Your transaction is being verified by TON validators.</p>
               </div>
             </>
           ) : status === 'success' ? (
             <>
               <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 scale-110 animate-bounce">
                  <CheckCircle2 size={64} />
               </div>
               <div className="text-center space-y-4 max-w-md">
                 <h2 className="text-4xl font-black text-white">{t('common.success')}</h2>
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
                 <h2 className="text-2xl font-black text-white">{t('transfer.failed')}</h2>
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
