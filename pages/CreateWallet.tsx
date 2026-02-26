import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldAlert, Copy, Check, ArrowRight, ChevronLeft, Lock, RefreshCw, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { tonWalletService } from '../services/tonWalletService';
import { useWallet } from '../context/WalletContext';
import { validatePassword, generateVerificationChallenge, verifyMnemonicWords } from '../utils/encryption';
import { useToast } from '../context/ToastContext';
import { supabaseService } from '../services/supabaseService';
import { rzcRewardService } from '../services/rzcRewardService';

const CreateWallet: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useWallet();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  
  // Get referral code from URL parameter
  const referralCode = searchParams.get('ref');
  
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Password state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  
  // Verification state
  const [verificationPositions, setVerificationPositions] = useState<number[]>([]);
  const [verificationInputs, setVerificationInputs] = useState<string[]>(['', '', '']);
  const [verificationError, setVerificationError] = useState('');

  useEffect(() => {
    const generate = async () => {
      try {
        const res = await tonWalletService.generateNewWallet();
        if (res.success && res.mnemonic) {
          setMnemonic(res.mnemonic);
          setError(null);
        } else {
          setError(res.error || 'Failed to generate wallet');
          showToast('Failed to generate wallet. Please try again.', 'error');
        }
      } catch (err) {
        setError('An unexpected error occurred');
        showToast('An unexpected error occurred', 'error');
      }
      setIsLoading(false);
    };
    generate();
  }, [showToast]);

  const handleCopy = () => {
    navigator.clipboard.writeText(mnemonic.join(' '));
    setCopied(true);
    showToast('Mnemonic copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStep1Next = () => {
    setStep(2);
  };

  const handleStep2Next = () => {
    // Validate password
    const validation = validatePassword(password);
    if (!validation.valid) {
      setPasswordError(validation.message);
      return;
    }
    
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    setPasswordError('');
    
    // Generate verification challenge
    const positions = generateVerificationChallenge();
    setVerificationPositions(positions);
    setStep(3);
  };

  const handleVerification = () => {
    // Check if all inputs are filled
    if (verificationInputs.some(input => !input.trim())) {
      setVerificationError('Please fill in all words');
      return;
    }
    
    // Verify the words
    const isValid = verifyMnemonicWords(mnemonic, verificationInputs, verificationPositions);
    
    if (!isValid) {
      setVerificationError('Incorrect words. Please check your backup and try again.');
      showToast('Verification failed. Please check your words.', 'error');
      return;
    }
    
    setVerificationError('');
    setStep(4);
  };

  const handleComplete = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🚀 Starting wallet creation process...');
      
      // First, initialize the wallet to get the address
      const initResult = await tonWalletService.initializeWallet(mnemonic, password);
      
      if (!initResult.success || !initResult.address) {
        setError('Failed to initialize wallet');
        showToast('Failed to initialize wallet. Please try again.', 'error');
        setIsLoading(false);
        return;
      }

      const walletAddress = initResult.address;
      console.log('✅ Wallet initialized:', walletAddress);

      // Create user profile in Supabase
      if (supabaseService.isConfigured()) {
        console.log('💾 Creating user profile in Supabase...');
        
        // Look up referrer if referral code provided
        let referrerId: string | null = null;
        if (referralCode) {
          console.log('🔍 Looking up referrer with code:', referralCode);
          const referrerResult = await supabaseService.getUserByReferralCode(referralCode);
          if (referrerResult.success && referrerResult.data) {
            referrerId = referrerResult.data.user_id;
            console.log('✅ Referrer found:', referrerId);
          } else {
            console.warn('⚠️ Referral code not found:', referralCode);
          }
        }
        
        const profileResult = await supabaseService.createOrUpdateProfile({
          wallet_address: walletAddress,
          name: `Rhiza User #${walletAddress.slice(-4)}`,
          avatar: '🌱',
          role: 'user',
          is_active: true,
          referrer_code: referralCode || null // Store who referred this user
        });

        if (profileResult.success && profileResult.data) {
          console.log('✅ User profile created:', profileResult.data.id);
          
          // Award signup bonus (50 RZC)
          console.log('💰 Attempting to award signup bonus...');
          const signupBonus = await rzcRewardService.awardSignupBonus(profileResult.data.id);
          if (signupBonus.success) {
            console.log(`🎁 Signup bonus awarded: ${signupBonus.amount} RZC`);
            
            // Send welcome notification to new user
            try {
              const { notificationService } = await import('../services/notificationService');
              await notificationService.createNotification(
                walletAddress,
                'reward_claimed',
                'Welcome to Rhiza! 🎉',
                `Your wallet has been created successfully! You received ${signupBonus.amount} RZC as a welcome bonus.`,
                {
                  data: {
                    bonus_amount: signupBonus.amount,
                    wallet_address: walletAddress,
                    bonus_type: 'signup'
                  },
                  priority: 'high'
                }
              );
              console.log('📬 Welcome notification sent to new user');
            } catch (notifError) {
              console.warn('⚠️ Failed to send welcome notification:', notifError);
            }
          } else {
            console.error('❌ Signup bonus failed:', signupBonus.error);
            // Continue anyway - user can contact support
          }
          
          // Generate referral code for this new user
          console.log('🎫 Generating referral code...');
          const referralResult = await supabaseService.createReferralCode(
            profileResult.data.id,
            walletAddress,
            referrerId // Link to referrer if exists
          );
          
          if (referralResult.success) {
            console.log('✅ Referral code created:', referralResult.data?.referral_code);
            
            // If user was referred, increment referrer's count and award RZC bonus
            if (referrerId) {
              console.log('📈 Incrementing referrer count...');
              await supabaseService.incrementReferralCount(referrerId);
              await supabaseService.updateReferralRank(referrerId);
              
              // Award RZC tokens to referrer (25 RZC + potential milestone bonus)
              console.log('💰 Attempting to award referral bonus...');
              const referralBonus = await rzcRewardService.awardReferralBonus(
                referrerId,
                profileResult.data.id,
                walletAddress
              );
              
              if (referralBonus.success) {
                console.log(`🎁 Referral bonus awarded: ${referralBonus.amount} RZC`);
                if (referralBonus.milestoneReached) {
                  console.log(`🎉 Milestone bonus: ${referralBonus.milestoneBonus} RZC`);
                }
                
                // Send notification to referrer about new signup
                try {
                  const { notificationService } = await import('../services/notificationService');
                  const referrerProfile = await supabaseService.getUserProfile(referrerId);
                  
                  if (referrerProfile.success && referrerProfile.data) {
                    const totalBonus = (referralBonus.amount || 25) + (referralBonus.milestoneBonus || 0);
                    const message = referralBonus.milestoneReached
                      ? `Someone just joined using your referral link! You earned ${referralBonus.amount} RZC. Plus ${referralBonus.milestoneBonus} RZC milestone bonus! 🎉`
                      : `Someone just joined using your referral link! You earned ${referralBonus.amount} RZC.`;
                    
                    await notificationService.createNotification(
                      referrerProfile.data.wallet_address,
                      'referral_joined',
                      'New Referral Signup! 🎉',
                      message,
                      {
                        data: {
                          referral_code: referralCode,
                          new_user_address: walletAddress,
                          bonus_amount: referralBonus.amount || 25,
                          milestone_bonus: referralBonus.milestoneBonus || 0,
                          milestone_reached: referralBonus.milestoneReached || false,
                          total_bonus: totalBonus
                        },
                        priority: 'high'
                      }
                    );
                    console.log('📬 Notification sent to referrer');
                  }
                } catch (notifError) {
                  console.warn('⚠️ Failed to send notification:', notifError);
                  // Don't fail the signup if notification fails
                }
              } else {
                console.error('❌ Referral bonus failed:', referralBonus.error);
                // Continue anyway - referrer can contact support
              }
              
              console.log('✅ Referrer stats updated');
            }
          } else {
            console.warn('⚠️ Referral code creation failed:', referralResult.error);
          }
          
          // Track wallet creation event
          await supabaseService.trackEvent('wallet_created', {
            wallet_address: walletAddress,
            creation_method: 'new_wallet',
            has_referrer: !!referrerId,
            referrer_code: referralCode || null
          });
          console.log('📊 Analytics event tracked');
        } else {
          console.warn('⚠️ Profile creation failed:', profileResult.error);
          // Continue anyway - profile can be created on next login
        }
      } else {
        console.warn('⚠️ Supabase not configured - skipping profile creation');
      }

      // Add wallet to manager
      const { WalletManager } = await import('../utils/walletManager');
      const addResult = await WalletManager.addWallet(
        mnemonic,
        password,
        walletAddress
      );

      if (!addResult.success) {
        setError(addResult.error || 'Failed to save wallet');
        showToast(addResult.error || 'Failed to save wallet', 'error');
        setIsLoading(false);
        return;
      }

      console.log('✅ Wallet added to manager');

      // Login with the wallet
      const success = await login(mnemonic, password);
      if (success && addResult.walletId) {
        WalletManager.setActiveWallet(addResult.walletId);
        console.log('✅ Wallet creation complete!');
        showToast('Wallet created successfully!', 'success');
        navigate('/wallet/dashboard');
      } else {
        setError('Failed to initialize wallet');
        showToast('Failed to initialize wallet. Please try again.', 'error');
      }
    } catch (err) {
      console.error('❌ Wallet creation error:', err);
      setError('An unexpected error occurred');
      showToast('An unexpected error occurred', 'error');
    }
    
    setIsLoading(false);
  };

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    window.location.reload();
  };

  if (isLoading && step === 1) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="text-[#00FF88] animate-spin mx-auto" size={40} />
          <p className="text-gray-400 font-medium">Generating secure wallet...</p>
        </div>
      </div>
    );
  }

  if (error && step === 1) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-8">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="text-red-500" size={32} />
          </div>
          <h2 className="text-2xl font-black text-white">Generation Failed</h2>
          <p className="text-gray-400">{error}</p>
          <button
            onClick={handleRetry}
            className="w-full p-4 bg-[#00FF88] text-black rounded-2xl font-black text-sm uppercase tracking-wider hover:scale-105 transition-all"
          >
            Try Again
          </button>
          <button
            onClick={() => navigate('/onboarding')}
            className="w-full p-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-white/10 transition-all"
          >
            Back to Onboarding
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-8 page-enter">
      <div className="w-full max-w-3xl space-y-12">
        
        <button 
          onClick={() => step === 1 ? navigate('/onboarding') : setStep(step - 1)}
          className="flex items-center gap-3 text-gray-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest"
        >
          <ChevronLeft size={16} /> {step === 1 ? 'Back to Entry' : 'Previous Step'}
        </button>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                s === step ? 'w-12 bg-[#00FF88]' : s < step ? 'w-8 bg-[#00FF88]/50' : 'w-8 bg-white/10'
              }`}
            />
          ))}
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-black text-white tracking-tight-custom">
            {step === 1 && 'Your Private Key Sequence'}
            {step === 2 && 'Set Encryption Password'}
            {step === 3 && 'Verify Your Backup'}
            {step === 4 && 'Finalizing Security'}
          </h1>
          <p className="text-gray-400 text-lg font-medium leading-relaxed max-w-2xl">
            {step === 1 && 'These 24 words represent your digital vault key. Write them down in order on physical paper. Never store them digitally.'}
            {step === 2 && 'Create a strong password to encrypt your wallet. This adds an extra layer of security to your stored session.'}
            {step === 3 && 'To ensure you\'ve backed up your mnemonic correctly, please enter the words at the positions shown below.'}
            {step === 4 && 'Before we activate your terminal, confirm your understanding of self-sovereignty.'}
          </p>
        </div>

        {/* Step 1: Display Mnemonic */}
        {step === 1 && (
          <div className="space-y-10">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-10 luxury-card rounded-[3rem] shadow-3xl">
              {mnemonic.map((word, idx) => (
                <div key={idx} className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-[#00FF88]/30 transition-all">
                  <span className="text-[9px] font-mono text-gray-700 w-4 font-bold">{idx + 1}</span>
                  <span className="text-sm font-black text-white group-hover:text-[#00FF88] transition-colors">{word}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-6">
              <button 
                onClick={handleCopy}
                className="flex-1 p-6 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-4 text-xs font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all group"
              >
                {copied ? <Check size={18} className="text-[#00FF88]" /> : <Copy size={18} className="group-hover:text-[#00FF88]" />}
                {copied ? 'Sequence Copied' : 'Secure Copy to Buffer'}
              </button>
              <button 
                onClick={handleStep1Next}
                className="flex-1 p-6 bg-[#00FF88] text-black rounded-2xl flex items-center justify-center gap-4 text-xs font-black uppercase tracking-widest transition-all hover:scale-[1.03] shadow-2xl"
              >
                I have stored it safely <ArrowRight size={18} />
              </button>
            </div>
            
            <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex gap-6">
               <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                  <ShieldAlert className="text-amber-500" size={20} />
               </div>
               <p className="text-xs text-amber-500/80 leading-relaxed font-bold">
                 RhizaCore Labs cannot recover this phrase. If you lose it, your assets are permanently lost. Write it down on paper and store it securely.
               </p>
            </div>
          </div>
        )}

        {/* Step 2: Set Password */}
        {step === 2 && (
          <div className="space-y-8 max-w-2xl">
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-black text-white uppercase tracking-wider">Create Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 outline-none focus:border-[#00FF88]/50 transition-all font-medium"
                    placeholder="Enter a strong password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-black text-white uppercase tracking-wider">Confirm Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 outline-none focus:border-[#00FF88]/50 transition-all font-medium"
                  placeholder="Re-enter your password"
                />
              </div>

              {passwordError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                  <p className="text-sm text-red-400 font-medium">{passwordError}</p>
                </div>
              )}

              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                <h4 className="text-xs font-black text-white uppercase tracking-wider">Password Requirements:</h4>
                <ul className="space-y-1 text-xs text-gray-400">
                  <li className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${password.length >= 8 ? 'bg-[#00FF88]' : 'bg-gray-600'}`} />
                    At least 8 characters
                  </li>
                  <li className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(password) ? 'bg-[#00FF88]' : 'bg-gray-600'}`} />
                    One uppercase letter
                  </li>
                  <li className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${/[a-z]/.test(password) ? 'bg-[#00FF88]' : 'bg-gray-600'}`} />
                    One lowercase letter
                  </li>
                  <li className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${/[0-9]/.test(password) ? 'bg-[#00FF88]' : 'bg-gray-600'}`} />
                    One number
                  </li>
                  <li className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${/[^A-Za-z0-9]/.test(password) ? 'bg-[#00FF88]' : 'bg-gray-600'}`} />
                    One special character
                  </li>
                </ul>
              </div>
            </div>

            <button 
              onClick={handleStep2Next}
              disabled={!password || !confirmPassword}
              className="w-full p-6 bg-[#00FF88] text-black rounded-2xl flex items-center justify-center gap-4 text-sm font-black uppercase tracking-widest transition-all hover:scale-[1.03] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              Continue to Verification <ArrowRight size={20} />
            </button>

            <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex gap-6">
               <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Lock className="text-blue-500" size={20} />
               </div>
               <p className="text-xs text-blue-400/80 leading-relaxed font-bold">
                 Your password encrypts your wallet locally. You'll need it every time you access your wallet. Make sure you remember it!
               </p>
            </div>
          </div>
        )}

        {/* Step 3: Verify Mnemonic */}
        {step === 3 && (
          <div className="space-y-8 max-w-2xl">
            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-6">
              <p className="text-sm text-gray-300 font-medium">
                Please enter the words at the following positions from your mnemonic phrase:
              </p>
              
              {verificationPositions.map((pos, idx) => (
                <div key={pos} className="space-y-2">
                  <label className="text-xs font-black text-white uppercase tracking-wider">
                    Word #{pos + 1}
                  </label>
                  <input
                    type="text"
                    value={verificationInputs[idx]}
                    onChange={(e) => {
                      const newInputs = [...verificationInputs];
                      newInputs[idx] = e.target.value;
                      setVerificationInputs(newInputs);
                      setVerificationError('');
                    }}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 outline-none focus:border-[#00FF88]/50 transition-all font-medium"
                    placeholder={`Enter word #${pos + 1}`}
                    autoComplete="off"
                  />
                </div>
              ))}

              {verificationError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                  <p className="text-sm text-red-400 font-medium">{verificationError}</p>
                </div>
              )}
            </div>

            <button 
              onClick={handleVerification}
              disabled={verificationInputs.some(input => !input.trim())}
              className="w-full p-6 bg-[#00FF88] text-black rounded-2xl flex items-center justify-center gap-4 text-sm font-black uppercase tracking-widest transition-all hover:scale-[1.03] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              Verify Backup <ArrowRight size={20} />
            </button>

            <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex gap-6">
               <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                  <ShieldAlert className="text-amber-500" size={20} />
               </div>
               <p className="text-xs text-amber-500/80 leading-relaxed font-bold">
                 This verification ensures you've correctly backed up your mnemonic phrase. Without it, you cannot recover your wallet.
               </p>
            </div>
          </div>
        )}

        {/* Step 4: Final Confirmation */}
        {step === 4 && (
          <div className="space-y-8 max-w-2xl">
            <div className="space-y-4">
              {[
                { title: "Physical Storage", desc: "I have written my phrase on a secure physical document." },
                { title: "No Digital Records", desc: "I will not take a photo, screenshot, or store this in the cloud." },
                { title: "Password Security", desc: "I understand my password encrypts my wallet and I must remember it." },
                { title: "Personal Responsibility", desc: "I acknowledge that I am solely responsible for my account's security." }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-6 p-6 luxury-card rounded-[2rem] border-white/5">
                   <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center text-[#00FF88] shrink-0">
                     <Check size={20} />
                   </div>
                   <div>
                     <h4 className="font-black text-sm text-white">{item.title}</h4>
                     <p className="text-xs text-gray-500 font-medium">{item.desc}</p>
                   </div>
                </div>
              ))}
            </div>

            <button 
              onClick={handleComplete}
              disabled={isLoading}
              className="w-full p-6 bg-white text-black rounded-2xl flex items-center justify-center gap-4 text-sm font-black uppercase tracking-widest transition-all hover:bg-[#00FF88] hover:scale-[1.03] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="animate-spin" size={20} />
                  Initializing...
                </>
              ) : (
                <>
                  Initialize My Vault <ArrowRight size={20} />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateWallet;
