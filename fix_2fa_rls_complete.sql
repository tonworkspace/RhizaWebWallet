-- ============================================================
-- Complete fix for wallet_2fa RLS policy violation
-- Root cause: wallet_users.auth_user_id is NULL for existing
-- users because no trigger links auth.users → wallet_users.
-- ============================================================

-- Step 1: Link existing wallet_users rows to auth.users by email
-- (the signInWithWallet flow creates auth users with email = <address>@rhiza.wallet)
UPDATE wallet_users wu
SET auth_user_id = au.id
FROM auth.users au
WHERE (
  -- Match by the deterministic wallet email pattern
  au.email = lower(wu.wallet_address) || '@rhiza.wallet'
  OR
  -- Match by regular email if user signed up with email/password
  au.email = wu.email
)
AND wu.auth_user_id IS NULL;

-- Step 2: Create trigger function to auto-link on new auth signups
CREATE OR REPLACE FUNCTION handle_auth_user_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Match by wallet email pattern (signInWithWallet flow)
  UPDATE wallet_users
  SET auth_user_id = NEW.id
  WHERE auth_user_id IS NULL
    AND (
      lower(wallet_address) || '@rhiza.wallet' = NEW.email
      OR email = NEW.email
    );
  RETURN NEW;
END;
$$;

-- Step 3: Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_auth_user_created();

-- Step 4: Also handle sign-in updates (in case user existed before trigger)
-- This function can be called manually or via a separate trigger
CREATE OR REPLACE FUNCTION sync_auth_user_id(p_auth_user_id uuid, p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE wallet_users
  SET auth_user_id = p_auth_user_id
  WHERE auth_user_id IS NULL
    AND (
      lower(wallet_address) || '@rhiza.wallet' = p_email
      OR email = p_email
    );
END;
$$;

-- Step 5: Verify the fix (run this SELECT to check results)
-- SELECT id, wallet_address, email, auth_user_id FROM wallet_users LIMIT 20;
