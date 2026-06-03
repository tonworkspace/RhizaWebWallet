# Modal Close Behavior Analysis - GlobalPurchaseModal

## Overview
Analysis of what happens when users close the GlobalPurchaseModal during payment process, including cleanup logic, state management, and ongoing transaction handling.

## Modal Close Triggers

### 1. X Button Click
- **Location**: Header close button with X icon
- **Handler**: `onClick={closePurchaseModal}`
- **Action**: Calls `closePurchaseModal()` from PurchaseModalContext

### 2. Context-Based Close
- **Trigger**: `isPurchaseModalOpen` state change to `false`
- **Effect**: Modal unmounts completely (`if (!isPurchaseModalOpen || !pkg) return null`)

## Cleanup Effects When Modal Closes

### 1. Automatic Polling Cleanup
```typescript
useEffect(() => {
  if (!isPurchaseModalOpen) {
    stopPolling();
    setCheckoutMode('auto');
    setPollStatus('idle');
  }
}, [isPurchaseModalOpen]);
```

**What happens:**
- **Polling stops immediately** - Both interval and timeout are cleared
- **Mode resets** to 'auto' (from manual/QR mode)
- **Poll status resets** to 'idle'

### 2. Payment Address Reset
```typescript
useEffect(() => {
  if (!isPurchaseModalOpen) {
    assignedPaymentAddr.current = '';
  }
}, [isPurchaseModalOpen, network]);
```

**What happens:**
- **Payment address clears** - Random assigned address is reset
- **Next modal open** will assign a new random payment address

### 3. State Cleanup via stopPolling()
```typescript
const stopPolling = useCallback(() => {
  if (pollIntervalRef.current) { 
    clearInterval(pollIntervalRef.current); 
    pollIntervalRef.current = null; 
  }
  if (pollTimeoutRef.current) { 
    clearTimeout(pollTimeoutRef.current); 
    pollTimeoutRef.current = null; 
  }
}, []);
```

**What happens:**
- **Interval cleared** - No more 5-second payment checks
- **Timeout cleared** - 10-minute timeout cancelled
- **References nullified** - Prevents memory leaks

## Payment Processing States During Close

### Auto Payment Mode
**If user closes during `processing` state:**

1. **Transaction may continue in background** - The `handlePurchase()` function doesn't get cancelled
2. **Wallet service continues** - TON/WDK service completes the transaction
3. **Post-payment effects still execute** - `handlePostPayment()` runs if transaction succeeds
4. **User loses visibility** - No UI feedback about success/failure
5. **Page reload happens** - `window.location.reload()` still executes on success

### Manual/QR Payment Mode
**If user closes during polling:**

1. **Polling stops immediately** - No more transaction detection
2. **Payment may still be valid** - If user sent TON, it reaches the payment address
3. **No automatic activation** - Wallet won't activate without polling detection
4. **Manual intervention needed** - User must contact support with transaction hash

## Critical Implications

### ✅ What Works Correctly
- **Memory leak prevention** - All intervals/timeouts properly cleared
- **State reset** - Modal returns to clean state on next open
- **Resource cleanup** - No hanging references or listeners

### ⚠️ Potential Issues

#### 1. Auto Payment Background Processing
- **Issue**: Transaction continues after modal close
- **Risk**: User thinks payment failed but it actually succeeds
- **Impact**: Confusion, potential double-payments

#### 2. Manual Payment Interruption
- **Issue**: Polling stops, payment detection fails
- **Risk**: Valid payments go undetected
- **Impact**: User pays but wallet doesn't activate

#### 3. No Cancellation Mechanism
- **Issue**: No way to cancel in-flight transactions
- **Risk**: Irreversible payments even if user changes mind
- **Impact**: Poor UX for accidental payments

## Recommendations

### 1. Add Payment State Warning
```typescript
const handleModalClose = () => {
  if (processing) {
    // Show confirmation dialog
    if (!confirm('Payment is processing. Closing may cause issues. Continue?')) {
      return;
    }
  }
  closePurchaseModal();
};
```

### 2. Background Payment Notification
```typescript
// In handlePostPayment, check if modal is still open
if (!isPurchaseModalOpen) {
  // Show system notification instead of modal success
  notificationService.showSystemNotification('Payment completed successfully!');
}
```

### 3. Resume Polling Feature
```typescript
// Store polling state in localStorage
// Resume on modal reopen if payment was pending
```

## Current Behavior Summary

**When user closes modal during payment:**

1. **UI disappears immediately** - Modal unmounts
2. **Polling stops** - No more payment detection
3. **Auto payments continue** - Background processing persists
4. **State resets** - Clean slate for next modal open
5. **No user feedback** - Success/failure happens silently

**Best practice for users:**
- Don't close modal during "Broadcasting..." state
- Wait for confirmation before closing
- Contact support if payment sent but modal was closed

## Files Analyzed
- `components/GlobalPurchaseModal.tsx` - Complete modal implementation
- Payment cleanup logic and state management
- Auto and manual payment flow handling