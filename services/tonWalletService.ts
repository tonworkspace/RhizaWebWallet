
import { TonClient, WalletContractV4, internal, Address, toNano } from "@ton/ton";
import { mnemonicToWalletKey, mnemonicNew } from "@ton/crypto";
import { encryptMnemonic, decryptMnemonic } from '../utils/encryption';
import { NetworkType, getNetworkConfig, getApiEndpoint, getApiKey } from '../constants';

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
      
      // Store session timestamp
      localStorage.setItem('rhiza_session_created', Date.now().toString());
      
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
      
      if (encryptionType === 'true') {
        // Password-encrypted session
        if (!password) return null;
        const mnemonic = await decryptMnemonic(encrypted, password);
        return mnemonic;
      } else if (encryptionType === 'device') {
        // Device-encrypted session (auto-login)
        const deviceKey = await generateDeviceKey();
        const mnemonic = await decryptMnemonic(encrypted, deviceKey);
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
  },
  hasSession: () => {
    return !!localStorage.getItem('rhiza_session');
  },
  isEncrypted: () => {
    const type = localStorage.getItem('rhiza_session_encrypted');
    return type === 'true' || type === 'device';
  },
  getSessionAge: () => {
    const created = localStorage.getItem('rhiza_session_created');
    if (!created) return null;
    return Date.now() - parseInt(created);
  }
};

// Generate device-specific encryption key
async function generateDeviceKey(): Promise<string> {
  // Create a fingerprint from browser characteristics
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    new Date().getTimezoneOffset(),
    screen.colorDepth,
    screen.width + 'x' + screen.height,
    'rhizacore_v1' // App-specific salt
  ].join('|');
  
  // Hash the fingerprint to create a consistent key
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprint);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

export class TonWalletService {
  private client: TonClient;
  private keyPair: any = null;
  private wallet: any = null;
  private contract: any = null;
  private currentNetwork: NetworkType = 'testnet';

  constructor() {
    // Initialize with testnet by default
    const network = (localStorage.getItem('rhiza_network') as NetworkType) || 'testnet';
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

  async initializeWallet(mnemonic: string[], password?: string) {
    try {
      this.keyPair = await mnemonicToWalletKey(mnemonic);
      this.wallet = WalletContractV4.create({ workchain: 0, publicKey: this.keyPair.publicKey });
      this.contract = this.client.open(this.wallet);
      
      console.log(`✅ Wallet initialized: ${this.wallet.address.toString()}`);
      
      // Always save session (with device encryption by default, or password if provided)
      const result = await sessionManager.saveSession(mnemonic, password);
      if (!result.success) {
        console.warn('⚠️ Failed to save session:', result.error);
        // Don't fail the login, just warn
      }
      
      return { success: true, address: this.wallet.address.toString() };
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
      console.log(`💸 Preparing transaction...`);
      console.log(`   To: ${recipientAddress}`);
      console.log(`   Amount: ${amount} TON`);
      console.log(`   Comment: ${comment || 'none'}`);
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

      // Create transfer message
      const transfer = this.contract.createTransfer({
        seqno,
        secretKey: this.keyPair.secretKey,
        messages: [
          internal({
            to: recipientAddr,
            value: toNano(amount),
            body: comment || '', // Optional comment
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
    this.keyPair = null;
    this.wallet = null;
    this.contract = null;
    sessionManager.clearSession();
    console.log('👋 Logged out');
  }

  isInitialized() { return !!this.contract; }
  getStoredSession(password: string) { return sessionManager.restoreSession(password); }
  hasStoredSession() { return sessionManager.hasSession(); }
  isSessionEncrypted() { return sessionManager.isEncrypted(); }
  getWalletAddress() { return this.wallet?.address.toString(); }
  getCurrentNetwork() { return this.currentNetwork; }
}

export const tonWalletService = new TonWalletService();
