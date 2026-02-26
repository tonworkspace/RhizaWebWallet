# Fix Referral Issues - Action Plan 🔧

## Issues Identified

Based on your screenshot:

1. ✅ **Referral count works** - Shows "1" total referral
2. ❌ **Downline not showing** - Shows "0 Members" despite having 1 referral
3. ❌ **No notifications** - Referrer not getting notification when someone signs up
4. ❌ **Active rate shows 0%** - Because downline is empty

---

## Issue 1: Downline Not Showing Users

### Root Cause
The `getDownline()` query is not returning the referred user even though the count is correct.

### Diagnostic Steps

**Step 1: Check Database**
Run this in Supabase SQL Editor:

```sql
-- Replace with your actual user ID
SELECT 
  u.id,
  u.name,
  u.wallet_address,
  r.referral_code,
  r.total_referrals,
  r.referrer_id
FROM wallet_users u
JOIN wallet_referrals r ON u.id = r.user_id
WHERE u.wallet_address = 'YOUR_WALLET_ADDRESS';
```

Note your `user_id` from the results.

**Step 2: Check Downline Records**
```sql
-- Replace USER_ID_HERE with your user ID from Step 1
SELECT 
  r.id,
  r.user_id,
  r.referrer_id,
  r.referral_code,
  r.total_referrals,
  r.created_at,
  u.name,
  u.wallet_address
FROM wallet_referrals r
LEFT JOIN wallet_users u ON r.user_id = u.id
WHERE r.referrer_id = 'USER_ID_HERE';
```

**Expected Result:** Should show 1 row with the referred user

**If returns 0 rows:** The referral relationship is not properly stored in the database.

**If returns 1 row:** The `getDownline()` function is not working correctly.

---

### Fix Option 1: Verify getDownline() Implementation

Check if the fix was applied to `services/supabaseService.ts`:

```typescript
async getDownline(userId: string): Promise<{
  success: boolean;
  data?: Array<UserProfile & { total_referrals?: number; rzc_earned?: number }>;
  error?: string;
}> {
  if (!this.client) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    console.log('🔍 Fetching downline for user:', userId);

    // Get all referral records where this user is the referrer
    const { data: referralData, error: refError } = await this.client
      .from('wallet_referrals')
      .select('user_id, total_referrals, created_at')
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false });

    if (refError) throw refError;

    if (!referralData || referralData.length === 0) {
      console.log('ℹ️ No downline members found');
      return { success: true, data: [] };
    }

    console.log(`📊 Found ${referralData.length} referral records`);

    // Get user details for each downline member
    const userIds = referralData.map(r => r.user_id);
    const { data: userData, error: userError } = await this.client
      .from('wallet_users')
      .select('*')
      .in('id', userIds);

    if (userError) throw userError;

    console.log(`📊 Found ${userData?.length || 0} user records`);

    // Combine the data
    const transformedData = referralData.map((ref: any) => {
      const user = userData?.find((u: any) => u.id === ref.user_id);
      if (!user) {
        console.warn(`⚠️ User not found for referral record:`, ref.user_id);
        return null;
      }
      return {
        ...user,
        total_referrals: ref.total_referrals,
        rzc_earned: (user?.rzc_balance || 0) - 100
      };
    }).filter(item => item !== null);

    console.log(`✅ Found ${transformedData.length} downline members`);
    return { success: true, data: transformedData };
  } catch (error: any) {
    console.error('❌ Get downline error:', error);
    return { success: false, error: error.message };
  }
}
```

---

### Fix Option 2: Check Browser Console

1. Open Referral page
2. Open browser console (F12)
3. Click the refresh button
4. Look for these logs:

```
🔄 Loading referral network for user: [USER_ID]
🔍 Fetching downline for user: [USER_ID]
📊 Found X referral records
📊 Found X user records
✅ Found X downline members
```

**If you see "Found 0 referral records":**
- The database doesn't have the referral relationship
- Need to fix the signup process

**If you see "Found 1 referral records" but "Found 0 user records":**
- The user_id in referral record doesn't match any user
- Data integrity issue

---

## Issue 2: Missing Notifications

### Root Cause
Notifications are not being sent when:
1. Someone signs up with a referral code
2. Referrer earns a bonus

### Fix: Check Notification Service

**File:** `pages/CreateWallet.tsx` (around line 195-230)

The notification code exists but might not be working. Check if this section is present:

```typescript
// Send notification to referrer about new signup
try {
  const { notificationService } = await import('../services/notificationService');
  const referrerProfile = await supabaseService.getUserProfile(referrerId);
  
  if (referrerProfile.success && referrerProfile.data) {
    const totalBonus = (referralBonus.amount || 50) + (referralBonus.milestoneBonus || 0);
    const message = referralBonus.milestoneReached
      ? `Someone just joined using your referral link! You earned ${referralBonus.amount} RZC. Plus ${referralBonus.milestoneBonus} RZC milestone bonus! 🎉`
      : `Someone just joined using your referral link! You earned ${referralBonus.amount} RZC.`;
    
    await notificationService.sendNotification(
      referrerProfile.data.wallet_address,
      'referral_signup',
      'New Referral Signup! 🎉',
      message,
      {
        referral_code: referralCode,
        new_user_address: walletAddress,
        bonus_amount: referralBonus.amount || 50,
        milestone_bonus: referralBonus.milestoneBonus || 0,
        milestone_reached: referralBonus.milestoneReached || false,
        total_bonus: totalBonus
      }
    );
    console.log('📬 Notification sent to referrer');
  }
} catch (notifError) {
  console.warn('⚠️ Failed to send notification:', notifError);
}
```

---

### Test Notifications

**Step 1: Check if notifications table exists**
```sql
SELECT COUNT(*) FROM wallet_notifications;
```

**Step 2: Check recent notifications**
```sql
SELECT 
  id,
  user_id,
  type,
  title,
  message,
  is_read,
  created_at
FROM wallet_notifications
ORDER BY created_at DESC
LIMIT 10;
```

**Step 3: Check notification preferences**
```sql
SELECT 
  user_id,
  enable_referral_notifications,
  enable_push_notifications
FROM wallet_notification_preferences;
```

---

## Quick Fix Script

Run this in Supabase SQL Editor to manually create a test notification:

```sql
-- Replace USER_ID with the referrer's user ID
INSERT INTO wallet_notifications (
  user_id,
  wallet_address,
  type,
  title,
  message,
  priority,
  metadata,
  is_read
)
SELECT 
  id,
  wallet_address,
  'referral_signup',
  'New Referral Signup! 🎉',
  'Someone just joined using your referral link! You earned 50 RZC.',
  'high',
  jsonb_build_object(
    'referral_code', r.referral_code,
    'bonus_amount', 50
  ),
  false
FROM wallet_users u
JOIN wallet_referrals r ON u.id = r.user_id
WHERE u.id = 'USER_ID_HERE';
```

---

## Complete Diagnostic Checklist

### ✅ Step 1: Verify Database State
```sql
-- 1. Check your user ID and referral code
SELECT id, name, wallet_address, r.referral_code, r.total_referrals
FROM wallet_users u
JOIN wallet_referrals r ON u.id = r.user_id
WHERE u.wallet_address = 'YOUR_WALLET_ADDRESS';

-- 2. Check who you referred (use your user_id from above)
SELECT 
  u.id,
  u.name,
  u.wallet_address,
  u.created_at,
  r.referrer_id,
  r.referral_code
FROM wallet_referrals r
JOIN wallet_users u ON r.user_id = u.id
WHERE r.referrer_id = 'YOUR_USER_ID';

-- 3. Check if referral bonuses were awarded
SELECT 
  type,
  amount,
  description,
  metadata,
  created_at
FROM wallet_rzc_transactions
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC;

-- 4. Check notifications
SELECT 
  type,
  title,
  message,
  is_read,
  created_at
FROM wallet_notifications
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC;
```

### ✅ Step 2: Check Browser Console
1. Open Referral page
2. Press F12
3. Click refresh button
4. Look for error messages

### ✅ Step 3: Check Code
1. Verify `getDownline()` in `services/supabaseService.ts`
2. Verify notification code in `pages/CreateWallet.tsx`
3. Check `services/notificationService.ts` exists

---

## Expected vs Actual

### Expected Behavior
When User B signs up with User A's referral code:

1. ✅ User A's `total_referrals` increments (WORKING)
2. ❌ User B appears in User A's downline (NOT WORKING)
3. ❌ User A receives notification (NOT WORKING)
4. ✅ User A receives 50 RZC (WORKING - based on count)
5. ✅ User B receives 100 RZC (WORKING)

### Actual Behavior (from screenshot)
- Total Referrals: 1 ✅
- Downline Members: 0 ❌
- Active Rate: 0% ❌ (because downline is empty)
- No notifications visible ❌

---

## Immediate Actions

### Action 1: Run Diagnostic Queries (5 minutes)
Copy the queries from "Step 1: Verify Database State" above and run them in Supabase SQL Editor.

**Share the results** so I can see exactly what's in the database.

### Action 2: Check Browser Console (2 minutes)
1. Open Referral page
2. Press F12
3. Click refresh button
4. Copy any error messages or logs

### Action 3: Verify Code (3 minutes)
Check if `services/supabaseService.ts` has the updated `getDownline()` function.

---

## Next Steps

Once you run the diagnostic queries, I can:
1. Identify the exact issue
2. Provide the specific fix
3. Help you test the solution

The most likely issues are:
1. **Database relationship not stored** - referrer_id is NULL
2. **getDownline() not updated** - Still using old join query
3. **Notification service not called** - Missing or failing silently

Let's start with the diagnostic queries to pinpoint the exact issue! 🔍
