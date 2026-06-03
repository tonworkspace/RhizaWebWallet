# Invoice System Test Checklist

## Pre-Testing Setup

### ✅ Step 1: Database Migration
- [ ] Run `add_payment_invoices.sql` in Supabase SQL Editor
- [ ] Verify table created: `SELECT * FROM payment_invoices LIMIT 1;`
- [ ] Check indexes: `\d payment_invoices` (or check in Supabase dashboard)
- [ ] Verify RLS policies enabled
- [ ] Test helper function: `SELECT increment_invoice_retry('00000000-0000-0000-0000-000000000000');`

### ✅ Step 2: Code Verification
- [ ] No TypeScript errors in all files
- [ ] Route added to App.tsx: `/wallet/invoices`
- [ ] InvoiceLookup page lazy-loaded
- [ ] All imports correct

### ✅ Step 3: Environment Check
- [ ] Supabase connection working
- [ ] User logged in with wallet
- [ ] TON balance available for testing
- [ ] Network set (mainnet or testnet)

---

## Test Scenarios

### 🧪 Test 1: Invoice Creation on Modal Open

**Steps:**
1. Navigate to `/wallet/sales-package` or trigger purchase modal
2. Select any package
3. Open browser console
4. Click on package to open purchase modal

**Expected Results:**
- [ ] Console shows: `[Invoice] Created INV-YYYYMMDD-XXXX`
- [ ] Invoice visible in browser DevTools → Application → localStorage
- [ ] Key format: `rzc_invoice_{uuid}`
- [ ] Invoice status: `pending`

**Database Check:**
```sql
SELECT * FROM payment_invoices 
WHERE wallet_address = 'YOUR_WALLET_ADDRESS'
ORDER BY created_at DESC LIMIT 1;
```
- [ ] Invoice record exists
- [ ] Status = 'pending'
- [ ] All fields populated correctly

---

### 🧪 Test 2: Auto Payment Flow (Happy Path)

**Steps:**
1. Open purchase modal
2. Ensure sufficient TON balance
3. Click "Confirm Payment"
4. Wait for transaction to complete

**Expected Results:**
- [ ] Invoice status updates to `processing` when payment starts
- [ ] Console shows: `[Purchase] Payment path: ...`
- [ ] Transaction broadcasts successfully
- [ ] Invoice status updates to `completed`
- [ ] TX hash recorded in invoice
- [ ] `paid_at` and `activated_at` timestamps set
- [ ] Success message shown
- [ ] Modal closes automatically

**Database Check:**
```sql
SELECT status, tx_hash, paid_at, activated_at 
FROM payment_invoices 
WHERE invoice_number = 'INV-YYYYMMDD-XXXX';
```
- [ ] Status = 'completed'
- [ ] TX hash present
- [ ] Timestamps populated

---

### 🧪 Test 3: Modal Close During Auto Payment

**Steps:**
1. Open purchase modal
2. Click "Confirm Payment"
3. **Immediately close modal** (click X button)

**Expected Results:**
- [ ] Invoice modal appears automatically
- [ ] Shows "Payment Processing" status
- [ ] Displays transaction hash (if available)
- [ ] Shows payment address
- [ ] Shows amount details
- [ ] Copy buttons work
- [ ] "View on TONViewer" link present (if TX hash available)

**User Actions:**
- [ ] Can close invoice modal
- [ ] Can navigate to `/wallet/invoices` to check status
- [ ] Invoice persists across page refreshes

---

### 🧪 Test 4: Manual/QR Payment Flow

**Steps:**
1. Open purchase modal
2. Switch to "Manual / QR" mode
3. Note the payment address and amount
4. Send payment from external wallet (or simulate)
5. Click "I've Sent the Payment"

**Expected Results:**
- [ ] Invoice status updates to `processing`
- [ ] Polling starts (console shows polling activity)
- [ ] QR code displays correctly
- [ ] Payment address copyable
- [ ] Countdown timer shows remaining time
- [ ] Payment detected within 10 minutes (if actually sent)
- [ ] Invoice updates to `completed` when detected

---

### 🧪 Test 5: Manual Payment Interrupted (Resume Feature)

**Steps:**
1. Open purchase modal
2. Switch to "Manual / QR" mode
3. Click "I've Sent the Payment" (polling starts)
4. **Close modal while polling**

**Expected Results:**
- [ ] Invoice modal appears
- [ ] Shows "Payment Processing" status
- [ ] **"Resume Payment" button visible**
- [ ] Payment address still shown
- [ ] Amount details preserved

**Resume Test:**
- [ ] Click "Resume Payment"
- [ ] Invoice modal closes
- [ ] Polling resumes automatically
- [ ] Payment detection continues

---

### 🧪 Test 6: Payment Failure Handling

**Steps:**
1. Open purchase modal
2. Disconnect wallet or cause error (e.g., insufficient gas)
3. Try to confirm payment

**Expected Results:**
- [ ] Error message displayed in modal
- [ ] Invoice status updates to `failed`
- [ ] Error message stored in invoice
- [ ] Invoice modal shows error details
- [ ] **"Try Again" button visible**

**Retry Test:**
- [ ] Click "Try Again"
- [ ] Page reloads (or modal reopens)
- [ ] Can attempt payment again
- [ ] New invoice created or existing updated

**Database Check:**
```sql
SELECT status, error_message, retry_count 
FROM payment_invoices 
WHERE invoice_number = 'INV-YYYYMMDD-XXXX';
```
- [ ] Status = 'failed'
- [ ] Error message present
- [ ] Retry count incremented

---

### 🧪 Test 7: Invoice Lookup Page

**Steps:**
1. Complete at least one payment (any status)
2. Navigate to `/wallet/invoices`

**Expected Results:**
- [ ] Page loads without errors
- [ ] "My Recent Invoices" section visible
- [ ] Invoice list shows recent invoices
- [ ] Each invoice shows:
  - [ ] Invoice number
  - [ ] Package name
  - [ ] Amount in TON
  - [ ] Status with correct color
  - [ ] Creation date

**Search Test:**
- [ ] Enter invoice number in search box
- [ ] Click "Search"
- [ ] Invoice details modal appears
- [ ] All details correct

**Click Test:**
- [ ] Click on any invoice in list
- [ ] Invoice modal opens
- [ ] Shows complete details

---

### 🧪 Test 8: Invoice Modal Details

**Steps:**
1. Open any invoice (from lookup page or after closing modal)

**Expected Results:**
- [ ] Invoice number displayed prominently
- [ ] Status icon matches status (check, spinner, error, clock)
- [ ] Status label correct
- [ ] Status color correct
- [ ] Package name shown
- [ ] Amount breakdown:
  - [ ] Total USD
  - [ ] Total TON
  - [ ] TON price
  - [ ] RZC reward
  - [ ] Referral commission (if applicable)
- [ ] Payment address shown and copyable
- [ ] TX hash shown and copyable (if available)
- [ ] TONViewer link works (if TX available)
- [ ] Timestamps shown (created, paid)
- [ ] Error message shown (if failed)

**Copy Functionality:**
- [ ] Click copy button for payment address
- [ ] Icon changes to checkmark
- [ ] Address copied to clipboard
- [ ] Click copy button for TX hash
- [ ] Hash copied to clipboard

---

### 🧪 Test 9: localStorage Fallback

**Steps:**
1. Create an invoice
2. Open DevTools → Application → localStorage
3. Find `rzc_invoice_{uuid}` key
4. Disconnect internet or disable Supabase
5. Try to fetch invoice

**Expected Results:**
- [ ] Invoice loads from localStorage
- [ ] All data intact
- [ ] No errors in console
- [ ] UI shows invoice correctly

---

### 🧪 Test 10: Multiple Invoices

**Steps:**
1. Create multiple invoices (different packages/attempts)
2. Navigate to `/wallet/invoices`

**Expected Results:**
- [ ] All invoices listed
- [ ] Sorted by creation date (newest first)
- [ ] Each has unique invoice number
- [ ] Statuses displayed correctly
- [ ] Can click and view each one

---

### 🧪 Test 11: Expired Invoice

**Steps:**
1. Create invoice
2. Manually update expiration in database:
```sql
UPDATE payment_invoices 
SET expires_at = NOW() - INTERVAL '1 hour'
WHERE invoice_number = 'INV-YYYYMMDD-XXXX';
```
3. View invoice

**Expected Results:**
- [ ] Status can be updated to `expired`
- [ ] UI handles expired status
- [ ] Appropriate message shown

---

### 🧪 Test 12: Referral Commission Tracking

**Steps:**
1. Use account with referrer
2. Create invoice
3. Check invoice details

**Expected Results:**
- [ ] `referrer_wallet` field populated
- [ ] `commission_ton` calculated (10%)
- [ ] `platform_ton` calculated (90%)
- [ ] Invoice modal shows commission amount
- [ ] Sponsor info displayed in purchase modal

---

### 🧪 Test 13: Cross-Browser Testing

**Browsers to Test:**
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if available)
- [ ] Mobile Chrome
- [ ] Mobile Safari

**For Each Browser:**
- [ ] Invoice creation works
- [ ] localStorage persists
- [ ] Modal displays correctly
- [ ] Copy buttons work
- [ ] QR code renders
- [ ] Responsive design works

---

### 🧪 Test 14: Network Switching

**Steps:**
1. Create invoice on mainnet
2. Switch to testnet
3. Try to create another invoice

**Expected Results:**
- [ ] Each network has separate invoices
- [ ] Payment addresses correct for network
- [ ] No cross-network confusion
- [ ] Invoice lookup filters by network

---

### 🧪 Test 15: Concurrent Invoices

**Steps:**
1. Open purchase modal (Invoice A created)
2. Open another tab
3. Open purchase modal again (Invoice B created)
4. Complete payment in first tab

**Expected Results:**
- [ ] Two separate invoices created
- [ ] Each has unique invoice number
- [ ] No conflicts
- [ ] Both tracked independently

---

## Edge Cases

### 🔍 Edge Case 1: Duplicate Invoice Prevention
- [ ] Rapid clicking doesn't create duplicates
- [ ] Same package can have multiple invoices
- [ ] Invoice numbers always unique

### 🔍 Edge Case 2: Browser Refresh During Payment
- [ ] Refresh page during payment
- [ ] Invoice persists
- [ ] Can resume from `/wallet/invoices`

### 🔍 Edge Case 3: localStorage Full
- [ ] Fill localStorage to capacity
- [ ] Invoice creation still works (DB only)
- [ ] No errors thrown

### 🔍 Edge Case 4: Invalid Invoice Number Search
- [ ] Search for non-existent invoice
- [ ] Error message shown
- [ ] No crashes

### 🔍 Edge Case 5: Very Long Error Messages
- [ ] Cause error with long message
- [ ] UI handles gracefully
- [ ] Text truncates or scrolls

---

## Performance Tests

### ⚡ Performance 1: Invoice Creation Speed
- [ ] Invoice created in < 500ms
- [ ] No UI blocking
- [ ] Smooth user experience

### ⚡ Performance 2: Invoice Lookup Speed
- [ ] Page loads in < 1s
- [ ] List renders quickly
- [ ] Search is instant

### ⚡ Performance 3: Large Invoice List
- [ ] Create 50+ invoices
- [ ] List still performs well
- [ ] Pagination needed? (future enhancement)

---

## Security Tests

### 🔒 Security 1: RLS Policies
- [ ] User can only see own invoices
- [ ] Cannot query other users' invoices
- [ ] Service role can access all

### 🔒 Security 2: Invoice Number Guessing
- [ ] Cannot guess other invoice numbers
- [ ] Search only returns own invoices
- [ ] No data leakage

### 🔒 Security 3: SQL Injection
- [ ] Try SQL injection in search
- [ ] No vulnerabilities
- [ ] Parameterized queries used

---

## Integration Tests

### 🔗 Integration 1: Wallet Activation
- [ ] Invoice completion triggers activation
- [ ] RZC tokens awarded
- [ ] Referral commission paid
- [ ] Notifications sent

### 🔗 Integration 2: Transaction Recording
- [ ] TX hash stored correctly
- [ ] Can verify on blockchain
- [ ] TONViewer link works

### 🔗 Integration 3: Support Workflow
- [ ] Support can lookup by invoice number
- [ ] All details visible
- [ ] Can manually complete if needed

---

## Regression Tests

### 🔄 Regression 1: Existing Payment Flow
- [ ] Old payment flow still works
- [ ] No breaking changes
- [ ] Backward compatible

### 🔄 Regression 2: Modal Behavior
- [ ] Modal opens/closes correctly
- [ ] No z-index issues
- [ ] Animations smooth

### 🔄 Regression 3: Wallet Services
- [ ] tonWalletService works
- [ ] tetherWdkService works
- [ ] Multi-transaction works

---

## Documentation Tests

### 📚 Documentation 1: Code Comments
- [ ] Invoice service well-commented
- [ ] Complex logic explained
- [ ] Type definitions clear

### 📚 Documentation 2: User-Facing
- [ ] Invoice modal is self-explanatory
- [ ] Error messages helpful
- [ ] Status labels clear

### 📚 Documentation 3: Support Docs
- [ ] Setup guide accurate
- [ ] Test checklist complete
- [ ] Troubleshooting helpful

---

## Final Verification

### ✅ Production Readiness
- [ ] All tests passed
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Database migration successful
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Documentation complete

### ✅ Rollback Plan
- [ ] Can revert database migration if needed
- [ ] Can disable invoice feature via feature flag
- [ ] Old payment flow still accessible

---

## Test Results Summary

**Date:** _______________
**Tester:** _______________
**Environment:** _______________

**Total Tests:** 15 scenarios + edge cases + performance + security
**Passed:** ___ / ___
**Failed:** ___ / ___
**Blocked:** ___ / ___

**Critical Issues:** _______________
**Minor Issues:** _______________
**Notes:** _______________

---

## Sign-Off

- [ ] All critical tests passed
- [ ] All blockers resolved
- [ ] Ready for production deployment

**Approved by:** _______________
**Date:** _______________
