# Fix Balance Verification Submission Issue

## Problem
Users are getting "Manual Submission Required" modal instead of successful submission. The RPC function is failing.

## Root Cause
The RPC function `submit_balance_verification_request` either:
1. Doesn't exist in the database
2. Has incorrect RLS policies blocking it
3. Has permission issues

## Solution

### Step 1: Run the Fix Script

Execute this SQL script in your Supabase SQL Editor:

```bash
# Open Supabase Dashboard
# Go to SQL Editor
# Run the file: FIX_BALANCE_VERIFICATION_RPC.sql
```

The script will:
- ✅ Drop and recreate the RPC function with proper error handling
- ✅ Grant execute permissions to authenticated users
- ✅ Fix RLS policies to allow the function to work
- ✅ Use SECURITY DEFINER so the function runs with elevated privileges

### Step 2: Verify the Fix

After running the script, test the submission:

1. **User Side:**
   - Go to Balance Verification page
   - Click "Submit Balance Verification Request"
   - Fill out the form
   - Submit

2. **Expected Result:**
   - ✅ Success toast: "Verification request submitted successfully!"
   - ✅ Form closes
   - ✅ Blue status card appears showing "Request Submitted" with PENDING status

3. **Admin Side:**
   - Go to Admin Dashboard
   - Click "Balance Verification" tab
   - ✅ See the new request in the list with PENDING status

### Step 3: If Still Failing

If you still see the manual submission modal, check the browser console for errors:

```javascript
// Open browser console (F12)
// Look for errors like:
// "RPC_FAILED: ..." or "permission denied"
```

Common issues and fixes:

#### Issue 1: Function doesn't exist
```sql
-- Check if function exists
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'submit_balance_verification_request';

-- If empty, run FIX_BALANCE_VERIFICATION_RPC.sql again
```

#### Issue 2: Permission denied
```sql
-- Grant permissions
GRANT EXECUTE ON FUNCTION submit_balance_verification_request TO authenticated;
GRANT EXECUTE ON FUNCTION submit_balance_verification_request TO anon;
```

#### Issue 3: RLS blocking inserts
```sql
-- Check RLS policies
SELECT * FROM pg_policies 
WHERE tablename = 'balance_verification_requests';

-- If "Allow insert via RPC function" policy doesn't exist, run the fix script
```

## What Changed

### Before (Failing):
```
User submits form
    ↓
Service calls RPC function
    ↓
RPC function fails (permission/RLS issue)
    ↓
❌ Manual submission modal shown
```

### After (Working):
```
User submits form
    ↓
Service calls RPC function
    ↓
RPC function succeeds (SECURITY DEFINER + proper RLS)
    ↓
✅ Success! Request inserted into database
    ↓
✅ Status card shows "PENDING"
    ↓
✅ Admin sees request in dashboard
```

## Key Improvements

1. **SECURITY DEFINER**: Function runs with elevated privileges, bypassing RLS
2. **Better Error Handling**: Returns detailed error messages for debugging
3. **Proper RLS Policies**: Allows inserts via RPC while maintaining security
4. **Multiple Auth Methods**: Tries wallet_address, user_metadata, app_metadata, and auth_user_id
5. **Validation**: Checks for existing pending requests to prevent duplicates

## Testing Checklist

- [ ] Run FIX_BALANCE_VERIFICATION_RPC.sql in Supabase
- [ ] Verify function exists in database
- [ ] Test user submission (should succeed)
- [ ] Check admin dashboard (request should appear)
- [ ] Test duplicate submission (should be blocked)
- [ ] Test with different users
- [ ] Verify priority calculation (urgent/high/normal/low)

## Admin Dashboard Display

The request will appear in the admin dashboard with:

- **Status Badge**: Orange "PENDING" badge
- **Priority Badge**: Color-coded (urgent=red, high=orange, normal=blue, low=green)
- **User Info**: Wallet address, Telegram username
- **Balance Info**: Current balance, Claimed balance, Discrepancy
- **Actions**: "Review" button to approve/reject
- **Screenshot**: Link if provided
- **Notes**: Additional notes from user

## Success Indicators

✅ **User sees:**
- Success toast message
- Blue status card with "Request Submitted"
- Request ID, claimed balance, submission date
- Status: PENDING

✅ **Admin sees:**
- New request in "Balance Verification" tab
- Orange badge showing pending count
- All request details
- "Review" button to take action

✅ **Database has:**
- New row in `balance_verification_requests` table
- Status = 'pending'
- All user data populated
- Priority calculated correctly

## Troubleshooting

### Error: "No authentication token found"
**Solution**: User needs to log in again

### Error: "User profile not found"
**Solution**: User's wallet_users record is missing or auth is broken

### Error: "You already have a pending verification request"
**Solution**: User has an existing pending request - this is correct behavior

### Error: "permission denied for function"
**Solution**: Run the GRANT statements in the fix script

### Error: "new row violates row-level security policy"
**Solution**: RLS policies are too restrictive - run the fix script to update them

## Next Steps After Fix

1. ✅ Test with a real user account
2. ✅ Verify admin can see and review requests
3. ✅ Test approval flow (admin approves → RZC credited → balance unlocked)
4. ✅ Test rejection flow (admin rejects → user notified)
5. ✅ Monitor for any errors in production

## Support

If issues persist after running the fix:
1. Check Supabase logs for errors
2. Verify RLS policies are correct
3. Ensure user has valid wallet_users record
4. Check that auth.jwt() returns valid data
