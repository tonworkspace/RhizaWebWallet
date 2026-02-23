
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { tonWalletService } from '../services/tonWalletService';
import { NetworkType, getNetworkConfig } from '../constants';
import { supabaseService } from '../services/supabaseService';
import { transactionSyncService } from '../services/transactionSync';
import { notificationService } from '../services/notificationService';

interface UserProfile {
  id: string;
  wallet_address: string;
  name: string;
  avatar: string;
  role: string;
  is_active: boolean;
  referrer_code: string | null;
  rzc_balance: number;
  created_at: string;
  updated_at: string;
}

interface ReferralData {
  id: string;
  user_id: string;
  referrer_id: string | null;
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
  toggleTheme: () => void;
  switchNetwork: (network: NetworkType) => Promise<void>;
  refreshData: () => Promise<void>;
  login: (mnemonic: string[], password?: string) => Promise<boolean>;
  logout: () => void;
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
  const [network, setNetwork] = useState<NetworkType>(() => {
    const saved = localStorage.getItem('rhiza_network');
    return (saved as NetworkType) || 'testnet';
  });
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('rhiza_theme');
    return (saved as 'dark' | 'light') || 'dark';
  });

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionChannelRef = useRef<BroadcastChannel | null>(null);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('rhiza_theme', next);
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

  const refreshData = async () => {
    if (!tonWalletService.isInitialized()) return;
    const res = await tonWalletService.getBalance();
    if (res.success && res.balance) setBalance(res.balance);
    
    const addr = tonWalletService.getWalletAddress();
    if (addr) {
        const jRes = await tonWalletService.getJettons(addr);
        if (jRes.success) setJettons(jRes.jettons);
        
        // Sync transactions if user profile exists
        if (userProfile?.id) {
          transactionSyncService.syncTransactions(addr, userProfile.id);
        }
    }
  };

  const login = async (mnemonic: string[], password?: string) => {
    setIsLoading(true);
    const res = await tonWalletService.initializeWallet(mnemonic, password);
    if (res.success && res.address) {
      setAddress(res.address);
      setIsLoggedIn(true);
      
      // Load user profile from Supabase
      if (supabaseService.isConfigured()) {
        console.log('💾 Loading user profile from Supabase...');
        
        const profileResult = await supabaseService.getProfile(res.address);
        
        if (profileResult.success && profileResult.data) {
          setUserProfile(profileResult.data);
          console.log('✅ User profile loaded:', profileResult.data.name);
          
          // Load referral data
          const referralResult = await supabaseService.getReferralData(
            profileResult.data.id
          );
          if (referralResult.success && referralResult.data) {
            setReferralData(referralResult.data);
            console.log('✅ Referral data loaded:', referralResult.data.referral_code);
          }
          
          // Log session activity
          await notificationService.logActivity(
            res.address,
            'login',
            'User logged in',
            {
              network,
              timestamp: Date.now(),
              device: navigator.userAgent,
              platform: navigator.platform
            }
          );
          
          // Track login event
          await supabaseService.trackEvent('wallet_login', {
            wallet_address: res.address,
            network
          });
        } else {
          // Profile doesn't exist - create it (for existing wallets)
          console.log('📝 Creating profile for existing wallet...');
          const newProfile = await supabaseService.createOrUpdateProfile({
            wallet_address: res.address,
            name: `Rhiza User #${res.address.slice(-4)}`,
            avatar: '🌱'
          });
          
          if (newProfile.success && newProfile.data) {
            setUserProfile(newProfile.data);
            
            // Generate referral code
            const referralResult = await supabaseService.createReferralCode(
              newProfile.data.id,
              res.address
            );
            if (referralResult.success && referralResult.data) {
              setReferralData(referralResult.data);
            }
          }
        }
      }
      
      await refreshData();
      
      // Start automatic transaction sync
      if (res.address && userProfile?.id) {
        console.log('🔄 Starting automatic transaction sync...');
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current);
        }
        syncIntervalRef.current = transactionSyncService.startAutoSync(
          res.address,
          userProfile.id,
          30000 // Sync every 30 seconds
        );
      }
      
      setIsLoading(false);
      return true;
    }
    setIsLoading(false);
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
    
    // Broadcast logout to other tabs
    if (sessionChannelRef.current) {
      sessionChannelRef.current.postMessage({ type: 'logout' });
    }
  };

  useEffect(() => {
    const init = async () => {
      // Set network on tonWalletService
      tonWalletService.setNetwork(network);
      
      // Check if there's a stored session - auto-login for persistent sessions
      if (tonWalletService.hasStoredSession()) {
        console.log('🔐 Found stored session, attempting auto-login...');
        
        // Try to restore session (works for both encrypted and unencrypted)
        const savedMnemonic = await tonWalletService.getStoredSession('');
        if (savedMnemonic) {
          console.log('✅ Session restored, logging in...');
          await login(savedMnemonic);
        } else {
          console.log('⚠️ Session restore failed, clearing session');
          tonWalletService.logout();
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
      toggleTheme,
      switchNetwork,
      refreshData, 
      login, 
      logout
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
