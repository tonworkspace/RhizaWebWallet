-- Fix wallet_2fa RLS policies to use wallet_address instead of auth_user_id join
-- The wallet_address is unique and always available from the client session.
-- We verify ownership by checking that the wallet_address in the row matches
-- the wallet_address stored in wallet_users for the current auth.uid().

-- Drop existing policies
drop policy if exists "Users can select their own 2FA record" on wallet_2fa;
drop policy if exists "Users can insert their own 2FA record" on wallet_2fa;
drop policy if exists "Users can update their own 2FA record" on wallet_2fa;
drop policy if exists "Users can delete their own 2FA record" on wallet_2fa;

-- Re-create policies using wallet_address lookup (more reliable than user_id join)
create policy "Users can select their own 2FA record"
  on wallet_2fa for select to authenticated
  using (
    wallet_address = (
      select wallet_address from wallet_users
      where auth_user_id = auth.uid()
      limit 1
    )
  );

create policy "Users can insert their own 2FA record"
  on wallet_2fa for insert to authenticated
  with check (
    wallet_address = (
      select wallet_address from wallet_users
      where auth_user_id = auth.uid()
      limit 1
    )
  );

create policy "Users can update their own 2FA record"
  on wallet_2fa for update to authenticated
  using (
    wallet_address = (
      select wallet_address from wallet_users
      where auth_user_id = auth.uid()
      limit 1
    )
  )
  with check (
    wallet_address = (
      select wallet_address from wallet_users
      where auth_user_id = auth.uid()
      limit 1
    )
  );

create policy "Users can delete their own 2FA record"
  on wallet_2fa for delete to authenticated
  using (
    wallet_address = (
      select wallet_address from wallet_users
      where auth_user_id = auth.uid()
      limit 1
    )
  );
