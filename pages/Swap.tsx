import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowDownUp,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Settings2,
  Info,
  ExternalLink,
  Search,
  X,
  Zap,
  Clock,
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import {
  stonfiSwapService,
  SwapAsset,
  SwapQuote,
  TON_ASSET_ADDRESS,
} from '../services/stonfiSwapService';

// ─── Slippage options ─────────────────────────────────────────────────────────
const SLIPPAGE_OPTIONS = ['0.005', '0.01', '0.02', '0.05'];
const SLIPPAGE_LABELS: Record<string, string> = {
  '0.005': '0.5%',
  '0.01': '1%',
  '0.02': '2%',
  '0.05': '5%',
};

// ─── Token icon ───────────────────────────────────────────────────────────────
const TokenIcon: React.FC<{ asset: SwapAsset; size?: number }> = ({ asset, size = 36 }) => (
  <div
    className="rounded-full overflow-hidden bg-slate-100 dark:bg-white/10 flex items-center justify-center flex-shrink-0"
    style={{ width: size, height: size }}
  >
    {asset.image ? (
      <img
        src={asset.image}
        alt={asset.symbol}
        className="w-full h-full object-cover"
        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    ) : (
      <span className="text-xs font-black text-slate-500 dark:text-gray-400">
        {asset.symbol.slice(0, 2)}
      </span>
    )}
  </div>
);

// ─── Asset picker modal ───────────────────────────────────────────────────────
interface AssetPickerProps {
  assets: SwapAsset[];
  selected: SwapAsset | null;
  onSelect: (asset: SwapAsset) => void;
  onClose: () => void;
  exclude?: string;
}

const AssetPicker: React.FC<AssetPickerProps> = ({ assets, selected, onSelect, onClose, exclude }) => {
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtered = assets.filter(a => {
    if (a.address === exclude) return false;
    const q = search.toLowerCase();
    return (
      a.symbol.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.address.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-sm bg-white dark:bg-[#0a0a0a] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 dark:border-white/5">
          <h3 className="text-sm font-heading font-black text-slate-900 dark:text-white uppercase tracking-widest">Select Token</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/20 transition-colors">
            <X size={14} className="text-slate-600 dark:text-gray-400" />
          </button>
        </div>
        {/* Search */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
            <Search size={14} className="text-slate-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search by name or address..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-xs font-body text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 outline-none"
            />
            {search && <button onClick={() => setSearch('')}><X size={12} className="text-slate-400" /></button>}
          </div>
        </div>
        {/* List */}
        <div className="overflow-y-auto flex-1 px-2 pb-4">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-xs font-body text-slate-400 dark:text-gray-500">No tokens found</div>
          ) : filtered.map(asset => (
            <button
              key={asset.address}
              onClick={() => { onSelect(asset); onClose(); }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all hover:bg-slate-50 dark:hover:bg-white/5 ${selected?.address === asset.address ? 'bg-primary/5 border border-primary/20' : ''}`}
            >
              <TokenIcon asset={asset} size={36} />
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-heading font-black text-slate-900 dark:text-white uppercase tracking-widest">{asset.symbol}</p>
                <p className="text-[10px] font-body text-slate-400 dark:text-gray-500 truncate">{asset.name}</p>
              </div>
              {asset.balance && (
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-numbers font-bold text-slate-700 dark:text-gray-300 tabular-nums">{parseFloat(asset.balance).toFixed(4)}</p>
                  {asset.rateUsd && (
                    <p className="text-[10px] font-body text-slate-400 dark:text-gray-500">${(parseFloat(asset.balance) * asset.rateUsd).toFixed(2)}</p>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Main Swap component ──────────────────────────────────────────────────────
const Swap: React.FC = () => {
  const { address, isLoggedIn, network, balance, multiChainBalances, refreshData } = useWallet();

  // Resolve the best available live TON balance.
  // Prefer multiChainBalances.ton (WDK W5R1) when non-zero, otherwise primary V4 balance.
  const liveTonBalance = (() => {
    const wdkTon = parseFloat(multiChainBalances?.ton || '0');
    return wdkTon > 0 ? (multiChainBalances?.ton ?? balance ?? '0') : (balance || '0');
  })();

  // Determine which wallet service is active (primary V4 vs secondary WDK)
  const activeWalletType = localStorage.getItem('rhiza_active_wallet_type') || 'primary';

  const [assets, setAssets] = useState<SwapAsset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [fromAsset, setFromAsset] = useState<SwapAsset | null>(null);
  const [toAsset, setToAsset] = useState<SwapAsset | null>(null);
  const [fromAmount, setFromAmount] = useState('');
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [swapStatus, setSwapStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [swapError, setSwapError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [slippage, setSlippage] = useState('0.01');
  const quoteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load assets when address or network changes (full API fetch)
  useEffect(() => {
    stonfiSwapService.setNetwork(network);
    setAssetsLoading(true);
    stonfiSwapService.getAssets(address || undefined, liveTonBalance).then(list => {
      setAssets(list);
      
      // Improved USDT selection: Prioritize official Tether USDT on TON
      const OFFICIAL_USDT = 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs';
      const ton = list.find(a => a.address === TON_ASSET_ADDRESS);
      const usdt = list.find(a => a.address === OFFICIAL_USDT) || list.find(a => a.symbol === 'USDT');
      
      if (ton && !fromAsset) setFromAsset(ton);
      if (usdt && !toAsset) setToAsset(usdt);
      setAssetsLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, network]);

  // Patch TON balance in the asset list whenever liveTonBalance changes —
  // avoids a full API re-fetch just to update the balance label.
  useEffect(() => {
    if (!liveTonBalance) return;
    setAssets(prev => prev.map(a =>
      a.address === TON_ASSET_ADDRESS
        ? { ...a, balance: parseFloat(liveTonBalance).toFixed(4) }
        : a
    ));
    // Also update fromAsset/toAsset if they are TON so the picker shows fresh balance
    setFromAsset(prev =>
      prev?.address === TON_ASSET_ADDRESS
        ? { ...prev, balance: parseFloat(liveTonBalance).toFixed(4) }
        : prev
    );
    setToAsset(prev =>
      prev?.address === TON_ASSET_ADDRESS
        ? { ...prev, balance: parseFloat(liveTonBalance).toFixed(4) }
        : prev
    );
  }, [liveTonBalance]);

  // Auto-quote (debounced 600ms)
  const [quoteProgress, setQuoteProgress] = useState(100);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchQuote = async (showLoading = true) => {
    if (!fromAsset || !toAsset || !fromAmount || !address) return;
    const amount = parseFloat(fromAmount);
    if (!isFinite(amount) || amount <= 0) return;

    if (showLoading) setQuoteLoading(true);
    setQuoteError(null);
    try {
      const result = await stonfiSwapService.getSwapQuote(fromAsset, toAsset, fromAmount, address, slippage);
      if (result) {
        setQuote(result);
        setQuoteProgress(100);
        // Start expiration countdown (30s)
        if (progressTimerRef.current) clearInterval(progressTimerRef.current);
        progressTimerRef.current = setInterval(() => {
          setQuoteProgress(prev => {
            if (prev <= 0) {
              fetchQuote(false); // Silent auto-refresh
              return 100;
            }
            return prev - (100 / 30); // 30 seconds
          });
        }, 1000);
      } else {
        setQuoteError('No liquidity for this pair. Try a different amount or token.');
      }
    } catch (err: any) {
      setQuoteError(err?.message || 'Failed to get quote.');
    } finally {
      if (showLoading) setQuoteLoading(false);
    }
  };

  useEffect(() => {
    if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    setQuote(null);
    setQuoteError(null);
    setQuoteProgress(100);

    const amount = parseFloat(fromAmount);
    if (!fromAsset || !toAsset || !fromAmount || !isFinite(amount) || amount <= 0 || !address) return;

    quoteTimerRef.current = setTimeout(() => fetchQuote(true), 600);

    return () => {
      if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [fromAsset, toAsset, fromAmount, address, slippage]);

  const handleFlip = () => {
    const prevFrom = fromAsset;
    const prevTo = toAsset;
    setFromAsset(prevTo);
    setToAsset(prevFrom);
    setFromAmount(quote?.estimatedOutput || '');
    setQuote(null);
  };

  const handleMax = () => {
    if (!fromAsset) return;
    if (fromAsset.address === TON_ASSET_ADDRESS) {
      // liveTonBalance already picks the best available balance (WDK or primary)
      // Increased gas reserve to 0.15 TON for safer multi-jetton swaps
      const max = Math.max(0, parseFloat(liveTonBalance) - 0.15); 
      setFromAmount(max > 0 ? max.toFixed(4) : '');
    } else if (fromAsset.balance) {
      setFromAmount(fromAsset.balance);
    }
  };

  const handleSwap = async () => {
    if (!quote || !address || !fromAsset || !toAsset) return;
    setSwapStatus('sending');
    setSwapError(null);
    setTxHash(null);

    try {
      const { tetherWdkService } = await import('../services/tetherWdkService');
      const { tonWalletService } = await import('../services/tonWalletService');

      // Use the active wallet type to pick the right service — not just whether WDK
      // happens to be initialized (it may be initialized from a previous session).
      const useWdk = activeWalletType === 'secondary' && tetherWdkService.isTonReady();

      const msgs = quote.txParams;

      if (msgs.length === 0) throw new Error('No transaction messages in quote');

      let lastHash: string | undefined;

      if (msgs.length === 1) {
        // Single message — standard path
        const msg = msgs[0];
        const amountTon = (Number(msg.value) / 1e9).toFixed(9);
        const result = useWdk
          ? await tetherWdkService.sendTonTransactionRaw(msg.to, amountTon, msg.body)
          : await tonWalletService.sendTransactionWithBody(msg.to, amountTon, msg.body);
        if (!result.success) throw new Error(result.error || 'Transaction failed');
        lastHash = result.txHash;
      } else {
        // Multiple messages (e.g. Jetton→Jetton) — send as a single ATOMIC batch
        if (useWdk) {
          // WDK multi-send: use atomic sendMultiTransactionWithBodies
          const result = await tetherWdkService.sendMultiTransactionWithBodies(
            msgs.map(m => ({
              to: m.to,
              amount: (Number(m.value) / 1e9).toFixed(9),
              bocBody: m.body,
            }))
          );
          if (!result.success) throw new Error(result.error || 'Transaction failed');
          lastHash = result.txHash;
        } else {
          // Primary wallet: use sendMultiTransactionWithBodies for atomic multi-message send
          const result = await tonWalletService.sendMultiTransactionWithBodies(
            msgs.map(m => ({
              to: m.to,
              amount: (Number(m.value) / 1e9).toFixed(9),
              bocBody: m.body,
            }))
          );
          if (!result.success) throw new Error(result.error || 'Transaction failed');
          lastHash = result.txHash;
        }
      }

      setTxHash(lastHash || null);
      setSwapStatus('success');
      setFromAmount('');
      setQuote(null);
      // Refresh wallet balance in context so the UI reflects the new balance
      refreshData(true).catch(() => {});
    } catch (err: any) {
      setSwapError(err?.message || 'Swap failed. Please try again.');
      setSwapStatus('error');
    }
  };

  const resetSwap = () => {
    setSwapStatus('idle');
    setSwapError(null);
    setTxHash(null);
  };

  const fromUsd = fromAsset?.rateUsd && fromAmount ? (parseFloat(fromAmount) * fromAsset.rateUsd).toFixed(2) : null;
  const toUsd = toAsset?.rateUsd && quote?.estimatedOutput ? (parseFloat(quote.estimatedOutput) * toAsset.rateUsd).toFixed(2) : null;
  const priceImpactNum = quote ? parseFloat(quote.priceImpact) : 0;
  const priceImpactColor = priceImpactNum > 5 ? 'text-red-500' : priceImpactNum > 2 ? 'text-amber-500' : 'text-emerald-500';
  const parsedFromAmount = parseFloat(fromAmount);

  // Balance sufficiency check
  const hasSufficientBalance = (() => {
    if (!fromAsset || !isFinite(parsedFromAmount) || parsedFromAmount <= 0) return true; // don't block before amount is entered
    if (fromAsset.address === TON_ASSET_ADDRESS) {
      // liveTonBalance already picks the best available balance (WDK or primary)
      return parseFloat(liveTonBalance) >= parsedFromAmount + 0.15; // 0.15 TON gas reserve for safety
    }
    return fromAsset.balance ? parseFloat(fromAsset.balance) >= parsedFromAmount : true;
  })();

  const isSending = swapStatus === 'sending';
  const canSwap = isLoggedIn && !!quote && !!fromAmount && isFinite(parsedFromAmount) && parsedFromAmount > 0 && swapStatus === 'idle' && hasSufficientBalance;

  // For the "Max" label: use liveTonBalance for TON, asset.balance for jettons
  const fromDisplayBalance = fromAsset?.address === TON_ASSET_ADDRESS
    ? parseFloat(liveTonBalance).toFixed(4)
    : fromAsset?.balance;

  // Swap button label
  const swapButtonLabel = (() => {
    if (isSending) return null; // handled separately with spinner
    if (!isLoggedIn) return 'Connect Wallet';
    if (!fromAsset || !toAsset) return 'Select Tokens';
    if (!fromAmount || parsedFromAmount <= 0) return 'Enter Amount';
    if (!hasSufficientBalance) return `Insufficient ${fromAsset.symbol}`;
    if (quoteLoading) return null; // handled separately with spinner
    if (!quote) return 'No Route Found';
    return `Swap ${fromAsset.symbol} → ${toAsset.symbol}`;
  })();

  return (
    <div className="max-w-lg mx-auto space-y-4 px-3 sm:px-4 md:px-0 pb-24 sm:pb-8">

      {/* ── RhizaSwap Launch Announcement ──────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-black via-emerald-950/80 to-black border border-emerald-500/20 shadow-lg animate-in slide-in-from-top duration-500">
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-400/5 rounded-full blur-2xl" />
        
        {/* Accent line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500/80 to-transparent" />
        
        <div className="relative p-4 sm:p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3 pb-3 border-b border-white/5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center border border-emerald-500/30">
              <Zap size={20} className="text-emerald-400" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-red-500/10 text-red-400 rounded-md border border-red-500/20 text-[9px] font-black uppercase tracking-wider">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                  </span>
                  Breaking
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20 text-[9px] font-bold uppercase tracking-wider">
                  <Clock size={10} /> Q1 2025
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                RhizaSwap <span className="text-emerald-400">Launch</span>
              </h2>
            </div>
          </div>

          <style dangerouslySetInnerHTML={{
            __html: `
              @keyframes gradient {
                0%, 100% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
              }
              .animate-gradient {
                background-size: 200% 200%;
                animation: gradient 3s ease infinite;
              }
            `
          }} />

          {/* Vision Statement */}
          <div className="space-y-2">
            <p className="text-sm font-body text-gray-300 leading-snug">
              RhizaCore is pioneering a completely new standard in Web3 commerce by merging <span className="font-bold text-emerald-300">instant on-chain spot trading</span> with a <span className="font-bold text-emerald-300">secure P2P escrow system</span> into one unified, sovereign ecosystem.
            </p>
          </div>

          {/* Strategic Entry - Highlighted */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 space-y-1">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Strategic Early Entry
                </h3>
                <p className="text-xs text-emerald-200/80">
                  Secure your RZC at foundational floor price.
                </p>
              </div>
              <div className="flex-shrink-0 bg-black/40 px-4 py-2 rounded-lg border border-emerald-500/30 text-center">
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-0.5">Floor Price</p>
                <p className="text-xl font-black text-white">$0.12</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-white/5">
              {[
                { buy: '$10', target: '$15' },
                { buy: '$100', target: '$150' },
                { buy: '$1k', target: '$1.5k' },
                { buy: '$10k', target: '$15k' },
              ].map((item, i) => (
                <div key={i} className="px-2.5 py-1.5 rounded-lg bg-black/20 border border-white/5 flex justify-between items-center">
                  <span className="text-[10px] text-gray-400">Buy {item.buy}</span>
                  <span className="text-[10px] font-bold text-emerald-400">→ {item.target}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Roadmap */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">🔥</span>
                <h3 className="text-[11px] font-black text-white uppercase tracking-wider">Tier-1 Listings</h3>
              </div>
              <p className="text-xs text-gray-400 leading-snug">
                Building on-chain volume for Bitget and Binance listings.
              </p>
            </div>

            {/* Referral Program */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">🤝</span>
                <h3 className="text-[11px] font-black text-white uppercase tracking-wider">10% Commission</h3>
              </div>
              <p className="text-xs text-gray-400 leading-snug">
                Earn a 10% direct commission when downlines purchase RZC.
              </p>
            </div>
          </div>

          {/* How to Get Started */}
          <div className="space-y-2 pt-2">
            <h3 className="text-[11px] font-black text-emerald-400 uppercase tracking-widest px-1">How to Get Started</h3>
            <div className="flex flex-col gap-1.5">
              {[
                { step: '1', title: 'Fund Account', desc: '$10-$18 (USDT/TON) on TON network.' },
                { step: '2', title: 'Buy RZC', desc: 'Navigate to "Buy RZC" to lock $0.12 price.' },
                { step: '3', title: 'Expand', desc: 'Share your referral link to earn.' },
              ].map((item) => (
                <div key={item.step} className="flex items-center gap-3 p-2.5 rounded-lg bg-black/20 border border-white/5">
                  <div className="w-6 h-6 rounded-md bg-emerald-500/20 flex items-center justify-center flex-shrink-0 text-[10px] font-black text-emerald-400">
                    {item.step}
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-bold text-white leading-none mb-0.5">{item.title}</p>
                    <p className="text-[10px] text-gray-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Swap component temporarily hidden - Coming Soon ───────────────────── */}
      {/* All swap functionality will be re-enabled when RhizaSwap officially launches */}

      {/* ── Asset pickers ──────────────────────────────────────────────────── */}
      {showFromPicker && (
        <AssetPicker
          assets={assets}
          selected={fromAsset}
          onSelect={setFromAsset}
          onClose={() => setShowFromPicker(false)}
          exclude={toAsset?.address}
        />
      )}
      {showToPicker && (
        <AssetPicker
          assets={assets}
          selected={toAsset}
          onSelect={setToAsset}
          onClose={() => setShowToPicker(false)}
          exclude={fromAsset?.address}
        />
      )}
    </div>
  );
};

export default Swap;
