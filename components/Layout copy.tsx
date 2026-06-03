
import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
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
  Bell,
  TrendingUp,
  Package,
  ArrowLeftRight,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Pencil,
  Layers,
  Lock,
  Activity,
  Gift,
  Send,
  Download,
  ChevronRight,
  X,
  Coins,
  MoreHorizontal as More,
  Rocket,
} from 'lucide-react';

import { useWallet } from '../context/WalletContext';
import { useActivationModal } from '../context/ActivationModalContext';
import AirdropTrigger from './AirdropTrigger';
import LanguageSelector from './LanguageSelector';
import { SOCIAL_LINKS } from '../constants';
import { RZC_CONFIG, formatRzcAsUsd } from '../config/rzcConfig';
import NotificationToast from './NotificationToast';
import IcoUrgencyBanner from './IcoUrgencyBanner';
import type { Notification } from '../services/notificationService';

interface LayoutProps {
  children: React.ReactNode;
  isWalletMode: boolean;
}

const SidebarItem = ({ to, icon: Icon, label, primary = false }: { to: string, icon: any, label: string, primary?: boolean }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `
        flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-150 border-l-2
        ${isActive
          ? 'bg-primary/[0.08] dark:bg-primary/[0.10] text-primary border-primary'
          : 'text-slate-500 dark:text-gray-500 border-transparent hover:text-slate-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}
      `}
    >
      {({ isActive }: { isActive: boolean }) => (
        <>
          <Icon
            size={primary ? 20 : 18}
            className={isActive ? `text-primary ${primary ? 'drop-shadow-[0_0_8px_rgba(0,255,136,0.5)]' : 'drop-shadow-[0_0_5px_rgba(0,255,136,0.4)]'}` : (primary ? 'text-primary' : '')}
          />
          <span className="text-[13px] font-medium tracking-normal">{label}</span>
        </>
      )}
    </NavLink>
  );
};

const MobileNavItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `
        flex flex-col items-center justify-center gap-1 flex-1 py-2 px-2 transition-all duration-200 active:scale-95 relative min-h-[56px]
        ${isActive
          ? 'text-primary'
          : 'text-slate-500 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300'}
      `}
    >
      {({ isActive }: { isActive: boolean }) => (
        <>
          {/* Pill indicator above icon for active state */}
          <div className={`w-8 h-[3px] rounded-full mb-1 transition-all duration-200 ${isActive ? 'bg-primary' : 'bg-transparent'}`} />

          {/* Icon */}
          <Icon
            size={20}
            strokeWidth={isActive ? 2.5 : 2}
          />

          {/* Label */}
          <span className={`
            text-[10px] leading-tight text-center max-w-[52px] truncate mt-0.5
            ${isActive ? 'text-primary font-semibold' : 'font-medium opacity-60'}
          `}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
};

// Route → display title map
const PAGE_TITLES: Record<string, string> = {
  '/wallet/dashboard': 'Dashboard',
  '/wallet/assets': 'Assets',
  '/wallet/engagement': 'Mainnet',
  '/wallet/simulator': 'Swap',
  '/wallet/sales-package': 'Nodes',
  '/wallet/referral': 'Affiliate',
  '/wallet/multi-chain': 'Multi-Chain',
  '/wallet/history': 'History',
  '/wallet/settings': 'Settings',
  '/wallet/notifications': 'Notifications',
  '/wallet/profile': 'Profile',
  '/wallet/migration': 'Migration',
  '/wallet/transfer': 'Send',
  '/wallet/receive': 'Receive',
  '/wallet/more': 'More',
};

export const Layout: React.FC<LayoutProps> = ({ children, isWalletMode }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { address, balance, theme, toggleTheme, userProfile, referralData, network, switchNetwork, rzcPrice } = useWallet();
  const [showLanguageMenu, setShowLanguageMenu] = React.useState(false);
  const [showNetworkMenu, setShowNetworkMenu] = React.useState(false);
  const [showMobileMenu, setShowMobileMenu] = React.useState(false);
  const [showDesktopMenu, setShowDesktopMenu] = React.useState(false);
  const [showAppMenu, setShowAppMenu] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [migrationStatus, setMigrationStatus] = React.useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [toastNotifications, setToastNotifications] = React.useState<Notification[]>([]);

  // Get wallet address
  const walletAddress = userProfile?.wallet_address || address;

  // Fetch real migration status for sidebar indicator
  React.useEffect(() => {
    if (!walletAddress || !isWalletMode) return;
    const fetchMigrationStatus = async () => {
      try {
        const { migrationService } = await import('../services/migrationService');
        const res = await migrationService.getMigrationStatus(walletAddress);
        if (res.success && res.data) {
          setMigrationStatus(res.data.status as 'pending' | 'approved' | 'rejected');
        } else {
          setMigrationStatus('none');
        }
      } catch (err) {
        console.error('Error fetching migration status in sidebar:', err);
      }
    };
    fetchMigrationStatus();
  }, [walletAddress, isWalletMode]);

  // Fetch unread notification count and subscribe to real-time updates
  React.useEffect(() => {
    if (!walletAddress || !isWalletMode) {
      setUnreadCount(0);
      return;
    }

    let subscription: any = null;
    let isActive = true;

    const fetchUnreadCount = async () => {
      try {
        // Import notification service dynamically to avoid circular dependencies
        const { notificationService } = await import('../services/notificationService');
        const result = await notificationService.getUnreadCount(walletAddress);
        console.log('🔔 Fetching unread count for:', walletAddress, 'Result:', result);
        if (result.success && result.count !== undefined && isActive) {
          console.log('✅ Setting unread count to:', result.count);
          setUnreadCount(result.count);
        }
      } catch (error) {
        console.error('❌ Error fetching unread count:', error);
      }
    };

    const setupRealtime = async () => {
      try {
        const { notificationService } = await import('../services/notificationService');
        subscription = notificationService.subscribeToNotifications(walletAddress, (notification) => {
          if (!isActive) return;

          console.log('🔔 New notification received:', notification);

          // Increment count for new unread notifications
          if (!notification.is_read) {
            console.log('📈 Incrementing unread count');
            setUnreadCount(prev => {
              const newCount = prev + 1;
              console.log('📊 Unread count updated from', prev, 'to', newCount);
              return newCount;
            });
          }

          // Show toast notification for new notifications
          setToastNotifications(prev => [...prev, notification]);

          // Play notification sound (if supported)
          try {
            // Create a subtle notification sound using Web Audio API
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Create a pleasant notification tone
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);

            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
          } catch (error) {
            console.log('Audio notification not supported:', error);
          }

          // Show browser notification if supported and permission granted
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(notification.title, {
              body: notification.message,
              icon: '/logo.png',
              badge: '/logo.png',
              tag: notification.id, // Prevent duplicate notifications
              requireInteraction: notification.priority === 'high'
            });
          }

          // Vibrate on mobile if supported (for high priority notifications)
          if (notification.priority === 'high' && 'vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
          }
        });
      } catch (error) {
        console.error('Error setting up notification subscription:', error);
      }
    };

    fetchUnreadCount();
    setupRealtime();

    // Refresh every 30 seconds as fallback
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => {
      isActive = false;
      clearInterval(interval);
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, [walletAddress, isWalletMode]);

  // Request notification permission on mount
  React.useEffect(() => {
    if (!isWalletMode) return;

    // Request notification permission if not already granted
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
  }, [isWalletMode]);

  // Handle toast notification removal
  const handleRemoveToast = (notificationId: string) => {
    setToastNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  // Handle toast notification action
  const handleToastAction = () => {
    // Navigate to notifications page when toast is clicked
    navigate('/wallet/notifications');
  };

  // Function to refresh unread count (can be called from child components)
  const refreshUnreadCount = React.useCallback(async () => {
    if (!walletAddress || !isWalletMode) return;

    console.log('🔄 Refreshing unread count for:', walletAddress);
    try {
      const { notificationService } = await import('../services/notificationService');
      const result = await notificationService.getUnreadCount(walletAddress);
      console.log('🔄 Refresh result:', result);
      if (result.success && result.count !== undefined) {
        console.log('✅ Refreshed unread count to:', result.count);
        setUnreadCount(result.count);
      }
    } catch (error) {
      console.error('❌ Error refreshing unread count:', error);
    }
  }, [walletAddress, isWalletMode]);

  // Listen for navigation to notifications page to refresh count
  React.useEffect(() => {
    const handleFocus = () => {
      // Refresh count when window regains focus (user might have read notifications elsewhere)
      refreshUnreadCount();
    };

    const handleNotificationRead = () => {
      // Refresh count when notifications are marked as read
      refreshUnreadCount();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('notificationRead', handleNotificationRead);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('notificationRead', handleNotificationRead);
    };
  }, [refreshUnreadCount]);

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
      if (!target.closest('.desktop-menu-container')) {
        setShowDesktopMenu(false);
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
      <aside className="hidden lg:flex flex-col w-60 border-r border-slate-200 dark:border-white/5 px-5 py-6 gap-6 fixed h-full bg-white dark:bg-[#111111] z-40 shadow-sm dark:shadow-none">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl flex items-center justify-center shadow-lg transition-colors">
            <Zap className="fill-current" size={20} />
          </div>
          <span className="text-xl font-heading font-black uppercase tracking-[0.2em] luxury-gradient-text">RhizaCore</span>

        </div>

        <nav className="flex flex-col gap-0.5">
          {/* PORTFOLIO Group */}
          <div className="flex items-center gap-2 px-3 pt-3 pb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-gray-500 whitespace-nowrap">Portfolio</span>
            <div className="flex-1 h-px bg-slate-100 dark:bg-white/[0.05]" />
          </div>
          <SidebarItem to="/wallet/dashboard" icon={LayoutDashboard} label={t('nav.dashboard')} />
          <SidebarItem to="/wallet/assets" icon={Wallet} label={t('nav.assets')} />

          {/* GROW Group */}
          <div className="flex items-center gap-2 px-3 pt-3 pb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-gray-500 whitespace-nowrap">Grow</span>
            <div className="flex-1 h-px bg-slate-100 dark:bg-white/[0.05]" />
          </div>
          <SidebarItem to="/wallet/engagement" icon={Rocket} label="Mainnet" primary />
          <SidebarItem to="/wallet/simulator" icon={ArrowLeftRight} label="Swap" />
          <SidebarItem to="/wallet/sales-package" icon={Package} label="Nodes" />
          <SidebarItem to="/wallet/referral" icon={Gift} label="Affiliate" />

          {/* MANAGE Group */}
          <div className="flex items-center gap-2 px-3 pt-3 pb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-gray-500 whitespace-nowrap">Manage</span>
            <div className="flex-1 h-px bg-slate-100 dark:bg-white/[0.05]" />
          </div>
          <SidebarItem to="/wallet/multi-chain" icon={Layers} label="Multi-Chain" />
          <SidebarItem to="/wallet/history" icon={History} label={t('nav.history')} />

          {/* Airdrop Trigger */}
          <div className="px-3 py-2 mt-1">
            <AirdropTrigger variant="button" size="md" className="w-full justify-center" />
          </div>
        </nav>

        <div className="mt-auto flex flex-col gap-0.5">
          {/* Settings */}
          <SidebarItem to="/wallet/settings" icon={Settings} label={t('nav.settings')} />

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-150 text-slate-500 dark:text-gray-500 border-l-2 border-transparent hover:text-slate-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            <span className="text-[13px] font-medium tracking-normal">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          {/* Profile Card — premium treatment */}
          <div className="pt-2 mt-1 border-t border-slate-100 dark:border-white/[0.05]">
            <NavLink
              to="/wallet/profile"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-150 hover:bg-primary/[0.06] dark:hover:bg-primary/[0.08] group"
            >
              {isValidImageUrl(userProfile?.avatar) ? (
                <img src={userProfile.avatar} alt={userProfile.name || 'User'} className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/20 shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center ring-2 ring-primary/20 shrink-0">
                  <User size={15} className="text-primary" strokeWidth={2.5} />
                </div>
              )}
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[13px] font-semibold text-slate-800 dark:text-white truncate leading-tight group-hover:text-primary transition-colors duration-150">{userProfile?.name || 'User'}</span>
                <span className="text-[10px] text-slate-400 dark:text-gray-500 font-mono truncate leading-tight">{shortenAddress(walletAddress)}</span>
              </div>
              <ChevronRight size={12} className="text-slate-300 dark:text-gray-600 shrink-0 group-hover:text-primary transition-colors duration-150" />
            </NavLink>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-60 relative min-h-screen pb-safe overflow-x-hidden">
        {/* Header - Transparent Glass */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 sticky top-0 bg-white/60 dark:bg-[#020202]/60 backdrop-blur-xl z-30 border-b border-slate-200 dark:border-white/5 transition-colors">
          {/* Left: Logo - Mobile Only (tap to open app menu) */}
          <button
            onClick={() => setShowAppMenu(true)}
            className="flex items-center gap-3 lg:hidden active:scale-95 transition-transform relative"
          >
            <div className="relative w-8 h-8 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg flex items-center justify-center transition-colors">
              <Zap size={18} fill="currentColor" />
              {/* Menu indicator dot */}
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-white dark:border-[#020202]" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-lg font-black tracking-tight leading-tight">RhizaCore</span>
              <span className="text-[9px] text-slate-500 dark:text-gray-500 font-medium leading-tight flex items-center gap-1">
                Welcome, {userProfile?.name?.split(' ')[0] || 'User'}
                <ChevronRight size={8} className="text-primary" />
              </span>
            </div>
          </button>

          {/* App Menu Drawer - rendered OUTSIDE header to avoid z-index clipping */}

          {/* Desktop Page Title — hidden on mobile */}
          <div className="hidden lg:flex items-center">
            <span className="text-[15px] font-semibold text-slate-800 dark:text-white tracking-tight">
              {PAGE_TITLES[location.pathname] || 'Dashboard'}
            </span>
          </div>

          {/* Right: Header Controls */}
          <div className="flex items-center gap-2 ml-auto">
            {/* RZC Price Chip - all breakpoints, compact on mobile */}
            {/* Notification Bell */}
            <NavLink
              to="/wallet/notifications"
              className="relative p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors"
            >
              <Bell size={20} className="text-slate-600 dark:text-gray-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-[#020202]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </NavLink>

            {/* Language Selector Dropdown */}
            {showLanguageMenu && (
              <div className="fixed top-16 right-4 z-[60]">
                <LanguageSelector compact isOpen={showLanguageMenu} onSelect={() => setShowLanguageMenu(false)} />
              </div>
            )}

            {/* Profile Card — avatar click opens dropdown (desktop); tap opens mobile menu */}
            <div className="relative desktop-menu-container">
              {/* Single unified card: lighter 1px border */}
              <button
                onClick={() => {
                  if (window.innerWidth >= 640) {
                    setShowDesktopMenu(!showDesktopMenu);
                  } else {
                    setShowMobileMenu(!showMobileMenu);
                  }
                }}
                className="flex items-center gap-2 rounded-xl px-2 sm:px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-white/8 active:scale-95 transition-all"
              >
                {isValidImageUrl(userProfile?.avatar) ? (
                  <img
                    src={userProfile.avatar}
                    alt={userProfile.name || 'User'}
                    className="w-7 h-7 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/10"
                  />
                ) : userProfile?.avatar ? (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                    <span className="text-sm">{userProfile.avatar}</span>
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                    <User size={14} className="text-primary" strokeWidth={2.5} />
                  </div>
                )}

                {/* Name + address - Desktop */}
                <div className="hidden lg:flex flex-col gap-0 text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] font-semibold text-slate-900 dark:text-white leading-tight">
                      {userProfile?.name || 'User'}
                    </span>
                    {referralData && referralData.total_referrals > 0 && (
                      <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        {referralData.total_referrals} Refs
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 dark:text-gray-600 leading-tight">
                    {shortenAddress(walletAddress)}
                  </span>
                </div>

                {/* Name + address sub-label - Mobile/Tablet (hidden on lg+) */}
                <div className="flex lg:hidden flex-col gap-0 text-left">
                  <span className="text-[11px] font-semibold text-slate-900 dark:text-white leading-tight">
                    {userProfile?.name || 'User'}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 dark:text-gray-600 leading-tight">
                    {shortenAddress(walletAddress)}
                  </span>
                </div>
              </button>

              {/* Mobile Dropdown Menu */}
              {showMobileMenu && (
                <div className="mobile-menu-container sm:hidden absolute top-full right-0 mt-2 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden min-w-[200px] animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Edit Profile */}
                  <div className="border-b-2 border-gray-200 dark:border-white/10">
                    <NavLink
                      to="/wallet/profile"
                      onClick={() => setShowMobileMenu(false)}
                      className="w-full px-3 py-3 text-left text-xs font-bold text-gray-800 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex items-center gap-2"
                    >
                      <Pencil size={16} className="text-gray-700 dark:text-gray-400" />
                      <span className="flex-1">Edit Profile</span>
                    </NavLink>
                  </div>
                  {/* Network Switcher */}
                  <div className="border-b-2 border-gray-200 dark:border-white/10">
                    <div className="px-3 py-2 bg-gray-50 dark:bg-white/5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-500">TON Network</span>
                    </div>
                    <button
                      onClick={() => {
                        switchNetwork('mainnet');
                        setShowMobileMenu(false);
                      }}
                      className={`w-full px-3 py-2.5 text-left text-xs font-bold transition-colors flex items-center gap-2 ${network === 'mainnet'
                        ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : 'text-gray-800 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                        }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${network === 'mainnet' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                      <span className="flex-1">TON Mainnet</span>
                      {network === 'mainnet' && <span className="text-emerald-600 dark:text-emerald-400">✓</span>}
                    </button>
                    <button
                      onClick={() => {
                        switchNetwork('testnet');
                        setShowMobileMenu(false);
                      }}
                      className={`w-full px-3 py-2.5 text-left text-xs font-bold transition-colors flex items-center gap-2 ${network === 'testnet'
                        ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
                        : 'text-gray-800 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                        }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${network === 'testnet' ? 'bg-amber-500 animate-pulse' : 'bg-gray-400'}`} />
                      <span className="flex-1">TON Testnet</span>
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

              {/* Desktop Dropdown Menu */}
              {showDesktopMenu && (
                <div className="hidden sm:block absolute top-full right-0 mt-2 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden min-w-[200px] animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Edit Profile */}
                  <div className="border-b-2 border-gray-200 dark:border-white/10">
                    <NavLink
                      to="/wallet/profile"
                      onClick={() => setShowDesktopMenu(false)}
                      className="w-full px-3 py-3 text-left text-xs font-bold text-gray-800 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex items-center gap-2"
                    >
                      <Pencil size={16} className="text-gray-700 dark:text-gray-400" />
                      <span className="flex-1">Edit Profile</span>
                    </NavLink>
                  </div>
                  {/* Network Switcher */}
                  <div className="border-b-2 border-gray-200 dark:border-white/10">
                    <div className="px-3 py-2 bg-gray-50 dark:bg-white/5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-500">TON Network</span>
                    </div>
                    <button
                      onClick={() => {
                        switchNetwork('mainnet');
                        setShowDesktopMenu(false);
                      }}
                      className={`w-full px-3 py-2.5 text-left text-xs font-bold transition-colors flex items-center gap-2 ${network === 'mainnet'
                        ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : 'text-gray-800 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                        }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${network === 'mainnet' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                      <span className="flex-1">TON Mainnet</span>
                      {network === 'mainnet' && <span className="text-emerald-600 dark:text-emerald-400">✓</span>}
                    </button>
                    <button
                      onClick={() => {
                        switchNetwork('testnet');
                        setShowDesktopMenu(false);
                      }}
                      className={`w-full px-3 py-2.5 text-left text-xs font-bold transition-colors flex items-center gap-2 ${network === 'testnet'
                        ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
                        : 'text-gray-800 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                        }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${network === 'testnet' ? 'bg-amber-500 animate-pulse' : 'bg-gray-400'}`} />
                      <span className="flex-1">TON Testnet</span>
                      {network === 'testnet' && <span className="text-amber-600 dark:text-amber-400">✓</span>}
                    </button>
                  </div>
                  {/* Language Switcher */}
                  <div className="border-b-2 border-gray-200 dark:border-white/10">
                    <button
                      onClick={() => {
                        setShowDesktopMenu(false);
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
                      setShowDesktopMenu(false);
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

        {/* App Menu Drawer - outside header to avoid stacking context clipping */}
        {showAppMenu && (
          <div className="lg:hidden fixed inset-0 z-[200] flex flex-col justify-end">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowAppMenu(false)}
            />
            {/* Drawer */}
            <div className="relative bg-white dark:bg-[#0a0a0a] rounded-t-3xl border-t border-slate-200 dark:border-white/10 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto">
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-slate-300 dark:bg-white/20 rounded-full" />
              </div>

              {/* Header — wallet identity block */}
              <div className="px-5 pt-4 pb-3 border-b border-slate-100 dark:border-white/5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    {isValidImageUrl(userProfile?.avatar) ? (
                      <img src={userProfile.avatar} alt={userProfile.name || 'User'} className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/20 shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center ring-2 ring-primary/20 shrink-0">
                        <User size={18} className="text-primary" strokeWidth={2.5} />
                      </div>
                    )}
                    {/* Name + address + network */}
                    <div>
                      <p className="text-[15px] font-semibold text-slate-900 dark:text-white leading-tight">{userProfile?.name || 'User'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-mono text-slate-500 dark:text-gray-500">{shortenAddress(walletAddress)}</span>
                        {/* Copy address button */}
                        <button
                          onClick={() => {
                            if (walletAddress) {
                              navigator.clipboard.writeText(walletAddress);
                            }
                          }}
                          className="text-slate-400 dark:text-gray-600 hover:text-primary transition-colors"
                          title="Copy address"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        </button>
                        {/* Network badge */}
                        <span className={`inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full ${network === 'mainnet'
                          ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
                          }`}>
                          <span className={`w-1 h-1 rounded-full ${network === 'mainnet' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          {network === 'mainnet' ? 'Mainnet' : 'Testnet'}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Close button */}
                  <button
                    onClick={() => setShowAppMenu(false)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="px-5 py-4">
                <p className="text-[9px] font-black text-slate-400 dark:text-gray-600 uppercase tracking-widest mb-3">Quick Actions</p>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { icon: Send, label: 'Send', path: '/wallet/transfer', color: 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' },
                    { icon: Download, label: 'Receive', path: '/wallet/receive', color: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
                    { icon: Gift, label: 'Affiliate', path: '/wallet/referral', color: 'bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400' },
                    { icon: Package, label: 'Nodes', path: '/wallet/sales-package', color: 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' },
                  ].map(({ icon: Icon, label, path, color }) => (
                    <button
                      key={path}
                      onClick={() => { navigate(path); setShowAppMenu(false); }}
                      className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
                    >
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ring-1 ring-black/[0.06] dark:ring-white/10 shadow-sm ${color}`}>
                        <Icon size={20} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-700 dark:text-gray-300">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Nav Links */}
              <div className="px-5 pb-2">
                <p className="text-[9px] font-black text-slate-400 dark:text-gray-600 uppercase tracking-widest mb-2">Navigate</p>
                <div className="space-y-1">
                  {[
                    { icon: LayoutDashboard, label: 'Dashboard', path: '/wallet/dashboard' },
                    { icon: Wallet, label: 'Assets', path: '/wallet/assets' },
                    { icon: TrendingUp, label: 'Migrate', path: '/wallet/migration' },
                    { icon: Layers, label: 'Multi-Chain', path: '/wallet/multi-chain' },
                    { icon: History, label: 'History', path: '/wallet/history' },
                    { icon: Settings, label: 'Settings', path: '/wallet/settings' },
                  ].map(({ icon: Icon, label, path }) => {
                    const isCurrentRoute = location.pathname === path;
                    return (
                      <button
                        key={path}
                        onClick={() => { navigate(path); setShowAppMenu(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${isCurrentRoute ? 'bg-primary/[0.08] dark:bg-primary/[0.10] text-primary' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}
                      >
                        <Icon size={16} className={isCurrentRoute ? 'text-primary shrink-0' : 'text-slate-500 dark:text-gray-500 shrink-0'} />
                        <span className={`text-sm font-semibold flex-1 ${isCurrentRoute ? 'text-primary' : 'text-slate-800 dark:text-gray-200'}`}>{label}</span>
                        <ChevronRight size={14} className={isCurrentRoute ? 'text-primary' : 'text-slate-300 dark:text-gray-600'} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Theme + More */}
              <div className="px-5 py-3 border-t border-slate-100 dark:border-white/5 flex items-center gap-2 pb-8">
                <button
                  onClick={() => toggleTheme()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-400 text-xs font-bold transition-colors hover:bg-slate-200 dark:hover:bg-white/10"
                >
                  {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </button>
                <button
                  onClick={() => { navigate('/wallet/more'); setShowAppMenu(false); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 text-primary text-xs font-bold transition-colors hover:bg-primary/20"
                >
                  <MoreHorizontal size={14} />
                  More
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ICO Urgency Banner - Global across all pages */}
        <IcoUrgencyBanner
          hideOnPages={['/wallet/store']}
          dismissible={true}
        />

        {/* Content Container */}
        <div className="max-w-4xl mx-auto pb-20 lg:pb-16 px-4 sm:px-5 lg:px-10 page-enter overflow-x-hidden">
          {children}
        </div>

        {/* Persistent Bottom Nav - Optimized for iOS/Android Gestures */}
        <nav className="mobile-nav lg:hidden">
          {/* Safe area spacer for devices with home indicator */}
          <div className="mobile-nav-safe flex items-center justify-around px-1 py-3">
            <MobileNavItem to="/wallet/dashboard" icon={LayoutDashboard} label={t('nav.dashboard')} />
            <MobileNavItem to="/wallet/assets" icon={Wallet} label={t('nav.assets')} />
            <MobileNavItem to="/wallet/engagement" icon={Rocket} label="Mainnet" />
            <MobileNavItem to="/wallet/referral" icon={Gift} label="Affiliate" />
            <MobileNavItem to="/wallet/settings" icon={Settings} label={t('nav.settings')} />
          </div>
        </nav>
      </main>

      {/* Toast Notifications - Positioned at top-right */}
      <div className="fixed top-4 right-4 z-[300] space-y-2 pointer-events-none">
        {toastNotifications.map((notification) => (
          <div key={notification.id} className="pointer-events-auto">
            <NotificationToast
              notification={notification}
              onClose={() => handleRemoveToast(notification.id)}
              onAction={handleToastAction}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
