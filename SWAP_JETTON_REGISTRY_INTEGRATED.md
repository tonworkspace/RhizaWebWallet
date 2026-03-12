# Swap Page - Jetton Registry Integration Complete ✅

## Changes Made

### 1. Integrated Jetton Registry
- Imported `getAllRegistryTokens` and `getJettonPrice` from `services/jettonRegistry.ts`
- Token definitions now include proper `decimals` field for accurate calculations
- Token addresses now use real mainnet addresses from the registry

### 2. Real-Time TON Price Fetching
- Integrated CoinGecko API to fetch live TON/USD price
- Function: `fetchTONPrice()` - fetches current TON price in USD
- Fallback to $2.45 if API fails
- Updates every time tokens change

### 3. Dynamic Exchange Rate Calculation
- Function: `calculateExchangeRate()` - calculates rates based on real prices
- Supports three scenarios:
  - TON → Stablecoin (uses live TON price / stablecoin price)
  - Stablecoin → TON (uses stablecoin price / live TON price)
  - Token → Token (uses registry prices for both)
- Loading state indicator while fetching rates

### 4. Real Token Balances
- Integrated with WalletContext to show real balances
- Updates TON balance from `balance` prop
- Updates jetton balances from `jettons` prop
- Properly formats balances using token decimals

### 5. UI Improvements
- "Best Rate" card changed to "TON Price" showing live USD price
- Exchange rate display shows "Loading..." while fetching
- Rate updates automatically when tokens are swapped
- Proper decimal formatting (6 decimals for rates)

## Token Configuration

### From Token (Default: TON)
```typescript
{
  symbol: 'TON',
  name: 'Toncoin',
  icon: '💎',
  balance: balance || '0',
  address: 'ton',
  decimals: 9
}
```

### To Token (Default: USDT)
```typescript
{
  symbol: 'USDT',
  name: 'Tether USD',
  icon: '💵',
  balance: '0',
  address: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
  decimals: 6
}
```

## API Integration

### CoinGecko API
- Endpoint: `https://api.coingecko.com/api/v3/simple/price`
- Parameters: `ids=the-open-network&vs_currencies=usd`
- Response: `{ "the-open-network": { "usd": 2.45 } }`
- Free tier: No API key required
- Rate limit: 10-50 calls/minute (sufficient for this use case)

### Jetton Registry Prices
- USDT: $1.00 (fixed)
- USDC: $1.00 (fixed)
- jUSDT: $1.00 (fixed)
- jUSDC: $1.00 (fixed)
- NOT: $0.008 (approximate)
- SCALE: $0.05 (approximate)
- STK: $0.0000012 (approximate)

## Example Calculations

### TON → USDT
```
TON Price: $2.45
USDT Price: $1.00
Exchange Rate: 2.45 / 1.00 = 2.45
1 TON = 2.45 USDT
```

### USDT → TON
```
TON Price: $2.45
USDT Price: $1.00
Exchange Rate: 1.00 / 2.45 = 0.408163
1 USDT = 0.408163 TON
```

### NOT → USDT
```
NOT Price: $0.008
USDT Price: $1.00
Exchange Rate: 0.008 / 1.00 = 0.008
1 NOT = 0.008 USDT
```

## Features

✅ Real-time TON price from CoinGecko
✅ Dynamic exchange rate calculation
✅ Jetton registry integration
✅ Real wallet balances
✅ Proper decimal handling
✅ Loading states
✅ Error handling with fallbacks
✅ Auto-updates on token swap
✅ Mobile responsive

## Testing

1. Open Swap page
2. Verify TON price displays current market price
3. Enter amount in "From" field
4. Verify "To" amount calculates correctly
5. Click swap arrows to reverse tokens
6. Verify rate recalculates
7. Check that balances show real wallet amounts

## Next Steps

To enable real swaps (currently in demo mode):
1. Set `isDemoMode = false` in `services/swapService.ts`
2. Integrate with DeDust or STON.fi DEX
3. Test on testnet first
4. Deploy to mainnet

## Notes

- Exchange rates update automatically when tokens change
- CoinGecko API is free and doesn't require authentication
- Fallback prices ensure UI always works even if API fails
- All calculations use proper token decimals for accuracy
- Demo mode still active - no real transactions executed
