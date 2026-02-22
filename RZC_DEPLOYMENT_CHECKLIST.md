# RZC Token System - Deployment Checklist

Complete checklist for deploying the RZC (RhizaCore Community Token) system to production.

---

## 📋 Pre-Deployment Checklist

### 1. Code Review ✅
- [x] All TypeScript files compile without errors
- [x] No console errors in development
- [x] Build succeeds (npm run build)
- [x] All RZC-related files created and integrated

### 2. Database Preparation
- [ ] Supabase project created
- [ ] Environment variables configured (.env file)
- [ ] Database backup created
- [ ] Migration script reviewed (`supabase_rzc_migration.sql`)

### 3. Documentation Review
- [x] `RZC_TOKEN_SYSTEM.md` - System documentation
- [x] `RZC_TESTING_GUIDE.md` - Testing procedures
- [x] `RZC_MIGRATION_GUIDE.md` - Database migration guide
- [x] `RZC_DATABASE_COMMANDS.md` - SQL command reference
- [x] `RZC_QUICK_REFERENCE.md` - Quick reference card
- [x] `RZC_SYSTEM_DIAGRAM.md` - Architecture diagrams

---

## 🚀 Deployment Steps

### Step 1: Database Migration

**Time Required:** 5-10 minutes

1. **Backup Database**
   ```
   ✓ Go to Supabase Dashboard → Database → Backups
   ✓ Click "Create Backup"
   ✓ Wait for completion
   ```

2. **Run Migration Script**
   ```
   ✓ Open Supabase SQL Editor
   ✓ Copy contents of supabase_rzc_migration.sql
   ✓ Paste and run
   ✓ Verify success message
   ```

3. **Verify Migration**
   ```sql
   -- Run this query to verify
   SELECT 
     EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'wallet_users' 
             AND column_name = 'rzc_balance') as column_exists,
     EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_name = 'wallet_rzc_transactions') as table_exists,
     EXISTS (SELECT 1 FROM information_schema.routines 
             WHERE routine_name = 'award_rzc_tokens') as function_exists;
   ```
   
   **Expected:** All three should return `true`

4. **Award Retroactive Bonuses (Optional)**
   ```sql
   -- Only if you have existing users
   SELECT * FROM award_retroactive_signup_bonuses();
   ```

### Step 2: Frontend Deployment

**Time Required:** 10-15 minutes

1. **Build Application**
   ```bash
   npm run build
   ```
   
   **Expected:** Build succeeds with no errors

2. **Deploy to Hosting**
   ```bash
   # Example for Vercel
   vercel --prod
   
   # Example for Netlify
   netlify deploy --prod
   
   # Or your preferred hosting platform
   ```

3. **Verify Environment Variables**
   ```
   ✓ VITE_SUPABASE_URL is set
   ✓ VITE_SUPABASE_ANON_KEY is set
   ✓ Variables are accessible in production
   ```

### Step 3: Smoke Testing

**Time Required:** 15-20 minutes

1. **Test New User Flow**
   ```
   ✓ Navigate to /#/create-wallet
   ✓ Create new wallet
   ✓ Check Dashboard - should show 100 RZC
   ✓ Check Referral page - should show 100 RZC
   ```

2. **Test Referral Flow**
   ```
   ✓ Copy referral link from Referral page
   ✓ Open incognito window
   ✓ Use referral link to create second wallet
   ✓ Check first wallet - should show 150 RZC
   ✓ Verify transaction in database
   ```

3. **Test Database Queries**
   ```sql
   -- Check recent activity
   SELECT * FROM recent_rzc_activity LIMIT 10;
   
   -- Check user balances
   SELECT name, rzc_balance FROM wallet_users ORDER BY created_at DESC LIMIT 5;
   
   -- Check transactions
   SELECT type, COUNT(*), SUM(amount) FROM wallet_rzc_transactions GROUP BY type;
   ```

---

## ✅ Post-Deployment Verification

### Functional Tests

- [ ] **Signup Bonus**
  - New users receive 100 RZC
  - Balance displays in Dashboard
  - Transaction recorded in database

- [ ] **Referral Bonus**
  - Referrer receives 50 RZC when friend signs up
  - Referral count increments
  - Transaction recorded with metadata

- [ ] **Milestone Bonus**
  - 10th referral triggers 500 RZC bonus
  - Both referral and milestone transactions recorded
  - Balance updates correctly

- [ ] **UI Display**
  - Dashboard shows RZC balance
  - Referral page shows RZC balance
  - Numbers formatted with commas
  - Green color (#00FF88) used correctly

### Database Integrity

- [ ] **Schema Verification**
  ```sql
  -- All should return true
  SELECT 
    EXISTS (SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'wallet_users' AND column_name = 'rzc_balance'),
    EXISTS (SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'wallet_rzc_transactions'),
    EXISTS (SELECT 1 FROM information_schema.routines 
            WHERE routine_name = 'award_rzc_tokens');
  ```

- [ ] **Data Consistency**
  ```sql
  -- Check for mismatches
  SELECT COUNT(*) FROM wallet_users 
  WHERE rzc_balance != (
    SELECT COALESCE(balance_after, 100) 
    FROM wallet_rzc_transactions 
    WHERE user_id = wallet_users.id 
    ORDER BY created_at DESC LIMIT 1
  );
  ```
  **Expected:** 0 (no mismatches)

- [ ] **Index Performance**
  ```sql
  -- Check indexes are being used
  SELECT indexname, idx_scan 
  FROM pg_stat_user_indexes 
  WHERE tablename = 'wallet_rzc_transactions';
  ```
  **Expected:** idx_scan > 0 for active indexes

### Performance Tests

- [ ] **Page Load Times**
  - Dashboard loads in < 2 seconds
  - Referral page loads in < 2 seconds
  - No console errors

- [ ] **Database Query Performance**
  ```sql
  EXPLAIN ANALYZE
  SELECT * FROM wallet_rzc_transactions 
  WHERE user_id = 'USER_ID' 
  ORDER BY created_at DESC LIMIT 10;
  ```
  **Expected:** Execution time < 50ms

- [ ] **Build Size**
  - Total bundle size: ~1.95 MB (acceptable)
  - No significant increase from RZC addition

---

## 📊 Monitoring Setup

### Database Monitoring

1. **Set Up Alerts**
   ```sql
   -- Monitor for unusual RZC awards
   CREATE OR REPLACE FUNCTION check_unusual_rzc_activity()
   RETURNS TABLE (alert_type TEXT, details JSONB) AS $$
   BEGIN
     -- Check for large single awards (> 10,000 RZC)
     RETURN QUERY
     SELECT 
       'Large Award'::TEXT,
       jsonb_build_object(
         'user_id', user_id,
         'amount', amount,
         'type', type,
         'created_at', created_at
       )
     FROM wallet_rzc_transactions
     WHERE amount > 10000
     AND created_at > NOW() - INTERVAL '1 hour';
     
     -- Check for rapid awards to same user
     RETURN QUERY
     SELECT 
       'Rapid Awards'::TEXT,
       jsonb_build_object(
         'user_id', user_id,
         'transaction_count', COUNT(*),
         'total_amount', SUM(amount)
       )
     FROM wallet_rzc_transactions
     WHERE created_at > NOW() - INTERVAL '5 minutes'
     GROUP BY user_id
     HAVING COUNT(*) > 10;
   END;
   $$ LANGUAGE plpgsql;
   ```

2. **Daily Statistics Query**
   ```sql
   -- Run this daily to track growth
   SELECT 
     CURRENT_DATE as date,
     COUNT(*) as total_users,
     SUM(rzc_balance) as total_rzc,
     AVG(rzc_balance) as avg_rzc,
     (SELECT COUNT(*) FROM wallet_rzc_transactions 
      WHERE created_at > CURRENT_DATE) as transactions_today,
     (SELECT SUM(amount) FROM wallet_rzc_transactions 
      WHERE created_at > CURRENT_DATE) as rzc_awarded_today
   FROM wallet_users;
   ```

### Application Monitoring

1. **Error Tracking**
   - Monitor console for RZC-related errors
   - Track failed award attempts
   - Monitor Supabase connection issues

2. **User Analytics**
   - Track RZC balance distribution
   - Monitor referral conversion rates
   - Track milestone achievement rates

---

## 🐛 Rollback Plan

If critical issues are discovered:

### Quick Rollback (Frontend Only)

1. **Revert to Previous Deployment**
   ```bash
   # Vercel
   vercel rollback
   
   # Netlify
   netlify rollback
   ```

2. **Disable RZC Features**
   - Comment out RZC display in Dashboard
   - Comment out RZC display in Referral page
   - Keep database intact for future re-enable

### Full Rollback (Database + Frontend)

1. **Backup Current State**
   ```sql
   -- Export RZC data before rollback
   COPY wallet_rzc_transactions TO '/tmp/rzc_backup.csv' CSV HEADER;
   COPY (SELECT id, wallet_address, rzc_balance FROM wallet_users) 
   TO '/tmp/user_balances_backup.csv' CSV HEADER;
   ```

2. **Run Rollback Script**
   ```sql
   -- See RZC_MIGRATION_GUIDE.md for full rollback script
   DROP VIEW IF EXISTS recent_rzc_activity;
   DROP VIEW IF EXISTS top_rzc_holders;
   DROP VIEW IF EXISTS rzc_transaction_summary;
   DROP FUNCTION IF EXISTS award_rzc_tokens;
   DROP TABLE IF EXISTS wallet_rzc_transactions;
   ALTER TABLE wallet_users DROP COLUMN IF EXISTS rzc_balance;
   ```

3. **Redeploy Previous Frontend Version**

---

## 📝 Communication Plan

### Internal Team

- [ ] Notify development team of deployment
- [ ] Share documentation links
- [ ] Schedule post-deployment review meeting
- [ ] Update internal wiki/docs

### Support Team

- [ ] Train on RZC system
- [ ] Provide SQL query cheat sheet
- [ ] Share troubleshooting guide
- [ ] Set up support ticket categories

### Users (Optional)

- [ ] Announcement of RZC system launch
- [ ] User guide on earning RZC
- [ ] FAQ about RZC tokens
- [ ] Social media posts

---

## 🎯 Success Metrics

Track these metrics post-deployment:

### Week 1
- [ ] 100% of new users receive signup bonus
- [ ] 0 critical errors in production
- [ ] Referral system working correctly
- [ ] Database performance acceptable

### Week 2-4
- [ ] Track RZC distribution growth
- [ ] Monitor referral conversion rates
- [ ] Identify top RZC earners
- [ ] Gather user feedback

### Month 1
- [ ] Analyze RZC impact on user engagement
- [ ] Review milestone achievement rates
- [ ] Plan RZC utility features
- [ ] Optimize based on usage patterns

---

## 📞 Support Contacts

**Technical Issues:**
- Database: Check Supabase logs
- Frontend: Check browser console
- Build: Check deployment logs

**Documentation:**
- System Overview: `RZC_TOKEN_SYSTEM.md`
- Testing: `RZC_TESTING_GUIDE.md`
- Database: `RZC_MIGRATION_GUIDE.md`
- Commands: `RZC_DATABASE_COMMANDS.md`

---

## ✅ Final Checklist

Before marking deployment as complete:

- [ ] Database migration successful
- [ ] Frontend deployed and accessible
- [ ] Smoke tests passed
- [ ] Monitoring set up
- [ ] Documentation shared with team
- [ ] Rollback plan documented
- [ ] Success metrics defined
- [ ] Post-deployment review scheduled

---

## 🎊 Deployment Complete!

Once all items are checked:

1. Mark deployment as successful
2. Monitor for 24-48 hours
3. Schedule post-deployment review
4. Plan next iteration (RZC utility features)

**Deployment Date:** _____________  
**Deployed By:** _____________  
**Status:** ⬜ In Progress  ⬜ Complete  ⬜ Rolled Back

---

**Version:** 1.0  
**Last Updated:** February 21, 2026  
**Next Review:** 1 week post-deployment
