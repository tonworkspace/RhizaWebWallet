# StoreUI - Quick Fix Guide

## 🚀 How to Complete the Remaining Fixes

### Step 1: Deploy Database Functions (5 minutes)

```bash
# Connect to your Supabase project
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Or use Supabase SQL Editor
```

Then run the SQL file:
```sql
\i add_atomic_wallet_activation.sql
```

Or copy-paste the contents into Supabase SQL Editor and execute.

**Verify it worked:**
```sql
-- Test the function
SELECT activate_wallet_atomic(
    'UQTest123456789',
    18.00,
    0.5,
    36.00,
    'test_tx_hash_001'
);

-- Should return: {"success": true, ...}
```

---

### Step 2: Update StoreUI Component (10 minutes)

Find this section in `components/StoreUI.tsx` (around line 330):

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
```

**Replace with:**

```typescript
// Auto-activate wallet if purchase is $18+ and not yet activated
let wasAutoActivated = false;
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

### Step 3: Fix Balance Re-check (5 minutes)

At the top of the component, change:

```typescript
const { balance: tonBalanceStr, network, rzcPrice: contextRzcPrice } = useWallet();
```

To:

```typescript
const { balance: tonBalanceStr, network, rzcPrice: contextRzcPrice, refreshData } = useWallet();
```

Then in `handlePurchase`, before the transaction, add:

```typescript
// ── RE-CHECK BALANCE: Prevent race conditions ─────────────────────
try {
    await refreshData(); // Refresh wallet data including balance
} catch (refreshError) {
    console.warn('⚠️ Balance refresh failed, using cached value:', refreshError);
}

// Re-parse the fresh balance
const freshTonBalance = parseFloat(tonBalanceStr) || 0;

if (paymentMethod === 'TON') {
    if (freshTonBalance < costTon) {
        showSnackbar?.({
            message: 'Insufficient TON Balance',
            description: `You need ${costTon.toFixed(4)} TON but only have ${freshTonBalance.toFixed(4)} TON`,
            type: 'error'
        });
        setIsProcessing(false);
        return;
    }
}
```

---

### Step 4: Add Error Boundary (3 minutes)

Create `components/StoreErrorBoundary.tsx`:

```typescript
import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const StoreErrorFallback: React.FC<{ error?: Error }> = ({ error }) => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0a0a0a] p-6">
            <div className="max-w-md w-full bg-white dark:bg-black/80 border-2 border-red-500/30 rounded-2xl p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                    <AlertTriangle size={32} className="text-red-500" />
                </div>
                <h2 className="text-xl font-heading font-black text-gray-900 dark:text-white mb-2">
                    Store Temporarily Unavailable
                </h2>
                <p className="text-sm text-gray-600 dark:text-zinc-400 mb-6">
                    We're experiencing technical difficulties. Please try again in a few moments.
                </p>
                {error && (
                    <details className="text-left mb-6">
                        <summary className="text-xs text-gray-500 dark:text-zinc-500 cursor-pointer">
                            Technical Details
                        </summary>
                        <pre className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 p-3 rounded overflow-auto">
                            {error.message}
                        </pre>
                    </details>
                )}
                <button
                    onClick={() => window.location.reload()}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-heading font-black uppercase tracking-wider transition-colors"
                >
                    Reload Page
                </button>
            </div>
        </div>
    );
};
```

Then wrap StoreUI in the parent component:

```typescript
import { ErrorBoundary } from 'react-error-boundary';
import { StoreErrorFallback } from './StoreErrorBoundary';

<ErrorBoundary 
    FallbackComponent={StoreErrorFallback}
    onError={(error, errorInfo) => {
        console.error('StoreUI Error:', error, errorInfo);
        // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
    }}
>
    <StoreUI {...props} />
</ErrorBoundary>
```

---

### Step 5: Add Loading State UI (5 minutes)

In the purchase form section (around line 900), add this after the payment method selector:

```typescript
{/* Loading State for Sponsor Data */}
{isLoadingSponsor && (
    <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        <span className="text-xs font-heading font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
            Loading referral data...
        </span>
    </div>
)}
```

Also disable the purchase button while loading:

```typescript
<button
    onClick={handlePurchase}
    disabled={isProcessing || finalAmount <= 0 || belowMinimum || isLoadingSponsor || 
        (paymentMethod === 'TON' && tonBalance < costTon) || 
        (paymentMethod === 'USDT' && parseFloat(usdtBalance) < costUsdt)}
    className="relative w-full h-14 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed..."
>
```

---

### Step 6: Fix Countdown Timer (2 minutes)

Update the `useCountdown` function:

```typescript
function useCountdown(targetDate: Date) {
    const calc = () => {
        const diff = targetDate.getTime() - Date.now();
        if (diff <= 0) {
            return { days: 0, hours: 0, minutes: 0, seconds: 0, ended: true };
        }
        return {
            days: Math.floor(diff / 86400000),
            hours: Math.floor((diff % 86400000) / 3600000),
            minutes: Math.floor((diff % 3600000) / 60000),
            seconds: Math.floor((diff % 60000) / 1000),
            ended: false
        };
    };
    const [time, setTime] = useState(calc);
    useEffect(() => {
        const id = setInterval(() => setTime(calc()), 1000);
        return () => clearInterval(id);
    }, []);
    return time;
}
```

Then in the UI, show "Sale Ended" message:

```typescript
{countdown.ended ? (
    <div className="flex items-center gap-2">
        <AlertTriangle size={10} className="text-red-400" />
        <span className="text-[10px] font-heading font-black text-red-400 uppercase tracking-widest">
            Seed Round Ended
        </span>
    </div>
) : (
    <div className="flex items-center gap-1.5">
        <Clock size={10} className="text-gray-400 dark:text-zinc-400" />
        <span className="text-[10px] font-heading font-black text-gray-600 dark:text-zinc-300 uppercase tracking-widest">
            <span className="font-numbers">{String(countdown.days).padStart(2, '0')}</span>D{' '}
            {/* ... rest of countdown ... */}
        </span>
    </div>
)}
```

---

## ✅ Testing Checklist

After applying all fixes, test these scenarios:

### Critical Tests
- [ ] Purchase with sufficient balance → Should succeed
- [ ] Purchase with insufficient balance → Should show error
- [ ] Rapid purchase attempts → Should show rate limit message
- [ ] Purchase before sponsor loads → Should show loading message
- [ ] $18+ purchase → Should auto-activate wallet
- [ ] Auto-activation failure → Should log for manual recovery

### Edge Cases
- [ ] Enter very large number (>1 million) → Should cap at 1 million
- [ ] Enter negative number → Should show 0
- [ ] Enter scientific notation (1e10) → Should handle correctly
- [ ] Switch payment method rapidly → Should update correctly
- [ ] Close browser during purchase → Should handle gracefully

### UI Tests
- [ ] Loading spinner shows while fetching sponsor
- [ ] Purchase button disabled while loading
- [ ] Countdown shows "Sale Ended" after end date
- [ ] Error boundary catches and displays errors
- [ ] All error messages are user-friendly

---

## 🚨 Rollback Plan

If something goes wrong after deployment:

### Immediate Rollback
```bash
# Revert to previous version
git revert HEAD
git push origin main

# Or use your deployment platform's rollback feature
```

### Database Rollback
```sql
-- Drop the new functions (if they're causing issues)
DROP FUNCTION IF EXISTS activate_wallet_atomic(TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS manual_activation_recovery(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS check_activation_status(TEXT);

-- The old activateWallet method will still work
```

---

## 📊 Monitoring After Deployment

### Key Metrics to Watch (First 24 Hours)
1. **Purchase Success Rate** - Should be >95%
2. **Auto-Activation Success Rate** - Should be >99%
3. **Error Rate** - Should be <1%
4. **Average Purchase Time** - Should be <30 seconds
5. **Rate Limit Triggers** - Should be <0.1%

### Alert Thresholds
- Purchase success rate drops below 90% → **CRITICAL ALERT**
- Auto-activation success rate drops below 95% → **HIGH ALERT**
- Error rate exceeds 5% → **HIGH ALERT**
- Average purchase time exceeds 60 seconds → **MEDIUM ALERT**

---

## 🎯 Total Time Estimate

- **Step 1 (Database):** 5 minutes
- **Step 2 (Atomic Activation):** 10 minutes
- **Step 3 (Balance Re-check):** 5 minutes
- **Step 4 (Error Boundary):** 3 minutes
- **Step 5 (Loading UI):** 5 minutes
- **Step 6 (Countdown Fix):** 2 minutes
- **Testing:** 30 minutes

**Total:** ~60 minutes to complete all fixes

---

## ✅ Done!

Once all steps are complete:
1. Commit your changes
2. Deploy to staging
3. Run full test suite
4. Deploy to production with monitoring
5. Watch metrics for 24 hours
6. Mark audit as complete

**Questions?** Check `STOREUI_AUDIT_COMPLETE.md` for detailed information.
