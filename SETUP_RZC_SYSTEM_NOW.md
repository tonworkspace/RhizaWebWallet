# Setup RZC Transaction System - Quick Guide

## Problem
The `rzc_transactions` table doesn't exist, causing the error:
```
ERROR: 42P01: relation "rzc_transactions" does not exist
```

## Solution
Run the setup script to create all necessary tables and functions.

## Step-by-Step Instructions

### 1. Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New query"

### 2. Run the Setup Script
1. Open the file: `create_rzc_transactions_system.sql`
2. Copy ALL the contents
3. Paste into Supabase SQL Editor
4. Click "Run" button

### 3. Verify Installation
After running the script, you should see:
```
✅ Tables Created:
   - rzc_transactions
   - package_purchases

✅ Functions Created:
   - award_rzc_tokens()
   - get_rzc_balance()
   - get_rzc_transactions()
   - record_package_purchase()
```

### 4. Test the System

#### Test 1: Check Tables Exist
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('rzc_transactions', 'package_purchases');
```
Expected: 2 rows returned

#### Test 2: Check Functions Exist
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN ('award_rzc_tokens', 'get_rzc_balance');
```
Expected: 2 rows returned

#### Test 3: Award Test RZC
```sql
-- Replace USER_ID with actual user ID from wallet_users table
SELECT award_rzc_tokens(
  'USER_ID'::UUID,
  100,
  'test_credit',
  'Test RZC crediting system',
  '{"test": true}'::jsonb
);
```

#### Test 4: Check Balance
```sql
-- Replace USER_ID with actual user ID
SELECT 
  wallet_address,
  rzc_balance
FROM wallet_users
WHERE id = 'USER_ID'::UUID;
```

#### Test 5: View Transactions
```sql
-- Replace USER_ID with actual user ID
SELECT * FROM rzc_transactions
WHERE user_id = 'USER_ID'::UUID
ORDER BY created_at DESC;
```

## What This Creates

### Tables

#### 1. `rzc_transactions`
Tracks all RZC token movements:
- `id` - Unique transaction ID
- `user_id` - User who received RZC
- `amount` - Amount of RZC
- `type` - Transaction type (package_purchase, activation_bonus, etc.)
- `description` - Human-readable description
- `metadata` - Additional data (JSON)
- `created_at` - Timestamp

#### 2. `package_purchases`
Tracks all package purchases:
- `id` - Unique purchase ID
- `user_id` - User who purchased
- `package_id` - Package identifier
- `package_name` - Package name
- `package_tier` - Tier (starter, professional, enterprise)
- `price_usd` - Package price in USD
- `activation_fee_usd` - Activation fee
- `total_cost_usd` - Total cost in USD
- `total_cost_ton` - Total cost in TON
- `rzc_reward` - RZC tokens awarded
- `transaction_hash` - Blockchain transaction hash
- `network` - Network (mainnet/testnet)
- `metadata` - Additional data (JSON)
- `purchased_at` - Timestamp

### Functions

#### 1. `award_rzc_tokens()`
Awards RZC tokens to a user and records the transaction.

**Parameters:**
- `p_user_id` - User UUID
- `p_amount` - Amount of RZC
- `p_type` - Transaction type
- `p_description` - Description
- `p_metadata` - Optional JSON metadata

**Example:**
```sql
SELECT award_rzc_tokens(
  'user-uuid',
  1000,
  'package_purchase',
  'Bronze Package purchase',
  '{"package_id": "starter-100"}'::jsonb
);
```

#### 2. `get_rzc_balance()`
Gets current RZC balance for a user.

**Parameters:**
- `p_user_id` - User UUID

**Example:**
```sql
SELECT get_rzc_balance('user-uuid');
```

#### 3. `get_rzc_transactions()`
Gets transaction history for a user.

**Parameters:**
- `p_user_id` - User UUID
- `p_limit` - Number of transactions (default: 50)
- `p_offset` - Offset for pagination (default: 0)

**Example:**
```sql
SELECT * FROM get_rzc_transactions('user-uuid', 10, 0);
```

#### 4. `record_package_purchase()`
Records a package purchase and awards RZC automatically.

**Parameters:**
- `p_user_id` - User UUID
- `p_package_id` - Package ID
- `p_package_name` - Package name
- `p_package_tier` - Tier
- `p_price_usd` - Price in USD
- `p_activation_fee_usd` - Activation fee
- `p_total_cost_usd` - Total USD
- `p_total_cost_ton` - Total TON
- `p_rzc_reward` - RZC to award
- `p_transaction_hash` - TX hash
- `p_network` - Network
- `p_metadata` - Optional metadata

**Example:**
```sql
SELECT record_package_purchase(
  'user-uuid',
  'starter-100',
  'Bronze Package',
  'starter',
  100,
  15,
  115,
  2.5,
  1000,
  'tx-hash-here',
  'mainnet',
  '{}'::jsonb
);
```

## Integration with Frontend

The frontend already calls these functions through `supabaseService.awardRZCTokens()`:

```typescript
// In pages/MiningNodes.tsx
const rewardResult = await supabaseService.awardRZCTokens(
  userId,
  pkg.rzcReward,
  'package_purchase',
  `${pkg.tierName} purchase`,
  {
    package_id: pkg.id,
    package_name: pkg.tierName,
    transaction_hash: paymentResult.txHash
  }
);
```

## Troubleshooting

### Error: "relation already exists"
This is fine - it means the table was already created. The script uses `CREATE TABLE IF NOT EXISTS`.

### Error: "function already exists"
This is fine - the script uses `CREATE OR REPLACE FUNCTION`.

### Error: "permission denied"
Make sure you're running the script as a superuser or with sufficient permissions in Supabase.

### Error: "user not found"
Make sure the user exists in `wallet_users` table before awarding RZC.

## After Setup

Once the system is set up:

1. ✅ Package purchases will automatically credit RZC
2. ✅ All transactions will be recorded
3. ✅ Balances will be tracked accurately
4. ✅ Users can view their transaction history

## Next Steps

1. Run `create_rzc_transactions_system.sql` in Supabase
2. Test with a real package purchase
3. Verify RZC is credited in Assets page
4. Check transaction history
5. Implement referral commission system (10% + 1%)

## Quick Test Command

To quickly test if everything works:

```sql
-- Get a test user
SELECT id, wallet_address, rzc_balance 
FROM wallet_users 
LIMIT 1;

-- Award 100 test RZC (replace USER_ID)
SELECT award_rzc_tokens(
  'USER_ID'::UUID,
  100,
  'test_credit',
  'System test',
  '{"test": true}'::jsonb
);

-- Check new balance
SELECT wallet_address, rzc_balance 
FROM wallet_users 
WHERE id = 'USER_ID'::UUID;

-- View transaction
SELECT * FROM rzc_transactions 
WHERE user_id = 'USER_ID'::UUID 
ORDER BY created_at DESC 
LIMIT 1;
```

If all these queries work, your system is ready! 🎉
