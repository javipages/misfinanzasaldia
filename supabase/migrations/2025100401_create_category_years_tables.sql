-- Create tables linking categories to specific years

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Expense category years
create table if not exists public.expense_categories_years (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.expense_categories(id) on delete cascade,
  year int not null check (year >= 1900 and year <= 3000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expense_categories_years_unique_per_category_year unique (category_id, year)
);

drop trigger if exists trg_expense_categories_years_updated_at on public.expense_categories_years;
create trigger trg_expense_categories_years_updated_at
before update on public.expense_categories_years
for each row execute function public.set_updated_at();

alter table public.expense_categories_years enable row level security;

drop policy if exists "Expense categories years - select own" on public.expense_categories_years;
create policy "Expense categories years - select own"
on public.expense_categories_years
for select
using (
  exists (
    select 1
    from public.expense_categories c
    where c.id = category_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists "Expense categories years - insert own" on public.expense_categories_years;
create policy "Expense categories years - insert own"
on public.expense_categories_years
for insert
with check (
  exists (
    select 1
    from public.expense_categories c
    where c.id = category_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists "Expense categories years - update own" on public.expense_categories_years;
create policy "Expense categories years - update own"
on public.expense_categories_years
for update
using (
  exists (
    select 1
    from public.expense_categories c
    where c.id = category_id
      and c.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.expense_categories c
    where c.id = category_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists "Expense categories years - delete own" on public.expense_categories_years;
create policy "Expense categories years - delete own"
on public.expense_categories_years
for delete
using (
  exists (
    select 1
    from public.expense_categories c
    where c.id = category_id
      and c.user_id = auth.uid()
  )
);

create index if not exists idx_expense_categories_years_category_year
on public.expense_categories_years(category_id, year);

-- Income category years
create table if not exists public.income_categories_years (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.income_categories(id) on delete cascade,
  year int not null check (year >= 1900 and year <= 3000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint income_categories_years_unique_per_category_year unique (category_id, year)
);

drop trigger if exists trg_income_categories_years_updated_at on public.income_categories_years;
create trigger trg_income_categories_years_updated_at
before update on public.income_categories_years
for each row execute function public.set_updated_at();

alter table public.income_categories_years enable row level security;

drop policy if exists "Income categories years - select own" on public.income_categories_years;
create policy "Income categories years - select own"
on public.income_categories_years
for select
using (
  exists (
    select 1
    from public.income_categories c
    where c.id = category_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists "Income categories years - insert own" on public.income_categories_years;
create policy "Income categories years - insert own"
on public.income_categories_years
for insert
with check (
  exists (
    select 1
    from public.income_categories c
    where c.id = category_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists "Income categories years - update own" on public.income_categories_years;
create policy "Income categories years - update own"
on public.income_categories_years
for update
using (
  exists (
    select 1
    from public.income_categories c
    where c.id = category_id
      and c.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.income_categories c
    where c.id = category_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists "Income categories years - delete own" on public.income_categories_years;
create policy "Income categories years - delete own"
on public.income_categories_years
for delete
using (
  exists (
    select 1
    from public.income_categories c
    where c.id = category_id
      and c.user_id = auth.uid()
  )
);

create index if not exists idx_income_categories_years_category_year
on public.income_categories_years(category_id, year);

-- Asset category years
create table if not exists public.asset_categories_years (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.asset_categories(id) on delete cascade,
  year int not null check (year >= 1900 and year <= 3000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asset_categories_years_unique_per_category_year unique (category_id, year)
);

drop trigger if exists trg_asset_categories_years_updated_at on public.asset_categories_years;
create trigger trg_asset_categories_years_updated_at
before update on public.asset_categories_years
for each row execute function public.set_updated_at();

alter table public.asset_categories_years enable row level security;

drop policy if exists "Asset categories years - select own" on public.asset_categories_years;
create policy "Asset categories years - select own"
on public.asset_categories_years
for select
using (
  exists (
    select 1
    from public.asset_categories c
    where c.id = category_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists "Asset categories years - insert own" on public.asset_categories_years;
create policy "Asset categories years - insert own"
on public.asset_categories_years
for insert
with check (
  exists (
    select 1
    from public.asset_categories c
    where c.id = category_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists "Asset categories years - update own" on public.asset_categories_years;
create policy "Asset categories years - update own"
on public.asset_categories_years
for update
using (
  exists (
    select 1
    from public.asset_categories c
    where c.id = category_id
      and c.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.asset_categories c
    where c.id = category_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists "Asset categories years - delete own" on public.asset_categories_years;
create policy "Asset categories years - delete own"
on public.asset_categories_years
for delete
using (
  exists (
    select 1
    from public.asset_categories c
    where c.id = category_id
      and c.user_id = auth.uid()
  )
);

create index if not exists idx_asset_categories_years_category_year
on public.asset_categories_years(category_id, year);


