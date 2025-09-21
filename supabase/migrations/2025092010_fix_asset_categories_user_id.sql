-- Align asset_categories with user_id default and trigger to satisfy RLS

-- Set default to current auth user
alter table if exists public.asset_categories
  alter column user_id set default auth.uid();

-- Helper trigger to set user_id on insert if not provided (reuses set_user_id if exists)
create or replace function public.set_user_id()
returns trigger as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_asset_categories_set_user on public.asset_categories;
create trigger trg_asset_categories_set_user
before insert on public.asset_categories
for each row execute function public.set_user_id();


