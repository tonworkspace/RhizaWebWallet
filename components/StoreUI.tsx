import React, { useState, useMemo, useEffect, useRef } from 'react';

import { useWallet } from '../context/WalletContext';
import { useBalance } from '../hooks/useBalance';
import { tonWalletService } from '../services/tonWalletService';
import { tetherWdkService } from '../services/tetherWdkService';
import { useNavigate } from 'react-router-dom';
import {
    Zap, Shield, ShoppingBag, Info, TrendingUp, ArrowRight, Lock,
    Star, HelpCircle, CheckCircle2, Wallet, CreditCard,
    ChevronRight, Sparkles, Clock, Flame, AlertTriangle, Trophy, QrCode, Package, Percent, Users, Check, Gift, ArrowDownUp, Activity
} from 'lucide-react';
import { getNetworkConfig, TRON_DEPOSIT_ADDRESS } from '../constants';
import { toDecimals } from '../utility/decimals';
import { notificationService } from '../services/notificationService';
import { supabaseService } from '../services/supabaseService';
import { useSalesPackages } from '../hooks/useSalesPackages';
import { usePurchaseModal } from '../context/PurchaseModalContext';
import { useSaleRound } from '../hooks/useSaleRound';
import { saleRoundService } from '../services/saleRoundService';
import WalletActivationGate from './WalletActivationGate';
import { getStoreActivationFeeUSD, getNodeActivationMilestoneUSD } from '../config/paymentConfig';

interface StoreUIProps {
    tonPrice: number;
    rzcPrice?: number;
    trxPrice?: number;
    tonAddress?: string | null;
    showSnackbar?: ({ message, description, type }: any) => void;
    onPurchaseComplete?: () => void;
    walletActivated?: boolean;
    onActivateWallet?: () => void;
    userId?: string;
}

const USDT_JETTON_ADDRESS = 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs';
type PaymentMethod = 'TON' | 'USDT' | 'TRX' | 'USDT_TRC20';

const SEED_END_DATE = new Date('2026-06-30T23:59:59Z');

function useCountdown(targetDate: Date) {
    const calc = () => {
        const diff = targetDate.getTime() - Date.now();
        if (diff <= 0) {
            return { days: 0, hours: 0, minutes: 0, seconds: 0, ended: true };
        }
        return {
            days: Math.floor(diff / 86400000),
            hours: Math.floor((diff % 86400000) / 3600000),
            minutes: Math.floor((diff % 3600000) / 60000),
            seconds: Math.floor((diff % 60000) / 1000),
            ended: false
        };
    };
    const [time, setTime] = useState(calc);
    useEffect(() => {
        const id = setInterval(() => setTime(calc()), 1000);
        return () => clearInterval(id);
    }, []);
    return time;
}

const StoreUI: React.FC<StoreUIProps> = ({
    tonPrice,
    rzcPrice: rzcPriceProp,
    trxPrice,
    tonAddress,
    showSnackbar,
    onPurchaseComplete,
    walletActivated = false,
    onActivateWallet,
    userId
}) => {
    const [activeSubTab, setActiveSubTab] = useState<'buy' | 'guide' | 'packages'>('buy');
    const [inputMode, setInputMode] = useState<'rzc' | 'ton'>('rzc');
    const [customAmountStr, setCustomAmountStr] = useState<string>('1000');
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TON');
    const [usdtBalance, setUsdtBalance] = useState<string>('0');
    const [isLoadingSponsor, setIsLoadingSponsor] = useState(true);
    const [lastPurchaseAttempt, setLastPurchaseAttempt] = useState(0);
    const [recentPurchases, setRecentPurchases] = useState<any[]>([]);
    const barRef = useRef<HTMLDivElement>(null);

    const timeAgo = (dateStr: string) => {
        const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
        if (diff < 60) return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    // Fetch recent buyers (FOMO)
    useEffect(() => {
        const fetchRecentPurchases = async () => {
            try {
                const client = supabaseService.getClient();
                if (!client) return;
                const { data, error } = await client
                    .from('ico_purchases')
                    .select('wallet_address, rzc_amount, created_at')
                    .order('created_at', { ascending: false })
                    .limit(5);
                    
                if (!error && data) {
                    setRecentPurchases(data);
                }
            } catch (err) {
                console.error('Failed to fetch recent purchases', err);
            }
        };
        fetchRecentPurchases();
        
        // Poll every 15s to keep it live
        const interval = setInterval(fetchRecentPurchases, 15000);
        return () => clearInterval(interval);
    }, []);

    // Initialize progress bar on mount
    useEffect(() => {
        if (barRef.current) {
            barRef.current.style.width = '0%';
        }
    }, []);

    // ── Live ICO round data from Supabase ──────────────────────────────────────
    const {
        activeRound,
        isLoading: isRoundLoading,
        roundProgress,
        isSoldOut,
        saleEndDate,
        refresh: refreshRound,
        getBonusForAmount,
        getRoundPrice,  // ✅ NEW: Get any round's price from DB
    } = useSaleRound();

    const countdown = useCountdown(saleEndDate);

    const navigate = useNavigate();
    const { address, network, rzcPrice: contextRzcPrice, isActivated, refreshData, multiChainBalances } = useWallet();
    const { tonBalance } = useBalance(); // Primary TON balance

    // Calculate effective balances (prefer WDK multi-chain if primary is 0, or take max)
    const effectiveTonBalance = Math.max(tonBalance, parseFloat(multiChainBalances?.ton || '0'));
    const effectiveUsdtBalance = parseFloat(usdtBalance);
    const effectiveTrxBalance = parseFloat(multiChainBalances?.tron || '0');
    const effectiveUsdtTrc20Balance = parseFloat(multiChainBalances?.tronUsdt || '0');



    // Determine the actual TON address (prefer primary, fallback to context/prop address)
    const currentTonAddress = useMemo(() => {
        if (tonWalletService.isInitialized() && tonWalletService.getWalletAddress()) {
            return tonWalletService.getWalletAddress()!;
        }
        // Fallback to tonAddress prop or context address (which holds the WDK address when active)
        const addr = tonAddress || address;
        if (addr && (addr.startsWith('U') || addr.startsWith('0') || addr.startsWith('E'))) {
            return addr;
        }
        return '';
    }, [tonAddress, address, tonWalletService.isInitialized()]);

    const salesPackages = useSalesPackages();
    const { openPurchaseModal } = usePurchaseModal();
    const activationPackage = useMemo(() => salesPackages.find(pkg => pkg.id === 'activation-only'), [salesPackages]);
    const filteredPackages = useMemo(() => salesPackages.filter(pkg => pkg.id !== 'test-001' && pkg.id !== 'activation-only'), [salesPackages]);
    
    const [purchasedPackages, setPurchasedPackages] = useState<string[]>([]);
    const [sponsorWallet, setSponsorWallet] = useState<string | null>(null);
    const [nodeMilestoneStatus, setNodeMilestoneStatus] = useState<{
        nodeActivated: boolean;
        totalSpent: number;
        remainingForNode: number;
    } | null>(null);

    // Calculate activation thresholds from config
    const storeActivationThreshold = getStoreActivationFeeUSD(network); // $10 mainnet, $8 testnet
    const nodeMilestoneThreshold = getNodeActivationMilestoneUSD(network); // $18 mainnet, $15 testnet

    useEffect(() => {
        if (address) {
            const stored = localStorage.getItem(`purchased_packages_${address}`);
            if (stored) {
                try {
                    setPurchasedPackages(JSON.parse(stored));
                } catch (e) {
                    console.error('Failed to parse purchased packages:', e);
                }
            }
        }
    }, [address]);

    // Fetch sponsor (referrer) wallet address for on-chain commission split
    useEffect(() => {
        const fetchSponsor = async () => {
            if (!currentTonAddress) {
                setIsLoadingSponsor(false);
                return;
            }
            setIsLoadingSponsor(true);
            try {
                const profileResult = await supabaseService.getProfile(currentTonAddress);
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
                console.warn('[StoreUI] Failed to fetch sponsor wallet:', err);
            } finally {
                setIsLoadingSponsor(false);
            }
            
            console.log('[StoreUI] 🔍 Sponsor wallet lookup complete:', {
                currentTonAddress: currentTonAddress ? currentTonAddress.substring(0, 8) + '...' : 'NONE',
                sponsorWallet: sponsorWallet ? sponsorWallet.substring(0, 8) + '...' : 'NONE',
                willUseMultisend: !!sponsorWallet
            });
        };
        fetchSponsor();
    }, [currentTonAddress, sponsorWallet]);

    // Fetch node milestone status
    useEffect(() => {
        const fetchNodeStatus = async () => {
            if (!currentTonAddress) return;
            
            try {
                const client = supabaseService.getClient();
                if (!client) return;
                
                const { data, error } = await client.rpc('check_node_milestone_status', {
                    p_wallet_address: currentTonAddress
                });
                
                if (!error && data) {
                    setNodeMilestoneStatus({
                        nodeActivated: data.node_activated || false,
                        totalSpent: data.total_spent || 0,
                        remainingForNode: data.remaining_for_node || nodeMilestoneThreshold
                    });
                }
            } catch (err) {
                console.warn('[StoreUI] Failed to fetch node milestone status:', err);
            }
        };
        
        fetchNodeStatus();
    }, [currentTonAddress, nodeMilestoneThreshold]);

    const handlePackagePurchase = (pkg: any) => {
        if (!walletActivated && pkg.id !== 'activation-only') {
            showSnackbar?.({ message: 'Wallet Not Activated', description: 'Please activate your RhizaCore wallet first', type: 'error' });
            return;
        }
        openPurchaseModal(pkg, (packageId: string) => {
            const updated = [...purchasedPackages, packageId];
            setPurchasedPackages(updated);
            if (address) {
                localStorage.setItem(`purchased_packages_${address}`, JSON.stringify(updated));
            }
        });
    };

    // ✅ ALWAYS use database price from active ICO round (ignore localStorage overrides)
    // The ICO system is the single source of truth for RZC pricing
    const RZC_PRICE_USD  = activeRound.price_usd;  // Direct from DB, no overrides
    const NEXT_ROUND_PRICE = activeRound.next_round_price;  // live from DB
    const LISTING_PRICE    = 1.00;
    const multiplier = Math.min(Math.round(LISTING_PRICE / RZC_PRICE_USD), 99);

    const MIN_TON = 0.01;

    // If inputMode=rzc: user types RZC → derive TON cost
    // If inputMode=ton: user types TON → derive RZC received
    const enteredNum = useMemo(() => {
        const parsed = parseFloat(customAmountStr);
        if (isNaN(parsed) || !isFinite(parsed) || parsed < 0) return 0;
        if (parsed > 1000000) return 1000000;
        return parsed;
    }, [customAmountStr]);

    const finalAmount = useMemo(() => {
        if (inputMode === 'rzc') return enteredNum;
        const usdValue = enteredNum * tonPrice;
        return usdValue / RZC_PRICE_USD;
    }, [inputMode, enteredNum, tonPrice, RZC_PRICE_USD]);

    // Bonus driven from live round bonus_tiers (falls back to hardcoded if empty)
    const bonus = useMemo(
        () => getBonusForAmount(finalAmount),
        [finalAmount, getBonusForAmount],
    );

    const costUsd = finalAmount * RZC_PRICE_USD;
    const costTon = inputMode === 'ton' ? enteredNum : costUsd / tonPrice;
    const costUsdt = costUsd;
    const costTrx = costUsd / (trxPrice || 0.15); // Fallback TRX price if missing
    const costUsdtTrc20 = costUsd;
    const totalRZC = finalAmount * (1 + bonus / 100);
    const projectedValue = totalRZC * LISTING_PRICE;

    // Minimum check: 0.02 TON
    const belowMinimum = costTon < MIN_TON && finalAmount > 0;

    // Consolidated balance checker
    const hasInsufficientBalance = 
        (paymentMethod === 'TON' && effectiveTonBalance < costTon) ||
        (paymentMethod === 'USDT' && effectiveUsdtBalance < costUsdt) ||
        (paymentMethod === 'TRX' && effectiveTrxBalance < costTrx) ||
        (paymentMethod === 'USDT_TRC20' && (effectiveUsdtTrc20Balance < costUsdtTrc20 || effectiveTrxBalance < 15));

    useEffect(() => {
        // Ensure progress bar updates reliably when data loads or changes
        if (barRef.current && !isRoundLoading) {
            const clampedProgress = Math.min(Math.max(roundProgress, 0), 100);
            // Use requestAnimationFrame for smoother, more reliable animation
            requestAnimationFrame(() => {
                if (barRef.current) {
                    barRef.current.style.width = `${clampedProgress}%`;
                }
            });
        }
    }, [roundProgress, isRoundLoading]); // re-animate whenever live DB data updates the progress

    useEffect(() => {
        const fetchUsdtBalance = async () => {
            if (!currentTonAddress) { setUsdtBalance('0'); return; }
            try {
                const balanceInfo = await tonWalletService.getJettons(currentTonAddress);
                if (balanceInfo.success) {
                    const usdtJetton = balanceInfo.jettons?.find(
                        (jetton: any) => jetton.jetton.address.toString() === USDT_JETTON_ADDRESS
                    );
                    setUsdtBalance(
                        usdtJetton ? toDecimals(usdtJetton.balance, usdtJetton.jetton.decimals) : '0'
                    );
                } else { setUsdtBalance('0'); }
            } catch { setUsdtBalance('0'); }
        };
        fetchUsdtBalance();
    }, [currentTonAddress]);

    const handlePurchase = async () => {
        if (!currentTonAddress) {
            showSnackbar?.({ message: 'Wallet Not Connected', description: 'Please connect your TON wallet to purchase', type: 'error' });
            return;
        }
        if (finalAmount <= 0 || costTon < MIN_TON) {
            showSnackbar?.({ message: 'Minimum Required', description: `Minimum purchase is ${MIN_TON} TON`, type: 'error' });
            return;
        }

        // ✅ BALANCE VALIDATION
        if (paymentMethod === 'TON') {
            if (effectiveTonBalance < costTon) {
                showSnackbar?.({
                    message: 'Insufficient TON Balance',
                    description: `You need ${costTon.toFixed(4)} TON but only have ${effectiveTonBalance.toFixed(4)} TON`,
                    type: 'error'
                });
                return;
            }
        }

        if (paymentMethod === 'USDT') {
            if (effectiveUsdtBalance < costUsdt) {
                showSnackbar?.({
                    message: 'Insufficient USDT Balance',
                    description: `You need ${costUsdt.toFixed(2)} USDT but only have ${effectiveUsdtBalance.toFixed(2)} USDT`,
                    type: 'error'
                });
                return;
            }
        }

        if (paymentMethod === 'TRX') {
            if (effectiveTrxBalance < costTrx) {
                showSnackbar?.({
                    message: 'Insufficient TRX Balance',
                    description: `You need ${costTrx.toFixed(2)} TRX but only have ${effectiveTrxBalance.toFixed(2)} TRX`,
                    type: 'error'
                });
                return;
            }
        }

        if (paymentMethod === 'USDT_TRC20') {
            if (effectiveUsdtTrc20Balance < costUsdtTrc20) {
                showSnackbar?.({
                    message: 'Insufficient USDT (TRC20) Balance',
                    description: `You need ${costUsdtTrc20.toFixed(2)} USDT but only have ${effectiveUsdtTrc20Balance.toFixed(2)} USDT`,
                    type: 'error'
                });
                return;
            }
            if (effectiveTrxBalance < 15) {
                showSnackbar?.({
                    message: 'Insufficient TRX for Gas',
                    description: `You need at least 15 TRX to pay for network fees. You have ${effectiveTrxBalance.toFixed(2)} TRX.`,
                    type: 'error'
                });
                return;
            }
        }

        setIsProcessing(true);
        try {
            let txResult;
            const RHIZACORE_TREASURY_ADDRESS = getNetworkConfig(network).DEPOSIT_ADDRESS;

            // ── Auto-restore primary wallet session before payment decision ──────────
            // If the user has a device-encrypted session (no password needed) and the
            // primary wallet service is not yet initialized, restore it now so we use
            // the stable tonWalletService (V2 jsonRPC) instead of falling to WDK.
            if (!tonWalletService.isInitialized() && tonWalletService.hasStoredSession()) {
                try {
                    const mnemonic = await tonWalletService.getStoredSession(''); // '' = device-encrypted session
                    if (mnemonic && mnemonic.length > 0) {
                        await tonWalletService.initializeWallet(mnemonic);
                        console.log('[StoreUI] Primary wallet session auto-restored for payment');
                    }
                } catch (sessionErr) {
                    // Session may be password-protected — that's fine, we'll fall to WDK below
                    console.warn('[StoreUI] Could not auto-restore session (may need password):', sessionErr);
                }
            }

            // tetherWdkService is statically imported at the top
            
            if (!tonWalletService.isInitialized() && !tetherWdkService.isTonReady()) {
                showSnackbar?.({
                    message: 'Wallet Locked',
                    description: 'Your wallet is locked. Please enter your password in the Multi-Chain Hub or Dashboard to unlock it before purchasing.',
                    type: 'error'
                });
                setIsProcessing(false);
                return;
            }
            
            const useWdk = !tonWalletService.isInitialized() && tetherWdkService.isTonReady();
            console.log(`[StoreUI] Payment path: ${useWdk ? 'WDK multi-chain wallet' : 'Primary TON wallet (tonWalletService)'}`);

            if (paymentMethod === 'TON') {
                let paymentResult;

                // ── Multi-send: split 10% to sponsor on-chain if referrer exists ──
                const tonCommissionAmount = sponsorWallet
                    ? parseFloat((costTon * 0.10).toFixed(6))
                    : 0;
                const platformAmountTON = sponsorWallet
                    ? parseFloat((costTon - tonCommissionAmount).toFixed(6))
                    : costTon;

                if (sponsorWallet && tonCommissionAmount > 0) {
                    try {
                        // ✅ Validate and normalize sponsor address
                        const { Address } = await import('@ton/ton');
                        const validatedSponsor = Address.parse(sponsorWallet).toString({
                            bounceable: false,
                            testOnly: network === 'testnet'
                        });
                        
                        const msgs = [
                            { address: RHIZACORE_TREASURY_ADDRESS, amount: platformAmountTON.toFixed(6), comment: 'RhizaCore RZC Purchase' },
                            { address: validatedSponsor, amount: tonCommissionAmount.toFixed(6), comment: 'RhizaCore 10% Referral Commission' },
                        ];
                        
                        console.log('[StoreUI] 💎 Multisend triggered:', {
                            total: costTon.toFixed(6),
                            platform: platformAmountTON.toFixed(6),
                            referrer: tonCommissionAmount.toFixed(6),
                            referrerWallet: validatedSponsor.substring(0, 8) + '...'
                        });
                        
                        paymentResult = useWdk
                            ? await tetherWdkService.sendTonMultiTransaction(msgs)
                            : await tonWalletService.sendMultiTransaction(msgs);
                    } catch (addrErr) {
                        console.error('[StoreUI] ❌ Invalid sponsor address, falling back to single transaction:', addrErr);
                        // Fallback to single transaction if sponsor address is invalid
                        paymentResult = useWdk
                            ? await tetherWdkService.sendTonTransaction(RHIZACORE_TREASURY_ADDRESS, costTon.toFixed(4), 'RhizaCore RZC Purchase')
                            : await tonWalletService.sendTransaction(RHIZACORE_TREASURY_ADDRESS, costTon.toFixed(4), 'RhizaCore RZC Purchase');
                    }
                } else {
                    paymentResult = useWdk
                        ? await tetherWdkService.sendTonTransaction(RHIZACORE_TREASURY_ADDRESS, costTon.toFixed(4), 'RhizaCore RZC Purchase')
                        : await tonWalletService.sendTransaction(RHIZACORE_TREASURY_ADDRESS, costTon.toFixed(4), 'RhizaCore RZC Purchase');
                }

                if (!paymentResult.success || !paymentResult.txHash) throw new Error(paymentResult.error || 'Payment failed');
                showSnackbar?.({ message: 'Transaction Initiated', description: `Purchasing ${totalRZC.toLocaleString()} RZC for ${costTon.toFixed(4)} TON`, type: 'info' });
                txResult = { boc: paymentResult.txHash };
            } else if (paymentMethod === 'USDT') {
                const balanceInfo = await tonWalletService.getJettons(currentTonAddress);
                if (!balanceInfo.success || !balanceInfo.jettons) throw new Error('USDT jetton not found');
                const usdtJetton = balanceInfo.jettons.find(
                    (jetton: any) => jetton.jetton.address.toString() === USDT_JETTON_ADDRESS
                );
                if (!usdtJetton) throw new Error('USDT jetton not found');
                
                let paymentResult;
                if (useWdk) {
                    paymentResult = await tetherWdkService.sendJettonTransaction(
                        usdtJetton.jetton.address.toString(),
                        RHIZACORE_TREASURY_ADDRESS,
                        BigInt(Math.floor(costUsdt * Math.pow(10, usdtJetton.jetton.decimals))),
                        '0.01',
                        'RhizaCore RZC Purchase'
                    );
                } else {
                    const resolveResult = await tonWalletService.resolveJettonWallet(currentTonAddress, usdtJetton.jetton.address.toString());
                    if (!resolveResult.success || !resolveResult.jettonWalletAddress) throw new Error('Jetton wallet not found');
                    
                    paymentResult = await tonWalletService.sendJettonTransaction(
                        resolveResult.jettonWalletAddress,
                        RHIZACORE_TREASURY_ADDRESS,
                        BigInt(Math.floor(costUsdt * Math.pow(10, usdtJetton.jetton.decimals))),
                        '0.01',
                        'RhizaCore RZC Purchase'
                    );
                }
                
                if (!paymentResult.success || !paymentResult.txHash) throw new Error(paymentResult.error || 'Payment failed');
                showSnackbar?.({ message: 'Transaction Initiated', description: `Purchasing ${totalRZC.toLocaleString()} RZC for ${costUsdt.toFixed(2)} USDT`, type: 'info' });
                txResult = { boc: paymentResult.txHash };
            } else if (paymentMethod === 'TRX') {
                const paymentResult = await tetherWdkService.sendTronTransaction(
                    TRON_DEPOSIT_ADDRESS, 
                    costTrx.toFixed(6)
                );
                if (!paymentResult.success || !paymentResult.txHash) throw new Error(paymentResult.error || 'Payment failed');
                showSnackbar?.({ message: 'Transaction Initiated', description: `Purchasing ${totalRZC.toLocaleString()} RZC for ${costTrx.toFixed(2)} TRX`, type: 'info' });
                txResult = { boc: paymentResult.txHash };
            } else if (paymentMethod === 'USDT_TRC20') {
                const paymentResult = await tetherWdkService.sendTronTrc20Transaction(
                    TRON_DEPOSIT_ADDRESS, 
                    costUsdtTrc20.toFixed(2)
                );
                if (!paymentResult.success || !paymentResult.txHash) throw new Error(paymentResult.error || 'Payment failed');
                showSnackbar?.({ message: 'Transaction Initiated', description: `Purchasing ${totalRZC.toLocaleString()} RZC for ${costUsdtTrc20.toFixed(2)} USDT (TRC20)`, type: 'info' });
                txResult = { boc: paymentResult.txHash };
            }

            if (txResult) {
                let targetAddress = currentTonAddress;
                try {
                    const { Address } = await import('@ton/ton');
                    targetAddress = Address.parse(currentTonAddress).toString({ bounceable: false, testOnly: network === 'testnet' });
                } catch (e) {}

                let paymentDesc = '';
                if (paymentMethod === 'TON') paymentDesc = `${costTon.toFixed(4)} TON`;
                else if (paymentMethod === 'USDT') paymentDesc = `${costUsdt.toFixed(2)} USDT`;
                else if (paymentMethod === 'TRX') paymentDesc = `${costTrx.toFixed(2)} TRX`;
                else if (paymentMethod === 'USDT_TRC20') paymentDesc = `${costUsdtTrc20.toFixed(2)} USDT (TRC20)`;

                await notificationService.logActivity(
                    targetAddress, 'transaction_sent',
                    `Purchased ${totalRZC.toLocaleString()} RZC - ${paymentDesc}`,
                    {
                        amount_ton: paymentMethod === 'TON' ? costTon : 0,
                        amount_usdt: paymentMethod === 'USDT' || paymentMethod === 'USDT_TRC20' ? costUsdt : 0,
                        amount_trx: paymentMethod === 'TRX' ? costTrx : 0,
                        amount_usd: costUsd, rzc_reward: totalRZC,
                        transaction_hash: txResult.boc,
                        network: paymentMethod === 'TRX' || paymentMethod === 'USDT_TRC20' ? 'TRON' : getNetworkConfig(network).NAME,
                        payment_address: paymentMethod === 'TRX' || paymentMethod === 'USDT_TRC20' ? TRON_DEPOSIT_ADDRESS : RHIZACORE_TREASURY_ADDRESS
                    }
                );
                await notificationService.createNotification(
                    targetAddress, 'transaction_confirmed', 'Payment Successful',
                    `Your payment of ${paymentDesc} for ${totalRZC.toLocaleString()} RZC was successful.`,
                    { priority: 'high', data: { txHash: txResult.boc, package: 'RZC Purchase' } }
                );

                // Auto-activate wallet if purchase is $5+ and not yet activated
                if (!walletActivated && costUsd >= 5) {
                    try {
                        let activationAddress = targetAddress;
                        try {
                            const { Address } = await import('@ton/ton');
                            activationAddress = Address.parse(targetAddress).toString({ 
                                bounceable: false, 
                                testOnly: network === 'testnet' 
                            });
                        } catch { /* use as-is */ }

                        const activated = await supabaseService.activateWallet(activationAddress, {
                            activation_fee_usd: costUsd,
                            activation_fee_ton: paymentMethod === 'TON' ? costTon : 0,
                            ton_price: tonPrice,
                            transaction_hash: txResult.boc
                        });

                        if (activated) {
                            await notificationService.logActivity(
                                targetAddress, 'wallet_created', 
                                'Wallet auto-activated via store purchase',
                                { 
                                    activation_fee_usd: costUsd,
                                    activation_fee_ton: paymentMethod === 'TON' ? costTon : 0,
                                    transaction_hash: txResult.boc,
                                    auto_activated: true
                                }
                            );
                            await notificationService.createNotification(
                                targetAddress, 'system_announcement',
                                '🎉 Wallet Activated!',
                                `Your wallet has been automatically activated with your $${costUsd.toFixed(2)} purchase!`,
                                { priority: 'high', data: { auto_activated: true } }
                            );
                            showSnackbar?.({ 
                                message: 'Wallet Activated!', 
                                description: 'Your wallet was automatically activated with this purchase', 
                                type: 'success' 
                            });
                        }
                    } catch (activationError) {
                        console.error('Auto-activation failed:', activationError);
                        // Don't fail the purchase if activation fails
                    }
                }

                if (network === 'testnet') {
                    showSnackbar?.({ 
                        message: 'Testnet Purchase Successful', 
                        description: 'You bought with Testnet successfully! Now buy with Real Mainnet to get credited with RZC in real time.', 
                        type: 'success' 
                    });
                    onPurchaseComplete?.();
                    setTimeout(() => { navigate('/wallet/dashboard'); }, 3000);
                    return;
                }

                const profileResult = await supabaseService.getProfile(targetAddress);
                let actualUserId = profileResult?.data?.id || userId;
                if (actualUserId) {
                    const rewardResult = await supabaseService.awardRZCTokens(
                        actualUserId, totalRZC, 'package_purchase', 'Direct RZC store purchase',
                        {
                            transaction_hash: txResult.boc, package_price_usd: costUsd,
                            total_cost_ton: paymentMethod === 'TON' ? costTon : 0,
                            total_cost_usdt: paymentMethod === 'USDT' ? costUsdt : 0,
                            auto_activated: !walletActivated && costUsd >= 5
                        }
                    );
                    if (rewardResult.success) {
                        await notificationService.logActivity(
                            targetAddress, 'reward_claimed',
                            `Received ${totalRZC.toLocaleString()} RZC from Direct Purchase`,
                            { amount: totalRZC, type: 'direct_purchase', new_balance: rewardResult.newBalance }
                        );
                        await notificationService.createNotification(
                            targetAddress, 'reward_claimed', 'RZC Tokens Awarded',
                            `You received ${totalRZC.toLocaleString()} RZC tokens from your purchase!`,
                            { priority: 'normal', data: { amount: totalRZC } }
                        );
                        try {
                            const client = supabaseService.getClient();
                            if (client) {
                                // RZC commission (always) - Non-blocking
                                Promise.resolve(client.rpc('award_package_purchase_commission', {
                                    p_buyer_user_id: actualUserId,
                                    p_package_price_usd: costUsd,
                                    p_package_name: 'Store RZC Purchase',
                                    p_transaction_hash: txResult.boc
                                })).then(async (commissionResult: any) => {
                                    if (commissionResult.error) {
                                        console.error('❌ Failed to award referral commission:', commissionResult.error);
                                    } else if (commissionResult.data?.length > 0 && commissionResult.data[0].success) {
                                        const commission = commissionResult.data[0];
                                        console.log(`✅ Referral commission awarded: ${commission.commission_amount} RZC`);
                                        const referrerProfile = await supabaseService.getProfileById(commission.referrer_id);
                                        if (referrerProfile.success && referrerProfile.data) {
                                            try {
                                                await notificationService.createNotification(
                                                    referrerProfile.data.wallet_address, 'referral_earned',
                                                    '💰 Referral Commission Earned!',
                                                    `Your referral bought RZC ($${costUsd.toFixed(2)}). You earned ${Math.round(commission.commission_amount).toLocaleString()} RZC ($${(costUsd * 0.10).toFixed(2)}) — 10% commission.`,
                                                    { priority: 'high', data: { commission_rzc: Math.round(commission.commission_amount), type: 'referral_commission', package_name: 'Store RZC Purchase' } }
                                                );
                                            } catch (notifErr) { console.warn('[StoreUI] Failed to notify referrer for RZC:', notifErr); }
                                        }
                                    }
                                }).catch((e: any) => console.warn('[StoreUI] award_package_purchase_commission failed (non-blocking):', e));

                                // TON commission DB record (mirrors GlobalPurchaseModal) - Non-blocking
                                if (paymentMethod === 'TON') {
                                    Promise.resolve(client.rpc('record_ton_commission', {
                                        p_buyer_user_id: actualUserId,
                                        p_ton_amount: costTon,
                                        p_package_name: 'Store RZC Purchase',
                                        p_transaction_hash: txResult.boc
                                    })).then(async (tonRes: any) => {
                                        if (!tonRes.error && tonRes.data?.length > 0 && tonRes.data[0].success) {
                                            const tc = tonRes.data[0];
                                            console.log(`✅ TON commission recorded: ${tc.commission_ton} TON`);
                                            const referrerProfile = await supabaseService.getProfileById(tc.referrer_id);
                                            if (referrerProfile.success && referrerProfile.data) {
                                                try {
                                                    await notificationService.createNotification(
                                                        referrerProfile.data.wallet_address, 'referral_earned',
                                                        '💎 TON Commission Pending!',
                                                        `Your referral bought RZC. You earned ${tc.commission_ton} TON (10%).`,
                                                        { priority: 'high' }
                                                    );
                                                } catch (notifErr) { console.warn('[StoreUI] Failed to notify referrer for TON:', notifErr); }
                                            }
                                        }
                                    }).catch((e: any) => console.warn('[StoreUI] record_ton_commission failed (non-blocking):', e));
                                }
                            }
                        } catch (commErr) { console.error('Error awarding commission:', commErr); }
                    } else {
                        console.error('Failed backend reward allocation:', rewardResult.error);
                    }
                }

                // ── Record purchase in ico_purchases (non-blocking, after tx confirmed) ──
                saleRoundService.recordPurchase({
                    walletAddress:  targetAddress,
                    rzcAmount:      totalRZC,
                    priceUsd:       RZC_PRICE_USD,
                    costUsd:        costUsd,
                    paymentMethod:  paymentMethod,
                    txHash:         txResult?.boc ?? txResult?.hash,
                    referrerWallet: sponsorWallet ?? undefined,
                }).then(result => {
                    if (result.success) {
                        console.log(`✅ ICO purchase recorded: ${totalRZC.toLocaleString()} RZC in ${result.roundName}`);
                        refreshRound(); // live-refresh the progress bar
                    } else {
                        console.warn('[StoreUI] ICO record failed (non-blocking):', result.error);
                    }
                }).catch(e => console.warn('[StoreUI] ICO record exception (non-blocking):', e));

                const wasAutoActivated = !walletActivated && costUsd >= 5;
                showSnackbar?.({ 
                    message: 'Transaction Confirmed', 
                    description: wasAutoActivated 
                        ? `Successfully purchased ${totalRZC.toLocaleString()} RZC tokens and activated your wallet! Redirecting...`
                        : `Successfully purchased ${totalRZC.toLocaleString()} RZC tokens. Redirecting to your wallet...`, 
                    type: 'success' 
                });
                onPurchaseComplete?.();
                setTimeout(() => { navigate('/wallet/dashboard'); }, 2000);
                
                if (wasAutoActivated) {
                    setTimeout(() => window.location.reload(), 1500);
                }
            }
        } catch (error: any) {
            console.error('Purchase transaction failed:', error);
            if (error.message?.includes('insufficient')) {
                showSnackbar?.({ message: 'Insufficient Balance', description: `You don't have enough ${paymentMethod} to complete this purchase`, type: 'error' });
            } else if (error.message?.includes('rejected') || error.message?.includes('cancelled') || error.message?.includes('User rejected')) {
                showSnackbar?.({ message: 'Transaction Cancelled', description: 'Purchase cancelled by user', type: 'info' });
            } else {
                showSnackbar?.({ message: 'Purchase Failed', description: 'An error occurred. Please try again.', type: 'error' });
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const guideSteps = [
        {
            icon: <Wallet size={18} className="text-blue-600 dark:text-blue-400" />,
            title: 'Activate Your RhizaWallet',
            desc: 'Create or log in to your RhizaCore wallet. Once activated you get access to the RZC Store and your personal TON address.',
            action: null,
        },
        {
            icon: <CreditCard size={18} className="text-emerald-600 dark:text-emerald-400" />,
            title: 'Fund Your RhizaWallet TON Balance',
            desc: 'Go to Receive, copy your TON address or scan the QR code, and send TON or USDT from any exchange or wallet. Your balance updates in seconds.',
            action: { label: 'Open Deposit / Receive', route: '/wallet/receive' },
        },
        {
            icon: <ShoppingBag size={18} className="text-purple-600 dark:text-purple-400" />,
            title: 'Choose Your RZC Amount',
            desc: 'Switch to the Buy tab, enter how many RZC tokens you want. Buy 2,500+ for a 5% bonus or 10,000+ for a 15% bonus.',
            action: null,
        },
        {
            icon: <CreditCard size={18} className="text-amber-600 dark:text-amber-400" />,
            title: 'Select Payment — TON or USDT',
            desc: 'Pick TON or USDT as your payment method. Both come directly from your RhizaWallet in-app balance — no external wallet app needed.',
            action: null,
        },
        {
            icon: <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />,
            title: 'Confirm & Receive RZC Instantly',
            desc: 'Review the order summary, tap Confirm, and your RZC tokens are credited to your account immediately after on-chain confirmation.',
            action: null,
        },
    ];

    // ─── LABEL COMPONENT ─────────────────────────────────────────────────────
    const SectionLabel = ({ children }: { children: React.ReactNode }) => (
        <p className="text-[10px] font-heading font-black text-gray-400 dark:text-zinc-500 uppercase tracking-[0.2em]">{children}</p>
    );

    return (
        <div className="relative min-h-screen w-full bg-slate-50 dark:bg-[#0a0a0a] pb-24">
            {/* ── URGENCY HEADER BAR ── */}
            <div className={`border-b px-2 py-2.5 sticky top-0 z-30 backdrop-blur-md ${
                isSoldOut 
                    ? 'bg-gradient-to-r from-red-100/80 dark:from-red-950/60 via-red-100/60 dark:via-red-950/40 to-red-100/80 dark:to-red-950/60 border-red-300 dark:border-red-500/20'
                    : 'bg-gradient-to-r from-red-100/80 dark:from-red-950/60 via-orange-100/60 dark:via-orange-950/40 to-red-100/80 dark:to-red-950/60 border-red-300 dark:border-red-500/20'
            }`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {isSoldOut ? (
                            <>
                                <AlertTriangle size={12} className="text-red-500 animate-pulse" />
                                <span className="text-[10px] font-heading font-black text-red-500 uppercase tracking-widest">
                                    Seed Round Sold Out — Next Round Opening Soon
                                </span>
                            </>
                        ) : (
                            <>
                                <Flame size={12} className="text-orange-400 animate-pulse" />
                                <span className="text-[10px] font-heading font-black text-orange-400 uppercase tracking-widest">
                                    Only <span className="font-numbers">{Math.max(0, 100 - roundProgress).toFixed(1)}%</span> of seed round left
                                </span>
                            </>
                        )}
                    </div>
                    {!isSoldOut && (
                        <div className="flex items-center gap-1.5">
                            <Clock size={10} className="text-gray-400 dark:text-zinc-400" />
                            <span className="text-[10px] font-heading font-black text-gray-600 dark:text-zinc-300 uppercase tracking-widest">
                                <span className="font-numbers">{String(countdown.days).padStart(2, '0')}</span>D{' '}
                                <span className="font-numbers">{String(countdown.hours).padStart(2, '0')}</span>H{' '}
                                <span className="font-numbers">{String(countdown.minutes).padStart(2, '0')}</span>M{' '}
                                <span className="text-orange-400 font-numbers">{String(countdown.seconds).padStart(2, '0')}</span>S
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── TAB SWITCHER ── */}
            <div className="px-3 pt-5">
                <div className="flex bg-gray-200/60 dark:bg-white/[0.03] border-2 border-gray-300 dark:border-white/5 rounded-full p-1">
                    <button
                        onClick={() => setActiveSubTab('buy')}
                        className={`flex-1 py-2.5 rounded-full text-xs font-heading font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeSubTab === 'buy' ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300' : 'text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200'}`}
                    >
                        <ShoppingBag size={13} />
                        Buy RZC
                    </button>
                    <button
                        onClick={() => setActiveSubTab('packages')}
                        className={`flex-1 py-2.5 rounded-full text-xs font-heading font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeSubTab === 'packages' ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/30 text-blue-600 dark:text-blue-300' : 'text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200'}`}
                    >
                        <Package size={13} />
                        Packages
                    </button>
                    <button
                        onClick={() => setActiveSubTab('guide')}
                        className={`flex-1 py-2.5 rounded-full text-xs font-heading font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeSubTab === 'guide' ? 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200'}`}
                    >
                        <HelpCircle size={13} />
                        Guide
                    </button>
                </div>
            </div>

            {activeSubTab === 'packages' ? (
                <div className="px-3 py-6 space-y-5">
                    <div className="relative overflow-hidden rounded-2xl border border-blue-500/25 bg-gradient-to-br from-blue-50 dark:from-blue-950/50 via-white dark:via-black to-indigo-50 dark:to-indigo-950/30 p-5">
                        <div className="absolute -top-10 -right-10 w-44 h-44 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="flex items-start gap-3 mb-2">
                            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                                <Package size={16} className="text-blue-500 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-xs font-heading font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">RZC Node Packages</p>
                                <p className="text-gray-800 dark:text-white font-body text-sm leading-snug">
                                    Purchase a node package to get a fixed RZC allocation and unlock direct referral bonuses.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ── FIX 1: Activation Wall CTA — guides unactivated users instead of dead-ending them ── */}
                    {!isActivated && (
                        <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-50 dark:from-emerald-950/40 to-cyan-50 dark:to-cyan-950/20 p-4">
                            <div className="absolute -top-8 -right-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                            <div className="flex items-start gap-3 mb-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                                    <Zap size={16} className="text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-xs font-heading font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-1">Step 1 Required — Activate First</p>
                                    <p className="text-gray-800 dark:text-zinc-200 text-sm font-body leading-snug">
                                        You need to activate your wallet (<span className="font-black text-gray-900 dark:text-white">one-time, $5</span>) before buying node packages. Activation gives you lifetime access to the RZC Store, referral bonuses, and your mining node.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setActiveSubTab('buy')}
                                className="w-full h-11 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 rounded-xl text-sm font-heading font-black uppercase tracking-widest text-black shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                                <Zap size={15} /> Activate Wallet — Buy $5+ of RZC
                            </button>
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 gap-4">
                        {/* Activation Package — shown only when wallet not yet activated */}
                        {!isActivated && activationPackage && (() => {
                            const Icon = activationPackage.icon;
                            const isPurchased = purchasedPackages.includes(activationPackage.id);
                            return (
                                <div className={`relative bg-blue-50 dark:bg-[#0a0f1d]/80 backdrop-blur-xl border-2 rounded-2xl p-4 transition-all ${isPurchased ? 'border-emerald-500/30' : 'border-blue-500/40 hover:border-blue-400/60'}`}>
                                    {/* Required badge */}
                                    {!isPurchased && (
                                        <div className="absolute -top-2.5 left-4">
                                            <span className="text-[9px] font-heading font-black uppercase tracking-widest bg-blue-600 text-white px-2.5 py-1 rounded-full shadow">
                                                Required First
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-start mb-3 mt-1">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${activationPackage.gradient} flex items-center justify-center`}>
                                                <Icon size={20} className="text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-heading font-black text-gray-900 dark:text-white">{activationPackage.tierName}</h3>
                                                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-heading font-black uppercase tracking-widest">One-Time · Lifetime Access</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-lg font-numbers font-black text-gray-900 dark:text-white">${activationPackage.activationFee}</span>
                                            <p className="text-[9px] text-gray-400 dark:text-zinc-500 font-heading font-black uppercase tracking-widest">one-time</p>
                                        </div>
                                    </div>

                                    <div className="mb-3 space-y-1">
                                        {activationPackage.features.slice(0, 3).map((feature, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-[10px] text-gray-600 dark:text-zinc-300 font-semibold">
                                                <Check size={12} className="text-blue-500 dark:text-blue-400 flex-shrink-0" /> {feature}
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => handlePackagePurchase(activationPackage)}
                                        disabled={isPurchased}
                                        className={`w-full py-2.5 rounded-xl text-xs font-heading font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${isPurchased
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                            : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-700 dark:text-blue-300 border border-blue-500/30 hover:border-blue-400/50'
                                        }`}
                                    >
                                        {isPurchased ? '✅ Activated' : '🔓 Activate Wallet — $5'}
                                    </button>
                                </div>
                            );
                        })()}

                        {filteredPackages.map((pkg) => {
                            const Icon = pkg.icon;
                            const isPurchased = purchasedPackages.includes(pkg.id);
                            const estimatedValue = pkg.rzcReward * LISTING_PRICE;
                            
                            // Visuals based on badge type
                            const isPremium = pkg.badge === 'Premium' || pkg.badge === 'Elite' || pkg.badge === 'Ultimate' || pkg.badge === 'Best Value';
                            
                            return (
                                <div key={pkg.id} className={`relative bg-white dark:bg-[#0a0a0a]/90 backdrop-blur-xl border-2 rounded-2xl p-5 transition-all duration-300 ${isPurchased ? 'border-emerald-500/30' : isPremium ? 'border-amber-400/50 shadow-[0_0_20px_rgba(251,191,36,0.15)] hover:border-amber-400' : 'border-gray-200 dark:border-white/10 hover:border-blue-500/40'} ${!isPurchased && 'hover:-translate-y-1'}`}>
                                    {/* Badge / Scarcity Label */}
                                    {pkg.badge && !isPurchased && (
                                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                                            <div className={`px-4 py-1 rounded-full text-[10px] font-heading font-black uppercase tracking-widest text-white shadow-lg whitespace-nowrap ${
                                                pkg.badge === 'Best Value' ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 
                                                pkg.badge === 'Popular' ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 
                                                'bg-gradient-to-r from-purple-500 to-pink-500'
                                            }`}>
                                                {pkg.badge}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-start mb-4 mt-2">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${pkg.gradient} flex items-center justify-center shadow-inner shrink-0`}>
                                                <Icon size={24} className="text-white drop-shadow-md" />
                                            </div>
                                            <div className="flex flex-col">
                                                <h3 className="text-base font-heading font-black text-gray-900 dark:text-white leading-none mb-1">{pkg.tierName}</h3>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-numbers font-black text-emerald-600 dark:text-emerald-400">{pkg.rzcReward.toLocaleString()} RZC</span>
                                                    <span className="text-[10px] text-gray-500 dark:text-zinc-500 font-heading font-bold uppercase tracking-wider">
                                                        Listing Value: <span className="text-emerald-500 font-black">${estimatedValue.toLocaleString()}</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col justify-end shrink-0">
                                            <span className="text-2xl font-numbers font-black text-gray-900 dark:text-white leading-none">${pkg.pricePoint.toLocaleString()}</span>
                                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-heading font-black uppercase tracking-widest mt-1 bg-emerald-500/10 px-1.5 py-0.5 rounded w-fit self-end">
                                               +{(((estimatedValue - pkg.pricePoint) / pkg.pricePoint) * 100).toFixed(0)}% ROI
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-slate-50 dark:bg-white/[0.02] rounded-xl p-3 mb-4 space-y-2 border border-slate-100 dark:border-white/5">
                                        {pkg.directReferralBonus > 0 && (
                                            <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md w-fit">
                                                <Percent size={12} className="shrink-0" /> {pkg.directReferralBonus}% Direct Referral
                                            </div>
                                        )}
                                        {pkg.features.map((feature, idx) => (
                                            <div key={idx} className="flex items-start gap-2 text-[11px] text-gray-700 dark:text-zinc-300 font-medium leading-snug">
                                                <Sparkles size={12} className="text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" /> <span>{feature}</span>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <button
                                        onClick={() => handlePackagePurchase(pkg)}
                                        disabled={isPurchased}
                                        className={`w-full py-3 rounded-xl text-xs font-heading font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 ${isPurchased
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 cursor-not-allowed'
                                            : isPremium
                                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black shadow-lg shadow-amber-500/25 border border-amber-400/50'
                                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 border border-blue-500'
                                        }`}
                                    >
                                        {isPurchased ? (
                                            <><CheckCircle2 size={16} /> Secured</>
                                        ) : (
                                            <>Secure Allocation <ArrowRight size={14} /></>
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : activeSubTab === 'buy' ? (
                <div className="px-3 py-6 space-y-5">

                    {/* ── 1. WHAT IS RZC (Concise) ── */}
                    <div className="flex items-start gap-3 p-4 bg-slate-100/50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-2xl">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Info size={14} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-xs font-heading font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1">Seed Round Allocation</p>
                            <p className="text-[11px] text-slate-600 dark:text-zinc-400 font-medium leading-relaxed">
                                Acquire <span className="font-bold text-slate-900 dark:text-white">RhizaCore (RZC)</span> tokens at the lowest possible seed price before the public listing.
                            </p>
                        </div>
                    </div>

                    {/* ── 2. ROUND PROGRESS & UPSIDE (Scarcity + Motivation) ── */}
                    <div className="relative overflow-hidden bg-white dark:bg-[#0a0a0a] border-2 border-slate-200 dark:border-white/5 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-[10px] font-heading font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-1">{activeRound.round_name} Live</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-numbers font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">${RZC_PRICE_USD}</span>
                                    <span className="text-[10px] font-heading text-slate-500 dark:text-zinc-500 font-bold uppercase tracking-wider">Current Price</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-heading font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-1">Target Listing</p>
                                <div className="flex items-baseline gap-2 justify-end">
                                    <span className="text-xl font-numbers font-black text-slate-900 dark:text-white tracking-tighter">${LISTING_PRICE.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-[10px] font-heading font-black uppercase tracking-widest">
                                <span className="text-slate-500 dark:text-zinc-400">Sold: {Math.min(roundProgress, 100).toFixed(1)}%</span>
                                {isSoldOut ? (
                                    <span className="text-red-500 dark:text-red-400">SOLD OUT</span>
                                ) : (
                                    <span className="text-emerald-600 dark:text-emerald-400">Remaining: {Math.max(0, 100 - roundProgress).toFixed(1)}%</span>
                                )}
                            </div>
                            <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                <div
                                    ref={barRef}
                                    style={{ transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
                                    className={`h-full rounded-full ${isSoldOut ? 'bg-red-500' : 'bg-emerald-500'}`}
                                />
                            </div>
                        </div>
                        
                        {/* Timeline */}
                        <div className="flex items-center justify-between text-[9px] font-heading font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest border-t border-slate-100 dark:border-white/5 pt-3">
                            <span className="text-emerald-600 dark:text-emerald-400">Seed</span>
                            <span>→</span>
                            <span>Round 2 (${NEXT_ROUND_PRICE})</span>
                            <span>→</span>
                            <span>Listing (${LISTING_PRICE.toFixed(2)})</span>
                        </div>
                    </div>

                    {/* ── 3. PURCHASE WIDGET (Swap Style) ── */}
                    <div className="bg-white dark:bg-[#0a0a0a] border-2 border-slate-200 dark:border-white/5 rounded-2xl p-4 sm:p-5">
                        
                        {/* You Pay Section */}
                        <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-xl p-4 mb-2">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[10px] font-heading font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest">You Pay</label>
                                <div className="flex flex-wrap items-center gap-1 justify-end">
                                    <button
                                        onClick={() => { setPaymentMethod('TON'); setInputMode('ton'); setCustomAmountStr('0.5'); }}
                                        className={`px-2 py-1 rounded-md text-[10px] font-heading font-black uppercase tracking-widest transition-colors ${paymentMethod === 'TON' ? 'bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-zinc-500'}`}
                                    >TON</button>
                                    <button
                                        onClick={() => { setPaymentMethod('USDT'); setInputMode('ton'); setCustomAmountStr('5'); }}
                                        className={`px-2 py-1 rounded-md text-[10px] font-heading font-black uppercase tracking-widest transition-colors ${paymentMethod === 'USDT' ? 'bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-zinc-500'}`}
                                    >USDT (TON)</button>
                                    <button
                                        onClick={() => { setPaymentMethod('TRX'); setInputMode('ton'); setCustomAmountStr('50'); }}
                                        className={`px-2 py-1 rounded-md text-[10px] font-heading font-black uppercase tracking-widest transition-colors ${paymentMethod === 'TRX' ? 'bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-zinc-500'}`}
                                    >TRX</button>
                                    <button
                                        onClick={() => { setPaymentMethod('USDT_TRC20'); setInputMode('ton'); setCustomAmountStr('5'); }}
                                        className={`px-2 py-1 rounded-md text-[10px] font-heading font-black uppercase tracking-widest transition-colors ${paymentMethod === 'USDT_TRC20' ? 'bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-zinc-500'}`}
                                    >USDT (TRC20)</button>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    value={inputMode === 'ton' ? customAmountStr : (paymentMethod === 'TON' ? costTon.toFixed(2) : paymentMethod === 'USDT' || paymentMethod === 'USDT_TRC20' ? costUsdt.toFixed(2) : costTrx.toFixed(2))}
                                    step={paymentMethod === 'TON' ? '0.01' : paymentMethod === 'TRX' ? '1' : '0.1'}
                                    min={paymentMethod === 'TON' ? MIN_TON : '1'}
                                    onChange={(e) => {
                                        setInputMode('ton');
                                        setCustomAmountStr(e.target.value);
                                    }}
                                    placeholder="0.00"
                                    className="flex-1 w-full bg-transparent border-none text-3xl font-numbers font-black text-slate-900 dark:text-white outline-none p-0"
                                />
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-black rounded-lg border border-slate-200 dark:border-white/10 shadow-sm flex-shrink-0">
                                    {paymentMethod === 'TON' ? <Wallet size={16} className="text-blue-500" /> : paymentMethod === 'TRX' ? <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/tron/info/logo.png" className="w-4 h-4" /> : <CreditCard size={16} className="text-emerald-500" />}
                                    <span className="text-sm font-heading font-black text-slate-900 dark:text-white uppercase tracking-widest">{paymentMethod === 'USDT_TRC20' ? 'USDT' : paymentMethod}</span>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between mt-3">
                                <p className="text-[10px] font-numbers font-bold text-slate-500 dark:text-zinc-500">
                                    ≈ ${costUsd.toFixed(2)}
                                </p>
                                <p className="text-[10px] font-heading font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest">
                                    Balance: {paymentMethod === 'TON' ? `${effectiveTonBalance.toFixed(2)} TON` : paymentMethod === 'USDT' ? `${effectiveUsdtBalance.toFixed(2)} USDT` : paymentMethod === 'TRX' ? `${effectiveTrxBalance.toFixed(2)} TRX` : `${effectiveUsdtTrc20Balance.toFixed(2)} USDT (TRC20)`}
                                </p>
                            </div>
                        </div>

                        {/* Swap Divider */}
                        <div className="flex justify-center -my-3 relative z-10">
                            <div className="w-8 h-8 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-full flex items-center justify-center">
                                <ArrowDownUp size={14} className="text-slate-400" />
                            </div>
                        </div>

                        {/* You Receive Section */}
                        <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-xl p-4 mt-2 mb-4">
                            <label className="text-[10px] font-heading font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest block mb-2">You Receive</label>
                            
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    value={inputMode === 'rzc' ? customAmountStr : finalAmount > 0 ? Number(finalAmount.toFixed(2)).toString() : ''}
                                    onChange={(e) => {
                                        setInputMode('rzc');
                                        setCustomAmountStr(e.target.value);
                                    }}
                                    placeholder="0"
                                    className="flex-1 w-full bg-transparent border-none text-3xl font-numbers font-black text-emerald-600 dark:text-emerald-400 outline-none p-0"
                                />
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-black rounded-lg border border-slate-200 dark:border-white/10 shadow-sm flex-shrink-0">
                                    <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-[8px] text-white font-bold">R</span>
                                    <span className="text-sm font-heading font-black text-slate-900 dark:text-white uppercase tracking-widest">RZC</span>
                                </div>
                            </div>
                            
                            {bonus > 0 && (
                                <div className="mt-2 flex items-center gap-1.5 text-[10px] font-heading font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                                    <Gift size={12} /> Includes +{bonus}% Bonus
                                </div>
                            )}
                        </div>
                        
                        {/* Presets */}
                        <div className="flex items-center gap-2 mb-5">
                            {[
                                { label: '500 RZC', amount: '500' },
                                { label: '1K RZC', amount: '1000' },
                                { label: '2.5K RZC (+5%)', amount: '2500' },
                                { label: '10K RZC (+15%)', amount: '10000' }
                            ].map((preset) => (
                                <button
                                    key={preset.amount}
                                    onClick={() => { setInputMode('rzc'); setCustomAmountStr(preset.amount); }}
                                    className="flex-1 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-[9px] font-heading font-black uppercase tracking-widest text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>

                        {/* Action Button */}
                        {!currentTonAddress ? (
                            <button
                                onClick={() => navigate('/wallet/login')}
                                className="w-full py-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-black rounded-xl text-sm font-heading font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shadow-sm"
                            >
                                Connect Wallet
                            </button>
                        ) : (
                            <>
                                {hasInsufficientBalance && finalAmount > 0 && !belowMinimum ? (
                                    <button
                                        onClick={() => navigate('/wallet/receive')}
                                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-heading font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        Deposit {paymentMethod === 'USDT_TRC20' ? 'USDT or TRX' : paymentMethod} to Continue
                                    </button>
                                ) : (
                                    <button
                                        onClick={handlePurchase}
                                        disabled={isProcessing || finalAmount <= 0 || belowMinimum || hasInsufficientBalance}
                                        className="relative w-full h-14 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-emerald-500 disabled:hover:to-cyan-500 rounded-xl text-sm font-heading font-black uppercase tracking-widest text-black shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] overflow-hidden group"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                                        {isProcessing ? (
                                            <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin relative z-10" />
                                        ) : (
                                            <>
                                                <span className="relative z-10">
                                                    {!walletActivated && costUsd >= 5 ? 'Buy RZC + Activate Wallet' : 'Buy RZC Now'}
                                                </span>
                                                <ArrowRight size={18} className="relative z-10" />
                                            </>
                                        )}
                                    </button>
                                )}
                            </>
                        )}
                        
                        {/* Auto-activation notice */}
                        {!walletActivated && costUsd >= 5 && (
                            <div className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg mt-3">
                                <Sparkles size={12} className="text-emerald-600 dark:text-emerald-400" />
                                <p className="text-xs font-heading font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-widest">
                                    Wallet will be auto-activated with this purchase!
                                </p>
                            </div>
                        )}

                        {/* Trust badges */}
                        <div className="grid grid-cols-3 gap-2 mt-4">
                            {[
                                { icon: '⚡', label: 'Instant' },
                                { icon: '🔒', label: 'Non-Custodial' },
                                sponsorWallet
                                    ? { icon: '🎁', label: '10% Referral' }
                                    : { icon: '🌐', label: 'On-Chain' },
                            ].map(b => (
                                <div key={b.label} className="flex flex-col items-center gap-1 py-2 bg-gray-100 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-xl">
                                    <span className="text-base">{b.icon}</span>
                                    <span className="text-[10px] font-heading font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">{b.label}</span>
                                </div>
                            ))}
                        </div>

                        {/* Info note */}
                        <div className="flex items-start gap-2.5 p-3 bg-blue-500/5 border border-blue-500/15 rounded-lg mt-4">
                            <Info size={12} className="text-blue-400 flex-shrink-0 mt-0.5" />
                            <p className="text-[10px] font-heading font-black text-gray-500 dark:text-zinc-500 uppercase tracking-widest leading-relaxed">
                                Min. {MIN_TON} TON · Instant delivery · Price rises when round closes
                            </p>
                        </div>
                    </div>

                    {/* ── 4. RECENT BUYERS FOMO ── */}
                    {(recentPurchases.length > 0 || true) && (
                        <div className="bg-white dark:bg-[#0a0a0a] border-2 border-slate-200 dark:border-white/5 rounded-2xl p-5 overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                <Activity size={80} className="text-emerald-500" />
                            </div>
                            
                            <h3 className="text-sm font-heading font-black text-gray-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Users size={14} className="text-blue-500 dark:text-blue-400" />
                                Live Store Buyers
                                <span className="relative flex h-2 w-2 ml-1">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                            </h3>
                            
                            <div className="space-y-3 relative z-10">
                                {(recentPurchases.length > 0 ? recentPurchases : [
                                    { wallet_address: 'EQC3x...9aF1', rzc_amount: 5000, created_at: new Date(Date.now() - 2 * 60000).toISOString() },
                                    { wallet_address: 'EQB1y...2bE4', rzc_amount: 12500, created_at: new Date(Date.now() - 7 * 60000).toISOString() },
                                    { wallet_address: 'EQA4z...7cD2', rzc_amount: 2000, created_at: new Date(Date.now() - 14 * 60000).toISOString() },
                                    { wallet_address: 'EQD9w...4fB8', rzc_amount: 25000, created_at: new Date(Date.now() - 21 * 60000).toISOString() },
                                    { wallet_address: 'EQE2v...1hG5', rzc_amount: 8000, created_at: new Date(Date.now() - 35 * 60000).toISOString() },
                                ]).map((purchase, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                                <Wallet size={12} className="text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-numbers font-black text-slate-900 dark:text-white tracking-tight">
                                                    {purchase.wallet_address ? `${purchase.wallet_address.substring(0, 4)}...${purchase.wallet_address.substring(purchase.wallet_address.length - 4)}` : 'Unknown'}
                                                </p>
                                                <p className="text-[9px] font-heading font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                                                    {timeAgo(purchase.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-numbers font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">
                                                +{Number(purchase.rzc_amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} RZC
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                </div>
            ) : (
                /* ── GUIDE TAB ── */
                <div className="px-3 py-6 space-y-8">

                    {/* ── FUND VIA RHIZAWALLET CALLOUT ── */}
                    <div className="relative overflow-hidden rounded-2xl border border-blue-500/25 bg-gradient-to-br from-blue-50 dark:from-blue-950/50 via-white dark:via-black to-blue-50 dark:to-blue-950/20 p-5">
                        <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
                        <div className="flex items-start gap-3 mb-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center flex-shrink-0">
                                <Wallet size={16} className="text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-xs font-heading font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Also accepted</p>
                                <p className="text-base font-heading font-black text-gray-900 dark:text-white leading-snug">Buy RZC using your RhizaWallet TON Balance</p>
                            </div>
                        </div>
                        <p className="text-sm font-body text-gray-600 dark:text-zinc-300 leading-relaxed mb-4">
                            You don't need an external wallet. Simply fund your <span className="text-gray-900 dark:text-white font-semibold">RhizaCore TON balance</span> — go to <span className="text-blue-600 dark:text-blue-300 font-semibold">Wallet → Deposit TON</span> — then come back here and pay directly from your in-app balance.
                        </p>
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            {[
                                { step: '1', label: 'Go to Wallet' },
                                { step: '2', label: 'Deposit TON' },
                                { step: '3', label: 'Buy RZC Here' },
                            ].map(s => (
                                <div key={s.step} className="bg-blue-500/8 border border-blue-500/15 rounded-xl p-3 text-center">
                                    <p className="text-lg font-numbers font-black text-blue-500 dark:text-blue-400 mb-1">{s.step}</p>
                                    <p className="text-xs font-heading text-gray-700 dark:text-zinc-300 font-black uppercase tracking-widest">{s.label}</p>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => navigate('/wallet/receive')}
                            className="relative w-full h-12 bg-blue-600/20 hover:bg-blue-600/30 border-2 border-blue-500/30 hover:border-blue-500/50 rounded-xl text-sm font-heading font-black uppercase tracking-widest text-blue-300 flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] overflow-hidden group"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                            <QrCode size={16} className="relative z-10" /> 
                            <span className="relative z-10">View Deposit Address & QR Code</span>
                        </button>
                    </div>

                    {/* How to Buy — Timeline */}
                    <section>
                        <h3 className="text-sm font-heading font-black text-gray-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                            <ShoppingBag size={14} className="text-blue-500 dark:text-blue-400" />
                            How to Purchase RZC
                        </h3>
                        <div className="relative pl-6">
                            <div className="absolute left-[9px] top-2 bottom-2 w-px bg-white/5" />
                            <div className="space-y-4">
                                {guideSteps.map((step, idx) => (
                                    <div key={idx} className="relative flex gap-4">
                                        {/* Step number dot */}
                                        <div className="relative z-10 flex flex-col items-center flex-shrink-0">
                                            <div className="w-5 h-5 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center mt-0.5">
                                                <span className="text-[9px] font-numbers font-black text-blue-500 dark:text-blue-400">{idx + 1}</span>
                                            </div>
                                        </div>
                                        <div className="flex-1 bg-gray-100 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-xl p-4 mb-1">
                                            <div className="flex items-center gap-2.5 mb-2">
                                                {step.icon}
                                                <p className="text-sm font-heading font-black text-gray-900 dark:text-white">{step.title}</p>
                                            </div>
                                            <p className="text-sm font-body text-gray-500 dark:text-zinc-400 leading-relaxed mb-3">{step.desc}</p>
                                            {step.action && (
                                                <button
                                                    onClick={() => navigate(step.action!.route)}
                                                    className="flex items-center gap-2 px-3 py-2 bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/25 rounded-lg text-xs font-heading font-black uppercase tracking-widest text-blue-300 transition-all active:scale-95"
                                                >
                                                    <QrCode size={12} />
                                                    {step.action.label} <ArrowRight size={11} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Pricing Roadmap */}
                    <section>
                        <h3 className="text-sm font-heading font-black text-gray-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                            <TrendingUp size={14} className="text-blue-500 dark:text-blue-400" />
                            Price Roadmap
                        </h3>
                        <div className="space-y-2">
                            {[
                                { stage: 'Seed Round', price: `$${RZC_PRICE_USD}`, mult: '1x — Entry', active: true },
                                { stage: 'Round 2', price: `$${NEXT_ROUND_PRICE}`, mult: '1.5x', active: false },
                                { stage: 'Round 3', price: `$${getRoundPrice(3)}`, mult: '2.1x', active: false },
                                { stage: 'Exchange Listing', price: '$1.00+', mult: `${multiplier}x+`, active: false },
                            ].map((item) => (
                                <div
                                    key={item.stage}
                                    className={`flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all ${item.active ? 'bg-blue-600/10 border-blue-500/30' : 'bg-gray-100 dark:bg-white/[0.02] border-gray-200 dark:border-white/5'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        {item.active
                                            ? <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                            : <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-zinc-600" />
                                        }
                                        <span className={`text-sm font-heading font-black ${item.active ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-zinc-400'}`}>
                                            {item.stage}
                                        </span>
                                        {item.active && <span className="text-xs font-heading text-blue-500 dark:text-blue-400 font-black uppercase tracking-widest">← You are here</span>}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs font-heading font-black ${item.active ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-zinc-500'}`}>
                                            {item.mult}
                                        </span>
                                        <span className={`text-sm font-numbers font-black tracking-tight ${item.active ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-zinc-400'}`}>
                                            {item.price}
                                        </span>
                                        {item.active && <ChevronRight size={12} className="text-blue-600 dark:text-blue-400" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Volume Bonuses */}
                    <section>
                        <h3 className="text-sm font-heading font-black text-gray-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Star size={14} className="text-amber-500 dark:text-amber-400" />
                            Volume Bonuses
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { threshold: '2,500+ RZC', bonus: '+5%', desc: 'Standard bulk' },
                                { threshold: '10,000+ RZC', bonus: '+15%', desc: 'Whale tier' },
                            ].map((item) => (
                                <div key={item.threshold} className="bg-gray-100 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-xl p-4 text-center">
                                    <p className="text-xs font-heading text-gray-500 dark:text-zinc-400 font-black uppercase tracking-widest mb-2">{item.threshold}</p>
                                    <p className="text-2xl font-numbers font-black text-amber-500 dark:text-amber-400 tracking-tighter mb-1">{item.bonus}</p>
                                    <p className="text-xs font-heading text-gray-400 dark:text-zinc-500 font-black uppercase tracking-widest">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Security Note */}
                    <section>
                        <div className="flex items-start gap-3 p-4 bg-gray-100 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-xl">
                            <Shield size={16} className="text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-heading font-black text-gray-900 dark:text-white mb-1">Secure & Non-Custodial</p>
                                <p className="text-sm font-body text-gray-500 dark:text-zinc-400 leading-relaxed">
                                    All transactions are executed on-chain via the TON blockchain. RhizaCore never holds your keys —
                                    your wallet, your funds. Tokens are credited automatically after confirmation.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* CTA */}
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 rounded-xl blur-md opacity-60 group-hover:opacity-90 transition-opacity" />
                        <button
                            onClick={() => setActiveSubTab('buy')}
                            className="relative w-full h-14 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 rounded-xl text-sm font-heading font-black uppercase tracking-widest text-black shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] overflow-hidden group"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                            <span className="relative z-10">Secure RZC at Seed Price</span>
                            <ArrowRight size={18} className="relative z-10" />
                        </button>
                    </div>
                </div>
            )}

            {/* ── STICKY BOTTOM BUY BAR ── */}
            {activeSubTab === 'buy' && (
                <div className=" fixed bottom-0 left-0 right-0 z-40 px-4 pb-5 pt-3 bg-gradient-to-t from-white dark:from-black via-white/95 dark:via-black/95 to-transparent pointer-events-none">
                    <div className="pointer-events-auto max-w-lg mx-auto">
                        {!currentTonAddress ? (
                            <button
                                onClick={() => navigate('/wallet/login')}
                                className="relative w-full h-16 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-2xl text-sm font-heading font-black uppercase tracking-widest text-black shadow-2xl shadow-emerald-500/40 hover:shadow-emerald-500/60 transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] overflow-hidden group"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                                <Zap size={18} className="relative z-10" /> 
                                <span className="relative z-10">Connect Wallet to Buy RZC</span>
                            </button>
                        ) : (
                            <>
                                {/* ✅ ADD DEPOSIT BUTTON FOR INSUFFICIENT BALANCE (STICKY) */}
                                {hasInsufficientBalance && finalAmount > 0 && !belowMinimum ? (
                                    <button
                                        onClick={() => navigate('/wallet/receive')}
                                        className="relative w-full h-16 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 rounded-2xl font-heading font-black text-white shadow-2xl shadow-blue-500/40 hover:shadow-blue-500/60 transition-all duration-200 active:scale-[0.98] overflow-hidden group"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                                        <div className="relative z-10 w-full flex items-center justify-between px-4">
                                            <div className="flex flex-col items-start leading-none gap-2">
                                                <span className="text-[10px] font-numbers font-black opacity-70 uppercase tracking-widest">
                                                    Need {paymentMethod === 'TON' ? (costTon - effectiveTonBalance).toFixed(4) + ' more TON' : paymentMethod === 'USDT' ? (costUsdt - effectiveUsdtBalance).toFixed(2) + ' more USDT' : paymentMethod === 'TRX' ? (costTrx - effectiveTrxBalance).toFixed(2) + ' more TRX' : 'more USDT/TRX'}
                                                </span>
                                                <span className="text-sm font-heading font-black uppercase tracking-widest">Deposit {paymentMethod === 'USDT_TRC20' ? 'USDT/TRX' : paymentMethod} to Continue</span>
                                            </div>
                                            <Wallet size={22} className="flex-shrink-0" />
                                        </div>
                                    </button>
                                ) : (
                                    <button
                                        onClick={handlePurchase}
                                        disabled={isProcessing || finalAmount <= 0 || belowMinimum || hasInsufficientBalance}
                                        className="relative w-full h-16 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-emerald-500 disabled:hover:to-cyan-500 rounded-2xl font-heading font-black text-black shadow-2xl shadow-emerald-500/40 hover:shadow-emerald-500/60 transition-all duration-200 active:scale-[0.98] overflow-hidden group"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                                        {isProcessing ? (
                                            <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin relative z-10" />
                                        ) : (
                                            <div className="relative z-10 w-full flex items-center justify-between px-4">
                                                <div className="flex flex-col items-start leading-none gap-2">
                                                    <span className="text-[10px] font-numbers font-black opacity-70 uppercase tracking-widest">
                                                        {finalAmount > 0 ? `${totalRZC.toLocaleString(undefined,{maximumFractionDigits:0})} RZC · ${costTon.toFixed(3)} TON` : 'Enter amount above'}
                                                    </span>
                                                    <span className="text-sm font-heading font-black uppercase tracking-widest">Secure My Allocation Now</span>
                                                </div>
                                                <ArrowRight size={22} className="flex-shrink-0" />
                                            </div>
                                        )}
                                    </button>
                                )}
                            </>
                        )}
                        {finalAmount > 0 && !belowMinimum && (
                            <p className="text-center text-[10px] text-gray-400 dark:text-zinc-600 font-body font-medium mt-1.5">
                                Price rises to ${NEXT_ROUND_PRICE} when round closes · You save ${((NEXT_ROUND_PRICE - RZC_PRICE_USD) * totalRZC).toFixed(2)} buying now
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StoreUI;
