import React, { useState, useEffect } from 'react';
import { useWalletVerification } from '../hooks/useWalletVerification';
import { balanceVerificationService } from '../services/balanceVerificationService';

interface WalletRZCVerificationProps {
  onClose?: () => void;
  className?: string;
}

export const WalletRZCVerification: React.FC<WalletRZCVerificationProps> = ({ 
  onClose, 
  className = '' 
}) => {
  const {
    walletAddress,
    currentRZCBalance,
    userProfile,
    isSubmitting,
    hasActiveRequest,
    verificationStatus,
    error,
    submitRZCVerification,
    checkVerificationStatus,
    canSubmitVerification
  } = useWalletVerification();

  const [formData, setFormData] = useState({
    telegram_username: '',
    old_wallet_address: '',
    claimed_balance: 0,
    additional_notes: '',
    screenshot_url: ''
  });

  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);

  // Check verification status on mount
  useEffect(() => {
    checkVerificationStatus();
  }, [checkVerificationStatus]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleScreenshotUpload = async (file: File) => {
    if (!userProfile?.id) return;

    setUploadingScreenshot(true);
    try {
      const result = await balanceVerificationService.uploadScreenshot(file, userProfile.id);
      
      if (result.success && result.url) {
        setFormData(prev => ({ ...prev, screenshot_url: result.url! }));
      } else {
        alert('Failed to upload screenshot: ' + result.error);
      }
    } catch (error: any) {
      alert('Upload error: ' + error.message);
    } finally {
      setUploadingScreenshot(false);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canSubmitVerification) return;

    const result = await submitRZCVerification(formData);
    setSubmitResult(result);
    
    if (result.success) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose?.();
      }, 3000);
    }
  };

  const discrepancy = formData.claimed_balance - currentRZCBalance;
  const discrepancyAmount = Math.abs(discrepancy);
  
  let priorityLevel = 'Normal';
  let priorityColor = 'text-blue-600 dark:text-blue-400';
  let priorityBg = 'bg-blue-50 dark:bg-blue-500/10';
  if (discrepancyAmount > 10000) {
    priorityLevel = 'Urgent';
    priorityColor = 'text-red-600 dark:text-red-400';
    priorityBg = 'bg-red-50 dark:bg-red-500/10';
  } else if (discrepancyAmount > 1000) {
    priorityLevel = 'High';
    priorityColor = 'text-orange-600 dark:text-orange-400';
    priorityBg = 'bg-orange-50 dark:bg-orange-500/10';
  } else if (discrepancyAmount < 100) {
    priorityLevel = 'Low';
    priorityColor = 'text-gray-600 dark:text-gray-400';
    priorityBg = 'bg-gray-50 dark:bg-gray-500/10';
  }

  if (!walletAddress) {
    return (
      <div className={`bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200 dark:border-red-500/30 rounded-xl p-6 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
            <span className="text-red-500 text-xl">⚠️</span>
          </div>
          <div>
            <h3 className="text-red-800 dark:text-red-300 font-bold text-lg">No Wallet Connected</h3>
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">
              Please connect your wallet to verify your RZC balance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (hasActiveRequest && verificationStatus) {
    const statusInfo = balanceVerificationService.getStatusInfo(verificationStatus.status);
    
    return (
      <div className={`bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-500/30 rounded-xl p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
              <span className="text-2xl">{statusInfo.icon}</span>
            </div>
            <div>
              <h3 className="font-bold text-blue-900 dark:text-blue-100 text-lg">Active Verification Request</h3>
              <p className="text-blue-700 dark:text-blue-300 text-sm">Status: {statusInfo.label}</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200 p-2 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-lg transition-colors"
            >
              ✕
            </button>
          )}
        </div>
        
        <div className="bg-white/60 dark:bg-black/20 rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-blue-600 dark:text-blue-400 font-medium">Claimed Balance:</span>
            <span className="font-bold text-blue-900 dark:text-blue-100">{verificationStatus.claimed_balance?.toLocaleString()} RZC</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-blue-600 dark:text-blue-400 font-medium">Current Balance:</span>
            <span className="font-bold text-blue-900 dark:text-blue-100">{verificationStatus.current_balance?.toLocaleString()} RZC</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-blue-600 dark:text-blue-400 font-medium">Request ID:</span>
            <span className="font-mono text-xs text-blue-800 dark:text-blue-200">{verificationStatus.id}</span>
          </div>
        </div>
        
        {verificationStatus.admin_notes && (
          <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
            <h4 className="font-bold text-blue-900 dark:text-blue-100 text-sm mb-1">Admin Notes:</h4>
            <p className="text-blue-800 dark:text-blue-200 text-sm">{verificationStatus.admin_notes}</p>
          </div>
        )}
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className={`bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-500/30 rounded-xl p-6 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
            <span className="text-green-500 text-2xl">✅</span>
          </div>
          <div>
            <h3 className="font-bold text-green-900 dark:text-green-100 text-lg">
              {submitResult?.success ? 'Request Submitted!' : 'Manual Submission Required'}
            </h3>
            <p className="text-green-700 dark:text-green-300 text-sm">
              {submitResult?.success 
                ? 'Your verification request has been submitted successfully.'
                : 'Please follow the manual submission instructions.'
              }
            </p>
          </div>
        </div>
        
        {submitResult?.request_id && (
          <div className="mt-4 p-3 bg-green-100 dark:bg-green-500/20 rounded-lg">
            <p className="text-green-800 dark:text-green-200 text-sm">
              <span className="font-medium">Request ID:</span> <span className="font-mono">{submitResult.request_id}</span>
            </p>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className={`bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
              <span className="text-white text-xl">🔐</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Verify RZC Balance</h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Submit a request to verify and recover your RZC balance from a previous wallet
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-2 hover:bg-white/50 dark:hover:bg-black/20 rounded-lg transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Current Wallet Info */}
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 rounded-xl p-4 mb-6 border border-gray-200 dark:border-gray-600">
          <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center">
            <span className="mr-2">💎</span>
            Current Wallet Information
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Wallet Address:</span>
              <span className="font-mono text-xs text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700 px-2 py-1 rounded">
                {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Current RZC Balance:</span>
              <span className="font-bold text-lg text-gray-900 dark:text-white">{currentRZCBalance.toLocaleString()} RZC</span>
            </div>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Telegram Username */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Telegram Username *
            </label>
            <input
              type="text"
              value={formData.telegram_username}
              onChange={(e) => handleInputChange('telegram_username', e.target.value)}
              placeholder="@yourusername"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
              required
            />
          </div>

          {/* Old Wallet Address */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Previous Wallet Address *
            </label>
            <input
              type="text"
              value={formData.old_wallet_address}
              onChange={(e) => handleInputChange('old_wallet_address', e.target.value)}
              placeholder="UQA..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 font-mono text-sm transition-colors"
              required
            />
          </div>

          {/* Claimed Balance */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Claimed RZC Balance *
            </label>
            <input
              type="number"
              value={formData.claimed_balance}
              onChange={(e) => handleInputChange('claimed_balance', parseFloat(e.target.value) || 0)}
              placeholder="0"
              min="0"
              step="0.01"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
              required
            />
            
            {formData.claimed_balance > 0 && (
              <div className={`mt-3 p-4 ${priorityBg} border border-gray-200 dark:border-gray-600 rounded-lg`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Discrepancy:</span>
                  <span className={`font-bold ${discrepancy > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    {discrepancy > 0 ? '+' : ''}{discrepancy.toLocaleString()} RZC
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Priority Level:</span>
                  <span className={`font-bold px-3 py-1 rounded-full text-xs ${priorityColor} ${priorityBg}`}>
                    {priorityLevel}
                  </span>
                </div>
              </div>
            )}
          </div>
          {/* Screenshot Upload */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Screenshot (Optional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleScreenshotUpload(file);
              }}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors"
              disabled={uploadingScreenshot}
            />
            {uploadingScreenshot && (
              <p className="text-blue-600 dark:text-blue-400 text-sm mt-2 flex items-center">
                <span className="animate-spin mr-2">⏳</span>
                Uploading screenshot...
              </p>
            )}
            {formData.screenshot_url && (
              <p className="text-green-600 dark:text-green-400 text-sm mt-2 flex items-center">
                <span className="mr-2">✅</span>
                Screenshot uploaded successfully
              </p>
            )}
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              value={formData.additional_notes}
              onChange={(e) => handleInputChange('additional_notes', e.target.value)}
              placeholder="Any additional information that might help with verification..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none transition-colors"
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200 dark:border-red-500/30 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <span className="text-red-500 text-xl mt-0.5">⚠️</span>
                <div className="flex-1">
                  <h4 className="text-red-800 dark:text-red-300 font-bold text-sm mb-2">Submission Error</h4>
                  <div className="text-red-700 dark:text-red-400 text-sm whitespace-pre-line leading-relaxed">{error}</div>
                </div>
              </div>
            </div>
          )}
          {/* Submit Button */}
          <button
            type="submit"
            disabled={!canSubmitVerification || isSubmitting}
            className={`w-full py-4 px-6 rounded-lg font-bold text-lg transition-all transform ${
              canSubmitVerification && !isSubmitting
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin mr-2">⏳</span>
                Submitting...
              </span>
            ) : (
              'Submit Verification Request'
            )}
          </button>
        </form>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-500/30">
          <h4 className="text-blue-900 dark:text-blue-100 font-bold text-sm mb-2 flex items-center">
            <span className="mr-2">📋</span>
            What happens next?
          </h4>
          <ul className="text-blue-800 dark:text-blue-200 text-sm space-y-1">
            <li className="flex items-start">
              <span className="mr-2 mt-0.5">•</span>
              Your request will be reviewed by our team
            </li>
            <li className="flex items-start">
              <span className="mr-2 mt-0.5">•</span>
              We'll verify your previous wallet ownership
            </li>
            <li className="flex items-start">
              <span className="mr-2 mt-0.5">•</span>
              If approved, RZC will be credited to your current wallet
            </li>
            <li className="flex items-start">
              <span className="mr-2 mt-0.5">•</span>
              You'll receive a verification badge
            </li>
            <li className="flex items-start">
              <span className="mr-2 mt-0.5">•</span>
              <span className="font-medium">Processing time: {
                priorityLevel === 'Urgent' ? '2-6 hours' : 
                priorityLevel === 'High' ? '12-24 hours' : 
                priorityLevel === 'Low' ? '48-72 hours' : '24-48 hours'
              }</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};