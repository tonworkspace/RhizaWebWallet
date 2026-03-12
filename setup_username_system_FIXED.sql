-- ============================================================================
-- USERNAME SYSTEM SETUP - FIXED VERSION
-- ============================================================================
-- This script sets up the username system for user-friendly transfers
-- Users can send TON/RZC/Jettons using @username instead of wallet addresses
-- ============================================================================

-- ============================================================================
-- STEP 1: Enable Required Extensions FIRST
-- ============================================================================

-- Enable trigram extension for better text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Verify extension is enabled
SELECT 'pg_trgm extension enabled' as status;


-- ============================================================================
-- STEP 2: Add Username Constraints and Indexes
-- ============================================================================

-- Drop existing indexes if they exist
DROP INDEX IF EXISTS idx_wallet_users_name_lower;
DROP INDEX IF EXISTS idx_wallet_users_name_search;

-- Create case-insensitive unique index on name
CREATE UNIQUE INDEX idx_wallet_users_name_lower 
ON wallet_users (LOWER(name));

COMMENT ON INDEX idx_wallet_users_name_lower IS 'Ensures usernames are unique (case-insensitive)';

-- Create index for fast username lookups (now that pg_trgm is enabled)
CREATE INDEX idx_wallet_users_name_search 
ON wallet_users USING gin (name gin_trgm_ops);

COMMENT ON INDEX idx_wallet_users_name_search IS 'Enables fast username search with LIKE queries';


-- ============================================================================
-- STEP 3: Create Username Resolution Function
-- ============================================================================

CREATE OR REPLACE FUNCTION resolve_username(p_username TEXT)
RETURNS TABLE (
  wallet_address TEXT,
  name TEXT,
  avatar TEXT,
  is_activated BOOLEAN
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- Remove @ if present
  p_username := TRIM(LEADING '@' FROM p_username);
  
  -- Return user with matching username (case-insensitive)
  RETURN QUERY
  SELECT 
    wu.wallet_address,
    wu.name,
    wu.avatar,
    wu.is_activated
  FROM wallet_users wu
  WHERE LOWER(wu.name) = LOWER(p_username)
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION resolve_username IS 'Resolves a username to wallet address and user info';


-- ============================================================================
-- STEP 4: Create Username Search Function
-- ============================================================================

CREATE OR REPLACE FUNCTION search_usernames(
  p_query TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  wallet_address TEXT,
  name TEXT,
  avatar TEXT,
  is_activated BOOLEAN,
  similarity REAL
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- Remove @ if present
  p_query := TRIM(LEADING '@' FROM p_query);
  
  -- Return users matching query, ordered by similarity
  RETURN QUERY
  SELECT 
    wu.wallet_address,
    wu.name,
    wu.avatar,
    wu.is_activated,
    similarity(wu.name, p_query) as sim
  FROM wallet_users wu
  WHERE wu.name ILIKE '%' || p_query || '%'
  ORDER BY sim DESC, wu.name
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION search_usernames IS 'Searches for usernames matching a query';


-- ============================================================================
-- STEP 5: Create Username Availability Check Function
-- ============================================================================

CREATE OR REPLACE FUNCTION is_username_available(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Remove @ if present
  p_username := TRIM(LEADING '@' FROM p_username);
  
  -- Check if username exists (case-insensitive)
  SELECT EXISTS (
    SELECT 1 
    FROM wallet_users 
    WHERE LOWER(name) = LOWER(p_username)
  ) INTO v_exists;
  
  -- Return true if available (not exists)
  RETURN NOT v_exists;
END;
$$;

COMMENT ON FUNCTION is_username_available IS 'Checks if a username is available for registration';


-- ============================================================================
-- STEP 6: Create Function to Get Username from Address
-- ============================================================================

CREATE OR REPLACE FUNCTION get_username_by_address(p_wallet_address TEXT)
RETURNS TABLE (
  name TEXT,
  avatar TEXT,
  is_activated BOOLEAN
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wu.name,
    wu.avatar,
    wu.is_activated
  FROM wallet_users wu
  WHERE wu.wallet_address = p_wallet_address
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION get_username_by_address IS 'Gets username and info from wallet address';


-- ============================================================================
-- STEP 7: Create Username Change History Table (Optional)
-- ============================================================================

CREATE TABLE IF NOT EXISTS username_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES wallet_users(id) ON DELETE CASCADE,
  old_username TEXT NOT NULL,
  new_username TEXT NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  changed_by TEXT,
  reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_username_history_user_id ON username_history(user_id);
CREATE INDEX IF NOT EXISTS idx_username_history_changed_at ON username_history(changed_at DESC);

COMMENT ON TABLE username_history IS 'Tracks username changes for audit purposes';


-- ============================================================================
-- STEP 8: Create Trigger to Log Username Changes
-- ============================================================================

CREATE OR REPLACE FUNCTION log_username_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.name IS DISTINCT FROM NEW.name THEN
    INSERT INTO username_history (user_id, old_username, new_username, changed_by)
    VALUES (NEW.id, OLD.name, NEW.name, 'user');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_username_change ON wallet_users;
CREATE TRIGGER trigger_log_username_change
AFTER UPDATE ON wallet_users
FOR EACH ROW
EXECUTE FUNCTION log_username_change();


-- ============================================================================
-- STEP 9: Add RLS Policies for Username Functions
-- ============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION resolve_username TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_username TO anon;
GRANT EXECUTE ON FUNCTION search_usernames TO authenticated;
GRANT EXECUTE ON FUNCTION search_usernames TO anon;
GRANT EXECUTE ON FUNCTION is_username_available TO authenticated;
GRANT EXECUTE ON FUNCTION is_username_available TO anon;
GRANT EXECUTE ON FUNCTION get_username_by_address TO authenticated;
GRANT EXECUTE ON FUNCTION get_username_by_address TO anon;


-- ============================================================================
-- STEP 10: Verification Queries
-- ============================================================================

-- Check extension is enabled
SELECT 
  'Extension Status' as check_type,
  extname as extension_name,
  'Enabled' as status
FROM pg_extension
WHERE extname = 'pg_trgm';

-- Check indexes
SELECT 
  'Index Status' as check_type,
  indexname as index_name,
  'Created' as status
FROM pg_indexes
WHERE tablename = 'wallet_users'
  AND indexname LIKE '%name%';

-- Check functions
SELECT 
  'Function Status' as check_type,
  routine_name as function_name,
  'Created' as status
FROM information_schema.routines
WHERE routine_name IN (
  'resolve_username',
  'search_usernames',
  'is_username_available',
  'get_username_by_address'
);

-- Test username resolution (will work if users exist)
-- SELECT * FROM resolve_username('Rhiza User');


-- ============================================================================
-- STEP 11: Usage Examples
-- ============================================================================

-- Example 1: Resolve username to address
/*
SELECT * FROM resolve_username('@john');
SELECT * FROM resolve_username('john');  -- @ is optional
*/

-- Example 2: Search for users
/*
SELECT * FROM search_usernames('joh', 10);
*/

-- Example 3: Check if username is available
/*
SELECT is_username_available('newuser');
*/

-- Example 4: Get username from address
/*
SELECT * FROM get_username_by_address('UQx1...abc');
*/

-- Example 5: View username change history
/*
SELECT 
  uh.old_username,
  uh.new_username,
  uh.changed_at,
  wu.wallet_address
FROM username_history uh
JOIN wallet_users wu ON uh.user_id = wu.id
ORDER BY uh.changed_at DESC
LIMIT 10;
*/


-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================
SELECT 'Username system setup complete!' as status;

-- Final verification summary
SELECT 
  'Setup Summary' as report,
  (SELECT COUNT(*) FROM pg_extension WHERE extname = 'pg_trgm') as extensions_enabled,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'wallet_users' AND indexname LIKE '%name%') as indexes_created,
  (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name LIKE '%username%') as functions_created,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'username_history') as tables_created;
