
import React, { useEffect, useRef, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './i18n/config';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Assets from './pages/Assets';
import AssetDetail from './pages/AssetDetail';
import History from './pages/History';
import Settings from './pages/Settings';
import Referral from './pages/Referral';
import Onboarding from './pages/Onboarding';
import CreateWallet from './pages/CreateWallet';
import ImportWallet from './pages/ImportWallet';
import WalletLogin from './pages/WalletLogin';
import ProfileSetup from './pages/ProfileSetup';
import ProfileEdit from './pages/ProfileEdit';
import Transfer from './pages/Transfer';
import Receive from './pages/Receive';
import AIAssistant from './pages/AIAssistant';
import Notifications from './pages/Notifications';
import Activity from './pages/Activity';

import MiningNodes from './pages/MiningNodes';
import AdminRegister from './pages/AdminRegister';
import AdminSetup from './pages/AdminSetup';
import AdminDashboard from './pages/AdminDashboard';
import AdminPanel from './pages/AdminPanel';
import DatabaseTest from './pages/DatabaseTest';
import SupabaseConnectionTest from './pages/SupabaseConnectionTest';
import Whitepaper from './pages/Whitepaper';
import Help from './pages/Help';
import UserGuide from './pages/UserGuide';
import FAQ from './pages/FAQ';
import Tutorials from './pages/Tutorials';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import SecurityAudit from './pages/SecurityAudit';
import Compliance from './pages/Compliance';
import MerchantAPI from './pages/MerchantAPI';
import DeveloperHub from './pages/DeveloperHub';
import StakingEngine from './pages/StakingEngine';
import Marketplace from './pages/Marketplace';
import Launchpad from './pages/Launchpad';
import ReferralPortal from './pages/ReferralPortal';
import More from './pages/More';
import RzcUtility from './pages/RzcUtility';
import Swap from './pages/Swap';
import WalletMigration from './pages/WalletMigration';
import BalanceVerification from './components/BalanceVerification';
import { Layout } from './components/Layout';
import { WalletProvider, useWallet } from './context/WalletContext';
import { ToastProvider } from './context/ToastContext';
import { notificationService } from './services/notificationService';
import WalletLockOverlay from './components/WalletLockOverlay';
import { supabaseService } from './services/supabaseService';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn, isLoading } = useWallet();
  
  // Show loading spinner while checking session
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#00FF88] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400 text-sm font-bold">Loading wallet...</p>
        </div>
      </div>
    );
  }
  
  // Redirect to login if not logged in
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const location = useLocation();
  const { address, userProfile, isLoggedIn } = useWallet();
  const isWalletMode = location.pathname.startsWith('/wallet') || location.pathname.startsWith('/admin');
  const previousPathRef = useRef<string>('');
  
  // Global wallet activation state
  const [walletActivated, setWalletActivated] = useState(true);
  const [isLoadingActivation, setIsLoadingActivation] = useState(true);

  // Check wallet activation status globally
  useEffect(() => {
    const checkActivationStatus = async () => {
      // Only check if user is logged in and on a wallet route
      if (!address || !isLoggedIn || !isWalletMode) {
        setIsLoadingActivation(false);
        setWalletActivated(true);
        return;
      }

      try {
        const data = await supabaseService.checkWalletActivation(address);

        if (data) {
          const isActivated = data.is_activated || false;
          setWalletActivated(isActivated);
        } else {
          setWalletActivated(true); // Default to activated if wallet not found
        }
      } catch (err) {
        console.error('Activation check error:', err);
        setWalletActivated(true); // Default to activated on error
      } finally {
        setIsLoadingActivation(false);
      }
    };

    checkActivationStatus();
  }, [address, isLoggedIn, isWalletMode]);

  // Track page navigation
  useEffect(() => {
    const currentPath = location.pathname;
    
    // Skip if same page or initial load
    if (currentPath === previousPathRef.current || !previousPathRef.current) {
      previousPathRef.current = currentPath;
      return;
    }

    // Get page name from path
    const pageName = getPageName(currentPath);
    
    // Track navigation event
    if (address) {
      notificationService.logActivity(
        address,
        'page_viewed',
        `Viewed ${pageName}`,
        {
          path: currentPath,
          previous_path: previousPathRef.current,
          timestamp: Date.now(),
          user_agent: navigator.userAgent,
          screen_size: `${window.innerWidth}x${window.innerHeight}`,
          is_logged_in: isLoggedIn,
          user_id: userProfile?.id || null
        }
      ).catch(err => console.error('Failed to log page view:', err));
    }

    previousPathRef.current = currentPath;
  }, [location.pathname, address, isLoggedIn, userProfile]);

  // Helper function to get readable page name
  const getPageName = (path: string): string => {
    const routes: Record<string, string> = {
      '/': 'Landing Page',
      '/whitepaper': 'Whitepaper',
      '/help': 'Help Center',
      '/guide': 'User Guide',
      '/faq': 'FAQ',
      '/tutorials': 'Tutorials',
      '/privacy': 'Privacy Policy',
      '/terms': 'Terms of Service',
      '/security': 'Security Audit',
      '/compliance': 'Compliance',
      '/merchant-api': 'Merchant API',
      '/developers': 'Developer Hub',
      '/staking': 'Staking Engine',
      '/marketplace': 'Marketplace',
      '/launchpad': 'Launchpad',
      '/referral': 'Referral Portal',
      '/login': 'Login',
      '/onboarding': 'Onboarding',
      '/create-wallet': 'Create Wallet',
      '/join': 'Join (Create Wallet)',
      '/import-wallet': 'Import Wallet',
      '/wallet/dashboard': 'Dashboard',
      '/wallet/assets': 'Assets',
      '/wallet/history': 'Transaction History',
      '/wallet/referral': 'Referral',
      '/wallet/settings': 'Settings',
      '/wallet/more': 'More',
      '/wallet/transfer': 'Transfer',
      '/wallet/receive': 'Receive',
      '/wallet/ai-assistant': 'AI Assistant',
      '/wallet/notifications': 'Notifications',
      '/wallet/activity': 'Activity Log',
      '/wallet/sales-package': 'Sales Package',
      '/wallet/profile': 'Edit Profile',
      '/wallet/verification': 'Balance Verification',
      '/admin': 'Admin Dashboard',
      '/admin-register': 'Admin Registration',
      '/admin-setup': 'Admin Setup'
    };

    return routes[path] || path.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown Page';
  };

  return (
    <>
      {/* Activation Banner - Shows when not activated (dismissible, non-blocking) */}
      {!isLoadingActivation && !walletActivated && isLoggedIn && isWalletMode && (
        <WalletLockOverlay />
      )}

      <Layout isWalletMode={isWalletMode}>
        <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/whitepaper" element={<Whitepaper />} />
        <Route path="/help" element={<Help />} />
        <Route path="/guide" element={<UserGuide />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/tutorials" element={<Tutorials />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/security" element={<SecurityAudit />} />
        <Route path="/compliance" element={<Compliance />} />
        <Route path="/merchant-api" element={<MerchantAPI />} />
        <Route path="/developers" element={<DeveloperHub />} />
        <Route path="/staking" element={<StakingEngine />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/launchpad" element={<Launchpad />} />
        <Route path="/referral" element={<ReferralPortal />} />
        <Route path="/use-rzc" element={<RzcUtility />} />
        <Route path="/rzc-utility" element={<RzcUtility />} />
        
        {/* Wallet Auth Routes */}
        <Route path="/login" element={<WalletLogin />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/create-wallet" element={<CreateWallet />} />
        <Route path="/join" element={<WalletLogin />} />
        <Route path="/import-wallet" element={<ImportWallet />} />
        
        {/* Admin Routes (Keep for backend management) */}
        <Route path="/admin-register" element={<AdminRegister />} />
        <Route path="/admin-setup" element={<AdminSetup />} />
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/panel" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
        <Route path="/database-test" element={<DatabaseTest />} />
        <Route path="/supabase-test" element={<SupabaseConnectionTest />} />
        
        {/* Wallet Routes */}
        <Route path="/profile-setup" element={<ProtectedRoute><ProfileSetup /></ProtectedRoute>} />
        <Route path="/wallet/profile" element={<ProtectedRoute><ProfileEdit /></ProtectedRoute>} />
        <Route path="/wallet/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/wallet/assets" element={<ProtectedRoute><Assets /></ProtectedRoute>} /> 
        <Route path="/wallet/asset-detail" element={<ProtectedRoute><AssetDetail /></ProtectedRoute>} />
        <Route path="/wallet/history" element={<ProtectedRoute><History /></ProtectedRoute>} /> 
        <Route path="/wallet/referral" element={<ProtectedRoute><Referral /></ProtectedRoute>} />
        <Route path="/wallet/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/wallet/transfer" element={<ProtectedRoute><Transfer /></ProtectedRoute>} />
        <Route path="/wallet/receive" element={<ProtectedRoute><Receive /></ProtectedRoute>} />
        <Route path="/wallet/ai-assistant" element={<ProtectedRoute><AIAssistant /></ProtectedRoute>} />
        <Route path="/wallet/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/wallet/activity" element={<ProtectedRoute><Activity /></ProtectedRoute>} />
        <Route path="/wallet/more" element={<ProtectedRoute><More /></ProtectedRoute>} />
        <Route path="/wallet/sales-package" element={<ProtectedRoute><MiningNodes /></ProtectedRoute>} />
        <Route path="/wallet/swap" element={<ProtectedRoute><Swap /></ProtectedRoute>} />
        <Route path="/wallet/migration" element={<ProtectedRoute><WalletMigration /></ProtectedRoute>} />
        <Route path="/wallet/verification" element={<ProtectedRoute><div className="max-w-xl mx-auto px-3 sm:px-4 md:px-0 py-6 space-y-4 page-enter"><div className="flex items-center gap-2 mb-2"><h1 className="text-xl font-black text-slate-900 dark:text-white">Balance Verification</h1></div><BalanceVerification /></div></ProtectedRoute>} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Layout>
    </>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <ToastProvider>
        <WalletProvider>
          <AppContent />
        </WalletProvider>
      </ToastProvider>
    </Router>
  );
};

export default App;
