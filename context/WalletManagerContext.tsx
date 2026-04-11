import React, { createContext, useContext, useState } from 'react';

interface WalletManagerContextType {
  isSheetOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;
}

const WalletManagerContext = createContext<WalletManagerContextType | undefined>(undefined);

export const WalletManagerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  return (
    <WalletManagerContext.Provider value={{
      isSheetOpen,
      openSheet: () => setIsSheetOpen(true),
      closeSheet: () => setIsSheetOpen(false),
    }}>
      {children}
    </WalletManagerContext.Provider>
  );
};

export const useWalletManager = () => {
  const ctx = useContext(WalletManagerContext);
  if (!ctx) throw new Error('useWalletManager must be used within WalletManagerProvider');
  return ctx;
};
