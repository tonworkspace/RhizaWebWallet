# Balance Verification Workflow - Current Setup

## Overview

The balance verification system is now configured to allow users to submit verification requests BEFORE migration, but RZC transfers remain locked until admins manually approve each request.

## Current User Experience

### 1. User Sees Locked RZC
- 🔒 Lock icon on RZC balance in Assets page
- ⚠️ Warning banner: "RZC Balance Verification Required"
- Cannot transfer RZC to other users
- Can still earn RZC from referrals, airdrops, etc.

### 2. User Submits Verification Request
Users can click "Submit Balance Verification Request" button and provide:
- Telegram username
- Current wallet address (auto-filled)
- Old wallet address (from previous system)
- Claimed RZC balance (what they believe they should have)
- Screenshot of old wallet (optional but recommended)
- Additional notes

### 3. Request is Submitted
- Request is saved to `balance_verification_requests` table
- Status: `pending`
- User sees confirmation: "Verification request submitted successfully! We will review it soon."
- User can see their request status in the verification section

### 4. Admin Reviews Request
Admins can review requests in the Admin Dashboard:
- Navigate to `/admin/dashboard`
- Click "Balance Verification" tab
- See all pending requests with details
- Click "Review" to see full information
- Approve or Reject with notes

### 5. After Admin Approval
When admin approves:
- User's `balance_verified` = `true`
- User's `can_send_rzc` = `true`
- User's `verification_badge_awarded` = `true`
- If there's a discrepancy, the difference is credited to user's account
- User sees green "Send" button instead of lock icon
- User can now transfer RZC

## Database Tables

### balance_verification_requests
Stores all verification requests:
```sql
- id (uuid)
- wallet_address (text)
- telegram_username (text)
- old_wallet_address (text)
- current_balance (numeric) - from system
- claimed_balance (numeric) - what user claims
- discrepancy_amount (numeric) - difference
- screenshot_url (text, optional)
- additional_notes (text)
- status (text) - pending, under_review, approved, rejected, resolved
- priority (text) - low, medium, high, critical
- admin_notes (text)
- resolution_notes (text)
- reviewed_by (text)
- reviewed_at (timestamp)
- created_at (timestamp)
```

### wallet_users (relevant fields)
Controls RZC transfer access:
```sql
- balance_verified (boolean) - default: false
- can_send_rzc (boolean) - default: false
- verification_badge_awarded (boolean) - default: false
```

## Request Status Flow

1. **pending** - Just submitted, waiting for admin review
2. **under_review** - Admin is reviewing (optional intermediate state)
3. **approved** - Admin approved, but not yet resolved
4. **resolved** - Fully processed, user unlocked
5. **rejected** - Admin rejected with reason

## Priority Levels

Automatically assigned based on discrepancy:
- **Low**: Discrepancy < 1,000 RZC
- **Medium**: Discrepancy 1,000 - 10,000 RZC
- **High**: Discrepancy 10,000 - 50,000 RZC
- **Critical**: Discrepancy > 50,000 RZC

## Admin Actions

### View All Requests
```sql
SELECT 
  id,
  wallet_address,
  telegram_username,
  current_balance,
  claimed_balance,
  discrepancy_amount,
  status,
  priority,
  created_at
FROM balance_verification_requests
ORDER BY 
  CASE priority
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END,
  created_at ASC;
```

### Approve Request (via UI)
1. Go to Admin Dashboard → Balance Verification tab
2. Click "Review" on pending request
3. Review all details and screenshot
4. Add admin notes (optional)
5. Click "Approve"
6. System automatically:
   - Updates request status to `resolved`
   - Sets user flags to unlock RZC
   - Credits discrepancy if needed
   - Awards verification badge

### Approve Request (via SQL)
```sql
-- 1. Update the request
UPDATE balance_verification_requests
SET 
  status = 'resolved',
  admin_notes = 'Approved by admin',
  resolution_notes = 'Balance verified and approved',
  reviewed_at = NOW(),
  reviewed_by = 'ADMIN_WALLET_ADDRESS'
WHERE id = 'REQUEST_ID';

-- 2. Unlock user's RZC
UPDATE wallet_users
SET 
  balance_verified = true,
  can_send_rzc = true,
  verification_badge_awarded = true
WHERE wallet_address = 'USER_WALLET_ADDRESS';

-- 3. Credit discrepancy if needed
UPDATE wallet_users
SET rzc_balance = rzc_balance + DISCREPANCY_AMOUNT
WHERE wallet_address = 'USER_WALLET_ADDRESS';
```

## User Request Status Display

Users can see their request status:
- **Pending**: Orange badge - "Waiting for review"
- **Under Review**: Blue badge - "Being reviewed by admin"
- **Approved**: Green badge - "Approved, processing..."
- **Resolved**: Emerald badge with crown - "Verification Complete!"
- **Rejected**: Red badge - "Request rejected" (with admin notes)

## Benefits of This Approach

1. **Collect Data Early**: Users submit verification info before migration
2. **Admin Control**: You manually review and approve each request
3. **Fraud Prevention**: Can verify screenshots and check for suspicious patterns
4. **Flexible Timing**: Approve requests in batches or individually
5. **Audit Trail**: Complete history of all verification requests
6. **User Transparency**: Users can see their request status at any time

## When to Approve

You can approve requests:
- **Individually**: Review each one carefully (recommended for high-value accounts)
- **In Batches**: Approve groups of similar requests
- **Bulk Approval**: Approve all at once after migration is complete

## Next Steps

1. **Monitor Submissions**: Check Admin Dashboard regularly for new requests
2. **Review High Priority**: Focus on critical/high priority requests first
3. **Verify Screenshots**: Check provided screenshots against claimed balances
4. **Approve Gradually**: Start with low-risk requests to test the system
5. **Bulk Approve Later**: Once confident, can approve remaining requests in bulk

## Quick Reference

**User submits request**: ✅ Working now
**RZC stays locked**: ✅ Yes, until admin approves
**Admin can review**: ✅ Via Admin Dashboard
**Admin can approve**: ✅ Via UI or SQL
**User gets unlocked**: ✅ After admin approval
**Verification badge**: ✅ Awarded on approval

## Files

- `components/BalanceVerification.tsx` - User-facing verification UI
- `services/balanceVerificationService.ts` - API service
- `pages/AdminDashboard.tsx` - Admin review interface
- `ADMIN_BALANCE_VERIFICATION_GUIDE.md` - Complete admin guide
- `approve_balance_verification.sql` - SQL scripts for approval
