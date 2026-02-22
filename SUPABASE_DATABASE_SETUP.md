# 🗄️ Supabase Database Setup Guide

**Status:** Ready to Run  
**File:** `supabase_setup_simple.sql`

---

## 📋 Step-by-Step Instructions

### Step 1: Open Supabase Dashboard

1. Go to: https://dksskhnnxfkpgjeiybjk.supabase.co
2. Login if needed

### Step 2: Open SQL Editor

1. Click **"SQL Editor"** in the left sidebar
2. Click **"New Query"** button

### Step 3: Copy the SQL Script

1. Open the file: `supabase_setup_simple.sql`
2. Select all content (Ctrl+A)
3. Copy (Ctrl+C)

### Step 4: Paste and Run

1. Paste into the SQL Editor (Ctrl+V)
2. Click **"Run"** button (or press Ctrl+Enter)
3. Wait for completion (should take 2-3 seconds)

### Step 5: Verify Tables Created

1. Click **"Table Editor"** in the left sidebar
2. You should see these tables:
   - ✅ `wallet_users`
   - ✅ `wallet_transactions`
   - ✅ `wallet_referrals`
   - ✅ `wallet_referral_earnings`
   - ✅ `wallet_analytics`
   - ✅ `wallet_admin_audit`

---

## ✅ What the Script Creates

### Tables (6)
1. **wallet_users** - User profiles
2. **wallet_transactions** - Transaction history
3. **wallet_referrals** - Referral system
4. **wallet_referral_earnings** - Commission tracking
5. **wallet_analytics** - Event tracking
6. **wallet_admin_audit** - Admin actions

### Indexes (9)
- Fast lookups by wallet address
- Fast lookups by transaction hash
- Fast lookups by referral code
- Fast lookups by user ID
- Fast lookups by event name

### Functions (3)
- `update_updated_at_column()` - Auto-update timestamps
- `get_wallet_user_id()` - Get current user ID
- `is_wallet_admin()` - Check if user is admin

### Triggers (2)
- Auto-update `updated_at` on wallet_users
- Auto-update `updated_at` on wallet_referrals

### Security (RLS Policies)
- Row Level Security enabled on all tables
- Users can view/update their own data
- Public read access for referral codes
- Admin-only access for audit logs

---

## 🧪 Test the Setup

After running the script, test in SQL Editor:

```sql
-- Test 1: Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'wallet_%';

-- Test 2: Insert a test user
INSERT INTO wallet_users (wallet_address, name, avatar)
VALUES ('EQTest123', 'Test User', '🧪')
RETURNING *;

-- Test 3: Check the user was created
SELECT * FROM wallet_users WHERE wallet_address = 'EQTest123';

-- Test 4: Delete test user
DELETE FROM wallet_users WHERE wallet_address = 'EQTest123';
```

---

## 🔍 Verify Each Table

### wallet_users
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'wallet_users'
ORDER BY ordinal_position;
```

Expected columns:
- id (uuid)
- auth_user_id (uuid)
- wallet_address (text)
- email (text)
- name (text)
- avatar (text)
- role (text)
- is_active (boolean)
- referrer_code (text)
- last_login_at (timestamptz)
- created_at (timestamptz)
- updated_at (timestamptz)

### wallet_transactions
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'wallet_transactions'
ORDER BY ordinal_position;
```

Expected columns:
- id (uuid)
- user_id (uuid)
- wallet_address (text)
- type (text)
- amount (text)
- asset (text)
- to_address (text)
- from_address (text)
- tx_hash (text)
- status (text)
- metadata (jsonb)
- created_at (timestamptz)

### wallet_referrals
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'wallet_referrals'
ORDER BY ordinal_position;
```

Expected columns:
- id (uuid)
- user_id (uuid)
- referrer_id (uuid)
- referral_code (text)
- total_earned (numeric)
- total_referrals (integer)
- rank (text)
- level (integer)
- created_at (timestamptz)
- updated_at (timestamptz)

---

## 🚨 Troubleshooting

### Error: "relation already exists"
**Solution:** The table already exists. This is fine, the script will skip it.

### Error: "permission denied"
**Solution:** Make sure you're logged in as the project owner.

### Error: "syntax error"
**Solution:** Make sure you copied the entire script, including the first line.

### Tables not showing in Table Editor
**Solution:** 
1. Refresh the page
2. Check the SQL Editor for error messages
3. Run the verification query:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'wallet_%';
```

---

## 🎯 After Setup

Once the database is set up, your wallet app will automatically:

1. ✅ Create user profiles when wallets are created
2. ✅ Generate referral codes
3. ✅ Track analytics events
4. ✅ Sync transactions from blockchain
5. ✅ Display real data in UI

---

## 📊 Check Database Stats

After using the app for a while, check your stats:

```sql
-- Count users
SELECT COUNT(*) as total_users FROM wallet_users;

-- Count transactions
SELECT COUNT(*) as total_transactions FROM wallet_transactions;

-- Count referrals
SELECT COUNT(*) as total_referrals FROM wallet_referrals;

-- Count analytics events
SELECT COUNT(*) as total_events FROM wallet_analytics;

-- Recent users
SELECT name, wallet_address, created_at 
FROM wallet_users 
ORDER BY created_at DESC 
LIMIT 10;

-- Recent transactions
SELECT wallet_address, type, amount, asset, created_at 
FROM wallet_transactions 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 🔐 Security Notes

- ✅ Row Level Security (RLS) is enabled
- ✅ Users can only access their own data
- ✅ Referral codes are publicly readable (for validation)
- ✅ Admin audit logs are admin-only
- ✅ No sensitive data stored (no private keys or mnemonics)

---

## ✅ Success Checklist

After running the script, verify:

- [ ] All 6 tables created
- [ ] All indexes created
- [ ] All functions created
- [ ] All triggers created
- [ ] RLS enabled on all tables
- [ ] RLS policies created
- [ ] Test insert/select works
- [ ] Tables visible in Table Editor

---

## 🎉 You're Done!

Once the script runs successfully:

1. ✅ Database is fully set up
2. ✅ All tables created
3. ✅ Security configured
4. ✅ Ready for your wallet app

**Next Step:** Run `npm run dev` and test your wallet!

---

**Setup Date:** February 21, 2026  
**Script:** `supabase_setup_simple.sql`  
**Status:** Ready to Run
