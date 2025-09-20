-- User preferences to sync selected year per user
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  selected_year int not null default extract(year from now())::int,
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

drop trigger if exists trg_user_preferences_updated_at on public.user_preferences;
create trigger trg_user_preferences_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

-- RLS
alter table public.user_preferences enable row level security;

drop policy if exists "User preferences - select own" on public.user_preferences;
create policy "User preferences - select own"
on public.user_preferences for select using (user_id = auth.uid());

drop policy if exists "User preferences - insert own" on public.user_preferences;
create policy "User preferences - insert own"
on public.user_preferences for insert with check (user_id = auth.uid());

drop policy if exists "User preferences - update own" on public.user_preferences;
create policy "User preferences - update own"
on public.user_preferences for update using (user_id = auth.uid()) with check (user_id = auth.uid());


