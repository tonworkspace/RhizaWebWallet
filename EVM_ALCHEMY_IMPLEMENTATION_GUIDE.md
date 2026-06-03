# EVM Wallet Implementation with Alchemy API
**Date**: May 2, 2026  
**Target Service**: `services/tetherWdkService.ts`  
**Integration**: Alchemy API for multi-chain EVM support  
**Status**: 🚧 Implementation Required

---

## Executive Summary

This guide provides a complete implementation plan for adding EVM wallet support to RhizaCore using Alchemy API. The implementation will enable support for:

- ✅ Ethereum (ETH)
- ✅ Polygon (MATIC)
- ✅ Arbitrum (ETH on L2)
- ✅ BNB Chain (BNB)
- ✅ Avalanche (AVAX)

**Estimated Implementation Time**: 4-6 hours  
**Complexity**: Medium  
**Dependencies**: Alchemy API keys, ethers.js v6

---

## 1. Prerequisites

### 1.1 Alchemy API Keys

**Sign up at**: https://www.alchemy.com/

**Required API Keys** (one per chain):
```env
VITE_ALCHEMY_API_KEY_ETHEREUM=your_ethereum_key
VITE_ALCHEMY_API_KEY_POLYGON=your_polygon_key
VITE_ALCHEMY_API_KEY_ARBITRUM=your_arbitrum_key
VITE_ALCHEMY_API_KEY_BSC=your_bsc_key
VITE_ALCHEMY_API_KEY_AVALANCHE=your_avalanche_key
```

**Free Tier Limits**:
- 300M compute units/month
- ~3M requests/month
- Sufficient for 1000+ daily active users

### 1.2 Dependencies

**Already Installed**:
```json
{
  "ethers": "^6.x.x"  // ✅ Already in package.json
}
```

---

## 2. Architecture Design

### 2.1 EVM Manager Structure

```typescript
class TetherWdkService {
  // Existing TON properties
  private tonManager: any = null;
  private tonAccount: any = null;
  
  // NEW: EVM properties
  private evmWallet: ethers.HDNodeWallet | null = null;
  private evmProviders: Map<EvmChain, ethers.JsonRpcProvider> = new Map();
  private currentEvmChain: EvmChain = 'polygon';
}
```

### 2.2 Alchemy Endpoint Configuration

```typescript
const ALCHEMY_ENDPOINTS: Record<EvmChain, string> = {
  ethereum: 'https://eth-mainnet.g.alchemy.com/v2/',
  polygon: 'https://polygon-mainnet.g.alchemy.com/v2/',
  arbitrum: 'https://arb-mainnet.g.alchemy.com/v2/',
  bsc: 'https://bnb-mainnet.g.alchemy.com/v2/',
  avalanche: 'https://avax-mainnet.g.alchemy.com/v2/',
  plasma: 'https://polygon-mainnet.g.alchemy.com/v2/',  // Polygon alias
  stable: 'https://polygon-mainnet.g.alchemy.com/v2/',  // Polygon alias
  sepolia: 'https://eth-sepolia.g.alchemy.com/v2/'      // Testnet
};

const ALCHEMY_API_KEYS: Record<EvmChain, string> = {
  ethereum: import.meta.env.VITE_ALCHEMY_API_KEY_ETHEREUM || '',
  polygon: import.meta.env.VITE_ALCHEMY_API_KEY_POLYGON || '',
  arbitrum: import.meta.env.VITE_ALCHEMY_API_KEY_ARBITRUM || '',
  bsc: import.meta.env.VITE_ALCHEMY_API_KEY_BSC || '',
  avalanche: import.meta.env.VITE_ALCHEMY_API_KEY_AVALANCHE || '',
  plasma: import.meta.env.VITE_ALCHEMY_API_KEY_POLYGON || '',
  stable: import.meta.env.VITE_ALCHEMY_API_KEY_POLYGON || '',
  sepolia: import.meta.env.VITE_ALCHEMY_API_KEY_ETHEREUM || ''
};
```

---

## 3. Implementation Steps

### Step 1: Add EVM Wallet Derivation

**Location**: `initializeManagers()` method

```typescript
async initializeManagers(seedPhrase: string) {
  // ... existing TON initialization ...
  
  // ── EVM WALLET DERIVATION ──────────────────────────────────────────────
  try {
    // Derive EVM wallet from same seed phrase (BIP44 m/44'/60'/0'/0/0)
    const evmMnemonic = ethers.Mnemonic.fromPhrase(seedPhrase);
    this.evmWallet = ethers.HDNodeWallet.fromMnemonic(
      evmMnemonic,
      "m/44'/60'/0'/0/0"  // Standard Ethereum derivation path
    );
    
    console.log('[WDK/EVM] Wallet derived:', this.evmWallet.address);
    
    // Initialize providers for all supported chains
    for (const [chain, endpoint] of Object.entries(ALCHEMY_ENDPOINTS)) {
      const apiKey = ALCHEMY_API_KEYS[chain as EvmChain];
      if (apiKey) {
        const provider = new ethers.JsonRpcProvider(
          `${endpoint}${apiKey}`,
          chain === 'ethereum' ? 1 : 
          chain === 'polygon' ? 137 :
          chain === 'arbitrum' ? 42161 :
          chain === 'bsc' ? 56 :
          chain === 'avalanche' ? 43114 : 137
        );
        this.evmProviders.set(chain as EvmChain, provider);
      }
    }
    
    console.log('[WDK/EVM] Initialized providers for', this.evmProviders.size, 'chains');
  } catch (evmErr: any) {
    console.error('[WDK/EVM] Init failed:', evmErr);
    // Non-fatal: TON can still work
  }
  
  // ... rest of initialization ...
}
```

### Step 2: Update getAddresses()

```typescript
async getAddresses(): Promise<MultiChainAddresses | null> {
  if (!this.tonAccount) return null;
  
  // ... existing TON address logic ...
  
  return {
    evmAddress: this.evmWallet?.address || '',  // ✅ Now populated
    tonAddress: formattedTonAddress,
    btcAddress: '',  // Future implementation
    solAddress: '',  // Future implementation
    tronAddress: '', // Future implementation
  };
}
```

### Step 3: Add EVM Balance Fetching

```typescript
async getBalances() {
  if (!this.tonAccount) return null;
  
  const perfStart = performance.now();
  
  let evmBalance = '0.0000';
  let tonBalance = '0.0000';
  // ... other balances ...
  
  // ── EVM BALANCE FETCHING ──────────────────────────────────────────────
  if (this.evmWallet && this.evmProviders.size > 0) {
    try {
      const provider = this.evmProviders.get(this.currentEvmChain);
      if (provider) {
        const cacheKey = `evm_${this.currentEvmChain}_${this.evmWallet.address}`;
        const cached = this.balanceCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.BALANCE_CACHE_TTL) {
          evmBalance = cached.balance;
        } else {
          const balanceWei = await provider.getBalance(this.evmWallet.address);
          evmBalance = ethers.formatEther(balanceWei);
          
          // Cache the result
          this.balanceCache.set(cacheKey, {
            balance: evmBalance,
            timestamp: Date.now()
          });
          
          // Deposit detection
          const prevEntry = this.balanceCache.get(cacheKey);
          if (prevEntry && parseFloat(evmBalance) > parseFloat(prevEntry.balance)) {
            console.log(`[WDK/EVM] Deposit detected on ${this.currentEvmChain}`);
          }
        }
        
        console.log(`[WDK/EVM] Balance on ${this.currentEvmChain}:`, evmBalance);
      }
    } catch (e) {
      console.error('[WDK/EVM] Balance fetch failed:', e);
    }
  }
  
  // ... existing TON balance logic ...
  
  return { evmBalance, tonBalance, btcBalance, solBalance, tronBalance };
}
```

### Step 4: Add EVM Transaction Sending

```typescript
/**
 * Send native EVM token (ETH, MATIC, BNB, AVAX) to a recipient
 */
async sendEvmTransaction(
  toAddress: string,
  amount: string,
  chain: EvmChain = this.currentEvmChain
): Promise<{ success: boolean; txHash?: string; fee?: string; error?: string }> {
  if (!this.evmWallet) {
    return { success: false, error: 'EVM wallet not initialized' };
  }
  
  try {
    const provider = this.evmProviders.get(chain);
    if (!provider) {
      return { success: false, error: `Provider not configured for ${chain}` };
    }
    
    // Connect wallet to provider
    const signer = this.evmWallet.connect(provider);
    
    // Validate address
    if (!ethers.isAddress(toAddress)) {
      return { success: false, error: 'Invalid recipient address' };
    }
    
    // Parse amount
    const amountWei = ethers.parseEther(amount);
    
    // Estimate gas
    const gasLimit = await provider.estimateGas({
      from: signer.address,
      to: toAddress,
      value: amountWei
    });
    
    // Get current gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('20', 'gwei');
    
    // Calculate total fee
    const estimatedFee = gasLimit * gasPrice;
    const feeEth = ethers.formatEther(estimatedFee);
    
    console.log(`[WDK/EVM] Estimated fee: ${feeEth} ${chain.toUpperCase()}`);
    
    // Send transaction
    const tx = await signer.sendTransaction({
      to: toAddress,
      value: amountWei,
      gasLimit: gasLimit,
      gasPrice: gasPrice
    });
    
    console.log(`[WDK/EVM] Transaction sent:`, tx.hash);
    
    // Wait for confirmation (1 block)
    const receipt = await tx.wait(1);
    
    if (receipt?.status === 1) {
      console.log(`[WDK/EVM] Transaction confirmed:`, receipt.hash);
      return {
        success: true,
        txHash: receipt.hash,
        fee: feeEth
      };
    } else {
      return {
        success: false,
        error: 'Transaction failed on-chain'
      };
    }
    
  } catch (error: any) {
    console.error('[WDK/EVM] Send failed:', error);
    return {
      success: false,
      error: wdkErrorMessage(error, chain.toUpperCase())
    };
  }
}
```

### Step 5: Add ERC-20 Token Support

```typescript
/**
 * Send ERC-20 token (USDT, USDC, etc.) on EVM chains
 */
async sendErc20Transaction(
  tokenAddress: string,
  toAddress: string,
  amount: string,
  decimals: number = 6,
  chain: EvmChain = this.currentEvmChain
): Promise<{ success: boolean; txHash?: string; fee?: string; error?: string }> {
  if (!this.evmWallet) {
    return { success: false, error: 'EVM wallet not initialized' };
  }
  
  try {
    const provider = this.evmProviders.get(chain);
    if (!provider) {
      return { success: false, error: `Provider not configured for ${chain}` };
    }
    
    const signer = this.evmWallet.connect(provider);
    
    // ERC-20 ABI (transfer function only)
    const erc20Abi = [
      'function transfer(address to, uint256 amount) returns (bool)',
      'function balanceOf(address owner) view returns (uint256)',
      'function decimals() view returns (uint8)'
    ];
    
    // Create contract instance
    const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, signer);
    
    // Parse amount with correct decimals
    const amountBigInt = ethers.parseUnits(amount, decimals);
    
    // Check balance
    const balance = await tokenContract.balanceOf(signer.address);
    if (balance < amountBigInt) {
      return { success: false, error: 'Insufficient token balance' };
    }
    
    // Estimate gas
    const gasLimit = await tokenContract.transfer.estimateGas(toAddress, amountBigInt);
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('20', 'gwei');
    const estimatedFee = gasLimit * gasPrice;
    const feeEth = ethers.formatEther(estimatedFee);
    
    // Send transaction
    const tx = await tokenContract.transfer(toAddress, amountBigInt, {
      gasLimit: gasLimit,
      gasPrice: gasPrice
    });
    
    console.log(`[WDK/EVM] ERC-20 transfer sent:`, tx.hash);
    
    // Wait for confirmation
    const receipt = await tx.wait(1);
    
    if (receipt?.status === 1) {
      return {
        success: true,
        txHash: receipt.hash,
        fee: feeEth
      };
    } else {
      return {
        success: false,
        error: 'Transaction failed on-chain'
      };
    }
    
  } catch (error: any) {
    console.error('[WDK/EVM] ERC-20 send failed:', error);
    return {
      success: false,
      error: wdkErrorMessage(error, `${chain.toUpperCase()}-ERC20`)
    };
  }
}
```

### Step 6: Add ERC-20 Balance Fetching

```typescript
/**
 * Get ERC-20 token balance (USDT, USDC, etc.)
 */
async getErc20Balance(
  tokenAddress: string,
  decimals: number = 6,
  chain: EvmChain = this.currentEvmChain
): Promise<string> {
  if (!this.evmWallet) return '0';
  
  try {
    const provider = this.evmProviders.get(chain);
    if (!provider) return '0';
    
    const erc20Abi = ['function balanceOf(address owner) view returns (uint256)'];
    const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, provider);
    
    const balance = await tokenContract.balanceOf(this.evmWallet.address);
    return ethers.formatUnits(balance, decimals);
  } catch (e) {
    console.error(`[WDK/EVM] ERC-20 balance fetch failed:`, e);
    return '0';
  }
}
```

### Step 7: Update Wallet Health Check

```typescript
getWalletHealth(): {
  evm: boolean;
  ton: boolean;
  btc: boolean;
  sol: boolean;
  tron: boolean;
} {
  return {
    evm: !!this.evmWallet && this.evmProviders.size > 0,  // ✅ Now checks EVM
    ton: !!this.tonAccount && !!this.tonManager && !!this.nativeTonContract,
    btc: false,
    sol: false,
    tron: false
  };
}
```

### Step 8: Add Chain Switching

```typescript
/**
 * Switch active EVM chain
 */
async switchEvmChain(chain: EvmChain): Promise<boolean> {
  if (!this.evmProviders.has(chain)) {
    console.error(`[WDK/EVM] Chain ${chain} not configured`);
    return false;
  }
  
  this.currentEvmChain = chain;
  console.log(`[WDK/EVM] Switched to ${chain}`);
  return true;
}

/**
 * Get current EVM chain
 */
getCurrentEvmChain(): EvmChain {
  return this.currentEvmChain;
}
```

### Step 9: Update Logout Method

```typescript
logout() {
  // Existing TON cleanup
  try { this.tonManager?.dispose(); } catch (_) { }
  this.tonManager = null;
  this.tonAccount = null;
  this.mnemonic = null;
  this.nativeTonClient = null;
  this.nativeTonContract = null;
  this.nativeTonKeyPair = null;
  
  // NEW: EVM cleanup
  this.evmWallet = null;
  this.evmProviders.clear();
  this.currentEvmChain = 'polygon';
}
```

---

## 4. Environment Configuration

### 4.1 Update .env File

```env
# Existing TON keys
VITE_TONCENTER_API_KEY_MAINNET=your_mainnet_key
VITE_TONCENTER_API_KEY_TESTNET=your_testnet_key
VITE_TONAPI_KEY_MAINNET=your_tonapi_key
VITE_TONAPI_KEY_TESTNET=your_tonapi_key

# NEW: Alchemy API Keys
VITE_ALCHEMY_API_KEY_ETHEREUM=your_ethereum_key
VITE_ALCHEMY_API_KEY_POLYGON=your_polygon_key
VITE_ALCHEMY_API_KEY_ARBITRUM=your_arbitrum_key
VITE_ALCHEMY_API_KEY_BSC=your_bsc_key
VITE_ALCHEMY_API_KEY_AVALANCHE=your_avalanche_key
```

### 4.2 Alchemy Dashboard Setup

1. **Sign up**: https://www.alchemy.com/
2. **Create Apps** (one per chain):
   - Ethereum Mainnet
   - Polygon Mainnet
   - Arbitrum One
   - BNB Smart Chain
   - Avalanche C-Chain
3. **Copy API Keys** to `.env`
4. **Enable Enhanced APIs** (optional):
   - Token API (for ERC-20 balances)
   - NFT API (for NFT support)
   - Notify API (for webhooks)

---

## 5. Testing Checklist

### 5.1 Unit Tests

```typescript
// Test EVM wallet derivation
describe('EVM Wallet Derivation', () => {
  it('should derive EVM address from seed phrase', async () => {
    const service = new TetherWdkService();
    const addresses = await service.initializeManagers(TEST_MNEMONIC);
    expect(addresses.evmAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });
});

// Test balance fetching
describe('EVM Balance Fetching', () => {
  it('should fetch ETH balance from Alchemy', async () => {
    const balances = await tetherWdkService.getBalances();
    expect(balances.evmBalance).toBeDefined();
    expect(parseFloat(balances.evmBalance)).toBeGreaterThanOrEqual(0);
  });
});

// Test transaction sending
describe('EVM Transaction Sending', () => {
  it('should send ETH transaction', async () => {
    const result = await tetherWdkService.sendEvmTransaction(
      '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      '0.001',
      'polygon'
    );
    expect(result.success).toBe(true);
    expect(result.txHash).toBeDefined();
  });
});
```

### 5.2 Manual Testing

**Test Scenarios**:
1. ✅ Derive EVM wallet from existing TON seed phrase
2. ✅ Fetch balance on Ethereum
3. ✅ Fetch balance on Polygon
4. ✅ Send 0.001 ETH on Ethereum
5. ✅ Send 0.1 MATIC on Polygon
6. ✅ Send USDT (ERC-20) on Polygon
7. ✅ Switch between chains
8. ✅ Cache hit rate > 80%
9. ✅ Error handling (insufficient funds, invalid address)
10. ✅ Logout clears EVM wallet

---

## 6. Integration with WalletContext

### 6.1 Update WalletContext.tsx

```typescript
// In refreshData() method
const wdkPromise = (async () => {
  try {
    const { tetherWdkService } = await import('../services/tetherWdkService');
    
    // ... existing TON logic ...
    
    // NEW: Fetch EVM balance
    if (tetherWdkService.isEvmReady()) {
      const evmBalance = await tetherWdkService.getBalances();
      setMultiChainBalances(prev => ({
        ...prev,
        evm: evmBalance.evmBalance
      }));
    }
  } catch (e) {
    console.error('Failed to sync WDK balances:', e);
  }
})();
```

### 6.2 Add isEvmReady() Method

```typescript
// In tetherWdkService.ts
isEvmReady(): boolean {
  return !!this.evmWallet && this.evmProviders.size > 0;
}
```

---

## 7. UI Updates

### 7.1 Assets Page

**Display EVM Balance**:
```typescript
// In Assets.tsx
const evmBalance = multiChainBalances?.evm || '0.0000';
const evmValue = parseFloat(evmBalance) * ethPrice;

<div className="asset-card">
  <div className="asset-icon">⟠</div>
  <div className="asset-info">
    <div className="asset-name">{CHAIN_META[currentEvmChain].name}</div>
    <div className="asset-balance">{evmBalance} {CHAIN_META[currentEvmChain].symbol}</div>
    <div className="asset-value">${evmValue.toFixed(2)}</div>
  </div>
</div>
```

### 7.2 Send Page

**Add EVM Send Support**:
```typescript
// In Send.tsx
const handleSend = async () => {
  if (selectedChain === 'evm') {
    const result = await tetherWdkService.sendEvmTransaction(
      recipientAddress,
      amount,
      currentEvmChain
    );
    
    if (result.success) {
      showSuccess(`Transaction sent! Hash: ${result.txHash}`);
    } else {
      showError(result.error);
    }
  }
  // ... existing TON logic ...
};
```

---

## 8. Performance Optimization

### 8.1 Batch Balance Fetching

```typescript
/**
 * Fetch balances for all EVM chains in parallel
 */
async getAllEvmBalances(): Promise<Record<EvmChain, string>> {
  if (!this.evmWallet) return {} as Record<EvmChain, string>;
  
  const promises = Array.from(this.evmProviders.entries()).map(
    async ([chain, provider]) => {
      try {
        const balance = await provider.getBalance(this.evmWallet!.address);
        return [chain, ethers.formatEther(balance)] as [EvmChain, string];
      } catch (e) {
        return [chain, '0.0000'] as [EvmChain, string];
      }
    }
  );
  
  const results = await Promise.all(promises);
  return Object.fromEntries(results) as Record<EvmChain, string>;
}
```

### 8.2 Alchemy Enhanced APIs

**Token Balances** (single API call for all ERC-20 tokens):
```typescript
async getAllTokenBalances(chain: EvmChain): Promise<any[]> {
  const provider = this.evmProviders.get(chain);
  if (!provider || !this.evmWallet) return [];
  
  // Alchemy Enhanced API: alchemy_getTokenBalances
  const response = await provider.send('alchemy_getTokenBalances', [
    this.evmWallet.address,
    'DEFAULT_TOKENS'  // Alchemy's curated token list
  ]);
  
  return response.tokenBalances;
}
```

---

## 9. Security Considerations

### 9.1 Private Key Management

**Best Practices**:
- ✅ Derive from same seed phrase as TON (single backup)
- ✅ Never log private keys
- ✅ Clear from memory on logout
- ✅ Use ethers.js secure key derivation

### 9.2 Transaction Safety

**Safeguards**:
```typescript
// Gas limit safety check
const MAX_GAS_LIMIT = 500000n;  // 500k gas max
if (gasLimit > MAX_GAS_LIMIT) {
  throw new Error('Gas limit exceeds safety threshold');
}

// Gas price safety check (prevent overpaying)
const MAX_GAS_PRICE = ethers.parseUnits('500', 'gwei');  // 500 gwei max
if (gasPrice > MAX_GAS_PRICE) {
  throw new Error('Gas price too high. Network congested?');
}
```

### 9.3 Address Validation

```typescript
// Always validate addresses before sending
if (!ethers.isAddress(toAddress)) {
  throw new Error('Invalid Ethereum address');
}

// Checksum validation
const checksummed = ethers.getAddress(toAddress);
if (checksummed !== toAddress) {
  console.warn('Address checksum mismatch, using checksummed version');
}
```

---

## 10. Monitoring & Analytics

### 10.1 Alchemy Dashboard Metrics

**Track**:
- API request count
- Compute units used
- Error rate
- Response time
- Chain distribution

### 10.2 Application Metrics

```typescript
// Track EVM operations
private evmMetrics = {
  totalTransactions: 0,
  successfulTransactions: 0,
  failedTransactions: 0,
  totalGasUsed: 0n,
  averageGasPrice: 0n
};

// Update after each transaction
this.evmMetrics.totalTransactions++;
if (receipt.status === 1) {
  this.evmMetrics.successfulTransactions++;
  this.evmMetrics.totalGasUsed += receipt.gasUsed;
}
```

---

## 11. Rollout Plan

### Phase 1: Development (Week 1)
- ✅ Implement EVM wallet derivation
- ✅ Add Alchemy provider initialization
- ✅ Implement balance fetching
- ✅ Add transaction sending
- ✅ Unit tests

### Phase 2: Testing (Week 2)
- ✅ Testnet testing (Sepolia)
- ✅ Integration testing with UI
- ✅ Performance testing
- ✅ Security audit

### Phase 3: Mainnet Launch (Week 3)
- ✅ Deploy to production
- ✅ Monitor Alchemy usage
- ✅ User feedback collection
- ✅ Bug fixes

### Phase 4: Optimization (Week 4)
- ✅ Implement batch operations
- ✅ Add enhanced APIs
- ✅ Performance tuning
- ✅ Documentation

---

## 12. Cost Analysis

### 12.1 Alchemy Pricing

**Free Tier**:
- 300M compute units/month
- Sufficient for ~1000 DAU
- No credit card required

**Growth Tier** ($49/month):
- 1.5B compute units/month
- ~5000 DAU
- Priority support

**Scale Tier** ($199/month):
- 6B compute units/month
- ~20,000 DAU
- Dedicated support

### 12.2 Compute Unit Costs

| Operation | Compute Units | Cost per 1000 ops |
|-----------|---------------|-------------------|
| eth_getBalance | 10 | $0.00 (free tier) |
| eth_sendRawTransaction | 100 | $0.00 (free tier) |
| eth_estimateGas | 50 | $0.00 (free tier) |
| alchemy_getTokenBalances | 150 | $0.00 (free tier) |

**Estimated Monthly Cost** (1000 DAU):
- Balance checks: 1000 users × 10 checks/day × 30 days × 10 CU = 3M CU
- Transactions: 1000 users × 2 tx/day × 30 days × 100 CU = 6M CU
- **Total**: 9M CU/month (3% of free tier)

---

## 13. Troubleshooting

### Common Issues

**Issue 1**: "Provider not configured"
```typescript
// Solution: Check API key is set in .env
console.log('Alchemy key:', import.meta.env.VITE_ALCHEMY_API_KEY_ETHEREUM);
```

**Issue 2**: "Insufficient funds for gas"
```typescript
// Solution: Check native token balance (ETH, MATIC, etc.)
const balance = await provider.getBalance(address);
console.log('Native balance:', ethers.formatEther(balance));
```

**Issue 3**: "Transaction underpriced"
```typescript
// Solution: Increase gas price
const feeData = await provider.getFeeData();
const gasPrice = feeData.gasPrice * 120n / 100n;  // +20%
```

---

## 14. Next Steps

### Immediate Actions
1. ✅ Sign up for Alchemy account
2. ✅ Create apps for each chain
3. ✅ Add API keys to `.env`
4. ✅ Implement EVM wallet derivation
5. ✅ Test on Sepolia testnet

### Future Enhancements
- 🔄 Add Optimism support
- 🔄 Add Base support
- 🔄 Implement EIP-1559 (dynamic fees)
- 🔄 Add transaction history via Alchemy
- 🔄 Implement NFT support
- 🔄 Add DeFi protocol integration

---

**End of Implementation Guide**

**Questions?** Contact the development team or refer to:
- Alchemy Docs: https://docs.alchemy.com/
- Ethers.js Docs: https://docs.ethers.org/v6/
- WDK Docs: https://docs.wdk.tether.io/
