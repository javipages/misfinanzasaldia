-- Ensure auth.uid() default and trigger to avoid RLS insert violations

-- Set default to current auth user
alter table if exists public.income_categories
  alter column user_id set default auth.uid();

alter table if exists public.expense_categories
  alter column user_id set default auth.uid();

-- Helper trigger to set user_id on insert if not provided
create or replace function public.set_user_id()
returns trigger as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_income_categories_set_user on public.income_categories;
create trigger trg_income_categories_set_user
before insert on public.income_categories
for each row execute function public.set_user_id();

drop trigger if exists trg_expense_categories_set_user on public.expense_categories;
create trigger trg_expense_categories_set_user
before insert on public.expense_categories
for each row execute function public.set_user_id();


