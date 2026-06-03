# StoreUI Multisend Debug Patch

## Add Debug Logging to Track TON Commission Flow

Add these console logs to StoreUI.tsx to diagnose why TON might not be sent to referrers:

### 1. After Sponsor Wallet Fetch (Line ~165)

```typescript
} finally {
    setIsLoadingSponsor(false);
}
console.log('[StoreUI] Sponsor wallet lookup complete:', {
    currentTonAddress,
    sponsorWallet: sponsorWallet || 'NONE',
    isLoadingSponsor
});
```

### 2. Before Payment Execution (Line ~340)

```typescript
if (paymentMethod === 'TON') {
    let paymentResult;

    // ── Multi-send: split 10% to sponsor on-chain if referrer exists ──
    const tonCommissionAmount = sponsorWallet
        ? parseFloat((costTon * 0.10).toFixed(6))
        : 0;
    const platformAmountTON = sponsorWallet
        ? parseFloat((costTon - tonCommissionAmount).toFixed(6))
        : costTon;

    console.log('[StoreUI] TON Payment Details:', {
        totalCost: costTon,
        hasSponsor: !!sponsorWallet,
        sponsorWallet: sponsorWallet || 'NONE',
        platformAmount: platformAmountTON,
        commissionAmount: tonCommissionAmount,
        willUseMultisend: !!(sponsorWallet && tonCommissionAmount > 0)
    });

    if (sponsorWallet && tonCommissionAmount > 0) {
        const msgs = [
            { address: RHIZACORE_TREASURY_ADDRESS, amount: platformAmountTON.toFixed(6), comment: 'RhizaCore RZC Purchase' },
            { address: sponsorWallet, amount: tonCommissionAmount.toFixed(6), comment: 'RhizaCore 10% Referral Commission' },
        ];
        
        console.log('[StoreUI] Executing multisend with messages:', msgs);
        
        paymentResult = useWdk
            ? await tetherWdkService.sendTonMultiTransaction(msgs)
            : await tonWalletService.sendMultiTransaction(msgs);
            
        console.log('[StoreUI] Multisend result:', paymentResult);
    } else {
        console.log('[StoreUI] Using single transaction (no referrer or zero commission)');
        paymentResult = useWdk
            ? await tetherWdkService.sendTonTransaction(RHIZACORE_TREASURY_ADDRESS, costTon.toFixed(4), 'RhizaCore RZC Purchase')
            : await tonWalletService.sendTransaction(RHIZACORE_TREASURY_ADDRESS, costTon.toFixed(4), 'RhizaCore RZC Purchase');
    }
```

### 3. After Transaction Success (Line ~390)

```typescript
if (txResult) {
    console.log('[StoreUI] Transaction confirmed:', {
        txHash: txResult.boc,
        hadSponsor: !!sponsorWallet,
        sponsorWallet: sponsorWallet || 'NONE'
    });
    
    await notificationService.logActivity(
        currentTonAddress, 'transaction_sent',
        // ... rest of code
```

## Alternative: Add Visual Indicator in UI

Show users whether their purchase will benefit their referrer:

```typescript
{/* Add before the CTA button */}
{sponsorWallet && finalAmount > 0 && paymentMethod === 'TON' && (
    <div className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
        <Gift size={12} className="text-emerald-600 dark:text-emerald-400" />
        <p className="text-xs font-heading font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-widest">
            10% ({(costTon * 0.10).toFixed(4)} TON) will be sent directly to your sponsor
        </p>
    </div>
)}

{!sponsorWallet && finalAmount > 0 && (
    <div className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg">
        <Info size={12} className="text-gray-400 dark:text-zinc-500" />
        <p className="text-xs font-heading font-black text-gray-500 dark:text-zinc-400 uppercase tracking-widest">
            No referrer - 100% goes to platform
        </p>
    </div>
)}
```

## Testing Steps

1. **Open browser console** (F12)
2. **Navigate to Store** and enter purchase amount
3. **Check console logs** for:
   - `[StoreUI] Sponsor wallet lookup complete:` - Should show referrer's wallet or "NONE"
   - `[StoreUI] TON Payment Details:` - Should show split calculation
   - `[StoreUI] Executing multisend with messages:` - Should show 2 messages if referrer exists
   - `[StoreUI] Multisend result:` - Should show `success: true` and `txHash`

4. **Check transaction on TonViewer:**
   - Copy the `txHash` from console
   - Visit: `https://tonviewer.com/transaction/{txHash}`
   - Look for "Messages" section - should show 2 outgoing messages if multisend worked

## Expected Console Output

### With Referrer:
```
[StoreUI] Sponsor wallet lookup complete: {
  currentTonAddress: "UQAbc...",
  sponsorWallet: "UQDef...",
  isLoadingSponsor: false
}

[StoreUI] TON Payment Details: {
  totalCost: 0.5,
  hasSponsor: true,
  sponsorWallet: "UQDef...",
  platformAmount: 0.45,
  commissionAmount: 0.05,
  willUseMultisend: true
}

[StoreUI] Executing multisend with messages: [
  { address: "UQAbc...", amount: "0.450000", comment: "RhizaCore RZC Purchase" },
  { address: "UQDef...", amount: "0.050000", comment: "RhizaCore 10% Referral Commission" }
]

[StoreUI] Multisend result: {
  success: true,
  txHash: "abc123..."
}
```

### Without Referrer:
```
[StoreUI] Sponsor wallet lookup complete: {
  currentTonAddress: "UQAbc...",
  sponsorWallet: "NONE",
  isLoadingSponsor: false
}

[StoreUI] TON Payment Details: {
  totalCost: 0.5,
  hasSponsor: false,
  sponsorWallet: "NONE",
  platformAmount: 0.5,
  commissionAmount: 0,
  willUseMultisend: false
}

[StoreUI] Using single transaction (no referrer or zero commission)
```

## Quick Fix: Precision Issue

Change line 351 to use consistent 6 decimals:

```typescript
const msgs = [
    { address: RHIZACORE_TREASURY_ADDRESS, amount: platformAmountTON.toFixed(6), comment: 'RhizaCore RZC Purchase' },
    { address: sponsorWallet, amount: tonCommissionAmount.toFixed(6), comment: 'RhizaCore 10% Referral Commission' },
];
```

This ensures both amounts use the same precision and won't cause rounding errors.
