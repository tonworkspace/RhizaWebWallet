# Two-Tier Activation System - Audit Report

## 📋 Audit Date
**Date:** Current  
**Files Audited:** `components/StoreUI.tsx`, `pages/MiningNodes.tsx`  
**System:** Two-tier activation ($10 store, $18 node milestone)

---

## ✅ What's Already Implemented

### Configuration (`config/paymentConfig.ts`)
- ✅ `storeActivationFeeUSD: 10` (mainnet) / `8` (testnet)
- ✅ `nodeActivationMilestoneUSD: 18` (mainnet) / `15` (testnet)
- ✅ Helper functions: `getStoreActivationFeeUSD()`, `getNodeActivationMilestoneUSD()`

### Database Schema (`add_node_activation_milestone.sql`)
- ✅ New columns: `node_activated`, `node_activated_at`, `total_activation_spent`
- ✅ Updated `activate_wallet_atomic()` function with 6 parameters
- ✅ New `check_node_milestone_status()` function
- ✅ Cumulative spending tracking

---

## ❌ What's Missing in StoreUI.tsx

### Critical Issues

#### 1. **NOT Using Config Constants** ❌
**Current (Line 325):**
```typescript
if (!walletActivated && costUsd >= 18) {
```

**Should be:**
```typescript
import { getStoreActivationFeeUSD, getNodeActivationMilestoneUSD } from '../config/paymentConfig';

const storeActivationThreshold = getStoreActivationFeeUSD(network); // $10
const nodeMilestoneThreshold = getNodeActivationMilestoneUSD(network); // $18

if (!walletActivated && costUsd >= storeActivationThreshold) {
```

**Impact:** 
- Hardcoded $18 instead of $10 for store activation
- Testnet differences not respected
- **Users need to spend $18 instead of $10 to activate via store** ⚠️

---

#### 2. **NOT Using Atomic Activation Function** ❌
**Current (Line 336):**
```typescript
const activated = await supabaseService.activateWallet(activationAddress, {
    activation_fee_usd: costUsd,
    activation_fee_ton: paymentMethod === 'TON' ? costTon : 0,
    ton_price: tonPrice,
    transaction_hash: txResult.boc
});
```

**Should be:**
```typescript
const client = supabaseService.getClient();
const { data, error } = await client.rpc('activate_wallet_atomic', {
    p_wallet_address: activationAddress,
    p_activation_fee_usd: costUsd,
    p_activation_fee_ton: paymentMethod === 'TON' ? costTon : 0,
    p_ton_price: tonPrice,
    p_transaction_hash: txResult.boc,
    p_activation_source: 'store'
});

if (error) throw error;
const activated = data?.success || false;
const nodeReached = data?.node_activated || false;
const remaining = data?.remaining_for_node || 0;
```

**Impact:**
- No node milestone tracking
- No cumulative spending tracking
- No two-tier system functionality
- Missing atomic transaction safety

---

#### 3. **Missing Node Milestone State** ❌
**Missing:**
```typescript
const [nodeMilestoneStatus, setNodeMilestoneStatus] = useState<{
    nodeActivated: boolean;
    totalSpent: number;
    remainingForNode: number;
} | null>(null);
```

**Impact:** Can't track or display node milestone progress

---

#### 4. **Missing Node Milestone Status Fetch** ❌
**Missing useEffect:**
```typescript
useEffect(() => {
    const fetchNodeStatus = async () => {
        if (!currentTonAddress) return;
        
        try {
            const client = supabaseService.getClient();
            const { data, error } = await client.rpc('check_node_milestone_status', {
                p_wallet_address: currentTonAddress
            });
            
            if (!error && data) {
                setNodeMilestoneStatus({
                    nodeActivated: data.node_activated || false,
                    totalSpent: data.total_spent || 0,
                    remainingForNode: data.remaining_for_node || nodeMilestoneThreshold
                });
            }
        } catch (err) {
            console.warn('[StoreUI] Failed to fetch node milestone status:', err);
        }
    };
    
    fetchNodeStatus();
}, [currentTonAddress, nodeMilestoneThreshold]);
```

**Impact:** No way to know current milestone progress

---

#### 5. **Wrong Success Messages** ❌
**Current (Line 431):**
```typescript
const wasAutoActivated = !walletActivated && costUsd >= 18;
showSnackbar?.({ 
    message: 'Purchase Complete', 
    description: wasAutoActivated 
        ? `Successfully purchased ${totalRZC.toLocaleString()} RZC tokens and activated your wallet!`
        : `Successfully purchased ${totalRZC.toLocaleString()} RZC tokens`, 
    type: 'success' 
});
```

**Should be:**
```typescript
const wasAutoActivated = !walletActivated && costUsd >= storeActivationThreshold;
const nodeReached = nodeMilestoneStatus?.nodeActivated || false;

let successMessage = `Successfully purchased ${totalRZC.toLocaleString()} RZC tokens`;
if (wasAutoActivated && nodeReached) {
    successMessage += ' and reached node milestone!';
} else if (wasAutoActivated) {
    const remaining = nodeMilestoneStatus?.remainingForNode || 0;
    successMessage += ` and activated your wallet! Spend $${remaining.toFixed(2)} more for node milestone.`;
}

showSnackbar?.({ 
    message: 'Purchase Complete', 
    description: successMessage, 
    type: 'success' 
});
```

**Impact:** Users don't know about node milestone or remaining amount

---

#### 6. **Wrong Button Text** ❌
**Current (Line 1142 - in sticky bottom bar):**
```typescript
{!walletActivated && costUsd >= 18 ? 'Buy RZC + Activate Wallet' : 'Buy RZC Now'}
```

**Should be:**
```typescript
{!walletActivated && costUsd >= storeActivationThreshold 
    ? (costUsd >= nodeMilestoneThreshold 
        ? 'Buy RZC + Activate + Node Milestone' 
        : 'Buy RZC + Activate Wallet')
    : 'Buy RZC Now'}
```

**Impact:** Misleading button text, doesn't show node milestone option

---

#### 7. **Wrong Auto-Activation Notice** ❌
**Current (Line 1153):**
```typescript
{!walletActivated && costUsd >= 18 && (
    <div className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
        <Sparkles size={12} className="text-emerald-600 dark:text-emerald-400" />
        <p className="text-xs font-heading font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-widest">
            Wallet will be auto-activated with this purchase!
        </p>
    </div>
)}
```

**Should be:**
```typescript
{!walletActivated && costUsd >= storeActivationThreshold && (
    <div className="flex flex-col gap-2">
        <div className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <Sparkles size={12} className="text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                ✨ This purchase will automatically activate your wallet!
            </span>
        </div>
        
        {costUsd >= nodeMilestoneThreshold ? (
            <div className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <Trophy size={12} className="text-purple-600 dark:text-purple-400" />
                <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                    🎉 You'll reach the $${nodeMilestoneThreshold} node milestone!
                </span>
            </div>
        ) : (
            <div className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <Info size={12} className="text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                    💡 Spend $${(nodeMilestoneThreshold - costUsd).toFixed(2)} more to reach node milestone
                </span>
            </div>
        )}
    </div>
)}
```

**Impact:** Users don't see node milestone information

---

#### 8. **Missing Node Milestone Progress Bar** ❌
**Should add after auto-activation notice:**
```typescript
{/* Node Milestone Progress (for activated wallets) */}
{walletActivated && !nodeMilestoneStatus?.nodeActivated && nodeMilestoneStatus && (
    <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-blue-200 dark:border-blue-500/20 rounded-xl">
        <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                Node Milestone Progress
            </span>
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                ${nodeMilestoneStatus.totalSpent.toFixed(2)} / ${nodeMilestoneThreshold}
            </span>
        </div>
        
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                style={{ width: `${Math.min((nodeMilestoneStatus.totalSpent / nodeMilestoneThreshold) * 100, 100)}%` }}
            />
        </div>
        
        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 text-center">
            ${nodeMilestoneStatus.remainingForNode.toFixed(2)} more to unlock full node benefits
        </p>
    </div>
)}
```

**Impact:** No visual progress indicator for users

---

#### 9. **Wrong Metadata Tracking** ❌
**Current (Line 381):**
```typescript
auto_activated: !walletActivated && costUsd >= 18
```

**Should be:**
```typescript
auto_activated: !walletActivated && costUsd >= storeActivationThreshold,
node_activated: nodeMilestoneStatus?.nodeActivated || false,
total_spent: nodeMilestoneStatus?.totalSpent || costUsd
```

**Impact:** Incomplete tracking data

---

## ❌ What's Missing in MiningNodes.tsx

### Issues Found

#### 1. **No Two-Tier System Awareness** ⚠️
**Current:** Shows activation as binary (activated or not)

**Should show:**
- Wallet activation status (at $10)
- Node milestone status (at $18)
- Progress toward node milestone
- Remaining amount needed

---

#### 2. **Activation Banner Doesn't Mention $10 Option** ❌
**Current (Line 165):**
```typescript
<p className="text-sm text-blue-200/70 font-medium mb-4 leading-relaxed max-w-2xl">
    A one-time network initialization fee of $18 is required...
</p>
```

**Should mention:**
```typescript
<p className="text-sm text-blue-200/70 font-medium mb-4 leading-relaxed max-w-2xl">
    A one-time network initialization fee of $18 is required to sync your wallet with the RhizaCore matrix. 
    <span className="text-blue-100 font-bold">Pro tip:</span> You can also activate by purchasing $10+ in the Store!
</p>
```

**Impact:** Users don't know about the $10 store activation option

---

#### 3. **No Node Milestone Status Display** ❌
**Missing:** Display for users who are activated but haven't reached node milestone

**Should add:**
```typescript
{isActivated && !nodeActivated && totalSpent > 0 && (
    <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-blue-200 dark:border-blue-500/20 rounded-xl">
        <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                Node Milestone Progress
            </span>
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                ${totalSpent.toFixed(2)} / $18
            </span>
        </div>
        
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                style={{ width: `${Math.min((totalSpent / 18) * 100, 100)}%` }}
            />
        </div>
        
        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 text-center">
            ${(18 - totalSpent).toFixed(2)} more to unlock full node benefits
        </p>
    </div>
)}
```

**Impact:** Users don't see their progress toward node milestone

---

#### 4. **Package Purchases Don't Use Atomic Function** ⚠️
**Current:** Uses `openPurchaseModal()` which likely calls old activation method

**Should verify:** `GlobalPurchaseModal.tsx` uses `activate_wallet_atomic()` with `activation_source: 'package'`

---

## 📊 Summary of Missing Features

### StoreUI.tsx (9 Critical Issues)
| # | Issue | Impact | Priority |
|---|-------|--------|----------|
| 1 | Hardcoded $18 instead of $10 | Users can't activate at $10 | 🔴 P0 |
| 2 | Not using atomic function | No two-tier tracking | 🔴 P0 |
| 3 | Missing node milestone state | Can't track progress | 🔴 P0 |
| 4 | Missing status fetch | No progress data | 🔴 P0 |
| 5 | Wrong success messages | Confusing UX | 🟡 P1 |
| 6 | Wrong button text | Misleading | 🟡 P1 |
| 7 | Wrong activation notice | Missing info | 🟡 P1 |
| 8 | Missing progress bar | No visual feedback | 🟡 P1 |
| 9 | Wrong metadata tracking | Incomplete data | 🟢 P2 |

### MiningNodes.tsx (4 Issues)
| # | Issue | Impact | Priority |
|---|-------|--------|----------|
| 1 | No two-tier awareness | Binary activation view | 🟡 P1 |
| 2 | Doesn't mention $10 option | Users miss easter egg | 🟡 P1 |
| 3 | No milestone status display | No progress visibility | 🟡 P1 |
| 4 | Package purchases unclear | May not use atomic function | 🟢 P2 |

---

## 🎯 Implementation Priority

### Phase 1: Critical (Must Fix) - StoreUI.tsx
1. ✅ Import config functions
2. ✅ Add `storeActivationThreshold` and `nodeMilestoneThreshold` constants
3. ✅ Add `nodeMilestoneStatus` state
4. ✅ Add node status fetch useEffect
5. ✅ Replace `supabaseService.activateWallet()` with `activate_wallet_atomic()` RPC
6. ✅ Update activation condition from `>= 18` to `>= storeActivationThreshold`
7. ✅ Update success messages with node milestone info
8. ✅ Update button text with three states
9. ✅ Update activation notice with node milestone info

### Phase 2: Important (Should Fix) - StoreUI.tsx
10. ✅ Add node milestone progress bar
11. ✅ Update metadata tracking

### Phase 3: Enhancement - MiningNodes.tsx
12. ✅ Add node milestone status display
13. ✅ Update activation banner with $10 mention
14. ✅ Verify GlobalPurchaseModal uses atomic function

---

## 🧪 Testing Checklist

After implementing fixes, test these scenarios:

### Scenario 1: $10 Store Purchase (First Time)
- [ ] User not activated
- [ ] Purchase $10 worth of RZC
- [ ] Wallet gets activated ✅
- [ ] Node milestone NOT reached ❌
- [ ] Message shows: "Spend $8 more to reach node milestone"
- [ ] Database: `is_activated = true`, `node_activated = false`, `total_activation_spent = 10`

### Scenario 2: $8 More (Same User)
- [ ] User already activated from $10
- [ ] Purchase $8 more
- [ ] Node milestone reached ✅
- [ ] Message shows: "Node milestone reached!"
- [ ] Database: `node_activated = true`, `total_activation_spent = 18`

### Scenario 3: $20 Store Purchase (First Time)
- [ ] User not activated
- [ ] Purchase $20 worth of RZC
- [ ] Wallet activated ✅
- [ ] Node milestone reached ✅
- [ ] Message shows: "Wallet activated and node milestone reached!"
- [ ] Database: `is_activated = true`, `node_activated = true`, `total_activation_spent = 20`

### Scenario 4: $18 Package Purchase
- [ ] User not activated
- [ ] Purchase activation package ($18)
- [ ] Both activated ✅
- [ ] Database: `is_activated = true`, `node_activated = true`, `total_activation_spent = 18`

### Scenario 5: Progress Bar Display
- [ ] User activated with $10
- [ ] Progress bar shows 55.6% (10/18)
- [ ] Shows "$8 more to unlock full node benefits"
- [ ] Purchase $5 more
- [ ] Progress bar updates to 83.3% (15/18)
- [ ] Shows "$3 more to unlock full node benefits"

---

## 📝 Code Changes Required

### File: `components/StoreUI.tsx`

**Lines to change:**
- Line 1-20: Add imports
- Line 70: Add state
- Line 90: Add threshold constants
- Line 150: Add useEffect for node status
- Line 325-360: Replace activation logic
- Line 381: Update metadata
- Line 431-440: Update success messages
- Line 1142: Update button text (main form)
- Line 1153-1160: Update activation notice
- Line 1170: Add progress bar (new)
- Line ~1415: Update button text (sticky bar)

**Estimated changes:** ~150 lines modified/added

---

## 🚀 Next Steps

1. **Run database migration** (if not done):
   ```bash
   psql -h your-db-host -U your-user -d your-database -f add_node_activation_milestone.sql
   ```

2. **Apply StoreUI.tsx fixes** using `IMPLEMENT_TWO_TIER_ACTIVATION.md` guide

3. **Test all 5 scenarios** above

4. **Update MiningNodes.tsx** with node milestone awareness

5. **Verify GlobalPurchaseModal.tsx** uses atomic function

6. **Deploy to testnet** first

7. **Monitor and verify** before mainnet

---

## ⚠️ Current State

**Status:** ❌ **NOT IMPLEMENTED**

The two-tier activation system is:
- ✅ Designed (database schema ready)
- ✅ Configured (payment config updated)
- ❌ **NOT integrated into StoreUI.tsx**
- ❌ **NOT integrated into MiningNodes.tsx**

**Current behavior:**
- Store requires $18 to activate (should be $10)
- No node milestone tracking
- No cumulative spending tracking
- No progress indicators
- Users miss the "easter egg" entirely

**Risk:** High - Users are paying $18 when they could pay $10

---

## 💡 Recommendations

1. **Immediate:** Fix StoreUI.tsx activation threshold ($18 → $10)
2. **High Priority:** Implement atomic activation function
3. **Medium Priority:** Add node milestone UI elements
4. **Low Priority:** Enhance MiningNodes.tsx awareness

**Estimated Implementation Time:** 2-3 hours  
**Testing Time:** 1 hour  
**Total:** 3-4 hours

---

## 📞 Support

If you need help implementing:
1. Follow `IMPLEMENT_TWO_TIER_ACTIVATION.md` step-by-step
2. Test each change incrementally
3. Use `TWO_TIER_ACTIVATION_SUMMARY.md` for quick reference
4. Check database with `check_node_milestone_status()` function

**Remember:** The $10 activation is a secret "easter egg" - don't advertise it heavily, let users discover it naturally!
