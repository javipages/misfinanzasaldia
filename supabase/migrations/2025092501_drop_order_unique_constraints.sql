-- Drop unique constraints on display_order that prevent proper reordering
-- These constraints cause issues when updating multiple categories simultaneously

-- Drop constraint from income_categories
alter table public.income_categories
drop constraint if exists income_categories_order_unique_per_user;

-- Drop constraint from expense_categories
alter table public.expense_categories
drop constraint if exists expense_categories_order_unique_per_user;

-- Note: The indexes on (user_id, display_order) are still useful for performance
-- and will be kept as they don't prevent the reordering operations
