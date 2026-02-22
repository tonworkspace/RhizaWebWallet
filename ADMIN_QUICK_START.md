# 👑 Admin Dashboard - Quick Start

**Status:** ✅ Ready to Use  
**Build:** ✅ Success

---

## 🚀 3-Step Setup

### 1️⃣ Create Admin User (2 min)

```
1. Go to: http://localhost:5173/#/admin-setup
2. Enter:
   - Secret Key: rhiza-admin-2026-secret
   - Wallet Address: Your wallet address
   - Admin Name: Your name
3. Click "Create Admin"
```

### 2️⃣ Login with Wallet (1 min)

```
1. Go to: http://localhost:5173/#/login
2. Login with your wallet
3. You now have admin access
```

### 3️⃣ Access Dashboard (1 min)

```
1. Go to: http://localhost:5173/#/admin
2. View statistics
3. Manage users
```

---

## 📊 What You'll See

### Statistics Dashboard
- **Total Users** - All registered users
- **Active Users** - Currently active
- **Total Transactions** - All transactions
- **Total Referrals** - Referral codes
- **Analytics Events** - Tracked events
- **New Users Today** - Daily signups

### User Management
- **Search** - Find users by name/address
- **Filter** - By role and status
- **Actions** - Activate/deactivate users
- **Export** - Download CSV

---

## 🔐 Admin Secret Key

**Current Key:** `rhiza-admin-2026-secret`

**Change in Production:**
1. Open `pages/AdminSetup.tsx`
2. Find line: `const ADMIN_SECRET_KEY = '...'`
3. Change to secure random string
4. Save and rebuild

---

## ✅ Features

- ✅ Global statistics
- ✅ User management
- ✅ Search & filter
- ✅ Activate/deactivate users
- ✅ Export to CSV
- ✅ Real-time refresh
- ✅ Mobile responsive
- ✅ Role-based access

---

## 🎯 Quick Actions

### View All Users
```
Admin Dashboard → User Management Table
```

### Search User
```
Type in search box → Real-time filter
```

### Deactivate User
```
Find user → Click red ban icon → Confirm
```

### Export Data
```
Click "Export CSV" → Download file
```

### Refresh Stats
```
Click refresh icon (top right)
```

---

## 🐛 Troubleshooting

### Can't Access Dashboard?
- Check you're logged in
- Verify wallet has admin role
- Check Supabase → wallet_users → role = 'admin'

### Wrong Secret Key?
- Current key: `rhiza-admin-2026-secret`
- Case sensitive!

### No Users Showing?
- Create test wallets first
- Check filters (set to "All")
- Click refresh

---

## 📚 Full Documentation

See `ADMIN_DASHBOARD_GUIDE.md` for complete guide.

---

**Setup Time:** 4 minutes  
**Access:** `/#/admin`  
**Setup:** `/#/admin-setup`  
**Status:** ✅ Ready
