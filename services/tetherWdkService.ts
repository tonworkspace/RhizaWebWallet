import WalletManagerEvm from '@tetherto/wdk-wallet-evm';
import WalletManagerTon from '@tetherto/wdk-wallet-ton';
import WalletManagerBtc from '@tetherto/wdk-wallet-btc';
import WalletManagerSolana from '@tetherto/wdk-wallet-solana';
import WalletManagerTron from '@tetherto/wdk-wallet-tron';
import { ethers, formatUnits } from 'ethers';
import { encryptMnemonic, decryptMnemonic } from '../utils/encryption';
import { getNetworkConfig, NetworkType } from '../constants';
import { sanitizeComment } from '../utils/sanitization';

// ─────────────────────────────────────────────────────────────────────────────
// WDK Configuration Constants
// Per official WDK docs: https://docs.wdk.tether.io/sdk/wallet-modules/wallet-ton/configuration
//
// Strategy:
//  1. WDK TON Manager is initialized with a native { url, secretKey } V3 config.
//     This lets WDK create its own internal TonClient pointed at V3.
//  2. We ALSO create a parallel TonClient (V2 jsonRPC) solely for getSeqno/
//     getBalance fallback reads (TonClient.getContractState is not V3-native).
//  3. For BROADCASTING, we bypass both TonClient.sendFile (which hits the V2
//     sendBoc endpoint and may 404) and instead POST the BOC directly to the
//     TonCenter V3 /message endpoint via fetch.
// ─────────────────────────────────────────────────────────────────────────────
const TONCENTER_V3_MAINNET = 'https://toncenter.com/api/v3';
const TONCENTER_V3_TESTNET = 'https://testnet.toncenter.com/api/v3';
// V2 jsonRPC: still used by the standalone TonClient for getContractState, getSeqno, estimateFee
const TONCENTER_V2_MAINNET = 'https://toncenter.com/api/v2/jsonRPC';
const TONCENTER_V2_TESTNET = 'https://testnet.toncenter.com/api/v2/jsonRPC';
const POLYGON_RPC_MAINNET = 'https://polygon-rpc.com/';
const POLYGON_RPC_TESTNET = 'https://rpc-mumbai.maticvigil.com/';
const ELECTRUM_WSS_MAINNET = 'wss://electrum.blockstream.info:50004';
const ELECTRUM_WSS_TESTNET = 'wss://electrum.blockstream.info:60004';

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
  solAddress: string;
  tronAddress: string;
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
  if (msg.includes('404') || msg.includes('Not Found'))
    return `${chain} API endpoint not found. The service may be temporarily unavailable.`;
  if (msg.includes('405') || msg.includes('Method Not Allowed'))
    return `${chain} API configuration error. Please contact support.`;
  if (msg.includes('500') || msg.includes('Internal Server Error'))
    return `${chain} network is temporarily unavailable. Please try again in a few moments.`;
  if (msg.includes('503') || msg.includes('Service Unavailable'))
    return `${chain} network is under maintenance. Please try again later.`;
  if (msg.includes('429') || msg.includes('Too Many Requests'))
    return 'Rate limit exceeded. Please wait a moment and try again.';
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
  private solManager: any = null;
  private tronManager: any = null;
  private evmAccount: any = null;
  private tonAccount: any = null;
  private btcAccount: any = null;
  private solAccount: any = null;
  private tronAccount: any = null;
  private mnemonic: string | null = null;
  private currentNetwork: NetworkType = 'mainnet';
  private currentEvmChain: EvmChain = 'polygon';

  // Native @ton/ton TonClient (V2 jsonRPC) — used for read operations (getSeqno, estimateFee)
  private nativeTonClient: any = null;
  // Opened contract for read operations
  private nativeTonContract: any = null;
  // Key pair from WDK account (BIP44 m/44'/607'/0')
  private nativeTonKeyPair: any = null;
  // V3 endpoint + API key for direct BOC broadcasting
  private tonV3Endpoint: string = TONCENTER_V3_MAINNET;
  private tonApiKey: string | undefined = undefined;

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

        try { this.evmManager.dispose(); } catch (_) { }

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

  // Generate a new BIP39 mnemonic — 12 words (128-bit entropy) or 24 words (256-bit entropy)
  // Uses crypto.getRandomValues for CSPRNG-quality entropy, then maps through ethers.Mnemonic.
  generateMnemonic(wordCount: 12 | 24 = 12): string {
    const entropyLength = wordCount === 24 ? 32 : 16; // 32 bytes → 256 bits → 24 words
    const entropy = new Uint8Array(entropyLength);
    crypto.getRandomValues(entropy);
    return ethers.Mnemonic.fromEntropy(entropy).phrase;
  }

  // Initialize EVM, TON and BTC wallet managers from a seed phrase
  async initializeManagers(seedPhrase: string) {
    if (!seedPhrase) throw new Error('Seed phrase is required');

    const config = getNetworkConfig(this.currentNetwork);
    const isMainnet = this.currentNetwork === 'mainnet';

    try {
      // ── EVM ──────────────────────────────────────────────────────────────────
      try {
        const evmProviderUrl = isMainnet ? EVM_RPC_URLS[this.currentEvmChain] : EVM_RPC_URLS.sepolia;
        this.evmManager = new WalletManagerEvm(seedPhrase, {
          provider: evmProviderUrl,
          transferMaxFee: EVM_MAX_FEE_WEI
        });
        this.evmAccount = await this.evmManager.getAccount(0);
        console.log('[WDK/EVM] Initialized');
      } catch (evmErr) {
        console.error('[WDK/EVM] Init failed:', evmErr);
      }

      // ── TON ──────────────────────────────────────────────────────────────────
      try {
        // WDK TON Manager initialization strategy:
        //
        // 1. We pass a native { url, secretKey } V3 config to WDK so it initializes
        //    its internal client correctly for read operations (getBalance, getSeqno).
        //
        // 2. In PARALLEL, we also create a standalone TonClient (V2 jsonRPC) for
        //    precise low-level operations (getContractState, estimateExternalMessageFee)
        //    that @ton/ton's TonClient handles well via its JSONRPC protocol.
        //
        // 3. For BROADCASTING, we call the TonCenter V3 REST POST /message endpoint
        //    directly via fetch, completely bypassing TonClient.sendFile. This avoids
        //    the 404/405 errors that arise when the V2 sendBoc method is unavailable.
        const { TonClient } = await import('@ton/ton');
        const v3Url = isMainnet ? TONCENTER_V3_MAINNET : TONCENTER_V3_TESTNET;
        const v2Url = isMainnet ? TONCENTER_V2_MAINNET : TONCENTER_V2_TESTNET;
        const apiKey = config.API_KEY || undefined;

        // Store V3 endpoint for direct BOC broadcasting
        this.tonV3Endpoint = v3Url;
        this.tonApiKey = apiKey;

        console.log('[WDK/TON] Initializing with TonCenter V3 config:', {
          v3Endpoint: v3Url,
          v2Endpoint: v2Url,
          hasApiKey: !!apiKey,
          network: isMainnet ? 'mainnet' : 'testnet'
        });

        // Standalone V2 TonClient for read ops (getSeqno, estimateFee, getContractState)
        const v2TonClient = new TonClient({ endpoint: v2Url, apiKey });
        this.nativeTonClient = v2TonClient;

        // Initialize WDK TON Manager with V3 native config
        this.tonManager = new WalletManagerTon(seedPhrase, {
          tonClient: { url: v3Url, secretKey: apiKey } as any,
          transferMaxFee: TON_MAX_FEE_NANO
        });
        this.tonAccount = await this.tonManager.getAccount(0);

        // ── EXTRACT KEY PAIR + OPEN CONTRACT VIA V2 CLIENT ──────────────────
        // WDK stores the keyPair as _keyPair on the account instance.
        // The wallet contract (_wallet) is a WalletContractV5R1.
        // We open it with our standalone V2 TonClient for reliable read access.
        const acc = this.tonAccount as any;
        const internalKeyPair = acc._keyPair;
        const internalWallet = acc._wallet; // WalletContractV5R1 (unopened)

        if (internalKeyPair && internalWallet) {
          // Open the WDK's V5R1 wallet with our V2 TonClient for seqno/fee reads
          this.nativeTonContract = v2TonClient.open(internalWallet);
          this.nativeTonKeyPair = internalKeyPair;
          console.log('[WDK/TON] Opened WDK V5R1 wallet with V2 TonClient for read ops ✅');
        } else {
          // Fallback: derive V5R1 from seed manually
          console.warn('[WDK/TON] WDK _wallet/_keyPair not accessible, using BIP-44 derivation fallback');
          try {
            const { mnemonicToWalletKey } = await import('@ton/crypto');
            const tonModule = await import('@ton/ton') as any;
            const WalletContractV5R1 = tonModule.WalletContractV5R1;

            if (WalletContractV5R1) {
              this.nativeTonKeyPair = await mnemonicToWalletKey(seedPhrase.split(' '));
              this.nativeTonContract = v2TonClient.open(
                WalletContractV5R1.create({ workchain: 0, publicKey: this.nativeTonKeyPair.publicKey })
              );
              console.log('[WDK/TON] Initialized via @ton/ton mnemonicToWalletKey V5R1 fallback ✅');
            } else {
              console.warn('[WDK/TON] WalletContractV5R1 not found in @ton/ton — send will fail');
            }
          } catch (e) {
          }
        }

        // Validation
        if (this.nativeTonContract) {
          try { await this.nativeTonContract.getSeqno(); } catch (e) { console.warn('[WDK/TON] Seqno check failed:', e); }
        }

        console.log('[WDK/TON] Initialization complete');
      } catch (tonErr: any) {
        console.error('[WDK/TON] Init failed:', tonErr);
        // TON is core for Rhiza
        throw new Error(`Critical: TON Initialization failed. ${tonErr?.message || 'Unknown error'}`);
      }

      // ── BTC ──────────────────────────────────────────────────────────────────
      try {
        const btcNetwork = isMainnet ? 'bitcoin' : 'testnet';
        let btcClient: any = null;
        try {
          const { ElectrumWs } = await import('@tetherto/wdk-wallet-btc');
          btcClient = new ElectrumWs({
            url: isMainnet ? ELECTRUM_WSS_MAINNET : ELECTRUM_WSS_TESTNET
          });
        } catch (wsErr) {
          console.warn('[WDK/BTC] Electrum setup failed, continuing in offline mode');
        }

        const btcConfig: any = { network: btcNetwork };
        if (btcClient) btcConfig.client = btcClient;

        this.btcManager = new WalletManagerBtc(seedPhrase, btcConfig);
        this.btcAccount = await this.btcManager.getAccount(0);
        console.log('[WDK/BTC] Initialized');
      } catch (btcErr) {
        console.error('[WDK/BTC] Init failed:', btcErr);
      }

      // ── Solana ────────────────────────────────────────────────────────────────
      try {
        this.solManager = new WalletManagerSolana(seedPhrase, {
          rpcUrl: isMainnet ? 'https://api.mainnet-beta.solana.com' : 'https://api.devnet.solana.com',
          transferMaxFee: 10000000
        });
        this.solAccount = await this.solManager.getAccount(0);
        console.log('[WDK/SOL] Initialized');
      } catch (solErr) {
        console.error('[WDK/SOL] Init failed:', solErr);
      }

      // ── Tron ──────────────────────────────────────────────────────────────────
      try {
        this.tronManager = new WalletManagerTron(seedPhrase, {
          provider: isMainnet ? 'https://api.trongrid.io' : 'https://api.shasta.trongrid.io',
          transferMaxFee: 100000000
        });
        this.tronAccount = await this.tronManager.getAccount(0);
        console.log('[WDK/TRON] Initialized');
      } catch (tronErr) {
        console.error('[WDK/TRON] Init failed:', tronErr);
      }

      this.mnemonic = seedPhrase;

      // Safe TON Address Generation
      let formattedTonAddress = '';
      if (this.tonAccount) {
        try {
          const rawTonAddress = await this.tonAccount.getAddress();
          try {
            const { Address } = await import('@ton/ton');
            formattedTonAddress = Address.parse(rawTonAddress).toString({
              bounceable: false,
              testOnly: !isMainnet
            });
          } catch (e) {
            formattedTonAddress = rawTonAddress;
          }
        } catch (e) {
          console.error('[WDK/TON] Address fetch failed');
        }
      }

      return {
        evmAddress: this.evmAccount ? await this.evmAccount.getAddress() : '',
        tonAddress: formattedTonAddress,
        btcAddress: this.btcAccount ? await this.btcAccount.getAddress() : '',
        solAddress: this.solAccount ? await this.solAccount.getAddress() : '',
        tronAddress: this.tronAccount ? await this.tronAccount.getAddress() : '',
      };
    } catch (error) {
      console.error('[WDK] Multi-chain initialization fatal error:', error);
      throw error;
    }
  }

  /** True if all core chain managers are up */
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

    let formattedTonAddress = '';
    try {
      const rawTonAddress = await this.tonAccount.getAddress();
      const { Address } = await import('@ton/ton');
      formattedTonAddress = Address.parse(rawTonAddress).toString({
        bounceable: false,
        testOnly: this.currentNetwork === 'testnet'
      });
    } catch (e) {
      formattedTonAddress = await this.tonAccount.getAddress();
    }

    return {
      evmAddress: await this.evmAccount.getAddress(),
      tonAddress: formattedTonAddress,
      btcAddress: await this.btcAccount.getAddress(),
      solAddress: this.solAccount ? await this.solAccount.getAddress() : '',
      tronAddress: this.tronAccount ? await this.tronAccount.getAddress() : '',
    };
  }

  async getBalances() {
    if (!this.evmAccount || !this.tonAccount || !this.btcAccount) return null;

    let evmBalance = '0.0000';
    let tonBalance = '0.0000';
    let btcBalance = '0.00000000';
    let solBalance = '0.000000000';
    let tronBalance = '0.000000';

    try {
      const evmBalanceWei = await this.evmAccount.getBalance();
      const evmFull = formatUnits(evmBalanceWei.toString(), 18);
      evmBalance = parseFloat(evmFull).toFixed(6);
    } catch (e) { console.error('[WDK/EVM] Balance Error:', e); }

    try {
      const tonBalanceNano = await this.tonAccount.getBalance();
      tonBalance = (Number(tonBalanceNano) / 1e9).toFixed(4);
    } catch (e) {
      console.error('[WDK/TON] Balance Error, attempting fallbacks:', e);
      try {
        const addr = await this.tonAccount.getAddress();

        // Fallback 1: Try using the app's established tonWalletService
        const { tonWalletService } = await import('./tonWalletService');
        const fallbackRes = await tonWalletService.getBalanceByAddress(addr);
        if (fallbackRes.success) {
          tonBalance = fallbackRes.balance.toString();
        } else {
          // Fallback 2: Direct API fetch to Toncenter V3 as final attempt
          const config = getNetworkConfig(this.currentNetwork);
          const v3Endpoint = this.currentNetwork === 'mainnet'
            ? 'https://toncenter.com/api/v3'
            : 'https://testnet.toncenter.com/api/v3';

          const fetchHeaders = config.API_KEY ? { 'x-api-key': config.API_KEY } : {};
          const res = await fetch(`${v3Endpoint}/account?address=${addr}`, { headers: fetchHeaders });

          if (res.ok) {
            const data = await res.json();
            if (data && data.balance !== undefined) {
              tonBalance = (Number(data.balance) / 1e9).toFixed(4);
            }
          }
        }
      } catch (fallbackErr) {
        console.error('[WDK/TON] All Balance fallbacks failed:', fallbackErr);
      }
    }

    try {
      const btcBalanceSats: bigint = await this.btcAccount.getBalance();
      const sats = btcBalanceSats >= 0n ? btcBalanceSats : 0n;
      const wholeBtc = sats / 100_000_000n;
      const remainSats = sats % 100_000_000n;
      btcBalance = `${wholeBtc}.${remainSats.toString().padStart(8, '0')}`;
    } catch (e) { console.error('[WDK/BTC] Balance Error:', e); }

    if (this.solAccount) {
      try {
        const lamports: bigint = await this.solAccount.getBalance();
        solBalance = (Number(lamports) / 1e9).toFixed(9);
      } catch (e) { console.error('[WDK/SOL] Balance Error:', e); }
    }

    if (this.tronAccount) {
      try {
        // TRX balance returned in sun (1 TRX = 1,000,000 sun)
        const sun: bigint = await this.tronAccount.getBalance();
        tronBalance = (Number(sun) / 1_000_000).toFixed(6);
      } catch (e) { console.error('[WDK/TRON] Balance Error:', e); }
    }

    return { evmBalance, tonBalance, btcBalance, solBalance, tronBalance };
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
  async getErc20TokenBalance(tokenAddress: string, decimals = 6): Promise<string> {
    if (!this.evmAccount) return '0';
    try {
      const bal: bigint = await this.evmAccount.getTokenBalance(tokenAddress);
      return formatUnits(bal.toString(), decimals);
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
    const contract = this.nativeTonContract || (this.tonAccount as any)?._contract;
    const keyPair = this.nativeTonKeyPair || (this.tonAccount as any)?._keyPair;

    if (!contract || !keyPair) return null;

    try {
      const amountNano = BigInt(Math.floor(parseFloat(amount) * 1e9));
      const { Address, internal } = await import('@ton/ton');

      const transfer = contract.createTransfer({
        seqno: await contract.getSeqno(),
        secretKey: keyPair.secretKey,
        messages: [
          internal({
            to: Address.parse(toAddress),
            value: amountNano,
            body: comment || undefined,
            bounce: false,
          }),
        ],
      });

      // estimateFee is available on OpenedContract
      const fee = await contract.estimateFee(transfer);
      return { feeBigInt: fee, feeTon: (Number(fee) / 1e9).toFixed(6) };
    } catch (e) {
      console.error('[WDK/TON] quoteSendTransaction error:', e);
      return null;
    }
  }

  // ── PRIVATE: Broadcast a signed BOC directly to TonCenter V3 /message ──────
  // Bypasses TonClient.sendFile (V2 jsonRPC sendBoc) — uses correct V3 REST POST.
  private async broadcastBocV3(bocBase64: string): Promise<void> {
    const url = `${this.tonV3Endpoint}/message`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.tonApiKey) headers['X-API-Key'] = this.tonApiKey;

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ boc: bocBase64 }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`TonCenter V3 broadcast failed (${res.status}): ${text}`);
    }
  }

  // Send TON transaction — signs locally, wraps in External Message, broadcasts via V3
  async sendTonTransaction(toAddress: string, amount: string, comment?: string): Promise<{ success: boolean; txHash?: string; fee?: string; error?: string }> {
    if (!this.tonAccount) {
      return { success: false, error: 'TON wallet not initialized' };
    }

    try {
      const amountNano = BigInt(Math.floor(parseFloat(amount) * 1e9));

      const safeComment = comment ? sanitizeComment(comment) : '';
      const networkTag = `[${this.currentNetwork}]`;
      const fullComment = safeComment ? `${networkTag} ${safeComment}` : networkTag;

      const acc = this.tonAccount as any;
      const secretKey = acc._keyPair?.secretKey ?? acc.keyPair?.secretKey;
      if (!secretKey) throw new Error('WDK Memory Lock: Cannot extract signing key.');

      // Import core TON primitives for building the message envelope.
      // WalletContractV5R1 is NOT exported by @ton/ton v13.x — it lives inside
      // the WDK's own bundled dependency. We reuse the WDK's already-constructed
      // _wallet instance (guaranteed correct address/init) and open it with
      // nativeTonClient for reliable seqno reads.
      const { internal, external, beginCell, storeMessage, Address } = await import('@ton/ton');

      const internalWallet = acc._wallet;
      if (!internalWallet) throw new Error('WDK wallet contract not accessible. Try reloading.');
      const contract = this.nativeTonClient.open(internalWallet);

      let recipientAddr: any;
      try {
        recipientAddr = Address.parse(toAddress);
      } catch {
        return { success: false, error: 'Invalid recipient address' };
      }

      const seqno = await contract.getSeqno();
      console.log(`[RhizaCore/TON] Seqno: ${seqno}, wrapping payload for V3 broadcast...`);

      // 1. Create the signed payload (body Cell only)
      const transfer = contract.createTransfer({
        seqno,
        secretKey: Buffer.from(secretKey),
        messages: [
          internal({
            to: recipientAddr,
            value: amountNano,
            body: fullComment || undefined,
            bounce: false,
          }),
        ],
      });

      // 2. Wrap in a standard TON External Message Envelope.
      //    If seqno is 0 the wallet hasn’t been deployed yet — include StateInit
      //    so TonCenter deploys the contract code on this first transaction.
      const extMessage = beginCell()
        .storeWritable(storeMessage(external({
          to: internalWallet.address,
          init: seqno === 0 ? internalWallet.init : undefined,
          body: transfer,
        })))
        .endCell();

      // 3. Compute real tx hash and broadcast the ENVELOPE
      const txHash = extMessage.hash().toString('hex');
      const bocBase64 = extMessage.toBoc().toString('base64');

      await this.broadcastBocV3(bocBase64);
      console.log(`[RhizaCore/TON] BOC broadcast to V3 /message ✅ hash:`, txHash);

      // Wait for seqno to advance (confirms on-chain inclusion)
      let currentSeqno = seqno;
      let attempts = 0;
      while (currentSeqno === seqno && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        try { currentSeqno = await contract.getSeqno(); } catch { break; }
        attempts++;
      }

      return { success: true, txHash, fee: '0.005000' };

    } catch (error: any) {
      console.error('[RhizaCore/TON] Send failed:', error);
      return { success: false, error: error.message || 'Unknown network error' };
    }
  }
  /**
   * Send TON to multiple recipients in a single W5R1 batch transaction.
   * Wraps the payload in an External Message for V3 broadcasting.
   * W5R1 supports up to 255 messages per batch.
   */
  async sendTonMultiTransaction(
    recipients: Array<{ address: string; amount: string; comment?: string }>
  ): Promise<{ success: boolean; txHash?: string; fee?: string; error?: string }> {
    if (!this.tonAccount) {
      return { success: false, error: 'TON wallet not initialized' };
    }

    try {
      const acc = this.tonAccount as any;
      const secretKey = acc._keyPair?.secretKey ?? acc.keyPair?.secretKey;
      const publicKey = acc._keyPair?.publicKey ?? acc.keyPair?.publicKey;

      if (!secretKey || !publicKey) {
        throw new Error('WDK Memory Lock: Cannot extract signing keys.');
      }

      const networkTag = `[${this.currentNetwork}]`;
      // WalletContractV5R1 is not in @ton/ton v13.x — reuse the WDK's _wallet instance.
      const { internal, external, beginCell, storeMessage, Address } = await import('@ton/ton');

      const internalWallet = (this.tonAccount as any)._wallet;
      if (!internalWallet) throw new Error('WDK wallet contract not accessible. Try reloading.');
      const contract = this.nativeTonClient.open(internalWallet);

      const messages = recipients.map(({ address, amount, comment }) => {
        const safeComment = comment ? sanitizeComment(comment) : '';
        const fullComment = safeComment ? `${networkTag} ${safeComment}` : networkTag;

        return internal({
          to: Address.parse(address),
          value: BigInt(Math.floor(parseFloat(amount) * 1e9)),
          body: fullComment || undefined,
          bounce: false
        });
      });

      const seqno = await contract.getSeqno();

      // 1. Create Payload (signed body Cell only)
      const transfer = contract.createTransfer({
        secretKey: Buffer.from(secretKey),
        messages,
        seqno,
      });

      // 2. Wrap in External Message Envelope (include StateInit if first tx)
      const extMessage = beginCell()
        .storeWritable(storeMessage(external({
          to: internalWallet.address,
          init: seqno === 0 ? internalWallet.init : undefined,
          body: transfer,
        })))
        .endCell();

      // 3. Compute hash and Broadcast
      const txHash = extMessage.hash().toString('hex');
      const bocBase64 = extMessage.toBoc().toString('base64');

      await this.broadcastBocV3(bocBase64);
      console.log(`[RhizaCore/TON] Multi-send BOC broadcast to V3 /message ✅ hash:`, txHash);

      // Confirmation Logic: Wait up to 30 seconds for seqno to change
      let currentSeqno = seqno;
      let attempts = 0;
      while (currentSeqno === seqno && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        try { currentSeqno = await contract.getSeqno(); } catch (_) { break; }
        attempts++;
      }

      this.logOperation('TON', 'sendMulti', `${recipients.length} recipients, seqno=${seqno}, hash=${txHash}`);
      return { success: true, txHash };

    } catch (error: any) {
      console.error('[RhizaCore/TON] Multi-send failed:', error);
      return { success: false, error: error.message || 'Unknown network error' };
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

  // ── SOL transactions ──────────────────────────────────────────────────────
  async quoteSendSolTransaction(toAddress: string, amount: string): Promise<{ feeLamports: bigint; feeSol: string } | null> {
    if (!this.solAccount) return null;
    try {
      const lamports = Math.round(parseFloat(amount) * 1e9); // number, not BigInt — per WDK SOL docs
      const { fee } = await this.solAccount.quoteSendTransaction({ to: toAddress, value: lamports });
      return { feeLamports: fee, feeSol: (Number(fee) / 1e9).toFixed(9) };
    } catch (e) {
      console.error('[WDK/SOL] quoteSendTransaction error:', e);
      return null;
    }
  }

  async sendSolTransaction(toAddress: string, amount: string): Promise<{ success: boolean; txHash?: string; fee?: string; error?: string }> {
    if (!this.solAccount) return { success: false, error: 'Solana wallet not initialized' };
    try {
      const lamports = Math.round(parseFloat(amount) * 1e9); // number, not BigInt — per WDK SOL docs
      const result = await this.solAccount.sendTransaction({ to: toAddress, value: lamports });
      return { success: true, txHash: result.hash, fee: (Number(result.fee) / 1e9).toFixed(9) };
    } catch (error: any) {
      return { success: false, error: wdkErrorMessage(error, 'SOL') };
    }
  }

  // ── TRON transactions ─────────────────────────────────────────────────────
  async quoteSendTronTransaction(toAddress: string, amount: string): Promise<{ feeSun: bigint; feeTrx: string } | null> {
    if (!this.tronAccount) return null;
    try {
      const sun = BigInt(Math.round(parseFloat(amount) * 1_000_000));
      const { fee } = await this.tronAccount.quoteSendTransaction({ to: toAddress, value: sun });
      return { feeSun: fee, feeTrx: (Number(fee) / 1_000_000).toFixed(6) };
    } catch (e) {
      console.error('[WDK/TRON] quoteSendTransaction error:', e);
      return null;
    }
  }

  async sendTronTransaction(toAddress: string, amount: string): Promise<{ success: boolean; txHash?: string; fee?: string; error?: string }> {
    if (!this.tronAccount) return { success: false, error: 'Tron wallet not initialized' };
    try {
      const sun = BigInt(Math.round(parseFloat(amount) * 1_000_000));
      const result = await this.tronAccount.sendTransaction({ to: toAddress, value: sun });
      return { success: true, txHash: result.hash, fee: (Number(result.fee) / 1_000_000).toFixed(6) };
    } catch (error: any) {
      return { success: false, error: wdkErrorMessage(error, 'TRON') };
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
    try { this.evmManager?.dispose(); } catch (_) { }
    // dispose() triggers sodium_memzero on WDK's internal secret storage
    try { this.tonManager?.dispose(); } catch (_) { }
    try { this.btcManager?.dispose(); } catch (_) { }
    try { this.solManager?.dispose(); } catch (_) { }
    try { this.tronManager?.dispose(); } catch (_) { }
    this.evmManager = null;
    this.tonManager = null;
    this.btcManager = null;
    this.solManager = null;
    this.tronManager = null;
    this.evmAccount = null;
    this.tonAccount = null;
    this.btcAccount = null;
    this.solAccount = null;
    this.tronAccount = null;
    this.mnemonic = null;
    // Scrub native TON client references so GC can collect them
    this.nativeTonClient = null;
    this.nativeTonContract = null;
    this.nativeTonKeyPair = null;
  }

  deleteWallet() {
    this.logout();
    localStorage.removeItem(SECONDARY_WALLET_KEY);
    localStorage.removeItem(SECONDARY_WALLET_ENC_KEY);
  }
}

export const tetherWdkService = new TetherWdkService();
