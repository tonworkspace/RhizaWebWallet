
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
import { CHAIN_META, getTransactionUrl, TON_USDT_MASTER_CONTRACT, TON_JETTON_GAS_DEFAULT } from '../constants';
import { tetherWdkService } from '../services/tetherWdkService';

const Transfer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { balance, network, jettons, address, refreshData, multiChainBalances, setIsNetworkModalOpen, isNetworkModalOpen, currentEvmChain, addPendingTransaction, switchEvmChain } = useWallet();

  const allWallets = WalletManager.getWallets();
  const multiChainWallet = allWallets.find(w => w.type === 'secondary');
  // Show multi-chain options whenever a secondary wallet exists — regardless of which wallet is active
  const isMultiChainActive = !!multiChainWallet;
  const multiChainAddresses = multiChainWallet && multiChainWallet.addresses ? {
    evmAddress: multiChainWallet.addresses.evm,
    tonAddress: multiChainWallet.addresses.ton,
    btcAddress: multiChainWallet.addresses.btc,
    solAddress: multiChainWallet.addresses.sol,
    tronAddress: multiChainWallet.addresses.tron
  } : null;

  const { showToast } = useToast();
  const { refreshTransactions } = useTransactions();

  // Get asset data from navigation state
  const locationState = location.state as any;
  const isJettonTransfer = locationState?.asset === 'JETTON';
  const isRzcTransfer = locationState?.asset === 'RZC';
  const isUsdtTransfer = locationState?.asset === 'USDT';
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
  const initWallet = (): 'primary' | 'multichain-ton' | 'multichain-tron' | 'multichain-tron-usdt' | 'multichain-sol' | 'multichain-evm' | 'multichain-btc' => {
    const a = (location.state as any)?.asset;
    if (a === 'TRX') return 'multichain-tron';
    if (a === 'BTC') return 'multichain-btc';
    if (a === 'SOL') return 'multichain-sol';
    if (a === 'ETH' || a === 'MATIC' || a === 'BNB' || a === 'AVAX' || a === 'EVM') return 'multichain-evm';
    if (a === 'USDT' || a === 'JETTON') {
      // We will override this in a useEffect once balances are loaded, but default to primary for TON USDT
      return 'primary';
    }
    const activeWalletType = localStorage.getItem('rhiza_active_wallet_type');
    if (activeWalletType === 'secondary') return 'multichain-ton';
    return 'primary';
  };
  const [selectedWallet, setSelectedWallet] = useState<'primary' | 'multichain-ton' | 'multichain-tron' | 'multichain-tron-usdt' | 'multichain-sol' | 'multichain-evm' | 'multichain-btc'>(initWallet() as any);
  const [recipientInfo, setRecipientInfo] = useState<{ valid: boolean; name?: string; walletAddress?: string; error?: string } | null>(null);
  const [isValidatingRecipient, setIsValidatingRecipient] = useState(false);
  const [wdkLocked, setWdkLocked] = useState(false);

  // Smart Default for USDT: if the user opens Transfer for USDT, pick the chain with the highest balance
  useEffect(() => {
    if (isUsdtTransfer && multiChainBalances) {
      const tonUsdtBal = parseFloat(multiChainBalances.usdt || '0');
      const tronUsdtBal = parseFloat(multiChainBalances.tronUsdt || '0');
      // Only switch to TRC20 if it has more balance AND it's not zero
      if (tronUsdtBal > tonUsdtBal && tronUsdtBal > 0) {
        setSelectedWallet('multichain-tron-usdt');
      } else {
        // Fallback to primary wallet (which handles TON USDT jettons via master contract)
        setSelectedWallet('primary');
      }
    }
  }, [isUsdtTransfer, multiChainBalances]);

  // Smart Default for EVM chains based on navigation
  useEffect(() => {
    const a = (location.state as any)?.asset;
    if (a) {
      const targetChain = a === 'MATIC' ? 'polygon' : a === 'BNB' ? 'bsc' : a === 'ETH' ? 'ethereum' : a === 'AVAX' ? 'avalanche' : null;
      if (targetChain && currentEvmChain !== targetChain) {
        switchEvmChain(targetChain as any).then(() => refreshData(true, true));
      }
    }
  }, [(location.state as any)?.asset, currentEvmChain, switchEvmChain, refreshData]);

  // Check WDK initialization state when a multi-chain wallet is selected
  useEffect(() => {
    if (selectedWallet === 'multichain-ton' || selectedWallet === 'multichain-tron' || selectedWallet === 'multichain-tron-usdt' || selectedWallet === 'multichain-sol' || selectedWallet === 'multichain-evm' || selectedWallet === 'multichain-btc') {
      import('../services/tetherWdkService').then(({ tetherWdkService }) => {
        setWdkLocked(!tetherWdkService.isInitialized());
      });
    } else {
      setWdkLocked(false);
    }
  }, [selectedWallet]);

  // Fetch a real fee estimate from the WDK quoteSend* APIs
  const fetchFeeEstimate = async () => {
    if (!amount || !recipient || parseFloat(amount) <= 0) return;
    setIsFetchingFee(true);
    try {
      const { tetherWdkService } = await import('../services/tetherWdkService');
      if (selectedWallet === 'multichain-ton') {
        const q = await tetherWdkService.quoteSendTonTransaction(recipient, amount, comment || undefined);
        setFeeEstimate(q ? `${q.feeTon} TON` : '~0.01 TON');
      } else if (selectedWallet === 'multichain-tron-usdt') {
        const q = await tetherWdkService.quoteSendTronTrc20Transaction(recipient, amount);
        setFeeEstimate(q && q.feeTrx ? `~${q.feeTrx} TRX` : '~15.0 TRX');
      } else if (selectedWallet === 'multichain-tron') {
        setFeeEstimate(`~1.5 TRX`);
      } else if (selectedWallet === 'multichain-sol') {
        const q = await tetherWdkService.quoteSendSolTransaction(recipient, amount);
        setFeeEstimate(q && q.feeSol ? `~${q.feeSol} SOL` : '~0.000005 SOL');
      } else if (selectedWallet === 'multichain-evm') {
        const q = await tetherWdkService.quoteSendEvmTransaction(recipient, amount);
        setFeeEstimate(q && q.feeEvm ? `~${q.feeEvm} ${currentEvmChain === 'polygon' ? 'MATIC' : currentEvmChain === 'bsc' ? 'BNB' : currentEvmChain === 'avalanche' ? 'AVAX' : 'ETH'}` : '~0.005 ETH');
      } else if (selectedWallet === 'multichain-btc') {
        const q = await tetherWdkService.quoteSendBtcTransaction(recipient, amount);
        setFeeEstimate(q && q.feeBtc ? `~${q.feeBtc} BTC` : '~0.00005 BTC');
      } else {
        setFeeEstimate(`~${estimatedFee.toFixed(4)} TON`);
      }
    } catch {
      // Fall back to static estimates on error
      if (selectedWallet === 'multichain-tron-usdt') {
        setFeeEstimate('~15.0 TRX');
      } else if (selectedWallet === 'multichain-tron') {
        setFeeEstimate('~1.5 TRX');
      } else if (selectedWallet === 'multichain-sol') {
        setFeeEstimate('~0.000005 SOL');
      } else if (selectedWallet === 'multichain-evm') {
        setFeeEstimate('~0.005 ETH');
      } else {
        setFeeEstimate('~0.01 TON');
      }
    } finally {
      setIsFetchingFee(false);
    }
  };

  // Calculate balances and fees based on asset type
  const { userProfile } = useWallet();
  const rzcBalance = (userProfile as any)?.rzc_balance || 0;
  const rzcBalanceLocked = false;
  const rzcVerified = true;
  const canSendRzc = true;

  const usdtJetton = jettons?.find((j: any) => j.jetton.symbol === 'USDT');

  const currentBalance = isRzcTransfer
    ? rzcBalance
    : isJettonTransfer && jettonData
      ? parseFloat(toDecimals(BigInt(jettonData.balance), jettonData.decimals))
      : isUsdtTransfer && selectedWallet !== 'multichain-tron-usdt'
        ? usdtJetton ? parseFloat(toDecimals(BigInt(usdtJetton.balance), usdtJetton.jetton.decimals)) : 0
      : selectedWallet === 'multichain-tron-usdt'
        ? parseFloat(multiChainBalances?.tronUsdt || '0')
        : selectedWallet === 'multichain-tron'
          ? parseFloat(multiChainBalances?.tron || '0')
          : selectedWallet === 'multichain-sol'
            ? parseFloat(multiChainBalances?.sol || '0')
            : selectedWallet === 'multichain-btc'
              ? parseFloat(multiChainBalances?.btc || '0')
            : selectedWallet === 'multichain-evm'
              ? parseFloat(multiChainBalances?.evm || '0')
            : selectedWallet === 'multichain-ton'
              ? parseFloat(multiChainBalances?.ton || '0')
              : parseFloat(balance || '0');

  const sendAmount = parseFloat(amount || '0');
  const estimatedFee = (isJettonTransfer || (isUsdtTransfer && selectedWallet !== 'multichain-tron-usdt')) ? parseFloat(estimateJettonTransferFee()) : isRzcTransfer ? 0 : 0.01;
  const tonBalance = parseFloat(balance || '0');
  const tronBalance = parseFloat(multiChainBalances?.tron || '0');
  const parsedTrxFee = feeEstimate ? parseFloat(feeEstimate.replace(/[^\d.]/g, '')) || 15.0 : 15.0;
  const hasEnoughTrxForGas = tronBalance >= parsedTrxFee;

  // For jettons, we need TON for gas but send jettons
  // For RZC, no gas fees (internal transfer)
  const totalRequired = isRzcTransfer
    ? sendAmount // Just RZC amount, no fees
    : selectedWallet === 'multichain-tron-usdt'
      ? sendAmount
      : (isJettonTransfer || isUsdtTransfer)
        ? sendAmount // Just the jetton/usdt amount
        : sendAmount + estimatedFee; // TON amount + fee

  const hasEnoughTonForGas = isRzcTransfer ? true : tonBalance >= estimatedFee;
  const isLargeTransaction = sendAmount > currentBalance * 0.5;

  const handleMax = async () => {
    if (isRzcTransfer) {
      setAmount(currentBalance.toString());
    } else if (isJettonTransfer) {
      setAmount(currentBalance.toFixed(jettonData?.decimals || 9));
    } else if (isUsdtTransfer && selectedWallet !== 'multichain-tron-usdt') {
      setAmount(currentBalance.toFixed(6));
    } else if (selectedWallet === 'multichain-tron-usdt') {
      setAmount(currentBalance.toFixed(6));
    } else if (selectedWallet === 'multichain-tron') {
      const max = Math.max(0, currentBalance - 1.5);
      setAmount(max.toFixed(6));
    } else if (selectedWallet === 'multichain-sol') {
      const max = Math.max(0, currentBalance - 0.000005);
      setAmount(max.toFixed(6));
    } else if (selectedWallet === 'multichain-btc') {
      const max = Math.max(0, currentBalance - 0.00005);
      setAmount(max.toFixed(8));
    } else if (selectedWallet === 'multichain-evm') {
      const max = Math.max(0, currentBalance - 0.005);
      setAmount(max.toFixed(6));
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
      // Guard: ensure WDK is initialized for multi-chain sends
      if (selectedWallet === 'multichain-ton' || selectedWallet === 'multichain-tron' || selectedWallet === 'multichain-tron-usdt' || selectedWallet === 'multichain-sol' || selectedWallet === 'multichain-evm' || selectedWallet === 'multichain-btc') {
        const { tetherWdkService } = await import('../services/tetherWdkService');
        if (!tetherWdkService.isInitialized()) {
          setIsSendingAll(false);
          showToast('Wallet locked — unlock in Multi-Chain Hub', 'error');
          navigate('/wallet/multi-chain');
          return;
        }
      }

      // ── Multi-chain TRON USDT Send All ──────────────────────────────────────────
      if (selectedWallet === 'multichain-tron-usdt') {
        const { tetherWdkService } = await import('../services/tetherWdkService');
        const sendAllAmount = currentBalance;
        if (sendAllAmount <= 0) throw new Error('Insufficient USDT balance');
        const result = await tetherWdkService.sendTronTrc20Transaction(recipient, sendAllAmount.toFixed(6));
        if (result.success) {
          setStatus('success');
          setTxHash(result.txHash || '');
          showToast('All USDT sent successfully!', 'success');
          setTimeout(() => { refreshData(); }, 1500);
        } else { throw new Error(result.error || 'USDT transaction failed'); }
        return;
      }

      // ── Multi-chain TRON Send All ──────────────────────────────────────────
      if (selectedWallet === 'multichain-tron') {
        const { tetherWdkService } = await import('../services/tetherWdkService');
        const gasReserve = 1.5;
        const sendAllAmount = Math.max(0, currentBalance - gasReserve);
        if (sendAllAmount <= 0) throw new Error('Insufficient TRX balance for gas fees');
        const result = await tetherWdkService.sendTronTransaction(recipient, sendAllAmount.toFixed(6));
        if (result.success) {
          setStatus('success');
          setTxHash(result.txHash || '');
          showToast('All TRX sent successfully!', 'success');
          setTimeout(() => { refreshData(); }, 1500);
        } else { throw new Error(result.error || 'TRX transaction failed'); }
        return;
      }

      // ── Multi-chain SOL Send All ──────────────────────────────────────────
      if (selectedWallet === 'multichain-sol') {
        const { tetherWdkService } = await import('../services/tetherWdkService');
        const gasReserve = 0.000005;
        const sendAllAmount = Math.max(0, currentBalance - gasReserve);
        if (sendAllAmount <= 0) throw new Error('Insufficient SOL balance for gas fees');
        const result = await tetherWdkService.sendSolTransaction(recipient, sendAllAmount.toFixed(6));
        if (result.success) {
          setStatus('success');
          setTxHash(result.txHash || '');
          showToast('All SOL sent successfully!', 'success');
          setTimeout(() => { refreshData(); }, 1500);
        } else { throw new Error(result.error || 'SOL transaction failed'); }
        return;
      }

      // ── Multi-chain BTC Send All ──────────────────────────────────────────
      if (selectedWallet === 'multichain-btc') {
        const { tetherWdkService } = await import('../services/tetherWdkService');
        const gasReserve = 0.00005;
        const sendAllAmount = Math.max(0, currentBalance - gasReserve);
        if (sendAllAmount <= 0) throw new Error('Insufficient BTC balance for gas fees');
        const result = await tetherWdkService.sendBtcTransaction(recipient, sendAllAmount.toFixed(8));
        if (result.success) {
          setStatus('success');
          setTxHash(result.txHash || '');
          showToast('All BTC sent successfully!', 'success');
          setTimeout(() => { refreshData(); }, 1500);
        } else { throw new Error(result.error || 'BTC transaction failed'); }
        return;
      }

      // ── Multi-chain EVM Send All ──────────────────────────────────────────
      if (selectedWallet === 'multichain-evm') {
        const { tetherWdkService } = await import('../services/tetherWdkService');
        const gasReserve = 0.005;
        const sendAllAmount = Math.max(0, currentBalance - gasReserve);
        if (sendAllAmount <= 0) throw new Error('Insufficient EVM balance for gas fees');
        const result = await tetherWdkService.sendEvmTransaction(recipient, sendAllAmount.toFixed(6));
        if (result.success) {
          setStatus('success');
          setTxHash(result.txHash || '');
          showToast('All EVM sent successfully!', 'success');
          setTimeout(() => { refreshData(); }, 1500);
        } else { throw new Error(result.error || 'EVM transaction failed'); }
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

      if (!tonWalletService.isInitialized()) {
        throw new Error('Primary wallet not initialized');
      }
      
      const result = await tonWalletService.sendTransaction(recipient, sendAllAmount.toFixed(4), comment || undefined);

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

    // TRON Address Validation
    if (selectedWallet === 'multichain-tron' || selectedWallet === 'multichain-tron-usdt') {
      const tronAddressRegex = /^T[a-zA-Z1-9]{33}$/;
      if (tronAddressRegex.test(recipient.trim())) {
        setRecipientInfo({ valid: true });
      } else {
        setRecipientInfo({ valid: false, error: 'Invalid TRON address format (must start with T)' });
      }
      return;
    }

    // SOL Address Validation
    if (selectedWallet === 'multichain-sol') {
      const solAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
      if (solAddressRegex.test(recipient.trim())) {
        setRecipientInfo({ valid: true });
      } else {
        setRecipientInfo({ valid: false, error: 'Invalid Solana address' });
      }
      return;
    }

    // BTC Address Validation
    if (selectedWallet === 'multichain-btc') {
      // Basic BTC P2PKH/P2SH/Bech32 validation
      const btcAddressRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/;
      if (btcAddressRegex.test(recipient.trim())) {
        setRecipientInfo({ valid: true });
      } else {
        setRecipientInfo({ valid: false, error: 'Invalid Bitcoin address' });
      }
      return;
    }

    // EVM Address Validation
    if (selectedWallet === 'multichain-evm') {
      const evmAddressRegex = /^0x[a-fA-F0-9]{40}$/;
      if (evmAddressRegex.test(recipient.trim())) {
        setRecipientInfo({ valid: true });
      } else {
        setRecipientInfo({ valid: false, error: 'Invalid EVM address' });
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
      // RZC Transfer
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
          
          if (addPendingTransaction) {
            addPendingTransaction({
              hash: result.transactionId || '',
              symbol: 'RZC',
              amount: parseFloat(amount).toString(),
              type: 'send'
            });
          }

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

        let result;
        if (selectedWallet === 'multichain-ton') {
          const { tetherWdkService } = await import('../services/tetherWdkService');
          if (!tetherWdkService.isInitialized()) {
            throw new Error('Multi-chain wallet is locked');
          }
          // WDK resolves the user's jetton wallet address internally from TonCenter V3,
          // so we pass the master contract address (jettonData.address), NOT walletAddress.
          result = await tetherWdkService.sendJettonTransaction(
            jettonData.address,        // Jetton master contract address
            recipient,
            amountBigInt,
            TON_JETTON_GAS_DEFAULT, // forward amount — WDK uses 0.05 TON as gas
            comment || undefined
          );
        } else {
          // Primary wallet: tonWalletService expects the pre-resolved per-wallet address
          result = await tonWalletService.sendJettonTransaction(
            jettonData.walletAddress,  // User's jetton wallet contract address
            recipient,
            amountBigInt,
            TON_JETTON_GAS_DEFAULT, // forward amount
            comment || undefined
          );
        }

        if (result.success) {
          setStatus('success');
          setTxHash(result.txHash || '');
          showToast(`${jettonData.symbol} sent successfully!`, 'success');
          
          if (addPendingTransaction) {
            addPendingTransaction({
              hash: result.txHash || '',
              symbol: jettonData.symbol,
              amount: parseFloat(amount).toString(),
              type: 'send'
            });
          }

          // Refresh wallet data and transactions (delay for blockchain indexing)
          setTimeout(() => {
            refreshData();
            refreshTransactions(3000); // extra delay for TonAPI indexing
          }, 1500);
        } else {
          throw new Error(result.error || 'Transaction failed');
        }
      }
      // TRON Transfer
      else if (selectedWallet === 'multichain-tron' || selectedWallet === 'multichain-tron-usdt') {
        const { tetherWdkService } = await import('../services/tetherWdkService');
        if (!tetherWdkService.isInitialized()) {
          setStatus('error');
          setErrorMessage('Multi-chain wallet needs to be unlocked. Please go to Multi-Chain Hub and enter your password.');
          showToast('Wallet locked — unlock in Multi-Chain Hub', 'error');
          setTimeout(() => navigate('/wallet/multi-chain'), 2000);
          return;
        }
        
        let result;
        if (selectedWallet === 'multichain-tron-usdt') {
          result = await tetherWdkService.sendTronTrc20Transaction(recipient, amount);
        } else {
          result = await tetherWdkService.sendTronTransaction(recipient, amount);
        }

        if (result.success) {
          setStatus('success');
          setTxHash(result.txHash || '');
          showToast(`${selectedWallet === 'multichain-tron-usdt' ? 'USDT' : 'TRX'} transaction sent successfully!`, 'success');
          
          if (addPendingTransaction) {
            addPendingTransaction({
              hash: result.txHash || '',
              symbol: selectedWallet === 'multichain-tron-usdt' ? 'USDT' : 'TRX',
              amount: parseFloat(amount).toString(),
              type: 'send'
            });
          }
          
          setTimeout(() => { refreshData(); }, 1500);
        } else {
          throw new Error(result.error || `${selectedWallet === 'multichain-tron-usdt' ? 'USDT' : 'TRX'} transaction failed`);
        }
      }
      // SOL Transfer
      else if (selectedWallet === 'multichain-sol') {
        const { tetherWdkService } = await import('../services/tetherWdkService');
        if (!tetherWdkService.isInitialized()) {
          setStatus('error');
          setErrorMessage('Multi-chain wallet needs to be unlocked. Please go to Multi-Chain Hub and enter your password.');
          showToast('Wallet locked — unlock in Multi-Chain Hub', 'error');
          setTimeout(() => navigate('/wallet/multi-chain'), 2000);
          return;
        }
        
        const result = await tetherWdkService.sendSolTransaction(recipient, amount);

        if (result.success) {
          setStatus('success');
          setTxHash(result.txHash || '');
          showToast(`SOL transaction sent successfully!`, 'success');
          
          if (addPendingTransaction) {
            addPendingTransaction({
              hash: result.txHash || '',
              symbol: 'SOL',
              amount: parseFloat(amount).toString(),
              type: 'send'
            });
          }
          
          setTimeout(() => { refreshData(); }, 1500);
        } else {
          throw new Error(result.error || `SOL transaction failed`);
        }
      }
      // BTC Transfer
      else if (selectedWallet === 'multichain-btc') {
        const { tetherWdkService } = await import('../services/tetherWdkService');
        if (!tetherWdkService.isInitialized()) {
          setStatus('error');
          setErrorMessage('Multi-chain wallet needs to be unlocked. Please go to Multi-Chain Hub and enter your password.');
          showToast('Wallet locked — unlock in Multi-Chain Hub', 'error');
          setTimeout(() => navigate('/wallet/multi-chain'), 2000);
          return;
        }
        
        const result = await tetherWdkService.sendBtcTransaction(recipient, amount);

        if (result.success) {
          setStatus('success');
          setTxHash(result.txHash || '');
          showToast(`BTC transaction sent successfully!`, 'success');
          
          if (addPendingTransaction) {
            addPendingTransaction({
              hash: result.txHash || '',
              symbol: 'BTC',
              amount: parseFloat(amount).toString(),
              type: 'send'
            });
          }
          
          setTimeout(() => { refreshData(); }, 1500);
        } else {
          throw new Error(result.error || `BTC transaction failed`);
        }
      }
      // EVM Transfer
      else if (selectedWallet === 'multichain-evm') {
        const { tetherWdkService } = await import('../services/tetherWdkService');
        if (!tetherWdkService.isInitialized()) {
          setStatus('error');
          setErrorMessage('Multi-chain wallet needs to be unlocked. Please go to Multi-Chain Hub and enter your password.');
          showToast('Wallet locked — unlock in Multi-Chain Hub', 'error');
          setTimeout(() => navigate('/wallet/multi-chain'), 2000);
          return;
        }
        
        const result = await tetherWdkService.sendEvmTransaction(recipient, amount);

        if (result.success) {
          setStatus('success');
          setTxHash(result.txHash || '');
          const symbol = currentEvmChain === 'polygon' ? 'MATIC' : currentEvmChain === 'bsc' ? 'BNB' : currentEvmChain === 'avalanche' ? 'AVAX' : 'ETH';
          showToast(`${symbol} transaction sent successfully!`, 'success');
          
          if (addPendingTransaction) {
            addPendingTransaction({
              hash: result.txHash || '',
              symbol: symbol,
              amount: parseFloat(amount).toString(),
              type: 'send'
            });
          }
          
          setTimeout(() => { refreshData(); }, 1500);
        } else {
          throw new Error(result.error || `EVM transaction failed`);
        }
      }
      // TON Transfer
      else if (!locationState?.asset || locationState?.asset === 'TON') {
        let result;
        
        if (selectedWallet === 'multichain-ton') {
          const { tetherWdkService } = await import('../services/tetherWdkService');
          
          // Guard: ensure WDK is initialized
          if (!tetherWdkService.isInitialized()) {
            setStatus('error');
            setErrorMessage('Multi-chain wallet needs to be unlocked. Please go to Multi-Chain Hub and enter your password.');
            showToast('Wallet locked — unlock in Multi-Chain Hub', 'error');
            setTimeout(() => navigate('/wallet/multi-chain'), 2000);
            return;
          }

          result = await tetherWdkService.sendTonTransaction(
            recipient,
            amount,
            comment || undefined
          );
        } else {
          if (!tonWalletService.isInitialized()) {
            throw new Error('Primary wallet not initialized');
          }
          result = await tonWalletService.sendTransaction(recipient, amount, comment || undefined);
        }

        if (result.success) {
          setStatus('success');
          setTxHash(result.txHash || '');
          showToast('Transaction sent successfully!', 'success');
          
          if (addPendingTransaction) {
            addPendingTransaction({
              hash: result.txHash || '',
              symbol: 'TON',
              amount: parseFloat(amount).toString(),
              type: 'send'
            });
          }

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
      // USDT Jetton Transfer — route through Jetton path with known master contract
      else if (locationState?.asset === 'USDT') {
        if (!address) throw new Error('Wallet not connected');

        const { fromDecimals } = await import('../utility/decimals');
        const amountBigInt = fromDecimals(amount, 6); // USDT uses 6 decimals

        let result;
        if (selectedWallet === 'multichain-ton') {
          const { tetherWdkService } = await import('../services/tetherWdkService');
          if (!tetherWdkService.isInitialized()) {
            throw new Error('Multi-chain wallet is locked — unlock in Multi-Chain Hub');
          }
          result = await tetherWdkService.sendJettonTransaction(
            TON_USDT_MASTER_CONTRACT, recipient, amountBigInt, TON_JETTON_GAS_DEFAULT, comment || undefined
          );
        } else {
          // Primary wallet: resolve user's USDT jetton wallet address
          if (!tonWalletService.isInitialized()) {
            throw new Error('Primary wallet not initialized');
          }
          result = await tonWalletService.sendJettonTransaction(TON_USDT_MASTER_CONTRACT, recipient, amountBigInt, TON_JETTON_GAS_DEFAULT, comment || undefined);
        }

        if (result.success) {
          setStatus('success');
          setTxHash(result.txHash || '');
          showToast('USDT sent successfully!', 'success');
          if (addPendingTransaction) {
            addPendingTransaction({ hash: result.txHash || '', symbol: 'USDT', amount: parseFloat(amount).toString(), type: 'send' });
          }
          setTimeout(() => { refreshData(); refreshTransactions(3000); }, 1500);
        } else {
          throw new Error(result.error || 'USDT transfer failed');
        }
      } else {
        throw new Error(`${locationState?.asset} transfers are not currently supported in this view.`);
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
    : selectedWallet === 'multichain-ton'
      ? recipient.length > 20 && sendAmount > 0 && sendAmount <= currentBalance && !wdkLocked
    : selectedWallet === 'multichain-evm'
      ? recipient.length >= 42 && sendAmount > 0 && sendAmount <= currentBalance && !wdkLocked
    : selectedWallet === 'multichain-sol'
        ? recipient.length >= 32 && sendAmount > 0 && sendAmount <= currentBalance && !wdkLocked
        : selectedWallet === 'multichain-tron-usdt'
          ? recipient.length > 30 && sendAmount > 0 && sendAmount <= currentBalance && !wdkLocked && hasEnoughTrxForGas
        : selectedWallet === 'multichain-tron'
          ? recipient.length > 30 && sendAmount > 0 && sendAmount <= currentBalance && !wdkLocked
          : isJettonTransfer
            ? recipient.length > 20 && sendAmount > 0 && sendAmount <= currentBalance && hasEnoughTonForGas
            : recipient.length > 20 && sendAmount > 0 && totalRequired <= currentBalance;

  return (
    <div className="max-w-xl mx-auto space-y-6 sm:space-y-8 page-enter pb-8 sm:pb-12 px-3 sm:px-4 md:px-0">
      <div className="flex items-center gap-3 sm:gap-4">
        <button onClick={() => navigate('/wallet/dashboard')} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 active:scale-95">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl sm:text-2xl font-heading font-black text-white">{t('transfer.title')}</h1>
      </div>

      {/* RZC Transfer Lock — Balance Verification Active */}
      {isRzcTransfer && !canSendRzc && (
        <div className="flex flex-col items-center justify-center py-10 animate-in fade-in duration-500">
          <div className="w-full max-w-md p-7 rounded-[2rem] bg-amber-500/10 border-2 border-amber-500/30 flex flex-col items-center gap-4 text-center shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center">
              <Lock size={32} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-black text-amber-300 mb-1">RZC Transfers Disabled</h2>
              <p className="text-sm font-heading font-bold text-amber-400/80 uppercase tracking-widest leading-relaxed">
                RhizaCore Token (RZC) transfers are temporarily suspended while we verify all user balances across the network.
              </p>
            </div>
            <div className="w-full p-3.5 rounded-xl bg-white/5 border border-amber-500/20 space-y-2 text-left">
              <p className="text-[11px] font-heading font-black text-amber-300 uppercase tracking-widest leading-relaxed">What this means</p>
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
              className="w-full py-3.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-heading font-black text-xs uppercase tracking-widest transition-all active:scale-95"
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
              <label className="text-[10px] font-heading font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Sending Asset</label>

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
                    ) : (isUsdtTransfer || selectedWallet === 'multichain-tron-usdt') ? (
                      <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png" className="w-full h-full object-cover" alt="USDT" />
                    ) : selectedWallet === 'multichain-sol' ? (
                      <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png" className="w-full h-full object-cover" alt="SOL" />
                    ) : isJettonTransfer && jettonData ? (
                      <div className="w-full h-full bg-violet-500/20 flex items-center justify-center text-xs font-black text-violet-300">{(jettonData.symbol || '').slice(0, 2)}</div>
                    ) : (
                      <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ton/info/logo.png" className="w-full h-full object-cover" alt="TON" />
                    )}
                  </div>
                  <div className="text-left">
                    <div className="font-heading font-black text-sm text-white uppercase tracking-widest leading-tight">
                      {isRzcTransfer ? 'RhizaCore Token'
                        : isJettonTransfer && jettonData ? jettonData.name
                          : selectedWallet === 'multichain-tron-usdt' ? 'Tether USDT (TRC20)'
                            : isUsdtTransfer ? 'Tether USDT (TON)'
                              : selectedWallet === 'multichain-evm' ? (currentEvmChain === 'polygon' ? 'Polygon' : currentEvmChain === 'bsc' ? 'BSC' : currentEvmChain === 'avalanche' ? 'Avalanche' : 'Ethereum')
                              : selectedWallet === 'multichain-sol' ? 'Solana Mainnet'
                                : selectedWallet === 'multichain-ton' ? 'Toncoin (W5)'
                                  : selectedWallet === 'multichain-tron' ? 'TRON Mainnet'
                                    : 'Toncoin'}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-numbers font-bold text-gray-500 tracking-widest">
                        {isRzcTransfer ? currentBalance.toLocaleString() : currentBalance.toFixed(isJettonTransfer && jettonData ? Math.min(jettonData.decimals, 4) : (isUsdtTransfer || selectedWallet === 'multichain-tron-usdt') ? 6 : selectedWallet === 'multichain-sol' ? 6 : 4)}
                        {' '}
                        {isRzcTransfer ? 'RZC' : isJettonTransfer && jettonData ? jettonData.symbol
                          : (isUsdtTransfer || selectedWallet === 'multichain-tron-usdt') ? 'USDT'
                            : selectedWallet === 'multichain-evm' ? (currentEvmChain === 'polygon' ? 'MATIC' : currentEvmChain === 'bsc' ? 'BNB' : currentEvmChain === 'avalanche' ? 'AVAX' : 'ETH')
                            : selectedWallet === 'multichain-sol' ? 'SOL'
                              : 'TON'}
                      </span>
                      <span className="text-[8px] font-heading font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border
                        text-gray-500 border-white/10">
                        {isRzcTransfer ? 'Community'
                          : isJettonTransfer ? 'Jetton'
                            : (isUsdtTransfer || selectedWallet === 'multichain-tron-usdt') ? 'Stablecoin'
                              : selectedWallet === 'multichain-ton' ? 'W5'
                                : selectedWallet === 'multichain-tron' ? 'Multi-Chain'
                                  : 'Native'}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronDown size={16} className={`text-gray-500 transition-transform duration-200 ${showAssetSelector ? 'rotate-180' : ''}`} />
              </button>

              {/* Show wallet address for multi-chain wallets */}
              {selectedWallet === 'multichain-ton' && multiChainAddresses && (
                <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl space-y-2">
                  <p className="text-[9px] font-heading font-black uppercase tracking-widest text-violet-400">Sending From</p>
                  <p className="text-xs font-mono text-violet-300 break-all">
                    {multiChainAddresses.tonAddress}
                  </p>
                </div>
              )}

              {/* WDK locked warning */}
              {wdkLocked && selectedWallet === 'multichain-ton' && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Lock size={14} className="text-amber-400 flex-shrink-0" />
                    <p className="text-[10px] font-heading font-bold text-amber-300">Multi-chain wallet locked. Unlock to send.</p>
                  </div>
                  <button
                    onClick={() => navigate('/wallet/multi-chain')}
                    className="text-[9px] font-heading font-black text-amber-400 uppercase tracking-widest hover:text-amber-300 whitespace-nowrap"
                  >
                    Unlock →
                  </button>
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
                        <h3 className="text-base font-heading font-black text-white uppercase tracking-widest">Select Asset</h3>
                        <button onClick={() => setShowAssetSelector(false)} className="text-gray-500 hover:text-white transition-colors text-xs font-heading font-bold uppercase tracking-widest leading-relaxed">Close</button>
                      </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="overflow-y-auto flex-1 pb-8">

                      {/* ── Primary Assets ── */}
                      <div className="px-5 pt-4 pb-1">
                        <p className="text-[9px] font-heading font-black uppercase tracking-[0.2em] text-gray-500">Primary Wallet</p>
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
                          <p className="text-sm font-heading font-bold text-white uppercase tracking-widest">Toncoin</p>
                          <p className="text-xs font-heading font-bold text-gray-500 tracking-widest">TON · Native Network</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-numbers font-bold text-white tracking-widest">{parseFloat(balance || '0').toFixed(4)}</p>
                          <p className="text-[10px] font-heading font-bold text-gray-600 tracking-widest">TON</p>
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
                              <p className="text-sm font-heading font-bold text-white uppercase tracking-widest">RhizaCore Token</p>
                              <p className="text-xs font-heading font-bold text-gray-500 tracking-widest">RZC · Community</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-numbers font-bold text-white tracking-widest">{rzcBalance.toLocaleString()}</p>
                              <p className="text-[10px] font-heading font-bold text-gray-600 tracking-widest">RZC</p>
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
                              <p className="text-[9px] font-heading font-black uppercase tracking-[0.2em] text-violet-400">Multi-Chain Hub</p>
                              <div className="flex-1 h-px bg-violet-500/20" />
                            </div>
                          </div>
                          {([
                            { id: 'multichain-ton' as const, name: 'Toncoin W5', sub: 'TON · Multi-Chain', symbol: 'TON', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ton/info/logo.png', bal: parseFloat(multiChainBalances?.ton || '0').toFixed(4) },
                            { id: 'multichain-tron' as const, name: 'TRON Mainnet', sub: 'TRX · Multi-Chain', symbol: 'TRX', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/tron/info/logo.png', bal: parseFloat(multiChainBalances?.tron || '0').toFixed(4) },
                            { id: 'multichain-tron-usdt' as const, name: 'Tether USDT', sub: 'USDT · TRC20', symbol: 'USDT', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/tron/assets/TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t/logo.png', bal: parseFloat(multiChainBalances?.tronUsdt || '0').toFixed(2) },
                            { id: 'multichain-evm' as const, evmChain: 'ethereum', name: 'Ethereum', sub: 'EVM · Multi-Chain', symbol: 'ETH', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png', bal: currentEvmChain === 'ethereum' ? parseFloat(multiChainBalances?.evm || '0').toFixed(6) : '...' },
                            { id: 'multichain-evm' as const, evmChain: 'bsc', name: 'BNB Smart Chain', sub: 'EVM · Multi-Chain', symbol: 'BNB', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/info/logo.png', bal: currentEvmChain === 'bsc' ? parseFloat(multiChainBalances?.evm || '0').toFixed(6) : '...' },
                            { id: 'multichain-evm' as const, evmChain: 'polygon', name: 'Polygon', sub: 'EVM · Multi-Chain', symbol: 'MATIC', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png', bal: currentEvmChain === 'polygon' ? parseFloat(multiChainBalances?.evm || '0').toFixed(6) : '...' },
                            { id: 'multichain-sol' as const, name: 'Solana', sub: 'SOL · Multi-Chain', symbol: 'SOL', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png', bal: parseFloat(multiChainBalances?.sol || '0').toFixed(6) },
                            { id: 'multichain-btc' as const, name: 'Bitcoin', sub: 'BTC · Multi-Chain', symbol: 'BTC', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png', bal: parseFloat(multiChainBalances?.btc || '0').toFixed(6) },
                          ]).map(asset => (
                            <button
                              key={asset.id + (asset.evmChain || '')}
                              onClick={async () => { 
                                if (asset.id === 'multichain-evm' && asset.evmChain && asset.evmChain !== currentEvmChain) {
                                  await switchEvmChain(asset.evmChain as any);
                                  refreshData();
                                }
                                setSelectedWallet(asset.id); 
                                setShowAssetSelector(false); 
                              }}
                              className={`w-full px-5 py-3.5 flex items-center gap-4 hover:bg-white/5 transition-all ${selectedWallet === asset.id && (!asset.evmChain || asset.evmChain === currentEvmChain) ? 'bg-white/5' : ''
                                }`}
                            >
                              <div className="w-11 h-11 rounded-full overflow-hidden border border-white/10 shrink-0">
                                <img src={asset.logo} className="w-full h-full object-cover" alt={asset.symbol} />
                              </div>
                              <div className="flex-1 text-left">
                                <p className="text-sm font-heading font-bold text-white uppercase tracking-widest">{asset.name}</p>
                                <p className="text-xs font-heading font-bold text-gray-500 tracking-widest">{asset.sub}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-numbers font-bold text-white tracking-widest">{asset.bal}</p>
                                <p className="text-[10px] font-heading font-bold text-gray-600 tracking-widest">{asset.symbol}</p>
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
                              <p className="text-sm font-heading font-bold text-violet-400 uppercase tracking-widest">Enable Multi-Chain Hub</p>
                              <p className="text-xs font-heading font-bold text-gray-500 tracking-widest">BTC · ETH · USDT · W5</p>
                            </div>
                          </button>
                        </div>
                      )}

                      {/* ── Jettons ── */}
                      {jettons && jettons.length > 0 && (
                        <>
                          <div className="px-5 pt-5 pb-1">
                            <div className="flex items-center gap-2">
                              <p className="text-[9px] font-heading font-black uppercase tracking-[0.2em] text-emerald-500">Jetton Tokens</p>
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
                                    asset: jetton.jetton.symbol === 'USDT' ? 'JETTON' : 'JETTON',
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
                                <p className="text-sm font-heading font-bold text-white uppercase tracking-widest">{jetton.jetton.name}</p>
                                <p className="text-xs font-heading font-bold text-gray-500 tracking-widest">{jetton.jetton.symbol} · TON Jetton</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-numbers font-bold text-white tracking-widest">{(Number(jetton.balance) / Math.pow(10, jetton.jetton.decimals || 9)).toFixed(2)}</p>
                                <p className="text-[10px] font-heading font-bold text-gray-600 tracking-widest">{jetton.jetton.symbol}</p>
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
              <label className="text-[10px] font-heading font-black uppercase tracking-[0.2em] text-gray-500 ml-2">{t('transfer.recipientAddress')}</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => { setRecipient(e.target.value); setRecipientInfo(null); }}
                onBlur={handleRecipientBlur}
                placeholder={
                  isRzcTransfer
                    ? "@username or wallet address"
                    : "EQ... or UQ... (TON address)"
                }
                className="w-full bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-5 text-white font-numbers font-bold text-sm tracking-widest outline-none focus:border-[#00FF88]/50 transition-all placeholder:text-gray-700"
              />
              {isValidatingRecipient && (
                <p className="text-[9px] text-gray-500 ml-2 mt-1">Resolving recipient...</p>
              )}
              {recipientInfo && !isValidatingRecipient && (
                recipientInfo.valid ? (
                  <p className="text-[9px] text-[#00FF88] ml-2 mt-1 font-heading font-bold flex items-center gap-1 uppercase tracking-widest">
                    <span>✓</span>
                    {isRzcTransfer
                      ? (recipientInfo.name ? `@${recipientInfo.name}` : recipientInfo.walletAddress?.slice(0, 8) + '...')
                      : 'Valid TON address'}
                  </p>
                ) : (
                  <p className="text-[9px] text-red-400 ml-2 mt-1 font-heading font-bold uppercase tracking-widest">✗ {recipientInfo.error}</p>
                )
              )}
              {isRzcTransfer && (
                <p className="text-[9px] text-gray-500 ml-2">
                  💡 You can send to @username or wallet address (must be registered in RhizaCore)
                </p>
              )}
              {!isRzcTransfer && !
                  (selectedWallet === 'primary' || selectedWallet === 'multichain-ton') && (
                <p className="text-[9px] font-heading font-bold text-gray-500 ml-2 uppercase tracking-widest">
                  💡 Enter a TON wallet address (EQ..., UQ..., or kQ...)
                </p>
              )}
            </div>

            <div className="space-y-2.5 sm:space-y-3">
              <div className="flex items-center justify-between ml-2">
                <label className="text-[10px] font-heading font-black uppercase tracking-[0.2em] text-gray-500">{t('transfer.amount')}</label>
                <div className="flex gap-2">
                  <button
                    onClick={handleMax}
                    className="text-[9px] font-heading font-black text-[#00FF88] uppercase tracking-widest hover:opacity-70 active:scale-95 px-2 py-1 bg-[#00FF88]/10 rounded"
                  >
                    Send Max
                  </button>
                  {!isRzcTransfer && !isJettonTransfer && (!locationState?.asset || locationState?.asset === 'TON') && (
                    <button
                      onClick={handleSendAll}
                      disabled={!recipient.trim() || recipient.length < 40 || isSendingAll}
                      className="text-[9px] font-heading font-black text-orange-400 uppercase tracking-widest hover:opacity-70 active:scale-95 px-2 py-1 bg-orange-500/10 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Send entire balance (gas fees calculated automatically)"
                    >
                      Send All
                    </button>
                  )}
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
                  className="w-full bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-5 text-white font-numbers font-black text-xl sm:text-2xl outline-none focus:border-[#00FF88]/50 transition-all placeholder:text-gray-800 tracking-widest"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-heading font-black text-xs text-gray-500 uppercase tracking-widest pointer-events-none">
                  {isRzcTransfer
                    ? 'RZC'
                    : isJettonTransfer && jettonData
                      ? jettonData.symbol
                      : (isUsdtTransfer || selectedWallet === 'multichain-tron-usdt')
                        ? 'USDT'
                        : selectedWallet === 'multichain-tron'
                          ? 'TRX'
                          : 'TON'}
                </span>
              </div>
              <p className="text-[9px] text-gray-500 ml-2">💡 "Send All" transfers your entire balance with gas fees calculated automatically</p>
            </div>

            <div className="space-y-2.5 sm:space-y-3">
              <label className="text-[10px] font-heading font-black uppercase tracking-[0.2em] text-gray-500 ml-2">{t('transfer.memo')}</label>
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Attached message..."
                className="w-full bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-5 text-white font-heading font-bold text-sm tracking-widest outline-none focus:border-[#00FF88]/50 transition-all placeholder:text-gray-700"
              />
            </div>

            {/* Transaction Summary */}
            {amount && sendAmount > 0 && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-3">
                <h4 className="text-[10px] font-heading font-black uppercase tracking-[0.2em] text-blue-300">Transaction Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-heading font-bold uppercase tracking-widest leading-relaxed">{t('wallet.amount')}:</span>
                    <span className="text-white font-numbers font-bold tracking-widest">
                      {isRzcTransfer
                        ? sendAmount.toLocaleString()
                        : sendAmount.toFixed(isJettonTransfer && jettonData ? Math.min(jettonData.decimals, 4) : (isUsdtTransfer || selectedWallet === 'multichain-tron-usdt') ? 6 : 4)
                      } {isRzcTransfer
                        ? 'RZC'
                        : isJettonTransfer && jettonData
                          ? jettonData.symbol
                          : (isUsdtTransfer || selectedWallet === 'multichain-tron-usdt')
                            ? 'USDT'
                            : selectedWallet === 'multichain-tron'
                              ? 'TRX'
                               : 'TON'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-heading font-bold uppercase tracking-widest leading-relaxed">Network Fee:</span>
                    <span className={`font-numbers font-bold tracking-widest ${isFetchingFee ? 'text-gray-400 animate-pulse' : 'text-[#00FF88]'}`}>
                      {isFetchingFee
                        ? 'Estimating...'
                        : isRzcTransfer
                          ? 'Free'
                          : feeEstimate
                            ? feeEstimate
                            : `~${estimatedFee.toFixed(4)} TON`}
                    </span>
                  </div>
                  {isJettonTransfer && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 font-heading font-bold uppercase tracking-widest leading-relaxed">TON Balance:</span>
                      <span className={`font-numbers font-bold tracking-widest ${hasEnoughTonForGas ? 'text-[#00FF88]' : 'text-red-400'}`}>
                        {tonBalance.toFixed(4)} TON
                      </span>
                    </div>
                  )}
                  {!isJettonTransfer && !isRzcTransfer && selectedWallet === 'primary' && (
                    <>
                      <div className="border-t border-blue-500/20 pt-2 mt-2">
                        <div className="flex justify-between items-center font-heading font-bold uppercase tracking-widest leading-relaxed">
                          <span className="text-blue-300">{t('transfer.total')}:</span>
                          <span className="text-white font-numbers font-bold tracking-widest">{totalRequired.toFixed(4)} TON</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 font-heading font-bold uppercase tracking-widest leading-relaxed">Remaining Balance:</span>
                        <span className={`font-numbers font-bold tracking-widest ${currentBalance - totalRequired >= 0 ? 'text-[#00FF88]' : 'text-red-400'}`}>
                          {(currentBalance - totalRequired).toFixed(4)} TON
                        </span>
                      </div>
                    </>
                  )}
                  {selectedWallet === 'multichain-ton' && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 font-heading font-bold uppercase tracking-widest leading-relaxed">Remaining Balance:</span>
                      <span className={`font-numbers font-bold tracking-widest ${currentBalance - sendAmount >= 0 ? 'text-[#00FF88]' : 'text-red-400'}`}>
                        {(currentBalance - sendAmount).toFixed(4)} TON
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
                  <p className="text-sm font-heading font-black text-yellow-400 mb-1 uppercase tracking-widest">Large Transaction</p>
                  <p className="text-xs font-heading font-bold text-yellow-300/80 uppercase tracking-widest leading-relaxed">You're sending more than 50% of your balance. Please double-check the recipient address.</p>
                </div>
              </div>
            )}

            {/* Insufficient TON for Gas Warning (Jettons only) */}
            {isJettonTransfer && !hasEnoughTonForGas && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl sm:rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-heading font-black text-red-400 mb-1 uppercase tracking-widest">Insufficient TON for Gas</p>
                  <p className="text-xs font-heading font-bold text-red-300/80 uppercase tracking-widest leading-relaxed">
                    You need {estimatedFee.toFixed(4)} TON for gas fees but only have {tonBalance.toFixed(4)} TON.
                  </p>
                </div>
              </div>
            )}

            {/* Insufficient TRX for Gas Warning (TRON USDT) */}
            {selectedWallet === 'multichain-tron-usdt' && !hasEnoughTrxForGas && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl sm:rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-heading font-black text-red-400 mb-1 uppercase tracking-widest">Insufficient TRX for Gas</p>
                  <p className="text-xs font-heading font-bold text-red-300/80 uppercase tracking-widest leading-relaxed">
                    You need ~{parsedTrxFee.toFixed(1)} TRX for gas fees but only have {tronBalance.toFixed(1)} TRX.
                  </p>
                </div>
              </div>
            )}

            {/* Insufficient Balance Warning */}
            {amount && sendAmount > 0 && totalRequired > currentBalance && !isJettonTransfer && !isUsdtTransfer && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl sm:rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-heading font-black text-red-400 mb-1 uppercase tracking-widest">{t('errors.insufficientBalance')}</p>
                  <p className="text-xs font-heading font-bold text-red-300/80 uppercase tracking-widest leading-relaxed">
                    You need {totalRequired.toFixed(4)} {selectedWallet === 'multichain-tron' ? 'TRX' : 'TON'} (including fees) but only have {currentBalance.toFixed(4)} {selectedWallet === 'multichain-tron' ? 'TRX' : 'TON'}.
                  </p>
                </div>
              </div>
            )}
          </div>

          <button
            disabled={!isValid}
            onClick={handleNext}
            className={`w-full p-5 sm:p-6 rounded-xl sm:rounded-2xl flex items-center justify-center gap-3 text-sm font-heading font-black uppercase tracking-widest transition-all ${isValid ? 'bg-[#00FF88] text-black shadow-3xl hover:scale-[1.02] active:scale-[0.98]' : 'bg-white/5 text-gray-600 cursor-not-allowed'
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
              <p className="text-[10px] font-heading font-black text-gray-500 uppercase tracking-[0.3em]">You are sending</p>
              <h2 className="text-4xl sm:text-5xl font-numbers font-black text-[#00FF88] tracking-tight-custom">
                {amount} <span className="text-lg sm:text-xl font-heading font-black text-white uppercase tracking-widest">
                  {isRzcTransfer
                    ? 'RZC'
                    : isJettonTransfer && jettonData
                      ? jettonData.symbol
                      : (isUsdtTransfer || selectedWallet === 'multichain-tron-usdt')
                        ? 'USDT'
                        : selectedWallet === 'multichain-tron'
                          ? 'TRX'
                          : 'TON'}
                </span>
              </h2>
            </div>

            <div className="space-y-3 sm:space-y-4 pt-4 sm:pt-6 border-t border-white/5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-heading font-bold uppercase tracking-widest leading-relaxed">{t('wallet.recipient')}</span>
                <span className="text-white font-numbers font-bold text-xs truncate max-w-[150px] sm:max-w-[200px] tracking-widest">{recipient}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-heading font-bold uppercase tracking-widest leading-relaxed">{t('wallet.amount')}</span>
                <span className="text-white font-numbers font-bold tracking-widest">
                  {isRzcTransfer
                    ? sendAmount.toLocaleString()
                    : sendAmount.toFixed(isJettonTransfer && jettonData ? Math.min(jettonData.decimals, 4) : (isUsdtTransfer || selectedWallet === 'multichain-tron-usdt') ? 6 : 4)
                  } {isRzcTransfer
                    ? 'RZC'
                    : isJettonTransfer && jettonData
                      ? jettonData.symbol
                      : (isUsdtTransfer || selectedWallet === 'multichain-tron-usdt')
                        ? 'USDT'
                        : selectedWallet === 'multichain-tron'
                          ? 'TRX'
                          : 'TON'}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-heading font-bold uppercase tracking-widest leading-relaxed">{t('wallet.fee')}</span>
                <span className={`font-numbers font-bold tracking-widest ${isFetchingFee ? 'text-gray-400 animate-pulse' : 'text-[#00FF88]'}`}>
                  {isFetchingFee
                    ? 'Estimating...'
                    : isRzcTransfer
                      ? 'Free'
                      : feeEstimate
                        ? feeEstimate
                        : `~${estimatedFee.toFixed(4)} TON`}
                </span>
              </div>
              {!isJettonTransfer && selectedWallet === 'primary' && !isRzcTransfer && (
                <div className="border-t border-white/5 pt-3 mt-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 font-heading font-bold uppercase tracking-widest leading-relaxed">{t('wallet.total')}</span>
                    <span className="text-white font-numbers font-bold tracking-widest">{totalRequired.toFixed(4)} TON</span>
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
                Verify the address carefully. Transactions on TON are irreversible.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:gap-4">
            <button
              onClick={handleConfirm}
              className="w-full p-5 sm:p-6 bg-[#00FF88] text-black rounded-xl sm:rounded-2xl font-heading font-black text-sm uppercase tracking-widest shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Confirm & Disperse
            </button>
            <button
              onClick={() => setStep('form')}
              className="w-full p-3 sm:p-4 text-gray-500 font-heading font-black text-[10px] uppercase tracking-widest hover:text-white transition-colors active:scale-95"
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
                <h2 className="text-2xl font-heading font-black text-white uppercase tracking-[0.1em]">{t('common.loading')}</h2>
                <p className="text-gray-500 font-heading font-bold uppercase tracking-widest leading-relaxed text-xs">
                  {selectedWallet === 'multichain-ton'
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
                <h2 className="text-4xl font-heading font-black text-[#00FF88] uppercase tracking-[0.1em]">{t('common.success')}</h2>
                <p className="text-gray-400 font-heading font-bold uppercase tracking-widest leading-relaxed text-xs">
                  {selectedWallet === 'multichain-ton'
                    ? 'TON transfer complete from your Multi-Chain Wallet. The recipient will see the balance shortly.'
                    : 'Asset dispersion complete. The recipient will see the balance shortly.'}
                </p>
                {txHash && (
                  <div className="p-4 bg-white/5 rounded-xl">
                    <p className="text-[10px] font-heading font-black text-gray-500 uppercase tracking-widest mb-2">Transaction ID</p>
                    <p className="text-xs font-numbers font-bold text-[#00FF88] break-all tracking-widest">{txHash}</p>
                    {(() => {
                      let txLinkUrl = '';
                      let linkName = 'Explorer';
                      if (!isRzcTransfer) {
                        try {
                          txLinkUrl = getTransactionUrl(txHash, network);
                          linkName = 'TonViewer';
                        } catch (e) { }
                      }

                      if (!txLinkUrl) return null;

                      return (
                        <a
                          href={txLinkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-xs text-violet-400 hover:text-violet-300 font-bold"
                        >
                          View on {linkName}
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
                        </a>
                      );
                    })()}
                  </div>
                )}
              </div>
              <button
                onClick={() => navigate('/wallet/dashboard')}
                className="px-12 py-5 bg-white text-black rounded-2xl font-heading font-black text-xs uppercase tracking-widest hover:bg-[#00FF88] transition-all shadow-2xl"
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
                <h2 className="text-2xl font-heading font-black text-rose-500 uppercase tracking-[0.1em]">{t('transfer.failed')}</h2>
                <p className="text-gray-500 text-sm">
                  {errorMessage || 'Network congestion or insufficient gas fees.'}
                </p>
              </div>
              <button
                onClick={() => setStep('form')}
                className="px-8 py-4 bg-white/10 text-white rounded-2xl font-heading font-black text-xs uppercase tracking-widest hover:bg-white/20 transition-all"
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
