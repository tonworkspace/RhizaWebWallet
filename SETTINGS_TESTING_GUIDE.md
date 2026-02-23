# Settings Page - Testing Guide 🧪

## Quick Test Checklist

### 1. Profile Management ✅

**Test: Edit Profile**
```
1. Go to /wallet/settings
2. Click "Edit Profile" button
3. Select different avatar (e.g., 🚀)
4. Change name to "Test User"
5. Click "Save Changes"
6. Wait for page reload
7. Verify new avatar and name displayed
```

**Expected Result:**
- ✅ Avatar changes
- ✅ Name changes
- ✅ Toast: "Profile updated successfully!"
- ✅ Page reloads automatically
- ✅ Changes persist after reload

**Database Verification:**
```sql
SELECT name, avatar, updated_at 
FROM wallet_users 
WHERE wallet_address = 'YOUR_ADDRESS';
```

---

### 2. Copy Functions ✅

**Test: Copy Wallet Address**
```
1. Click on wallet address (shortened format)
2. Check clipboard
3. Verify full address copied
```

**Expected Result:**
- ✅ Toast: "Address copied to clipboard"
- ✅ Checkmark icon appears briefly
- ✅ Full address in clipboard

**Test: Copy Referral Code**
```
1. Click on referral code
2. Check clipboard
3. Verify code copied
```

**Expected Result:**
- ✅ Toast: "Referral code copied to clipboard"
- ✅ Code in clipboard

---

### 3. Notification Preferences ✅

**Test: Open Preferences**
```
1. Click "Notifications" row
2. Modal opens
3. Verify all 5 preferences shown
```

**Expected Result:**
- ✅ Modal opens smoothly
- ✅ Shows 5 preference toggles
- ✅ Current states loaded from database

**Test: Toggle Preferences**
```
1. Toggle "Transaction Notifications" OFF
2. Wait for toast
3. Toggle "Referral Notifications" ON
4. Wait for toast
5. Close modal
6. Reopen modal
7. Verify changes persisted
```

**Expected Result:**
- ✅ Toast: "Notification preferences updated" (each toggle)
- ✅ Changes save immediately
- ✅ Changes persist after closing/reopening
- ✅ No page reload needed

**Database Verification:**
```sql
SELECT * FROM wallet_notification_preferences 
WHERE wallet_address = 'YOUR_ADDRESS';
```

---

### 4. Network Switching ✅

**Test: Switch Network**
```
1. Note current network (Mainnet/Testnet)
2. Click "Network" row
3. Verify network toggles
4. Check toast notification
5. Go to Dashboard
6. Verify network indicator updated
```

**Expected Result:**
- ✅ Network toggles immediately
- ✅ Toast: "Switched to mainnet/testnet"
- ✅ Network persists across pages
- ✅ All transactions use new network

---

### 5. Privacy Mode ✅

**Test: Toggle Privacy Mode**
```
1. Click "Privacy Mode" row
2. Verify toggle switches
3. Click again
4. Verify toggle switches back
```

**Expected Result:**
- ✅ Toggle switches smoothly
- ✅ State changes immediately
- ✅ Visual feedback clear

**Note:** Privacy mode currently only toggles state. Future: will hide balances and addresses.

---

### 6. Wallet Switcher ✅

**Test: Switch Wallets**
```
1. Verify WalletSwitcher component visible
2. If multiple wallets exist:
   - Click different wallet
   - Verify switch occurs
3. If single wallet:
   - Verify current wallet shown
   - "Add Wallet" button visible
```

**Expected Result:**
- ✅ Component renders correctly
- ✅ Current wallet highlighted
- ✅ Switching works (if multiple wallets)

---

### 7. Logout ✅

**Test: Logout Function**
```
1. Scroll to bottom
2. Click "Log Out Wallet" (red text)
3. Verify redirect to /login
4. Try accessing /wallet/dashboard
5. Verify redirected back to /login
```

**Expected Result:**
- ✅ Redirects to /login immediately
- ✅ Session cleared
- ✅ Cannot access protected routes
- ✅ Must login again to access wallet

---

## Visual Testing

### Desktop (1920x1080)
- [ ] All sections visible
- [ ] No horizontal scroll
- [ ] Proper spacing
- [ ] Buttons clickable
- [ ] Modal centered

### Tablet (768x1024)
- [ ] Layout adjusts properly
- [ ] Text readable
- [ ] Buttons accessible
- [ ] Modal responsive

### Mobile (375x667)
- [ ] Single column layout
- [ ] Touch targets adequate
- [ ] Modal full width
- [ ] Scrolling smooth

---

## Browser Testing

### Chrome
- [ ] All functions work
- [ ] Copy to clipboard works
- [ ] Toast notifications appear
- [ ] Modal animations smooth

### Firefox
- [ ] All functions work
- [ ] Copy to clipboard works
- [ ] Toast notifications appear
- [ ] Modal animations smooth

### Safari
- [ ] All functions work
- [ ] Copy to clipboard works
- [ ] Toast notifications appear
- [ ] Modal animations smooth

### Edge
- [ ] All functions work
- [ ] Copy to clipboard works
- [ ] Toast notifications appear
- [ ] Modal animations smooth

---

## Error Handling

### Test: Network Error
```
1. Disconnect internet
2. Try editing profile
3. Verify error toast
4. Reconnect internet
5. Try again
6. Verify success
```

**Expected Result:**
- ❌ Error toast when offline
- ✅ Success toast when online
- ✅ Graceful error handling

### Test: Invalid Data
```
1. Edit profile
2. Clear name field
3. Try to save
4. Verify validation
```

**Expected Result:**
- ⚠️ Currently allows empty name
- 🔄 Future: Add validation

---

## Performance Testing

### Load Time
```
1. Navigate to /wallet/settings
2. Measure time to interactive
3. Should be < 1 second
```

### Modal Open Time
```
1. Click "Notifications"
2. Measure modal open time
3. Should be < 500ms
```

### Profile Update Time
```
1. Edit profile
2. Click save
3. Measure time to reload
4. Should be < 3 seconds
```

---

## Accessibility Testing

### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Enter/Space activates buttons
- [ ] Escape closes modal
- [ ] Focus visible on all elements

### Screen Reader
- [ ] All sections announced
- [ ] Buttons have labels
- [ ] Toggle states announced
- [ ] Modal accessible

---

## Integration Testing

### Test: Profile → Dashboard
```
1. Edit profile in Settings
2. Go to Dashboard
3. Verify new profile shown
4. Go to Referral page
5. Verify new profile shown
```

### Test: Network → Transfer
```
1. Switch network in Settings
2. Go to Transfer page
3. Verify correct network shown
4. Try sending transaction
5. Verify uses correct network
```

### Test: Notifications → Notifications Page
```
1. Toggle notifications in Settings
2. Go to Notifications page
3. Verify preferences affect notifications
```

---

## Database Testing

### Before Testing
```sql
-- Backup current data
SELECT * FROM wallet_users WHERE wallet_address = 'YOUR_ADDRESS';
SELECT * FROM wallet_notification_preferences WHERE wallet_address = 'YOUR_ADDRESS';
```

### After Testing
```sql
-- Verify changes
SELECT name, avatar, updated_at FROM wallet_users WHERE wallet_address = 'YOUR_ADDRESS';
SELECT * FROM wallet_notification_preferences WHERE wallet_address = 'YOUR_ADDRESS';
```

---

## Common Issues

### Issue: Profile not updating
**Solution:**
- Check internet connection
- Verify Supabase credentials
- Check browser console for errors
- Verify wallet address exists in database

### Issue: Notification preferences not saving
**Solution:**
- Check database table exists
- Verify RLS policies
- Check browser console
- Try refreshing page

### Issue: Copy not working
**Solution:**
- Check browser permissions
- Try different browser
- Verify clipboard API supported

### Issue: Logout not working
**Solution:**
- Check WalletContext
- Verify logout function called
- Check navigation working
- Clear browser cache

---

## Test Results Template

```
Date: ___________
Tester: ___________
Browser: ___________
Device: ___________

Profile Management:     [ ] PASS  [ ] FAIL
Copy Functions:         [ ] PASS  [ ] FAIL
Notification Prefs:     [ ] PASS  [ ] FAIL
Network Switching:      [ ] PASS  [ ] FAIL
Privacy Mode:           [ ] PASS  [ ] FAIL
Wallet Switcher:        [ ] PASS  [ ] FAIL
Logout:                 [ ] PASS  [ ] FAIL

Visual (Desktop):       [ ] PASS  [ ] FAIL
Visual (Mobile):        [ ] PASS  [ ] FAIL
Accessibility:          [ ] PASS  [ ] FAIL
Performance:            [ ] PASS  [ ] FAIL

Overall Status:         [ ] PASS  [ ] FAIL

Notes:
_________________________________
_________________________________
_________________________________
```

---

## Automated Testing (Future)

### Unit Tests Needed
```typescript
// Profile editing
test('should update profile name')
test('should update profile avatar')
test('should handle update errors')

// Notification preferences
test('should load preferences')
test('should update preferences')
test('should handle missing preferences')

// Copy functions
test('should copy wallet address')
test('should copy referral code')
test('should show toast on copy')

// Network switching
test('should switch to mainnet')
test('should switch to testnet')
test('should persist network choice')

// Logout
test('should clear session on logout')
test('should redirect to login')
test('should block protected routes')
```

---

## Summary

### Test Coverage
- ✅ 7 core functions
- ✅ Database integration
- ✅ Error handling
- ✅ Visual testing
- ✅ Browser compatibility
- ✅ Accessibility

### Estimated Test Time
- Quick test: 10 minutes
- Full test: 30 minutes
- Comprehensive: 1 hour

### Priority Tests
1. Profile editing (High)
2. Notification preferences (High)
3. Logout (High)
4. Copy functions (Medium)
5. Network switching (Medium)
6. Privacy mode (Low)

All core Settings functions are working and ready for testing! 🚀
