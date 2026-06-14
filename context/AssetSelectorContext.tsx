import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export type AssetSelectorPayload = {
  /** Callback fired when the user picks an asset */
  onSelect: (asset: {
    walletId: 'primary' | 'multichain-ton' | 'multichain-tron' | 'multichain-tron-usdt' | 'multichain-sol' | 'multichain-evm' | 'multichain-eth' | 'multichain-bsc' | 'multichain-polygon' | 'multichain-btc';
    evmChain?: string;
    /** For jettons */
    jetton?: {
      address: string;
      name: string;
      symbol: string;
      decimals: number;
      balance: string;
      walletAddress: string;
      image?: string;
    };
    /** Navigate to RZC */
    isRzc?: boolean;
  }) => void;
  /** Currently active wallet for highlight */
  activeWalletId?: string;
  activeEvmChain?: string;
};

interface AssetSelectorContextValue {
  isOpen: boolean;
  payload: AssetSelectorPayload | null;
  openAssetSelector: (payload: AssetSelectorPayload) => void;
  closeAssetSelector: () => void;
}

const AssetSelectorContext = createContext<AssetSelectorContextValue>({
  isOpen: false,
  payload: null,
  openAssetSelector: () => {},
  closeAssetSelector: () => {},
});

export const AssetSelectorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [payload, setPayload] = useState<AssetSelectorPayload | null>(null);

  const openAssetSelector = useCallback((p: AssetSelectorPayload) => {
    setPayload(p);
    setIsOpen(true);
  }, []);

  const closeAssetSelector = useCallback(() => {
    setIsOpen(false);
    // Clear payload after animation
    setTimeout(() => setPayload(null), 300);
  }, []);

  return (
    <AssetSelectorContext.Provider value={{ isOpen, payload, openAssetSelector, closeAssetSelector }}>
      {children}
    </AssetSelectorContext.Provider>
  );
};

export const useAssetSelector = () => useContext(AssetSelectorContext);
