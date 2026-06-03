# Fix RZC Price Override — $0.133 → $0.018

## Problem Found! ✅

The UI is showing **$0.133** because there's a **localStorage override** that's overriding the database value.

### Price Priority Chain:
```
1. rzcPriceProp (from RzcStore.tsx)
   ↓
2. useBalance() → contextRzcPrice (from WalletContext)
   ↓
3. useBalance() → getPriceOverrides().rzc (from localStorage)
   ↓
4. activeRound.price_usd (from database) ← CORRECT VALUE ($0.018)
```

The localStorage override is blocking the database value from being used!

---

## Quick Fix (Run in Browser Console)

### Option 1: Clear All Price Overrides
```javascript
// Open DevTools Console (F12) and run:
localStorage.removeItem('admin_price_overrides');
location.reload();
```

### Option 2: Update RZC Price to Match Database
```javascript
// Get current overrides
const overrides = JSON.parse(localStorage.getItem('admin_price_overrides') || '{}');

// Update RZC price to match database
overrides.rzc = 0.018;

// Save back
localStorage.setItem('admin_price_overrides', JSON.stringify(overrides));

// Reload
location.reload();
```

### Option 3: Check What's Currently Set
```javascript
// See what's in localStorage
console.log('Current overrides:', JSON.parse(localStorage.getItem('admin_price_overrides') || '{}'));
```

---

## Permanent Fix: Use Database Price Only

Update `StoreUI.tsx` to prioritize the database value:

```typescript
// Current (WRONG):
const RZC_PRICE_USD = rzcPriceProp || contextRzcPrice || activeRound.price_usd;

// Fixed (CORRECT):
const RZC_PRICE_USD = activeRound.price_usd || rzcPriceProp || contextRzcPrice;
```

This makes the database the primary source of truth.

---

## Why This Happened

Someone (probably via the Admin Panel) set a custom RZC price override to $0.133, which is stored in localStorage and persists across sessions.

### Where the Override Was Set:
- Admin Panel → Coin Rates section
- Someone entered $0.133 for RZC
- This was saved to localStorage
- Now it overrides the database value

---

## Verification Steps

After applying the fix:

1. **Check localStorage is cleared**
   ```javascript
   localStorage.getItem('admin_price_overrides')
   // Should be null or not contain rzc: 0.133
   ```

2. **Check UI shows correct price**
   - Current Round: Private Sale
   - Price: $0.018 (not $0.133)
   - Next Round: $0.025

3. **Check console logs**
   ```javascript
   // Should show:
   // RZC_PRICE_USD: 0.018
   // activeRound.price_usd: 0.018
   ```

---

## Files to Update

### 1. Clear localStorage (Browser Console)
```javascript
localStorage.removeItem('admin_price_overrides');
location.reload();
```

### 2. Update StoreUI.tsx (Optional - for future-proofing)
```typescript
// Line ~193 in StoreUI.tsx
// Change from:
const RZC_PRICE_USD = rzcPriceProp || contextRzcPrice || activeRound.price_usd;

// To:
const RZC_PRICE_USD = activeRound.price_usd; // Always use database value
```

### 3. Update priceConfig.ts (Optional - update default)
```typescript
// Line ~36 in utils/priceConfig.ts
const DEFAULTS: PriceOverrides = {
  // ... other prices
  rzc: 0.018,  // Update from 0.12 to match current round
  // ... other prices
};
```

---

## Expected Result

After fix:
- **UI Price**: $0.018 ✅
- **Database Price**: $0.018 ✅
- **Next Round**: $0.025 ✅
- **Listing**: $1.00 ✅
- **ROI**: 55.56x ✅

---

## Action Items

- [ ] Run `localStorage.removeItem('admin_price_overrides')` in browser console
- [ ] Reload page (Ctrl+Shift+R)
- [ ] Verify UI shows $0.018
- [ ] (Optional) Update StoreUI.tsx to prioritize database
- [ ] (Optional) Update priceConfig.ts default to 0.018

**Status**: Ready to fix — just clear localStorage!
