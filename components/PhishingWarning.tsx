/**
 * Phishing Warning Component
 * 
 * Displays security warnings and recommendations for transactions
 * Part of Security Issue #20 fix
 */

import React from 'react';
import { AlertTriangle, ShieldCheck, Info, AlertCircle, XCircle } from 'lucide-react';
import { PhishingCheckResult, getSecurityIndicator } from '../utils/phishingProtection';

interface PhishingWarningProps {
  checkResult: PhishingCheckResult;
  onProceed?: () => void;
  onCancel?: () => void;
  showActions?: boolean;
}

const PhishingWarning: React.FC<PhishingWarningProps> = ({
  checkResult,
  onProceed,
  onCancel,
  showActions = false,
}) => {
  const indicator = getSecurityIndicator(checkResult.riskLevel);

  // Don't show anything for completely safe transactions
  if (checkResult.riskLevel === 'safe' && checkResult.warnings.length === 0) {
    return null;
  }

  const getIcon = () => {
    switch (checkResult.riskLevel) {
      case 'safe':
        return <ShieldCheck className="w-5 h-5" />;
      case 'low':
        return <Info className="w-5 h-5" />;
      case 'medium':
        return <AlertCircle className="w-5 h-5" />;
      case 'high':
        return <AlertTriangle className="w-5 h-5" />;
      case 'critical':
        return <XCircle className="w-5 h-5" />;
    }
  };

  return (
    <div
      className={`rounded-xl border-2 ${indicator.borderColor} ${indicator.bgColor} p-4 space-y-3`}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`${indicator.color}`}>{getIcon()}</div>
        <div className="flex-1">
          <h4 className={`font-bold text-sm ${indicator.color}`}>
            Security Check: {indicator.label}
          </h4>
          {checkResult.isInAddressBook && checkResult.addressBookEntry && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              Saved as: {checkResult.addressBookEntry.name}
            </p>
          )}
        </div>
      </div>

      {/* Warnings */}
      {checkResult.warnings.length > 0 && (
        <div className="space-y-2">
          {checkResult.warnings.map((warning, index) => (
            <div
              key={index}
              className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
            >
              <span className="text-xs mt-0.5">•</span>
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {checkResult.recommendations.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            Recommendations:
          </p>
          {checkResult.recommendations.map((recommendation, index) => (
            <div
              key={index}
              className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400"
            >
              <span className="mt-0.5">→</span>
              <span>{recommendation}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {showActions && (
        <div className="flex gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          {checkResult.riskLevel === 'critical' ? (
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm transition-colors"
            >
              Cancel Transaction
            </button>
          ) : (
            <>
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-bold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onProceed}
                className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                  checkResult.riskLevel === 'high'
                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                    : 'bg-primary hover:bg-primary/90 text-black'
                }`}
              >
                {checkResult.riskLevel === 'high' ? 'Proceed Anyway' : 'Continue'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PhishingWarning;
