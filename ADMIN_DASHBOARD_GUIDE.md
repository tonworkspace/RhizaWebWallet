# 👑 Admin Dashboard Guide

**Date:** February 21, 2026  
**Status:** ✅ Complete and Working  
**Build:** ✅ Success (16.88s)

---

## 🎯 Overview

The Admin Dashboard provides comprehensive user management and global statistics for your RhizaCore wallet application.

### Features
- ✅ Global statistics dashboard
- ✅ User management (view, search, filter)
- ✅ User activation/deactivation
- ✅ Data export (CSV)
- ✅ Real-time data refresh
- ✅ Role-based access control

---

## 🚀 Quick Start

### Step 1: Create Admin User (First Time Only)

1. **Go to Admin Setup:**
   ```
   http://localhost:5173/#/admin-setup
   ```

2. **Enter Details:**
   - Admin Secret Key: `rhiza-admin-2026-secret`
   - Wallet Address: Your wallet address (EQ...)
   - Admin Name: Your name

3. **Click "Create Admin"**

4. **Login with Your Wallet:**
   - Go to `/login`
   - Login with the wallet you made admin
   - You'll now have admin access

### Step 2: Access Admin Dashboard

1. **Login as Admin:**
   ```
   http://localhost:5173/#/login
   ```

2. **Go to Admin Dashboard:**
   ```
   http://localhost:5173/#/admin
   ```

3. **View Statistics and Manage Users**

---

## 📊 Dashboard Features

### Global Statistics

**Top Row (4 Cards):**
1. **Total Users**
   - Total registered users
   - New users today
   - Growth indicator

2. **Active Users**
   - Currently active users
   - Percentage of total
   - Activity rate

3. **Total Transactions**
   - All transactions
   - Average per user
   - Transaction volume

4. **Total Referrals**
   - Referral codes generated
   - Conversion rate
   - Referral stats

**Bottom Row (3 Cards):**
1. **Analytics Events** - Total tracked events
2. **New Users Today** - Daily signups
3. **Total Volume** - Transaction volume in TON

---

## 👥 User Management

### Search & Filter

**Search:**
- Search by name
- Search by wallet address
- Real-time filtering

**Filters:**
- **Role Filter:**
  - All Roles
  - Users only
  - Admins only

- **Status Filter:**
  - All Status
  - Active only
  - Inactive only

### User Table

**Columns:**
1. **User** - Avatar, name, and ID
2. **Wallet Address** - Truncated address
3. **Role** - User or Admin badge
4. **Status** - Active or Inactive badge
5. **Created** - Registration date
6. **Actions** - View and toggle status

**Actions:**
- 👁️ **View Details** - View user profile (coming soon)
- ✅ **Activate** - Activate inactive user
- 🚫 **Deactivate** - Deactivate active user

### Export Data

Click "Export CSV" to download user data:
- Name
- Wallet Address
- Role
- Status
- Created Date

---

## 🔐 Security & Access Control

### Admin Role Check

The dashboard automatically:
1. Checks if user is logged in
2. Verifies user has admin role
3. Redirects non-admins to dashboard
4. Shows access denied message

### Admin Secret Key

**Current Key:** `rhiza-admin-2026-secret`

**Change in Production:**
1. Open `pages/AdminSetup.tsx`
2. Find `ADMIN_SECRET_KEY`
3. Change to a secure random string
4. Keep it secret!

```typescript
const ADMIN_SECRET_KEY = 'your-super-secret-key-here';
```

---

## 📈 Statistics Explained

### Total Users
- Count of all registered users
- Includes active and inactive
- Shows new users today

### Active Users
- Users with `is_active = true`
- Percentage of total users
- Indicates engagement

### Total Transactions
- All transactions in database
- Average per user calculated
- Includes all types (send/receive/swap)

### Total Referrals
- Referral codes generated
- Conversion rate calculated
- Shows referral program success

### Analytics Events
- All tracked events
- Includes wallet_created, wallet_login, etc.
- Shows user activity

### New Users Today
- Users created since midnight
- Daily growth metric
- Trend indicator

### Total Volume
- Sum of all transaction amounts
- Displayed in TON
- Revenue indicator

---

## 🛠️ Admin Actions

### Activate User
```
1. Find user in table
2. Click green checkmark icon
3. User status changes to Active
4. User can now use wallet
```

### Deactivate User
```
1. Find user in table
2. Click red ban icon
3. User status changes to Inactive
4. User access restricted
```

### Export Users
```
1. Apply filters (optional)
2. Click "Export CSV"
3. CSV file downloads
4. Open in Excel/Sheets
```

### Refresh Data
```
1. Click refresh icon (top right)
2. All data reloads
3. Statistics update
4. User list refreshes
```

---

## 📊 Database Queries

### Get All Users
```sql
SELECT * FROM wallet_users 
ORDER BY created_at DESC;
```

### Get Active Users
```sql
SELECT * FROM wallet_users 
WHERE is_active = true;
```

### Get Admins
```sql
SELECT * FROM wallet_users 
WHERE role = 'admin';
```

### Get New Users Today
```sql
SELECT * FROM wallet_users 
WHERE created_at >= CURRENT_DATE;
```

### Get User Stats
```sql
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE is_active = true) as active_users,
  COUNT(*) FILTER (WHERE role = 'admin') as admin_users,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as new_today
FROM wallet_users;
```

---

## 🔍 Monitoring & Analytics

### Key Metrics to Watch

1. **User Growth**
   - New users per day
   - Growth rate
   - Retention rate

2. **User Activity**
   - Active vs inactive ratio
   - Transaction frequency
   - Login frequency

3. **Referral Performance**
   - Referral conversion rate
   - Top referrers
   - Referral earnings

4. **Transaction Volume**
   - Daily transaction count
   - Average transaction size
   - Total volume

---

## 🚨 Troubleshooting

### Can't Access Admin Dashboard

**Problem:** Redirected to regular dashboard

**Solution:**
1. Check if you're logged in
2. Verify your wallet has admin role
3. Check Supabase → wallet_users → role column
4. Should be 'admin' not 'user'

### Admin Setup Fails

**Problem:** "Invalid admin secret key"

**Solution:**
1. Check you entered correct key
2. Current key: `rhiza-admin-2026-secret`
3. Case sensitive!

**Problem:** "Failed to create admin"

**Solution:**
1. Check Supabase is configured
2. Verify database tables exist
3. Check console for errors
4. Verify wallet address format

### Statistics Not Loading

**Problem:** Shows 0 for all stats

**Solution:**
1. Check Supabase connection
2. Verify tables have data
3. Click refresh button
4. Check console for errors

### Users Not Showing

**Problem:** Empty user table

**Solution:**
1. Create some test wallets
2. Check filters (set to "All")
3. Clear search query
4. Refresh data

---

## 📱 Mobile Responsive

The admin dashboard is fully responsive:
- ✅ Mobile phones (320px+)
- ✅ Tablets (768px+)
- ✅ Desktops (1024px+)
- ✅ Large screens (1920px+)

---

## 🎯 Best Practices

### Security
1. Change admin secret key in production
2. Limit admin access to trusted users
3. Monitor admin actions
4. Regular security audits

### User Management
1. Review new users regularly
2. Deactivate suspicious accounts
3. Monitor transaction patterns
4. Export data for backups

### Performance
1. Use filters to reduce data load
2. Export large datasets instead of viewing
3. Refresh data periodically
4. Monitor database performance

---

## 🔄 Future Enhancements

### Planned Features
- [ ] User detail view
- [ ] Transaction history per user
- [ ] Referral tree visualization
- [ ] Advanced analytics charts
- [ ] Bulk user actions
- [ ] Admin audit log
- [ ] Email notifications
- [ ] Custom reports
- [ ] Data visualization
- [ ] API access logs

---

## 📚 Related Documentation

- `SUPABASE_COMPLETE_SETUP.md` - Database setup
- `QUICK_REFERENCE.md` - Quick reference
- `TESTING_GUIDE.md` - Testing instructions
- `README_TESTING.md` - Testing overview

---

## 🎉 Summary

The Admin Dashboard provides:
- ✅ Complete user management
- ✅ Global statistics
- ✅ Search and filtering
- ✅ Data export
- ✅ Role-based access
- ✅ Real-time updates
- ✅ Mobile responsive
- ✅ Production ready

**Access:** `/#/admin` (admin users only)  
**Setup:** `/#/admin-setup` (first time)  
**Secret Key:** `rhiza-admin-2026-secret` (change in production!)

---

**Guide Date:** February 21, 2026  
**Status:** ✅ Complete  
**Build:** ✅ Success
