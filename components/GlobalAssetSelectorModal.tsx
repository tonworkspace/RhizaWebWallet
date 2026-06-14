import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAssetSelector } from '../context/AssetSelectorContext';
import { useWallet } from '../context/WalletContext';
import { WalletManager } from '../utils/walletManager';

/**
 * GlobalAssetSelectorModal
 *
 * Rendered at App.tsx level — above Layout, above everything.
 * Transfer.tsx opens it via useAssetSelector().openAssetSelector().
 * When the user picks an asset the onSelect callback fires and the modal closes.
 */
const GlobalAssetSelectorModal: React.FC = () => {
  const { isOpen, payload, closeAssetSelector } = useAssetSelector();
  const { balance, jettons, multiChainBalances, currentEvmChain, switchEvmChain, refreshData, userProfile } = useWallet();
  const navigate = useNavigate();

  const activeWallet = WalletManager.getActiveWallet();
  const allWallets = WalletManager.getWallets();
  const multiChainWallet = allWallets.find(w => w.type === 'secondary');
  const isMultiChainActive = !!multiChainWallet || activeWallet?.type === 'primary';
  const multiChainAddresses = multiChainWallet?.addresses || activeWallet?.addresses || null;

  // RZC balance — pulled from userProfile same way Transfer does
  const rzcBalance: number = (userProfile as any)?.rzc_balance ?? 0;
  const canSendRzc: boolean = (userProfile as any)?.can_send_rzc === true;

  if (!isOpen || !payload) return null;

  const { onSelect, activeWalletId, activeEvmChain } = payload;

  const handleSelect = (args: Parameters<typeof onSelect>[0]) => {
    onSelect(args);
    closeAssetSelector();
  };

  const multiChainAssets = [
    { id: 'multichain-ton' as const, name: 'Toncoin W5', sub: 'TON · Multi-Chain', symbol: 'TON', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ton/info/logo.png', bal: parseFloat(multiChainBalances?.ton || '0').toFixed(4) },
    { id: 'multichain-tron' as const, name: 'TRON', sub: 'TRX · Multi-Chain', symbol: 'TRX', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/tron/info/logo.png', bal: parseFloat(multiChainBalances?.tron || '0').toFixed(4) },
    { id: 'multichain-tron-usdt' as const, name: 'Tether USDT (TRON)', sub: 'USDT · TRC20', symbol: 'USDT', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/tron/assets/TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t/logo.png', bal: parseFloat(multiChainBalances?.tronUsdt || '0').toFixed(2) },
    { id: 'multichain-eth-usdt' as const, name: 'Tether USDT (Ethereum)', sub: 'USDT · ERC20', symbol: 'USDT', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png', bal: parseFloat(multiChainBalances?.ethUsdt || '0').toFixed(2) },
    { id: 'multichain-bsc-usdt' as const, name: 'Tether USDT (BSC)', sub: 'USDT · BEP20', symbol: 'USDT', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png', bal: parseFloat(multiChainBalances?.bscUsdt || '0').toFixed(2) },
    { id: 'multichain-eth' as const, evmChain: 'ethereum', name: 'Ethereum', sub: 'ETH · EVM', symbol: 'ETH', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png', bal: currentEvmChain === 'ethereum' ? parseFloat(multiChainBalances?.evm || '0').toFixed(4) : '—' },
    { id: 'multichain-bsc' as const, evmChain: 'bsc', name: 'BNB Smart Chain', sub: 'BNB · EVM', symbol: 'BNB', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/info/logo.png', bal: currentEvmChain === 'bsc' ? parseFloat(multiChainBalances?.evm || '0').toFixed(4) : '—' },
    { id: 'multichain-polygon' as const, evmChain: 'polygon', name: 'Polygon', sub: 'MATIC · EVM', symbol: 'MATIC', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png', bal: currentEvmChain === 'polygon' ? parseFloat(multiChainBalances?.evm || '0').toFixed(4) : '—' },
    { id: 'multichain-sol' as const, name: 'Solana', sub: 'SOL · Multi-Chain', symbol: 'SOL', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png', bal: parseFloat(multiChainBalances?.sol || '0').toFixed(4) },
    { id: 'multichain-btc' as const, name: 'Bitcoin', sub: 'BTC · Multi-Chain', symbol: 'BTC', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png', bal: parseFloat(multiChainBalances?.btc || '0').toFixed(6) },
  ];

  return (
    <>
      {/* Full-viewport backdrop */}
      <div
        className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm"
        onClick={closeAssetSelector}
        aria-hidden="true"
      />

      {/* Full-height sheet slides up from bottom */}
      <div
        className="fixed inset-x-0 bottom-0 z-[201] flex flex-col bg-[#0a0a0a] border-t border-white/10 rounded-t-[1.75rem] shadow-2xl"
        style={{ maxHeight: '92dvh' }}
        role="dialog"
        aria-modal="true"
        aria-label="Select asset to send"
      >
        {/* Drag handle + header */}
        <div className="flex flex-col items-center pt-3 pb-3 px-5 border-b border-white/5 shrink-0">
          <div className="w-9 h-1 bg-white/20 rounded-full mb-3" />
          <div className="flex items-center justify-between w-full">
            <div>
              <h2 className="text-base font-heading font-black text-white">Select Asset</h2>
              <p className="text-[10px] text-gray-500 mt-0.5">Choose which asset to send</p>
            </div>
            <button
              onClick={closeAssetSelector}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-gray-400 hover:text-white text-sm font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable list */}
        <div className="overflow-y-auto flex-1 overscroll-contain pb-safe-bottom pb-8">

          {/* ── Primary Wallet ── */}
          <div className="px-5 pt-5 pb-1.5">
            <p className="text-[9px] font-heading font-black uppercase tracking-[0.2em] text-gray-500">Primary Wallet</p>
          </div>

          {/* TON */}
          <button
            onClick={() => handleSelect({ walletId: 'primary' })}
            className={`w-full px-5 py-3.5 flex items-center gap-4 transition-all active:bg-white/10 ${activeWalletId === 'primary' ? 'bg-white/5' : 'hover:bg-white/5'}`}
          >
            <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 shrink-0">
              <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ton/info/logo.png" className="w-full h-full object-cover" alt="TON" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-white">Toncoin</p>
              <p className="text-[11px] text-gray-500 mt-0.5">TON · Native</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-mono text-white font-medium">{parseFloat(balance || '0').toFixed(4)}</p>
              <p className="text-[10px] text-gray-600">TON</p>
            </div>
          </button>

          {/* RZC */}
          {userProfile && (
            canSendRzc ? (
              <button
                onClick={() => handleSelect({ walletId: 'primary', isRzc: true })}
                className="w-full px-5 py-3.5 flex items-center gap-4 hover:bg-white/5 transition-all active:bg-white/10"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <span className="text-xl">⚡</span>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-white">RhizaCore Token</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">RZC · Community</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono text-white font-medium">{rzcBalance.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-600">RZC</p>
                </div>
              </button>
            ) : (
              <div className="w-full px-5 py-3.5 flex items-center gap-4 opacity-40 cursor-not-allowed">
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <span className="text-xl">⚡</span>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-white">RhizaCore Token</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Verification required</p>
                </div>
                <Lock size={14} className="text-amber-500 shrink-0" />
              </div>
            )
          )}

          {/* ── Multi-Chain Hub ── */}
          {isMultiChainActive && multiChainAddresses ? (
            <>
              <div className="px-5 pt-5 pb-1.5">
                <div className="flex items-center gap-3">
                  <p className="text-[9px] font-heading font-black uppercase tracking-[0.2em] text-violet-400 shrink-0">Multi-Chain Hub</p>
                  <div className="flex-1 h-px bg-violet-500/20" />
                </div>
              </div>

              {multiChainAssets.map(asset => {
                const isActive = activeWalletId === asset.id || (activeWalletId === 'multichain-evm' && activeEvmChain === asset.evmChain);
                return (
                  <button
                    key={asset.id + (asset.evmChain || '')}
                    onClick={async () => {
                      handleSelect({ walletId: asset.id as any, evmChain: asset.evmChain });
                    }}
                    className={`w-full px-5 py-3.5 flex items-center gap-4 transition-all active:bg-white/10 ${isActive ? 'bg-white/5' : 'hover:bg-white/5'}`}
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 shrink-0">
                      <img src={asset.logo} className="w-full h-full object-cover" alt={asset.symbol} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-white">{asset.name}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{asset.sub}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono text-white font-medium">{asset.bal}</p>
                      <p className="text-[10px] text-gray-600">{asset.symbol}</p>
                    </div>
                  </button>
                );
              })}
            </>
          ) : (
            <div className="px-5 pt-4 pb-2">
              <button
                onClick={() => { navigate('/wallet/multi-chain'); closeAssetSelector(); }}
                className="w-full p-4 rounded-2xl border border-dashed border-violet-500/20 bg-violet-500/5 flex items-center gap-4 hover:bg-violet-500/10 transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0 text-xl">🔗</div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-violet-400">Enable Multi-Chain Hub</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">BTC · ETH · MATIC · USDT · W5</p>
                </div>
              </button>
            </div>
          )}

          {/* ── Jetton Tokens ── */}
          {jettons && jettons.length > 0 && (
            <>
              <div className="px-5 pt-5 pb-1.5">
                <div className="flex items-center gap-3">
                  <p className="text-[9px] font-heading font-black uppercase tracking-[0.2em] text-emerald-500 shrink-0">Jetton Tokens</p>
                  <div className="flex-1 h-px bg-emerald-500/20" />
                </div>
              </div>

              {(jettons as any[]).map((jetton: any) => (
                <button
                  key={jetton.jetton.address}
                  onClick={() => handleSelect({
                    walletId: 'primary',
                    jetton: {
                      address: jetton.jetton.address,
                      name: jetton.jetton.name,
                      symbol: jetton.jetton.symbol,
                      decimals: jetton.jetton.decimals,
                      balance: jetton.balance,
                      walletAddress: jetton.wallet_address,
                      image: jetton.jetton.image,
                    }
                  })}
                  className="w-full px-5 py-3.5 flex items-center gap-4 hover:bg-white/5 transition-all active:bg-white/10"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 shrink-0 bg-white/5">
                    {jetton.jetton.image ? (
                      <img src={jetton.jetton.image} alt={jetton.jetton.symbol} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-black text-gray-400">{jetton.jetton.symbol.slice(0, 2)}</div>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-white">{jetton.jetton.name}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{jetton.jetton.symbol} · TON Jetton</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-white font-medium">{(Number(jetton.balance) / Math.pow(10, jetton.jetton.decimals || 9)).toFixed(2)}</p>
                    <p className="text-[10px] text-gray-600">{jetton.jetton.symbol}</p>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default GlobalAssetSelectorModal;
