import React, { useState, useMemo, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { tonWalletService } from '../services/tonWalletService';
import { useNavigate } from 'react-router-dom';
import { Zap, Star, Shield, Store, Lock, TrendingUp, CheckCircle, Info, Sparkles } from 'lucide-react';
import { getNetworkConfig } from '../constants';
import { toDecimals } from '../utility/decimals';
import { notificationService } from '../services/notificationService';
import { supabaseService } from '../services/supabaseService';
import { RZC_CONFIG } from '../config/rzcConfig';

interface StoreUIProps {
    tonPrice: number;
    tonAddress?: string | null;
    showSnackbar?: ({ message, description, type }: any) => void;
    onPurchaseComplete?: () => void;
    walletActivated?: boolean;
    onActivateWallet?: () => void;
    userId?: string;
}

const USDT_JETTON_ADDRESS = 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs';
type PaymentMethod = 'TON' | 'USDT';

const StoreUI: React.FC<StoreUIProps> = ({
    tonPrice,
    tonAddress,
    showSnackbar,
    onPurchaseComplete,
    walletActivated = false,
    onActivateWallet,
    userId
}) => {
    const [customAmountStr, setCustomAmountStr] = useState<string>('1000');
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TON');
    const [usdtBalance, setUsdtBalance] = useState<string>('0');

    const navigate = useNavigate();
    const { address, network } = useWallet();
    const currentTonAddress = tonAddress || address;

    const finalAmount = useMemo(() => {
        return Math.max(0, parseFloat(customAmountStr) || 0);
    }, [customAmountStr]);

    const bonus = useMemo(() => {
        if (finalAmount >= 10000) return 15;
        if (finalAmount >= 2500) return 5;
        return 0;
    }, [finalAmount]);

    const costUsd = finalAmount * RZC_CONFIG.RZC_PRICE_USD;
    const costTon = costUsd / tonPrice;
    const costUsdt = costUsd;
    const totalRZC = finalAmount * (1 + bonus / 100);

    // Fetch USDT balance
    useEffect(() => {
        const fetchUsdtBalance = async () => {
            if (!currentTonAddress) {
                setUsdtBalance('0');
                return;
            }
            try {
                const balanceInfo = await tonWalletService.getJettons(currentTonAddress);
                if (balanceInfo.success) {
                    const usdtJetton = balanceInfo.jettons?.find(
                        (jetton: any) => jetton.jetton.address.toString() === USDT_JETTON_ADDRESS
                    );
                    if (usdtJetton) {
                        const balance = toDecimals(usdtJetton.balance, usdtJetton.jetton.decimals);
                        setUsdtBalance(balance);
                    } else {
                        setUsdtBalance('0');
                    }
                } else {
                    setUsdtBalance('0');
                }
            } catch (error) {
                console.error('Failed to fetch USDT balance:', error);
                setUsdtBalance('0');
            }
        };
        fetchUsdtBalance();
    }, [currentTonAddress]);

    const handlePurchase = async () => {
        if (!walletActivated) {
            showSnackbar?.({
                message: 'Wallet Not Activated',
                description: 'Please activate your RhizaCore wallet first',
                type: 'error'
            });
            return;
        }

        if (!currentTonAddress) {
            showSnackbar?.({
                message: 'Wallet Not Connected',
                description: 'Please connect your TON wallet to purchase',
                type: 'error'
            });
            return;
        }

        if (finalAmount < 1) {
            showSnackbar?.({
                message: 'Minimum Required',
                description: 'Minimum purchase is 1 RZC',
                type: 'error'
            });
            return;
        }

        if (paymentMethod === 'USDT') {
            const availableUsdt = parseFloat(usdtBalance);
            if (availableUsdt < costUsdt) {
                showSnackbar?.({
                    message: 'Insufficient USDT Balance',
                    description: `You need ${costUsdt.toFixed(2)} USDT but only have ${availableUsdt.toFixed(2)} USDT`,
                    type: 'error'
                });
                return;
            }
        }

        setIsProcessing(true);

        try {
            let txResult;
            const RHIZACORE_TREASURY_ADDRESS = getNetworkConfig(network).DEPOSIT_ADDRESS;

            if (paymentMethod === 'TON') {
                const paymentResult = await tonWalletService.sendTransaction(
                    RHIZACORE_TREASURY_ADDRESS,
                    costTon.toFixed(4),
                    `RhizaCore RZC Purchase`
                );

                if (!paymentResult.success || !paymentResult.txHash) {
                    throw new Error(paymentResult.error || 'Payment failed');
                }

                showSnackbar?.({
                    message: 'Transaction Initiated',
                    description: `Purchasing ${totalRZC.toLocaleString()} RZC for ${costTon.toFixed(4)} TON`,
                    type: 'info'
                });

                txResult = { boc: paymentResult.txHash };
            } else {
                const balanceInfo = await tonWalletService.getJettons(currentTonAddress);

                if (!balanceInfo.success || !balanceInfo.jettons) {
                    throw new Error('USDT jetton not found');
                }

                const usdtJetton = balanceInfo.jettons.find(
                    (jetton: any) => jetton.jetton.address.toString() === USDT_JETTON_ADDRESS
                );

                if (!usdtJetton) {
                    throw new Error('USDT jetton not found');
                }

                const paymentResult = await tonWalletService.sendJettonTransaction(
                    usdtJetton.jetton.address.toString(),
                    RHIZACORE_TREASURY_ADDRESS,
                    BigInt(Math.floor(costUsdt * Math.pow(10, usdtJetton.jetton.decimals))),
                    '0.01',
                    'RhizaCore RZC Purchase'
                );

                if (!paymentResult.success || !paymentResult.txHash) {
                    throw new Error(paymentResult.error || 'Payment failed');
                }

                showSnackbar?.({
                    message: 'Transaction Initiated',
                    description: `Purchasing ${totalRZC.toLocaleString()} RZC for ${costUsdt.toFixed(2)} USDT`,
                    type: 'info'
                });

                txResult = { boc: paymentResult.txHash };
            }

            if (txResult) {
                await notificationService.logActivity(
                    currentTonAddress,
                    'transaction_sent',
                    `Purchased ${totalRZC.toLocaleString()} RZC - ${paymentMethod === 'TON' ? costTon.toFixed(4) + ' TON' : costUsdt.toFixed(2) + ' USDT'}`,
                    {
                        amount_ton: paymentMethod === 'TON' ? costTon : 0,
                        amount_usdt: paymentMethod === 'USDT' ? costUsdt : 0,
                        amount_usd: costUsd,
                        rzc_reward: totalRZC,
                        transaction_hash: txResult.boc,
                        network: getNetworkConfig(network).NAME,
                        payment_address: RHIZACORE_TREASURY_ADDRESS
                    }
                );

                await notificationService.createNotification(
                    currentTonAddress,
                    'transaction_confirmed',
                    'Payment Successful',
                    `Your payment of ${paymentMethod === 'TON' ? costTon.toFixed(4) + ' TON' : costUsdt.toFixed(2) + ' USDT'} for ${totalRZC.toLocaleString()} RZC was successful.`,
                    {
                        priority: 'high',
                        data: { txHash: txResult.boc, package: 'RZC Purchase' }
                    }
                );

                const profileResult = await supabaseService.getProfile(currentTonAddress);
                let actualUserId = profileResult?.data?.id || userId;

                if (actualUserId) {
                    const rewardResult = await supabaseService.awardRZCTokens(
                        actualUserId,
                        totalRZC,
                        'package_purchase',
                        `Direct RZC store purchase`,
                        {
                            transaction_hash: txResult.boc,
                            package_price_usd: costUsd,
                            total_cost_ton: paymentMethod === 'TON' ? costTon : 0,
                            total_cost_usdt: paymentMethod === 'USDT' ? costUsdt : 0
                        }
                    );

                    if (rewardResult.success) {
                        console.log(`✅ ${totalRZC} RZC tokens awarded to user ${actualUserId}`);

                        await notificationService.logActivity(
                            currentTonAddress,
                            'reward_claimed',
                            `Received ${totalRZC.toLocaleString()} RZC from Direct Purchase`,
                            {
                                amount: totalRZC,
                                type: 'direct_purchase',
                                new_balance: rewardResult.newBalance
                            }
                        );

                        await notificationService.createNotification(
                            currentTonAddress,
                            'reward_claimed',
                            'RZC Tokens Awarded',
                            `You received ${totalRZC.toLocaleString()} RZC tokens from your purchase!`,
                            {
                                priority: 'normal',
                                data: { amount: totalRZC }
                            }
                        );

                        try {
                            const client = supabaseService.getClient();
                            if (client) {
                                const commissionResult = await client.rpc('award_package_purchase_commission', {
                                    p_buyer_user_id: actualUserId,
                                    p_package_price_usd: costUsd,
                                    p_package_name: 'Store RZC Purchase',
                                    p_transaction_hash: txResult.boc
                                });

                                if (commissionResult.error) {
                                    console.error('❌ Failed to award referral commission:', commissionResult.error);
                                } else if (commissionResult.data && commissionResult.data.length > 0) {
                                    const commission = commissionResult.data[0];
                                    if (commission.success) {
                                        console.log(`✅ Referral commission awarded: ${commission.commission_amount} RZC to referrer`);
                                    }
                                }
                            }
                        } catch (commErr) {
                            console.error('Error awarding commission:', commErr);
                        }
                    } else {
                        console.error("Failed backend reward allocation:", rewardResult.error);
                    }
                }

                showSnackbar?.({
                    message: 'Purchase Complete',
                    description: `Successfully purchased ${totalRZC.toLocaleString()} RZC tokens`,
                    type: 'success'
                });

                onPurchaseComplete?.();
            }

        } catch (error: any) {
            console.error('Purchase transaction failed:', error);

            if (error.message?.includes('insufficient')) {
                showSnackbar?.({
                    message: 'Insufficient Balance',
                    description: `You don't have enough ${paymentMethod} to complete this purchase`,
                    type: 'error'
                });
            } else if (error.message?.includes('rejected') || error.message?.includes('cancelled') || error.message?.includes('User rejected')) {
                showSnackbar?.({
                    message: 'Transaction Cancelled',
                    description: 'Purchase cancelled by user',
                    type: 'info'
                });
            } else {
                showSnackbar?.({
                    message: 'Purchase Failed',
                    description: 'An error occurred. Please try again.',
                    type: 'error'
                });
            }
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">

            {/* Activation Gate */}
            {!walletActivated && (
                <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-6">
                    <div className="max-w-md w-full text-center">
                        <div className="w-20 h-20 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                            <Lock size={32} className="text-slate-400" />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-3">RZC Token Store</h2>
                        <p className="text-slate-400 text-base mb-8 leading-relaxed max-w-sm mx-auto">
                            Activate your wallet to purchase RZC tokens at <span className="text-emerald-400 font-semibold">$0.12</span> — the lowest price available.
                        </p>
                        <button onClick={onActivateWallet}
                            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-semibold text-base shadow-2xl shadow-emerald-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]">
                            Activate Wallet to Continue
                        </button>
                        <p className="mt-6 text-xs text-slate-600 uppercase tracking-wider">Seed Round • Limited Time Offer</p>
                    </div>
                </div>
            )}

            {/* Announcement Banner */}
            <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 px-6 py-3 flex items-center justify-center gap-3 shadow-lg">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <span className="text-sm font-semibold text-white">Seed Round Active</span>
                </div>
                <span className="hidden sm:inline text-sm text-white/90">•</span>
                <span className="text-sm text-white/90 hidden sm:inline">Price increases to $0.18 in next round</span>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
                
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">RZC Token Store</h1>
                    <p className="text-slate-400 text-base">Purchase RZC tokens at seed round pricing with instant delivery</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">

                    {/* LEFT COLUMN - Info */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Current Pricing Card */}
                        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl">
                            <div className="p-6 lg:p-8">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex-1">
                                        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-3 py-1 mb-4">
                                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Seed Round Active</span>
                                        </div>
                                        <div className="flex items-baseline gap-4 mb-3">
                                            <span className="text-5xl lg:text-6xl font-bold text-white">$0.12</span>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-lg text-slate-500 line-through">$0.18</span>
                                                <span className="text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-md">33% OFF</span>
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-400 leading-relaxed max-w-md">
                                            Lowest price available. Token price increases with each funding round.
                                        </p>
                                    </div>
                                    <div className="text-6xl opacity-60 hidden sm:block">💎</div>
                                </div>

                                {/* Pricing Roadmap */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {[
                                        { label: 'Seed', price: '$0.12', status: 'Active', active: true },
                                        { label: 'Round 2', price: '$0.18', status: 'Upcoming', active: false },
                                        { label: 'Round 3', price: '$0.25', status: 'Locked', active: false },
                                        { label: 'Exchange', price: '$0.50+', status: 'Future', active: false },
                                    ].map(r => (
                                        <div key={r.label} className={`p-4 rounded-xl text-center border transition-all ${
                                            r.active 
                                                ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/10' 
                                                : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50'
                                        }`}>
                                            <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${r.active ? 'text-emerald-400' : 'text-slate-500'}`}>
                                                {r.label}
                                            </p>
                                            <p className={`text-lg font-bold mb-1 ${r.active ? 'text-white' : 'text-slate-400'}`}>
                                                {r.price}
                                            </p>
                                            <p className={`text-xs ${r.active ? 'text-emerald-400' : 'text-slate-600'}`}>
                                                {r.status}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Key Benefits */}
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 lg:p-8">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <Star size={20} className="text-emerald-400" />
                                Why Purchase Now?
                            </h3>
                            <div className="grid sm:grid-cols-2 gap-4">
                                {[
                                    { icon: '📈', title: 'Best Entry Price', desc: 'Lowest price available before public rounds' },
                                    { icon: '⚡', title: 'Instant Delivery', desc: 'Tokens credited immediately after payment' },
                                    { icon: '🤝', title: '10% Referral Bonus', desc: 'Earn rewards for every referral purchase' },
                                    { icon: '🎁', title: 'Volume Bonuses', desc: '+5% at 2,500 RZC, +15% at 10,000 RZC' },
                                ].map(item => (
                                    <div key={item.title} className="flex items-start gap-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700/30 hover:border-slate-600/50 transition-colors">
                                        <span className="text-2xl flex-shrink-0">{item.icon}</span>
                                        <div>
                                            <p className="text-sm font-semibold text-white mb-1">{item.title}</p>
                                            <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Price Projection */}
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 lg:p-8">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <TrendingUp size={20} className="text-blue-400" />
                                Price Projection
                            </h3>
                            <div className="space-y-3">
                                {[
                                    { phase: 'Current (Seed)', price: '$0.12', multiplier: '1.0x', color: 'emerald' },
                                    { phase: 'Round 2', price: '$0.18', multiplier: '1.5x', color: 'blue' },
                                    { phase: 'Round 3', price: '$0.25', multiplier: '2.1x', color: 'purple' },
                                    { phase: 'Exchange Listing', price: '$0.50+', multiplier: '4.2x+', color: 'amber' },
                                ].map((item, idx) => (
                                    <div key={item.phase} className={`flex items-center justify-between p-4 rounded-xl border ${
                                        idx === 0 
                                            ? 'bg-emerald-500/10 border-emerald-500/30' 
                                            : 'bg-slate-800/30 border-slate-700/30'
                                    }`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                                idx === 0 ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'
                                            }`}>
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <p className={`text-sm font-semibold ${idx === 0 ? 'text-white' : 'text-slate-300'}`}>
                                                    {item.phase}
                                                </p>
                                                <p className="text-xs text-slate-500">{item.multiplier} from seed</p>
                                            </div>
                                        </div>
                                        <span className={`text-lg font-bold ${idx === 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                                            {item.price}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* RIGHT COLUMN - Purchase Form (Sticky) */}
                    <div className="lg:sticky lg:top-6">
                        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">

                            {/* Form Header */}
                            <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
                                <div>
                                    <h2 className="text-base font-bold text-white">Purchase RZC</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">Seed Round • $0.12 per token</p>
                                </div>
                                {bonus > 0 && (
                                    <span className="text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full flex items-center gap-1">
                                        <Sparkles size={12} />
                                        +{bonus}% Bonus
                                    </span>
                                )}
                            </div>

                            <div className="p-6 space-y-6">

                                {/* Step 1 - Amount */}
                                <div>
                                    <label className="flex items-center gap-2 mb-3">
                                        <span className="w-6 h-6 bg-emerald-500 text-white text-xs font-bold flex items-center justify-center rounded-full">1</span>
                                        <span className="text-sm font-semibold text-slate-300">Enter Amount</span>
                                    </label>
                                    <div className="grid grid-cols-4 gap-2 mb-3">
                                        {[100, 500, 1000, 5000].map(amt => (
                                            <button key={amt} onClick={() => setCustomAmountStr(amt.toString())}
                                                className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${
                                                    customAmountStr === amt.toString()
                                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                                        : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-emerald-500/40'
                                                }`}>
                                                {amt}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={customAmountStr}
                                            onChange={(e) => setCustomAmountStr(e.target.value)}
                                            placeholder="Custom amount"
                                            className="w-full h-14 bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-xl px-4 pr-20 text-white font-mono text-xl outline-none transition-all"
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                            <span className="text-slate-500 text-xs font-semibold uppercase">RZC</span>
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        </div>
                                    </div>
                                    <div className="mt-2 flex items-center gap-3 text-xs">
                                        <span className={`font-medium transition-colors ${finalAmount >= 2500 ? 'text-emerald-400' : 'text-slate-600'}`}>
                                            2,500+ → +5%
                                        </span>
                                        <span className="text-slate-700">•</span>
                                        <span className={`font-medium transition-colors ${finalAmount >= 10000 ? 'text-amber-400' : 'text-slate-600'}`}>
                                            10,000+ → +15%
                                        </span>
                                    </div>
                                </div>

                                {/* Step 2 - Payment Method */}
                                <div>
                                    <label className="flex items-center gap-2 mb-3">
                                        <span className="w-6 h-6 bg-emerald-500 text-white text-xs font-bold flex items-center justify-center rounded-full">2</span>
                                        <span className="text-sm font-semibold text-slate-300">Payment Method</span>
                                    </label>
                                    <div className="flex bg-slate-800 border border-slate-700 rounded-xl p-1">
                                        <button onClick={() => setPaymentMethod('TON')}
                                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold uppercase tracking-wide transition-all ${
                                                paymentMethod === 'TON' 
                                                    ? 'bg-blue-600 text-white shadow-lg' 
                                                    : 'text-slate-500 hover:text-slate-300'
                                            }`}>
                                            <Zap size={14} /> TON
                                        </button>
                                        <button onClick={() => setPaymentMethod('USDT')}
                                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold uppercase tracking-wide transition-all ${
                                                paymentMethod === 'USDT' 
                                                    ? 'bg-emerald-600 text-white shadow-lg' 
                                                    : 'text-slate-500 hover:text-slate-300'
                                            }`}>
                                            <Store size={14} /> USDT
                                        </button>
                                    </div>
                                    {currentTonAddress && (
                                        <p className="mt-2 text-xs text-slate-600 font-medium">
                                            Available: {paymentMethod === 'USDT' ? `${parseFloat(usdtBalance).toFixed(2)} USDT` : 'Check wallet'}
                                        </p>
                                    )}
                                </div>

                                {/* Step 3 - Order Summary */}
                                <div>
                                    <label className="flex items-center gap-2 mb-3">
                                        <span className="w-6 h-6 bg-emerald-500 text-white text-xs font-bold flex items-center justify-center rounded-full">3</span>
                                        <span className="text-sm font-semibold text-slate-300">Order Summary</span>
                                    </label>
                                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl divide-y divide-slate-700/50">
                                        <div className="flex justify-between items-center px-4 py-3">
                                            <span className="text-sm text-slate-400 font-medium">You pay</span>
                                            <div className="text-right">
                                                <p className="text-white font-mono font-bold text-base">
                                                    {paymentMethod === 'TON' ? `${costTon.toFixed(3)} TON` : `${costUsdt.toFixed(2)} USDT`}
                                                </p>
                                                <p className="text-slate-600 font-mono text-xs">≈ ${costUsd.toFixed(2)} USD</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center px-4 py-3">
                                            <span className="text-sm text-slate-400 font-medium">You receive</span>
                                            <div className="text-right">
                                                <p className="font-mono font-bold text-base text-emerald-400">+{totalRZC.toLocaleString()} RZC</p>
                                                {bonus > 0 && (
                                                    <p className="text-amber-400 text-xs font-semibold">+{bonus}% bonus included</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center px-4 py-2.5 bg-slate-800/30">
                                            <span className="text-xs text-slate-600 font-medium">At Round 2 ($0.18)</span>
                                            <span className="text-orange-400 text-sm font-bold">${(totalRZC * 0.18).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center px-4 py-2.5 bg-slate-800/30">
                                            <span className="text-xs text-slate-600 font-medium">At Exchange ($0.50)</span>
                                            <span className="text-emerald-400 text-sm font-bold">${(totalRZC * 0.50).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* CTA Button */}
                                {!walletActivated ? (
                                    <button onClick={onActivateWallet}
                                        className="w-full py-4 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-bold text-sm shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                                        <Lock size={16} /> Activate Wallet First
                                    </button>
                                ) : !currentTonAddress ? (
                                    <button onClick={() => navigate('/wallet/login')}
                                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-sm rounded-xl shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                                        <Zap size={16} /> Connect Wallet
                                    </button>
                                ) : (
                                    <button onClick={handlePurchase}
                                        disabled={isProcessing || finalAmount <= 0}
                                        className="group relative w-full py-4 rounded-xl font-bold text-sm shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-40 overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600">
                                        {isProcessing ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <Store size={16} />
                                                Buy {finalAmount > 0 ? `${totalRZC.toLocaleString()} RZC` : 'RZC'} Now
                                            </>
                                        )}
                                    </button>
                                )}

                                <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                    <Info size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        Minimum 1 RZC • Instant delivery • 10% referral bonus on all purchases
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default StoreUI;
