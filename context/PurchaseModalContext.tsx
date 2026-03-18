import React, { createContext, useContext, useState } from 'react';
import { SalesPackage } from '../types';

interface PurchaseModalContextType {
  isPurchaseModalOpen: boolean;
  selectedPackage: SalesPackage | null;
  onSuccessCallback: ((packageId: string) => void) | null;
  
  openPurchaseModal: (pkg: SalesPackage, onSuccess?: (packageId: string) => void) => void;
  closePurchaseModal: () => void;
}

const PurchaseModalContext = createContext<PurchaseModalContextType | undefined>(undefined);

export const usePurchaseModal = () => {
  const context = useContext(PurchaseModalContext);
  if (!context) {
    throw new Error('usePurchaseModal must be used within a PurchaseModalProvider');
  }
  return context;
};

export const PurchaseModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<SalesPackage | null>(null);
  const [onSuccessCallback, setOnSuccessCallback] = useState<((packageId: string) => void) | null>(null);

  const openPurchaseModal = (pkg: SalesPackage, onSuccess?: (packageId: string) => void) => {
    setSelectedPackage(pkg);
    if (onSuccess) {
      setOnSuccessCallback(() => onSuccess);
    } else {
      setOnSuccessCallback(null);
    }
    setIsPurchaseModalOpen(true);
  };

  const closePurchaseModal = () => {
    setIsPurchaseModalOpen(false);
    setTimeout(() => {
      setSelectedPackage(null);
      setOnSuccessCallback(null);
    }, 300); // Wait for transition to finish
  };

  return (
    <PurchaseModalContext.Provider
      value={{
        isPurchaseModalOpen,
        selectedPackage,
        onSuccessCallback,
        openPurchaseModal,
        closePurchaseModal,
      }}
    >
      {children}
    </PurchaseModalContext.Provider>
  );
};
