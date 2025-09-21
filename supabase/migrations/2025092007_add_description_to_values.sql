-- Add optional description to income and expense values
alter table if exists public.income_values
  add column if not exists description text;

alter table if exists public.expense_values
  add column if not exists description text;


