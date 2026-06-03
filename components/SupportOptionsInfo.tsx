import React, { useState, useEffect } from 'react';
import { MessageCircle, Ticket, X, Zap, Clock } from 'lucide-react';

/**
 * SupportOptionsInfo Component
 * 
 * Shows a one-time banner explaining the two support options available.
 * Dismissible and stores preference in localStorage.
 */

const SupportOptionsInfo: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already seen this banner
    const hasSeenBanner = localStorage.getItem('rhiza_support_options_seen');
    if (!hasSeenBanner) {
      // Show banner after 3 seconds
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('rhiza_support_options_seen', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9998] max-w-2xl w-full px-4 animate-in slide-in-from-top-4 fade-in duration-500">
      <div className="bg-white dark:bg-[#0a0a0a] border-2 border-primary/20 rounded-3xl shadow-2xl p-6 backdrop-blur-xl">
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
        >
          <X size={16} className="text-slate-600 dark:text-gray-400" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <MessageCircle size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wide">
              Two Ways to Get Help
            </h3>
            <p className="text-xs text-slate-500 dark:text-gray-500 font-medium">
              Choose the best option for your needs
            </p>
          </div>
        </div>

        {/* Options Grid */}
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          {/* Live Chat Option */}
          <div className="p-4 bg-gradient-to-br from-emerald-50 to-cyan-50 dark:from-emerald-500/10 dark:to-cyan-500/10 border-2 border-emerald-200 dark:border-emerald-500/20 rounded-2xl">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Zap size={16} className="text-white" />
              </div>
              <div>
                <h4 className="text-sm font-black text-emerald-900 dark:text-emerald-300 uppercase tracking-wide mb-1">
                  Live Chat
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  Instant responses • Real-time help
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-500 font-bold">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Bottom-right corner
            </div>
          </div>

          {/* Ticket System Option */}
          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 border-2 border-blue-200 dark:border-blue-500/20 rounded-2xl">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock size={16} className="text-white" />
              </div>
              <div>
                <h4 className="text-sm font-black text-blue-900 dark:text-blue-300 uppercase tracking-wide mb-1">
                  Support Tickets
                </h4>
                <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                  Detailed requests • Track history
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-500 font-bold">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              Bottom-left corner
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-white/10">
          <p className="text-xs text-slate-500 dark:text-gray-500 font-medium">
            💡 Tip: Use live chat for urgent issues, tickets for detailed requests
          </p>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-black text-xs font-black uppercase tracking-wider rounded-xl transition-all"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupportOptionsInfo;
