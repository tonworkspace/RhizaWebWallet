import React from 'react';
import { Clock, RefreshCw } from 'lucide-react';
import { useWallet } from '../context/WalletContext';

const SessionTimeoutWarning: React.FC = () => {
  const { sessionTimeRemaining, resetSessionTimer } = useWallet();

  if (!sessionTimeRemaining) return null;

  const minutes = Math.floor(sessionTimeRemaining / 60);
  const seconds = sessionTimeRemaining % 60;

  return (
    <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-amber-500/10 backdrop-blur-xl border border-amber-500/20 rounded-2xl p-6 shadow-2xl max-w-sm">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
            <Clock className="text-amber-500" size={20} />
          </div>
          
          <div className="flex-1 space-y-3">
            <div>
              <h4 className="font-black text-sm text-white mb-1">Session Expiring Soon</h4>
              <p className="text-xs text-amber-400/80 leading-relaxed">
                Your session will expire in{' '}
                <span className="font-black text-amber-500">
                  {minutes}:{seconds.toString().padStart(2, '0')}
                </span>
              </p>
            </div>
            
            <button
              onClick={resetSessionTimer}
              className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 hover:scale-105"
            >
              <RefreshCw size={14} />
              Stay Logged In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionTimeoutWarning;
