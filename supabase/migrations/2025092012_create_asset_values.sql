-- Monthly values for asset categories (one value per user/category/year/month)

create table if not exists public.asset_values (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category_id uuid not null references public.asset_categories(id) on delete cascade,
  year int not null,
  month int not null check (month between 1 and 12),
  amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asset_values_unique_per_user_cat_month unique (user_id, category_id, year, month)
);

-- updated_at trigger (reuse existing function)
drop trigger if exists trg_asset_values_updated_at on public.asset_values;
create trigger trg_asset_values_updated_at
before update on public.asset_values
for each row execute function public.set_updated_at();

-- RLS
alter table public.asset_values enable row level security;

drop policy if exists "Asset values - select own" on public.asset_values;
create policy "Asset values - select own"
on public.asset_values for select using (user_id = auth.uid());

drop policy if exists "Asset values - insert own" on public.asset_values;
create policy "Asset values - insert own"
on public.asset_values for insert with check (user_id = auth.uid());

drop policy if exists "Asset values - update own" on public.asset_values;
create policy "Asset values - update own"
on public.asset_values for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Asset values - delete own" on public.asset_values;
create policy "Asset values - delete own"
on public.asset_values for delete using (user_id = auth.uid());

create index if not exists idx_asset_values_user_year_month
on public.asset_values(user_id, year, month);


