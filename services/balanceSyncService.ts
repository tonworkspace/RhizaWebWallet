/**
 * Balance Sync Service
 * Fetches balances on-chain for TON (primary + WDK W5) and all WDK chains,
 * persists them to Supabase wallet_users, and returns cached values so the
 * UI never has to wait for a network call on every render.
 *
 * Strategy per chain:
 *  1. Check 8s in-memory cache → return instantly if fresh
 *  2. Fetch from chain API (fast path)
 *  3. Write result to DB (non-blocking, background)
 *  4. On API failure → read last known value from DB
 *  5. On DB failure → return stale cache or '0'
 */

import { supabaseService } from './supabaseService';
import { getNetworkConfig } from '../constants';
import { getTargetEvmChain, type EvmChain } from './tetherWdkService';
import { NetworkFailover, EVM_RPC_FAILOVER, SOLANA_RPC_FAILOVER } from './networkFailover';
import { tonWalletService } from './tonWalletService';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BalanceSyncResult {
  balance: string;
  source: 'onchain' | 'db' | 'cache';
  syncedAt: number;
}

export interface MultiChainBalances {
  ton: string;
  evm: string;
  eth: string;
  bnb: string;
  btc: string;
  sol: string;
  tron: string;
  usdt: string;
  usdtTotal: string;
  tronUsdt: string;
  ethUsdt: string;
  bscUsdt: string;
}

// DB column names for each chain
const DB_COLUMNS: Record<keyof Omit<MultiChainBalances, 'usdtTotal' | 'tronUsdt' | 'ethUsdt' | 'bscUsdt'>, string> = {
  ton:  'ton_balance',
  evm:  'evm_balance',
  eth:  'eth_balance',
  bnb:  'bnb_balance',
  btc:  'btc_balance',
  sol:  'sol_balance',
  tron: 'tron_balance',
  usdt: 'usdt_balance',
};

// Removed EVM_RPC_URLS in favor of EVM_RPC_FAILOVER from networkFailover

// ── Module-level cache ────────────────────────────────────────────────────────
// Key: `${chain}:${address}` — shared across all instances/renders
const _cache = new Map<string, { balance: string; ts: number }>();
const CACHE_TTL = 5_000; // 5 seconds — tightened so deposits reflect faster

// ── Service ───────────────────────────────────────────────────────────────────

class BalanceSyncService {
  private _inProgress = new Set<string>();

  // ── TON (primary V4 wallet) ─────────────────────────────────────────────────

  async syncBalance(
    walletAddress: string,
    network: 'mainnet' | 'testnet',
    userId?: string | null,
    forceRefresh?: boolean
  ): Promise<BalanceSyncResult> {
    const cacheKey = `ton:${network}:${walletAddress}`;
    if (!forceRefresh) {
      const cached = _cache.get(cacheKey);
      if (cached && (Date.now() - cached.ts < CACHE_TTL)) {
        return { balance: cached.balance, source: 'cache', syncedAt: cached.ts };
      }
    }

    if (this._inProgress.has(cacheKey)) {
      const cached = _cache.get(cacheKey);
      return { balance: cached?.balance || '0.0000', source: 'cache', syncedAt: cached?.ts || 0 };
    }
    this._inProgress.add(cacheKey);

    try {
      let balance = '0.0000';
      if (tonWalletService.isInitialized()) {
        const bal = await tonWalletService.getBalance();
        if (bal.success && bal.balance) {
          balance = bal.balance;
        } else {
          throw new Error(bal.error || 'Failed to fetch TON wallet balance');
        }
      }

      _cache.set(cacheKey, { balance, ts: Date.now() });

      if (userId) {
        this._persistChain(walletAddress, userId, 'ton', balance).catch(() => {});
      }

      return { balance, source: 'onchain', syncedAt: Date.now() };
    } catch (e) {
      console.warn('⚠️ TON balance sync failed, falling back to cache/db:', e);
      const cached = _cache.get(cacheKey);
      return { balance: cached?.balance || '0.0000', source: 'cache', syncedAt: cached?.ts || 0 };
    } finally {
      this._inProgress.delete(cacheKey);
    }
  }

  // ── WDK multi-chain balances ────────────────────────────────────────────────
  // Call once per refresh — fetches all chains in parallel, persists all to DB.

  async syncMultiChainBalances(
    addresses: {
      ton?: string;
      evm?: string;
      btc?: string;
      sol?: string;
      tron?: string;
    },
    network: 'mainnet' | 'testnet',
    userId?: string | null,
    usdtRaw: string = '0.00',
    evmChain: EvmChain = 'polygon',
    forceRefresh = false   // bypass in-memory cache (use on explicit user refresh)
  ): Promise<MultiChainBalances> {
    // Bust cache for all provided addresses so stale values don't block fresh fetches
    if (forceRefresh) {
      for (const addr of Object.values(addresses)) {
        if (addr) this.refreshForAddress(addr);
      }
    }

    // ── USDT MULTI-CHAIN INTEGRATION ──
    // Derive EVM address from active mnemonic in memory if WDK address is not set
    let derivedEvm = addresses.evm;
    if (!derivedEvm && addresses.ton) {
      try {
        const { usdtMultiChainService } = await import('./usdtMultiChainService');
        const evmAddr = await usdtMultiChainService.deriveEvmAddress(addresses.ton);
        if (evmAddr) derivedEvm = evmAddr;
      } catch (e) {
        console.warn('⚠️ EVM address derivation skipped or failed:', e);
      }
    }

    const results = await Promise.allSettled([
      addresses.ton  ? this._sync(`wdk-ton:${network}:${addresses.ton}`,   () => this._fetchTon(addresses.ton!, network),  (v) => this._persistChain(addresses.ton!, userId, 'ton', v))  : Promise.resolve({ balance: '0.0000', source: 'cache' as const, syncedAt: 0 }),
      (addresses.evm || derivedEvm)  ? this._sync(`evm:${evmChain}:${addresses.evm || derivedEvm}`,      () => this._fetchEvm(addresses.evm || derivedEvm!, evmChain, network),           (v) => this._persistChain(addresses.evm || derivedEvm!, userId, 'evm', v))  : Promise.resolve({ balance: '0.000000', source: 'cache' as const, syncedAt: 0 }),
      (addresses.evm || derivedEvm)  ? this._sync(`evm:ethereum:${addresses.evm || derivedEvm}`,      () => this._fetchEvm(addresses.evm || derivedEvm!, 'ethereum', network),           (v) => this._persistChain(addresses.evm || derivedEvm!, userId, 'eth', v))  : Promise.resolve({ balance: '0.000000', source: 'cache' as const, syncedAt: 0 }),
      (addresses.evm || derivedEvm)  ? this._sync(`evm:bsc:${addresses.evm || derivedEvm}`,      () => this._fetchEvm(addresses.evm || derivedEvm!, 'bsc', network),           (v) => this._persistChain(addresses.evm || derivedEvm!, userId, 'bnb', v))  : Promise.resolve({ balance: '0.000000', source: 'cache' as const, syncedAt: 0 }),
      addresses.btc  ? this._sync(`btc:${addresses.btc}`,                  () => this._fetchBtc(addresses.btc!),           (v) => this._persistChain(addresses.btc!, userId, 'btc', v))  : Promise.resolve({ balance: '0.00000000', source: 'cache' as const, syncedAt: 0 }),
      addresses.sol  ? this._sync(`sol:${addresses.sol}`,                  () => this._fetchSol(addresses.sol!, network),           (v) => this._persistChain(addresses.sol!, userId, 'sol', v))  : Promise.resolve({ balance: '0.000000000', source: 'cache' as const, syncedAt: 0 }),
      addresses.tron ? this._sync(`tron:${addresses.tron}`,                () => this._fetchTron(addresses.tron!),         (v) => this._persistChain(addresses.tron!, userId, 'tron', v)) : Promise.resolve({ balance: '0.000000', source: 'cache' as const, syncedAt: 0 }),
    ]);

    const [tonR, evmR, ethR, bnbR, btcR, solR, tronR] = results.map(r =>
      r.status === 'fulfilled' ? r.value.balance : '0'
    );

    // Fetch multi-chain USDT balances across TON, BSC, and Ethereum
    let usdt = '0.00';
    let usdtTotal = '0.00';
    let tronUsdt = '0.00';
    let ethUsdt = '0.00';
    let bscUsdt = '0.00';
    if (addresses.ton) {
      try {
        const { usdtMultiChainService } = await import('./usdtMultiChainService');
        const usdtBalances = await usdtMultiChainService.getUSDTBalances(
          addresses.ton,
          derivedEvm || null,
          addresses.tron || null,
          network
        );
        usdt = usdtBalances.ton; // TON Jetton is the primary USDT balance
        usdtTotal = usdtBalances.total;
        tronUsdt = usdtBalances.tron;
        ethUsdt = usdtBalances.ethereum;
        bscUsdt = usdtBalances.bsc;
        console.log(`💰 USDT balance synced — TON Jetton (main): ${usdt}, BSC: ${bscUsdt}, ETH: ${ethUsdt}, TRON: ${tronUsdt}, Total: ${usdtTotal}`);
      } catch (e) {
        console.error('❌ Multi-chain USDT balance sync failed:', e);
      }
    }

    // Persist TON Jetton USDT balance against TON address (non-blocking)
    if (usdt !== '0.00' && addresses.ton) {
      this._persistChain(addresses.ton, userId, 'usdt', usdt).catch(() => {});
    }

    return { ton: tonR, evm: evmR, eth: ethR, bnb: bnbR, btc: btcR, sol: solR, tron: tronR, usdt, usdtTotal, tronUsdt, ethUsdt, bscUsdt };
  }

  // ── Read cached/DB balances for instant display on page load ────────────────

  async readCachedMultiChain(
    addresses: { ton?: string; evm?: string; btc?: string; sol?: string; tron?: string },
    network: 'mainnet' | 'testnet',
    evmChain: EvmChain = 'polygon'
  ): Promise<MultiChainBalances> {
    const get = (key: string, fallback: string) => {
      const c = _cache.get(key);
      return c ? c.balance : fallback;
    };
    return {
      ton:  get(`wdk-ton:${network}:${addresses.ton ?? ''}`,  '0.0000'),
      evm:  get(`evm:${evmChain}:${addresses.evm ?? ''}`,     '0.000000'),
      eth:  get(`evm:ethereum:${addresses.evm ?? ''}`,        '0.000000'),
      bnb:  get(`evm:bsc:${addresses.evm ?? ''}`,             '0.000000'),
      btc:  get(`btc:${addresses.btc ?? ''}`,                 '0.00000000'),
      sol:  get(`sol:${addresses.sol ?? ''}`,                 '0.000000000'),
      tron: get(`tron:${addresses.tron ?? ''}`,               '0.000000'),
      usdt: '0.00',
      usdtTotal: '0.00',
      tronUsdt: '0.00',
      ethUsdt: '0.00',
      bscUsdt: '0.00',
    };
  }

  // ── Invalidate ──────────────────────────────────────────────────────────────

  invalidate(walletAddress: string, network: 'mainnet' | 'testnet') {
    // Invalidate all cache keys that contain this address
    for (const key of _cache.keys()) {
      if (key.includes(walletAddress)) _cache.delete(key);
    }
  }

  /**
   * Force-bust every cache entry for a given address across ALL chains.
   * Call this after any incoming deposit is detected so the next UI refresh
   * fetches fresh on-chain data instead of returning stale cached values.
   * 
   * FIXED: Now uses exact address matching instead of partial string matching
   * to prevent invalidating wrong cache entries.
   */
  refreshForAddress(walletAddress: string) {
    const normalized = walletAddress.toLowerCase().trim();
    const deletedKeys: string[] = [];
    
    for (const key of _cache.keys()) {
      // Cache key format: "chain:network:address" or "chain:address"
      // Extract address (always the last segment after the last colon)
      const parts = key.split(':');
      if (parts.length < 2) continue;
      
      const keyAddress = parts[parts.length - 1].toLowerCase().trim();
      
      // Exact match only - prevents invalidating unrelated addresses
      if (keyAddress === normalized) {
        _cache.delete(key);
        deletedKeys.push(key);
      }
    }
    
    console.log(`[BalanceSync] Busted ${deletedKeys.length} cache entries for ${normalized.slice(0, 8)}…`);
    
    // Emit event so UI can react to cache invalidation
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('balance-cache-invalidated', { 
        detail: { address: walletAddress, keys: deletedKeys, timestamp: Date.now() }
      }));
    }
  }

  // ── Private: generic sync wrapper ──────────────────────────────────────────

  private async _sync(
    cacheKey: string,
    fetchFn: () => Promise<string>,
    persistFn: (val: string) => Promise<void>
  ): Promise<BalanceSyncResult> {
    const cached = _cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return { balance: cached.balance, source: 'cache', syncedAt: cached.ts };
    }

    if (this._inProgress.has(cacheKey)) {
      await new Promise(r => setTimeout(r, 300));
      const c = _cache.get(cacheKey);
      if (c) return { balance: c.balance, source: 'cache', syncedAt: c.ts };
    }

    this._inProgress.add(cacheKey);
    try {
      const balance = await fetchFn();
      const now = Date.now();
      _cache.set(cacheKey, { balance, ts: now });
      persistFn(balance).catch(() => {}); // fire and forget
      return { balance, source: 'onchain', syncedAt: now };
    } catch (err) {
      console.warn(`[BalanceSync] ${cacheKey} fetch failed, trying DB:`, err);
      try {
        const dbVal = await this._readChainFromDb(cacheKey);
        if (dbVal) {
          _cache.set(cacheKey, { balance: dbVal, ts: Date.now() });
          return { balance: dbVal, source: 'db', syncedAt: Date.now() };
        }
      } catch { /* ignore */ }
      const stale = _cache.get(cacheKey);
      return { balance: stale?.balance ?? '0', source: 'cache', syncedAt: stale?.ts ?? Date.now() };
    } finally {
      this._inProgress.delete(cacheKey);
    }
  }

  // ── Private: chain-specific fetchers ───────────────────────────────────────

  private async _fetchTon(address: string, network: 'mainnet' | 'testnet'): Promise<string> {
    const config = getNetworkConfig(network);
    const v3Base = network === 'mainnet'
      ? 'https://toncenter.com/api/v3'
      : 'https://testnet.toncenter.com/api/v3';
    const res = await fetch(`${v3Base}/account?address=${address}`, {
      headers: config.API_KEY ? { 'X-API-Key': config.API_KEY } : {}
    });
    if (!res.ok) throw new Error(`TonCenter V3 HTTP ${res.status}`);
    const data = await res.json();
    return data?.balance ? (Number(data.balance) / 1e9).toFixed(4) : '0.0000';
  }

  private async _fetchEvm(address: string, chain: EvmChain, network: 'mainnet' | 'testnet'): Promise<string> {
    const validChain = getTargetEvmChain(chain, network);
    const failover = EVM_RPC_FAILOVER as Record<string, string[]>;
    const rpcUrls = failover[validChain] || failover['ethereum'];
    const rpcUrl = await NetworkFailover.getWorkingRpc(rpcUrls);

    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBalance', params: [address, 'latest'] })
    });
    if (!res.ok) throw new Error(`EVM RPC HTTP ${res.status}`);
    const data = await res.json();
    const wei = BigInt(data.result ?? '0x0');
    return (Number(wei) / 1e18).toFixed(6);
  }

  private async _fetchBtc(address: string): Promise<string> {
    try {
      // Primary: Blockstream.info REST API
      const res = await fetch(`https://blockstream.info/api/address/${address}`);
      if (!res.ok) throw new Error(`Blockstream HTTP ${res.status}`);
      const data = await res.json();
      const sats = (data.chain_stats?.funded_txo_sum ?? 0) - (data.chain_stats?.spent_txo_sum ?? 0);
      return (sats / 1e8).toFixed(8);
    } catch (err) {
      console.warn(`[BalanceSync] Blockstream BTC fetch failed, falling back to Mempool.space:`, err);
      // Fallback: Mempool.space REST API
      const res = await fetch(`https://mempool.space/api/address/${address}`);
      if (!res.ok) throw new Error(`Mempool HTTP ${res.status}`);
      const data = await res.json();
      const sats = (data.chain_stats?.funded_txo_sum ?? 0) - (data.chain_stats?.spent_txo_sum ?? 0);
      return (sats / 1e8).toFixed(8);
    }
  }

  private async _fetchSol(address: string, network: 'mainnet' | 'testnet'): Promise<string> {
    const rpcUrls = network === 'mainnet' ? SOLANA_RPC_FAILOVER.mainnet : SOLANA_RPC_FAILOVER.devnet;
    const rpcUrl = await NetworkFailover.getWorkingRpc(rpcUrls);

    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [address] })
    });
    if (!res.ok) throw new Error(`Solana RPC HTTP ${res.status}`);
    const data = await res.json();
    return (Number(data.result?.value ?? 0) / 1e9).toFixed(9);
  }

  private async _fetchTron(address: string): Promise<string> {
    const res = await fetch(`https://api.trongrid.io/v1/accounts/${address}`);
    if (!res.ok) throw new Error(`TronGrid HTTP ${res.status}`);
    const data = await res.json();
    const sun = data.data?.[0]?.balance ?? 0;
    return (sun / 1_000_000).toFixed(6);
  }

  // ── Private: DB persistence ─────────────────────────────────────────────────

  private async _persistChain(
    walletAddress: string,
    userId: string | null | undefined,
    chain: keyof MultiChainBalances,
    balance: string
  ): Promise<void> {
    const client = supabaseService.getClient();
    if (!client) return;

    const col = DB_COLUMNS[chain];
    const update: Record<string, any> = {
      [col]: parseFloat(balance),
      last_balance_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (userId) {
      await client.from('wallet_users').update(update).eq('id', userId);
    } else {
      await client.from('wallet_users').update(update).eq('wallet_address', walletAddress);
    }
  }

  private async _readChainFromDb(cacheKey: string): Promise<string | null> {
    // cacheKey format: `chain:network:address` or `chain:address`
    // Extract address (always the last segment) and chain (always the first segment)
    try {
      const parts = cacheKey.split(':');
      if (parts.length < 2) return null;
      const chain = parts[0]; // 'ton', 'evm', 'btc', 'sol', 'tron', 'wdk-ton'
      const address = parts[parts.length - 1]; // last segment is always the address
      if (!address || address.length < 10) return null;

      const client = supabaseService.getClient();
      if (!client) return null;

      // Map cache chain prefix to the DB column name
      const chainKey = chain === 'wdk-ton' ? 'ton' : chain;
      const col = DB_COLUMNS[chainKey as keyof typeof DB_COLUMNS];
      if (!col) return null;

      const { data, error } = await client
        .from('wallet_users')
        .select(`${col}, wallet_address`)
        .or(`wallet_address.eq.${address},wallet_address.ilike.%${address.slice(-8)}`)
        .limit(1)
        .single();

      if (error || !data) return null;
      const val = (data as any)[col];
      if (val == null || val === 0) return null;

      // Return formatted string matching on-chain precision
      const formatted = chain === 'btc' ? Number(val).toFixed(8)
        : chain === 'sol' ? Number(val).toFixed(9)
        : chain === 'evm' ? Number(val).toFixed(6)
        : Number(val).toFixed(4); // ton / tron / wdk-ton

      console.log(`[BalanceSync] DB fallback for ${chain}: ${formatted}`);
      return formatted;
    } catch (e) {
      console.warn('[BalanceSync] _readChainFromDb error:', e);
      return null;
    }
  }
}

export const balanceSyncService = new BalanceSyncService();
