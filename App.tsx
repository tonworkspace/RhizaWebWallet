
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Assets from './pages/Assets';
import History from './pages/History';
import Settings from './pages/Settings';
import Referral from './pages/Referral';
import Onboarding from './pages/Onboarding';
import CreateWallet from './pages/CreateWallet';
import ImportWallet from './pages/ImportWallet';
import ProfileSetup from './pages/ProfileSetup';
import Transfer from './pages/Transfer';
import Receive from './pages/Receive';
import { Layout } from './components/Layout';
import { WalletProvider, useWallet } from './context/WalletContext';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn, isLoading } = useWallet();
  if (isLoading) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#00FF88] border-t-transparent rounded-full animate-spin"></div></div>;
  if (!isLoggedIn) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const location = useLocation();
  const isWalletMode = location.pathname.startsWith('/wallet');

  return (
    <Layout isWalletMode={isWalletMode}>
      <Routes>
        <Route path="/" element={<Landing />} />
        
        {/* Auth/Onboarding Routes */}
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/create-wallet" element={<CreateWallet />} />
        <Route path="/import-wallet" element={<ImportWallet />} />
        <Route path="/profile-setup" element={<ProtectedRoute><ProfileSetup /></ProtectedRoute>} />

        {/* Wallet Routes */}
        <Route path="/wallet/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/wallet/assets" element={<ProtectedRoute><Assets /></ProtectedRoute>} /> 
        <Route path="/wallet/history" element={<ProtectedRoute><History /></ProtectedRoute>} /> 
        <Route path="/wallet/referral" element={<ProtectedRoute><Referral /></ProtectedRoute>} />
        <Route path="/wallet/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/wallet/transfer" element={<ProtectedRoute><Transfer /></ProtectedRoute>} />
        <Route path="/wallet/receive" element={<ProtectedRoute><Receive /></ProtectedRoute>} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <WalletProvider>
        <AppContent />
      </WalletProvider>
    </Router>
  );
};

export default App;
