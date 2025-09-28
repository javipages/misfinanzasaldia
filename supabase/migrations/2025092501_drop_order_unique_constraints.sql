-- Drop unique constraints on display_order that prevent proper reordering
-- These constraints cause issues when updating multiple categories simultaneously

-- Drop constraint from income_categories
alter table public.income_categories
drop constraint if exists income_categories_order_unique_per_user;

-- Drop constraint from expense_categories
alter table public.expense_categories
drop constraint if exists expense_categories_order_unique_per_user;

alter table public.asset_categories
drop constraint if exists asset_categories_order_unique_per_user;
