-- Drop unique constraints on display_order within category for subcategories
-- Rationale: allow optimistic reordering without temporary unique conflicts

alter table if exists public.income_subcategories
  drop constraint if exists income_subcategories_order_unique_per_category;

alter table if exists public.expense_subcategories
  drop constraint if exists expense_subcategories_order_unique_per_category;


