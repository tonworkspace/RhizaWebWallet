# ⚡ Launchpad Quick Test (5 Minutes)

**Purpose:** Quickly verify the launchpad service works  
**Time:** 5 minutes

---

## Step 1: Deploy Database (2 minutes)

1. Open **Supabase Dashboard** → **SQL Editor**
2. Open file: `create_launchpad_tables_FIXED.sql`
3. Copy all content
4. Paste in SQL Editor
5. Click **Run**

**✅ Success if you see:**
```
Launchpad tables created successfully
projects_count: 4
```

---

## Step 2: Test UI (2 minutes)

1. Start dev server: `npm run dev`
2. Navigate to: `/wallet/launchpad-list`

**✅ Success if you see:**
- Landing page with hero section
- Stats banner showing numbers (not 0)
- "View Live Sales" button

3. Click **"View Live Sales"**

**✅ Success if you see:**
- 4 project cards
- Search bar
- Filter tabs (All/Live/Upcoming/Ended)

---

## Step 3: Test Service (1 minute)

1. Open **Browser Console** (F12)
2. Copy and paste this:

```javascript
const { launchpadService } = await import('./services/launchpadService.js');

// Test 1: Get projects
const projects = await launchpadService.getProjects();
console.log('Projects:', projects.data?.length);

// Test 2: Get stats
const stats = await launchpadService.getStats();
console.log('Stats:', stats.data);

// Test 3: Get live projects
const live = await launchpadService.getProjects({ status: 'live' });
console.log('Live:', live.data?.length);
```

**✅ Success if you see:**
```
Projects: 4
Stats: { total_projects: 4, live_projects: 2, total_raised: 226100, total_participants: 2320 }
Live: 2
```

---

## ✅ All Tests Passed?

If yes, your launchpad is **fully functional**!

### What Works:
- ✅ Database integration
- ✅ Service layer
- ✅ UI display
- ✅ Real-time stats
- ✅ Search and filter

### Next Steps:
1. **Phase 2:** Make project detail page dynamic
2. **Phase 3:** Connect wallet
3. **Phase 4:** Enable blockchain transactions

---

## ❌ Tests Failed?

### Issue: "Projects not loading"

**Fix:**
```sql
-- Run in Supabase SQL Editor
SELECT COUNT(*) FROM launchpad_projects;
```

If error or 0, re-run `create_launchpad_tables_FIXED.sql`

---

### Issue: "Stats showing 0"

**Fix:**
```sql
-- Check data
SELECT name, raised_amount, participant_count 
FROM launchpad_projects;
```

If empty, re-run SQL script.

---

### Issue: "Console errors"

**Check:**
1. Supabase connection working?
2. SQL script ran successfully?
3. Browser console shows specific error?

**Common fix:** Clear browser cache and reload

---

**Quick Test Time:** 5 minutes  
**Status:** Ready to test  
**Confidence:** HIGH

