import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { useBalance } from '../hooks/useBalance';
import { useToast } from '../context/ToastContext';
import { usePurchaseModal } from '../context/PurchaseModalContext';
import { Wallet as WalletIcon, AlertCircle, Check, Percent, Users, X, ShieldCheck, Zap, ArrowRight, Activity, Gift, QrCode, Copy, ExternalLink, RefreshCw, Clock } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { notificationService } from '../services/notificationService';
import { supabaseService } from '../services/supabaseService';
import { getNetworkConfig } from '../constants';
import { getPaymentAddress, getSecondaryPaymentAddress } from '../config/paymentConfig';

const GlobalPurchaseModal: React.FC = () => {
  const { isPurchaseModalOpen, closePurchaseModal, selectedPackage: pkg, onSuccessCallback } = usePurchaseModal();
  const { address, network } = useWallet();
  const { tonBalance, tonPrice } = useBalance();
  const { success } = useToast();
  
  const [paymentMethod, setPaymentMethod] = useState<'ton' | 'rzc' | 'hybrid'>('ton');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sponsorWallet, setSponsorWallet] = useState<string | null>(null);
  const navigate = useNavigate();

  // Manual payment mode state
  const [checkoutMode, setCheckoutMode] = useState<'auto' | 'manual'>('auto');
  const [copied, setCopied] = useState(false);
  const [pollStatus, setPollStatus] = useState<'idle' | 'polling' | 'found' | 'error'>('idle');
  const [pollSecondsLeft, setPollSecondsLeft] = useState(0);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pick one address randomly when modal opens — stays fixed for the session
  const assignedPaymentAddr = useRef<string>('');
  useEffect(() => {
    if (isPurchaseModalOpen && !assignedPaymentAddr.current) {
      const net = network as 'mainnet' | 'testnet';
      const primary = getPaymentAddress(net);
      const secondary = getSecondaryPaymentAddress(net);
      const pool = secondary ? [primary, secondary] : [primary];
      assignedPaymentAddr.current = pool[Math.floor(Math.random() * pool.length)];
    }
    if (!isPurchaseModalOpen) {
      assignedPaymentAddr.current = '';
    }
  }, [isPurchaseModalOpen, network]);

  useEffect(() => {
    const fetchSponsor = async () => {
      if (!address || !isPurchaseModalOpen) return;
      try {
        const profileResult = await supabaseService.getProfile(address);
        if (profileResult.success && profileResult.data?.referrer_code) {
          const referrerData = await supabaseService.getUserByReferralCode(profileResult.data.referrer_code);
          if (referrerData.success && referrerData.data?.user_id) {
            const referrerProfile = await supabaseService.getProfileById(referrerData.data.user_id);
            if (referrerProfile.success && referrerProfile.data?.wallet_address) {
              setSponsorWallet(referrerProfile.data.wallet_address);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch sponsor", err);
      }
    };
    fetchSponsor();
  }, [address, isPurchaseModalOpen]);

  // Stop polling when modal closes
  useEffect(() => {
    if (!isPurchaseModalOpen) {
      stopPolling();
      setCheckoutMode('auto');
      setPollStatus('idle');
    }
  }, [isPurchaseModalOpen]);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
    if (pollTimeoutRef.current)  { clearTimeout(pollTimeoutRef.current);  pollTimeoutRef.current = null; }
  }, []);

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  // Poll TonCenter for an incoming transaction to the payment address
  const startPolling = useCallback(async (expectedAmountTON: number) => {
    if (!address) return;
    stopPolling();
    setPollStatus('polling');

    const POLL_INTERVAL_MS = 5000;
    const POLL_TIMEOUT_MS  = 10 * 60 * 1000;
    const startTime = Date.now();
    const net = network as 'mainnet' | 'testnet';
    // Watch all addresses so payment to either one is detected
    const primary = getPaymentAddress(net);
    const secondary = getSecondaryPaymentAddress(net);
    const addressesToWatch = secondary ? [primary, secondary] : [primary];

    const checkAddress = async (addr: string, cutoff: number) => {
      const config = getNetworkConfig(net);
      const v3Base = network === 'mainnet'
        ? 'https://toncenter.com/api/v3'
        : 'https://testnet.toncenter.com/api/v3';
      const res = await fetch(
        `${v3Base}/transactions?account=${addr}&limit=10&sort=desc`,
        { headers: { 'x-api-key': config.API_KEY } }
      );
      if (!res.ok) return null;
      const data = await res.json();
      const txs: any[] = data.transactions || [];
      return txs.find(tx => {
        const inMsg = tx.in_msg;
        if (!inMsg) return false;
        const valueTON = Number(inMsg.value || 0) / 1e9;
        const txTime   = (tx.now || 0) * 1000;
        return valueTON >= expectedAmountTON * 0.98 && txTime > cutoff;
      }) || null;
    };

    const tick = async () => {
      try {
        const cutoff = Date.now() - 15 * 60 * 1000;
        for (const addr of addressesToWatch) {
          const match = await checkAddress(addr, cutoff);
          if (match) {
            stopPolling();
            setPollStatus('found');
            const txHash = match.hash || match.transaction_id?.hash || `manual_${Date.now()}`;
            await handlePostPayment(txHash);
            return;
          }
        }
        const elapsed = Date.now() - startTime;
        setPollSecondsLeft(Math.ceil(Math.max(0, POLL_TIMEOUT_MS - elapsed) / 1000));
        if (elapsed >= POLL_TIMEOUT_MS) {
          stopPolling();
          setPollStatus('error');
          setError('Payment not detected within 10 minutes. If you sent the payment, contact support with your tx hash.');
        }
      } catch (e) {
        console.warn('Poll tick error:', e);
      }
    };

    await tick();
    pollIntervalRef.current = setInterval(tick, POLL_INTERVAL_MS);
    pollTimeoutRef.current  = setTimeout(() => { stopPolling(); setPollStatus('error'); }, POLL_TIMEOUT_MS);
  }, [address, network, stopPolling]);

  if (!isPurchaseModalOpen || !pkg) return null;

  const totalCost = pkg.pricePoint + pkg.activationFee;

  let totalCostTON: number;
  const isValidTonPrice = tonPrice !== undefined && tonPrice > 0 && isFinite(tonPrice) && !isNaN(tonPrice);

  if (pkg.id === 'test-001') {
    totalCostTON = pkg.activationFee > 0 ? pkg.activationFee : 0.2;
  } else if (pkg.id === 'activation-only') {
    if (isValidTonPrice) {
      totalCostTON = pkg.activationFee / tonPrice;
    } else {
      totalCostTON = pkg.activationFee / 2.45;
    }
  } else {
    if (isValidTonPrice) {
      totalCostTON = totalCost / tonPrice;
    } else {
      totalCostTON = totalCost / 2.45;
    }
  }

  if (isNaN(totalCostTON) || !isFinite(totalCostTON) || totalCostTON <= 0) {
    if (pkg.id === 'test-001') {
      totalCostTON = 0.2;
    } else if (pkg.id === 'activation-only') {
      totalCostTON = pkg.activationFee / 2.45; 
    } else {
      totalCostTON = totalCost / 2.45;
    }
  }

  const hasEnoughBalance = tonBalance >= totalCostTON;

  // Shared post-payment handler — called by both auto and manual flows
  const handlePostPayment = async (txHash: string) => {
    if (!address) return;
    let validTonPrice = tonPrice;
    if (!isValidTonPrice) validTonPrice = 2.45;

    await notificationService.logActivity(
      address, 'transaction_sent',
      `Purchased ${pkg.tierName} - ${totalCostTON.toFixed(4)} TON`,
      { package_id: pkg.id, package_name: pkg.tierName, amount_ton: totalCostTON,
        amount_usd: pkg.pricePoint > 0 ? totalCost : pkg.activationFee * validTonPrice,
        rzc_reward: pkg.rzcReward, transaction_hash: txHash, network }
    );

    await notificationService.createNotification(
      address, 'transaction_confirmed', 'Payment Successful',
      `Your payment of ${totalCostTON.toFixed(4)} TON for ${pkg.tierName} was successful.`,
      { priority: 'high', data: { txHash, package: pkg.tierName } }
    );

    let activationAddress = address;
    try {
      const { Address } = await import('@ton/ton');
      activationAddress = Address.parse(address).toString({ bounceable: false, testOnly: network === 'testnet' });
    } catch { /* use as-is */ }

    const activated = await supabaseService.activateWallet(activationAddress, {
      activation_fee_usd: pkg.pricePoint > 0 ? totalCost : pkg.activationFee * validTonPrice,
      activation_fee_ton: totalCostTON,
      ton_price: validTonPrice,
      transaction_hash: txHash
    });

    if (!activated) throw new Error('Failed to activate wallet');

    await notificationService.logActivity(
      address, 'wallet_created', 'Wallet activated successfully',
      { activation_fee_usd: pkg.pricePoint > 0 ? totalCost : pkg.activationFee * validTonPrice,
        activation_fee_ton: totalCostTON, package_purchased: pkg.tierName, transaction_hash: txHash }
    );

    try {
      const profileResult = await supabaseService.getProfile(address);
      if (profileResult.success && profileResult.data) {
        const userId = profileResult.data.id;
        const rewardResult = await supabaseService.awardRZCTokens(
          userId, pkg.rzcReward,
          pkg.id === 'activation-only' ? 'activation_bonus' : 'package_purchase',
          `${pkg.tierName} purchase reward`,
          { package_id: pkg.id, package_name: pkg.tierName, transaction_hash: txHash,
            package_price_usd: pkg.pricePoint, activation_fee_usd: pkg.activationFee, total_cost_ton: totalCostTON }
        );

        if (rewardResult.success) {
          await notificationService.logActivity(
            address, 'reward_claimed',
            `Received ${pkg.rzcReward.toLocaleString()} RZC from ${pkg.tierName}`,
            { amount: pkg.rzcReward, type: pkg.id === 'activation-only' ? 'activation_bonus' : 'package_purchase',
              package_name: pkg.tierName, new_balance: rewardResult.newBalance }
          );
          await notificationService.createNotification(
            address, 'reward_claimed', 'RZC Tokens Awarded',
            `You received ${pkg.rzcReward.toLocaleString()} RZC tokens for purchasing ${pkg.tierName}!`,
            { priority: 'normal', data: { amount: pkg.rzcReward, package: pkg.tierName } }
          );

          const commissionPrice = pkg.pricePoint > 0 ? pkg.pricePoint : pkg.activationFee;
          if (commissionPrice > 0) {
            try {
              const client = supabaseService.getClient();
              if (client) {
                const commissionResult = await client.rpc('award_package_purchase_commission', {
                  p_buyer_user_id: userId, p_package_price_usd: commissionPrice,
                  p_package_name: pkg.tierName, p_transaction_hash: txHash
                });
                if (commissionResult.data?.length > 0 && commissionResult.data[0].success) {
                  const commission = commissionResult.data[0];
                  try {
                    const referrerProfile = await supabaseService.getProfileById(commission.referrer_id);
                    if (referrerProfile.success && referrerProfile.data) {
                      await notificationService.createNotification(
                        referrerProfile.data.wallet_address, 'referral_earned',
                        '💰 Referral Commission Earned!',
                        `Your referral purchased ${pkg.tierName} ($${commissionPrice}). You earned ${Math.round(commission.commission_amount).toLocaleString()} RZC ($${(commissionPrice * 0.10).toFixed(2)}) — 10% commission.`,
                        { priority: 'high', data: { commission_rzc: Math.round(commission.commission_amount), type: 'referral_commission' } }
                      );
                    }
                  } catch (e) {}
                }

                const tonCommissionResult = await client.rpc('record_ton_commission', {
                  p_buyer_user_id: userId, p_ton_amount: totalCostTON,
                  p_package_name: pkg.tierName, p_transaction_hash: txHash
                });
                if (!tonCommissionResult.error && tonCommissionResult.data?.length > 0) {
                  const tc = tonCommissionResult.data[0];
                  if (tc.success) {
                    const referrerProfile = await supabaseService.getProfileById(tc.referrer_id);
                    if (referrerProfile.success && referrerProfile.data) {
                      await notificationService.createNotification(
                        referrerProfile.data.wallet_address, 'referral_earned',
                        '💎 TON Commission Pending!',
                        `Your referral activated ${pkg.tierName}. You earned ${tc.commission_ton} TON (10%).`,
                        { priority: 'high' }
                      );
                    }
                  }
                }
              }
            } catch (e) {}
          }
        }
      }
    } catch (e) {}

    const successMessage = pkg.pricePoint > 0
      ? `🎉 Success! You've purchased ${pkg.tierName} and received ${pkg.rzcReward.toLocaleString()} RZC tokens!`
      : `🎉 Success! Your wallet has been activated and received ${pkg.rzcReward} RZC welcome bonus!`;
    success(successMessage);
    if (onSuccessCallback) onSuccessCallback(pkg.id);
    closePurchaseModal();
    window.location.reload();
  };

  const handlePurchase = async () => {
    if (!address) { setError('Wallet not connected'); return; }
    if (!hasEnoughBalance) {
      setError(`Insufficient balance. You need ${totalCostTON.toFixed(4)} TON but only have ${tonBalance.toFixed(4)} TON.`);
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      if (isNaN(totalCostTON) || !isFinite(totalCostTON) || totalCostTON <= 0)
        throw new Error('Invalid payment amount calculated. Please refresh and try again.');

      let validTonPrice = tonPrice;
      if (!isValidTonPrice) {
        validTonPrice = 2.45;
        if (pkg.id === 'test-001') totalCostTON = pkg.activationFee > 0 ? pkg.activationFee : 0.2;
        else if (pkg.id === 'activation-only') totalCostTON = pkg.activationFee / validTonPrice;
        else totalCostTON = totalCost / validTonPrice;
      }
      totalCostTON = parseFloat(totalCostTON.toFixed(4));

      const { getPaymentAddress, validatePaymentConfig } = await import('../config/paymentConfig');
      const { tonWalletService } = await import('../services/tonWalletService');

      if (!validatePaymentConfig(network)) throw new Error(`Payment wallet address not configured for ${network}. Please contact support.`);

      const paymentAddress = getPaymentAddress(network);
      let referrerWalletAddress: string | null = sponsorWallet;
      let tonCommissionAmount = 0;
      let platformAmountTON = totalCostTON;

      if (referrerWalletAddress) {
        tonCommissionAmount = parseFloat((totalCostTON * 0.10).toFixed(6));
        platformAmountTON   = parseFloat((totalCostTON - tonCommissionAmount).toFixed(6));
      }

      // ── Auto-restore primary wallet session before payment decision ──────────
      // If the user has a device-encrypted session (no password needed) and the
      // primary wallet service is not yet initialized, restore it now so we use
      // the stable tonWalletService (V2 jsonRPC) instead of falling to WDK.
      if (!tonWalletService.isInitialized() && tonWalletService.hasStoredSession()) {
        try {
          const mnemonic = await tonWalletService.getStoredSession(''); // '' = device-encrypted session
          if (mnemonic && mnemonic.length > 0) {
            await tonWalletService.initializeWallet(mnemonic);
            console.log('[Purchase] Primary wallet session auto-restored for payment');
          }
        } catch (sessionErr) {
          // Session may be password-protected — that's fine, we'll fall to WDK below
          console.warn('[Purchase] Could not auto-restore session (may need password):', sessionErr);
        }
      }

      let paymentResult: { success: boolean; txHash?: string; error?: string };
      const { tetherWdkService } = await import('../services/tetherWdkService');
      const useWdk = !tonWalletService.isInitialized() && tetherWdkService.isInitialized();
      console.log(`[Purchase] Payment path: ${useWdk ? 'WDK multi-chain wallet' : 'Primary TON wallet (tonWalletService)'}`);

      if (referrerWalletAddress && tonCommissionAmount > 0) {
        const msgs = [
          { address: paymentAddress,        amount: platformAmountTON.toFixed(4),   comment: `RhizaCore ${pkg.tierName} Purchase` },
          { address: referrerWalletAddress, amount: tonCommissionAmount.toFixed(6),  comment: `RhizaCore 10% Referral Commission` },
        ];
        paymentResult = useWdk
          ? await tetherWdkService.sendTonMultiTransaction(msgs)
          : await tonWalletService.sendMultiTransaction(msgs);
      } else {
        paymentResult = useWdk
          ? await tetherWdkService.sendTonTransaction(paymentAddress, totalCostTON.toFixed(4), `RhizaCore ${pkg.tierName} Purchase`)
          : await tonWalletService.sendTransaction(paymentAddress, totalCostTON.toFixed(4), `RhizaCore ${pkg.tierName} Purchase`);
      }

      if (!paymentResult.success || !paymentResult.txHash)
        throw new Error(paymentResult.error || 'Payment failed');

      await handlePostPayment(paymentResult.txHash);
    } catch (err: any) {
      setError(err.message || 'Purchase failed. Please try again.');
      try {
        await notificationService.logActivity(address, 'transaction_sent', `Failed to purchase ${pkg.tierName}`,
          { amount_ton: totalCostTON, error: err.message, network });
      } catch (e) {}
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex flex-col bg-white dark:bg-[#050505] text-gray-900 dark:text-white overflow-hidden text-left" aria-modal="true">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] w-[70vw] h-[70vw] max-w-2xl max-h-2xl rounded-full bg-emerald-500/10 blur-[100px] opacity-70"></div>
        <div className="absolute -bottom-[20%] -left-[10%] w-[70vw] h-[70vw] max-w-2xl max-h-2xl rounded-full bg-blue-500/10 blur-[100px] opacity-70"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-[0.03]"></div>
      </div>

      {/* Header */}
      <header className="relative flex-none flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-white/5 bg-white/80 dark:bg-black/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <Activity size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-gray-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:to-gray-400">
              {pkg.pricePoint > 0 ? `Acquire ${pkg.tierName}` : 'Initialize Wallet'}
            </h1>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">
              Secure Checkout
            </p>
          </div>
        </div>
        <button
          onClick={closePurchaseModal}
          className="p-2 sm:p-3 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
        >
          <X size={20} />
        </button>
      </header>

      {/* Main Content Area */}
      <div className="relative flex-1 overflow-y-auto w-full no-scrollbar">
        <div className="max-w-2xl mx-auto w-full p-4 sm:p-6">
          
          {/* Compact Package Header */}
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
              <Zap size={12} /> {pkg.tierName}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white mb-2">
              {pkg.pricePoint > 0 ? 'Package Purchase' : 'Wallet Activation'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {pkg.rzcReward.toLocaleString()} RZC tokens + {pkg.pricePoint > 0 ? `${pkg.teamSalesBonus}% team bonus` : 'full ecosystem access'}
            </p>
          </div>
             <h3 className="text-2xl font-black mb-6 border-b border-gray-200 dark:border-white/10 pb-4 text-gray-900 dark:text-white">Payment Summary</h3>

             {/* Mode toggle */}
             <div className="flex gap-1 p-1 rounded-xl bg-gray-200 dark:bg-white/5 border border-gray-300 dark:border-white/10 mb-6">
               <button
                 onClick={() => { setCheckoutMode('auto'); stopPolling(); setPollStatus('idle'); setError(null); }}
                 className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${checkoutMode === 'auto' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
               >
                 <Zap size={13} /> Auto Pay
               </button>
               <button
                 onClick={() => { setCheckoutMode('manual'); setError(null); }}
                 className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${checkoutMode === 'manual' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
               >
                 <QrCode size={13} /> Manual / QR
               </button>
             </div>

             <div className="space-y-5">

               {/* Error */}
               {error && (
                 <div className="p-4 bg-red-500/10 border-l-4 border-red-500 rounded-r-xl">
                   <div className="flex items-start gap-3">
                     <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
                     <div>
                       <p className="text-xs font-bold text-red-600 dark:text-red-500 mb-0.5">Transaction Error</p>
                       <p className="text-xs text-red-500 dark:text-red-400/80">{error}</p>
                     </div>
                   </div>
                 </div>
               )}

               {/* Oracle warning */}
               {(!tonPrice || tonPrice <= 0 || !isFinite(tonPrice) || isNaN(tonPrice)) && (
                 <div className="p-3 bg-amber-500/10 border-l-4 border-amber-500 rounded-r-xl">
                   <div className="flex items-start gap-2">
                     <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                     <p className="text-xs text-amber-600 dark:text-amber-400/80">Using fallback TON price of $2.45. Calculations may be approximate.</p>
                   </div>
                 </div>
               )}

               {/* Payment breakdown */}
               <div className="bg-gray-100 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-2xl p-5">
                 <div className="space-y-3 mb-4">
                   {pkg.pricePoint > 0 && (
                     <div className="flex justify-between items-center text-sm">
                       <span className="text-gray-500 dark:text-gray-400">Package Price</span>
                       <span className="font-bold text-gray-900 dark:text-white">${pkg.pricePoint.toFixed(2)}</span>
                     </div>
                   )}
                   <div className="flex justify-between items-center text-sm">
                     <span className="text-gray-500 dark:text-gray-400">Activation Fee</span>
                     <span className="font-bold text-gray-900 dark:text-white">${pkg.activationFee.toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                     <span className="text-gray-500 dark:text-gray-400">Network Fee (Est.)</span>
                     <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300">~0.005 TON</span>
                   </div>
                 </div>
                 <div className="pt-4 border-t border-gray-200 dark:border-white/10 mb-4">
                   <div className="flex justify-between items-end mb-1">
                     <span className="text-sm text-gray-500 dark:text-gray-400">Total (USD)</span>
                     <span className="text-3xl font-black text-gray-900 dark:text-white">${totalCost.toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="text-xs text-gray-400 dark:text-gray-500">Total in TON</span>
                     <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{totalCostTON.toFixed(4)} TON</span>
                   </div>
                 </div>

                 {/* Payment destination */}
                 <div className="pt-4 border-t border-gray-200 dark:border-white/10 mb-4">
                   <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Send Payment To</p>
                   <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-200/60 dark:bg-black/30 border border-gray-300 dark:border-white/10">
                     <p className="flex-1 font-mono text-xs text-gray-700 dark:text-gray-300 break-all leading-relaxed">
                       {assignedPaymentAddr.current || getPaymentAddress(network as 'mainnet' | 'testnet')}
                     </p>
                     <button
                       onClick={() => handleCopy(assignedPaymentAddr.current || getPaymentAddress(network as 'mainnet' | 'testnet'))}
                       className="shrink-0 p-1.5 rounded-lg bg-gray-300 dark:bg-white/10 hover:bg-gray-400 dark:hover:bg-white/20 transition-colors"
                     >
                       {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className="text-gray-500 dark:text-gray-400" />}
                     </button>
                   </div>
                 </div>

                 {/* Sponsor info */}
                 {sponsorWallet && (
                   <div className="pt-4 border-t border-gray-200 dark:border-white/10">
                     <div className="flex items-start gap-2 mb-2">
                       <Users size={12} className="text-indigo-500 dark:text-indigo-400 mt-0.5 shrink-0" />
                       <div className="flex-1 min-w-0">
                         <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">Your Sponsor</p>
                         <p className="font-mono text-xs text-gray-700 dark:text-gray-300 break-all leading-relaxed">{sponsorWallet}</p>
                       </div>
                     </div>
                     <p className="text-[9px] text-gray-500 dark:text-gray-500 leading-relaxed">
                       Your sponsor receives 10% commission ({(totalCostTON * 0.10).toFixed(4)} TON) automatically via smart contract
                     </p>
                   </div>
                 )}
               </div>

               {/* ── AUTO MODE ─────────────────────────────────────────────── */}
               {checkoutMode === 'auto' && (
                 <>
                   {/* Wallet balance */}
                   <div className={`p-4 rounded-2xl border ${hasEnoughBalance ? 'bg-blue-500/5 border-blue-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                     <div className="flex justify-between items-center mb-2">
                       <div className="flex items-center gap-2">
                         <WalletIcon size={14} className={hasEnoughBalance ? 'text-blue-500' : 'text-red-500'} />
                         <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">Your Wallet</span>
                       </div>
                       {!hasEnoughBalance && (
                         <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest">Insufficient</span>
                       )}
                     </div>
                     <span className="text-xl font-black text-gray-900 dark:text-white">{tonBalance.toFixed(4)} <span className="text-sm text-gray-500 font-semibold">TON</span></span>
                   </div>

                   {hasEnoughBalance ? (
                     <button onClick={handlePurchase} disabled={processing}
                       className="w-full relative group overflow-hidden rounded-2xl p-[2px] disabled:opacity-50 disabled:cursor-not-allowed">
                       <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 bg-[length:200%_auto] animate-[gradient_2s_linear_infinite]"></span>
                       <div className="relative bg-white/90 dark:bg-black/80 group-hover:bg-transparent transition-colors px-6 py-4 rounded-[14px] flex items-center justify-center gap-2">
                         {processing
                           ? <><div className="w-4 h-4 border-2 border-gray-400 dark:border-white/30 border-t-gray-900 dark:border-t-white rounded-full animate-spin" /><span className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Broadcasting…</span></>
                           : <><span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Confirm Payment</span><ArrowRight size={16} className="text-gray-900 dark:text-white group-hover:translate-x-1 transition-transform" /></>
                         }
                       </div>
                     </button>
                   ) : (
                     <button onClick={() => { closePurchaseModal(); navigate('/wallet/receive'); }}
                       className="w-full px-6 py-4 rounded-2xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95">
                       <Zap size={16} className="text-amber-500" /> Deposit TON To Continue
                     </button>
                   )}
                 </>
               )}

               {/* ── MANUAL / QR MODE ──────────────────────────────────────── */}
               {checkoutMode === 'manual' && (() => {
                 const paymentAddr = assignedPaymentAddr.current || getPaymentAddress(network as 'mainnet' | 'testnet');
                 const tonLink = `ton://transfer/${paymentAddr}?amount=${Math.round(totalCostTON * 1e9)}&text=${encodeURIComponent(`RhizaCore ${pkg.tierName} Purchase`)}`;

                 return (
                   <div className="space-y-4">
                     {/* QR code */}
                     <div className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10">
                       <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Scan with any TON wallet</p>
                       <div className="p-3 bg-white rounded-xl shadow-sm">
                         <QRCodeSVG value={tonLink} size={160} bgColor="#ffffff" fgColor="#000000" level="M" />
                       </div>
                       <a href={tonLink} target="_blank" rel="noopener noreferrer"
                         className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline">
                         <ExternalLink size={12} /> Open in wallet app
                       </a>
                     </div>

                     {/* Address copy */}
                     <div className="rounded-2xl bg-gray-100 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 overflow-hidden">
                       <div className="px-4 pt-3 pb-2">
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Send exactly</p>
                         <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{totalCostTON.toFixed(4)} TON</p>
                       </div>
                       <div className="px-4 pb-3">
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">To this address</p>
                         <div className="flex items-center gap-2">
                           <p className="flex-1 font-mono text-xs text-gray-700 dark:text-gray-300 break-all leading-relaxed">
                             {paymentAddr}
                           </p>
                           <button onClick={() => handleCopy(paymentAddr)}
                             className="shrink-0 p-2 rounded-lg bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 transition-colors">
                             {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-gray-500 dark:text-gray-400" />}
                           </button>
                         </div>
                       </div>
                     </div>

                     {/* Polling status */}
                     {pollStatus === 'idle' && (
                       <button
                         onClick={() => startPolling(totalCostTON)}
                         className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-colors active:scale-95">
                         <RefreshCw size={15} /> I've Sent the Payment
                       </button>
                     )}

                     {pollStatus === 'polling' && (
                       <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-3">
                         <RefreshCw size={16} className="text-blue-400 animate-spin shrink-0" />
                         <div className="flex-1 min-w-0">
                           <p className="text-sm font-bold text-blue-300">Watching for your payment…</p>
                           <p className="text-xs text-blue-400/70">Checking every 5s · {Math.floor(pollSecondsLeft / 60)}:{String(pollSecondsLeft % 60).padStart(2, '0')} remaining</p>
                         </div>
                         <button onClick={() => { stopPolling(); setPollStatus('idle'); }} className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase">Cancel</button>
                       </div>
                     )}

                     {pollStatus === 'found' && (
                       <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                         <Check size={16} className="text-emerald-400 shrink-0" />
                         <p className="text-sm font-bold text-emerald-300">Payment detected! Activating wallet…</p>
                       </div>
                     )}

                     {pollStatus === 'error' && (
                       <button onClick={() => { setPollStatus('idle'); setError(null); }}
                         className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-gray-400 text-xs font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-colors">
                         <RefreshCw size={13} /> Try detecting again
                       </button>
                     )}

                     <p className="text-center text-[10px] text-gray-400 dark:text-gray-600">
                       Include the exact amount. Payments are detected automatically within ~30 seconds.
                     </p>
                   </div>
                 );
               })()}

               <p className="text-center text-[10px] text-gray-400 dark:text-gray-500">
                 By confirming, you agree to the smart contract execution. All actions are final and immutable.
               </p>
             </div>
          
        </div>
      </div>
    </div>
  );
};

export default GlobalPurchaseModal;
