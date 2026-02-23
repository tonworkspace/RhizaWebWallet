# Complete Database Schema - RhizaCore Wallet 🗄️

## Overview

Your database now includes 11 main tables covering users, transactions, referrals, notifications, RZC tokens, and newsletter subscriptions.

---

## Schema Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    RHIZACORE WALLET DATABASE                    │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│   wallet_users       │ ← Core user profiles
├──────────────────────┤
│ id (PK)              │
│ wallet_address (UQ)  │───┐
│ email                │   │
│ name                 │   │
│ avatar               │   │
│ role                 │   │
│ referrer_code        │   │
│ rzc_balance          │   │
│ last_login_at        │   │
└──────────────────────┘   │
                           │
                           │ Referenced by:
                           │
        ┌──────────────────┼──────────────────┬──────────────────┐
        │                  │                  │                  │
        ▼                  ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ transactions │  │  referrals   │  │notifications │  │  activity    │
├──────────────┤  ├──────────────┤  ├──────────────┤  ├──────────────┤
│ user_id (FK) │  │ user_id (FK) │  │ user_id (FK) │  │ user_id (FK) │
│ wallet_addr  │  │ referrer_id  │  │ wallet_addr  │  │ wallet_addr  │
│ type         │  │ referral_code│  │ type         │  │ activity_type│
│ amount       │  │ total_earned │  │ title        │  │ description  │
│ asset        │  │ total_refs   │  │ message      │  │ metadata     │
│ status       │  │ rank         │  │ is_read      │  │ created_at   │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘

┌──────────────────────┐
│ referral_earnings    │ ← Tracks individual referral rewards
├──────────────────────┤
│ id (PK)              │
│ referral_id (FK)     │───→ wallet_referrals
│ referred_user_id     │
│ amount               │
│ type                 │
│ created_at           │
└──────────────────────┘

┌──────────────────────┐
│ rzc_transactions     │ ← RZC token movements
├──────────────────────┤
│ id (PK)              │
│ user_id (FK)         │───→ wallet_users
│ wallet_address       │
│ type                 │
│ amount               │
│ balance_after        │
│ source               │
│ metadata             │
│ created_at           │
└──────────────────────┘

┌──────────────────────┐
│ rzc_reward_claims    │ ← RZC reward claiming
├──────────────────────┤
│ id (PK)              │
│ user_id (FK)         │───→ wallet_users
│ wallet_address       │
│ amount               │
│ claim_type           │
│ status               │
│ tx_hash              │
│ created_at           │
└──────────────────────┘

┌──────────────────────┐
│ analytics_events     │ ← User behavior tracking
├──────────────────────┤
│ id (PK)              │
│ user_id (FK)         │───→ wallet_users
│ event_type           │
│ event_name           │
│ properties           │
│ created_at           │
└──────────────────────┘

┌──────────────────────┐
│ notification_prefs   │ ← User notification settings
├──────────────────────┤
│ id (PK)              │
│ user_id (FK)         │───→ wallet_users
│ wallet_address       │
│ enable_transaction   │
│ enable_referral      │
│ enable_reward        │
│ enable_system        │
│ enable_security      │
│ enable_push          │
│ enable_email         │
└──────────────────────┘

┌──────────────────────┐
│ newsletter_subs      │ ← NEW! Newsletter subscriptions
├──────────────────────┤
│ id (PK)              │
│ email (UQ)           │
│ status               │
│ source               │
│ ip_address           │
│ user_agent           │
│ metadata             │
│ subscribed_at        │
│ unsubscribed_at      │
│ created_at           │
└──────────────────────┘
```

---

## Table Details

### 1. wallet_users (Core)
**Purpose:** User profiles and authentication
**Key Fields:**
- `wallet_address` - Unique TON wallet address
- `rzc_balance` - RZC token balance
- `referrer_code` - Code used to refer others
- `role` - user or admin

**Relationships:**
- Referenced by all other tables via `user_id` or `wallet_address`

---

### 2. wallet_transactions
**Purpose:** TON blockchain transactions
**Key Fields:**
- `type` - send, receive, swap, stake
- `amount` - Transaction amount
- `asset` - TON, USDT, etc.
- `status` - pending, confirmed, failed

**Relationships:**
- `user_id` → wallet_users

---

### 3. wallet_referrals
**Purpose:** Referral system data
**Key Fields:**
- `referral_code` - Unique referral code
- `total_earned` - Total RZC earned
- `total_referrals` - Number of referrals
- `rank` - Core/Growth/Power/Master Node

**Relationships:**
- `user_id` → wallet_users
- `referrer_id` → wallet_users (who referred them)

---

### 4. wallet_referral_earnings
**Purpose:** Individual referral rewards
**Key Fields:**
- `amount` - RZC amount earned
- `type` - signup_bonus, referral_bonus
- `referred_user_id` - Who was referred

**Relationships:**
- `referral_id` → wallet_referrals

---

### 5. wallet_notifications
**Purpose:** In-app notifications
**Key Fields:**
- `type` - transaction, referral, reward, system
- `title` - Notification title
- `message` - Notification content
- `is_read` - Read status
- `priority` - low, normal, high, urgent

**Relationships:**
- `user_id` → wallet_users

---

### 6. wallet_activity_logs
**Purpose:** User activity tracking
**Key Fields:**
- `activity_type` - login, transaction, page_viewed
- `description` - Activity description
- `metadata` - Additional data (JSONB)

**Relationships:**
- `user_id` → wallet_users

---

### 7. wallet_notification_preferences
**Purpose:** User notification settings
**Key Fields:**
- `enable_transaction_notifications`
- `enable_referral_notifications`
- `enable_push_notifications`
- `enable_email_notifications`

**Relationships:**
- `user_id` → wallet_users

---

### 8. wallet_rzc_transactions
**Purpose:** RZC token movements
**Key Fields:**
- `type` - earn, spend, transfer, claim
- `amount` - RZC amount
- `balance_after` - Balance after transaction
- `source` - signup, referral, reward

**Relationships:**
- `user_id` → wallet_users

---

### 9. wallet_rzc_reward_claims
**Purpose:** RZC reward claiming
**Key Fields:**
- `amount` - RZC amount claimed
- `claim_type` - referral, milestone, bonus
- `status` - pending, completed, failed
- `tx_hash` - Blockchain transaction hash

**Relationships:**
- `user_id` → wallet_users

---

### 10. wallet_analytics_events
**Purpose:** Analytics and tracking
**Key Fields:**
- `event_type` - page_view, button_click, feature_used
- `event_name` - Specific event name
- `properties` - Event data (JSONB)

**Relationships:**
- `user_id` → wallet_users

---

### 11. wallet_newsletter_subscriptions (NEW!)
**Purpose:** Newsletter email subscriptions
**Key Fields:**
- `email` - Subscriber email (UNIQUE)
- `status` - active, unsubscribed
- `source` - landing_page, etc.
- `metadata` - Additional data (JSONB)

**Relationships:**
- Standalone table (no foreign keys)
- Can be linked to users via email matching

---

## Indexes Summary

### Performance Indexes
```sql
-- Users
idx_wallet_users_wallet_address
idx_wallet_users_email
idx_wallet_users_referrer_code

-- Transactions
idx_wallet_transactions_wallet_address
idx_wallet_transactions_status
idx_wallet_transactions_created_at

-- Referrals
idx_wallet_referrals_user_id
idx_wallet_referrals_referral_code
idx_wallet_referrals_referrer_id

-- Notifications
idx_wallet_notifications_wallet_address
idx_wallet_notifications_is_read
idx_wallet_notifications_created_at

-- Activity Logs
idx_wallet_activity_logs_wallet_address
idx_wallet_activity_logs_activity_type
idx_wallet_activity_logs_created_at

-- RZC Transactions
idx_wallet_rzc_transactions_wallet_address
idx_wallet_rzc_transactions_type
idx_wallet_rzc_transactions_created_at

-- Newsletter (NEW!)
idx_newsletter_email
idx_newsletter_status
idx_newsletter_subscribed_at
```

---

## Row Level Security (RLS)

### Enabled on All Tables ✅

**wallet_users:**
- Users can view/update their own profile
- Admins can view all profiles

**wallet_transactions:**
- Users can view their own transactions
- Admins can view all transactions

**wallet_referrals:**
- Users can view their own referral data
- Admins can view all referral data

**wallet_notifications:**
- Users can view their own notifications
- Admins can view all notifications

**wallet_newsletter_subscriptions (NEW!):**
- Anyone can INSERT (subscribe)
- Only admins can SELECT (view list)
- Only admins can UPDATE (manage)

---

## Database Statistics

### Total Tables: 11
- Core: 1 (wallet_users)
- Transactions: 2 (wallet_transactions, wallet_rzc_transactions)
- Referrals: 2 (wallet_referrals, wallet_referral_earnings)
- Notifications: 2 (wallet_notifications, wallet_notification_preferences)
- Activity: 2 (wallet_activity_logs, wallet_analytics_events)
- Rewards: 1 (wallet_rzc_reward_claims)
- Newsletter: 1 (wallet_newsletter_subscriptions) ← NEW!

### Total Indexes: ~35
### Total RLS Policies: ~25
### Total Functions: 6
### Total Triggers: 3
### Total Views: 2

---

## Migration Files

### Main Migration
`supabase_migration_safe.sql` - Complete database setup

### Specialized Migrations
- `supabase_notifications_migration.sql` - Notifications system
- `supabase_rzc_migration.sql` - RZC token system
- `add_newsletter_table_only.sql` - Newsletter table only (NEW!)

### Check Scripts
- `check_newsletter_table.sql` - Check if newsletter table exists

---

## Quick Queries

### Get User Complete Profile
```sql
SELECT 
  u.*,
  r.referral_code,
  r.total_earned,
  r.total_referrals,
  r.rank,
  COUNT(DISTINCT t.id) as transaction_count,
  COUNT(DISTINCT n.id) as notification_count
FROM wallet_users u
LEFT JOIN wallet_referrals r ON u.id = r.user_id
LEFT JOIN wallet_transactions t ON u.id = t.user_id
LEFT JOIN wallet_notifications n ON u.id = n.user_id
WHERE u.wallet_address = 'YOUR_WALLET_ADDRESS'
GROUP BY u.id, r.referral_code, r.total_earned, r.total_referrals, r.rank;
```

### Get Database Statistics
```sql
SELECT 
  (SELECT COUNT(*) FROM wallet_users) as total_users,
  (SELECT COUNT(*) FROM wallet_transactions) as total_transactions,
  (SELECT COUNT(*) FROM wallet_referrals) as total_referrals,
  (SELECT COUNT(*) FROM wallet_notifications) as total_notifications,
  (SELECT COUNT(*) FROM wallet_newsletter_subscriptions) as total_newsletter_subs,
  (SELECT COUNT(*) FROM wallet_newsletter_subscriptions WHERE status = 'active') as active_newsletter_subs;
```

### Get Recent Activity
```sql
SELECT 
  'transaction' as type,
  wallet_address,
  type as action,
  created_at
FROM wallet_transactions
WHERE created_at > NOW() - INTERVAL '24 hours'

UNION ALL

SELECT 
  'activity' as type,
  wallet_address,
  activity_type as action,
  created_at
FROM wallet_activity_logs
WHERE created_at > NOW() - INTERVAL '24 hours'

ORDER BY created_at DESC
LIMIT 50;
```

---

## Summary

Your RhizaCore Wallet database is now complete with:

✅ User management and authentication
✅ Transaction tracking (TON blockchain)
✅ Referral system with rewards
✅ RZC token system
✅ Notification system
✅ Activity tracking
✅ Analytics events
✅ Newsletter subscriptions (NEW!)

All tables have:
- Proper indexes for performance
- Row Level Security for data protection
- Timestamps for auditing
- JSONB fields for flexibility

The database is production-ready and scalable! 🚀
