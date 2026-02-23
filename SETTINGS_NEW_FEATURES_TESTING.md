# Settings New Features - Testing Guide 🧪

## Quick Test All New Features

### 1. Currency Selection ✅

**Test Steps:**
```
1. Go to /wallet/settings
2. Click "Primary Currency" row
3. Modal opens with 10 currencies
4. Select "EUR (€)"
5. Toast: "Currency changed to Euro"
6. Modal closes
7. Verify row shows "EUR (€)"
8. Refresh page
9. Verify EUR still selected
```

**Expected Result:**
- ✅ Modal opens smoothly
- ✅ 10 currencies displayed
- ✅ Selected currency highlighted (green border)
- ✅ Toast notification appears
- ✅ Modal closes automatically
- ✅ Setting row updates
- ✅ Preference persists after refresh

**LocalStorage Check:**
```javascript
localStorage.getItem('preferred_currency') // Should be 'EUR'
```

---

### 2. Language Selection ✅

**Test Steps:**
```
1. Go to /wallet/settings
2. Click "Language" row
3. Modal opens with 10 languages
4. Select "Español 🇪🇸"
5. Toast: "Language changed to Español"
6. Modal closes
7. Verify row shows "Español"
8. Refresh page
9. Verify Español still selected
```

**Expected Result:**
- ✅ Modal opens smoothly
- ✅ 10 languages with flags displayed
- ✅ Selected language highlighted (green border)
- ✅ Checkmark on selected language
- ✅ Toast notification appears
- ✅ Modal closes automatically
- ✅ Setting row updates
- ✅ Preference persists after refresh
- ✅ Info message about translations shown

**LocalStorage Check:**
```javascript
localStorage.getItem('preferred_language') // Should be 'es'
```

---

### 3. Backup Recovery Phrase ✅

**Test Steps:**
```
1. Go to /wallet/settings
2. Click "Backup Recovery Phrase" row
3. Modal opens with security warnings
4. Read warning messages
5. See "Coming Soon" message
6. Click "Close"
7. Modal closes
```

**Expected Result:**
- ✅ Modal opens smoothly
- ✅ Red shield icon displayed
- ✅ Security warning with AlertCircle icon
- ✅ Blue info message about encryption
- ✅ "Coming Soon" section with Lock icon
- ✅ Clear messaging about future feature
- ✅ Close button works

**Security Messages:**
- ⚠️ "Never share your recovery phrase..."
- 💡 "Your recovery phrase is encrypted..."
- 🔒 "Secure Backup Feature coming soon..."

---

### 4. Info Page Links ✅

**Test: About RhizaCore**
```
1. Go to /wallet/settings
2. Click "About RhizaCore" row
3. Verify navigates to /whitepaper
4. Verify Whitepaper page loads
5. Click back button
6. Return to Settings
```

**Expected Result:**
- ✅ Navigates to /whitepaper
- ✅ Whitepaper page displays
- ✅ Can navigate back
- ✅ Settings state preserved

**Test: Terms of Service**
```
1. Go to /wallet/settings
2. Click "Terms of Service" row
3. Verify navigates to /terms
4. Verify Terms page loads
5. Click back button
6. Return to Settings
```

**Expected Result:**
- ✅ Navigates to /terms
- ✅ Terms page displays
- ✅ Can navigate back
- ✅ Settings state preserved

---

### 5. Security Placeholders ✅

**Test: Security Passcode**
```
1. Go to /wallet/settings
2. Click "Security Passcode" row
3. Toast appears: "Passcode management coming soon"
4. No modal opens
5. Setting remains clickable
```

**Expected Result:**
- ✅ Toast notification appears
- ✅ Info message clear
- ✅ No errors
- ✅ User-friendly feedback

**Test: Biometric ID**
```
1. Go to /wallet/settings
2. Click "Biometric ID" row
3. Toast appears: "Biometric authentication coming soon"
4. No modal opens
5. Setting remains clickable
```

**Expected Result:**
- ✅ Toast notification appears
- ✅ Info message clear
- ✅ No errors
- ✅ User-friendly feedback

---

## Visual Testing

### Currency Modal
```
┌─────────────────────────────────────┐
│ 💳 Select Currency                  │
│    Choose your display currency     │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ US Dollar                    $  │ │
│ │ USD                             │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Euro                         €  │ │ ← Selected
│ │ EUR                             │ │   (Green border)
│ └─────────────────────────────────┘ │
│                                     │
│ ... 8 more currencies ...          │
│                                     │
│ [Close]                             │
└─────────────────────────────────────┘
```

### Language Modal
```
┌─────────────────────────────────────┐
│ 🌐 Select Language                  │
│    Choose your preferred language   │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🇺🇸 English              ✓     │ │ ← Selected
│ └─────────────────────────────────┘ │   (Green border + checkmark)
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🇪🇸 Español                     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ... 8 more languages ...           │
│                                     │
│ 💡 Translation support coming soon! │
│                                     │
│ [Close]                             │
└─────────────────────────────────────┘
```

### Backup Phrase Modal
```
┌─────────────────────────────────────┐
│ 🛡️ Recovery Phrase                  │
│    Keep this safe and private       │
│                                     │
│ ⚠️ Never share your recovery phrase │
│    with anyone...                   │
│                                     │
│ 💡 Your recovery phrase is encrypted│
│    and stored locally...            │
│                                     │
│ 🔒 Secure Backup Feature            │
│    Recovery phrase viewing with     │
│    password verification coming soon│
│                                     │
│ [Close]                             │
└─────────────────────────────────────┘
```

---

## Mobile Testing

### iPhone SE (375px)
- [ ] Currency modal full width
- [ ] Language modal full width
- [ ] Backup modal full width
- [ ] All text readable
- [ ] Buttons touch-friendly
- [ ] Scrolling smooth
- [ ] Modals centered

### iPad (768px)
- [ ] Modals max-width applied
- [ ] Content centered
- [ ] Touch targets adequate
- [ ] Layout responsive

### Desktop (1920px)
- [ ] Modals centered
- [ ] Max-width constraint
- [ ] Hover states working
- [ ] Click handlers working

---

## Browser Testing

### Chrome
- [ ] All modals open
- [ ] LocalStorage works
- [ ] Navigation works
- [ ] Toast notifications appear
- [ ] Animations smooth

### Firefox
- [ ] All modals open
- [ ] LocalStorage works
- [ ] Navigation works
- [ ] Toast notifications appear
- [ ] Animations smooth

### Safari
- [ ] All modals open
- [ ] LocalStorage works
- [ ] Navigation works
- [ ] Toast notifications appear
- [ ] Animations smooth

### Edge
- [ ] All modals open
- [ ] LocalStorage works
- [ ] Navigation works
- [ ] Toast notifications appear
- [ ] Animations smooth

---

## Persistence Testing

### Test: Currency Persistence
```
1. Select EUR currency
2. Close Settings
3. Go to Dashboard
4. Return to Settings
5. Verify EUR still selected
6. Close browser
7. Reopen browser
8. Go to Settings
9. Verify EUR still selected
```

### Test: Language Persistence
```
1. Select Español language
2. Close Settings
3. Go to Dashboard
4. Return to Settings
5. Verify Español still selected
6. Close browser
7. Reopen browser
8. Go to Settings
9. Verify Español still selected
```

---

## Error Handling

### Test: LocalStorage Disabled
```
1. Disable localStorage in browser
2. Try selecting currency
3. Verify graceful handling
4. Toast should still appear
5. No console errors
```

### Test: Navigation Blocked
```
1. Click "About RhizaCore"
2. If navigation fails
3. Verify error handling
4. User should see feedback
```

---

## Performance Testing

### Modal Open Time
```
Currency Modal: < 300ms
Language Modal: < 300ms
Backup Modal: < 300ms
```

### LocalStorage Operations
```
Save: < 10ms
Load: < 10ms
```

### Navigation Time
```
To Whitepaper: < 500ms
To Terms: < 500ms
```

---

## Accessibility Testing

### Keyboard Navigation
- [ ] Tab to "Primary Currency"
- [ ] Enter opens modal
- [ ] Tab through currencies
- [ ] Enter selects currency
- [ ] Escape closes modal

### Screen Reader
- [ ] Modal title announced
- [ ] Currency options announced
- [ ] Selected state announced
- [ ] Close button announced

---

## Integration Testing

### Test: Currency → Dashboard
```
1. Select JPY currency
2. Go to Dashboard
3. Future: Verify prices in JPY
4. Return to Settings
5. Verify JPY still selected
```

### Test: Language → All Pages
```
1. Select Français
2. Navigate to different pages
3. Future: Verify French text
4. Return to Settings
5. Verify Français still selected
```

---

## LocalStorage Verification

### Check Saved Data
```javascript
// Open browser console
console.log('Currency:', localStorage.getItem('preferred_currency'));
console.log('Language:', localStorage.getItem('preferred_language'));

// Expected output:
// Currency: EUR
// Language: es
```

### Clear Preferences
```javascript
// Reset to defaults
localStorage.removeItem('preferred_currency');
localStorage.removeItem('preferred_language');
// Refresh page
```

---

## Common Issues

### Issue: Modal not opening
**Solution:**
- Check browser console for errors
- Verify state management
- Check z-index conflicts

### Issue: Preference not saving
**Solution:**
- Check localStorage enabled
- Verify handler called
- Check browser console

### Issue: Navigation not working
**Solution:**
- Verify routes exist
- Check React Router setup
- Verify navigate() called

### Issue: Toast not appearing
**Solution:**
- Check ToastContext
- Verify showToast imported
- Check toast duration

---

## Test Results Template

```
Date: ___________
Tester: ___________
Browser: ___________
Device: ___________

Currency Selection:     [ ] PASS  [ ] FAIL
Language Selection:     [ ] PASS  [ ] FAIL
Backup Phrase Modal:    [ ] PASS  [ ] FAIL
Info Page Links:        [ ] PASS  [ ] FAIL
Security Placeholders:  [ ] PASS  [ ] FAIL

Persistence:            [ ] PASS  [ ] FAIL
Mobile Responsive:      [ ] PASS  [ ] FAIL
Accessibility:          [ ] PASS  [ ] FAIL
Performance:            [ ] PASS  [ ] FAIL

Overall Status:         [ ] PASS  [ ] FAIL

Notes:
_________________________________
_________________________________
_________________________________
```

---

## Summary

### New Features to Test: 5
1. Currency Selection (10 options)
2. Language Selection (10 options)
3. Backup Recovery Phrase
4. Info Page Links (2 pages)
5. Security Placeholders (2 features)

### Test Coverage
- ✅ Functionality
- ✅ Visual design
- ✅ Persistence
- ✅ Mobile responsive
- ✅ Browser compatibility
- ✅ Accessibility
- ✅ Performance
- ✅ Error handling

### Estimated Test Time
- Quick test: 5 minutes
- Full test: 15 minutes
- Comprehensive: 30 minutes

All new Settings features are ready for testing! 🚀
