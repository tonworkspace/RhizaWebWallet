# Notifications Ready - Run This! 🔔

## The Issue Was: Invalid Notification Types

The database only allows specific notification types. I've fixed all the code to use valid types.

---

## What I Fixed

✅ Changed `'welcome'` → `'reward_claimed'` (for new users)  
✅ Changed `'referral_signup'` → `'referral_joined'` (for referrers)  
✅ Changed `'test'` → `'system_announcement'` (for testing)  
✅ Updated all SQL files  
✅ Updated CreateWallet.tsx

---

## Run This Now (Works!)

Copy and paste into Supabase SQL Editor:

```sql
-- Create notification function
CREATE OR REPLACE FUNCTION create_notification(
  p_wallet_address TEXT, p_type TEXT, p_title TEXT, p_message TEXT,
  p_data JSONB DEFAULT '{}', p_priority TEXT DEFAULT 'normal',
  p_action_url TEXT DEFAULT NULL, p_action_label TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE v_notification_id UUID;
BEGIN
  INSERT INTO wallet_notifications (wallet_address, type, title, message, data, priority, action_url, action_label, is_read, is_archived, created_at)
  VALUES (p_wallet_address, p_type, p_title, p_message, p_data, p_priority, p_action_url, p_action_label, false, false, NOW())
  RETURNING id INTO v_notification_id;
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_notification TO authenticated, anon, service_role;

-- Test it (using valid type)
SELECT create_notification(
  'EQAie1sT4_ng9saBvIZsoOfWwsPqZmL-2BtoOCubI1x4',
  'system_announcement',
  'Test Notification',
  'Notification system is working!',
  '{"test": true}'::jsonb,
  'normal',
  NULL,
  NULL
);

-- Verify it worked
SELECT id, type, title, message, created_at
FROM wallet_notifications
WHERE type = 'system_announcement'
ORDER BY created_at DESC
LIMIT 1;
```

---

## Valid Notification Types

Only these types work:

- `transaction_received` - Incoming payment
- `transaction_sent` - Outgoing payment
- `transaction_confirmed` - Transaction confirmed
- `transaction_failed` - Transaction failed
- `referral_earned` - You earned referral bonus
- `referral_joined` - Someone used your code ✅ (we use this)
- `reward_claimed` - Reward received ✅ (we use this)
- `system_announcement` - System message ✅ (for testing)
- `security_alert` - Security warning
- `achievement_unlocked` - Milestone reached

---

## What Notifications Work Now

### 1. New User Creates Wallet
**Type:** `reward_claimed`  
**Title:** "Welcome to Rhiza! 🎉"  
**Message:** "Your wallet has been created successfully! You received 50 RZC as a welcome bonus."

### 2. Someone Uses Your Referral Code
**Type:** `referral_joined`  
**Title:** "New Referral Signup! 🎉"  
**Message:** "Someone just joined using your referral link! You earned 25 RZC."

### 3. Milestone Reached
**Type:** `referral_joined`  
**Title:** "New Referral Signup! 🎉"  
**Message:** "Someone just joined using your referral link! You earned 25 RZC. Plus 250 RZC milestone bonus! 🎉"

---

## Test It

### After running the SQL above:

1. **Check function exists:**
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'create_notification';
```
Should return: `create_notification`

2. **Check test notification:**
```sql
SELECT * FROM wallet_notifications
WHERE type = 'system_announcement'
ORDER BY created_at DESC
LIMIT 1;
```
Should show your test notification

3. **Create new wallet:**
- Should see: "📬 Welcome notification sent to new user"
- Check Notifications page - should see welcome message

4. **Use referral code:**
- Should see: "📬 Notification sent to referrer"
- Referrer checks Notifications page - should see referral message

---

## Summary

**Problem:** Invalid notification types caused constraint violation  
**Solution:** Updated all code to use valid types  
**Status:** Ready to run! ✅

**Action:** Copy the SQL above and run it in Supabase. Done! 🚀
