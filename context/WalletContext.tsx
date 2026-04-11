import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { tonWalletService } from '../services/tonWalletService';
import { NetworkType, getNetworkConfig } from '../constants';
import { supabaseService } from '../services/supabaseService';
import { transactionSyncService } from '../services/transactionSync';
import { notificationService } from '../services/notificationService';
import type { EvmChain } from '../services/tetherWdkService';

interface UserProfile {
  id: string;
  wallet_address: string;
  name: string;
  avatar: string;
  email?: string | null;
  role: string;
  is_active: boolean;
  referrer_code?: string | null;
  rzc_balance: number;
  // Activation fields — present in wallet_users.select('*')
  is_activated?: boolean;
  activated_at?: string | null;
  activation_fee_paid?: number;
  created_at: string;
  updated_at: string;
}

interface ReferralData {
  id: string;
  user_id: string;
  referrer_id?: string | null; // Optional to match supabaseService
  referral_code: string;
  total_earned: number;
  total_referrals: number;
  rank: string;
  level: number;
  created_at: string;
  updated_at: string;
}

interface WalletState {
  address: string | null;
  balance: string;
  isLoggedIn: boolean;
  isLoading: boolean;
  jettons: any[];
  theme: 'dark' | 'light';
  network: NetworkType;
  userProfile: UserProfile | null;
  referralData: ReferralData | null;
  isActivated: boolean;
  activatedAt: string | null;
  activationFeePaid: number;
  rzcPrice: number; // Live RZC price from DB (global, admin-controlled)
  updateRzcPrice: (price: number) => void; // Instantly update price across all components
  toggleTheme: () => void;
  switchNetwork: (network: NetworkType) => Promise<void>;
  switchEvmChain: (chain: EvmChain) => Promise<void>;
  refreshData: () => Promise<void>;
  login: (mnemonic: string[], password?: string, type?: 'primary' | 'secondary') => Promise<boolean>;
  logout: () => void;
  multiChainBalances: { evm: string, btc: string, ton: string, usdt: string, sol: string, tron: string } | null;
  isNetworkModalOpen: boolean;
  setIsNetworkModalOpen: (open: boolean) => void;
  currentEvmChain: EvmChain;
  setCurrentEvmChain: (chain: EvmChain) => void;
}

const WalletContext = createContext<WalletState | undefined>(undefined);

// Session channel for multi-tab sync
const SESSION_CHANNEL = 'rhiza_session_sync';

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState('0.00');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [jettons, setJettons] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [isActivated, setIsActivated] = useState(false);
  const [activatedAt, setActivatedAt] = useState<string | null>(null);
  const [activationFeePaid, setActivationFeePaid] = useState(0);
  const [rzcPrice, setRzcPrice] = useState<number>(() => {
    // Initialize from localStorage cache (set by previous session or admin)
    try {
      const raw = localStorage.getItem('admin_price_overrides');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.rzc && parsed.rzc > 0) return parsed.rzc;
      }
    } catch { }
    return 0.12; // matches RZC_CONFIG.RZC_PRICE_USD default
  });
  const [network, setNetwork] = useState<NetworkType>(() => {
    const saved = localStorage.getItem('rhiza_network');
    return (saved as NetworkType) || 'mainnet'; // Default to mainnet
  });
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('rhiza_theme');
    return (saved as 'dark' | 'light') || 'dark';
  });
  const [multiChainBalances, setMultiChainBalances] = useState<{ evm: string, btc: string, ton: string, usdt: string, sol: string, tron: string } | null>(null);
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false);
  const [currentEvmChain, setCurrentEvmChain] = useState<EvmChain>(() => {
    const saved = localStorage.getItem('rhiza_evm_chain') as EvmChain;
    const valid = ['ethereum', 'polygon', 'arbitrum', 'bsc', 'avalanche', 'plasma', 'stable', 'sepolia'];
    return (saved && valid.includes(saved)) ? saved : 'polygon';
  });

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionChannelRef = useRef<BroadcastChannel | null>(null);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('rhiza_theme', next);
  };

  // Instantly propagate a new RZC price to all components (called by admin after saving)
  const updateRzcPrice = (price: number) => {
    if (price > 0) {
      setRzcPrice(price);
      // Also sync to localStorage so it persists for next session
      try {
        const raw = localStorage.getItem('admin_price_overrides');
        const current = raw ? JSON.parse(raw) : {};
        localStorage.setItem('admin_price_overrides', JSON.stringify({ ...current, rzc: price }));
      } catch { }
    }
  };

  const switchNetwork = async (newNetwork: NetworkType) => {
    const networkConfig = getNetworkConfig(newNetwork);
    console.log(`🔄 Switching to ${networkConfig.NAME} (${newNetwork})`);
    console.log(`📡 API Endpoint: ${networkConfig.API_ENDPOINT}`);
    console.log(`🔍 Explorer: ${networkConfig.EXPLORER_URL}`);

    setNetwork(newNetwork);
    localStorage.setItem('rhiza_network', newNetwork);

    // Update tonWalletService network
    tonWalletService.setNetwork(newNetwork);

    // Refresh wallet data with new network
    if (isLoggedIn) {
      await refreshData();
    }
  };

  const switchEvmChain = async (chain: EvmChain) => {
    const { tetherWdkService } = await import('../services/tetherWdkService');
    const ok = await tetherWdkService.switchEvmChain(chain);
    if (ok) {
      setCurrentEvmChain(chain);
      if (isLoggedIn) await refreshData();
    }
  };

  // Multi-tab session synchronization
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;

    const channel = new BroadcastChannel(SESSION_CHANNEL);
    sessionChannelRef.current = channel;

    channel.onmessage = (event) => {
      if (event.data.type === 'logout') {
        console.log('🔄 Logout broadcast received from another tab');
        logout();
      }
      // Note: Removed 'login' broadcast handling to prevent reload loops
      // Each tab will auto-login independently on page load
    };

    return () => {
      channel.close();
      sessionChannelRef.current = null;
    };
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [theme]);

  const refreshData = async (skipProfileRefresh = false) => {
    let addr = tonWalletService.getWalletAddress();
    const useWdk = !tonWalletService.isInitialized();

    if (useWdk) {
      const { tetherWdkService } = await import('../services/tetherWdkService');
      if (!tetherWdkService.isInitialized()) return;

      const balances = await tetherWdkService.getBalances();
      if (balances) setBalance(balances.tonBalance);

      const addresses = await tetherWdkService.getAddresses();
      if (addresses) addr = addresses.tonAddress;
    } else {
      const res = await tonWalletService.getBalance();
      if (res.success && res.balance) setBalance(res.balance);
    }

    // Auto-initialize WDK to keep multi-chain balances synced, regardless of active wallet
    try {
      const { tetherWdkService } = await import('../services/tetherWdkService');

      if (!tetherWdkService.isInitialized() && tetherWdkService.hasStoredWallet() && !tetherWdkService.isEncrypted()) {
        const savedPhrase = await tetherWdkService.getStoredWallet('');
        if (savedPhrase) {
          await tetherWdkService.initializeManagers(savedPhrase);
        }
      }

      const allWallets = (await import('../utils/walletManager')).WalletManager.getWallets();
      const hasSecondary = allWallets.some(w => w.type === 'secondary');

      if (tetherWdkService.isInitialized()) {
        const bals = await tetherWdkService.getBalances();
        if (bals) {
          // Use the correct USDT contract for the active chain
          const USDT_CONTRACTS: Record<string, { address: string; decimals: number }> = {
            ethereum: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
            polygon: { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6 },
            arbitrum: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 },
            bsc: { address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 },
            avalanche: { address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', decimals: 6 },
            sepolia: { address: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0', decimals: 6 },
          };
          const activeChain = tetherWdkService.getCurrentEvmChain();
          const usdtInfo = USDT_CONTRACTS[activeChain] ?? USDT_CONTRACTS.polygon;
          const usdtRaw = await tetherWdkService.getErc20TokenBalance(usdtInfo.address, usdtInfo.decimals);
          setMultiChainBalances({ evm: bals.evmBalance, btc: bals.btcBalance, ton: bals.tonBalance, usdt: usdtRaw, sol: bals.solBalance ?? '0.000000000', tron: bals.tronBalance ?? '0.000000' });
        }
      } else if (hasSecondary) {
        setMultiChainBalances({ evm: '0.0000', btc: '0.00000000', ton: '0.0000', usdt: '0.00', sol: '0.000000000', tron: '0.000000' });
      } else {
        setMultiChainBalances(null);
      }
    } catch (e) {
      console.error('Failed to sync WDK balances:', e);
    }

    if (addr) {
      // Run jettons and profile operations in parallel
      const operations = [
        tonWalletService.getJettons(addr).then(jRes => {
          if (jRes.success) setJettons(jRes.jettons);
        })
      ];

      // Only refresh profile if not skipped (to avoid redundant fetches during login)
      if (!skipProfileRefresh && supabaseService.isConfigured()) {
        operations.push(
          supabaseService.getProfile(addr).then(profileResult => {
            if (profileResult.success && profileResult.data) {
              setUserProfile(profileResult.data);
              console.log('🔄 User profile refreshed, RZC balance:', profileResult.data.rzc_balance);
            }
          }),

          supabaseService.checkWalletActivation(addr).then(activationData => {
            if (activationData) {
              setIsActivated(activationData.is_activated || false);
              setActivatedAt(activationData.activated_at || null);
              setActivationFeePaid(activationData.activation_fee_paid || 0);
            }
          })
        );
      }

      // Execute all operations in parallel
      await Promise.all(operations).catch(err => console.warn('⚠️ Some refresh operations failed:', err));

      // Sync transactions if user profile exists
      if (userProfile?.id) {
        transactionSyncService.syncTransactions(addr, userProfile.id);
      }
    }
  };

  const login = async (mnemonic: string[], password?: string, type: 'primary' | 'secondary' = 'primary') => {
    const { performanceMonitor } = await import('../utils/performanceMonitor');
    performanceMonitor.startLoginFlow();

    setIsLoading(true);
    let addressToUse: string | null = null;
    let loginSuccess = false;

    performanceMonitor.startMetric('wallet_initialization');
    if (type === 'primary') {
      const res = await tonWalletService.initializeWallet(mnemonic, password);
      if (res.success && res.address) {
        addressToUse = res.address;
        loginSuccess = true;
      }
    } else {
      try {
        const { tetherWdkService } = await import('../services/tetherWdkService');
        const addrs = await tetherWdkService.initializeManagers(mnemonic.join(' '));
        if (addrs && addrs.tonAddress) {
          addressToUse = addrs.tonAddress;
          await tetherWdkService.saveWallet(mnemonic.join(' '), password);
          loginSuccess = true;

          try {
            const { WalletManager } = await import('../utils/walletManager');
            const allWallets = WalletManager.getWallets();
            // Try to find the specific wallet we just added (by address)
            const multi = allWallets.find(w => w.address === addrs.tonAddress && w.type === 'secondary');
            if (multi) {
              WalletManager.updateWalletAddresses(multi.id, {
                evm: addrs.evmAddress,
                ton: addrs.tonAddress,
                btc: addrs.btcAddress,
                sol: addrs.solAddress,
                tron: addrs.tronAddress
              });
            }
          } catch (updateErr) {
            console.error('Failed to update WalletManager addresses:', updateErr);
          }
        }
      } catch (e) {
        console.error('Secondary wallet login failed:', e);
        // Store error to show in UI if needed (though current implementation returns false)
        throw e; // Throwing allows CreateWallet.tsx to catch and show the actual message
      }
    }
    performanceMonitor.endMetric('wallet_initialization');

    if (loginSuccess && addressToUse) {
      setAddress(addressToUse);
      setIsLoggedIn(true);

      // Store the active wallet type so it persists on reload
      localStorage.setItem('rhiza_active_wallet_type', type);

      // Create Supabase auth session for wallet user
      performanceMonitor.startMetric('auth_session_creation');
      if (supabaseService.isConfigured()) {
        console.log('🔐 Creating Supabase auth session for wallet...');
        try {
          const { authService } = await import('../services/authService');
          const authResult = await authService.signInWithWallet(addressToUse);
          if (authResult.success) {
            console.log('✅ Supabase auth session created');
          } else {
            console.warn('⚠️ Failed to create Supabase auth session:', authResult.error);
            // Continue anyway - wallet login should still work
          }
        } catch (authError) {
          console.warn('⚠️ Auth service error:', authError);
          // Continue anyway - wallet login should still work
        }
      }
      performanceMonitor.endMetric('auth_session_creation');

      // Load user profile and related data in parallel
      performanceMonitor.startMetric('profile_loading');
      if (supabaseService.isConfigured()) {
        console.log('💾 Loading user profile from Supabase...');

        const profileResult = await supabaseService.getProfile(addressToUse);

        if (profileResult.success && profileResult.data) {
          setUserProfile(profileResult.data);
          console.log('✅ User profile loaded:', profileResult.data.name);

          // ── Read activation status directly from the profile (wallet_users.is_activated)
          // Synchronous — no race condition with the lock overlay.
          // Cast to any because supabaseService.UserProfile may not include activation
          // fields in its type definition, but wallet_users.select('*') returns them.
          const profileData = profileResult.data as any;
          if (profileData.is_activated === true) {
            // Fast path: profile already says activated
            setIsActivated(true);
            setActivatedAt(profileData.activated_at || null);
            setActivationFeePaid(profileData.activation_fee_paid || 0);
            console.log('✅ Activation status from profile: true');
          } else {
            // Profile says false/null — cross-check wallet_activations by user_id
            // (handles the case where is_activated is out of sync after address migration)
            supabaseService.checkWalletActivation(addressToUse).then(activationData => {
              if (activationData) {
                setIsActivated(activationData.is_activated || false);
                setActivatedAt(activationData.activated_at || null);
                setActivationFeePaid(activationData.activation_fee_paid || 0);
                console.log('✅ Activation status from check:', activationData.is_activated);
              }
            }).catch(err => console.warn('⚠️ Activation check failed:', err));
          }

          // ── ADDRESS MIGRATION: update EQ→UQ in DB so future lookups hit on first try
          if (profileResult.data.wallet_address !== addressToUse) {
            console.log('🔄 Migrating stored wallet address from', profileResult.data.wallet_address, '→', addressToUse);
            supabaseService.getClient()
              ?.from('wallet_users')
              .update({ wallet_address: addressToUse, updated_at: new Date().toISOString() })
              .eq('id', profileResult.data.id)
              .then(({ error }) => {
                if (error) console.warn('⚠️ Address migration failed (non-fatal):', error.message);
                else console.log('✅ Wallet address migrated in DB');
              });
          }

          // Run non-critical operations in parallel (non-blocking)
          Promise.all([
            supabaseService.getReferralData(profileResult.data.id).then(referralResult => {
              if (referralResult.success && referralResult.data) {
                setReferralData(referralResult.data);
                console.log('✅ Referral data loaded:', referralResult.data.referral_code);
              }
            }),

            // Log session activity
            notificationService.logActivity(
              addressToUse,
              'login',
              'User logged in',
              {
                network,
                timestamp: Date.now(),
                device: navigator.userAgent,
                platform: navigator.platform
              }
            ).catch(err => console.warn('⚠️ Activity logging failed:', err)),

            // Track login event
            supabaseService.trackEvent('wallet_login', {
              wallet_address: addressToUse,
              network
            }).catch(err => console.warn('⚠️ Event tracking failed:', err))
          ]).catch(err => console.warn('⚠️ Parallel operations failed:', err));

          // Defer auto-claim to background (runs after login completes)
          setTimeout(async () => {
            try {
              const { referralRewardChecker } = await import('../services/referralRewardChecker');
              const claimResult = await referralRewardChecker.autoCheckAndClaim(profileResult.data.id);
              if (claimResult.success && claimResult.claimed && claimResult.claimed > 0) {
                console.log(`🎁 Auto-claimed ${claimResult.claimed} missing referral bonuses (${claimResult.amount} RZC)`);
                // Reload profile to get updated balance
                const updatedProfile = await supabaseService.getProfile(addressToUse);
                if (updatedProfile.success && updatedProfile.data) {
                  setUserProfile(updatedProfile.data);
                }
              }
            } catch (error) {
              console.warn('⚠️ Auto-claim check failed:', error);
            }
          }, 100); // Run after login UI updates

        } else {
          // Profile doesn't exist - create it (for existing wallets)
          console.log('📝 Creating profile for existing wallet...');
          const newProfile = await supabaseService.createOrUpdateProfile({
            wallet_address: addressToUse,
            name: `Rhiza User #${addressToUse.slice(-4)}`,
            avatar: '🌱'
          });

          if (newProfile.success && newProfile.data) {
            setUserProfile(newProfile.data);

            // Generate referral code (non-blocking)
            supabaseService.createReferralCode(
              newProfile.data.id,
              addressToUse
            ).then(referralResult => {
              if (referralResult.success && referralResult.data) {
                setReferralData(referralResult.data);
              }
            }).catch(err => console.warn('⚠️ Referral code creation failed:', err));
          }
        }
      }
      performanceMonitor.endMetric('profile_loading');

      // Defer refreshData and transaction sync to background
      setTimeout(async () => {
        performanceMonitor.startMetric('data_refresh');
        await refreshData(true); // Skip profile refresh since we just loaded it
        performanceMonitor.endMetric('data_refresh');

        // Start automatic transaction sync
        if (addressToUse && userProfile?.id) {
          console.log('🔄 Starting automatic transaction sync...');
          if (syncIntervalRef.current) {
            clearInterval(syncIntervalRef.current);
          }
          syncIntervalRef.current = transactionSyncService.startAutoSync(
            addressToUse,
            userProfile.id,
            30000 // Sync every 30 seconds
          );
        }

        performanceMonitor.endLoginFlow();
      }, 50); // Run after login state is set

      setIsLoading(false);
      return true;
    }
    setIsLoading(false);
    performanceMonitor.endLoginFlow();
    return false;
  };

  const logout = () => {
    // Log session activity before logout
    if (address && supabaseService.isConfigured()) {
      notificationService.logActivity(
        address,
        'logout',
        'User logged out',
        {
          timestamp: Date.now(),
          device: navigator.userAgent
        }
      ).catch(err => console.error('Failed to log logout activity:', err));

      // Sign out from Supabase auth
      import('../services/authService').then(({ authService }) => {
        authService.signOut().catch(err => console.error('Failed to sign out from Supabase:', err));
      });
    }

    tonWalletService.logout();
    setAddress(null);
    setBalance('0.00');
    setIsLoggedIn(false);
    setJettons([]);
    setUserProfile(null);
    setReferralData(null);

    // Clear timers
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
    }

    // Clear active wallet type on logout
    localStorage.removeItem('rhiza_active_wallet_type');

    // Broadcast logout to other tabs
    if (sessionChannelRef.current) {
      sessionChannelRef.current.postMessage({ type: 'logout' });
    }
  };

  useEffect(() => {
    const init = async () => {
      // Set network on tonWalletService
      tonWalletService.setNetwork(network);

      // Load global asset rates from DB into local price cache
      try {
        if (supabaseService.isConfigured()) {
          const ratesResult = await supabaseService.getConfig();
          if (ratesResult.success && ratesResult.data) {
            const { setPriceOverrides, getPriceOverrides } = await import('../utils/priceConfig');
            const current = getPriceOverrides();
            const rates = ratesResult.data;
            const merged = {
              ...current,
              ...(rates.TON_PRICE !== undefined && { ton: rates.TON_PRICE }),
              ...(rates.BTC_PRICE !== undefined && { btc: rates.BTC_PRICE }),
              ...(rates.ETH_PRICE !== undefined && { eth: rates.ETH_PRICE }),
              ...(rates.SOL_PRICE !== undefined && { sol: rates.SOL_PRICE }),
              ...(rates.TRX_PRICE !== undefined && { trx: rates.TRX_PRICE }),
              ...(rates.RZC_PRICE !== undefined && { rzc: rates.RZC_PRICE }),
              ...(rates.USDT_PRICE !== undefined && { usdt: rates.USDT_PRICE }),
              ...(rates.USDC_PRICE !== undefined && { usdc: rates.USDC_PRICE }),
              ...(rates.NOT_PRICE !== undefined && { not: rates.NOT_PRICE }),
              ...(rates.SCALE_PRICE !== undefined && { scale: rates.SCALE_PRICE }),
              ...(rates.STK_PRICE !== undefined && { stk: rates.STK_PRICE }),
              ...(rates.BNB_PRICE !== undefined && { bnb: rates.BNB_PRICE }),
              ...(rates.MATIC_PRICE !== undefined && { matic: rates.MATIC_PRICE }),
              ...(rates.AVAX_PRICE !== undefined && { avax: rates.AVAX_PRICE }),
            };
            setPriceOverrides(merged);
            // Update reactive rzcPrice state so all components re-render
            if (rates.RZC_PRICE !== undefined && rates.RZC_PRICE > 0) {
              setRzcPrice(rates.RZC_PRICE);
            }
            console.log('✅ Global asset rates loaded from DB, RZC:', rates.RZC_PRICE);
          }
        }
      } catch (e) {
        console.warn('⚠️ Failed to load global rates from DB:', e);
      }

      const activeType = localStorage.getItem('rhiza_active_wallet_type') || 'primary';

      if (activeType === 'secondary') {
        try {
          const { tetherWdkService } = await import('../services/tetherWdkService');
          if (tetherWdkService.hasStoredWallet()) {
            console.log('🔐 Found stored secondary session, attempting auto-login...');
            const savedPhrase = await tetherWdkService.getStoredWallet('');
            if (savedPhrase) {
              console.log('✅ Secondary session restored, logging in...');
              await login(savedPhrase.split(' '), undefined, 'secondary');
            } else {
              console.log('⚠️ Secondary session restore failed, clearing session');
              tetherWdkService.logout();
            }
          }
        } catch (e) {
          console.error('Failed to restore secondary wallet:', e);
        }
      } else {
        // Check if there's a stored session - auto-login for persistent sessions
        if (tonWalletService.hasStoredSession()) {
          console.log('🔐 Found stored session, attempting auto-login...');

          const savedMnemonic = await tonWalletService.getStoredSession('');
          if (savedMnemonic) {
            // Use the stored wallet address (already known) to check 2FA
            const { authService } = await import('../services/authService');
            const { WalletManager } = await import('../utils/walletManager');
            const activeWallet = WalletManager.getActiveWallet();
            const walletAddr = activeWallet?.address ?? null;

            let twoFABlocked = false;
            if (walletAddr && supabaseService.isConfigured()) {
              try {
                await authService.signInWithWallet(walletAddr);
                const { twoFactorService } = await import('../services/twoFactorService');
                const twoFAStatus = await twoFactorService.get2FAStatus(walletAddr);
                if (twoFAStatus.enabled) {
                  // 2FA is on — don't auto-login, let the user go through WalletLogin
                  console.warn('⚠️ 2FA enabled — skipping auto-login, redirecting to login page');
                  tonWalletService.logout();
                  twoFABlocked = true;
                }
              } catch (e) {
                console.warn('⚠️ 2FA check during auto-login failed:', e);
              }
            }

            if (!twoFABlocked) {
              console.log('✅ Session restored, logging in...');
              await login(savedMnemonic, undefined, 'primary');
            }
          } else {
            console.log('⚠️ Session restore failed, clearing session');
            tonWalletService.logout();
          }
        }
      }
      setIsLoading(false);
    };
    init();
  }, []);

  return (
    <WalletContext.Provider value={{
      address,
      balance,
      isLoggedIn,
      isLoading,
      jettons,
      theme,
      network,
      userProfile,
      referralData,
      isActivated,
      activatedAt,
      activationFeePaid,
      rzcPrice,
      updateRzcPrice,
      toggleTheme,
      switchNetwork,
      switchEvmChain,
      refreshData,
      login,
      logout,
      multiChainBalances,
      isNetworkModalOpen,
      setIsNetworkModalOpen,
      currentEvmChain,
      setCurrentEvmChain
    }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used within WalletProvider');
  return context;
};
