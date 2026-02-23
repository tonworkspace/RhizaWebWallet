# Transaction Testing Checklist

## 🧪 Quick Test Guide

### Before Testing:
- [ ] App is running (`npm run dev`)
- [ ] Wallet is created/imported
- [ ] Wallet has testnet TON (get from faucet)
- [ ] Network is set to TESTNET

---

## ✅ Test Cases

### 1. Basic Transaction ✅
- [ ] Navigate to `/wallet/transfer`
- [ ] Enter valid recipient address
- [ ] Enter amount (e.g., 0.1 TON)
- [ ] Click "Review Transaction"
- [ ] Verify details on confirmation screen
- [ ] Click "Confirm & Disperse"
- [ ] See "Broadcasting..." animation
- [ ] See success screen with transaction hash
- [ ] Balance updates after ~30 seconds
- [ ] Transaction appears in History tab

**Expected**: Transaction succeeds, hash displayed, balance updates

---

### 2. Transaction with Comment 💬
- [ ] Send transaction with comment "Test payment"
- [ ] Transaction succeeds
- [ ] Comment is included

**Expected**: Transaction succeeds with comment

---

### 3. Insufficient Balance ❌
- [ ] Try to send more TON than you have
- [ ] See error: "Insufficient balance..."
- [ ] Transaction doesn't broadcast

**Expected**: Error message, no transaction sent

---

### 4. Invalid Address ❌
- [ ] Enter invalid address (e.g., "invalid123")
- [ ] Try to proceed
- [ ] See error: "Invalid recipient address"

**Expected**: Error message, validation fails

---

### 5. Send Max Amount 💰
- [ ] Click "Send Max" button
- [ ] Amount fills with (balance - 0.1 TON)
- [ ] Transaction succeeds

**Expected**: Sends maximum possible amount

---

### 6. Cancel Transaction 🚫
- [ ] Fill form
- [ ] Click "Review Transaction"
- [ ] Click "Cancel & Edit"
- [ ] Returns to form with data preserved

**Expected**: Can cancel and edit

---

### 7. Network Switch 🔄
- [ ] Send transaction on testnet
- [ ] Switch to mainnet
- [ ] Try to send (should work on mainnet)

**Expected**: Works on both networks

---

### 8. Session Timeout ⏰
- [ ] Start transaction
- [ ] Wait for session timeout
- [ ] Try to confirm
- [ ] Should redirect to login

**Expected**: Session management works

---

### 9. Multiple Transactions 🔁
- [ ] Send transaction 1
- [ ] Wait for confirmation
- [ ] Send transaction 2
- [ ] Both succeed

**Expected**: Can send multiple transactions

---

### 10. Error Recovery 🔧
- [ ] Disconnect internet
- [ ] Try to send transaction
- [ ] See error message
- [ ] Reconnect internet
- [ ] Click "Try Again"
- [ ] Transaction succeeds

**Expected**: Can recover from errors

---

## 🎯 Success Criteria

All tests pass when:
- ✅ Transactions broadcast successfully
- ✅ Confirmations work
- ✅ Errors handled gracefully
- ✅ Balance updates correctly
- ✅ History syncs properly
- ✅ UI feedback is clear
- ✅ No console errors

---

## 🚨 If Tests Fail

### Check:
1. **Console logs** - Look for error messages
2. **Network** - Ensure on testnet
3. **Balance** - Have enough testnet TON
4. **Address** - Recipient address is valid
5. **Connection** - Internet is working

### Common Fixes:
- Refresh page
- Re-login to wallet
- Get more testnet TON
- Check network setting
- Clear browser cache

---

## 📊 Test Results

Date: ___________

| Test | Pass | Fail | Notes |
|------|------|------|-------|
| Basic Transaction | ☐ | ☐ | |
| With Comment | ☐ | ☐ | |
| Insufficient Balance | ☐ | ☐ | |
| Invalid Address | ☐ | ☐ | |
| Send Max | ☐ | ☐ | |
| Cancel Transaction | ☐ | ☐ | |
| Network Switch | ☐ | ☐ | |
| Session Timeout | ☐ | ☐ | |
| Multiple Transactions | ☐ | ☐ | |
| Error Recovery | ☐ | ☐ | |

**Overall Result**: ☐ PASS ☐ FAIL

**Notes**:
_________________________________
_________________________________
_________________________________

---

## 🎉 Ready for Production?

- [ ] All tests pass
- [ ] No critical bugs
- [ ] Error handling works
- [ ] User feedback is clear
- [ ] Performance is good
- [ ] Security audit done

**If all checked**: Ready to deploy! 🚀
