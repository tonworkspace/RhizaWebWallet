
import { TonClient, WalletContractV4, internal, Address, toNano } from "@ton/ton";
import { mnemonicToWalletKey, mnemonicNew } from "@ton/crypto";
import { encryptMnemonic, decryptMnemonic, needsMigration, migrateEncryption } from '../utils/encryption';
import { NetworkType, getNetworkConfig, getApiEndpoint, getApiKey } from '../constants';
import { secureSecretManager } from './secureSecretManager';
import { sanitizeComment } from '../utils/sanitization';

// ── SESSION TIMEOUT CONFIGURATION (Issue #10 FIX) ────────────────────────
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
const SESSION_WARNING_TIME = 5 * 60 * 1000; // Warn 5 minutes before expiry

const sessionManager = {
  saveSession: async (mnemonic: string[], password?: string) => {
    try {
      if (password) {
        // Encrypt with password (for extra security)
        const encrypted = await encryptMnemonic(mnemonic, password);
        localStorage.setItem('rhiza_session', encrypted);
        localStorage.setItem('rhiza_session_encrypted', 'true');
      } else {
        // Store encrypted with device-specific key (Trust Wallet style)
        // Use a combination of browser fingerprint as encryption key
        const deviceKey = await generateDeviceKey();
        const encrypted = await encryptMnemonic(mnemonic, deviceKey);
        localStorage.setItem('rhiza_session', encrypted);
        localStorage.setItem('rhiza_session_encrypted', 'device');
      }

      // Store session timestamp and last activity
      const now = Date.now().toString();
      localStorage.setItem('rhiza_session_created', now);
      localStorage.setItem('rhiza_session_last_activity', now);

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
  restoreSession: async (password: string) => {
    try {
      const encrypted = localStorage.getItem('rhiza_session');
      const encryptionType = localStorage.getItem('rhiza_session_encrypted');

      if (!encrypted) return null;

      // ── SECURITY FIX #10: Check session timeout ────────────────────────────
      const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
      const age = sessionManager.getSessionAge();
      
      if (age && age > SESSION_TIMEOUT) {
        console.log('⏰ Session expired after 30 minutes');
        sessionManager.clearSession();
        throw new Error('Session expired. Please log in again.');
      }

      if (encryptionType === 'true') {
        // Password-encrypted session
        if (!password) return null;
        
        // Check if migration needed
        const needsUpgrade = needsMigration(encrypted);
        
        // Decrypt (works with both old and new formats)
        const mnemonic = await decryptMnemonic(encrypted, password);
        
        // Auto-migrate if needed
        if (needsUpgrade) {
          console.log('🔄 Auto-migrating session to new encryption format...');
          const migrationResult = await migrateEncryption(encrypted, password);
          
          if (migrationResult.success && migrationResult.newEncryptedData) {
            localStorage.setItem('rhiza_session', migrationResult.newEncryptedData);
            console.log('✅ Session migrated successfully');
          }
        }
        
        return mnemonic;
      } else if (encryptionType === 'device') {
        // Device-encrypted session (auto-login)
        const deviceKey = await generateDeviceKey();
        
        // Check if migration needed
        const needsUpgrade = needsMigration(encrypted);
        
        // Decrypt
        const mnemonic = await decryptMnemonic(encrypted, deviceKey);
        
        // Auto-migrate if needed
        if (needsUpgrade) {
          console.log('🔄 Auto-migrating device session to new encryption format...');
          const migrationResult = await migrateEncryption(encrypted, deviceKey);
          
          if (migrationResult.success && migrationResult.newEncryptedData) {
            localStorage.setItem('rhiza_session', migrationResult.newEncryptedData);
            console.log('✅ Device session migrated successfully');
          }
        }
        
        return mnemonic;
      } else {
        // Legacy unencrypted session (for backward compatibility)
        return JSON.parse(encrypted);
      }
    } catch (error) {
      console.error('Session restore failed:', error);
      return null;
    }
  },
  clearSession: () => {
    localStorage.removeItem('rhiza_session');
    localStorage.removeItem('rhiza_session_encrypted');
    localStorage.removeItem('rhiza_session_created');
    localStorage.removeItem('rhiza_session_last_activity');
  },
  hasSession: () => {
    return !!localStorage.getItem('rhiza_session');
  },
  isEncrypted: () => {
    const type = localStorage.getItem('rhiza_session_encrypted');
    return type === 'true' || type === 'device';
  },
  getSessionAge: () => {
    const lastActivity = localStorage.getItem('rhiza_session_last_activity');
    if (!lastActivity) {
      // Fallback to created timestamp for old sessions
      const created = localStorage.getItem('rhiza_session_created');
      if (!created) return null;
      return Date.now() - parseInt(created);
    }
    return Date.now() - parseInt(lastActivity);
  },
  getTimeUntilExpiry: () => {
    const age = sessionManager.getSessionAge();
    if (!age) return null;
    const remaining = SESSION_TIMEOUT - age;
    return remaining > 0 ? remaining : 0;
  },
  isSessionExpiringSoon: () => {
    const remaining = sessionManager.getTimeUntilExpiry();
    if (!remaining) return false;
    return remaining <= SESSION_WARNING_TIME && remaining > 0;
  },
  updateActivity: () => {
    if (sessionManager.hasSession()) {
      localStorage.setItem('rhiza_session_last_activity', Date.now().toString());
    }
  }
};

// ── DEVICE KEY GENERATION (Issue #2 FIX - COMPLETE) ─────────────────────────
// Import the secure device fingerprinting utility
import { getDeviceKey } from '../utils/deviceFingerprint';

// Legacy function for backward compatibility - now uses the secure implementation
async function generateDeviceKey(): Promise<string> {
  return await getDeviceKey();
}

export class TonWalletService {
  private client: TonClient;
  private keyPair: any = null;
  private wallet: any = null;
  private contract: any = null;
  private currentNetwork: NetworkType = 'mainnet'; // Default to mainnet
  private currentWalletId: string | null = null; // Track current wallet for secure secret management

  /**
   * Phase 1: RPC Failover Helper
   * Safely fetches from multiple endpoints to guarantee uptime.
   */
  private async toncenterFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const { getNetworkConfig } = await import('../constants');
    const config = getNetworkConfig(this.currentNetwork);
    
    const headers: Record<string, string> = { ...options.headers as Record<string, string> };
    if (config.API_KEY) {
      headers['X-API-Key'] = config.API_KEY;
    }
    
    // Multi-RPC Failover
    const endpoints = this.currentNetwork === 'mainnet' 
      ? [
          'https://toncenter.com/api/v3',
          'https://ton.access.orbs.network/44A2c0ff5Bd3F8B62C092Ab4D238bEE463E644A2/1/mainnet/toncenter-api-v3'
        ]
      : [
          'https://testnet.toncenter.com/api/v3'
        ];

    let lastError: any = null;
    
    for (const base of endpoints) {
      try {
        const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : '/' + path}`;
        const res = await fetch(url, { ...options, headers });
        
        if (res.ok || res.status === 400 || res.status === 404) {
          return res;
        }
        lastError = new Error(`HTTP ${res.status} from ${base}`);
        console.warn(`[RPC Failover] ${base} failed with ${res.status}. Trying next...`);
      } catch (err) {
        lastError = err;
        console.warn(`[RPC Failover] ${base} failed. Trying next...`);
      }
    }
    
    throw lastError || new Error('All RPC endpoints failed');
  }

  // ── AUDIT FIX #3: Jetton wallet address caching for performance ──────────
  private jettonWalletCache = new Map<string, { address: string; timestamp: number }>();
  private readonly JETTON_WALLET_CACHE_TTL = 3600000; // 1 hour

  constructor() {
    // Initialize with mainnet by default
    const network = (localStorage.getItem('rhiza_network') as NetworkType) || 'mainnet';
    this.currentNetwork = network;
    const config = getNetworkConfig(network);

    this.client = new TonClient({
      endpoint: config.API_ENDPOINT,
      apiKey: config.API_KEY
    });

    console.log(`🔧 TonWalletService initialized with ${config.NAME}`);
  }

  // Update network and reinitialize client
  setNetwork(network: NetworkType) {
    this.currentNetwork = network;
    const config = getNetworkConfig(network);

    this.client = new TonClient({
      endpoint: config.API_ENDPOINT,
      apiKey: config.API_KEY
    });

    // Reinitialize contract if wallet exists
    if (this.wallet) {
      this.contract = this.client.open(this.wallet);
    }

    console.log(`🔄 Network switched to ${config.NAME}`);
    console.log(`📡 Using endpoint: ${config.API_ENDPOINT}`);
  }

  async generateNewWallet() {
    try {
      const mnemonic = await mnemonicNew(24);
      const keyPair = await mnemonicToWalletKey(mnemonic);
      const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
      const address = wallet.address.toString({ bounceable: false, testOnly: this.currentNetwork === 'testnet' });
      return { success: true, mnemonic, address };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }

  async initializeWallet(mnemonic: string[], password?: string, walletId?: string, validateOnly = false) {
    try {
      this.keyPair = await mnemonicToWalletKey(mnemonic);
      this.wallet = WalletContractV4.create({ workchain: 0, publicKey: this.keyPair.publicKey });
      this.contract = this.client.open(this.wallet);

      const address = this.wallet.address.toString({ bounceable: false, testOnly: this.currentNetwork === 'testnet' });
      console.log(`✅ Wallet initialized: ${address}`);

      // Skip all storage when only validating the phrase
      if (validateOnly) {
        return { success: true, address };
      }

      // Generate wallet ID if not provided
      const effectiveWalletId = walletId || `wallet_${address.slice(0, 8)}`;
      this.currentWalletId = effectiveWalletId;

      // Store in secure secret manager if password provided
      if (password) {
        const storeResult = await secureSecretManager.storeMnemonic(
          effectiveWalletId,
          mnemonic,
          password
        );
        if (!storeResult.success) {
          console.warn('⚠️ Failed to store in secure manager:', storeResult.error);
        }
      }

      // Always save session (with device encryption by default, or password if provided)
      const result = await sessionManager.saveSession(mnemonic, password);
      if (!result.success) {
        console.warn('⚠️ Failed to save session:', result.error);
        // Don't fail the login, just warn
      }

      return { success: true, address };
    } catch (e) {
      console.error('❌ Wallet initialization failed:', e);
      return { success: false, error: String(e) };
    }
  }

  // ── In-memory balance cache (survives re-renders, cleared on logout) ───────────
  private _balanceCache: { value: string; ts: number; address: string } | null = null;
  private readonly _BALANCE_TTL = 5_000; // 5 seconds — tightened to match balanceSyncService

  async getBalance() {
    if (!this.wallet) {
      console.warn('⚠️ Wallet not initialized');
      return { success: false, error: 'Not initialized' };
    }

    sessionManager.updateActivity();

    const addr = this.wallet.address.toString();

    // Return cache if still fresh for the same address
    if (
      this._balanceCache &&
      this._balanceCache.address === addr &&
      Date.now() - this._balanceCache.ts < this._BALANCE_TTL
    ) {
      return { success: true, balance: this._balanceCache.value, fromCache: true };
    }

    try {
      // ── Use TonCenter V3 REST directly — fastest path with premium API key ──
      const config = getNetworkConfig(this.currentNetwork);
      const v3Base = this.currentNetwork === 'mainnet'
        ? 'https://toncenter.com/api/v3'
        : 'https://testnet.toncenter.com/api/v3';

      const res = await fetch(`${v3Base}/account?address=${addr}`, {
        headers: config.API_KEY ? { 'X-API-Key': config.API_KEY } : {}
      });

      if (!res.ok) throw new Error(`V3 HTTP ${res.status}`);
      const data = await res.json();
      const balanceInTon = data?.balance
        ? (Number(data.balance) / 1e9).toFixed(4)
        : '0.0000';

      // ── Deposit detection: capture old value before overwriting cache
      const prevBalance = this._balanceCache?.address === addr ? this._balanceCache.value : null;
      this._balanceCache = { value: balanceInTon, ts: Date.now(), address: addr };

      // If balance INCREASED vs last cached value, a deposit arrived — bust balanceSyncService cache
      if (prevBalance !== null && parseFloat(balanceInTon) > parseFloat(prevBalance)) {
        try {
          const { balanceSyncService } = await import('./balanceSyncService');
          const friendlyAddr = this.wallet.address.toString({ bounceable: false, testOnly: this.currentNetwork === 'testnet' });
          balanceSyncService.refreshForAddress(friendlyAddr);
          console.log(`✅ Deposit detected: ${prevBalance} → ${balanceInTon} TON — cache busted`);
        } catch { /* non-critical */ }
      }

      return { success: true, balance: balanceInTon };
    } catch (e) {
      // Fallback: TonClient SDK (V2 jsonRPC)
      try {
        const balance = await this.client.getBalance(this.wallet.address);
        const balanceInTon = (Number(balance) / 1e9).toFixed(4);
        this._balanceCache = { value: balanceInTon, ts: Date.now(), address: addr };
        return { success: true, balance: balanceInTon };
      } catch (e2) {
        console.error('❌ Balance fetch failed:', e2);
        // Return stale cache rather than 0 if available
        if (this._balanceCache?.address === addr) {
          return { success: true, balance: this._balanceCache.value, fromCache: true };
        }
        return { success: false, error: String(e2) };
      }
    }
  }

  async getBalanceByAddress(address: string) {
    try {
      const config = getNetworkConfig(this.currentNetwork);
      const v3Base = this.currentNetwork === 'mainnet'
        ? 'https://toncenter.com/api/v3'
        : 'https://testnet.toncenter.com/api/v3';

      // ── V3 REST is faster than V2 jsonRPC for simple account lookups ─────────
      const res = await fetch(`${v3Base}/account?address=${address}`, {
        headers: config.API_KEY ? { 'X-API-Key': config.API_KEY } : {}
      });

      if (!res.ok) throw new Error(`V3 HTTP ${res.status}`);
      const data = await res.json();
      const balanceInTon = data?.balance
        ? (Number(data.balance) / 1e9).toFixed(4)
        : '0.0000';

      return { success: true, balance: balanceInTon };
    } catch (e) {
      console.error('❌ getBalanceByAddress failed:', e);
      return { success: false, error: String(e), balance: '0.0000' };
    }
  }

  async getJettons(address: string) {
    try {
      const config = getNetworkConfig(this.currentNetwork);
      const v3Endpoint = this.currentNetwork === 'mainnet'
        ? 'https://toncenter.com/api/v3'
        : 'https://testnet.toncenter.com/api/v3';

      console.log(`🪙 Fetching jettons for ${address} on ${this.currentNetwork} via TonCenter V3...`);

      const res = await fetch(`${v3Endpoint}/jetton/wallets?owner_address=${address}&limit=250`, {
        headers: {
          'x-api-key': config.API_KEY
        }
      });

      if (!res.ok) {
        console.warn('⚠️ Jettons fetch failed, returning empty array');
        return { success: true, jettons: [] };
      }

      const data = await res.json();
      
      // Map TonCenter V3 jettons to look like TonAPI jettons for frontend compatibility
      let mappedBalances = (data.jetton_wallets || []).map((w: any) => {
        let friendlyAddress = w.jetton;
        try {
          if (w.jetton) {
            const formatted = this.formatAddress(w.jetton, true);
            if (formatted) friendlyAddress = formatted;
          }
        } catch (e) {
          // ignore parsing errors
        }
        return {
          balance: w.balance,
          jetton: {
            address: friendlyAddress,
            name: w.jetton_master?.name || 'Unknown Token',
            symbol: w.jetton_master?.symbol || 'TKN',
            decimals: w.jetton_master?.decimals || 9,
            image: w.jetton_master?.image || ''
          }
        };
      });

      // Allow USDT to load for all wallets including secondary W5 WDK wallets
      console.log(`✅ Jettons fetched: ${mappedBalances.length} tokens`);
      return { success: true, jettons: mappedBalances };
    } catch (e) {
      console.error('❌ Jettons fetch failed:', e);
      return { success: false, error: String(e) };
    }
  }

  // ── AUDIT FIX #1: Dedicated jetton balance method ─────────────────────────
  async getJettonBalance(
    ownerAddress: string,
    jettonMasterAddress: string,
    decimals: number = 9
  ): Promise<{ success: boolean; balance?: string; error?: string }> {
    try {
      const config = getNetworkConfig(this.currentNetwork);
      const v3Endpoint = this.currentNetwork === 'mainnet'
        ? 'https://toncenter.com/api/v3'
        : 'https://testnet.toncenter.com/api/v3';

      console.log(`🪙 Fetching jetton balance for ${jettonMasterAddress}...`);

      const res = await fetch(
        `${v3Endpoint}/jetton/wallets?owner_address=${ownerAddress}&jetton_address=${jettonMasterAddress}&limit=1`,
        {
          headers: {
            'x-api-key': config.API_KEY
          }
        }
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const jettonWallet = data.jetton_wallets?.[0];

      if (!jettonWallet) {
        return { success: true, balance: '0' };
      }

      // Format balance with proper decimals
      const balanceFormatted = (Number(jettonWallet.balance) / Math.pow(10, decimals)).toFixed(decimals > 6 ? 4 : 6);

      return {
        success: true,
        balance: balanceFormatted
      };
    } catch (e) {
      console.error('❌ getJettonBalance failed:', e);
      return { success: false, error: String(e) };
    }
  }

  // ── AUDIT FIX #3: Jetton wallet address resolution with caching ───────────
  async resolveJettonWallet(
    ownerAddress: string,
    jettonMasterAddress: string
  ): Promise<{ success: boolean; jettonWalletAddress?: string; error?: string }> {
    try {
      // Check cache first
      const cacheKey = `${ownerAddress}_${jettonMasterAddress}`;
      const cached = this.jettonWalletCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.JETTON_WALLET_CACHE_TTL) {
        console.log(`✅ Jetton wallet address from cache: ${cached.address}`);
        return { success: true, jettonWalletAddress: cached.address };
      }

      // Fetch from API
      const config = getNetworkConfig(this.currentNetwork);
      const v3Endpoint = this.currentNetwork === 'mainnet'
        ? 'https://toncenter.com/api/v3'
        : 'https://testnet.toncenter.com/api/v3';

      console.log(`🔍 Resolving jetton wallet address for ${jettonMasterAddress}...`);

      const res = await fetch(
        `${v3Endpoint}/jetton/wallets?owner_address=${ownerAddress}&jetton_address=${jettonMasterAddress}&limit=1`,
        {
          headers: {
            'x-api-key': config.API_KEY
          }
        }
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const jettonWallet = data.jetton_wallets?.[0];

      if (!jettonWallet || !jettonWallet.address) {
        return { success: false, error: 'Jetton wallet not found' };
      }

      let jettonWalletAddress = jettonWallet.address;
      const formatted = this.formatAddress(jettonWalletAddress, true);
      if (formatted) jettonWalletAddress = formatted;

      // Cache the result
      this.jettonWalletCache.set(cacheKey, {
        address: jettonWalletAddress,
        timestamp: Date.now()
      });

      console.log(`✅ Jetton wallet resolved and cached: ${jettonWalletAddress}`);

      return { success: true, jettonWalletAddress };
    } catch (e) {
      console.error('❌ resolveJettonWallet failed:', e);
      return { success: false, error: String(e) };
    }
  }

  async getTransactions(address: string, limit: number = 50) {
    try {
      const config = getNetworkConfig(this.currentNetwork);
      const v3Endpoint = this.currentNetwork === 'mainnet'
        ? 'https://toncenter.com/api/v3'
        : 'https://testnet.toncenter.com/api/v3';

      console.log(`📜 Fetching transactions for ${address} on ${this.currentNetwork} via TonCenter V3...`);

      // Using /transactions which is standard in V3
      const response = await fetch(`${v3Endpoint}/transactions?account=${address}&limit=${limit}`, {
        headers: {
          'x-api-key': config.API_KEY
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ Fetched ${data.transactions?.length || 0} transactions`);

      // Passing V3 directly: standard wallets handle base64 V3 hashes fine if they parse raw data. 
      // If the UI expects specific TonAPI fields, we fall back to generic mapping.
      return { success: true, transactions: data.transactions || [] };
    } catch (e) {
      console.error('❌ Transactions fetch failed:', e);
      return { success: false, error: String(e), transactions: [] };
    }
  }

  async getNFTs(address: string, limit: number = 100) {
    try {
      const config = getNetworkConfig(this.currentNetwork);
      const v3Endpoint = this.currentNetwork === 'mainnet'
        ? 'https://toncenter.com/api/v3'
        : 'https://testnet.toncenter.com/api/v3';

      console.log(`🖼️ Fetching NFTs for ${address} on ${this.currentNetwork} via TonCenter V3...`);

      const response = await fetch(`${v3Endpoint}/nft/items?owner_address=${address}&limit=${limit}`, {
        headers: {
          'x-api-key': config.API_KEY
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ Fetched ${data.nft_items?.length || 0} NFTs`);

      return { success: true, nfts: data.nft_items || [] };
    } catch (e) {
      console.error('❌ NFTs fetch failed:', e);
      return { success: false, error: String(e), nfts: [] };
    }
  }

  async sendTransaction(recipientAddress: string, amount: string, comment?: string) {
    if (!this.contract || !this.keyPair) {
      console.error('❌ Wallet not initialized');
      return { success: false, error: 'Wallet not initialized' };
    }

    try {
      // Update session activity on user interaction
      sessionManager.updateActivity();
      
      // ── SECURITY FIX #8: Sanitize comment to prevent XSS ──────────────────
      const safeComment = comment ? sanitizeComment(comment) : '';
      
      // ── SECURITY FIX #6: Add network tag to prevent replay attacks ────────
      const networkTag = `[${this.currentNetwork}]`;
      const fullComment = safeComment ? `${networkTag} ${safeComment}` : networkTag;
      
      console.log(`💸 Preparing transaction...`);
      console.log(`   To: ${recipientAddress}`);
      console.log(`   Amount: ${amount} TON`);
      console.log(`   Comment: ${fullComment}`);
      console.log(`   Network: ${this.currentNetwork}`);

      // Validate recipient address
      let recipientAddr: Address;
      try {
        recipientAddr = Address.parse(recipientAddress);
      } catch (e) {
        return { success: false, error: 'Invalid recipient address' };
      }

      // Validate amount
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return { success: false, error: 'Invalid amount' };
      }

      // Check balance
      const balanceResult = await this.getBalance();
      if (!balanceResult.success) {
        return { success: false, error: 'Failed to check balance' };
      }

      const currentBalance = parseFloat(balanceResult.balance);
      const estimatedFee = 0.01; // Estimated gas fee in TON

      if (currentBalance < amountNum + estimatedFee) {
        return {
          success: false,
          error: `Insufficient balance. You have ${currentBalance} TON but need ${amountNum + estimatedFee} TON (including fees)`
        };
      }

      // Get seqno (sequence number for the transaction)
      const seqno = await this.contract.getSeqno();
      console.log(`📝 Current seqno: ${seqno}`);

      // ── SECURITY FIX #7: Estimate actual fee before sending ──────────────
      // Create a test transfer to estimate fees
      const testTransfer = this.contract.createTransfer({
        seqno,
        secretKey: this.keyPair.secretKey,
        messages: [
          internal({
            to: recipientAddr,
            value: toNano(amountNum.toFixed(9)),
            body: fullComment,
            bounce: false,
          })
        ]
      });

      // Estimate fee (this is approximate, actual fee may vary slightly)
      let actualFee = 0.01; // Default fallback
      try {
        // Try to estimate fee using the contract
        // Note: This is a best-effort estimation
        const feeEstimate = await this.contract.estimateFee(testTransfer);
        actualFee = Number(feeEstimate) / 1e9;
        console.log(`💰 Estimated fee: ${actualFee.toFixed(4)} TON`);
      } catch (feeError) {
        console.warn('⚠️ Could not estimate fee, using default:', actualFee);
      }

      // Re-check balance with actual fee
      if (currentBalance < amountNum + actualFee) {
        return {
          success: false,
          error: `Insufficient balance. You have ${currentBalance.toFixed(4)} TON but need ${(amountNum + actualFee).toFixed(4)} TON (${amount} + ${actualFee.toFixed(4)} fee)`
        };
      }

      // Create actual transfer message with sanitized comment
      const transfer = this.contract.createTransfer({
        seqno,
        secretKey: this.keyPair.secretKey,
        messages: [
          internal({
            to: recipientAddr,
            value: toNano(amountNum.toFixed(9)),
            body: fullComment,
            bounce: false,
          })
        ]
      });

      // Wrap in External Message Envelope and compute the normalized hash (TEP-467)
      // TonViewer indexes by the normalized external-in message hash, not the full hash.
      // Normalization: src=addr_none, importFee=0, init=null, body stored as ref.
      const { beginCell, external, storeMessage } = await import('@ton/ton');
      const extMsg = external({
        to: this.wallet.address,
        init: seqno === 0 ? this.wallet.init : undefined,
        body: transfer,
      });
      // Build the broadcast BOC (full envelope, needed for sending)
      const extMessageCell = beginCell()
        .storeWritable(storeMessage(extMsg))
        .endCell();
      const bocBase64 = extMessageCell.toBoc().toString('base64');

      // Compute normalized hash per TEP-467 (what TonViewer uses for lookup)
      const normalizedCell = beginCell()
        .storeWritable(storeMessage(
          {
            info: { type: 'external-in' as const, src: undefined as any, dest: this.wallet.address, importFee: 0n },
            init: null,
            body: transfer,
          },
          { forceRef: true }
        ))
        .endCell();
      const txHash = normalizedCell.hash().toString('hex');

      console.log(`📤 Sending transaction to ${this.currentNetwork}...`);
      console.log(`   TX Hash (normalized): ${txHash}`);

      // Broadcast via TonCenter V3 /message endpoint
      const v3Endpoint = this.currentNetwork === 'mainnet'
        ? 'https://toncenter.com/api/v3'
        : 'https://testnet.toncenter.com/api/v3';
      const { getNetworkConfig } = await import('../constants');
      const config = getNetworkConfig(this.currentNetwork);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (config.API_KEY) headers['X-API-Key'] = config.API_KEY;

      const broadcastRes = await fetch(`${v3Endpoint}/message`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ boc: bocBase64 }),
      });

      if (!broadcastRes.ok) {
        const text = await broadcastRes.text().catch(() => broadcastRes.statusText);
        throw new Error(`Broadcast failed (${broadcastRes.status}): ${text}`);
      }

      console.log(`✅ Transaction sent successfully!`);
      console.log(`   Seqno: ${seqno}`);
      console.log(`   Waiting for confirmation...`);

      // Invalidate balance cache so next fetch goes on-chain
      try {
        const { balanceSyncService } = await import('./balanceSyncService');
        balanceSyncService.invalidate(
          this.wallet.address.toString({ bounceable: false, testOnly: this.currentNetwork === 'testnet' }),
          this.currentNetwork as 'mainnet' | 'testnet'
        );
      } catch { /* non-critical */ }

      // Wait for transaction confirmation (check if seqno increased)
      let currentSeqno = seqno;
      let attempts = 0;
      const maxAttempts = 30;

      while (currentSeqno === seqno && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        try {
          currentSeqno = await this.contract.getSeqno();
          attempts++;
        } catch (e) {
          console.warn('⚠️ Failed to check seqno, retrying...');
        }
      }

      if (currentSeqno > seqno) {
        console.log(`✅ Transaction confirmed! New seqno: ${currentSeqno}`);
        return {
          success: true,
          txHash,
          seqno,
          message: 'Transaction sent and confirmed'
        };
      } else {
        console.warn('⚠️ Transaction sent but confirmation timeout');
        return {
          success: true,
          txHash,
          seqno,
          message: 'Transaction sent (confirmation pending)'
        };
      }

    } catch (e) {
      console.error('❌ Transaction failed:', e);
      return {
        success: false,
        error: e instanceof Error ? e.message : String(e)
      };
    }
  }

  /**
   * Send a transaction with a pre-built BOC body (e.g. STON.fi swap payload).
   * Unlike sendTransaction, this does NOT add a network tag or sanitize the body.
   * The body cell is sent verbatim to the recipient contract.
   */
  async sendTransactionWithBody(
    recipientAddress: string,
    amount: string,
    bocBody?: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.contract || !this.keyPair) {
      return { success: false, error: 'Wallet not initialized' };
    }

    try {
      sessionManager.updateActivity();

      const { Address, internal, external, beginCell, storeMessage, Cell } = await import('@ton/ton');
      const { toNano } = await import('@ton/ton');

      let recipientAddr: Address;
      try {
        recipientAddr = Address.parse(recipientAddress);
      } catch {
        return { success: false, error: 'Invalid recipient address' };
      }

      const amountNum = parseFloat(amount);
      if (!isFinite(amountNum) || amountNum <= 0) {
        return { success: false, error: 'Invalid amount' };
      }

      // Deserialize pre-built BOC body if provided
      let bodyCell: any = undefined;
      if (bocBody) {
        try {
          bodyCell = Cell.fromBase64(bocBody);
        } catch {
          return { success: false, error: 'Invalid swap payload (BOC parse failed)' };
        }
      }

      const seqno = await this.contract.getSeqno();

      const transfer = this.contract.createTransfer({
        seqno,
        secretKey: this.keyPair.secretKey,
        messages: [
          internal({
            to: recipientAddr,
            value: toNano(amountNum.toFixed(9)),
            body: bodyCell,
            bounce: true, // STON.fi contracts are bounceable
          }),
        ],
      });

      const extMsg = external({
        to: this.wallet.address,
        init: seqno === 0 ? this.wallet.init : undefined,
        body: transfer,
      });
      const extMessageCell = beginCell().storeWritable(storeMessage(extMsg)).endCell();
      const bocBase64 = extMessageCell.toBoc().toString('base64');

      const normalizedCell = beginCell()
        .storeWritable(storeMessage(
          { info: { type: 'external-in' as const, src: undefined as any, dest: this.wallet.address, importFee: 0n }, init: null, body: transfer },
          { forceRef: true }
        ))
        .endCell();
      const txHash = normalizedCell.hash().toString('hex');

      const v3Endpoint = this.currentNetwork === 'mainnet'
        ? 'https://toncenter.com/api/v3'
        : 'https://testnet.toncenter.com/api/v3';
      const config = getNetworkConfig(this.currentNetwork);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (config.API_KEY) headers['X-API-Key'] = config.API_KEY;

      const broadcastRes = await fetch(`${v3Endpoint}/message`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ boc: bocBase64 }),
      });

      if (!broadcastRes.ok) {
        const text = await broadcastRes.text().catch(() => broadcastRes.statusText);
        throw new Error(`Broadcast failed (${broadcastRes.status}): ${text}`);
      }

      // Wait for seqno confirmation
      let currentSeqno = seqno;
      let attempts = 0;
      while (currentSeqno === seqno && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        try { currentSeqno = await this.contract.getSeqno(); } catch { break; }
        attempts++;
      }

      return { success: true, txHash };
    } catch (e) {
      console.error('❌ sendTransactionWithBody failed:', e);
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  /**
   * Send multiple pre-built BOC messages in a single transaction (atomic batch).
   * Used for STON.fi Jetton→Jetton swaps which require 2 messages.
   * All messages are bundled into one External Message to avoid seqno conflicts.
   */
  async sendMultiTransactionWithBodies(
    recipients: Array<{ to: string; amount: string; bocBody?: string }>
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.contract || !this.keyPair) {
      return { success: false, error: 'Wallet not initialized' };
    }
    if (recipients.length === 0 || recipients.length > 4) {
      return { success: false, error: 'Must have 1–4 recipients' };
    }

    try {
      sessionManager.updateActivity();
      const { Address, internal, external, beginCell, storeMessage, Cell, toNano } = await import('@ton/ton');

      const messages = recipients.map(r => {
        let recipientAddr: Address;
        try { recipientAddr = Address.parse(r.to); }
        catch { throw new Error(`Invalid address: ${r.to}`); }

        const amountNum = parseFloat(r.amount);
        if (!isFinite(amountNum) || amountNum <= 0) throw new Error(`Invalid amount: ${r.amount}`);

        let bodyCell: any = undefined;
        if (r.bocBody) {
          try { bodyCell = Cell.fromBase64(r.bocBody); }
          catch { throw new Error('Invalid swap payload (BOC parse failed)'); }
        }

        return internal({
          to: recipientAddr,
          value: toNano(amountNum.toFixed(9)),
          body: bodyCell,
          bounce: true, // STON.fi contracts are bounceable
        });
      });

      const seqno = await this.contract.getSeqno();
      const transfer = this.contract.createTransfer({
        seqno,
        secretKey: this.keyPair.secretKey,
        messages,
      });

      const extMsg = external({
        to: this.wallet.address,
        init: seqno === 0 ? this.wallet.init : undefined,
        body: transfer,
      });
      const extMessageCell = beginCell().storeWritable(storeMessage(extMsg)).endCell();
      const bocBase64 = extMessageCell.toBoc().toString('base64');

      const normalizedCell = beginCell()
        .storeWritable(storeMessage(
          { info: { type: 'external-in' as const, src: undefined as any, dest: this.wallet.address, importFee: 0n }, init: null, body: transfer },
          { forceRef: true }
        ))
        .endCell();
      const txHash = normalizedCell.hash().toString('hex');

      const v3Endpoint = this.currentNetwork === 'mainnet'
        ? 'https://toncenter.com/api/v3'
        : 'https://testnet.toncenter.com/api/v3';
      const config = getNetworkConfig(this.currentNetwork);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (config.API_KEY) headers['X-API-Key'] = config.API_KEY;

      const broadcastRes = await fetch(`${v3Endpoint}/message`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ boc: bocBase64 }),
      });

      if (!broadcastRes.ok) {
        const text = await broadcastRes.text().catch(() => broadcastRes.statusText);
        throw new Error(`Broadcast failed (${broadcastRes.status}): ${text}`);
      }

      // Wait for seqno confirmation
      let currentSeqno = seqno;
      let attempts = 0;
      while (currentSeqno === seqno && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        try { currentSeqno = await this.contract.getSeqno(); } catch { break; }
        attempts++;
      }

      return { success: true, txHash };
    } catch (e) {
      console.error('❌ sendMultiTransactionWithBodies failed:', e);
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  /**
   * Send TON to multiple recipients in a single transaction (up to 4 messages).
   * Used to pay the platform AND the referrer's 1% commission atomically.
   */
  async sendMultiTransaction(
    recipients: { address: string; amount: string; comment?: string }[]
  ): Promise<{ success: boolean; txHash?: string; seqno?: number; error?: string }> {
    if (!this.contract || !this.keyPair) {
      return { success: false, error: 'Wallet not initialized' };
    }
    if (recipients.length === 0 || recipients.length > 4) {
      return { success: false, error: 'Must have 1–4 recipients' };
    }

    try {
      // ── SECURITY FIX #6 & #8: Add network tag and sanitize comments ───────
      const networkTag = `[${this.currentNetwork}]`;
      
      // Validate all addresses and amounts
      const messages = recipients.map(r => {
        const addr = Address.parse(r.address); // throws if invalid
        const amountNum = parseFloat(r.amount);
        if (isNaN(amountNum) || amountNum <= 0) throw new Error(`Invalid amount for ${r.address}`);
        
        // Sanitize comment and add network tag
        const safeComment = r.comment ? sanitizeComment(r.comment) : '';
        const fullComment = safeComment ? `${networkTag} ${safeComment}` : networkTag;
        
        return internal({
          to: addr,
          value: toNano(amountNum.toFixed(9)),
          body: fullComment,
          bounce: false,
        });
      });

      // Check total balance
      const totalTON = recipients.reduce((s, r) => s + parseFloat(r.amount), 0);
      const balanceResult = await this.getBalance();
      if (!balanceResult.success) return { success: false, error: 'Failed to check balance' };
      const currentBalance = parseFloat(balanceResult.balance);
      const estimatedFee = 0.015; // slightly higher for multi-message
      if (currentBalance < totalTON + estimatedFee) {
        return {
          success: false,
          error: `Insufficient balance. Need ${(totalTON + estimatedFee).toFixed(4)} TON, have ${currentBalance.toFixed(4)} TON`
        };
      }

      const seqno = await this.contract.getSeqno();
      const transfer = this.contract.createTransfer({
        seqno,
        secretKey: this.keyPair.secretKey,
        messages,
      });

      // Wrap in External Message Envelope and compute the normalized hash (TEP-467)
      const { beginCell, external, storeMessage } = await import('@ton/ton');
      const extMsg = external({
        to: this.wallet.address,
        init: seqno === 0 ? this.wallet.init : undefined,
        body: transfer,
      });
      const extMessageCell = beginCell()
        .storeWritable(storeMessage(extMsg))
        .endCell();
      const bocBase64 = extMessageCell.toBoc().toString('base64');

      // Normalized hash per TEP-467 (what TonViewer uses for lookup)
      const normalizedCell = beginCell()
        .storeWritable(storeMessage(
          {
            info: { type: 'external-in' as const, src: undefined as any, dest: this.wallet.address, importFee: 0n },
            init: null,
            body: transfer,
          },
          { forceRef: true }
        ))
        .endCell();
      const txHash = normalizedCell.hash().toString('hex');

      // Broadcast via TonCenter V3 /message endpoint
      const v3Endpoint = this.currentNetwork === 'mainnet'
        ? 'https://toncenter.com/api/v3'
        : 'https://testnet.toncenter.com/api/v3';
      const { getNetworkConfig } = await import('../constants');
      const config = getNetworkConfig(this.currentNetwork);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (config.API_KEY) headers['X-API-Key'] = config.API_KEY;

      const broadcastRes = await fetch(`${v3Endpoint}/message`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ boc: bocBase64 }),
      });

      if (!broadcastRes.ok) {
        const text = await broadcastRes.text().catch(() => broadcastRes.statusText);
        throw new Error(`Broadcast failed (${broadcastRes.status}): ${text}`);
      }

      // Invalidate balance cache so next fetch goes on-chain
      try {
        const { balanceSyncService } = await import('./balanceSyncService');
        balanceSyncService.invalidate(
          this.wallet.address.toString({ bounceable: false, testOnly: this.currentNetwork === 'testnet' }),
          this.currentNetwork as 'mainnet' | 'testnet'
        );
      } catch { /* non-critical */ }

      // Wait for confirmation
      let currentSeqno = seqno;
      let attempts = 0;
      while (currentSeqno === seqno && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        try { currentSeqno = await this.contract.getSeqno(); } catch {}
        attempts++;
      }

      return { success: true, txHash, seqno };
    } catch (e) {
      console.error('❌ Multi-transaction failed:', e);
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  async sendJettonTransaction(
    jettonWalletAddress: string,
    recipientAddress: string,
    amount: bigint,
    forwardAmount: string = '0.01',
    comment?: string
  ) {
    if (!this.contract || !this.keyPair) {
      console.error('❌ Wallet not initialized');
      return { success: false, error: 'Wallet not initialized' };
    }

    try {
      // ── SECURITY FIX #8: Sanitize comment ─────────────────────────────────
      const safeComment = comment ? sanitizeComment(comment) : '';
      
      console.log(`🪙 Preparing jetton transaction...`);
      console.log(`   Jetton Wallet: ${jettonWalletAddress}`);
      console.log(`   To: ${recipientAddress}`);
      console.log(`   Amount: ${amount.toString()}`);
      console.log(`   Comment: ${safeComment || '(none)'}`);
      console.log(`   Network: ${this.currentNetwork}`);

      // Validate addresses
      let jettonWalletAddr: Address;
      let recipientAddr: Address;
      try {
        jettonWalletAddr = Address.parse(jettonWalletAddress);
        recipientAddr = Address.parse(recipientAddress);
      } catch (e) {
        return { success: false, error: 'Invalid address format' };
      }

      // Check TON balance for gas
      const balanceResult = await this.getBalance();
      if (!balanceResult.success) {
        return { success: false, error: 'Failed to check balance' };
      }

      const currentBalance = parseFloat(balanceResult.balance);
      const gasRequired = 0.05; // 0.05 TON for jetton transfer

      if (currentBalance < gasRequired) {
        return {
          success: false,
          error: `Insufficient TON for gas. You need ${gasRequired} TON but have ${currentBalance} TON`
        };
      }

      // Get seqno
      const seqno = await this.contract.getSeqno();
      console.log(`📝 Current seqno: ${seqno}`);

      // ── AUDIT FIX #2: Build jetton transfer body with comment support ─────
      const { beginCell } = await import('@ton/ton');
      const body = beginCell()
        .storeUint(0xf8a7ea5, 32) // jetton transfer op code
        .storeUint(0, 64) // query ID
        .storeCoins(amount) // jetton amount
        .storeAddress(recipientAddr) // destination
        .storeAddress(this.wallet.address) // response destination
        .storeUint(0, 1) // null custom payload
        .storeCoins(toNano(forwardAmount)) // forward amount
        .storeUint(safeComment ? 1 : 0, 1) // has forward payload
        .storeRef(
          safeComment
            ? beginCell().storeUint(0, 32).storeStringTail(safeComment).endCell()
            : beginCell().endCell()
        )
        .endCell();

      // Create transfer message
      const transfer = this.contract.createTransfer({
        seqno,
        secretKey: this.keyPair.secretKey,
        messages: [
          internal({
            to: jettonWalletAddr,
            value: toNano('0.05'), // gas fee
            body: body,
            bounce: true,
          })
        ]
      });

      // Wrap in External Message Envelope and compute the normalized hash (TEP-467)
      const { beginCell: bc2, external: ext2, storeMessage: sm2 } = await import('@ton/ton');
      const extMsg2 = ext2({
        to: this.wallet.address,
        init: seqno === 0 ? this.wallet.init : undefined,
        body: transfer,
      });
      const extMessageCell = bc2()
        .storeWritable(sm2(extMsg2))
        .endCell();
      const bocBase64 = extMessageCell.toBoc().toString('base64');

      // Normalized hash per TEP-467 (what TonViewer uses for lookup)
      const normalizedCell = bc2()
        .storeWritable(sm2(
          {
            info: { type: 'external-in' as const, src: undefined as any, dest: this.wallet.address, importFee: 0n },
            init: null,
            body: transfer,
          },
          { forceRef: true }
        ))
        .endCell();
      const txHash = normalizedCell.hash().toString('hex');

      console.log(`📤 Sending jetton transaction to ${this.currentNetwork}...`);

      // Broadcast via TonCenter V3 /message endpoint
      const v3Endpoint = this.currentNetwork === 'mainnet'
        ? 'https://toncenter.com/api/v3'
        : 'https://testnet.toncenter.com/api/v3';
      const { getNetworkConfig } = await import('../constants');
      const config = getNetworkConfig(this.currentNetwork);
      const broadcastHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (config.API_KEY) broadcastHeaders['X-API-Key'] = config.API_KEY;

      const broadcastRes = await fetch(`${v3Endpoint}/message`, {
        method: 'POST',
        headers: broadcastHeaders,
        body: JSON.stringify({ boc: bocBase64 }),
      });

      if (!broadcastRes.ok) {
        const text = await broadcastRes.text().catch(() => broadcastRes.statusText);
        throw new Error(`Broadcast failed (${broadcastRes.status}): ${text}`);
      }

      console.log(`✅ Jetton transaction sent successfully!`);
      console.log(`   Seqno: ${seqno}`);
      console.log(`   Waiting for confirmation...`);

      // Wait for transaction confirmation
      let currentSeqno = seqno;
      let attempts = 0;
      const maxAttempts = 30;

      while (currentSeqno === seqno && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        try {
          currentSeqno = await this.contract.getSeqno();
          attempts++;
        } catch (e) {
          console.warn('⚠️ Failed to check seqno, retrying...');
        }
      }

      if (currentSeqno > seqno) {
        console.log(`✅ Jetton transaction confirmed! New seqno: ${currentSeqno}`);
        return {
          success: true,
          txHash,
          seqno,
          message: 'Jetton transaction sent and confirmed'
        };
      } else {
        console.warn('⚠️ Jetton transaction sent but confirmation timeout');
        return {
          success: true,
          txHash,
          seqno,
          message: 'Jetton transaction sent (confirmation pending)'
        };
      }

    } catch (e) {
      console.error('❌ Jetton transaction failed:', e);
      return {
        success: false,
        error: e instanceof Error ? e.message : String(e)
      };
    }
  }

  async estimateTransactionFee(recipientAddress: string, amount: string, comment?: string) {
    try {
      // Validate inputs
      Address.parse(recipientAddress);
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return { success: false, error: 'Invalid amount' };
      }

      // For TON, typical transaction fee is around 0.005-0.01 TON
      // This is an estimate - actual fee depends on network congestion
      const estimatedFee = '0.01';

      return {
        success: true,
        fee: estimatedFee,
        total: (amountNum + parseFloat(estimatedFee)).toFixed(4)
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : String(e)
      };
    }
  }

  logout() {
    if (this.currentWalletId) {
      secureSecretManager.clearMemory(this.currentWalletId);
    }
    if (this.keyPair?.secretKey) {
      crypto.getRandomValues(this.keyPair.secretKey);
    }
    this.keyPair = null;
    this.wallet = null;
    this.contract = null;
    this.currentWalletId = null;
    this._balanceCache = null; // clear cached balance on logout
    sessionManager.clearSession();
    console.log('👋 Logged out - secrets cleared from memory');
  }

  isInitialized() { return !!this.contract; }
  getStoredSession(password: string) { return sessionManager.restoreSession(password); }
  hasStoredSession() { return sessionManager.hasSession(); }
  isSessionEncrypted() { return sessionManager.isEncrypted(); }
  getWalletAddress() { 
    if (!this.wallet) return undefined;
    
    // Use non-bounceable addresses for safer deposits from exchanges
    // and encode the correct network (testnet vs mainnet) flag
    return this.wallet.address.toString({ 
      bounceable: false, 
      testOnly: this.currentNetwork === 'testnet' 
    }); 
  }

  /**
   * Formats any valid TON address into the canonical format used by the application
   * (non-bounceable, with the correct testnet/mainnet flag).
   * Useful for standardizing addresses from external sources or user input.
   */
  formatAddress(address: string, bounceable: boolean = false): string | null {
    try {
      return Address.parse(address).toString({
        bounceable,
        testOnly: this.currentNetwork === 'testnet'
      });
    } catch (e) {
      return null;
    }
  }

  getCurrentNetwork() { return this.currentNetwork; }
}

export const tonWalletService = new TonWalletService();
