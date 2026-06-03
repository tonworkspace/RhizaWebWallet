# ⚡ Phase 2 Testing Guide (5 Minutes)

**Purpose:** Verify dynamic project detail page works  
**Time:** 5 minutes

---

## Step 1: Test Catalog Navigation (1 minute)

1. Navigate to: `/wallet/launchpad-list`
2. Click **"View Live Sales"**
3. Click **"View Details"** on any project card

**✅ Success if:**
- URL changes to `/wallet/launchpad/:projectId`
- Project detail page loads
- Shows correct project name and data

---

## Step 2: Test Different Projects (2 minutes)

### Test Live Project (Abundance Protocol)
1. Click on "Abundance Protocol" card
2. **✅ Should show:**
   - Countdown timer (updating every second)
   - Progress bar with current raised amount
   - Purchase input and "Buy with USDC" button
   - Price comparison (Presale vs Listing)

### Test Upcoming Project (MetaGaming)
1. Go back to catalog
2. Click on "MetaGaming Token" card
3. **✅ Should show:**
   - "Presale Not Started" message
   - "Starts in X days" countdown
   - No purchase interface

### Test Ended Project (GreenEnergy)
1. Go back to catalog
2. Click on "GreenEnergy Coin" card
3. **✅ Should show:**
   - "Presale Ended" message
   - "✓ Soft cap reached" (if success)
   - No purchase interface

---

## Step 3: Test Purchase Flow (2 minutes)

1. Go to any **LIVE** project
2. **Test validation:**
   - Enter `10` → Should show "Minimum 50 USDC"
   - Enter `50000` → Should show "Maximum 10,000 USDC"
   - Enter `100` → Should show "You receive: 420 ABDT"

3. **Test purchase:**
   - Enter valid amount (e.g., `100`)
   - Click **"Buy with USDC"**
   - **✅ Should show confirmation modal** with:
     - Amount: 100 USDC
     - You receive: 420 ABDT
     - Rate: 1 USDC = 4.2 ABDT
     - Network Fee: ~$2.50

4. **Test confirmation:**
   - Click **"Confirm"**
   - **✅ Should show:**
     - Loading spinner (2 seconds)
     - Success modal
     - "Transaction Submitted" message
     - "You will receive X tokens"

---

## Step 4: Test Error Handling (30 seconds)

1. Navigate to invalid project:
   ```
   /wallet/launchpad/invalid-project-id
   ```

2. **✅ Should show:**
   - Error state with alert icon
   - "Project Not Found" message
   - "Back to List" button
   - "Retry" button

3. Click **"Back to List"**
   - Should navigate back to catalog

---

## ✅ All Tests Passed?

If yes, Phase 2 is **fully functional**!

### What Works:
- ✅ Dynamic project loading
- ✅ URL parameter routing
- ✅ Real-time countdown
- ✅ Purchase validation
- ✅ Confirmation flow
- ✅ Error handling
- ✅ Status-based UI

### Ready for Phase 3:
- ⚠️ Blockchain transactions
- ⚠️ USDC approval
- ⚠️ Smart contract calls
- ⚠️ Database updates

---

## 🐛 Common Issues

### Issue: "Project not loading"

**Check:**
1. Database has projects? Run:
   ```sql
   SELECT COUNT(*) FROM launchpad_projects;
   ```
2. Project ID correct? Check URL parameter
3. Network error? Check browser console

**Fix:** Re-run `create_launchpad_tables_FIXED.sql`

---

### Issue: "Countdown not updating"

**Cause:** JavaScript timer not running

**Fix:** Refresh page (should auto-fix)

---

### Issue: "Purchase button disabled"

**Check:**
1. Wallet connected?
2. Amount entered?
3. Amount valid (min/max)?
4. Project status = 'live'?

---

**Testing Time:** 5 minutes  
**Status:** Ready to test  
**Next:** Phase 3 - Blockchain Integration

