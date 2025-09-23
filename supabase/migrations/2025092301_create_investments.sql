-- Create table: investments
-- This table will track individual investments linked to investment accounts
create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  -- tipo de inversión: etf | acciones | crypto | fondos | bonos | otros
  type text not null check (type in ('etf','acciones','crypto','fondos','bonos','otros')),
  -- Reference to investment account (asset_categories with type = 'inversion')
  account_id uuid not null references public.asset_categories(id) on delete cascade,
  purchase_date date not null,
  description text,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint investments_name_account_unique_per_user unique (user_id, name, account_id),
  constraint investments_order_unique_per_user unique (user_id, display_order),
  constraint investments_account_user_check check (
    (select user_id from public.asset_categories where id = account_id) = user_id
  )
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

drop trigger if exists trg_investments_updated_at on public.investments;
create trigger trg_investments_updated_at
before update on public.investments
for each row execute function public.set_updated_at();

-- RLS: enable and policies
alter table public.investments enable row level security;

-- Select own rows
drop policy if exists "Investments - select own" on public.investments;
create policy "Investments - select own"
on public.investments
for select
using (user_id = auth.uid());

-- Insert own rows
drop policy if exists "Investments - insert own" on public.investments;
create policy "Investments - insert own"
on public.investments
for insert
with check (user_id = auth.uid());

-- Update own rows
drop policy if exists "Investments - update own" on public.investments;
create policy "Investments - update own"
on public.investments
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Delete own rows
drop policy if exists "Investments - delete own" on public.investments;
create policy "Investments - delete own"
on public.investments
for delete
using (user_id = auth.uid());

-- Create investment_values table to track contributions to investments
create table if not exists public.investment_values (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  investment_id uuid not null references public.investments(id) on delete cascade,
  amount numeric(14,2) not null default 0,
  contribution_date date not null default current_date,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
);

-- Updated_at trigger for investment_values
drop trigger if exists trg_investment_values_updated_at on public.investment_values;
create trigger trg_investment_values_updated_at
before update on public.investment_values
for each row execute function public.set_updated_at();

-- RLS policies for investment_values
alter table public.investment_values enable row level security;

-- Select own rows
drop policy if exists "Investment values - select own" on public.investment_values;
create policy "Investment values - select own"
on public.investment_values
for select
using (user_id = auth.uid());

-- Insert own rows
drop policy if exists "Investment values - insert own" on public.investment_values;
create policy "Investment values - insert own"
on public.investment_values
for insert
with check (user_id = auth.uid());

-- Update own rows
drop policy if exists "Investment values - update own" on public.investment_values;
create policy "Investment values - update own"
on public.investment_values
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Delete own rows
drop policy if exists "Investment values - delete own" on public.investment_values;
create policy "Investment values - delete own"
on public.investment_values
for delete
using (user_id = auth.uid());
