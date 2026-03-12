# STK Migration System - Complete Guide

## Overview

The STK Migration System allows users to migrate their STK tokens from the old wallet to StarFi Points, which can then be claimed as RZC tokens on the mainnet.

### Conversion Ratio
- **1 STK = 1 StarFi Point** (1:1)
- **10,000,000 StarFi Points = 8 RZC**
- **Simplified: 1,250,000 STK = 1 RZC**

### Example Conversions
| STK Amount | StarFi Points | RZC Equivalent |
|------------|---------------|----------------|
| 10,000,000 | 10,000,000 | 8 RZC |
| 50,000,000 | 50,000,000 | 40 RZC |
| 100,000,000 | 100,000,000 | 80 RZC |
| 1,250,000 | 1,250,000 | 1 RZC |
| 10,109,000,000,000 | 10,109,000,000 | 8,087.20 RZC |

---

## Database Setup

### Step 1: Create STK Migrations Table

Run the SQL script to create the database table:

```bash
# Execute in Supabase SQL Editor
create_stk_migrations_table.sql
```

This creates:
- `stk_migrations` table with all necessary fields
- Indexes for performance
- RLS policies for security
- Constraints to ensure data integrity

### Step 2: Verify Table Creation

```sql
-- Check if table exists
SELECT * FROM public.stk_migrations;

-- View table structure
\d public.stk_migrations
```

---

## Frontend Integration

### Tab System

The Wallet Migration page now has two tabs:

1. **RZC Migration** - Original migration for RZC balance
2. **STK to StarFi** - New tab for STK token conversion

### User Flow

1. User connects wallet
2. Navigates to Wallet Migration page
3. Clicks "STK to StarFi" tab
4. Fills in:
   - Telegram username
   - Mobile number
   - STK amount
5. Sees real-time conversion preview
6. Submits migration request
7. Status tracked: Pending → Approved/Rejected

---

## Service Methods

### Submit STK Migration

```typescript
const result = await migrationService.submitStkMigrationRequest({
  wallet_address: 'UQxxx...',
  telegram_username: '@username',
  mobile_number: '+1234567890',
  stk_amount: 50000000
});
```

### Get Migration Status

```typescript
const status = await migrationService.getStkMigrationStatus(walletAddress);
```

### Admin: Get All Requests

```typescript
const requests = await migrationService.getAllStkMigrationRequests('pending');
```

### Admin: Approve Migration

```typescript
const result = await migrationService.approveStkMigration(
  requestId,
  adminWalletAddress,
  'Verified and approved'
);
```

### Admin: Reject Migration

```typescript
const result = await migrationService.rejectStkMigration(
  requestId,
  adminWalletAddress,
  'Invalid information provided'
);
```

---

## Testing

### Browser Console Test

1. Open browser console
2. Load the test script:
```javascript
// Copy and paste test_stk_migration.js content
```

3. Run the test:
```javascript
testStkMigration()
```

### Manual Testing Steps

1. **Submit Request**
   - Connect wallet
   - Go to Wallet Migration → STK to StarFi tab
   - Enter: @testuser, +1234567890, 50000000 STK
   - Submit
   - Verify: Shows "pending" status

2. **Check Conversion**
   - 50,000,000 STK should show:
   - 50,000,000 StarFi Points
   - 40 RZC equivalent

3. **Duplicate Prevention**
   - Try submitting again
   - Should show error: "You already have a pending STK migration request"

4. **Admin Approval** (requires admin access)
   - Go to Admin Dashboard
   - Find STK migration request
   - Approve it
   - Verify: User receives 40 RZC

---

## Admin Dashboard Integration

### View STK Migrations

Add to Admin Dashboard:

```typescript
const [stkMigrations, setStkMigrations] = useState([]);

useEffect(() => {
  const loadStkMigrations = async () => {
    const result = await migrationService.getAllStkMigrationRequests();
    if (result.success) {
      setStkMigrations(result.data);
    }
  };
  loadStkMigrations();
}, []);
```

### Display STK Migration Table

```tsx
<table>
  <thead>
    <tr>
      <th>Wallet</th>
      <th>STK Amount</th>
      <th>RZC Equivalent</th>
      <th>Status</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    {stkMigrations.map(migration => (
      <tr key={migration.id}>
        <td>{migration.wallet_address}</td>
        <td>{migration.stk_amount.toLocaleString()}</td>
        <td>{migration.rzc_equivalent}</td>
        <td>{migration.status}</td>
        <td>
          <button onClick={() => handleApprove(migration.id)}>
            Approve
          </button>
          <button onClick={() => handleReject(migration.id)}>
            Reject
          </button>
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

---

## Security Features

### Duplicate Prevention
- One migration request per wallet address
- Enforced at database level with UNIQUE constraint
- Checked in service layer before submission

### Validation
- Telegram username required
- Mobile number format validation
- STK amount must be > 0
- Wallet address verification

### RLS Policies
- Users can view their own migrations
- Users can insert their own migrations
- Admins can view all migrations
- Admins can update migration status

---

## Conversion Formula

```typescript
// STK to StarFi Points (1:1)
const starfiPoints = stkAmount;

// StarFi Points to RZC (10M:8)
const rzcEquivalent = (stkAmount / 10000000) * 8;
```

### Verification

```typescript
// Example: 50,000,000 STK
const stk = 50000000;
const starfi = stk; // 50,000,000
const rzc = (stk / 10000000) * 8; // 40 RZC

console.log(`${stk.toLocaleString()} STK`);
console.log(`= ${starfi.toLocaleString()} StarFi Points`);
console.log(`= ${rzc} RZC`);
```

---

## Troubleshooting

### Issue: Table doesn't exist
**Solution:** Run `create_stk_migrations_table.sql` in Supabase SQL Editor

### Issue: RLS policy error
**Solution:** Check policies are enabled:
```sql
SELECT * FROM pg_policies WHERE tablename = 'stk_migrations';
```

### Issue: Duplicate submission allowed
**Solution:** Verify UNIQUE constraint:
```sql
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'stk_migrations';
```

### Issue: RZC not credited after approval
**Solution:** Check `award_rzc_tokens` function exists and user profile is valid

---

## Next Steps

1. ✅ Create database table
2. ✅ Implement service methods
3. ✅ Add UI tab system
4. ✅ Test submission flow
5. ⏳ Add to Admin Dashboard
6. ⏳ Test approval flow
7. ⏳ Deploy to production

---

## Support

For issues or questions:
- Check browser console for errors
- Verify database connection
- Test with `test_stk_migration.js`
- Review RLS policies
- Contact development team

---

**Last Updated:** 2026-03-06
**Version:** 1.0.0
**Status:** Ready for Testing
