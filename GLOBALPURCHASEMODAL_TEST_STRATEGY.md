# GlobalPurchaseModal Testing Strategy

## 🎯 Objective
Ensure users never encounter issues when activating their wallet through the GlobalPurchaseModal component.

## 🔍 Critical Test Areas

### 1. Balance Validation & Error Prevention
### 2. Payment Flow Reliability  
### 3. Invoice System Integration
### 4. Modal State Management
### 5. Network & API Error Handling
### 6. User Experience Edge Cases

---

## 📋 Test Scenarios

### 🟢 **Category 1: Balance Validation Tests**

#### Test 1.1: Insufficient Balance Detection
**Scenario:** User has less TON than required for activation
```
Given: User has 0.5 TON, activation costs 1.2 TON
When: User opens purchase modal
Then: Should show "Insufficient balance" error
And: Should display exact shortfall amount
And: Should show "Deposit TON To Continue" button
And: Purchase button should be disabled
```

#### Test 1.2: Zero Balance Handling
**Scenario:** User has no TON balance
```
Given: User has 0.0 TON balance
When: User attempts to activate wallet
Then: Should prevent purchase attempt
And: Should show clear error message
And: Should redirect to deposit page
```

#### Test 1.3: Sufficient Balance Validation
**Scenario:** User has enough TON for activation
```
Given: User has 2.0 TON, activation costs 1.2 TON
When: User opens purchase modal
Then: Should show green balance indicator
And: Purchase button should be enabled
And: Should display correct remaining balance after purchase
```

### 🟡 **Category 2: Payment Flow Tests**

#### Test 2.1: Auto Payment Success Flow
**Scenario:** Successful automatic payment
```
Given: User has sufficient balance
When: User clicks "Confirm Payment"
Then: Should show "Broadcasting..." state
And: Should call tonWalletService.sendTransaction()
And: Should create invoice with "processing" status
And: Should handle successful transaction
And: Should activate wallet
And: Should award RZC tokens
And: Should show success message
And: Should reload page
```

#### Test 2.2: Auto Payment Failure Handling
**Scenario:** Payment transaction fails
```
Given: User has sufficient balance
When: Payment transaction fails (network error, user rejection, etc.)
Then: Should show specific error message
And: Should update invoice status to "failed"
And: Should not activate wallet
And: Should allow retry
And: Should not leave user in broken state
```

#### Test 2.3: Manual Payment QR Flow
**Scenario:** User chooses manual payment with QR code
```
Given: User switches to "Manual / QR" mode
When: Modal displays QR code
Then: Should show correct payment address
And: Should show exact TON amount
And: Should generate valid ton:// link
And: Should allow copying address
And: Should start polling when user confirms payment sent
```

#### Test 2.4: Manual Payment Detection
**Scenario:** Manual payment polling and detection
```
Given: User sent payment manually
When: Polling detects incoming transaction
Then: Should match transaction amount (within 2% tolerance)
And: Should verify transaction is recent (within 15 minutes)
And: Should complete activation process
And: Should stop polling
And: Should show success message
```

### 🔴 **Category 3: Error Handling Tests**

#### Test 3.1: Network Connectivity Issues
**Scenario:** User loses internet connection
```
Given: User is in middle of payment process
When: Network connection is lost
Then: Should show appropriate error message
And: Should preserve invoice state
And: Should allow retry when connection restored
And: Should not lose payment progress
```

#### Test 3.2: API Service Failures
**Scenario:** Backend services are unavailable
```
Given: Supabase or other APIs are down
When: User attempts activation
Then: Should show service unavailable message
And: Should preserve user's payment intent
And: Should provide fallback options
And: Should not charge user without activation
```

#### Test 3.3: Invalid TON Price Handling
**Scenario:** TON price oracle fails
```
Given: TON price is undefined, 0, or invalid
When: User opens purchase modal
Then: Should show fallback price warning ($2.45)
And: Should still allow activation
And: Should calculate costs correctly
And: Should warn user about approximate calculations
```

### 🟠 **Category 4: Modal State Management Tests**

#### Test 4.1: Modal Close During Payment
**Scenario:** User closes modal while payment is processing
```
Given: User clicked "Confirm Payment" and transaction is broadcasting
When: User closes the modal
Then: Should show PaymentInvoiceModal with current status
And: Should preserve payment state
And: Should allow user to track payment progress
And: Should complete activation if payment succeeds
```

#### Test 4.2: Modal Close During Polling
**Scenario:** User closes modal while manual payment is being detected
```
Given: User is in manual payment mode and polling is active
When: User closes the modal
Then: Should show invoice modal
And: Should allow resuming polling
And: Should preserve payment detection state
```

#### Test 4.3: Session Restoration
**Scenario:** User refreshes page during payment
```
Given: User has active payment in progress
When: User refreshes browser or navigates away
Then: Should restore payment state from localStorage
And: Should show appropriate status
And: Should allow continuing payment process
```

### 🔵 **Category 5: Integration Tests**

#### Test 5.1: Wallet Service Integration
**Scenario:** Testing both wallet services (TON and WDK)
```
Given: User has both primary and secondary wallets
When: User attempts activation
Then: Should use correct wallet service
And: Should handle service switching gracefully
And: Should maintain transaction consistency
```

#### Test 5.2: Invoice System Integration
**Scenario:** Invoice creation and tracking
```
Given: User opens purchase modal
When: Invoice is created
Then: Should generate unique invoice number (INV-YYYYMMDD-XXXX)
And: Should store invoice in database
And: Should persist to localStorage as backup
And: Should track status changes
And: Should be retrievable later
```

#### Test 5.3: Referral Commission Integration
**Scenario:** User has a referrer
```
Given: User was referred by another user
When: User activates wallet
Then: Should detect referrer correctly
And: Should calculate 10% commission
And: Should send multi-transaction (platform + commission)
And: Should notify referrer of commission
And: Should record commission in database
```

---

## 🧪 Automated Test Implementation

### Test Setup
```javascript
// Mock dependencies
const mockTonWalletService = {
  isInitialized: jest.fn(),
  sendTransaction: jest.fn(),
  sendMultiTransaction: jest.fn(),
  hasStoredSession: jest.fn(),
  getStoredSession: jest.fn(),
  initializeWallet: jest.fn()
};

const mockSupabaseService = {
  getProfile: jest.fn(),
  activateWallet: jest.fn(),
  awardRZCTokens: jest.fn(),
  getUserByReferralCode: jest.fn(),
  getProfileById: jest.fn()
};

const mockInvoiceService = {
  createInvoice: jest.fn(),
  updateStatus: jest.fn(),
  getInvoice: jest.fn()
};
```

### Critical Test Cases
```javascript
describe('GlobalPurchaseModal - Critical Activation Tests', () => {
  
  test('Should prevent activation with insufficient balance', async () => {
    // Setup: User has 0.5 TON, needs 1.2 TON
    const mockBalance = 0.5;
    const mockPackage = { activationFee: 18, pricePoint: 0 }; // $18 = ~1.2 TON
    
    render(<GlobalPurchaseModal />);
    
    // Should show insufficient balance error
    expect(screen.getByText(/insufficient balance/i)).toBeInTheDocument();
    expect(screen.getByText(/deposit ton to continue/i)).toBeInTheDocument();
    
    // Purchase button should be disabled
    const purchaseButton = screen.getByRole('button', { name: /confirm payment/i });
    expect(purchaseButton).toBeDisabled();
  });

  test('Should handle successful activation flow', async () => {
    // Setup: User has sufficient balance
    mockTonWalletService.sendTransaction.mockResolvedValue({
      success: true,
      txHash: 'test-tx-hash-123'
    });
    
    mockSupabaseService.activateWallet.mockResolvedValue(true);
    mockSupabaseService.awardRZCTokens.mockResolvedValue({
      success: true,
      newBalance: 1000
    });

    render(<GlobalPurchaseModal />);
    
    // Click purchase button
    const purchaseButton = screen.getByRole('button', { name: /confirm payment/i });
    fireEvent.click(purchaseButton);
    
    // Should show processing state
    expect(screen.getByText(/broadcasting/i)).toBeInTheDocument();
    
    // Wait for completion
    await waitFor(() => {
      expect(mockSupabaseService.activateWallet).toHaveBeenCalled();
      expect(mockSupabaseService.awardRZCTokens).toHaveBeenCalled();
    });
    
    // Should show success message
    expect(screen.getByText(/success/i)).toBeInTheDocument();
  });

  test('Should handle payment failure gracefully', async () => {
    // Setup: Payment fails
    mockTonWalletService.sendTransaction.mockResolvedValue({
      success: false,
      error: 'User rejected transaction'
    });

    render(<GlobalPurchaseModal />);
    
    const purchaseButton = screen.getByRole('button', { name: /confirm payment/i });
    fireEvent.click(purchaseButton);
    
    await waitFor(() => {
      expect(screen.getByText(/transaction cancelled/i)).toBeInTheDocument();
    });
    
    // Should not activate wallet
    expect(mockSupabaseService.activateWallet).not.toHaveBeenCalled();
    
    // Should update invoice to failed
    expect(mockInvoiceService.updateStatus).toHaveBeenCalledWith(
      expect.any(String),
      'failed',
      expect.objectContaining({ errorMessage: expect.any(String) })
    );
  });

  test('Should preserve state when modal closes during payment', async () => {
    // Setup: Payment in progress
    const { rerender } = render(<GlobalPurchaseModal />);
    
    // Start payment
    const purchaseButton = screen.getByRole('button', { name: /confirm payment/i });
    fireEvent.click(purchaseButton);
    
    // Close modal while processing
    rerender(<GlobalPurchaseModal />); // Simulate modal close
    
    // Should show invoice modal
    expect(screen.getByText(/payment invoice/i)).toBeInTheDocument();
  });

  test('Should handle manual payment detection', async () => {
    // Setup: Manual payment mode
    render(<GlobalPurchaseModal />);
    
    // Switch to manual mode
    const manualButton = screen.getByRole('button', { name: /manual.*qr/i });
    fireEvent.click(manualButton);
    
    // Should show QR code and payment details
    expect(screen.getByText(/scan with any ton wallet/i)).toBeInTheDocument();
    expect(screen.getByText(/send exactly/i)).toBeInTheDocument();
    
    // Start polling
    const sentButton = screen.getByRole('button', { name: /i've sent the payment/i });
    fireEvent.click(sentButton);
    
    // Should show polling state
    expect(screen.getByText(/watching for your payment/i)).toBeInTheDocument();
  });
});
```

---

## 🔧 Manual Testing Checklist

### Pre-Testing Setup
- [ ] Test on both mainnet and testnet
- [ ] Test with different wallet states (activated/unactivated)
- [ ] Test with different balance levels
- [ ] Test with and without referrers
- [ ] Test with different packages (activation-only, paid packages)

### Balance Validation Tests
- [ ] **Zero Balance Test**
  - Set wallet balance to 0.0 TON
  - Open purchase modal
  - Verify error message and disabled state
  - Verify "Deposit TON" button works

- [ ] **Insufficient Balance Test**
  - Set balance below required amount
  - Verify exact shortfall calculation
  - Verify UI shows red indicators
  - Verify purchase blocked

- [ ] **Sufficient Balance Test**
  - Set balance above required amount
  - Verify green indicators
  - Verify purchase enabled
  - Verify correct calculations

### Payment Flow Tests
- [ ] **Auto Payment Success**
  - Complete full activation flow
  - Verify wallet gets activated
  - Verify RZC tokens awarded
  - Verify referral commission (if applicable)
  - Verify success message and page reload

- [ ] **Auto Payment Failure**
  - Reject transaction in wallet
  - Verify error handling
  - Verify no activation occurs
  - Verify invoice marked as failed
  - Verify retry capability

- [ ] **Manual Payment Flow**
  - Switch to manual mode
  - Verify QR code generation
  - Verify payment address display
  - Verify copy functionality
  - Test polling detection
  - Verify timeout handling

### Error Handling Tests
- [ ] **Network Disconnection**
  - Disconnect internet during payment
  - Verify error messages
  - Reconnect and verify recovery

- [ ] **API Failures**
  - Test with backend services down
  - Verify graceful degradation
  - Verify user guidance

- [ ] **Invalid Data Handling**
  - Test with invalid TON prices
  - Test with malformed package data
  - Verify fallback behaviors

### Modal State Tests
- [ ] **Close During Payment**
  - Start payment process
  - Close modal immediately
  - Verify invoice modal appears
  - Verify state preservation

- [ ] **Browser Refresh**
  - Start payment process
  - Refresh browser
  - Verify state recovery
  - Verify payment continuation

### Integration Tests
- [ ] **Wallet Service Switching**
  - Test with primary wallet only
  - Test with secondary wallet only
  - Test with both wallets available
  - Verify correct service selection

- [ ] **Invoice System**
  - Verify invoice creation
  - Verify status updates
  - Verify localStorage persistence
  - Verify database storage

- [ ] **Referral System**
  - Test with referrer present
  - Verify commission calculation
  - Verify multi-transaction
  - Verify notifications

---

## 🚨 Critical Failure Points to Monitor

### 1. **Balance Check Bypass**
**Risk:** User somehow bypasses balance validation
**Test:** Try to manipulate client-side state
**Mitigation:** Server-side validation required

### 2. **Double Activation**
**Risk:** User gets charged twice for same activation
**Test:** Rapid clicking, network issues during activation
**Mitigation:** Invoice system prevents duplicates

### 3. **Payment Without Activation**
**Risk:** User pays but wallet doesn't activate
**Test:** Database failures during activation
**Mitigation:** Invoice tracking and manual recovery

### 4. **Lost Payment State**
**Risk:** User loses track of payment progress
**Test:** Browser crashes, page refreshes
**Mitigation:** Invoice system and localStorage

### 5. **Referral Commission Failures**
**Risk:** Referrer doesn't receive commission
**Test:** Multi-transaction failures
**Mitigation:** Separate commission tracking

---

## 📊 Success Metrics

### Reliability Metrics
- **Activation Success Rate:** >99.5%
- **Payment Failure Recovery:** 100% (no lost payments)
- **Error Message Clarity:** User understands next steps
- **State Preservation:** No lost progress on interruptions

### User Experience Metrics
- **Time to Activation:** <2 minutes average
- **Error Resolution:** <30 seconds to understand and fix
- **Support Tickets:** <1% of activations require support
- **User Satisfaction:** >95% successful first attempt

---

## 🔄 Continuous Testing Strategy

### Automated Testing
- Run test suite on every deployment
- Monitor real-world activation success rates
- Alert on unusual failure patterns
- Track error message frequency

### Manual Testing
- Weekly full flow testing
- Monthly edge case testing
- Quarterly stress testing
- User acceptance testing for major changes

### Monitoring & Alerts
- Real-time activation success monitoring
- Failed payment alerts
- Invoice system health checks
- User experience metrics tracking

---

## 🎯 Final Validation

Before considering the GlobalPurchaseModal production-ready:

1. **✅ All automated tests pass**
2. **✅ Manual testing checklist completed**
3. **✅ Error scenarios handled gracefully**
4. **✅ State management robust**
5. **✅ Integration points verified**
6. **✅ User experience optimized**
7. **✅ Monitoring systems in place**

**The GlobalPurchaseModal should provide a bulletproof activation experience with zero user frustration and 100% reliability.**