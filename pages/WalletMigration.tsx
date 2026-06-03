import React from 'react';
import { AlertCircle, Lock } from 'lucide-react';

const WalletMigration: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto space-y-6 page-enter px-3 sm:px-4 md:px-0 pb-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-950 dark:text-white">
          Wallet Migration
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Migration period has ended
        </p>
      </div>

      {/* Closed Notice */}
      <div className="p-6 bg-gray-50 dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-2xl">
        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 bg-gray-200 dark:bg-white/10 rounded-xl">
            <Lock size={24} className="text-gray-600 dark:text-gray-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-950 dark:text-white mb-2">
              Migration Period Closed
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              The wallet migration period from pre-mine season to mainnet has officially ended. 
              New migration requests are no longer being accepted.
            </p>
          </div>
        </div>

        <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-500/20 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-1">
                Already Submitted a Request?
              </h3>
              <p className="text-xs text-blue-800 dark:text-blue-400 leading-relaxed">
                If you submitted a migration request before the deadline, our team is still processing 
                pending requests. You will be notified once your migration is complete.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="p-4 bg-gray-50 dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 rounded-2xl">
        <h3 className="text-sm font-bold text-gray-950 dark:text-white mb-2">
          Need Help?
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
          If you have questions about your migration status or need assistance, 
          please contact our support team through the Help Center.
        </p>
      </div>
    </div>
  );
};

export default WalletMigration;
