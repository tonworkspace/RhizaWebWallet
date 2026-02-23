# 🔧 Auto-Logout on Reload - Fixed

## Issue

Users were automatically logging out when reloading the page.

**Date:** February 23, 2026  
**Status:** ✅ Fixed

---

## Root Cause

The multi-tab synchronization was broadcasting a 'login' event when a user logged in, which caused other tabs to reload. When a page reloaded, it would:

1. Load the app
2. Auto-login (from stored session)
3. Broadcast 'login' event
4. Other tabs receive 'login' event
5. Other tabs reload
6. This created a reload loop

Additionally, the reload was being interpreted as a logout event in some cases.

---

## Solution

### Removed Login Broadcast

**Before:**
```typescript
// Broadcast login to other tabs
if (sessionChannelRef.current) {
  sessionChannelRef.current.postMessage({ type: 'login', address: res.address });
}
```

**After:**
```typescript
// Removed - each tab will auto-login independently
// No need to broadcast login events
```

### Updated Message Handler

**Before:**
```typescript
channel.onmessage = (event) => {
  if (event.data.type === 'logout') {
    logout();
  } else if (event.data.type === 'login') {
    window.location.reload(); // This caused the issue!
  }
};
```

**After:**
```typescript
channel.onmessage = (event) => {
  if (event.data.type === 'logout') {
    logout();
  }
  // Removed 'login' handler - each tab auto-logins independently
};
```

---

## How It Works Now

### Page Reload Flow
```
User reloads page
    ↓
App loads
    ↓
Check for stored session
    ↓
Found session? Yes
    ↓
Auto-login with device key
    ↓
User logged in ✅
    ↓
No broadcast sent
    ↓
Other tabs unaffected
```

### Multi-Tab Logout (Still Works)
```
Tab 1: User clicks logout
    ↓
Broadcast: { type: 'logout' }
    ↓
Tab 2: Receives logout
    ↓
Tab 2: Automatically logs out
    ↓
Tab 3: Receives logout
    ↓
Tab 3: Automatically logs out
```

---

## Testing

### ✅ Page Reload
1. Login to wallet
2. Reload page (F5 or Ctrl+R)
3. Should stay logged in
4. No logout
5. Balance loads correctly

### ✅ Multi-Tab Logout
1. Open Tab 1 (logged in)
2. Open Tab 2 (logged in)
3. Logout in Tab 1
4. Tab 2 should automatically logout
5. Both tabs redirect to onboarding

### ✅ New Tab
1. Login in Tab 1
2. Open new Tab 2
3. Tab 2 should auto-login independently
4. Both tabs work correctly

---

## Changes Made

### File: context/WalletContext.tsx

**Removed:**
```typescript
// In login() function
if (sessionChannelRef.current) {
  sessionChannelRef.current.postMessage({ type: 'login', address: res.address });
}

// In multi-tab sync useEffect
else if (event.data.type === 'login') {
  window.location.reload();
}
```

**Result:**
- Each tab auto-logins independently
- No reload loops
- No unnecessary broadcasts
- Simpler code

---

## Benefits

### Before Fix
- ❌ Page reload caused logout
- ❌ Reload loops in some cases
- ❌ Unnecessary tab reloads
- ❌ Poor user experience

### After Fix
- ✅ Page reload maintains session
- ✅ No reload loops
- ✅ Each tab independent
- ✅ Better user experience

---

## Multi-Tab Behavior

### Independent Auto-Login
Each tab now auto-logins independently when opened:

```
Tab 1:
- Opens → Auto-login → Works independently

Tab 2:
- Opens → Auto-login → Works independently

Tab 3:
- Opens → Auto-login → Works independently
```

### Synchronized Logout
Logout still synchronizes across all tabs:

```
Tab 1: Logout
    ↓
Broadcast to all tabs
    ↓
Tab 2: Auto-logout
Tab 3: Auto-logout
```

---

## Why This Works

### Independent Sessions
- Each tab has its own session state
- Each tab auto-logins from localStorage
- No need to sync login events
- Simpler and more reliable

### Shared Logout
- Logout is a security event
- Should affect all tabs
- Prevents orphaned sessions
- Maintains security

---

## Summary

**Problem:** Page reload caused logout  
**Cause:** Login broadcast triggered reload loop  
**Solution:** Remove login broadcast, keep logout broadcast  
**Result:** Page reload maintains session, logout still syncs

---

**Status:** ✅ Fixed  
**Date:** February 23, 2026  
**Impact:** All users  
**Breaking Changes:** None

Users can now reload the page without losing their session!
