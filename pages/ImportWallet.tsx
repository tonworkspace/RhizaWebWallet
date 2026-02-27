
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ArrowRight, Clipboard, ShieldCheck, AlertCircle, Eye, EyeOff, Lock } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { validatePassword } from '../utils/encryption';
import { supabaseService } from '../services/supabaseService';
import { useToast } from '../context/ToastContext';

const ImportWallet: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useWallet();
  const { showToast } = useToast();
  const [words, setWords] = useState<string[]>(Array(24).fill(''));
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleInputChange = (idx: number, value: string) => {
    setError(null);
    if (value.includes(' ') || value.includes('\n')) {
      const splitWords = value.trim().split(/[\s\n]+/).slice(0, 24 - idx);
      const newWords = [...words];
      splitWords.forEach((word, i) => {
        if (idx + i < 24) {
          newWords[idx + i] = word.toLowerCase().trim();
        }
      });
      setWords(newWords);
    } else {
      const newWords = [...words];
      newWords[idx] = value.toLowerCase().trim();
      setWords(newWords);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const splitWords = text.trim().split(/[\s\n]+/).slice(0, 24);
      if (splitWords.length > 0) {
        const newWords = Array(24).fill('');
        splitWords.forEach((word, i) => {
          if (i < 24) newWords[i] = word.toLowerCase().trim();
        });
        setWords(newWords);
        setError(null);
      }
    } catch (err) {
      setError("Clipboard access blocked. Please paste your phrase directly into the first box.");
    }
  };

  const handleVerify = async () => {
    // Validate password if provided
    if (password) {
      const validation = validatePassword(password);
      if (!validation.valid) {
        setError(validation.message);
        return;
      }
    }
    
    setIsVerifying(true);
    setError(null);
    
    try {
      console.log('🔐 Starting wallet import process...');
      
      // Import WalletManager
      const { WalletManager } = await import('../utils/walletManager');
      const { tonWalletService } = await import('../services/tonWalletService');
      
      // First, initialize to get the address
      const initResult = await tonWalletService.initializeWallet(words, password);
      
      if (!initResult.success || !initResult.address) {
        setError("Invalid recovery phrase. Please check and try again.");
        showToast('Invalid recovery phrase', 'error');
        setIsVerifying(false);
        return;
      }

      const walletAddress = initResult.address;
      console.log('✅ Wallet initialized:', walletAddress);

      // Check if wallet already exists in manager
      const existingWallets = WalletManager.getWallets();
      const exists = existingWallets.find(w => w.address === walletAddress);

      if (exists) {
        console.log('📂 Wallet already exists in manager');
        // Wallet exists, just login
        const success = await login(words, password || undefined);
        if (success) {
          WalletManager.setActiveWallet(exists.id);
          showToast('Wallet imported successfully!', 'success');
          navigate('/wallet/dashboard');
        } else {
          setError("Failed to initialize wallet");
          showToast('Failed to initialize wallet', 'error');
        }
      } else {
        console.log('📝 New wallet - adding to manager...');
        
        // Check if profile exists in Supabase
        if (supabaseService.isConfigured()) {
          console.log('💾 Checking for existing profile in Supabase...');
          
          const profileResult = await supabaseService.getProfile(walletAddress);
          
          if (!profileResult.success || !profileResult.data) {
            // Profile doesn't exist - create it
            console.log('📝 Creating new profile in Supabase...');
            
            const newProfile = await supabaseService.createOrUpdateProfile({
              wallet_address: walletAddress,
              name: `Rhiza User #${walletAddress.slice(-4)}`,
              avatar: '🌱',
              role: 'user',
              is_active: true
            });

            if (newProfile.success && newProfile.data) {
              console.log('✅ User profile created:', newProfile.data.id);
              
              // Generate referral code
              console.log('🎫 Generating referral code...');
              const referralResult = await supabaseService.createReferralCode(
                newProfile.data.id,
                walletAddress
              );
              
              if (referralResult.success) {
                console.log('✅ Referral code created:', referralResult.data?.referral_code);
              }
              
              // Track wallet import event
              await supabaseService.trackEvent('wallet_imported', {
                wallet_address: walletAddress,
                import_method: 'mnemonic'
              });
              console.log('📊 Analytics event tracked');
            }
          } else {
            console.log('✅ Existing profile found:', profileResult.data.name);
            
            // Track wallet import event for existing wallet
            await supabaseService.trackEvent('wallet_imported', {
              wallet_address: walletAddress,
              import_method: 'mnemonic',
              existing_profile: true
            });
          }
        }
        
        // Add wallet to manager
        const addResult = await WalletManager.addWallet(
          words,
          password || 'default_password', // Use default if no password provided
          walletAddress
        );

        if (!addResult.success) {
          setError(addResult.error || 'Failed to save wallet');
          showToast(addResult.error || 'Failed to save wallet', 'error');
          setIsVerifying(false);
          return;
        }

        console.log('✅ Wallet added to manager');

        // Login with the wallet
        const success = await login(words, password || undefined);
        if (success && addResult.walletId) {
          WalletManager.setActiveWallet(addResult.walletId);
          console.log('✅ Wallet import complete!');
          showToast('Wallet imported successfully!', 'success');
          navigate('/wallet/dashboard');
        } else {
          setError("Failed to initialize wallet");
          showToast('Failed to initialize wallet', 'error');
        }
      }
    } catch (err) {
      console.error('❌ Wallet import error:', err);
      setError("An unexpected error occurred");
      showToast('An unexpected error occurred', 'error');
    }
    
    setIsVerifying(false);
  };

  const isReady = words.every(w => w.length > 0);

  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-8 page-enter">
      <div className="w-full max-w-3xl space-y-8">
        
        <button 
          onClick={() => navigate('/onboarding')}
          className="flex items-center gap-3 text-gray-600 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white transition-colors text-xs font-black uppercase tracking-widest"
        >
          <ChevronLeft size={16} /> Back to Entry
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-gray-950 dark:text-white tracking-tight-custom">Initialize Access</h1>
            <p className="text-gray-700 dark:text-gray-400 text-sm font-semibold">Reconstitute your private keys using your 24-word sequence.</p>
          </div>
          <button 
            onClick={handlePaste}
            className="px-6 py-3 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-300 hover:text-[#00FF88] hover:border-[#00FF88] dark:hover:border-[#00FF88]/30 transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <Clipboard size={14} /> Paste Sequence
          </button>
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-500 text-xs font-bold animate-in fade-in zoom-in duration-300">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {words.map((word, idx) => (
            <div key={idx} className="relative group">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-mono text-gray-600 dark:text-gray-600 pointer-events-none font-bold">
                {idx + 1}
              </span>
              <input 
                type="text"
                value={word}
                onChange={(e) => handleInputChange(idx, e.target.value)}
                className="w-full bg-white dark:bg-[#0a0a0a] border-2 border-gray-300 dark:border-white/10 rounded-xl py-4 pl-9 pr-3 text-xs font-black text-gray-950 dark:text-white outline-none focus:border-[#00FF88] transition-all placeholder:text-gray-400 dark:placeholder:text-gray-800 shadow-sm"
                placeholder="..."
              />
            </div>
          ))}
        </div>

        {/* Password Input (Optional) */}
        <div className="space-y-3">
          <label className="text-sm font-black text-gray-950 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Lock size={14} className="text-[#00FF88]" />
            Encryption Password (Optional)
          </label>
          <p className="text-xs text-gray-700 dark:text-gray-500 font-semibold">
            If you set a password when creating this wallet, enter it here to decrypt your session.
          </p>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              className="w-full p-4 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-2xl text-gray-950 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 outline-none focus:border-[#00FF88] transition-all font-semibold shadow-sm"
              placeholder="Enter password (if you set one)"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <div className="pt-4 space-y-6">
          <button 
            disabled={!isReady || isVerifying}
            onClick={handleVerify}
            className={`w-full p-6 rounded-2xl flex items-center justify-center gap-3 text-sm font-black uppercase tracking-widest transition-all shadow-lg ${
              isReady && !isVerifying
                ? 'bg-gray-950 dark:bg-white text-white dark:text-black hover:bg-[#00FF88] hover:text-black border-2 border-gray-950 dark:border-white hover:border-[#00FF88]' 
                : 'bg-gray-200 dark:bg-white/5 text-gray-500 dark:text-gray-600 border-2 border-gray-300 dark:border-white/5 cursor-not-allowed'
            }`}
          >
            {isVerifying ? 'Decrypting Vault...' : 'Authorize Vault Access'} <ArrowRight size={18} />
          </button>

          <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-600">
            <ShieldCheck size={14} className="text-[#00FF88]/50" />
            <span className="text-[10px] font-black uppercase tracking-widest">End-to-End Encryption Enabled</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportWallet;
