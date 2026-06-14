
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
import { useAssetSelector } from '../context/AssetSelectorContext';

const Transfer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { openAssetSelector } = useAssetSelector();
  const { balance, network, jettons, address, refreshData, multiChainBalances, setIsNetworkModalOpen, isNetworkModalOpen, currentEvmChain, addPendingTransaction, switchEvmChain } = useWallet();

  const activeWallet = WalletManager.getActiveWallet();
  const allWallets = WalletManager.getWallets();
  const multiChainWallet = allWallets.find(w => w.type === 'secondary');
  // Show multi-chain options whenever a secondary wallet exists, or the active wallet is primary
  const isMultiChainActive = !!multiChainWallet || activeWallet?.type === 'primary';
  
  const walletForAddresses = multiChainWallet || activeWallet;
  const multiChainAddresses = walletForAddresses && walletForAddresses.addresses ? {
    evmAddress: walletForAddresses.addresses.evm,
    tonAddress: walletForAddresses.addresses.ton,
    btcAddress: walletForAddresses.addresses.btc,
    solAddress: walletForAddresses.addresses.sol,
    tronAddress: walletForAddresses.addresses.tron
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
  // Live fee estimate state — fetched from quoteSend* before the confirm step
  const [feeEstimate, setFeeEstimate] = useState<string | null>(null);
  const [isFetchingFee, setIsFetchingFee] = useState(false);

  const initWallet = (): 'primary' | 'multichain-ton' | 'multichain-tron' | 'multichain-tron-usdt' | 'multichain-eth-usdt' | 'multichain-bsc-usdt' | 'multichain-sol' | 'multichain-eth' | 'multichain-bsc' | 'multichain-polygon' | 'multichain-btc' => {
    const a = (location.state as any)?.asset;
    if (a === 'TRX') return 'multichain-tron';
    if (a === 'BTC') return 'multichain-btc';
    if (a === 'SOL') return 'multichain-sol';
    if (a === 'ETH') return 'multichain-eth';
    if (a === 'MATIC' || a === 'EVM' || a === 'POLYGON') return 'multichain-polygon';
    if (a === 'BNB' || a === 'BSC') return 'multichain-bsc';
    if (a === 'USDT' || a === 'JETTON') {
      return 'primary';
    }
    const activeWalletType = localStorage.getItem('rhiza_active_wallet_type');
    if (activeWalletType === 'secondary') return 'multichain-ton';
    return 'primary';
  };
  const [selectedWallet, setSelectedWallet] = useState<'primary' | 'multichain-ton' | 'multichain-tron' | 'multichain-tron-usdt' | 'multichain-eth-usdt' | 'multichain-bsc-usdt' | 'multichain-sol' | 'multichain-eth' | 'multichain-bsc' | 'multichain-polygon' | 'multichain-btc'>(initWallet() as any);
  const [recipientInfo, setRecipientInfo] = useState<{ valid: boolean; name?: string; walletAddress?: string; error?: string } | null>(null);
  const [isValidatingRecipient, setIsValidatingRecipient] = useState(false);
  const [wdkLocked, setWdkLocked] = useState(false);

  // Smart Default for USDT: pick the chain with the highest balance
  useEffect(() => {
    if (isUsdtTransfer && multiChainBalances) {
      const tonUsdtBal = parseFloat(multiChainBalances.usdt || '0');
      const tronUsdtBal = parseFloat(multiChainBalances.tronUsdt || '0');
      const ethUsdtBal = parseFloat(multiChainBalances.ethUsdt || '0');
      const bscUsdtBal = parseFloat(multiChainBalances.bscUsdt || '0');

      const options = [
        { id: 'primary', val: tonUsdtBal },
        { id: 'multichain-tron-usdt', val: tronUsdtBal },
        { id: 'multichain-eth-usdt', val: ethUsdtBal },
        { id: 'multichain-bsc-usdt', val: bscUsdtBal }
      ];

      // Sort balances descending
      options.sort((a, b) => b.val - a.val);

      const highest = options.find(o => o.val > 0);
      if (highest) {
        setSelectedWallet(highest.id as any);
      } else {
        setSelectedWallet('primary');
      }
    }
  }, [isUsdtTransfer, multiChainBalances]);

  // Check WDK initialization state when a multi-chain wallet is selected
  useEffect(() => {
    if (selectedWallet === 'multichain-ton' || selectedWallet === 'multichain-tron' || selectedWallet === 'multichain-tron-usdt' || selectedWallet === 'multichain-eth-usdt' || selectedWallet === 'multichain-bsc-usdt' || selectedWallet === 'multichain-sol' || selectedWallet === 'multichain-eth' || selectedWallet === 'multichain-bsc' || selectedWallet === 'multichain-polygon' || selectedWallet === 'multichain-btc') {
      import('../services/tetherWdkService').then(({ tetherWdkService }) => {
        setWdkLocked(!tetherWdkService.isUnlocked());
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
      } else if (selectedWallet === 'multichain-eth-usdt') {
        const q = await tetherWdkService.quoteSendEvmTokenTransaction(recipient, amount, 'ethereum');
        setFeeEstimate(q && q.feeEvm ? `~${q.feeEvm} ETH` : '~0.005 ETH');
      } else if (selectedWallet === 'multichain-bsc-usdt') {
        const q = await tetherWdkService.quoteSendEvmTokenTransaction(recipient, amount, 'bsc');
        setFeeEstimate(q && q.feeEvm ? `~${q.feeEvm} BNB` : '~0.005 BNB');
      } else if (selectedWallet === 'multichain-tron') {
        setFeeEstimate(`~1.5 TRX`);
      } else if (selectedWallet === 'multichain-sol') {
        const q = await tetherWdkService.quoteSendSolTransaction(recipient, amount);
        setFeeEstimate(q && q.feeSol ? `~${q.feeSol} SOL` : '~0.000005 SOL');
      } else if (selectedWallet === 'multichain-eth') {
        const q = await tetherWdkService.quoteSendEvmTransaction(recipient, amount, 'ethereum');
        setFeeEstimate(q && q.feeEvm ? `~${q.feeEvm} ETH` : '~0.005 ETH');
      } else if (selectedWallet === 'multichain-bsc') {
        const q = await tetherWdkService.quoteSendEvmTransaction(recipient, amount, 'bsc');
        setFeeEstimate(q && q.feeEvm ? `~${q.feeEvm} BNB` : '~0.005 BNB');
      } else if (selectedWallet === 'multichain-polygon') {
        const q = await tetherWdkService.quoteSendEvmTransaction(recipient, amount, 'polygon');
        setFeeEstimate(q && q.feeEvm ? `~${q.feeEvm} MATIC` : '~0.005 MATIC');
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
      } else if (selectedWallet === 'multichain-eth-usdt') {
        setFeeEstimate('~0.005 ETH');
      } else if (selectedWallet === 'multichain-bsc-usdt') {
        setFeeEstimate('~0.005 BNB');
      } else if (selectedWallet === 'multichain-tron') {
        setFeeEstimate('~1.5 TRX');
      } else if (selectedWallet === 'multichain-sol') {
        setFeeEstimate('~0.000005 SOL');
      } else if (selectedWallet === 'multichain-eth') {
        setFeeEstimate('~0.005 ETH');
      } else if (selectedWallet === 'multichain-bsc') {
        setFeeEstimate('~0.005 BNB');
      } else if (selectedWallet === 'multichain-polygon') {
        setFeeEstimate('~0.005 MATIC');
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
      : selectedWallet === 'multichain-tron-usdt'
        ? parseFloat(multiChainBalances?.tronUsdt || '0')
        : selectedWallet === 'multichain-eth-usdt'
          ? parseFloat(multiChainBalances?.ethUsdt || '0')
          : selectedWallet === 'multichain-bsc-usdt'
            ? parseFloat(multiChainBalances?.bscUsdt || '0')
            : isUsdtTransfer
              ? (usdtJetton ? parseFloat(toDecimals(BigInt(usdtJetton.balance), usdtJetton.jetton.decimals)) : 0)
              : selectedWallet === 'multichain-tron'
                ? parseFloat(multiChainBalances?.tron || '0')
                : selectedWallet === 'multichain-sol'
                  ? parseFloat(multiChainBalances?.sol || '0')
                  : selectedWallet === 'multichain-btc'
                    ? parseFloat(multiChainBalances?.btc || '0')
                    : selectedWallet === 'multichain-eth'
                      ? parseFloat(multiChainBalances?.eth || '0')
                      : selectedWallet === 'multichain-bsc'
                        ? parseFloat(multiChainBalances?.bnb || '0')
                        : selectedWallet === 'multichain-polygon'
                          ? parseFloat(multiChainBalances?.evm || '0')
                          : selectedWallet === 'multichain-ton'
                            ? parseFloat(multiChainBalances?.ton || '0')
                        : parseFloat(balance || '0');

  const sendAmount = parseFloat(amount || '0');
  const estimatedFee = (isJettonTransfer || (isUsdtTransfer && selectedWallet !== 'multichain-tron-usdt' && selectedWallet !== 'multichain-eth-usdt' && selectedWallet !== 'multichain-bsc-usdt')) ? parseFloat(estimateJettonTransferFee()) : isRzcTransfer ? 0 : 0.01;
  const tonBalance = parseFloat(balance || '0');
  const tronBalance = parseFloat(multiChainBalances?.tron || '0');
  const ethBalance = parseFloat(multiChainBalances?.eth || '0');
  const bscBalance = parseFloat(multiChainBalances?.bnb || '0');
  const parsedTrxFee = feeEstimate ? parseFloat(feeEstimate.replace(/[^\d.]/g, '')) || 15.0 : 15.0;
  const parsedEvmFee = feeEstimate ? parseFloat(feeEstimate.replace(/[^\d.]/g, '')) || 0.005 : 0.005;
  const hasEnoughTrxForGas = tronBalance >= parsedTrxFee;
  const hasEnoughEvmGasForToken =
    selectedWallet === 'multichain-eth-usdt'
      ? ethBalance >= parsedEvmFee
      : selectedWallet === 'multichain-bsc-usdt'
        ? bscBalance >= parsedEvmFee
        : true;

  // For jettons, we need TON for gas but send jettons
  // For RZC, no gas fees (internal transfer)
  const totalRequired = isRzcTransfer
    ? sendAmount // Just RZC amount, no fees
    : (selectedWallet === 'multichain-tron-usdt' || selectedWallet === 'multichain-eth-usdt' || selectedWallet === 'multichain-bsc-usdt')
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
    } else if (isUsdtTransfer || selectedWallet === 'multichain-tron-usdt' || selectedWallet === 'multichain-eth-usdt' || selectedWallet === 'multichain-bsc-usdt') {
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
    } else if (selectedWallet === 'multichain-eth' || selectedWallet === 'multichain-bsc' || selectedWallet === 'multichain-polygon') {
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
      if (selectedWallet === 'multichain-ton' || selectedWallet === 'multichain-tron' || selectedWallet === 'multichain-tron-usdt' || selectedWallet === 'multichain-eth-usdt' || selectedWallet === 'multichain-bsc-usdt' || selectedWallet === 'multichain-sol' || selectedWallet === 'multichain-eth' || selectedWallet === 'multichain-bsc' || selectedWallet === 'multichain-polygon' || selectedWallet === 'multichain-btc') {
        const { tetherWdkService } = await import('../services/tetherWdkService');
        if (!tetherWdkService.isUnlocked()) {
          setIsSendingAll(false);
          showToast('Wallet locked — unlock in Multi-Chain Hub', 'error');
          navigate('/wallet/multi-chain');
          return;
        }
      }

      // ── Multi-chain EVM USDT Send All ──────────────────────────────────────────
      if (selectedWallet === 'multichain-eth-usdt' || selectedWallet === 'multichain-bsc-usdt') {
        const { tetherWdkService } = await import('../services/tetherWdkService');
        const sendAllAmount = currentBalance;
        if (sendAllAmount <= 0) throw new Error('Insufficient USDT balance');
        const explicitChain = selectedWallet === 'multichain-eth-usdt' ? 'ethereum' : 'bsc';
        const result = await tetherWdkService.sendEvmTokenTransaction(recipient, sendAllAmount.toFixed(6), explicitChain);
        if (result.success) {
          setStatus('success');
          setTxHash(result.txHash || '');
          showToast(`All USDT sent successfully on ${explicitChain === 'ethereum' ? 'Ethereum' : 'BSC'}!`, 'success');
          setTimeout(() => { refreshData(); }, 1500);
        } else { throw new Error(result.error || 'USDT transaction failed'); }
        return;
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
      if (selectedWallet === 'multichain-eth' || selectedWallet === 'multichain-bsc' || selectedWallet === 'multichain-polygon') {
        const { tetherWdkService } = await import('../services/tetherWdkService');
        const gasReserve = 0.005;
        const sendAllAmount = Math.max(0, currentBalance - gasReserve);
        if (sendAllAmount <= 0) throw new Error('Insufficient EVM balance for gas fees');
        
        const explicitChain = selectedWallet === 'multichain-eth' ? 'ethereum' : selectedWallet === 'multichain-bsc' ? 'bsc' : 'polygon';
        const result = await tetherWdkService.sendEvmTransaction(recipient, sendAllAmount.toFixed(6), explicitChain);
        
        if (result.success) {
          setStatus('success');
          setTxHash(result.txHash || '');
          showToast(`All ${selectedWallet === 'multichain-eth' ? 'ETH' : selectedWallet === 'multichain-bsc' ? 'BNB' : 'MATIC'} sent successfully!`, 'success');
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
    if (selectedWallet === 'multichain-eth' || selectedWallet === 'multichain-bsc' || selectedWallet === 'multichain-polygon' || selectedWallet === 'multichain-eth-usdt' || selectedWallet === 'multichain-bsc-usdt') {
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
          if (!tetherWdkService.isUnlocked()) {
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
        if (!tetherWdkService.isUnlocked()) {
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
        if (!tetherWdkService.isUnlocked()) {
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
        if (!tetherWdkService.isUnlocked()) {
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
      else if (selectedWallet === 'multichain-eth' || selectedWallet === 'multichain-bsc' || selectedWallet === 'multichain-polygon') {
        const { tetherWdkService } = await import('../services/tetherWdkService');
        if (!tetherWdkService.isUnlocked()) {
          setStatus('error');
          setErrorMessage('Multi-chain wallet needs to be unlocked. Please go to Multi-Chain Hub and enter your password.');
          showToast('Wallet locked — unlock in Multi-Chain Hub', 'error');
          setTimeout(() => navigate('/wallet/multi-chain'), 2000);
          return;
        }

        const explicitChain = selectedWallet === 'multichain-eth' ? 'ethereum' : selectedWallet === 'multichain-bsc' ? 'bsc' : 'polygon';
        const result = await tetherWdkService.sendEvmTransaction(recipient, amount, explicitChain);

        if (result.success) {
          setStatus('success');
          setTxHash(result.txHash || '');
          const symbol = selectedWallet === 'multichain-eth' ? 'ETH' : selectedWallet === 'multichain-bsc' ? 'BNB' : 'MATIC';
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
      // EVM USDT Transfer
      else if (selectedWallet === 'multichain-eth-usdt' || selectedWallet === 'multichain-bsc-usdt') {
        const { tetherWdkService } = await import('../services/tetherWdkService');
        if (!tetherWdkService.isUnlocked()) {
          setStatus('error');
          setErrorMessage('Multi-chain wallet needs to be unlocked. Please go to Multi-Chain Hub and enter your password.');
          showToast('Wallet locked — unlock in Multi-Chain Hub', 'error');
          setTimeout(() => navigate('/wallet/multi-chain'), 2000);
          return;
        }

        const explicitChain = selectedWallet === 'multichain-eth-usdt' ? 'ethereum' : 'bsc';
        const result = await tetherWdkService.sendEvmTokenTransaction(recipient, amount, explicitChain);
        if (result.success) {
          setStatus('success');
          setTxHash(result.txHash || '');
          showToast(`USDT transaction sent successfully on ${explicitChain === 'ethereum' ? 'Ethereum' : 'BSC'}!`, 'success');

          if (addPendingTransaction) {
            addPendingTransaction({
              hash: result.txHash || '',
              symbol: 'USDT',
              amount: parseFloat(amount).toString(),
              type: 'send'
            });
          }

          setTimeout(() => { refreshData(); }, 1500);
        } else {
          throw new Error(result.error || `USDT transaction failed`);
        }
      }
      // TON Transfer
      else if (!locationState?.asset || locationState?.asset === 'TON') {
        let result;

        if (selectedWallet === 'multichain-ton') {
          const { tetherWdkService } = await import('../services/tetherWdkService');

          // Guard: ensure WDK is initialized
          if ((!tetherWdkService.isUnlocked() || !tetherWdkService.hasStoredWallet())) {
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
          if (!tetherWdkService.isUnlocked()) {
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
      : (selectedWallet === 'multichain-eth' || selectedWallet === 'multichain-bsc' || selectedWallet === 'multichain-polygon')
        ? recipient.length >= 42 && sendAmount > 0 && sendAmount <= currentBalance && !wdkLocked
        : selectedWallet === 'multichain-sol'
          ? recipient.length >= 32 && sendAmount > 0 && sendAmount <= currentBalance && !wdkLocked
          : selectedWallet === 'multichain-tron-usdt'
            ? recipient.length > 30 && sendAmount > 0 && sendAmount <= currentBalance && !wdkLocked && hasEnoughTrxForGas
            : selectedWallet === 'multichain-eth-usdt' || selectedWallet === 'multichain-bsc-usdt'
              ? recipient.length >= 42 && sendAmount > 0 && sendAmount <= currentBalance && !wdkLocked && hasEnoughEvmGasForToken
              : selectedWallet === 'multichain-tron'
                ? recipient.length > 30 && sendAmount > 0 && sendAmount <= currentBalance && !wdkLocked
                : selectedWallet === 'multichain-btc'
                  ? recipient.length > 25 && sendAmount > 0 && sendAmount <= currentBalance && !wdkLocked
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
                <li className="text-[11px] text-amber-400/80 font-medium flex items-start gap-2"><span className="mt-0.5 flex-shrink-0">•</span>Your RZC balance is safe and fully intact</li>
                <li className="text-[11px] text-amber-400/80 font-medium flex items-start gap-2"><span className="mt-0.5 flex-shrink-0">•</span>All balances are being audited to ensure accuracy</li>
                <li className="text-[11px] text-amber-400/80 font-medium flex items-start gap-2"><span className="mt-0.5 flex-shrink-0">•</span>Transfers will resume automatically once verification is complete</li>
              </ul>
            </div>
            <button onClick={() => navigate('/wallet/assets')} className="w-full py-3.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-heading font-black text-xs uppercase tracking-widest transition-all active:scale-95">Back to Assets</button>
          </div>
        </div>
      )}

      {/* ─── FORM STEP ─────────────────────────────────────────── */}
      {(!isRzcTransfer || canSendRzc) && step === 'form' && (
        <div className="space-y-4">

          {/* ── Asset / Wallet Selector ── */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-heading font-black uppercase tracking-[0.18em] text-gray-500 ml-1">Asset</label>
            <button
              onClick={() => openAssetSelector({
                activeWalletId: selectedWallet,
                activeEvmChain: currentEvmChain,
                onSelect: async ({ walletId, evmChain, jetton, isRzc }) => {
                  if (jetton) {
                    setSelectedWallet('primary');
                    navigate('/wallet/transfer', {
                      state: {
                        asset: 'JETTON',
                        jettonAddress: jetton.address,
                        jettonName: jetton.name,
                        jettonSymbol: jetton.symbol,
                        jettonDecimals: jetton.decimals,
                        jettonBalance: jetton.balance,
                        jettonWalletAddress: jetton.walletAddress,
                      }
                    });
                    return;
                  }
                  if (isRzc) {
                    setSelectedWallet('primary');
                    navigate('/wallet/transfer', { state: { asset: 'RZC' } });
                    return;
                  }
                  setSelectedWallet(walletId as any);
                }
              })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between hover:bg-white/8 hover:border-white/20 transition-all active:scale-[0.99] group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  {isRzcTransfer ? (
                    <span className="text-base text-[#00FF88]">⚡</span>
                  ) : (isUsdtTransfer || selectedWallet === 'multichain-tron-usdt' || selectedWallet === 'multichain-eth-usdt' || selectedWallet === 'multichain-bsc-usdt') ? (
                    <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png" className="w-full h-full object-cover" alt="USDT" />
                  ) : selectedWallet === 'multichain-sol' ? (
                    <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png" className="w-full h-full object-cover" alt="SOL" />
                  ) : selectedWallet === 'multichain-btc' ? (
                    <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png" className="w-full h-full object-cover" alt="BTC" />
                  ) : selectedWallet === 'multichain-tron' ? (
                    <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/tron/info/logo.png" className="w-full h-full object-cover" alt="TRX" />
                  ) : selectedWallet === 'multichain-polygon' ? (
                    <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png" className="w-full h-full object-cover" alt="MATIC" />
                  ) : selectedWallet === 'multichain-bsc' ? (
                    <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/info/logo.png" className="w-full h-full object-cover" alt="BNB" />
                  ) : selectedWallet === 'multichain-eth' ? (
                    <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png" className="w-full h-full object-cover" alt="ETH" />
                  ) : isJettonTransfer && jettonData ? (
                    <div className="w-full h-full bg-violet-500/20 flex items-center justify-center text-xs font-black text-violet-300">{(jettonData.symbol || '').slice(0, 2)}</div>
                  ) : (
                    <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ton/info/logo.png" className="w-full h-full object-cover" alt="TON" />
                  )}
                </div>
                <div className="text-left">
                  <p className="font-heading font-black text-sm text-white leading-tight">
                    {isRzcTransfer ? 'RhizaCore Token'
                      : isJettonTransfer && jettonData ? jettonData.name
                        : selectedWallet === 'multichain-tron-usdt' ? 'Tether USDT (TRON)'
                          : selectedWallet === 'multichain-eth-usdt' ? 'Tether USDT (Ethereum)'
                            : selectedWallet === 'multichain-bsc-usdt' ? 'Tether USDT (BSC)'
                              : isUsdtTransfer ? 'Tether USDT'
                                : selectedWallet === 'multichain-eth' ? 'Ethereum'
                                  : selectedWallet === 'multichain-bsc' ? 'BNB Smart Chain'
                                    : selectedWallet === 'multichain-polygon' ? 'Polygon (MATIC)'
                                      : selectedWallet === 'multichain-sol' ? 'Solana'
                                    : selectedWallet === 'multichain-btc' ? 'Bitcoin'
                                      : selectedWallet === 'multichain-ton' ? 'Toncoin (W5)'
                                        : selectedWallet === 'multichain-tron' ? 'TRON'
                                          : 'Toncoin'}
                  </p>
                  <p className="text-[10px] text-gray-500 font-mono">
                    {isRzcTransfer ? currentBalance.toLocaleString() : currentBalance.toFixed(isJettonTransfer && jettonData ? Math.min(jettonData.decimals, 4) : (isUsdtTransfer || selectedWallet === 'multichain-tron-usdt' || selectedWallet === 'multichain-eth-usdt' || selectedWallet === 'multichain-bsc-usdt') ? 2 : selectedWallet === 'multichain-btc' ? 6 : 4)}{' '}
                    {isRzcTransfer ? 'RZC' : isJettonTransfer && jettonData ? jettonData.symbol : (isUsdtTransfer || selectedWallet === 'multichain-tron-usdt' || selectedWallet === 'multichain-eth-usdt' || selectedWallet === 'multichain-bsc-usdt') ? 'USDT' : selectedWallet === 'multichain-eth' ? 'ETH' : selectedWallet === 'multichain-bsc' ? 'BNB' : selectedWallet === 'multichain-polygon' ? 'MATIC' : selectedWallet === 'multichain-sol' ? 'SOL' : selectedWallet === 'multichain-btc' ? 'BTC' : selectedWallet === 'multichain-tron' ? 'TRX' : 'TON'} available
                  </p>
                </div>
              </div>
              <ChevronDown size={15} className="text-gray-500" />
            </button>

            {/* WDK locked warning — compact */}
            {wdkLocked && (
              <div className="flex items-center justify-between gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg mt-1">
                <div className="flex items-center gap-2">
                  <Lock size={12} className="text-amber-400 shrink-0" />
                  <p className="text-[10px] font-heading font-bold text-amber-300">Wallet locked — unlock to send</p>
                </div>
                <button onClick={() => navigate('/wallet/multi-chain')} className="text-[9px] font-heading font-black text-amber-400 uppercase tracking-widest hover:text-amber-300 whitespace-nowrap">Unlock →</button>
              </div>
            )}

            {/* From address — only for multichain-ton */}
            {selectedWallet === 'multichain-ton' && multiChainAddresses && (
              <div className="flex items-center gap-2 px-3 py-2 bg-violet-500/10 border border-violet-500/20 rounded-lg mt-1">
                <p className="text-[9px] font-heading font-black uppercase tracking-widest text-violet-400 shrink-0">From</p>
                <p className="text-[10px] font-mono text-violet-300 truncate">{multiChainAddresses.tonAddress}</p>
              </div>
            )}
          </div>

          {/* ── Main Form Card ── */}

          <div className="luxury-card rounded-2xl overflow-hidden">
            {/* Recipient */}
            <div className="p-4 space-y-1.5 border-b border-white/5">
              <label className="text-[10px] font-heading font-black uppercase tracking-[0.18em] text-gray-500">{t('transfer.recipientAddress')}</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => { setRecipient(e.target.value); setRecipientInfo(null); }}
                onBlur={handleRecipientBlur}
                placeholder={
                  isRzcTransfer ? '@username or wallet address'
                    : (selectedWallet === 'multichain-eth' || selectedWallet === 'multichain-bsc' || selectedWallet === 'multichain-polygon' || selectedWallet === 'multichain-eth-usdt' || selectedWallet === 'multichain-bsc-usdt') ? '0x... (EVM address)'
                      : selectedWallet === 'multichain-btc' ? 'bc1... or 1... (Bitcoin address)'
                        : selectedWallet === 'multichain-sol' ? 'Solana address'
                          : (selectedWallet === 'multichain-tron' || selectedWallet === 'multichain-tron-usdt') ? 'T... (TRON address)'
                            : 'EQ... or UQ... (TON address)'
                }
                className="w-full bg-transparent text-white font-mono text-sm outline-none placeholder:text-gray-700 py-1"
              />
              {isValidatingRecipient && <p className="text-[9px] text-gray-500">Resolving recipient...</p>}
              {recipientInfo && !isValidatingRecipient && (
                recipientInfo.valid ? (
                  <p className="text-[9px] text-[#00FF88] font-heading font-bold flex items-center gap-1 uppercase tracking-widest">
                    <span>✓</span>
                    {isRzcTransfer ? (recipientInfo.name ? `@${recipientInfo.name}` : recipientInfo.walletAddress?.slice(0, 8) + '...') : 'Valid address'}
                  </p>
                ) : (
                  <p className="text-[9px] text-red-400 font-heading font-bold uppercase tracking-widest">✗ {recipientInfo.error}</p>
                )
              )}
            </div>

            {/* Amount */}
            <div className="p-4 space-y-1 border-b border-white/5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-heading font-black uppercase tracking-[0.18em] text-gray-500">{t('transfer.amount')}</label>
                <div className="flex gap-1.5">
                  <button onClick={handleMax} className="text-[9px] font-heading font-black text-[#00FF88] uppercase tracking-widest px-2 py-0.5 bg-[#00FF88]/10 rounded hover:bg-[#00FF88]/20 transition-colors">Max</button>
                  {!isRzcTransfer && !isJettonTransfer && (!locationState?.asset || locationState?.asset === 'TON') && (
                    <button onClick={handleSendAll} disabled={!recipient.trim() || recipient.length < 40 || isSendingAll} className="text-[9px] font-heading font-black text-orange-400 uppercase tracking-widest px-2 py-0.5 bg-orange-500/10 rounded hover:bg-orange-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">All</button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 py-1">
                <input
                  type="number"
                  step={isJettonTransfer && jettonData ? `0.${'0'.repeat(jettonData.decimals - 1)}1` : '0.0001'}
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 bg-transparent text-white font-mono font-bold text-2xl outline-none placeholder:text-gray-800"
                />
                <span className="font-heading font-black text-xs text-gray-400 uppercase tracking-widest shrink-0">
                  {isRzcTransfer ? 'RZC' : isJettonTransfer && jettonData ? jettonData.symbol : (isUsdtTransfer || selectedWallet === 'multichain-tron-usdt' || selectedWallet === 'multichain-eth-usdt' || selectedWallet === 'multichain-bsc-usdt') ? 'USDT' : selectedWallet === 'multichain-tron' ? 'TRX' : selectedWallet === 'multichain-eth' ? 'ETH' : selectedWallet === 'multichain-bsc' ? 'BNB' : selectedWallet === 'multichain-polygon' ? 'MATIC' : selectedWallet === 'multichain-sol' ? 'SOL' : selectedWallet === 'multichain-btc' ? 'BTC' : 'TON'}
                </span>
              </div>
            </div>

            {/* Memo */}
            <div className="p-4 space-y-1">
              <label className="text-[10px] font-heading font-black uppercase tracking-[0.18em] text-gray-500">{t('transfer.memo')} <span className="text-gray-700 normal-case tracking-normal">(optional)</span></label>
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Message..."
                className="w-full bg-transparent text-white font-mono text-sm outline-none placeholder:text-gray-700 py-1"
              />
            </div>
          </div>

          {/* ── Summary Row ── */}
          {amount && sendAmount > 0 && (
            <div className="luxury-card rounded-xl px-4 py-3 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-heading font-bold uppercase tracking-widest">Amount</span>
                <span className="text-white font-mono font-bold">
                  {isRzcTransfer ? sendAmount.toLocaleString() : sendAmount.toFixed(isJettonTransfer && jettonData ? Math.min(jettonData.decimals, 4) : (isUsdtTransfer || selectedWallet === 'multichain-tron-usdt' || selectedWallet === 'multichain-eth-usdt' || selectedWallet === 'multichain-bsc-usdt') ? 6 : 4)}{' '}
                  {isRzcTransfer ? 'RZC' : isJettonTransfer && jettonData ? jettonData.symbol : (isUsdtTransfer || selectedWallet === 'multichain-tron-usdt' || selectedWallet === 'multichain-eth-usdt' || selectedWallet === 'multichain-bsc-usdt') ? 'USDT' : selectedWallet === 'multichain-tron' ? 'TRX' : 'TON'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-heading font-bold uppercase tracking-widest">Network Fee</span>
                <span className={`font-mono font-bold ${isFetchingFee ? 'text-gray-400 animate-pulse' : 'text-[#00FF88]'}`}>
                  {isFetchingFee ? 'Estimating...' : isRzcTransfer ? 'Free' : feeEstimate ? feeEstimate : `~${estimatedFee.toFixed(4)} TON`}
                </span>
              </div>
              {!isJettonTransfer && !isRzcTransfer && selectedWallet === 'primary' && (
                <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2 mt-1">
                  <span className="text-gray-400 font-heading font-bold uppercase tracking-widest">Total</span>
                  <span className="text-white font-mono font-bold">{totalRequired.toFixed(4)} TON</span>
                </div>
              )}
            </div>
          )}

          {/* ── Warnings ── */}
          {isLargeTransaction && sendAmount > 0 && (
            <div className="flex items-start gap-3 px-4 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-heading font-black text-yellow-400 uppercase tracking-widest">Large Transaction</p>
                <p className="text-[10px] text-yellow-300/80 mt-0.5">Sending more than 50% of your balance. Verify the recipient carefully.</p>
              </div>
            </div>
          )}
          {isJettonTransfer && !hasEnoughTonForGas && (
            <div className="flex items-start gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-heading font-black text-red-400 uppercase tracking-widest">Insufficient TON for Gas</p>
                <p className="text-[10px] text-red-300/80 mt-0.5">Need {estimatedFee.toFixed(4)} TON for fees, you have {tonBalance.toFixed(4)} TON.</p>
              </div>
            </div>
          )}
          {selectedWallet === 'multichain-tron-usdt' && !hasEnoughTrxForGas && (
            <div className="flex items-start gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-heading font-black text-red-400 uppercase tracking-widest">Insufficient TRX for Gas</p>
                <p className="text-[10px] text-red-300/80 mt-0.5">Need ~{parsedTrxFee.toFixed(1)} TRX, you have {tronBalance.toFixed(1)} TRX.</p>
              </div>
            </div>
          )}
          {(selectedWallet === 'multichain-eth-usdt' || selectedWallet === 'multichain-bsc-usdt') && !hasEnoughEvmGasForToken && (
            <div className="flex items-start gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-heading font-black text-red-400 uppercase tracking-widest">
                  Insufficient {selectedWallet === 'multichain-eth-usdt' ? 'ETH' : 'BNB'} for Gas
                </p>
                <p className="text-[10px] text-red-300/80 mt-0.5">
                  Need ~{parsedEvmFee.toFixed(4)} {selectedWallet === 'multichain-eth-usdt' ? 'ETH' : 'BNB'}, you have {selectedWallet === 'multichain-eth-usdt' ? ethBalance.toFixed(4) : bscBalance.toFixed(4)}.
                </p>
              </div>
            </div>
          )}
          {amount && sendAmount > 0 && totalRequired > currentBalance && !isJettonTransfer && !isUsdtTransfer && (
            <div className="flex items-start gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-heading font-black text-red-400 uppercase tracking-widest">{t('errors.insufficientBalance')}</p>
                <p className="text-[10px] text-red-300/80 mt-0.5">Need {totalRequired.toFixed(4)} {selectedWallet === 'multichain-tron' ? 'TRX' : 'TON'} but have {currentBalance.toFixed(4)}.</p>
              </div>
            </div>
          )}

          {/* ── CTA ── */}
          <button
            disabled={!isValid}
            onClick={handleNext}
            className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 text-sm font-heading font-black uppercase tracking-widest transition-all ${isValid ? 'bg-[#00FF88] text-black shadow-lg hover:scale-[1.02] active:scale-[0.98]' : 'bg-white/5 text-gray-600 cursor-not-allowed'}`}
          >
            Review Transaction <Send size={16} />
          </button>
        </div>
      )}

      {/* ─── CONFIRM STEP ──────────────────────────────────────── */}
      {(!isRzcTransfer || canSendRzc) && step === 'confirm' && (
        <div className="space-y-4 animate-in zoom-in-95 duration-300">
          {/* Big Amount Display */}
          <div className="luxury-card rounded-2xl p-6 text-center space-y-1">
            <p className="text-[10px] font-heading font-black text-gray-500 uppercase tracking-[0.25em]">You are sending</p>
            <h2 className="text-4xl font-mono font-black text-[#00FF88]">
              {amount}
            </h2>
            <p className="text-sm font-heading font-black text-white uppercase tracking-widest">
              {isRzcTransfer ? 'RZC' : isJettonTransfer && jettonData ? jettonData.symbol : (isUsdtTransfer || selectedWallet === 'multichain-tron-usdt' || selectedWallet === 'multichain-eth-usdt' || selectedWallet === 'multichain-bsc-usdt') ? 'USDT' : selectedWallet === 'multichain-tron' ? 'TRX' : 'TON'}
            </p>
          </div>

          {/* Details */}
          <div className="luxury-card rounded-2xl divide-y divide-white/5">
            <div className="flex justify-between items-center px-4 py-3 text-xs">
              <span className="text-gray-500 font-heading font-bold uppercase tracking-widest">{t('wallet.recipient')}</span>
              <span className="text-white font-mono truncate max-w-[180px]">{recipient}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-3 text-xs">
              <span className="text-gray-500 font-heading font-bold uppercase tracking-widest">{t('wallet.amount')}</span>
              <span className="text-white font-mono font-bold">
                {isRzcTransfer ? sendAmount.toLocaleString() : sendAmount.toFixed(isJettonTransfer && jettonData ? Math.min(jettonData.decimals, 4) : (isUsdtTransfer || selectedWallet === 'multichain-tron-usdt' || selectedWallet === 'multichain-eth-usdt' || selectedWallet === 'multichain-bsc-usdt') ? 6 : 4)}{' '}
                {isRzcTransfer ? 'RZC' : isJettonTransfer && jettonData ? jettonData.symbol : (isUsdtTransfer || selectedWallet === 'multichain-tron-usdt' || selectedWallet === 'multichain-eth-usdt' || selectedWallet === 'multichain-bsc-usdt') ? 'USDT' : selectedWallet === 'multichain-tron' ? 'TRX' : 'TON'}
              </span>
            </div>
            <div className="flex justify-between items-center px-4 py-3 text-xs">
              <span className="text-gray-500 font-heading font-bold uppercase tracking-widest">Network Fee</span>
              <span className={`font-mono font-bold ${isFetchingFee ? 'text-gray-400 animate-pulse' : 'text-[#00FF88]'}`}>
                {isFetchingFee ? 'Estimating...' : isRzcTransfer ? 'Free' : feeEstimate ? feeEstimate : `~${estimatedFee.toFixed(4)} TON`}
              </span>
            </div>
            {!isJettonTransfer && selectedWallet === 'primary' && !isRzcTransfer && (
              <div className="flex justify-between items-center px-4 py-3 text-xs">
                <span className="text-gray-400 font-heading font-bold uppercase tracking-widest">{t('wallet.total')}</span>
                <span className="text-white font-mono font-bold">{totalRequired.toFixed(4)} TON</span>
              </div>
            )}
            {comment && (
              <div className="flex justify-between items-center px-4 py-3 text-xs">
                <span className="text-gray-500 font-heading font-bold uppercase tracking-widest">{t('wallet.memo')}</span>
                <span className="text-white font-mono italic truncate max-w-[180px]">"{comment}"</span>
              </div>
            )}
          </div>

          {/* Warning */}
          <div className="flex items-center gap-2.5 px-4 py-3 bg-white/5 rounded-xl">
            <Info size={14} className="text-blue-400 shrink-0" />
            <p className="text-[10px] text-gray-500">Verify the address carefully. Blockchain transactions are irreversible.</p>
          </div>

          {/* Actions */}
          <button
            onClick={handleConfirm}
            className="w-full py-4 bg-[#00FF88] text-black rounded-xl font-heading font-black text-sm uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Confirm & Send
          </button>
          <button
            onClick={() => setStep('form')}
            className="w-full py-3 text-gray-500 font-heading font-black text-[10px] uppercase tracking-widest hover:text-white transition-colors active:scale-95"
          >
            ← Edit Transaction
          </button>
        </div>
      )}

      {/* ─── STATUS STEP ───────────────────────────────────────── */}
      {(!isRzcTransfer || canSendRzc) && step === 'status' && (
        <div className="flex flex-col items-center justify-center py-16 space-y-7 animate-in fade-in duration-500">
          {!status ? (
            <>
              <div className="w-16 h-16 bg-[#00FF88]/10 rounded-full flex items-center justify-center relative">
                <div className="absolute inset-0 border-[3px] border-[#00FF88] border-t-transparent rounded-full animate-spin" />
                <Zap size={24} className="text-[#00FF88]" />
              </div>
              <div className="text-center space-y-1.5">
                <h2 className="text-xl font-heading font-black text-white uppercase tracking-widest">Broadcasting</h2>
                <p className="text-xs text-gray-500 font-heading font-bold uppercase tracking-widest">Waiting for network confirmation...</p>
              </div>
            </>
          ) : status === 'success' ? (
            <>
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400">
                <CheckCircle2 size={48} />
              </div>
              <div className="text-center space-y-2 max-w-xs">
                <h2 className="text-2xl font-heading font-black text-[#00FF88] uppercase tracking-widest">Sent!</h2>
                <p className="text-xs text-gray-400 font-heading font-bold uppercase tracking-widest leading-relaxed">Transaction confirmed. The recipient will see the balance shortly.</p>
              </div>
              {txHash && (
                <div className="w-full luxury-card rounded-xl px-4 py-3 space-y-2">
                  <p className="text-[9px] font-heading font-black text-gray-500 uppercase tracking-widest">Transaction ID</p>
                  <p className="text-xs font-mono text-[#00FF88] break-all">{txHash}</p>
                  {(() => {
                    let txLinkUrl = '';
                    let linkName = 'Explorer';
                    if (!isRzcTransfer) {
                      try { txLinkUrl = getTransactionUrl(txHash, network); linkName = 'TonViewer'; } catch (e) { }
                    }
                    if (!txLinkUrl) return null;
                    return (
                      <a href={txLinkUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1 text-xs text-violet-400 hover:text-violet-300 font-bold">
                        View on {linkName}
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
                      </a>
                    );
                  })()}
                </div>
              )}
              <button onClick={() => navigate('/wallet/dashboard')} className="px-10 py-3.5 bg-white text-black rounded-xl font-heading font-black text-xs uppercase tracking-widest hover:bg-[#00FF88] transition-all">
                Back to Dashboard
              </button>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-400">
                <XCircle size={48} />
              </div>
              <div className="text-center space-y-2 max-w-xs">
                <h2 className="text-xl font-heading font-black text-rose-400 uppercase tracking-widest">{t('transfer.failed')}</h2>
                <p className="text-xs text-gray-500">{errorMessage || 'Network congestion or insufficient gas fees.'}</p>
              </div>
              <button
                onClick={() => setStep('form')}
                className="px-8 py-3.5 bg-white/10 text-white rounded-xl font-heading font-black text-xs uppercase tracking-widest hover:bg-white/20 transition-all"
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
