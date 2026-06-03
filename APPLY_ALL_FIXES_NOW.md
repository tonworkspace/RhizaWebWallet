# Apply All 6 Fixes to StoreUI.tsx - Step by Step

**Status:** Ready to apply  
**Time Required:** 20 minutes  
**File:** `components/StoreUI.tsx`

---

## 🎯 OVERVIEW

You need to apply 6 fixes to complete the two-tier activation system. This guide walks you through each fix with exact line numbers and code.

**Prerequisites Verified:**
- ✅ Database schema deployed
- ✅ Config file updated
- ✅ Imports added
- ✅ State variables added
- ✅ Threshold variables added

---

## ✅ FIX #1: Activation Logic (Line 363-410) - 5 minutes

### Step 1: Find the Block
Press **Ctrl+F** and search for:
```
if (!walletActivated && costUsd >= 18)
```

This should take you to **line 363**.

### Step 2: Select and Delete
Select from line 363 to line 410 (the entire `if` block including the closing `}`).

The block starts with:
```typescript
                if (!walletActivated && costUsd >= 18) {
```

And ends with:
```typescript
                }
```

**Delete this entire block.**

### Step 3: Paste New Code
Paste this code in the exact same location:

```typescript
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
                        if (!client) throw new Error('Supabase client not available');

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
                        const totalSpentNow = data?.total_spent || costUsd;

                        if (activated) {
                            // Update local state
                            setNodeMilestoneStatus({
                                nodeActivated: nodeReached,
                                totalSpent: totalSpentNow,
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
                                    remaining_for_node: remaining,
                                    total_spent: totalSpentNow
                                }
                            );

                            // Show appropriate notification
                            if (nodeReached) {
                                await notificationService.createNotification(
                                    currentTonAddress, 'system_announcement',
                                    '🎉 Node Milestone Reached!',
                                    `Your wallet is activated and you've reached the $${nodeMilestoneThreshold} node milestone! Full benefits unlocked!`,
                                    { priority: 'high', data: { node_activated: true, total_spent: totalSpentNow } }
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
                        }
                    } catch (activationError) {
                        console.error('Auto-activation failed:', activationError);
                        // Don't fail the purchase if activation fails
                    }
                }
```

### Step 4: Save
Press **Ctrl+S** to save.

**✅ Fix #1 Complete!**

---

## ✅ FIX #2: Metadata Tracking (Line ~420) - 2 minutes

### Step 1: Find the Line
Press **Ctrl+F** and search for:
```
auto_activated: !walletActivated && costUsd >= 18
```

This should be around **line 420** (may have shifted after Fix #1).

### Step 2: Replace
Find this line:
```typescript
                            auto_activated: !walletActivated && costUsd >= 18
```

Replace it with:
```typescript
                            auto_activated: !walletActivated && costUsd >= storeActivationThreshold,
                            node_activated: nodeMilestoneStatus?.nodeActivated || false,
                            total_spent: nodeMilestoneStatus?.totalSpent || costUsd
```

**Note:** Add the comma after `storeActivationThreshold` and add the two new lines.

### Step 3: Save
Press **Ctrl+S** to save.

**✅ Fix #2 Complete!**

---

## ✅ FIX #3: Success Messages (Line ~469) - 3 minutes

### Step 1: Find the Block
Press **Ctrl+F** and search for:
```
const wasAutoActivated = !walletActivated && costUsd >= 18;
```

This should be around **line 469**.

### Step 2: Select and Delete
Select these lines:
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

**Delete this entire block.**

### Step 3: Paste New Code
Paste this code in the exact same location:

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

### Step 4: Save
Press **Ctrl+S** to save.

**✅ Fix #3 Complete!**

---

## ✅ FIX #4: Main Button Text (Line ~1180) - 2 minutes

### Step 1: Find the Line
Press **Ctrl+F** and search for:
```
Buy RZC + Activate Wallet
```

This should be around **line 1180**.

### Step 2: Replace
Find this line:
```typescript
                                                    {!walletActivated && costUsd >= 18 ? 'Buy RZC + Activate Wallet' : 'Buy RZC Now'}
```

Replace it with:
```typescript
                                                    {!walletActivated && costUsd >= storeActivationThreshold 
                                                        ? (costUsd >= nodeMilestoneThreshold 
                                                            ? 'Buy RZC + Activate + Node Milestone' 
                                                            : 'Buy RZC + Activate Wallet')
                                                        : 'Buy RZC Now'}
```

### Step 3: Save
Press **Ctrl+S** to save.

**✅ Fix #4 Complete!**

---

## ✅ FIX #5: Auto-Activation Notice + Progress Bar (Line ~1191) - 5 minutes

### Step 1: Find the Block
Press **Ctrl+F** and search for:
```
{/* Auto-activation notice */}
```

This should be around **line 1191**.

### Step 2: Select and Delete
Select this entire block:
```typescript
                        {/* Auto-activation notice */}
                        {!walletActivated && costUsd >= 18 && (
                            <div className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                                <Sparkles size={12} className="text-emerald-600 dark:text-emerald-400" />
                                <p className="text-xs font-heading font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-widest">
                                    Wallet will be auto-activated with this purchase!
                                </p>
                            </div>
                        )}
```

**Delete this entire block.**

### Step 3: Paste New Code
Paste this code in the exact same location:

```typescript
                        {/* Auto-activation notice */}
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
                                            🎉 You'll reach the ${nodeMilestoneThreshold} node milestone!
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                        <Info size={12} className="text-blue-600 dark:text-blue-400" />
                                        <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                            💡 Spend ${(nodeMilestoneThreshold - costUsd).toFixed(2)} more to reach node milestone
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Node Milestone Progress (for activated wallets) */}
                        {walletActivated && !nodeMilestoneStatus?.nodeActivated && nodeMilestoneStatus && nodeMilestoneStatus.totalSpent > 0 && (
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

### Step 4: Save
Press **Ctrl+S** to save.

**✅ Fix #5 Complete!**

---

## ✅ FIX #6: Sticky Button Text (Line ~1400) - 2 minutes

### Step 1: Find the Line
Press **Ctrl+F** and search for:
```
Secure My Allocation Now
```

This should be around **line 1400** in the sticky bottom bar section.

### Step 2: Find the Button Text
Look for the sticky button (usually near the bottom of the component). Find the text that says:
```typescript
<span className="text-sm font-heading font-black uppercase tracking-widest">
    Secure My Allocation Now
</span>
```

### Step 3: Replace
Replace the entire `<span>` block with:
```typescript
<span className="text-sm font-heading font-black uppercase tracking-widest">
    {!walletActivated && costUsd >= storeActivationThreshold 
        ? (costUsd >= nodeMilestoneThreshold 
            ? 'Buy + Activate + Node Milestone' 
            : 'Buy + Activate Wallet')
        : 'Secure My Allocation Now'}
</span>
```

### Step 4: Save
Press **Ctrl+S** to save.

**✅ Fix #6 Complete!**

---

## 🧪 VERIFICATION

### Step 1: Compile
Run this command to check for errors:
```bash
npm run build
```

**Expected:** Should compile without errors.

**If you see errors:**
- Check for missing braces `{` or `}`
- Check for missing commas
- Verify indentation matches surrounding code

### Step 2: Run Dev Server
```bash
npm run dev
```

**Expected:** Server starts without errors.

### Step 3: Visual Check
1. Open the store page in your browser
2. Check the browser console for errors
3. Verify the page loads correctly

---

## ✅ CHECKLIST

After completing all fixes, verify:

- [ ] Fix #1: Activation logic uses `storeActivationThreshold` and `activate_wallet_atomic()`
- [ ] Fix #2: Metadata includes `node_activated` and `total_spent`
- [ ] Fix #3: Success messages show milestone progress
- [ ] Fix #4: Main button text shows three states
- [ ] Fix #5: Auto-activation notice shows milestone info + progress bar
- [ ] Fix #6: Sticky button text matches main button logic
- [ ] File compiles without errors (`npm run build`)
- [ ] Dev server runs without errors (`npm run dev`)
- [ ] Store page loads without console errors
- [ ] No TypeScript errors in editor

---

## 🎉 SUCCESS!

Once all 6 fixes are applied and verified, the two-tier activation system is complete!

**What You've Achieved:**
- ✅ $10 store activation threshold (Easter egg)
- ✅ $18 node milestone tracking
- ✅ Atomic database operations
- ✅ Cumulative spending tracking
- ✅ Smart notifications based on milestone status
- ✅ Progress bar for partial activation
- ✅ Three-state button text
- ✅ Complete two-tier system

---

## 🆘 TROUBLESHOOTING

### Error: "storeActivationThreshold is not defined"
**Fix:** Verify lines 100-101 exist:
```typescript
const storeActivationThreshold = getStoreActivationFeeUSD(network);
const nodeMilestoneThreshold = getNodeActivationMilestoneUSD(network);
```

### Error: "nodeMilestoneStatus is not defined"
**Fix:** Verify lines 95-98 exist:
```typescript
const [nodeMilestoneStatus, setNodeMilestoneStatus] = useState<{
    nodeActivated: boolean;
    totalSpent: number;
    remainingForNode: number;
} | null>(null);
```

### Error: "getStoreActivationFeeUSD is not defined"
**Fix:** Verify import statement (line ~22):
```typescript
import { getStoreActivationFeeUSD, getNodeActivationMilestoneUSD } from '../config/paymentConfig';
```

### Compilation succeeds but page crashes
**Fix:** Check browser console for runtime errors. Verify database migration was deployed.

---

## 📞 NEED HELP?

If you get stuck:
1. Check the error message carefully
2. Verify all prerequisites (imports, state, thresholds)
3. Make sure database migration was run
4. Check browser console for runtime errors
5. Refer to `QUICK_FIX_REFERENCE.md` for quick reference

**Remember:** Take your time, apply one fix at a time, and save after each fix!

