import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { useToast } from '../context/ToastContext';
import { supabaseService } from '../services/supabaseService';

const ProfileEdit: React.FC = () => {
  const navigate = useNavigate();
  const { address, userProfile } = useWallet();
  const { showToast } = useToast();

  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const avatarOptions = [
    '👤', '🌱', '🚀', '💎', '⚡', '🔥', '🌟', '🎯', 
    '🏆', '💰', '🎨', '🎭', '🎪', '🎬', '🎮', '🎲', 
    '🦄', '🐉', '🦅', '🦁', '🐺', '🦊', '🐼', '🐨'
  ];

  useEffect(() => {
    // Initialize form with current profile
    if (userProfile) {
      setEditName(userProfile.name || '');
      setEditAvatar(userProfile.avatar || '👤');
      setEditEmail(userProfile.email || '');
    }
  }, [userProfile]);

  const handleSaveProfile = async () => {
    if (!address || !editName.trim()) {
      showToast('Please enter a valid name', 'error');
      return;
    }

    // Validate email if provided
    if (editEmail && editEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editEmail.trim())) {
        showToast('Please enter a valid email address', 'error');
        return;
      }
    }

    setIsSaving(true);
    try {
      const result = await supabaseService.updateProfile(address, {
        name: editName.trim(),
        avatar: editAvatar,
        email: editEmail.trim() || null
      });

      if (result.success) {
        showToast('Profile updated successfully!', 'success');
        // Refresh page to update context
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        throw new Error(result.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      showToast('Failed to update profile. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 page-enter px-3 sm:px-4 md:px-0 pb-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-all active:scale-90"
        >
          <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-950 dark:text-white">
            Edit Profile
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            Customize your profile information
          </p>
        </div>
      </div>

      {/* Main Card */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-2xl blur-lg opacity-50" />
        <div className="relative bg-white dark:bg-[#0a0a0a] border-2 border-gray-300 dark:border-white/10 rounded-2xl p-6 sm:p-8 shadow-lg">
          
          {/* Avatar Selection */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-950 dark:text-white mb-3">
              Choose Avatar
            </label>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-48 overflow-y-auto p-3 bg-gray-50 dark:bg-white/5 rounded-xl border-2 border-gray-200 dark:border-white/10">
              {avatarOptions.map((avatar) => (
                <button
                  key={avatar}
                  onClick={() => setEditAvatar(avatar)}
                  className={`text-2xl sm:text-3xl p-2 sm:p-3 rounded-xl transition-all hover:scale-110 ${
                    editAvatar === avatar
                      ? 'bg-primary/20 ring-2 ring-primary scale-110'
                      : 'bg-white dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/15'
                  }`}
                >
                  {avatar}
                </button>
              ))}
            </div>
          </div>

          {/* Name Input */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-950 dark:text-white mb-2">
              Display Name *
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Enter your name"
              maxLength={30}
              className="w-full px-4 py-3 bg-gray-100 dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white font-semibold outline-none focus:border-primary transition-all"
            />
            <p className="text-xs text-gray-600 dark:text-gray-500 mt-2">
              {editName.length}/30 characters
            </p>
          </div>

          {/* Email Input */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-950 dark:text-white mb-2">
              Email (Optional)
            </label>
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 bg-gray-100 dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-gray-950 dark:text-white font-semibold outline-none focus:border-primary transition-all"
            />
            <p className="text-xs text-gray-600 dark:text-gray-500 mt-2">
              Used for notifications and account recovery
            </p>
          </div>

          {/* Preview */}
          <div className="mb-6 p-5 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-white/5 dark:to-white/10 border-2 border-gray-300 dark:border-white/10 rounded-xl">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-500 mb-3 uppercase tracking-wider">
              Preview
            </p>
            <div className="flex items-center gap-4">
              <div className="text-5xl">{editAvatar}</div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-gray-950 dark:text-white mb-1">
                  {editName || 'Your Name'}
                </p>
                {editEmail && (
                  <p className="text-sm text-gray-600 dark:text-gray-500 mb-2 truncate">
                    {editEmail}
                  </p>
                )}
                <p className="text-xs text-gray-600 dark:text-gray-500 font-mono truncate">
                  {address ? `${address.slice(0, 8)}...${address.slice(-6)}` : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate(-1)}
              disabled={isSaving}
              className="flex-1 px-6 py-3 bg-gray-100 dark:bg-white/5 text-gray-950 dark:text-white rounded-xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-white/10 transition-all disabled:opacity-50 border-2 border-gray-300 dark:border-white/10"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveProfile}
              disabled={isSaving || !editName.trim()}
              className="flex-1 px-6 py-3 bg-primary text-black rounded-xl font-bold text-sm hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-lg flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-500/20 rounded-xl">
        <p className="text-xs text-blue-800 dark:text-blue-400 leading-relaxed">
          Your profile information is stored securely and can be updated at any time. 
          Email is optional but recommended for account recovery and notifications.
        </p>
      </div>
    </div>
  );
};

export default ProfileEdit;
