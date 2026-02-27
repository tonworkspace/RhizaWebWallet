
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, 
  Wallet, 
  History, 
  Settings, 
  Zap,
  Users,
  Sun,
  Moon,
  User,
  ExternalLink,
  MoreHorizontal,
  Globe,
  Bell
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import NotificationCenter from './NotificationCenter';
import LanguageSelector from './LanguageSelector';
import { SOCIAL_LINKS } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  isWalletMode: boolean;
}

const SidebarItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => (
  <NavLink
    to={to}
    className={({ isActive }) => `
      flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300
      ${isActive 
        ? 'bg-black/5 dark:bg-white/10 text-primary border border-black/5 dark:border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.1)]' 
        : 'text-slate-500 dark:text-gray-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}
    `}
  >
    <Icon size={18} />
    <span className="font-semibold text-sm tracking-tight">{label}</span>
  </NavLink>
);

const MobileNavItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => (
  <NavLink
    to={to}
    className={({ isActive }) => `
      flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-all duration-300
      ${isActive ? 'text-primary' : 'text-slate-500 dark:text-gray-500'}
    `}
  >
    {({ isActive }: { isActive: boolean }) => (
      <>
        <div className={`p-1.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-primary/10' : ''}`}>
          <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
        </div>
        <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
      </>
    )}
  </NavLink>
);

export const Layout: React.FC<LayoutProps> = ({ children, isWalletMode }) => {
  const { t } = useTranslation();
  const { address, balance, theme, toggleTheme, userProfile, referralData, network, switchNetwork } = useWallet();
  const [showLanguageMenu, setShowLanguageMenu] = React.useState(false);
  const [showNetworkMenu, setShowNetworkMenu] = React.useState(false);
  const [showMobileMenu, setShowMobileMenu] = React.useState(false);
  
  // Close menus when clicking outside
  React.useEffect(() => {
    if (!isWalletMode) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.language-menu-container')) {
        setShowLanguageMenu(false);
      }
      if (!target.closest('.network-menu-container')) {
        setShowNetworkMenu(false);
      }
      if (!target.closest('.mobile-menu-container')) {
        setShowMobileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isWalletMode]);
  
  if (!isWalletMode) return <>{children}</>;
  const shortenAddress = (addr: string | null) => {
    if (!addr) return '...';
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  const getUserInitials = (name: string | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatBalance = (bal: string | number) => {
    const num = typeof bal === 'string' ? parseFloat(bal) : bal;
    if (isNaN(num)) return '0.00';
    return num.toFixed(2);
  };

  const isValidImageUrl = (url: string | undefined) => {
    if (!url) return false;
    // Check if it's a valid URL (starts with http/https or data:)
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:');
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#020202] text-slate-900 dark:text-white transition-colors duration-300">
      {/* Sidebar - Desktop (Institutional Look) */}
      <aside className="hidden lg:flex flex-col w-72 border-r border-slate-200 dark:border-white/5 p-8 gap-10 fixed h-full bg-white dark:bg-[#050505] z-40 shadow-2xl dark:shadow-none">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl flex items-center justify-center shadow-lg transition-colors">
            <Zap className="fill-current" size={20} />
          </div>
          <span className="text-xl font-extrabold tracking-tight luxury-gradient-text">RhizaCore</span>
        </div>

        <nav className="flex flex-col gap-1">
          <SidebarItem to="/wallet/dashboard" icon={LayoutDashboard} label={t('nav.dashboard')} />
          <SidebarItem to="/wallet/assets" icon={Wallet} label={t('nav.assets')} />
          <SidebarItem to="/wallet/history" icon={History} label={t('nav.history')} />
          <SidebarItem to="/wallet/referral" icon={Users} label={t('nav.referral')} />
        </nav>

        <div className="mt-auto space-y-4">
          <button 
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 text-slate-500 dark:text-gray-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            <span className="font-semibold text-sm tracking-tight">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <SidebarItem to="/wallet/settings" icon={Settings} label={t('nav.settings')} />
          
          {/* Social Links */}
          <div className="space-y-2 pt-2">
            <div className="px-2">
              <span className="text-[9px] font-black text-slate-400 dark:text-gray-600 uppercase tracking-widest">Community</span>
            </div>
            {SOCIAL_LINKS.map((social) => (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all duration-300 text-slate-500 dark:text-gray-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 group"
              >
                <div className="w-7 h-7 rounded-lg bg-black/5 dark:bg-white/5 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                  {social.icon === 'twitter' && (
                    <svg className="w-3.5 h-3.5 text-slate-500 dark:text-gray-500 group-hover:text-primary transition-colors" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  )}
                  {social.icon === 'telegram' && (
                    <svg className="w-3.5 h-3.5 text-slate-500 dark:text-gray-500 group-hover:text-primary transition-colors" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                    </svg>
                  )}
                  {social.icon === 'facebook' && (
                    <svg className="w-3.5 h-3.5 text-slate-500 dark:text-gray-500 group-hover:text-primary transition-colors" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  )}
                </div>
                <span className="font-semibold text-xs tracking-tight flex-1">{social.label}</span>
                <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>
          
          <div className="p-5 rounded-[2rem] bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-3">
             <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest">Vault Status</span>
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
             </div>
             <p className="text-xs font-medium text-slate-600 dark:text-gray-300 leading-relaxed">System fully operational. End-to-end encryption active.</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-72 relative min-h-screen pb-safe">
        {/* Header - Transparent Glass */}
        <header className="h-20 lg:h-16 flex items-center justify-between px-4 sm:px-6 sticky top-0 bg-white/60 dark:bg-[#020202]/60 backdrop-blur-xl z-30 border-b border-slate-200 dark:border-white/5 transition-colors">
          {/* Left: Logo - Mobile Only */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="w-8 h-8 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg flex items-center justify-center transition-colors">
              <Zap size={18} fill="currentColor" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight leading-tight">RhizaCore</span>
              <span className="text-[9px] text-slate-500 dark:text-gray-500 font-medium leading-tight">
                Welcome, {userProfile?.name?.split(' ')[0] || 'User'}
              </span>
            </div>
          </div>

          {/* Right: All Controls in Profile Card */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Notification Center */}
            <NotificationCenter />

            {/* Language Selector Dropdown - Positioned Absolutely */}
            {showLanguageMenu && (
              <div className="fixed top-20 right-4 z-[60]">
                <LanguageSelector compact isOpen={showLanguageMenu} onSelect={() => setShowLanguageMenu(false)} />
              </div>
            )}
            
            {/* Unified Profile Card with All Controls */}
            <div className="relative mobile-menu-container">
              <div className="flex items-center gap-2 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl shadow-sm overflow-hidden">
                {/* Controls Group - Hidden on Mobile */}
                <div className="hidden sm:flex items-center gap-0.5 px-2 py-1.5 border-r-2 border-gray-200 dark:border-white/10">
                  {/* Network Switcher */}
                  <div className="relative network-menu-container">
                    <button
                      onClick={() => setShowNetworkMenu(!showNetworkMenu)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-all"
                      title={network === 'mainnet' ? 'TON Mainnet' : 'TON Testnet'}
                    >
                      <div className={`w-2 h-2 rounded-full ${network === 'mainnet' ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`} />
                    </button>

                    {showNetworkMenu && (
                      <div className="absolute top-full right-0 mt-2 bg-white dark:bg-[#0a0a0a] border-2 border-gray-300 dark:border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden min-w-[160px] animate-in fade-in slide-in-from-top-2 duration-200">
                        <button
                          onClick={() => {
                            switchNetwork('mainnet');
                            setShowNetworkMenu(false);
                          }}
                          className={`w-full px-3 py-2.5 text-left text-xs font-bold transition-colors flex items-center gap-2 ${
                            network === 'mainnet'
                              ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : 'text-gray-800 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full ${network === 'mainnet' ? 'bg-green-500' : 'bg-gray-400'}`} />
                          <span className="flex-1">Mainnet</span>
                          {network === 'mainnet' && <span className="text-emerald-600 dark:text-emerald-400">✓</span>}
                        </button>
                        <button
                          onClick={() => {
                            switchNetwork('testnet');
                            setShowNetworkMenu(false);
                          }}
                          className={`w-full px-3 py-2.5 text-left text-xs font-bold transition-colors flex items-center gap-2 ${
                            network === 'testnet'
                              ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
                              : 'text-gray-800 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full ${network === 'testnet' ? 'bg-amber-500' : 'bg-gray-400'}`} />
                          <span className="flex-1">Testnet</span>
                          {network === 'testnet' && <span className="text-amber-600 dark:text-amber-400">✓</span>}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Language Switcher */}
                  <div className="language-menu-container">
                    <button
                      onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-all"
                      title="Change Language"
                    >
                      <Globe size={16} className="text-gray-700 dark:text-gray-400" />
                    </button>
                  </div>

                  {/* Theme Toggle */}
                  <button 
                    onClick={toggleTheme} 
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-all"
                    title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                  >
                    {theme === 'dark' ? <Sun size={16} className="text-gray-700 dark:text-gray-400" /> : <Moon size={16} className="text-gray-700 dark:text-gray-400" />}
                  </button>
                </div>

                {/* User Profile & Balance - Clickable on Mobile */}
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:cursor-default active:scale-95 sm:active:scale-100 transition-transform"
                >
                {/* Avatar */}
                {isValidImageUrl(userProfile?.avatar) ? (
                  <img 
                    src={userProfile.avatar} 
                    alt={userProfile.name || 'User'} 
                    className="w-7 h-7 rounded-full object-cover ring-2 ring-primary/20"
                  />
                ) : userProfile?.avatar ? (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center ring-2 ring-primary/20">
                    <span className="text-sm">{userProfile.avatar}</span>
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center ring-2 ring-primary/20">
                    <User size={14} className="text-primary" strokeWidth={2.5} />
                  </div>
                )}
                
                {/* User Info & Balance - Desktop */}
                <div className="hidden lg:flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-900 dark:text-white leading-tight">
                      {userProfile?.name || 'User'}
                    </span>
                    {referralData && referralData.total_referrals > 0 && (
                      <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        {referralData.total_referrals} Refs
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-slate-500 dark:text-gray-500">
                      {shortenAddress(address)}
                    </span>
                    <span className="text-[9px] text-slate-400 dark:text-gray-600">•</span>
                    <span className="text-[9px] font-bold text-primary">
                      {formatBalance(balance)} TON
                    </span>
                  </div>
                </div>

                {/* Balance Only - Mobile */}
                <div className="flex lg:hidden flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-primary leading-tight">
                    {formatBalance(balance)} TON
                  </span>
                  <span className="text-[9px] font-bold text-slate-600 dark:text-gray-400 leading-tight">
                    {formatBalance(userProfile?.rzc_balance || 0)} RZC
                  </span>
                </div>
                </button>
              </div>

              {/* Mobile Dropdown Menu */}
              {showMobileMenu && (
                <div className="sm:hidden absolute top-full right-0 mt-2 bg-white dark:bg-[#0a0a0a] border-2 border-gray-300 dark:border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden min-w-[200px] animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Network Switcher */}
                  <div className="border-b-2 border-gray-200 dark:border-white/10">
                    <div className="px-3 py-2 bg-gray-50 dark:bg-white/5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-500">Network</span>
                    </div>
                    <button
                      onClick={() => {
                        switchNetwork('mainnet');
                        setShowMobileMenu(false);
                      }}
                      className={`w-full px-3 py-2.5 text-left text-xs font-bold transition-colors flex items-center gap-2 ${
                        network === 'mainnet'
                          ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : 'text-gray-800 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${network === 'mainnet' ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <span className="flex-1">Mainnet</span>
                      {network === 'mainnet' && <span className="text-emerald-600 dark:text-emerald-400">✓</span>}
                    </button>
                    <button
                      onClick={() => {
                        switchNetwork('testnet');
                        setShowMobileMenu(false);
                      }}
                      className={`w-full px-3 py-2.5 text-left text-xs font-bold transition-colors flex items-center gap-2 ${
                        network === 'testnet'
                          ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
                          : 'text-gray-800 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${network === 'testnet' ? 'bg-amber-500' : 'bg-gray-400'}`} />
                      <span className="flex-1">Testnet</span>
                      {network === 'testnet' && <span className="text-amber-600 dark:text-amber-400">✓</span>}
                    </button>
                  </div>

                  {/* Language Switcher */}
                  <div className="border-b-2 border-gray-200 dark:border-white/10">
                    <button
                      onClick={() => {
                        setShowMobileMenu(false);
                        setShowLanguageMenu(true);
                      }}
                      className="w-full px-3 py-3 text-left text-xs font-bold text-gray-800 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex items-center gap-2"
                    >
                      <Globe size={16} className="text-gray-700 dark:text-gray-400" />
                      <span className="flex-1">Change Language</span>
                    </button>
                  </div>

                  {/* Theme Toggle */}
                  <button
                    onClick={() => {
                      toggleTheme();
                      setShowMobileMenu(false);
                    }}
                    className="w-full px-3 py-3 text-left text-xs font-bold text-gray-800 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex items-center gap-2"
                  >
                    {theme === 'dark' ? <Sun size={16} className="text-gray-700 dark:text-gray-400" /> : <Moon size={16} className="text-gray-700 dark:text-gray-400" />}
                    <span className="flex-1">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Container */}
        <div className="max-w-4xl mx-auto pb-20 sm:p-5 lg:p-10 page-enter">
          {children}
        </div>

        {/* Persistent Bottom Nav - Optimized for iOS/Android Gestures */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border-t border-slate-200 dark:border-white/5 flex items-center justify-around px-2 z-50 pb-[var(--safe-area-inset-bottom)] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.6)]">
          <MobileNavItem to="/wallet/dashboard" icon={LayoutDashboard} label={t('nav.dashboard')} />
          <MobileNavItem to="/wallet/assets" icon={Wallet} label={t('nav.assets')} />
          <MobileNavItem to="/wallet/history" icon={History} label={t('nav.history')} />
          <MobileNavItem to="/wallet/referral" icon={Users} label={t('nav.referral')} />
          <MobileNavItem to="/wallet/mining" icon={Zap} label="Mining" />
          <MobileNavItem to="/wallet/more" icon={MoreHorizontal} label={t('nav.more')} />
        </nav>
      </main>
    </div>
  );
};
