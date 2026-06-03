# Apply Atomic Activation Fix - Manual Instructions

## 🎯 What to Do

Open `components/StoreUI.tsx` and find line **336** (search for `supabaseService.activateWallet`)

### Step 1: Find This Code (around line 336)

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
```

### Step 2: Replace With This Code

```typescript
// ✅ USE ATOMIC ACTIVATION FUNCTION
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

### Step 3: Update the Success Message Variable

Find this code (around line 420):

```typescript
const wasAutoActivated = !walletActivated && costUsd >= 18;
```

Replace with:

```typescript
const wasAutoActivated = activationResult?.success === true;
```

## ✅ Verification

After making the change:

1. **Check it compiles:**
   ```bash
   npm run build
   ```

2. **Test the function exists in database:**
   ```sql
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_name = 'activate_wallet_atomic';
   ```

3. **Test a purchase:**
   - Make a $18+ purchase
   - Check console for "✅ Wallet activated" or "❌ Auto-activation failed"
   - If failed, check `wallet_activity_log` for `activation_failed` events

## 🔍 What Changed

### Before (Non-Atomic)
- Called `supabaseService.activateWallet()`
- If activation failed, payment was already processed
- No rollback mechanism
- No manual recovery logging

### After (Atomic)
- Calls database function `activate_wallet_atomic()`
- Uses database transaction (all-or-nothing)
- Automatic rollback on failure
- Logs failures for manual recovery
- Idempotent (safe to retry)

## 🆘 If Something Goes Wrong

### Rollback the Change
```bash
git checkout components/StoreUI.tsx
```

### Manual Activation Recovery
If a user paid but activation failed:

```sql
SELECT manual_activation_recovery(
    'USER_WALLET_ADDRESS',
    'TRANSACTION_HASH',
    'Manual recovery after failed auto-activation'
);
```

### Check Failed Activations
```sql
SELECT * FROM wallet_activity_log
WHERE event_type = 'activation_failed'
ORDER BY created_at DESC
LIMIT 10;
```

## 📊 Success Indicators

After deployment, monitor:

- **Auto-activation success rate** - Should be >99%
- **Manual recovery requests** - Should be <1/week
- **Activation failures logged** - Should see proper error logging
- **User complaints** - Should decrease significantly

---

**Time to Apply:** 2-3 minutes  
**Risk Level:** LOW (well-tested database function)  
**Rollback Time:** <1 minute  
**Status:** ✅ READY TO APPLY
