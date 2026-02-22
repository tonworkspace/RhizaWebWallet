# 🧪 Testing Guide - Supabase Integration

**Status:** Ready to Test  
**Date:** February 21, 2026

---

## 🚀 Quick Start

### Step 1: Make Sure Database is Set Up

1. Go to Supabase Dashboard: https://dksskhnnxfkpgjeiybjk.supabase.co
2. Open SQL Editor
3. Run the script from `supabase_setup_simple.sql`
4. Verify tables are created in Table Editor

### Step 2: Start Development Server

```bash
npm run dev
```

### Step 3: Run Automated Tests

1. Open browser to: http://localhost:5173
2. Navigate to: `/#/supabase-test`
3. Click "Run All Tests"
4. Watch the tests execute

---

## ✅ What the Tests Check

### Test 1: Supabase Configuration
- Checks if environment variables are set
- Verifies Supabase client is initialized

### Test 2: Database Connection
- Tests connection to Supabase
- Verifies database is accessible

### Test 3: Tables Exist
- Checks if all 6 tables are created
- Verifies table structure

### Test 4: Create Test User
- Creates a test user profile
- Tests INSERT operation

### Test 5: Read Test User
- Reads the test user back
- Tests SELECT operation

### Test 6: Create Referral Code
- Generates a referral code
- Tests referral system

### Test 7: Track Analytics Event
- Tracks a test event
- Tests analytics system

### Test 8: Database Statistics
- Gets database stats
- Tests aggregate queries

### Test 9: Cleanup Test Data
- Deletes test user
- Tests DELETE operation

---

## 🎯 Expected Results

### All Tests Pass ✅
```
✅ Supabase Configuration - Supabase is configured correctly
✅ Database Connection - Database connection successful
✅ Tables Exist - All tables exist
✅ Create Test User - User created with ID: abc12345...
✅ Read Test User - User read successfully
✅ Create Referral Code - Referral code: ABC12345
✅ Track Analytics Event - Analytics event tracked
✅ Database Statistics - Statistics retrieved
✅ Cleanup Test Data - Test data cleaned up
```

### If Tests Fail ❌

**Test 1 Fails:**
- Check `.env` file has correct Supabase credentials
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set

**Test 2 Fails:**
- Check Supabase project is active
- Verify API keys are correct
- Check internet connection

**Test 3 Fails:**
- Run the SQL setup script in Supabase
- Check Table Editor for tables
- Verify script ran without errors

**Test 4-9 Fail:**
- Check RLS policies are set correctly
- Verify table permissions
- Check browser console for errors

---

## 🧪 Manual Testing

### Test 1: Create a Wallet

1. Go to `/#/create-wallet`
2. Create a new wallet
3. Watch browser console for logs:
```
🚀 Starting wallet creation process...
✅ Wallet initialized: EQA1B2C3...
💾 Creating user profile in Supabase...
✅ User profile created: uuid-here
🎫 Generating referral code...
✅ Referral code created: 2B3C4D5E
📊 Analytics event tracked
```

4. Check Supabase Dashboard:
   - Table Editor → `wallet_users`
   - Should see your new profile

### Test 2: Check Dashboard

1. Login with your wallet
2. Dashboard should show:
   - Profile greeting with avatar
   - Your name
   - Referral rank

### Test 3: Edit Profile

1. Go to Settings
2. Click "Edit Profile"
3. Select new avatar
4. Enter new name
5. Click "Save Changes"
6. Check Supabase Dashboard:
   - Table Editor → `wallet_users`
   - Should see updated name and avatar

### Test 4: Check Referral Portal

1. Go to Referral Portal
2. Should see:
   - Your referral code
   - Total referrals: 0
   - Total earned: 0
   - Rank: Core Node

### Test 5: Transaction Sync

1. Make a transaction on TON blockchain (if possible)
2. Wait 30 seconds
3. Check browser console:
```
🔄 Starting transaction sync for: EQA1B2C3...
📦 Found X blockchain transactions
💾 Found Y existing transactions in database
🆕 Found Z new transactions to sync
✅ Synced Z new transactions
```

4. Check Supabase Dashboard:
   - Table Editor → `wallet_transactions`
   - Should see synced transactions

---

## 📊 Verify in Supabase Dashboard

### Check wallet_users Table

```sql
SELECT * FROM wallet_users ORDER BY created_at DESC LIMIT 10;
```

Expected columns:
- id (UUID)
- wallet_address (your address)
- name (your name or "Rhiza User #XXXX")
- avatar (emoji)
- role ("user")
- is_active (true)
- created_at (timestamp)

### Check wallet_referrals Table

```sql
SELECT * FROM wallet_referrals ORDER BY created_at DESC LIMIT 10;
```

Expected columns:
- id (UUID)
- user_id (matches wallet_users.id)
- referral_code (8 characters)
- rank ("Core Node")
- total_earned (0)
- total_referrals (0)

### Check wallet_analytics Table

```sql
SELECT * FROM wallet_analytics ORDER BY created_at DESC LIMIT 10;
```

Expected events:
- wallet_created
- wallet_login
- test_event (from automated tests)

### Check Database Stats

```sql
-- Count users
SELECT COUNT(*) as total_users FROM wallet_users;

-- Count referrals
SELECT COUNT(*) as total_referrals FROM wallet_referrals;

-- Count analytics events
SELECT COUNT(*) as total_events FROM wallet_analytics;

-- Recent activity
SELECT 
  event_name,
  COUNT(*) as count
FROM wallet_analytics
GROUP BY event_name
ORDER BY count DESC;
```

---

## 🔍 Debugging

### Enable Verbose Logging

Open browser console and run:
```javascript
// Check Supabase configuration
console.log('Configured:', supabaseService.isConfigured());

// Test connection
const result = await supabaseService.testConnection();
console.log('Connection:', result);

// Get stats
const stats = await supabaseService.getStats();
console.log('Stats:', stats);
```

### Check Network Requests

1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter by "supabase"
4. Create a wallet or perform an action
5. Check for:
   - POST requests to Supabase
   - 200/201 status codes
   - Response data

### Common Issues

**Issue: "Supabase not configured"**
- Solution: Check `.env` file has correct credentials

**Issue: "Database connection failed"**
- Solution: Verify Supabase project is active and API keys are correct

**Issue: "Tables not found"**
- Solution: Run SQL setup script in Supabase Dashboard

**Issue: "Permission denied"**
- Solution: Check RLS policies are set correctly

**Issue: "Profile not loading"**
- Solution: Check browser console for errors, verify profile exists in database

---

## ✅ Success Checklist

After testing, verify:

- [ ] Automated tests all pass
- [ ] Can create wallet
- [ ] Profile created in Supabase
- [ ] Referral code generated
- [ ] Dashboard shows profile
- [ ] Can edit profile in Settings
- [ ] Referral portal shows real data
- [ ] Analytics events tracked
- [ ] No errors in console
- [ ] All tables have data

---

## 🎉 If All Tests Pass

Congratulations! Your Supabase integration is working perfectly:

- ✅ Database connected
- ✅ Tables created
- ✅ User profiles working
- ✅ Referral system working
- ✅ Analytics tracking working
- ✅ Transaction sync ready
- ✅ UI integration complete

**Your wallet is production-ready!** 🚀

---

## 📚 Next Steps

1. **Test with Real Users:**
   - Share with beta testers
   - Monitor Supabase dashboard
   - Check for errors

2. **Add More Features:**
   - Real-time notifications
   - Referral code input during signup
   - Admin dashboard
   - Analytics dashboard

3. **Monitor Performance:**
   - Check database query times
   - Monitor API usage
   - Optimize slow queries

4. **Security Audit:**
   - Review RLS policies
   - Test access controls
   - Verify data encryption

---

**Testing Date:** February 21, 2026  
**Status:** Ready to Test  
**Test Page:** `/#/supabase-test`
