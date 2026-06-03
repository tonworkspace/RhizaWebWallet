import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Globe,
  Twitter,
  MessageCircle,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Info,
  X,
  Clock,
  Users,
  Wallet,
  ExternalLink,
  PieChart,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { launchpadService, LaunchpadProject } from '../services/launchpadService';

// ── Types ──────────────────────────────────────────────────────────────────────

interface TimeLeft {
  days: number;
  hours: number;
  mins: number;
  secs: number;
}

// ── Helper Functions ───────────────────────────────────────────────────────────

const calculateTimeLeft = (endDate: string): TimeLeft => {
  const now = new Date().getTime();
  const end = new Date(endDate).getTime();
  const diff = Math.max(0, end - now);

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    mins: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    secs: Math.floor((diff % (1000 * 60)) / 1000),
  };
};

const formatTimeUntilStart = (startDate: string): string => {
  const now = new Date();
  const start = new Date(startDate);
  const diff = start.getTime() - now.getTime();

  if (diff <= 0) return 'Starting soon';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `Starts in ${days}d ${hours}h`;
  return `Starts in ${hours}h`;
};

// ── Shared Components ──────────────────────────────────────────────────────────

const ProgressBar: React.FC<{ current: number; max: number }> = ({ current, max }) => {
  const percent = Math.min(100, (current / max) * 100).toFixed(1);
  return (
    <div className="w-full">
      <div className="flex justify-between text-[11px] mb-1 font-medium text-slate-500 dark:text-slate-400">
        <span>Progress</span>
        <span className="text-slate-600 dark:text-slate-300">{percent}%</span>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-1000 ease-out" 
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex justify-between text-[11px] mt-1 text-slate-500 dark:text-slate-400">
        <span className="font-medium text-slate-700 dark:text-slate-300">{current.toLocaleString()} USDC</span>
        <span>of {max.toLocaleString()}</span>
      </div>
    </div>
  );
};

// ── Success Modal ───────────────────────────────────────────────────────────────

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: string;
  tokens: number;
  symbol: string;
  txHash?: string;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ isOpen, onClose, amount, tokens, symbol, txHash }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-slate-200 dark:border-white/10 shadow-2xl max-w-md w-full animate-slideUp text-center p-6">
        <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 size={32} className="text-emerald-500" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Transaction Submitted</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          You will receive <span className="font-semibold text-slate-900 dark:text-white">{tokens.toLocaleString()} {symbol}</span>
        </p>
        
        {txHash && (
          <a
            href={`https://etherscan.io/tx/${txHash}`}
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

// ── Confirmation Modal ──────────────────────────────────────────────────────────

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  amount: string;
  tokens: number;
  symbol: string;
  rate: number;
  isLoading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  amount,
  tokens,
  symbol,
  rate,
  isLoading = false
}) => {
  if (!isOpen) return null;

  const gasFee = '~$2.50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-slate-200 dark:border-white/10 shadow-2xl max-w-md w-full animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-white/10">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Confirm Purchase</h3>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <div className="bg-slate-50 dark:bg-[#12141A] rounded-lg p-3 space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Amount</span>
              <span className="font-semibold text-slate-900 dark:text-white">{amount} USDC</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">You receive</span>
              <span className="font-semibold text-slate-900 dark:text-white">{tokens.toLocaleString()} {symbol}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Rate</span>
              <span className="font-semibold text-slate-900 dark:text-white">1 USDC = {rate} {symbol}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-slate-200 dark:border-white/10">
              <span className="text-slate-500 dark:text-slate-400">Network Fee</span>
              <span className="font-semibold text-slate-900 dark:text-white">{gasFee}</span>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Info size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-900 dark:text-emerald-300 leading-relaxed">
                Please review the details carefully before confirming.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 border-t border-slate-200 dark:border-white/10">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Processing...
              </>
            ) : (
              'Confirm'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Loading State ───────────────────────────────────────────────────────────────

const LoadingState: React.FC = () => (
  <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] flex items-center justify-center">
    <div className="text-center">
      <Loader2 size={48} className="text-emerald-500 animate-spin mx-auto mb-4" />
      <p className="text-sm text-slate-600 dark:text-slate-400">Loading project details...</p>
    </div>
  </div>
);

// ── Error State ─────────────────────────────────────────────────────────────────

const ErrorState: React.FC<{ message: string; onRetry: () => void; onBack: () => void }> = ({ message, onRetry, onBack }) => (
  <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] flex items-center justify-center p-4">
    <div className="text-center max-w-md">
      <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center mx-auto mb-4">
        <AlertTriangle size={32} className="text-rose-500" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Project Not Found</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{message}</p>
      <div className="flex gap-3 justify-center">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm"
        >
          Back to List
        </button>
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium transition-all text-sm"
        >
          Retry
        </button>
      </div>
    </div>
  </div>
);

// Continue in next part...

// ── Project Sales Card ──────────────────────────────────────────────────────────

interface ProjectSalesCardProps {
  project: LaunchpadProject;
}

const ProjectSalesCard: React.FC<ProjectSalesCardProps> = ({ project }) => {
  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 via-cyan-500 to-teal-500 p-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-white dark:bg-[#1a1a1a] flex items-center justify-center text-2xl font-black shadow-lg">
            {project.logo_url ? (
              <img src={project.logo_url} alt={project.name} className="w-full h-full rounded-xl object-cover" />
            ) : (
              project.symbol.charAt(0)
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white">{project.name}</h2>
            <p className="text-xs text-white/80">{project.tagline}</p>
          </div>
          <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-3 py-1.5">
            <div className={`w-2 h-2 bg-white rounded-full ${project.status === 'live' ? 'animate-pulse' : ''}`} />
            <span className="text-xs font-bold text-white uppercase">{project.status}</span>
          </div>
        </div>
      </div>

      {/* Sale Information */}
      <div className="p-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Sale Information</h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          {[
            ['Presale Address', project.presale_contract_address || 'TBA'],
            ['Token Name', project.name],
            ['Token Symbol', project.symbol],
            ['Total Supply', `${(project.total_supply / 1000000).toFixed(0)}M ${project.symbol}`],
            ['Presale Rate', `1 USDC = ${project.presale_rate} ${project.symbol}`],
            ['Listing Rate', `1 USDC = ${project.listing_rate} ${project.symbol}`],
            ['Soft Cap', `${project.soft_cap.toLocaleString()} USDC`],
            ['Hard Cap', `${project.hard_cap.toLocaleString()} USDC`],
          ].map(([label, value], i) => (
            <div key={i} className="bg-slate-50 dark:bg-[#12141A] rounded-lg p-2.5 border border-slate-200 dark:border-white/10">
              <p className="text-slate-500 dark:text-slate-400 mb-0.5">{label}</p>
              <p className="font-semibold text-slate-900 dark:text-white truncate">{value}</p>
            </div>
          ))}
        </div>

        {/* Social Links */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
          {project.website_url && (
            <a
              href={project.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 bg-slate-50 dark:bg-[#12141A] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg py-2 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
            >
              <Globe size={14} />
              Website
            </a>
          )}
          {project.twitter_url && (
            <a
              href={project.twitter_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 bg-slate-50 dark:bg-[#12141A] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg py-2 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
            >
              <Twitter size={14} />
              Twitter
            </a>
          )}
          {project.telegram_url && (
            <a
              href={project.telegram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 bg-slate-50 dark:bg-[#12141A] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg py-2 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
            >
              <MessageCircle size={14} />
              Telegram
            </a>
          )}
        </div>

        {/* Verification */}
        {project.etherscan_url && (
          <a
            href={project.etherscan_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 mt-2 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
          >
            <ShieldCheck size={14} />
            View on Etherscan
            <ExternalLink size={12} />
          </a>
        )}
      </div>
    </div>
  );
};

// ── Presale Action Card ─────────────────────────────────────────────────────────

interface PresaleActionCardProps {
  project: LaunchpadProject;
  isWalletConnected: boolean;
  onConnectWallet: () => void;
}

const PresaleActionCard: React.FC<PresaleActionCardProps> = ({ project, isWalletConnected, onConnectWallet }) => {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft(project.presale_end));

  // Mock user balance (TODO: Get from wallet)
  const userBalance = 2450;

  // Real-time countdown
  useEffect(() => {
    if (project.status !== 'live') return;

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(project.presale_end));
    }, 1000);

    return () => clearInterval(timer);
  }, [project.presale_end, project.status]);

  const validateAmount = (val: string): string | null => {
    const num = parseFloat(val);
    if (!val || isNaN(num)) return null;
    if (num < project.min_purchase) return `Minimum ${project.min_purchase} USDC`;
    if (num > project.max_purchase) return `Maximum ${project.max_purchase.toLocaleString()} USDC`;
    if (num > userBalance) return 'Insufficient balance';
    if (project.raised_amount + num > project.hard_cap) {
      const remaining = project.hard_cap - project.raised_amount;
      return `Only ${remaining.toFixed(2)} USDC remaining`;
    }
    return null;
  };

  const handleAmountChange = (val: string) => {
    setAmount(val);
    setError(validateAmount(val));
  };

  const handleBuy = () => {
    const validationError = validateAmount(amount);
    if (validationError) {
      setError(validationError);
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    
    try {
      // TODO: Implement blockchain transaction
      // 1. Approve USDC
      // 2. Call presale contract
      // 3. Wait for confirmation
      // 4. Create transaction record in database
      
      // Simulate transaction for now
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setShowConfirmModal(false);
      setShowSuccessModal(true);
      setAmount('');
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
    } finally {
      setIsLoading(false);
    }
  };

  const tokens = amount ? parseFloat(amount) * project.presale_rate : 0;
  const presalePrice = 1 / project.presale_rate;
  const listingPrice = 1 / project.listing_rate;
  const priceIncrease = ((listingPrice - presalePrice) / presalePrice * 100).toFixed(1);

  // If wallet not connected
  if (!isWalletConnected) {
    return (
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-slate-200 dark:border-white/10 shadow-sm p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
          <Wallet size={28} className="text-emerald-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5">Connect Your Wallet</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Connect to participate in the presale
        </p>
        <button
          onClick={onConnectWallet}
          className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium transition-all text-sm"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  // If presale upcoming
  if (project.status === 'upcoming') {
    return (
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-slate-200 dark:border-white/10 shadow-sm p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
          <Clock size={28} className="text-amber-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5">Presale Not Started</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
          {formatTimeUntilStart(project.presale_start)}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Check back when the presale begins
        </p>
      </div>
    );
  }

  // If presale ended
  if (project.status === 'ended' || project.status === 'success') {
    return (
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-slate-200 dark:border-white/10 shadow-sm p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 size={28} className="text-slate-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5">Presale Ended</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          This presale has concluded
        </p>
        {project.status === 'success' && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
            ✓ Soft cap reached
          </p>
        )}
      </div>
    );
  }

  // Active presale
  return (
    <>
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
        {/* Warning header */}
        <div className="bg-emerald-50 dark:bg-emerald-500/10 p-2.5 flex items-center justify-center gap-2 border-b border-emerald-100 dark:border-emerald-500/20">
          <Info size={14} className="text-emerald-600 dark:text-emerald-400" />
          <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300">Verify URL: rhiza.io</span>
        </div>

        <div className="p-4 space-y-4">
          {/* Countdown */}
          <div className="text-center space-y-2.5">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Presale Ends In</p>
            <div className="flex justify-center gap-1.5">
              {[
                { v: String(timeLeft.days).padStart(2, '0'), l: 'DAYS' },
                { v: String(timeLeft.hours).padStart(2, '0'), l: 'HRS' },
                { v: String(timeLeft.mins).padStart(2, '0'), l: 'MIN' },
                { v: String(timeLeft.secs).padStart(2, '0'), l: 'SEC' }
              ].map((t, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-12 h-12 flex items-center justify-center bg-slate-50 dark:bg-[#12141A] rounded-lg border border-slate-200 dark:border-white/10">
                    <span className="text-xl font-bold text-slate-900 dark:text-white">{t.v}</span>
                  </div>
                  <span className="text-[8px] font-medium uppercase tracking-wider text-slate-400 mt-1">{t.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Progress */}
          <div className="pt-1">
            <ProgressBar current={project.raised_amount} max={project.hard_cap} />
          </div>

          {/* Price comparison */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="text-center p-2.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
              <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wide mb-0.5">Presale</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">${presalePrice.toFixed(3)}</p>
            </div>
            <div className="text-center p-2.5 bg-slate-50 dark:bg-[#12141A] rounded-lg border border-slate-200 dark:border-white/10">
              <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mb-0.5">Listing</p>
              <p className="text-lg font-bold text-slate-700 dark:text-slate-300">${listingPrice.toFixed(3)}</p>
            </div>
          </div>
          <p className="text-center text-xs font-medium text-emerald-600 dark:text-emerald-400 -mt-2">
            +{priceIncrease}% at launch
          </p>

          {/* Input */}
          <div className="space-y-2 pt-1">
            <div className="flex justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span>Amount</span>
              <span>Balance: {userBalance.toLocaleString()} USDC</span>
            </div>
            <div className="relative">
              <input
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className={`w-full bg-slate-50 dark:bg-[#12141A] border ${
                  error ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-400' : 'border-slate-200 dark:border-white/10 focus:border-emerald-400 focus:ring-emerald-400'
                } px-3 py-2.5 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-1 transition-all font-medium pr-16 text-sm`}
              />
              <button
                onClick={() => handleAmountChange(String(Math.min(userBalance, project.max_purchase)))}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors uppercase tracking-wider"
              >
                MAX
              </button>
            </div>
            {error && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                <AlertTriangle size={11} /> {error}
              </p>
            )}
            {amount && !error && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 text-right">
                You receive: <span className="font-semibold text-slate-700 dark:text-slate-300">{tokens.toLocaleString()} {project.symbol}</span>
              </p>
            )}
          </div>

          {/* Button */}
          <button
            onClick={handleBuy}
            disabled={!amount || !!error}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-slate-200 disabled:to-slate-200 disabled:dark:from-slate-800 disabled:dark:to-slate-800 disabled:text-slate-400 text-white font-medium py-2.5 rounded-lg transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
          >
            Buy with USDC
          </button>

          {/* Stats */}
          <div className="bg-slate-50 dark:bg-[#12141A] rounded-lg p-3 text-[11px] space-y-2 border border-slate-200 dark:border-white/10">
            <div className="flex justify-between border-b border-slate-200 dark:border-white/10 pb-2">
              <span className="text-slate-500 dark:text-slate-400">Min / Max Buy</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">{project.min_purchase} - {project.max_purchase.toLocaleString()} USDC</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-slate-500 dark:text-slate-400">Contributors</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">{project.participant_count.toLocaleString()}</span>
            </div>
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
            <div className="flex -space-x-1.5">
              {[1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-teal-400 border-2 border-white dark:border-[#1a1a1a]"
                />
              ))}
            </div>
            <span>{project.participant_count.toLocaleString()} investors joined</span>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirm}
        amount={amount}
        tokens={tokens}
        symbol={project.symbol}
        rate={project.presale_rate}
        isLoading={isLoading}
      />

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        amount={amount}
        tokens={tokens}
        symbol={project.symbol}
        txHash="0x1234...5678"
      />
    </>
  );
};

// Continue in next part...

// ── Project Details Tab ─────────────────────────────────────────────────────────

interface ProjectDetailsTabProps {
  project: LaunchpadProject;
}

const ProjectDetailsTab: React.FC<ProjectDetailsTabProps> = ({ project }) => {
  return (
    <div className="space-y-4 text-sm">
      <p className="leading-relaxed text-slate-600 dark:text-slate-400">
        {project.description}
      </p>

      {/* Token Distribution & Vesting in Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Token Distribution Chart */}
        <div className="bg-slate-50 dark:bg-[#12141A] rounded-lg p-4 border border-slate-200 dark:border-white/10">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2 text-sm">
            <PieChart size={16} className="text-emerald-500" />
            Token Distribution
          </h3>
          <div className="space-y-2.5">
            {[
              { label: 'Presale', percent: project.distribution_presale, color: 'bg-emerald-500' },
              { label: 'Liquidity', percent: project.distribution_liquidity, color: 'bg-cyan-500' },
              { label: 'Team', percent: project.distribution_team, color: 'bg-teal-500' },
              { label: 'Marketing', percent: project.distribution_marketing, color: 'bg-emerald-400' },
              { label: 'Reserve', percent: project.distribution_reserve, color: 'bg-slate-500' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{item.percent}%</span>
                </div>
                <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} transition-all duration-1000`} style={{ width: `${item.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vesting Schedule */}
        <div className="bg-gradient-to-br from-emerald-50 to-cyan-50 dark:from-emerald-500/10 dark:to-cyan-500/10 rounded-lg p-4 border border-emerald-100 dark:border-emerald-500/20">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2 text-sm">
            <Clock size={16} className="text-cyan-500" />
            Vesting Schedule
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 dark:text-slate-300">TGE</span>
              <span className="font-medium text-slate-900 dark:text-white bg-white dark:bg-[#1a1a1a] px-2.5 py-0.5 rounded">{project.tge_unlock_percent}%</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 dark:text-slate-300">Monthly ({project.vesting_months}mo)</span>
              <span className="font-medium text-slate-900 dark:text-white bg-white dark:bg-[#1a1a1a] px-2.5 py-0.5 rounded">{project.monthly_unlock_percent}%</span>
            </div>
            <div className="pt-2 border-t border-emerald-200 dark:border-emerald-500/20">
              <p className="text-xs text-cyan-600 dark:text-cyan-400">
                ✓ Full unlock after {project.vesting_months} months
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sale Details Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10">
        <table className="w-full text-left text-xs">
          <tbody>
            {[
              ['Token Name', project.name],
              ['Symbol', project.symbol],
              ['Total Supply', `${(project.total_supply / 1000000).toFixed(0)}M ${project.symbol}`],
              ['Presale Allocation', `${(project.presale_allocation / 1000000).toFixed(0)}M ${project.symbol} (${project.distribution_presale}%)`],
              ['Presale Rate', `1 USDC = ${project.presale_rate} ${project.symbol}`],
              ['Listing Rate', `1 USDC = ${project.listing_rate} ${project.symbol}`],
              ['Soft Cap', `${project.soft_cap.toLocaleString()} USDC`],
              ['Hard Cap', `${project.hard_cap.toLocaleString()} USDC`],
              ['Presale Period', `${new Date(project.presale_start).toLocaleDateString()} - ${new Date(project.presale_end).toLocaleDateString()}`],
              ['Listing Date', project.listing_date ? new Date(project.listing_date).toLocaleDateString() : 'TBA'],
              ['Liquidity Lock', `${project.liquidity_lock_days} days`],
            ].map(([label, val], i) => (
              <tr key={i} className={`border-b border-slate-200 dark:border-white/10 last:border-0 ${i % 2 === 0 ? 'bg-slate-50 dark:bg-[#12141A]' : 'bg-white dark:bg-[#1a1a1a]'}`}>
                <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{label}</td>
                <td className="py-2.5 px-3 font-medium text-right text-slate-900 dark:text-white">{val}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Verification Badges */}
      <div className="flex flex-wrap gap-2">
        {project.kyc_verified && (
          <div className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium px-3 py-1.5 rounded-lg">
            <CheckCircle2 size={14} />
            KYC Verified
          </div>
        )}
        {project.audit_verified && (
          <div className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium px-3 py-1.5 rounded-lg">
            <CheckCircle2 size={14} />
            Audit Verified
          </div>
        )}
        {project.safu_verified && (
          <div className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium px-3 py-1.5 rounded-lg">
            <CheckCircle2 size={14} />
            SAFU Verified
          </div>
        )}
        {project.doxxed && (
          <div className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium px-3 py-1.5 rounded-lg">
            <CheckCircle2 size={14} />
            Doxxed Team
          </div>
        )}
      </div>

      {/* Risk Disclaimer */}
      <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Info size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 dark:text-amber-300">
            <p className="font-medium mb-1">Investment Disclaimer</p>
            <p className="leading-relaxed opacity-90">
              Cryptocurrency investments carry risk. Only invest what you can afford to lose. This is not financial advice. Please do your own research.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────────────────────────

const ProjectDetail: React.FC = () => {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { address, connectWallet } = useWallet();
  
  const [project, setProject] = useState<LaunchpadProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch project data
  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) {
        setError('No project ID provided');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await launchpadService.getProject(projectId);
        
        if (result.success && result.data) {
          setProject(result.data);
        } else {
          setError(result.error || 'Project not found');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load project');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();

    // Refresh every 30 seconds
    const interval = setInterval(fetchProject, 30000);
    return () => clearInterval(interval);
  }, [projectId]);

  const handleBack = () => {
    navigate('/wallet/launchpad-list');
  };

  const handleRetry = () => {
    window.location.reload();
  };

  const handleConnectWallet = () => {
    connectWallet();
  };

  // Loading state
  if (isLoading) {
    return <LoadingState />;
  }

  // Error state
  if (error || !project) {
    return <ErrorState message={error || 'Project not found'} onRetry={handleRetry} onBack={handleBack} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] pb-20 px-4 pt-4">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -1 }}>
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 dark:from-emerald-500/5 dark:to-cyan-500/5 rounded-full blur-[100px]"
          style={{ animation: 'pulse 8s ease-in-out infinite, float 15s ease-in-out infinite' }} />
        <div className="absolute top-1/2 -right-32 w-[500px] h-[500px] bg-gradient-to-l from-cyan-500/10 to-teal-500/10 dark:from-cyan-500/5 dark:to-teal-500/5 rounded-full blur-[120px]"
          style={{ animation: 'pulse 10s ease-in-out infinite, float 20s ease-in-out infinite reverse' }} />
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes float {
            0%, 100% { transform: translateY(0px) translateX(0px) scale(1); }
            25% { transform: translateY(-20px) translateX(10px) scale(1.02); }
            50% { transform: translateY(-10px) translateX(-5px) scale(0.98); }
            75% { transform: translateY(-15px) translateX(8px) scale(1.01); }
          }
        `
      }} />

      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <button
          onClick={handleBack}
          className="p-2 rounded-lg bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300"
        >
          <ChevronLeft size={18} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">{project.name}</h1>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
            {project.tagline}
          </p>
        </div>
        {project.featured && (
          <span className="ml-auto inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-bold px-2 py-1 rounded-full">
            ⭐ FEATURED
          </span>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-4">
          {/* Sales Card */}
          <ProjectSalesCard project={project} />

          {/* Project Details */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-slate-200 dark:border-white/10 shadow-sm p-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">Project Details</h2>
            <ProjectDetailsTab project={project} />
          </div>
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-4">
          <PresaleActionCard 
            project={project} 
            isWalletConnected={!!address}
            onConnectWallet={handleConnectWallet}
          />
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;
