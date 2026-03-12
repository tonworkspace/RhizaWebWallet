# Transfer Testing Guide

## Quick Test: TON Transfers

### Test 1: Basic TON Transfer ✅
1. Navigate to Assets page
2. Click "Send" button on TON balance
3. Enter recipient address (testnet): `EQD...` or `UQ...`
4. Enter amount: `0.1` TON
5. Click "Review Transaction"
6. Verify summary shows:
   - Amount: 0.1 TON
   - Fee: ~0.01 TON
   - Total: 0.11 TON
   - Remaining balance calculated
7. Click "Confirm & Disperse"
8. Wait for confirmation
9. Verify success message
10. Check balance updated

**Expected Result**: Transaction succeeds, balance updates, transaction appears in history

### Test 2: Insufficient Balance ❌
1. Try to send more TON than you have
2. Enter amount greater than balance
3. System should show red warning
4. "Review Transaction" button should be disabled

**Expected Result**: Cannot proceed with transaction

### Test 3: Invalid Address ❌
1. Enter invalid address: `invalid123`
2. Try to proceed
3. System should prevent submission

**Expected Result**: Validation prevents invalid address

### Test 4: Send Max Button ✅
1. Click "Send Max" button
2. Amount should auto-fill with (balance - 0.05 TON)
3. Leaves buffer for gas fees

**Expected Result**: Maximum sendable amount calculated correctly

### Test 5: Send All Button ✅
1. Enter valid recipient address
2. Click "Send All" button
3. Automatically calculates and sends entire balance minus gas
4. No need to enter amount manually

**Expected Result**: Entire balance sent (minus gas reserve)

### Test 6: With Comment/Memo ✅
1. Enter recipient and amount
2. Add comment: "Test payment"
3. Complete transaction
4. Verify comment included in transaction

**Expected Result**: Comment attached to transaction

### Test 7: Large Transaction Warning ⚠️
1. Try to send > 50% of balance
2. Yellow warning should appear
3. Warns to double-check address

**Expected Result**: Warning displayed but transaction allowed

## Quick Test: Jetton Transfers (Currently Disabled)

### Test 1: Jetton Send Button 🔜
1. Navigate to Assets page
2. Hover over any jetton (USDT, STK, etc.)
3. Click "Send" button
4. Toast message: "Jetton transfers coming soon!"

**Expected Result**: Info toast, no navigation

### Test 2: Direct Jetton Transfer Attempt 🔜
1. Manually navigate to `/wallet/transfer` with jetton state
2. Try to complete transfer
3. Error message: "Jetton transfers require TonConnect integration"

**Expected Result**: Clear error message, cannot proceed

## Browser Console Tests

### Check Wallet Service
```javascript
// Open browser console (F12)

// Check if wallet is initialized
console.log('Wallet initialized:', tonWalletService.isInitialized());

// Check current network
console.log('Network:', tonWalletService.getCurrentNetwork());

// Check wallet address
console.log('Address:', tonWalletService.getWalletAddress());
```

### Check Balance
```javascript
// Get current balance
tonWalletService.getBalance().then(result => {
  console.log('Balance:', result);
});
```

### Validate Address
```javascript
// Test address validation
import { isValidAddress } from './utility/address';

console.log('Valid:', isValidAddress('EQD...'));  // Should be true
console.log('Invalid:', isValidAddress('invalid'));  // Should be false
```

## Network Testing

### Testnet Testing (Default)
- Use testnet faucet to get test TON
- Test all transfer scenarios
- Verify on testnet explorer

### Mainnet Testing (When Ready)
- Switch to mainnet in settings
- Use small amounts first
- Verify on mainnet explorer
- Test with real TON

## Error Scenarios to Test

### 1. Network Issues
- Disable internet
- Try to send transaction
- Should show network error

### 2. Wallet Not Initialized
- Logout
- Try to access transfer page
- Should redirect to login

### 3. Concurrent Transactions
- Send transaction
- Immediately try to send another
- Should handle gracefully

### 4. Transaction Timeout
- Send transaction
- Wait for timeout (30 seconds)
- Should show pending status

## Performance Tests

### 1. Balance Refresh Speed
- Send transaction
- Measure time until balance updates
- Should be < 5 seconds

### 2. Transaction History Sync
- Send multiple transactions
- Check if all appear in history
- Should sync within 30 seconds

### 3. UI Responsiveness
- Enter amounts rapidly
- Switch between screens
- Should remain responsive

## Security Tests

### 1. Address Validation
- Try various invalid formats
- System should reject all invalid addresses

### 2. Amount Validation
- Try negative amounts
- Try zero amount
- Try amounts with too many decimals
- All should be rejected

### 3. Balance Checks
- Try to send more than balance
- Try to send without gas reserve
- Should prevent both

## Mobile Testing

### 1. Responsive Design
- Test on mobile viewport
- All buttons should be accessible
- Text should be readable

### 2. Touch Interactions
- Tap buttons
- Scroll forms
- Should work smoothly

### 3. Keyboard Input
- Enter amounts on mobile keyboard
- Should handle decimal input correctly

## Expected Behavior Summary

| Action | Expected Result | Status |
|--------|----------------|--------|
| Send TON | Transaction succeeds | ✅ Working |
| Send Jetton | "Coming Soon" message | ⏳ Disabled |
| Invalid address | Validation error | ✅ Working |
| Insufficient balance | Warning shown | ✅ Working |
| Send Max | Calculates correctly | ✅ Working |
| Send All | Sends entire balance | ✅ Working |
| With comment | Comment included | ✅ Working |
| Large transaction | Warning shown | ✅ Working |
| Balance refresh | Updates automatically | ✅ Working |
| Transaction history | Syncs to database | ✅ Working |

## Troubleshooting

### Transaction Fails
1. Check network connection
2. Verify sufficient balance
3. Check address format
4. Try smaller amount
5. Check console for errors

### Balance Not Updating
1. Wait 5 seconds
2. Manually refresh page
3. Check network status
4. Verify transaction on explorer

### Send Button Disabled
1. Check all fields filled
2. Verify valid address
3. Check sufficient balance
4. Ensure amount > 0

## Next Steps After Testing

1. ✅ Verify all TON transfer tests pass
2. ⏳ Install TonConnect for jetton support
3. ⏳ Test jetton transfers on testnet
4. ⏳ Enable jetton send buttons
5. ⏳ Full regression testing

---

**Current Status**: TON transfers fully functional and ready for production use
**Jetton Status**: Infrastructure ready, awaiting TonConnect integration
