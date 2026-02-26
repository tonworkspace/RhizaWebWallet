# Notification System Fix 🔔

## Issues Found and Fixed

### Issue 1: Wrong Method Name ❌
**Problem:** Code was calling `notificationService.sendNotification()` which doesn't exist  
**Fix:** Changed to `notificationService.createNotification()`  
**File:** `pages/CreateWallet.tsx`

### Issue 2: Wrong Parameter Structure ❌
**Problem:** Data was passed directly instead of in `data` property  
**Fix:** Wrapped data in `{ data: {...}, priority: 'high' }` structure  
**File:** `pages/CreateWallet.tsx`

### Issue 3: Missing Database Function ❌
**Problem:** `create_notification` database function may not exist  
**Fix:** Created SQL to check and create the function  
**File:** `check_notification_system.sql`

### Issue 4: No Notification for New Users ❌
**Problem:** Only referrer got notification, new user didn't  
**Fix:** Added welcome notification for new users  
**File:** `pages/CreateWallet.tsx`

---

## What Was Fixed

### 1. Referrer Notification (Fixed)

**Before:**
```typescript
await notificationService.sendNotification(  // ❌ Wrong method
  referrerProfile.data.wallet_address,
  'referral_signup',
  'New Referral Signup! 🎉',
  message,
  {  // ❌ Wrong structure
    referral_code: referralCode,
    bonus_amount: referralBonus.amount || 50
  }
);
```

**After:**
```typescript
await notificationService.createNotification(  // ✅ Correct method
  referrerProfile.data.wallet_address,
  'referral_signup',
  'New Referral Signup! 🎉',
  message,
  {  // ✅ Correct structure
    data: {
      referral_code: referralCode,
      new_user_address: walletAddress,
      bonus_amount: referralBonus.amount || 25,
      milestone_bonus: referralBonus.milestoneBonus || 0,
      milestone_reached: referralBonus.milestoneReached || false,
      total_bonus: totalBonus
    },
    priority: 'high'
  }
);
```

### 2. New User Welcome Notification (Added)

**New Code:**
```typescript
// Send welcome notification to new user
try {
  const { notificationService } = await import('../services/notificationService');
  await notificationService.createNotification(
    walletAddress,
    'welcome',
    'Welcome to Rhiza! 🎉',
    `Your wallet has been created successfully! You received ${signupBonus.amount} RZC as a welcome bonus.`,
    {
      data: {
        bonus_amount: signupBonus.amount,
        wallet_address: walletAddress
      },
      priority: 'high'
    }
  );
  console.log('📬 Welcome notification sent to new user');
} catch (notifError) {
  console.warn('⚠️ Failed to send welcome notification:', notifError);
}
```

---

## Database Setup Required

### Step 1: Check if notification system exists

Run this in Supabase SQL Editor:

```sql
-- Check if table exists
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'wallet_notifications';

-- Check if function exists
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'create_notification'
  AND routine_schema = 'public';
```

### Step 2: Create the notification function

```sql
CREATE OR REPLACE FUNCTION create_notification(
  p_wallet_address TEXT,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT '{}',
  p_priority TEXT DEFAULT 'normal',
  p_action_url TEXT DEFAULT NULL,
  p_action_label TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO wallet_notifications (
    wallet_address,
    type,
    title,
    message,
    data,
    priority,
    action_url,
    action_label,
    is_read,
    is_archived,
    created_at
  ) VALUES (
    p_wallet_address,
    p_type,
    p_title,
    p_message,
    p_data,
    p_priority,
    p_action_url,
    p_action_label,
    false,
    false,
    NOW()
  )
  RETURNING id INTO v_notification_id;

  RAISE NOTICE 'Created notification % for user %', v_notification_id, p_wallet_address;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_notification TO authenticated, anon, service_role;
```

### Step 3: Test the notification system

```sql
-- Test creating a notification
SELECT create_notification(
  'YOUR_WALLET_ADDRESS',
  'test',
  'Test Notification',
  'This is a test notification',
  jsonb_build_object('test', true),
  'normal',
  NULL,
  NULL
);

-- Check if it was created
SELECT * FROM wallet_notifications
WHERE type = 'test'
ORDER BY created_at DESC
LIMIT 1;
```

---

## Notification Flow After Fix

### Scenario 1: New User Signs Up (No Referral)

```
User creates wallet
         ↓
Profile created
         ↓
Signup bonus awarded (50 RZC)
         ↓
✅ Welcome notification sent to user
         ↓
"Welcome to Rhiza! 🎉
Your wallet has been created successfully! 
You received 50 RZC as a welcome bonus."
```

### Scenario 2: New User Signs Up (With Referral)

```
User creates wallet with referral code
         ↓
Profile created
         ↓
Signup bonus awarded to new user (50 RZC)
         ↓
✅ Welcome notification sent to new user
         ↓
Referral bonus awarded to referrer (25 RZC)
         ↓
✅ Referral notification sent to referrer
         ↓
Referrer sees:
"New Referral Signup! 🎉
Someone just joined using your referral link! 
You earned 25 RZC."
```

### Scenario 3: Milestone Reached

```
User signs up with referral code
         ↓
Referrer reaches milestone (e.g., 10 referrals)
         ↓
Base bonus awarded (25 RZC)
         ↓
Milestone bonus awarded (250 RZC)
         ↓
✅ Enhanced notification sent to referrer
         ↓
Referrer sees:
"New Referral Signup! 🎉
Someone just joined using your referral link! 
You earned 25 RZC. Plus 250 RZC milestone bonus! 🎉"
```

---

## Notification Types

| Type | When Sent | Recipient | Priority |
|------|-----------|-----------|----------|
| `welcome` | Wallet created | New user | High |
| `referral_signup` | Someone uses referral code | Referrer | High |
| `milestone` | Milestone reached | Referrer | High |
| `transaction` | Transaction completed | User | Normal |
| `system` | System updates | All users | Normal |

---

## Testing the Fix

### Test 1: Check Database Function
```sql
-- Run in Supabase SQL Editor
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'create_notification';
```
**Expected:** Should return `create_notification`

### Test 2: Create Test Notification
```sql
SELECT create_notification(
  'YOUR_WALLET_ADDRESS',
  'test',
  'Test',
  'Testing notifications',
  '{}'::jsonb
);
```
**Expected:** Should return a UUID

### Test 3: Check Notifications Table
```sql
SELECT * FROM wallet_notifications
ORDER BY created_at DESC
LIMIT 5;
```
**Expected:** Should see your test notification

### Test 4: New User Signup
1. Create a new wallet
2. Check console for: "📬 Welcome notification sent to new user"
3. Go to Notifications page
4. Should see welcome notification

### Test 5: Referral Signup
1. Share your referral link
2. Have someone sign up
3. Check console for: "📬 Notification sent to referrer"
4. Go to Notifications page
5. Should see referral notification

---

## Console Messages to Watch For

### On Successful Notification:
```
📬 Welcome notification sent to new user
📬 Notification sent to referrer
```

### On Notification Failure:
```
⚠️ Failed to send welcome notification: [error]
⚠️ Failed to send notification: [error]
```

### Common Errors:
- "function create_notification does not exist" → Run Step 2 SQL
- "relation wallet_notifications does not exist" → Check database schema
- "permission denied" → Check function permissions

---

## Files Modified

1. ✅ `pages/CreateWallet.tsx`
   - Fixed method name: `sendNotification` → `createNotification`
   - Fixed parameter structure
   - Added welcome notification for new users
   - Updated bonus amounts to 25 RZC

2. ✅ `check_notification_system.sql` (NEW)
   - Check notification table
   - Check/create notification function
   - Test queries

---

## Notification Display

Notifications appear in:
1. **Notifications Page** (`pages/Notifications.tsx`)
2. **Notification Center** (`components/NotificationCenter.tsx`)
3. **Bell Icon** (shows unread count)

---

## Summary

### What Was Broken:
❌ Wrong method name (`sendNotification` doesn't exist)  
❌ Wrong parameter structure  
❌ Missing database function  
❌ No notification for new users  

### What's Fixed:
✅ Correct method name (`createNotification`)  
✅ Correct parameter structure  
✅ SQL to create database function  
✅ Welcome notification for new users  
✅ Referral notification for referrers  
✅ Milestone notifications  

### Next Steps:
1. Run `check_notification_system.sql` in Supabase
2. Create the `create_notification` function
3. Test with new wallet creation
4. Verify notifications appear in UI

**Status:** Code fixed, needs database function setup! 🚀
