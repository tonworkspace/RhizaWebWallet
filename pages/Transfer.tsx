
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
import { WalletManager } from '../utils/walletManager';
import { tonWalletService } from '../services/tonWalletService';
import { transactionSyncService } from '../services/transactionSync';
import { useToast } from '../context/ToastContext';
import { useTransactions } from '../hooks/useTransactions';
import { getJettonTransaction, estimateJettonTransferFee } from '../utility/jettonTransfer';
import { toDecimals } from '../utility/decimals';
import { Address } from '@ton/core';
import { CHAIN_META } from '../constants';
import { tetherWdkService } from '../services/tetherWdkService';

const Transfer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { balance, jettons, address, refreshData, multiChainBalances } = useWallet();

  const allWallets = WalletManager.getWallets();
  const multiChainWallet = allWallets.find(w => w.type === 'secondary');
  // Show multi-chain options whenever a secondary wallet exists — regardless of which wallet is active
  const isMultiChainActive = !!multiChainWallet;
  const multiChainAddresses = multiChainWallet && multiChainWallet.addresses ? {
    evmAddress: multiChainWallet.addresses.evm,
    tonAddress: multiChainWallet.addresses.ton,
    btcAddress: multiChainWallet.addresses.btc
  } : null;

  // Get current EVM chain with proper typing
  const currentEvmChain = tetherWdkService.getCurrentEvmChain();

  // Block explorer URL for the active EVM chain
  const EVM_EXPLORERS: Record<string, string> = {
    ethereum:  'https://etherscan.io/tx',
    polygon:   'https://polygonscan.com/tx',
    arbitrum:  'https://arbiscan.io/tx',
    bsc:       'https://bscscan.com/tx',
    avalanche: 'https://snowtrace.io/tx',
    plasma:    'https://etherscan.io/tx',
    stable:    'https://etherscan.io/tx',
    sepolia:   'https://sepolia.etherscan.io/tx',
  };
  const explorerTxUrl = EVM_EXPLORERS[currentEvmChain] ?? 'https://etherscan.io/tx';
  
  // Dynamic native EVM token symbol (ETH / BNB / MATIC / AVAX etc.)
  const nativeSymbol = CHAIN_META[currentEvmChain]?.symbol ?? 'ETH';
  const chainName   = CHAIN_META[currentEvmChain]?.name ?? 'EVM';

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
  // Live fee estimate state — fetched from quoteSend* before the confirm step
  const [feeEstimate, setFeeEstimate] = useState<string | null>(null);
  const [isFetchingFee, setIsFetchingFee] = useState(false);
  // Pre-select wallet type from navigation state (EVM / BTC from Assets page)
  const initWallet = (): 'primary' | 'multichain-evm' | 'multichain-btc' | 'multichain-ton' | 'multichain-usdt' => {
    const a = (location.state as any)?.asset;
    if (a === 'EVM' || a === 'ETH') return 'multichain-evm';
    if (a === 'BTC') return 'multichain-btc';
    if (a === 'USDT') return 'multichain-usdt';
    if (a === 'MULTICHAIN-TON') return 'multichain-ton';
    if (a === 'JETTON') return 'primary';
    if (a === 'RZC') return 'primary';
    return 'primary';
  };
  const [selectedWallet, setSelectedWallet] = useState<'primary' | 'multichain-evm' | 'multichain-btc' | 'multichain-ton' | 'multichain-usdt'>(initWallet);
  const [recipientInfo, setRecipientInfo] = useState<{ valid: boolean; name?: string; walletAddress?: string; error?: string } | null>(null);
  const [isValidatingRecipient, setIsValidatingRecipient] = useState(false);

  // Fetch a real fee estimate from the WDK quoteSend* APIs
  const fetchFeeEstimate = async () => {
    if (!amount || !recipient || parseFloat(amount) <= 0) return;
    setIsFetchingFee(true);
    try {
      const { tetherWdkService } = await import('../services/tetherWdkService');
      if (selectedWallet === 'multichain-evm') {
        const q = await tetherWdkService.quoteSendEvmTransaction(recipient, amount);
        setFeeEstimate(q ? `${parseFloat(q.feeEth).toFixed(6)} ${nativeSymbol}` : `~0.0001 ${nativeSymbol}`);
      } else if (selectedWallet === 'multichain-usdt') {
        const q = await tetherWdkService.quoteSendErc20Transaction(recipient, amount, '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', 6);
        setFeeEstimate(q ? `${parseFloat(q.feeEth).toFixed(6)} ${nativeSymbol}` : `~0.001 ${nativeSymbol}`);
      } else if (selectedWallet === 'multichain-ton') {
        const q = await tetherWdkService.quoteSendTonTransaction(recipient, amount, comment || undefined);
        setFeeEstimate(q ? `${q.feeTon} TON` : '~0.01 TON');
      } else {
        setFeeEstimate(`~${estimatedFee.toFixed(4)} TON`);
      }
    } catch {
      // Fall back to static estimates on error
      setFeeEstimate(selectedWallet === 'multichain-evm' ? `~0.0001 ${nativeSymbol}` : '~0.01 TON');
    } finally {
      setIsFetchingFee(false);
    }
  };

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
      : selectedWallet === 'multichain-evm'
        ? parseFloat(multiChainBalances?.evm || '0')
        : selectedWallet === 'multichain-btc'
          ? parseFloat(multiChainBalances?.btc || '0')
          : selectedWallet === 'multichain-usdt'
            ? parseFloat(multiChainBalances?.usdt || '0')
            : selectedWallet === 'multichain-ton'
              ? parseFloat(multiChainBalances?.ton || '0')
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

  const handleMax = async () => {
    if (isRzcTransfer) {
      setAmount(currentBalance.toString());
    } else if (isJettonTransfer) {
      setAmount(currentBalance.toFixed(jettonData?.decimals || 9));
    } else if (selectedWallet === 'multichain-btc') {
      // BTC: use real fee quote to compute accurate max spendable
      if (!recipient.trim()) {
        // No address yet — use conservative estimate
        const conservativeFee = 0.0001; // ~10000 sats reserve
        setAmount(Math.max(0, currentBalance - conservativeFee).toFixed(8));
        return;
      }
      try {
        const { tetherWdkService } = await import('../services/tetherWdkService');
        const q = await tetherWdkService.quoteSendBtcTransaction(recipient, currentBalance.toFixed(8));
        const fee = q ? Number(q.feeBigInt) / 1e8 : 0.0001;
        setAmount(Math.max(0, currentBalance - fee).toFixed(8));
      } catch {
        setAmount(Math.max(0, currentBalance - 0.0001).toFixed(8));
      }
    } else if (selectedWallet === 'multichain-evm' || selectedWallet === 'multichain-usdt') {
      // EVM / USDT: leave a gas buffer (0.002 ETH)
      const gasBuffer = 0.002;
      if (selectedWallet === 'multichain-evm') {
        setAmount(Math.max(0, currentBalance - gasBuffer).toFixed(6));
      } else {
        // USDT: amount is token itself, gas buffer is irrelevant for the amount input
        // but we should still show the user they need ETH.
        setAmount(currentBalance.toFixed(2));
      }
    } else {
      // TON: leave 0.05 TON for gas
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
      // ── Multi-chain EVM Send All ──────────────────────────────────────────
      if (selectedWallet === 'multichain-evm') {
        const { tetherWdkService } = await import('../services/tetherWdkService');
        // EVM: subtract estimated gas buffer from balance
        const gasBuffer = 0.002; // ~0.002 ETH as gas reserve
        const sendAllAmount = Math.max(0, currentBalance - gasBuffer);
        if (sendAllAmount <= 0) throw new Error('Insufficient EVM balance for gas fees');
        const result = await tetherWdkService.sendEvmTransaction(recipient, sendAllAmount.toFixed(6));
        if (result.success) {
          setStatus('success');
          setTxHash(result.txHash || '');
          showToast('All ETH sent successfully!', 'success');
          setTimeout(() => { refreshData(); }, 1500);
        } else { throw new Error(result.error || 'EVM transaction failed'); }
        return;
      }

      // ── Multi-chain BTC Send All ──────────────────────────────────────────
      if (selectedWallet === 'multichain-btc') {
        const { tetherWdkService } = await import('../services/tetherWdkService');
        // BTC: use quoteSend to get real fee, then send balance minus fee
        const feeQuote = await tetherWdkService.quoteSendBtcTransaction(recipient, currentBalance.toFixed(8));
        const feeBuffer = feeQuote ? Number(feeQuote.feeBigInt) / 1e8 : 0.0001;
        const sendAllAmount = Math.max(0, currentBalance - feeBuffer);
        if (sendAllAmount <= 0) throw new Error('Insufficient BTC balance for network fee');
        const result = await tetherWdkService.sendBtcTransaction(recipient, sendAllAmount.toFixed(8));
        if (result.success) {
          setStatus('success');
          setTxHash(result.txHash || '');
          showToast('All BTC sent successfully!', 'success');
          setTimeout(() => { refreshData(); }, 1500);
        } else { throw new Error(result.error || 'BTC transaction failed'); }
        return;
      }

      // ── Multi-chain USDT Send All ──────────────────────────────────────────
      if (selectedWallet === 'multichain-usdt') {
        const { tetherWdkService } = await import('../services/tetherWdkService');
        // USDT: send the entire token balance
        const result = await tetherWdkService.sendErc20Transaction(recipient, currentBalance.toFixed(2), '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', 6);
        if (result.success) {
          setStatus('success');
          setTxHash(result.txHash || '');
          showToast('All USDT sent successfully!', 'success');
          setTimeout(() => { refreshData(); }, 1500);
        } else { throw new Error(result.error || 'USDT transaction failed'); }
        return;
      }

      // ── Multi-chain TON Send All ──────────────────────────────────────────
      if (selectedWallet === 'multichain-ton') {
        const { tetherWdkService } = await import('../services/tetherWdkService');
        const gasReserve = 0.05;
        const sendAllAmount = Math.max(0, currentBalance - gasReserve);
        if (sendAllAmount <= 0) throw new Error('Insufficient TON balance for gas fees');
        const result = await tetherWdkService.sendTonTransaction(recipient, sendAllAmount.toFixed(4), comment || undefined);
        if (result.success) {
          setStatus('success');
          setTxHash(result.txHash || '');
          showToast('All TON sent successfully!', 'success');
          setTimeout(() => { refreshData(); }, 1500);
        } else { throw new Error(result.error || 'TON transaction failed'); }
        return;
      }

      // ── Primary TON wallet Send All (default) ────────────────────────────
      const gasReserve = 0.05;
      const sendAllAmount = Math.max(0, currentBalance - gasReserve);
      if (sendAllAmount <= 0) throw new Error('Insufficient balance for gas fees');

      const result = await tonWalletService.sendTransaction(
        recipient,
        sendAllAmount.toFixed(4),
        comment || undefined
      );

      if (result.success) {
        setStatus('success');
        setTxHash(result.txHash || '');
        showToast('All funds sent successfully!', 'success');
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

  const handleNext = async () => {
    // Fetch real fee estimate before entering confirm step
    setFeeEstimate(null);
    await fetchFeeEstimate();
    setStep('confirm');
  };

  const handleRecipientBlur = async () => {
    if (!recipient.trim()) {
      setRecipientInfo(null);
      return;
    }

    // RZC Transfer - validate username or wallet address
    if (isRzcTransfer) {
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
      return;
    }

    // EVM / USDT Address Validation
    if (selectedWallet === 'multichain-evm' || selectedWallet === 'multichain-usdt') {
      const evmAddressRegex = /^0x[a-fA-F0-9]{40}$/;
      if (evmAddressRegex.test(recipient.trim())) {
        setRecipientInfo({ valid: true });
      } else {
        setRecipientInfo({ valid: false, error: 'Invalid EVM address format (must start with 0x)' });
      }
      return;
    }

    // BTC Address Validation
    if (selectedWallet === 'multichain-btc') {
      const btcRegex = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/;
      if (btcRegex.test(recipient.trim())) {
        setRecipientInfo({ valid: true });
      } else {
        setRecipientInfo({ valid: false, error: 'Invalid Bitcoin address (bc1..., 1..., or 3...)' });
      }
      return;
    }

    // TON Address Validation (for both primary and multi-chain TON)
    // TON addresses start with EQ, UQ, or kQ (base64 encoded)
    const tonAddressRegex = /^[EUk]Q[a-zA-Z0-9_-]{46}$/;
    if (tonAddressRegex.test(recipient.trim())) {
      setRecipientInfo({ valid: true });
    } else {
      setRecipientInfo({ valid: false, error: 'Invalid TON address format (must start with EQ, UQ, or kQ)' });
    }
  };

  const handleConfirm = async () => {
    setStep('status');
    setStatus(null);
    setErrorMessage('');

    try {
      // Multi-Chain Wallet EVM Transfer
      if (selectedWallet === 'multichain-evm') {
        const { tetherWdkService } = await import('../services/tetherWdkService');
        const result = await tetherWdkService.sendEvmTransaction(recipient, amount);
        if (result.success) {
          setStatus('success');
          setTxHash(result.txHash || '');
          showToast('ETH sent successfully!', 'success');
          setTimeout(() => { refreshData(); }, 1500);
        } else {
          throw new Error(result.error || 'EVM transaction failed');
        }
      }
      // Multi-Chain Wallet BTC Transfer
      else if (selectedWallet === 'multichain-btc') {
        const { tetherWdkService } = await import('../services/tetherWdkService');
        const result = await tetherWdkService.sendBtcTransaction(recipient, amount);
        if (result.success) {
          setStatus('success');
          setTxHash(result.txHash || '');
          showToast('BTC sent successfully!', 'success');
          setTimeout(() => { refreshData(); }, 1500);
        } else {
          throw new Error(result.error || 'BTC transaction failed');
        }
      }
      // Multi-Chain Wallet USDT Transfer
      else if (selectedWallet === 'multichain-usdt') {
        const { tetherWdkService } = await import('../services/tetherWdkService');
        const result = await tetherWdkService.sendErc20Transaction(recipient, amount, '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', 6);
        if (result.success) {
          setStatus('success');
          setTxHash(result.txHash || '');
          showToast('USDT sent successfully!', 'success');
          setTimeout(() => { refreshData(); }, 1500);
        } else {
          throw new Error(result.error || 'USDT transaction failed');
        }
      }
      // Multi-Chain Wallet TON Transfer
      else if (selectedWallet === 'multichain-ton') {
        const { tetherWdkService } = await import('../services/tetherWdkService');

        const result = await tetherWdkService.sendTonTransaction(
          recipient,
          amount,
          comment || undefined
        );

        if (result.success) {
          setStatus('success');
          setTxHash(result.txHash || '');
          showToast('TON sent successfully!', 'success');

          // Refresh wallet data
          setTimeout(() => {
            refreshData();
          }, 1500);
        } else {
          throw new Error(result.error || 'TON transaction failed');
        }
      }
      // RZC Transfer
      else if (isRzcTransfer) {
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
      }
      // Jetton Transfer
      else if (isJettonTransfer && jettonData) {
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
      }
      // Primary TON Transfer
      else {
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
    : (selectedWallet === 'multichain-evm' || selectedWallet === 'multichain-usdt')
      ? /^0x[a-fA-F0-9]{40}$/.test(recipient) && sendAmount > 0 && sendAmount <= currentBalance
      : selectedWallet === 'multichain-btc'
        ? /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(recipient) && sendAmount > 0 && sendAmount <= currentBalance
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
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">Sending Asset</label>

              {/* Professional Asset Trigger Card */}
              <button
                onClick={() => setShowAssetSelector(!showAssetSelector)}
                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between hover:bg-white/8 hover:border-white/20 transition-all active:scale-[0.99] group"
              >
                <div className="flex items-center gap-3.5">
                  {/* Live Logo */}
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center shrink-0 shadow-sm">
                    {isRzcTransfer ? (
                      <span className="text-xl text-[#00FF88]">⚡</span>
                    ) : isJettonTransfer && jettonData ? (
                      <div className="w-full h-full bg-violet-500/20 flex items-center justify-center text-xs font-black text-violet-300">{(jettonData.symbol || '').slice(0, 2)}</div>
                    ) : selectedWallet === 'multichain-evm' ? (
                      <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png" className="w-full h-full object-cover" alt="ETH" />
                    ) : selectedWallet === 'multichain-usdt' ? (
                      <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png" className="w-full h-full object-cover" alt="USDT" />
                    ) : selectedWallet === 'multichain-btc' ? (
                      <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png" className="w-full h-full object-cover" alt="BTC" />
                    ) : (
                      <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ton/info/logo.png" className="w-full h-full object-cover" alt="TON" />
                    )}
                  </div>
                  <div className="text-left">
                    <div className="font-black text-sm text-white leading-tight">
                      {isRzcTransfer ? 'RhizaCore Token'
                        : isJettonTransfer && jettonData ? jettonData.name
                          : selectedWallet === 'multichain-evm' ? 'Ethereum / Polygon'
                            : selectedWallet === 'multichain-usdt' ? 'Tether USD'
                              : selectedWallet === 'multichain-btc' ? 'Bitcoin'
                                : selectedWallet === 'multichain-ton' ? 'Toncoin (W5)'
                                  : 'Toncoin'}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-gray-500 font-bold">
                        {isRzcTransfer ? currentBalance.toLocaleString() : currentBalance.toFixed(isJettonTransfer && jettonData ? Math.min(jettonData.decimals, 4) : 4)}
                        {' '}
                        {isRzcTransfer ? 'RZC' : isJettonTransfer && jettonData ? jettonData.symbol
                          : selectedWallet === 'multichain-evm' ? 'ETH'
                            : selectedWallet === 'multichain-usdt' ? 'USDT'
                              : selectedWallet === 'multichain-btc' ? 'BTC'
                                : 'TON'}
                      </span>
                      <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border
                        text-gray-500 border-white/10">
                        {isRzcTransfer ? 'Community'
                          : isJettonTransfer ? 'Jetton'
                            : selectedWallet === 'multichain-evm' ? 'EVM'
                              : selectedWallet === 'multichain-usdt' ? 'EVM'
                                : selectedWallet === 'multichain-btc' ? 'BTC'
                                  : selectedWallet === 'multichain-ton' ? 'W5'
                                    : 'Native'}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronDown size={16} className={`text-gray-500 transition-transform duration-200 ${showAssetSelector ? 'rotate-180' : ''}`} />
              </button>

              {/* Show wallet address for multi-chain wallets */}
              {(selectedWallet === 'multichain-evm' || selectedWallet === 'multichain-btc' || selectedWallet === 'multichain-ton' || selectedWallet === 'multichain-usdt') && multiChainAddresses && (
                <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl">
                  <p className="text-[9px] font-black uppercase tracking-widest text-violet-400 mb-1">Sending From</p>
                  <p className="text-xs font-mono text-violet-300 break-all">
                    {(selectedWallet === 'multichain-evm' || selectedWallet === 'multichain-usdt') ? multiChainAddresses.evmAddress
                      : selectedWallet === 'multichain-btc' ? multiChainAddresses.btcAddress
                        : multiChainAddresses.tonAddress}
                  </p>
                </div>
              )}

              {/* FULL-SCREEN ASSET SELECTOR MODAL */}
              {showAssetSelector && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                    onClick={() => setShowAssetSelector(false)}
                  />
                  {/* Sheet */}
                  <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0d0d0d] border-t border-white/10 rounded-t-[2rem] shadow-2xl max-h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-300">
                    {/* Handle + Header */}
                    <div className="flex flex-col items-center pt-3 pb-4 px-5 border-b border-white/5 shrink-0">
                      <div className="w-10 h-1 bg-white/20 rounded-full mb-4" />
                      <div className="flex items-center justify-between w-full">
                        <h3 className="text-base font-black text-white">Select Asset</h3>
                        <button onClick={() => setShowAssetSelector(false)} className="text-gray-500 hover:text-white transition-colors text-xs font-bold">Close</button>
                      </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="overflow-y-auto flex-1 pb-8">

                      {/* ── Primary Assets ── */}
                      <div className="px-5 pt-4 pb-1">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">Primary Wallet</p>
                      </div>

                      {/* TON */}
                      <button
                        onClick={() => { setSelectedWallet('primary'); navigate('/wallet/transfer', { state: { asset: 'TON' } }); setShowAssetSelector(false); }}
                        className={`w-full px-5 py-3.5 flex items-center gap-4 hover:bg-white/5 transition-all ${!isRzcTransfer && !isJettonTransfer && selectedWallet === 'primary' ? 'bg-white/5' : ''
                          }`}
                      >
                        <div className="w-11 h-11 rounded-full overflow-hidden border border-white/10 shrink-0">
                          <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ton/info/logo.png" className="w-full h-full object-cover" alt="TON" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-bold text-white">Toncoin</p>
                          <p className="text-xs text-gray-500">TON · Native Network</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-white">{parseFloat(balance || '0').toFixed(4)}</p>
                          <p className="text-[10px] text-gray-600">TON</p>
                        </div>
                      </button>

                      {/* RZC */}
                      {userProfile && (
                        canSendRzc ? (
                          <button
                            onClick={() => { setSelectedWallet('primary'); navigate('/wallet/transfer', { state: { asset: 'RZC' } }); setShowAssetSelector(false); }}
                            className="w-full px-5 py-3.5 flex items-center gap-4 hover:bg-white/5 transition-all"
                          >
                            <div className="w-11 h-11 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                              <span className="text-xl text-[#00FF88]">⚡</span>
                            </div>
                            <div className="flex-1 text-left">
                              <p className="text-sm font-bold text-white">RhizaCore Token</p>
                              <p className="text-xs text-gray-500">RZC · Community</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-white">{rzcBalance.toLocaleString()}</p>
                              <p className="text-[10px] text-gray-600">RZC</p>
                            </div>
                          </button>
                        ) : (
                          <div className="w-full px-5 py-3.5 flex items-center gap-4 opacity-40 cursor-not-allowed">
                            <div className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                              <span className="text-xl">⚡</span>
                            </div>
                            <div className="flex-1 text-left">
                              <p className="text-sm font-bold text-white">RhizaCore Token</p>
                              <p className="text-xs text-gray-500">Verification required</p>
                            </div>
                            <Lock size={14} className="text-amber-500" />
                          </div>
                        )
                      )}

                      {/* ── Multi-Chain ── */}
                      {isMultiChainActive && multiChainAddresses ? (
                        <>
                          <div className="px-5 pt-5 pb-1">
                            <div className="flex items-center gap-2">
                              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-400">Multi-Chain Hub</p>
                              <div className="flex-1 h-px bg-violet-500/20" />
                            </div>
                          </div>
                          {([
                            { id: 'multichain-evm' as const, name: 'Ethereum', sub: 'ETH · EVM', symbol: 'ETH', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png', bal: parseFloat(multiChainBalances?.evm || '0').toFixed(4) },
                            { id: 'multichain-usdt' as const, name: 'Tether USD', sub: 'USDT · EVM', symbol: 'USDT', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png', bal: parseFloat(multiChainBalances?.usdt || '0').toFixed(2) },
                            { id: 'multichain-btc' as const, name: 'Bitcoin', sub: 'BTC · Mainnet', symbol: 'BTC', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png', bal: parseFloat(multiChainBalances?.btc || '0').toFixed(5) },
                            { id: 'multichain-ton' as const, name: 'Toncoin W5', sub: 'TON · Multi-Chain', symbol: 'TON', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ton/info/logo.png', bal: parseFloat(multiChainBalances?.ton || '0').toFixed(4) },
                          ]).map(asset => (
                            <button
                              key={asset.id}
                              onClick={() => { setSelectedWallet(asset.id); setShowAssetSelector(false); }}
                              className={`w-full px-5 py-3.5 flex items-center gap-4 hover:bg-white/5 transition-all ${selectedWallet === asset.id ? 'bg-white/5' : ''
                                }`}
                            >
                              <div className="w-11 h-11 rounded-full overflow-hidden border border-white/10 shrink-0">
                                <img src={asset.logo} className="w-full h-full object-cover" alt={asset.symbol} />
                              </div>
                              <div className="flex-1 text-left">
                                <p className="text-sm font-bold text-white">{asset.name}</p>
                                <p className="text-xs text-gray-500">{asset.sub}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-white">{asset.bal}</p>
                                <p className="text-[10px] text-gray-600">{asset.symbol}</p>
                              </div>
                            </button>
                          ))}
                        </>
                      ) : (
                        <div className="px-5 pt-4">
                          <button
                            onClick={() => { navigate('/wallet/multi-chain'); setShowAssetSelector(false); }}
                            className="w-full p-4 rounded-2xl border-2 border-dashed border-violet-500/20 bg-violet-500/5 flex items-center gap-4 hover:bg-violet-500/10 transition-all"
                          >
                            <div className="w-11 h-11 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0 text-violet-400">
                              🔗
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-bold text-violet-400">Enable Multi-Chain Hub</p>
                              <p className="text-xs text-gray-500">BTC · ETH · USDT · W5</p>
                            </div>
                          </button>
                        </div>
                      )}

                      {/* ── Jettons ── */}
                      {jettons && jettons.length > 0 && (
                        <>
                          <div className="px-5 pt-5 pb-1">
                            <div className="flex items-center gap-2">
                              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500">Jetton Tokens</p>
                              <div className="flex-1 h-px bg-emerald-500/20" />
                            </div>
                          </div>
                          {jettons.map((jetton: any) => (
                            <button
                              key={jetton.jetton.address}
                              onClick={() => {
                                setSelectedWallet('primary');
                                navigate('/wallet/transfer', {
                                  state: {
                                    asset: 'JETTON',
                                    jettonAddress: jetton.jetton.address,
                                    jettonName: jetton.jetton.name,
                                    jettonSymbol: jetton.jetton.symbol,
                                    jettonDecimals: jetton.jetton.decimals,
                                    jettonBalance: jetton.balance,
                                    jettonWalletAddress: jetton.wallet_address
                                  }
                                });
                                setShowAssetSelector(false);
                              }}
                              className="w-full px-5 py-3.5 flex items-center gap-4 hover:bg-white/5 transition-all"
                            >
                              <div className="w-11 h-11 rounded-full overflow-hidden border border-white/10 shrink-0 bg-white/5">
                                {jetton.jetton.image ? (
                                  <img src={jetton.jetton.image} alt={jetton.jetton.symbol} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs font-black text-gray-400">{jetton.jetton.symbol.slice(0, 2)}</div>
                                )}
                              </div>
                              <div className="flex-1 text-left">
                                <p className="text-sm font-bold text-white">{jetton.jetton.name}</p>
                                <p className="text-xs text-gray-500">{jetton.jetton.symbol} · TON Jetton</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-white">{(Number(jetton.balance) / Math.pow(10, jetton.jetton.decimals || 9)).toFixed(2)}</p>
                                <p className="text-[10px] text-gray-600">{jetton.jetton.symbol}</p>
                              </div>
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-2.5 sm:space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-2">{t('transfer.recipientAddress')}</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => { setRecipient(e.target.value); setRecipientInfo(null); }}
                onBlur={handleRecipientBlur}
                placeholder={
                  isRzcTransfer
                    ? "@username or wallet address"
                    : selectedWallet === 'multichain-evm'
                      ? "0x... (EVM address)"
                      : selectedWallet === 'multichain-btc'
                        ? "bc1... or 1... (Bitcoin address)"
                        : "EQ... or UQ... (TON address)"
                }
                className="w-full bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-5 text-white font-bold text-sm outline-none focus:border-[#00FF88]/50 transition-all placeholder:text-gray-700"
              />
              {isValidatingRecipient && (
                <p className="text-[9px] text-gray-500 ml-2 mt-1">Resolving recipient...</p>
              )}
              {recipientInfo && !isValidatingRecipient && (
                recipientInfo.valid ? (
                  <p className="text-[9px] text-[#00FF88] ml-2 mt-1 font-bold flex items-center gap-1">
                    <span>✓</span>
                    {isRzcTransfer
                      ? (recipientInfo.name ? `@${recipientInfo.name}` : recipientInfo.walletAddress?.slice(0, 8) + '...')
                      : selectedWallet === 'multichain-evm'
                        ? 'Valid EVM address'
                        : 'Valid TON address'}
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
              {selectedWallet === 'multichain-evm' && (
                <p className="text-[9px] text-gray-500 ml-2">
                  💡 Enter an Ethereum-compatible address (0x...)
                </p>
              )}
              {selectedWallet === 'multichain-btc' && (
                <p className="text-[9px] text-gray-500 ml-2">
                  💡 Enter a Bitcoin address (bc1..., 1..., or 3...)
                </p>
              )}
              {(selectedWallet === 'primary' || selectedWallet === 'multichain-ton') && !isRzcTransfer && (
                <p className="text-[9px] text-gray-500 ml-2">
                  💡 Enter a TON wallet address (EQ..., UQ..., or kQ...)
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
                  {isRzcTransfer
                    ? 'RZC'
                    : isJettonTransfer && jettonData
                      ? jettonData.symbol
                      : selectedWallet === 'multichain-evm'
                        ? 'ETH'
                        : selectedWallet === 'multichain-btc'
                          ? 'BTC'
                          : 'TON'}
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
                      } {isRzcTransfer
                        ? 'RZC'
                        : isJettonTransfer && jettonData
                          ? jettonData.symbol
                          : selectedWallet === 'multichain-evm'
                            ? 'ETH'
                            : selectedWallet === 'multichain-btc'
                              ? 'BTC'
                              : 'TON'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-bold">{t('wallet.fee')}:</span>
                    <span className={`font-bold ${isFetchingFee ? 'text-gray-400 animate-pulse' : 'text-[#00FF88]'}`}>
                      {isFetchingFee
                        ? 'Estimating...'
                        : isRzcTransfer
                          ? 'Free'
                          : feeEstimate
                            ? feeEstimate
                            : selectedWallet === 'multichain-evm'
                              ? '~0.0001 ETH'
                              : selectedWallet === 'multichain-btc'
                                ? '~0.0001 BTC'
                                : selectedWallet === 'multichain-ton'
                                  ? '~0.01 TON'
                                  : `~${estimatedFee.toFixed(4)} TON`}
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
                  {!isJettonTransfer && !isRzcTransfer && selectedWallet === 'primary' && (
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
                  {(selectedWallet === 'multichain-evm' || selectedWallet === 'multichain-ton' || selectedWallet === 'multichain-btc') && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 font-bold">Remaining Balance:</span>
                      <span className={`font-mono ${currentBalance - sendAmount >= 0 ? 'text-[#00FF88]' : 'text-red-400'}`}>
                        {(currentBalance - sendAmount).toFixed(4)} {selectedWallet === 'multichain-evm' ? 'ETH' : selectedWallet === 'multichain-btc' ? 'BTC' : 'TON'}
                      </span>
                    </div>
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
            className={`w-full p-5 sm:p-6 rounded-xl sm:rounded-2xl flex items-center justify-center gap-3 text-sm font-black uppercase tracking-widest transition-all ${isValid ? 'bg-[#00FF88] text-black shadow-3xl hover:scale-[1.02] active:scale-[0.98]' : 'bg-white/5 text-gray-600 cursor-not-allowed'
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
                  {isRzcTransfer
                    ? 'RZC'
                    : isJettonTransfer && jettonData
                      ? jettonData.symbol
                      : selectedWallet === 'multichain-evm'
                        ? 'ETH'
                        : selectedWallet === 'multichain-btc'
                          ? 'BTC'
                          : 'TON'}
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
                  } {isRzcTransfer
                    ? 'RZC'
                    : isJettonTransfer && jettonData
                      ? jettonData.symbol
                      : selectedWallet === 'multichain-evm'
                        ? 'ETH'
                        : selectedWallet === 'multichain-btc'
                          ? 'BTC'
                          : 'TON'}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-bold">{t('wallet.fee')}</span>
                <span className={`font-bold ${isFetchingFee ? 'text-gray-400 animate-pulse' : 'text-[#00FF88]'}`}>
                  {isFetchingFee
                    ? 'Estimating...'
                    : isRzcTransfer
                      ? 'Free'
                      : feeEstimate
                        ? feeEstimate
                        : selectedWallet === 'multichain-evm'
                          ? '~0.0001 ETH'
                          : selectedWallet === 'multichain-btc'
                            ? '~0.0001 BTC'
                            : selectedWallet === 'multichain-ton'
                              ? '~0.01 TON'
                              : `~${estimatedFee.toFixed(4)} TON`}
                </span>
              </div>
              {!isJettonTransfer && selectedWallet === 'primary' && !isRzcTransfer && (
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
              <p className="text-[10px] text-gray-500 font-medium">
                {selectedWallet === 'multichain-btc'
                  ? 'Verify the address carefully. BTC transactions are irreversible. Fee is deducted from your balance.'
                  : selectedWallet === 'multichain-evm'
                    ? 'Verify the address carefully. EVM transactions are irreversible.'
                    : 'Verify the address carefully. Transactions on TON are irreversible.'}
              </p>
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
                <p className="text-gray-500 text-sm">
                  {selectedWallet === 'multichain-evm'
                    ? 'Your transaction is being processed on the EVM network.'
                    : selectedWallet === 'multichain-ton'
                      ? 'Your transaction is being verified by TON validators (Multi-Chain Wallet).'
                      : 'Your transaction is being verified by TON validators.'}
                </p>
              </div>
            </>
          ) : status === 'success' ? (
            <>
              <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 scale-110 animate-bounce">
                <CheckCircle2 size={64} />
              </div>
              <div className="text-center space-y-4 max-w-md">
                <h2 className="text-4xl font-black text-white">{t('common.success')}</h2>
                <p className="text-gray-400 text-sm">
                  {selectedWallet === 'multichain-evm'
                    ? 'ETH transfer complete. The recipient will see the balance shortly on the EVM network.'
                    : selectedWallet === 'multichain-ton'
                      ? 'TON transfer complete from your Multi-Chain Wallet. The recipient will see the balance shortly.'
                      : 'Asset dispersion complete. The recipient will see the balance shortly.'}
                </p>
                {txHash && (
                  <div className="p-4 bg-white/5 rounded-xl">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                      {selectedWallet === 'multichain-evm' ? 'Transaction Hash' : 'Transaction ID'}
                    </p>
                    <p className="text-xs font-mono text-[#00FF88] break-all">{txHash}</p>
                    {selectedWallet === 'multichain-evm' && (
                      <a
                        href={`https://polygonscan.com/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-xs text-violet-400 hover:text-violet-300 font-bold"
                      >
                        View on PolygonScan
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
                      </a>
                    )}
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
                <p className="text-gray-500 text-sm">
                  {errorMessage || (selectedWallet === 'multichain-evm'
                    ? 'EVM transaction failed. Check gas fees and network status.'
                    : 'Network congestion or insufficient gas fees.')}
                </p>
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
