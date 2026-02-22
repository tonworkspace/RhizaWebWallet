import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, CheckCircle, AlertCircle, Key } from 'lucide-react';
import { supabaseService } from '../services/supabaseService';
import { useToast } from '../context/ToastContext';

// IMPORTANT: Change this secret key in production!
const ADMIN_SECRET_KEY = 'rhiza-admin-2026-secret';

const AdminSetup: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [secretKey, setSecretKey] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [adminName, setAdminName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verify secret key
    if (secretKey !== ADMIN_SECRET_KEY) {
      showToast('Invalid admin secret key', 'error');
      return;
    }

    if (!walletAddress || !adminName) {
      showToast('Please fill all fields', 'error');
      return;
    }

    setIsLoading(true);

    try {
      // Check if user already exists
      const existingUser = await supabaseService.getProfile(walletAddress);
      
      if (existingUser.success && existingUser.data) {
        // Update existing user to admin
        const client = supabaseService.getClient();
        if (!client) {
          showToast('Supabase not configured', 'error');
          return;
        }

        const { error } = await client
          .from('wallet_users')
          .update({ 
            role: 'admin',
            name: adminName,
            avatar: '👑'
          })
          .eq('wallet_address', walletAddress);

        if (error) throw error;

        showToast('User upgraded to admin!', 'success');
      } else {
        // Create new admin user
        const result = await supabaseService.createOrUpdateProfile({
          wallet_address: walletAddress,
          name: adminName,
          avatar: '👑',
          role: 'admin',
          is_active: true
        });

        if (!result.success) {
          throw new Error(result.error || 'Failed to create admin');
        }

        // Create referral code
        if (result.data) {
          await supabaseService.createReferralCode(result.data.id, walletAddress);
        }

        showToast('Admin user created!', 'success');
      }

      setSuccess(true);
      
      // Track event
      await supabaseService.trackEvent('admin_created', {
        wallet_address: walletAddress,
        name: adminName
      });

      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (error: any) {
      console.error('Admin creation error:', error);
      showToast(error.message || 'Failed to create admin', 'error');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-500/10 rounded-2xl mb-4">
            <Shield className="text-purple-400" size={32} />
          </div>
          <h1 className="text-3xl font-black mb-2">Admin Setup</h1>
          <p className="text-gray-500">Create or upgrade an admin account</p>
        </div>

        {!success ? (
          <form onSubmit={handleCreateAdmin} className="space-y-6">
            {/* Secret Key */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                Admin Secret Key
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" size={18} />
                <input
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="Enter admin secret key"
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-purple-500/20 rounded-xl text-white outline-none focus:border-purple-500/50 transition-all"
                  required
                />
              </div>
              <p className="text-xs text-gray-500">
                Contact system administrator for the secret key
              </p>
            </div>

            {/* Wallet Address */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                Wallet Address
              </label>
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="EQ..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-sm outline-none focus:border-[#00FF88]/50 transition-all"
                required
              />
              <p className="text-xs text-gray-500">
                Enter the wallet address to make admin
              </p>
            </div>

            {/* Admin Name */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                Admin Name
              </label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="Admin Name"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-[#00FF88]/50 transition-all"
                required
              />
            </div>

            {/* Warning */}
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
              <div className="text-sm text-yellow-200">
                <p className="font-bold mb-1">Important</p>
                <p className="text-yellow-300/80">
                  Admin users have full access to all data and can manage other users. 
                  Only create admin accounts for trusted individuals.
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${
                isLoading
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-500 hover:bg-purple-600 text-white'
              }`}
            >
              {isLoading ? 'Creating Admin...' : 'Create Admin'}
            </button>

            {/* Back Button */}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full py-3 text-gray-500 hover:text-white transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} />
              Back to Home
            </button>
          </form>
        ) : (
          <div className="text-center space-y-6 py-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/10 rounded-full">
              <CheckCircle className="text-green-400" size={48} />
            </div>
            <div>
              <h2 className="text-2xl font-black mb-2">Admin Created!</h2>
              <p className="text-gray-400">
                The admin account has been created successfully.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Login with the wallet to access the admin dashboard.
              </p>
            </div>
            <p className="text-sm text-gray-500">
              Redirecting to login...
            </p>
          </div>
        )}

        {/* Info */}
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
          <h3 className="font-bold text-sm mb-2">Admin Secret Key</h3>
          <p className="text-xs text-gray-500 mb-2">
            Current key: <code className="text-purple-400">rhiza-admin-2026-secret</code>
          </p>
          <p className="text-xs text-gray-600">
            Change this in production by updating ADMIN_SECRET_KEY in AdminSetup.tsx
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminSetup;
