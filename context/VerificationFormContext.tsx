import React, { createContext, useContext, useState } from 'react';
import { balanceVerificationService } from '../services/balanceVerificationService';
import { supabaseService } from '../services/supabaseService';
import { useToast } from './ToastContext';

export interface VerificationFormData {
  telegram_username: string;
  current_wallet_address: string;
  old_wallet_address: string;
  claimed_balance: string;
  available_balance_before_migration: string;
  claimable_balance_before_migration: string;
  current_balance: string;
  additional_notes: string;
}

export interface VerificationFiles {
  available: File | null;
  claimable: File | null;
  current: File | null;
}

export type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

export interface UploadState {
  available: UploadStatus;
  claimable: UploadStatus;
  current: UploadStatus;
}

interface VerificationFormContextType {
  showForm: boolean;
  submitting: boolean;
  uploadState: UploadState;
  currentAddress: string;
  openForm: (address: string) => void;
  closeForm: () => void;
  handleFormSubmit: (formData: VerificationFormData, files: VerificationFiles) => Promise<void>;
}

const VerificationFormContext = createContext<VerificationFormContextType | undefined>(undefined);

export const useVerificationForm = () => {
  const ctx = useContext(VerificationFormContext);
  if (!ctx) throw new Error('useVerificationForm must be used within VerificationFormProvider');
  return ctx;
};

const IDLE_UPLOADS: UploadState = { available: 'idle', claimable: 'idle', current: 'idle' };

export const VerificationFormProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>(IDLE_UPLOADS);
  const [currentAddress, setCurrentAddress] = useState('');

  const openForm = (address: string) => { setCurrentAddress(address); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setUploadState(IDLE_UPLOADS); };

  const uploadFile = async (
    file: File | null,
    key: keyof UploadState,
    userId: string
  ): Promise<string | undefined> => {
    if (!file) return undefined;
    setUploadState(prev => ({ ...prev, [key]: 'uploading' }));
    const result = await balanceVerificationService.uploadScreenshot(file, userId);
    if (result.success && result.url) {
      setUploadState(prev => ({ ...prev, [key]: 'done' }));
      return result.url;
    } else {
      setUploadState(prev => ({ ...prev, [key]: 'error' }));
      showToast(`Failed to upload ${key} screenshot: ${result.error}`, 'error');
      return undefined;
    }
  };

  const handleFormSubmit = async (formData: VerificationFormData, files: VerificationFiles) => {
    setSubmitting(true);
    setUploadState(IDLE_UPLOADS);
    try {
      if (!currentAddress) {
        showToast('Please ensure you are logged in with your wallet', 'error');
        return;
      }

      // Resolve user ID for upload path
      const profile = await supabaseService.getProfile(currentAddress);
      const userId = profile.data?.id ?? currentAddress;

      // Upload all screenshots in parallel
      const [availableUrl, claimableUrl, currentUrl] = await Promise.all([
        uploadFile(files.available, 'available', userId),
        uploadFile(files.claimable, 'claimable', userId),
        uploadFile(files.current, 'current', userId),
      ]);

      // Build notes
      const combinedNotes = formData.additional_notes || undefined;

      const result = await balanceVerificationService.submitVerificationRequestWithWallet(
        currentAddress,
        {
          telegram_username: formData.telegram_username,
          old_wallet_address: formData.old_wallet_address,
          claimed_balance: parseFloat(formData.claimed_balance),
          screenshot_url: undefined,
          additional_notes: combinedNotes,
          available_balance_before_migration: formData.available_balance_before_migration
            ? parseFloat(formData.available_balance_before_migration) : undefined,
          claimable_balance_before_migration: formData.claimable_balance_before_migration
            ? parseFloat(formData.claimable_balance_before_migration) : undefined,
          available_balance_screenshot_url: availableUrl,
          claimable_balance_screenshot_url: claimableUrl,
          current_balance_screenshot_url: currentUrl,
        }
      );

      if (result.success) {
        showToast('Verification request submitted successfully! We will review it soon.', 'success');
        setShowForm(false);
        setUploadState(IDLE_UPLOADS);
      } else {
        showToast(result.error || 'Failed to submit verification request', 'error');
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to submit verification request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <VerificationFormContext.Provider value={{ showForm, submitting, uploadState, currentAddress, openForm, closeForm, handleFormSubmit }}>
      {children}
    </VerificationFormContext.Provider>
  );
};
