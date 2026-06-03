# Two-Tier Activation System Implementation Guide

## Overview

This implements a clever two-tier activation system:

1. **Store "Easter Egg" Activation**: $10 minimum (unlocks wallet features)
2. **Node Activation Milestone**: $18 total (unlocks full node benefits)

### User Experience Flow

#### Scenario 1: User buys $10 in store
- ✅ Wallet gets activated (can use all wallet features)
- ❌ Node milestone NOT reached
- 💡 System shows: "Spend $8 more to reach node milestone and unlock full benefits!"

#### Scenario 2: Same user buys $8 more later
- ✅ Wallet already activated
- ✅ Node milestone NOW reached ($10 + $8 = $18 total)
- 🎉 System shows: "Node milestone reached! Full benefits unlocked!"

#### Scenario 3: User buys $18 activation package directly
- ✅ Wallet activated immediately
- ✅ Node milestone reached immediately
- 🎉 Full benefits from day one

---

## Step 1: Run Database Migration

```bash
# Run the SQL file to add node activation tracking
psql -h your-db-host -U your-user -d your-database -f add_node_activation_milestone.sql
```

**What this does:**
- Adds `node_activated`, `node_activated_at`, `total_activation_spent` columns
- Updates `activate_wallet_atomic()` function to track both tiers
- Creates `check_node_milestone_status()` function for status checks

---

## Step 2: Update StoreUI.tsx

### Import the new config functions

**Location:** Top of file (around line 20)

**Add:**
```typescript
import { 
    getStoreActivationFeeUSD, 
    getNodeActivationMilestoneUSD 
} from '../config/paymentConfig';
```

---

### Add state for node milestone tracking

**Location:** After existing state declarations (around line 70)

**Add:**
```typescript
const [nodeMilestoneStatus, setNodeMilestoneStatus] = useState<{
    nodeActivated: boolean;
    totalSpent: number;
    remainingForNode: number;
} | null>(null);
```

---

### Calculate activation thresholds

**Location:** After `const currentTonAddress = ...` (around line 90)

**Add:**
```typescript
const storeActivationThreshold = getStoreActivationFeeUSD(network); // $10
const nodeMilestoneThreshold = getNodeActivationMilestoneUSD(network); // $18
```

---

### Fetch node milestone status on load

**Location:** After the sponsor fetch useEffect (around line 150)

**Add:**
```typescript
// Fetch node milestone status
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

---

### Update auto-activation logic in handlePurchase

**Location:** Line 325 (inside handlePurchase, after transaction success)

**Replace:**
```typescript
// Auto-activate wallet if purchase is $18+ and not yet activated
if (!walletActivated && costUsd >= 18) {
    try {
        let activationAddress = currentTonAddress;
        try {
            const { Address } = await import('@ton/ton');
            activationAddress = Address.parse(currentTonAddress).toString({ 
                bounceable: false, 
                testOnly: network === 'testnet' 
            });
        } catch { /* use as-is */ }

        const activated = await supabaseService.activateWallet(activationAddress, {
            activation_fee_usd: costUsd,
            activation_fee_ton: paymentMethod === 'TON' ? costTon : 0,
            ton_price: tonPrice,
            transaction_hash: txResult.boc
        });

        if (activated) {
            await notificationService.logActivity(
                currentTonAddress, 'wallet_created', 
                'Wallet auto-activated via store purchase',
                { 
                    activation_fee_usd: costUsd,
                    activation_fee_ton: paymentMethod === 'TON' ? costTon : 0,
                    transaction_hash: txResult.boc,
                    auto_activated: true
                }
            );
            await notificationService.createNotification(
                currentTonAddress, 'system_announcement',
                '🎉 Wallet Activated!',
                `Your wallet has been automatically activated with your ${costUsd.toFixed(2)} purchase!`,
                { priority: 'high', data: { auto_activated: true } }
            );
            showSnackbar?.({ 
                message: 'Wallet Activated!', 
                description: 'Your wallet was automatically activated with this purchase', 
                type: 'success' 
            });
        }
    } catch (activationError) {
        console.error('Auto-activation failed:', activationError);
        // Don't fail the purchase if activation fails
    }
}
```

**With:**
```typescript
// Auto-activate wallet if purchase is >= $10 (Easter egg!)
if (!walletActivated && costUsd >= storeActivationThreshold) {
    try {
        let activationAddress = currentTonAddress;
        try {
            const { Address } = await import('@ton/ton');
            activationAddress = Address.parse(currentTonAddress).toString({ 
                bounceable: false, 
                testOnly: network === 'testnet' 
            });
        } catch { /* use as-is */ }

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

        const nodeReached = data?.node_activated || false;
        const remaining = data?.remaining_for_node || 0;

        // Update local state
        setNodeMilestoneStatus({
            nodeActivated: nodeReached,
            totalSpent: data?.total_spent || costUsd,
            remainingForNode: remaining
        });

        // Log activation
        await notificationService.logActivity(
            currentTonAddress, 'wallet_created', 
            'Wallet auto-activated via store purchase',
            { 
                activation_fee_usd: costUsd,
                activation_fee_ton: paymentMethod === 'TON' ? costTon : 0,
                transaction_hash: txResult.boc,
                auto_activated: true,
                node_activated: nodeReached,
                remaining_for_node: remaining
            }
        );

        // Show appropriate notification
        if (nodeReached) {
            await notificationService.createNotification(
                currentTonAddress, 'system_announcement',
                '🎉 Node Milestone Reached!',
                `Your wallet is activated and you've reached the $${nodeMilestoneThreshold} node milestone! Full benefits unlocked!`,
                { priority: 'high', data: { node_activated: true } }
            );
            showSnackbar?.({ 
                message: 'Node Milestone Reached!', 
                description: 'Wallet activated + Full node benefits unlocked!', 
                type: 'success' 
            });
        } else {
            await notificationService.createNotification(
                currentTonAddress, 'system_announcement',
                '✨ Wallet Activated!',
                `Your wallet is now activated! Spend $${remaining.toFixed(2)} more to reach the node milestone and unlock full benefits.`,
                { priority: 'high', data: { auto_activated: true, remaining_for_node: remaining } }
            );
            showSnackbar?.({ 
                message: 'Wallet Activated!', 
                description: `Spend $${remaining.toFixed(2)} more to reach node milestone`, 
                type: 'success' 
            });
        }
    } catch (activationError) {
        console.error('Auto-activation failed:', activationError);
        // Don't fail the purchase if activation fails
    }
}
```

---

### Update metadata flag

**Location:** Line 381

**Replace:**
```typescript
auto_activated: !walletActivated && costUsd >= 18
```

**With:**
```typescript
auto_activated: !walletActivated && costUsd >= storeActivationThreshold,
node_activated: nodeMilestoneStatus?.nodeActivated || false
```

---

### Update success message

**Location:** Line 431

**Replace:**
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

**With:**
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

---

### Update button text

**Location:** Line 1142

**Replace:**
```typescript
{!walletActivated && costUsd >= 18 ? 'Buy RZC + Activate Wallet' : 'Buy RZC Now'}
```

**With:**
```typescript
{!walletActivated && costUsd >= storeActivationThreshold 
    ? (costUsd >= nodeMilestoneThreshold 
        ? 'Buy RZC + Activate + Node Milestone' 
        : 'Buy RZC + Activate Wallet')
    : 'Buy RZC Now'}
```

---

### Update auto-activation notice

**Location:** Line 1153

**Replace:**
```typescript
{!walletActivated && costUsd >= 18 && (
    <div className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
        <Sparkles size={12} className="text-emerald-600 dark:text-emerald-400" />
        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
            ✨ This purchase will automatically activate your wallet!
        </span>
    </div>
)}
```

**With:**
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

---

### Add node milestone progress indicator (Optional Enhancement)

**Location:** After the auto-activation notice (around line 1170)

**Add:**
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

---

## Step 3: Update GlobalPurchaseModal.tsx (Package Purchases)

Package purchases should always use the full $18 activation fee and immediately reach node milestone.

**Location:** Around line 88 (in handlePurchase function)

**Find:**
```typescript
const activated = await supabaseService.activateWallet(activationAddress, {
    activation_fee_usd: pkg.pricePoint > 0 ? totalCost : pkg.activationFee * validTonPrice,
    activation_fee_ton: totalCostTON,
    ton_price: validTonPrice,
    transaction_hash: txHash
});
```

**Replace with:**
```typescript
const client = supabaseService.getClient();
const { data, error } = await client.rpc('activate_wallet_atomic', {
    p_wallet_address: activationAddress,
    p_activation_fee_usd: pkg.pricePoint > 0 ? totalCost : pkg.activationFee,
    p_activation_fee_ton: totalCostTON,
    p_ton_price: validTonPrice,
    p_transaction_hash: txHash,
    p_activation_source: 'package'
});

if (error) throw error;
const activated = data?.success || false;
const nodeActivated = data?.node_activated || false;
```

---

## Step 4: Testing Checklist

### Test Scenario 1: Store Purchase $10 (First Time)
- [ ] User not activated
- [ ] Purchase $10 worth of RZC
- [ ] Wallet gets activated ✅
- [ ] Node milestone NOT reached ❌
- [ ] Message shows: "Spend $8 more to reach node milestone"
- [ ] Database: `is_activated = true`, `node_activated = false`, `total_activation_spent = 10`

### Test Scenario 2: Store Purchase $8 More (Same User)
- [ ] User already activated from previous $10
- [ ] Purchase $8 more worth of RZC
- [ ] Node milestone NOW reached ✅
- [ ] Message shows: "Node milestone reached!"
- [ ] Database: `node_activated = true`, `total_activation_spent = 18`

### Test Scenario 3: Store Purchase $20 (First Time)
- [ ] User not activated
- [ ] Purchase $20 worth of RZC
- [ ] Wallet activated ✅
- [ ] Node milestone reached ✅
- [ ] Message shows: "Wallet activated and node milestone reached!"
- [ ] Database: `is_activated = true`, `node_activated = true`, `total_activation_spent = 20`

### Test Scenario 4: Package Purchase $18 (First Time)
- [ ] User not activated
- [ ] Purchase "Wallet Activation" package ($18)
- [ ] Wallet activated ✅
- [ ] Node milestone reached ✅
- [ ] Database: `is_activated = true`, `node_activated = true`, `total_activation_spent = 18`

### Test Scenario 5: Already Activated User
- [ ] User already activated with node milestone
- [ ] Purchase any amount
- [ ] No activation logic triggered
- [ ] Just receives RZC tokens

---

## Benefits of This System

### For Users
1. **Lower Entry Barrier**: $10 vs $18 makes it more accessible
2. **Progressive Engagement**: Can start small and upgrade later
3. **Hidden Benefit**: Feels like discovering a secret feature
4. **Clear Upgrade Path**: Know exactly how much more to spend

### For Business
1. **Higher Conversion**: Lower initial commitment
2. **Increased LTV**: Users likely to spend more to reach milestone
3. **Gamification**: Progress bar encourages completion
4. **Flexibility**: Can adjust thresholds per network

### Technical
1. **Atomic Operations**: All-or-nothing database transactions
2. **Cumulative Tracking**: Tracks total spent across purchases
3. **Idempotent**: Safe to retry without duplicates
4. **Auditable**: Full history in database

---

## Configuration Summary

| Network | Store Activation | Node Milestone | Package Activation |
|---------|-----------------|----------------|-------------------|
| **Mainnet** | $10 | $18 | $18 |
| **Testnet** | $8 | $15 | $15 |

---

## Database Schema Changes

```sql
-- New columns in wallet_users
node_activated BOOLEAN DEFAULT false
node_activated_at TIMESTAMPTZ
total_activation_spent NUMERIC DEFAULT 0

-- New columns in wallet_activations
node_activated BOOLEAN DEFAULT false
node_activated_at TIMESTAMPTZ
total_spent NUMERIC DEFAULT 0
activation_source TEXT -- 'store', 'package', 'direct'
```

---

## API Changes

### New Function: `activate_wallet_atomic()`
Now accepts `p_activation_source` parameter and returns:
```json
{
  "success": true,
  "node_activated": false,
  "total_spent": 10,
  "remaining_for_node": 8,
  "message": "Wallet activated! Spend $8 more to reach node milestone."
}
```

### New Function: `check_node_milestone_status()`
Returns current milestone progress:
```json
{
  "is_activated": true,
  "node_activated": false,
  "total_spent": 10,
  "remaining_for_node": 8
}
```

---

## Rollback Plan

If you need to revert:

```sql
-- Remove new columns
ALTER TABLE wallet_users 
DROP COLUMN IF EXISTS node_activated,
DROP COLUMN IF EXISTS node_activated_at,
DROP COLUMN IF EXISTS total_activation_spent;

ALTER TABLE wallet_activations
DROP COLUMN IF EXISTS node_activated,
DROP COLUMN IF EXISTS node_activated_at,
DROP COLUMN IF EXISTS total_spent,
DROP COLUMN IF EXISTS activation_source;

-- Restore old function (5 parameters instead of 6)
-- (Keep backup of old function before running migration)
```

---

## Next Steps

1. ✅ Run database migration: `add_node_activation_milestone.sql`
2. ✅ Update `config/paymentConfig.ts` (already done)
3. ⏳ Update `components/StoreUI.tsx` (follow guide above)
4. ⏳ Update `components/GlobalPurchaseModal.tsx` (follow guide above)
5. ⏳ Test all scenarios
6. ⏳ Deploy to testnet first
7. ⏳ Monitor and verify
8. ⏳ Deploy to mainnet

**Estimated Time:** 45-60 minutes
**Risk Level:** Medium (database schema changes)
**Testing Required:** Yes (all 5 scenarios above)
