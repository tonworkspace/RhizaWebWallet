# 🧪 Launchpad Service Testing Guide

**Purpose:** Verify the launchpad service works correctly with your database  
**Time Required:** 10-15 minutes

---

## 🚀 Quick Browser Test (Easiest)

### Step 1: Open Browser Console

1. Navigate to `/wallet/launchpad-list`
2. Open Developer Tools (F12)
3. Go to **Console** tab

### Step 2: Run Tests

Copy and paste each test below into the console:

#### Test 1: Get All Projects

```javascript
// Import service
const { launchpadService } = await import('./services/launchpadService.js');

// Get all projects
const projects = await launchpadService.getProjects();
console.log('✅ Projects:', projects.data?.length);
console.log('Sample:', projects.data?.[0]);
```

**Expected:** Should show 4 projects

---

#### Test 2: Get Live Projects

```javascript
const liveProjects = await launchpadService.getProjects({ status: 'live' });
console.log('✅ Live Projects:', liveProjects.data?.length);
```

**Expected:** Should show 2 live projects

---

#### Test 3: Get Stats

```javascript
const stats = await launchpadService.getStats();
console.log('✅ Stats:', stats.data);
```

**Expected:**
```javascript
{
  total_projects: 4,
  live_projects: 2,
  total_raised: 226100,
  total_participants: 2320
}
```

---

#### Test 4: Search Projects

```javascript
const search = await launchpadService.getProjects({ search: 'Abundance' });
console.log('✅ Search Results:', search.data?.length);
console.log('Found:', search.data?.[0]?.name);
```

**Expected:** Should find "Abundance Protocol"

---

#### Test 5: Get Single Project

```javascript
// Get first project ID
const allProjects = await launchpadService.getProjects();
const projectId = allProjects.data?.[0]?.id;

// Get project details
const project = await launchpadService.getProject(projectId);
console.log('✅ Project:', project.data?.name);
console.log('Status:', project.data?.status);
console.log('Raised:', project.data?.raised_amount);
```

**Expected:** Should show project details

---

#### Test 6: Get Project Progress

```javascript
const allProjects = await launchpadService.getProjects();
const projectId = allProjects.data?.[0]?.id;

const progress = await launchpadService.getProjectProgress(projectId);
console.log('✅ Progress:', progress.data);
```

**Expected:**
```javascript
{
  progress_percent: 67.25,
  time_remaining: "3 days 14:00:00",
  is_active: true,
  can_purchase: true
}
```

---

#### Test 7: Validate Purchase (Replace with your wallet address)

```javascript
const allProjects = await launchpadService.getProjects();
const projectId = allProjects.data?.[0]?.id;

// Replace with your actual wallet address
const myWallet = 'YOUR_WALLET_ADDRESS';

const validation = await launchpadService.canUserPurchase({
  projectId: projectId,
  userAddress: myWallet,
  amount: 100
});

console.log('✅ Can Purchase:', validation.canPurchase);
console.log('Reason:', validation.reason);
```

**Expected:** Should validate purchase eligibility

---

#### Test 8: Test Min/Max Validation

```javascript
const allProjects = await launchpadService.getProjects();
const projectId = allProjects.data?.[0]?.id;
const myWallet = 'YOUR_WALLET_ADDRESS';

// Test too low
const tooLow = await launchpadService.canUserPurchase({
  projectId: projectId,
  userAddress: myWallet,
  amount: 10 // Below minimum of 50
});
console.log('✅ Too Low:', tooLow.canPurchase, '-', tooLow.reason);

// Test too high
const tooHigh = await launchpadService.canUserPurchase({
  projectId: projectId,
  userAddress: myWallet,
  amount: 50000 // Above maximum of 10000
});
console.log('✅ Too High:', tooHigh.canPurchase, '-', tooHigh.reason);
```

**Expected:** Both should return `canPurchase: false` with reasons

---

#### Test 9: Get User Transactions

```javascript
const myWallet = 'YOUR_WALLET_ADDRESS';

const transactions = await launchpadService.getUserTransactions(myWallet);
console.log('✅ User Transactions:', transactions.data?.length);
console.log('Transactions:', transactions.data);
```

**Expected:** Should show user's presale transactions (0 if none yet)

---

#### Test 10: Get Recent Contributions

```javascript
const allProjects = await launchpadService.getProjects();
const projectId = allProjects.data?.[0]?.id;

const contributions = await launchpadService.getRecentContributions(projectId, 5);
console.log('✅ Recent Contributions:', contributions.data?.length);
console.log('Contributions:', contributions.data);
```

**Expected:** Should show recent purchases (0 if none yet)

---

## 🔍 Database Verification Tests

### Test 1: Check Tables Exist

```sql
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as columns
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN ('launchpad_projects', 'presale_transactions', 'notifications', 'wallet_users')
ORDER BY table_name;
```

**Expected:** 4 tables

---

### Test 2: Check Projects Data

```sql
SELECT 
  name,
  symbol,
  status,
  raised_amount,
  hard_cap,
  participant_count,
  ROUND((raised_amount / hard_cap * 100)::NUMERIC, 2) as progress_percent
FROM launchpad_projects
ORDER BY 
  CASE status
    WHEN 'live' THEN 1
    WHEN 'upcoming' THEN 2
    WHEN 'success' THEN 3
    WHEN 'ended' THEN 4
  END;
```

**Expected:** 4 projects with correct data

---

### Test 3: Check Foreign Keys

```sql
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'presale_transactions';
```

**Expected:**
- `user_id` → `wallet_users(id)`
- `project_id` → `launchpad_projects(id)`

---

### Test 4: Check RLS Policies

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE tablename IN ('launchpad_projects', 'presale_transactions', 'notifications')
ORDER BY tablename, policyname;
```

**Expected:** Multiple policies per table

---

### Test 5: Check Triggers

```sql
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name IN ('trigger_update_project_stats', 'trigger_notify_presale_transaction')
ORDER BY trigger_name;
```

**Expected:** 2 triggers

---

### Test 6: Check Functions

```sql
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'update_project_stats',
  'auto_update_project_status',
  'get_project_progress',
  'notify_new_presale_transaction'
)
ORDER BY routine_name;
```

**Expected:** 4 functions

---

### Test 7: Test Progress Function

```sql
-- Get a project ID first
SELECT id FROM launchpad_projects LIMIT 1;

-- Then test the function (replace with actual ID)
SELECT * FROM get_project_progress('YOUR_PROJECT_ID_HERE');
```

**Expected:** Progress data with percentages and time remaining

---

### Test 8: Test Auto Status Update

```sql
-- Run the status update function
SELECT auto_update_project_status();

-- Check if any statuses changed
SELECT name, status, presale_start, presale_end
FROM launchpad_projects
ORDER BY presale_start;
```

**Expected:** Projects should have correct status based on dates

---

## 🧪 Integration Tests

### Test 1: Create Test Transaction

```sql
-- Get a project and user
SELECT 
  p.id as project_id,
  u.id as user_id,
  u.wallet_address
FROM launchpad_projects p
CROSS JOIN wallet_users u
WHERE p.status = 'live'
LIMIT 1;

-- Create test transaction (replace IDs)
INSERT INTO presale_transactions (
  project_id,
  user_id,
  user_address,
  amount_usdc,
  tokens_received,
  tx_hash,
  status
) VALUES (
  'PROJECT_ID_HERE',
  'USER_ID_HERE',
  'WALLET_ADDRESS_HERE',
  100.00,
  420.00,
  '0xtest' || extract(epoch from now())::text,
  'pending'
) RETURNING *;
```

**Expected:** Transaction created successfully

---

### Test 2: Confirm Transaction (Trigger Test)

```sql
-- Get the test transaction ID
SELECT id, tx_hash, status FROM presale_transactions ORDER BY created_at DESC LIMIT 1;

-- Update to confirmed (should trigger stats update)
UPDATE presale_transactions
SET status = 'confirmed', confirmed_at = NOW()
WHERE tx_hash = 'YOUR_TX_HASH_HERE'
RETURNING *;

-- Check if project stats updated
SELECT name, raised_amount, participant_count
FROM launchpad_projects
WHERE id = 'YOUR_PROJECT_ID_HERE';
```

**Expected:** 
- Transaction status = 'confirmed'
- Project raised_amount increased by 100
- Project participant_count increased by 1

---

### Test 3: Check Notification Created

```sql
-- Check if notification was created by trigger
SELECT 
  n.type,
  n.title,
  n.message,
  n.priority,
  n.created_at,
  u.wallet_address
FROM notifications n
JOIN wallet_users u ON n.user_id = u.id
ORDER BY n.created_at DESC
LIMIT 5;
```

**Expected:** Notification with type 'presale_purchase'

---

### Test 4: Cleanup Test Data

```sql
-- Delete test transaction
DELETE FROM presale_transactions
WHERE tx_hash LIKE '0xtest%';

-- Manually adjust project stats back (if needed)
UPDATE launchpad_projects
SET 
  raised_amount = raised_amount - 100,
  participant_count = participant_count - 1
WHERE id = 'YOUR_PROJECT_ID_HERE';
```

---

## 📊 Performance Tests

### Test 1: Query Performance

```sql
-- Should be fast (< 10ms)
EXPLAIN ANALYZE
SELECT * FROM launchpad_projects WHERE status = 'live';

-- Should use index
EXPLAIN ANALYZE
SELECT * FROM presale_transactions WHERE user_address = 'test';
```

**Expected:** Both should use indexes

---

### Test 2: Stats Calculation Performance

```sql
-- Should be fast (< 50ms)
EXPLAIN ANALYZE
SELECT 
  COUNT(*) as total_projects,
  COUNT(*) FILTER (WHERE status = 'live') as live_projects,
  SUM(raised_amount) as total_raised,
  SUM(participant_count) as total_participants
FROM launchpad_projects;
```

**Expected:** Fast aggregation

---

## ✅ Success Criteria

### Database Tests ✅

- [ ] All 4 tables exist
- [ ] Foreign keys reference `wallet_users`
- [ ] RLS policies active
- [ ] Triggers functional
- [ ] Functions executable
- [ ] Seed data present

### Service Tests ✅

- [ ] `getProjects()` returns 4 projects
- [ ] `getStats()` calculates correctly
- [ ] `getProject(id)` retrieves details
- [ ] `canUserPurchase()` validates correctly
- [ ] Search and filter work
- [ ] No TypeScript errors

### Integration Tests ✅

- [ ] Can create transactions
- [ ] Triggers update project stats
- [ ] Notifications created
- [ ] RLS policies enforce security

### Performance Tests ✅

- [ ] Queries use indexes
- [ ] Response times < 100ms
- [ ] No N+1 query issues

---

## 🐛 Common Issues

### Issue: "Projects not loading"

**Cause:** Tables not created or RLS blocking access

**Fix:**
```sql
-- Check if tables exist
SELECT * FROM launchpad_projects LIMIT 1;

-- If error, run create_launchpad_tables_FIXED.sql
```

---

### Issue: "Permission denied"

**Cause:** RLS policies too restrictive

**Fix:**
```sql
-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'launchpad_projects';

-- Should have "Projects are viewable by everyone" policy
```

---

### Issue: "Foreign key violation"

**Cause:** Referencing non-existent user

**Fix:**
```sql
-- Check if user exists
SELECT id, wallet_address FROM wallet_users LIMIT 1;

-- Use existing user ID in transactions
```

---

### Issue: "Trigger not firing"

**Cause:** Trigger not created or disabled

**Fix:**
```sql
-- Check trigger exists
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_project_stats';

-- Recreate if missing (run SQL script)
```

---

## 📝 Test Checklist

### Pre-Test Setup

- [ ] SQL script run successfully
- [ ] 4 projects in database
- [ ] wallet_users table has data
- [ ] Supabase connection working

### Browser Tests

- [ ] Can import launchpadService
- [ ] getProjects() works
- [ ] getStats() works
- [ ] Search works
- [ ] Filter works
- [ ] Validation works

### Database Tests

- [ ] Tables exist
- [ ] Foreign keys correct
- [ ] RLS policies active
- [ ] Triggers functional
- [ ] Functions work

### Integration Tests

- [ ] Can create transaction
- [ ] Stats update automatically
- [ ] Notifications created
- [ ] Security enforced

---

## 🎉 All Tests Passed?

If all tests pass, your launchpad service is:

✅ **Fully functional**  
✅ **Properly integrated with database**  
✅ **Secure with RLS policies**  
✅ **Ready for Phase 2 (Dynamic Project Detail)**

---

**Testing Time:** 10-15 minutes  
**Status:** Ready to verify  
**Next:** Run tests and report results
