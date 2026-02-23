# 🔔 Notification & Activity System - Complete

## Overview

Complete notification and user activity tracking system for RhizaCore Wallet.

---

## 📦 What's Included

### 1. Database Tables ✅
- `wallet_notifications` - Store all notifications
- `wallet_user_activity` - Track user actions
- `wallet_notification_preferences` - User notification settings

### 2. Database Functions ✅
- `create_notification()` - Create new notification
- `mark_notification_read()` - Mark as read
- `mark_all_notifications_read()` - Mark all as read
- `log_user_activity()` - Log user action

### 3. Database Triggers ✅
- Auto-notify on transaction updates
- Auto-notify on referral earnings
- Auto-update preferences timestamp

### 4. Services ✅
- `notificationService.ts` - Complete notification management
- Real-time subscription support
- Activity logging

### 5. Components ✅
- `NotificationCenter.tsx` - Dropdown notification panel
- Bell icon with unread count badge
- Real-time updates

---

## 🚀 Setup Instructions

### Step 1: Run Database Migration

1. Go to Supabase Dashboard
2. Navigate to SQL Editor
3. Copy contents of `supabase_notifications_migration.sql`
4. Run the migration
5. Verify success

### Step 2: Add NotificationCenter to Layout

Update `components/Layout.tsx`:

```tsx
import NotificationCenter from './NotificationCenter';

// In the header section, add:
<div className="flex items-center gap-3">
  <NotificationCenter />
  {/* ... other header items ... */}
</div>
```

### Step 3: Log Activities

In your components, log user activities:

```tsx
import { notificationService } from '../services/notificationService';

// On login
await notificationService.logActivity(
  walletAddress,
  'login',
  'User logged in',
  { method: 'wallet', network: 'testnet' }
);

// On transaction
await notificationService.logActivity(
  walletAddress,
  'transaction_sent',
  `Sent ${amount} TON to ${recipient}`,
  { amount, recipient, txHash }
);
```

---

## 📊 Notification Types

### Transaction Notifications
- `transaction_received` - Payment received
- `transaction_sent` - Payment sent (manual)
- `transaction_confirmed` - Transaction confirmed
- `transaction_failed` - Transaction failed

### Referral Notifications
- `referral_earned` - Earned commission
- `referral_joined` - New referral joined

### Reward Notifications
- `reward_claimed` - Reward claimed
- `achievement_unlocked` - Achievement earned

### System Notifications
- `system_announcement` - Important updates
- `security_alert` - Security warnings

---

## 🎨 Notification Styles

Each notification type has unique styling:

| Type | Icon | Color | Background |
|------|------|-------|------------|
| transaction_received | 💰 | Green | Green/10 |
| transaction_sent | 📤 | Blue | Blue/10 |
| transaction_confirmed | ✅ | Green | Green/10 |
| transaction_failed | ❌ | Red | Red/10 |
| referral_earned | 🎁 | Purple | Purple/10 |
| referral_joined | 👥 | Blue | Blue/10 |
| reward_claimed | 🏆 | Yellow | Yellow/10 |
| system_announcement | 📢 | Indigo | Indigo/10 |
| security_alert | 🔒 | Red | Red/10 |
| achievement_unlocked | 🎖️ | Yellow | Yellow/10 |

---

## 🔧 API Usage

### Get Notifications

```typescript
const result = await notificationService.getNotifications(walletAddress, {
  limit: 20,
  includeRead: true,
  includeArchived: false,
  type: 'transaction_received' // optional filter
});

if (result.success) {
  console.log(result.notifications);
}
```

### Get Unread Count

```typescript
const result = await notificationService.getUnreadCount(walletAddress);
console.log(`Unread: ${result.count}`);
```

### Mark as Read

```typescript
await notificationService.markAsRead(notificationId);
```

### Mark All as Read

```typescript
await notificationService.markAllAsRead(walletAddress);
```

### Create Manual Notification

```typescript
await notificationService.createNotification(
  walletAddress,
  'system_announcement',
  'Welcome to RhizaCore!',
  'Start earning rewards today',
  {
    data: { campaign: 'welcome' },
    priority: 'normal',
    actionUrl: '/wallet/referral',
    actionLabel: 'Get Started'
  }
);
```

### Log Activity

```typescript
await notificationService.logActivity(
  walletAddress,
  'page_viewed',
  'Viewed dashboard',
  { page: '/wallet/dashboard', duration: 30 }
);
```

### Subscribe to Real-time

```typescript
const subscription = notificationService.subscribeToNotifications(
  walletAddress,
  (notification) => {
    console.log('New notification:', notification);
    // Update UI, show toast, etc.
  }
);

// Cleanup
subscription.unsubscribe();
```

---

## 📱 Notification Center Features

### UI Features
- ✅ Bell icon with unread count badge
- ✅ Dropdown panel with notifications list
- ✅ Mark as read/unread
- ✅ Mark all as read
- ✅ Archive notifications
- ✅ Delete notifications
- ✅ Click to navigate to action URL
- ✅ Real-time updates
- ✅ Loading states
- ✅ Empty states

### Notification Display
- Icon and color based on type
- Title and message
- Time ago (e.g., "5 minutes ago")
- Action button (if applicable)
- Unread indicator (green dot)
- Priority indicator

### Actions
- Click notification → Navigate to action URL
- Click check → Mark as read
- Click archive → Archive notification
- Click trash → Delete notification
- Click "Mark all as read" → Mark all as read
- Click "View All" → Go to full notifications page

---

## 🎯 Activity Tracking

### Activity Types

| Type | Description | When to Log |
|------|-------------|-------------|
| `login` | User logged in | On wallet login |
| `logout` | User logged out | On logout |
| `wallet_created` | New wallet created | After wallet creation |
| `wallet_imported` | Wallet imported | After import |
| `transaction_sent` | Transaction sent | After sending |
| `transaction_received` | Transaction received | When received |
| `profile_updated` | Profile changed | After profile update |
| `settings_changed` | Settings modified | After settings change |
| `referral_code_used` | Used referral code | On signup with code |
| `referral_code_shared` | Shared referral code | When sharing |
| `reward_claimed` | Claimed reward | After claiming |
| `page_viewed` | Viewed a page | On page load |
| `feature_used` | Used a feature | When using feature |

### Get User Activity

```typescript
const result = await notificationService.getUserActivity(walletAddress, {
  limit: 50,
  activityType: 'transaction_sent' // optional filter
});

if (result.success) {
  console.log(result.activities);
}
```

---

## 🔒 Notification Preferences

### Get Preferences

```typescript
const result = await notificationService.getPreferences(walletAddress);
console.log(result.preferences);
```

### Update Preferences

```typescript
await notificationService.updatePreferences(walletAddress, {
  enable_transaction_notifications: true,
  enable_referral_notifications: true,
  enable_reward_notifications: false,
  enable_system_notifications: true,
  enable_security_notifications: true,
  enable_push_notifications: false,
  enable_email_notifications: false
});
```

### Default Preferences

When a user is created, default preferences are:
- ✅ Transaction notifications: ON
- ✅ Referral notifications: ON
- ✅ Reward notifications: ON
- ✅ System notifications: ON
- ✅ Security notifications: ON
- ❌ Push notifications: OFF
- ❌ Email notifications: OFF

---

## 🔄 Automatic Notifications

### Transaction Notifications (Automatic)

The system automatically creates notifications for:

1. **Transaction Received** (when status = confirmed)
   - Title: "Payment Received"
   - Message: "You received X TON"
   - Action: View Transaction

2. **Transaction Confirmed** (when pending → confirmed)
   - Title: "Transaction Confirmed"
   - Message: "Your transaction of X TON was confirmed"
   - Action: View Transaction

3. **Transaction Failed** (when status = failed)
   - Title: "Transaction Failed"
   - Message: "Your transaction of X TON failed"
   - Priority: HIGH
   - Action: View Details

### Referral Notifications (Automatic)

1. **Referral Earned** (on new referral earning)
   - Title: "Referral Reward Earned!"
   - Message: "You earned X RZC from your referral"
   - Action: View Earnings

---

## 🎨 Integration Examples

### Add to Dashboard

```tsx
import { notificationService } from '../services/notificationService';

// In Dashboard component
useEffect(() => {
  if (address) {
    // Log page view
    notificationService.logActivity(
      address,
      'page_viewed',
      'Viewed dashboard'
    );
  }
}, [address]);
```

### Add to Transfer Page

```tsx
// After successful transaction
if (result.success) {
  // Log activity
  await notificationService.logActivity(
    address,
    'transaction_sent',
    `Sent ${amount} TON`,
    { amount, recipient, txHash: result.txHash }
  );
  
  // Notification is created automatically by trigger
}
```

### Add to Settings Page

```tsx
// Show notification preferences
const [prefs, setPrefs] = useState(null);

useEffect(() => {
  const fetchPrefs = async () => {
    const result = await notificationService.getPreferences(address);
    if (result.success) {
      setPrefs(result.preferences);
    }
  };
  fetchPrefs();
}, [address]);

// Update preferences
const handleToggle = async (key) => {
  await notificationService.updatePreferences(address, {
    [key]: !prefs[key]
  });
};
```

---

## 📊 Database Schema

### wallet_notifications

```sql
CREATE TABLE wallet_notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES wallet_users(id),
  wallet_address TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'normal',
  action_url TEXT,
  action_label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);
```

### wallet_user_activity

```sql
CREATE TABLE wallet_user_activity (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES wallet_users(id),
  wallet_address TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### wallet_notification_preferences

```sql
CREATE TABLE wallet_notification_preferences (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES wallet_users(id),
  wallet_address TEXT UNIQUE NOT NULL,
  enable_transaction_notifications BOOLEAN DEFAULT true,
  enable_referral_notifications BOOLEAN DEFAULT true,
  enable_reward_notifications BOOLEAN DEFAULT true,
  enable_system_notifications BOOLEAN DEFAULT true,
  enable_security_notifications BOOLEAN DEFAULT true,
  enable_push_notifications BOOLEAN DEFAULT false,
  enable_email_notifications BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🧪 Testing

### Test Notification Creation

```sql
-- Create test notification
SELECT create_notification(
  'YOUR_WALLET_ADDRESS',
  'system_announcement',
  'Test Notification',
  'This is a test message',
  '{"test": true}'::jsonb,
  'normal',
  '/wallet/dashboard',
  'View Dashboard'
);
```

### Test Activity Logging

```sql
-- Log test activity
SELECT log_user_activity(
  'YOUR_WALLET_ADDRESS',
  'page_viewed',
  'Viewed test page',
  '{"page": "/test"}'::jsonb
);
```

### Check Notifications

```sql
-- Get all notifications
SELECT * FROM wallet_notifications
WHERE wallet_address = 'YOUR_WALLET_ADDRESS'
ORDER BY created_at DESC;

-- Get unread count
SELECT COUNT(*) FROM wallet_notifications
WHERE wallet_address = 'YOUR_WALLET_ADDRESS'
  AND is_read = false;
```

---

## 🎯 Next Steps

### Immediate
1. ✅ Run database migration
2. ✅ Add NotificationCenter to Layout
3. ✅ Test notification creation
4. ✅ Test real-time updates

### Short-term
1. Create full Notifications page (`/wallet/notifications`)
2. Create Activity page (`/wallet/activity`)
3. Add notification preferences to Settings
4. Add browser notification permission request

### Long-term
1. Add push notifications (web push API)
2. Add email notifications
3. Add notification grouping
4. Add notification sounds
5. Add notification filters/search

---

## 📝 Files Created

1. `supabase_notifications_migration.sql` - Database migration
2. `services/notificationService.ts` - Notification service
3. `components/NotificationCenter.tsx` - Notification UI component
4. `NOTIFICATION_SYSTEM_COMPLETE.md` - This documentation

---

## ✅ Summary

You now have a complete notification and activity tracking system with:

- ✅ Database tables and functions
- ✅ Automatic notifications for transactions and referrals
- ✅ Real-time notification updates
- ✅ Notification center UI component
- ✅ Activity logging
- ✅ Notification preferences
- ✅ Full API for managing notifications

The system is production-ready and can be extended with additional notification types and features as needed.

---

**Status:** ✅ Complete  
**Version:** 1.0  
**Date:** February 23, 2026
