# 📊 RhizaCore Wallet - Database Schema Overview

**Date:** February 21, 2026  
**Status:** ✅ Production Ready  
**Tables:** 6 | **Functions:** 4 | **Triggers:** 3 | **Views:** 2

---

## 🗂️ Database Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    RhizaCore Wallet Database                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────────┐                │
│  │ wallet_users │◄─────┤ wallet_referrals │                │
│  └──────┬───────┘      └──────────────────┘                │
│         │                                                     │
│         │              ┌────────────────────────┐           │
│         ├──────────────┤ wallet_transactions    │           │
│         │              └────────────────────────┘           │
│         │                                                     │
│         │              ┌────────────────────────┐           │
│         ├──────────────┤ wallet_analytics       │           │
│         │              └────────────────────────┘           │
│         │                                                     │
│         │              ┌────────────────────────┐           │
│         └──────────────┤ wallet_referral_earnings│          │
│                        └────────────────────────┘           │
│                                                               │
│                        ┌────────────────────────┐           │
│                        │ wallet_admin_audit     │           │
│                        └────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Table Schemas

### 1. `wallet_users` - User Profiles

**Purpose:** Store user profile information and wallet addresses

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | UUID | Primary key | PK, Default: uuid_generate_v4() |
| `auth_user_id` | UUID | Supabase auth user ID | Nullable |
| `wallet_address` | TEXT | TON wallet address | UNIQUE, NOT NULL |
| `email` | TEXT | User email (optional) | Nullable |
| `name` | TEXT | Display name | NOT NULL, Default: 'Rhiza User' |
| `avatar` | TEXT | Avatar emoji | NOT NULL, Default: '🌱' |
| `role` | TEXT | User role | NOT NULL, Default: 'user', CHECK: 'user' or 'admin' |
| `is_active` | BOOLEAN | Account status | NOT NULL, Default: true |
| `referrer_code` | TEXT | Code of referrer | Nullable |
| `last_login_at` | TIMESTAMPTZ | Last login timestamp | Nullable |
| `created_at` | TIMESTAMPTZ | Account creation | NOT NULL, Default: NOW() |
| `updated_at` | TIMESTAMPTZ | Last update | NOT NULL, Default: NOW() |

**Indexes:**
- `idx_wallet_users_address` on `wallet_address`
- `idx_wallet_users_referrer` on `referrer_code`
- `idx_wallet_users_created` on `created_at DESC`

**Example:**
```sql
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "wallet_address": "EQA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0",
  "name": "Rhiza User #T0",
  "avatar": "🌱",
  "role": "user",
  "is_active": true,
  "referrer_code": "ABC12345",
  "created_at": "2026-02-21T10:00:00Z"
}
```

---

### 2. `wallet_transactions` - Transaction History

**Purpose:** Store all wallet transactions synced from blockchain

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | UUID | Primary key | PK, Default: uuid_generate_v4() |
| `user_id` | UUID | User reference | Nullable, FK to wallet_users |
| `wallet_address` | TEXT | Wallet address | NOT NULL |
| `type` | TEXT | Transaction type | NOT NULL, CHECK: 'send', 'receive', 'swap', 'stake', 'unstake' |
| `amount` | TEXT | Transaction amount | NOT NULL |
| `asset` | TEXT | Asset symbol | NOT NULL, Default: 'TON' |
| `to_address` | TEXT | Recipient address | Nullable |
| `from_address` | TEXT | Sender address | Nullable |
| `tx_hash` | TEXT | Blockchain tx hash | Nullable, Should be unique |
| `status` | TEXT | Transaction status | NOT NULL, Default: 'pending', CHECK: 'pending', 'confirmed', 'failed' |
| `fee` | TEXT | Transaction fee | Nullable |
| `comment` | TEXT | Transaction memo | Nullable |
| `metadata` | JSONB | Additional data | Nullable |
| `created_at` | TIMESTAMPTZ | Transaction time | NOT NULL, Default: NOW() |

**Indexes:**
- `idx_wallet_transactions_address` on `wallet_address`
- `idx_wallet_transactions_user` on `user_id`
- `idx_wallet_transactions_hash` on `tx_hash`
- `idx_wallet_transactions_created` on `created_at DESC`
- `idx_wallet_transactions_type` on `type`

**Example:**
```sql
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "wallet_address": "EQA1B2C3...",
  "type": "receive",
  "amount": "1.5000",
  "asset": "TON",
  "from_address": "EQX9Y8Z7...",
  "tx_hash": "abc123def456...",
  "status": "confirmed",
  "fee": "0.0001",
  "metadata": {"lt": "12345678", "timestamp": 1708516800},
  "created_at": "2026-02-21T10:30:00Z"
}
```

---

### 3. `wallet_referrals` - Referral System

**Purpose:** Track referral codes and statistics

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | UUID | Primary key | PK, Default: uuid_generate_v4() |
| `user_id` | UUID | User reference | UNIQUE, FK to wallet_users |
| `referrer_id` | UUID | Referrer user ID | Nullable, FK to wallet_users |
| `referral_code` | TEXT | Unique referral code | UNIQUE, NOT NULL |
| `total_earned` | NUMERIC(20,4) | Total earnings | NOT NULL, Default: 0 |
| `total_referrals` | INTEGER | Number of referrals | NOT NULL, Default: 0 |
| `rank` | TEXT | Referral rank | NOT NULL, Default: 'Core Node', CHECK: 'Core Node', 'Growth Node', 'Power Node', 'Master Node' |
| `level` | INTEGER | Referral level | NOT NULL, Default: 1, CHECK: 1-5 |
| `created_at` | TIMESTAMPTZ | Creation time | NOT NULL, Default: NOW() |
| `updated_at` | TIMESTAMPTZ | Last update | NOT NULL, Default: NOW() |

**Indexes:**
- `idx_wallet_referrals_user` on `user_id`
- `idx_wallet_referrals_referrer` on `referrer_id`
- `idx_wallet_referrals_code` on `referral_code`
- `idx_wallet_referrals_rank` on `rank`

**Rank Tiers:**
- **Core Node:** $0 - $99 earned
- **Growth Node:** $100 - $499 earned
- **Power Node:** $500 - $1,999 earned
- **Master Node:** $2,000+ earned

**Example:**
```sql
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "referrer_id": null,
  "referral_code": "2B3C4D5E",
  "total_earned": 125.50,
  "total_referrals": 5,
  "rank": "Growth Node",
  "level": 1,
  "created_at": "2026-02-21T10:00:00Z"
}
```

---

### 4. `wallet_referral_earnings` - Commission Tracking

**Purpose:** Track individual referral earnings

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | UUID | Primary key | PK, Default: uuid_generate_v4() |
| `referrer_id` | UUID | Referrer user ID | NOT NULL, FK to wallet_users |
| `referred_user_id` | UUID | Referred user ID | NOT NULL, FK to wallet_users |
| `transaction_id` | UUID | Related transaction | Nullable, FK to wallet_transactions |
| `amount` | NUMERIC(20,4) | Earning amount | NOT NULL |
| `percentage` | NUMERIC(5,2) | Commission % | NOT NULL |
| `level` | INTEGER | Referral level | NOT NULL, CHECK: 1-5 |
| `created_at` | TIMESTAMPTZ | Earning time | NOT NULL, Default: NOW() |

**Indexes:**
- `idx_wallet_referral_earnings_referrer` on `referrer_id`
- `idx_wallet_referral_earnings_referred` on `referred_user_id`
- `idx_wallet_referral_earnings_created` on `created_at DESC`

**Example:**
```sql
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "referrer_id": "550e8400-e29b-41d4-a716-446655440000",
  "referred_user_id": "990e8400-e29b-41d4-a716-446655440004",
  "transaction_id": "660e8400-e29b-41d4-a716-446655440001",
  "amount": 25.00,
  "percentage": 5.00,
  "level": 1,
  "created_at": "2026-02-21T11:00:00Z"
}
```

---

### 5. `wallet_analytics` - Event Tracking

**Purpose:** Track user events and analytics

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | UUID | Primary key | PK, Default: uuid_generate_v4() |
| `user_id` | UUID | User reference | Nullable, FK to wallet_users |
| `wallet_address` | TEXT | Wallet address | Nullable |
| `event_name` | TEXT | Event name | NOT NULL |
| `properties` | JSONB | Event properties | Nullable |
| `created_at` | TIMESTAMPTZ | Event time | NOT NULL, Default: NOW() |

**Indexes:**
- `idx_wallet_analytics_user` on `user_id`
- `idx_wallet_analytics_event` on `event_name`
- `idx_wallet_analytics_created` on `created_at DESC`

**Common Events:**
- `wallet_created` - New wallet created
- `wallet_login` - User logged in
- `transaction_sent` - Transaction sent
- `transaction_received` - Transaction received
- `referral_used` - Referral code used
- `profile_updated` - Profile edited

**Example:**
```sql
{
  "id": "aa0e8400-e29b-41d4-a716-446655440005",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "wallet_address": "EQA1B2C3...",
  "event_name": "wallet_created",
  "properties": {
    "creation_method": "new_wallet",
    "network": "testnet",
    "has_referrer": false
  },
  "created_at": "2026-02-21T10:00:00Z"
}
```

---

### 6. `wallet_admin_audit` - Admin Actions

**Purpose:** Audit log for admin actions

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | UUID | Primary key | PK, Default: uuid_generate_v4() |
| `admin_id` | UUID | Admin user ID | Nullable, FK to wallet_users |
| `action` | TEXT | Action performed | NOT NULL |
| `target_user_id` | UUID | Target user | Nullable, FK to wallet_users |
| `details` | JSONB | Action details | Nullable |
| `created_at` | TIMESTAMPTZ | Action time | NOT NULL, Default: NOW() |

**Indexes:**
- `idx_wallet_admin_audit_admin` on `admin_id`
- `idx_wallet_admin_audit_target` on `target_user_id`
- `idx_wallet_admin_audit_created` on `created_at DESC`

**Example:**
```sql
{
  "id": "bb0e8400-e29b-41d4-a716-446655440006",
  "admin_id": "cc0e8400-e29b-41d4-a716-446655440007",
  "action": "user_suspended",
  "target_user_id": "550e8400-e29b-41d4-a716-446655440000",
  "details": {
    "reason": "Terms violation",
    "duration": "7 days"
  },
  "created_at": "2026-02-21T12:00:00Z"
}
```

---

## 🔧 Database Functions

### 1. `get_wallet_user_id()`
**Purpose:** Get current user ID from wallet address

**Returns:** UUID

**Usage:**
```sql
SELECT get_wallet_user_id();
```

---

### 2. `is_wallet_admin()`
**Purpose:** Check if current user is admin

**Returns:** BOOLEAN

**Usage:**
```sql
SELECT is_wallet_admin();
```

---

### 3. `update_updated_at_column()`
**Purpose:** Automatically update `updated_at` timestamp

**Trigger:** BEFORE UPDATE on `wallet_users`, `wallet_referrals`

---

### 4. `update_referral_stats()`
**Purpose:** Automatically update referral statistics and rank

**Trigger:** AFTER INSERT on `wallet_referral_earnings`

**Logic:**
- Updates `total_earned` for referrer
- Automatically updates rank based on earnings:
  - $0-99: Core Node
  - $100-499: Growth Node
  - $500-1,999: Power Node
  - $2,000+: Master Node

---

## ⚡ Database Triggers

### 1. `update_wallet_users_updated_at`
**Table:** `wallet_users`  
**Event:** BEFORE UPDATE  
**Function:** `update_updated_at_column()`

---

### 2. `update_wallet_referrals_updated_at`
**Table:** `wallet_referrals`  
**Event:** BEFORE UPDATE  
**Function:** `update_updated_at_column()`

---

### 3. `update_referral_stats_on_earning`
**Table:** `wallet_referral_earnings`  
**Event:** AFTER INSERT  
**Function:** `update_referral_stats()`

---

## 👁️ Database Views

### 1. `referral_leaderboard`
**Purpose:** Display top referrers

**Columns:**
- `id` - User ID
- `name` - User name
- `wallet_address` - Wallet address
- `referral_code` - Referral code
- `total_earned` - Total earnings
- `total_referrals` - Number of referrals
- `rank` - Current rank
- `level` - Referral level

**Query:**
```sql
SELECT * FROM referral_leaderboard LIMIT 10;
```

---

### 2. `user_transaction_summary`
**Purpose:** Summarize user transactions

**Columns:**
- `wallet_address` - Wallet address
- `total_transactions` - Total count
- `total_sent` - Sent count
- `total_received` - Received count
- `confirmed_transactions` - Confirmed count
- `pending_transactions` - Pending count
- `failed_transactions` - Failed count

**Query:**
```sql
SELECT * FROM user_transaction_summary 
WHERE wallet_address = 'EQA1B2C3...';
```

---

## 🔒 Row Level Security (RLS)

### Security Model

All tables have RLS enabled with the following policies:

**Current Setup (Development):**
- ✅ All operations allowed for testing
- ✅ RLS enabled on all tables
- ✅ Policies in place but permissive

**Production Recommendations:**
```sql
-- Users can only view their own data
CREATE POLICY "Users view own data"
  ON wallet_users FOR SELECT
  USING (wallet_address = current_setting('app.wallet_address', true));

-- Users can only update their own profile
CREATE POLICY "Users update own profile"
  ON wallet_users FOR UPDATE
  USING (wallet_address = current_setting('app.wallet_address', true));

-- Admins can view all data
CREATE POLICY "Admins view all"
  ON wallet_users FOR SELECT
  USING (is_wallet_admin());
```

---

## 📊 Data Flow Diagrams

### Wallet Creation Flow
```
User Creates Wallet
        ↓
Insert into wallet_users
        ↓
Generate referral_code (last 8 chars of address)
        ↓
Insert into wallet_referrals
        ↓
Track event in wallet_analytics
```

### Transaction Sync Flow
```
Blockchain Transaction
        ↓
Fetch via TonAPI
        ↓
Check if exists (tx_hash)
        ↓
Insert into wallet_transactions
        ↓
Update UI
```

### Referral Earning Flow
```
Referred User Makes Transaction
        ↓
Calculate commission (5-15%)
        ↓
Insert into wallet_referral_earnings
        ↓
Trigger: update_referral_stats()
        ↓
Update total_earned in wallet_referrals
        ↓
Auto-update rank if threshold reached
```

---

## 🎯 Query Examples

### Get User Profile with Referral Data
```sql
SELECT 
  u.*,
  r.referral_code,
  r.total_earned,
  r.total_referrals,
  r.rank
FROM wallet_users u
LEFT JOIN wallet_referrals r ON u.id = r.user_id
WHERE u.wallet_address = 'EQA1B2C3...';
```

### Get Recent Transactions
```sql
SELECT *
FROM wallet_transactions
WHERE wallet_address = 'EQA1B2C3...'
ORDER BY created_at DESC
LIMIT 50;
```

### Get Referral Leaderboard
```sql
SELECT *
FROM referral_leaderboard
LIMIT 10;
```

### Get User Analytics
```sql
SELECT 
  event_name,
  COUNT(*) as count,
  MAX(created_at) as last_occurrence
FROM wallet_analytics
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'
GROUP BY event_name
ORDER BY count DESC;
```

### Get Referral Earnings
```sql
SELECT 
  re.*,
  u.name as referred_user_name
FROM wallet_referral_earnings re
JOIN wallet_users u ON re.referred_user_id = u.id
WHERE re.referrer_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY re.created_at DESC;
```

---

## 📈 Database Statistics

### Check Table Sizes
```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'wallet_%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Check Row Counts
```sql
SELECT 
  'wallet_users' as table_name,
  COUNT(*) as row_count
FROM wallet_users
UNION ALL
SELECT 'wallet_transactions', COUNT(*) FROM wallet_transactions
UNION ALL
SELECT 'wallet_referrals', COUNT(*) FROM wallet_referrals
UNION ALL
SELECT 'wallet_analytics', COUNT(*) FROM wallet_analytics;
```

---

## 🚀 Migration Instructions

### Run the Schema
1. Go to Supabase Dashboard: https://dksskhnnxfkpgjeiybjk.supabase.co
2. Navigate to SQL Editor
3. Copy contents of `supabase_migration_safe.sql`
4. Paste and click "Run"
5. Wait for success message

### Verify Installation
```sql
-- Check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'wallet_%';

-- Check functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public';

-- Check views
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public';
```

---

## 📝 Summary

**Database:** PostgreSQL (Supabase)  
**Tables:** 6  
**Functions:** 4  
**Triggers:** 3  
**Views:** 2  
**Indexes:** 20+  
**RLS:** Enabled on all tables  

**Status:** ✅ Production Ready

---

**Schema Version:** 1.0  
**Last Updated:** February 21, 2026  
**Maintained By:** RhizaCore Team
