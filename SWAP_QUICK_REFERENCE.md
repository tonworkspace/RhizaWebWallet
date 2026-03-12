# Swap Quick Reference Card

## Enable Real Swaps (2 Lines of Code)

```typescript
// File: services/swapService.ts (Lines 18-19)

private isDemoMode = false;  // Change true → false
private network: 'mainnet' | 'testnet' = 'testnet';  // or 'mainnet'
```

## Files Overview

| File | Purpose | Status |
|------|---------|--------|
| `config/dexConfig.ts` | DEX addresses & token config | ✅ Complete |
| `services/swapService.ts` | Swap execution logic | ✅ Complete |
| `pages/Swap.tsx` | Swap UI | ✅ Complete |
| `test_swap_integration.js` | Test script | ✅ Complete |

## Supported Swaps

✅ TON → USDT/USDC/jUSDT  
✅ USDT/USDC/jUSDT → TON  
✅ USDT ↔ USDC ↔ jUSDT  
✅ Any jetton ↔ Any jetton

## Gas Fees

- TON → Jetton: ~0.25 TON
- Jetton → TON: ~0.30 TON
- Jetton → Jetton: ~0.30 TON

## Testing Steps

### 1. Testnet (RECOMMENDED FIRST)
```typescript
isDemoMode = false
network = 'testnet'
```
1. Get testnet TON: https://testnet.tonscan.org/faucet
2. Test swap on Swap page
3. Verify on explorer: https://testnet.tonscan.org

### 2. Mainnet (After Testing)
```typescript
isDemoMode = false
network = 'mainnet'
```
1. Test with small amount (0.1 TON)
2. Verify transaction
3. Monitor closely

## Console Test

```javascript
// Paste in browser console
// (Copy from test_swap_integration.js)
```

## Transaction Flow

```
User → Swap UI → swapService → tonWalletService → TON Blockchain
                     ↓
                 DeDust DEX
                     ↓
                 Confirmation
                     ↓
                Update Balance
```

## Key Functions

```typescript
// Get exchange rate
await swapService.getExchangeRate('TON', 'USDT')

// Get swap quote
await swapService.getSwapQuote(fromToken, toToken, amount, slippage)

// Execute swap
await swapService.executeSwap(fromToken, toToken, amount, slippage, userAddress)

// Get available tokens
await swapService.getAvailableTokens(userAddress)
```

## Troubleshooting

| Error | Solution |
|-------|----------|
| "Wallet not initialized" | User needs to login |
| "Insufficient balance" | Need more TON for gas |
| "Transaction timeout" | Network congestion, retry |
| "Invalid token address" | Check dexConfig.ts |

## Security Checklist

- [x] Input validation
- [x] Balance checking
- [x] Slippage protection
- [x] Gas estimation
- [x] Transaction confirmation
- [x] Error handling
- [x] Wallet initialization check

## Monitoring

### Success Log
```
✅ Swap executed successfully!
   TX Hash: EQAbc...xyz_42
```

### Error Log
```
❌ Swap execution failed: [reason]
```

## Resources

- **Guide**: `ENABLE_REAL_SWAPS_GUIDE.md`
- **Status**: `REAL_SWAP_INTEGRATION_COMPLETE.md`
- **DeDust**: https://dedust.io/docs
- **Testnet Faucet**: https://testnet.tonscan.org/faucet

## Quick Enable Checklist

- [ ] Review code changes
- [ ] Set `isDemoMode = false`
- [ ] Choose network (testnet/mainnet)
- [ ] Get testnet TON (if testing)
- [ ] Test swap
- [ ] Verify transaction
- [ ] Monitor logs
- [ ] Go live!

---

**Status**: ✅ Ready to Enable  
**Time to Test**: 1-2 hours  
**Risk**: Low
