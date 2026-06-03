# 🚀 Launchpad Setup Guide - Quick Start

**Time Required:** 5-10 minutes  
**Difficulty:** Easy

---

## Step 1: Create Database Tables

1. Open **Supabase Dashboard** → SQL Editor
2. Copy the entire contents of `create_launchpad_tables.sql`
3. Paste into SQL Editor
4. Click **Run**

**Expected Result:**
```
✅ 2 tables created (launchpad_projects, presale_transactions)
✅ 4 seed projects inserted
✅ Functions and triggers created
✅ RLS policies enabled
```

**Verify:**
```sql
SELECT name, symbol, status, raised_amount 
FROM launchpad_projects;
```

You should see 4 projects:
- Abundance Protocol (live)
- DeFi Yield (live)
- MetaGaming (upcoming)
- GreenEnergy (success)

---

## Step 2: Test the Integration

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to Launchpad:**
   - Go to `/wallet/launchpad-list`
   - Or click "Launchpad" in the sidebar

3. **Verify:**
   - ✅ Landing page shows with "Invest in Web3 Projects" hero
   - ✅ Stats banner shows real numbers (2 live sales, etc.)
   - ✅ Click "View Live Sales" to see catalog
   - ✅ 4 projects displayed with correct data
   - ✅ Search and filter work
   - ✅ No console errors

---

## Step 3: Test Real-time Updates

1. **Open Supabase Dashboard** → Table Editor → `launchpad_projects`

2. **Update a project:**
   - Find "Abundance Protocol"
   - Change `raised_amount` from 134500 to 140000
   - Save

3. **Check your app:**
   - Within 30 seconds, the stats should update
   - The project card should show new raised amount
   - Progress bar should update

---

## Step 4: Set Up Auto Status Updates (Optional)

To automatically transition projects from `upcoming` → `live` → `ended/success`:

### Option A: Supabase Edge Function (Recommended)

1. Create `supabase/functions/update-project-status/index.ts`:
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { error } = await supabase.rpc('auto_update_project_status')

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

2. Deploy:
```bash
supabase functions deploy update-project-status
```

3. Set up cron (Supabase Dashboard → Edge Functions → Cron):
```
*/1 * * * * # Every minute
```

### Option B: External Cron Job

Use a service like cron-job.org to call:
```
POST https://your-project.supabase.co/rest/v1/rpc/auto_update_project_status
Authorization: Bearer YOUR_SERVICE_ROLE_KEY
```

---

## Troubleshooting

### Issue: "Projects not loading"

**Check:**
1. Supabase connection working?
   ```typescript
   console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
   ```

2. Tables created?
   ```sql
   SELECT * FROM launchpad_projects LIMIT 1;
   ```

3. RLS policies correct?
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'launchpad_projects';
   ```

### Issue: "Permission denied"

**Fix:** RLS policies might be too restrictive. Verify:
```sql
-- This should work (public read access)
SELECT * FROM launchpad_projects;
```

If it fails, check RLS policies in Supabase Dashboard.

### Issue: "Stats showing 0"

**Check:**
1. Seed data inserted?
   ```sql
   SELECT COUNT(*) FROM launchpad_projects;
   -- Should return 4
   ```

2. Stats calculation working?
   ```sql
   SELECT 
     COUNT(*) as total,
     SUM(raised_amount) as total_raised,
     SUM(participant_count) as total_participants
   FROM launchpad_projects;
   ```

---

## Next Steps

Once everything is working:

1. **Phase 2:** Implement dynamic project detail page
   - See `LAUNCHPAD_BACKEND_INTEGRATION_COMPLETE.md`

2. **Add Real Projects:**
   ```sql
   INSERT INTO launchpad_projects (
     name, symbol, tagline, description,
     total_supply, presale_allocation,
     presale_rate, listing_rate,
     soft_cap, hard_cap,
     presale_start, presale_end,
     -- ... other fields
   ) VALUES (
     'Your Project', 'YPT', 'Your tagline',
     -- ... values
   );
   ```

3. **Customize:**
   - Update project logos (logo_url)
   - Add social links
   - Configure vesting schedules
   - Set verification badges

---

## Quick Reference

### Important Files

```
Database:
  create_launchpad_tables.sql     # Database schema

Services:
  services/launchpadService.ts    # Backend integration

Pages:
  pages/LaunchpadList.tsx         # Catalog page
  pages/AbundanceProtocol.tsx     # Detail page (needs update)

Documentation:
  LAUNCHPAD_SYSTEM_AUDIT.md                    # Full audit
  LAUNCHPAD_BACKEND_INTEGRATION_COMPLETE.md    # Integration details
  LAUNCHPAD_SETUP_GUIDE.md                     # This file
```

### Key Functions

```typescript
// Get all projects
launchpadService.getProjects()

// Get single project
launchpadService.getProject(projectId)

// Get stats
launchpadService.getStats()

// Validate purchase
launchpadService.canUserPurchase({ projectId, userAddress, amount })
```

### Database Tables

```sql
-- Projects
SELECT * FROM launchpad_projects;

-- Transactions
SELECT * FROM presale_transactions;

-- Active projects view
SELECT * FROM active_projects;

-- Update project status manually
SELECT auto_update_project_status();
```

---

## Support

If you encounter issues:

1. Check browser console for errors
2. Check Supabase logs (Dashboard → Logs)
3. Verify RLS policies
4. Check network tab for failed requests
5. Review `LAUNCHPAD_BACKEND_INTEGRATION_COMPLETE.md` for detailed docs

---

**Setup Status:** ✅ Ready to Deploy  
**Estimated Setup Time:** 5-10 minutes  
**Next Phase:** Dynamic Project Detail Page
