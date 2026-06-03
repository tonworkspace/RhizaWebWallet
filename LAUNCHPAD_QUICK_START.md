# 🚀 Launchpad Quick Start Guide

**Time Required:** 5 minutes  
**Status:** ✅ Ready to Deploy

---

## ⚡ Quick Setup (3 Steps)

### Step 1: Run SQL Script (2 minutes)

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy **`create_launchpad_tables_FIXED.sql`**
3. Paste and click **Run**

✅ **Expected:** "Launchpad tables created successfully"

---

### Step 2: Test in Browser (2 minutes)

1. Start dev server: `npm run dev`
2. Navigate to: `/wallet/launchpad-list`
3. Verify:
   - ✅ 4 projects displayed
   - ✅ Stats show real numbers
   - ✅ No console errors

---

### Step 3: Done! 🎉

Your launchpad is now live with:
- ✅ Real database integration
- ✅ 4 example projects
- ✅ Search and filter
- ✅ Real-time stats

---

## 📋 What You Get

### Landing Page
- Hero section with investment pitch
- "Why Invest" section with 6 reasons
- Stats banner (live sales, investors, raised)
- Professional advisor-style presentation

### Catalog Page
- 4 projects with real data
- Search by name/symbol
- Filter by status (All/Live/Upcoming/Ended)
- Project cards with progress bars

### Backend
- Complete database schema
- Automatic stats updates
- Real-time subscriptions
- Secure RLS policies

---

## 🔍 Verify It's Working

### Check Database

```sql
-- Should return 4 projects
SELECT COUNT(*) FROM launchpad_projects;

-- Should show 2 live projects
SELECT COUNT(*) FROM launchpad_projects WHERE status = 'live';

-- Should show stats
SELECT 
  SUM(raised_amount) as total_raised,
  SUM(participant_count) as total_participants
FROM launchpad_projects;
```

### Check UI

Open browser console and run:

```javascript
// Should show 4 projects
fetch('/api/launchpad/projects').then(r => r.json()).then(console.log);
```

---

## 🎯 What's Next?

### Phase 2: Dynamic Project Detail

**Current:** `AbundanceProtocol.tsx` is hardcoded  
**Goal:** Load any project dynamically

**Tasks:**
1. Rename to `ProjectDetail.tsx`
2. Use `useParams` to get project ID
3. Fetch project from database
4. Add loading/error states

**Time:** 1-2 hours

### Phase 3: Wallet Integration

**Goal:** Connect wallet and enable purchases

**Tasks:**
1. Connect "Connect Wallet" button
2. Show user balance
3. Validate purchase amounts
4. Enable buy button

**Time:** 2-3 hours

### Phase 4: Blockchain Transactions

**Goal:** Execute real presale purchases

**Tasks:**
1. Integrate USDC contract
2. Integrate presale contract
3. Handle transaction signing
4. Update database after confirmation

**Time:** 4-6 hours

---

## 🐛 Troubleshooting

### "Projects not loading"

**Check:**
```sql
SELECT * FROM launchpad_projects LIMIT 1;
```

If empty, re-run SQL script.

### "Permission denied"

**Fix:**
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'launchpad_projects';
```

Should show "Projects are viewable by everyone" policy.

### "Stats showing 0"

**Check:**
```sql
SELECT 
  COUNT(*) as projects,
  SUM(raised_amount) as raised,
  SUM(participant_count) as participants
FROM launchpad_projects;
```

If all 0, seed data didn't insert. Re-run SQL script.

---

## 📚 Key Files

| File | Purpose |
|------|---------|
| `create_launchpad_tables_FIXED.sql` | Database schema (USE THIS) |
| `services/launchpadService.ts` | Backend integration |
| `pages/LaunchpadList.tsx` | Catalog page |
| `pages/AbundanceProtocol.tsx` | Detail page (needs update) |

---

## ✅ Checklist

- [ ] SQL script run successfully
- [ ] 4 projects visible in database
- [ ] Launchpad page loads
- [ ] Stats show correct numbers
- [ ] Search works
- [ ] Filter works
- [ ] No console errors

---

## 🎉 You're Done!

Your launchpad is now:
- ✅ Integrated with database
- ✅ Showing real data
- ✅ Ready for Phase 2

**Next:** Implement dynamic project detail page

---

**Setup Time:** 5 minutes  
**Status:** ✅ Complete  
**Ready for:** Phase 2 Development
