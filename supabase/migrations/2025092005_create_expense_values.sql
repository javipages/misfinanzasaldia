-- Monthly values for expense categories
create table if not exists public.expense_values (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category_id uuid not null references public.expense_categories(id) on delete cascade,
  year int not null,
  month int not null check (month between 1 and 12),
  amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expense_values_unique_per_user_cat_month unique (user_id, category_id, year, month)
);

-- updated_at trigger reuse
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_expense_values_updated_at on public.expense_values;
create trigger trg_expense_values_updated_at
before update on public.expense_values
for each row execute function public.set_updated_at();

-- RLS
alter table public.expense_values enable row level security;

drop policy if exists "Expense values - select own" on public.expense_values;
create policy "Expense values - select own"
on public.expense_values for select using (user_id = auth.uid());

drop policy if exists "Expense values - insert own" on public.expense_values;
create policy "Expense values - insert own"
on public.expense_values for insert with check (user_id = auth.uid());

drop policy if exists "Expense values - update own" on public.expense_values;
create policy "Expense values - update own"
on public.expense_values for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Expense values - delete own" on public.expense_values;
create policy "Expense values - delete own"
on public.expense_values for delete using (user_id = auth.uid());

create index if not exists idx_expense_values_user_year_month
on public.expense_values(user_id, year, month);

