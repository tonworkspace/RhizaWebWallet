-- Cloud Backup table — applied via Supabase MCP
-- user_id = wallet_users.id (app UUID, NOT Supabase auth UUID)
-- RLS joins through wallet_users.auth_user_id to resolve auth.uid()

create table if not exists wallet_cloud_backups (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references wallet_users(id) on delete cascade,
  wallet_address     text not null,
  wallet_name        text not null default 'My Wallet',
  encrypted_mnemonic text not null,   -- AES-256-GCM ciphertext, base64
  wallet_type        text not null default 'ton-24' check (wallet_type in ('ton-24', 'multi-12')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (user_id, wallet_address)
);

alter table wallet_cloud_backups enable row level security;

create index if not exists idx_cloud_backups_user_id on wallet_cloud_backups(user_id);

create policy "Users can select their own cloud backups"
  on wallet_cloud_backups for select to authenticated
  using (
    user_id = (select id from wallet_users where auth_user_id = (select auth.uid()) limit 1)
  );

create policy "Users can insert their own cloud backups"
  on wallet_cloud_backups for insert to authenticated
  with check (
    user_id = (select id from wallet_users where auth_user_id = (select auth.uid()) limit 1)
  );

create policy "Users can update their own cloud backups"
  on wallet_cloud_backups for update to authenticated
  using (
    user_id = (select id from wallet_users where auth_user_id = (select auth.uid()) limit 1)
  )
  with check (
    user_id = (select id from wallet_users where auth_user_id = (select auth.uid()) limit 1)
  );

create policy "Users can delete their own cloud backups"
  on wallet_cloud_backups for delete to authenticated
  using (
    user_id = (select id from wallet_users where auth_user_id = (select auth.uid()) limit 1)
  );
