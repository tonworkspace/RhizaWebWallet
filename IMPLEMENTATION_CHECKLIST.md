# Two-Tier Activation - Implementation Checklist

## 🎯 Goal: Enable $10 store activation with $18 node milestone

---

## ✅ PHASE 1: DATABASE (2 minutes)

### Step 1: Run Migration
```bash
psql -h your-db-host -U your-user -d your-database -f add_node_activation_milestone.sql
```

**Verify:**
- [ ] Migration runs without errors
- [ ] Tables updated with new columns
- [ ] Functions created successfully

---

## ✅ PHASE 2: CODE FIXES (20 minutes)

### Prerequisites (Already Done ✅)
- [x] Import statement updated
- [x] Node milestone state added
- [x] Activation thresholds calculated
- [x] Node status fetch useEffect added

### Fix #1: Activation Logic (5 min) 🔴 CRITICAL
**File:** `components/StoreUI.tsx`  
**Line:** ~365  
**Search:** `Auto-activate wallet if purchase is $18+`

**Status:**
- [ ] Old code removed
- [ ] New code pasted
- [ ] Indentation correct
- [ ] File saved
- [ ] No syntax errors

**Guide:** `APPLY_ACTIVATION_FIX_WALKTHROUGH.md`

---

### Fix #2: Metadata Tracking (2 min)
**Line:** ~420  
**Search:** `auto_activated: !walletActivated && costUsd >= 18`

**Status:**
- [ ] Line found
- [ ] Replaced with 3-line version
- [ ] File saved

---

### Fix #3: Success Messages (3 min)
**Line:** ~470  
**Search:** `const wasAutoActivated = !walletActivated && costUsd >= 18;`

**Status:**
- [ ] Block found
- [ ] Replaced with new logic
- [ ] File saved

---

### Fix #4: Main Button Text (2 min)
**Line:** ~1180  
**Search:** `{!walletActivated && costUsd >= 18 ? 'Buy RZC + Activate Wallet'`

**Status:**
- [ ] Line found
- [ ] Replaced with 3-state logic
- [ ] File saved

---

### Fix #5: Auto-Activation Notice + Progress Bar (5 min)
**Line:** ~1190  
**Search:** `{/* Auto-activation notice */}`

**Status:**
- [ ] Block found
- [ ] Replaced with new notice + progress bar
- [ ] File saved

---

### Fix #6: Sticky Button Text (2 min)
**Line:** ~1400  
**Search:** `Secure My Allocation Now`

**Status:**
- [ ] Line found
- [ ] Updated with conditional text
- [ ] File saved

---

## ✅ PHASE 3: VERIFICATION (5 minutes)

### Compilation Check
```bash
npm run build
```

**Status:**
- [ ] Builds without errors
- [ ] No TypeScript errors
- [ ] No missing imports

---

### Runtime Check
```bash
npm run dev
```

**Status:**
- [ ] Dev server starts
- [ ] Store page loads
- [ ] No console errors
- [ ] Button text changes with amount
- [ ] Auto-activation notice appears

---

## ✅ PHASE 4: TESTING (30 minutes)

### Test 1: $10 Purchase (Not Activated)
**Steps:**
1. User not activated
2. Enter $10 worth of RZC
3. Click purchase button

**Expected Results:**
- [ ] Button says "Buy RZC + Activate Wallet"
- [ ] Notice says "This will activate your wallet"
- [ ] Notice says "Spend $8 more to reach node milestone"
- [ ] After purchase: "Wallet activated! Spend $8 more for node milestone"
- [ ] Database: `is_activated = true`, `node_activated = false`, `total_activation_spent = 10`

---

### Test 2: $8 More (Same User)
**Steps:**
1. User activated with $10
2. Progress bar shows 55.6% (10/18)
3. Enter $8 worth of RZC
4. Click purchase button

**Expected Results:**
- [ ] Progress bar visible before purchase
- [ ] Shows "$8 more to unlock full node benefits"
- [ ] After purchase: "Node milestone reached! Full benefits unlocked!"
- [ ] Database: `node_activated = true`, `total_activation_spent = 18`

---

### Test 3: $20 Purchase (Not Activated)
**Steps:**
1. User not activated
2. Enter $20 worth of RZC
3. Click purchase button

**Expected Results:**
- [ ] Button says "Buy RZC + Activate + Node Milestone"
- [ ] Notice says "You'll reach the $18 node milestone!"
- [ ] After purchase: "Wallet activated and node milestone reached!"
- [ ] Database: `is_activated = true`, `node_activated = true`, `total_activation_spent = 20`

---

### Test 4: $18 Package Purchase
**Steps:**
1. User not activated
2. Go to packages tab
3. Purchase "Wallet Activation" package

**Expected Results:**
- [ ] Both wallet and node activated
- [ ] Database: `is_activated = true`, `node_activated = true`, `total_activation_spent = 18`

---

### Test 5: Progress Bar Display
**Steps:**
1. User activated with $12
2. View store page

**Expected Results:**
- [ ] Progress bar visible
- [ ] Shows 66.7% (12/18)
- [ ] Shows "$6 more to unlock full node benefits"
- [ ] Purchase $6 more
- [ ] Progress bar reaches 100%
- [ ] Node milestone reached message

---

## ✅ PHASE 5: DEPLOYMENT

### Testnet Deployment
- [ ] Deploy to testnet
- [ ] Test all 5 scenarios on testnet
- [ ] Monitor for errors
- [ ] Verify database updates correctly

### Mainnet Deployment
- [ ] Deploy to mainnet
- [ ] Monitor first few activations
- [ ] Verify $10 activations work
- [ ] Verify $18 milestone tracking works
- [ ] Check database for correct data

---

## 📊 Progress Tracker

**Overall Progress:** ___% Complete

- [ ] Phase 1: Database (0% or 100%)
- [ ] Phase 2: Code Fixes (0-100%)
  - [ ] Fix #1 (0% or 100%)
  - [ ] Fix #2 (0% or 100%)
  - [ ] Fix #3 (0% or 100%)
  - [ ] Fix #4 (0% or 100%)
  - [ ] Fix #5 (0% or 100%)
  - [ ] Fix #6 (0% or 100%)
- [ ] Phase 3: Verification (0% or 100%)
- [ ] Phase 4: Testing (0-100%)
- [ ] Phase 5: Deployment (0-100%)

---

## 🆘 Troubleshooting

### Issue: "storeActivationThreshold is not defined"
**Solution:** Lines 100-101 missing. Add:
```typescript
const storeActivationThreshold = getStoreActivationFeeUSD(network);
const nodeMilestoneThreshold = getNodeActivationMilestoneUSD(network);
```

### Issue: "nodeMilestoneStatus is not defined"
**Solution:** Lines 95-98 missing. Add state declaration.

### Issue: "getStoreActivationFeeUSD is not defined"
**Solution:** Import missing. Update line ~17.

### Issue: Compilation errors
**Solution:** Check syntax, braces, and indentation.

### Issue: Runtime errors
**Solution:** Check browser console. Likely database function not deployed.

### Issue: $10 doesn't activate
**Solution:** Verify Fix #1 was applied correctly. Check activation condition.

### Issue: Progress bar doesn't show
**Solution:** Verify Fix #5 was applied correctly.

---

## 📁 Reference Documents

1. **`APPLY_ACTIVATION_FIX_WALKTHROUGH.md`** - Detailed Fix #1 guide
2. **`QUICK_FIX_REFERENCE.md`** - All 6 fixes at a glance
3. **`STOREUI_TWO_TIER_FIXES_FINAL.md`** - Complete fix guide
4. **`TWO_TIER_IMPLEMENTATION_STATUS.md`** - Overall status
5. **`TWO_TIER_ACTIVATION_SUMMARY.md`** - System overview
6. **`TWO_TIER_ACTIVATION_AUDIT.md`** - Detailed audit

---

## ⏱️ Time Estimates

| Phase | Time | Status |
|-------|------|--------|
| Database | 2 min | ⏳ |
| Code Fixes | 20 min | ⏳ |
| Verification | 5 min | ⏳ |
| Testing | 30 min | ⏳ |
| Deployment | 15 min | ⏳ |
| **Total** | **~1.5 hours** | |

---

## 🎯 Success Criteria

Implementation is complete when:
- ✅ All checkboxes above are checked
- ✅ All 5 test scenarios pass
- ✅ No console errors
- ✅ Database tracks correctly
- ✅ Users can activate at $10
- ✅ Node milestone tracked at $18
- ✅ Progress bar shows correctly
- ✅ Notifications are accurate

---

## 🎉 Completion

**Date Completed:** ___________  
**Tested By:** ___________  
**Deployed By:** ___________  
**Notes:** ___________

---

## 📞 Support

If stuck, refer to:
1. Error message
2. Troubleshooting section above
3. Reference documents
4. Browser console logs
5. Database logs

**Remember:** The $10 activation is a secret "easter egg" - users discover it naturally!

---

**Print this checklist and check off items as you complete them! 📋✅**
