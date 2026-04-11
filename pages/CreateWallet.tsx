import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, ArrowRight, ChevronLeft, RefreshCw, Eye, EyeOff, AlertCircle, ShieldCheck, Copy, Lock } from 'lucide-react';
import { tonWalletService } from '../services/tonWalletService';
import { useWallet } from '../context/WalletContext';
import { validatePassword, generateVerificationChallenge, verifyMnemonicWords } from '../utils/encryption';
import { useToast } from '../context/ToastContext';
import { supabaseService } from '../services/supabaseService';
import { rzcRewardService } from '../services/rzcRewardService';
import { processReferralSignup, validateReferralCode } from '../utils/referralUtils';

// BIP-39 English word list (subset for autocomplete - in production import full list)
const BIP39_WORDS_URL = 'https://raw.githubusercontent.com/bitcoin/bips/master/bip-0039/english.txt';

const STEPS = ['Select Type', 'Backup Phrase', 'Set Password', 'Verify Backup', 'Confirm'];

const CreateWallet: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoggedIn } = useWallet();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref');

  const [walletType, setWalletType] = useState<'ton-24' | 'multi-12' | null>(null);
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // BIP-39 wordlist for autocomplete
  const [bip39Words, setBip39Words] = useState<string[]>([]);

  // Referral states
  const [referralValidation, setReferralValidation] = useState<{
    isValid: boolean; referrerName?: string;
  } | null>(null);

  // Password states
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Phrase display states
  const [isRevealed, setIsRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  // Verification states
  const [verificationPositions, setVerificationPositions] = useState<number[]>([]);
  const [verificationInputs, setVerificationInputs] = useState<string[]>(['', '', '']);
  const [verificationError, setVerificationError] = useState('');
  const [suggestions, setSuggestions] = useState<string[][]>([[], [], []]);
  const [activeSuggestion, setActiveSuggestion] = useState<number | null>(null);

  // Final confirmation checkboxes
  const [confirmations, setConfirmations] = useState({
    storage: false, digital: false, password: false, responsibility: false
  });

  // ─── Redirect removed so logged in users can add a new wallet ─────────

  // ─── Load BIP-39 wordlist for autocomplete ────────────────────────────────
  useEffect(() => {
    fetch(BIP39_WORDS_URL)
      .then(r => r.text())
      .then(text => setBip39Words(text.trim().split('\n')))
      .catch(() => {
        // Fallback: autocomplete will still work from mnemonic words themselves
      });
  }, []);

  // ─── Validate referral code ───────────────────────────────────────────────
  useEffect(() => {
    if (!referralCode) return;
    validateReferralCode(referralCode).then(v => {
      setReferralValidation(v);
      if (!v.isValid) showToast(`Invalid referral code`, 'warning');
    });
  }, [referralCode, showToast]);

  // ─── Generate mnemonic with secure entropy ────────────────────────────────
  const generateWalletMnemonic = async (type: 'ton-24' | 'multi-12') => {
    setIsLoading(true);
    setError(null);
    try {
      if (type === 'ton-24') {
        const extraEntropy = crypto.getRandomValues(new Uint8Array(32));
        const res = await tonWalletService.generateNewWallet();
        if (res.success && res.mnemonic) {
          setMnemonic(res.mnemonic);
        } else {
          setError(res.error || 'Failed to generate wallet');
        }
      } else {
        const { tetherWdkService } = await import('../services/tetherWdkService');
        const phrase = tetherWdkService.generateMnemonic();
        setMnemonic(phrase.split(' '));
      }
    } catch {
      setError('An unexpected error occurred');
    }
    setIsLoading(false);
    setStep(1);
  };

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleCopy = () => {
    if (!isRevealed) return;
    // Format as professional numbered list
    const formatted = mnemonic
      .map((word, i) => `${String(i + 1).padStart(2, ' ')}. ${word}`)
      .join('\n');
    navigator.clipboard.writeText(formatted);
    setCopied(true);
    showToast('Recovery phrase copied', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStep1Next = () => {
    if (!isRevealed) {
      showToast('Please reveal your phrase before continuing', 'warning');
      return;
    }
    setStep(2);
  };

  const handleStep2Next = () => {
    const validation = validatePassword(password);
    if (!validation.valid) { setPasswordError(validation.message); return; }
    if (password !== confirmPassword) { setPasswordError('Passwords do not match'); return; }
    setPasswordError('');
    // Generate verification positions based on mnemonic length
    const totalWords = walletType === 'multi-12' ? 12 : 24;
    const positions: number[] = [];
    while (positions.length < 3) {
      const p = Math.floor(Math.random() * totalWords);
      if (!positions.includes(p)) positions.push(p);
    }
    setVerificationPositions(positions.sort((a, b) => a - b));
    setVerificationInputs(['', '', '']);
    setSuggestions([[], [], []]);
    setStep(3);
  };

  const handleVerificationInput = (idx: number, value: string) => {
    // Update input
    const newInputs = [...verificationInputs];
    newInputs[idx] = value;
    setVerificationInputs(newInputs);
    setVerificationError('');

    // Build autocomplete from BIP-39 list (or fallback to mnemonic words)
    const wordPool = bip39Words.length > 0 ? bip39Words : mnemonic;
    const query = value.toLowerCase().trim();
    const newSuggestions = [...suggestions];
    if (query.length >= 2) {
      newSuggestions[idx] = wordPool.filter(w => w.startsWith(query)).slice(0, 5);
    } else {
      newSuggestions[idx] = [];
    }
    setSuggestions(newSuggestions);
    setActiveSuggestion(newSuggestions[idx].length > 0 ? idx : null);
  };

  const applySuggestion = (inputIdx: number, word: string) => {
    const newInputs = [...verificationInputs];
    newInputs[inputIdx] = word;
    setVerificationInputs(newInputs);
    const newSuggestions = [...suggestions];
    newSuggestions[inputIdx] = [];
    setSuggestions(newSuggestions);
    setActiveSuggestion(null);
    setVerificationError('');
  };

  const handleVerification = () => {
    if (verificationInputs.some(i => !i.trim())) {
      setVerificationError('Please fill in all words');
      return;
    }
    const isValid = verifyMnemonicWords(mnemonic, verificationInputs, verificationPositions);
    if (!isValid) {
      setVerificationError('Incorrect words. Please check your backup and try again.');
      return;
    }
    setVerificationError('');
    setStep(4);
  };

  const handleComplete = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let walletAddress = '';
      let addResult: any;

      if (walletType === 'ton-24') {
        const initResult = await tonWalletService.initializeWallet(mnemonic, password);
        if (!initResult.success || !initResult.address) throw new Error('Failed to initialize TON Vault');
        walletAddress = initResult.address;
        
        const { WalletManager } = await import('../utils/walletManager');
        addResult = await WalletManager.addWallet(mnemonic, password, walletAddress, 'TON Vault', 'primary');
      } else {
        const { tetherWdkService } = await import('../services/tetherWdkService');
        const addrs = await tetherWdkService.initializeManagers(mnemonic.join(' '));
        if (!addrs || !addrs.tonAddress) {
          throw new Error('Multi-Chain initialization failed: Could not derive TON address.');
        }
        walletAddress = addrs.tonAddress;

        const { WalletManager } = await import('../utils/walletManager');
        addResult = await WalletManager.addWallet(mnemonic, password, walletAddress, 'Multi-Chain Wallet', 'secondary', {
          evm:  addrs.evmAddress,
          ton:  addrs.tonAddress,
          btc:  addrs.btcAddress,
          sol:  addrs.solAddress  || undefined,
          tron: addrs.tronAddress || undefined,
        });
      }

      if (!addResult.success || !addResult.walletId) {
        showToast(addResult.error || 'Failed to save wallet', 'error');
        setIsLoading(false);
        return;
      }

      if (supabaseService.isConfigured()) {
        let referrerId: string | null = null;
        if (referralCode) {
          const referrerResult = await supabaseService.getUserByReferralCode(referralCode);
          if (referrerResult.success && referrerResult.data) referrerId = referrerResult.data.user_id;
        }

        const profileResult = await supabaseService.createOrUpdateProfile({
          wallet_address: walletAddress,
          name: `Rhiza User #${walletAddress.slice(-4)}`,
          avatar: '🌱', role: 'user', is_active: true,
          referrer_code: referralCode || null
        });

        if (profileResult.success && profileResult.data) {
          const signupBonus = await rzcRewardService.awardSignupBonus(profileResult.data.id);
          if (signupBonus.success) {
            try {
              const { notificationService } = await import('../services/notificationService');
              await notificationService.createNotification(walletAddress, 'reward_claimed', 'Welcome to Rhiza! 🎉',
                `Your wallet has been created! You received ${signupBonus.amount} RZC as a welcome bonus.`,
                { data: { bonus_amount: signupBonus.amount, wallet_address: walletAddress, bonus_type: 'signup' }, priority: 'high' }
              );
            } catch {}
          }

          const referralResult = await supabaseService.createReferralCode(profileResult.data.id, walletAddress, referrerId);
          if (referralResult.success && referrerId) {
            await supabaseService.incrementReferralCount(referrerId);
            await supabaseService.updateReferralRank(referrerId);
            const referralBonus = await rzcRewardService.awardReferralBonus(referrerId, profileResult.data.id, walletAddress);
            if (referralBonus.success) {
              try {
                const { notificationService } = await import('../services/notificationService');
                const referrerProfile = await supabaseService.getProfileById(referrerId);
                if (referrerProfile.success && referrerProfile.data) {
                  const msg = referralBonus.milestoneReached
                    ? `New referral! You earned ${referralBonus.amount} RZC + ${referralBonus.milestoneBonus} RZC milestone bonus! 🎉`
                    : `New referral! You earned ${referralBonus.amount} RZC.`;
                  await notificationService.createNotification(referrerProfile.data.wallet_address, 'referral_joined', 'New Referral! 🎉', msg,
                    { data: { referral_code: referralCode, new_user_address: walletAddress, bonus_amount: referralBonus.amount || 25 }, priority: 'high' }
                  );
                }
              } catch {}
            }
          }

          await supabaseService.trackEvent('wallet_created', {
            wallet_address: walletAddress, creation_method: 'new_wallet',
            has_referrer: !!referrerId, referrer_code: referralCode || null
          });
        }
      }

      const success = await login(mnemonic, password, walletType === 'multi-12' ? 'secondary' : 'primary');
      if (success && addResult.walletId) {
        const { WalletManager } = await import('../utils/walletManager');
        WalletManager.setActiveWallet(addResult.walletId);
        showToast('Wallet created successfully! 🎉', 'success');
        navigate('/wallet/dashboard');
      } else {
        showToast('Login failed after wallet creation. Please try manual login.', 'error');
      }
    } catch (err) {
      console.error('Wallet creation error:', err);
      showToast(err instanceof Error ? err.message : 'An unexpected error occurred', 'error');
    }
    setIsLoading(false);
  };

  // ─── Password strength ────────────────────────────────────────────────────
  const getPasswordStrength = () => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 2) return { label: 'Weak', color: '#ef4444', width: '25%' };
    if (score <= 4) return { label: 'Fair', color: '#f59e0b', width: '55%' };
    if (score <= 5) return { label: 'Good', color: '#3b82f6', width: '80%' };
    return { label: 'Strong', color: '#00FF88', width: '100%' };
  };

  const strength = getPasswordStrength();
  const allConfirmed = Object.values(confirmations).every(Boolean);

  // ─── Loading screen ───────────────────────────────────────────────────────
  if (isLoading && step === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-transparent">
        <div className="text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-[#00FF88]/10 flex items-center justify-center mx-auto">
            <ShieldCheck className="text-[#00FF88] animate-pulse" size={32} />
          </div>
          <div>
            <p className="text-gray-900 dark:text-white font-bold text-lg">Generating secure wallet</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Using cryptographic entropy...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && step === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-white dark:bg-transparent">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="text-red-400" size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Generation Failed</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">{error}</p>
          </div>
          <button onClick={() => window.location.reload()}
            className="w-full py-3.5 bg-[#00FF88] text-black rounded-2xl font-bold text-sm">
            Try Again
          </button>
          <button onClick={() => navigate(isLoggedIn ? '/wallet/dashboard' : '/onboarding')}
            className="w-full py-3.5 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-2xl font-semibold text-sm">
            Back
          </button>
        </div>
      </div>
    );
  }

  // ─── Main UI ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-transparent">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <button
          onClick={() => step === 0 || step === 1 ? navigate(isLoggedIn ? '/wallet/dashboard' : '/onboarding') : setStep(step - 1)}
          className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
        >
          <ChevronLeft size={18} />
        </button>

        {/* Step dots */}
        <div className="flex items-center gap-1.5">
          {STEPS.map((_, i) => (
            <div key={i} className={`rounded-full transition-all duration-300 ${i + 1 === step ? 'w-6 h-2 bg-[#00FF88]' : i + 1 < step ? 'w-2 h-2 bg-[#00FF88]/40' : 'w-2 h-2 bg-gray-300 dark:bg-white/10'}`} />
          ))}
        </div>

        <div className="text-xs text-gray-600 dark:text-gray-500 font-semibold">{step}/{STEPS.length}</div>
      </div>

      {/* Referral banner */}
      {referralCode && referralValidation?.isValid && (
        <div className="mx-6 mb-2 px-4 py-2.5 bg-[#00FF88]/10 border border-[#00FF88]/20 rounded-2xl flex items-center gap-2.5">
          <Check size={14} className="text-[#00FF88] shrink-0" />
          <p className="text-xs text-[#00FF88] font-semibold">Referred by {referralValidation.referrerName} · You'll both earn bonus RZC!</p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col px-6 pb-8 max-w-lg mx-auto w-full bg-white dark:bg-transparent">

        {/* ── STEP 0: Select Type ── */}
        {step === 0 && (
          <div className="flex flex-col flex-1 pt-4 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Choose Wallet Format</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1.5 leading-relaxed">
                Rhiza supports two types of wallets. Choose the one that best fits your needs.
              </p>
            </div>

            <div className="space-y-4">
              <button 
                onClick={() => setWalletType('ton-24')}
                className={`w-full p-5 rounded-3xl border-2 text-left transition-all ${walletType === 'ton-24' ? 'border-[#00FF88] bg-[#00FF88]/10' : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:border-gray-300 dark:hover:border-white/30'}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">TON Vault (24 Words)</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Standard high-security native TON wallet. Best for dedicated TON users.</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${walletType === 'ton-24' ? 'border-[#00FF88] bg-[#00FF88]' : 'border-gray-400 dark:border-gray-600'}`}>
                    {walletType === 'ton-24' && <div className="w-2 h-2 rounded-full bg-black" />}
                  </div>
                </div>
              </button>

              <button 
                onClick={() => setWalletType('multi-12')}
                className={`w-full p-5 rounded-3xl border-2 text-left transition-all ${walletType === 'multi-12' ? 'border-violet-500 bg-violet-500/10' : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:border-gray-300 dark:hover:border-white/30'}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Multi-Chain (12 Words)</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Supports TON W5, Polygon EVM, and Bitcoin all derived from one 12-phrase seed.</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${walletType === 'multi-12' ? 'border-violet-500 bg-violet-500' : 'border-gray-400 dark:border-gray-600'}`}>
                    {walletType === 'multi-12' && <div className="w-2 h-2 rounded-full bg-black" />}
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={() => {
                if (walletType) generateWalletMnemonic(walletType);
              }}
              disabled={!walletType}
              className="w-full xl mt-auto py-4 bg-[#00FF88] text-black rounded-2xl font-bold text-sm hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Generate Protocol <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* ── STEP 1: Recovery Phrase ── */}
        {step === 1 && (
          <div className="flex flex-col flex-1 pt-4 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Secret Recovery Phrase</h1>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${walletType === 'multi-12' ? 'bg-violet-500/20 text-violet-400' : 'bg-[#00FF88]/20 text-[#00FF88]'}`}>
                  {walletType === 'multi-12' ? '12 Words' : '24 Words'}
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1.5 leading-relaxed">
                Write down these {mnemonic.length} words in order on paper. This is the only way to recover your wallet.
              </p>
            </div>

            {/* Phrase grid with blur-to-reveal */}
            <div className="relative rounded-3xl overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
              <div className={`grid grid-cols-3 gap-0 transition-all duration-300 ${!isRevealed ? 'blur-lg select-none pointer-events-none' : ''}`}>
                {mnemonic.map((word, idx) => (
                  <div key={idx} className={`flex items-center gap-2 px-3 py-2.5 ${idx % 3 !== 2 ? 'border-r border-gray-200 dark:border-white/5' : ''} ${idx < mnemonic.length - 3 ? 'border-b border-gray-200 dark:border-white/5' : ''}`}>
                    <span className="text-[10px] text-gray-500 dark:text-gray-600 w-5 shrink-0 font-mono">{idx + 1}</span>
                    <span className="text-sm text-gray-900 dark:text-white font-semibold tracking-wide">{word}</span>
                  </div>
                ))}
              </div>

              {!isRevealed && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/30 dark:bg-black/30 backdrop-blur-sm">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                    <Eye size={22} className="text-white" />
                  </div>
                  <button
                    onClick={() => setIsRevealed(true)}
                    className="px-5 py-2.5 bg-white text-black rounded-xl font-bold text-sm hover:bg-[#00FF88] transition-colors"
                  >
                    Tap to Reveal
                  </button>
                  <p className="text-xs text-gray-300 px-8 text-center">Make sure no one can see your screen</p>
                </div>
              )}

              {isRevealed && (
                <button
                  onClick={() => setIsRevealed(false)}
                  className="absolute top-3 right-3 px-2.5 py-1.5 bg-black/40 backdrop-blur-sm rounded-lg flex items-center gap-1.5 text-xs text-gray-300 font-medium hover:text-white transition-colors"
                >
                  <EyeOff size={12} /> Hide
                </button>
              )}
            </div>

            {/* Warning notice */}
            <div className="flex items-start gap-3 p-4 bg-amber-500/8 border border-amber-500/15 rounded-2xl">
              <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400/90 leading-relaxed font-medium">
                Never share your recovery phrase with anyone. Rhiza will never ask for it. Anyone with these words can access your wallet.
              </p>
            </div>

            <div className="flex gap-3 mt-auto">
              <button
                onClick={handleCopy}
                disabled={!isRevealed}
                className="flex-1 py-3.5 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {copied ? <Check size={16} className="text-[#00FF88]" /> : <Copy size={16} />}
                {copied ? 'Copied' : 'Copy Phrase'}
              </button>
              <button
                onClick={handleStep1Next}
                className="flex-1 py-3.5 bg-[#00FF88] text-black rounded-2xl flex items-center justify-center gap-2 text-sm font-bold hover:brightness-110 transition-all"
              >
                I've Saved It <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Set Password ── */}
        {step === 2 && (
          <div className="flex flex-col flex-1 pt-4 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Set a Password</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1.5 leading-relaxed">
                This password encrypts your wallet locally. You'll need it every time you open the app.
              </p>
            </div>

            <div className="space-y-4">
              {/* Password input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setPasswordError(''); }}
                    className="w-full px-4 py-3.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-600 outline-none focus:border-[#00FF88]/50 focus:ring-1 focus:ring-[#00FF88]/20 transition-all font-medium text-sm"
                    placeholder="Enter password"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors p-1">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Strength bar */}
                {password.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="h-1 bg-gray-200 dark:bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: strength.width, backgroundColor: strength.color }} />
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex gap-1">
                        {[8, 12].map(len => (
                          <span key={len} className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${password.length >= len ? 'text-[#00FF88] bg-[#00FF88]/10' : 'text-gray-500 dark:text-gray-600 bg-gray-100 dark:bg-white/5'}`}>
                            {len}+
                          </span>
                        ))}
                        {[/[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].map((re, i) => (
                          <span key={i} className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${re.test(password) ? 'text-[#00FF88] bg-[#00FF88]/10' : 'text-gray-500 dark:text-gray-600 bg-gray-100 dark:bg-white/5'}`}>
                            {['A-Z', '0-9', '!@#'][i]}
                          </span>
                        ))}
                      </div>
                      <span className="text-[11px] font-bold" style={{ color: strength.color }}>{strength.label}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setPasswordError(''); }}
                    className={`w-full px-4 py-3.5 bg-gray-50 dark:bg-white/5 border rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-600 outline-none focus:ring-1 transition-all font-medium text-sm ${
                      confirmPassword && password !== confirmPassword
                        ? 'border-red-500/40 focus:border-red-500/50 focus:ring-red-500/20'
                        : confirmPassword && password === confirmPassword
                        ? 'border-[#00FF88]/40 focus:border-[#00FF88]/50 focus:ring-[#00FF88]/20'
                        : 'border-gray-200 dark:border-white/10 focus:border-[#00FF88]/50 focus:ring-[#00FF88]/20'
                    }`}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                  />
                  {confirmPassword && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      {password === confirmPassword
                        ? <Check size={16} className="text-[#00FF88]" />
                        : <AlertCircle size={16} className="text-red-400" />}
                    </div>
                  )}
                </div>
              </div>

              {passwordError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <AlertCircle size={14} className="text-red-400 shrink-0" />
                  <p className="text-xs text-red-400 font-medium">{passwordError}</p>
                </div>
              )}
            </div>

            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-500/8 border border-blue-200 dark:border-blue-500/15 rounded-2xl">
              <Lock size={14} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-400/90 leading-relaxed font-medium">Your password is never sent to our servers. It only exists on your device.</p>
            </div>

            <button onClick={handleStep2Next} disabled={!password || !confirmPassword}
              className="w-full mt-auto py-4 bg-[#00FF88] text-black rounded-2xl font-bold text-sm hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              Continue <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* ── STEP 3: Verify Backup ── */}
        {step === 3 && (
          <div className="flex flex-col flex-1 pt-4 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Verify Your Backup</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1.5 leading-relaxed">
                Enter the words at the positions below. Start typing for suggestions.
              </p>
            </div>

            <div className="space-y-4">
              {verificationPositions.map((pos, idx) => (
                <div key={pos} className="space-y-2 relative">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Word #{pos + 1}
                  </label>
                  <input
                    type="text"
                    value={verificationInputs[idx]}
                    onChange={e => handleVerificationInput(idx, e.target.value)}
                    onFocus={() => suggestions[idx].length > 0 && setActiveSuggestion(idx)}
                    onBlur={() => setTimeout(() => setActiveSuggestion(null), 150)}
                    className={`w-full pl-4 pr-10 py-3.5 bg-gray-50 dark:bg-white/5 border rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-600 outline-none focus:ring-1 transition-all font-medium text-sm ${
                      !verificationInputs[idx]
                        ? 'border-gray-200 dark:border-white/10 focus:border-gray-300 dark:focus:border-white/30 focus:ring-gray-200 dark:focus:ring-white/10'
                        : mnemonic[pos]?.toLowerCase() === verificationInputs[idx].toLowerCase().trim()
                        ? 'border-[#00FF88]/50 focus:border-[#00FF88]/70 focus:ring-[#00FF88]/20 bg-[#00FF88]/5'
                        : 'border-red-500/50 focus:border-red-500/70 focus:ring-red-500/20 bg-red-500/5'
                    }`}
                    placeholder={`Word #${pos + 1}`}
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                  />

                  {/* Per-word status icon */}
                  {verificationInputs[idx] && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      {mnemonic[pos]?.toLowerCase() === verificationInputs[idx].toLowerCase().trim()
                        ? <Check size={16} className="text-[#00FF88]" strokeWidth={2.5} />
                        : <AlertCircle size={16} className="text-red-400" />}
                    </div>
                  )}

                  {/* Inline mismatch hint */}
                  {verificationInputs[idx] && mnemonic[pos]?.toLowerCase() !== verificationInputs[idx].toLowerCase().trim() && (
                    <p className="text-[11px] text-red-400 font-medium pl-1 pt-1">
                      That's not word #{pos + 1} — check your backup
                    </p>
                  )}

                  {/* Autocomplete dropdown */}
                  {suggestions[idx].length > 0 && activeSuggestion === idx && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden z-20 shadow-xl">
                      {suggestions[idx].map(word => (
                        <button
                          key={word}
                          onMouseDown={() => applySuggestion(idx, word)}
                          className="w-full px-4 py-2.5 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-between group transition-colors"
                        >
                          <span className="font-medium">{word}</span>
                          <ArrowRight size={12} className="text-gray-400 dark:text-gray-600 group-hover:text-[#00FF88] transition-colors" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {verificationError && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertCircle size={14} className="text-red-400 shrink-0" />
                <p className="text-xs text-red-400 font-medium">{verificationError}</p>
              </div>
            )}

            <button onClick={handleVerification}
              disabled={verificationInputs.some(i => !i.trim())}
              className="w-full mt-auto py-4 bg-[#00FF88] text-black rounded-2xl font-bold text-sm hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              Confirm Backup <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* ── STEP 4: Final Confirmation ── */}
        {step === 4 && (
          <div className="flex flex-col flex-1 pt-4 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Almost Done</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1.5 leading-relaxed">
                Confirm you understand your responsibilities as a self-custodial wallet holder.
              </p>
            </div>

            <div className="space-y-3">
              {([
                { id: 'storage', label: 'Physical backup saved', desc: 'I\'ve written down my recovery phrase on paper.' },
                { id: 'digital', label: 'No digital copies', desc: 'I have not taken a screenshot or stored it in the cloud.' },
                { id: 'password', label: 'Password remembered', desc: 'I understand I need my password to access this wallet.' },
                { id: 'responsibility', label: 'Self-custody understood', desc: 'I am solely responsible for my wallet and its assets.' }
              ] as { id: keyof typeof confirmations; label: string; desc: string }[]).map(item => (
                <button
                  key={item.id}
                  onClick={() => setConfirmations(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all ${
                    confirmations[item.id]
                      ? 'border-[#00FF88]/30 bg-[#00FF88]/8'
                      : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/5'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                    confirmations[item.id] ? 'bg-[#00FF88] border-[#00FF88]' : 'border-gray-300 dark:border-white/20 bg-white dark:bg-transparent'
                  }`}>
                    {confirmations[item.id] && <Check size={13} className="text-black font-bold" strokeWidth={3} />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.label}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-500 mt-0.5">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleComplete}
              disabled={isLoading || !allConfirmed}
              className="w-full mt-auto py-4 bg-[#00FF88] text-black rounded-2xl font-bold text-sm hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <><RefreshCw className="animate-spin" size={16} /> Creating wallet...</>
              ) : (
                <><ShieldCheck size={16} /> Create Wallet</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateWallet;
