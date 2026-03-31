import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { useBalance } from '../hooks/useBalance';
import { useToast } from '../context/ToastContext';
import { usePurchaseModal } from '../context/PurchaseModalContext';
import { Wallet as WalletIcon, AlertCircle, Check, Percent, Users, X, ShieldCheck, Zap, ArrowRight, Activity, Gift } from 'lucide-react';
import { notificationService } from '../services/notificationService';
import { supabaseService } from '../services/supabaseService';

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

  const handlePurchase = async () => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }

    if (!hasEnoughBalance) {
      setError(`Insufficient balance. You need ${totalCostTON.toFixed(4)} TON but only have ${tonBalance.toFixed(4)} TON.`);
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      if (isNaN(totalCostTON) || !isFinite(totalCostTON) || totalCostTON <= 0) {
        throw new Error(`Invalid payment amount calculated. Please refresh and try again.`);
      }

      let validTonPrice = tonPrice;
      if (!isValidTonPrice) {
        validTonPrice = 2.45;
        if (pkg.id === 'test-001') {
          totalCostTON = pkg.activationFee > 0 ? pkg.activationFee : 0.2;
        } else if (pkg.id === 'activation-only') {
          totalCostTON = pkg.activationFee / validTonPrice;
        } else {
          totalCostTON = totalCost / validTonPrice;
        }
      }

      totalCostTON = parseFloat(totalCostTON.toFixed(4));

      const { getPaymentAddress, validatePaymentConfig } = await import('../config/paymentConfig');
      const { tonWalletService } = await import('../services/tonWalletService');

      if (!validatePaymentConfig(network)) {
        throw new Error(`Payment wallet address not configured for ${network}. Please contact support.`);
      }

      const paymentAddress = getPaymentAddress(network);

      let referrerWalletAddress: string | null = sponsorWallet;
      let tonCommissionAmount = 0;
      let platformAmountTON = totalCostTON;

      if (referrerWalletAddress) {
        tonCommissionAmount = parseFloat((totalCostTON * 0.10).toFixed(6));
        platformAmountTON = parseFloat((totalCostTON - tonCommissionAmount).toFixed(6));
      }

      let paymentResult: { success: boolean; txHash?: string; error?: string };
      const { tetherWdkService } = await import('../services/tetherWdkService');
      const useWdk = !tonWalletService.isInitialized() && tetherWdkService.isInitialized();

      if (referrerWalletAddress && tonCommissionAmount > 0) {
        if (useWdk) {
          // Send platform amount first
          paymentResult = await tetherWdkService.sendTonTransaction(
            paymentAddress,
            platformAmountTON.toFixed(4),
            `RhizaCore ${pkg.tierName} Purchase`
          );
          // If successful, try to send commission
          if (paymentResult.success) {
            try {
              await tetherWdkService.sendTonTransaction(
                referrerWalletAddress,
                tonCommissionAmount.toFixed(6),
                `RhizaCore 10% Referral Commission`
              );
            } catch (e) {
              console.warn('WDK commission send failed', e);
            }
          }
        } else {
          paymentResult = await tonWalletService.sendMultiTransaction([
             { address: paymentAddress, amount: platformAmountTON.toFixed(4), comment: `RhizaCore ${pkg.tierName} Purchase` },
             { address: referrerWalletAddress, amount: tonCommissionAmount.toFixed(6), comment: `RhizaCore 10% Referral Commission` },
          ]);
        }
      } else {
        if (useWdk) {
          paymentResult = await tetherWdkService.sendTonTransaction(
            paymentAddress,
            totalCostTON.toFixed(4),
            `RhizaCore ${pkg.tierName} Purchase`
          );
        } else {
          paymentResult = await tonWalletService.sendTransaction(
            paymentAddress,
            totalCostTON.toFixed(4),
            `RhizaCore ${pkg.tierName} Purchase`
          );
        }
      }

      if (!paymentResult.success || !paymentResult.txHash) {
        throw new Error(paymentResult.error || 'Payment failed');
      }

      await notificationService.logActivity(
        address,
        'transaction_sent',
        `Purchased ${pkg.tierName} - ${totalCostTON.toFixed(4)} TON`,
        {
          package_id: pkg.id,
          package_name: pkg.tierName,
          amount_ton: totalCostTON,
          amount_usd: pkg.pricePoint > 0 ? totalCost : pkg.activationFee * validTonPrice,
          rzc_reward: pkg.rzcReward,
          transaction_hash: paymentResult.txHash,
          network: network,
          payment_address: paymentAddress
        }
      );

      await notificationService.createNotification(
        address,
        'transaction_confirmed',
        'Payment Successful',
        `Your payment of ${totalCostTON.toFixed(4)} TON for ${pkg.tierName} was successful.`,
        { priority: 'high', data: { txHash: paymentResult.txHash, package: pkg.tierName } }
      );

      const activated = await supabaseService.activateWallet(address, {
        activation_fee_usd: pkg.pricePoint > 0 ? totalCost : pkg.activationFee * validTonPrice,
        activation_fee_ton: totalCostTON,
        ton_price: validTonPrice,
        transaction_hash: paymentResult.txHash
      });

      if (activated) {
        await notificationService.logActivity(
          address,
          'wallet_created',
          'Wallet activated successfully',
          {
            activation_fee_usd: pkg.pricePoint > 0 ? totalCost : pkg.activationFee * validTonPrice,
            activation_fee_ton: totalCostTON,
            package_purchased: pkg.tierName,
            transaction_hash: paymentResult.txHash
          }
        );

        try {
          const profileResult = await supabaseService.getProfile(address);
          if (profileResult.success && profileResult.data) {
            const userId = profileResult.data.id;

            const rewardResult = await supabaseService.awardRZCTokens(
              userId,
              pkg.rzcReward,
              pkg.id === 'activation-only' ? 'activation_bonus' : 'package_purchase',
              `${pkg.tierName} purchase reward`,
              {
                package_id: pkg.id,
                package_name: pkg.tierName,
                transaction_hash: paymentResult.txHash,
                package_price_usd: pkg.pricePoint,
                activation_fee_usd: pkg.activationFee,
                total_cost_ton: totalCostTON
              }
            );

            if (rewardResult.success) {
              await notificationService.logActivity(
                address,
                'reward_claimed',
                `Received ${pkg.rzcReward.toLocaleString()} RZC from ${pkg.tierName}`,
                {
                  amount: pkg.rzcReward,
                  type: pkg.id === 'activation-only' ? 'activation_bonus' : 'package_purchase',
                  package_name: pkg.tierName,
                  new_balance: rewardResult.newBalance
                }
              );

              await notificationService.createNotification(
                address,
                'reward_claimed',
                'RZC Tokens Awarded',
                `You received ${pkg.rzcReward.toLocaleString()} RZC tokens for purchasing ${pkg.tierName}!`,
                { priority: 'normal', data: { amount: pkg.rzcReward, package: pkg.tierName } }
              );

              const commissionPrice = pkg.pricePoint > 0 ? pkg.pricePoint : pkg.activationFee;
              if (commissionPrice > 0) {
                try {
                  const client = supabaseService.getClient();
                  if (client) {
                    const commissionResult = await client.rpc('award_package_purchase_commission', {
                      p_buyer_user_id: userId,
                      p_package_price_usd: commissionPrice,
                      p_package_name: pkg.tierName,
                      p_transaction_hash: paymentResult.txHash
                    });

                    if (commissionResult.data && commissionResult.data.length > 0) {
                      const commission = commissionResult.data[0];
                      if (commission.success) {
                        try {
                          const referrerProfile = await supabaseService.getProfileById(commission.referrer_id);
                          if (referrerProfile.success && referrerProfile.data) {
                            const referrerAddress = referrerProfile.data.wallet_address;
                            const commissionRzc = Math.round(commission.commission_amount);
                            const commissionUsd = (commissionPrice * 0.10).toFixed(2);

                            await notificationService.createNotification(
                              referrerAddress,
                              'referral_earned',
                              '💰 Referral Commission Earned!',
                              `Your referral purchased ${pkg.tierName} ($${commissionPrice}). You earned ${commissionRzc.toLocaleString()} RZC ($${commissionUsd}) — 10% commission.`,
                              { priority: 'high', data: { commission_rzc: commissionRzc, type: 'referral_commission' } }
                            );
                          }
                        } catch (e) {}
                      }
                    }

                    const tonCommissionResult = await client.rpc('record_ton_commission', {
                      p_buyer_user_id: userId,
                      p_ton_amount: totalCostTON,
                      p_package_name: pkg.tierName,
                      p_transaction_hash: paymentResult.txHash
                    });
                    
                    if (!tonCommissionResult.error && tonCommissionResult.data?.length > 0) {
                      const tc = tonCommissionResult.data[0];
                      if (tc.success) {
                        const referrerProfile = await supabaseService.getProfileById(tc.referrer_id);
                        if (referrerProfile.success && referrerProfile.data) {
                          await notificationService.createNotification(
                            referrerProfile.data.wallet_address,
                            'referral_earned',
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

        if (onSuccessCallback) {
          onSuccessCallback(pkg.id);
        }

        closePurchaseModal();
        window.location.reload();
      } else {
        throw new Error('Failed to activate wallet');
      }
    } catch (err: any) {
      setError(err.message || 'Purchase failed. Please try again.');
      try {
        await notificationService.logActivity(
          address,
           'transaction_sent',
           `Failed to purchase ${pkg.tierName}`,
           { amount_ton: totalCostTON, error: err.message, network: network }
        );
      } catch (e) {}
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#050505] text-white overflow-hidden text-left" aria-modal="true">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] w-[70vw] h-[70vw] max-w-2xl max-h-2xl rounded-full bg-emerald-500/10 blur-[100px] opacity-70"></div>
        <div className="absolute -bottom-[20%] -left-[10%] w-[70vw] h-[70vw] max-w-2xl max-h-2xl rounded-full bg-blue-500/10 blur-[100px] opacity-70"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-[0.03]"></div>
      </div>

      {/* Header */}
      <header className="relative flex-none flex items-center justify-between p-4 sm:p-6 border-b border-white/5 bg-black/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <Activity size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
              {pkg.pricePoint > 0 ? `Acquire ${pkg.tierName}` : 'Initialize Wallet'}
            </h1>
            <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">
              Secure Checkout
            </p>
          </div>
        </div>
        <button
          onClick={closePurchaseModal}
          className="p-2 sm:p-3 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={20} />
        </button>
      </header>

      {/* Main Content Area */}
      <div className="relative flex-1 overflow-y-auto w-full no-scrollbar">
        <div className="max-w-7xl mx-auto w-full flex flex-col lg:flex-row items-stretch min-h-full">
          
          {/* LEFT SIDE - Info & Value Prop */}
          <div className="flex-1 p-4 sm:p-8 lg:p-12 border-b lg:border-b-0 lg:border-r border-white/5 flex flex-col justify-center">
            
            <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Zap size={14} /> Global Protocol Matrix
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-4">
              Secure Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Position</span>
            </h2>

            <p className="text-sm sm:text-base text-gray-400 mb-8 max-w-lg leading-relaxed font-medium">
              {pkg.pricePoint > 0 
                ? `You are about to acquire the ${pkg.tierName}. This action broadcasts an immutable smart contract transaction, updating your network allocations instantly.`
                : 'Activate your wallet on the blockchain to enable full access to the RhizaCore ecosystem and protocol rewards matrix.'}
            </p>

            {/* Package Summary Card */}
            <div className="relative p-6 sm:p-8 rounded-3xl bg-white/5 border border-white/10 overflow-hidden mb-8 backdrop-blur-sm">
               <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none transform translate-x-4 -translate-y-4">
                 <ShieldCheck size={120}/>
               </div>
               
               <div className="relative">
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Selected Package</p>
                 <h3 className="text-2xl font-black text-white mb-6">{pkg.tierName}</h3>

                 <div className="space-y-4">
                   <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                       <Check size={16} className="text-emerald-400" />
                     </div>
                     <div>
                       <p className="text-sm font-bold text-white">Instant RZC Reward</p>
                       <p className="text-xs text-gray-400">{pkg.rzcReward.toLocaleString()} RZC tokens minted to your designated wallet.</p>
                     </div>
                   </div>

                   {pkg.pricePoint > 0 && (
                     <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                         <Percent size={16} className="text-emerald-400" />
                       </div>
                       <div>
                         <p className="text-sm font-bold text-white">Advanced Yields Active</p>
                         <p className="text-xs text-gray-400">Unlock {pkg.teamSalesBonus}% weekly team sales bonus matrix.</p>
                       </div>
                     </div>
                   )}
                 </div>
               </div>
            </div>

            {/* Referral Friendly Pitch */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-[#0a0f1d] to-purple-500/10 border border-indigo-500/20 relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-500"></div>
               <div className="flex flex-col sm:flex-row items-start gap-5">
                 <div className="bg-indigo-500/20 p-3 rounded-xl flex-shrink-0 ring-1 ring-indigo-500/30 group-hover:scale-110 transition-transform duration-500">
                   <Gift size={28} className="text-indigo-400" />
                 </div>
                 <div className="flex-1">
                   <h4 className="text-lg font-black text-white mb-2 tracking-tight">Affiliate Protocol</h4>
                   <p className="text-sm text-indigo-200/80 mb-4 leading-relaxed font-medium">
                     Once activated, you receive an exclusive referral link. Share it to earn <strong className="text-indigo-300">10% instant TON commissions</strong> straight to your wallet on every direct invite!
                   </p>
                   {sponsorWallet ? (
                     <div className="p-3 rounded-xl bg-black/50 border border-indigo-500/20">
                       <div className="flex items-center gap-2 mb-1">
                         <Users size={12} className="text-indigo-400" />
                         <span className="text-[10px] text-indigo-300/70 uppercase tracking-widest font-black">Your Sponsor Benefits</span>
                       </div>
                       <div className="font-mono text-xs text-indigo-300 break-all mb-1">{sponsorWallet}</div>
                       <p className="text-[10px] text-indigo-400/60 font-medium">
                         Your inviter automatically receives a 10% commission on this transaction via smart contract. You'll enjoy the same automated payouts when you invite others!
                       </p>
                     </div>
                   ) : (
                     <div className="p-3 rounded-xl bg-black/50 border border-indigo-500/20">
                       <p className="text-xs text-indigo-300/80 font-medium">
                         You don't have a sponsor for this transaction. Once activated, you'll still be able to invite others and earn!
                       </p>
                     </div>
                   )}
                 </div>
               </div>
            </div>
            
          </div>

          {/* RIGHT SIDE - Payment & Checkout */}
          <div className="w-full lg:w-[480px] xl:w-[550px] p-4 sm:p-8 lg:p-12 flex flex-col justify-center bg-black/30 relative">
             <h3 className="text-2xl font-black mb-8 border-b border-white/10 pb-4">Payment Summary</h3>

             <div className="space-y-6">
               
               {/* Error & Warning States */}
               {error && (
                  <div className="p-4 bg-red-500/10 border-l-4 border-red-500 rounded-r-xl">
                    <div className="flex items-start gap-3">
                      <AlertCircle size={20} className="text-red-500 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-red-500 mb-1">Transaction Error</h4>
                        <p className="text-xs text-red-400/80 font-medium">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {(!tonPrice || tonPrice <= 0 || !isFinite(tonPrice) || isNaN(tonPrice)) && (
                  <div className="p-4 bg-amber-500/10 border-l-4 border-amber-500 rounded-r-xl">
                    <div className="flex items-start gap-3">
                      <AlertCircle size={20} className="text-amber-500 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-amber-500 mb-1">Oracle Price Delay</h4>
                        <p className="text-xs text-amber-400/80 font-medium">Using fallback TON price of $2.45. Calculations may be approximate.</p>
                      </div>
                    </div>
                  </div>
                )}

               {/* Payment Breakdown */}
               <div className="bg-white-[0.02] border border-white/5 rounded-3xl p-6 sm:p-8">
                 <div className="space-y-4 mb-6">
                   {pkg.pricePoint > 0 && (
                     <div className="flex justify-between items-center text-sm">
                       <span className="text-gray-400 font-medium">Package Price</span>
                       <span className="font-bold text-white">${pkg.pricePoint.toFixed(2)}</span>
                     </div>
                   )}
                   <div className="flex justify-between items-center text-sm">
                     <span className="text-gray-400 font-medium">Activation Fee</span>
                     <span className="font-bold text-white">${pkg.activationFee.toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                     <span className="text-gray-400 font-medium">Network Fee (Est.)</span>
                     <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/10 text-gray-300">~0.005 TON</span>
                   </div>
                 </div>

                 <div className="pt-6 border-t border-white/10">
                   <div className="flex justify-between items-end mb-1">
                     <span className="text-sm font-medium text-gray-400">Total (USD)</span>
                     <span className="text-3xl font-black text-white">${totalCost.toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="text-xs text-gray-500">Total Amount in TON</span>
                     <span className="text-sm font-bold text-emerald-400">{totalCostTON.toFixed(4)} TON</span>
                   </div>
                 </div>
               </div>

               {/* Wallet Status Card */}
               <div className={`p-5 rounded-2xl border ${hasEnoughBalance ? 'bg-blue-500/5 border-blue-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <WalletIcon size={16} className={hasEnoughBalance ? 'text-blue-400' : 'text-red-400'} />
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-300">Your Wallet</span>
                    </div>
                    {!hasEnoughBalance && (
                      <span className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest">
                        Insufficient
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white">{tonBalance.toFixed(4)} <span className="text-base text-gray-400 font-semibold">TON</span></span>
                  </div>
               </div>

               {/* Actions */}
               <div className="pt-4 space-y-4">
                  {hasEnoughBalance ? (
                    <button
                      onClick={handlePurchase}
                      disabled={processing}
                      className="w-full relative group overflow-hidden rounded-2xl p-[2px] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 bg-[length:200%_auto] animate-[gradient_2s_linear_infinite] group-hover:bg-[length:100%_auto] transition-all"></span>
                      <div className="relative bg-black/80 backdrop-blur-sm group-hover:bg-transparent transition-colors px-6 py-4 rounded-[14px] flex items-center justify-center gap-2">
                        {processing ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span className="text-sm font-bold text-white uppercase tracking-wider">Broadcasting...</span>
                          </>
                        ) : (
                          <>
                            <span className="text-sm font-black text-white uppercase tracking-widest">Confirm Payment</span>
                            <ArrowRight size={18} className="text-white group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </div>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        closePurchaseModal();
                        navigate('/wallet/receive');
                      }}
                      className="w-full px-6 py-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <Zap size={18} className="text-amber-400" /> Deposit TON To Continue
                    </button>
                  )}
                  
                  <p className="text-center text-[10px] text-gray-500 font-medium">
                    By confirming this transaction, you agree to the smart contract execution. All actions are final and immutable.
                  </p>
               </div>

             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default GlobalPurchaseModal;
