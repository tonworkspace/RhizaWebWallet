# 💰 Change RZC Price - Quick Guide

## Current Price: $0.10 per RZC

---

## 🚀 To Change Price (2 Steps)

### Step 1: Update Frontend (1 min)
**File**: `config/rzcConfig.ts`

```typescript
export const RZC_CONFIG = {
  RZC_PRICE_USD: 0.10,  // ← Change this number
  // ...
}
```

### Step 2: Update Database (1 min)
**Run in Supabase SQL Editor**:

```sql
-- Change 0.15 to your desired price
SELECT * FROM update_rzc_price(0.15, 'admin');
```

---

## 📊 Common Price Changes

### Change to $0.15
```typescript
// Frontend: config/rzcConfig.ts
RZC_PRICE_USD: 0.15,
```
```sql
-- Backend: Supabase SQL Editor
SELECT * FROM update_rzc_price(0.15, 'admin');
```

### Change to $0.20
```typescript
// Frontend: config/rzcConfig.ts
RZC_PRICE_USD: 0.20,
```
```sql
-- Backend: Supabase SQL Editor
SELECT * FROM update_rzc_price(0.20, 'admin');
```

### Change to $0.05
```typescript
// Frontend: config/rzcConfig.ts
RZC_PRICE_USD: 0.05,
```
```sql
-- Backend: Supabase SQL Editor
SELECT * FROM update_rzc_price(0.05, 'admin');
```

---

## ✅ Verify Change

```sql
-- Check current price
SELECT get_rzc_price();

-- Test conversion
SELECT usd_to_rzc(100); -- Should match: 100 / price
```

---

## 📈 Price Impact Calculator

| Price | $100 Package | 10% Commission | $5 Welcome |
|-------|--------------|----------------|------------|
| $0.05 | 2,000 RZC | 200 RZC | 100 RZC |
| $0.10 | 1,000 RZC | 100 RZC | 50 RZC |
| $0.15 | 666 RZC | 66 RZC | 33 RZC |
| $0.20 | 500 RZC | 50 RZC | 25 RZC |
| $0.25 | 400 RZC | 40 RZC | 20 RZC |
| $0.50 | 200 RZC | 20 RZC | 10 RZC |
| $1.00 | 100 RZC | 10 RZC | 5 RZC |

---

## ⚠️ Important Notes

1. **Existing balances don't change** - Only new transactions use new price
2. **Update both frontend and backend** - Keep them in sync
3. **Test first** - Try in development before production
4. **Announce changes** - Inform users about price updates

---

## 📁 Full Documentation

- `RZC_PRICE_MANAGEMENT_GUIDE.md` - Complete guide
- `SETUP_RZC_PRICE_SYSTEM.md` - Initial setup
- `update_rzc_price.sql` - Database functions

---

## 🆘 Need Help?

Check current price:
```sql
SELECT get_rzc_price();
```

View price history:
```sql
SELECT * FROM rzc_price_history ORDER BY changed_at DESC;
```

Reset to $0.10:
```sql
SELECT * FROM update_rzc_price(0.10, 'admin');
```
