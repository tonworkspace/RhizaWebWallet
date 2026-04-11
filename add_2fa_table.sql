-- 2FA (TOTP) table — applied via Supabase MCP
-- user_id = wallet_users.id (app UUID, NOT Supabase auth UUID)
-- RLS joins through wallet_users.auth_user_id to resolve auth.uid()

create table if not exists wallet_2fa (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references wallet_users(id) on delete cascade,
  wallet_address   text not null unique,
  encrypted_secret text not null,   -- AES-256-GCM encrypted TOTP secret
  is_enabled       boolean not null default false,
  backup_codes     text[],          -- SHA-256 hashed backup codes
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table wallet_2fa enable row level security;

create index if not exists idx_wallet_2fa_user_id on wallet_2fa(user_id);
create index if not exists idx_wallet_2fa_address on wallet_2fa(wallet_address);

create policy "Users can select their own 2FA record"
  on wallet_2fa for select to authenticated
  using (
    user_id = (select id from wallet_users where auth_user_id = (select auth.uid()) limit 1)
  );

create policy "Users can insert their own 2FA record"
  on wallet_2fa for insert to authenticated
  with check (
    user_id = (select id from wallet_users where auth_user_id = (select auth.uid()) limit 1)
  );

create policy "Users can update their own 2FA record"
  on wallet_2fa for update to authenticated
  using (
    user_id = (select id from wallet_users where auth_user_id = (select auth.uid()) limit 1)
  )
  with check (
    user_id = (select id from wallet_users where auth_user_id = (select auth.uid()) limit 1)
  );

create policy "Users can delete their own 2FA record"
  on wallet_2fa for delete to authenticated
  using (
    user_id = (select id from wallet_users where auth_user_id = (select auth.uid()) limit 1)
  );
