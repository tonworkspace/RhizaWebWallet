# 🔄 Session Flow Diagram - Trust Wallet Style

## Visual Flow Comparison

### OLD SYSTEM (Session Timeout)
```
┌─────────────────────────────────────────────────────────────┐
│                     USER OPENS APP                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              CHECK FOR STORED SESSION                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    ┌───────┴───────┐
                    │               │
              Found?│               │Not Found
                    ↓               ↓
        ┌───────────────┐   ┌──────────────┐
        │  Encrypted?   │   │ Show Login   │
        └───────────────┘   │   Screen     │
                ↓           └──────────────┘
        ┌───────┴───────┐
        │               │
    Yes │               │ No
        ↓               ↓
┌──────────────┐  ┌──────────────┐
│ Require      │  │ Auto-Login   │
│ Password     │  │              │
└──────────────┘  └──────────────┘
        │               │
        └───────┬───────┘
                ↓
┌─────────────────────────────────────────────────────────────┐
│                    USER LOGGED IN                           │
│                  Start 15-min Timer                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   USER ACTIVITY                             │
│              (click, scroll, type, etc.)                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  RESET 15-MIN TIMER                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    (repeat cycle)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              13 MINUTES OF INACTIVITY                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│          ⚠️  WARNING: SESSION EXPIRING IN 2:00             │
│              [Stay Logged In] Button                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    ┌───────┴───────┐
                    │               │
          User      │               │ No Action
          Clicks    │               │
                    ↓               ↓
        ┌───────────────┐   ┌──────────────┐
        │ Reset Timer   │   │ AUTO-LOGOUT  │
        │ Continue      │   │ Redirect to  │
        │ Session       │   │ Onboarding   │
        └───────────────┘   └──────────────┘
```

### NEW SYSTEM (Persistent Session)
```
┌─────────────────────────────────────────────────────────────┐
│                     USER OPENS APP                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              CHECK FOR STORED SESSION                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    ┌───────┴───────┐
                    │               │
              Found?│               │Not Found
                    ↓               ↓
        ┌───────────────┐   ┌──────────────┐
        │ Generate      │   │ Show Login   │
        │ Device Key    │   │   Screen     │
        └───────────────┘   └──────────────┘
                ↓
        ┌───────────────┐
        │ Decrypt with  │
        │ Device Key    │
        └───────────────┘
                ↓
┌─────────────────────────────────────────────────────────────┐
│              ✅ AUTO-LOGIN SUCCESSFUL                       │
│                 Load Dashboard                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    USER LOGGED IN                           │
│                  ♾️  NO TIMEOUT                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   USE APP FREELY                            │
│              No warnings, No timeouts                       │
│              Stay logged in indefinitely                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    (use forever)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              USER CLICKS LOGOUT (Manual)                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              LOG ACTIVITY TO SUPABASE                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│          BROADCAST LOGOUT TO OTHER TABS                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              CLEAR SESSION & REDIRECT                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Multi-Tab Synchronization Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   TAB 1      │     │   TAB 2      │     │   TAB 3      │
│  (Logged In) │     │  (Logged In) │     │  (Logged In) │
└──────────────┘     └──────────────┘     └──────────────┘
        │                    │                    │
        │                    │                    │
        ↓                    │                    │
┌──────────────┐             │                    │
│ User Clicks  │             │                    │
│   LOGOUT     │             │                    │
└──────────────┘             │                    │
        │                    │                    │
        ↓                    │                    │
┌──────────────────────────────────────────────────────────┐
│         BroadcastChannel: 'rhiza_session_sync'           │
│              Message: { type: 'logout' }                 │
└──────────────────────────────────────────────────────────┘
        │                    │                    │
        ├────────────────────┼────────────────────┤
        ↓                    ↓                    ↓
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   LOGOUT     │     │   LOGOUT     │     │   LOGOUT     │
│   Tab 1      │     │   Tab 2      │     │   Tab 3      │
└──────────────┘     └──────────────┘     └──────────────┘
        │                    │                    │
        ↓                    ↓                    ↓
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Redirect    │     │  Redirect    │     │  Redirect    │
│ Onboarding   │     │ Onboarding   │     │ Onboarding   │
└──────────────┘     └──────────────┘     └──────────────┘
```

---

## Device-Based Encryption Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    FIRST TIME LOGIN                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              USER ENTERS MNEMONIC                           │
│         (24 words from wallet creation)                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│            GENERATE DEVICE FINGERPRINT                      │
│  ┌───────────────────────────────────────────────────┐     │
│  │ • navigator.userAgent                             │     │
│  │ • navigator.language                              │     │
│  │ • timezone offset                                 │     │
│  │ • screen.colorDepth                               │     │
│  │ • screen.width x screen.height                    │     │
│  │ • 'rhizacore_v1' (app salt)                       │     │
│  └───────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              HASH FINGERPRINT (SHA-256)                     │
│         Creates unique device-specific key                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│         ENCRYPT MNEMONIC WITH DEVICE KEY                    │
│              (AES-256-GCM encryption)                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              SAVE TO LOCALSTORAGE                           │
│  ┌───────────────────────────────────────────────────┐     │
│  │ rhiza_session: "encrypted_mnemonic_data"          │     │
│  │ rhiza_session_encrypted: "device"                 │     │
│  │ rhiza_session_created: "1234567890"               │     │
│  └───────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  ✅ SESSION SAVED                           │
└─────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│                  NEXT TIME USER OPENS APP                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│            LOAD FROM LOCALSTORAGE                           │
│         rhiza_session: "encrypted_data"                     │
│         rhiza_session_encrypted: "device"                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│         REGENERATE DEVICE FINGERPRINT                       │
│         (Same device = Same fingerprint)                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              HASH TO GET DEVICE KEY                         │
│         (Same fingerprint = Same key)                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│         DECRYPT MNEMONIC WITH DEVICE KEY                    │
│              ✅ Decryption Successful                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              INITIALIZE WALLET                              │
│              AUTO-LOGIN COMPLETE                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Session Activity Logging Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER LOGS IN                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              CREATE ACTIVITY LOG ENTRY                      │
│  ┌───────────────────────────────────────────────────┐     │
│  │ wallet_address: "EQ..."                           │     │
│  │ activity_type: "login"                            │     │
│  │ description: "User logged in"                     │     │
│  │ metadata: {                                       │     │
│  │   network: "testnet",                             │     │
│  │   timestamp: 1234567890,                          │     │
│  │   device: "Mozilla/5.0...",                       │     │
│  │   platform: "Win32"                               │     │
│  │ }                                                 │     │
│  └───────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              SAVE TO SUPABASE                               │
│         wallet_user_activity table                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              USER USES APP                                  │
│         (transactions, referrals, etc.)                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              USER LOGS OUT                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              CREATE ACTIVITY LOG ENTRY                      │
│  ┌───────────────────────────────────────────────────┐     │
│  │ wallet_address: "EQ..."                           │     │
│  │ activity_type: "logout"                           │     │
│  │ description: "User logged out"                    │     │
│  │ metadata: {                                       │     │
│  │   timestamp: 1234567890,                          │     │
│  │   device: "Mozilla/5.0..."                        │     │
│  │ }                                                 │     │
│  └───────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              SAVE TO SUPABASE                               │
│         wallet_user_activity table                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              VIEW IN ACTIVITY PAGE                          │
│         /wallet/activity                                    │
│  ┌───────────────────────────────────────────────────┐     │
│  │ February 23, 2026                                 │     │
│  │ ─────────────────────────────────────────────     │     │
│  │ 🔐 User logged in                                 │     │
│  │    2 hours ago                                    │     │
│  │    Device: Chrome on Windows                      │     │
│  │                                                   │     │
│  │ 🚪 User logged out                                │     │
│  │    5 minutes ago                                  │     │
│  │    Device: Chrome on Windows                      │     │
│  └───────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## Security Comparison

### OLD SYSTEM
```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                          │
├─────────────────────────────────────────────────────────────┤
│ 1. Password Encryption (Optional)                           │
│ 2. Session Timeout (15 minutes)                             │
│ 3. Activity Tracking (for timeout reset)                    │
│ 4. Manual Logout                                            │
└─────────────────────────────────────────────────────────────┘

Weaknesses:
❌ No multi-tab sync (orphaned sessions)
❌ No activity logging (no audit trail)
❌ Frequent interruptions (poor UX)
❌ Password required on restart (friction)
```

### NEW SYSTEM
```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                          │
├─────────────────────────────────────────────────────────────┤
│ 1. Device-Based Encryption (Automatic)                      │
│ 2. Device Fingerprint Binding                               │
│ 3. Multi-Tab Synchronization                                │
│ 4. Session Activity Logging                                 │
│ 5. Manual Logout (with broadcast)                           │
│ 6. Optional Password Encryption                             │
└─────────────────────────────────────────────────────────────┘

Strengths:
✅ Multi-tab sync (no orphaned sessions)
✅ Activity logging (complete audit trail)
✅ No interruptions (excellent UX)
✅ Auto-login (seamless experience)
✅ Device-specific (cannot transfer)
✅ More secure overall
```

---

## User Journey Comparison

### OLD SYSTEM - Daily Usage
```
Day 1:
08:00 - Open app → Enter password → Login
08:15 - Timeout warning → Click "Stay Logged In"
08:30 - Timeout warning → Click "Stay Logged In"
08:45 - Timeout warning → Click "Stay Logged In"
09:00 - Timeout warning → Click "Stay Logged In"
...
17:00 - Close app

Day 2:
08:00 - Open app → Enter password → Login
(repeat cycle)

Total Interruptions: ~30 per day
Total Password Entries: 1 per day
User Frustration: High 😤
```

### NEW SYSTEM - Daily Usage
```
Day 1:
08:00 - Open app → Auto-login ✅
08:00 - 17:00 - Use app freely
17:00 - Close app

Day 2:
08:00 - Open app → Auto-login ✅
08:00 - 17:00 - Use app freely
17:00 - Close app

Day 3-365:
Same seamless experience

Total Interruptions: 0
Total Password Entries: 0 (after initial setup)
User Satisfaction: Excellent 😊
```

---

**Status:** ✅ Complete  
**Date:** February 23, 2026  
**Visual Guide:** Trust Wallet-Style Session System
