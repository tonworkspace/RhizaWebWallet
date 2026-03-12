# Real Swap Integration Guide 🔄

## Overview

This guide explains how to convert your demo swap interface into a real DEX integration on TON blockchain. You have two main options:

1. **DeDust Protocol** (Recommended) - Most popular TON DEX
2. **STON.fi** - Alternative with good liquidity

---

## Option 1: DeDust Integration (Recommended)

### Step 1: Install Dependencies

```bash
npm install @dedust/sdk @ton/ton @ton/core
```

### Step 2: Create DeDust Service

Create `services/dedustSwapService.ts`:

```typescript
import { Factory, MAINNET_FACTORY_ADDR, Asset, VaultNative, ReadinessStatus } from '@dedust/sdk';
import { Address, TonClient4 } from '@ton/ton';
import { tonWalletService } from './tonWalletService';

class DedustSwapService {
  private factory: Factory | null = null;
  private tonClient: TonClient4 | null = null;

  async initialize(network: 'mainnet' | 'testnet' = 'mainnet') {
    // Initialize TON client
    this.tonClient = new TonClient4({
      endpoint: network === 'mainnet' 
        ? 'https://mainnet-v4.tonhubapi.com'
        : 'https://testnet-v4.tonhubapi.com'
    });

    // Initialize DeDust factory
    this.factory = this.tonClient.open(
      Factory.createFromAddress(MAINNET_FACTORY_ADDR)
    );
  }

  /**
   * Get swap quote (how much you'll receive)
   */
  async getSwapQuote(
    fromAsset: string, // 'TON' or jetton address
    toAsset: string,
    amount: string
  ): Promise<{ amountOut: string; priceImpact: number; route: string[] }> {
    if (!this.factory) await this.initialize();

    try {
      // Create asset objects
      const assetIn = fromAsset === 'TON' 
        ? Asset.native()
        : Asset.jetton(Address.parse(fromAsset));
      
      const assetOut = toAsset === 'TON'
        ? Asset.native()
        : Asset.jetton(Address.parse(toAsset));

      // Get pool
      const pool = this.factory!.getPool(assetIn, assetOut);
      
      // Check if pool exists and is ready
      const poolState = await pool.getReadinessStatus();
      if (poolState !== ReadinessStatus.READY) {
        throw new Error('Pool not ready or does not exist');
      }

      // Get estimated output
      const amountIn = BigInt(amount);
      const { amountOut, tradeFee } = await pool.getEstimatedSwapOut({
        assetIn,
        amountIn,
      });

      // Calculate price impact
      const reserves = await pool.getReserves();
      const priceImpact = this.calculatePriceImpact(
        amountIn,
        amountOut,
        reserves
      );

      return {
        amountOut: amountOut.toString(),
        priceImpact,
        route: [fromAsset, toAsset]
      };
    } catch (error) {
      console.error('DeDust quote error:', error);
      throw error;
    }
  }

  /**
   * Execute swap transaction
   */
  async executeSwap(
    fromAsset: string,
    toAsset: string,
    amountIn: string,
    minAmountOut: string,
    userAddress: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.factory) await this.initialize();

    try {
      // Create asset objects
      const assetIn = fromAsset === 'TON' 
        ? Asset.native()
        : Asset.jetton(Address.parse(fromAsset));
      
      const assetOut = toAsset === 'TON'
        ? Asset.native()
        : Asset.jetton(Address.parse(toAsset));

      // Get vault for the input asset
      const vault = fromAsset === 'TON'
        ? this.tonClient!.open(await this.factory!.getNativeVault())
        : this.tonClient!.open(
            await this.factory!.getJettonVault(Address.parse(fromAsset))
          );

      // Build swap transaction
      const swapParams = {
        poolAddress: await this.factory!.getPoolAddress(assetIn, assetOut),
        amount: BigInt(amountIn),
        minAmountOut: BigInt(minAmountOut),
        recipientAddress: Address.parse(userAddress),
      };

      // Send transaction via wallet service
      const result = await tonWalletService.sendTransaction(
        vault.address.toString(),
        amountIn,
        'Swap via DeDust'
      );

      return result;
    } catch (error) {
      console.error('DeDust swap error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Swap failed'
      };
    }
  }

  /**
   * Get available pools
   */
  async getAvailablePools(): Promise<Array<{
    asset0: string;
    asset1: string;
    liquidity: string;
    volume24h: string;
  }>> {
    // Implementation to fetch all available pools
    // This would query DeDust API or on-chain data
    return [];
  }

  private calculatePriceImpact(
    amountIn: bigint,
    amountOut: bigint,
    reserves: { reserve0: bigint; reserve1: bigint }
  ): number {
    // Calculate price impact percentage
    const spotPrice = Number(reserves.reserve1) / Number(reserves.reserve0);
    const executionPrice = Number(amountOut) / Number(amountIn);
    const impact = ((spotPrice - executionPrice) / spotPrice) * 100;
    return Math.abs(impact);
  }
}

export const dedustSwapService = new DedustSwapService();
```

### Step 3: Update Swap Page

Update `pages/Swap.tsx` to use real DeDust integration:

```typescript
import { dedustSwapService } from '../services/dedustSwapService';

// In your component:
useEffect(() => {
  // Initialize DeDust on mount
  dedustSwapService.initialize(network);
}, [network]);

// Update quote fetching:
const fetchQuote = async () => {
  if (!fromAmount || !fromToken.address || !toToken.address) return;
  
  setIsLoadingRate(true);
  try {
    const quote = await dedustSwapService.getSwapQuote(
      fromToken.address,
      toToken.address,
      fromAmount
    );
    
    setToAmount(quote.amountOut);
    setPriceImpact(quote.priceImpact);
  } catch (error) {
    console.error('Quote error:', error);
    showToast('Failed to get quote', 'error');
  } finally {
    setIsLoadingRate(false);
  }
};

// Update swap execution:
const handleSwap = async () => {
  setIsLoading(true);
  try {
    const minAmountOut = (parseFloat(toAmount) * (1 - slippage / 100)).toString();
    
    const result = await dedustSwapService.executeSwap(
      fromToken.address,
      toToken.address,
      fromAmount,
      minAmountOut,
      address!
    );
    
    if (result.success) {
      showToast('Swap successful!', 'success');
      // Refresh balances
      refreshData();
    } else {
      showToast(result.error || 'Swap failed', 'error');
    }
  } catch (error) {
    showToast('Swap failed', 'error');
  } finally {
    setIsLoading(false);
  }
};
```

---

## Option 2: STON.fi Integration

### Step 1: Install Dependencies

```bash
npm install @ston-fi/sdk
```

### Step 2: Create STON.fi Service

Create `services/stonfiSwapService.ts`:

```typescript
import { DEX, pTON } from '@ston-fi/sdk';
import { Address } from '@ton/core';
import { TonClient } from '@ton/ton';

class StonfiSwapService {
  private dex: DEX | null = null;
  private client: TonClient | null = null;

  async initialize(network: 'mainnet' | 'testnet' = 'mainnet') {
    this.client = new TonClient({
      endpoint: network === 'mainnet'
        ? 'https://toncenter.com/api/v2/jsonRPC'
        : 'https://testnet.toncenter.com/api/v2/jsonRPC',
      apiKey: process.env.VITE_TONCENTER_API_KEY
    });

    this.dex = new DEX.v1.Router(
      Address.parse('EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt')
    );
  }

  async getSwapQuote(
    fromAsset: string,
    toAsset: string,
    amount: string
  ) {
    if (!this.dex) await this.initialize();

    const fromAddress = fromAsset === 'TON' 
      ? pTON.v1.address 
      : Address.parse(fromAsset);
    
    const toAddress = toAsset === 'TON'
      ? pTON.v1.address
      : Address.parse(toAsset);

    const amountIn = BigInt(amount);

    const pool = await this.dex!.getPool({
      token0: fromAddress,
      token1: toAddress,
    });

    const expectedOut = await pool.getExpectedOutputs({
      amount: amountIn,
      jettonWallet: fromAddress,
    });

    return {
      amountOut: expectedOut.jettonToReceive.toString(),
      priceImpact: 0.5, // Calculate based on pool reserves
      route: [fromAsset, toAsset]
    };
  }

  async executeSwap(
    fromAsset: string,
    toAsset: string,
    amountIn: string,
    minAmountOut: string,
    userAddress: string
  ) {
    // Implementation similar to DeDust
    // Build and send swap transaction
  }
}

export const stonfiSwapService = new StonfiSwapService();
```

---

## Step 4: Update swapService.ts

Update your existing `services/swapService.ts`:

```typescript
import { dedustSwapService } from './dedustSwapService';
import { stonfiSwapService } from './stonfiSwapService';

export type DEXProvider = 'dedust' | 'stonfi' | 'demo';

class SwapService {
  private currentProvider: DEXProvider = 'demo';
  private demoMode = true;

  /**
   * Enable real swaps with a specific DEX
   */
  enableRealSwaps(provider: DEXProvider = 'dedust') {
    this.currentProvider = provider;
    this.demoMode = false;
    console.log(`✅ Real swaps enabled with ${provider}`);
  }

  /**
   * Disable real swaps (back to demo mode)
   */
  disableRealSwaps() {
    this.currentProvider = 'demo';
    this.demoMode = true;
    console.log('⚠️ Swaps in demo mode');
  }

  isDemoModeEnabled(): boolean {
    return this.demoMode;
  }

  getCurrentProvider(): DEXProvider {
    return this.currentProvider;
  }

  /**
   * Get swap quote from selected DEX
   */
  async getSwapQuote(
    fromToken: SwapToken,
    toToken: SwapToken,
    amount: string
  ) {
    if (this.demoMode) {
      // Return mock quote
      return {
        amountOut: (parseFloat(amount) * 0.99).toString(),
        priceImpact: 0.1,
        route: [fromToken.symbol, toToken.symbol]
      };
    }

    // Use real DEX
    switch (this.currentProvider) {
      case 'dedust':
        return await dedustSwapService.getSwapQuote(
          fromToken.address,
          toToken.address,
          amount
        );
      
      case 'stonfi':
        return await stonfiSwapService.getSwapQuote(
          fromToken.address,
          toToken.address,
          amount
        );
      
      default:
        throw new Error('Invalid DEX provider');
    }
  }

  /**
   * Execute swap on selected DEX
   */
  async executeSwap(
    fromToken: SwapToken,
    toToken: SwapToken,
    amount: string,
    slippage: number,
    userAddress: string
  ) {
    if (this.demoMode) {
      // Simulate swap
      await new Promise(resolve => setTimeout(resolve, 2000));
      return {
        success: true,
        txHash: 'demo_' + Date.now(),
        message: 'Demo swap completed'
      };
    }

    // Calculate minimum output with slippage
    const quote = await this.getSwapQuote(fromToken, toToken, amount);
    const minAmountOut = (
      parseFloat(quote.amountOut) * (1 - slippage / 100)
    ).toString();

    // Execute on real DEX
    switch (this.currentProvider) {
      case 'dedust':
        return await dedustSwapService.executeSwap(
          fromToken.address,
          toToken.address,
          amount,
          minAmountOut,
          userAddress
        );
      
      case 'stonfi':
        return await stonfiSwapService.executeSwap(
          fromToken.address,
          toToken.address,
          amount,
          minAmountOut,
          userAddress
        );
      
      default:
        throw new Error('Invalid DEX provider');
    }
  }
}

export const swapService = new SwapService();
```

---

## Step 5: Enable Real Swaps

To enable real swaps in your app:

```typescript
// In your app initialization or settings:
import { swapService } from './services/swapService';

// Enable DeDust (recommended)
swapService.enableRealSwaps('dedust');

// Or enable STON.fi
swapService.enableRealSwaps('stonfi');

// To go back to demo mode
swapService.disableRealSwaps();
```

---

## Step 6: Add DEX Selector UI

Add a DEX selector to your Swap page:

```typescript
const [selectedDEX, setSelectedDEX] = useState<DEXProvider>('demo');

// In your JSX:
<div className="flex gap-2">
  <button
    onClick={() => {
      setSelectedDEX('demo');
      swapService.disableRealSwaps();
    }}
    className={selectedDEX === 'demo' ? 'active' : ''}
  >
    Demo Mode
  </button>
  <button
    onClick={() => {
      setSelectedDEX('dedust');
      swapService.enableRealSwaps('dedust');
    }}
    className={selectedDEX === 'dedust' ? 'active' : ''}
  >
    DeDust
  </button>
  <button
    onClick={() => {
      setSelectedDEX('stonfi');
      swapService.enableRealSwaps('stonfi');
    }}
    className={selectedDEX === 'stonfi' ? 'active' : ''}
  >
    STON.fi
  </button>
</div>
```

---

## Important Considerations

### 1. Gas Fees
Real swaps require TON for gas fees:
- DeDust: ~0.3-0.5 TON per swap
- STON.fi: ~0.2-0.4 TON per swap

Always check user has enough TON for gas before swapping.

### 2. Slippage Protection
```typescript
// Calculate minimum output
const minAmountOut = expectedOutput * (1 - slippage / 100);

// Transaction will revert if actual output < minAmountOut
```

### 3. Price Impact Warning
Show warning if price impact > 5%:
```typescript
if (priceImpact > 5) {
  showToast('High price impact! Consider smaller amount', 'warning');
}
```

### 4. Pool Liquidity
Check if pool has enough liquidity:
```typescript
const pool = await dex.getPool(assetIn, assetOut);
const reserves = await pool.getReserves();

if (reserves.reserve1 < minLiquidity) {
  showToast('Insufficient liquidity', 'error');
  return;
}
```

### 5. Transaction Confirmation
Wait for transaction confirmation:
```typescript
const result = await executeSwap(...);
if (result.success && result.txHash) {
  // Wait for confirmation
  await waitForTransaction(result.txHash);
  // Refresh balances
  refreshData();
}
```

---

## Testing Checklist

Before going live:

- [ ] Test on testnet first
- [ ] Verify gas fee calculations
- [ ] Test slippage protection
- [ ] Test with different token pairs
- [ ] Test edge cases (insufficient balance, no liquidity)
- [ ] Add error handling for all scenarios
- [ ] Test transaction confirmation flow
- [ ] Verify balance updates after swap
- [ ] Test with real wallet (not demo)
- [ ] Monitor for failed transactions

---

## Resources

### DeDust
- Docs: https://docs.dedust.io
- SDK: https://github.com/dedust-io/sdk
- Telegram: https://t.me/dedust

### STON.fi
- Docs: https://docs.ston.fi
- SDK: https://github.com/ston-fi/sdk
- Telegram: https://t.me/stonfidex

### TON Blockchain
- Docs: https://docs.ton.org
- API: https://toncenter.com

---

## Next Steps

1. Choose your DEX (DeDust recommended)
2. Install dependencies
3. Implement the service
4. Test on testnet
5. Enable on mainnet
6. Monitor transactions

Your swap interface is already built - you just need to connect it to a real DEX! 🚀
