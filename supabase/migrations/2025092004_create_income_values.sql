-- Monthly values for income categories
create table if not exists public.income_values (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category_id uuid not null references public.income_categories(id) on delete cascade,
  year int not null,
  month int not null check (month between 1 and 12),
  amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint income_values_unique_per_user_cat_month unique (user_id, category_id, year, month)
);

-- updated_at trigger reuse
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_income_values_updated_at on public.income_values;
create trigger trg_income_values_updated_at
before update on public.income_values
for each row execute function public.set_updated_at();

-- RLS
alter table public.income_values enable row level security;

drop policy if exists "Income values - select own" on public.income_values;
create policy "Income values - select own"
on public.income_values for select using (user_id = auth.uid());

drop policy if exists "Income values - insert own" on public.income_values;
create policy "Income values - insert own"
on public.income_values for insert with check (user_id = auth.uid());

drop policy if exists "Income values - update own" on public.income_values;
create policy "Income values - update own"
on public.income_values for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Income values - delete own" on public.income_values;
create policy "Income values - delete own"
on public.income_values for delete using (user_id = auth.uid());

create index if not exists idx_income_values_user_year_month
on public.income_values(user_id, year, month);

