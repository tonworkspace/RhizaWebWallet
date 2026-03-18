import React, { useState } from 'react';
import { useWalletVerification } from '../hooks/useWalletVerification';
import { WalletRZCVerification } from './WalletRZCVerification';

interface VerifyRZCButtonProps {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showIcon?: boolean;
}

export const VerifyRZCButton: React.FC<VerifyRZCButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  showIcon = true
}) => {
  const [showModal, setShowModal] = useState(false);
  const { 
    walletAddress, 
    currentRZCBalance, 
    hasActiveRequest, 
    verificationStatus,
    canSubmitVerification 
  } = useWalletVerification();

  const getButtonStyles = () => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base'
    };

    const variantStyles = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
      secondary: 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500',
      outline: 'border border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500'
    };

    return `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`;
  };

  const getButtonText = () => {
    if (!walletAddress) return 'Connect Wallet';
    if (hasActiveRequest) return 'View Request';
    return 'Verify RZC Balance';
  };

  const getButtonIcon = () => {
    if (!showIcon) return null;
    
    if (!walletAddress) return '🔗';
    if (hasActiveRequest) return '📋';
    return '🔐';
  };

  const handleClick = () => {
    if (!walletAddress) {
      // Could trigger wallet connection here
      alert('Please connect your wallet first');
      return;
    }
    
    setShowModal(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={getButtonStyles()}
        disabled={!canSubmitVerification && !hasActiveRequest}
      >
        {getButtonIcon() && (
          <span className="mr-2">{getButtonIcon()}</span>
        )}
        {getButtonText()}
        
        {hasActiveRequest && verificationStatus && (
          <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
            {verificationStatus.status}
          </span>
        )}
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <WalletRZCVerification 
              onClose={() => setShowModal(false)}
              className="bg-white rounded-lg shadow-xl"
            />
          </div>
        </div>
      )}
    </>
  );
};