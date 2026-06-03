# StoreUI.tsx - Two-Tier Activation Fixes (FINAL)

## ✅ Status: Partially Complete

### Already Applied ✅
1. ✅ Import statement updated (line ~17)
2. ✅ Node milestone state added (line ~95)
3. ✅ Activation thresholds calculated (line ~100)
4. ✅ Node status fetch useEffect added (line ~150)

### Still Need to Apply ❌

---

## Fix #1: Update Activation Logic (Line ~365-410)

**Find this block (around line 365):**
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

**Replace with:**
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

## Fix #2: Update Metadata Tracking (Line ~420)

**Find:**
```typescript
                            auto_activated: !walletActivated && costUsd >= 18
```

**Replace with:**
```typescript
                            auto_activated: !walletActivated && costUsd >= storeActivationThreshold,
                            node_activated: nodeMilestoneStatus?.nodeActivated || false,
                            total_spent: nodeMilestoneStatus?.totalSpent || costUsd
```

---

## Fix #3: Update Success Message (Line ~470)

**Find:**
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

**Replace with:**
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

## Fix #4: Update Main Button Text (Line ~1180 in purchase form)

**Find:**
```typescript
                                                {!walletActivated && costUsd >= 18 ? 'Buy RZC + Activate Wallet' : 'Buy RZC Now'}
```

**Replace with:**
```typescript
                                                {!walletActivated && costUsd >= storeActivationThreshold 
                                                    ? (costUsd >= nodeMilestoneThreshold 
                                                        ? 'Buy RZC + Activate + Node Milestone' 
                                                        : 'Buy RZC + Activate Wallet')
                                                    : 'Buy RZC Now'}
```

---

## Fix #5: Update Auto-Activation Notice (Line ~1190)

**Find:**
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

**Replace with:**
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

---

## Fix #6: Update Sticky Bottom Bar Button Text (Line ~1400)

**Find:**
```typescript
                                                <span className="text-sm font-heading font-black uppercase tracking-widest">Secure My Allocation Now</span>
```

**Look above it for the button text logic and update to:**
```typescript
                                                <span className="text-sm font-heading font-black uppercase tracking-widest">
                                                    {!walletActivated && costUsd >= storeActivationThreshold 
                                                        ? (costUsd >= nodeMilestoneThreshold 
                                                            ? 'Buy + Activate + Node Milestone' 
                                                            : 'Buy + Activate Wallet')
                                                        : 'Secure My Allocation Now'}
                                                </span>
```

---

## Verification Checklist

After applying all fixes, verify:

- [ ] File compiles without errors: `npm run build`
- [ ] Import statement includes config functions
- [ ] State includes `nodeMilestoneStatus`
- [ ] Thresholds use `storeActivationThreshold` and `nodeMilestoneThreshold`
- [ ] Node status fetch useEffect is present
- [ ] Activation logic uses `activate_wallet_atomic()` RPC
- [ ] Activation condition is `>= storeActivationThreshold` (not `>= 18`)
- [ ] Success messages include node milestone info
- [ ] Button text shows three states (normal, activate, activate+milestone)
- [ ] Auto-activation notice shows milestone info
- [ ] Progress bar appears for activated users without node milestone
- [ ] Metadata tracking includes node_activated and total_spent

---

## Testing After Fixes

### Test 1: $10 Purchase (Not Activated)
1. User not activated
2. Purchase $10 worth of RZC
3. **Expected:** Wallet activated, node NOT reached, message shows "$8 more for milestone"

### Test 2: $8 More (Same User)
1. User activated with $10
2. Purchase $8 more
3. **Expected:** Node milestone reached, success message confirms

### Test 3: $20 Purchase (Not Activated)
1. User not activated
2. Purchase $20 worth of RZC
3. **Expected:** Both activated, node milestone reached immediately

### Test 4: Progress Bar
1. User activated with $12
2. **Expected:** Progress bar shows 66.7% (12/18), "$6 more" message

---

## Quick Apply Guide

1. Open `components/StoreUI.tsx` in your editor
2. Use Ctrl+F to find each "Find:" block
3. Replace with the corresponding "Replace with:" block
4. Save file
5. Run `npm run build` to verify
6. Test all scenarios

**Estimated Time:** 15-20 minutes

---

## Support

If you encounter issues:
- Check line numbers may vary slightly
- Look for the unique text patterns in "Find:" blocks
- Ensure all imports are at the top
- Verify state declarations are in the component body
- Check useEffects are before other functions

**Remember:** The $10 activation is a secret "easter egg" - users discover it naturally!
