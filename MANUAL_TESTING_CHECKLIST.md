# GlobalPurchaseModal Manual Testing Checklist

## 🎯 Pre-Testing Setup

### Environment Setup
- [ ] **Test Environment:** Set up both mainnet and testnet testing
- [ ] **Test Wallets:** Prepare wallets with different balance levels:
  - Wallet A: 0.0 TON (zero balance)
  - Wallet B: 0.5 TON (insufficient balance)
  - Wallet C: 2.0 TON (sufficient balance)
  - Wallet D: Exact required amount (e.g., 1.2 TON)
- [ ] **Referral Setup:** Create test accounts with and without referrers
- [ ] **Network Conditions:** Test on different network speeds

---

## 🧪 Critical Test Scenarios

### ✅ **Test 1: Zero Balance Protection**
**Objective:** Ensure users with no TON cannot attempt activation

**Steps:**
1. Connect wallet with 0.0 TON balance
2. Open any package purchase modal
3. Verify UI shows insufficient balance warning
4. Verify "Confirm Payment" button is disabled
5. Verify "Deposit TON To Continue" button appears
6. Click deposit button → should navigate to `/wallet/receive`

**Expected Results:**
- ❌ Purchase button disabled
- ⚠️ Clear error message: "Insufficient balance. You need X.XXXX TON but only have 0.0000 TON"
- 🔗 Deposit button navigates to receive page
- 🚫 No payment attempt possible

---

### ✅ **Test 2: Insufficient Balance Handling**
**Objective:** Ensure users with some TON but not enough cannot activate

**Steps:**
1. Connect wallet with 0.5 TON balance
2. Try to purchase $18 activation package (≈1.2 TON)
3. Verify exact shortfall calculation
4. Verify UI shows red balance indicators
5. Test deposit flow integration

**Expected Results:**
- ❌ Purchase blocked with exact shortfall: "Need 0.7000 more TON"
- 🔴 Red balance indicators
- 🔗 Deposit button available
- 📊 Accurate balance display

---

### ✅ **Test 3: Successful Activation Flow**
**Objective:** Complete end-to-end activation with sufficient balance

**Steps:**
1. Connect wallet with 2.0 TON balance
2. Open activation package modal
3. Verify all calculations are correct
4. Click "Confirm Payment"
5. Approve transaction in wallet
6. Wait for completion
7. Verify wallet activation
8. Verify RZC token award
9. Verify success message and page reload

**Expected Results:**
- ✅ Payment processes successfully
- 🎉 Wallet gets activated
- 🪙 RZC tokens awarded correctly
- 📧 Success notification shown
- 🔄 Page reloads to refresh activation status

---

### ✅ **Test 4: Payment Rejection Handling**
**Objective:** Ensure graceful handling when user rejects payment

**Steps:**
1. Connect wallet with sufficient balance
2. Start activation process
3. Reject transaction in wallet app
4. Verify error handling
5. Verify no activation occurs
6. Verify retry capability

**Expected Results:**
- ⚠️ Clear error message: "Transaction Cancelled"
- 🚫 No wallet activation
- 📄 Invoice marked as "failed"
- 🔄 User can retry activation
- 💾 No corrupted state

---

### ✅ **Test 5: Manual Payment QR Flow**
**Objective:** Test manual payment with QR code

**Steps:**
1. Open purchase modal
2. Switch to "Manual / QR" mode
3. Verify QR code generation
4. Verify payment address display
5. Test address copying
6. Test "I've Sent the Payment" flow
7. Verify polling detection

**Expected Results:**
- 📱 Valid QR code generated
- 📋 Correct payment address shown
- 📄 Exact TON amount displayed
- 📋 Copy functionality works
- 🔍 Payment detection polling starts
- ⏱️ Timeout handling works (10 minutes)

---

### ✅ **Test 6: Modal Close During Payment**
**Objective:** Ensure no lost payments when modal closes

**Steps:**
1. Start payment process
2. Close modal immediately after clicking "Confirm Payment"
3. Verify invoice modal appears
4. Verify payment state preservation
5. Test payment completion tracking

**Expected Results:**
- 📄 PaymentInvoiceModal appears automatically
- 💾 Payment state preserved
- 🔍 Can track payment progress
- ✅ Activation completes if payment succeeds
- 🔗 Can resume or retry as needed

---

### ✅ **Test 7: Network Error Handling**
**Objective:** Test behavior during network issues

**Steps:**
1. Start activation process
2. Disconnect internet during payment
3. Verify error handling
4. Reconnect internet
5. Verify recovery capability

**Expected Results:**
- ⚠️ Network error message shown
- 💾 State preserved during disconnection
- 🔄 Recovery possible when reconnected
- 📄 Invoice system maintains consistency

---

### ✅ **Test 8: Invalid TON Price Handling**
**Objective:** Test fallback when price oracle fails

**Steps:**
1. Simulate invalid TON price (null, 0, NaN)
2. Open purchase modal
3. Verify fallback price usage
4. Verify warning message
5. Complete activation with fallback

**Expected Results:**
- ⚠️ Fallback price warning: "Using fallback TON price of $2.45"
- 💰 Calculations use $2.45 fallback
- ✅ Activation still works correctly
- 📊 Approximate calculation warning shown

---

### ✅ **Test 9: Referral Commission Flow**
**Objective:** Test referral system integration

**Steps:**
1. Set up user with referrer
2. Complete activation
3. Verify commission calculation (10%)
4. Verify multi-transaction execution
5. Verify referrer notification

**Expected Results:**
- 👥 Referrer detected and displayed
- 💰 10% commission calculated correctly
- 📤 Multi-transaction sent (platform + commission)
- 📧 Referrer receives commission notification
- 📊 Commission recorded in database

---

### ✅ **Test 10: Invoice System Integration**
**Objective:** Verify invoice creation and tracking

**Steps:**
1. Open purchase modal
2. Verify invoice creation
3. Check invoice number format
4. Verify localStorage persistence
5. Test invoice status updates
6. Verify invoice retrieval

**Expected Results:**
- 📄 Invoice created with format: INV-YYYYMMDD-XXXX
- 💾 Invoice stored in database and localStorage
- 🔄 Status updates correctly (pending → processing → completed)
- 🔍 Invoice retrievable by number
- 📊 All payment details recorded

---

## 🚨 Edge Case Testing

### ✅ **Edge Case 1: Rapid Clicking**
**Test:** Click purchase button rapidly multiple times
**Expected:** Only one payment attempt, no duplicate charges

### ✅ **Edge Case 2: Browser Refresh During Payment**
**Test:** Refresh page while payment is processing
**Expected:** State recovery, payment tracking continues

### ✅ **Edge Case 3: Multiple Modal Opens**
**Test:** Open multiple purchase modals simultaneously
**Expected:** Proper state isolation, no conflicts

### ✅ **Edge Case 4: Wallet Disconnection**
**Test:** Disconnect wallet during activation process
**Expected:** Graceful error handling, clear user guidance

### ✅ **Edge Case 5: Very Small Amounts**
**Test:** Test with minimum TON amounts (0.01 TON)
**Expected:** Accurate calculations, proper validation

---

## 📊 Performance Testing

### ✅ **Load Testing**
- [ ] Test with slow network connections
- [ ] Test with high latency
- [ ] Test modal opening/closing speed
- [ ] Test QR code generation speed

### ✅ **Memory Testing**
- [ ] Check for memory leaks on repeated use
- [ ] Verify cleanup on modal close
- [ ] Test with multiple sessions

---

## 🔍 User Experience Validation

### ✅ **Clarity Testing**
- [ ] All error messages are clear and actionable
- [ ] Users understand next steps in all scenarios
- [ ] Loading states provide appropriate feedback
- [ ] Success messages are celebratory and informative

### ✅ **Accessibility Testing**
- [ ] Modal is keyboard navigable
- [ ] Screen reader compatibility
- [ ] Color contrast sufficient
- [ ] Focus management works correctly

---

## 📋 Final Validation Checklist

Before marking GlobalPurchaseModal as production-ready:

### Core Functionality
- [ ] ✅ Balance validation prevents zero-balance purchases
- [ ] ✅ Payment calculations are accurate for all package types
- [ ] ✅ Auto payment flow works end-to-end
- [ ] ✅ Manual payment QR flow works end-to-end
- [ ] ✅ Error handling is comprehensive and user-friendly

### State Management
- [ ] ✅ Modal state preserved during interruptions
- [ ] ✅ Invoice system tracks all payment attempts
- [ ] ✅ No lost payments or corrupted states
- [ ] ✅ Proper cleanup on modal close

### Integration Points
- [ ] ✅ Wallet service integration robust
- [ ] ✅ Database operations reliable
- [ ] ✅ Referral system working correctly
- [ ] ✅ Navigation flows functional

### User Experience
- [ ] ✅ Clear guidance in all scenarios
- [ ] ✅ Professional, trustworthy interface
- [ ] ✅ Fast, responsive interactions
- [ ] ✅ Accessible to all users

### Error Recovery
- [ ] ✅ Network errors handled gracefully
- [ ] ✅ Payment failures don't corrupt state
- [ ] ✅ Users can always recover or retry
- [ ] ✅ Support team can assist with any issues

---

## 🎯 Success Criteria

**The GlobalPurchaseModal is ready for production when:**

1. **🛡️ Security:** No user can lose money or get stuck in broken states
2. **🎯 Reliability:** >99.5% activation success rate in testing
3. **👤 UX:** Users understand what to do in every scenario
4. **🔧 Recovery:** All error conditions have clear resolution paths
5. **📊 Tracking:** All payments and attempts are properly logged
6. **🚀 Performance:** Modal loads and responds quickly
7. **♿ Accessibility:** Usable by all users regardless of abilities

**When all checkboxes are ✅, the GlobalPurchaseModal provides a bulletproof activation experience.**