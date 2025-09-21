-- Detailed entries per category/month to support multiple items and descriptions

create table if not exists public.income_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category_id uuid not null references public.income_categories(id) on delete cascade,
  year int not null,
  month int not null check (month between 1 and 12),
  amount numeric(14,2) not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.expense_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category_id uuid not null references public.expense_categories(id) on delete cascade,
  year int not null,
  month int not null check (month between 1 and 12),
  amount numeric(14,2) not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_income_entries_updated_at on public.income_entries;
create trigger trg_income_entries_updated_at
before update on public.income_entries
for each row execute function public.set_updated_at();

drop trigger if exists trg_expense_entries_updated_at on public.expense_entries;
create trigger trg_expense_entries_updated_at
before update on public.expense_entries
for each row execute function public.set_updated_at();

-- RLS
alter table public.income_entries enable row level security;
alter table public.expense_entries enable row level security;

drop policy if exists "Income entries - select own" on public.income_entries;
create policy "Income entries - select own" on public.income_entries for select using (user_id = auth.uid());
drop policy if exists "Income entries - insert own" on public.income_entries;
create policy "Income entries - insert own" on public.income_entries for insert with check (user_id = auth.uid());
drop policy if exists "Income entries - update own" on public.income_entries;
create policy "Income entries - update own" on public.income_entries for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Income entries - delete own" on public.income_entries;
create policy "Income entries - delete own" on public.income_entries for delete using (user_id = auth.uid());

drop policy if exists "Expense entries - select own" on public.expense_entries;
create policy "Expense entries - select own" on public.expense_entries for select using (user_id = auth.uid());
drop policy if exists "Expense entries - insert own" on public.expense_entries;
create policy "Expense entries - insert own" on public.expense_entries for insert with check (user_id = auth.uid());
drop policy if exists "Expense entries - update own" on public.expense_entries;
create policy "Expense entries - update own" on public.expense_entries for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Expense entries - delete own" on public.expense_entries;
create policy "Expense entries - delete own" on public.expense_entries for delete using (user_id = auth.uid());

create index if not exists idx_income_entries_user_year_month on public.income_entries(user_id, year, month);
create index if not exists idx_expense_entries_user_year_month on public.expense_entries(user_id, year, month);

