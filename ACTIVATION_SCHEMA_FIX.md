# Wallet Activation Schema Fix

## 🔍 Problem

You got this error when running the migration:
```
ERROR: 42710: policy "Users can view their own activations" for table "wallet_activations" already exists
```

This means the migration was **partially run before**. Some components exist, but we need to ensure everything is properly set up.

## ✅ Solution

I've created two SQL files to help you:

### 1. `check_activation_schema.sql` - Diagnostic Query

**Purpose**: Check what's already in your database

**How to use**:
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `check_activation_schema.sql`
3. Paste and click "Run"
4. Review the results to see what exists

**What it checks**:
- ✓ Does `wallet_activations` table exist?
- ✓ Are activation columns in `wallet_users`?
- ✓ Are RLS policies configured?
- ✓ Do the functions exist?
- ✓ Can you query the table?

### 2. `fix_activation_schema.sql` - Safe Migration

**Purpose**: Add only missing components without errors

**How to use**:
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `fix_activation_schema.sql`
3. Paste and click "Run"
4. Check for success messages

**What it does**:
- ✅ Creates table if missing (uses `IF NOT EXISTS`)
- ✅ Adds columns only if they don't exist
- ✅ Drops and recreates policies cleanly
- ✅ Creates/replaces functions (no errors)
- ✅ Grants proper permissions
- ✅ Runs verification checks

## 🚀 Quick Start

**Option 1: Just Fix It (Recommended)**
```sql
-- Run this file in Supabase SQL Editor
-- File: fix_activation_schema.sql
```
This will safely set up everything you need.

**Option 2: Diagnose First, Then Fix**
```sql
-- Step 1: Run check_activation_schema.sql
-- Step 2: Review what's missing
-- Step 3: Run fix_activation_schema.sql
```

## 📋 After Running the Fix

### Test the Activation Flow

1. **Login to your wallet**
2. **Navigate to Mining Nodes** (`/wallet/mining`)
3. **Purchase Test Node** (0.01 TON)
4. **Verify activation succeeds**
5. **Check lock overlay disappears**

### Verify in Database

Run this query to check your activation:
```sql
-- Check your wallet activation status
SELECT 
  wallet_address,
  is_activated,
  activated_at,
  activation_fee_paid
FROM wallet_users
WHERE wallet_address = 'YOUR_WALLET_ADDRESS';

-- Check activation record
SELECT 
  wallet_address,
  activation_fee_ton,
  status,
  created_at
FROM wallet_activations
WHERE wallet_address = 'YOUR_WALLET_ADDRESS';
```

## 🔧 What Was Fixed

### Database Schema
- ✅ `wallet_activations` table with proper structure
- ✅ `is_activated`, `activated_at`, `activation_fee_paid` columns in `wallet_users`
- ✅ Indexes for performance

### Security (RLS)
- ✅ Row Level Security enabled
- ✅ SELECT policy: Users can view their own activations
- ✅ INSERT policy: Users can insert their own activations

### Functions
- ✅ `activate_wallet()` - Activates wallet after payment
- ✅ `check_wallet_activation()` - Checks activation status
- ✅ Proper permissions granted

## 🎯 Expected Behavior After Fix

### Before Activation
- Lock overlay blocks most pages
- User can access: Mining Nodes, Receive (QR code)
- Message: "Fund your wallet and purchase a mining node"

### During Activation
- User purchases Test Node (0.01 TON)
- `activate_wallet()` function executes
- Record created in `wallet_activations` table
- `wallet_users.is_activated` set to `TRUE`

### After Activation
- Lock overlay disappears immediately
- Full access to all wallet features
- Dashboard, Assets, History, Transfer, Settings all unlocked

## 🐛 Troubleshooting

### Error: "Wallet not found"
**Cause**: User doesn't exist in `wallet_users` table
**Solution**: Ensure user logged in and profile created

### Error: "Wallet already activated"
**Cause**: User already activated (can't activate twice)
**Solution**: Check `wallet_users.is_activated` status

### Error: "permission denied"
**Cause**: RLS policies not set up correctly
**Solution**: Run `fix_activation_schema.sql` again

### Lock overlay still showing
**Cause**: Frontend not detecting activation
**Solution**: 
1. Check `App.tsx` - `isWalletActivated` state
2. Verify `checkWalletActivation()` is being called
3. Check browser console for errors

## 📊 Monitoring

### Check Activation Statistics
```sql
-- Get activation stats
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE is_activated = TRUE) as activated,
  COUNT(*) FILTER (WHERE is_activated = FALSE) as not_activated,
  ROUND(AVG(activation_fee_paid), 4) as avg_fee_ton
FROM wallet_users;

-- Recent activations
SELECT 
  wallet_address,
  activation_fee_ton,
  activated_at
FROM wallet_users
WHERE is_activated = TRUE
ORDER BY activated_at DESC
LIMIT 10;
```

## ✨ Summary

The error occurred because the migration was partially run. The `fix_activation_schema.sql` file safely completes the setup by:

1. Using `IF NOT EXISTS` to avoid duplicate errors
2. Dropping and recreating policies cleanly
3. Using `CREATE OR REPLACE` for functions
4. Adding verification checks

After running this fix, your wallet activation system will be fully operational and the Test Node purchase will successfully activate wallets.

## 🎉 Next Steps

1. ✅ Run `fix_activation_schema.sql` in Supabase
2. ✅ Test activation with Test Node
3. ✅ Verify lock overlay disappears
4. ✅ Test with production nodes
5. ✅ Monitor activation statistics

Your activation flow is ready to go! 🚀
