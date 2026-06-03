# Purchase Progress Tracking — Complete Flow

## ✅ Yes, Progress Updates Automatically!

When a user buys RZC, the progress counter updates in real-time through this flow:

---

## 📊 Purchase Flow (Step-by-Step)

### 1. User Clicks "Buy RZC Now" (StoreUI.tsx)
```typescript
// User enters amount, selects payment method, clicks buy
handlePurchase() → sends TON/USDT transaction
```

### 2. Transaction Confirmed On-Chain
```typescript
// After blockchain confirms the transaction
txResult = { boc: paymentResult.txHash }
```

### 3. Record Purchase in Database (StoreUI.tsx line ~527)
```typescript
saleRoundService.recordPurchase({
    walletAddress:  currentTonAddress,
    rzcAmount:      totalRZC,           // e.g., 1,000 RZC
    priceUsd:       RZC_PRICE_USD,      // e.g., $0.12
    costUsd:        costUsd,            // e.g., $120
    paymentMethod:  'TON',
    txHash:         txResult.boc,
    referrerWallet: sponsorWallet
})
```

### 4. Database Function Updates Progress (record_ico_purchase)
```sql
-- This function does 3 things atomically:

-- A. Insert purchase record
INSERT INTO ico_purchases (wallet_address, rzc_amount, ...)
VALUES (user_wallet, 1000, ...);

-- B. Update tokens_sold counter ✅
UPDATE sale_rounds
SET tokens_sold = tokens_sold + 1000,  -- Add purchased amount
    is_complete = (tokens_sold + 1000 >= token_cap),
    updated_at = now()
WHERE is_active = true;

-- C. Auto-complete round if sold out
-- If tokens_sold >= token_cap, sets is_complete = true
```

### 5. Frontend Refreshes Progress (StoreUI.tsx line ~539)
```typescript
refreshRound(); // Calls useSaleRound hook to fetch updated data
```

### 6. UI Updates Automatically (useSaleRound hook)
```typescript
// Hook fetches fresh data from get_active_sale_round()
// Returns updated:
{
  tokens_sold: 482000 + 1000 = 483000,
  tokens_remaining: 4820000 - 483000 = 4337000,
  progress_pct: (483000 / 4820000) * 100 = 10.02%
}
```

### 7. Progress Bar Animates
```typescript
// StoreUI.tsx updates the progress bar
barRef.current.style.width = `${roundProgress}%`; // 10.02%
```

---

## 🔄 Real-Time Updates

### Auto-Refresh (Every 2 Minutes)
```typescript
// useSaleRound.ts line ~73
useEffect(() => {
    fetchRound();
    const interval = setInterval(fetchRound, 2 * 60 * 1000); // Every 2 min
    return () => clearInterval(interval);
}, [fetchRound]);
```

### Manual Refresh (After Purchase)
```typescript
// StoreUI.tsx line ~539
refreshRound(); // Immediate refresh after purchase
```

---

## 📈 Progress Calculation

### Database (get_active_sale_round function)
```sql
SELECT 
    tokens_sold,
    token_cap,
    token_cap - tokens_sold AS tokens_remaining,
    ROUND((tokens_sold::numeric / token_cap) * 100, 2) AS progress_pct
FROM sale_rounds
WHERE is_active = true;
```

### Frontend (StoreUI.tsx)
```typescript
// Progress bar width
const clampedProgress = Math.min(roundProgress, 100);
barRef.current.style.width = `${clampedProgress}%`;

// Display text
{Math.min(roundProgress, 100).toFixed(1)}% — 
{Math.max(0, 100 - roundProgress).toFixed(1)}% remaining
```

---

## 🧪 Test the Flow

### Simulate a Purchase
```sql
-- Manually add a test purchase
SELECT record_ico_purchase(
    'EQTest...Wallet',  -- wallet address
    1000,               -- 1,000 RZC
    0.12,               -- $0.12 price
    120,                -- $120 cost
    'TON',              -- payment method
    'test_tx_hash_123', -- transaction hash
    NULL                -- no referrer
);
```

### Check Updated Progress
```sql
SELECT 
    tokens_sold,
    token_cap,
    ROUND((tokens_sold::numeric / token_cap) * 100, 2) AS progress_pct
FROM sale_rounds
WHERE round_number = 1;
```

**Expected**:
- Before: 482,000 sold (10.00%)
- After: 483,000 sold (10.02%)

---

## ✅ Verification Checklist

After a real purchase:

- [ ] `ico_purchases` table has new row
- [ ] `sale_rounds.tokens_sold` increased by purchase amount
- [ ] `get_active_sale_round()` returns updated progress_pct
- [ ] UI progress bar updates to new percentage
- [ ] "X remaining" text updates
- [ ] If sold out, `is_complete` = true and round closes

---

## 🎯 Summary

**Yes, the progress counter updates automatically!**

1. ✅ Purchase recorded in `ico_purchases`
2. ✅ `tokens_sold` incremented in `sale_rounds`
3. ✅ `progress_pct` recalculated
4. ✅ Frontend refreshes via `refreshRound()`
5. ✅ UI updates progress bar and text
6. ✅ Auto-refresh every 2 minutes keeps it current

**The system is fully functional and tracks progress in real-time!** 🚀
