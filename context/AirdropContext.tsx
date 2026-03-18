import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AirdropContextType {
  isAirdropModalOpen: boolean;
  openAirdropModal: () => void;
  closeAirdropModal: () => void;
  toggleAirdropModal: () => void;
}

const AirdropContext = createContext<AirdropContextType | undefined>(undefined);

export const useAirdrop = (): AirdropContextType => {
  const context = useContext(AirdropContext);
  if (!context) {
    throw new Error('useAirdrop must be used within an AirdropProvider');
  }
  return context;
};

interface AirdropProviderProps {
  children: ReactNode;
}

export const AirdropProvider: React.FC<AirdropProviderProps> = ({ children }) => {
  const [isAirdropModalOpen, setIsAirdropModalOpen] = useState(false);

  const openAirdropModal = () => {
    setIsAirdropModalOpen(true);
  };

  const closeAirdropModal = () => {
    setIsAirdropModalOpen(false);
  };

  const toggleAirdropModal = () => {
    setIsAirdropModalOpen(prev => !prev);
  };

  const value: AirdropContextType = {
    isAirdropModalOpen,
    openAirdropModal,
    closeAirdropModal,
    toggleAirdropModal
  };

  return (
    <AirdropContext.Provider value={value}>
      {children}
    </AirdropContext.Provider>
  );
};