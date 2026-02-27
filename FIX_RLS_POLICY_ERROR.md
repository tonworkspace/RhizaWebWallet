# Fix RLS Policy Error for Wallet Activation

## ❌ ERROR

```
new row violates row-level security policy for table "wallet_activations"
```

## 🔍 ROOT CAUSE

The `wallet_activations` table and its RLS (Row Level Security) policies haven't been created yet in your Supabase database. The SQL migration file `add_wallet_activation_FIXED.sql` needs to be executed.

## ✅ SOLUTION

### Step 1: Run SQL Migration in Supabase

1. **Open Supabase Dashboard**
   - Go to https://supabase.com
   - Select your project

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy SQL Migration**
   - Open file: `add_wallet_activation_FIXED.sql`
   - Copy the entire contents

4. **Execute SQL**
   - Paste the SQL into the editor
   - Click "Run" button
   - Wait for success confirmation

### Step 2: Verify Tables Created

Run this query to verify:

```sql
-- Check if wallet_activations table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'wallet_activations';

-- Check if columns were added to wallet_users
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'wallet_users' 
AND column_name IN ('is_activated', 'activated_at', 'activation_fee_paid');

-- Check if functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('activate_wallet', 'check_wallet_activation');
```

### Step 3: Verify RLS Policies

Run this query to check policies:

```sql
-- Check RLS policies on wallet_activations
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'wallet_activations';
```

Expected policies:
- "Users can view their own activations" (SELECT)
- "Users can insert their own activations" (INSERT)

## 📋 WHAT THE MIGRATION DOES

### 1. Adds Columns to wallet_users
```sql
ALTER TABLE wallet_users 
ADD COLUMN IF NOT EXISTS is_activated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS activation_fee_paid DECIMAL(10,4) DEFAULT 0;
```

### 2. Creates wallet_activations Table
```sql
CREATE TABLE IF NOT EXISTS wallet_activations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  wallet_address TEXT NOT NULL,
  activation_fee_usd DECIMAL(10,2) NOT NULL,
  activation_fee_ton DECIMAL(10,4) NOT NULL,
  ton_price_at_activation DECIMAL(10,2) NOT NULL,
  transaction_hash TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES wallet_users(id) ON DELETE CASCADE
);
```

### 3. Creates RLS Policies
```sql
ALTER TABLE wallet_activations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activations" ON wallet_activations
  FOR SELECT USING (user_id = auth.uid() OR wallet_address = current_setting('app.current_user_address', TRUE));

CREATE POLICY "Users can insert their own activations" ON wallet_activations
  FOR INSERT WITH CHECK (user_id = auth.uid() OR wallet_address = current_setting('app.current_user_address', TRUE));
```

### 4. Creates Functions
```sql
-- activate_wallet(p_wallet_address, p_activation_fee_usd, p_activation_fee_ton, p_ton_price, p_transaction_hash)
-- check_wallet_activation(p_wallet_address)
```

## 🔧 ALTERNATIVE: Temporary RLS Bypass (Not Recommended)

If you need to test immediately without proper RLS setup, you can temporarily disable RLS:

```sql
-- TEMPORARY ONLY - NOT FOR PRODUCTION
ALTER TABLE wallet_activations DISABLE ROW LEVEL SECURITY;
```

**⚠️ WARNING**: This removes security and should NEVER be used in production!

## 🚀 AFTER MIGRATION

### Test the Activation Flow

1. **Login to wallet**
2. **Navigate to Mining Nodes**
3. **Purchase Test Node (0.01 TON)**
4. **Verify activation succeeds**
5. **Check database records**

### Verify Database Records

```sql
-- Check wallet_users activation status
SELECT 
  wallet_address,
  is_activated,
  activated_at,
  activation_fee_paid,
  created_at
FROM wallet_users
WHERE wallet_address = 'YOUR_WALLET_ADDRESS';

-- Check wallet_activations records
SELECT 
  id,
  wallet_address,
  activation_fee_usd,
  activation_fee_ton,
  ton_price_at_activation,
  transaction_hash,
  status,
  created_at,
  completed_at
FROM wallet_activations
WHERE wallet_address = 'YOUR_WALLET_ADDRESS';
```

## 📝 TROUBLESHOOTING

### Error: "relation wallet_activations does not exist"
**Solution**: Run the SQL migration to create the table

### Error: "column is_activated does not exist"
**Solution**: Run the SQL migration to add columns to wallet_users

### Error: "function activate_wallet does not exist"
**Solution**: Run the SQL migration to create the functions

### Error: "permission denied for table wallet_activations"
**Solution**: Check RLS policies are created correctly

### Error: "violates foreign key constraint"
**Solution**: Ensure user exists in wallet_users table first

## 🔒 SECURITY NOTES

### RLS Policies Explained

**SELECT Policy**: "Users can view their own activations"
- Allows users to see their own activation records
- Uses `user_id = auth.uid()` to match authenticated user
- Also allows matching by wallet_address

**INSERT Policy**: "Users can insert their own activations"
- Allows users to create activation records for themselves
- Prevents users from creating activations for other users
- Uses same matching logic as SELECT policy

### Why RLS is Important

1. **Data Privacy**: Users can only see their own data
2. **Security**: Prevents unauthorized modifications
3. **Compliance**: Meets data protection requirements
4. **Audit Trail**: Tracks who accessed what data

## ✨ SUMMARY

The RLS policy error occurs because the database migration hasn't been run yet. Execute the `add_wallet_activation_FIXED.sql` file in your Supabase SQL Editor to:

1. Add activation columns to wallet_users
2. Create wallet_activations table
3. Set up RLS policies
4. Create activation functions

After running the migration, the wallet activation flow will work correctly and the error will be resolved.

## 📋 QUICK CHECKLIST

- [ ] Open Supabase Dashboard
- [ ] Go to SQL Editor
- [ ] Copy contents of `add_wallet_activation_FIXED.sql`
- [ ] Paste and run in SQL Editor
- [ ] Verify tables created
- [ ] Verify RLS policies exist
- [ ] Test wallet activation
- [ ] Verify database records
- [ ] Confirm error is resolved

## 🎯 NEXT STEPS

After fixing the RLS error:

1. Test activation with Test Node (0.01 TON)
2. Verify wallet activates successfully
3. Check lock overlay disappears
4. Confirm full wallet access
5. Test with production nodes
6. Monitor activation statistics
