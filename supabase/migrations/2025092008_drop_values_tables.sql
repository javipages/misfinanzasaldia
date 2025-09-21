-- Drop aggregated monthly value tables in favor of per-entry tables
drop table if exists public.income_values cascade;
drop table if exists public.expense_values cascade;


