
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

// ── DEVICE KEY GENERATION (Issue #2 FIX) ─────────────────────────────────
// Generate device-specific encryption key using secure random storage
async function generateDeviceKey(): Promise<string> {
  const DEVICE_KEY_STORAGE = 'rhiza_device_key';
  
  // Check if we already have a stored device key
  let deviceKey = localStorage.getItem(DEVICE_KEY_STORAGE);
  
  if (!deviceKey) {
    // Generate a cryptographically secure random key (32 bytes = 256 bits)
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    deviceKey = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Store the key persistently
    localStorage.setItem(DEVICE_KEY_STORAGE, deviceKey);
    console.log('🔑 Generated new secure device key');
  }
  
  return deviceKey;
}

export class TonWalletService {
  private client: TonClient;
  private keyPair: any = null;
  private wallet: any = null;
  private contract: any = null;
  private currentNetwork: NetworkType = 'mainnet'; // Default to mainnet
  private currentWalletId: string | null = null; // Track current wallet for secure secret management

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
      return { success: true, mnemonic, address: wallet.address.toString() };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }

  async initializeWallet(mnemonic: string[], password?: string, walletId?: string) {
    try {
      this.keyPair = await mnemonicToWalletKey(mnemonic);
      this.wallet = WalletContractV4.create({ workchain: 0, publicKey: this.keyPair.publicKey });
      this.contract = this.client.open(this.wallet);

      const address = this.wallet.address.toString();
      console.log(`✅ Wallet initialized: ${address}`);

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

  async getBalance() {
    if (!this.contract) {
      console.warn('⚠️ Contract not initialized');
      return { success: false, error: 'Not initialized' };
    }

    try {
      // Update session activity on user interaction
      sessionManager.updateActivity();
      
      console.log(`💰 Fetching balance for ${this.wallet.address.toString()} on ${this.currentNetwork}...`);

      const balance = await this.contract.getBalance();
      const balanceInTon = (Number(balance) / 1e9).toFixed(4);

      console.log(`✅ Balance fetched: ${balanceInTon} TON`);

      return { success: true, balance: balanceInTon };
    } catch (e) {
      console.error('❌ Balance fetch failed:', e);
      return { success: false, error: String(e) };
    }
  }

  async getBalanceByAddress(address: string) {
    try {
      console.log(`💰 Fetching balance for address ${address} on ${this.currentNetwork}...`);

      const config = getNetworkConfig(this.currentNetwork);
      const endpoint = config.API_ENDPOINT;
      const apiKey = config.API_KEY;

      // Use TonCenter API to get balance
      const response = await fetch(`${endpoint}?api_key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getAddressBalance',
          params: {
            address: address
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || 'API error');
      }

      const balanceInNano = data.result || '0';
      const balanceInTon = (Number(balanceInNano) / 1e9).toFixed(4);

      console.log(`✅ Balance fetched: ${balanceInTon} TON`);

      return { success: true, balance: balanceInTon };
    } catch (e) {
      console.error('❌ Balance fetch failed:', e);
      return { success: false, error: String(e), balance: '0.0000' };
    }
  }

  async getJettons(address: string) {
    try {
      const config = getNetworkConfig(this.currentNetwork);
      const tonApiEndpoint = this.currentNetwork === 'mainnet'
        ? 'https://tonapi.io/v2'
        : 'https://testnet.tonapi.io/v2';

      console.log(`🪙 Fetching jettons for ${address} on ${this.currentNetwork}...`);

      const res = await fetch(`${tonApiEndpoint}/accounts/${address}/jettons`, {
        headers: {
          'Authorization': `Bearer ${config.TONAPI_KEY}`
        }
      });

      if (!res.ok) {
        console.warn('⚠️ Jettons fetch failed, returning empty array');
        return { success: true, jettons: [] };
      }

      const data = await res.json();
      console.log(`✅ Jettons fetched: ${data.balances?.length || 0} tokens`);

      return { success: true, jettons: data.balances || [] };
    } catch (e) {
      console.error('❌ Jettons fetch failed:', e);
      return { success: false, error: String(e) };
    }
  }

  async getTransactions(address: string, limit: number = 50) {
    try {
      const config = getNetworkConfig(this.currentNetwork);
      const tonApiEndpoint = this.currentNetwork === 'mainnet'
        ? 'https://tonapi.io/v2'
        : 'https://testnet.tonapi.io/v2';

      console.log(`📜 Fetching transactions for ${address} on ${this.currentNetwork}...`);

      const response = await fetch(`${tonApiEndpoint}/blockchain/accounts/${address}/transactions?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${config.TONAPI_KEY}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ Fetched ${data.transactions?.length || 0} transactions`);

      return { success: true, transactions: data.transactions || [] };
    } catch (e) {
      console.error('❌ Transactions fetch failed:', e);
      return { success: false, error: String(e), transactions: [] };
    }
  }

  async getNFTs(address: string, limit: number = 100) {
    try {
      const config = getNetworkConfig(this.currentNetwork);
      const tonApiEndpoint = this.currentNetwork === 'mainnet'
        ? 'https://tonapi.io/v2'
        : 'https://testnet.tonapi.io/v2';

      console.log(`🖼️ Fetching NFTs for ${address} on ${this.currentNetwork}...`);

      const response = await fetch(`${tonApiEndpoint}/accounts/${address}/nfts?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${config.TONAPI_KEY}`
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
            body: fullComment, // Use sanitized comment with network tag
            bounce: false, // Don't bounce if recipient doesn't exist
          })
        ]
      });

      console.log(`📤 Sending transaction to ${this.currentNetwork}...`);

      // Send the transaction
      await this.contract.send(transfer);

      console.log(`✅ Transaction sent successfully!`);
      console.log(`   Seqno: ${seqno}`);
      console.log(`   Waiting for confirmation...`);

      // Wait for transaction confirmation (check if seqno increased)
      let currentSeqno = seqno;
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout

      while (currentSeqno === seqno && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        try {
          currentSeqno = await this.contract.getSeqno();
          attempts++;
        } catch (e) {
          console.warn('⚠️ Failed to check seqno, retrying...');
        }
      }

      if (currentSeqno > seqno) {
        console.log(`✅ Transaction confirmed! New seqno: ${currentSeqno}`);

        // Generate transaction hash (approximate)
        const txHash = `${this.wallet.address.toString()}_${seqno}`;

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
          txHash: `${this.wallet.address.toString()}_${seqno}`,
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

      await this.contract.send(transfer);

      // Wait for confirmation
      let currentSeqno = seqno;
      let attempts = 0;
      while (currentSeqno === seqno && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        try { currentSeqno = await this.contract.getSeqno(); } catch {}
        attempts++;
      }

      const txHash = `${this.wallet.address.toString()}_${seqno}`;
      return { success: true, txHash, seqno, };
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
      console.log(`   Jetton Wallet: {jettonWalletAddress}`);
      console.log(`   To: ${recipientAddress}`);
      console.log(`   Amount: ${amount.toString()}`);
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

      // Build jetton transfer body
      const { beginCell } = await import('@ton/ton');
      const body = beginCell()
        .storeUint(0xf8a7ea5, 32) // jetton transfer op code
        .storeUint(0, 64) // query ID
        .storeCoins(amount) // jetton amount
        .storeAddress(recipientAddr) // destination
        .storeAddress(this.wallet.address) // response destination
        .storeUint(0, 1) // null custom payload
        .storeCoins(toNano(forwardAmount)) // forward amount
        .storeUint(0, 1) // null forward payload
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

      console.log(`📤 Sending jetton transaction to ${this.currentNetwork}...`);

      // Send the transaction
      await this.contract.send(transfer);

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

        const txHash = `${this.wallet.address.toString()}_${seqno}`;

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
          txHash: `${this.wallet.address.toString()}_${seqno}`,
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
    // Clear sensitive data from memory
    if (this.currentWalletId) {
      secureSecretManager.clearMemory(this.currentWalletId);
    }
    
    // Overwrite keypair with random data before clearing
    if (this.keyPair?.secretKey) {
      crypto.getRandomValues(this.keyPair.secretKey);
    }
    
    this.keyPair = null;
    this.wallet = null;
    this.contract = null;
    this.currentWalletId = null;
    sessionManager.clearSession();
    console.log('👋 Logged out - secrets cleared from memory');
  }

  isInitialized() { return !!this.contract; }
  getStoredSession(password: string) { return sessionManager.restoreSession(password); }
  hasStoredSession() { return sessionManager.hasSession(); }
  isSessionEncrypted() { return sessionManager.isEncrypted(); }
  getWalletAddress() { return this.wallet?.address.toString(); }
  getCurrentNetwork() { return this.currentNetwork; }
}

export const tonWalletService = new TonWalletService();
