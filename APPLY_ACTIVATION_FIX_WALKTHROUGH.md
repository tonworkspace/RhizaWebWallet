# Step-by-Step: Apply Critical Activation Logic Fix

## 🎯 Goal
Replace the old activation method with the new two-tier atomic activation system.

---

## 📍 Step 1: Open StoreUI.tsx

Open `components/StoreUI.tsx` in your code editor.

---

## 📍 Step 2: Find the Activation Block

**Use Ctrl+F (or Cmd+F on Mac) and search for:**
```
Auto-activate wallet if purchase is $18+
```

This should take you to around **line 365**.

You'll see a comment that says:
```typescript
// Auto-activate wallet if purchase is $18+ and not yet activated
```

---

## 📍 Step 3: Select the Entire Block to Replace

Starting from the comment line, select everything down to and including:
```typescript
                }
```

The block you're selecting should look like this:

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

**Important:** Make sure you select the entire block including the closing `}` brace.

---

## 📍 Step 4: Delete the Selected Block

Press **Delete** or **Backspace** to remove the old code.

---

## 📍 Step 5: Paste the New Code

Copy and paste this NEW code in the exact same location:

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

---

## 📍 Step 6: Verify the Indentation

Make sure the indentation matches the surrounding code. The block should be indented to align with the code above and below it.

---

## 📍 Step 7: Save the File

Press **Ctrl+S** (or **Cmd+S** on Mac) to save.

---

## 📍 Step 8: Verify Compilation

Run this command to check for syntax errors:

```bash
npm run build
```

**Expected output:** Should compile without errors.

**If you see errors:**
- Check for missing braces `{` or `}`
- Check indentation
- Make sure you didn't accidentally delete surrounding code

---

## ✅ What Changed?

### Before (Old Code):
```typescript
// Hardcoded $18 threshold
if (!walletActivated && costUsd >= 18) {
    // Uses old method
    const activated = await supabaseService.activateWallet(...)
    
    // Single notification
    if (activated) {
        // Shows generic "Wallet Activated" message
    }
}
```

### After (New Code):
```typescript
// Dynamic $10 threshold from config
if (!walletActivated && costUsd >= storeActivationThreshold) {
    // Uses new atomic RPC function
    const { data, error } = await client.rpc('activate_wallet_atomic', {
        p_activation_source: 'store'  // Tracks source
    })
    
    // Extracts milestone data
    const nodeReached = data?.node_activated || false;
    const remaining = data?.remaining_for_node || 0;
    
    // Updates local state
    setNodeMilestoneStatus({...})
    
    // Shows different notifications based on milestone
    if (nodeReached) {
        // "Node Milestone Reached!" message
    } else {
        // "Spend $X more to reach node milestone" message
    }
}
```

---

## 🎯 Key Improvements

1. **$10 Threshold:** Now activates at $10 instead of $18
2. **Atomic Function:** Uses database RPC for atomic transactions
3. **Milestone Tracking:** Tracks node milestone separately
4. **Cumulative Spending:** Tracks total spent across purchases
5. **Smart Notifications:** Shows different messages based on milestone status
6. **State Updates:** Updates local state for UI reactivity
7. **Source Tracking:** Records that activation came from store

---

## 🧪 Quick Test

After saving, you can do a quick visual test:

1. Start the dev server: `npm run dev`
2. Open the store page
3. Check the console for any errors
4. The page should load without issues

**Full testing** (with actual purchases) comes later after all fixes are applied.

---

## ✅ Verification Checklist

- [ ] Old code block completely removed
- [ ] New code block pasted in same location
- [ ] Indentation matches surrounding code
- [ ] File saved
- [ ] `npm run build` runs without errors
- [ ] No console errors when viewing store page

---

## 🎉 Success!

You've just applied the most critical fix! This enables:
- ✅ $10 activation threshold
- ✅ Node milestone tracking
- ✅ Two-tier system functionality
- ✅ Atomic database operations

---

## 📋 Next Steps

After this fix is applied and verified, you'll need to apply 5 more fixes:

1. ✅ **Activation Logic** (DONE - you just did this!)
2. ⏳ **Metadata Tracking** (Line ~420) - 2 minutes
3. ⏳ **Success Messages** (Line ~470) - 3 minutes
4. ⏳ **Main Button Text** (Line ~1180) - 2 minutes
5. ⏳ **Auto-Activation Notice** (Line ~1190) - 5 minutes
6. ⏳ **Sticky Button Text** (Line ~1400) - 2 minutes

**Total remaining time:** ~15 minutes

Would you like to continue with Fix #2 (Metadata Tracking)?

---

## 🆘 Troubleshooting

### Error: "storeActivationThreshold is not defined"
**Solution:** Make sure lines 100-101 are present:
```typescript
const storeActivationThreshold = getStoreActivationFeeUSD(network);
const nodeMilestoneThreshold = getNodeActivationMilestoneUSD(network);
```

### Error: "setNodeMilestoneStatus is not defined"
**Solution:** Make sure lines 95-98 are present:
```typescript
const [nodeMilestoneStatus, setNodeMilestoneStatus] = useState<{
    nodeActivated: boolean;
    totalSpent: number;
    remainingForNode: number;
} | null>(null);
```

### Error: "getStoreActivationFeeUSD is not defined"
**Solution:** Make sure the import statement includes:
```typescript
import { getStoreActivationFeeUSD, getNodeActivationMilestoneUSD } from '../config/paymentConfig';
```

### Compilation succeeds but page crashes
**Solution:** Check browser console for runtime errors. Most likely the database function hasn't been deployed yet.

---

## 📞 Need Help?

If you're stuck:
1. Check the error message carefully
2. Verify all prerequisites are in place (imports, state, thresholds)
3. Make sure database migration was run
4. Check browser console for runtime errors

**Remember:** This is the most complex fix. The remaining 5 fixes are much simpler!
