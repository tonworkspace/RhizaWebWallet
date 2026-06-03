/**
 * Example: How to integrate TON payments into ProjectDetail.tsx
 * 
 * This shows the minimal changes needed to add TON payment support
 * alongside existing USDC payments.
 */

import React, { useState } from 'react';
import { TonPresalePayment } from '../components/TonPresalePayment';
import { useWallet } from '../context/WalletContext';

// ══════════════════════════════════════════════════════════════════════════════
// STEP 1: Add payment method state
// ══════════════════════════════════════════════════════════════════════════════

const ProjectDetail: React.FC = () => {
  const { walletAddress } = useWallet();
  const [project, setProject] = useState<LaunchpadProject | null>(null);
  
  // NEW: Payment method selector
  const [paymentMethod, setPaymentMethod] = useState<'usdc' | 'ton'>('ton'); // Default to TON
  
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<{
    txHash: string;
    tokens: number;
    method: 'usdc' | 'ton';
  } | null>(null);

  // ══════════════════════════════════════════════════════════════════════════════
  // STEP 2: Add payment handlers
  // ══════════════════════════════════════════════════════════════════════════════

  const handlePaymentSuccess = (txHash: string, tokensReceived: number) => {
    setSuccessData({
      txHash,
      tokens: tokensReceived,
      method: paymentMethod,
    });
    setShowSuccessModal(true);
    
    // Refresh project data to show updated raised_amount
    fetchProjectData();
  };

  const handlePaymentError = (error: string) => {
    // Show error toast/notification
    console.error('Payment failed:', error);
    alert(error); // Replace with your toast system
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // STEP 3: Add payment method selector UI
  // ══════════════════════════════════════════════════════════════════════════════

  return (
    <div className="container mx-auto p-4">
      {/* ... existing project header ... */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Project details */}
        <div className="lg:col-span-2">
          <ProjectSalesCard project={project} />
          {/* ... other project info ... */}
        </div>

        {/* Right column: Payment section */}
        <div className="space-y-4">
          {/* Payment Method Selector */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-slate-200 dark:border-white/10 shadow-sm p-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Choose Payment Method
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPaymentMethod('ton')}
                className={`py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${
                  paymentMethod === 'ton'
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-lg">💎</span>
                  <span>TON</span>
                </div>
              </button>
              <button
                onClick={() => setPaymentMethod('usdc')}
                className={`py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${
                  paymentMethod === 'usdc'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-lg">💵</span>
                  <span>USDC</span>
                </div>
              </button>
            </div>
          </div>

          {/* Payment Component */}
          {paymentMethod === 'ton' ? (
            <TonPresalePayment
              project={project}
              userAddress={walletAddress}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          ) : (
            <PresaleActionCard
              project={project}
              isWalletConnected={!!walletAddress}
              onConnectWallet={() => {/* ... */}}
            />
          )}
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && successData && (
        <SuccessModal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          amount={successData.method === 'ton' ? 'TON' : 'USDC'}
          tokens={successData.tokens}
          symbol={project.symbol}
          txHash={successData.txHash}
          paymentMethod={successData.method}
        />
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// STEP 4: Update Success Modal to show payment method
// ══════════════════════════════════════════════════════════════════════════════

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: string;
  tokens: number;
  symbol: string;
  txHash?: string;
  paymentMethod: 'usdc' | 'ton';
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  amount,
  tokens,
  symbol,
  txHash,
  paymentMethod,
}) => {
  if (!isOpen) return null;

  // Different explorer URLs based on payment method
  const explorerUrl = paymentMethod === 'ton'
    ? `https://tonviewer.com/transaction/${txHash}`
    : `https://etherscan.io/tx/${txHash}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-slate-200 dark:border-white/10 shadow-2xl max-w-md w-full animate-slideUp text-center p-6">
        <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 size={32} className="text-emerald-500" />
        </div>
        
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Payment Successful!
        </h3>
        
        <div className="bg-slate-50 dark:bg-[#12141A] rounded-lg p-4 mb-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">Payment Method</span>
            <span className="font-semibold text-slate-900 dark:text-white uppercase">
              {paymentMethod}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">Tokens Purchased</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {tokens.toLocaleString()} {symbol}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
          Your tokens will be available for claim after the presale ends.
        </p>

        {txHash && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium mb-4"
          >
            View on Explorer <ExternalLink size={14} />
          </a>
        )}

        <button
          onClick={onClose}
          className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium transition-all text-sm"
        >
          Close
        </button>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// ALTERNATIVE: Tabbed Interface (if you prefer tabs over buttons)
// ══════════════════════════════════════════════════════════════════════════════

const PaymentTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ton' | 'usdc'>('ton');

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
      {/* Tab Headers */}
      <div className="flex border-b border-slate-200 dark:border-white/10">
        <button
          onClick={() => setActiveTab('ton')}
          className={`flex-1 py-3 px-4 font-medium text-sm transition-all ${
            activeTab === 'ton'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-500/10'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          💎 Pay with TON
        </button>
        <button
          onClick={() => setActiveTab('usdc')}
          className={`flex-1 py-3 px-4 font-medium text-sm transition-all ${
            activeTab === 'usdc'
              ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          💵 Pay with USDC
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'ton' ? (
          <TonPresalePayment {...props} />
        ) : (
          <UsdcPresalePayment {...props} />
        )}
      </div>
    </div>
  );
};

export default ProjectDetail;
