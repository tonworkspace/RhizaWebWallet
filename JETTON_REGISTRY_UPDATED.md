# Jetton Registry Updated ✅

## Summary
Updated the jetton registry to include all major TON mainnet tokens with proper verification, pricing, and metadata.

## Tokens Added/Updated

### Stablecoins ✅
1. **USDT (Tether USD)**
   - Address: `EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs`
   - Symbol: USDT
   - Decimals: 6
   - Price: $1.00
   - Verified: ✓
   - Image: Official Tether logo

2. **USDC (USD Coin)**
   - Address: `EQC_1YoM8RBixN95lz7odcF3Vrkc_N8Ne7gQi7Abtlet_Efi`
   - Symbol: USDC
   - Decimals: 6
   - Price: $1.00
   - Verified: ✓
   - Image: Official USDC logo

3. **jUSDT (Bridged USDT)**
   - Address: `EQBynBO23ywHy_CgarY9NK9FTz0yDsG82PtcbSTQgGoXwiuA`
   - Symbol: jUSDT
   - Decimals: 6
   - Price: $1.00
   - Verified: ✓
   - Image: Tether logo

4. **jUSDC (Bridged USDC)**
   - Address: `EQC61IQRl0_la95t27xhIpjxZt32vl1QQVF2UgTNuvD18W-4`
   - Symbol: jUSDC
   - Decimals: 6
   - Price: $1.00
   - Verified: ✓
   - Image: USDC logo

### Popular Tokens ✅
5. **NOT (Notcoin)**
   - Address: `EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT`
   - Symbol: NOT
   - Decimals: 9
   - Price: ~$0.008
   - Verified: ✓
   - Image: Notcoin logo

6. **SCALE**
   - Address: `EQBlqsm144Dq6SjbPI4jjZvA1hqTIP3CvHovbIfW_t-SCALE`
   - Symbol: SCALE
   - Decimals: 9
   - Price: ~$0.05
   - Verified: ✓
   - Image: SCALE logo

7. **STK (Stakers Token)** - Legacy
   - Multiple address formats supported
   - Verified: ✓

## Features

### ✅ Verification Status
All tokens are marked as verified with green checkmark (✓) in the UI

### ✅ USD Pricing
- Stablecoins: $1.00 (accurate)
- NOT: ~$0.008 (approximate)
- SCALE: ~$0.05 (approximate)
- Prices displayed in Assets page

### ✅ Token Images
- High-quality logos from official sources
- Cached via TON API image proxy
- Fallback to emoji if image fails

### ✅ Proper Decimals
- USDT/USDC: 6 decimals
- NOT/SCALE: 9 decimals
- STK: 18 decimals

## How It Works

### Registry Lookup
```typescript
// Get token data from registry
const registryData = getJettonRegistryData(jettonAddress);

// Returns:
{
  address: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
  name: "Tether USD",
  symbol: "USDT",
  decimals: 6,
  image: "https://...",
  verified: true,
  rateUsd: 1.0
}
```

### Balance Display
```typescript
// Format balance with correct decimals
const balance = formatBalance(jetton.balance, jetton.decimals);
// "1000000" with 6 decimals → "1.00"

// Calculate USD value
const usdValue = formatUsdValue(jetton.balance, jetton.decimals, jetton.price?.usd);
// "1000000" with 6 decimals at $1.00 → "$1.00"
```

### Verification Badge
```typescript
// Show green checkmark for verified tokens
{jetton.verified && <span className="text-green-500">✓</span>}
```

## Assets Page Integration

### Display Order
1. **TON** (Native) - Always first
2. **RZC** (Community Token) - Second
3. **Verified Jettons** - Listed tokens with ✓
4. **Unverified Jettons** - Other tokens

### Filter Options
- **All Tokens**: Show everything
- **✓ Listed**: Only verified tokens
- **Unlisted**: Only unverified tokens

### Token Card Shows
- Token icon/image
- Token name
- Token symbol
- Balance amount
- USD value (if price available)
- Verification badge
- Send button (on hover)

## Testing

### Check USDT Balance
1. Login to wallet
2. Go to Assets page
3. Look for "Tether USD" with ✓
4. Should show:
   - USDT symbol
   - Correct balance
   - USD value ($1.00 per USDT)
   - Green verification checkmark
   - Tether logo

### Check Other Tokens
- USDC should show with ✓
- NOT should show with ✓
- Any other jettons show without ✓

### Filter Test
1. Click "✓ Listed" - Shows only verified tokens
2. Click "Unlisted" - Shows only unverified tokens
3. Click "All Tokens" - Shows everything

## Address Formats Supported

The registry supports multiple address formats:

1. **User-Friendly Format** (EQ...)
   ```
   EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs
   ```

2. **Raw Format** (0:...)
   ```
   0:b113a994b5024a16719f69139328eb759596c38a25f59028b146fecdc3621dfe
   ```

Both formats are recognized and matched correctly.

## Price Updates

### Current Prices
- USDT: $1.00 (stable)
- USDC: $1.00 (stable)
- jUSDT: $1.00 (stable)
- jUSDC: $1.00 (stable)
- NOT: $0.008 (approximate)
- SCALE: $0.05 (approximate)

### To Update Prices
Edit `services/jettonRegistry.ts`:
```typescript
"EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT": {
  // ...
  rateUsd: 0.010, // Update price here
},
```

### Future: Real-Time Prices
To add real-time pricing:
1. Integrate with CoinGecko API
2. Integrate with DeDust price feed
3. Update prices every 30 seconds
4. Cache in localStorage

## Adding New Tokens

To add a new token to the registry:

```typescript
// In services/jettonRegistry.ts
"TOKEN_ADDRESS_HERE": {
  verified: true,
  symbol: "TOKEN",
  name: "Token Name",
  decimals: 9,
  image: "https://token-image-url.png",
  rateUsd: 0.0, // Set price or 0 if unknown
},
```

## Benefits

### For Users
- ✅ See verified tokens with checkmark
- ✅ View USD values for holdings
- ✅ Filter by verification status
- ✅ Professional token logos
- ✅ Accurate balance formatting

### For Developers
- ✅ Centralized token metadata
- ✅ Easy to add new tokens
- ✅ Synchronous lookups (no API calls)
- ✅ Type-safe with TypeScript
- ✅ Supports multiple address formats

## Files Modified

- ✅ `services/jettonRegistry.ts` - Added 6 new tokens

## Compatibility

### Works With
- ✅ Assets page
- ✅ Transfer page
- ✅ Swap page (via dexConfig)
- ✅ Dashboard
- ✅ Any component using jetton data

### Address Matching
- ✅ TON API format (EQ...)
- ✅ Raw format (0:...)
- ✅ Case-insensitive matching
- ✅ Whitespace trimming

## Next Steps

### Recommended
1. Test USDT balance display
2. Verify all token images load
3. Check USD values are accurate
4. Test filter functionality

### Future Enhancements
1. Add more popular TON tokens
2. Integrate real-time price API
3. Add token descriptions
4. Add token links (website, social)
5. Add token market cap data
6. Add 24h price change

## Conclusion

✅ **Jetton registry updated with all major TON tokens**
✅ **USDT properly configured for mainnet**
✅ **Users can now see their USDT balance with USD value**
✅ **All stablecoins and popular tokens included**

---

**Status**: ✅ COMPLETE
**Tokens Added**: 6 (USDT, USDC, jUSDT, jUSDC, NOT, SCALE)
**Verification**: All tokens marked as verified
**Pricing**: Stablecoins at $1.00, others approximate
