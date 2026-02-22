import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Wallet, Shield, AlertCircle, Loader, CheckCircle, Key } from 'lucide-react';
import { authService } from '../services/authService';

// IMPORTANT: Change this secret key and keep it secure!
const ADMIN_SECRET_KEY = 'your-super-secret-admin-key-change-this';

const AdminRegister: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Verify secret key
    if (secretKey !== ADMIN_SECRET_KEY) {
      setError('Invalid admin secret key');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!walletAddress) {
      setError('Wallet address is required');
      return;
    }

    setIsLoading(true);

    try {
      // Register user
      const result = await authService.signUp(email, password, walletAddress, name || 'Admin User');

      if (result.success && result.user) {
        // Update user to admin
        const client = authService.getClient();
        const { error: updateError } = await client
          .from('wallet_users')
          .update({ role: 'admin' })
          .eq('auth_user_id', result.user.id);

        if (updateError) {
          setError('User created but failed to set admin role. Contact support.');
        } else {
          setSuccess('Admin account created successfully! Redirecting...');
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        }
      } else {
        setError(result.error || 'Failed to create admin account');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 animate-in fade-in duration-700">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-amber-500 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-amber-500/20 rotate-3">
            <Shield className="text-black fill-current" size={40} />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white">Admin Registration</h1>
          <p className="text-gray-400 font-medium">Create an administrator account</p>
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <p className="text-xs text-amber-500 font-bold">⚠️ Requires admin secret key</p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-500 text-sm animate-in fade-in zoom-in duration-300">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-500 text-sm animate-in fade-in zoom-in duration-300">
            <CheckCircle size={20} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-2">Admin Secret Key</label>
              <div className="relative">
                <Key size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500" />
                <input
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="Enter admin secret key"
                  required
                  className="w-full bg-white/5 border border-amber-500/20 rounded-2xl py-4 pl-12 pr-4 text-white font-medium outline-none focus:border-amber-500/50 transition-all placeholder:text-gray-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-2">Name</label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Admin Name"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-medium outline-none focus:border-[#00FF88]/50 transition-all placeholder:text-gray-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-2">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-medium outline-none focus:border-[#00FF88]/50 transition-all placeholder:text-gray-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-2">Wallet Address</label>
              <div className="relative">
                <Wallet size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="EQ... or UQ..."
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-mono text-sm outline-none focus:border-[#00FF88]/50 transition-all placeholder:text-gray-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-2">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-medium outline-none focus:border-[#00FF88]/50 transition-all placeholder:text-gray-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-2">Confirm Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-medium outline-none focus:border-[#00FF88]/50 transition-all placeholder:text-gray-700"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full p-5 bg-amber-500 text-black rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <>
                <Loader size={20} className="animate-spin" />
                Creating Admin...
              </>
            ) : (
              <>
                <Shield size={20} />
                Create Admin Account
              </>
            )}
          </button>
        </form>

        <div className="text-center space-y-4">
          <p className="text-sm text-gray-500">
            <Link to="/login" className="text-[#00FF88] hover:underline font-bold">
              Access Wallet
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminRegister;
