
import { TonClient, WalletContractV4, internal, Address, toNano } from "@ton/ton";
import { mnemonicToWalletKey, mnemonicNew } from "@ton/crypto";
import { encryptMnemonic, decryptMnemonic } from '../utils/encryption';
import { NetworkType, getNetworkConfig, getApiEndpoint, getApiKey } from '../constants';

const sessionManager = {
  saveSession: async (mnemonic: string[], password: string) => {
    try {
      const encrypted = await encryptMnemonic(mnemonic, password);
      localStorage.setItem('rhiza_session', encrypted);
      // Store a flag that session is encrypted
      localStorage.setItem('rhiza_session_encrypted', 'true');
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
  restoreSession: async (password: string) => {
    try {
      const encrypted = localStorage.getItem('rhiza_session');
      const isEncrypted = localStorage.getItem('rhiza_session_encrypted') === 'true';
      
      if (!encrypted) return null;
      
      if (isEncrypted) {
        // Decrypt with password
        const mnemonic = await decryptMnemonic(encrypted, password);
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
    localStorage.removeItem('rhiza_session_timeout');
  },
  hasSession: () => {
    return !!localStorage.getItem('rhiza_session');
  },
  isEncrypted: () => {
    return localStorage.getItem('rhiza_session_encrypted') === 'true';
  }
};

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
      
      // Save session with encryption if password provided
      if (password) {
        const result = await sessionManager.saveSession(mnemonic, password);
        if (!result.success) {
          return { success: false, error: 'Failed to save encrypted session' };
        }
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
