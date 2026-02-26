# Wallet System Health Check 🏥

## Overview

This document provides a comprehensive checklist to verify that your entire wallet system is working correctly.

---

## 🎯 Quick Health Check (5 minutes)

Run these quick tests to verify basic functionality:

### 1. Can Users Create Wallets? ✅
- [ ] Navigate to `/#/create-wallet`
- [ ] Wallet generates 24-word mnemonic
- [ ] Can copy mnemonic
- [ ] Can set password
- [ ] Can verify backup
- [ ] Wallet creates successfully
- [ ] Redirects to dashboard

### 2. Can Users Import Wallets? ✅
- [ ] Navigate to `/#/import-wallet`
- [ ] Can paste/enter mnemonic
- [ ] Can set password
- [ ] Wallet imports successfully
- [ ] Redirects to dashboard

### 3. Can Users Login? ✅
- [ ] Logout from wallet
- [ ] Navigate to `/#/login`
- [ ] Can enter mnemonic/password
- [ ] Login successful
- [ ] Redirects to dashboard

### 4. Does Dashboard Load? ✅
- [ ] Balance displays correctly
- [ ] Wallet address shows
- [ ] Recent transactions load
- [ ] All stats display

### 5. Can Users Send Transactions? ✅
- [ ] Navigate to Transfer page
- [ ] Can enter recipient address
- [ ] Can enter amount
- [ ] Transaction preview shows
- [ ] Can confirm and send

---

## 🔍 Detailed System Check

### A. Wallet Core Functionality

#### 1. Wallet Generation ✅
**Test:** Create new wallet
```
Expected:
- 24-word mnemonic generated
- Mnemonic is valid BIP39
- Wallet address generated
- Private key encrypted with password
```

**Files to Check:**
- `services/tonWalletService.ts` - `generateNewWallet()`
- `pages/CreateWallet.tsx` - Wallet creation flow

**Console Logs to Look For:**
```
✅ Wallet initialized: 0:abc...
✅ User profile created: uuid
✅ Signup bonus awarded: 100 RZC
✅ Referral code created: ABC12345
```

---

#### 2. Wallet Import ✅
**Test:** Import existing wallet
```
Expected:
- Can paste 24-word mnemonic
- Validates mnemonic format
- Derives correct wallet address
- Encrypts and stores securely
```

**Files to Check:**
- `services/tonWalletService.ts` - `initializeWallet()`
- `pages/ImportWallet.tsx` - Import flow

**Console Logs to Look For:**
```
✅ Wallet initialized: 0:abc...
✅ User profile loaded: User Name
```

---

#### 3. Wallet Login/Logout ✅
**Test:** Login and logout
```
Expected:
- Can login with mnemonic + password
- Session persists across page reloads
- Can logout successfully
- Session cleared on logout
```

**Files to Check:**
- `context/WalletContext.tsx` - `login()`, `logout()`
- `pages/WalletLogin.tsx` - Login UI

**Console Logs to Look For:**
```
🔐 Found stored session, attempting auto-login...
✅ Session restored, logging in...
✅ User profile loaded: User Name
```

---

#### 4. Balance Display ✅
**Test:** Check balance accuracy
```
Expected:
- TON balance displays correctly
- Updates after transactions
- Shows in correct format (2 decimals)
- Converts to USD correctly
```

**Files to Check:**
- `services/tonWalletService.ts` - `getBalance()`
- `pages/Dashboard.tsx` - Balance display

**API Calls:**
```
GET https://testnet.toncenter.com/api/v2/getAddressBalance
```

---

#### 5. Transaction History ✅
**Test:** View transaction history
```
Expected:
- Shows sent transactions
- Shows received transactions
- Displays correct amounts
- Shows transaction status
- Links to explorer work
```

**Files to Check:**
- `services/tonWalletService.ts` - `getTransactions()`
- `pages/History.tsx` - Transaction list
- `services/transactionSync.ts` - Sync service

**Database Tables:**
- `wallet_transactions` - Synced transactions

---

#### 6. Send Transaction ✅
**Test:** Send TON to another address
```
Expected:
- Can enter recipient address
- Validates address format
- Shows transaction fee
- Can confirm transaction
- Transaction broadcasts successfully
- Balance updates
- Transaction appears in history
```

**Files to Check:**
- `services/tonWalletService.ts` - `sendTransaction()`
- `pages/Transfer.tsx` - Send UI

**Console Logs to Look For:**
```
📤 Sending transaction...
✅ Transaction sent: hash
💾 Transaction saved to database
```

---

### B. User Profile & Database

#### 7. Profile Creation ✅
**Test:** New user profile
```
Expected:
- Profile created in wallet_users
- Referral code generated
- RZC balance initialized to 0
- Signup bonus awarded (100 RZC)
```

**Database Check:**
```sql
SELECT 
  id, name, wallet_address, rzc_balance, created_at
FROM wallet_users
WHERE wallet_address = 'YOUR_ADDRESS'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Result:**
- 1 row with rzc_balance = 100

---

#### 8. Profile Loading ✅
**Test:** Profile loads on login
```
Expected:
- Profile fetched from database
- Referral data loaded
- RZC balance displayed
- User settings applied
```

**Files to Check:**
- `context/WalletContext.tsx` - Profile loading in `login()`
- `services/supabaseService.ts` - `getProfile()`

---

#### 9. Transaction Sync ✅
**Test:** Transactions sync to database
```
Expected:
- Blockchain transactions fetched
- Saved to wallet_transactions table
- Duplicates prevented
- Auto-sync runs every 30 seconds
```

**Files to Check:**
- `services/transactionSync.ts` - `syncTransactions()`

**Database Check:**
```sql
SELECT COUNT(*) FROM wallet_transactions
WHERE user_id = 'YOUR_USER_ID';
```

---

### C. RZC Token System

#### 10. Signup Bonus ✅
**Test:** New user receives 100 RZC
```
Expected:
- 100 RZC awarded on wallet creation
- Transaction recorded in wallet_rzc_transactions
- Balance updated in wallet_users
```

**Database Check:**
```sql
SELECT * FROM wallet_rzc_transactions
WHERE user_id = 'YOUR_USER_ID'
  AND type = 'signup_bonus';
```

**Expected Result:**
- 1 row with amount = 100

---

#### 11. Referral Bonus ✅
**Test:** Referrer receives 50 RZC
```
Expected:
- 50 RZC awarded when someone uses referral code
- Transaction recorded
- Balance updated
- Referral count incremented
```

**Database Check:**
```sql
SELECT * FROM wallet_rzc_transactions
WHERE user_id = 'REFERRER_USER_ID'
  AND type = 'referral_bonus';
```

---

#### 12. RZC Balance Display ✅
**Test:** RZC balance shows correctly
```
Expected:
- Balance displays on Dashboard
- Balance displays on Referral page
- Updates after earning RZC
- Converts to USD correctly
```

**Files to Check:**
- `pages/Dashboard.tsx` - RZC display
- `pages/Referral.tsx` - RZC earnings

---

### D. Referral System

#### 13. Referral Code Generation ✅
**Test:** User gets referral code
```
Expected:
- Code generated on signup
- Code is unique
- Code is 8 characters (last 8 of wallet address)
- Code stored in wallet_referrals
```

**Database Check:**
```sql
SELECT referral_code FROM wallet_referrals
WHERE user_id = 'YOUR_USER_ID';
```

---

#### 14. Referral Link Sharing ✅
**Test:** Can share referral link
```
Expected:
- Link displays on Referral page
- Copy button works
- Link format: /#/join?ref=CODE
```

**Test URL:**
```
http://localhost:5173/#/join?ref=ABC12345
```

---

#### 15. Referral Signup ✅
**Test:** New user signs up with referral code
```
Expected:
- New user created
- New user receives 100 RZC
- Referrer receives 50 RZC
- Referrer's count increments
- New user appears in referrer's downline
```

**See:** `REFERRAL_SYSTEM_TEST_GUIDE.md` for detailed testing

---

### E. UI/UX Features

#### 16. Navigation ✅
**Test:** All pages accessible
```
Expected:
- Dashboard loads
- Transfer page loads
- History page loads
- Referral page loads
- Settings page loads
- All navigation links work
```

---

#### 17. Responsive Design ✅
**Test:** Mobile compatibility
```
Expected:
- Works on mobile screens
- Touch interactions work
- Buttons are tappable
- Text is readable
```

---

#### 18. Theme Switching ✅
**Test:** Dark/Light mode
```
Expected:
- Can toggle theme
- Theme persists across sessions
- All pages respect theme
```

---

#### 19. Network Switching ✅
**Test:** Testnet/Mainnet toggle
```
Expected:
- Can switch networks
- Balance updates for new network
- Transactions fetch from correct network
- Network persists across sessions
```

**Files to Check:**
- `context/WalletContext.tsx` - `switchNetwork()`
- `constants.ts` - Network configs

---

#### 20. Multi-Tab Sync ✅
**Test:** Multiple tabs
```
Expected:
- Login in one tab reflects in others
- Logout in one tab logs out all tabs
- Balance updates sync across tabs
```

**Files to Check:**
- `context/WalletContext.tsx` - BroadcastChannel

---

### F. Security Features

#### 21. Password Encryption ✅
**Test:** Mnemonic encryption
```
Expected:
- Mnemonic encrypted with password
- Cannot decrypt without correct password
- Password not stored anywhere
```

**Files to Check:**
- `utils/encryption.ts` - Encryption functions

---

#### 22. Session Management ✅
**Test:** Session security
```
Expected:
- Session expires after inactivity
- Can set session timeout
- Warning before auto-logout
```

**Files to Check:**
- `components/SessionTimeoutWarning.tsx`

---

#### 23. Input Validation ✅
**Test:** Form validation
```
Expected:
- Validates wallet addresses
- Validates amounts
- Validates mnemonic format
- Shows error messages
```

---

### G. Performance

#### 24. Load Times ✅
**Test:** Page performance
```
Expected:
- Dashboard loads < 2 seconds
- Transaction list loads < 3 seconds
- No lag when switching pages
```

---

#### 25. API Response Times ✅
**Test:** API calls
```
Expected:
- Balance fetch < 1 second
- Transaction fetch < 2 seconds
- Send transaction < 3 seconds
```

---

## 🧪 Automated Test Script

Run this in browser console on Dashboard:

```javascript
async function testWalletSystem() {
  console.log('🧪 Starting Wallet System Health Check...\n');
  
  const tests = {
    'Wallet Context': !!window.location.pathname,
    'User Logged In': localStorage.getItem('rhiza_active_wallet') !== null,
    'Network Set': localStorage.getItem('rhiza_network') !== null,
    'Theme Set': localStorage.getItem('rhiza_theme') !== null,
  };
  
  console.log('='.repeat(50));
  console.log('BASIC CHECKS');
  console.log('='.repeat(50));
  
  Object.entries(tests).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}`);
  });
  
  console.log('\n');
  console.log('='.repeat(50));
  console.log('UI ELEMENTS');
  console.log('='.repeat(50));
  
  const elements = {
    'Balance Display': document.querySelector('[class*="balance"]'),
    'Wallet Address': document.querySelector('[class*="address"]'),
    'Navigation Menu': document.querySelector('nav'),
    'Dashboard Content': document.querySelector('[class*="dashboard"]'),
  };
  
  Object.entries(elements).forEach(([name, element]) => {
    console.log(`${element ? '✅' : '❌'} ${name}`);
  });
  
  console.log('\n');
  console.log('='.repeat(50));
  console.log('LOCAL STORAGE');
  console.log('='.repeat(50));
  
  const storage = {
    'Active Wallet': localStorage.getItem('rhiza_active_wallet'),
    'Network': localStorage.getItem('rhiza_network'),
    'Theme': localStorage.getItem('rhiza_theme'),
  };
  
  Object.entries(storage).forEach(([key, value]) => {
    console.log(`${key}: ${value || 'Not set'}`);
  });
  
  console.log('\n✅ Health check complete!');
}

testWalletSystem();
```

---

## 📊 Database Health Check

Run these queries in Supabase:

```sql
-- 1. Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'wallet_%'
ORDER BY table_name;

-- Expected: 11 tables

-- 2. Check user count
SELECT COUNT(*) as total_users FROM wallet_users;

-- 3. Check transaction count
SELECT COUNT(*) as total_transactions FROM wallet_transactions;

-- 4. Check RZC transactions
SELECT COUNT(*) as total_rzc_transactions FROM wallet_rzc_transactions;

-- 5. Check referral system
SELECT 
  COUNT(*) as total_referrals,
  SUM(total_referrals) as total_referred_users
FROM wallet_referrals;

-- 6. Check for errors
SELECT 
  table_name,
  COUNT(*) as row_count
FROM (
  SELECT 'wallet_users' as table_name, COUNT(*) FROM wallet_users
  UNION ALL
  SELECT 'wallet_referrals', COUNT(*) FROM wallet_referrals
  UNION ALL
  SELECT 'wallet_transactions', COUNT(*) FROM wallet_transactions
  UNION ALL
  SELECT 'wallet_rzc_transactions', COUNT(*) FROM wallet_rzc_transactions
) counts
GROUP BY table_name;
```

---

## 🚨 Common Issues & Solutions

### Issue 1: Balance Not Loading
**Symptoms:** Balance shows 0.00 or "Loading..."

**Check:**
1. Network connection
2. API endpoint responding
3. Wallet address valid
4. Console for errors

**Fix:**
```javascript
// In browser console
console.log('Wallet Address:', address);
console.log('Network:', network);
// Check if tonWalletService is initialized
```

---

### Issue 2: Transactions Not Syncing
**Symptoms:** Blockchain transactions don't appear in History

**Check:**
1. Transaction sync service running
2. Database connection
3. User ID correct

**Fix:**
```javascript
// Manually trigger sync
transactionSyncService.syncTransactions(walletAddress, userId);
```

---

### Issue 3: RZC Balance Not Updating
**Symptoms:** Earned RZC but balance doesn't change

**Check:**
1. `award_rzc_tokens` function exists
2. Transaction recorded in database
3. Balance field updated

**Fix:** See `REFERRAL_SYSTEM_FIX.md`

---

### Issue 4: Can't Send Transactions
**Symptoms:** Send button disabled or transaction fails

**Check:**
1. Sufficient balance
2. Valid recipient address
3. Network connection
4. Gas fees

**Fix:**
```javascript
// Check balance
console.log('Balance:', balance);
// Check network
console.log('Network:', network);
```

---

## ✅ Success Criteria

Your wallet system is healthy when:

- [ ] Users can create wallets
- [ ] Users can import wallets
- [ ] Users can login/logout
- [ ] Balance displays correctly
- [ ] Can send transactions
- [ ] Transactions sync to database
- [ ] RZC bonuses awarded correctly
- [ ] Referral system works
- [ ] All pages load without errors
- [ ] No console errors
- [ ] Database queries return expected data
- [ ] Multi-tab sync works
- [ ] Network switching works
- [ ] Theme switching works
- [ ] Mobile responsive

---

## 📁 Related Files

- `services/tonWalletService.ts` - Core wallet functionality
- `context/WalletContext.tsx` - Global wallet state
- `utils/walletManager.ts` - Wallet storage management
- `services/supabaseService.ts` - Database operations
- `services/transactionSync.ts` - Transaction synchronization
- `services/rzcRewardService.ts` - RZC token rewards

---

## 🎯 Quick Test Checklist

Run through this in 10 minutes:

1. ✅ Create new wallet
2. ✅ Check balance displays
3. ✅ View transaction history
4. ✅ Send test transaction (0.01 TON)
5. ✅ Check RZC balance (should be 100)
6. ✅ Copy referral link
7. ✅ Logout
8. ✅ Login again
9. ✅ Switch network
10. ✅ Check all pages load

If all 10 pass, your wallet system is working! 🎉

---

## 📞 Need Help?

If tests fail:
1. Check browser console for errors
2. Check Supabase logs
3. Run diagnostic SQL queries
4. Review relevant service files
5. Check network connectivity

---

**Remember:** A healthy wallet system should have no console errors, all features working, and data syncing correctly between blockchain, database, and UI! 🚀
