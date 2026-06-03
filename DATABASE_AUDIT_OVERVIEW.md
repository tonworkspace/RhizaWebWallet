# Complete Database Audit - Overview

## 🎯 Purpose
Comprehensive audit of your entire RhizaCore Supabase database covering schema, data integrity, security, performance, and business metrics.

---

## 📊 What Gets Audited

### 30 Audit Sections

#### **Database Structure (Sections 1-2)**
1. Database Overview - Tables, functions, indexes count
2. Table Inventory - All tables with sizes and column counts

#### **Core Tables (Sections 3-14)**
3. Wallet Users Schema
4. Wallet Users Statistics
5. Wallet Activations Schema
6. Wallet Activations Statistics
7. Wallet Referrals Schema
8. Referral Statistics
9. RZC Transactions Schema
10. RZC Transaction Statistics
11. Activity Log Statistics
12. Notifications Statistics
13. Airdrop Tasks Overview
14. Airdrop Completions Statistics

#### **Functions & Indexes (Sections 15-17)**
15. Database Functions Inventory
16. Critical Functions Verification
17. Database Indexes

#### **Security (Sections 18-19, 25-26)**
18. Row Level Security Policies
19. Data Integrity Anomalies (8 checks)
25. RLS Status per Table
26. Public Access Permissions

#### **Data Integrity (Sections 20-21)**
20. Referral Integrity Check
21. RZC Balance Integrity Check

#### **Activity & Performance (Sections 22-24)**
22. Recent Activations (Last 10)
23. Recent Transactions (Last 10)
24. Table Bloat & Performance

#### **Business Metrics (Sections 27-30)**
27. Business Metrics (Revenue, RZC distributed, conversion rates)
28. Growth Metrics (Last 30 days)
29. Top Users by RZC Balance
30. Top Referrers

---

## 🚀 How to Run

### Option 1: Full Audit (Recommended)
```bash
# In terminal
psql -h your-db-host -U your-user -d your-database -f complete_db_audit.sql > audit_report.txt

# View the report
cat audit_report.txt
```

### Option 2: Supabase SQL Editor
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy contents of `complete_db_audit.sql`
4. Click "Run"
5. Review results in the output panel

### Option 3: Section by Section
Run individual sections as needed by copying specific queries from the file.

---

## ✅ What to Look For

### 🟢 Good Signs
- **Section 19 (Anomalies):** All counts = 0
- **Section 21 (Balance Integrity):** No rows returned (or very few with small differences)
- **Section 25 (RLS):** All critical tables have `rls_enabled = true`
- **Section 24 (Performance):** Index ratio < 50%
- **Section 27 (Business):** Positive growth trends

### 🔴 Red Flags
- **Section 19:** Any count > 0 indicates data issues
- **Section 20:** Referral count mismatches
- **Section 21:** Large balance differences
- **Section 25:** RLS disabled on sensitive tables
- **Section 26:** Unexpected public access
- **Section 24:** Very large table sizes or high index ratios

---

## 📋 Audit Checklist

Print this and check off as you review:

### Database Structure
- [ ] All expected tables exist
- [ ] Table sizes are reasonable
- [ ] Column counts match expectations

### Core Data
- [ ] Wallet users statistics look correct
- [ ] Activation statistics are accurate
- [ ] Referral system is working
- [ ] RZC transactions are tracked
- [ ] Activity log is populated
- [ ] Notifications are being created
- [ ] Airdrop tasks are configured

### Functions & Indexes
- [ ] All critical functions exist
- [ ] `activate_wallet_atomic` has 6 parameters
- [ ] Indexes are in place
- [ ] No missing indexes on large tables

### Security
- [ ] RLS is enabled on all sensitive tables
- [ ] No unexpected public access
- [ ] Policies are properly configured
- [ ] Function permissions are correct

### Data Integrity
- [ ] No orphaned records
- [ ] No data anomalies (Section 19 all zeros)
- [ ] Referral counts match actual referrals
- [ ] RZC balances match transaction history
- [ ] No negative balances
- [ ] Node activation logic is correct

### Performance
- [ ] Table sizes are manageable
- [ ] Index ratios are reasonable
- [ ] No excessive bloat
- [ ] Queries are fast

### Business Metrics
- [ ] Revenue tracking is accurate
- [ ] RZC distribution is tracked
- [ ] Conversion rates are reasonable
- [ ] Growth trends are positive
- [ ] Top users data makes sense

---

## 🔍 Common Issues & Solutions

### Issue: "Activated but no spent amount" count > 0
**Cause:** Old activations before two-tier system  
**Solution:** Run migration to backfill data or mark as legacy

### Issue: "Node activated but spent < 18" count > 0
**Cause:** Data corruption or manual activation  
**Solution:** Review and correct individual records

### Issue: "Spent >= 18 but node not activated" count > 0
**Cause:** Migration not run or function not used  
**Solution:** Run update query to fix node_activated flag

### Issue: RZC balance mismatches
**Cause:** Missing transactions or incorrect transaction types  
**Solution:** Audit transaction history and correct

### Issue: Referral count mismatches
**Cause:** Referral code changes or data corruption  
**Solution:** Recalculate referral counts

### Issue: RLS disabled on tables
**Cause:** Not configured or disabled for testing  
**Solution:** Enable RLS and create policies

### Issue: Large table sizes
**Cause:** No data retention policy or excessive logging  
**Solution:** Archive old data, implement retention

---

## 📊 Expected Results (Healthy Database)

### Section 4: Wallet Users Statistics
```
total_users: 100-10000+
activated_users: 30-70% of total
node_activated: 40-60% of activated
avg_rzc_balance: 50-500 RZC
total_rzc_in_circulation: Growing steadily
```

### Section 6: Wallet Activations Statistics
```
total_activations: Close to activated_users count
store_activations: 20-40% (if two-tier working)
package_activations: 50-70%
avg_activation_fee: $15-20
```

### Section 8: Referral Statistics
```
active_referrers: 10-30% of users
avg_referrals_per_user: 1-5
total_referral_earnings: Growing
```

### Section 19: Data Anomalies
```
All counts should be 0 or very low (<1% of users)
```

### Section 27: Business Metrics
```
Activation conversion: 30-70%
Node milestone conversion: 40-60%
Avg RZC per user: 50-500 RZC
```

---

## 🛠️ Maintenance Queries

After audit, you may need these:

### Fix Node Activation for Users with $18+ Spent
```sql
UPDATE wallet_users
SET 
    node_activated = true,
    node_activated_at = NOW()
WHERE total_activation_spent >= 18
AND node_activated = false;
```

### Recalculate Referral Counts
```sql
UPDATE wallet_referrals wr
SET total_referrals = (
    SELECT COUNT(*)
    FROM wallet_users wu
    WHERE wu.referrer_code = wr.referral_code
);
```

### Clean Up Test Data
```sql
DELETE FROM wallet_users
WHERE wallet_address LIKE 'UQTest%';

DELETE FROM wallet_activations
WHERE wallet_address LIKE 'UQTest%';
```

---

## 📈 Monitoring Schedule

### Daily
- Section 19 (Anomalies)
- Section 22-23 (Recent Activity)
- Section 27 (Business Metrics)

### Weekly
- Section 4, 6, 8 (Core Statistics)
- Section 20-21 (Data Integrity)
- Section 28 (Growth Metrics)

### Monthly
- Full audit (all 30 sections)
- Performance review (Section 24)
- Security review (Sections 25-26)
- Top users analysis (Sections 29-30)

---

## 📁 Files Created

1. **`complete_db_audit.sql`** - Full audit script (30 sections)
2. **`quick_audit.sql`** - Quick two-tier activation check (8 checks)
3. **`SUPABASE_AUDIT_GUIDE.md`** - Detailed audit guide
4. **`DATABASE_AUDIT_OVERVIEW.md`** - This file

---

## 🎯 Quick Start

1. **Run the full audit:**
   ```bash
   psql -h your-db-host -U your-user -d your-database -f complete_db_audit.sql > audit_report.txt
   ```

2. **Review the report:**
   - Check Section 19 for anomalies
   - Check Section 21 for balance issues
   - Check Section 25 for security
   - Check Section 27 for business metrics

3. **Fix any issues found:**
   - Use maintenance queries above
   - Run specific corrections as needed
   - Re-run audit to verify fixes

4. **Schedule regular audits:**
   - Daily: Quick checks
   - Weekly: Core metrics
   - Monthly: Full audit

---

## ✅ Success Criteria

Your database is healthy when:
- ✅ All anomaly counts are 0 (Section 19)
- ✅ RLS is enabled on all tables (Section 25)
- ✅ No balance mismatches (Section 21)
- ✅ Referral counts match (Section 20)
- ✅ Business metrics are positive (Section 27)
- ✅ Growth is steady (Section 28)
- ✅ Performance is good (Section 24)
- ✅ Security is tight (Section 26)

---

## 📞 Support

If audit reveals critical issues:
1. Note the section number and issue
2. Check the "Common Issues & Solutions" above
3. Use maintenance queries to fix
4. Re-run audit to verify
5. Monitor for recurrence

**Remember:** Regular audits prevent major issues!
