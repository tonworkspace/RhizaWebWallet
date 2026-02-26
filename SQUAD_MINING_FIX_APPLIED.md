# Squad Mining Database Error - FIXED ✅

## Error Encountered

```
Database function error: {
  code: "42703",
  message: "column \"wallet_address\" of relation \"wallet_rzc_transactions\" does not exist"
}
```

## Root Cause

The migration file was trying to insert a `wallet_address` column into `wallet_rzc_transactions`, but this column doesn't exist in your actual database schema.

### Actual Schema

```sql
CREATE TABLE wallet_rzc_transactions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC(20, 8) NOT NULL,
  balance_after NUMERIC(20, 8) NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
);
```

**Note:** NO `wallet_address` column!

## What Was Fixed

### 1. Removed wallet_address from RZC transaction insert

**Before (WRONG):**
```sql
INSERT INTO wallet_rzc_transactions (
  user_id,
  wallet_address,  -- ❌ This column doesn't exist!
  type,
  amount,
  ...
)
```

**After (CORRECT):**
```sql
INSERT INTO wallet_rzc_transactions (
  user_id,
  type,
  amount,
  balance_after,
  description,
  metadata
) VALUES (
  p_user_id,
  'squad_mining',
  p_reward_amount,
  v_new_balance,
  'Squad mining claim from ' || p_squad_size || ' members',
  jsonb_build_object(
    'squad_size', p_squad_size,
    'premium_members', p_premium_members,
    'transaction_id', p_transaction_id
  )
);
```

### 2. Changed transaction type

- **Before:** `'earn'`
- **After:** `'squad_mining'` (more descriptive)

### 3. Simplified metadata

Removed redundant `'source': 'squad_mining'` since the type already indicates this.

## New Migration File

Use this file instead: **`add_squad_mining_FINAL.sql`**

This file has:
- ✅ Correct `wallet_rzc_transactions` schema (no wallet_address)
- ✅ Correct `wallet_notifications` schema (uses 'data' column)
- ✅ Proper transaction type ('squad_mining')
- ✅ All UUID types matching
- ✅ Verification queries included

## Installation Steps

### Step 1: Clean Up Previous Attempt (if needed)

```sql
-- Only run if you partially ran the old migration
DROP TABLE IF EXISTS wallet_squad_claims CASCADE;
DROP FUNCTION IF EXISTS claim_squad_rewards CASCADE;
DROP FUNCTION IF EXISTS get_squad_mining_stats CASCADE;
DROP VIEW IF EXISTS squad_mining_leaderboard CASCADE;

ALTER TABLE wallet_users 
DROP COLUMN IF EXISTS last_squad_claim_at,
DROP COLUMN IF EXISTS total_squad_rewards,
DROP COLUMN IF EXISTS is_premium;
```

### Step 2: Run New Migration

Execute the entire **`add_squad_mining_FINAL.sql`** file in Supabase SQL Editor.

### Step 3: Verify Installation

```sql
-- Should return 3 rows
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'wallet_users' 
AND column_name IN ('last_squad_claim_at', 'total_squad_rewards', 'is_premium');

-- Should return true
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'wallet_squad_claims'
);

-- Should return 2 rows
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN ('claim_squad_rewards', 'get_squad_mining_stats');
```

### Step 4: Test in Browser

1. Refresh your app
2. Go to Referral page
3. Squad Mining card should display
4. Try claiming (if eligible)

## Schema Comparison

### wallet_rzc_transactions

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | References wallet_users(id) |
| type | TEXT | 'squad_mining', 'signup_bonus', etc. |
| amount | NUMERIC | RZC amount |
| balance_after | NUMERIC | Balance after transaction |
| description | TEXT | Human-readable description |
| metadata | JSONB | Additional data |
| created_at | TIMESTAMPTZ | Timestamp |

**❌ NO wallet_address column**

### wallet_notifications

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | References wallet_users(id) |
| wallet_address | TEXT | ✅ HAS wallet_address |
| type | TEXT | Notification type |
| title | TEXT | Notification title |
| message | TEXT | Notification message |
| data | JSONB | ✅ Uses 'data' not 'metadata' |
| is_read | BOOLEAN | Read status |
| created_at | TIMESTAMPTZ | Timestamp |

## Why This Happened

The migration was based on an assumption about the schema that didn't match your actual database structure. Different tables have different columns:

- `wallet_rzc_transactions` → NO wallet_address (user_id is enough)
- `wallet_notifications` → HAS wallet_address (for display purposes)

## Testing the Fix

### Test 1: Check Transaction Recording

```sql
-- After claiming, check if transaction was recorded
SELECT * FROM wallet_rzc_transactions 
WHERE type = 'squad_mining' 
ORDER BY created_at DESC 
LIMIT 5;
```

Expected columns:
- ✅ user_id
- ✅ type = 'squad_mining'
- ✅ amount
- ✅ balance_after
- ✅ description
- ✅ metadata (with squad_size, premium_members, transaction_id)

### Test 2: Check Notification

```sql
-- Check if notification was created
SELECT * FROM wallet_notifications 
WHERE data->>'claim_type' = 'squad_mining'
ORDER BY created_at DESC 
LIMIT 5;
```

Expected:
- ✅ Has wallet_address
- ✅ type = 'reward_claimed'
- ✅ data contains reward_amount, squad_size, premium_members

### Test 3: Full Claim Test

```sql
-- Test the claim function directly
SELECT * FROM claim_squad_rewards(
  'your-user-uuid'::UUID,
  'your-wallet-address',
  5,  -- squad_size
  10, -- reward_amount
  0,  -- premium_members
  'test_' || NOW()::TEXT
);
```

Expected result:
```
success | new_balance | message
--------|-------------|--------
true    | 110.0       | Successfully claimed 10 RZC!
```

## Summary

✅ **Fixed:** Removed non-existent wallet_address column from RZC transaction insert  
✅ **Fixed:** Changed transaction type to 'squad_mining'  
✅ **Fixed:** Simplified metadata structure  
✅ **Verified:** Notification insert uses correct schema  
✅ **Ready:** New migration file is production-ready  

**Use `add_squad_mining_FINAL.sql` for installation!**
