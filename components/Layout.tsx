
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
  Globe
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';

interface LayoutProps {
  children: React.ReactNode;
  isWalletMode: boolean;
}

const SidebarItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => (
  <NavLink
    to={to}
    className={({ isActive }) => `
      flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
      ${isActive 
        ? 'bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/20' 
        : 'text-gray-400 hover:text-white hover:bg-white/5'}
    `}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </NavLink>
);

const MobileNavItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => (
  <NavLink
    to={to}
    className={({ isActive }) => `
      flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-all duration-200
      ${isActive ? 'text-[#00FF88]' : 'text-gray-500 hover:text-gray-300'}
    `}
  >
    {({ isActive }: { isActive: boolean }) => (
      <>
        <Icon size={22} className={isActive ? 'scale-110 transition-transform' : ''} />
        <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
      </>
    )}
  </NavLink>
);

export const Layout: React.FC<LayoutProps> = ({ children, isWalletMode }) => {
  const { address, profile, network, switchNetwork } = useWallet();
  if (!isWalletMode) return <>{children}</>;

  const shortenAddress = (addr: string | null) => {
    if (!addr) return '...';
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  return (
    <div className="flex min-h-screen bg-[#050505] text-white page-enter">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-[#1a1a1a] p-6 gap-8 fixed h-full bg-[#050505] z-40">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-[#00FF88] rounded-xl flex items-center justify-center">
            <Zap className="text-black fill-current" size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight">RhizaCore</span>
        </div>

        <nav className="flex flex-col gap-2">
          <SidebarItem to="/wallet/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <SidebarItem to="/wallet/assets" icon={Wallet} label="Assets" />
          <SidebarItem to="/wallet/history" icon={History} label="History" />
          <SidebarItem to="/wallet/referral" icon={Users} label="Referral" />
        </nav>

        <div className="mt-auto flex flex-col gap-2">
          <SidebarItem to="/wallet/settings" icon={Settings} label="Settings" />
          <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
            <div className="flex items-center gap-2 text-xs text-[#00FF88] mb-1">
              <ShieldCheck size={14} />
              <span>SECURED</span>
            </div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">RhizaCore Shield Active</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 relative pb-24 lg:pb-0 min-h-screen">
        <header className="h-16 border-b border-[#1a1a1a] flex items-center justify-between px-6 sticky top-0 bg-[#050505]/80 backdrop-blur-md z-30">
          <div className="flex items-center gap-3 lg:hidden">
            <Zap className="text-[#00FF88]" size={24} />
            <span className="font-bold tracking-tight">RhizaCore</span>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => switchNetwork(network === 'mainnet' ? 'testnet' : 'mainnet')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                network === 'mainnet' 
                  ? 'bg-[#00FF88]/5 border-[#00FF88]/20 text-[#00FF88]' 
                  : 'bg-amber-500/5 border-amber-500/20 text-amber-500'
              }`}
            >
              <div className={`w-2 h-2 rounded-full animate-pulse ${network === 'mainnet' ? 'bg-[#00FF88]' : 'bg-amber-500'}`} />
              <span className="text-[10px] font-black uppercase tracking-widest">
                TON {network}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-4">
             <div className="hidden sm:flex items-center gap-2 font-mono text-xs bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 text-gray-300">
               {shortenAddress(address)}
             </div>
             <div className="flex items-center gap-3">
               <span className="text-xs font-bold hidden md:block">{profile.name}</span>
               <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#00FF88] to-[#00CCFF] flex items-center justify-center border border-white/10 text-lg">
                 {profile.avatar}
               </div>
             </div>
          </div>
        </header>

        <div className={`p-4 lg:p-8 max-w-7xl mx-auto transition-all ${network === 'testnet' ? 'ring-1 ring-amber-500/10 bg-amber-500/[0.01]' : ''}`}>
          {children}
        </div>

        {/* Mobile Nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-[#0a0a0a]/90 backdrop-blur-xl border-t border-[#1a1a1a] flex items-center justify-around px-2 z-50">
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
