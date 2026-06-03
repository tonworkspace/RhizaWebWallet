# Price Display Issue — $0.133 vs $0.018

## Problem

**Database shows**: Private Sale at $0.018  
**UI shows**: $0.133  

## Root Cause Analysis

### Database (Correct) ✅
```json
{
  "round_name": "Private Sale",
  "price_usd": 0.018,
  "next_round_price": 0.025
}
```

### Possible UI Issues

1. **Cached/Stale Data**
   - Browser cache showing old values
   - React state not updating
   - Service worker caching old API responses

2. **Price Override**
   - `rzcPriceProp` or `contextRzcPrice` overriding database value
   - Admin panel setting a different price
   - Environment variable override

3. **Display Formatting Error**
   - Number formatting bug
   - Decimal place error (0.018 * 7.39 = 0.133?)

## Quick Fixes

### Fix 1: Clear Browser Cache & Reload
```bash
# Hard refresh
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

### Fix 2: Check Price Override Sources

In `StoreUI.tsx`, the price is determined by:
```typescript
const RZC_PRICE_USD = rzcPriceProp || contextRzcPrice || activeRound.price_usd;
```

**Priority**:
1. `rzcPriceProp` (passed as prop)
2. `contextRzcPrice` (from WalletContext)
3. `activeRound.price_usd` (from database)

**Check these sources**:
- Where is `StoreUI` being rendered? Check if `rzcPrice` prop is passed
- Check `WalletContext` for any hardcoded price
- Check if there's an admin override in Supabase

### Fix 3: Force Database Value

Temporarily force the UI to use only the database value:

```typescript
// In StoreUI.tsx, change this line:
const RZC_PRICE_USD = rzcPriceProp || contextRzcPrice || activeRound.price_usd;

// To this (use ONLY database value):
const RZC_PRICE_USD = activeRound.price_usd;
```

## Verification Steps

1. **Check Browser Console**
   ```javascript
   // Open DevTools Console and run:
   console.log('Active Round:', activeRound);
   console.log('RZC Price USD:', RZC_PRICE_USD);
   console.log('rzcPriceProp:', rzcPriceProp);
   console.log('contextRzcPrice:', contextRzcPrice);
   ```

2. **Check Network Tab**
   - Open DevTools → Network
   - Filter for `get_active_sale_round`
   - Check the response — should show `price_usd: 0.018`

3. **Check Database Directly**
   ```sql
   SELECT round_name, price_usd, is_active 
   FROM sale_rounds 
   WHERE is_active = true;
   ```
   Expected: `Private Sale | 0.018 | true`

## Most Likely Cause

Based on the symptoms, the most likely cause is:

**Price Override from Props or Context**

The `rzcPriceProp` or `contextRzcPrice` is probably set to `0.133` somewhere in your app, overriding the database value.

### Where to Check:

1. **Check where StoreUI is rendered**
   ```bash
   # Search for StoreUI usage
   grep -r "StoreUI" --include="*.tsx" --include="*.ts"
   ```

2. **Check WalletContext**
   ```typescript
   // In context/WalletContext.tsx
   // Look for any hardcoded rzcPrice value
   ```

3. **Check Admin Panel**
   - If you have an admin panel, check if someone set a custom price
   - Check Supabase for any `app_settings` or `config` table

## Quick Test

Add this console.log to StoreUI to see which value is being used:

```typescript
console.log('🔍 Price Debug:', {
  rzcPriceProp,
  contextRzcPrice,
  'activeRound.price_usd': activeRound.price_usd,
  'FINAL RZC_PRICE_USD': RZC_PRICE_USD
});
```

This will show you exactly which source is providing the $0.133 value.

## Expected Behavior

After fixing, you should see:
- **Current Round**: Private Sale
- **Price**: $0.018
- **Next Round**: $0.025
- **Listing**: $1.00
- **ROI**: 55.56x (not 7.5x)

## Action Items

- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] Check console for price debug logs
- [ ] Check where StoreUI is rendered and if rzcPrice prop is passed
- [ ] Check WalletContext for hardcoded price
- [ ] Verify database shows 0.018
- [ ] Temporarily force database-only price to test
