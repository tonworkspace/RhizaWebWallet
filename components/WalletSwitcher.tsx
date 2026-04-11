/**
 * WalletSwitcher — portable trigger only.
 * The actual sheet + modals live in GlobalWalletManager (rendered in App.tsx).
 */
import React, { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { WalletManager, WalletMetadata } from '../utils/walletManager';
import { useWallet } from '../context/WalletContext';
import { useWalletManager } from '../context/WalletManagerContext';

const avatarColor = (addr: string) => {
  const colors = [
    'from-violet-500 to-purple-600', 'from-blue-500 to-cyan-600',
    'from-emerald-500 to-teal-600', 'from-orange-500 to-amber-600',
    'from-rose-500 to-pink-600',    'from-indigo-500 to-blue-600',
  ];
  return colors[addr.charCodeAt(2) % colors.length];
};

const short = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

const WalletSwitcher: React.FC = () => {
  const { address } = useWallet();
  const { openSheet } = useWalletManager();
  const [wallets, setWallets] = useState<WalletMetadata[]>([]);
  const [active, setActive] = useState<WalletMetadata | undefined>(undefined);

  useEffect(() => {
    const all = WalletManager.getWallets();
    setWallets(all);

    // Use WalletManager's own active wallet record first (format-agnostic)
    const stored = WalletManager.getActiveWallet();
    if (stored) {
      setActive(stored);
      return;
    }

    // Fallback: match by address with async TON normalization
    if (!address) return;
    const exact = all.find(w => w.address === address);
    if (exact) { setActive(exact); return; }

    // Async normalize via dynamic import (works with Vite ESM)
    import('@ton/ton').then(({ Address }) => {
      try {
        const raw = Address.parse(address).toRawString();
        const match = all.find(w => {
          try { return Address.parse(w.address).toRawString() === raw; } catch { return false; }
        });
        if (match) setActive(match);
      } catch { /* not a TON address */ }
    }).catch(() => {});
  }, [address]);

  return (
    <button
      onClick={openSheet}
      className="w-full flex items-center gap-3 p-1 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all active:scale-[0.98] group"
    >
      {/* Avatar */}
      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${active ? avatarColor(active.address) : 'from-gray-400 to-gray-500'} flex items-center justify-center text-white font-black text-sm flex-shrink-0 shadow-sm`}>
        {active?.name?.charAt(0).toUpperCase() ?? 'W'}
      </div>

      {/* Info */}
      <div className="flex-1 text-left min-w-0">
        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
          {active?.name ?? 'No wallet'}
        </p>
        <p className="text-[10px] font-mono text-gray-500 truncate">
          {active ? short(active.address) : '—'}
        </p>
      </div>

      {/* Count + chevron */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {wallets.length > 1 && (
          <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-full">
            {wallets.length} accounts
          </span>
        )}
        <ChevronRight size={16} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
      </div>
    </button>
  );
};

export { avatarColor, short };
export default WalletSwitcher;
