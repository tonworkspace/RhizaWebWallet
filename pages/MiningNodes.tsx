import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Zap, 
  TrendingUp, 
  Shield, 
  Crown, 
  Check, 
  Sparkles,
  Users,
  Vote,
  Gift,
  ArrowRight,
  Info,
  Wallet as WalletIcon,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { useBalance } from '../hooks/useBalance';

interface NodeTier {
  id: string;
  tier: 'standard' | 'premium' | 'vip';
  tierName: string;
  pricePoint: number;
  activationFee: number;
  miningRate: number;
  revenueShare?: number;
  referralDirect: number;
  referralIndirect: number;
  features: string[];
  badge?: string;
  gradient: string;
  icon: any;
}

const MiningNodes: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { address, network, isActivated } = useWallet();
  const { tonBalance, tonPrice, isLoading: balanceLoading } = useBalance();
  const [selectedTier, setSelectedTier] = useState<'standard' | 'premium' | 'vip'>('standard');
  const [selectedNode, setSelectedNode] = useState<NodeTier | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  // Check if tier was passed from navigation state (e.g., from activation modal)
  useEffect(() => {
    if (location.state?.selectedTier) {
      setSelectedTier(location.state.selectedTier);
      // Clear the state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const nodeTiers: NodeTier[] = [
    // Test Node (Only for testing - 0.5 TON)
    ...(network === 'testnet' ? [{
      id: 'test-001',
      tier: 'standard' as const,
      tierName: 'Test Node',
      pricePoint: 0, // No node price
      activationFee: isActivated ? 0 : 0.5, // No activation fee if already activated
      miningRate: 1,
      referralDirect: 5,
      referralIndirect: 2,
      features: ['Test Activation', 'Minimal Mining', 'For Testing Only', 'Testnet Only'],
      gradient: 'from-green-600 to-emerald-600',
      icon: Zap,
      badge: 'Test'
    }] : []),

    // Activation Only Node - $15 One-Time Fee (from config: PAYMENT_CONFIG.mainnet.activationFeeUSD)
    {
      id: 'activation-only',
      tier: 'standard',
      tierName: 'Wallet Activation',
      pricePoint: 0, // No node purchase, just activation
      activationFee: 15, // $15 (from config: PAYMENT_CONFIG.mainnet.activationFeeUSD)
      miningRate: 0, // No mining rewards
      referralDirect: 0,
      referralIndirect: 0,
      features: [
        'Unlock Full Wallet Access',
        '150 RZC Welcome Bonus',
        'One-Time Payment',
        'Access All Features',
        'Lifetime Activation'
      ],
      gradient: 'from-blue-600 to-indigo-600',
      icon: Shield,
      badge: 'Activation'
    },
    
    // Standard Tier - No activation fee if already activated
    {
      id: 'std-100',
      tier: 'standard',
      tierName: 'Bronze',
      pricePoint: 100,
      activationFee: isActivated ? 0 : 15, // No activation fee if already activated
      miningRate: 10,
      referralDirect: 5,
      referralIndirect: 2,
      features: ['Base Mining Speed', 'Daily Rewards', 'Standard Support', 'Referral Commissions'],
      gradient: 'from-amber-600 to-orange-600',
      icon: Zap
    },
    {
      id: 'std-200',
      tier: 'standard',
      tierName: 'Bronze+',
      pricePoint: 200,
      activationFee: isActivated ? 0 : 15,
      miningRate: 25,
      referralDirect: 5,
      referralIndirect: 2,
      features: ['Enhanced Mining', 'Daily Rewards', 'Standard Support', 'Referral Commissions'],
      gradient: 'from-amber-600 to-orange-600',
      icon: Zap,
      badge: 'Popular'
    },
    {
      id: 'std-300',
      tier: 'standard',
      tierName: 'Silver',
      pricePoint: 300,
      activationFee: isActivated ? 0 : 15,
      miningRate: 40,
      referralDirect: 5,
      referralIndirect: 2,
      features: ['Advanced Mining', 'Daily Rewards', 'Priority Support', 'Referral Commissions'],
      gradient: 'from-gray-400 to-gray-600',
      icon: Zap
    },
    {
      id: 'std-400',
      tier: 'standard',
      tierName: 'Silver+',
      pricePoint: 400,
      activationFee: isActivated ? 0 : 15,
      miningRate: 60,
      referralDirect: 5,
      referralIndirect: 2,
      features: ['Pro Mining', 'Daily Rewards', 'Priority Support', 'Referral Commissions'],
      gradient: 'from-gray-400 to-gray-600',
      icon: Zap
    },
    
    // Premium Tier - $45 tier activation (always charged, separate from wallet activation)
    {
      id: 'prem-500',
      tier: 'premium',
      tierName: 'Gold',
      pricePoint: 500,
      activationFee: 45, // Premium tier activation - always charged
      miningRate: 100,
      referralDirect: 7,
      referralIndirect: 3,
      features: ['2x Mining Power', 'Instant Withdrawals', 'Early Beta Access', 'Premium Support', 'Enhanced Referrals'],
      gradient: 'from-yellow-500 to-amber-600',
      icon: TrendingUp,
      badge: 'Best Value'
    },
    {
      id: 'prem-600',
      tier: 'premium',
      tierName: 'Gold+',
      pricePoint: 600,
      activationFee: 45, // Premium tier activation - always charged
      miningRate: 130,
      referralDirect: 7,
      referralIndirect: 3,
      features: ['2x Mining Power', 'Instant Withdrawals', 'Early Beta Access', 'Premium Support', 'Enhanced Referrals'],
      gradient: 'from-yellow-500 to-amber-600',
      icon: TrendingUp
    },
    {
      id: 'prem-700',
      tier: 'premium',
      tierName: 'Platinum',
      pricePoint: 700,
      activationFee: 45, // Premium tier activation - always charged
      miningRate: 160,
      referralDirect: 7,
      referralIndirect: 3,
      features: ['3x Mining Power', 'Instant Withdrawals', 'Early Beta Access', 'VIP Support', 'Enhanced Referrals'],
      gradient: 'from-cyan-500 to-blue-600',
      icon: TrendingUp
    },
    {
      id: 'prem-1000',
      tier: 'premium',
      tierName: 'Platinum+',
      pricePoint: 1000,
      activationFee: 45, // Premium tier activation - always charged
      miningRate: 250,
      referralDirect: 7,
      referralIndirect: 3,
      features: ['4x Mining Power', 'Instant Withdrawals', 'Early Beta Access', 'VIP Support', 'Enhanced Referrals'],
      gradient: 'from-cyan-500 to-blue-600',
      icon: TrendingUp
    },
    
    // VIP Tier (Shareholders) - $120 tier activation (always charged, separate from wallet activation)
    {
      id: 'vip-2000',
      tier: 'vip',
      tierName: 'Silver Shareholder',
      pricePoint: 2000,
      activationFee: 120, // VIP tier activation - always charged
      miningRate: 400,
      revenueShare: 5,
      referralDirect: 10,
      referralIndirect: 5,
      features: ['5% Revenue Share', 'Governance Rights', 'Exclusive Airdrops', 'NFT Certificate', 'White-Glove Support', 'Private Community'],
      gradient: 'from-purple-600 to-pink-600',
      icon: Crown,
      badge: 'Shareholder'
    },
    {
      id: 'vip-5000',
      tier: 'vip',
      tierName: 'Gold Shareholder',
      pricePoint: 5000,
      activationFee: 120, // VIP tier activation - always charged
      miningRate: 1200,
      revenueShare: 10,
      referralDirect: 10,
      referralIndirect: 5,
      features: ['10% Revenue Share', 'Full Governance Rights', 'Priority Airdrops', 'Gold NFT Certificate', 'Dedicated Support', 'Strategy Calls'],
      gradient: 'from-purple-600 to-pink-600',
      icon: Crown,
      badge: 'Elite'
    },
    {
      id: 'vip-10000',
      tier: 'vip',
      tierName: 'Platinum Shareholder',
      pricePoint: 10000,
      activationFee: 120, // VIP tier activation - always charged
      miningRate: 3000,
      revenueShare: 20,
      referralDirect: 10,
      referralIndirect: 5,
      features: ['20% Revenue Share', 'Full Governance Rights', 'Guaranteed Airdrops', 'Platinum NFT Certificate', 'Core Team Access', 'Quarterly Calls'],
      gradient: 'from-purple-600 to-pink-600',
      icon: Crown,
      badge: 'Ultimate'
    }
  ];

  // If wallet is not activated, only show activation-only and test nodes
  const filteredNodes = isActivated 
    ? nodeTiers.filter(node => node.tier === selectedTier)
    : nodeTiers.filter(node => node.id === 'activation-only' || node.id === 'test-001');

  const handlePurchase = (node: NodeTier) => {
    if (!address) {
      navigate('/wallet/login');
      return;
    }
    setSelectedNode(node);
    setShowPurchaseModal(true);
  };

  return (
    <div className="space-y-6 p-4 sm:p-0">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-950 dark:text-white">
          Mining Nodes
        </h1>
        <p className="text-sm text-gray-700 dark:text-gray-400 font-semibold">
          {isActivated 
            ? 'Choose your mining tier and start earning daily RZC rewards. VIP tiers become ecosystem shareholders with monthly revenue share.'
            : 'Activate your wallet to unlock access to mining nodes and start earning rewards.'
          }
        </p>
      </div>

      {/* Activation Required Banner - Only show when not activated */}
      {!isActivated && (
        <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-600 border-2 border-blue-500 rounded-2xl shadow-xl">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Shield size={24} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-black text-white mb-2">
                Wallet Activation Required
              </h3>
              <p className="text-sm text-blue-100 font-semibold mb-4 leading-relaxed">
                To access mining nodes and start earning rewards, you must first activate your wallet with a one-time $15 payment. This unlocks full access to all ecosystem features.
              </p>
              <div className="flex items-center gap-2 text-xs text-blue-100 font-bold">
                <Check size={14} className="flex-shrink-0" />
                <span>One-time payment</span>
                <span className="text-blue-300">•</span>
                <Check size={14} className="flex-shrink-0" />
                <span>Lifetime access</span>
                <span className="text-blue-300">•</span>
                <Check size={14} className="flex-shrink-0" />
                <span>Unlock all features</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Balance Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-500/10 dark:to-cyan-500/10 border-2 border-blue-200 dark:border-blue-500/20 rounded-xl shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
            <WalletIcon size={20} className="text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-blue-900 dark:text-blue-300">
                Your Wallet Balance
              </h3>
              <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                {network === 'mainnet' ? 'Mainnet' : 'Testnet'}
              </span>
            </div>
            {balanceLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-blue-700 dark:text-blue-400 font-semibold">Loading balance...</span>
              </div>
            ) : (
              <>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-2xl font-black text-blue-950 dark:text-white">
                    {tonBalance.toFixed(4)} TON
                  </span>
                  <span className="text-sm text-blue-700 dark:text-blue-400 font-semibold">
                    ≈ ${(tonBalance * tonPrice).toFixed(2)} USD
                  </span>
                </div>
                {tonBalance < 0.1 && (
                  <div className="flex items-start gap-2 p-3 bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/20 rounded-lg mt-3">
                    <AlertCircle size={16} className="text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-amber-900 dark:text-amber-300 font-bold mb-1">
                        Low Balance - Fund Your Wallet
                      </p>
                      <p className="text-xs text-amber-800 dark:text-amber-400 mb-2">
                        You need TON to purchase mining nodes. Fund your wallet to continue.
                      </p>
                      <button
                        onClick={() => navigate('/wallet/receive')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95"
                      >
                        <ExternalLink size={12} />
                        Get Wallet Address
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tier Selector - Only show when activated */}
      {isActivated && (
        <div className="flex gap-2 p-1 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl shadow-sm">
          <button
            onClick={() => setSelectedTier('standard')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
              selectedTier === 'standard'
                ? 'bg-emerald-600 dark:bg-primary text-white dark:text-black shadow-lg'
                : 'text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
          >
            <Zap size={16} className="inline mr-1.5" />
            Standard
          </button>
          <button
            onClick={() => setSelectedTier('premium')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
            selectedTier === 'premium'
              ? 'bg-emerald-600 dark:bg-primary text-white dark:text-black shadow-lg'
              : 'text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
          }`}
        >
          <TrendingUp size={16} className="inline mr-1.5" />
          Premium
        </button>
        <button
          onClick={() => setSelectedTier('vip')}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
            selectedTier === 'vip'
              ? 'bg-emerald-600 dark:bg-primary text-white dark:text-black shadow-lg'
              : 'text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
          }`}
        >
          <Crown size={16} className="inline mr-1.5" />
          VIP
        </button>
      </div>
      )}

      {/* Info Banner for VIP - Only show when activated */}
      {isActivated && selectedTier === 'vip' && (
        <div className="p-4 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-500/10 dark:to-pink-500/10 border-2 border-purple-300 dark:border-purple-500/20 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center flex-shrink-0">
              <Crown size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-purple-900 dark:text-purple-300 mb-1">
                Become a Shareholder
              </h3>
              <p className="text-xs text-purple-700 dark:text-purple-400 leading-relaxed">
                VIP nodes make you an ecosystem shareholder with monthly revenue distributions, governance rights, and exclusive NFT certificates on TON blockchain.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Section Title */}
      {!isActivated && (
        <div className="space-y-2">
          <h2 className="text-xl font-black text-gray-950 dark:text-white">
            Activate Your Wallet
          </h2>
          <p className="text-sm text-gray-700 dark:text-gray-400 font-semibold">
            Complete the one-time activation to unlock mining nodes and all wallet features.
          </p>
        </div>
      )}

      {/* Node Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredNodes.map((node) => {
          const Icon = node.icon;
          return (
            <div
              key={node.id}
              className="relative group bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-2xl p-5 hover:border-primary/50 dark:hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10"
            >
              {/* Badge */}
              {node.badge && (
                <div className="absolute top-4 right-4">
                  <span className="text-[8px] font-black uppercase tracking-wider bg-primary/10 text-primary px-2 py-1 rounded-full">
                    {node.badge}
                  </span>
                </div>
              )}

              {/* Icon & Title */}
              <div className="flex items-start gap-3 mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${node.gradient} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={24} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-950 dark:text-white">
                    {node.tierName}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold">
                    {node.miningRate > 0 ? `${node.miningRate} RZC/day` : 'No Mining Rewards'}
                  </p>
                </div>
              </div>

              {/* Price */}
              <div className="mb-4 pb-4 border-b-2 border-gray-200 dark:border-white/10">
                {node.pricePoint > 0 ? (
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-gray-950 dark:text-white">
                        ${node.pricePoint}
                      </span>
                      {node.activationFee > 0 ? (
                        <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                          + ${node.activationFee} {node.tier === 'standard' ? 'activation' : 'tier fee'}
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-600 dark:text-primary font-bold">
                          No activation fee
                        </span>
                      )}
                    </div>
                    {isActivated && node.activationFee === 0 && node.tier === 'standard' && (
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1">
                        <Check size={12} />
                        Wallet activated - Pay node price only
                      </p>
                    )}
                    {node.tier === 'premium' && (
                      <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold mt-1">
                        Premium tier includes $45 tier activation fee
                      </p>
                    )}
                    {node.tier === 'vip' && (
                      <p className="text-xs text-purple-700 dark:text-purple-400 font-semibold mt-1">
                        VIP tier includes $120 shareholder activation fee
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-gray-950 dark:text-white">
                        ${node.activationFee}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                        one-time
                      </span>
                    </div>
                    <p className="text-xs text-blue-700 dark:text-blue-400 font-bold mt-1">
                      Activation Only - No Node Purchase
                    </p>
                  </div>
                )}
                {node.revenueShare && (
                  <div className="mt-2 flex items-center gap-2 text-xs font-bold text-purple-700 dark:text-purple-400">
                    <Sparkles size={14} />
                    {node.revenueShare}% Monthly Revenue Share
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="space-y-2 mb-5">
                {node.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-400 font-semibold">
                    <Check size={14} className="text-emerald-600 dark:text-primary flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              {/* Purchase Button */}
              <button
                onClick={() => handlePurchase(node)}
                className="w-full py-3 bg-emerald-600 dark:bg-primary text-white dark:text-black rounded-xl text-sm font-black uppercase tracking-wider hover:bg-emerald-700 dark:hover:bg-[#00dd77] transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
              >
                Purchase Node
                <ArrowRight size={16} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && selectedNode && (
        <PurchaseModal
          node={selectedNode}
          onClose={() => setShowPurchaseModal(false)}
        />
      )}
    </div>
  );
};

// Purchase Modal Component
const PurchaseModal: React.FC<{ node: NodeTier; onClose: () => void }> = ({ node, onClose }) => {
  const { address, network } = useWallet();
  const { tonBalance, tonPrice } = useBalance();
  const [paymentMethod, setPaymentMethod] = useState<'ton' | 'rzc' | 'hybrid'>('ton');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const totalCost = node.pricePoint + node.activationFee;
  const totalCostTON = node.id === 'test-001' || node.id === 'activation-only'
    ? node.activationFee // For test node and activation-only, use activation fee directly as TON amount
    : totalCost / tonPrice; // For other nodes, convert USD to TON
  const hasEnoughBalance = tonBalance >= totalCostTON;

  const handlePurchase = async () => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }

    // Check balance before proceeding
    if (!hasEnoughBalance) {
      setError(`Insufficient balance. You need ${totalCostTON.toFixed(4)} TON but only have ${tonBalance.toFixed(4)} TON.`);
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Import payment configuration
      const { getPaymentAddress, validatePaymentConfig } = await import('../config/paymentConfig');
      const { tonWalletService } = await import('../services/tonWalletService');
      
      // Validate payment configuration
      if (!validatePaymentConfig(network)) {
        throw new Error(`Payment wallet address not configured for ${network}. Please contact support.`);
      }
      
      // Get payment wallet address
      const paymentAddress = getPaymentAddress(network);
      
      console.log(`💳 Processing payment: ${totalCostTON} TON to ${paymentAddress}`);
      
      // Send TON payment (sendTransaction expects amount as string in TON, not nanotons)
      const paymentResult = await tonWalletService.sendTransaction(
        paymentAddress,
        totalCostTON.toString(),
        `RhizaCore ${node.tierName} Purchase`
      );
      
      if (!paymentResult.success || !paymentResult.txHash) {
        throw new Error(paymentResult.error || 'Payment failed');
      }
      
      console.log(`✅ Payment successful: ${paymentResult.txHash}`);

      // Log payment activity
      const { notificationService } = await import('../services/notificationService');
      await notificationService.logActivity(
        address,
        'transaction_sent',
        `Purchased ${node.tierName} - ${totalCostTON.toFixed(4)} TON`,
        {
          node_id: node.id,
          node_name: node.tierName,
          amount_ton: totalCostTON,
          amount_usd: node.pricePoint > 0 ? totalCost : node.activationFee * tonPrice,
          transaction_hash: paymentResult.txHash,
          network: network,
          payment_address: paymentAddress
        }
      );

      // Activate wallet after successful purchase
      const { supabaseService } = await import('../services/supabaseService');
      
      const activated = await supabaseService.activateWallet(address, {
        activation_fee_usd: node.pricePoint > 0 ? totalCost : node.activationFee * tonPrice,
        activation_fee_ton: totalCostTON,
        ton_price: tonPrice,
        transaction_hash: paymentResult.txHash
      });

      if (activated) {
        // Log wallet activation activity
        await notificationService.logActivity(
          address,
          'wallet_created',
          'Wallet activated successfully',
          {
            activation_fee_usd: node.pricePoint > 0 ? totalCost : node.activationFee * tonPrice,
            activation_fee_ton: totalCostTON,
            node_purchased: node.tierName,
            transaction_hash: paymentResult.txHash
          }
        );

        // Award 150 RZC entry reward for activation-only node
        if (node.id === 'activation-only') {
          try {
            // Get user profile to get user ID
            const profileResult = await supabaseService.getProfile(address);
            if (profileResult.success && profileResult.data) {
              const userId = profileResult.data.id;
              
              // Award 150 RZC activation bonus
              const rewardResult = await supabaseService.awardRZCTokens(
                userId,
                150,
                'activation_bonus',
                'Welcome bonus for wallet activation',
                {
                  node_id: node.id,
                  transaction_hash: paymentResult.txHash,
                  activation_fee_usd: node.activationFee * tonPrice,
                  activation_fee_ton: totalCostTON
                }
              );

              if (rewardResult.success) {
                console.log('✅ 150 RZC activation bonus awarded');
                
                // Log the reward activity
                await notificationService.logActivity(
                  address,
                  'reward_claimed',
                  'Received 150 RZC activation bonus',
                  {
                    amount: 150,
                    type: 'activation_bonus',
                    new_balance: rewardResult.newBalance
                  }
                );
              } else {
                console.error('❌ Failed to award activation bonus:', rewardResult.error);
              }
            }
          } catch (rewardError) {
            console.error('❌ Error awarding activation bonus:', rewardError);
            // Don't fail the activation if reward fails
          }
        }

        const successMessage = node.pricePoint > 0 
          ? `🎉 Success! Your ${node.tierName} node has been purchased and your wallet is now activated!`
          : `🎉 Success! Your wallet has been activated! You now have full access to all features and received 150 RZC as a welcome bonus!`;
        alert(successMessage);
        onClose();
        // Refresh the page to update activation status
        window.location.reload();
      } else {
        throw new Error('Failed to activate wallet');
      }
    } catch (err: any) {
      console.error('Purchase error:', err);
      setError(err.message || 'Purchase failed. Please try again.');
      
      // Log failed purchase activity
      try {
        const { notificationService } = await import('../services/notificationService');
        await notificationService.logActivity(
          address,
          'transaction_sent',
          `Failed to purchase ${node.tierName}`,
          {
            node_id: node.id,
            node_name: node.tierName,
            amount_ton: totalCostTON,
            error: err.message,
            network: network
          }
        );
      } catch (logError) {
        console.error('Failed to log error activity:', logError);
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md bg-white dark:bg-[#0a0a0a] border-2 border-gray-300 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b-2 border-gray-200 dark:border-white/10">
          <h2 className="text-xl font-black text-gray-950 dark:text-white">
            {node.pricePoint > 0 ? `Purchase ${node.tierName}` : 'Activate Wallet'}
          </h2>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-semibold">
            {node.pricePoint > 0 
              ? 'Complete your purchase to activate mining'
              : 'One-time payment to unlock full wallet access'
            }
          </p>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-500/10 border-2 border-red-200 dark:border-red-500/20 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 dark:text-red-400 font-semibold">{error}</p>
              </div>
            </div>
          )}

          {/* Wallet Balance */}
          <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-500/20 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider">
                Your Balance ({network === 'mainnet' ? 'Mainnet' : 'Testnet'})
              </span>
              {!hasEnoughBalance && (
                <span className="text-xs font-bold text-red-600 dark:text-red-400">
                  Insufficient
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-blue-950 dark:text-white">
                {tonBalance.toFixed(4)} TON
              </span>
              <span className="text-xs text-blue-700 dark:text-blue-400 font-semibold">
                ≈ ${(tonBalance * tonPrice).toFixed(2)}
              </span>
            </div>
            {!hasEnoughBalance && (
              <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-500/20">
                <p className="text-xs text-blue-800 dark:text-blue-300 font-semibold mb-2">
                  You need {totalCostTON.toFixed(4)} TON (${totalCost}) to purchase this node.
                </p>
                <button
                  onClick={() => {
                    onClose();
                    navigate('/wallet/receive');
                  }}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <WalletIcon size={14} />
                  Fund Wallet
                </button>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl space-y-2">
            {node.pricePoint > 0 ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 font-semibold">Node Price</span>
                  <span className="font-bold text-gray-950 dark:text-white">${node.pricePoint}</span>
                </div>
                {node.activationFee > 0 ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 font-semibold">
                      {node.tier === 'standard' ? 'Activation Fee' : node.tier === 'premium' ? 'Premium Tier Fee' : 'VIP Tier Fee'}
                    </span>
                    <span className="font-bold text-gray-950 dark:text-white">${node.activationFee}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 font-semibold">Activation Fee</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Check size={14} />
                      Wallet Activated
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400 font-semibold">
                  {node.id === 'test-001' ? 'Test Activation Fee' : 'Activation Fee'}
                </span>
                <span className="font-bold text-gray-950 dark:text-white">
                  {node.id === 'test-001' ? `${node.activationFee} TON` : `$${node.activationFee}`}
                </span>
              </div>
            )}
            <div className="pt-2 border-t-2 border-gray-200 dark:border-white/10 space-y-1">
              <div className="flex justify-between">
                <span className="font-bold text-gray-950 dark:text-white">
                  {node.id === 'test-001' || node.id === 'activation-only' ? 'Total' : 'Total (USD)'}
                </span>
                <span className="text-lg font-black text-gray-950 dark:text-white">
                  {node.id === 'test-001' 
                    ? `${totalCostTON} TON`
                    : node.id === 'activation-only'
                    ? `$${totalCost}`
                    : `$${totalCost}`
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-400 font-semibold">
                  {node.id === 'test-001' ? 'Equivalent USD' : 'Total (TON)'}
                </span>
                <span className="text-sm font-bold text-primary">
                  {node.id === 'test-001' 
                    ? `≈ $${(totalCostTON * tonPrice).toFixed(2)}`
                    : `${totalCostTON.toFixed(4)} TON`
                  }
                </span>
              </div>
            </div>
            {node.pricePoint === 0 && (
              <div className="pt-2 border-t border-gray-200 dark:border-white/10">
                <p className="text-xs text-blue-700 dark:text-blue-400 font-semibold">
                  {node.id === 'test-001' 
                    ? '🧪 Test node for testing activation flow on testnet.'
                    : 'ℹ️ This is a one-time activation fee. No mining rewards included.'
                  }
                </p>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-500">
              Payment Method
            </label>
            <div className="space-y-2">
              <button
                onClick={() => setPaymentMethod('ton')}
                className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                  paymentMethod === 'ton'
                    ? 'border-primary bg-primary/10'
                    : 'border-gray-300 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-950 dark:text-white">TON Payment</span>
                  <span className="text-xs text-emerald-600 dark:text-primary font-bold">Secure</span>
                </div>
              </button>
            </div>
          </div>

          {/* Payment Address Info */}
          <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/20 rounded-xl">
            <div className="flex items-start gap-2">
              <AlertCircle size={14} className="text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-amber-900 dark:text-amber-300 font-bold mb-1">
                  Payment will be sent to RhizaCore payment wallet
                </p>
                <p className="text-[10px] text-amber-800 dark:text-amber-400 font-semibold">
                  Your wallet will send {totalCostTON.toFixed(4)} TON to our secure payment address. Transaction will be confirmed on the blockchain.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t-2 border-gray-200 dark:border-white/10 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-200 dark:bg-white/10 text-gray-950 dark:text-white rounded-xl text-sm font-bold hover:bg-gray-300 dark:hover:bg-white/20 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handlePurchase}
            disabled={processing || !hasEnoughBalance}
            className="flex-1 py-3 bg-emerald-600 dark:bg-primary text-white dark:text-black rounded-xl text-sm font-bold hover:bg-emerald-700 dark:hover:bg-[#00dd77] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? 'Processing...' : !hasEnoughBalance ? 'Insufficient Balance' : 'Confirm Purchase'}
          </button>
        </div>
      </div>
    </>
  );
};

export default MiningNodes;
