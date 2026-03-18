# 🔐 BALANCE VERIFICATION SYSTEM - SETUP GUIDE

## ❌ ERROR ENCOUNTERED
```
ERROR: 42710: policy "Users can view own verification requests" for table "balance_verification_requests" already exists
```

This means the balance verification system was partially installed. Follow these steps to complete the setup:

## 🛠️ STEP-BY-STEP SETUP

### Step 1: Create Table (if needed)
Run this first to ensure the table exists:
```sql
-- Run this file:
setup_balance_verification_table_only.sql
```

### Step 2: Fix Policies and Functions
Run this to clean up and recreate all policies and functions:
```sql
-- Run this file:
fix_balance_verification_policies.sql
```

### Step 3: Verify Setup
After running both scripts, verify the system is working:
```sql
SELECT verify_balance_verification_setup();
```

You should see:
```json
{
  "success": true,
  "setup_status": {
    "table_exists": true,
    "functions_count": 5,
    "policies_count": 4,
    "bucket_exists": true,
    "all_ready": true
  }
}
```

## 🧪 TEST THE SYSTEM

### Test 1: User Submission
1. Go to the Balance Verification component in the UI
2. Click "Report Balance Issue"
3. Fill out the form with test data
4. Submit the request

### Test 2: Admin Review
1. Go to Admin Dashboard
2. Click "Balance Verification" tab
3. You should see the pending request
4. Click "Review" to approve/reject

## 📁 FILES INVOLVED

### Database Setup:
- `setup_balance_verification_table_only.sql` - Creates table and indexes
- `fix_balance_verification_policies.sql` - Fixes policies and functions
- `create_balance_verification_system_FINAL.sql` - Complete system (use if starting fresh)

### Application Files:
- `services/balanceVerificationService.ts` - Service layer (✅ Fixed)
- `components/BalanceVerification.tsx` - User form (✅ Complete)
- `pages/AdminDashboard.tsx` - Admin interface (✅ Complete)

## 🚨 TROUBLESHOOTING

### If you get "table already exists" error:
- Skip Step 1, go directly to Step 2

### If you get "function already exists" error:
- The fix script handles this with `DROP FUNCTION IF EXISTS`

### If policies still conflict:
- Run this to drop all policies first:
```sql
DROP POLICY IF EXISTS "Users can view own verification requests" ON balance_verification_requests;
DROP POLICY IF EXISTS "Users can create verification requests" ON balance_verification_requests;
DROP POLICY IF EXISTS "Users can update own pending requests" ON balance_verification_requests;
DROP POLICY IF EXISTS "Admins can manage all verification requests" ON balance_verification_requests;
```

## ✅ SUCCESS INDICATORS

After setup, you should have:
- ✅ Table `balance_verification_requests` exists
- ✅ 4 RLS policies active
- ✅ 5 functions created (submit, get_status, admin_update, get_all, verify_setup)
- ✅ Storage bucket `verification-documents` exists
- ✅ UI form works for submissions
- ✅ Admin dashboard shows requests

## 🎯 WHAT'S WORKING NOW

The balance verification system is **fully implemented** with:

1. **User Form** - Collects telegram username, old wallet, claimed balance, screenshot
2. **Admin Dashboard** - Complete review interface with approve/reject
3. **Database Schema** - Secure RLS policies and functions
4. **File Upload** - Screenshot evidence support
5. **Status Tracking** - Full workflow from pending to resolved

The error you encountered is just a setup conflict - the system itself is complete and ready to use once the database is properly configured.