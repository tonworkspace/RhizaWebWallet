import WalletManagerEvm from '@tetherto/wdk-wallet-evm';
import WalletManagerTon from '@tetherto/wdk-wallet-ton';
import WalletManagerBtc from '@tetherto/wdk-wallet-btc';
import { ethers, formatUnits } from 'ethers';
import { encryptMnemonic, decryptMnemonic } from '../utils/encryption';
import { getNetworkConfig, NetworkType } from '../constants';

// ─────────────────────────────────────────────────────────────────────────────
// WDK Configuration Constants
// Per docs: https://docs.wdk.tether.io/sdk/core-module/configuration
// ─────────────────────────────────────────────────────────────────────────────
const TONCENTER_MAINNET_URL = 'https://toncenter.com/api/v3';   // WDK TON docs prescribed URL
const TONCENTER_TESTNET_URL = 'https://testnet.toncenter.com/api/v3';
const POLYGON_RPC_MAINNET   = 'https://polygon-rpc.com/';
const POLYGON_RPC_TESTNET   = 'https://rpc-mumbai.maticvigil.com/';
const ELECTRUM_WSS_MAINNET  = 'wss://electrum.blockstream.info:50004';
const ELECTRUM_WSS_TESTNET  = 'wss://electrum.blockstream.info:60004';

export type EvmChain = 'ethereum' | 'polygon' | 'arbitrum' | 'bsc' | 'avalanche' | 'plasma' | 'stable' | 'sepolia';

export const EVM_RPC_URLS: Record<EvmChain, string> = {
  ethereum: 'https://eth.drpc.org',
  polygon: 'https://polygon-rpc.com',
  arbitrum: 'https://arb1.arbitrum.io/rpc',
  bsc: 'https://bsc-dataseed.binance.org',
  avalanche: 'https://avalanche-c-chain-rpc.publicnode.com',
  plasma: 'https://plasma.drpc.org',
  stable: 'https://rpc.stable.xyz',
  sepolia: 'https://sepolia.drpc.org'
};
// EVM max fee guard: 0.01 ETH in wei — prevents runaway gas on mainnet
const EVM_MAX_FEE_WEI = BigInt('10000000000000000');
// TON max fee guard: 0.1 TON in nanotons
const TON_MAX_FEE_NANO = BigInt('100000000');

const SECONDARY_WALLET_KEY = 'rhiza_secondary_wallet';
const SECONDARY_WALLET_ENC_KEY = 'rhiza_secondary_wallet_encrypted';

export interface MultiChainAddresses {
  evmAddress: string;
  tonAddress: string;
  btcAddress: string;
}

// ── 7. ERROR HANDLING ──────────────────────────────────────────────────────────
// Per WDK docs: wrap SDK calls in try/catch and inspect error.message for known patterns.
// This helper classifies WDK errors into user-friendly messages.
function wdkErrorMessage(error: any, chain: string): string {
  const msg: string = error?.message || String(error) || 'Unknown error';
  console.error(`[WDK/${chain}] Transaction failed:`, msg);

  if (msg.includes('insufficient funds') || msg.includes('not enough'))
    return `Insufficient ${chain} balance to cover amount + fees.`;
  if (msg.includes('max fee') || msg.includes('transferMaxFee'))
    return `Transaction fee exceeds the safety limit. Try a smaller amount.`;
  if (msg.includes('dust') || msg.includes('294'))
    return 'Amount is below the minimum dust limit (294 satoshis).';
  if (msg.includes('nonce') || msg.includes('replacement'))
    return 'Transaction conflict detected. Please wait and try again.';
  if (msg.includes('rejected') || msg.includes('denied'))
    return 'Transaction was rejected. Please try again.';
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('timeout'))
    return `Network error on ${chain}. Check your connection and try again.`;
  if (msg.includes('invalid address') || msg.includes('bad address'))
    return 'Invalid recipient address. Please double-check and try again.';
  if (msg.includes('Electrum') || msg.includes('electrum'))
    return 'BTC network connection unavailable. Try again in a moment.';

  return msg;
}

export class TetherWdkService {

  private evmManager: any = null;
  private tonManager: any = null;
  private btcManager: any = null;
  private evmAccount: any = null;
  private tonAccount: any = null;
  private btcAccount: any = null;
  private mnemonic: string | null = null;
  private currentNetwork: NetworkType = 'mainnet';
  private currentEvmChain: EvmChain = 'polygon';

  constructor() {
    const network = (localStorage.getItem('rhiza_network') as NetworkType) || 'mainnet';
    this.currentNetwork = network;
    
    // Default to polygon, but load saved preference if exists
    const savedChain = localStorage.getItem('rhiza_evm_chain') as EvmChain;
    if (savedChain && Object.keys(EVM_RPC_URLS).includes(savedChain)) {
      this.currentEvmChain = savedChain;
    }
  }

  getCurrentEvmChain(): EvmChain {
    return this.currentEvmChain;
  }

  async switchEvmChain(chain: EvmChain): Promise<boolean> {
    if (!EVM_RPC_URLS[chain]) return false;
    
    this.currentEvmChain = chain;
    localStorage.setItem('rhiza_evm_chain', chain);
    
    // Reinitialize if already running
    if (this.mnemonic && this.evmManager) {
      try {
        const isMainnet = this.currentNetwork === 'mainnet';
        const evmProviderUrl = isMainnet ? EVM_RPC_URLS[this.currentEvmChain] : EVM_RPC_URLS.sepolia;
        
        try { this.evmManager.dispose(); } catch (_) {}
        
        this.evmManager = new WalletManagerEvm(this.mnemonic, {
          provider: evmProviderUrl,
          transferMaxFee: EVM_MAX_FEE_WEI
        });
        this.evmAccount = await this.evmManager.getAccount(0);
        return true;
      } catch (e) {
        console.error('Failed to switch EVM chain:', e);
        return false;
      }
    }
    return true;
  }

  // Generate a new 12-word BIP39 mnemonic
  generateMnemonic(): string {
    const wallet = ethers.Wallet.createRandom();
    return wallet.mnemonic!.phrase;
  }

  // Initialize EVM, TON and BTC wallet managers from a seed phrase
  async initializeManagers(seedPhrase: string) {
    const config = getNetworkConfig(this.currentNetwork);
    const isMainnet = this.currentNetwork === 'mainnet';

    try {
      // ── EVM (Dynamic chain selection) ───────────────────────────────────────
      // Per WDK docs: WalletManagerEvm(seedPhrase, { provider, transferMaxFee? })
      const evmProviderUrl = isMainnet ? EVM_RPC_URLS[this.currentEvmChain] : EVM_RPC_URLS.sepolia;
      this.evmManager = new WalletManagerEvm(seedPhrase, {
        provider: evmProviderUrl,
        transferMaxFee: EVM_MAX_FEE_WEI  // Safety: block any tx with gas > 0.01 ETH
      });
      this.evmAccount = await this.evmManager.getAccount(0);

      // ── TON (W5) ────────────────────────────────────────────────────────────
      // Per WDK docs: tonClient: { url: 'https://toncenter.com/api/v3', secretKey? }
      // NOTE: config.TONAPI_KEY is our TonAPI key — toncenter also accepts it via secretKey
      this.tonManager = new WalletManagerTon(seedPhrase, {
        tonClient: {
          url: isMainnet ? TONCENTER_MAINNET_URL : TONCENTER_TESTNET_URL,
          secretKey: config.TONAPI_KEY || undefined  // Optional but boosts rate limits
        },
        transferMaxFee: TON_MAX_FEE_NANO  // Safety: block any tx with fee > 0.1 TON
      });
      this.tonAccount = await this.tonManager.getAccount(0);

      // ── BTC — ElectrumWs is the ONLY browser-compatible transport ────────────
      // Per WDK docs: WalletManagerBtc(seedPhrase, { client: ElectrumWs, network })
      // ElectrumTcp / ElectrumTls / ElectrumSsl require raw Node.js sockets.
      // ElectrumWs uses { url: string } (NOT { host, port }).
      const btcNetwork = isMainnet ? 'bitcoin' : 'testnet';
      let btcClient: any = null;
      try {
        const { ElectrumWs } = await import('@tetherto/wdk-wallet-btc');
        btcClient = new ElectrumWs({
          url: isMainnet ? ELECTRUM_WSS_MAINNET : ELECTRUM_WSS_TESTNET
        });
      } catch (wsErr) {
        console.warn('[WDK] ElectrumWs init failed; BTC in address-only mode:', wsErr);
      }

      const btcConfig: any = { network: btcNetwork };
      if (btcClient) btcConfig.client = btcClient;

      this.btcManager = new WalletManagerBtc(seedPhrase, btcConfig);
      this.btcAccount = await this.btcManager.getAccount(0);

      this.mnemonic = seedPhrase;

      return {
        evmAddress: await this.evmAccount.getAddress(),
        tonAddress: await this.tonAccount.getAddress(),
        btcAddress: await this.btcAccount.getAddress()
      };
    } catch (error) {
      console.error('[WDK] Failed to initialize multi-chain managers:', error);
      throw error;
    }
  }

  /** True if all three chain managers are up and held an account reference */
  isInitialized(): boolean {
    return !!(this.evmAccount && this.tonAccount && this.btcAccount);
  }

  async saveWallet(mnemonicPhrase: string, password?: string) {
    try {
      const mnemonicArray = mnemonicPhrase.split(' ');
      if (password) {
        const encrypted = await encryptMnemonic(mnemonicArray, password);
        localStorage.setItem(SECONDARY_WALLET_KEY, encrypted);
        localStorage.setItem(SECONDARY_WALLET_ENC_KEY, 'true');
      } else {
        localStorage.setItem(SECONDARY_WALLET_KEY, JSON.stringify(mnemonicArray));
        localStorage.setItem(SECONDARY_WALLET_ENC_KEY, 'false');
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }

  async getStoredWallet(password?: string): Promise<string | null> {
    const stored = localStorage.getItem(SECONDARY_WALLET_KEY);
    const isEncrypted = localStorage.getItem(SECONDARY_WALLET_ENC_KEY) === 'true';

    if (!stored) return null;

    try {
      if (isEncrypted) {
        if (!password) return null; // cannot decrypt without password
        const decrypted = await decryptMnemonic(stored, password);
        return decrypted.join(' ');
      } else {
        const parsed = JSON.parse(stored);
        return parsed.join(' ');
      }
    } catch (e) {
      console.error('Failed to get secondary wallet:', e);
      return null;
    }
  }

  hasStoredWallet() {
    return !!localStorage.getItem(SECONDARY_WALLET_KEY);
  }

  isEncrypted() {
    return localStorage.getItem(SECONDARY_WALLET_ENC_KEY) === 'true';
  }

  async getAddresses(): Promise<MultiChainAddresses | null> {
    if (!this.evmAccount || !this.tonAccount || !this.btcAccount) return null;
    return {
      evmAddress: await this.evmAccount.getAddress(),
      tonAddress: await this.tonAccount.getAddress(),
      btcAddress: await this.btcAccount.getAddress()
    };
  }

  async getBalances() {
    if (!this.evmAccount || !this.tonAccount || !this.btcAccount) return null;

    let evmBalance = '0.0000';
    let tonBalance = '0.0000';
    let btcBalance = '0.00000000';

    try {
      const evmBalanceWei = await this.evmAccount.getBalance();
      // formatUnits returns a full-precision string — round to 6 dp for display
      const evmFull = formatUnits(evmBalanceWei.toString(), 18);
      evmBalance = parseFloat(evmFull).toFixed(6);
    } catch (e) {
      console.error('[WDK/EVM] Balance Error:', e);
    }

    try {
      const tonBalanceNano = await this.tonAccount.getBalance();
      tonBalance = (Number(tonBalanceNano) / 1e9).toFixed(4);
    } catch (e) {
      console.error('[WDK/TON] Balance Error:', e);
    }

    try {
      // getBalance() returns confirmed balance as bigint in satoshis.
      // Use string arithmetic to avoid Number precision loss on large values.
      const btcBalanceSats: bigint = await this.btcAccount.getBalance();
      const sats = btcBalanceSats >= 0n ? btcBalanceSats : 0n;
      // Convert satoshis → BTC: divide integer part and fractional part separately
      const wholeBtc = sats / 100_000_000n;
      const remainSats = sats % 100_000_000n;
      btcBalance = `${wholeBtc}.${remainSats.toString().padStart(8, '0')}`;
    } catch (e) {
      console.error('[WDK/BTC] Balance Error (Electrum connection required):', e);
      // BTC balance stays at 0 — Electrum WS may not be connected yet
    }

    return { evmBalance, tonBalance, btcBalance };
  }

  // ── 3. ACCOUNT MANAGEMENT ─────────────────────────────────────────────────
  // Per WDK docs: getTransactionReceipt(hash) — returns receipt or null

  async getEvmTransactionReceipt(hash: string): Promise<any | null> {
    if (!this.evmAccount) return null;
    try {
      return await this.evmAccount.getTransactionReceipt(hash);
    } catch (e) {
      console.error('[WDK/EVM] getTransactionReceipt error:', e);
      return null;
    }
  }

  async getTonTransactionReceipt(hash: string): Promise<any | null> {
    if (!this.tonAccount) return null;
    try {
      return await this.tonAccount.getTransactionReceipt(hash);
    } catch (e) {
      console.error('[WDK/TON] getTransactionReceipt error:', e);
      return null;
    }
  }

  // EVM ERC-20 token balance — per WDK docs: account.getTokenBalance(tokenAddress)
  async getErc20TokenBalance(tokenAddress: string): Promise<string> {
    if (!this.evmAccount) return '0';
    try {
      const bal: bigint = await this.evmAccount.getTokenBalance(tokenAddress);
      return formatUnits(bal.toString(), 6); // Default 6 decimals (USDT/USDC)
    } catch (e) {
      console.error('[WDK/EVM] getTokenBalance error:', e);
      return '0';
    }
  }

  // TON Jetton balance — per WDK docs: account.getTokenBalance(jettonMasterAddress)
  async getJettonBalance(jettonMasterAddress: string): Promise<string> {
    if (!this.tonAccount) return '0';
    try {
      const bal: bigint = await this.tonAccount.getTokenBalance(jettonMasterAddress);
      return (Number(bal) / 1e9).toFixed(4);
    } catch (e) {
      console.error('[WDK/TON] getTokenBalance error:', e);
      return '0';
    }
  }

  // Fetch BTC transfer history natively via WDK getTransfers()
  async getBtcTransfers(limit = 20): Promise<any[]> {
    if (!this.btcAccount) return [];
    try {
      // Per WDK docs: getTransfers({ direction: 'all', limit })
      // Returns BtcTransfer[]: { txid, address, vout, height, value: bigint, direction, fee?, recipient? }
      const transfers = await this.btcAccount.getTransfers({ direction: 'all', limit });
      return transfers;
    } catch (e) {
      console.error('BTC getTransfers error (requires Electrum connection):', e);
      return [];
    }
  }

  // ── 4. SEND TRANSACTIONS ─────────────────────────────────────────────────
  // Per WDK docs: sendTransaction() + quoteSendTransaction() for fee preview

  // Estimate EVM fee without broadcasting — per docs: quoteSendTransaction(tx) => { fee: bigint }
  async quoteSendEvmTransaction(toAddress: string, amount: string): Promise<{ feeBigInt: bigint; feeEth: string } | null> {
    if (!this.evmAccount) return null;
    try {
      const amountWei = ethers.parseEther(amount);
      const { fee } = await this.evmAccount.quoteSendTransaction({ to: toAddress, value: amountWei });
      return { feeBigInt: fee, feeEth: formatUnits(fee.toString(), 18) };
    } catch (e) {
      console.error('[WDK/EVM] quoteSendTransaction error:', e);
      return null;
    }
  }

  // Estimate EVM ERC-20 token fee without broadcasting — per docs: quoteTransfer({ token, recipient, amount })
  async quoteSendErc20Transaction(toAddress: string, amount: string, tokenAddress: string, decimals = 6): Promise<{ feeBigInt: bigint; feeEth: string } | null> {
    if (!this.evmAccount) return null;
    try {
      const amountUnits = ethers.parseUnits(amount, decimals);
      const { fee } = await this.evmAccount.quoteTransfer({ recipient: toAddress, amount: amountUnits, token: tokenAddress });
      return { feeBigInt: fee, feeEth: formatUnits(fee.toString(), 18) };
    } catch (e) {
      console.error('[WDK/EVM] quoteSendErc20Transaction error:', e);
      return null;
    }
  }

  // Send EVM transaction (ETH/Polygon) — per WDK docs: sendTransaction({ to, value }) => { hash, fee }
  async sendEvmTransaction(toAddress: string, amount: string): Promise<{ success: boolean; txHash?: string; fee?: string; error?: string }> {
    if (!this.evmAccount) {
      return { success: false, error: 'EVM wallet not initialized' };
    }
    try {
      const amountWei = ethers.parseEther(amount);
      // Per docs: returns { hash: string, fee: bigint }
      const result = await this.evmAccount.sendTransaction({ to: toAddress, value: amountWei });
      return {
        success: true,
        txHash: result.hash,
        fee: formatUnits(result.fee.toString(), 18)
      };
    } catch (error: any) {
      return { success: false, error: wdkErrorMessage(error, 'EVM') };
    }
  }

  // Send EVM ERC-20 token transaction (USDT/USDC) — per WDK docs: transfer({ token, recipient, amount })
  async sendErc20Transaction(toAddress: string, amount: string, tokenAddress: string, decimals = 6): Promise<{ success: boolean; txHash?: string; fee?: string; error?: string }> {
    if (!this.evmAccount) {
      return { success: false, error: 'EVM wallet not initialized' };
    }
    try {
      const amountUnits = ethers.parseUnits(amount, decimals);
      const result = await this.evmAccount.transfer({ recipient: toAddress, amount: amountUnits, token: tokenAddress });
      return {
        success: true,
        txHash: result.hash,
        fee: formatUnits(result.fee.toString(), 18)
      };
    } catch (error: any) {
      return { success: false, error: wdkErrorMessage(error, 'EVM Token') };
    }
  }

  // Estimate TON fee without broadcasting — per docs: quoteSendTransaction(tx) => { fee: bigint }
  async quoteSendTonTransaction(toAddress: string, amount: string, comment?: string): Promise<{ feeBigInt: bigint; feeTon: string } | null> {
    if (!this.tonAccount) return null;
    try {
      const amountNano = BigInt(Math.floor(parseFloat(amount) * 1e9));
      const { fee } = await this.tonAccount.quoteSendTransaction({
        to: toAddress,
        value: amountNano,
        body: comment || undefined
      });
      return { feeBigInt: fee, feeTon: (Number(fee) / 1e9).toFixed(6) };
    } catch (e) {
      console.error('[WDK/TON] quoteSendTransaction error:', e);
      return null;
    }
  }

  // Send TON transaction — per WDK docs: { to, value, bounceable?, body? } => { hash, fee }
  async sendTonTransaction(toAddress: string, amount: string, comment?: string): Promise<{ success: boolean; txHash?: string; fee?: string; error?: string }> {
    if (!this.tonAccount) {
      return { success: false, error: 'TON wallet not initialized' };
    }
    try {
      const amountNano = BigInt(Math.floor(parseFloat(amount) * 1e9));
      // Per WDK TON docs: bounceable is an optional flag for non-wallet contracts
      const result = await this.tonAccount.sendTransaction({
        to: toAddress,
        value: amountNano,
        body: comment || undefined
        // bounceable: omitted — WDK handles this automatically for standard wallets
      });
      return { success: true, txHash: result.hash, fee: (Number(result.fee) / 1e9).toFixed(6) };
    } catch (error: any) {
      return { success: false, error: wdkErrorMessage(error, 'TON') };
    }
  }

  // Estimate BTC fee without broadcasting — per docs: quoteSendTransaction({ to, value }) => { fee: bigint }
  async quoteSendBtcTransaction(toAddress: string, amount: string): Promise<{ feeBigInt: bigint; feeBtc: string } | null> {
    if (!this.btcAccount) return null;
    try {
      const amountSats = Math.round(parseFloat(amount) * 1e8);
      const { fee } = await this.btcAccount.quoteSendTransaction({ to: toAddress, value: amountSats });
      return { feeBigInt: fee, feeBtc: (Number(fee) / 1e8).toFixed(8) };
    } catch (e) {
      console.error('[WDK/BTC] quoteSendTransaction error:', e);
      return null;
    }
  }

  // Send BTC transaction — per WDK docs: { to, value } in satoshis => { hash, fee }
  async sendBtcTransaction(toAddress: string, amount: string): Promise<{ success: boolean; txHash?: string; fee?: string; error?: string }> {
    if (!this.btcAccount) {
      return { success: false, error: 'BTC wallet not initialized. Ensure the multi-chain wallet is unlocked.' };
    }
    try {
      const amountSats = Math.round(parseFloat(amount) * 1e8);
      // Per WDK docs: SegWit dust limit = 294 sats
      if (amountSats < 294) {
        return { success: false, error: 'Amount too small. Minimum is 294 satoshis (SegWit dust limit).' };
      }
      // WDK returns { hash: string, fee: bigint }
      const result = await this.btcAccount.sendTransaction({ to: toAddress, value: amountSats });
      return { success: true, txHash: result.hash, fee: (Number(result.fee) / 1e8).toFixed(8) };
    } catch (error: any) {
      return { success: false, error: wdkErrorMessage(error, 'BTC') };
    }
  }

  // ── 5. PROTOCOL INTEGRATION ──────────────────────────────────────────────
  // (Swap / Bridge / Lending — requires @tetherto/wdk + registerProtocol)
  // These are accessed via account.getSwapProtocol(label) etc.
  // Scaffold for future use — no protocol modules currently registered.
  // To add swap: wdk.registerProtocol('ethereum', 'uniswap', SwapProtocol, config)

  // ── 6. MIDDLEWARE (Dev logging) ───────────────────────────────────────────
  // Per WDK docs: registerMiddleware(blockchain, async (account) => { ... })
  // We implement a lightweight logging wrapper at the service level instead
  // since we use standalone managers (not the core WDK orchestrator).
  private logOperation(chain: string, op: string, detail?: string) {
    if (import.meta.env.DEV) {
      console.log(`[WDK/${chain}] ${op}${detail ? ': ' + detail : ''}`);
    }
  }



  logout() {
    // Per WDK docs: call dispose() to erase private keys from memory
    try { this.evmManager?.dispose(); } catch (_) {}
    try { this.tonManager?.dispose(); } catch (_) {}
    try { this.btcManager?.dispose(); } catch (_) {}
    this.evmManager  = null;
    this.tonManager  = null;
    this.btcManager  = null;
    this.evmAccount  = null;
    this.tonAccount  = null;
    this.btcAccount  = null;
    this.mnemonic    = null;
  }

  deleteWallet() {
    this.logout();
    localStorage.removeItem(SECONDARY_WALLET_KEY);
    localStorage.removeItem(SECONDARY_WALLET_ENC_KEY);
  }
}

export const tetherWdkService = new TetherWdkService();
