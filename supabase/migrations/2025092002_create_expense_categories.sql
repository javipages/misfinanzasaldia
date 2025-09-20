-- Create table: expense_categories
create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expense_categories_name_unique_per_user unique (user_id, name),
  constraint expense_categories_order_unique_per_user unique (user_id, display_order)
);

-- Ensure pgcrypto for gen_random_uuid
create extension if not exists pgcrypto;

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_expense_categories_updated_at on public.expense_categories;
create trigger trg_expense_categories_updated_at
before update on public.expense_categories
for each row execute function public.set_updated_at();

-- RLS: enable and policies
alter table public.expense_categories enable row level security;

-- Select own rows
drop policy if exists "Expense categories - select own" on public.expense_categories;
create policy "Expense categories - select own"
on public.expense_categories
for select
using (user_id = auth.uid());

-- Insert own rows
drop policy if exists "Expense categories - insert own" on public.expense_categories;
create policy "Expense categories - insert own"
on public.expense_categories
for insert
with check (user_id = auth.uid());

-- Update own rows
drop policy if exists "Expense categories - update own" on public.expense_categories;
create policy "Expense categories - update own"
on public.expense_categories
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Delete own rows
drop policy if exists "Expense categories - delete own" on public.expense_categories;
create policy "Expense categories - delete own"
on public.expense_categories
for delete
using (user_id = auth.uid());

-- Helpful index
create index if not exists idx_expense_categories_user_order
on public.expense_categories(user_id, display_order);


