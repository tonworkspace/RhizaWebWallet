# Notification Center Setup & Testing Guide

## Changes Made

### 1. Fixed NotificationCenter.tsx
Updated to use the correct wallet address from `userProfile.wallet_address` instead of just `address`.

**Key Changes:**
- Added `userProfile` to the useWallet hook
- Created `walletAddress` variable that prioritizes `userProfile.wallet_address`
- Added console logging for debugging
- Updated all notification service calls to use `walletAddress`

### 2. Created Test Scripts

**SQL Test:** `test_notification_system.sql`
- Checks if notification table exists
- Verifies notification functions
- Creates test notifications
- Shows notification breakdown by type

**Browser Test:** `test_notification_center.js`
- Tests notification bell UI
- Checks wallet context
- Verifies panel opens/closes
- Provides debugging information

## How to Verify Notifications Are Working

### Step 1: Check Database Setup

Run in Supabase SQL Editor:
```sql
-- Quick check
SELECT COUNT(*) as total_notifications
FROM wallet_notifications;

-- Check for your wallet
SELECT *
FROM wallet_notifications
WHERE wallet_address = 'YOUR_WALLET_ADDRESS'
ORDER BY created_at DESC
LIMIT 5;
```

If the table doesn't exist, run: `SETUP_NOTIFICATIONS_NOW.sql`

### Step 2: Create a Test Notification

```sql
SELECT create_notification(
  'YOUR_WALLET_ADDRESS',
  'system_announcement',
  'Test Notification',
  'This is a test to verify notifications are working',
  jsonb_build_object('test', true),
  'normal',
  '/wallet/dashboard',
  'View Dashboard'
);
```

### Step 3: Test in Browser

1. Open your app and log in
2. Open browser console (F12)
3. Look for these log messages:
   ```
   🔄 Initial notification fetch for: EQA...
   ✅ Fetched notifications: X
   📡 Subscribing to real-time notifications for: EQA...
   ```

4. Click the notification bell icon
5. You should see the test notification

### Step 4: Run Browser Test

1. Copy contents of `test_notification_center.js`
2. Paste in browser console
3. Run: `await testNotificationCenter()`
4. Check the output for any errors

## Common Issues & Solutions

### Issue 1: "No wallet address available"
**Symptom:** Console shows `⚠️ No wallet address available for notifications`

**Solution:**
- Make sure you're logged in
- Check that `userProfile` is loaded in WalletContext
- Verify wallet_address is set in the database

### Issue 2: "wallet_notifications table not found"
**Symptom:** Error about missing table or relation

**Solution:**
```sql
-- Run this in Supabase SQL Editor
-- (from SETUP_NOTIFICATIONS_NOW.sql)
CREATE TABLE IF NOT EXISTS wallet_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES wallet_users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  priority TEXT DEFAULT 'normal',
  action_url TEXT,
  action_label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);
```

### Issue 3: "Permission denied" or RLS errors
**Symptom:** Can't read notifications even though they exist

**Solution:**
```sql
-- Enable RLS
ALTER TABLE wallet_notifications ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own notifications
CREATE POLICY "Users can read own notifications"
  ON wallet_notifications FOR SELECT
  USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Allow users to update their own notifications
CREATE POLICY "Users can update own notifications"
  ON wallet_notifications FOR UPDATE
  USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');
```

### Issue 4: No notifications appear
**Symptom:** Bell icon shows but no notifications in panel

**Possible Causes:**
1. No notifications created yet → Create test notification (Step 2)
2. Wrong wallet address → Check console logs
3. Notifications are archived → Check `is_archived` field
4. RLS blocking access → Check policies (Issue 3)

## Testing Real-Time Notifications

### Method 1: SQL Insert
```sql
-- In Supabase SQL Editor
SELECT create_notification(
  'YOUR_WALLET_ADDRESS',
  'referral_earned',
  'New Referral Bonus!',
  'You earned 25 RZC from a referral',
  jsonb_build_object('amount', 25, 'type', 'referral'),
  'high',
  '/wallet/referral',
  'View Referrals'
);
```

The notification should appear immediately without refreshing!

### Method 2: Trigger from App
When certain actions happen (like claiming rewards), notifications should be created automatically.

## Notification Types

The system supports these notification types:

| Type | Icon | Use Case |
|------|------|----------|
| `transaction_received` | 💰 | When user receives TON/tokens |
| `transaction_sent` | 📤 | When user sends TON/tokens |
| `transaction_confirmed` | ✅ | When transaction confirms |
| `transaction_failed` | ❌ | When transaction fails |
| `referral_earned` | 🎁 | When user earns referral bonus |
| `referral_joined` | 👥 | When someone joins via referral |
| `reward_claimed` | 🏆 | When user claims rewards |
| `system_announcement` | 📢 | System-wide announcements |
| `security_alert` | 🔒 | Security-related alerts |
| `achievement_unlocked` | 🎖️ | When user unlocks achievement |

## Integration with Other Features

### Referral System
When a referral bonus is awarded, create a notification:
```typescript
await notificationService.createNotification(
  referrerWalletAddress,
  'referral_earned',
  'Referral Bonus Earned!',
  `You earned ${amount} RZC from ${referredUserName}`,
  {
    amount,
    referred_user_id: referredUserId,
    referred_user_name: referredUserName
  },
  'high',
  '/wallet/referral',
  'View Referrals'
);
```

### Transaction Monitoring
When a transaction completes:
```typescript
await notificationService.createNotification(
  userWalletAddress,
  'transaction_confirmed',
  'Transaction Confirmed',
  `Your transaction of ${amount} TON was confirmed`,
  {
    transaction_hash: txHash,
    amount,
    type: 'send'
  },
  'normal',
  '/wallet/history',
  'View History'
);
```

## Debugging Checklist

- [ ] Notification table exists in Supabase
- [ ] RLS policies are configured
- [ ] User is logged in with wallet
- [ ] Console shows wallet address
- [ ] Console shows "Fetched notifications: X"
- [ ] Test notification created successfully
- [ ] Bell icon appears in header
- [ ] Clicking bell opens panel
- [ ] Notifications display in panel
- [ ] Real-time subscription active

## Next Steps

1. Run `test_notification_system.sql` to verify database setup
2. Create a test notification
3. Reload your app and check the notification bell
4. Run `test_notification_center.js` in browser console
5. Check console for any error messages
6. If issues persist, check the Common Issues section above

The notification system should now be fully functional!
