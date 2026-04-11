
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
  MoreHorizontal as More,
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { useActivationModal } from '../context/ActivationModalContext';
import AirdropTrigger from './AirdropTrigger';
import LanguageSelector from './LanguageSelector';
import { SOCIAL_LINKS } from '../constants';
import { RZC_CONFIG, formatRzcAsUsd } from '../config/rzcConfig';
import NotificationToast from './NotificationToast';
import type { Notification } from '../services/notificationService';

interface LayoutProps {
  children: React.ReactNode;
  isWalletMode: boolean;
}

const SidebarItem = ({ to, icon: Icon, label, requiresActivation = false, primary = false }: { to: string, icon: any, label: string, requiresActivation?: boolean, primary?: boolean }) => {
  const { isActivated, isLoading } = useWallet();
  const { showActivationModal } = useActivationModal();

  const handleClick = (e: React.MouseEvent) => {
    if (requiresActivation && !isActivated && !isLoading) {
      e.preventDefault();
      showActivationModal();
    }
  };

  return (
    <NavLink
      to={to}
      onClick={handleClick}
      className={({ isActive }) => `
        flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300
        ${isActive
          ? 'bg-black/5 dark:bg-white/10 text-primary border border-black/5 dark:border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.1)]'
          : 'text-slate-500 dark:text-gray-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}
      `}
    >
      <Icon size={primary ? 20 : 18} className={primary ? 'text-primary' : ''} />
      <span className="font-nav text-[10px] tracking-[0.12em]">{label}</span>
      {requiresActivation && !isActivated && !isLoading && (
        <Lock size={12} className="ml-auto text-amber-500" />
      )}
    </NavLink>
  );
};

const MobileNavItem = ({ to, icon: Icon, label, requiresActivation = false }: { to: string, icon: any, label: string, requiresActivation?: boolean }) => {
  const { isActivated, isLoading } = useWallet();
  const { showActivationModal } = useActivationModal();

  const handleClick = (e: React.MouseEvent) => {
    if (requiresActivation && !isActivated && !isLoading) {
      e.preventDefault();
      showActivationModal();
    }
  };

  return (
    <NavLink
      to={to}
      onClick={handleClick}
      className={({ isActive }) => `
        flex flex-col items-center justify-center gap-1.5 flex-1 py-2 px-2 rounded-xl transition-all duration-200 active:scale-95 relative min-h-[60px]
        ${isActive
          ? 'text-primary mobile-nav-item-active'
          : 'text-slate-500 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300'}
      `}
    >
      {({ isActive }: { isActive: boolean }) => (
        <>
          {/* Icon container with lock indicator */}
          <div className={`
            relative w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200
            ${isActive
              ? 'bg-primary/10 scale-110'
              : 'hover:bg-slate-100 dark:hover:bg-white/5'
            }
          `}>
            <Icon
              size={16}
              strokeWidth={isActive ? 2.5 : 2}
              className={isActive ? 'drop-shadow-sm' : ''}
            />
            {requiresActivation && !isActivated && !isLoading && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full flex items-center justify-center">
                <Lock size={8} className="text-white" />
              </div>
            )}
          </div>

          {/* Label */}
          <span className={`
            text-[8px] font-bold uppercase tracking-wider leading-tight text-center max-w-[50px] truncate
            ${isActive ? 'text-primary font-black' : 'font-semibold opacity-75'}
          `}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
};

export const Layout: React.FC<LayoutProps> = ({ children, isWalletMode }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
    if (!walletAddress || !isWalletMode) return;

    let subscription: any = null;

    const fetchUnreadCount = async () => {
      try {
        // Import notification service dynamically to avoid circular dependencies
        const { notificationService } = await import('../services/notificationService');
        const result = await notificationService.getUnreadCount(walletAddress);
        if (result.success && result.count !== undefined) {
          setUnreadCount(result.count);
        }
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };

    const setupRealtime = async () => {
      try {
        const { notificationService } = await import('../services/notificationService');
        subscription = notificationService.subscribeToNotifications(walletAddress, (notification) => {
          // Increment count for new unread notifications
          if (!notification.is_read) {
            setUnreadCount(prev => prev + 1);
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
      <aside className="hidden lg:flex flex-col w-72 border-r border-slate-200 dark:border-white/5 p-8 gap-10 fixed h-full bg-white dark:bg-[#050505] z-40 shadow-2xl dark:shadow-none">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl flex items-center justify-center shadow-lg transition-colors">
            <Zap className="fill-current" size={20} />
          </div>
          <span className="text-xl font-heading font-black uppercase tracking-[0.2em] luxury-gradient-text">RhizaCore</span>

        </div>

        <nav className="flex flex-col gap-1">
          <SidebarItem to="/wallet/dashboard" icon={LayoutDashboard} label={t('nav.dashboard')} />
          <SidebarItem to="/wallet/assets" icon={Wallet} label={t('nav.assets')} />
          <SidebarItem to="/wallet/swap" icon={ArrowLeftRight} label="Swap" />
          <SidebarItem to="/wallet/sales-package" icon={Package} label="Nodes" />
          <SidebarItem to="/wallet/referral" icon={Gift} label="Affiliate" requiresActivation />
          {/* <SidebarItem to="/wallet/migration" icon={TrendingUp} label="Migrate" /> */}
          <SidebarItem to="/wallet/multi-chain" icon={Layers} label="Multi-Chain" requiresActivation />
          <SidebarItem to="/wallet/history" icon={History} label={t('nav.history')} />
          {/* <SidebarItem to="/wallet/history" icon={Activity} label="Activity" requiresActivation /> */}

          {/* Airdrop Trigger */}
          <div className="px-4 py-2">
            <AirdropTrigger variant="button" size="md" className="w-full justify-center" />
          </div>
        </nav>

        <div className="mt-auto space-y-4">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 text-slate-500 dark:text-gray-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            <span className="font-heading font-black text-xs uppercase tracking-widest">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <SidebarItem to="/wallet/settings" icon={Settings} label={t('nav.settings')} />

          {/* RZC Price Display */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-cyan-50 dark:from-emerald-500/10 dark:to-cyan-500/10 border-2 border-emerald-200 dark:border-emerald-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-heading font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">RZC Price</span>
              <TrendingUp size={12} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-numbers font-black luxury-gradient-text font-glow">
                ${rzcPrice}
              </span>
              <span className="text-[10px] font-heading font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">
                per {RZC_CONFIG.SYMBOL}
              </span>
            </div>
            <p className="text-[9px] font-heading font-black text-emerald-600 dark:text-emerald-500 mt-2 uppercase tracking-widest">
              1,000 RZC = <span className="font-numbers">{formatRzcAsUsd(1000)}</span>
            </p>
          </div>

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
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  )}
                  {social.icon === 'telegram' && (
                    <svg className="w-3.5 h-3.5 text-slate-500 dark:text-gray-500 group-hover:text-primary transition-colors" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z" />
                    </svg>
                  )}
                  {social.icon === 'facebook' && (
                    <svg className="w-3.5 h-3.5 text-slate-500 dark:text-gray-500 group-hover:text-primary transition-colors" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  )}
                </div>
                <span className="font-heading font-black text-[10px] uppercase tracking-widest flex-1">{social.label}</span>
                <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>

          {/* Migration Status Card */}
          {(() => {
            const migrationConfig = {
              none: {
                bg: 'from-purple-50 to-fuchsia-50 dark:from-purple-500/10 dark:to-fuchsia-500/10',
                border: 'border-purple-200 dark:border-purple-500/20',
                icon: TrendingUp,
                iconBg: 'bg-purple-100 dark:bg-purple-500/20',
                iconColor: 'text-purple-600 dark:text-purple-400',
                ping: 'bg-purple-500',
                label: 'Migrate RZC/STK',
                labelColor: 'text-purple-900 dark:text-purple-300',
                sub: 'Tap to start migration',
                subColor: 'text-purple-600 dark:text-purple-400',
                badge: 'Required',
                badgeBg: 'bg-purple-500/15 text-purple-700 dark:text-purple-300',
                showPing: true,
              },
              pending: {
                bg: 'from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10',
                border: 'border-amber-200 dark:border-amber-500/20',
                icon: Clock,
                iconBg: 'bg-amber-100 dark:bg-amber-500/20',
                iconColor: 'text-amber-600 dark:text-amber-400',
                ping: 'bg-amber-500',
                label: 'Migration In Review',
                labelColor: 'text-amber-900 dark:text-amber-300',
                sub: '24-48h • Under review',
                subColor: 'text-amber-600 dark:text-amber-400',
                badge: 'Pending',
                badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
                showPing: true,
              },
              approved: {
                bg: 'from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10',
                border: 'border-emerald-200 dark:border-emerald-500/20',
                icon: CheckCircle2,
                iconBg: 'bg-emerald-100 dark:bg-emerald-500/20',
                iconColor: 'text-emerald-600 dark:text-emerald-400',
                ping: 'bg-emerald-500',
                label: 'Migration Complete',
                labelColor: 'text-emerald-900 dark:text-emerald-300',
                sub: 'Tokens credited ✓',
                subColor: 'text-emerald-600 dark:text-emerald-400',
                badge: 'Approved',
                badgeBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
                showPing: false,
              },
              rejected: {
                bg: 'from-red-50 to-rose-50 dark:from-red-500/10 dark:to-rose-500/10',
                border: 'border-red-200 dark:border-red-500/20',
                icon: XCircle,
                iconBg: 'bg-red-100 dark:bg-red-500/20',
                iconColor: 'text-red-600 dark:text-red-400',
                ping: 'bg-red-500',
                label: 'Migration Rejected',
                labelColor: 'text-red-900 dark:text-red-300',
                sub: 'Tap to resubmit',
                subColor: 'text-red-600 dark:text-red-400',
                badge: 'Action Needed',
                badgeBg: 'bg-red-500/15 text-red-700 dark:text-red-300',
                showPing: true,
              },
            };
            const cfg = migrationConfig[migrationStatus];
            const StatusIcon = cfg.icon;
            return (
              <NavLink to="/wallet/migration" className={`group block p-3.5 rounded-2xl bg-gradient-to-br ${cfg.bg} border-2 ${cfg.border} hover:scale-[1.02] active:scale-[0.98] transition-all duration-200`}>
                <div className="flex items-start gap-2.5">
                  <div className={`w-8 h-8 rounded-xl ${cfg.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <StatusIcon size={16} className={cfg.iconColor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <span className={`text-[11px] font-black leading-tight ${cfg.labelColor}`}>{cfg.label}</span>
                      {cfg.showPing && (
                        <span className="relative flex h-1.5 w-1.5">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${cfg.ping} opacity-75`}></span>
                          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${cfg.ping}`}></span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-[10px] font-semibold ${cfg.subColor}`}>{cfg.sub}</span>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${cfg.badgeBg}`}>{cfg.badge}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-600">Migration Status</span>
                  <ArrowRight size={12} className="text-slate-400 dark:text-gray-600 group-hover:translate-x-1 transition-transform" />
                </div>
              </NavLink>
            );
          })()}

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
      <main className="flex-1 lg:ml-72 relative min-h-screen pb-safe overflow-x-hidden">
        {/* Header - Transparent Glass */}
        <header className="h-20 lg:h-16 flex items-center justify-between px-4 sm:px-6 sticky top-0 bg-white/60 dark:bg-[#020202]/60 backdrop-blur-xl z-30 border-b border-slate-200 dark:border-white/5 transition-colors">
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

          {/* Right: All Controls in Profile Card */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Notification Bell Link */}
            <NavLink
              to="/wallet/notifications"
              className="relative p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors"
            >
              <Bell size={20} className="text-slate-600 dark:text-gray-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </NavLink>

            {/* Language Selector Dropdown - Positioned Absolutely */}
            {showLanguageMenu && (
              <div className="fixed top-20 right-4 z-[60]">
                <LanguageSelector compact isOpen={showLanguageMenu} onSelect={() => setShowLanguageMenu(false)} />
              </div>
            )}

            {/* Unified Profile Card with All Controls */}
            <div className="relative desktop-menu-container">
              <div className="flex items-center gap-2 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-xl shadow-sm overflow-hidden">
                {/* Controls Group - Hidden on Mobile, shown on Desktop */}
                <div className="hidden sm:flex items-center gap-0.5 px-2 py-1.5 border-r-2 border-gray-200 dark:border-white/10">
                  {/* Desktop Dropdown Toggle Button */}
                  <button
                    onClick={() => setShowDesktopMenu(!showDesktopMenu)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-all"
                    title="Settings Menu"
                  >
                    <MoreHorizontal size={16} className="text-gray-700 dark:text-gray-400" />
                  </button>
                </div>

                {/* User Profile & Balance - Clickable on Mobile */}
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:cursor-default active:scale-95 sm:active:scale-100 transition-transform"
                >
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
                      <NavLink
                        to="/wallet/profile"
                        className="group/name flex items-center gap-1 hover:text-primary transition-colors"
                        title="Edit profile"
                      >
                        <span className="text-[11px] font-heading font-black text-slate-900 dark:text-white group-hover/name:text-primary leading-tight transition-colors">
                          {userProfile?.name || 'User'}
                        </span>
                        <Pencil size={9} className="opacity-0 group-hover/name:opacity-60 transition-opacity text-primary" />
                      </NavLink>
                      {referralData && referralData.total_referrals > 0 && (
                        <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          {referralData.total_referrals} Refs
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-slate-400 dark:text-gray-600">•</span>
                      <span className="text-[9px] font-numbers font-black text-primary font-glow">
                        {formatBalance(balance)} TON
                      </span>
                      <span className="text-[9px] text-slate-400 dark:text-gray-600">•</span>
                      <span className="text-[9px] font-numbers font-black text-emerald-500 dark:text-emerald-400">
                        ${rzcPrice} RZC
                      </span>
                    </div>
                  </div>

                  {/* Balance Only - Mobile */}
                  <div className="flex lg:hidden flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <NavLink
                        to="/wallet/profile"
                        className="group/name flex items-center gap-1"
                        title="Edit profile"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[11px] font-bold text-slate-900 dark:text-white leading-tight group-hover/name:text-primary transition-colors">
                          {userProfile?.name || 'User'}
                        </span>
                        <Pencil size={9} className="opacity-0 group-hover/name:opacity-60 transition-opacity text-primary" />
                      </NavLink>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] font-numbers font-black text-emerald-600 dark:text-emerald-400 leading-tight">
                        {formatBalance(userProfile?.rzc_balance || 0)} RZC
                      </span>
                      <span className="text-[8px] text-gray-500 dark:text-gray-600">•</span>
                      <span className="text-[8px] font-numbers font-black text-emerald-600 dark:text-emerald-400 leading-tight">
                        ${rzcPrice}
                      </span>
                    </div>
                  </div>
                </button>
              </div>

              {/* Mobile Dropdown Menu */}
              {showMobileMenu && (
                <div className="mobile-menu-container sm:hidden absolute top-full right-0 mt-2 bg-white dark:bg-[#0a0a0a] border-2 border-gray-300 dark:border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden min-w-[200px] animate-in fade-in slide-in-from-top-2 duration-200">
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

                  {/* WDK Multi-Chain Networks */}
                  <div className="border-b-2 border-gray-200 dark:border-white/10">
                    <div className="px-3 py-2 bg-gray-50 dark:bg-white/5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-500">WDK Networks</span>
                    </div>
                    <div className="px-3 py-2 text-[10px] text-gray-500 dark:text-gray-600">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                        <span className="font-semibold">EVM (Polygon)</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        <span className="font-semibold">TON</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                        <span className="font-semibold">BTC (Bitcoin)</span>
                      </div>
                      <p className="mt-2 text-[9px] italic">
                        Multi-chain support via WDK. Network follows TON setting above.
                      </p>
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
                <div className="hidden sm:block absolute top-full right-0 mt-2 bg-white dark:bg-[#0a0a0a] border-2 border-gray-300 dark:border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden min-w-[200px] animate-in fade-in slide-in-from-top-2 duration-200">
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

                  {/* WDK Multi-Chain Networks */}
                  <div className="border-b-2 border-gray-200 dark:border-white/10">
                    <div className="px-3 py-2 bg-gray-50 dark:bg-white/5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-500">WDK Networks</span>
                    </div>
                    <div className="px-3 py-2 text-[10px] text-gray-500 dark:text-gray-600">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                        <span className="font-semibold">EVM (Polygon)</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        <span className="font-semibold">TON</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                        <span className="font-semibold">BTC (Bitcoin)</span>
                      </div>
                      <p className="mt-2 text-[9px] italic">
                        Multi-chain support via WDK. Network follows TON setting above.
                      </p>
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

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg flex items-center justify-center">
                    <Zap size={16} fill="currentColor" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 dark:text-white">RhizaCore</p>
                    <p className="text-[10px] text-slate-500 dark:text-gray-500">{userProfile?.name || 'User'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAppMenu(false)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                >
                  <X size={16} />
                </button>
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
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
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
                  ].map(({ icon: Icon, label, path }) => (
                    <button
                      key={path}
                      onClick={() => { navigate(path); setShowAppMenu(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left"
                    >
                      <Icon size={16} className="text-slate-500 dark:text-gray-500 shrink-0" />
                      <span className="text-sm font-semibold text-slate-800 dark:text-gray-200 flex-1">{label}</span>
                      <ChevronRight size={14} className="text-slate-300 dark:text-gray-600" />
                    </button>
                  ))}
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

        {/* Content Container */}
        <div className="max-w-4xl mx-auto pb-24 sm:pb-20 lg:pb-10 sm:p-5 lg:p-10 page-enter overflow-x-hidden">
          {children}
        </div>

        {/* Persistent Bottom Nav - Optimized for iOS/Android Gestures */}
        <nav className="mobile-nav lg:hidden">
          {/* Safe area spacer for devices with home indicator */}
          <div className="mobile-nav-safe flex items-center justify-around px-2 py-3">
            <MobileNavItem to="/wallet/dashboard" icon={LayoutDashboard} label={t('nav.dashboard')} />
            <MobileNavItem to="/wallet/assets" icon={Wallet} label={t('nav.assets')} />
            <MobileNavItem to="/wallet/swap" icon={ArrowLeftRight} label="Swap" />
            <MobileNavItem to="/wallet/referral" icon={Gift} label="Affiliate" requiresActivation />
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
