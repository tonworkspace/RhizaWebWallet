import React, { useState } from 'react';
import { X, User, Mail, Shield, Coins, Users, DollarSign, Zap, Clock, Save, Loader } from 'lucide-react';
import { useAdminEditModal } from '../context/AdminEditModalContext';
import { useWallet } from '../context/WalletContext';
import { useToast } from '../context/ToastContext';
import { adminService } from '../services/adminService';

const GlobalAdminEditModal: React.FC = () => {
  const { isOpen, selectedUser, editForm, editReason, closeEditModal, updateEditForm, setEditReason } = useAdminEditModal();
  const { address } = useWallet();
  const { success, error } = useToast();
  const [processing, setProcessing] = useState(false);

  const handleSaveEdit = async () => {
    if (!address || !selectedUser) return;

    if (!editReason.trim()) {
      error('Please provide a reason for this update');
      return;
    }

    setProcessing(true);
    const result = await adminService.updateUserAccount(
      selectedUser.wallet_address,
      editForm,
      address,
      editReason
    );

    if (result.success) {
      success(`✅ User ${selectedUser.name} updated successfully`);
      closeEditModal();
      // Trigger a page reload or emit an event to refresh the user list
      window.dispatchEvent(new CustomEvent('admin-user-updated'));
    } else {
      error(`❌ Failed to update user: ${result.error}`);
    }
    setProcessing(false);
  };

  if (!isOpen || !selectedUser) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
        onClick={() => !processing && closeEditModal()}
      />

      {/* Modal */}
      <div className="fixed inset-4 sm:inset-8 md:inset-16 lg:inset-20 bg-white dark:bg-[#0a0a0a] border-2 border-gray-300 dark:border-white/10 rounded-2xl shadow-2xl z-[101] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b-2 border-gray-200 dark:border-white/10 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-2xl font-black text-gray-950 dark:text-white">
              Edit User Account
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {selectedUser.wallet_address.slice(0, 12)}...{selectedUser.wallet_address.slice(-8)}
            </p>
          </div>
          <button
            onClick={() => !processing && closeEditModal()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
            disabled={processing}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {/* Basic Info Section */}
          <div>
            <h3 className="text-lg font-black text-gray-950 dark:text-white mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  <User size={16} />
                  Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => updateEditForm({ name: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary"
                  placeholder="User name"
                />
              </div>

              {/* Email */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  <Mail size={16} />
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => updateEditForm({ email: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary"
                  placeholder="user@example.com"
                />
              </div>

              {/* Role */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  <Shield size={16} />
                  Role
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) => updateEditForm({ role: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary"
                >
                  <option value="user">User</option>
                  <option value="premium">Premium</option>
                  <option value="vip">VIP</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              {/* Avatar URL */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  <User size={16} />
                  Avatar URL
                </label>
                <input
                  type="text"
                  value={editForm.avatar}
                  onChange={(e) => updateEditForm({ avatar: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary"
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          {/* Status Toggles */}
          <div>
            <h3 className="text-lg font-black text-gray-950 dark:text-white mb-4">Status & Permissions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Is Active */}
              <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                <input
                  type="checkbox"
                  checked={editForm.is_active}
                  onChange={(e) => updateEditForm({ is_active: e.target.checked })}
                  className="w-5 h-5 rounded border-2 border-gray-300 dark:border-white/10"
                />
                <span className="text-sm font-bold text-gray-950 dark:text-white">Active</span>
              </label>

              {/* Is Activated */}
              <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                <input
                  type="checkbox"
                  checked={editForm.is_activated}
                  onChange={(e) => updateEditForm({ is_activated: e.target.checked })}
                  className="w-5 h-5 rounded border-2 border-gray-300 dark:border-white/10"
                />
                <span className="text-sm font-bold text-gray-950 dark:text-white">Activated</span>
              </label>

              {/* Is Premium */}
              <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                <input
                  type="checkbox"
                  checked={editForm.is_premium}
                  onChange={(e) => updateEditForm({ is_premium: e.target.checked })}
                  className="w-5 h-5 rounded border-2 border-gray-300 dark:border-white/10"
                />
                <span className="text-sm font-bold text-gray-950 dark:text-white">Premium</span>
              </label>

              {/* Balance Verified */}
              <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                <input
                  type="checkbox"
                  checked={editForm.balance_verified}
                  onChange={(e) => updateEditForm({ balance_verified: e.target.checked })}
                  className="w-5 h-5 rounded border-2 border-gray-300 dark:border-white/10"
                />
                <span className="text-sm font-bold text-gray-950 dark:text-white">Verified</span>
              </label>

              {/* Balance Locked */}
              <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                <input
                  type="checkbox"
                  checked={editForm.balance_locked}
                  onChange={(e) => updateEditForm({ balance_locked: e.target.checked })}
                  className="w-5 h-5 rounded border-2 border-gray-300 dark:border-white/10"
                />
                <span className="text-sm font-bold text-gray-950 dark:text-white">Locked</span>
              </label>

              {/* Node Activated */}
              <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                <input
                  type="checkbox"
                  checked={editForm.node_activated}
                  onChange={(e) => updateEditForm({ node_activated: e.target.checked })}
                  className="w-5 h-5 rounded border-2 border-gray-300 dark:border-white/10"
                />
                <span className="text-sm font-bold text-gray-950 dark:text-white">Node Active</span>
              </label>
            </div>
          </div>

          {/* Balances Section */}
          <div>
            <h3 className="text-lg font-black text-gray-950 dark:text-white mb-4">Balances</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* RZC Balance */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  <Coins size={16} />
                  RZC Balance
                </label>
                <input
                  type="number"
                  value={editForm.rzc_balance}
                  onChange={(e) => updateEditForm({ rzc_balance: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary"
                  placeholder="0"
                  step="0.01"
                />
              </div>

              {/* TON Balance */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  💠 TON Balance
                </label>
                <input
                  type="number"
                  value={editForm.ton_balance}
                  onChange={(e) => updateEditForm({ ton_balance: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary"
                  placeholder="0"
                  step="0.01"
                />
              </div>

              {/* BTC Balance */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  ₿ BTC Balance
                </label>
                <input
                  type="number"
                  value={editForm.btc_balance}
                  onChange={(e) => updateEditForm({ btc_balance: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary"
                  placeholder="0"
                  step="0.00000001"
                />
              </div>

              {/* EVM Balance */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  ⟠ EVM Balance
                </label>
                <input
                  type="number"
                  value={editForm.evm_balance}
                  onChange={(e) => updateEditForm({ evm_balance: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary"
                  placeholder="0"
                  step="0.01"
                />
              </div>

              {/* SOL Balance */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  ☀️ SOL Balance
                </label>
                <input
                  type="number"
                  value={editForm.sol_balance}
                  onChange={(e) => updateEditForm({ sol_balance: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary"
                  placeholder="0"
                  step="0.01"
                />
              </div>

              {/* TRON Balance */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  🔴 TRON Balance
                </label>
                <input
                  type="number"
                  value={editForm.tron_balance}
                  onChange={(e) => updateEditForm({ tron_balance: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary"
                  placeholder="0"
                  step="0.01"
                />
              </div>

              {/* USDT Balance */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  💵 USDT Balance
                </label>
                <input
                  type="number"
                  value={editForm.usdt_balance}
                  onChange={(e) => updateEditForm({ usdt_balance: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary"
                  placeholder="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          {/* Additional Fields */}
          <div>
            <h3 className="text-lg font-black text-gray-950 dark:text-white mb-4">Additional Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Referrer Code */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  <Users size={16} />
                  Referrer Code
                </label>
                <input
                  type="text"
                  value={editForm.referrer_code}
                  onChange={(e) => updateEditForm({ referrer_code: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary"
                  placeholder="Referrer code (if any)"
                />
              </div>

              {/* Activation Fee Paid */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  <DollarSign size={16} />
                  Activation Fee Paid (TON)
                </label>
                <input
                  type="number"
                  value={editForm.activation_fee_paid}
                  onChange={(e) => updateEditForm({ activation_fee_paid: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary"
                  placeholder="0"
                  step="0.01"
                />
              </div>

              {/* Total Squad Rewards */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  <Zap size={16} />
                  Total Squad Rewards
                </label>
                <input
                  type="number"
                  value={editForm.total_squad_rewards}
                  onChange={(e) => updateEditForm({ total_squad_rewards: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary"
                  placeholder="0"
                  step="0.01"
                />
              </div>

              {/* Total Activation Spent */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  <DollarSign size={16} />
                  Total Activation Spent
                </label>
                <input
                  type="number"
                  value={editForm.total_activation_spent}
                  onChange={(e) => updateEditForm({ total_activation_spent: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary"
                  placeholder="0"
                  step="0.01"
                />
              </div>

              {/* Verification Level */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  <Shield size={16} />
                  Verification Level
                </label>
                <select
                  value={editForm.verification_level}
                  onChange={(e) => updateEditForm({ verification_level: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary"
                >
                  <option value="unverified">Unverified</option>
                  <option value="basic">Basic</option>
                  <option value="advanced">Advanced</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div>
            <h3 className="text-lg font-black text-gray-950 dark:text-white mb-4">Timestamps</h3>
            <div className="grid grid-cols-1 gap-4">
              {/* Activated At */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  <Clock size={16} />
                  Activated At (ISO 8601)
                </label>
                <input
                  type="text"
                  value={editForm.activated_at}
                  onChange={(e) => updateEditForm({ activated_at: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary font-mono text-sm"
                  placeholder="2024-01-01T00:00:00.000Z"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Leave empty if not activated. Format: YYYY-MM-DDTHH:mm:ss.sssZ
                </p>
              </div>
            </div>
          </div>

          {/* Edit Reason */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              <Shield size={16} />
              Reason for Update (Required)
            </label>
            <textarea
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white focus:outline-none focus:border-primary resize-none"
              placeholder="Explain why you're making these changes..."
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t-2 border-gray-200 dark:border-white/10 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={() => !processing && closeEditModal()}
            disabled={processing}
            className="px-6 py-3 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold hover:bg-gray-300 dark:hover:bg-white/20 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveEdit}
            disabled={processing || !editReason.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-black rounded-xl text-sm font-bold hover:bg-[#00dd77] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? (
              <>
                <Loader size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default GlobalAdminEditModal;
