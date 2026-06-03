# 🔍 RZC Percentage Display Analysis - CRITICAL FINDING

**Date:** April 30, 2026  
**Status:** ⚠️ **ISSUE IDENTIFIED** - RZC percentage is ALWAYS 0%

---

## 🎯 Executive Summary

**FINDING:** RZC percentage change is **hardcoded to 0%** and will **NEVER update** when admin changes the price, even with the cache refresh fix in place.

**REASON:** RZC is treated as a "project token" with no market data, so the percentage change is intentionally set to 0.

**IMPACT:** When admin updates RZC price from $0.12 to $0.15, the percentage badge will still show **0.00%** instead of the actual price change.

---

## 📊 Current Implementation

### 1. Dashboard.tsx - Asset List Creation
**File:** `pages/Dashboard.tsx`  
**Lines:** 616-624

```typescript
// RZC (Native)
if (rzcBalance > 0 || !hideDust) {
  list.push({
    id: 'rzc', 
    symbol: 'RZC', 
    name: 'RhizaCore Token', 
    balance: parseFloat(rzcBalance.toString()),
    usdValue: rzcUsdValue, 
    price: contextRzcPrice, 
    color: 'text-emerald-500',
    bg: 'bg-emerald-500',
    logo: null,
    isCore: true,
    change: 0, // ← HARDCODED TO 0 - RZC is project token, no market change data
  });
}
```

**Result:** RZC asset always has `change: 0`

---

### 2. Dashboard.tsx - Percentage Display
**File:** `pages/Dashboard.tsx`  
**Lines:** 1365-1375

```typescript
{/* USD value + % change */}
<div className="text-right flex-shrink-0">
  <p className="font-numbers font-bold text-[13px] text-slate-900 dark:text-white leading-none">
    {balanceVisible ? `${currencySymbols[selectedCurrency] || ''}${formatValue(asset.usdValue * conversionRates[selectedCurrency], selectedCurrency)}` : '••••'}
  </p>
  <span className={`inline-flex items-center gap-0.5 mt-1 text-[9px] font-numbers font-bold px-1.5 py-0.5 rounded-full ${
    asset.change >= 0
      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
      : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
  }`}>
    <TrendingUp size={8} className={asset.change < 0 ? 'rotate-180' : ''} />
    {Math.abs(asset.change).toFixed(2)}%  {/* ← Displays asset.change which is 0 for RZC */}
  </span>
</div>
```

**Result:** RZC always displays **0.00%** in the percentage badge

---

### 3. Assets.tsx - Portfolio Calculation
**File:** `pages/Assets.tsx`  
**Lines:** 399-424

```typescript
// Calculate 24h change for each asset
const tonChange24h = tonUsdValue * (changePercent24h / 100);
const rzcChange24h = 0; // ← HARDCODED TO 0 - RZC is project token, no market data

// Calculate jettons 24h change
// ... jetton logic ...

// Total portfolio change
const totalChange24h = tonChange24h + rzcChange24h + jettonsChange24h;
const portfolioChangePercent = totalValue > 0 ? (totalChange24h / totalValue) * 100 : 0;
```

**Result:** RZC contributes **0%** to portfolio change calculation

---

## ⚠️ The Problem

### Current Behavior:
```
Admin Panel:
┌─────────────────────────────────────┐
│ RZC Price: $0.12 → $0.15            │
│ [Save Rates] ✅                     │
└─────────────────────────────────────┘
  ↓ Admin clicks Save
  ↓ updateRzcPrice(0.15) called
  ↓ clearPriceCache() called
  ↓ Success: "Rates & percentages updated instantly"

Dashboard (immediately):
┌─────────────────────────────────────┐
│ RZC         1,000 RZC               │
│ RhizaCore   $150.00    0.00% ❌     │  ← WRONG! Should show +25%
└─────────────────────────────────────┘

Expected:
┌─────────────────────────────────────┐
│ RZC         1,000 RZC               │
│ RhizaCore   $150.00    +25.0% ✅    │  ← Correct! ($0.15 - $0.12) / $0.12 * 100
└─────────────────────────────────────┘
```

---

## 🔍 Why This Happens

### Design Decision:
RZC is treated as a **"project token"** similar to how exchanges handle their native tokens:
- No external market data (not listed on CoinGecko)
- Price is admin-controlled, not market-driven
- Percentage changes don't reflect market movements

### Comment in Code:
```typescript
change: 0, // RZC is project token, no market change data
```

This is **intentional** but creates a **misleading UX** when admin updates prices.

---

## 💡 Solution Options

### Option 1: Calculate RZC Change from Price History ✅ **RECOMMENDED**
**Approach:** Track RZC price changes in database and calculate 24h change

**Implementation:**
```typescript
// 1. Create price history table (already exists: add_rzc_price_history.sql)
// 2. Log price changes when admin updates
// 3. Calculate 24h change from history

// In Dashboard.tsx assetList:
const rzcChange24h = await calculateRzcChange24h(); // Fetch from DB

list.push({
  id: 'rzc',
  symbol: 'RZC',
  name: 'RhizaCore Token',
  balance: parseFloat(rzcBalance.toString()),
  usdValue: rzcUsdValue,
  price: contextRzcPrice,
  color: 'text-emerald-500',
  bg: 'bg-emerald-500',
  logo: null,
  isCore: true,
  change: rzcChange24h, // ← Dynamic from price history
});
```

**Pros:**
- ✅ Accurate 24h change based on actual price updates
- ✅ Shows real price movement when admin updates
- ✅ Consistent with other assets (TON, BTC, etc.)

**Cons:**
- ⚠️ Requires database query (minimal overhead)
- ⚠️ Needs price history table (already created)

---

### Option 2: Hide RZC Percentage Badge
**Approach:** Don't show percentage for RZC at all

**Implementation:**
```typescript
{/* USD value + % change */}
<div className="text-right flex-shrink-0">
  <p className="font-numbers font-bold text-[13px] text-slate-900 dark:text-white leading-none">
    {balanceVisible ? `${currencySymbols[selectedCurrency] || ''}${formatValue(asset.usdValue * conversionRates[selectedCurrency], selectedCurrency)}` : '••••'}
  </p>
  {/* Only show percentage for non-RZC assets */}
  {asset.id !== 'rzc' && (
    <span className={`inline-flex items-center gap-0.5 mt-1 text-[9px] font-numbers font-bold px-1.5 py-0.5 rounded-full ${
      asset.change >= 0
        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
        : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
    }`}>
      <TrendingUp size={8} className={asset.change < 0 ? 'rotate-180' : ''} />
      {Math.abs(asset.change).toFixed(2)}%
    </span>
  )}
</div>
```

**Pros:**
- ✅ Simple implementation (no DB changes)
- ✅ Avoids showing misleading 0.00%
- ✅ Consistent with "project token" philosophy

**Cons:**
- ❌ Users don't see RZC price movement
- ❌ Inconsistent UI (some assets have %, some don't)

---

### Option 3: Show "Admin Controlled" Badge
**Approach:** Replace percentage with a badge indicating admin-controlled price

**Implementation:**
```typescript
{/* USD value + status badge */}
<div className="text-right flex-shrink-0">
  <p className="font-numbers font-bold text-[13px] text-slate-900 dark:text-white leading-none">
    {balanceVisible ? `${currencySymbols[selectedCurrency] || ''}${formatValue(asset.usdValue * conversionRates[selectedCurrency], selectedCurrency)}` : '••••'}
  </p>
  {asset.id === 'rzc' ? (
    <span className="inline-flex items-center gap-0.5 mt-1 text-[9px] font-numbers font-bold px-1.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
      <Lock size={8} />
      Fixed
    </span>
  ) : (
    <span className={`inline-flex items-center gap-0.5 mt-1 text-[9px] font-numbers font-bold px-1.5 py-0.5 rounded-full ${
      asset.change >= 0
        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
        : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
    }`}>
      <TrendingUp size={8} className={asset.change < 0 ? 'rotate-180' : ''} />
      {Math.abs(asset.change).toFixed(2)}%
    </span>
  )}
</div>
```

**Pros:**
- ✅ Clear communication (price is fixed/admin-controlled)
- ✅ No misleading 0.00%
- ✅ Educates users about RZC pricing model

**Cons:**
- ⚠️ Adds complexity to UI
- ⚠️ May confuse users ("Why is RZC different?")

---

## 📈 Recommendation

### **Option 1: Calculate RZC Change from Price History** ✅

**Why:**
1. **Accurate:** Shows real price movement when admin updates
2. **Consistent:** All assets display percentage changes
3. **User-Friendly:** Users see RZC price trends
4. **Already Built:** Price history table exists (`add_rzc_price_history.sql`)

**Implementation Steps:**
1. ✅ Price history table already created
2. ✅ Admin updates already log to database
3. ⏳ Add function to calculate 24h change from history
4. ⏳ Update Dashboard.tsx to use calculated change
5. ⏳ Update Assets.tsx portfolio calculation

---

## 🔧 Implementation Plan

### Step 1: Create RZC Change Calculation Function
**File:** `services/rzcPriceService.ts` (new)

```typescript
import { supabaseService } from './supabaseService';

/**
 * Calculate RZC 24h price change percentage from price history
 * Returns 0 if no history available
 */
export async function getRzcChange24h(): Promise<number> {
  try {
    const client = supabaseService.getClient();
    if (!client) return 0;

    // Get current price
    const { data: currentData } = await client
      .from('app_config')
      .select('value')
      .eq('key', 'RZC_PRICE')
      .single();

    if (!currentData) return 0;
    const currentPrice = parseFloat(currentData.value);

    // Get price from 24 hours ago
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: historyData } = await client
      .from('rzc_price_history')
      .select('price_usd')
      .lte('changed_at', twentyFourHoursAgo)
      .order('changed_at', { ascending: false })
      .limit(1)
      .single();

    if (!historyData) return 0; // No history yet
    const oldPrice = historyData.price_usd;

    // Calculate percentage change
    if (oldPrice === 0) return 0;
    const change = ((currentPrice - oldPrice) / oldPrice) * 100;

    return change;
  } catch (error) {
    console.error('Error calculating RZC 24h change:', error);
    return 0;
  }
}
```

---

### Step 2: Update Dashboard.tsx
**File:** `pages/Dashboard.tsx`

```typescript
// Add import
import { getRzcChange24h } from '../services/rzcPriceService';

// Update assetList useMemo
const assetList = useMemo(() => {
  const list = [];
  if (combinedPortfolioValue === 0) return list;

  // RZC (Native)
  if (rzcBalance > 0 || !hideDust) {
    // Fetch RZC 24h change (async, but we can use a state variable)
    const rzcChange = rzcChange24h; // From state

    list.push({
      id: 'rzc', 
      symbol: 'RZC', 
      name: 'RhizaCore Token', 
      balance: parseFloat(rzcBalance.toString()),
      usdValue: rzcUsdValue, 
      price: contextRzcPrice, 
      color: 'text-emerald-500',
      bg: 'bg-emerald-500',
      logo: null,
      isCore: true,
      change: rzcChange, // ← Dynamic from price history
    });
  }
  // ... rest of assets
}, [combinedPortfolioValue, rzcBalance, rzcUsdValue, contextRzcPrice, rzcChange24h, ...]);

// Add state and effect to fetch RZC change
const [rzcChange24h, setRzcChange24h] = useState(0);

useEffect(() => {
  const fetchRzcChange = async () => {
    const change = await getRzcChange24h();
    setRzcChange24h(change);
  };
  
  fetchRzcChange();
  // Refresh every 5 minutes
  const interval = setInterval(fetchRzcChange, 300_000);
  return () => clearInterval(interval);
}, []);
```

---

### Step 3: Update Assets.tsx Portfolio Calculation
**File:** `pages/Assets.tsx`

```typescript
// Add import
import { getRzcChange24h } from '../services/rzcPriceService';

// Add state
const [rzcChange24h, setRzcChange24h] = useState(0);

// Fetch RZC change
useEffect(() => {
  const fetchRzcChange = async () => {
    const change = await getRzcChange24h();
    setRzcChange24h(change);
  };
  
  fetchRzcChange();
  const interval = setInterval(fetchRzcChange, 300_000);
  return () => clearInterval(interval);
}, []);

// Update portfolio calculation
const tonChange24h = tonUsdValue * (changePercent24h / 100);
const rzcChange24h = rzcUsdValue * (rzcChange24h / 100); // ← Use calculated change
const jettonsChange24h = calculateJettonsChange();

const totalChange24h = tonChange24h + rzcChange24h + jettonsChange24h;
const portfolioChangePercent = totalValue > 0 ? (totalChange24h / totalValue) * 100 : 0;
```

---

## ✅ Testing Checklist

### Before Fix:
- [ ] RZC shows 0.00% in Dashboard asset list
- [ ] RZC shows 0.00% in Assets page
- [ ] Portfolio change excludes RZC price movement
- [ ] Admin price update doesn't affect RZC percentage

### After Fix:
- [ ] RZC shows calculated 24h change in Dashboard
- [ ] RZC shows calculated 24h change in Assets page
- [ ] Portfolio change includes RZC price movement
- [ ] Admin price update triggers RZC percentage refresh
- [ ] Percentage updates within ~500ms after admin save

---

## 🎉 Expected Result

### After Implementation:
```
Admin Panel:
┌─────────────────────────────────────┐
│ RZC Price: $0.12 → $0.15            │
│ [Save Rates] ✅                     │
└─────────────────────────────────────┘
  ↓ Admin clicks Save
  ↓ Price logged to rzc_price_history
  ↓ updateRzcPrice(0.15) called
  ↓ clearPriceCache() called
  ↓ getRzcChange24h() recalculates
  ↓ Success: "Rates & percentages updated instantly"

Dashboard (immediately):
┌─────────────────────────────────────┐
│ RZC         1,000 RZC               │
│ RhizaCore   $150.00    +25.0% ✅    │  ← Correct! Shows actual price change
└─────────────────────────────────────┘

Assets Page (immediately):
┌─────────────────────────────────────┐
│ Portfolio: $1,500.00  +25.0% ✅     │  ← Includes RZC change
│                                     │
│ RZC         1,000 RZC               │
│ $150.00     +25.0% ✅               │  ← Shows RZC change
└─────────────────────────────────────┘
```

---

## 📊 Impact Analysis

### Current State:
- ❌ RZC percentage: Always 0.00%
- ❌ Portfolio change: Excludes RZC
- ❌ Admin updates: No visible percentage change
- ❌ User confusion: "Why doesn't RZC show change?"

### After Fix:
- ✅ RZC percentage: Calculated from 24h history
- ✅ Portfolio change: Includes RZC movement
- ✅ Admin updates: Percentage updates instantly
- ✅ User clarity: All assets show consistent data

---

## 🚀 Next Steps

1. **Create `rzcPriceService.ts`** with `getRzcChange24h()` function
2. **Update Dashboard.tsx** to use calculated RZC change
3. **Update Assets.tsx** to include RZC in portfolio calculation
4. **Test admin price update flow** end-to-end
5. **Verify percentage displays** across all pages

---

**Completed by:** Kiro AI  
**Date:** April 30, 2026  
**Status:** ⚠️ ISSUE IDENTIFIED - AWAITING FIX  
**Priority:** HIGH - Affects admin price update UX
