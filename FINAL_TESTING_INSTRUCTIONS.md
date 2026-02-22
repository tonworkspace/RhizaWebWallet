# 🎯 Final Testing Instructions

**Date:** February 21, 2026  
**Status:** ✅ Ready to Test  
**Build:** ✅ Success (16.69s)

---

## 🚀 Quick Start Testing

### Step 1: Set Up Database (5 minutes)

1. **Open Supabase Dashboard:**
   ```
   https://dksskhnnxfkpgjeiybjk.supabase.co
   ```

2. **Run SQL Script:**
   - Click "SQL Editor" → "New Query"
   - Open file: `supabase_setup_simple.sql`
   - Copy all content
   - Paste into SQL Editor
   - Click "Run" (or Ctrl+Enter)

3. **Verify Tables Created:**
   - Click "Table Editor"
   - Should see 6 tables:
     - wallet_users
     - wallet_transactions
     - wallet_referrals
     - wallet_referral_earnings
     - wallet_analytics
     - wallet_admin_audit

### Step 2: Start Development Server

```bash
npm run dev
```

Server will start at: http://localhost:5173

### Step 3: Run Automated Tests (2 minutes)

1. **Open Test Page:**
   ```
   http://localhost:5173/#/supabase-test
   ```

2. **Click "Run All Tests"**

3. **Watch Tests Execute:**
   - ✅ Supabase Configuration
   - ✅ Database Connection
   - ✅ Tables Exist
   - ✅ Create Test User
   - ✅ Read Test User
   - ✅ Create Referral Code
   - ✅ Track Analytics Event
   - ✅ Database Statistics
   - ✅ Cleanup Test Data

4. **Expected Result:**
   - Green banner: "All Tests Passed!"
   - All 9 tests show green checkmarks

### Step 4: Test Wallet Creation (3 minutes)

1. **Go to Create Wallet:**
   ```
   http://localhost:5173/#/create-wallet
   ```

2. **Create a New Wallet:**
   - Click "Create New Wallet"
   - Save your mnemonic phrase
   - Set a password
   - Verify mnemonic words
   - Complete creation

3. **Watch Console Logs:**
   ```
   🚀 Starting wallet creation process...
   ✅ Wallet initialized: EQA1B2C3...
   💾 Creating user profile in Supabase...
   ✅ User profile created: uuid-here
   🎫 Generating referral code...
   ✅ Referral code created: 2B3C4D5E
   📊 Analytics event tracked
   ✅ Wallet creation complete!
   ```

4. **Verify in Supabase:**
   - Go to Table Editor → `wallet_users`
   - Should see your new profile
   - Go to Table Editor → `wallet_referrals`
   - Should see your referral code
   - Go to Table Editor → `wallet_analytics`
   - Should see "wallet_created" event

### Step 5: Test Dashboard (1 minute)

1. **Check Dashboard:**
   ```
   http://localhost:5173/#/wallet/dashboard
   ```

2. **Should See:**
   - Profile greeting with your avatar
   - Your name (e.g., "Rhiza User #2B3C")
   - Referral rank: "Core Node"
   - Total referrals: 0

### Step 6: Test Profile Editing (2 minutes)

1. **Go to Settings:**
   ```
   http://localhost:5173/#/wallet/settings
   ```

2. **Edit Profile:**
   - Click "Edit Profile"
   - Select a new avatar (🚀, 💎, ⚡, etc.)
   - Enter a new name
   - Click "Save Changes"

3. **Verify:**
   - Should see success toast
   - Page reloads with new data
   - Check Supabase → `wallet_users`
   - Should see updated name and avatar

### Step 7: Test Referral Portal (1 minute)

1. **Go to Referral Portal:**
   ```
   http://localhost:5173/#/referral
   ```

2. **Should See:**
   - Your referral code (8 characters)
   - Total Referrals: 0
   - Active Users: 0
   - Total Earned: 0 $RZC
   - Current Rank: Core Node

3. **Test Copy:**
   - Click "Copy Link"
   - Should see success toast
   - Paste somewhere to verify link format

---

## ✅ Success Criteria

### All Tests Pass When:

1. **Automated Tests:**
   - [ ] All 9 tests show green checkmarks
   - [ ] No red error messages
   - [ ] Test data cleaned up successfully

2. **Wallet Creation:**
   - [ ] Wallet created successfully
   - [ ] Profile appears in Supabase
   - [ ] Referral code generated
   - [ ] Analytics event tracked
   - [ ] No console errors

3. **Dashboard:**
   - [ ] Profile greeting displays
   - [ ] Avatar shows correctly
   - [ ] Name displays correctly
   - [ ] Referral stats show

4. **Profile Editing:**
   - [ ] Can select new avatar
   - [ ] Can enter new name
   - [ ] Save works without errors
   - [ ] Changes persist in database
   - [ ] UI updates after save

5. **Referral Portal:**
   - [ ] Referral code displays
   - [ ] Statistics show (even if 0)
   - [ ] Copy link works
   - [ ] No errors in console

---

## 🐛 Troubleshooting

### Issue: Automated Tests Fail

**Test 1 Fails (Configuration):**
```
Problem: Supabase not configured
Solution: Check .env file has:
  VITE_SUPABASE_URL="https://dksskhnnxfkpgjeiybjk.supabase.co"
  VITE_SUPABASE_ANON_KEY="your-key-here"
```

**Test 2 Fails (Connection):**
```
Problem: Cannot connect to database
Solution: 
  1. Check Supabase project is active
  2. Verify API keys are correct
  3. Check internet connection
```

**Test 3 Fails (Tables):**
```
Problem: Tables don't exist
Solution: Run supabase_setup_simple.sql in Supabase SQL Editor
```

### Issue: Wallet Creation Fails

**Profile Not Created:**
```
Check Console: Look for error messages
Check Supabase: Verify tables exist
Check .env: Verify credentials are correct
```

**Referral Code Not Generated:**
```
Check Console: Look for "Referral code created" log
Check Supabase: Check wallet_referrals table
Verify: User profile was created first
```

### Issue: Dashboard Not Showing Profile

**Profile Greeting Missing:**
```
Check: userProfile is loaded in WalletContext
Check Console: Look for "Profile loaded" log
Check Supabase: Verify profile exists
Refresh: Try logging out and back in
```

### Issue: Profile Edit Not Working

**Save Button Does Nothing:**
```
Check Console: Look for error messages
Check Network: Check for failed API calls
Check Supabase: Verify RLS policies allow updates
```

---

## 📊 Verify in Supabase Dashboard

### Quick Verification Queries

```sql
-- Check your user profile
SELECT * FROM wallet_users 
WHERE wallet_address LIKE 'EQ%' 
ORDER BY created_at DESC 
LIMIT 5;

-- Check your referral code
SELECT u.name, r.referral_code, r.rank, r.total_referrals
FROM wallet_users u
JOIN wallet_referrals r ON u.id = r.user_id
ORDER BY u.created_at DESC
LIMIT 5;

-- Check analytics events
SELECT event_name, COUNT(*) as count
FROM wallet_analytics
GROUP BY event_name
ORDER BY count DESC;

-- Check database stats
SELECT 
  (SELECT COUNT(*) FROM wallet_users) as total_users,
  (SELECT COUNT(*) FROM wallet_referrals) as total_referrals,
  (SELECT COUNT(*) FROM wallet_analytics) as total_events;
```

---

## 🎯 Expected Console Logs

### Wallet Creation
```
🚀 Starting wallet creation process...
✅ Wallet initialized: EQA1B2C3D4E5F6...
💾 Creating user profile in Supabase...
✅ User profile created: 550e8400-e29b-41d4-a716-446655440000
🎫 Generating referral code...
✅ Referral code created: D4E5F6G7
📊 Analytics event tracked
✅ Wallet added to manager
✅ Wallet creation complete!
```

### Login
```
💾 Loading user profile from Supabase...
✅ User profile loaded: Rhiza User #F6G7
✅ Referral data loaded: D4E5F6G7
🔄 Starting automatic transaction sync...
```

### Profile Update
```
📝 Updating profile: EQA1B2C3D4E5F6...
✅ Profile updated
```

---

## 🎉 Success!

If all tests pass and you can:
- ✅ Create a wallet
- ✅ See profile in dashboard
- ✅ Edit profile in settings
- ✅ View referral code
- ✅ See data in Supabase

**Your integration is working perfectly!** 🚀

---

## 📚 Documentation Reference

- `SUPABASE_DATABASE_SETUP.md` - Database setup guide
- `SUPABASE_COMPLETE_SETUP.md` - Complete integration guide
- `TESTING_GUIDE.md` - Detailed testing guide
- `QUICK_REFERENCE.md` - Quick reference
- `SETUP_COMPLETE_SUMMARY.md` - Setup summary

---

## 🔄 Next Steps After Testing

1. **If Tests Pass:**
   - Start using the wallet
   - Invite beta testers
   - Monitor Supabase dashboard
   - Check for errors

2. **If Tests Fail:**
   - Check troubleshooting section
   - Review console logs
   - Verify database setup
   - Check environment variables

3. **Production Deployment:**
   - Update environment variables for production
   - Run security audit
   - Set up monitoring
   - Configure backups

---

**Testing Date:** February 21, 2026  
**Build Status:** ✅ Success  
**Test Page:** `/#/supabase-test`  
**Ready:** ✅ Yes

**Start testing now:** `npm run dev` → `http://localhost:5173/#/supabase-test`
