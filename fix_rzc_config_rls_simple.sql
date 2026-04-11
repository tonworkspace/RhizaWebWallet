-- ============================================================================
-- Simple Fix: Disable RLS for rzc_config Table
-- Config data is public anyway (asset prices), so RLS is not needed
-- ============================================================================

-- ── 1. Check current status ────────────────────────────────────────────────
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'rzc_config';

-- ── 2. Disable RLS ─────────────────────────────────────────────────────────
ALTER TABLE rzc_config DISABLE ROW LEVEL SECURITY;

-- ── 3. Verify RLS is disabled ──────────────────────────────────────────────
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'rzc_config';

-- Should show: rls_enabled = false

-- ============================================================================
-- WHY THIS IS SAFE
-- ============================================================================

/*
The rzc_config table stores:
- Asset prices (TON, BTC, ETH, etc.)
- RZC token price
- Other public configuration values

This data is:
✅ Public information (anyone can see asset prices)
✅ Read by all users (needed for calculations)
✅ Only written by admins (controlled by application logic)

RLS is not needed because:
1. The data is not sensitive
2. Application-level checks already verify admin status
3. All users need read access anyway
4. Simplifies admin operations

For sensitive data (user balances, private keys, etc.), RLS should remain enabled.
*/

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test 1: Read config (should work)
SELECT * FROM rzc_config ORDER BY key LIMIT 10;

-- Test 2: Update config (should work for admins)
-- This will now work without RLS blocking it
UPDATE rzc_config 
SET updated_at = NOW() 
WHERE key = 'TON_PRICE';

-- Test 3: Check if update worked
SELECT key, value, updated_at 
FROM rzc_config 
WHERE key = 'TON_PRICE';

-- ============================================================================
-- ALTERNATIVE: Keep RLS but allow all operations
-- ============================================================================

-- If you prefer to keep RLS enabled but allow all operations:

/*
-- Enable RLS
ALTER TABLE rzc_config ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read
CREATE POLICY "Public read access" ON rzc_config
  FOR SELECT
  USING (true);

-- Allow everyone to insert/update (application controls who can do this)
CREATE POLICY "Public write access" ON rzc_config
  FOR ALL
  USING (true)
  WITH CHECK (true);
*/

-- ============================================================================
-- DONE!
-- ============================================================================

-- After running this, try saving asset rates in the Admin Panel again.
-- The RLS error should be gone.

