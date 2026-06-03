# StoreUI - Critical Fixes to Apply Manually

## 🎯 Quick Reference: What Needs to Change

Since the file is too large for automated replacement, here are the exact changes needed:

---

## Fix #1: Atomic Activation (CRITICAL)

**Find this code (around line 330):**
```typescript
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
    // ... rest of success handling ...
}
```

**Replace with:**
```typescript
// ✅ USE ATOMIC ACTIVATION FUNCTION
let wasAutoActivated = false;
const client = supabaseService.getClient();
if (client) {
    const { data: activationResult, error: activationError } = await client.rpc('activate_wallet_atomic', {
        p_wallet_address: activationAddress,
        p_activation_fee_usd: costUsd,
        p_activation_fee_ton: paymentMethod === 'TON' ? costTon : 0,
        p_ton_price: tonPrice,
        p_transaction_hash: txResult.boc
    });

    if (activationError) {
        console.error('❌ Auto-activation failed:', activationError);
        // Log for manual recovery
        await notificationService.logActivity(
            currentTonAddress, 'activation_failed',
            'Auto-activation failed - manual recovery needed',
            {
                activation_fee_usd: costUsd,
                transaction_hash: txResult.boc,
                error: activationError.message
            }
        );
    } else if (activationResult?.success) {
        wasAutoActivated = true;
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
            `Your wallet has been automatically activated with your $${costUsd.toFixed(2)} purchase!`,
            { priority: 'high', data: { auto_activated: true } }
        );
        showSnackbar?.({
            message: 'Wallet Activated!',
            description: 'Your wallet was automatically activated with this purchase',
            type: 'success'
        });
    }
}
```

---

## Fix #2: Add Rate Limiting (HIGH PRIORITY)

**Find this code (around line 210):**
```typescript
const handlePurchase = async () => {
    if (!currentTonAddress) {
        showSnackbar?.({ message: 'Wallet Not Connected', ...
```

**Add BEFORE the wallet check:**
```typescript
const handlePurchase = async () => {
    // ── RATE LIMITING: Prevent rapid-fire purchases ──────────────────────
    const PURCHASE_COOLDOWN = 5000; // 5 seconds between purchases
    const now = Date.now();
    if (now - lastPurchaseAttempt < PURCHASE_COOLDOWN) {
        showSnackbar?.({
            message: 'Please Wait',
            description: 'Please wait a few seconds between purchases',
            type: 'warning'
        });
        return;
    }
    setLastPurchaseAttempt(now);

    if (!currentTonAddress) {
        showSnackbar?.({ message: 'Wallet Not Connected', ...
```

---

## Fix #3: Add Sponsor Loading Check (HIGH PRIORITY)

**Find this code (after rate limiting, before balance check):**
```typescript
    if (finalAmount <= 0 || costTon < MIN_TON) {
        showSnackbar?.({ message: 'Minimum Required', ...
```

**Add BEFORE the minimum check:**
```typescript
    // ── SPONSOR DATA CHECK: Wait for sponsor fetch to complete ────────────
    if (isLoadingSponsor) {
        showSnackbar?.({
            message: 'Loading',
            description: 'Please wait while we load referral data...',
            type: 'info'
        });
        return;
    }

    if (finalAmount <= 0 || costTon < MIN_TON) {
        showSnackbar?.({ message: 'Minimum Required', ...
```

---

## Fix #4: Add Balance Re-check (HIGH PRIORITY)

**Find this code (after validation, before setIsProcessing):**
```typescript
        }
    }

    setIsProcessing(true);
    try {
```

**Add BEFORE setIsProcessing:**
```typescript
        }
    }

    setIsProcessing(true);

    try {
        // ── RE-CHECK BALANCE: Prevent race conditions ─────────────────────
        try {
            await refreshData(); // Refresh wallet data including balance
        } catch (refreshError) {
            console.warn('⚠️ Balance refresh failed, using cached value:', refreshError);
        }

        // Re-validate balance after refresh
        if (paymentMethod === 'TON') {
            if (tonBalance < costTon) {
                showSnackbar?.({
                    message: 'Insufficient TON Balance',
                    description: `You need ${costTon.toFixed(4)} TON but only have ${tonBalance.toFixed(4)} TON`,
                    type: 'error'
                });
                setIsProcessing(false);
                return;
            }
        }

        if (paymentMethod === 'USDT') {
            const availableUsdt = parseFloat(usdtBalance);
            if (availableUsdt < costUsdt) {
                showSnackbar?.({
                    message: 'Insufficient USDT Balance',
                    description: `You need ${costUsdt.toFixed(2)} USDT but only have ${availableUsdt.toFixed(2)} USDT`,
                    type: 'error'
                });
                setIsProcessing(false);
                return;
            }
        }

    try {
```

---

## Fix #5: Update Final Success Message

**Find this code (at the end of handlePurchase, before the catch block):**
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

**Replace with (use the wasAutoActivated from Fix #1):**
```typescript
                showSnackbar?.({ 
                    message: 'Purchase Complete', 
                    description: wasAutoActivated 
                        ? `Successfully purchased ${totalRZC.toLocaleString()} RZC tokens and activated your wallet!`
                        : `Successfully purchased ${totalRZC.toLocaleString()} RZC tokens`, 
                    type: 'success' 
                });
```

---

## Fix #6: Update Purchase Button Disabled State

**Find this code (in the purchase button section):**
```typescript
disabled={isProcessing || finalAmount <= 0 || belowMinimum || 
    (paymentMethod === 'TON' && tonBalance < costTon) || 
    (paymentMethod === 'USDT' && parseFloat(usdtBalance) < costUsdt)}
```

**Replace with:**
```typescript
disabled={isProcessing || finalAmount <= 0 || belowMinimum || isLoadingSponsor || 
    (paymentMethod === 'TON' && tonBalance < costTon) || 
    (paymentMethod === 'USDT' && parseFloat(usdtBalance) < costUsdt)}
```

---

## Fix #7: Add Loading UI (Optional but Recommended)

**Find the payment method selector section, add after it:**
```typescript
{/* Loading State for Sponsor Data */}
{isLoadingSponsor && (
    <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-3">
        <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        <span className="text-xs font-heading font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
            Loading referral data...
        </span>
    </div>
)}
```

---

## ✅ Verification Checklist

After applying all fixes:

1. **Compile Check**
   ```bash
   npm run build
   # Should compile without errors
   ```

2. **Test Atomic Activation**
   - Make a $18+ purchase
   - Check database: `SELECT * FROM wallet_activations WHERE wallet_address = 'YOUR_ADDRESS';`
   - Should see activation record

3. **Test Rate Limiting**
   - Click purchase button rapidly
   - Should see "Please Wait" message

4. **Test Sponsor Loading**
   - Refresh page and immediately try to purchase
   - Should see "Loading" message

5. **Test Balance Re-check**
   - Start purchase with sufficient balance
   - Send TON to another wallet in another tab
   - Complete purchase
   - Should show insufficient balance error

---

## 🚀 Deployment Steps

1. **Apply all fixes above**
2. **Test locally** (30 minutes)
3. **Commit changes**
   ```bash
   git add components/StoreUI.tsx
   git commit -m "fix(store): integrate atomic activation and add critical safety checks"
   ```
4. **Deploy to staging**
5. **Test on staging** (30 minutes)
6. **Deploy to production** (gradual rollout recommended)
7. **Monitor for 24 hours**

---

## 📊 Success Metrics

Monitor these after deployment:

- **Purchase Success Rate** - Should be >95%
- **Auto-Activation Success Rate** - Should be >99%
- **Rate Limit Triggers** - Should be <0.1%
- **Manual Recovery Requests** - Should be <1/week

---

## 🆘 If Something Goes Wrong

### Rollback Command
```bash
git revert HEAD
git push origin main
```

### Manual Activation Recovery
```sql
SELECT manual_activation_recovery(
    'WALLET_ADDRESS',
    'TRANSACTION_HASH',
    'Auto-activation failed - manual recovery'
);
```

### Check Logs
```sql
-- Check failed activations
SELECT * FROM wallet_activity_log
WHERE event_type = 'activation_failed'
ORDER BY created_at DESC
LIMIT 10;
```

---

**Total Time to Apply:** ~15-20 minutes  
**Testing Time:** ~30 minutes  
**Total:** ~1 hour to production-ready

Good luck! 🚀
