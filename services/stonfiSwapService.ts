/**
 * STON.fi Swap Service
 *
 * Integrates STON.fi DEX v2 for TON ↔ Jetton and Jetton ↔ Jetton swaps.
 * Uses the API-driven workflow (api.ston.fi) for mainnet — the recommended
 * production pattern that auto-selects the best router.
 *
 * Flow:
 *  1. simulateSwap()  → get expected output + router metadata
 *  2. buildSwapTx()   → generate tx params from simulation result
 *  3. Caller signs + broadcasts via tetherWdkService / tonWalletService
 */

import { StonApiClient } from '@ston-fi/api';
import { dexFactory } from '@ston-fi/sdk';
import { TonClient } from '@ton/ton';
import { getNetworkConfig, NetworkType } from '../constants';

// ── Constants ────────────────────────────────────────────────────────────────
// "ton" is the special sentinel address STON.fi uses for native TON
export const TON_ASSET_ADDRESS = 'ton';

// Default slippage: 1% (0.01)
const DEFAULT_SLIPPAGE = '0.01';

// ── Types ────────────────────────────────────────────────────────────────────
export interface SwapAsset {
  address: string;   // jetton master address or 'ton'
  symbol: string;
  name: string;
  decimals: number;
  image?: string;
  balance?: string;  // user's balance (formatted)
  rateUsd?: number;
}

export interface SwapSimulation {
  offerAddress: string;
  askAddress: string;
  offerUnits: string;       // raw blockchain units (offer)
  minAskUnits: string;      // raw blockchain units (min received after slippage)
  askUnits: string;         // raw blockchain units (expected received)
  swapRate: string;         // human-readable rate (1 offerToken = X askToken)
  priceImpact: string;      // e.g. "0.12" = 0.12%
  fee: string;              // fee in offer token units
  routerAddress: string;
  routerInfo: any;          // full router object from API (passed to dexFactory)
}

export interface SwapTxParams {
  to: string;
  value: string;
  body?: string;  // base64 BOC
}

export interface SwapQuote {
  simulation: SwapSimulation;
  txParams: SwapTxParams[];
  estimatedOutput: string;   // human-readable
  minimumOutput: string;     // human-readable (after slippage)
  priceImpact: string;
  fee: string;
}

// ── Service ──────────────────────────────────────────────────────────────────
class StonfiSwapService {
  private apiClient: StonApiClient;
  private network: NetworkType = 'mainnet';

  constructor() {
    this.apiClient = new StonApiClient();
    const saved = localStorage.getItem('rhiza_network') as NetworkType;
    this.network = saved || 'mainnet';
  }

  setNetwork(network: NetworkType) {
    this.network = network;
  }

  private getTonClient(): TonClient {
    const config = getNetworkConfig(this.network);
    // STON.fi SDK uses V2 jsonRPC for contract interactions
    const endpoint = this.network === 'mainnet'
      ? 'https://toncenter.com/api/v2/jsonRPC'
      : 'https://testnet.toncenter.com/api/v2/jsonRPC';
    return new TonClient({ endpoint, apiKey: config.API_KEY });
  }

  /**
   * Fetch all swappable assets from STON.fi API.
   * Optionally enriched with wallet balances when walletAddress is provided.
   * liveTonBalance: pass the wallet's live TON balance (from WalletContext) to
   * override the STON.fi API value, which can lag or be missing.
   */
  async getAssets(walletAddress?: string, liveTonBalance?: string): Promise<SwapAsset[]> {
    try {
      if (this.network !== 'mainnet') {
        // STON.fi API is mainnet-only; return a minimal static list for testnet
        const list = this.getStaticAssets();
        // Inject live TON balance into the static list too
        if (liveTonBalance) {
          const ton = list.find(a => a.address === TON_ASSET_ADDRESS);
          if (ton) ton.balance = parseFloat(liveTonBalance).toFixed(4);
        }
        return list;
      }

      let assets: any[];
      if (walletAddress) {
        assets = await this.apiClient.getWalletAssets(walletAddress);
      } else {
        assets = await this.apiClient.getAssets();
      }

      // Map to our SwapAsset shape
      const mapped: SwapAsset[] = assets
        .filter((a: any) => a.kind === 'Jetton' || a.kind === 'Ton')
        .map((a: any) => ({
          address: a.kind === 'Ton' ? TON_ASSET_ADDRESS : a.contractAddress,
          symbol: a.symbol || 'TKN',
          name: a.displayName || a.symbol || 'Unknown',
          decimals: a.decimals ?? 9,
          image: a.imageUrl || undefined,
          balance: a.balance
            ? (Number(a.balance) / Math.pow(10, a.decimals ?? 9)).toFixed(4)
            : undefined,
          rateUsd: a.dexUsdPrice ? parseFloat(a.dexUsdPrice) : undefined,
        }));

      // Always ensure TON is first
      const tonIdx = mapped.findIndex(a => a.address === TON_ASSET_ADDRESS);
      if (tonIdx > 0) {
        const [ton] = mapped.splice(tonIdx, 1);
        mapped.unshift(ton);
      }

      // Override TON balance with the live value from the wallet service.
      // The STON.fi API balance can lag by several seconds and may be missing
      // entirely if the wallet has never interacted with the DEX.
      if (liveTonBalance) {
        const ton = mapped.find(a => a.address === TON_ASSET_ADDRESS);
        if (ton) {
          ton.balance = parseFloat(liveTonBalance).toFixed(4);
        }
      }

      return mapped;
    } catch (err) {
      console.error('[StonFi] getAssets failed:', err);
      const list = this.getStaticAssets();
      if (liveTonBalance) {
        const ton = list.find(a => a.address === TON_ASSET_ADDRESS);
        if (ton) ton.balance = parseFloat(liveTonBalance).toFixed(4);
      }
      return list;
    }
  }

  /**
   * Simulate a swap to get expected output and routing metadata.
   * offerAmount is in human-readable units (e.g. "1.5" for 1.5 TON).
   */
  async simulateSwap(
    offerAddress: string,
    askAddress: string,
    offerAmount: string,
    offerDecimals: number,
    slippage: string = DEFAULT_SLIPPAGE
  ): Promise<SwapSimulation | null> {
    try {
      if (this.network !== 'mainnet') {
        throw new Error('STON.fi simulation is only available on mainnet');
      }

      // Convert human-readable amount to blockchain units
      const offerUnits = BigInt(
        Math.floor(parseFloat(offerAmount) * Math.pow(10, offerDecimals))
      ).toString();

      const result = await this.apiClient.simulateSwap({
        offerAddress,
        askAddress,
        offerUnits,
        slippageTolerance: slippage,
      });

      return {
        offerAddress: result.offerAddress,
        askAddress: result.askAddress,
        offerUnits: result.offerUnits,
        minAskUnits: result.minAskUnits,
        askUnits: result.askUnits,
        swapRate: result.swapRate,
        priceImpact: result.priceImpact,
        fee: result.feeUnits,
        routerAddress: result.router.address,
        routerInfo: result.router,
      };
    } catch (err) {
      console.error('[StonFi] simulateSwap failed:', err);
      return null;
    }
  }

  /**
   * Build swap transaction parameters from a simulation result.
   * Returns an array of tx messages (usually 1, sometimes 2 for jetton→jetton).
   */
  async buildSwapTx(
    simulation: SwapSimulation,
    userWalletAddress: string
  ): Promise<SwapTxParams[] | null> {
    try {
      const tonClient = this.getTonClient();
      const dexContracts = dexFactory(simulation.routerInfo);
      const router = tonClient.open(
        dexContracts.Router.create(simulation.routerInfo.address)
      );

      const isOfferTon = simulation.offerAddress === TON_ASSET_ADDRESS;
      const isAskTon = simulation.askAddress === TON_ASSET_ADDRESS;

      // proxyTon is only needed when one leg is native TON
      const needsProxyTon = isOfferTon || isAskTon;
      const proxyTon = needsProxyTon && simulation.routerInfo.ptonMasterAddress
        ? dexContracts.pTON.create(simulation.routerInfo.ptonMasterAddress)
        : null;

      let txParams: any;

      if (isOfferTon) {
        if (!proxyTon) throw new Error('pTON master address missing from simulation result');
        // TON → Jetton
        txParams = await router.getSwapTonToJettonTxParams({
          userWalletAddress,
          offerAmount: simulation.offerUnits,
          minAskAmount: simulation.minAskUnits,
          askJettonAddress: simulation.askAddress,
          proxyTon,
        });
      } else if (isAskTon) {
        if (!proxyTon) throw new Error('pTON master address missing from simulation result');
        // Jetton → TON
        txParams = await router.getSwapJettonToTonTxParams({
          userWalletAddress,
          offerJettonAddress: simulation.offerAddress,
          offerAmount: simulation.offerUnits,
          minAskAmount: simulation.minAskUnits,
          proxyTon,
        });
      } else {
        // Jetton → Jetton (no proxyTon needed)
        txParams = await router.getSwapJettonToJettonTxParams({
          userWalletAddress,
          offerJettonAddress: simulation.offerAddress,
          askJettonAddress: simulation.askAddress,
          offerAmount: simulation.offerUnits,
          minAskAmount: simulation.minAskUnits,
        });
      }

      // Normalize to array (some routes return multiple messages)
      const messages = Array.isArray(txParams) ? txParams : [txParams];

      return messages.map((msg: any) => ({
        to: msg.to.toString(),
        value: msg.value.toString(),
        body: msg.body ? msg.body.toBoc().toString('base64') : undefined,
      }));
    } catch (err) {
      console.error('[StonFi] buildSwapTx failed:', err);
      return null;
    }
  }

  /**
   * Full quote: simulate + build tx params in one call.
   */
  async getSwapQuote(
    offerAsset: SwapAsset,
    askAsset: SwapAsset,
    offerAmount: string,
    userWalletAddress: string,
    slippage: string = DEFAULT_SLIPPAGE
  ): Promise<SwapQuote | null> {
    const simulation = await this.simulateSwap(
      offerAsset.address,
      askAsset.address,
      offerAmount,
      offerAsset.decimals,
      slippage
    );
    if (!simulation) return null;

    const txParams = await this.buildSwapTx(simulation, userWalletAddress);
    if (!txParams) return null;

    const askDecimals = askAsset.decimals;
    const estimatedOutput = (
      Number(simulation.askUnits) / Math.pow(10, askDecimals)
    ).toFixed(askDecimals > 6 ? 4 : 6);

    const minimumOutput = (
      Number(simulation.minAskUnits) / Math.pow(10, askDecimals)
    ).toFixed(askDecimals > 6 ? 4 : 6);

    return {
      simulation,
      txParams,
      estimatedOutput,
      minimumOutput,
      priceImpact: simulation.priceImpact,
      fee: simulation.fee,
    };
  }

  /**
   * Check swap status after broadcasting.
   */
  async getSwapStatus(routerAddress: string, ownerAddress: string, queryId: string) {
    try {
      return await this.apiClient.getSwapStatus({
        routerAddress,
        ownerAddress,
        queryId,
      });
    } catch (err) {
      console.error('[StonFi] getSwapStatus failed:', err);
      return null;
    }
  }

  // ── Static fallback assets (testnet / API failure) ────────────────────────
  private getStaticAssets(): SwapAsset[] {
    return [
      {
        address: TON_ASSET_ADDRESS,
        symbol: 'TON',
        name: 'Toncoin',
        decimals: 9,
        image: 'https://ton.org/download/ton_symbol.png',
        rateUsd: 3.5,
      },
      {
        address: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
        image: 'https://cache.tonapi.io/imgproxy/T3PB4s7oprNVaJkwqbGg54nexKE0zzKhcrPv8jcWYzU/rs:fill:200:200:1/g:no/aHR0cHM6Ly90ZXRoZXIudG8vaW1hZ2VzL2xvZ29DaXJjbGUucG5n.webp',
        rateUsd: 1.0,
      },
      {
        address: 'EQC_1YoM8RBixN95lz7odcF3Vrkc_N8Ne7gQi7Abtlet_Efi',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        image: 'https://cache.tonapi.io/imgproxy/yb2_6-_tVGiHbfiMvC8-_Gu-Hs_TpTlhCWrVe-ZTQIQ/rs:fill:200:200:1/g:no/aHR0cHM6Ly9jZW50cmUuaW8vYXNzZXRzL2ltYWdlcy91c2RjLWxvZ28ucG5n.webp',
        rateUsd: 1.0,
      },
      {
        address: 'EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT',
        symbol: 'NOT',
        name: 'Notcoin',
        decimals: 9,
        image: 'https://cache.tonapi.io/imgproxy/T6RBxmGJlnKDWltiIRpHWIiMT4LnVkTfRgNggRxWDhk/rs:fill:200:200:1/g:no/aHR0cHM6Ly9jZG4uam9pbmNvbW11bml0eS54eXovY2xpY2tlci9ub3RfbG9nby5wbmc.webp',
        rateUsd: 0.008,
      },
    ];
  }
}

export const stonfiSwapService = new StonfiSwapService();
