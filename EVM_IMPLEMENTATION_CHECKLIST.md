# EVM Implementation Checklist
**Date**: May 2, 2026  
**Status**: 🚧 Ready to Implement  
**Estimated Time**: 4-6 hours

---

## Pre-Implementation

### 1. Alchemy Account Setup
- [ ] Sign up at https://www.alchemy.com/
- [ ] Create app for **Ethereum Mainnet**
- [ ] Create app for **Polygon Mainnet**
- [ ] Create app for **Arbitrum One**
- [ ] Create app for **BNB Smart Chain**
- [ ] Create app for **Avalanche C-Chain**
- [ ] Copy all API keys

### 2. Environment Configuration
- [ ] Add `VITE_ALCHEMY_API_KEY_ETHEREUM` to `.env`
- [ ] Add `VITE_ALCHEMY_API_KEY_POLYGON` to `.env`
- [ ] Add `VITE_ALCHEMY_API_KEY_ARBITRUM` to `.env`
- [ ] Add `VITE_ALCHEMY_API_KEY_BSC` to `.env`
- [ ] Add `VITE_ALCHEMY_API_KEY_AVALANCHE` to `.env`
- [ ] Verify all keys are loaded: `console.log(import.meta.env.VITE_ALCHEMY_API_KEY_ETHEREUM)`

---

## Implementation Steps

### Phase 1: Core EVM Wallet (2 hours)

#### Step 1.1: Add Alchemy Configuration
**File**: `services/tetherWdkService.ts`
- [ ] Add `ALCHEMY_ENDPOINTS` constant (line ~30)
- [ ] Add `ALCHEMY_API_KEYS` constant (line ~40)
- [ ] Add `evmWallet` property to class (line ~100)
- [ ] Add `evmProviders` Map property (line ~101)
- [ ] Add `currentEvmChain` property (line ~102)

#### Step 1.2: Implement EVM Wallet Derivation
**File**: `services/tetherWdkService.ts` → `initializeManagers()` method
- [ ] Add EVM wallet derivation after TON initialization (line ~200)
- [ ] Use BIP44 path `m/44'/60'/0'/0/0`
- [ ] Initialize providers for all chains
- [ ] Add error handling (non-fatal)
- [ ] Log initialization status

#### Step 1.3: Update getAddresses()
**File**: `services/tetherWdkService.ts` → `getAddresses()` method
- [ ] Return `this.evmWallet?.address || ''` for `evmAddress`
- [ ] Test address format (should be `0x...`)

#### Step 1.4: Update getWalletHealth()
**File**: `services/tetherWdkService.ts` → `getWalletHealth()` method
- [ ] Change `evm: false` to `evm: !!this.evmWallet && this.evmProviders.size > 0`
- [ ] Test health check returns true after initialization

#### Step 1.5: Update logout()
**File**: `services/tetherWdkService.ts` → `logout()` method
- [ ] Add `this.evmWallet = null`
- [ ] Add `this.evmProviders.clear()`
- [ ] Add `this.currentEvmChain = 'polygon'`

**Test Phase 1**:
```bash
npm run build
# Should compile without errors
```

---

### Phase 2: Balance Fetching (1 hour)

#### Step 2.1: Implement EVM Balance Fetching
**File**: `services/tetherWdkService.ts` → `getBalances()` method
- [ ] Add EVM balance fetching after TON balance logic (line ~400)
- [ ] Use `provider.getBalance(this.evmWallet.address)`
- [ ] Format with `ethers.formatEther(balanceWei)`
- [ ] Implement caching (5-second TTL)
- [ ] Add deposit detection
- [ ] Log balance fetch time

#### Step 2.2: Add isEvmReady() Method
**File**: `services/tetherWdkService.ts`
- [ ] Add new method: `isEvmReady(): boolean`
- [ ] Return `!!this.evmWallet && this.evmProviders.size > 0`

#### Step 2.3: Add ERC-20 Balance Fetching
**File**: `services/tetherWdkService.ts`
- [ ] Add new method: `getErc20Balance(tokenAddress, decimals, chain)`
- [ ] Use ERC-20 ABI: `['function balanceOf(address owner) view returns (uint256)']`
- [ ] Create contract instance
- [ ] Fetch balance
- [ ] Format with correct decimals

**Test Phase 2**:
```typescript
// In browser console after login
const { tetherWdkService } = await import('./services/tetherWdkService');
const balances = await tetherWdkService.getBalances();
console.log('EVM Balance:', balances.evmBalance);
// Should show actual balance (not "0.0000")
```

---

### Phase 3: Transaction Sending (2 hours)

#### Step 3.1: Implement Native Token Sending
**File**: `services/tetherWdkService.ts`
- [ ] Add new method: `sendEvmTransaction(toAddress, amount, chain)`
- [ ] Validate address with `ethers.isAddress()`
- [ ] Parse amount with `ethers.parseEther()`
- [ ] Estimate gas with `provider.estimateGas()`
- [ ] Get current gas price with `provider.getFeeData()`
- [ ] Send transaction with `signer.sendTransaction()`
- [ ] Wait for confirmation with `tx.wait(1)`
- [ ] Return success/error with txHash

#### Step 3.2: Implement ERC-20 Token Sending
**File**: `services/tetherWdkService.ts`
- [ ] Add new method: `sendErc20Transaction(tokenAddress, toAddress, amount, decimals, chain)`
- [ ] Use ERC-20 ABI: `['function transfer(address to, uint256 amount) returns (bool)']`
- [ ] Create contract instance
- [ ] Parse amount with `ethers.parseUnits(amount, decimals)`
- [ ] Check balance before sending
- [ ] Estimate gas
- [ ] Send transaction
- [ ] Wait for confirmation

#### Step 3.3: Add Chain Switching
**File**: `services/tetherWdkService.ts`
- [ ] Add new method: `switchEvmChain(chain)`
- [ ] Validate chain exists in providers
- [ ] Update `this.currentEvmChain`
- [ ] Return success boolean

**Test Phase 3**:
```typescript
// Test on Sepolia testnet first
const result = await tetherWdkService.sendEvmTransaction(
  '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  '0.001',
  'sepolia'
);
console.log('Transaction:', result);
// Should return { success: true, txHash: '0x...' }
```

---

### Phase 4: UI Integration (1 hour)

#### Step 4.1: Update WalletContext
**File**: `context/WalletContext.tsx` → `refreshData()` method
- [ ] Add EVM balance fetching in `wdkPromise`
- [ ] Check `tetherWdkService.isEvmReady()`
- [ ] Update `multiChainBalances.evm`

#### Step 4.2: Update Assets Page
**File**: `pages/Assets.tsx`
- [ ] Display EVM balance from `multiChainBalances?.evm`
- [ ] Show current chain name from `CHAIN_META[currentEvmChain]`
- [ ] Calculate USD value with `ethPrice`

#### Step 4.3: Update Transfer Page
**File**: `pages/Transfer.tsx`
- [ ] Add EVM send support in `handleSend()`
- [ ] Call `tetherWdkService.sendEvmTransaction()`
- [ ] Show success/error messages

**Test Phase 4**:
- [ ] Login to wallet
- [ ] Navigate to Assets page
- [ ] Verify EVM balance shows correctly
- [ ] Navigate to Transfer page
- [ ] Send small amount on testnet
- [ ] Verify transaction appears in history

---

## Testing Checklist

### Unit Tests
- [ ] EVM wallet derivation from seed phrase
- [ ] Address format validation (0x...)
- [ ] Balance fetching on all chains
- [ ] Native token sending
- [ ] ERC-20 token sending
- [ ] Gas estimation
- [ ] Error handling (insufficient funds, invalid address)
- [ ] Cache hit rate > 80%

### Integration Tests
- [ ] Multi-chain balance display
- [ ] Chain switching
- [ ] Transaction history
- [ ] Deposit detection
- [ ] Logout cleanup

### Manual Tests (Testnet)
- [ ] Create new wallet
- [ ] Verify EVM address generated
- [ ] Get testnet ETH from faucet
- [ ] Check balance appears in UI
- [ ] Send 0.001 ETH to another address
- [ ] Verify transaction succeeds
- [ ] Check transaction on Etherscan
- [ ] Switch to Polygon testnet
- [ ] Repeat balance/send tests

### Manual Tests (Mainnet)
- [ ] Login with existing wallet
- [ ] Verify real balance shows
- [ ] Send small amount (0.001 ETH)
- [ ] Verify transaction on Etherscan
- [ ] Test on Polygon mainnet
- [ ] Test on Arbitrum mainnet
- [ ] Verify all chains work

---

## Performance Validation

### Metrics to Track
- [ ] EVM wallet initialization < 500ms
- [ ] Balance fetch (cached) < 1ms
- [ ] Balance fetch (fresh) < 300ms
- [ ] Transaction send < 3s
- [ ] Cache hit rate > 80%
- [ ] API error rate < 1%

### Alchemy Usage Monitoring
- [ ] Check Alchemy dashboard after 24 hours
- [ ] Verify compute units used < 1M/day (for 100 users)
- [ ] Check for any rate limit errors
- [ ] Monitor response times

---

## Security Validation

### Code Review
- [ ] No private keys logged
- [ ] No API keys in source code
- [ ] Proper error handling
- [ ] Input validation (addresses, amounts)
- [ ] Gas limit safety checks
- [ ] Gas price safety checks

### Penetration Testing
- [ ] Test with invalid addresses
- [ ] Test with insufficient balance
- [ ] Test with zero amount
- [ ] Test with negative amount
- [ ] Test with extremely large amount
- [ ] Test with malformed transaction data

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Build succeeds (`npm run build`)
- [ ] No console errors in production build
- [ ] Alchemy API keys in production `.env`
- [ ] Backup current production code

### Deployment
- [ ] Deploy to staging environment
- [ ] Test on staging with real Alchemy keys
- [ ] Verify all chains work
- [ ] Test with multiple users
- [ ] Monitor for 24 hours
- [ ] Deploy to production

### Post-Deployment
- [ ] Monitor Alchemy usage
- [ ] Check error logs
- [ ] Collect user feedback
- [ ] Monitor transaction success rate
- [ ] Track performance metrics

---

## Rollback Plan

### If Issues Occur
1. **Immediate Actions**:
   - [ ] Revert to previous deployment
   - [ ] Notify users of temporary EVM unavailability
   - [ ] TON wallet continues to work (unaffected)

2. **Investigation**:
   - [ ] Check Alchemy dashboard for errors
   - [ ] Review application logs
   - [ ] Identify root cause

3. **Fix & Redeploy**:
   - [ ] Fix identified issues
   - [ ] Test on staging
   - [ ] Redeploy to production

---

## Success Criteria

### Technical Success
- ✅ EVM wallet initializes successfully
- ✅ All 5 chains supported (Ethereum, Polygon, Arbitrum, BSC, Avalanche)
- ✅ Balance fetching works on all chains
- ✅ Transaction sending works on all chains
- ✅ Cache hit rate > 80%
- ✅ Transaction success rate > 99%
- ✅ No security vulnerabilities

### Business Success
- ✅ Users can send/receive on EVM chains
- ✅ Multi-chain balance display works
- ✅ Transaction fees < $0.50 average
- ✅ User satisfaction > 4.5/5
- ✅ No critical bugs reported

### Cost Success
- ✅ Alchemy usage < 300M CU/month (free tier)
- ✅ No unexpected API costs
- ✅ Performance meets SLA

---

## Timeline

### Day 1 (4 hours)
- ✅ Phase 1: Core EVM Wallet (2 hours)
- ✅ Phase 2: Balance Fetching (1 hour)
- ✅ Phase 3: Transaction Sending (1 hour)

### Day 2 (2 hours)
- ✅ Phase 4: UI Integration (1 hour)
- ✅ Testing (1 hour)

### Day 3 (2 hours)
- ✅ Testnet validation
- ✅ Security review
- ✅ Performance testing

### Day 4 (2 hours)
- ✅ Staging deployment
- ✅ Final testing
- ✅ Production deployment

**Total Time**: 10 hours (spread over 4 days)

---

## Support Resources

### Documentation
- **Alchemy Docs**: https://docs.alchemy.com/
- **Ethers.js Docs**: https://docs.ethers.org/v6/
- **Implementation Guide**: `EVM_ALCHEMY_IMPLEMENTATION_GUIDE.md`
- **Audit Report**: `WDK_SERVICE_COMPREHENSIVE_AUDIT.md`

### Tools
- **Alchemy Dashboard**: https://dashboard.alchemy.com/
- **Sepolia Faucet**: https://sepoliafaucet.com/
- **Polygon Faucet**: https://faucet.polygon.technology/
- **Etherscan**: https://etherscan.io/
- **PolygonScan**: https://polygonscan.com/

### Support Channels
- **Alchemy Discord**: https://discord.gg/alchemy
- **Ethers.js GitHub**: https://github.com/ethers-io/ethers.js
- **Team Slack**: #rhizacore-dev

---

## Notes

### Important Reminders
- ⚠️ Test on Sepolia testnet FIRST before mainnet
- ⚠️ Start with small amounts (0.001 ETH)
- ⚠️ Monitor Alchemy usage daily for first week
- ⚠️ Keep TON wallet working (it's the primary chain)
- ⚠️ EVM is an enhancement, not a replacement

### Known Limitations
- Free tier supports ~1000 DAU
- Gas prices fluctuate (can be expensive on Ethereum)
- Transaction confirmation times vary by chain
- Some chains may have higher failure rates

### Future Enhancements
- Add Optimism support
- Add Base support
- Implement EIP-1559 (dynamic fees)
- Add transaction history via Alchemy
- Implement NFT support
- Add DeFi protocol integration

---

**Status**: ✅ Ready to Start  
**Next Action**: Sign up for Alchemy account and create apps

---

**End of Checklist**
