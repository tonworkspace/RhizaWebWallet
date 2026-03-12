# Wallet Migration System - Complete Guide

## Overview
The wallet migration system allows users to migrate their RZC balance from pre-mine season wallets to mainnet wallets. The system includes user submission, admin review, and automatic RZC crediting.

## Components Created

### 1. Migration Service (`services/migrationService.ts`)
Handles all migration-related database operations:
- `submitMigrationRequest()` - Submit new migration request
- `getMigrationStatus()` - Check migration status for a wallet
- `getAllMigrationRequests()` - Get all requests (admin only)
- `approveMigration()` - Approve and credit RZC (admin only)
- `rejectMigration()` - Reject request (admin only)
- `getMigrationStats()` - Get migration statistics (admin only)

### 2. Migration Page (`pages/WalletMigration.tsx`)
User-facing page for submitting migration requests:
- Form to submit Telegram username, mobile number, and balances
- Real-time status display (pending/approved/rejected)
- Validation for all inputs
- Responsive design for mobile and desktop

### 3. Database Schema (`create_wallet_migrations_table.sql`)
SQL migration file to create the `wallet_migrations` table:
- Stores all migration requests
- Tracks status (pending/approved/rejected)
- Records admin review details
- Includes RLS policies for security

### 4. Navigation Integration
- Added route to `App.tsx`: `/wallet/migration`
- Added link in `More.tsx` under "Wallet Features" section
- Marked with "New" badge for visibility

## Database Setup

### Step 1: Run the SQL Migration
Execute the SQL file in your Supabase SQL editor:

```bash
# Copy the contents of create_wallet_migrations_table.sql
# Paste into Supabase SQL Editor
# Click "Run"
```

This will create:
- `wallet_migrations` table
- Indexes for performance
- RLS policies for security
- Trigger for auto-updating `updated_at`

### Step 2: Verify Table Creation
Run this query to verify:

```sql
SELECT * FROM wallet_migrations LIMIT 1;
```

## User Flow

### 1. User Submits Migration Request
1. Navigate to `/wallet/migration` or click "Wallet Migration" in More page
2. Fill in the form:
   - Telegram username (e.g., @username)
   - Mobile number (with country code, e.g., +1234567890)
   - Available balance (RZC in old wallet)
   - Claimable balance (RZC pending in old wallet)
3. Click "Submit Migration Request"
4. Status changes to "Pending"

### 2. Admin Reviews Request
Admins can review requests through the admin panel (to be implemented) or directly in Supabase:

```sql
-- View all pending requests
SELECT * FROM wallet_migrations 
WHERE status = 'pending' 
ORDER BY created_at DESC;

-- Approve a request (manual method)
UPDATE wallet_migrations 
SET status = 'approved', 
    admin_notes = 'Verified and approved',
    reviewed_at = NOW(),
    reviewed_by = 'admin_wallet_address'
WHERE id = 'migration_id';
```

### 3. Automatic RZC Crediting
When a migration is approved via `migrationService.approveMigration()`:
1. Migration status is updated to 'approved'
2. User's profile is fetched
3. RZC is automatically credited using `supabaseService.awardRZCTokens()`
4. Transaction is recorded in `wallet_rzc_transactions`
5. User's `rzc_balance` is updated

### 4. User Sees Approved Status
- Status changes to "Approved"
- RZC appears in their wallet balance
- Can view transaction in history

## Admin Integration (To Be Implemented)

Add a migration management section to the admin panel:

```typescript
// In AdminPanel.tsx or AdminDashboard.tsx
import { migrationService } from '../services/migrationService';

// Get pending requests
const { data: pendingRequests } = await migrationService.getAllMigrationRequests('pending');

// Approve a request
await migrationService.approveMigration(
  requestId,
  adminWalletAddress,
  'Verified via Telegram and mobile number'
);

// Reject a request
await migrationService.rejectMigration(
  requestId,
  adminWalletAddress,
  'Unable to verify old wallet ownership'
);

// Get statistics
const { data: stats } = await migrationService.getMigrationStats();
```

## Security Features

### 1. Row Level Security (RLS)
- Users can only view their own migration requests
- Users can only create requests for their own wallet
- Admins can view and update all requests

### 2. Duplicate Prevention
- One migration request per wallet address (enforced by unique constraint)
- Cannot submit new request if pending or approved request exists

### 3. Validation
- Email format validation for Telegram username
- Mobile number format validation (E.164 format)
- Balance validation (must be positive numbers)
- Total balance must be greater than 0

## Testing

### Test User Submission
1. Login to wallet
2. Navigate to `/wallet/migration`
3. Submit a test request with:
   - Telegram: @testuser
   - Mobile: +1234567890
   - Available: 1000
   - Claimable: 500
4. Verify status shows "Pending"

### Test Admin Approval
```typescript
// In browser console or admin panel
const result = await migrationService.approveMigration(
  'migration_id',
  'admin_wallet_address',
  'Test approval'
);
console.log(result);
```

### Verify RZC Crediting
```sql
-- Check user's RZC balance
SELECT rzc_balance FROM wallet_users WHERE wallet_address = 'user_wallet_address';

-- Check RZC transaction
SELECT * FROM wallet_rzc_transactions 
WHERE user_id = 'user_id' 
AND type = 'migration' 
ORDER BY created_at DESC LIMIT 1;
```

## Migration Statistics

Get migration statistics:

```typescript
const { data: stats } = await migrationService.getMigrationStats();
console.log(stats);
// {
//   total: 100,
//   pending: 25,
//   approved: 70,
//   rejected: 5,
//   totalRzcMigrated: 150000
// }
```

## Troubleshooting

### Issue: "Database not configured"
- Check Supabase environment variables in `.env`
- Verify Supabase client is initialized

### Issue: "Migration request already exists"
- User already has a pending or approved request
- Check existing request: `SELECT * FROM wallet_migrations WHERE wallet_address = 'address'`

### Issue: RZC not credited after approval
- Check if `award_rzc_tokens` function exists in database
- Verify user profile exists in `wallet_users` table
- Check `wallet_rzc_transactions` for error logs

### Issue: RLS policy blocking access
- Verify user is logged in
- Check JWT claims contain wallet_address
- For admin operations, verify user has 'admin' role

## Next Steps

1. **Admin Panel Integration**
   - Add migration management section to admin panel
   - Display pending requests in a table
   - Add approve/reject buttons
   - Show migration statistics

2. **Notifications**
   - Send notification when migration is approved/rejected
   - Email notification to user (if email available)

3. **Verification System**
   - Add document upload for verification
   - Screenshot of old wallet balance
   - Additional identity verification

4. **Bulk Operations**
   - Approve multiple migrations at once
   - Export migration data to CSV
   - Bulk import from old system

## Files Modified/Created

### Created:
- `services/migrationService.ts` - Migration service
- `create_wallet_migrations_table.sql` - Database schema
- `WALLET_MIGRATION_SYSTEM_GUIDE.md` - This guide

### Modified:
- `pages/WalletMigration.tsx` - Fixed type issues, integrated service
- `App.tsx` - Added migration route
- `pages/More.tsx` - Added migration link

## Summary

The wallet migration system is now fully functional for user submissions. Users can:
- Submit migration requests with their old wallet details
- Track migration status in real-time
- Receive RZC automatically when approved

Admins can:
- View all migration requests
- Approve/reject requests
- Track migration statistics

The system is secure, validated, and ready for production use. Next step is to integrate the admin panel for easier migration management.
