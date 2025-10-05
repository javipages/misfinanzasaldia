-- Add optional subcategories for income and expense categories

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Income subcategories -------------------------------------------------------
create table if not exists public.income_subcategories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category_id uuid not null references public.income_categories(id) on delete cascade,
  name text not null,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint income_subcategories_name_unique_per_category unique (category_id, name),
  constraint income_subcategories_order_unique_per_category unique (category_id, display_order)
);

drop trigger if exists trg_income_subcategories_updated_at on public.income_subcategories;
create trigger trg_income_subcategories_updated_at
before update on public.income_subcategories
for each row execute function public.set_updated_at();

drop trigger if exists trg_income_subcategories_set_user on public.income_subcategories;
create trigger trg_income_subcategories_set_user
before insert on public.income_subcategories
for each row execute function public.set_user_id();

alter table public.income_subcategories enable row level security;

drop policy if exists "Income subcategories - select own" on public.income_subcategories;
create policy "Income subcategories - select own"
on public.income_subcategories
for select
using (user_id = auth.uid());

drop policy if exists "Income subcategories - insert own" on public.income_subcategories;
create policy "Income subcategories - insert own"
on public.income_subcategories
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.income_categories c
    where c.id = category_id and c.user_id = auth.uid()
  )
);

drop policy if exists "Income subcategories - update own" on public.income_subcategories;
create policy "Income subcategories - update own"
on public.income_subcategories
for update
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.income_categories c
    where c.id = category_id and c.user_id = auth.uid()
  )
);

drop policy if exists "Income subcategories - delete own" on public.income_subcategories;
create policy "Income subcategories - delete own"
on public.income_subcategories
for delete
using (user_id = auth.uid());

create index if not exists idx_income_subcategories_category_order
on public.income_subcategories(category_id, display_order);

create table if not exists public.income_subcategories_years (
  id uuid primary key default gen_random_uuid(),
  subcategory_id uuid not null references public.income_subcategories(id) on delete cascade,
  year int not null check (year >= 1900 and year <= 3000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint income_subcategories_years_unique_per_subcategory_year unique (subcategory_id, year)
);

drop trigger if exists trg_income_subcategories_years_updated_at on public.income_subcategories_years;
create trigger trg_income_subcategories_years_updated_at
before update on public.income_subcategories_years
for each row execute function public.set_updated_at();

alter table public.income_subcategories_years enable row level security;

drop policy if exists "Income subcategories years - select own" on public.income_subcategories_years;
create policy "Income subcategories years - select own"
on public.income_subcategories_years
for select
using (
  exists (
    select 1
    from public.income_subcategories s
    where s.id = subcategory_id and s.user_id = auth.uid()
  )
);

drop policy if exists "Income subcategories years - insert own" on public.income_subcategories_years;
create policy "Income subcategories years - insert own"
on public.income_subcategories_years
for insert
with check (
  exists (
    select 1
    from public.income_subcategories s
    where s.id = subcategory_id and s.user_id = auth.uid()
  )
);

drop policy if exists "Income subcategories years - update own" on public.income_subcategories_years;
create policy "Income subcategories years - update own"
on public.income_subcategories_years
for update
using (
  exists (
    select 1
    from public.income_subcategories s
    where s.id = subcategory_id and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.income_subcategories s
    where s.id = subcategory_id and s.user_id = auth.uid()
  )
);

drop policy if exists "Income subcategories years - delete own" on public.income_subcategories_years;
create policy "Income subcategories years - delete own"
on public.income_subcategories_years
for delete
using (
  exists (
    select 1
    from public.income_subcategories s
    where s.id = subcategory_id and s.user_id = auth.uid()
  )
);

create index if not exists idx_income_subcategories_years_subcategory_year
on public.income_subcategories_years(subcategory_id, year);

-- Expense subcategories ------------------------------------------------------
create table if not exists public.expense_subcategories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category_id uuid not null references public.expense_categories(id) on delete cascade,
  name text not null,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expense_subcategories_name_unique_per_category unique (category_id, name),
  constraint expense_subcategories_order_unique_per_category unique (category_id, display_order)
);

drop trigger if exists trg_expense_subcategories_updated_at on public.expense_subcategories;
create trigger trg_expense_subcategories_updated_at
before update on public.expense_subcategories
for each row execute function public.set_updated_at();

drop trigger if exists trg_expense_subcategories_set_user on public.expense_subcategories;
create trigger trg_expense_subcategories_set_user
before insert on public.expense_subcategories
for each row execute function public.set_user_id();

alter table public.expense_subcategories enable row level security;

drop policy if exists "Expense subcategories - select own" on public.expense_subcategories;
create policy "Expense subcategories - select own"
on public.expense_subcategories
for select
using (user_id = auth.uid());

drop policy if exists "Expense subcategories - insert own" on public.expense_subcategories;
create policy "Expense subcategories - insert own"
on public.expense_subcategories
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.expense_categories c
    where c.id = category_id and c.user_id = auth.uid()
  )
);

drop policy if exists "Expense subcategories - update own" on public.expense_subcategories;
create policy "Expense subcategories - update own"
on public.expense_subcategories
for update
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.expense_categories c
    where c.id = category_id and c.user_id = auth.uid()
  )
);

drop policy if exists "Expense subcategories - delete own" on public.expense_subcategories;
create policy "Expense subcategories - delete own"
on public.expense_subcategories
for delete
using (user_id = auth.uid());

create index if not exists idx_expense_subcategories_category_order
on public.expense_subcategories(category_id, display_order);

create table if not exists public.expense_subcategories_years (
  id uuid primary key default gen_random_uuid(),
  subcategory_id uuid not null references public.expense_subcategories(id) on delete cascade,
  year int not null check (year >= 1900 and year <= 3000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expense_subcategories_years_unique_per_subcategory_year unique (subcategory_id, year)
);

drop trigger if exists trg_expense_subcategories_years_updated_at on public.expense_subcategories_years;
create trigger trg_expense_subcategories_years_updated_at
before update on public.expense_subcategories_years
for each row execute function public.set_updated_at();

alter table public.expense_subcategories_years enable row level security;

drop policy if exists "Expense subcategories years - select own" on public.expense_subcategories_years;
create policy "Expense subcategories years - select own"
on public.expense_subcategories_years
for select
using (
  exists (
    select 1
    from public.expense_subcategories s
    where s.id = subcategory_id and s.user_id = auth.uid()
  )
);

drop policy if exists "Expense subcategories years - insert own" on public.expense_subcategories_years;
create policy "Expense subcategories years - insert own"
on public.expense_subcategories_years
for insert
with check (
  exists (
    select 1
    from public.expense_subcategories s
    where s.id = subcategory_id and s.user_id = auth.uid()
  )
);

drop policy if exists "Expense subcategories years - update own" on public.expense_subcategories_years;
create policy "Expense subcategories years - update own"
on public.expense_subcategories_years
for update
using (
  exists (
    select 1
    from public.expense_subcategories s
    where s.id = subcategory_id and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.expense_subcategories s
    where s.id = subcategory_id and s.user_id = auth.uid()
  )
);

drop policy if exists "Expense subcategories years - delete own" on public.expense_subcategories_years;
create policy "Expense subcategories years - delete own"
on public.expense_subcategories_years
for delete
using (
  exists (
    select 1
    from public.expense_subcategories s
    where s.id = subcategory_id and s.user_id = auth.uid()
  )
);

create index if not exists idx_expense_subcategories_years_subcategory_year
on public.expense_subcategories_years(subcategory_id, year);

-- Entries --------------------------------------------------------------------
alter table public.income_entries
add column if not exists subcategory_id uuid references public.income_subcategories(id) on delete set null;

alter table public.expense_entries
add column if not exists subcategory_id uuid references public.expense_subcategories(id) on delete set null;

create index if not exists idx_income_entries_subcategory
on public.income_entries(subcategory_id);

create index if not exists idx_expense_entries_subcategory
on public.expense_entries(subcategory_id);
