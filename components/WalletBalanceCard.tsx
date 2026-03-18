import React from 'react';
import { useWallet } from '../context/WalletContext';
import { useRZCBalance } from '../hooks/useRZCBalance';
import { useWalletVerification } from '../hooks/useWalletVerification';
import { VerifyRZCButton } from './VerifyRZCButton';
import { VerificationBadge } from './VerificationBadge';

interface WalletBalanceCardProps {
  className?: string;
  showVerificationOption?: boolean;
  compact?: boolean;
}

export const WalletBalanceCard: React.FC<WalletBalanceCardProps> = ({
  className = '',
  showVerificationOption = true,
  compact = false
}) => {
  const { address, userProfile } = useWallet();
  const { balance, price, usdValue, isLoading, error, refreshBalance } = useRZCBalance();
  const { hasActiveRequest, verificationStatus } = useWalletVerification();

  if (!address) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="text-center">
          <span className="text-gray-500 text-2xl">🔗</span>
          <h3 className="text-gray-700 font-medium mt-2">No Wallet Connected</h3>
          <p className="text-gray-500 text-sm">Connect your wallet to view RZC balance</p>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-lg">💎</span>
            <div>
              <div className="font-semibold text-gray-900">
                {isLoading ? '...' : balance.toLocaleString()} RZC
              </div>
              <div className="text-xs text-gray-500">
                ${isLoading ? '...' : usdValue.toFixed(2)}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <VerificationBadge userId={userProfile?.id} size="sm" />
            {showVerificationOption && (
              <VerifyRZCButton variant="outline" size="sm" />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">💎</span>
            <h2 className="text-lg font-semibold text-gray-900">RZC Balance</h2>
          </div>
          
          <div className="flex items-center space-x-2">
            <VerificationBadge userId={userProfile?.id} />
            <button
              onClick={refreshBalance}
              className="text-gray-400 hover:text-gray-600 p-1"
              title="Refresh balance"
            >
              🔄
            </button>
          </div>
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-red-500">⚠️</span>
              <span className="text-red-700 text-sm">Error loading balance: {error}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Balance Display */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">
                  {isLoading ? '...' : balance.toLocaleString()}
                </div>
                <div className="text-lg text-gray-600">RZC</div>
                <div className="text-sm text-gray-500 mt-1">
                  ≈ ${isLoading ? '...' : usdValue.toFixed(2)} USD
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  @ ${price.toFixed(4)} per RZC
                </div>
              </div>
            </div>

            {/* Wallet Info */}
            <div className="text-sm text-gray-600">
              <div className="flex justify-between items-center">
                <span>Wallet:</span>
                <span className="font-mono text-xs">
                  {address.slice(0, 8)}...{address.slice(-6)}
                </span>
              </div>
            </div>

            {/* Active Verification Request */}
            {hasActiveRequest && verificationStatus && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <div className="flex items-center space-x-2">
                  <span className="text-blue-500">📋</span>
                  <div className="flex-1">
                    <div className="text-blue-900 font-medium text-sm">
                      Active Verification Request
                    </div>
                    <div className="text-blue-700 text-xs">
                      Status: {verificationStatus.status} • 
                      Claimed: {verificationStatus.claimed_balance?.toLocaleString()} RZC
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Verification Option */}
            {showVerificationOption && (
              <div className="pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Missing RZC from a previous wallet?
                  </div>
                  <VerifyRZCButton variant="outline" size="sm" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};