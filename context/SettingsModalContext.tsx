import React, { createContext, useContext, useState, useRef } from 'react';
import { WalletManager } from '../utils/walletManager';

export type ExportMode = 'mnemonic' | 'privatekey' | null;

interface SettingsModalContextType {
  // Export Modal State
  exportMode: ExportMode;
  exportPassword: string;
  exportPasswordVisible: boolean;
  exportError: string;
  exportLoading: boolean;
  revealedWords: string[];
  wordsCopied: boolean;
  countdown: number;
  
  // Confirmation Modal State
  showLogoutConfirm: boolean;
  showDeleteConfirm: boolean;
  
  // Export Modal Actions
  setExportMode: (mode: ExportMode) => void;
  setExportPassword: (password: string) => void;
  setExportPasswordVisible: (visible: boolean) => void;
  setExportError: (error: string) => void;
  setExportLoading: (loading: boolean) => void;
  setRevealedWords: (words: string[]) => void;
  setWordsCopied: (copied: boolean) => void;
  setCountdown: (count: number) => void;
  
  // Confirmation Modal Actions
  setShowLogoutConfirm: (show: boolean) => void;
  setShowDeleteConfirm: (show: boolean) => void;
  
  // Modal Actions
  openExportModal: (mode: 'mnemonic' | 'privatekey') => void;
  closeExportModal: () => void;
  handleConfirmExport: () => Promise<void>;
  handleCopyWords: () => void;
  startCountdown: () => void;
}

const SettingsModalContext = createContext<SettingsModalContextType | undefined>(undefined);

export const useSettingsModal = () => {
  const context = useContext(SettingsModalContext);
  if (!context) {
    throw new Error('useSettingsModal must be used within a SettingsModalProvider');
  }
  return context;
};

interface SettingsModalProviderProps {
  children: React.ReactNode;
}

export const SettingsModalProvider: React.FC<SettingsModalProviderProps> = ({ children }) => {
  // Export Modal State
  const [exportMode, setExportMode] = useState<ExportMode>(null);
  const [exportPassword, setExportPassword] = useState('');
  const [exportPasswordVisible, setExportPasswordVisible] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [revealedWords, setRevealedWords] = useState<string[]>([]);
  const [wordsCopied, setWordsCopied] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  // Confirmation Modal State
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const closeExportModal = () => {
    setExportMode(null);
    setExportPassword('');
    setExportPasswordVisible(false);
    setExportError('');
    setRevealedWords([]);
    setWordsCopied(false);
    setCountdown(0);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  const startCountdown = () => {
    setCountdown(60);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          closeExportModal();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleConfirmExport = async () => {
    if (!exportPassword.trim()) {
      setExportError('Please enter your wallet password.');
      return;
    }
    setExportLoading(true);
    setExportError('');

    const activeId = WalletManager.getActiveWalletId();
    if (!activeId) {
      setExportError('No active wallet found.');
      setExportLoading(false);
      return;
    }

    const result = await WalletManager.getWalletMnemonic(activeId, exportPassword);
    setExportLoading(false);

    if (!result.success || !result.mnemonic) {
      setExportError('Incorrect password. Please try again.');
      return;
    }

    setRevealedWords(result.mnemonic);
    setExportPassword('');
    startCountdown();
  };

  const handleCopyWords = () => {
    navigator.clipboard.writeText(revealedWords.join(' '));
    setWordsCopied(true);
    setTimeout(() => setWordsCopied(false), 2000);
  };

  const openExportModal = (mode: 'mnemonic' | 'privatekey') => {
    setExportMode(mode);
    setExportError('');
    setRevealedWords([]);
  };

  const value: SettingsModalContextType = {
    // State
    exportMode,
    exportPassword,
    exportPasswordVisible,
    exportError,
    exportLoading,
    revealedWords,
    wordsCopied,
    countdown,
    showLogoutConfirm,
    showDeleteConfirm,
    
    // Setters
    setExportMode,
    setExportPassword,
    setExportPasswordVisible,
    setExportError,
    setExportLoading,
    setRevealedWords,
    setWordsCopied,
    setCountdown,
    setShowLogoutConfirm,
    setShowDeleteConfirm,
    
    // Actions
    openExportModal,
    closeExportModal,
    handleConfirmExport,
    handleCopyWords,
    startCountdown,
  };

  return (
    <SettingsModalContext.Provider value={value}>
      {children}
    </SettingsModalContext.Provider>
  );
};