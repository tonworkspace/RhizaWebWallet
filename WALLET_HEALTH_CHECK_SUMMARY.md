# Wallet System Health Check - Quick Start 🚀

## 3-Minute Quick Check

### Step 1: Run Browser Test (1 minute)
1. Open your wallet app in browser
2. Press F12 to open console
3. Copy/paste contents of `test_wallet_system.js`
4. Press Enter
5. Check results

**Expected:** "🎉 ALL TESTS PASSED!"

---

### Step 2: Run Database Check (1 minute)
1. Open Supabase SQL Editor
2. Copy/paste from `wallet_database_health_check.sql`
3. Run all queries
4. Check for any 0 counts or errors

**Expected:** All tables exist, no orphaned records

---

### Step 3: Manual Feature Test (1 minute)
1. ✅ Login to wallet
2. ✅ Check balance displays
3. ✅ Navigate to Referral page
4. ✅ Copy referral link
5. ✅ Check all pages load

**Expected:** Everything works without errors

---

## Files Created

| File | Purpose | Time |
|------|---------|------|
| `WALLET_SYSTEM_HEALTH_CHECK.md` | Comprehensive checklist | 30 min |
| `test_wallet_system.js` | Automated browser test | 2 min |
| `wallet_database_health_check.sql` | Database diagnostics | 5 min |
| `WALLET_HEALTH_CHECK_SUMMARY.md` | This file | 1 min |

---

## What Gets Tested

### Browser Test (`test_wallet_system.js`)
- ✅ Local storage (wallet data, network, theme)
- ✅ UI elements (navigation, buttons, forms)
- ✅ Network connectivity (online status, API access)
- ✅ React state (if accessible)
- ✅ Page-specific elements
- ✅ Performance (load times)
- ✅ Security (HTTPS, no unencrypted data)
- ✅ Responsive design
- ✅ Accessibility

### Database Test (`wallet_database_health_check.sql`)
- ✅ All tables exist (11 tables)
- ✅ Row counts
- ✅ Data integrity (no orphaned records)
- ✅ Indexes exist
- ✅ Foreign keys configured
- ✅ Functions exist (award_rzc_tokens)
- ✅ RLS policies enabled
- ✅ User statistics
- ✅ Referral statistics
- ✅ Transaction statistics
- ✅ Recent activity
- ✅ Top users/referrers
- ✅ Anomaly detection
- ✅ Database size
- ✅ Performance metrics

---

## Common Issues & Quick Fixes

### Issue 1: Browser Test Shows Failures
**Symptoms:** Multiple ❌ in test results

**Quick Fix:**
1. Check if logged in (create/import wallet)
2. Refresh page
3. Check browser console for errors
4. Verify network connection

---

### Issue 2: Database Test Shows Missing Tables
**Symptoms:** Less than 11 tables

**Quick Fix:**
```sql
-- Run the main migration
-- Copy from supabase_migration_safe.sql
```

---

### Issue 3: No Active Wallet
**Symptoms:** "Not logged in" message

**Quick Fix:**
1. Navigate to `/#/create-wallet` or `/#/import-wallet`
2. Create or import a wallet
3. Re-run tests

---

### Issue 4: API Not Reachable
**Symptoms:** "TON API Reachable" test fails

**Quick Fix:**
1. Check internet connection
2. Try different network (testnet/mainnet)
3. Check if TON API is down (visit toncenter.com)

---

## Success Criteria

Your wallet system is healthy when:

### Browser Tests
- ✅ Pass rate > 90%
- ✅ No critical failures
- ✅ All UI elements present
- ✅ API reachable
- ✅ No console errors

### Database Tests
- ✅ All 11 tables exist
- ✅ No orphaned records
- ✅ Foreign keys configured
- ✅ award_rzc_tokens function exists
- ✅ No negative balances
- ✅ No duplicate addresses

### Manual Tests
- ✅ Can create wallet
- ✅ Can login/logout
- ✅ Balance displays
- ✅ Can send transactions
- ✅ Referral system works

---

## Detailed Documentation

For comprehensive testing, see:

1. **WALLET_SYSTEM_HEALTH_CHECK.md**
   - 25 detailed test scenarios
   - Step-by-step instructions
   - Expected results
   - Troubleshooting guide

2. **test_wallet_system.js**
   - Automated browser testing
   - 10 test categories
   - Detailed results
   - Recommendations

3. **wallet_database_health_check.sql**
   - 17 diagnostic queries
   - Statistics and metrics
   - Anomaly detection
   - Performance checks

---

## Quick Test Results Interpretation

### Browser Test Results

**100% Pass Rate** 🎉
- System is fully functional
- No action needed

**90-99% Pass Rate** ✅
- System is mostly functional
- Review failed tests
- Minor fixes may be needed

**80-89% Pass Rate** ⚠️
- System has some issues
- Review failed tests carefully
- Apply fixes and re-test

**< 80% Pass Rate** ❌
- System has major issues
- Review all failed tests
- Check console errors
- Verify database connection
- May need to re-run migrations

---

### Database Test Results

**All Queries Return Expected Data** 🎉
- Database is healthy
- No action needed

**Some Integrity Issues** ⚠️
- Orphaned records found
- Run cleanup queries
- Re-run health check

**Missing Tables/Functions** ❌
- Run migrations
- Check Supabase connection
- Verify schema

---

## Next Steps After Testing

### If All Tests Pass ✅
1. System is healthy!
2. Continue normal operations
3. Run health checks weekly

### If Some Tests Fail ⚠️
1. Review failed tests
2. Check detailed documentation
3. Apply recommended fixes
4. Re-run tests to verify

### If Many Tests Fail ❌
1. Check Supabase connection
2. Verify migrations ran
3. Check browser console
4. Review error messages
5. May need to reset database

---

## Maintenance Schedule

### Daily
- Check for console errors
- Monitor user signups
- Check transaction success rate

### Weekly
- Run browser health check
- Check database statistics
- Review recent activity

### Monthly
- Run full database health check
- Review performance metrics
- Check for anomalies
- Update documentation

---

## Support Resources

### Documentation
- `WALLET_SYSTEM_HEALTH_CHECK.md` - Comprehensive guide
- `REFERRAL_SYSTEM_FIX.md` - Referral system details
- `UI_VERIFICATION_SUMMARY.md` - UI data flow

### Test Scripts
- `test_wallet_system.js` - Browser testing
- `test_referral_ui.js` - Referral page testing
- `wallet_database_health_check.sql` - Database testing
- `diagnose_referral_system.sql` - Referral diagnostics

### Quick References
- `QUICK_REFERENCE.md` - Quick lookup
- `IMMEDIATE_ACTION_ITEMS.md` - Step-by-step fixes
- `SQL_FIX_APPLIED.md` - SQL fixes

---

## Summary

Your wallet system health can be verified in just 3 minutes:

1. **Browser Test** - Run `test_wallet_system.js` in console
2. **Database Test** - Run queries from `wallet_database_health_check.sql`
3. **Manual Test** - Quick feature check

If all three pass, your system is healthy! 🎉

If any fail, use the detailed documentation to diagnose and fix issues.

---

**Remember:** Regular health checks help catch issues early and keep your wallet system running smoothly! 🚀
