# 📊 Percentage System Analysis - Dashboard, Assets, AssetDetail

**Date:** April 30, 2026  
**Status:** ⚠️ INCONSISTENCIES FOUND

---

## 🎯 Executive Summary

The percentage system across the three main components has **significant inconsistencies** in how price changes are calculated, displayed, and sourced. This creates a confusing user experience where the same data shows different values in different places.

---

## 🔍 Current Implementation Analysis

### 1. **Dashboard.tsx** - Portfolio 24h Change

**Source:** `useBalance` hook  
**Variables Used:**
- `change24h` - Dollar amount change
- `changePercent24h` - Percentage change

**Display Logic:**
```typescript
// Line 1178
{balanceVisible ? (
  change24h === 0 ? 'No change' : 
  `${change24h >= 0 ? '+' : ''}$${Math.abs(change24h).toFixed(2)} (${changePercent24h >= 0 ? '+' : ''}${changePercent24h.toFixed(2)}%)`
) : '•••••'}
```

**Calculation (from useBalance.ts):**
```typescript
// Line 211-212
const totalUsdValue = tonBalance * prices.tonPrice;
const change24h = totalUsdValue * (prices.change / 100);

// Line 227-228
change24h,
changePercent24h: prices.change,
```

**What it shows:**
- ✅ Shows **portfolio-level** 24h change (TON balance × TON price change)
- ✅ Shows both dollar amount and percentage
- ✅ Correctly labeled as "TON 24h" in some places
- ⚠️ **ISSUE:** Only reflects TON price change, not total portfolio change

---

### 2. **Assets.tsx** - Portfolio Header & TON Asset

**Source:** `useBalance` hook  
**Variables Used:**
- `changePercent24h` - TON percentage change only

**Display Logic:**

#### Portfolio Header (Line 471-476):
```typescript
<span className={`... ${changePercent24h >= 0 ? '...' : '...'}`}>
  <TrendingUp size={10} className={changePercent24h < 0 ? 'rotate-180' : ''} />
  {changePercent24h >= 0 ? '+' : ''}{changePercent24h.toFixed(2)}% TON 24h
</span>
```

#### TON Asset Row (Line 675-679):
```typescript
${tonPrice.toLocaleString(...)}
{changePercent24h !== undefined && (
  <span className={`... ${changePercent24h >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
    {changePercent24h >= 0 ? '+' : ''}{changePercent24h.toFixed(2)}%
  </span>
)}
```

**What it shows:**
- ✅ Shows **TON-only** 24h change
- ✅ Correctly labeled as "TON 24h" in portfolio header
- ⚠️ **ISSUE:** Portfolio header shows TON change, not total portfolio change
- ⚠️ **ISSUE:** TON asset row shows same percentage without label (confusing)

---

### 3. **AssetDetail.tsx** - Individual Asset Chart

**Source:** Local calculation from `priceHistory` data  
**Variables Used:**
- `priceChange` - Calculated from chart data

**Display Logic:**
```typescript
// Line 492-495
const isPositive = (priceHistory[priceHistory.length - 1]?.price || 0) >= (priceHistory[0]?.price || 0);
const priceChange = priceHistory.length > 1
  ? (((priceHistory[priceHistory.length - 1]?.price || 0) - (priceHistory[0]?.price || 0)) / (priceHistory[0]?.price || 1)) * 100
  : 0;

// Line 632
{isPositive ? '+' : ''}{priceChange.toFixed(2)}% (24h)
```

**What it shows:**
- ✅ Shows **asset-specific** price change based on selected time range
- ✅ Dynamically updates when user changes time range (1H, 1D, 1W, etc.)
- ⚠️ **ISSUE:** Label says "(24h)" but can show 1H, 1W, 1M, 1Y, ALL data
- ⚠️ **ISSUE:** Different calculation method than Dashboard/Assets

---

## 🚨 Identified Issues

### Issue #1: Misleading Portfolio Change Label
**Location:** Dashboard.tsx, Assets.tsx  
**Severity:** 🟠 HIGH

**Problem:**
```typescript
// Dashboard shows "TON 24h" but it's actually portfolio change
change24h === 0 ? 'No change' : 
`${change24h >= 0 ? '+' : ''}$${Math.abs(change24h).toFixed(2)} (${changePercent24h >= 0 ? '+' : ''}${changePercent24h.toFixed(2)}%)`
```

**Why it's wrong:**
- `change24h` is calculated as `tonBalance * tonPrice * (changePercent / 100)`
- This is the **dollar change in TON holdings**, not total portfolio change
- If user has RZC, Jettons, or other assets, they're ignored
- Label should say "TON Change" not "Portfolio Change"

**User Impact:**
- User with 100 TON + 10,000 RZC sees only TON change
- Misleading if RZC price changes significantly
- Portfolio header should show **total portfolio change**, not just TON

---

### Issue #2: Inconsistent Time Range Labels
**Location:** AssetDetail.tsx  
**Severity:** 🟡 MEDIUM

**Problem:**
```typescript
// Always shows "(24h)" regardless of selected time range
{isPositive ? '+' : ''}{priceChange.toFixed(2)}% (24h)
```

**Why it's wrong:**
- User can select 1H, 1D, 1W, 1M, 1Y, ALL
- Label always says "(24h)" even when showing 1-year change
- Confusing and inaccurate

**User Impact:**
- User selects "1Y" time range
- Sees "+150% (24h)" - makes no sense
- Should show "+150% (1Y)" or "+150% (1 Year)"

---

### Issue #3: Different Calculation Methods
**Location:** All three components  
**Severity:** 🟡 MEDIUM

**Problem:**
- **Dashboard/Assets:** Uses CoinGecko's `usd_24h_change` field
- **AssetDetail:** Calculates from first/last price in chart data

**Why it's inconsistent:**
- CoinGecko's 24h change is based on their internal calculation
- Chart calculation is based on fetched data points (can be different)
- Can show different percentages for the same asset

**Example:**
```
Dashboard: TON +2.5% (from CoinGecko API)
AssetDetail: TON +2.3% (from chart data calculation)
```

**User Impact:**
- User sees different percentages in different places
- Looks like a bug or data inconsistency
- Reduces trust in the app

---

### Issue #4: Missing Per-Asset Changes in Dashboard
**Location:** Dashboard.tsx  
**Severity:** 🟠 HIGH

**Problem:**
```typescript
// Dashboard asset list shows hardcoded change values
const assetList = useMemo(() => {
  // ...
  list.push({
    // ...
    change: 0, // RZC is project token, no market change data
  });
  // ...
  list.push({
    // ...
    change: assetChanges.ton, // Only TON has real data
  });
  // ...
  // Jettons have no change data at all
}, [/* ... */]);
```

**Why it's wrong:**
- `useBalance` provides `assetChanges` for all assets (TON, BTC, ETH, BNB, etc.)
- Dashboard only uses `assetChanges.ton`
- All other assets show `0%` or no change indicator
- Data is available but not used

**User Impact:**
- User sees BTC +5% in Assets.tsx
- User sees BTC 0% in Dashboard.tsx
- Inconsistent and confusing

---

### Issue #5: Assets.tsx Shows Only TON Change
**Location:** Assets.tsx  
**Severity:** 🟠 HIGH

**Problem:**
```typescript
// Line 675-679 - Only shows changePercent24h (TON change)
{changePercent24h !== undefined && (
  <span className={`... ${changePercent24h >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
    {changePercent24h >= 0 ? '+' : ''}{changePercent24h.toFixed(2)}%
  </span>
)}
```

**Why it's wrong:**
- `useBalance` provides `assetChanges.btc`, `assetChanges.eth`, etc.
- Assets.tsx only displays `changePercent24h` (TON change) for all assets
- BTC, ETH, SOL, etc. should show their own price changes

**User Impact:**
- User sees TON change percentage next to BTC price
- Completely wrong and misleading
- Should show BTC's 24h change, not TON's

---

## ✅ Recommended Fixes

### Fix #1: Correct Portfolio Change Calculation

**File:** `hooks/useBalance.ts`

**Current (WRONG):**
```typescript
const totalUsdValue = tonBalance * prices.tonPrice;
const change24h = totalUsdValue * (prices.change / 100);
```

**Fixed:**
```typescript
// Calculate total portfolio value
const tonUsdValue = tonBalance * prices.tonPrice;
const rzcUsdValue = rzcBalance * rzcPrice;
const jettonsUsdValue = /* calculate from jettons */;
const totalUsdValue = tonUsdValue + rzcUsdValue + jettonsUsdValue;

// Calculate 24h change for each asset
const tonChange24h = tonUsdValue * (prices.change / 100);
const rzcChange24h = 0; // RZC is project token, no market data
const jettonsChange24h = /* calculate from jetton prices */;
const totalChange24h = tonChange24h + rzcChange24h + jettonsChange24h;

// Calculate percentage change
const changePercent24h = totalUsdValue > 0 ? (totalChange24h / totalUsdValue) * 100 : 0;
```

**Impact:**
- ✅ Shows **true portfolio change**, not just TON
- ✅ Includes all assets (TON, RZC, Jettons, multi-chain)
- ✅ Accurate and meaningful to users

---

### Fix #2: Dynamic Time Range Labels

**File:** `pages/AssetDetail.tsx`

**Current (WRONG):**
```typescript
{isPositive ? '+' : ''}{priceChange.toFixed(2)}% (24h)
```

**Fixed:**
```typescript
const timeRangeLabels = {
  '1H': '1H',
  '1D': '24h',
  '1W': '7d',
  '1M': '30d',
  '1Y': '1y',
  'ALL': 'All'
};

{isPositive ? '+' : ''}{priceChange.toFixed(2)}% ({timeRangeLabels[selectedTimeRange]})
```

**Impact:**
- ✅ Shows correct time range label
- ✅ User knows what period the change represents
- ✅ No confusion

---

### Fix #3: Use Per-Asset Changes in Dashboard

**File:** `pages/Dashboard.tsx`

**Current (WRONG):**
```typescript
list.push({
  // ...
  change: assetChanges.ton, // Only TON
});
```

**Fixed:**
```typescript
// TON
list.push({
  // ...
  change: assetChanges.ton,
});

// BTC
if (btcBalance > 0) {
  list.push({
    // ...
    change: assetChanges.btc,
  });
}

// ETH
if (ethBalance > 0) {
  list.push({
    // ...
    change: assetChanges.eth,
  });
}

// Jettons - fetch from CoinGecko or registry
jettons.forEach(j => {
  const jettonChange = getJettonPriceChange(j.jetton.address); // New function
  list.push({
    // ...
    change: jettonChange,
  });
});
```

**Impact:**
- ✅ Each asset shows its own 24h change
- ✅ Accurate and informative
- ✅ Consistent with Assets.tsx

---

### Fix #4: Show Correct Asset Changes in Assets.tsx

**File:** `pages/Assets.tsx`

**Current (WRONG):**
```typescript
// Line 675-679 - Shows TON change for all assets
{changePercent24h !== undefined && (
  <span>
    {changePercent24h >= 0 ? '+' : ''}{changePercent24h.toFixed(2)}%
  </span>
)}
```

**Fixed:**
```typescript
// TON Asset
{changePercent24h !== undefined && (
  <span className={`... ${changePercent24h >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
    {changePercent24h >= 0 ? '+' : ''}{changePercent24h.toFixed(2)}%
  </span>
)}

// Jetton Assets
{jetton.price?.usd && jetton.change24h !== undefined && (
  <span className={`... ${jetton.change24h >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
    {jetton.change24h >= 0 ? '+' : ''}{jetton.change24h.toFixed(2)}%
  </span>
)}
```

**Impact:**
- ✅ Each asset shows its own change
- ✅ No more TON change on BTC/ETH rows
- ✅ Accurate and clear

---

### Fix #5: Unified Calculation Method

**Recommendation:** Use CoinGecko's `usd_24h_change` everywhere

**Why:**
- CoinGecko is the source of truth for prices
- Their 24h change is industry-standard
- Consistent across all components
- No need to calculate from chart data

**Implementation:**
```typescript
// In AssetDetail.tsx, fetch 24h change from CoinGecko
const [priceChange24h, setPriceChange24h] = useState<number>(0);

useEffect(() => {
  const fetchPriceChange = async () => {
    const coinId = COINGECKO_IDS[assetData.symbol];
    if (!coinId) return;
    
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`;
    const res = await fetch(url);
    const data = await res.json();
    
    setPriceChange24h(data[coinId]?.usd_24h_change ?? 0);
  };
  
  fetchPriceChange();
}, [assetData.symbol]);

// Display
{priceChange24h !== 0 && (
  <div className="...">
    {priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(2)}% (24h)
  </div>
)}
```

**Impact:**
- ✅ Consistent 24h change across all pages
- ✅ No calculation discrepancies
- ✅ Industry-standard data

---

## 📊 Summary Table

| Component | Current Behavior | Issue | Recommended Fix |
|-----------|------------------|-------|-----------------|
| **Dashboard** | Shows TON change as portfolio change | Misleading label | Calculate true portfolio change |
| **Dashboard** | Asset list shows 0% for most assets | Missing data | Use `assetChanges` from useBalance |
| **Assets** | Portfolio header shows TON change | Wrong metric | Show total portfolio change |
| **Assets** | TON asset shows TON change | Correct | ✅ No change needed |
| **Assets** | Other assets show TON change | Wrong data | Show per-asset changes |
| **AssetDetail** | Always shows "(24h)" label | Inaccurate | Dynamic label based on time range |
| **AssetDetail** | Calculates from chart data | Inconsistent | Use CoinGecko 24h change |

---

## 🎯 Priority Action Items

### Immediate (Critical)
1. ✅ Fix Assets.tsx to show correct per-asset changes (not TON change for all)
2. ✅ Fix AssetDetail.tsx time range labels (dynamic, not hardcoded "24h")
3. ✅ Fix Dashboard asset list to use `assetChanges` data

### Short Term (Important)
4. ✅ Calculate true portfolio change (all assets, not just TON)
5. ✅ Unify calculation method (use CoinGecko everywhere)
6. ✅ Add per-jetton price change data

### Long Term (Enhancement)
7. Add historical portfolio value tracking
8. Show portfolio performance over time (1W, 1M, 1Y)
9. Add portfolio analytics dashboard

---

## 🧪 Testing Checklist

### Manual Testing
- [ ] Dashboard shows correct portfolio change (all assets)
- [ ] Dashboard asset list shows correct per-asset changes
- [ ] Assets.tsx portfolio header shows total portfolio change
- [ ] Assets.tsx TON row shows TON change
- [ ] Assets.tsx BTC row shows BTC change (not TON)
- [ ] Assets.tsx ETH row shows ETH change (not TON)
- [ ] AssetDetail shows correct time range label (1H, 1D, 1W, etc.)
- [ ] AssetDetail percentage matches Dashboard/Assets for 24h

### Edge Cases
- [ ] User with only TON (no RZC/Jettons)
- [ ] User with only RZC (no TON)
- [ ] User with multi-chain assets (BTC, ETH, SOL)
- [ ] User with Jettons (USDT, etc.)
- [ ] Zero balance assets
- [ ] Negative price changes
- [ ] API failures (fallback to cached data)

---

## 📝 Conclusion

The percentage system has **significant inconsistencies** that create a confusing user experience:

1. **Portfolio change is misleading** - shows only TON change, not total
2. **Asset changes are wrong** - shows TON change for all assets
3. **Time range labels are inaccurate** - always says "24h"
4. **Calculation methods differ** - CoinGecko vs. chart data

**Estimated Effort:** 4-6 hours to fix all issues

**Impact:** High - affects user trust and understanding of their portfolio

---

**Analyzed by:** Kiro AI  
**Date:** April 30, 2026  
**Status:** ⚠️ ISSUES IDENTIFIED - FIXES RECOMMENDED

