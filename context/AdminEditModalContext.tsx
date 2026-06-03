import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AdminUser } from '../services/adminService';

interface EditFormData {
  name: string;
  email: string;
  avatar: string;
  role: string;
  is_active: boolean;
  is_activated: boolean;
  is_premium: boolean;
  activated_at: string;
  activation_fee_paid: number;
  referrer_code: string;
  last_login_at: string;
  rzc_balance: number;
  last_squad_claim_at: string;
  total_squad_rewards: number;
  balance_verified: boolean;
  balance_locked: boolean;
  verification_badge_earned_at: string;
  verification_level: string;
  ton_balance: number;
  last_balance_sync_at: string;
  evm_balance: number;
  btc_balance: number;
  sol_balance: number;
  tron_balance: number;
  usdt_balance: number;
  node_activated: boolean;
  node_activated_at: string;
  total_activation_spent: number;
}

interface AdminEditModalContextType {
  isOpen: boolean;
  selectedUser: AdminUser | null;
  editForm: EditFormData;
  editReason: string;
  openEditModal: (user: AdminUser) => void;
  closeEditModal: () => void;
  updateEditForm: (updates: Partial<EditFormData>) => void;
  setEditReason: (reason: string) => void;
}

const AdminEditModalContext = createContext<AdminEditModalContextType | undefined>(undefined);

export const useAdminEditModal = () => {
  const context = useContext(AdminEditModalContext);
  if (!context) {
    throw new Error('useAdminEditModal must be used within AdminEditModalProvider');
  }
  return context;
};

interface AdminEditModalProviderProps {
  children: ReactNode;
}

export const AdminEditModalProvider: React.FC<AdminEditModalProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [editReason, setEditReason] = useState('');
  const [editForm, setEditForm] = useState<EditFormData>({
    name: '',
    email: '',
    avatar: '🌱',
    role: '',
    is_active: true,
    is_activated: false,
    is_premium: false,
    activated_at: '',
    activation_fee_paid: 0,
    referrer_code: '',
    last_login_at: '',
    rzc_balance: 0,
    last_squad_claim_at: '',
    total_squad_rewards: 0,
    balance_verified: false,
    balance_locked: true,
    verification_badge_earned_at: '',
    verification_level: 'unverified',
    ton_balance: 0,
    last_balance_sync_at: '',
    evm_balance: 0,
    btc_balance: 0,
    sol_balance: 0,
    tron_balance: 0,
    usdt_balance: 0,
    node_activated: false,
    node_activated_at: '',
    total_activation_spent: 0
  });

  const openEditModal = (user: AdminUser) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      email: user.email || '',
      avatar: user.avatar || '🌱',
      role: user.role,
      is_active: user.is_active,
      is_activated: user.is_activated || false,
      is_premium: user.is_premium || false,
      activated_at: user.activated_at || '',
      activation_fee_paid: user.activation_fee_paid || 0,
      referrer_code: user.referrer_code || '',
      last_login_at: user.last_login_at || '',
      rzc_balance: user.rzc_balance,
      last_squad_claim_at: user.last_squad_claim_at || '',
      total_squad_rewards: user.total_squad_rewards || 0,
      balance_verified: user.balance_verified || false,
      balance_locked: user.balance_locked ?? true,
      verification_badge_earned_at: user.verification_badge_earned_at || '',
      verification_level: user.verification_level || 'unverified',
      ton_balance: user.ton_balance || 0,
      last_balance_sync_at: user.last_balance_sync_at || '',
      evm_balance: user.evm_balance || 0,
      btc_balance: user.btc_balance || 0,
      sol_balance: user.sol_balance || 0,
      tron_balance: user.tron_balance || 0,
      usdt_balance: user.usdt_balance || 0,
      node_activated: user.node_activated || false,
      node_activated_at: user.node_activated_at || '',
      total_activation_spent: user.total_activation_spent || 0
    });
    setEditReason('');
    setIsOpen(true);
  };

  const closeEditModal = () => {
    setIsOpen(false);
    setSelectedUser(null);
    setEditReason('');
  };

  const updateEditForm = (updates: Partial<EditFormData>) => {
    setEditForm(prev => ({ ...prev, ...updates }));
  };

  return (
    <AdminEditModalContext.Provider
      value={{
        isOpen,
        selectedUser,
        editForm,
        editReason,
        openEditModal,
        closeEditModal,
        updateEditForm,
        setEditReason
      }}
    >
      {children}
    </AdminEditModalContext.Provider>
  );
};
