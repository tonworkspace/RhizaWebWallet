
import React, { useEffect, useRef, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './i18n/config';
const Landing = React.lazy(() => import('./pages/Landing'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Assets = React.lazy(() => import('./pages/Assets'));
const AssetDetail = React.lazy(() => import('./pages/AssetDetail'));
const History = React.lazy(() => import('./pages/History'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Referral = React.lazy(() => import('./pages/Referral'));
const Onboarding = React.lazy(() => import('./pages/Onboarding'));
const CreateWallet = React.lazy(() => import('./pages/CreateWallet'));
const ImportWallet = React.lazy(() => import('./pages/ImportWallet'));
const WalletLogin = React.lazy(() => import('./pages/WalletLogin'));
const ProfileSetup = React.lazy(() => import('./pages/ProfileSetup'));
const ProfileEdit = React.lazy(() => import('./pages/ProfileEdit'));
const Transfer = React.lazy(() => import('./pages/Transfer'));
const Receive = React.lazy(() => import('./pages/Receive'));
const AIAssistant = React.lazy(() => import('./pages/AIAssistant'));
const Notifications = React.lazy(() => import('./pages/Notifications'));
const Activity = React.lazy(() => import('./pages/Activity'));

const MiningNodes = React.lazy(() => import('./pages/MiningNodes'));
const AdminRegister = React.lazy(() => import('./pages/AdminRegister'));
const AdminSetup = React.lazy(() => import('./pages/AdminSetup'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const AdminPanel = React.lazy(() => import('./pages/AdminPanel'));
const DatabaseTest = React.lazy(() => import('./pages/DatabaseTest'));
const SupabaseConnectionTest = React.lazy(() => import('./pages/SupabaseConnectionTest'));
const ActivationTest = React.lazy(() => import('./pages/ActivationTest'));
const Whitepaper = React.lazy(() => import('./pages/Whitepaper'));
const Help = React.lazy(() => import('./pages/Help'));
const UserGuide = React.lazy(() => import('./pages/UserGuide'));
const FAQ = React.lazy(() => import('./pages/FAQ'));
const Tutorials = React.lazy(() => import('./pages/Tutorials'));
const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = React.lazy(() => import('./pages/TermsOfService'));
const SecurityAudit = React.lazy(() => import('./pages/SecurityAudit'));
const Compliance = React.lazy(() => import('./pages/Compliance'));
const MerchantAPI = React.lazy(() => import('./pages/MerchantAPI'));
const DeveloperHub = React.lazy(() => import('./pages/DeveloperHub'));
const StakingEngine = React.lazy(() => import('./pages/StakingEngine'));
const Marketplace = React.lazy(() => import('./pages/Marketplace'));
const Launchpad = React.lazy(() => import('./pages/Launchpad'));
const ReferralPortal = React.lazy(() => import('./pages/ReferralPortal'));
const More = React.lazy(() => import('./pages/More'));
const RzcUtility = React.lazy(() => import('./pages/RzcUtility'));
const Swap = React.lazy(() => import('./pages/Swap'));
const WalletMigration = React.lazy(() => import('./pages/WalletMigration'));
const SecondaryWallet = React.lazy(() => import('./pages/SecondaryWallet'));
const CloudBackup = React.lazy(() => import('./pages/CloudBackup'));
const TwoFactorSetup = React.lazy(() => import('./pages/TwoFactorSetup'));
const RzcStore = React.lazy(() => import('./pages/RzcStore'));
import { SecondaryWalletProvider } from './context/SecondaryWalletContext';
import BalanceVerification from './components/BalanceVerification';
import { Layout } from './components/Layout';
import { WalletProvider, useWallet } from './context/WalletContext';
import { ToastProvider } from './context/ToastContext';
import { AirdropProvider, useAirdrop } from './context/AirdropContext';
import { SettingsModalProvider } from './context/SettingsModalContext';
import { VerificationFormProvider } from './context/VerificationFormContext';
import { ActivationModalProvider } from './context/ActivationModalContext';
import { notificationService } from './services/notificationService';
import WalletLockOverlay from './components/WalletLockOverlay';
import GlobalAirdropModal from './components/GlobalAirdropModal';
import AirdropTrigger from './components/AirdropTrigger';
import SettingsModals from './components/SettingsModals';
import VerificationFormModal from './components/VerificationFormModal';
import { PurchaseModalProvider } from './context/PurchaseModalContext';
import GlobalPurchaseModal from './components/GlobalPurchaseModal';
import GlobalNetworkModal from './components/GlobalNetworkModal';
import GlobalWalletManager from './components/GlobalWalletManager';
import { WalletManagerProvider } from './context/WalletManagerContext';
import FloatingSupport from './components/FloatingSupport';
import AddressChangelogModal from './components/AddressChangelogModal';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn, isLoading } = useWallet();

  // Read saved theme to avoid flash of wrong color
  const savedTheme = localStorage.getItem('rhiza_theme') || 'dark';
  const isDark = savedTheme === 'dark';

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#020202]' : 'bg-slate-50'}`}>
        <div className="text-center space-y-5">
          {/* Logo */}
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-lg ${isDark ? 'bg-white' : 'bg-slate-900'}`}>
            <svg viewBox="0 0 24 24" className={`w-7 h-7 ${isDark ? 'text-black' : 'text-white'}`} fill="currentColor">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          {/* Spinner */}
          <p className={`text-sm font-bold tracking-wide ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
            Loading wallet...
          </p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const location = useLocation();
  const { address, userProfile, isLoggedIn, isActivated } = useWallet();
  const { isAirdropModalOpen, closeAirdropModal } = useAirdrop();
  const isWalletMode = location.pathname.startsWith('/wallet') || location.pathname.startsWith('/admin');
  const previousPathRef = useRef<string>('');

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
      // '/admin-register': 'Admin Registration',
      // '/admin-setup': 'Admin Setup'
    };

    return routes[path] || path.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown Page';
  };

  return (
    <>
      {/* Global Airdrop Modal */}
      <GlobalAirdropModal
        isOpen={isAirdropModalOpen}
        onClose={closeAirdropModal}
      />

      {/* Global Settings Modals */}
      <SettingsModals />

      {/* Global Verification Form */}
      <VerificationFormModal />

      {/* Global Purchase Modal */}
      <GlobalPurchaseModal />

      {/* Global Network Selector */}
      <GlobalNetworkModal />

      {/* Global Wallet Account Manager */}
      <GlobalWalletManager />

      {/* Global Floating Support Chat */}
      <FloatingSupport />

      {/* One-time address format changelog for existing users */}
      <AddressChangelogModal />

      {/* Activation Banner - Shows when not activated (dismissible, non-blocking) */}
      {!isActivated && isLoggedIn && isWalletMode && (
        <WalletLockOverlay />
      )}

      <Layout isWalletMode={isWalletMode}>
        <React.Suspense fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        }>
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
            {/* <Route path="/admin-register" element={<AdminRegister />} /> */}
            {/* <Route path="/admin-setup" element={<AdminSetup />} /> */}
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/panel" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
            <Route path="/admin/activation-test" element={<ProtectedRoute><ActivationTest /></ProtectedRoute>} />
            {/* <Route path="/database-test" element={<DatabaseTest />} /> */}
            {/* <Route path="/supabase-test" element={<SupabaseConnectionTest />} /> */}

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
            <Route path="/wallet/store" element={<ProtectedRoute><RzcStore /></ProtectedRoute>} />
            <Route path="/wallet/swap" element={<ProtectedRoute><Swap /></ProtectedRoute>} />
            <Route path="/wallet/migration" element={<ProtectedRoute><WalletMigration /></ProtectedRoute>} />
            <Route path="/wallet/multi-chain" element={<ProtectedRoute><SecondaryWallet /></ProtectedRoute>} />
            <Route path="/wallet/cloud-backup" element={<ProtectedRoute><CloudBackup /></ProtectedRoute>} />
            <Route path="/wallet/2fa" element={<ProtectedRoute><TwoFactorSetup /></ProtectedRoute>} />
            <Route path="/wallet/verification" element={<ProtectedRoute><div className="max-w-xl mx-auto px-3 sm:px-4 md:px-0 py-6 space-y-4 page-enter"><div className="flex items-center gap-2 mb-2"><h1 className="text-xl font-black text-slate-900 dark:text-white">Balance Verification</h1></div><BalanceVerification /></div></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </React.Suspense>
      </Layout>
    </>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <ToastProvider>
        <WalletProvider>
          <SecondaryWalletProvider>
            <WalletManagerProvider>
              <AirdropProvider>
                <SettingsModalProvider>
                  <PurchaseModalProvider>
                    <VerificationFormProvider>
                      <ActivationModalProvider>
                        <AppContent />
                      </ActivationModalProvider>
                    </VerificationFormProvider>
                  </PurchaseModalProvider>
                </SettingsModalProvider>
              </AirdropProvider>
            </WalletManagerProvider>
          </SecondaryWalletProvider>
        </WalletProvider>
      </ToastProvider>
    </Router>
  );
};

export default App;
