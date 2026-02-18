
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { tonWalletService, NetworkType } from '../services/tonWalletService';

interface UserProfile {
  name: string;
  avatar: string;
}

interface ReferralStats {
  totalEarned: number;
  rank: string;
  nextRankProgress: number;
  levels: Array<{ level: number; count: number; earned: number; commission: string }>;
  recentInvites: Array<{ address: string; level: number; time: string; reward: string }>;
}

interface WalletState {
  address: string | null;
  balance: string;
  network: NetworkType;
  isLoggedIn: boolean;
  isLoading: boolean;
  isRateLimited: boolean;
  profile: UserProfile;
  jettons: any[];
  nfts: any[];
  transactions: any[];
  referralStats: ReferralStats | null;
  refreshData: (silent?: boolean) => Promise<void>;
  switchNetwork: (net: NetworkType) => void;
  login: (mnemonic: string[]) => Promise<boolean>;
  logout: () => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
}

const WalletContext = createContext<WalletState | undefined>(undefined);

const DEFAULT_PROFILE = {
  name: 'Rhiza Sovereign',
  avatar: '🌱'
};

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState('0.00');
  const [network, setNetwork] = useState<NetworkType>(() => {
    return (localStorage.getItem('rhiza_network') as NetworkType) || 'mainnet';
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [jettons, setJettons] = useState<any[]>([]);
  const [nfts, setNfts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('rhiza_profile');
    return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
  });

  const pollTimer = useRef<number | null>(null);
  const isRefreshing = useRef(false);

  const refreshData = async (silent = false) => {
    if (isRefreshing.current || !tonWalletService.isInitialized()) {
      if (!tonWalletService.isInitialized()) setIsLoading(false);
      return;
    }
    
    isRefreshing.current = true;
    if (!silent) setIsLoading(true);
    
    try {
      const addr = tonWalletService.getWalletAddress();
      if (addr) {
          setAddress(addr);
          
          // Spread calls slightly to avoid burst limits
          const bRes = await tonWalletService.getBalance();
          if (bRes.isRateLimit) {
            setIsRateLimited(true);
            // Don't hammer further if we are already limited
          } else {
            setIsRateLimited(false);
            if (bRes.success && bRes.balance) setBalance(bRes.balance);
          }

          // These calls have built-in retry/cache logic now
          const [jRes, nRes, tRes, rRes] = await Promise.all([
              tonWalletService.getJettons(addr),
              tonWalletService.getNFTs(addr),
              tonWalletService.getEvents(addr),
              tonWalletService.getReferralData(addr)
          ]);
          
          if (jRes.success) setJettons(jRes.jettons);
          if (nRes.success) setNfts(nRes.nfts);
          if (tRes.success) setTransactions(tRes.events);
          if (rRes.success) setReferralStats(rRes.stats);
      }
    } catch (error) {
      console.error("Global refresh failure:", error);
    } finally {
      isRefreshing.current = false;
      if (!silent) setIsLoading(false);
    }
  };

  const switchNetwork = (net: NetworkType) => {
    setNetwork(net);
    localStorage.setItem('rhiza_network', net);
    tonWalletService.updateConfig(net);
    refreshData();
  };

  const login = async (mnemonic: string[]) => {
    setIsLoading(true);
    try {
      tonWalletService.updateConfig(network);
      const res = await tonWalletService.initializeWallet(mnemonic);
      if (res.success && res.address) {
        setAddress(res.address);
        setIsLoggedIn(true);
        await refreshData();
        return true;
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    if (pollTimer.current) window.clearInterval(pollTimer.current);
    tonWalletService.logout();
    setAddress(null);
    setBalance('0.00');
    setIsLoggedIn(false);
    setJettons([]);
    setNfts([]);
    setTransactions([]);
    setReferralStats(null);
    localStorage.removeItem('rhiza_profile');
  };

  const updateProfile = (newProfile: Partial<UserProfile>) => {
    const updated = { ...profile, ...newProfile };
    setProfile(updated);
    localStorage.setItem('rhiza_profile', JSON.stringify(updated));
  };

  // Auto-polling for real-time feel - increased to 60s to reduce 429 chance
  useEffect(() => {
    if (isLoggedIn) {
      pollTimer.current = window.setInterval(() => {
        refreshData(true);
      }, 60000); 
    }
    return () => {
      if (pollTimer.current) window.clearInterval(pollTimer.current);
    };
  }, [isLoggedIn, network]);

  useEffect(() => {
    const init = async () => {
      try {
        const savedMnemonic = tonWalletService.getStoredSession();
        if (savedMnemonic) {
          await login(savedMnemonic);
        }
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  return (
    <WalletContext.Provider value={{ 
      address, 
      balance, 
      network,
      isLoggedIn, 
      isLoading, 
      isRateLimited,
      profile, 
      jettons, 
      nfts,
      transactions,
      referralStats,
      refreshData, 
      switchNetwork,
      login, 
      logout, 
      updateProfile 
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
