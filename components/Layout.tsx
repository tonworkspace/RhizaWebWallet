
import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Wallet,
  LineChart,
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
  ChevronDown,
  X,
  Coins,
  MoreHorizontal as More,
  Rocket,
  Search,
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
  '/wallet/market': 'Market Analysis',
  '/wallet/engagement': 'Mainnet',
  '/wallet/simulator': 'Swap',
  '/wallet/sales-package': 'Nodes',
  '/wallet/referral': 'Affiliate',
  '/wallet/multi-chain': 'Multi-Chain',
  '/wallet/explorer': 'On-chain Explorer',
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
  const { address, balance, theme, toggleTheme, userProfile, referralData, network, switchNetwork, rzcPrice, currentEvmChain, switchEvmChain, multiChainBalances } = useWallet();
  const rzc_balance = (userProfile as any)?.rzc_balance || 0;
  const [showLanguageMenu, setShowLanguageMenu] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showNetworkMenu, setShowNetworkMenu] = React.useState(false);
  const [showMobileMenu, setShowMobileMenu] = React.useState(false);
  const [showDesktopMenu, setShowDesktopMenu] = React.useState(false);
  const [showAppMenu, setShowAppMenu] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);

  const searchAssets = [
    { id: 'ton', name: 'TON', symbol: 'TON', balance: balance || '0.00' },
    { id: 'rzc', name: 'Rhiza', symbol: 'RZC', balance: (rzc_balance || 0).toFixed(2) },
    { id: 'usdt', name: 'Tether', symbol: 'USDT', balance: multiChainBalances?.usdt || '0.00' },
    { id: 'evm', name: 'EVM', symbol: 'EVM', balance: multiChainBalances?.evm || '0.00' },
    { id: 'btc', name: 'Bitcoin', symbol: 'BTC', balance: multiChainBalances?.btc || '0.00' },
    { id: 'sol', name: 'Solana', symbol: 'SOL', balance: multiChainBalances?.sol || '0.00' },
    { id: 'tron', name: 'Tron', symbol: 'TRX', balance: multiChainBalances?.tron || '0.00' }
  ];
  const filteredAssets = searchQuery ? searchAssets.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.symbol.toLowerCase().includes(searchQuery.toLowerCase())) : [];

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

        {/* RZC Price Pill — desktop sidebar */}
        <div className="mx-2 flex items-center gap-2 bg-primary/[0.08] dark:bg-primary/[0.10] border border-primary/20 rounded-xl px-3 py-2">
          <Coins size={14} className="text-primary shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-gray-500 leading-none">RZC Price</span>
            <span className="text-[13px] font-bold text-primary leading-tight font-numbers">
              ${rzcPrice.toFixed(4)}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
            <span className="text-[9px] font-semibold text-primary/70">LIVE</span>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5">
          {/* PORTFOLIO Group */}
          <div className="flex items-center gap-2 px-3 pt-3 pb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-gray-500 whitespace-nowrap">Portfolio</span>
            <div className="flex-1 h-px bg-slate-100 dark:bg-white/[0.05]" />
          </div>
          <SidebarItem to="/wallet/dashboard" icon={LayoutDashboard} label={t('nav.dashboard')} />
          <SidebarItem to="/wallet/assets" icon={Wallet} label="Assets" />
          <SidebarItem to="/wallet/market" icon={LineChart} label="Market" />

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
          <SidebarItem to="/wallet/explorer" icon={Globe} label="Explorer" />
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
        <header className="h-14 flex items-center px-3 sm:px-5 sticky top-0 bg-white/70 dark:bg-[#020202]/70 backdrop-blur-xl z-30 border-b border-slate-200 dark:border-white/[0.06] transition-colors gap-2">

          {/* LEFT: Identity chip — avatar + name + address (mobile only, tap to open menu) */}
          <button
            onClick={() => setShowAppMenu(true)}
            className="lg:hidden flex items-center gap-2 flex-shrink-0 active:scale-95 transition-transform min-w-0 max-w-[140px]"
            aria-label="Open menu"
          >
            {/* Avatar */}
            <div className="flex-shrink-0">
              {isValidImageUrl(userProfile?.avatar) ? (
                <img src={userProfile.avatar} alt={userProfile.name || 'User'} className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/20" />
              ) : userProfile?.avatar ? (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center ring-2 ring-primary/20">
                  <span className="text-base leading-none">{userProfile.avatar}</span>
                </div>
              ) : userProfile?.name ? (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center ring-2 ring-primary/20">
                  <span className="text-[11px] font-bold text-primary leading-none">{getUserInitials(userProfile.name)}</span>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center ring-2 ring-primary/20">
                  <User size={14} className="text-primary" strokeWidth={2.5} />
                </div>
              )}
            </div>
            {/* Name + address stacked */}
            <div className="flex flex-col justify-center min-w-0 text-left">
              <span className="text-[5px] font-mono text-slate-400 dark:text-gray-600 leading-none truncate mt-0.5">
                {PAGE_TITLES[location.pathname] || 'Dashboard'}
              </span>
              <span className="text-[13px] font-semibold text-slate-900 dark:text-white leading-tight truncate">
                {userProfile?.name || 'User'}
              </span>
              <span className="text-[10px] font-mono text-slate-400 dark:text-gray-600 leading-none truncate mt-0.5">
                {shortenAddress(walletAddress)}
              </span>
            </div>
          </button>

          {/* CENTER: Page title — flex-1 fills remaining space */}
          <div className="flex-1 flex flex-col justify-center min-w-0 px-1">
            {/* Desktop: page title */}
            <span className="hidden lg:block text-[15px] font-semibold text-slate-800 dark:text-white tracking-tight">
              {PAGE_TITLES[location.pathname] || 'Dashboard'}
            </span>
          </div>

          {/* RIGHT: Compact controls row */}
          <div className="flex items-center gap-2 flex-shrink-0">

            {/* Search Bar */}
            <div className={`flex items-center transition-all duration-300 ${isSearchOpen ? 'w-[140px] sm:w-[200px]' : 'w-8'} relative`}>
              <div className={`flex items-center w-full h-8 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full overflow-hidden border border-transparent focus-within:border-primary/30 focus-within:bg-white dark:focus-within:bg-[#0a0a0a] transition-all`}>
                <button
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 shrink-0"
                >
                  <Search size={14} />
                </button>
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onBlur={() => { setTimeout(() => { if (!searchQuery) setIsSearchOpen(false); }, 200) }}
                  className={`flex-1 bg-transparent border-none outline-none text-[12px] text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-600 ${isSearchOpen ? 'opacity-100' : 'opacity-0'} transition-opacity`}
                />
              </div>

              {/* Search Results Dropdown */}
              {isSearchOpen && searchQuery && filteredAssets.length > 0 && (
                <div className="absolute top-full right-0 mt-2 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden min-w-[220px] animate-in fade-in slide-in-from-top-2 duration-150 p-1">
                  {filteredAssets.map(asset => (
                    <div
                      key={asset.id}
                      onClick={() => {
                        navigate(`/wallet/asset/${asset.id}`);
                        setIsSearchOpen(false);
                        setSearchQuery('');
                      }}
                      className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-[10px] font-bold text-slate-500">
                          {asset.symbol[0]}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-semibold text-slate-800 dark:text-white leading-none">{asset.name}</span>
                          <span className="text-[9px] text-slate-400 dark:text-gray-500">{asset.symbol}</span>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-slate-700 dark:text-gray-300 tabular-nums">
                        {asset.balance}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notification Bell — moved next to Search Bar */}
            <NavLink
              to="/wallet/notifications"
              className="relative p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors flex items-center justify-center shrink-0"
            >
              <Bell size={19} className="text-slate-600 dark:text-gray-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-[#020202] leading-none px-0.5">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </NavLink>

            {/* Combined Network & RZC Pill (Mobile only) */}
            <div className="lg:hidden relative network-menu-container">
              <button
                onClick={() => setShowNetworkMenu(!showNetworkMenu)}
                className="flex items-center h-8 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors active:scale-95 pl-1.5 pr-2"
                aria-label="Network and Price"
              >
                <div className="flex items-center gap-1.5 bg-white dark:bg-black/20 rounded-full px-2 h-6 shadow-sm">
                  <span className={`w-1.5 h-1.5 rounded-full ${network === 'mainnet' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`} />
                  <span className="text-[10px] font-bold text-slate-600 dark:text-gray-300">
                    {network === 'mainnet' ? 'Mainnet' : 'Testnet'}
                  </span>
                </div>
                <div className="w-px h-3.5 bg-slate-200 dark:bg-white/10 mx-1.5" />
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-gray-300 tabular-nums">
                    ${rzcPrice.toFixed(3)}
                  </span>
                  <ChevronDown size={11} className="text-slate-400 opacity-70" />
                </div>
              </button>
              {showNetworkMenu && (
                <div className="absolute top-full right-0 mt-1.5 bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden min-w-[160px] animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="p-1.5 flex flex-col gap-0.5">
                    <div className="px-1.5 py-1 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">TON Network</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 px-1">
                      <button
                        onClick={() => { switchNetwork('mainnet'); setShowNetworkMenu(false); }}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${network === 'mainnet' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${network === 'mainnet' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-gray-600'}`} />
                        <span className="flex-1 text-left truncate">Mainnet</span>
                        {network === 'mainnet' && <span className="ml-auto text-emerald-500 text-[10px]">✓</span>}
                      </button>
                      <button
                        onClick={() => { switchNetwork('testnet'); setShowNetworkMenu(false); }}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${network === 'testnet' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${network === 'testnet' ? 'bg-amber-500' : 'bg-slate-300 dark:bg-gray-600'}`} />
                        <span className="flex-1 text-left truncate">Testnet</span>
                        {network === 'testnet' && <span className="ml-auto text-amber-500 text-[10px]">✓</span>}
                      </button>
                    </div>

                    <div className="h-px bg-slate-200 dark:bg-white/10 my-1 mx-1" />

                    <div className="px-1.5 py-1 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">EVM Network</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 px-1 mb-1">
                      <button
                        onClick={() => { switchEvmChain('polygon'); setShowNetworkMenu(false); }}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${currentEvmChain === 'polygon' ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400' : 'text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${currentEvmChain === 'polygon' ? 'bg-purple-500' : 'bg-slate-300 dark:bg-gray-600'}`} />
                        <span className="flex-1 text-left truncate">Polygon</span>
                      </button>
                      <button
                        onClick={() => { switchEvmChain('ethereum'); setShowNetworkMenu(false); }}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${currentEvmChain === 'ethereum' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${currentEvmChain === 'ethereum' ? 'bg-blue-500' : 'bg-slate-300 dark:bg-gray-600'}`} />
                        <span className="flex-1 text-left truncate">Ethereum</span>
                      </button>
                      <button
                        onClick={() => { switchEvmChain('bsc'); setShowNetworkMenu(false); }}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${currentEvmChain === 'bsc' ? 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' : 'text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${currentEvmChain === 'bsc' ? 'bg-yellow-500' : 'bg-slate-300 dark:bg-gray-600'}`} />
                        <span className="flex-1 text-left truncate">BSC</span>
                      </button>
                      <button
                        onClick={() => { switchEvmChain('sepolia'); setShowNetworkMenu(false); }}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${currentEvmChain === 'sepolia' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${currentEvmChain === 'sepolia' ? 'bg-amber-500' : 'bg-slate-300 dark:bg-gray-600'}`} />
                        <span className="flex-1 text-left truncate">Sepolia</span>
                      </button>
                      <button
                        onClick={() => { switchEvmChain('bsc_testnet'); setShowNetworkMenu(false); }}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${currentEvmChain === 'bsc_testnet' ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400' : 'text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${currentEvmChain === 'bsc_testnet' ? 'bg-orange-500' : 'bg-slate-300 dark:bg-gray-600'}`} />
                        <span className="flex-1 text-left truncate">BSC Testnet</span>
                      </button>
                      <button
                        onClick={() => { switchEvmChain('polygon_testnet'); setShowNetworkMenu(false); }}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${currentEvmChain === 'polygon_testnet' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' : 'text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${currentEvmChain === 'polygon_testnet' ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-gray-600'}`} />
                        <span className="flex-1 text-left truncate">Polygon Testnet</span>
                      </button>
                    </div>

                    <div className="p-1 mt-1 border-t border-slate-200 dark:border-white/10">
                      <NavLink
                        to="/wallet/multi-chain"
                        onClick={() => setShowNetworkMenu(false)}
                        className="flex items-center gap-2 w-full px-2 py-2 rounded-lg text-left text-[11px] font-bold text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group"
                      >
                        <Wallet size={12} className="text-primary" />
                        <span className="flex-1">Manage Wallets</span>
                        <ChevronRight size={12} className="text-slate-400 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                      </NavLink>
                    </div>

                  </div>
                </div>
              )}
            </div>

            {/* Language Selector Dropdown */}
            {showLanguageMenu && (
              <div className="fixed top-14 right-3 z-[60]">
                <LanguageSelector compact isOpen={showLanguageMenu} onSelect={() => setShowLanguageMenu(false)} />
              </div>
            )}


            {/* Desktop profile button + dropdowns */}
            <div className="relative desktop-menu-container">
              {/* Desktop profile button */}
              <button
                onClick={() => setShowDesktopMenu(!showDesktopMenu)}
                className="hidden lg:flex items-center gap-2 rounded-xl px-2 sm:px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-white/8 active:scale-95 transition-all"
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
                {/* Name + address - Desktop only */}
                <div className="flex flex-col gap-0 text-left">
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
                    <div className="px-3 py-1.5 bg-gray-50 dark:bg-white/5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">TON Network</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 p-1.5">
                      <button
                        onClick={() => { switchNetwork('mainnet'); setShowMobileMenu(false); }}
                        className={`px-2 py-1.5 rounded-lg text-left text-[11px] font-bold transition-colors flex items-center gap-1.5 ${network === 'mainnet' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${network === 'mainnet' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                        <span className="flex-1 truncate">Mainnet</span>
                        {network === 'mainnet' && <span className="text-emerald-600 dark:text-emerald-400 text-[10px]">✓</span>}
                      </button>
                      <button
                        onClick={() => { switchNetwork('testnet'); setShowMobileMenu(false); }}
                        className={`px-2 py-1.5 rounded-lg text-left text-[11px] font-bold transition-colors flex items-center gap-1.5 ${network === 'testnet' ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${network === 'testnet' ? 'bg-amber-500 animate-pulse' : 'bg-gray-400'}`} />
                        <span className="flex-1 truncate">Testnet</span>
                        {network === 'testnet' && <span className="text-amber-600 dark:text-amber-400 text-[10px]">✓</span>}
                      </button>
                    </div>

                    <div className="px-3 py-1.5 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-white/10">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">EVM Network</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 p-1.5">
                      <button
                        onClick={() => { switchEvmChain('polygon'); setShowMobileMenu(false); }}
                        className={`px-2 py-1.5 rounded-lg text-left text-[11px] font-bold transition-colors flex items-center gap-1.5 ${currentEvmChain === 'polygon' ? 'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${currentEvmChain === 'polygon' ? 'bg-purple-500 animate-pulse' : 'bg-gray-400'}`} />
                        <span className="flex-1 truncate">Polygon</span>
                      </button>
                      <button
                        onClick={() => { switchEvmChain('ethereum'); setShowMobileMenu(false); }}
                        className={`px-2 py-1.5 rounded-lg text-left text-[11px] font-bold transition-colors flex items-center gap-1.5 ${currentEvmChain === 'ethereum' ? 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${currentEvmChain === 'ethereum' ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'}`} />
                        <span className="flex-1 truncate">Ethereum</span>
                      </button>
                      <button
                        onClick={() => { switchEvmChain('bsc'); setShowMobileMenu(false); }}
                        className={`px-2 py-1.5 rounded-lg text-left text-[11px] font-bold transition-colors flex items-center gap-1.5 ${currentEvmChain === 'bsc' ? 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${currentEvmChain === 'bsc' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'}`} />
                        <span className="flex-1 truncate">BSC</span>
                      </button>
                      <button
                        onClick={() => { switchEvmChain('sepolia'); setShowMobileMenu(false); }}
                        className={`px-2 py-1.5 rounded-lg text-left text-[11px] font-bold transition-colors flex items-center gap-1.5 ${currentEvmChain === 'sepolia' ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${currentEvmChain === 'sepolia' ? 'bg-amber-500 animate-pulse' : 'bg-gray-400'}`} />
                        <span className="flex-1 truncate">Sepolia</span>
                      </button>
                      <button
                        onClick={() => { switchEvmChain('bsc_testnet'); setShowMobileMenu(false); }}
                        className={`px-2 py-1.5 rounded-lg text-left text-[11px] font-bold transition-colors flex items-center gap-1.5 ${currentEvmChain === 'bsc_testnet' ? 'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${currentEvmChain === 'bsc_testnet' ? 'bg-orange-500 animate-pulse' : 'bg-gray-400'}`} />
                        <span className="flex-1 truncate">BSC Testnet</span>
                      </button>
                      <button
                        onClick={() => { switchEvmChain('polygon_testnet'); setShowMobileMenu(false); }}
                        className={`px-2 py-1.5 rounded-lg text-left text-[11px] font-bold transition-colors flex items-center gap-1.5 ${currentEvmChain === 'polygon_testnet' ? 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${currentEvmChain === 'polygon_testnet' ? 'bg-indigo-500 animate-pulse' : 'bg-gray-400'}`} />
                        <span className="flex-1 truncate">Polygon Testnet</span>
                      </button>
                    </div>
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
                    <div className="px-3 py-1.5 bg-gray-50 dark:bg-white/5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">TON Network</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 p-1.5">
                      <button
                        onClick={() => { switchNetwork('mainnet'); setShowDesktopMenu(false); }}
                        className={`px-2 py-1.5 rounded-lg text-left text-[11px] font-bold transition-colors flex items-center gap-1.5 ${network === 'mainnet' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${network === 'mainnet' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                        <span className="flex-1 truncate">Mainnet</span>
                        {network === 'mainnet' && <span className="text-emerald-600 dark:text-emerald-400 text-[10px]">✓</span>}
                      </button>
                      <button
                        onClick={() => { switchNetwork('testnet'); setShowDesktopMenu(false); }}
                        className={`px-2 py-1.5 rounded-lg text-left text-[11px] font-bold transition-colors flex items-center gap-1.5 ${network === 'testnet' ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${network === 'testnet' ? 'bg-amber-500 animate-pulse' : 'bg-gray-400'}`} />
                        <span className="flex-1 truncate">Testnet</span>
                        {network === 'testnet' && <span className="text-amber-600 dark:text-amber-400 text-[10px]">✓</span>}
                      </button>
                    </div>

                    <div className="px-3 py-1.5 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-white/10">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">EVM Network</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 p-1.5">
                      <button
                        onClick={() => { switchEvmChain('polygon'); setShowDesktopMenu(false); }}
                        className={`px-2 py-1.5 rounded-lg text-left text-[11px] font-bold transition-colors flex items-center gap-1.5 ${currentEvmChain === 'polygon' ? 'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${currentEvmChain === 'polygon' ? 'bg-purple-500 animate-pulse' : 'bg-gray-400'}`} />
                        <span className="flex-1 truncate">Polygon</span>
                      </button>
                      <button
                        onClick={() => { switchEvmChain('ethereum'); setShowDesktopMenu(false); }}
                        className={`px-2 py-1.5 rounded-lg text-left text-[11px] font-bold transition-colors flex items-center gap-1.5 ${currentEvmChain === 'ethereum' ? 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${currentEvmChain === 'ethereum' ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'}`} />
                        <span className="flex-1 truncate">Ethereum</span>
                      </button>
                      <button
                        onClick={() => { switchEvmChain('bsc'); setShowDesktopMenu(false); }}
                        className={`px-2 py-1.5 rounded-lg text-left text-[11px] font-bold transition-colors flex items-center gap-1.5 ${currentEvmChain === 'bsc' ? 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${currentEvmChain === 'bsc' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'}`} />
                        <span className="flex-1 truncate">BSC</span>
                      </button>
                      <button
                        onClick={() => { switchEvmChain('sepolia'); setShowDesktopMenu(false); }}
                        className={`px-2 py-1.5 rounded-lg text-left text-[11px] font-bold transition-colors flex items-center gap-1.5 ${currentEvmChain === 'sepolia' ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${currentEvmChain === 'sepolia' ? 'bg-amber-500 animate-pulse' : 'bg-gray-400'}`} />
                        <span className="flex-1 truncate">Sepolia</span>
                      </button>
                      <button
                        onClick={() => { switchEvmChain('bsc_testnet'); setShowDesktopMenu(false); }}
                        className={`px-2 py-1.5 rounded-lg text-left text-[11px] font-bold transition-colors flex items-center gap-1.5 ${currentEvmChain === 'bsc_testnet' ? 'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${currentEvmChain === 'bsc_testnet' ? 'bg-orange-500 animate-pulse' : 'bg-gray-400'}`} />
                        <span className="flex-1 truncate">BSC Testnet</span>
                      </button>
                      <button
                        onClick={() => { switchEvmChain('polygon_testnet'); setShowDesktopMenu(false); }}
                        className={`px-2 py-1.5 rounded-lg text-left text-[11px] font-bold transition-colors flex items-center gap-1.5 ${currentEvmChain === 'polygon_testnet' ? 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${currentEvmChain === 'polygon_testnet' ? 'bg-indigo-500 animate-pulse' : 'bg-gray-400'}`} />
                        <span className="flex-1 truncate">Polygon Testnet</span>
                      </button>
                    </div>
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
            </div>{/* /desktop-menu-container */}
          </div>{/* /right controls */}
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
                    { icon: LineChart, label: 'Market', path: '/wallet/market' },
                    { icon: Globe, label: 'Explorer', path: '/wallet/explorer' },
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
        <div className="max-w-4xl mx-auto pb-28 lg:pb-16 px-2 sm:px-4 lg:px-8 page-enter overflow-x-hidden">
          {children}
        </div>

        {/* Persistent Bottom Nav - Optimized for iOS/Android Gestures */}
        <nav className="mobile-nav lg:hidden">
          {/* Safe area spacer for devices with home indicator */}
          <div className="mobile-nav-safe flex items-center justify-around px-1 py-3">
            <MobileNavItem to="/wallet/dashboard" icon={LayoutDashboard} label={t('nav.dashboard')} />
            <MobileNavItem to="/wallet/assets" icon={Wallet} label="Assets" />
            <MobileNavItem to="/wallet/engagement" icon={Rocket} label="Mainnet" />
            <MobileNavItem to="/wallet/market" icon={LineChart} label="Market" />
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
