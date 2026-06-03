# Layout Component Upgrade Plan

**Goal:** Transform the monolithic Layout.tsx into a maintainable, performant, and accessible component architecture.

---

## 🏗️ New Architecture

```
components/
├── Layout/
│   ├── Layout.tsx                    # Main orchestrator (100-150 lines)
│   ├── Sidebar/
│   │   ├── DesktopSidebar.tsx       # Desktop sidebar container
│   │   ├── SidebarNavigation.tsx    # Navigation links
│   │   ├── SidebarFooter.tsx        # Footer content (price, social, status)
│   │   ├── MigrationStatusCard.tsx  # Migration status widget
│   │   └── SidebarItem.tsx          # Individual nav item
│   ├── Header/
│   │   ├── Header.tsx               # Header container
│   │   ├── NotificationBell.tsx     # Notification icon with badge
│   │   ├── ProfileMenu.tsx          # User profile dropdown
│   │   ├── NetworkSwitcher.tsx      # Network selection
│   │   └── LanguageSelector.tsx     # Language dropdown (existing)
│   ├── MobileNav/
│   │   ├── MobileBottomNav.tsx      # Bottom navigation bar
│   │   ├── MobileAppDrawer.tsx      # Full-screen app menu
│   │   └── MobileNavItem.tsx        # Individual nav item
│   └── hooks/
│       ├── useNotifications.ts      # Notification logic
│       ├── useMigrationStatus.ts    # Migration status logic
│       ├── useMenuState.ts          # Menu state management
│       └── useAudioNotification.ts  # Audio notification logic
└── Layout.tsx (legacy - to be removed)
```

---

## 📋 Implementation Phases

### Phase 1: Extract Custom Hooks (Day 1 - Morning)
**Goal:** Reduce component complexity by extracting business logic

#### 1.1 Create `useNotifications.ts`
```typescript
// components/Layout/hooks/useNotifications.ts
import { useState, useEffect, useCallback } from 'react';
import type { Notification } from '../../../services/notificationService';

export const useNotifications = (walletAddress: string | null, isEnabled: boolean) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [toastNotifications, setToastNotifications] = useState<Notification[]>([]);

  const fetchUnreadCount = useCallback(async () => {
    if (!walletAddress || !isEnabled) return;
    
    try {
      const { notificationService } = await import('../../../services/notificationService');
      const result = await notificationService.getUnreadCount(walletAddress);
      
      if (result.success && result.count !== undefined) {
        setUnreadCount(result.count);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [walletAddress, isEnabled]);

  const refreshUnreadCount = useCallback(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  const addToast = useCallback((notification: Notification) => {
    setToastNotifications(prev => [...prev, notification]);
  }, []);

  const removeToast = useCallback((notificationId: string) => {
    setToastNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  useEffect(() => {
    if (!walletAddress || !isEnabled) {
      setUnreadCount(0);
      return;
    }

    let subscription: any = null;
    let isActive = true;

    const setupRealtime = async () => {
      try {
        const { notificationService } = await import('../../../services/notificationService');
        
        subscription = notificationService.subscribeToNotifications(
          walletAddress,
          (notification) => {
            if (!isActive) return;

            if (!notification.is_read) {
              setUnreadCount(prev => prev + 1);
            }

            addToast(notification);
          }
        );
      } catch (error) {
        console.error('Error setting up notification subscription:', error);
      }
    };

    fetchUnreadCount();
    setupRealtime();

    // Use Page Visibility API instead of polling
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchUnreadCount();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isActive = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      try {
        subscription?.unsubscribe();
      } catch (error) {
        console.error('Failed to unsubscribe:', error);
      }
    };
  }, [walletAddress, isEnabled, fetchUnreadCount, addToast]);

  // Request notification permission
  useEffect(() => {
    if (!isEnabled) return;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [isEnabled]);

  return {
    unreadCount,
    toastNotifications,
    refreshUnreadCount,
    removeToast,
  };
};
```

#### 1.2 Create `useMigrationStatus.ts`
```typescript
// components/Layout/hooks/useMigrationStatus.ts
import { useState, useEffect } from 'react';

type MigrationStatus = 'none' | 'pending' | 'approved' | 'rejected';

export const useMigrationStatus = (walletAddress: string | null, isEnabled: boolean) => {
  const [status, setStatus] = useState<MigrationStatus>('none');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!walletAddress || !isEnabled) {
      setStatus('none');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchStatus = async () => {
      try {
        setLoading(true);
        const { migrationService } = await import('../../../services/migrationService');
        const res = await migrationService.getMigrationStatus(walletAddress);
        
        if (!cancelled && res.success && res.data) {
          setStatus(res.data.status as MigrationStatus);
        }
      } catch (err) {
        console.error('Error fetching migration status:', err);
        if (!cancelled) {
          setStatus('none');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchStatus();

    return () => {
      cancelled = true;
    };
  }, [walletAddress, isEnabled]);

  return { status, loading };
};
```

#### 1.3 Create `useMenuState.ts`
```typescript
// components/Layout/hooks/useMenuState.ts
import { useState, useCallback, useEffect } from 'react';

interface MenuState {
  language: boolean;
  network: boolean;
  mobile: boolean;
  desktop: boolean;
  app: boolean;
}

export const useMenuState = () => {
  const [menus, setMenus] = useState<MenuState>({
    language: false,
    network: false,
    mobile: false,
    desktop: false,
    app: false,
  });

  const toggleMenu = useCallback((menu: keyof MenuState) => {
    setMenus(prev => ({
      ...prev,
      [menu]: !prev[menu],
    }));
  }, []);

  const closeMenu = useCallback((menu: keyof MenuState) => {
    setMenus(prev => ({
      ...prev,
      [menu]: false,
    }));
  }, []);

  const closeAllMenus = useCallback(() => {
    setMenus({
      language: false,
      network: false,
      mobile: false,
      desktop: false,
      app: false,
    });
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      const menuContainers = [
        '.language-menu-container',
        '.network-menu-container',
        '.mobile-menu-container',
        '.desktop-menu-container',
      ];

      const clickedInside = menuContainers.some(selector => 
        target.closest(selector)
      );

      if (!clickedInside) {
        closeAllMenus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeAllMenus]);

  // Close menus on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeAllMenus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [closeAllMenus]);

  return {
    menus,
    toggleMenu,
    closeMenu,
    closeAllMenus,
  };
};
```

#### 1.4 Create `useAudioNotification.ts`
```typescript
// components/Layout/hooks/useAudioNotification.ts
import { useRef, useCallback } from 'react';

export const useAudioNotification = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const playNotificationSound = useCallback(() => {
    try {
      // Create AudioContext once and reuse
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
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
  }, []);

  return { playNotificationSound };
};
```

---

### Phase 2: Extract Sidebar Components (Day 1 - Afternoon)

#### 2.1 Create `SidebarItem.tsx`
```typescript
// components/Layout/Sidebar/SidebarItem.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

interface SidebarItemProps {
  to: string;
  icon: LucideIcon;
  label: string;
  primary?: boolean;
  badge?: string | number;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  to,
  icon: Icon,
  label,
  primary = false,
  badge,
}) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `
        flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 relative
        ${isActive
          ? 'bg-black/5 dark:bg-white/10 text-primary border border-black/5 dark:border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.1)]'
          : 'text-slate-500 dark:text-gray-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}
      `}
      aria-label={label}
    >
      <Icon size={primary ? 20 : 18} className={primary ? 'text-primary' : ''} />
      <span className="font-nav text-[10px] tracking-[0.12em] flex-1">{label}</span>
      {badge && (
        <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
          {badge}
        </span>
      )}
    </NavLink>
  );
};
```

#### 2.2 Create `MigrationStatusCard.tsx`
```typescript
// components/Layout/Sidebar/MigrationStatusCard.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from 'lucide-react';

type MigrationStatus = 'none' | 'pending' | 'approved' | 'rejected';

interface MigrationStatusCardProps {
  status: MigrationStatus;
  loading?: boolean;
}

const MIGRATION_CONFIG = {
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
} as const;

export const MigrationStatusCard: React.FC<MigrationStatusCardProps> = ({
  status,
  loading = false,
}) => {
  const config = MIGRATION_CONFIG[status];
  const StatusIcon = config.icon;

  if (loading) {
    return (
      <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse">
        <div className="h-16 bg-slate-200 dark:bg-white/10 rounded" />
      </div>
    );
  }

  return (
    <NavLink
      to="/wallet/migration"
      className={`group block p-3.5 rounded-2xl bg-gradient-to-br ${config.bg} border-2 ${config.border} hover:scale-[1.02] active:scale-[0.98] transition-all duration-200`}
      aria-label={`Migration status: ${config.label}`}
    >
      <div className="flex items-start gap-2.5">
        <div className={`w-8 h-8 rounded-xl ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
          <StatusIcon size={16} className={config.iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <span className={`text-[11px] font-black leading-tight ${config.labelColor}`}>
              {config.label}
            </span>
            {config.showPing && (
              <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.ping} opacity-75`} />
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${config.ping}`} />
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className={`text-[10px] font-semibold ${config.subColor}`}>
              {config.sub}
            </span>
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${config.badgeBg}`}>
              {config.badge}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-600">
          Migration Status
        </span>
        <ArrowRight
          size={12}
          className="text-slate-400 dark:text-gray-600 group-hover:translate-x-1 transition-transform"
          aria-hidden="true"
        />
      </div>
    </NavLink>
  );
};
```

---

### Phase 3: Extract Header Components (Day 2 - Morning)

#### 3.1 Create `NotificationBell.tsx`
```typescript
// components/Layout/Header/NotificationBell.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Bell } from 'lucide-react';

interface NotificationBellProps {
  unreadCount: number;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ unreadCount }) => {
  return (
    <NavLink
      to="/wallet/notifications"
      className="relative p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors"
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <Bell size={20} className="text-slate-600 dark:text-gray-400" />
      {unreadCount > 0 && (
        <>
          <span
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse"
            aria-hidden="true"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
          <span className="sr-only">{unreadCount} unread notifications</span>
        </>
      )}
    </NavLink>
  );
};
```

---

### Phase 4: Create New Main Layout (Day 2 - Afternoon)

```typescript
// components/Layout/Layout.tsx
import React from 'react';
import { useWallet } from '../../context/WalletContext';
import { DesktopSidebar } from './Sidebar/DesktopSidebar';
import { Header } from './Header/Header';
import { MobileBottomNav } from './MobileNav/MobileBottomNav';
import { MobileAppDrawer } from './MobileNav/MobileAppDrawer';
import { NotificationToast } from '../NotificationToast';
import { IcoUrgencyBanner } from '../IcoUrgencyBanner';
import { useNotifications } from './hooks/useNotifications';
import { useMenuState } from './hooks/useMenuState';

interface LayoutProps {
  children: React.ReactNode;
  isWalletMode: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, isWalletMode }) => {
  const { userProfile, address } = useWallet();
  const walletAddress = userProfile?.wallet_address || address;
  
  const { menus, toggleMenu, closeMenu, closeAllMenus } = useMenuState();
  const {
    unreadCount,
    toastNotifications,
    refreshUnreadCount,
    removeToast,
  } = useNotifications(walletAddress, isWalletMode);

  if (!isWalletMode) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#020202] text-slate-900 dark:text-white transition-colors duration-300">
      {/* Desktop Sidebar */}
      <DesktopSidebar />

      {/* Main Content */}
      <main className="flex-1 lg:ml-72 relative min-h-screen pb-safe overflow-x-hidden">
        {/* Header */}
        <Header
          unreadCount={unreadCount}
          menus={menus}
          toggleMenu={toggleMenu}
          closeMenu={closeMenu}
        />

        {/* ICO Banner */}
        <IcoUrgencyBanner hideOnPages={['/wallet/store']} dismissible />

        {/* Page Content */}
        <div className="max-w-4xl mx-auto pb-24 sm:pb-20 lg:pb-10 sm:px-5 lg:px-10 page-enter overflow-x-hidden">
          {children}
        </div>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </main>

      {/* Mobile App Drawer */}
      <MobileAppDrawer
        isOpen={menus.app}
        onClose={() => closeMenu('app')}
      />

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[300] space-y-2 pointer-events-none">
        {toastNotifications.map((notification) => (
          <div key={notification.id} className="pointer-events-auto">
            <NotificationToast
              notification={notification}
              onClose={() => removeToast(notification.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## 🎨 UI Enhancements

### 1. Add Skeleton Loaders
```typescript
// components/Layout/Sidebar/SidebarSkeleton.tsx
export const SidebarSkeleton = () => (
  <div className="space-y-2 animate-pulse">
    {[...Array(8)].map((_, i) => (
      <div key={i} className="h-12 bg-slate-200 dark:bg-white/5 rounded-2xl" />
    ))}
  </div>
);
```

### 2. Add Framer Motion Animations
```typescript
import { motion, AnimatePresence } from 'framer-motion';

<AnimatePresence>
  {menus.app && (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
    >
      <MobileAppDrawer />
    </motion.div>
  )}
</AnimatePresence>
```

### 3. Add Focus Trap for Modals
```typescript
import { Dialog } from '@headlessui/react';

<Dialog open={menus.app} onClose={() => closeMenu('app')}>
  <Dialog.Panel>
    {/* Content */}
  </Dialog.Panel>
</Dialog>
```

---

## 📊 Testing Strategy

### Unit Tests
```typescript
// components/Layout/hooks/__tests__/useNotifications.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useNotifications } from '../useNotifications';

describe('useNotifications', () => {
  it('should fetch unread count on mount', async () => {
    const { result } = renderHook(() => 
      useNotifications('0x123', true)
    );

    await waitFor(() => {
      expect(result.current.unreadCount).toBeGreaterThanOrEqual(0);
    });
  });

  it('should handle toast notifications', () => {
    const { result } = renderHook(() => 
      useNotifications('0x123', true)
    );

    // Test toast management
    expect(result.current.toastNotifications).toEqual([]);
  });
});
```

---

## 🚀 Migration Strategy

### Step 1: Feature Flag
```typescript
// config/features.ts
export const FEATURES = {
  NEW_LAYOUT: process.env.REACT_APP_NEW_LAYOUT === 'true',
};

// App.tsx
import { Layout as OldLayout } from './components/Layout';
import { Layout as NewLayout } from './components/Layout/Layout';
import { FEATURES } from './config/features';

const Layout = FEATURES.NEW_LAYOUT ? NewLayout : OldLayout;
```

### Step 2: A/B Testing
```typescript
// Gradually roll out to users
const useNewLayout = userProfile?.id % 10 < 5; // 50% of users
```

### Step 3: Full Rollout
```typescript
// After testing, remove old layout
rm components/Layout.tsx
mv components/Layout/Layout.tsx components/Layout.tsx
```

---

## 📈 Success Metrics

Track these metrics before and after:

1. **Performance**
   - First Contentful Paint (FCP)
   - Time to Interactive (TTI)
   - Component re-render count

2. **Bundle Size**
   - Main bundle size
   - Layout chunk size

3. **User Experience**
   - Navigation click-through rate
   - Menu interaction time
   - Error rate

4. **Code Quality**
   - Lines of code per component
   - Cyclomatic complexity
   - Test coverage

---

## 🎯 Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 1: Hooks | 4 hours | 4 custom hooks |
| Phase 2: Sidebar | 4 hours | 5 sidebar components |
| Phase 3: Header | 4 hours | 4 header components |
| Phase 4: Mobile | 4 hours | 3 mobile components |
| Phase 5: Integration | 4 hours | New Layout.tsx |
| Phase 6: Testing | 8 hours | Unit + integration tests |
| Phase 7: Migration | 4 hours | Feature flag + rollout |

**Total:** 32 hours (4 days)

---

## ✅ Checklist

- [ ] Extract custom hooks
- [ ] Create sidebar components
- [ ] Create header components
- [ ] Create mobile components
- [ ] Build new Layout orchestrator
- [ ] Add accessibility features
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Add Storybook stories
- [ ] Performance testing
- [ ] Feature flag implementation
- [ ] A/B testing
- [ ] Full rollout
- [ ] Remove old code
- [ ] Update documentation

---

**Ready to start implementation?** Let me know which phase you'd like to begin with!
