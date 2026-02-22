
import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Wallet, 
  History, 
  Settings, 
  ShieldCheck, 
  Zap,
  Users,
  Maximize,
  Sun,
  Moon
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import SessionTimeoutWarning from './SessionTimeoutWarning';

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
  const { address, theme, toggleTheme } = useWallet();
  if (!isWalletMode) return <>{children}</>;

  const shortenAddress = (addr: string | null) => {
    if (!addr) return '...';
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#020202] text-slate-900 dark:text-white transition-colors duration-300">
      {/* Session Timeout Warning */}
      <SessionTimeoutWarning />
      
      {/* Sidebar - Desktop (Institutional Look) */}
      <aside className="hidden lg:flex flex-col w-72 border-r border-slate-200 dark:border-white/5 p-8 gap-10 fixed h-full bg-white dark:bg-[#050505] z-40 shadow-2xl dark:shadow-none">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl flex items-center justify-center shadow-lg transition-colors">
            <Zap className="fill-current" size={20} />
          </div>
          <span className="text-xl font-extrabold tracking-tight luxury-gradient-text">RhizaCore</span>
        </div>

        <nav className="flex flex-col gap-1">
          <SidebarItem to="/wallet/dashboard" icon={LayoutDashboard} label="Home" />
          <SidebarItem to="/wallet/assets" icon={Wallet} label="Assets" />
          <SidebarItem to="/wallet/history" icon={History} label="Activity" />
          <SidebarItem to="/wallet/referral" icon={Users} label="Referral" />
        </nav>

        <div className="mt-auto space-y-4">
          <button 
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 text-slate-500 dark:text-gray-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            <span className="font-semibold text-sm tracking-tight">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <SidebarItem to="/wallet/settings" icon={Settings} label="Settings" />
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
        <header className="h-20 lg:h-16 flex items-center justify-between px-6 sticky top-0 bg-white/60 dark:bg-[#020202]/60 backdrop-blur-xl z-30 border-b border-slate-200 dark:border-white/5 transition-colors">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="w-8 h-8 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg flex items-center justify-center transition-colors">
              <Zap size={18} fill="currentColor" />
            </div>
            <span className="text-lg font-black tracking-tight">RhizaCore</span>
          </div>

          <div className="hidden lg:flex items-center gap-4">
            <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-xl flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_rgba(0,255,136,0.5)]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-gray-400">TON Mainnet</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors text-slate-500 dark:text-gray-500 lg:hidden">
               {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-xl font-mono text-[11px] text-primary font-bold">
              {shortenAddress(address)}
            </div>
          </div>
        </header>

        {/* Content Container */}
        <div className="max-w-4xl mx-auto pt-4 pb-20 sm:p-5 lg:p-10 page-enter">
          {children}
        </div>

        {/* Persistent Bottom Nav - Optimized for iOS/Android Gestures */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border-t border-slate-200 dark:border-white/5 flex items-center justify-around px-4 z-50 pb-[var(--safe-area-inset-bottom)] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.6)]">
          <MobileNavItem to="/wallet/dashboard" icon={LayoutDashboard} label="Home" />
          <MobileNavItem to="/wallet/assets" icon={Wallet} label="Assets" />
          <MobileNavItem to="/wallet/history" icon={History} label="History" />
          <MobileNavItem to="/wallet/referral" icon={Users} label="Invites" />
          <MobileNavItem to="/wallet/settings" icon={Settings} label="Config" />
        </nav>
      </main>
    </div>
  );
};
