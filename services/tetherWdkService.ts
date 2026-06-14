import WalletManagerEvm from '@tetherto/wdk-wallet-evm';
import WalletManagerTon from '@tetherto/wdk-wallet-ton';
import WalletManagerBtc from '@tetherto/wdk-wallet-btc';
import WalletManagerSolana from '@tetherto/wdk-wallet-solana';
import WalletManagerTron from '@tetherto/wdk-wallet-tron';
import { ethers, formatUnits } from 'ethers';
import { encryptMnemonic, decryptMnemonic } from '../utils/encryption';
import { getNetworkConfig, NetworkType } from '../constants';
import { sanitizeComment } from '../utils/sanitization';
import { NetworkFailover, EVM_RPC_FAILOVER, SOLANA_RPC_FAILOVER } from './networkFailover';
import { BalanceMonitor } from './balanceMonitor';
import { PaymentRequestGenerator, PaymentRequest, PaymentRequestOptions } from './paymentRequests';
import { getDeviceKey } from '../utils/deviceFingerprint';

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

export type EvmChain = 'ethereum' | 'polygon' | 'arbitrum' | 'bsc' | 'bsc_testnet' | 'avalanche' | 'plasma' | 'stable' | 'sepolia' | 'polygon_testnet';

export function getTargetEvmChain(chain: EvmChain, network: NetworkType): EvmChain {
  if (network === 'mainnet') {
    if (chain === 'sepolia') return 'ethereum';
    if (chain === 'polygon_testnet') return 'polygon';
    if (chain === 'bsc_testnet') return 'bsc';
    return chain;
  } else {
    if (chain === 'ethereum' || chain === 'arbitrum' || chain === 'avalanche' || chain === 'plasma' || chain === 'stable') return 'sepolia';
    if (chain === 'polygon') return 'polygon_testnet';
    if (chain === 'bsc') return 'bsc_testnet';
    return chain;
  }
}


export const EVM_RPC_URLS: Record<EvmChain, string> = {
  ethereum: 'https://eth.drpc.org',
  polygon: 'https://polygon-rpc.com',
  arbitrum: 'https://arb1.arbitrum.io/rpc',
  bsc: 'https://bsc-dataseed.binance.org',
  bsc_testnet: 'https://data-seed-prebsc-1-s1.binance.org:8545',
  avalanche: 'https://avalanche-c-chain-rpc.publicnode.com',
  plasma: 'https://plasma.drpc.org',
  stable: 'https://rpc.stable.xyz',
  sepolia: 'https://sepolia.drpc.org',
  polygon_testnet: 'https://rpc-amoy.polygon.technology'
};

export const EVM_EXPLORER_APIS: Record<EvmChain, string> = {
  ethereum: 'https://api.etherscan.io/api',
  polygon: 'https://api.polygonscan.com/api',
  arbitrum: 'https://api.arbiscan.io/api',
  bsc: 'https://api.bscscan.com/api',
  bsc_testnet: 'https://api-testnet.bscscan.com/api',
  avalanche: 'https://api.snowtrace.io/api',
  plasma: '', // unsupported API
  stable: '', // unsupported API
  sepolia: 'https://api-sepolia.etherscan.io/api',
  polygon_testnet: 'https://api-amoy.polygonscan.com/api'
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

  return `An unexpected error occurred on the ${chain} network. Please try again later.`;
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
  private currentNetwork: NetworkType = 'mainnet';

  // Native @ton/ton TonClient (V2 jsonRPC) — used for read operations (getSeqno, estimateFee)
  private nativeTonClient: any = null;
  // Opened contract for read operations
  private nativeTonContract: any = null;
  // Key pair from WDK account (BIP44 m/44'/607'/0')
  private nativeTonKeyPair: any = null;
  // V3 endpoint + API key for direct BOC broadcasting
  private tonV3Endpoint: string = TONCENTER_V3_MAINNET;
  private tonApiKey: string | undefined = undefined;

  // ── AUDIT FIX #5: Balance caching for performance ────────────────────────
  private balanceCache = new Map<string, { balance: string; timestamp: number }>();
  private readonly BALANCE_CACHE_TTL = 5_000; // 5 seconds — tightened to match balanceSyncService

  // ── NEW: Enhanced monitoring and failover ─────────────────────────────────
  private balanceMonitor = new BalanceMonitor();
  private networkHealth = new Map<string, boolean>();

  private currentEvmChain: EvmChain = 'polygon';

  constructor() {
    const network = (localStorage.getItem('rhiza_network') as NetworkType) || 'mainnet';
    this.currentNetwork = network;

    const savedChain = localStorage.getItem('rhiza_evm_chain') as EvmChain;
    if (savedChain && Object.keys(EVM_RPC_URLS).includes(savedChain)) {
      this.currentEvmChain = savedChain;
    }
  }

  getCurrentEvmChain(): EvmChain {
    return this.currentEvmChain;
  }

  /**
   * Set the network and reinitialize managers if already initialized.
   */
  async setNetwork(network: NetworkType) {
    if (this.currentNetwork === network) return;
    this.currentNetwork = network;
    
    // Only re-initialize if we've already been initialized with a wallet
    if (this.isInitialized() || this.hasStoredWallet()) {
      try {
        const storedWallet = await this.getStoredWallet();
        if (storedWallet) {
          console.log(`[WDK] Re-initializing managers for network switch to ${network}`);
          await this.initializeManagers(storedWallet);
        }
      } catch (e) {
        console.error('[WDK] Failed to reinitialize on network switch:', e);
      }
    }
  }

  /**
   * Safely gets the RPC URL arrays avoiding prototype pollution.
   */
  private getEvmRpcUrls(chain: EvmChain | string): string[] {
    const validChains: EvmChain[] = ['ethereum', 'polygon', 'arbitrum', 'bsc', 'bsc_testnet', 'avalanche', 'plasma', 'stable', 'sepolia', 'polygon_testnet'];
    if (validChains.includes(chain as EvmChain)) {
      const validChain = chain as EvmChain;
      const failover = EVM_RPC_FAILOVER as Record<EvmChain, string[] | undefined>;
      const urls = failover[validChain] || [EVM_RPC_URLS[validChain]];
      return urls;
    }
    // Fallback to ethereum if invalid chain
    return EVM_RPC_FAILOVER['ethereum'] || [EVM_RPC_URLS['ethereum']];
  }

  /**
   * EVM chain switching — persists the preference to localStorage.
   */
  async switchEvmChain(chain: EvmChain): Promise<boolean> {
    const validChains: EvmChain[] = ['ethereum', 'polygon', 'arbitrum', 'bsc', 'bsc_testnet', 'avalanche', 'plasma', 'stable', 'sepolia', 'polygon_testnet'];
    if (!validChains.includes(chain)) return false;

    this.currentEvmChain = chain;
    localStorage.setItem('rhiza_evm_chain', chain);

    // Reinitialize if already running
    if (this.evmManager) {
      try {
        const storedWallet = await this.getStoredWallet();
        if (!storedWallet) return true; // Can't reinitialize without seed, but chain is switched

        const isMainnet = this.currentNetwork === 'mainnet';

        // Use failover RPC selection
        const rpcUrls = this.getEvmRpcUrls(chain);
        const workingRpc = await NetworkFailover.getWorkingRpc(rpcUrls);

        try { this.evmManager.dispose(); } catch (_) { }

        const password = ethers.toUtf8Bytes(storedWallet.normalize('NFKD'));
        const salt = ethers.toUtf8Bytes('mnemonic');
        const seedHex = ethers.pbkdf2(password, salt, 2048, 64, 'sha512');
        const seedBytes = ethers.getBytes(seedHex);

        this.evmManager = new WalletManagerEvm(seedBytes, {
          provider: workingRpc,
          transferMaxFee: EVM_MAX_FEE_WEI
        });
        this.evmAccount = await this.evmManager.getAccount(0);

        console.log(`[WDK/EVM] Switched to ${chain} using ${workingRpc}`);
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

    // Pre-compute the PBKDF2 seed to bypass strict BIP39 checksum validation
    // in EVM/BTC/SOL/TRON WDK managers when a TON mnemonic is used.
    const password = ethers.toUtf8Bytes(seedPhrase.normalize('NFKD'));
    const salt = ethers.toUtf8Bytes('mnemonic');
    const seedHex = ethers.pbkdf2(password, salt, 2048, 64, 'sha512');
    const seedBytes = ethers.getBytes(seedHex);

    // Save mnemonic immediately so background retries can use it if an individual manager fails
    // (Removed for security: mnemonic is no longer stored in memory indefinitely)

    try {
      // ── EVM ──────────────────────────────────────────────────────────────────
      try {
        // Use failover RPC selection for better reliability
        const targetChain = getTargetEvmChain(this.currentEvmChain, this.currentNetwork);
        const rpcUrls = this.getEvmRpcUrls(targetChain);

        const workingRpc = await NetworkFailover.getWorkingRpc(rpcUrls);

        this.evmManager = new WalletManagerEvm(seedBytes, {
          provider: workingRpc,
          transferMaxFee: EVM_MAX_FEE_WEI
        });
        this.evmAccount = await this.evmManager.getAccount(0);
        console.log(`[WDK/EVM] Initialized with ${workingRpc}`);
      } catch (evmErr) {
        console.error('[WDK/EVM] Init failed:', evmErr);
        // ── Deferred EVM retry: try once more after 5 seconds without blocking TON ──
        setTimeout(async () => {
          if (!this.evmAccount && this.tonAccount) {
            console.log('[WDK/EVM] Retrying EVM initialization in background...');
            try {
              const targetChain = getTargetEvmChain(this.currentEvmChain, this.currentNetwork);
              const rpcUrls = this.getEvmRpcUrls(targetChain);
              const workingRpc = await NetworkFailover.getWorkingRpc(rpcUrls);
              this.evmManager = new WalletManagerEvm(seedBytes, {
                provider: workingRpc,
                transferMaxFee: EVM_MAX_FEE_WEI
              });
              this.evmAccount = await this.evmManager.getAccount(0);
              console.log(`[WDK/EVM] Background retry succeeded with ${workingRpc}`);
            } catch (retryErr) {
              console.warn('[WDK/EVM] Background retry also failed:', retryErr);
            }
          }
        }, 5000);
      }

      // ── TON ──────────────────────────────────────────────────────────────────
      try {
        const { TonClient } = await import('@ton/ton');
        const v3Url = isMainnet ? TONCENTER_V3_MAINNET : TONCENTER_V3_TESTNET;
        const v2Url = isMainnet ? TONCENTER_V2_MAINNET : TONCENTER_V2_TESTNET;
        const apiKey = config.API_KEY || undefined;

        this.tonV3Endpoint = v3Url;
        this.tonApiKey = apiKey;

        const v2TonClient = new TonClient({ endpoint: v2Url, apiKey });
        this.nativeTonClient = v2TonClient;

        this.tonManager = new WalletManagerTon(seedBytes, {
          tonClient: { url: v3Url, secretKey: apiKey } as any,
          transferMaxFee: TON_MAX_FEE_NANO
        });
        this.tonAccount = await this.tonManager.getAccount(0);

        const acc = this.tonAccount as any;
        const internalKeyPair = acc._keyPair;
        const internalWallet = acc._wallet;

        if (internalKeyPair && internalWallet) {
          this.nativeTonContract = v2TonClient.open(internalWallet);
          this.nativeTonKeyPair = internalKeyPair;
        } else {
          try {
            const { mnemonicToWalletKey } = await import('@ton/crypto');
            const tonModule = await import('@ton/ton') as any;
            const WalletContractV5R1 = tonModule.WalletContractV5R1;
            if (WalletContractV5R1) {
              this.nativeTonKeyPair = await mnemonicToWalletKey(seedPhrase.split(' '));
              this.nativeTonContract = v2TonClient.open(
                WalletContractV5R1.create({ workchain: 0, publicKey: this.nativeTonKeyPair.publicKey })
              );
            }
          } catch (e) { }
        }
      } catch (tonErr: any) {
        console.error('[WDK/TON] Init failed:', tonErr);
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

        this.btcManager = new WalletManagerBtc(seedBytes, btcConfig);
        this.btcAccount = await this.btcManager.getAccount(0);
        console.log('[WDK/BTC] Initialized');
      } catch (btcErr) {
        console.error('[WDK/BTC] Init failed:', btcErr);
      }

      // ── Solana ────────────────────────────────────────────────────────────────
      try {
        const solRpcUrls = isMainnet ? SOLANA_RPC_FAILOVER.mainnet : SOLANA_RPC_FAILOVER.devnet;
        const solRpcUrl = await NetworkFailover.getWorkingRpc(solRpcUrls);
        this.solManager = new WalletManagerSolana(seedBytes, {
          rpcUrl: solRpcUrl,
          transferMaxFee: 10000000
        });
        this.solAccount = await this.solManager.getAccount(0);
        console.log('[WDK/SOL] Initialized');
      } catch (solErr) {
        console.error('[WDK/SOL] Init failed:', solErr);
      }

      // ── Tron ──────────────────────────────────────────────────────────────────
      try {
        const tronApiKey = import.meta.env.VITE_TRONGRID_API_KEY;
        const tronConfig: any = {
          provider: isMainnet ? 'https://api.trongrid.io' : 'https://api.shasta.trongrid.io',
          transferMaxFee: 100000000
        };
        
        if (tronApiKey) {
          tronConfig.headers = { 'TRON-PRO-API-KEY': tronApiKey };
        }

        this.tronManager = new WalletManagerTron(seedBytes, tronConfig);
        this.tronAccount = await this.tronManager.getAccount(0);
        console.log('[WDK/TRON] Initialized');
      } catch (tronErr) {
        console.error('[WDK/TRON] Init failed:', tronErr);
      }


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

      let evmAddr = '';
      if (this.evmAccount) {
        evmAddr = await this.evmAccount.getAddress();
      } else {
        try {
          const rootWallet = ethers.HDNodeWallet.fromSeed(seedBytes);
          const wallet = rootWallet.derivePath("m/44'/60'/0'/0/0");
          evmAddr = wallet.address;
        } catch (e) {
          console.error('[WDK] Fallback EVM derivation failed:', e);
        }
      }

      const addresses = {
        evmAddress: evmAddr,
        tonAddress: formattedTonAddress,
        btcAddress: this.btcAccount ? await this.btcAccount.getAddress() : '',
        solAddress: this.solAccount ? await this.solAccount.getAddress() : '',
        tronAddress: this.tronAccount ? await this.tronAccount.getAddress() : '',
      };

      try {
        const { WalletManager } = await import('../utils/walletManager');
        const activeId = WalletManager.getActiveWalletId();
        if (activeId) {
          WalletManager.updateWalletAddresses(activeId, {
            evm: addresses.evmAddress,
            ton: addresses.tonAddress,
            btc: addresses.btcAddress,
            sol: addresses.solAddress,
            tron: addresses.tronAddress
          });
        }
        const wallets = WalletManager.getWallets();
        const secondary = wallets.find(w => w.type === 'secondary');
        if (secondary && secondary.id !== activeId) {
          WalletManager.updateWalletAddresses(secondary.id, {
            evm: addresses.evmAddress,
            ton: addresses.tonAddress,
            btc: addresses.btcAddress,
            sol: addresses.solAddress,
            tron: addresses.tronAddress
          });
        }
      } catch (e) {
        console.error('[WDK] Failed to cache addresses in WalletManager', e);
      }

      return addresses;
    } catch (error) {
      console.error('[WDK] Multi-chain initialization fatal error:', error);
      throw error;
    } finally {
      // Always log which chains are usable after init attempt
      const h = this.getWalletHealth();
      const status = (name: string, ok: boolean) => ok ? `✅ ${name}` : `❌ ${name}`;
      console.log(
        `[WDK] Chain init status — ${status('TON', h.ton)} | ${status('EVM', h.evm)} | ${status('BTC', h.btc)} | ${status('SOL', h.sol)} | ${status('TRON', h.tron)}`
      );
    }
  }

  /** True if all core chain managers are up */
  isInitialized(): boolean {
    return !!(this.evmAccount && this.tonAccount && this.btcAccount);
  }

  /** True if at minimum the TON account is ready (EVM/BTC may have failed) */
  isTonReady(): boolean {
    if (!this.tonAccount) return false;
    const acc = this.tonAccount as any;
    const hasSecret = !!(this.nativeTonKeyPair || acc._keyPair?.secretKey || acc.keyPair?.secretKey);
    return hasSecret;
  }

  /** True if the wallet is loaded AND keys are decrypted in memory */
  isUnlocked(): boolean {
    // A quick proxy for "unlocked" is if the secret keys are available on the ton account.
    // When locked, WDK clears the secret keys but leaves the public keys/addresses.
    if (!this.tonAccount) return false;
    const acc = this.tonAccount as any;
    return !!(this.nativeTonKeyPair || acc._keyPair?.secretKey || acc.keyPair?.secretKey);
  }


  /** True if the EVM manager and account are both up */
  isEvmReady(): boolean {
    return !!this.evmAccount && !!this.evmManager;
  }

  async saveWallet(mnemonicPhrase: string, password?: string) {
    try {
      const mnemonicArray = mnemonicPhrase.split(' ');
      if (password) {
        const encrypted = await encryptMnemonic(mnemonicArray, password);
        localStorage.setItem(SECONDARY_WALLET_KEY, encrypted);
        localStorage.setItem(SECONDARY_WALLET_ENC_KEY, 'true');
      } else {
        const deviceKey = await getDeviceKey();
        const encrypted = await encryptMnemonic(mnemonicArray, deviceKey);
        localStorage.setItem(SECONDARY_WALLET_KEY, encrypted);
        localStorage.setItem(SECONDARY_WALLET_ENC_KEY, 'device');
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }

  async getStoredWallet(password?: string): Promise<string | null> {
    const stored = localStorage.getItem(SECONDARY_WALLET_KEY);
    const encKeyType = localStorage.getItem(SECONDARY_WALLET_ENC_KEY);
    const isEncrypted = encKeyType === 'true';
    const isDeviceEncrypted = encKeyType === 'device';

    if (!stored) return null;

    try {
      if (isEncrypted) {
        if (!password) return null; // cannot decrypt without password
        const decrypted = await decryptMnemonic(stored, password);
        return decrypted.join(' ');
      } else if (isDeviceEncrypted) {
        const deviceKey = await getDeviceKey();
        const decrypted = await decryptMnemonic(stored, deviceKey);
        return decrypted.join(' ');
      } else {
        // Auto-migration: Plaintext ('false' or missing) -> Device Encryption
        const parsed = JSON.parse(stored);
        
        console.log('🔄 Auto-migrating secondary wallet to device encryption...');
        const deviceKey = await getDeviceKey();
        const encrypted = await encryptMnemonic(parsed, deviceKey);
        localStorage.setItem(SECONDARY_WALLET_KEY, encrypted);
        localStorage.setItem(SECONDARY_WALLET_ENC_KEY, 'device');
        console.log('✅ Secondary wallet migrated successfully');

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
    const encType = localStorage.getItem(SECONDARY_WALLET_ENC_KEY);
    return encType === 'true' || encType === 'device';
  }

  async getAddresses(): Promise<MultiChainAddresses | null> {
    if (!this.tonAccount) return null; // TON is the minimum requirement

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

    let evmAddress = '';
    if (this.evmAccount) {
      evmAddress = await this.evmAccount.getAddress();
    } else {
      const storedWallet = await this.getStoredWallet();
      if (storedWallet) {
        try {
          const password = ethers.toUtf8Bytes(storedWallet.normalize('NFKD'));
          const salt = ethers.toUtf8Bytes('mnemonic');
          const seedHex = ethers.pbkdf2(password, salt, 2048, 64, 'sha512');
          const rootWallet = ethers.HDNodeWallet.fromSeed(ethers.getBytes(seedHex));
          const wallet = rootWallet.derivePath("m/44'/60'/0'/0/0");
          evmAddress = wallet.address;
        } catch (e) {
          console.error('[WDK] Fallback EVM derivation failed:', e);
        }
      }
    }

    return {
      evmAddress: evmAddress,
      tonAddress: formattedTonAddress,
      btcAddress: this.btcAccount ? await this.btcAccount.getAddress() : '',
      solAddress: this.solAccount ? await this.solAccount.getAddress() : '',
      tronAddress: this.tronAccount ? await this.tronAccount.getAddress() : '',
    };
  }

  async getBalances() {
    if (!this.tonAccount) return null;

    // ── AUDIT FIX #6: Performance monitoring for balance fetching ─────────────
    const perfStart = performance.now();

    let evmBalance = '0.0000';
    let tonBalance = '0.0000';
    let btcBalance = '0.00000000';
    let solBalance = '0.000000000';
    let tronBalance = '0.000000';

    try {
      if (this.evmAccount) {
        const evmBalanceWei = await this.evmAccount.getBalance();
        const evmFull = formatUnits(evmBalanceWei.toString(), 18);
        evmBalance = parseFloat(evmFull).toFixed(6);
      }
    } catch (e) { console.error('[WDK/EVM] Balance Error:', e); }

    // ── AUDIT FIX #7: TON balance — V3 REST primary, WDK/SDK fallbacks ──────────
    // TonCenter V3 REST is the fastest path when using a premium API key.
    // WDK's internal getBalance() goes through a slower SDK chain.
    try {
      const addr = await this.tonAccount.getAddress();
      const cacheKey = `ton_${addr}`;
      const cached = this.balanceCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.BALANCE_CACHE_TTL) {
        tonBalance = cached.balance;
      } else {
        const config = getNetworkConfig(this.currentNetwork);
        const v3Base = this.currentNetwork === 'mainnet'
          ? 'https://toncenter.com/api/v3'
          : 'https://testnet.toncenter.com/api/v3';
        const headers = config.API_KEY ? { 'X-API-Key': config.API_KEY } : {};

        // Race: V3 REST vs WDK getBalance — whichever resolves first wins
        const result = await Promise.race([
          fetch(`${v3Base}/account?address=${addr}`, { headers })
            .then(r => r.ok ? r.json() : null)
            .then(d => d?.balance ? (Number(d.balance) / 1e9).toFixed(4) : null)
            .catch(() => null),
          this.tonAccount.getBalance()
            .then((nano: bigint) => (Number(nano) / 1e9).toFixed(4))
            .catch(() => null),
        ]);

        if (result) {
          // ── Deposit detection for WDK TON wallet
          const prevEntry = this.balanceCache.get(cacheKey);
          const prevBal = prevEntry ? prevEntry.balance : null;

          tonBalance = result;
          this.balanceCache.set(cacheKey, { balance: result, timestamp: Date.now() });

          if (prevBal !== null && parseFloat(result) > parseFloat(prevBal)) {
            try {
              const { balanceSyncService } = await import('./balanceSyncService');
              balanceSyncService.refreshForAddress(addr);
              console.log(`[WDK/TON] Deposit detected: ${prevBal} → ${result} TON — cache busted`);
            } catch { /* non-critical */ }
          }
        }

        const perfTon = performance.now();
        console.log(`[WDK/TON] Balance in ${(perfTon - perfStart).toFixed(0)}ms: ${tonBalance}`);
      }
    } catch (e) {
      console.error('[WDK/TON] Balance fetch failed:', e);
    }

    try {
      if (this.btcAccount) {
        const btcBalanceSats: bigint = await this.btcAccount.getBalance();
        const sats = btcBalanceSats >= 0n ? btcBalanceSats : 0n;
        const wholeBtc = sats / 100_000_000n;
        const remainSats = sats % 100_000_000n;
        btcBalance = `${wholeBtc}.${remainSats.toString().padStart(8, '0')}`;
      }
    } catch (e) { console.error('[WDK/BTC] Balance Error:', e); }

    if (this.solAccount) {
      try {
        const lamports: bigint = await this.solAccount.getBalance();
        solBalance = (Number(lamports) / 1e9).toFixed(9);
      } catch (e) { console.error('[WDK/SOL] Balance Error:', e); }
    }

    if (this.tronAccount) {
      try {
        const sun: bigint = await this.tronAccount.getBalance();
        tronBalance = (Number(sun) / 1_000_000).toFixed(6);
      } catch (e) { console.error('[WDK/TRON] Balance Error:', e); }
    }

    const perfTotal = performance.now();
    console.log(`[WDK] Total balance fetch completed in ${(perfTotal - perfStart).toFixed(0)}ms`);

    return { evmBalance, tonBalance, btcBalance, solBalance, tronBalance };
  }

  // ── 3. ACCOUNT MANAGEMENT ─────────────────────────────────────────────────
  // Per WDK docs: getTransactionReceipt(hash) — returns receipt or null

  async getTonTransactionReceipt(hash: string): Promise<any | null> {
    if (!this.tonAccount) return null;
    try {
      return await this.tonAccount.getTransactionReceipt(hash);
    } catch (e) {
      console.error('[WDK/TON] getTransactionReceipt error:', e);
      return null;
    }
  }

  // TON Jetton balance — per WDK docs: account.getTokenBalance(jettonMasterAddress)
  async getJettonBalance(jettonMasterAddress: string, decimals = 9): Promise<string> {
    if (!this.tonAccount) return '0';
    try {
      const bal: bigint = await this.tonAccount.getTokenBalance(jettonMasterAddress);
      return (Number(bal) / Math.pow(10, decimals)).toFixed(decimals > 6 ? 4 : 6);
    } catch (e) {
      console.error('[WDK/TON] getTokenBalance error:', e);
      return '0';
    }
  }

  // ── 4. SEND TRANSACTIONS ─────────────────────────────────────────────────
  // Per WDK docs: sendTransaction() + quoteSendTransaction() for fee preview

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

      // Return a safe fallback since WalletContract instances do not expose estimateFee
      const fallbackFeeBigInt = BigInt(5_000_000); // 0.005 TON in nanotons
      return { feeBigInt: fallbackFeeBigInt, feeTon: "0.005000" };
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
      //    If seqno is 0 the wallet hasn't been deployed yet  include StateInit
      //    so TonCenter deploys the contract code on this first transaction.
      const extMsg = external({
        to: internalWallet.address,
        init: seqno === 0 ? internalWallet.init : undefined,
        body: transfer,
      });
      const extMessageCell = beginCell()
        .storeWritable(storeMessage(extMsg))
        .endCell();

      // 3. Compute normalized hash (TEP-467) — what TonViewer indexes for lookup.
      //    Normalization: src=addr_none, importFee=0, init=null, body as ref.
      const normalizedCell = beginCell()
        .storeWritable(storeMessage(
          { info: { type: 'external-in' as const, src: undefined as any, dest: internalWallet.address, importFee: 0n }, init: null, body: transfer },
          { forceRef: true }
        ))
        .endCell();
      const txHash = normalizedCell.hash().toString('hex');
      const bocBase64 = extMessageCell.toBoc().toString('base64');

      await this.broadcastBocV3(bocBase64);
      console.log(`[RhizaCore/TON] BOC broadcast to V3 /message  normalized hash:`, txHash);
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

  // ── EVM TRANSACTIONS ────────────────────────────────────────────────────

  async quoteSendEvmTransaction(toAddress: string, amount: string, explicitChain?: EvmChain): Promise<{ feeBigInt: bigint; feeEvm: string } | null> {
    try {
      const { ethers } = await import('ethers');
      let targetAccount = this.evmAccount;
      let tempManager: any = null;

      if (explicitChain && explicitChain !== this.currentEvmChain) {
        const storedWallet = await this.getStoredWallet('');
        if (storedWallet) {
           const password = ethers.toUtf8Bytes(storedWallet.normalize('NFKD'));
           const salt = ethers.toUtf8Bytes('mnemonic');
           const seedHex = ethers.pbkdf2(password, salt, 2048, 64, 'sha512');
           const seedBytes = ethers.getBytes(seedHex);
           const targetChain = getTargetEvmChain(explicitChain, this.currentNetwork);
           const rpcUrls = this.getEvmRpcUrls(targetChain);
           const rpc = await NetworkFailover.getWorkingRpc(rpcUrls);
           tempManager = new WalletManagerEvm(seedBytes, { provider: rpc, transferMaxFee: EVM_MAX_FEE_WEI });
           targetAccount = await tempManager.getAccount(0);
        }
      }

      if (!targetAccount) throw new Error('EVM account not initialized');
      const amountWei = ethers.parseUnits(amount, 18);
      const res = await targetAccount.quoteSendTransaction({ to: toAddress, value: amountWei });
      
      if (tempManager) {
        try { tempManager.dispose(); } catch (e) {}
      }

      return {
        feeBigInt: res.fee,
        feeEvm: ethers.formatUnits(res.fee, 18)
      };
    } catch (e) {
      console.error('[WDK/EVM] quote error', e);
      return null;
    }
  }

  async sendEvmTransaction(toAddress: string, amount: string, explicitChain?: EvmChain): Promise<{ success: boolean; txHash?: string; fee?: string; error?: string }> {
    try {
      const { ethers } = await import('ethers');
      let targetAccount = this.evmAccount;
      let tempManager: any = null;

      if (explicitChain && explicitChain !== this.currentEvmChain) {
        const storedWallet = await this.getStoredWallet('');
        if (storedWallet) {
           const password = ethers.toUtf8Bytes(storedWallet.normalize('NFKD'));
           const salt = ethers.toUtf8Bytes('mnemonic');
           const seedHex = ethers.pbkdf2(password, salt, 2048, 64, 'sha512');
           const seedBytes = ethers.getBytes(seedHex);
           const targetChain = getTargetEvmChain(explicitChain, this.currentNetwork);
           const rpcUrls = this.getEvmRpcUrls(targetChain);
           const rpc = await NetworkFailover.getWorkingRpc(rpcUrls);
           tempManager = new WalletManagerEvm(seedBytes, { provider: rpc, transferMaxFee: EVM_MAX_FEE_WEI });
           targetAccount = await tempManager.getAccount(0);
        } else {
           throw new Error('EVM explicit chain switch requires unlocked wallet');
        }
      }

      if (!targetAccount) throw new Error('EVM account not initialized');
      const amountWei = ethers.parseUnits(amount, 18);
      
      const res = await targetAccount.sendTransaction({ to: toAddress, value: amountWei });
      
      if (tempManager) {
        try { tempManager.dispose(); } catch (e) {}
      }
      
      return { success: true, txHash: res.hash, fee: res.fee ? ethers.formatUnits(res.fee, 18) : undefined };
    } catch (e: any) {
      console.error('[RhizaCore/EVM] Send failed:', e);
      return { success: false, error: e.message || 'EVM send failed' };
    }
  }

  async quoteSendEvmTokenTransaction(
    toAddress: string,
    amount: string,
    explicitChain: 'ethereum' | 'bsc'
  ): Promise<{ feeBigInt: bigint; feeEvm: string } | null> {
    try {
      const { ethers } = await import('ethers');
      let targetAccount = this.evmAccount;
      let tempManager: any = null;

      if (explicitChain !== this.currentEvmChain) {
        const storedWallet = await this.getStoredWallet('');
        if (storedWallet) {
           const password = ethers.toUtf8Bytes(storedWallet.normalize('NFKD'));
           const salt = ethers.toUtf8Bytes('mnemonic');
           const seedHex = ethers.pbkdf2(password, salt, 2048, 64, 'sha512');
           const seedBytes = ethers.getBytes(seedHex);
           const targetChain = getTargetEvmChain(explicitChain, this.currentNetwork);
           const rpcUrls = this.getEvmRpcUrls(targetChain);
           const rpc = await NetworkFailover.getWorkingRpc(rpcUrls);
           tempManager = new WalletManagerEvm(seedBytes, { provider: rpc, transferMaxFee: EVM_MAX_FEE_WEI });
           targetAccount = await tempManager.getAccount(0);
        }
      }

      if (!targetAccount) throw new Error('EVM account not initialized');
      
      const { USDT_CONTRACTS } = await import('./usdtMultiChainService');
      const chainConfig = explicitChain === 'ethereum' ? USDT_CONTRACTS.ethereum : USDT_CONTRACTS.bsc;
      const tokenAddress = chainConfig.address;
      const decimals = chainConfig.decimals;

      const amountBigInt = ethers.parseUnits(amount, decimals);
      const res = await targetAccount.quoteTransfer({
        token: tokenAddress,
        recipient: toAddress,
        amount: amountBigInt
      });

      if (tempManager) {
        try { tempManager.dispose(); } catch (e) {}
      }

      return {
        feeBigInt: res.fee,
        feeEvm: ethers.formatUnits(res.fee, 18)
      };
    } catch (e) {
      console.error('[WDK/EVM Token] quote transfer error', e);
      return null;
    }
  }

  async sendEvmTokenTransaction(
    toAddress: string,
    amount: string,
    explicitChain: 'ethereum' | 'bsc'
  ): Promise<{ success: boolean; txHash?: string; fee?: string; error?: string }> {
    try {
      const { ethers } = await import('ethers');
      let targetAccount = this.evmAccount;
      let tempManager: any = null;

      if (explicitChain !== this.currentEvmChain) {
        const storedWallet = await this.getStoredWallet('');
        if (storedWallet) {
           const password = ethers.toUtf8Bytes(storedWallet.normalize('NFKD'));
           const salt = ethers.toUtf8Bytes('mnemonic');
           const seedHex = ethers.pbkdf2(password, salt, 2048, 64, 'sha512');
           const seedBytes = ethers.getBytes(seedHex);
           const targetChain = getTargetEvmChain(explicitChain, this.currentNetwork);
           const rpcUrls = this.getEvmRpcUrls(targetChain);
           const rpc = await NetworkFailover.getWorkingRpc(rpcUrls);
           tempManager = new WalletManagerEvm(seedBytes, { provider: rpc, transferMaxFee: EVM_MAX_FEE_WEI });
           targetAccount = await tempManager.getAccount(0);
        } else {
           throw new Error('EVM explicit chain switch requires unlocked wallet');
        }
      }

      if (!targetAccount) throw new Error('EVM account not initialized');
      
      const { USDT_CONTRACTS } = await import('./usdtMultiChainService');
      const chainConfig = explicitChain === 'ethereum' ? USDT_CONTRACTS.ethereum : USDT_CONTRACTS.bsc;
      const tokenAddress = chainConfig.address;
      const decimals = chainConfig.decimals;

      const amountBigInt = ethers.parseUnits(amount, decimals);
      const res = await targetAccount.transfer({
        token: tokenAddress,
        recipient: toAddress,
        amount: amountBigInt
      });

      if (tempManager) {
        try { tempManager.dispose(); } catch (e) {}
      }

      return {
        success: true,
        txHash: res.hash,
        fee: res.fee ? ethers.formatUnits(res.fee, 18) : undefined
      };
    } catch (e: any) {
      console.error('[RhizaCore/EVM Token] Send transfer failed:', e);
      return { success: false, error: e.message || 'EVM token transfer failed' };
    }
  }

  // ── TRON TRANSACTIONS ───────────────────────────────────────────────────

  async quoteSendTronTransaction(toAddress: string, amount: string): Promise<{ feeBigInt: bigint; feeTrx: string } | null> {
    try {
      if (!this.tronAccount) throw new Error('TRON account not initialized');
      const amountSun = BigInt(Math.round(parseFloat(amount) * 1_000_000));
      const res = await this.tronAccount.quoteSendTransaction({ to: toAddress, value: amountSun });
      return {
        feeBigInt: res.fee,
        feeTrx: (Number(res.fee) / 1_000_000).toFixed(6)
      };
    } catch (e) {
      console.error('[WDK/TRON] quote error', e);
      return null;
    }
  }

  async sendTronTransaction(toAddress: string, amount: string): Promise<{ success: boolean; txHash?: string; fee?: string; error?: string }> {
    try {
      if (!this.tronAccount) throw new Error('TRON account not initialized');
      const amountSun = BigInt(Math.round(parseFloat(amount) * 1_000_000));
      
      const res = await this.tronAccount.sendTransaction({ to: toAddress, value: amountSun });
      
      return { success: true, txHash: res.hash, fee: (Number(res.fee) / 1_000_000).toFixed(6) };
    } catch (e: any) {
      console.error('[RhizaCore/TRON] Send failed:', e);
      return { success: false, error: e.message || 'TRON send failed' };
    }
  }

  async quoteSendBtcTransaction(toAddress: string, amount: string): Promise<{ feeBigInt: bigint; feeBtc: string } | null> {
    try {
      if (!this.btcAccount) throw new Error('BTC account not initialized');
      const amountSats = BigInt(Math.round(parseFloat(amount) * 1e8));
      const res = await this.btcAccount.quoteSendTransaction({ to: toAddress, value: amountSats });
      return {
        feeBigInt: res.fee,
        feeBtc: (Number(res.fee) / 1e8).toFixed(8)
      };
    } catch (e) {
      console.error('[WDK/BTC] quote error', e);
      return null;
    }
  }

  async sendBtcTransaction(toAddress: string, amount: string): Promise<{ success: boolean; txHash?: string; fee?: string; error?: string }> {
    try {
      if (!this.btcAccount) throw new Error('BTC account not initialized');
      const amountSats = BigInt(Math.round(parseFloat(amount) * 1e8));
      
      const res = await this.btcAccount.sendTransaction({ to: toAddress, value: amountSats });
      
      return { success: true, txHash: res.hash, fee: res.fee ? (Number(res.fee) / 1e8).toFixed(8) : undefined };
    } catch (e: any) {
      console.error('[RhizaCore/BTC] Send failed:', e);
      return { success: false, error: wdkErrorMessage(e, 'BTC') };
    }
  }

  async quoteSendSolTransaction(toAddress: string, amount: string): Promise<{ feeBigInt: bigint; feeSol: string } | null> {
    try {
      if (!this.solAccount) throw new Error('SOL account not initialized');
      const amountLamports = BigInt(Math.round(parseFloat(amount) * 1e9));
      const res = await this.solAccount.quoteSendTransaction({ to: toAddress, value: amountLamports });
      return {
        feeBigInt: res.fee,
        feeSol: (Number(res.fee) / 1e9).toFixed(9)
      };
    } catch (e) {
      console.error('[WDK/SOL] quote error', e);
      return null;
    }
  }

  async sendSolTransaction(toAddress: string, amount: string): Promise<{ success: boolean; txHash?: string; fee?: string; error?: string }> {
    try {
      if (!this.solAccount) throw new Error('SOL account not initialized');
      const amountLamports = BigInt(Math.round(parseFloat(amount) * 1e9));
      
      const res = await this.solAccount.sendTransaction({ to: toAddress, value: amountLamports });
      
      return { success: true, txHash: res.hash, fee: res.fee ? (Number(res.fee) / 1e9).toFixed(9) : undefined };
    } catch (e: any) {
      console.error('[RhizaCore/SOL] Send failed:', e);
      return { success: false, error: e.message || 'SOL send failed' };
    }
  }

  async quoteSendTronTrc20Transaction(toAddress: string, amount: string): Promise<{ feeBigInt: bigint; feeTrx: string } | null> {
    try {
      if (!this.tronAccount) throw new Error('TRON account not initialized');
      const amountBigInt = BigInt(Math.round(parseFloat(amount) * 1_000_000)); // USDT has 6 decimals
      const { USDT_CONTRACTS } = await import('./usdtMultiChainService');
      const tokenAddress = USDT_CONTRACTS.tron.address;
      
      // According to WDK types, quoteTransfer accepts TransferOptions: { token: string, recipient: string, amount: bigint }
      const res = await this.tronAccount.quoteTransfer({ token: tokenAddress, recipient: toAddress, amount: amountBigInt });
      return {
        feeBigInt: res.fee,
        feeTrx: (Number(res.fee) / 1_000_000).toFixed(6)
      };
    } catch (e) {
      console.error('[WDK/TRON] TRC20 quote error', e);
      return null;
    }
  }

  async sendTronTrc20Transaction(toAddress: string, amount: string): Promise<{ success: boolean; txHash?: string; fee?: string; error?: string }> {
    try {
      if (!this.tronAccount) throw new Error('TRON account not initialized');
      const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 1_000_000)); // USDT has 6 decimals
      const { USDT_CONTRACTS } = await import('./usdtMultiChainService');
      const tokenAddress = USDT_CONTRACTS.tron.address;
      
      // According to WDK types, transfer accepts TransferOptions
      const res = await this.tronAccount.transfer({ token: tokenAddress, recipient: toAddress, amount: amountBigInt });
      
      return { success: true, txHash: res.hash, fee: (Number(res.fee) / 1_000_000).toFixed(6) };
    } catch (e: any) {
      console.error('[RhizaCore/TRON] TRC20 send failed:', e);
      return { success: false, error: e.message || 'TRON TRC20 send failed' };
    }
  }

  async getTronTransactions(address: string): Promise<any[]> {
    try {
      const headers: Record<string, string> = { 'Accept': 'application/json' };
      const apiKey = import.meta.env.VITE_TRONGRID_API_KEY;
      if (apiKey) headers['TRON-PRO-API-KEY'] = apiKey;

      const isMainnet = this.currentNetwork === 'mainnet';
      const baseUrl = isMainnet ? 'https://api.trongrid.io' : 'https://api.shasta.trongrid.io';

      const [resTrx, resTrc20] = await Promise.all([
        fetch(`${baseUrl}/v1/accounts/${address}/transactions?only_confirmed=true&limit=20`, { headers }).catch(() => null),
        fetch(`${baseUrl}/v1/accounts/${address}/transactions/trc20?only_confirmed=true&limit=20`, { headers }).catch(() => null)
      ]);

      const trxData = resTrx?.ok ? await resTrx.json() : { data: [] };
      const trc20Data = resTrc20?.ok ? await resTrc20.json() : { data: [] };

      const transactions: any[] = [];
      
      let addressHex = '';
      try {
        const { ethers } = await import('ethers');
        // Decode Base58 to a 25-byte hex string, then extract the 21-byte payload (first 42 hex chars)
        const fullHex = ethers.toBeHex(ethers.decodeBase58(address), 25);
        addressHex = fullHex.substring(2, 44).toLowerCase();
      } catch (e) {
        console.warn('[WDK/TRON] Base58 decode failed for', address);
      }

      // Parse TRC20
      for (const tx of trc20Data.data || []) {
        const isIncoming = tx.to === address || (addressHex && tx.to.toLowerCase() === addressHex);
        transactions.push({
          id: tx.transaction_id,
          type: isIncoming ? 'receive' : 'send',
          amount: (Number(tx.value) / Math.pow(10, Number(tx.token_info?.decimals || 6))).toFixed(4),
          asset: tx.token_info?.symbol || 'USDT',
          timestamp: tx.block_timestamp,
          status: 'completed',
          address: isIncoming ? tx.from : tx.to,
          hash: tx.transaction_id,
          fee: '0',
          comment: ''
        });
      }

      // Parse TRX
      for (const tx of trxData.data || []) {
        if (tx.raw_data?.contract?.[0]?.type === 'TransferContract') {
          const contract = tx.raw_data.contract[0].parameter.value;
          
          let fromAddress = contract.owner_address;
          let toAddress = contract.to_address;
          
          const isIncoming = toAddress === address || (addressHex && toAddress.toLowerCase() === addressHex);
          transactions.push({
            id: tx.txID,
            type: isIncoming ? 'receive' : 'send',
            amount: (Number(contract.amount) / 1_000_000).toFixed(4),
            asset: 'TRX',
            timestamp: tx.raw_data.timestamp || new Date().getTime(),
            status: tx.ret?.[0]?.contractRet === 'SUCCESS' ? 'completed' : 'failed',
            address: isIncoming ? fromAddress : toAddress,
            hash: tx.txID,
            fee: '0',
            comment: ''
          });
        }
      }

      // Sort by timestamp descending
      return transactions.sort((a, b) => b.timestamp - a.timestamp);
    } catch (e) {
      console.error('[WDK/TRON] Transaction fetch error:', e);
      return [];
    }
  }

  /**
   * Send a raw pre-built BOC body (e.g. from STON.fi swap params).
   * Unlike sendTonTransaction, this does NOT add a network tag or sanitize the body —
   * the body is a signed STON.fi instruction that must be sent verbatim.
   *
   * @param toAddress  Recipient contract address (e.g. STON.fi router)
   * @param amount     TON amount to attach (in TON, not nanotons)
   * @param bocBody    Optional base64-encoded BOC body cell
   */
  async sendTonTransactionRaw(
    toAddress: string,
    amount: string,
    bocBody?: string
  ): Promise<{ success: boolean; txHash?: string; fee?: string; error?: string }> {
    if (!this.tonAccount) {
      return { success: false, error: 'TON wallet not initialized' };
    }

    try {
      const amountNano = BigInt(Math.floor(parseFloat(amount) * 1e9));
      const acc = this.tonAccount as any;
      const secretKey = acc._keyPair?.secretKey ?? acc.keyPair?.secretKey;
      if (!secretKey) throw new Error('WDK Memory Lock: Cannot extract signing key.');

      const { internal, external, beginCell, storeMessage, Address, Cell } = await import('@ton/ton');

      const internalWallet = acc._wallet;
      if (!internalWallet) throw new Error('WDK wallet contract not accessible. Try reloading.');
      const contract = this.nativeTonClient.open(internalWallet);

      let recipientAddr: any;
      try {
        recipientAddr = Address.parse(toAddress);
      } catch {
        return { success: false, error: 'Invalid recipient address' };
      }

      // Deserialize the pre-built BOC body if provided
      let bodyCell: any = undefined;
      if (bocBody) {
        try {
          bodyCell = Cell.fromBase64(bocBody);
        } catch {
          return { success: false, error: 'Invalid swap payload (BOC parse failed)' };
        }
      }

      const seqno = await contract.getSeqno();

      const transfer = contract.createTransfer({
        seqno,
        secretKey: Buffer.from(secretKey),
        messages: [
          internal({
            to: recipientAddr,
            value: amountNano,
            body: bodyCell,
            bounce: true, // STON.fi contracts are bounceable
          }),
        ],
      });

      const extMsg = external({
        to: internalWallet.address,
        init: seqno === 0 ? internalWallet.init : undefined,
        body: transfer,
      });
      const extMessageCell = beginCell().storeWritable(storeMessage(extMsg)).endCell();

      const normalizedCell = beginCell()
        .storeWritable(storeMessage(
          { info: { type: 'external-in' as const, src: undefined as any, dest: internalWallet.address, importFee: 0n }, init: null, body: transfer },
          { forceRef: true }
        ))
        .endCell();
      const txHash = normalizedCell.hash().toString('hex');
      const bocBase64 = extMessageCell.toBoc().toString('base64');

      await this.broadcastBocV3(bocBase64);
      console.log(`[RhizaCore/TON] Raw BOC broadcast (swap), hash:`, txHash);

      // Wait for seqno confirmation
      let currentSeqno = seqno;
      let attempts = 0;
      while (currentSeqno === seqno && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        try { currentSeqno = await contract.getSeqno(); } catch { break; }
        attempts++;
      }

      return { success: true, txHash, fee: '0.005000' };
    } catch (error: any) {
      console.error('[RhizaCore/TON] Raw send failed:', error);
      return { success: false, error: error.message || 'Unknown network error' };
    }
  }

  /**
   * Send multiple pre-built BOC messages in a single atomic transaction.
   * Essential for STON.fi swaps (e.g. Jetton→Jetton) to prevent seqno conflicts
   * and ensure atomicity. W5R1 supports up to 255 messages.
   */
  async sendMultiTransactionWithBodies(
    recipients: Array<{ to: string; amount: string; bocBody?: string }>
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.tonAccount) {
      return { success: false, error: 'TON wallet not initialized' };
    }
    if (recipients.length === 0) {
      return { success: false, error: 'No recipients provided' };
    }

    try {
      const acc = this.tonAccount as any;
      const secretKey = acc._keyPair?.secretKey ?? acc.keyPair?.secretKey;
      if (!secretKey) throw new Error('WDK Memory Lock: Cannot extract signing key.');

      const { internal, external, beginCell, storeMessage, Address, Cell, toNano } = await import('@ton/ton');

      const internalWallet = (this.tonAccount as any)._wallet;
      if (!internalWallet) throw new Error('WDK wallet contract not accessible. Try reloading.');
      const contract = this.nativeTonClient.open(internalWallet);

      const messages = recipients.map(r => {
        let bodyCell: any = undefined;
        if (r.bocBody) {
          try {
            bodyCell = Cell.fromBase64(r.bocBody);
          } catch {
            throw new Error(`Invalid payload for ${r.to} (BOC parse failed)`);
          }
        }

        return internal({
          to: Address.parse(r.to),
          value: toNano(parseFloat(r.amount).toFixed(9)),
          body: bodyCell,
          bounce: true, // Swaps are usually bounceable
        });
      });

      const seqno = await contract.getSeqno();

      const transfer = contract.createTransfer({
        seqno,
        secretKey: Buffer.from(secretKey),
        messages,
      });

      const extMsg = external({
        to: internalWallet.address,
        init: seqno === 0 ? internalWallet.init : undefined,
        body: transfer,
      });
      const extMessageCell = beginCell().storeWritable(storeMessage(extMsg)).endCell();

      const normalizedCell = beginCell()
        .storeWritable(storeMessage(
          { info: { type: 'external-in' as const, src: undefined as any, dest: internalWallet.address, importFee: 0n }, init: null, body: transfer },
          { forceRef: true }
        ))
        .endCell();
      const txHash = normalizedCell.hash().toString('hex');
      const bocBase64 = extMessageCell.toBoc().toString('base64');

      await this.broadcastBocV3(bocBase64);
      console.log(`[WDK/TON] Atomic Multi-BOC broadcast (swap), hash:`, txHash);

      // Wait for seqno confirmation
      let currentSeqno = seqno;
      let attempts = 0;
      while (currentSeqno === seqno && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        try { currentSeqno = await contract.getSeqno(); } catch { break; }
        attempts++;
      }

      return { success: true, txHash };
    } catch (error: any) {
      console.error('[WDK/TON] Atomic Multi-BOC failed:', error);
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
      const extMsg = external({
        to: internalWallet.address,
        init: seqno === 0 ? internalWallet.init : undefined,
        body: transfer,
      });
      const extMessageCell = beginCell()
        .storeWritable(storeMessage(extMsg))
        .endCell();

      // 3. Compute normalized hash (TEP-467)  what TonViewer indexes for lookup.
      const normalizedCell = beginCell()
        .storeWritable(storeMessage(
          { info: { type: 'external-in' as const, src: undefined as any, dest: internalWallet.address, importFee: 0n }, init: null, body: transfer },
          { forceRef: true }
        ))
        .endCell();
      const txHash = normalizedCell.hash().toString('hex');
      const bocBase64 = extMessageCell.toBoc().toString('base64');

      await this.broadcastBocV3(bocBase64);
      console.log(`[RhizaCore/TON] Multi-send BOC broadcast to V3 /message  normalized hash:`, txHash);

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

  /**
   * Send a TON Jetton (e.g. USDT on TON) to a recipient.
   * Uses the standard TEP-74 jetton transfer op-code (0xf8a7ea5).
   * jettonMasterAddress — the master contract (e.g. EQCxE6m... for USDT)
   * recipientAddress   — who should receive the tokens
   * amount             — raw token units (e.g. 1 USDT = 1_000_000 for 6 decimals)
   * forwardTon         — TON gas attached for forward notification (default 0.05 TON)
   */
  async sendJettonTransaction(
    jettonMasterAddress: string,
    recipientAddress: string,
    amount: bigint,
    forwardTon = '0.05',
    comment?: string
  ): Promise<{ success: boolean; txHash?: string; fee?: string; error?: string }> {
    if (!this.tonAccount) {
      return { success: false, error: 'TON wallet not initialized' };
    }

    try {
      const { Address, beginCell, toNano, internal, external, storeMessage } = await import('@ton/ton');

      const acc = this.tonAccount as any;
      const secretKey = acc._keyPair?.secretKey ?? acc.keyPair?.secretKey;
      if (!secretKey) throw new Error('WDK Memory Lock: Cannot extract signing key.');

      const internalWallet = acc._wallet;
      if (!internalWallet) throw new Error('WDK wallet contract not accessible.');

      const contract = this.nativeTonClient.open(internalWallet);

      // Resolve the jetton WALLET address for this user from TonCenter V3
      const v3Base = this.currentNetwork === 'mainnet'
        ? TONCENTER_V3_MAINNET
        : TONCENTER_V3_TESTNET;
      const ownerAddr = internalWallet.address.toString({ bounceable: false });
      const headers: Record<string, string> = {};
      if (this.tonApiKey) headers['X-API-Key'] = this.tonApiKey;

      const jRes = await fetch(
        `${v3Base}/jetton/wallets?owner_address=${ownerAddr}&jetton_address=${jettonMasterAddress}&limit=1`,
        { headers }
      );
      if (!jRes.ok) throw new Error('Could not resolve jetton wallet address');
      const jData = await jRes.json();
      const jettonWalletAddr = jData.jetton_wallets?.[0]?.address;
      if (!jettonWalletAddr) throw new Error('USDT jetton wallet not found for this address');

      const receiverAddr = Address.parse(recipientAddress);
      const jettonWallet = Address.parse(jettonWalletAddr);

      // TEP-74 jetton transfer body
      const safeComment = comment ? sanitizeComment(comment) : '';
      const body = beginCell()
        .storeUint(0xf8a7ea5, 32)          // jetton transfer op
        .storeUint(0, 64)                   // query_id
        .storeCoins(amount)                 // jetton amount (raw units)
        .storeAddress(receiverAddr)         // destination
        .storeAddress(internalWallet.address) // response destination (gas refund)
        .storeUint(0, 1)                    // no custom payload
        .storeCoins(toNano(forwardTon))     // forward_ton_amount
        .storeUint(safeComment ? 1 : 0, 1)  // has forward payload
        .storeRef(
          safeComment
            ? beginCell().storeUint(0, 32).storeStringTail(safeComment).endCell()
            : beginCell().endCell()
        )
        .endCell();

      const seqno = await contract.getSeqno();

      const transfer = contract.createTransfer({
        seqno,
        secretKey: Buffer.from(secretKey),
        messages: [
          internal({
            to: jettonWallet,
            value: toNano('0.05'),
            body,
            bounce: true,
          }),
        ],
      });

      const extMsg = external({
        to: internalWallet.address,
        init: seqno === 0 ? internalWallet.init : undefined,
        body: transfer,
      });
      const extMessageCell = beginCell().storeWritable(storeMessage(extMsg)).endCell();

      const normalizedCell = beginCell()
        .storeWritable(storeMessage(
          { info: { type: 'external-in' as const, src: undefined as any, dest: internalWallet.address, importFee: 0n }, init: null, body: transfer },
          { forceRef: true }
        ))
        .endCell();
      const txHash = normalizedCell.hash().toString('hex');
      const bocBase64 = extMessageCell.toBoc().toString('base64');

      await this.broadcastBocV3(bocBase64);
      console.log(`[WDK/TON] Jetton transfer broadcast, hash:`, txHash);

      // Wait for seqno to advance
      let currentSeqno = seqno;
      let attempts = 0;
      while (currentSeqno === seqno && attempts < 30) {
        await new Promise(r => setTimeout(r, 1000));
        try { currentSeqno = await contract.getSeqno(); } catch { break; }
        attempts++;
      }

      return { success: true, txHash, fee: forwardTon };
    } catch (error: any) {
      console.error('[WDK/TON] Jetton send failed:', error);
      return { success: false, error: wdkErrorMessage(error, 'TON-Jetton') };
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

  // ── NEW ENHANCED FEATURES ─────────────────────────────────────────────────

  /**
   * Start real-time balance monitoring
   */
  startBalanceMonitoring(callback: (event: any) => void): void {
    this.balanceMonitor.addEventListener('balanceChange', callback);
    this.balanceMonitor.startMonitoring(this);
  }

  /**
   * Stop balance monitoring
   */
  stopBalanceMonitoring(): void {
    this.balanceMonitor.stopMonitoring();
  }

  /**
   * Get balance monitoring status
   */
  getMonitoringStatus() {
    return this.balanceMonitor.getStatus();
  }

  /**
   * Generate payment request with QR code
   */
  async generatePaymentRequest(
    chain: string,
    options: PaymentRequestOptions = {}
  ): Promise<PaymentRequest> {
    return PaymentRequestGenerator.generateRequest(this, chain, options);
  }

  /**
   * Parse payment request from QR code or deep link
   */
  parsePaymentRequest(uri: string) {
    return PaymentRequestGenerator.parsePaymentRequest(uri);
  }

  /**
   * Get network health status
   */
  async getNetworkHealth(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};

    health.ton = !!this.tonAccount;
    health.evm = !!this.evmAccount;
    health.btc = !!this.btcAccount;
    health.sol = !!this.solAccount;
    health.tron = !!this.tronAccount;

    return health;
  }

  /**
   * Enhanced balance fetching with retry logic
   */
  async getBalancesWithRetry(maxRetries = 3): Promise<any> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const balances = await this.getBalances();

        // Validate balances are reasonable
        for (const [chain, balance] of Object.entries(balances)) {
          if (typeof balance !== 'string' || isNaN(parseFloat(balance))) {
            throw new Error(`Invalid balance for ${chain}: ${balance}`);
          }
        }

        return balances;
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          const delay = 1000 * Math.pow(2, attempt - 1);
          console.warn(`[WDK] Balance fetch attempt ${attempt} failed, retrying in ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  /**
   * Get wallet health status
   */
  getWalletHealth(): {
    evm: boolean;
    ton: boolean;
    btc: boolean;
    sol: boolean;
    tron: boolean;
  } {
    return {
      evm: !!this.evmAccount && !!this.evmManager,
      ton: !!this.tonAccount && !!this.tonManager && !!this.nativeTonContract,
      btc: !!this.btcAccount && !!this.btcManager,
      sol: !!this.solAccount && !!this.solManager,
      tron: !!this.tronAccount && !!this.tronManager
    };
  }



  /**
   * Re-initialize only the EVM wallet manager using the currently stored mnemonic.
   * Call this when getWalletHealth().evm is false but TON is running.
   * Safe to call even if EVM was never initialized — it will attempt a fresh setup.
   * Returns true if EVM came up successfully.
   */
  async reinitializeEvm(): Promise<boolean> {
    const storedWallet = await this.getStoredWallet('');
    if (!storedWallet) {
      console.warn('[WDK/EVM] reinitializeEvm: no mnemonic available');
      return false;
    }

    const isMainnet = this.currentNetwork === 'mainnet';
    console.log('[WDK/EVM] reinitializeEvm: starting...');

    try {
      // Dispose old manager if it exists
      try { this.evmManager?.dispose(); } catch (_) { }
      this.evmManager = null;
      this.evmAccount = null;

      const targetChain = getTargetEvmChain(this.currentEvmChain, this.currentNetwork);
      const rpcUrls = this.getEvmRpcUrls(targetChain);

      // Clear stale health cache so getWorkingRpc re-probes all endpoints
      NetworkFailover.clearHealthCache();
      const workingRpc = await NetworkFailover.getWorkingRpc(rpcUrls);

      // Pre-compute PBKDF2 seed to support TON 24-word phrases
      const password = ethers.toUtf8Bytes(storedWallet.normalize('NFKD'));
      const salt = ethers.toUtf8Bytes('mnemonic');
      const seedHex = ethers.pbkdf2(password, salt, 2048, 64, 'sha512');
      const seedBytes = ethers.getBytes(seedHex);

      this.evmManager = new WalletManagerEvm(seedBytes, {
        provider: workingRpc,
        transferMaxFee: EVM_MAX_FEE_WEI
      });
      this.evmAccount = await this.evmManager.getAccount(0);

      console.log(`[WDK/EVM] reinitializeEvm: ✅ EVM ready on ${workingRpc}`);
      return true;
    } catch (err) {
      console.error('[WDK/EVM] reinitializeEvm failed:', err);
      this.evmManager = null;
      this.evmAccount = null;
      return false;
    }
  }

  /**
   * Re-initialize all chain managers (EVM, BTC, SOL, TRON) using the stored mnemonic.
   * TON is NOT touched — it is never torn down because it holds live seqno state.
   * Returns the updated wallet health.
   */
  async reinitializeAll(): Promise<{ evm: boolean; btc: boolean; sol: boolean; tron: boolean }> {
    const results = { evm: false, btc: false, sol: false, tron: false };

    const storedWallet = await this.getStoredWallet('');
    if (!storedWallet) {
      console.warn('[WDK] reinitializeAll: no mnemonic available');
      return results;
    }

    const isMainnet = this.currentNetwork === 'mainnet';
    NetworkFailover.clearHealthCache();

    // Pre-compute PBKDF2 seed to support TON 24-word phrases
    const password = ethers.toUtf8Bytes(storedWallet.normalize('NFKD'));
    const salt = ethers.toUtf8Bytes('mnemonic');
    const seedHex = ethers.pbkdf2(password, salt, 2048, 64, 'sha512');
    const seedBytes = ethers.getBytes(seedHex);

    // Run all chain inits in parallel (failures are isolated)
    await Promise.allSettled([
      // EVM
      (async () => {
        try {
          try { this.evmManager?.dispose(); } catch (_) { }
          this.evmManager = null; this.evmAccount = null;
          const targetChain = getTargetEvmChain(this.currentEvmChain, this.currentNetwork);
          const rpcUrls = this.getEvmRpcUrls(targetChain);
          const rpc = await NetworkFailover.getWorkingRpc(rpcUrls);
          this.evmManager = new WalletManagerEvm(seedBytes, { provider: rpc, transferMaxFee: EVM_MAX_FEE_WEI });
          this.evmAccount = await this.evmManager.getAccount(0);
          results.evm = true;
          console.log('[WDK] reinitializeAll: ✅ EVM ready');
        } catch (e) { console.error('[WDK] reinitializeAll EVM failed:', e); }
      })(),
      // BTC
      (async () => {
        try {
          const { ElectrumWs } = await import('@tetherto/wdk-wallet-btc');
          try { this.btcManager?.dispose(); } catch (_) { }
          this.btcManager = null; this.btcAccount = null;
          const btcNetwork = isMainnet ? 'bitcoin' : 'testnet';
          let btcClient: any = null;
          try {
            btcClient = new ElectrumWs({ url: isMainnet ? ELECTRUM_WSS_MAINNET : ELECTRUM_WSS_TESTNET });
          } catch (_) { }
          const btcConfig: any = { network: btcNetwork };
          if (btcClient) btcConfig.client = btcClient;
          this.btcManager = new WalletManagerBtc(seedBytes, btcConfig);
          this.btcAccount = await this.btcManager.getAccount(0);
          results.btc = true;
          console.log('[WDK] reinitializeAll: ✅ BTC ready');
        } catch (e) { console.error('[WDK] reinitializeAll BTC failed:', e); }
      })(),
      // Solana
      (async () => {
        try {
          try { this.solManager?.dispose(); } catch (_) { }
          this.solManager = null; this.solAccount = null;
          const solRpcUrls = isMainnet ? SOLANA_RPC_FAILOVER.mainnet : SOLANA_RPC_FAILOVER.devnet;
          const solRpcUrl = await NetworkFailover.getWorkingRpc(solRpcUrls);
          this.solManager = new WalletManagerSolana(seedBytes, {
            rpcUrl: solRpcUrl,
            transferMaxFee: 10000000
          });
          this.solAccount = await this.solManager.getAccount(0);
          results.sol = true;
          console.log('[WDK] reinitializeAll: ✅ SOL ready');
        } catch (e) { console.error('[WDK] reinitializeAll SOL failed:', e); }
      })(),
      // Tron
      (async () => {
        try {
          try { this.tronManager?.dispose(); } catch (_) { }
          this.tronManager = null; this.tronAccount = null;
          const tronApiKey = import.meta.env.VITE_TRONGRID_API_KEY;
          const tronConfig: any = {
            provider: isMainnet ? 'https://api.trongrid.io' : 'https://api.shasta.trongrid.io',
            transferMaxFee: 100000000
          };
          if (tronApiKey) {
            tronConfig.headers = { 'TRON-PRO-API-KEY': tronApiKey };
          }
          this.tronManager = new WalletManagerTron(seedBytes, tronConfig);
          this.tronAccount = await this.tronManager.getAccount(0);
          results.tron = true;
          console.log('[WDK] reinitializeAll: ✅ TRON ready');
        } catch (e) { console.error('[WDK] reinitializeAll TRON failed:', e); }
      })()
    ]);

    const h = this.getWalletHealth();
    console.log(`[WDK] reinitializeAll complete — EVM:${h.evm} BTC:${h.btc} SOL:${h.sol} TRON:${h.tron}`);
    return results;
  }

  logout() {
    // dispose() triggers sodium_memzero on WDK's internal secret storage
    try { this.evmManager?.dispose(); } catch (_) { }
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
