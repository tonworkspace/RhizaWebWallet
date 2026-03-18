# Admin Balance Verification Guide

## Overview
The Admin Dashboard has a complete balance verification system where admins can review and approve/reject user balance verification requests.

## How to Access

1. **Login as Admin**
   - Navigate to `/admin/dashboard`
   - Only users with `role = 'admin'` can access this page

2. **Navigate to Balance Verification Tab**
   - Click on the "Balance Verification" tab in the admin dashboard
   - You'll see statistics showing:
     - Total Requests
     - Pending
     - Under Review
     - Approved
     - Rejected
     - Resolved

## Reviewing Verification Requests

### Through the UI (Recommended)

1. **View Pending Requests**
   - All verification requests are listed with their status
   - Pending requests show a "Review" button

2. **Click Review Button**
   - Opens a modal with full request details:
     - Current wallet address
     - Telegram username
     - Old wallet address
     - Current balance (in system)
     - Claimed balance (what user says they should have)
     - Discrepancy amount
     - Screenshot (if provided)
     - Additional notes from user

3. **Make a Decision**
   - **Approve**: Credits the difference to user's account, unlocks RZC transfers, awards verification badge
   - **Reject**: Requires admin notes explaining why

4. **Add Admin Notes** (optional for approval, required for rejection)
   - Provide context about your decision
   - These notes are visible to the user

### Manual SQL Approval (Alternative)

If you need to approve verifications directly in the database:

```sql
-- 1. View all pending verification requests
SELECT 
  id,
  wallet_address,
  telegram_username,
  current_balance,
  claimed_balance,
  discrepancy_amount,
  created_at
FROM balance_verification_requests
WHERE status = 'pending'
ORDER BY created_at ASC;

-- 2. Approve a specific request (replace the ID)
UPDATE balance_verification_requests
SET 
  status = 'resolved',
  admin_notes = 'Manually approved by admin',
  resolution_notes = 'Balance verified and approved',
  reviewed_at = NOW(),
  reviewed_by = 'YOUR_ADMIN_WALLET_ADDRESS'
WHERE id = 'REQUEST_ID_HERE';

-- 3. Unlock RZC transfers for the user
UPDATE wallet_users
SET 
  balance_verified = true,
  can_send_rzc = true,
  verification_badge_awarded = true
WHERE wallet_address = 'USER_WALLET_ADDRESS_HERE';

-- 4. Credit the discrepancy amount (if needed)
-- First, get the user_id
SELECT id, rzc_balance 
FROM wallet_users 
WHERE wallet_address = 'USER_WALLET_ADDRESS_HERE';

-- Then credit the amount
UPDATE wallet_users
SET rzc_balance = rzc_balance + DISCREPANCY_AMOUNT
WHERE wallet_address = 'USER_WALLET_ADDRESS_HERE';

-- Record the transaction
INSERT INTO rzc_transactions (user_id, amount, type, balance_after, description)
VALUES (
  'USER_ID_HERE',
  DISCREPANCY_AMOUNT,
  'balance_verification',
  (SELECT rzc_balance FROM wallet_users WHERE id = 'USER_ID_HERE'),
  'Balance verification credit'
);
```

## Bulk Approval Script

To approve all users and unlock RZC transfers for everyone:

```sql
-- WARNING: This approves ALL users without verification
-- Use with caution!

-- 1. Mark all users as verified and unlock RZC transfers
UPDATE wallet_users
SET 
  balance_verified = true,
  can_send_rzc = true,
  verification_badge_awarded = true
WHERE balance_verified IS NOT TRUE;

-- 2. Mark all pending verification requests as resolved
UPDATE balance_verification_requests
SET 
  status = 'resolved',
  admin_notes = 'Bulk approval - balance verification complete',
  resolution_notes = 'All balances verified and approved',
  reviewed_at = NOW()
WHERE status = 'pending';
```

## Quick Unlock for Specific User

If you just want to unlock RZC transfers for a specific user without going through the verification process:

```sql
-- Replace with actual wallet address
UPDATE wallet_users
SET 
  balance_verified = true,
  can_send_rzc = true,
  verification_badge_awarded = true
WHERE wallet_address = 'EQA...';
```

## Check Verification Status

```sql
-- See all users and their verification status
SELECT 
  wallet_address,
  name,
  rzc_balance,
  balance_verified,
  can_send_rzc,
  verification_badge_awarded,
  created_at
FROM wallet_users
ORDER BY created_at DESC
LIMIT 50;

-- Count users by verification status
SELECT 
  balance_verified,
  can_send_rzc,
  COUNT(*) as user_count
FROM wallet_users
GROUP BY balance_verified, can_send_rzc;
```

## What Happens When You Approve?

1. **Balance Verification Request** status changes to `resolved`
2. **User's `wallet_users` record** is updated:
   - `balance_verified` = `true`
   - `can_send_rzc` = `true`
   - `verification_badge_awarded` = `true`
3. **If there's a discrepancy** (claimed > current):
   - The difference is credited to user's RZC balance
   - A transaction record is created
4. **User sees**:
   - Green "Send" button on RZC in Assets page (instead of lock icon)
   - Verification badge in their profile
   - Ability to transfer RZC to other users

## Troubleshooting

### User says RZC is still locked after approval

Check the database flags:
```sql
SELECT 
  wallet_address,
  balance_verified,
  can_send_rzc,
  verification_badge_awarded
FROM wallet_users
WHERE wallet_address = 'USER_WALLET_ADDRESS';
```

If any are `false` or `NULL`, update them:
```sql
UPDATE wallet_users
SET 
  balance_verified = true,
  can_send_rzc = true,
  verification_badge_awarded = true
WHERE wallet_address = 'USER_WALLET_ADDRESS';
```

### Verification badge not showing

The badge is controlled by `verification_badge_awarded` flag:
```sql
UPDATE wallet_users
SET verification_badge_awarded = true
WHERE wallet_address = 'USER_WALLET_ADDRESS';
```

## Best Practices

1. **Review screenshots** if provided before approving
2. **Check transaction history** to verify claimed balance
3. **Add meaningful admin notes** for transparency
4. **For large discrepancies** (>10,000 RZC), investigate thoroughly
5. **Use the UI** instead of SQL when possible for proper audit trail
