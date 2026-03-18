import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Gift, X } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import SocialAirdropDashboard from './SocialAirdropDashboard';

interface GlobalAirdropModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GlobalAirdropModal: React.FC<GlobalAirdropModalProps> = ({ isOpen, onClose }) => {
  const { userProfile, isLoggedIn } = useWallet();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      // Restore body scroll when modal is closed
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 200); // Match animation duration
  };

  // Don't render if user is not logged in
  if (!isLoggedIn || !userProfile) {
    return null;
  }

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div 
      className={`fixed inset-0 z-[9999] bg-black/90 backdrop-blur-xl transition-all duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Full Screen Modal Container */}
      <div 
        className={`w-full h-full bg-white dark:bg-[#0a0a0a] flex flex-col transition-all duration-300 ${
          isVisible ? 'scale-100' : 'scale-95'
        }`}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-white/10 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center">
              <Gift size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white">
                Social Airdrop
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Complete tasks to earn RZC tokens
              </p>
            </div>
          </div>
          
          {/* Close Button */}
          <button 
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-all"
            aria-label="Close airdrop modal"
          >
            <X size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content Area - Full Screen Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-4 sm:p-6">
            <SocialAirdropDashboard />
          </div>
        </div>

        {/* Optional Footer */}
        <div className="border-t border-gray-200 dark:border-white/10 p-4 sm:p-6 bg-gray-50/80 dark:bg-white/5 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto">
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              🎉 Complete all tasks to maximize your RZC rewards
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default GlobalAirdropModal;