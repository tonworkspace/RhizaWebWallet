# Step-by-Step Fix Guide 🔧

## Current Status
- ✅ Database shows: `total_referrals = 1`
- ✅ Database shows: `actual_downline_count = 1`
- ❌ UI shows: "0 Members" and "No team members yet"

**Your User ID:** `99c8c1fd-7174-4bad-848f-4c0cc0bb4641`

---

## Step 1: Check if User Data Exists (CRITICAL)

Copy and paste this query in Supabase SQL Editor:

```sql
SELECT 
  u.id,
  u.name,
  u.wallet_address,
  u.is_active,
  u.rzc_balance,
  u.created_at
FROM wallet_referrals r
JOIN wallet_users u ON r.user_id = u.id
WHERE r.referrer_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641';
```

### Possible Results:

**Result A: Returns 1 row with user data** ✅
```
id: abc-123-def
name: User Name
wallet_address: 0:abc...
is_active: true
rzc_balance: 100
created_at: 2024-...
```
→ **Data exists!** Go to Step 2

**Result B: Returns 0 rows** ❌
```
(No rows returned)
```
→ **Data integrity issue!** Go to Step 3

---

## Step 2: If Data Exists - Check Browser Console

The data is in the database, so the issue is in the code.

### Action: Run Browser Test

1. Open your wallet app
2. Navigate to Referral page
3. Press F12 to open console
4. Click the refresh button (circular arrow icon)
5. Look for these logs:

```
🔄 Loading referral network for user: 99c8c1fd-7174-4bad-848f-4c0cc0bb4641
🔍 Fetching downline for user: 99c8c1fd-7174-4bad-848f-4c0cc0bb4641
📊 Found X referral records
📊 Found X user records
✅ Found X downline members
```

### What to Share:
- Screenshot of console logs
- Any error messages (red text)
- The numbers you see (X referral records, X user records)

---

## Step 3: If No Data - Fix Data Integrity

The referral record exists but the user doesn't match.

### Action: Find the Orphaned Record

```sql
SELECT 
  r.id,
  r.user_id,
  r.referrer_id,
  r.referral_code,
  CASE 
    WHEN u.id IS NULL THEN 'USER NOT FOUND'
    ELSE 'User exists'
  END as status
FROM wallet_referrals r
LEFT JOIN wallet_users u ON r.user_id = u.id
WHERE r.referrer_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641';
```

If status shows "USER NOT FOUND", we need to find the correct user:

```sql
-- Find recent users
SELECT 
  u.id,
  u.name,
  u.wallet_address,
  u.referrer_code,
  u.created_at
FROM wallet_users u
WHERE u.created_at > NOW() - INTERVAL '7 days'
ORDER BY u.created_at DESC;
```

Then update the referral record with the correct user_id.

---

## Quick Decision Tree

```
Start Here
    ↓
Run Step 1 Query
    ↓
    ├─→ Returns 1 row? → Go to Step 2 (Browser test)
    │
    └─→ Returns 0 rows? → Go to Step 3 (Fix data)
```

---

## What I Need From You

Please run **Step 1 query** and tell me:

1. **How many rows returned?** (0 or 1)
2. **If 1 row:** Share the data (name, wallet_address, etc.)
3. **If 0 rows:** We'll run Step 3 to fix it

This will tell us exactly what to do next! 🎯

---

## Expected Timeline

- **If data exists (Step 2):** 5 minutes to fix
- **If data missing (Step 3):** 10 minutes to fix

Let's start with Step 1! 🚀
