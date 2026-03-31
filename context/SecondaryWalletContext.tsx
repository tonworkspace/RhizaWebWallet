import React, { createContext, useContext, useState, useCallback } from 'react';
import { tetherWdkService, MultiChainAddresses } from '../services/tetherWdkService';

interface SecondaryWalletState {
  isInitialized: boolean;
  isLoading: boolean;
  addresses: MultiChainAddresses | null;
  balances: { evmBalance: string; tonBalance: string; btcBalance: string } | null;
  error: string | null;
  hasStoredWallet: boolean;
  isEncrypted: boolean;
  // Actions
  generateAndSetPhrase: () => string;
  initializeFromPhrase: (phrase: string, password?: string) => Promise<boolean>;
  restoreFromStorage: (password?: string) => Promise<boolean>;
  savePhrase: (phrase: string, password?: string) => Promise<boolean>;
  refreshBalances: () => Promise<void>;
  logout: () => void;
  deleteWallet: () => void;
}

const SecondaryWalletContext = createContext<SecondaryWalletState | undefined>(undefined);

export const SecondaryWalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [addresses, setAddresses] = useState<MultiChainAddresses | null>(null);
  const [balances, setBalances] = useState<{ evmBalance: string; tonBalance: string; btcBalance: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasStoredWallet, setHasStoredWallet] = useState(() => tetherWdkService.hasStoredWallet());
  const [isEncrypted, setIsEncrypted] = useState(() => tetherWdkService.isEncrypted());

  const generateAndSetPhrase = useCallback((): string => {
    return tetherWdkService.generateMnemonic();
  }, []);

  const initializeFromPhrase = useCallback(async (phrase: string, password?: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const addrs = await tetherWdkService.initializeManagers(phrase);
      setAddresses(addrs);
      setIsInitialized(true);
      setIsLoading(false);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setIsInitialized(false);
      setIsLoading(false);
      return false;
    }
  }, []);

  const restoreFromStorage = useCallback(async (password?: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const phrase = await tetherWdkService.getStoredWallet(password);
      if (!phrase) {
        setError('Could not restore wallet. Check your password.');
        setIsLoading(false);
        return false;
      }
      const addrs = await tetherWdkService.initializeManagers(phrase);
      setAddresses(addrs);
      setIsInitialized(true);
      setIsLoading(false);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setIsLoading(false);
      return false;
    }
  }, []);

  const savePhrase = useCallback(async (phrase: string, password?: string): Promise<boolean> => {
    const result = await tetherWdkService.saveWallet(phrase, password);
    if (result.success) {
      setHasStoredWallet(true);
      setIsEncrypted(!!password);
    }
    return result.success;
  }, []);

  const refreshBalances = useCallback(async () => {
    const bals = await tetherWdkService.getBalances();
    if (bals) setBalances(bals);
  }, []);

  const logout = useCallback(() => {
    tetherWdkService.logout();
    setIsInitialized(false);
    setAddresses(null);
    setBalances(null);
  }, []);

  const deleteWallet = useCallback(() => {
    tetherWdkService.deleteWallet();
    setIsInitialized(false);
    setAddresses(null);
    setBalances(null);
    setHasStoredWallet(false);
    setIsEncrypted(false);
  }, []);

  return (
    <SecondaryWalletContext.Provider value={{
      isInitialized, isLoading, addresses, balances, error,
      hasStoredWallet, isEncrypted,
      generateAndSetPhrase, initializeFromPhrase, restoreFromStorage,
      savePhrase, refreshBalances, logout, deleteWallet
    }}>
      {children}
    </SecondaryWalletContext.Provider>
  );
};

export const useSecondaryWallet = () => {
  const ctx = useContext(SecondaryWalletContext);
  if (!ctx) throw new Error('useSecondaryWallet must be used within SecondaryWalletProvider');
  return ctx;
};
