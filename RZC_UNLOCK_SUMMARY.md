# RZC Transfer Unlock Summary

## Current Status

RZC transfers are currently **DISABLED** for all users because the `balance_verified` and `can_send_rzc` flags are set to `false` or `null` in the database.

## How It Works

The system checks two database fields in the `wallet_users` table:
- `balance_verified`: Whether the user's balance has been verified
- `can_send_rzc`: Whether the user can send RZC tokens

When **BOTH** are `true`, the user sees:
- ✅ Green "Send" button on RZC in Assets page
- ✅ Verification badge in their profile
- ✅ Ability to transfer RZC to other users

When either is `false` or `null`, the user sees:
- 🔒 Lock icon instead of Send button
- ⚠️ Warning banner about verification
- ❌ Cannot transfer RZC

## How to Unlock RZC Transfers

### Method 1: Admin Dashboard (Recommended)

1. Login as admin at `/admin/dashboard`
2. Click the "Balance Verification" tab
3. Review pending verification requests
4. Click "Review" on each request
5. Click "Approve" to unlock that user's RZC transfers

**Benefits:**
- Proper audit trail
- Can review each user individually
- Can add admin notes
- Automatically credits discrepancy amounts

### Method 2: Bulk SQL Unlock (Fastest)

Run this SQL script to unlock RZC for **ALL** users at once:

```sql
-- Unlock RZC transfers for all users
UPDATE wallet_users
SET 
  balance_verified = true,
  can_send_rzc = true,
  verification_badge_awarded = true,
  updated_at = NOW()
WHERE balance_verified IS NOT TRUE OR can_send_rzc IS NOT TRUE;

-- Mark all pending verification requests as resolved
UPDATE balance_verification_requests
SET 
  status = 'resolved',
  admin_notes = 'Bulk approval - balance verification complete',
  resolution_notes = 'All balances verified and approved',
  reviewed_at = NOW()
WHERE status IN ('pending', 'under_review');
```

**Benefits:**
- Unlocks everyone instantly
- Good for initial launch
- No manual review needed

### Method 3: Individual SQL Unlock

For specific users:

```sql
UPDATE wallet_users
SET 
  balance_verified = true,
  can_send_rzc = true,
  verification_badge_awarded = true
WHERE wallet_address = 'EQA...';
```

## Files Created

1. **ADMIN_BALANCE_VERIFICATION_GUIDE.md** - Complete guide for admins
2. **approve_balance_verification.sql** - Ready-to-run SQL scripts
3. **RZC_UNLOCK_SUMMARY.md** - This file

## Quick Start

**To unlock RZC transfers for everyone right now:**

1. Open your Supabase SQL Editor
2. Copy and paste the SQL from `approve_balance_verification.sql` (OPTION 1)
3. Run it
4. Done! All users can now send RZC

**To verify it worked:**

```sql
-- Check how many users are unlocked
SELECT 
  CASE 
    WHEN balance_verified = true AND can_send_rzc = true THEN 'Unlocked ✅'
    ELSE 'Still Locked 🔒'
  END as status,
  COUNT(*) as user_count
FROM wallet_users
GROUP BY 
  CASE 
    WHEN balance_verified = true AND can_send_rzc = true THEN 'Unlocked ✅'
    ELSE 'Still Locked 🔒'
  END;
```

## What Users Will See After Unlock

### Before (Locked):
- 🔒 Lock icon on RZC in Assets page
- "Check Status" button that scrolls to verification section
- Warning banner: "RZC Balance Verification Required"
- Cannot transfer RZC

### After (Unlocked):
- ✅ Green "Send" button on RZC in Assets page
- Verification badge (crown icon) in profile
- No warning banner
- Can transfer RZC to other users
- Can use RZC for all features

## Troubleshooting

**User says RZC is still locked after approval:**

Check their status:
```sql
SELECT 
  wallet_address,
  balance_verified,
  can_send_rzc,
  verification_badge_awarded
FROM wallet_users
WHERE wallet_address = 'USER_WALLET_ADDRESS';
```

If any are `false`, run:
```sql
UPDATE wallet_users
SET 
  balance_verified = true,
  can_send_rzc = true,
  verification_badge_awarded = true
WHERE wallet_address = 'USER_WALLET_ADDRESS';
```

**Need to lock RZC again for a specific user:**

```sql
UPDATE wallet_users
SET 
  can_send_rzc = false
WHERE wallet_address = 'USER_WALLET_ADDRESS';
```

## Recommendation

For the smoothest user experience, I recommend running the **bulk unlock** (Method 2) to enable RZC transfers for all users immediately. The verification system can remain in place for future edge cases, but most users should have access to their RZC right away.
