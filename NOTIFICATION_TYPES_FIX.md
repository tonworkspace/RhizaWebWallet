# Notification Types - Fixed! ✅

## The Problem

The database has a CHECK constraint that only allows specific notification types. Using invalid types like `'test'` or `'welcome'` causes this error:

```
ERROR: new row for relation "wallet_notifications" violates check constraint "wallet_notifications_type_check"
```

---

## Allowed Notification Types

Based on `services/notificationService.ts`, these are the ONLY valid types:

| Type | Use Case | When to Use |
|------|----------|-------------|
| `transaction_received` | Incoming transaction | When user receives TON/tokens |
| `transaction_sent` | Outgoing transaction | When user sends TON/tokens |
| `transaction_confirmed` | Transaction confirmed | When transaction is confirmed on blockchain |
| `transaction_failed` | Transaction failed | When transaction fails |
| `referral_earned` | Referral bonus earned | When referrer earns RZC from referral |
| `referral_joined` | Someone joined via referral | When new user signs up with referral code |
| `reward_claimed` | Reward claimed | When user claims any reward/bonus |
| `system_announcement` | System message | For system updates, maintenance, etc. |
| `security_alert` | Security warning | For security-related notifications |
| `achievement_unlocked` | Achievement earned | When user reaches milestone |

---

## Code Changes Applied

### 1. Welcome Notification (New Users)
**Changed from:** `'welcome'` ❌  
**Changed to:** `'reward_claimed'` ✅

```typescript
await notificationService.createNotification(
  walletAddress,
  'reward_claimed',  // ✅ Valid type
  'Welcome to Rhiza! 🎉',
  `Your wallet has been created successfully! You received ${signupBonus.amount} RZC as a welcome bonus.`,
  {
    data: {
      bonus_amount: signupBonus.amount,
      wallet_address: walletAddress,
      bonus_type: 'signup'
    },
    priority: 'high'
  }
);
```

### 2. Referral Notification (Referrers)
**Changed from:** `'referral_signup'` ❌  
**Changed to:** `'referral_joined'` ✅

```typescript
await notificationService.createNotification(
  referrerProfile.data.wallet_address,
  'referral_joined',  // ✅ Valid type
  'New Referral Signup! 🎉',
  message,
  {
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

### 3. Test Notifications (SQL)
**Changed from:** `'test'` ❌  
**Changed to:** `'system_announcement'` ✅

```sql
SELECT create_notification(
  'WALLET_ADDRESS',
  'system_announcement',  -- ✅ Valid type
  'Test Notification',
  'This is a test notification',
  jsonb_build_object('test', true),
  'normal',
  NULL,
  NULL
);
```

---

## Recommended Type Mapping

Use these types for common scenarios:

| Scenario | Type to Use | Example Title |
|----------|-------------|---------------|
| New wallet created | `reward_claimed` | "Welcome to Rhiza! 🎉" |
| Signup bonus awarded | `reward_claimed` | "Welcome Bonus Received!" |
| Referral bonus earned | `referral_earned` | "Referral Bonus Earned!" |
| Someone used your code | `referral_joined` | "New Referral Signup!" |
| Milestone reached | `achievement_unlocked` | "Milestone Achieved! 🎉" |
| Daily login bonus | `reward_claimed` | "Daily Bonus Claimed!" |
| System update | `system_announcement` | "System Update" |
| Security issue | `security_alert` | "Security Alert" |
| Transaction sent | `transaction_sent` | "Transaction Sent" |
| Transaction received | `transaction_received` | "Payment Received" |

---

## Files Updated

1. ✅ `pages/CreateWallet.tsx`
   - Welcome notification: `'welcome'` → `'reward_claimed'`
   - Referral notification: `'referral_signup'` → `'referral_joined'`

2. ✅ `SETUP_NOTIFICATIONS_NOW.sql`
   - Test notification: `'test'` → `'system_announcement'`

3. ✅ `NOTIFICATION_TYPES_FIX.md` (NEW)
   - This documentation

---

## Testing with Correct Types

### Test 1: Create Test Notification
```sql
SELECT create_notification(
  'YOUR_WALLET_ADDRESS',
  'system_announcement',
  'Test Notification',
  'Testing the notification system',
  jsonb_build_object('test', true),
  'normal',
  NULL,
  NULL
);
```

### Test 2: Check Notifications
```sql
SELECT 
  id,
  wallet_address,
  type,
  title,
  message,
  created_at
FROM wallet_notifications
WHERE wallet_address = 'YOUR_WALLET_ADDRESS'
ORDER BY created_at DESC
LIMIT 5;
```

### Test 3: New User Signup
1. Create a new wallet
2. Check console: "📬 Welcome notification sent to new user"
3. Check database:
```sql
SELECT * FROM wallet_notifications
WHERE type = 'reward_claimed'
  AND title LIKE '%Welcome%'
ORDER BY created_at DESC
LIMIT 1;
```

### Test 4: Referral Signup
1. Have someone use your referral code
2. Check console: "📬 Notification sent to referrer"
3. Check database:
```sql
SELECT * FROM wallet_notifications
WHERE type = 'referral_joined'
ORDER BY created_at DESC
LIMIT 1;
```

---

## Database Constraint

The constraint is defined in the database schema:

```sql
CHECK (type IN (
  'transaction_received',
  'transaction_sent',
  'transaction_confirmed',
  'transaction_failed',
  'referral_earned',
  'referral_joined',
  'reward_claimed',
  'system_announcement',
  'security_alert',
  'achievement_unlocked'
))
```

**Important:** You can only use these exact types. Any other type will fail with a constraint violation error.

---

## Summary

**Problem:** Used invalid notification types (`'test'`, `'welcome'`, `'referral_signup'`)

**Solution:** Changed to valid types:
- `'welcome'` → `'reward_claimed'`
- `'referral_signup'` → `'referral_joined'`
- `'test'` → `'system_announcement'`

**Status:** All code updated with correct types ✅

**Next Step:** Run `SETUP_NOTIFICATIONS_NOW.sql` - it will now work! 🚀
