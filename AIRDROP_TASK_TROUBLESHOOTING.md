# Airdrop Task Management Troubleshooting Guide

## Issue: "Task not found" when editing or deactivating tasks

### Root Causes:
1. **Database table is empty** - No tasks exist in the database
2. **Database functions not deployed** - SQL functions missing
3. **Task IDs mismatch** - Frontend showing tasks with IDs that don't exist in DB
4. **Database connection issue** - Supabase not configured properly

---

## Diagnostic Steps

### Step 1: Check Browser Console
Open browser DevTools (F12) and look for these logs:
```
🔄 Updating task: { taskId: X, title: "..." }
📊 Update result: { data: false, error: null }
```

If `data: false`, the task ID doesn't exist in the database.

### Step 2: Run Debug Query
Execute `debug_airdrop_tasks.sql` in your Supabase SQL Editor:

```sql
-- Check if table has data
SELECT COUNT(*) as count FROM airdrop_tasks;

-- List all task IDs
SELECT id, title, is_active FROM airdrop_tasks ORDER BY id;

-- Check if functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_name LIKE '%airdrop_task%';
```

**Expected Results:**
- Table should have tasks (count > 0)
- Functions should include: `update_airdrop_task`, `delete_airdrop_task`, `create_airdrop_task`

### Step 3: Check Task IDs
In the admin panel, open browser console and run:
```javascript
// See what tasks the frontend has
console.table(tasks.map(t => ({ id: t.id, title: t.title })));
```

Compare these IDs with the database IDs from Step 2.

---

## Solutions

### Solution 1: Seed Initial Tasks (Empty Database)
If the database is empty, run `seed_airdrop_tasks.sql`:

```bash
# In Supabase SQL Editor, paste and run:
cat seed_airdrop_tasks.sql
```

This will create 10+ initial tasks with IDs 0-10.

### Solution 2: Deploy Database Functions
If functions are missing, run the complete setup:

```bash
# Run in Supabase SQL Editor:
cat create_airdrop_tasks_table.sql
# OR
cat setup_database_tasks_complete.sql
```

This creates:
- `airdrop_tasks` table
- `airdrop_completions` table
- `airdrop_task_stats` view
- All CRUD functions

### Solution 3: Fix ID Mismatch
If frontend shows tasks but DB has different IDs:

**Option A: Update DB to match frontend**
```sql
-- Manually insert missing tasks
INSERT INTO airdrop_tasks (id, title, description, reward, action, category, difficulty, is_active, verification_type)
VALUES (X, 'Task Title', 'Description', 100, 'action_key', 'social', 'easy', true, 'manual');
```

**Option B: Clear frontend cache**
```javascript
// In browser console
localStorage.clear();
location.reload();
```

### Solution 4: Verify Supabase Connection
Check `.env` file has correct credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Test connection in browser console:
```javascript
// Should show your Supabase URL
console.log(import.meta.env.VITE_SUPABASE_URL);
```

---

## Verification Tests

After applying fixes, test these operations:

### Test 1: Load Tasks
```javascript
// In admin panel, open Task Management section
// Should see list of tasks without errors
```

### Test 2: Toggle Task
```javascript
// Click the toggle icon on any task
// Should see success message: "✅ Task activated/deactivated"
// Task should update in the list
```

### Test 3: Edit Task
```javascript
// Click edit icon on any task
// Modal should open with task data
// Change title and save
// Should see: "✅ Task updated successfully"
```

### Test 4: Create Task
```javascript
// Click "New Task" button
// Fill in required fields (title, action)
// Click "Create Task"
// Should see: "✅ Task created successfully"
// New task should appear in list
```

### Test 5: Delete Task
```javascript
// Click trash icon on any task
// Confirm deletion
// Should see: "✅ Task deactivated"
// Task should show as inactive (grayed out)
```

---

## Common Error Messages

### "Task #X not found in database"
**Cause:** Task ID exists in frontend but not in database  
**Fix:** Run `seed_airdrop_tasks.sql` or manually insert the task

### "Database not configured"
**Cause:** Supabase client not initialized  
**Fix:** Check `.env` file and restart dev server

### "Failed to update task: permission denied"
**Cause:** RLS policies blocking update  
**Fix:** Check if admin user has proper role in `wallet_users` table

### "function update_airdrop_task does not exist"
**Cause:** Database functions not deployed  
**Fix:** Run `create_airdrop_tasks_table.sql`

---

## Advanced Debugging

### Enable Verbose Logging
The service now includes detailed console logs:
- 🔄 = Operation starting
- 📊 = Database response
- ✅ = Success
- ❌ = Error

Watch the console for these emojis to trace the flow.

### Check RLS Policies
```sql
-- View policies on airdrop_tasks table
SELECT * FROM pg_policies WHERE tablename = 'airdrop_tasks';

-- Temporarily disable RLS for testing (NOT for production!)
ALTER TABLE airdrop_tasks DISABLE ROW LEVEL SECURITY;
```

### Test Functions Directly
```sql
-- Test update function
SELECT update_airdrop_task(
    1,                    -- task_id
    'Test Task',          -- title
    'Test Description',   -- description
    100,                  -- reward
    'test_action',        -- action
    'social',             -- category
    'easy',               -- difficulty
    true,                 -- is_active
    'Test instructions',  -- instructions
    null,                 -- time_limit
    'manual',             -- verification_type
    '{}',                 -- requirements
    null,                 -- sort_order
    'admin_test'          -- updated_by
);

-- Should return: true (if task exists) or false (if not found)
```

---

## Prevention

To avoid these issues in the future:

1. **Always seed tasks after database reset**
2. **Keep task IDs consistent** between frontend and database
3. **Use database as single source of truth** (don't rely on hardcoded tasks)
4. **Test CRUD operations** after any database migration
5. **Monitor console logs** for early error detection

---

## Quick Fix Checklist

- [ ] Run `debug_airdrop_tasks.sql` to check database state
- [ ] Run `seed_airdrop_tasks.sql` if table is empty
- [ ] Verify functions exist in database
- [ ] Check browser console for detailed error logs
- [ ] Test toggle/edit/delete operations
- [ ] Clear localStorage if needed
- [ ] Restart dev server if `.env` changed

---

## Need More Help?

If issues persist:
1. Export console logs (right-click → Save as...)
2. Run `debug_airdrop_tasks.sql` and save results
3. Check Supabase logs in dashboard
4. Verify admin user has correct role in `wallet_users` table
