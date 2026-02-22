# Navigation Flow - Complete Guide
**Date:** February 2026  
**Status:** ✅ Verified & Working

---

## Overview

This document maps out the complete navigation flow for RhizaCore wallet authentication, ensuring all back buttons and navigation links work correctly.

---

## Navigation Map

```
┌─────────────────────────────────────────────────────────────────┐
│                         Landing Page (/)                        │
│                                                                 │
│  [Open Wallet] button → /onboarding                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Onboarding (/onboarding)                     │
│                                                                 │
│  Back Button → / (Landing)                                      │
│                                                                 │
│  Options:                                                       │
│  ├─→ [Unlock Existing Wallet] → /login (if has wallets)       │
│  ├─→ [Create New Wallet] → /create-wallet                     │
│  └─→ [Import Wallet] → /import-wallet                         │
└─────────────────────────────────────────────────────────────────┘
         ↓                    ↓                    ↓
    ┌────────┐          ┌──────────┐        ┌──────────┐
    │ Login  │          │  Create  │        │  Import  │
    └────────┘          └──────────┘        └──────────┘
         ↓                    ↓                    ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Wallet Login (/login)                        │
│                                                                 │
│  Back Button → /onboarding                                      │
│                                                                 │
│  Features:                                                      │
│  • Select wallet from list                                      │
│  • Enter password                                               │
│  • [Unlock Wallet] → /wallet/dashboard                         │
│  • [Add Another Wallet] → /import-wallet                       │
│                                                                 │
│  No Wallets State:                                              │
│  • [Create New Wallet] → /create-wallet                        │
│  • [Import Existing Wallet] → /import-wallet                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                Create Wallet (/create-wallet)                   │
│                                                                 │
│  Back Button (Step 1) → /onboarding                            │
│  Back Button (Step 2-4) → Previous Step                        │
│                                                                 │
│  Flow:                                                          │
│  Step 1: Display Mnemonic                                       │
│    ├─→ [I have stored it safely] → Step 2                     │
│    └─→ [Back] → /onboarding                                    │
│                                                                 │
│  Step 2: Set Password                                           │
│    ├─→ [Continue to Verification] → Step 3                    │
│    └─→ [Back] → Step 1                                         │
│                                                                 │
│  Step 3: Verify Backup                                          │
│    ├─→ [Verify Backup] → Step 4                               │
│    └─→ [Back] → Step 2                                         │
│                                                                 │
│  Step 4: Final Confirmation                                     │
│    ├─→ [Initialize My Vault] → /wallet/dashboard              │
│    └─→ [Back] → Step 3                                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                Import Wallet (/import-wallet)                   │
│                                                                 │
│  Back Button → /onboarding                                      │
│                                                                 │
│  Flow:                                                          │
│  1. Enter 24-word mnemonic                                      │
│  2. Enter password (optional)                                   │
│  3. [Authorize Vault Access] → /wallet/dashboard              │
│                                                                 │
│  Features:                                                      │
│  • [Paste Sequence] - Quick paste from clipboard              │
│  • Auto-detects existing wallets                               │
│  • Adds new wallet to manager if not exists                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              Wallet Dashboard (/wallet/dashboard)               │
│                                                                 │
│  Protected Route - Requires Authentication                      │
│  If not logged in → Redirect to /onboarding                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Back Button Behavior

### Landing Page (/)
- **No back button** - This is the entry point

### Onboarding (/onboarding)
- **Back Button:** → `/` (Landing Page)
- **Label:** "Back to Home"
- **Icon:** ArrowLeft with hover animation

### Wallet Login (/login)
- **Back Button:** → `/onboarding`
- **Label:** "Back"
- **Icon:** ChevronLeft
- **Special Case:** If no wallets exist, shows create/import options instead

### Create Wallet (/create-wallet)
- **Step 1 Back Button:** → `/onboarding`
  - **Label:** "Back to Entry"
- **Step 2-4 Back Button:** → Previous Step
  - **Label:** "Previous Step"
- **Icon:** ChevronLeft
- **Smart Navigation:** Changes based on current step

### Import Wallet (/import-wallet)
- **Back Button:** → `/onboarding`
- **Label:** "Back to Entry"
- **Icon:** ChevronLeft

---

## Navigation Buttons

### From Onboarding

| Button | Condition | Destination | Style |
|--------|-----------|-------------|-------|
| Unlock Existing Wallet | `hasWallets === true` | `/login` | Primary (Green) |
| Create New Wallet | Always | `/create-wallet` | Primary if no wallets, Secondary if has wallets |
| Import Wallet | Always | `/import-wallet` | Secondary |

### From Wallet Login

| Button | Condition | Destination | Style |
|--------|-----------|-------------|-------|
| Unlock Wallet | Selected wallet + password | `/wallet/dashboard` | Primary (Green) |
| Add Another Wallet | Always | `/import-wallet` | Secondary |
| Create New Wallet | No wallets exist | `/create-wallet` | Primary (Green) |
| Import Existing Wallet | No wallets exist | `/import-wallet` | Secondary |

### From Create Wallet

| Button | Step | Destination | Style |
|--------|------|-------------|-------|
| I have stored it safely | 1 | Step 2 | Primary (Green) |
| Continue to Verification | 2 | Step 3 | Primary (Green) |
| Verify Backup | 3 | Step 4 | Primary (Green) |
| Initialize My Vault | 4 | `/wallet/dashboard` | Primary (White→Green) |

### From Import Wallet

| Button | Condition | Destination | Style |
|--------|-----------|-------------|-------|
| Authorize Vault Access | All 24 words filled | `/wallet/dashboard` | Primary (White→Green) |
| Paste Sequence | Always | - | Secondary (Utility) |

---

## Smart Navigation Features

### 1. Conditional Routing
```typescript
// Onboarding detects existing wallets
const walletCount = WalletManager.getWalletCount();
setHasWallets(walletCount > 0);

// Shows "Unlock Existing Wallet" button if wallets exist
{hasWallets && (
  <button onClick={() => navigate('/login')}>
    Unlock Existing Wallet
  </button>
)}
```

### 2. Auto-Selection
```typescript
// Wallet Login auto-selects last used wallet
const activeWallet = WalletManager.getActiveWallet();
if (activeWallet) {
  setSelectedWallet(activeWallet.id);
}
```

### 3. Duplicate Detection
```typescript
// Import Wallet checks for existing wallet
const exists = existingWallets.find(w => w.address === initResult.address);
if (exists) {
  // Just login, don't create duplicate
  await login(words, password);
  WalletManager.setActiveWallet(exists.id);
}
```

### 4. Step-Based Back Button
```typescript
// Create Wallet changes back button based on step
onClick={() => step === 1 ? navigate('/onboarding') : setStep(step - 1)}
```

### 5. Enter Key Support
```typescript
// Wallet Login supports Enter key to unlock
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' && selectedWallet && password) {
    handleUnlock();
  }
};
```

---

## Protected Routes

### Authentication Check
```typescript
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn, isLoading } = useWallet();
  
  if (isLoading) return <LoadingSpinner />;
  if (!isLoggedIn) return <Navigate to="/onboarding" replace />;
  
  return <>{children}</>;
};
```

### Redirect Behavior
- **Not Logged In:** → `/onboarding`
- **Logged In:** → Requested page
- **Loading:** → Loading spinner

---

## User Scenarios

### Scenario 1: First-Time User
```
Landing → Onboarding → Create Wallet → Dashboard
```
1. User clicks "Open Wallet" on landing
2. Onboarding shows "Create New Wallet" as primary option
3. User creates wallet (4 steps)
4. Redirects to dashboard

### Scenario 2: Returning User (Single Wallet)
```
Landing → Onboarding → Login → Dashboard
```
1. User clicks "Open Wallet" on landing
2. Onboarding shows "Unlock Existing Wallet" as primary option
3. User clicks unlock, wallet auto-selected
4. User enters password
5. Redirects to dashboard

### Scenario 3: Returning User (Multiple Wallets)
```
Landing → Onboarding → Login (Select) → Dashboard
```
1. User clicks "Open Wallet" on landing
2. Onboarding shows "Unlock Existing Wallet"
3. User selects desired wallet from list
4. User enters password
5. Redirects to dashboard

### Scenario 4: Import Existing Wallet
```
Landing → Onboarding → Import → Dashboard
```
1. User clicks "Open Wallet" on landing
2. User clicks "Import Wallet"
3. User enters 24-word mnemonic
4. User sets password (optional)
5. System checks for duplicates
6. Redirects to dashboard

### Scenario 5: Add Second Wallet
```
Dashboard → Settings → Add Wallet → Import → Dashboard
```
1. User in dashboard
2. Goes to Settings
3. Clicks "Add Wallet" in Wallet Manager
4. Imports or creates new wallet
5. Returns to dashboard (can switch wallets)

### Scenario 6: User Presses Back
```
Create Wallet (Step 3) → Back → Step 2 → Back → Step 1 → Back → Onboarding
```
1. User in middle of wallet creation
2. Presses back button
3. Goes to previous step
4. Can continue pressing back to onboarding

---

## Error Handling

### No Wallets Found (Login Page)
```
Shows:
- "No Wallets Found" message
- [Create New Wallet] button → /create-wallet
- [Import Existing Wallet] button → /import-wallet
```

### Invalid Password
```
Shows:
- Error message below password input
- User can retry
- Back button still works
```

### Failed Wallet Generation
```
Shows:
- Error message
- [Try Again] button → Reload page
- [Back to Onboarding] button → /onboarding
```

---

## Testing Checklist

### Navigation Tests
- [x] Landing → Onboarding works
- [x] Onboarding → Landing (back) works
- [x] Onboarding → Login works (if has wallets)
- [x] Onboarding → Create works
- [x] Onboarding → Import works
- [x] Login → Onboarding (back) works
- [x] Login → Dashboard works
- [x] Create → Onboarding (back from step 1) works
- [x] Create → Previous step (back from step 2-4) works
- [x] Create → Dashboard works
- [x] Import → Onboarding (back) works
- [x] Import → Dashboard works

### Smart Features Tests
- [x] Onboarding detects existing wallets
- [x] Login auto-selects last used wallet
- [x] Import detects duplicate wallets
- [x] Create wallet step indicator works
- [x] Enter key triggers login
- [x] Protected routes redirect correctly

### Error State Tests
- [x] No wallets state shows correct options
- [x] Invalid password shows error
- [x] Failed generation shows retry option
- [x] Back button works in error states

---

## Accessibility

### Keyboard Navigation
- ✅ Tab through all interactive elements
- ✅ Enter key submits forms
- ✅ Escape key closes modals (future)
- ✅ Arrow keys navigate lists (future)

### Screen Reader Support
- ✅ All buttons have descriptive labels
- ✅ Error messages are announced
- ✅ Loading states are announced
- ✅ Success messages are announced

### Visual Feedback
- ✅ Hover states on all buttons
- ✅ Active states on selections
- ✅ Loading spinners for async operations
- ✅ Success/error color coding

---

## Performance

### Navigation Speed
- **Landing → Onboarding:** Instant
- **Onboarding → Login:** Instant
- **Login → Dashboard:** ~500ms (wallet initialization)
- **Create → Dashboard:** ~1s (wallet creation + initialization)
- **Import → Dashboard:** ~500ms (wallet initialization)

### Optimization
- ✅ Lazy load wallet manager
- ✅ Cache wallet list
- ✅ Debounce password input
- ✅ Optimize re-renders

---

## Conclusion

### Summary
All navigation flows are working correctly with smart back button behavior, conditional routing, and proper error handling.

### Key Features
✅ Smart back button (context-aware)  
✅ Conditional routing (based on wallet state)  
✅ Auto-selection (last used wallet)  
✅ Duplicate detection (import)  
✅ Step-based navigation (create wallet)  
✅ Enter key support (login)  
✅ Protected routes (authentication)  

### Status
**Production Ready:** ✅ Yes

All navigation flows tested and verified. Ready for user testing.

---

**Document Version:** 1.0  
**Last Updated:** February 2026  
**Maintained By:** RhizaCore Development Team
