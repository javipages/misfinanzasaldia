-- Create table: asset_categories
create table if not exists public.asset_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  -- tipo del activo: cuenta_bancaria | inversion | efectivo | cripto | otro
  type text not null check (type in ('cuenta_bancaria','inversion','efectivo','cripto','otro')),
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asset_categories_name_unique_per_user unique (user_id, name),
  constraint asset_categories_order_unique_per_user unique (user_id, display_order)
);

-- Ensure pgcrypto for gen_random_uuid
create extension if not exists pgcrypto;

-- Updated_at trigger (reuses set_updated_at if exists)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_asset_categories_updated_at on public.asset_categories;
create trigger trg_asset_categories_updated_at
before update on public.asset_categories
for each row execute function public.set_updated_at();

-- RLS: enable and policies
alter table public.asset_categories enable row level security;

-- Select own rows
drop policy if exists "Asset categories - select own" on public.asset_categories;
create policy "Asset categories - select own"
on public.asset_categories
for select
using (user_id = auth.uid());

-- Insert own rows
drop policy if exists "Asset categories - insert own" on public.asset_categories;
create policy "Asset categories - insert own"
on public.asset_categories
for insert
with check (user_id = auth.uid());

-- Update own rows
drop policy if exists "Asset categories - update own" on public.asset_categories;
create policy "Asset categories - update own"
on public.asset_categories
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Delete own rows
drop policy if exists "Asset categories - delete own" on public.asset_categories;
create policy "Asset categories - delete own"
on public.asset_categories
for delete
using (user_id = auth.uid());


