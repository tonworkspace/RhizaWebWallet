import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { useBalance } from '../hooks/useBalance';
import { useToast } from '../context/ToastContext';
import StoreUI from '../components/StoreUI';

const RzcStore: React.FC = () => {
  const navigate = useNavigate();
  const { address, isActivated, userProfile } = useWallet();
  const { tonPrice } = useBalance();
  const toast = useToast();

  return (
    <div className="flex flex-col h-full min-h-screen bg-black page-enter">
      <StoreUI
        tonPrice={tonPrice || 0.1}
        tonAddress={address}
        walletActivated={isActivated}
        onActivateWallet={() => navigate('/wallet/sales-package')}
        userId={userProfile?.id}
        showSnackbar={({ message, description, type }) => {
          const fullMessage = description ? `${message}: ${description}` : message;
          if (type === 'error' && toast.error) toast.error(fullMessage);
          else if (type === 'success' && toast.success) toast.success(fullMessage);
          else if (toast.info) toast.info(fullMessage);
        }}
        onPurchaseComplete={() => navigate('/wallet/dashboard')}
      />
    </div>
  );
};

export default RzcStore;
