import React, { createContext, useContext, useState, useCallback } from 'react';

interface ActivationModalContextType {
  isModalOpen: boolean;
  showActivationModal: () => void;
  hideActivationModal: () => void;
}

const ActivationModalContext = createContext<ActivationModalContextType | undefined>(undefined);

export const ActivationModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const showActivationModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const hideActivationModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  return (
    <ActivationModalContext.Provider value={{ isModalOpen, showActivationModal, hideActivationModal }}>
      {children}
    </ActivationModalContext.Provider>
  );
};

export const useActivationModal = () => {
  const context = useContext(ActivationModalContext);
  if (!context) {
    throw new Error('useActivationModal must be used within ActivationModalProvider');
  }
  return context;
};
