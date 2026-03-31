
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ArrowRight, Clipboard, ShieldCheck, AlertCircle,
  Eye, EyeOff, Lock, Check, RefreshCw
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { validatePassword } from '../utils/encryption';
import { supabaseService } from '../services/supabaseService';
import { useToast } from '../context/ToastContext';
import { validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';

// BIP-39 wordlist for autocomplete
const BIP39_WORDS_URL = 'https://raw.githubusercontent.com/bitcoin/bips/master/bip-0039/english.txt';

const STEPS = ['Enter Phrase', 'Set Password'];

const ImportWallet: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoggedIn } = useWallet();
  const { showToast } = useToast();

  const [step, setStep] = useState(1);

  // Step 1: Phrase
  const [walletType, setWalletType] = useState<'ton-24' | 'multi-12'>('ton-24');
  const [words, setWords] = useState<string[]>(Array(24).fill(''));
  const [phraseError, setPhraseError] = useState<string | null>(null);
  const [bip39Words, setBip39Words] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[][]>(Array(24).fill([]));
  const [activeSuggestion, setActiveSuggestion] = useState<number | null>(null);

  // Step 2: Password
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Phrase validation state
  const [isValidating, setIsValidating] = useState(false);
  const [walletOrigin, setWalletOrigin] = useState<'rhiza' | 'foreign' | 'new' | null>(null);
  const [detectedAddress, setDetectedAddress] = useState<string | null>(null);

  // ─── Load BIP-39 wordlist ─────────────────────────────────────────────────
  useEffect(() => {
    fetch(BIP39_WORDS_URL)
      .then(r => r.text())
      .then(text => setBip39Words(text.trim().split('\n')))
      .catch(() => {});
  }, []);

  // ─── Paste smart handler — strips "1. word" numbering format ─────────────
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      // Strip numbered prefix like " 1. " or "1." etc.
      const cleaned = text
        .split('\n')
        .map(line => line.replace(/^\s*\d+\.\s*/, '').trim())
        .join(' ');
      const expectedLength = walletType === 'ton-24' ? 24 : 12;
      const splitWords = cleaned.trim().split(/[\s]+/).filter(Boolean).slice(0, expectedLength);
      if (splitWords.length > 0) {
        const newWords = Array(expectedLength).fill('');
        splitWords.forEach((word, i) => { newWords[i] = word.toLowerCase().trim(); });
        setWords(newWords);
        setPhraseError(null);
      }
    } catch {
      setPhraseError('Clipboard access blocked. Please paste your phrase directly into the first box.');
    }
  };

  // ─── Word input with autocomplete ─────────────────────────────────────────
  const handleInputChange = (idx: number, value: string) => {
    setPhraseError(null);

    // Handle paste-into-field (splits across remaining slots)
    const expectedLength = walletType === 'ton-24' ? 24 : 12;
    if (value.includes(' ') || value.includes('\n')) {
      const splitWords = value.trim().split(/[\s\n]+/).slice(0, expectedLength - idx);
      const newWords = [...words];
      splitWords.forEach((word, i) => {
        if (idx + i < expectedLength) newWords[idx + i] = word.toLowerCase().trim();
      });
      setWords(newWords);
      return;
    }

    const newWords = [...words];
    newWords[idx] = value.toLowerCase().trim();
    setWords(newWords);

    // Autocomplete
    const query = value.toLowerCase().trim();
    const newSuggestions = [...suggestions];
    if (query.length >= 2 && bip39Words.length > 0) {
      newSuggestions[idx] = bip39Words.filter(w => w.startsWith(query)).slice(0, 5);
    } else {
      newSuggestions[idx] = [];
    }
    setSuggestions(newSuggestions);
    setActiveSuggestion(newSuggestions[idx].length > 0 ? idx : null);
  };

  const applySuggestion = (idx: number, word: string) => {
    const newWords = [...words];
    newWords[idx] = word;
    setWords(newWords);
    const newSuggestions = [...suggestions];
    newSuggestions[idx] = [];
    setSuggestions(newSuggestions);
    setActiveSuggestion(null);
    setPhraseError(null);
  };

  // ─── Step 1 → Step 2: validate phrase then check DB origin ──────────────
  const handleStep1Next = async () => {
    const expectedLength = walletType === 'ton-24' ? 24 : 12;
    const filled = words.filter(w => w.length > 0);
    if (filled.length < expectedLength) {
      setPhraseError(`Please fill all ${expectedLength} words. You've entered ${filled.length} so far.`);
      return;
    }

    // ── 1. BIP-39 word validation ────────────────────────────────────────────
    if (bip39Words.length > 0) {
      const invalidWords = words
        .map((w, i) => ({ word: w, idx: i }))
        .filter(({ word }) => !bip39Words.includes(word.toLowerCase().trim()));

      if (invalidWords.length > 0) {
        const positions = invalidWords.map(({ idx }) => `#${idx + 1}`).join(', ');
        setPhraseError(
          `${invalidWords.length} word${invalidWords.length > 1 ? 's are' : ' is'} not valid BIP-39 words: position${invalidWords.length > 1 ? 's' : ''} ${positions}. Please check your backup.`
        );
        return;
      }
    }

    // ── 2. BIP-39 checksum validation (SECURITY ISSUE #5 FIX) ────────────────
    const mnemonicPhrase = words.join(' ');
    const isValidChecksum = validateMnemonic(mnemonicPhrase, wordlist);
    
    if (!isValidChecksum) {
      setPhraseError(
        'Invalid mnemonic checksum. The words are valid but the combination is incorrect. Please double-check your backup phrase.'
      );
      return;
    }

    setPhraseError(null);
    setIsValidating(true);
    setWalletOrigin(null);
    setDetectedAddress(null);

    try {
      // ── 2. Cryptographic validation ──────────────────────────────────────
      let derivedAddress = '';

      if (walletType === 'ton-24') {
        const { tonWalletService } = await import('../services/tonWalletService');
        const initResult = await tonWalletService.initializeWallet(words, 'temp_validation_key');

        if (!initResult.success || !initResult.address) {
          setPhraseError('Invalid recovery phrase. The words are valid but the combination is incorrect.');
          setIsValidating(false);
          return;
        }
        derivedAddress = initResult.address;
      } else {
        const { tetherWdkService } = await import('../services/tetherWdkService');
        const initResult = await tetherWdkService.initializeManagers(words.join(' '));
        if (!initResult || !initResult.tonAddress) {
          setPhraseError('Invalid recovery phrase. Cannot derive Multi-Chain wallet.');
          setIsValidating(false);
          return;
        }
        derivedAddress = initResult.tonAddress;
      }

      setDetectedAddress(derivedAddress);

      // ── 3. DB origin check ───────────────────────────────────────────────
      if (supabaseService.isConfigured()) {
        const profileResult = await supabaseService.getProfile(derivedAddress);
        if (profileResult.success && profileResult.data) {
          // Profile exists in Rhiza DB → returning Rhiza user
          setWalletOrigin('rhiza');
        } else {
          // Wallet address not in Rhiza DB → foreign/external wallet
          setWalletOrigin('foreign');
        }
      } else {
        // No DB configured, treat as new
        setWalletOrigin('new');
      }

      setStep(2);
    } catch (err: any) {
      console.error('Phrase validation error:', err);
      setPhraseError('Invalid recovery phrase. Could not derive a valid wallet from these words. Please double-check your backup.');
    }

    setIsValidating(false);
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

  // ─── Final import ─────────────────────────────────────────────────────────
  const handleVerify = async () => {
    // Validate password - REQUIRED for import
    const validation = validatePassword(password);
    if (!validation.valid) { setPasswordError(validation.message); return; }
    if (password !== confirmPassword) { setPasswordError('Passwords do not match'); return; }
    setPasswordError('');

    setIsVerifying(true);

    try {
      const { WalletManager } = await import('../utils/walletManager');
      let walletAddress = '';
      let addrs: any = null;

      if (walletType === 'ton-24') {
        const { tonWalletService } = await import('../services/tonWalletService');
        const initResult = await tonWalletService.initializeWallet(words, password);

        if (!initResult.success || !initResult.address) {
          setPasswordError('Invalid recovery phrase. Please go back and check your words.');
          setIsVerifying(false);
          return;
        }
        walletAddress = initResult.address;
      } else {
        const { tetherWdkService } = await import('../services/tetherWdkService');
        addrs = await tetherWdkService.initializeManagers(words.join(' '));
        if (!addrs || !addrs.tonAddress) {
          setPasswordError('Invalid recovery phrase. Cannot derive Multi-Chain wallet.');
          setIsVerifying(false);
          return;
        }
        walletAddress = addrs.tonAddress;
      }

      // Check if wallet already exists in the manager
      const existingWallets = WalletManager.getWallets();
      const exists = existingWallets.find(w => w.address === walletAddress);

      if (exists) {
        // Wallet already stored — try logging in with the NEW password the user just set
        // By re-adding it with the new password we ensure the stored key matches
        const addResult = await WalletManager.addWallet(words, password, walletAddress, walletType === 'multi-12' ? 'Multi-Chain Wallet' : 'TON Vault', walletType === 'multi-12' ? 'secondary' : 'primary', addrs ? { evm: addrs.evmAddress, ton: addrs.tonAddress, btc: addrs.btcAddress } : undefined);
        const success = await login(words, password, walletType === 'multi-12' ? 'secondary' : 'primary');
        if (success) {
          WalletManager.setActiveWallet(addResult.walletId ?? exists.id);
          showToast('Wallet imported and re-secured!', 'success');
          navigate('/wallet/dashboard');
        } else {
          setPasswordError('Failed to initialize wallet. Please try again.');
        }
        setIsVerifying(false);
        return;
      }

      // New wallet — create Supabase profile if configured
      if (supabaseService.isConfigured()) {
        const profileResult = await supabaseService.getProfile(walletAddress);
        if (!profileResult.success || !profileResult.data) {
          const newProfile = await supabaseService.createOrUpdateProfile({
            wallet_address: walletAddress,
            name: `Rhiza User #${walletAddress.slice(-4)}`,
            avatar: '🌱', role: 'user', is_active: true
          });
          if (newProfile.success && newProfile.data) {
            await supabaseService.createReferralCode(newProfile.data.id, walletAddress);
          }
        }
        await supabaseService.trackEvent('wallet_imported', {
          wallet_address: walletAddress, import_method: 'mnemonic'
        });
      }

      // Add wallet with the user-chosen password (NEVER a default/empty password)
      const addResult = await WalletManager.addWallet(words, password, walletAddress, walletType === 'multi-12' ? 'Multi-Chain Wallet' : 'TON Vault', walletType === 'multi-12' ? 'secondary' : 'primary', addrs ? { evm: addrs.evmAddress, ton: addrs.tonAddress, btc: addrs.btcAddress } : undefined);
      if (!addResult.success) {
        setPasswordError(addResult.error || 'Failed to save wallet');
        setIsVerifying(false);
        return;
      }

      const success = await login(words, password, walletType === 'multi-12' ? 'secondary' : 'primary');
      if (success && addResult.walletId) {
        WalletManager.setActiveWallet(addResult.walletId);
        showToast('Wallet imported successfully!', 'success');
        navigate('/wallet/dashboard');
      } else {
        setPasswordError('Failed to initialize wallet. Please try again.');
      }
    } catch (err) {
      console.error('Wallet import error:', err);
      setPasswordError('An unexpected error occurred');
    }

    setIsVerifying(false);
  };

  const isReady = words.every(w => w.length > 0);
  const strength = getPasswordStrength();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'transparent' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <button
          onClick={() => step === 1 ? navigate(isLoggedIn ? '/wallet/dashboard' : '/onboarding') : setStep(1)}
          className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <ChevronLeft size={18} />
        </button>

        {/* Step dots */}
        <div className="flex items-center gap-1.5">
          {STEPS.map((_, i) => (
            <div key={i} className={`rounded-full transition-all duration-300 ${i + 1 === step ? 'w-6 h-2 bg-[#00FF88]' : i + 1 < step ? 'w-2 h-2 bg-[#00FF88]/40' : 'w-2 h-2 bg-white/10'}`} />
          ))}
        </div>

        <div className="text-xs text-gray-500 font-semibold">{step}/{STEPS.length}</div>
      </div>

      <div className="flex-1 flex flex-col px-6 pb-8 max-w-lg mx-auto w-full">

        {/* ── STEP 1: Enter Recovery Phrase ── */}
        {step === 1 && (
          <div className="flex flex-col flex-1 pt-4 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white">Enter Recovery Phrase</h1>
                <p className="text-gray-400 text-sm mt-1.5 leading-relaxed">
                  Enter your phrase in the correct order to restore your wallet.
                </p>
              </div>
              <button
                onClick={handlePaste}
                className="shrink-0 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2"
              >
                <Clipboard size={13} /> Paste
              </button>
            </div>

            {/* Wallet Type Toggle */}
            <div className="flex bg-white/5 p-1 rounded-xl">
              <button 
                onClick={() => {
                  setWalletType('ton-24');
                  const newWords = [...words];
                  while(newWords.length < 24) newWords.push('');
                  setWords(newWords);
                }} 
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${walletType === 'ton-24' ? 'bg-[#00FF88] text-black shadow-lg shadow-[#00FF88]/20' : 'text-gray-400 hover:text-white'}`}
              >
                TON Vault (24 Words)
              </button>
              <button 
                onClick={() => {
                  setWalletType('multi-12');
                  setWords(words.slice(0, 12));
                }} 
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${walletType === 'multi-12' ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20' : 'text-gray-400 hover:text-white'}`}
              >
                Multi-Chain (12 Words)
              </button>
            </div>

            {/* 24/12-word grid */}
            <div className={`grid grid-cols-3 gap-2 ${walletType === 'multi-12' ? 'grid-rows-4' : ''}`}>
              {words.map((word, idx) => (
                <div key={idx} className="relative">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-gray-600 pointer-events-none select-none w-5 text-right">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={word}
                      onChange={e => handleInputChange(idx, e.target.value)}
                      onFocus={() => suggestions[idx].length > 0 && setActiveSuggestion(idx)}
                      onBlur={() => setTimeout(() => setActiveSuggestion(null), 150)}
                      className={`w-full pl-8 pr-2 py-2.5 bg-white/5 border rounded-xl text-xs font-semibold text-white placeholder-gray-700 outline-none transition-all ${
                        word.length > 0 && bip39Words.length > 0 && !bip39Words.includes(word)
                          ? 'border-amber-500/40 focus:border-amber-500/60'
                          : word.length > 0 && bip39Words.length > 0 && bip39Words.includes(word)
                          ? 'border-[#00FF88]/30 focus:border-[#00FF88]/50'
                          : 'border-white/8 focus:border-white/20'
                      }`}
                      placeholder="word"
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                    />
                  </div>

                  {/* Word autocomplete dropdown */}
                  {suggestions[idx].length > 0 && activeSuggestion === idx && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-gray-900 border border-white/10 rounded-xl overflow-hidden z-20 shadow-xl">
                      {suggestions[idx].map(w => (
                        <button
                          key={w}
                          onMouseDown={() => applySuggestion(idx, w)}
                          className="w-full px-3 py-2 text-left text-xs text-white hover:bg-white/5 transition-colors font-medium"
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {phraseError && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertCircle size={14} className="text-red-400 shrink-0" />
                <p className="text-xs text-red-400 font-medium">{phraseError}</p>
              </div>
            )}

            <div className="flex items-start gap-3 p-4 bg-amber-500/8 border border-amber-500/15 rounded-2xl">
              <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-400/90 leading-relaxed font-medium">
                Never enter your phrase on any website other than this app. No one at Rhiza will ever ask for it.
              </p>
            </div>

            <button
              onClick={handleStep1Next}
              disabled={!isReady || isValidating}
              className="w-full mt-auto py-4 bg-[#00FF88] text-black rounded-2xl font-bold text-sm hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isValidating ? (
                <><RefreshCw className="animate-spin" size={16} /> Verifying phrase...</>
              ) : (
                <>Continue <ArrowRight size={16} /></>
              )}
            </button>
          </div>
        )}

        {/* ── STEP 2: Set New Password (REQUIRED) ── */}
        {step === 2 && (
          <div className="flex flex-col flex-1 pt-4 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Set a New Password</h1>
              <p className="text-gray-400 text-sm mt-1.5 leading-relaxed">
                Create a new password to secure this wallet on this device.
              </p>
            </div>

            {/* Wallet origin banner */}
            {walletOrigin === 'rhiza' && (
              <div className="flex items-start gap-3 p-4 bg-[#00FF88]/8 border border-[#00FF88]/20 rounded-2xl">
                <ShieldCheck size={16} className="text-[#00FF88] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-[#00FF88]">Rhiza Wallet Detected</p>
                  <p className="text-xs text-[#00FF88]/70 mt-0.5 font-medium">This wallet already has a Rhiza account. Your profile, referrals, and rewards will be restored.</p>
                  {detectedAddress && <p className="text-[10px] text-gray-500 mt-1.5 font-mono break-all">{detectedAddress}</p>}
                </div>
              </div>
            )}

            {walletOrigin === 'foreign' && (
              <div className="flex items-start gap-3 p-4 bg-blue-500/8 border border-blue-500/20 rounded-2xl">
                <AlertCircle size={16} className="text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-blue-300">External Wallet Detected</p>
                  <p className="text-xs text-blue-400/70 mt-0.5 font-medium">This wallet was not created on Rhiza. A new profile will be created for it. Your on-chain assets will be accessible.</p>
                  {detectedAddress && <p className="text-[10px] text-gray-500 mt-1.5 font-mono break-all">{detectedAddress}</p>}
                </div>
              </div>
            )}

            {walletOrigin === 'new' && (
              <div className="flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl">
                <Check size={16} className="text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-gray-300">Phrase Verified</p>
                  <p className="text-xs text-gray-500 mt-0.5 font-medium">Phrase is valid. Set a password to secure it on this device.</p>
                  {detectedAddress && <p className="text-[10px] text-gray-500 mt-1.5 font-mono break-all">{detectedAddress}</p>}
                </div>
              </div>
            )}
            <div className="flex items-start gap-3 p-4 bg-blue-500/8 border border-blue-500/15 rounded-2xl">
              <Lock size={14} className="text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-400/90 leading-relaxed font-medium">
                A password is <strong>required</strong> whenever importing a wallet. It encrypts your phrase locally and ensures only you can access this wallet on this device.
              </p>
            </div>

            <div className="space-y-4">
              {/* New password */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setPasswordError(''); }}
                    className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-600 outline-none focus:border-[#00FF88]/50 focus:ring-1 focus:ring-[#00FF88]/20 transition-all font-medium text-sm"
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors p-1">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Strength bar */}
                {password.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: strength.width, backgroundColor: strength.color }} />
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex gap-1">
                        {[8, 12].map(len => (
                          <span key={len} className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${password.length >= len ? 'text-[#00FF88] bg-[#00FF88]/10' : 'text-gray-600 bg-white/5'}`}>{len}+</span>
                        ))}
                        {[/[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].map((re, i) => (
                          <span key={i} className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${re.test(password) ? 'text-[#00FF88] bg-[#00FF88]/10' : 'text-gray-600 bg-white/5'}`}>
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
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setPasswordError(''); }}
                    className={`w-full px-4 py-3.5 bg-white/5 border rounded-2xl text-white placeholder-gray-600 outline-none focus:ring-1 transition-all font-medium text-sm ${
                      confirmPassword && password !== confirmPassword
                        ? 'border-red-500/40 focus:border-red-500/50 focus:ring-red-500/20'
                        : confirmPassword && password === confirmPassword
                        ? 'border-[#00FF88]/40 focus:border-[#00FF88]/50 focus:ring-[#00FF88]/20'
                        : 'border-white/10 focus:border-[#00FF88]/50 focus:ring-[#00FF88]/20'
                    }`}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                  />
                  {confirmPassword && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
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

            <button
              onClick={handleVerify}
              disabled={!password || !confirmPassword || isVerifying}
              className="w-full mt-auto py-4 bg-[#00FF88] text-black rounded-2xl font-bold text-sm hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <><RefreshCw className="animate-spin" size={16} /> Importing wallet...</>
              ) : (
                <><ShieldCheck size={16} /> Import Wallet</>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 text-gray-600">
              <ShieldCheck size={12} className="text-[#00FF88]/50" />
              <span className="text-[10px] font-semibold uppercase tracking-widest">Password never leaves this device</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportWallet;
