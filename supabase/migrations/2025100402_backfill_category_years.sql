-- Backfill category-year associations from historical data and ensure 2025 availability

-- Expense categories: years from recorded entries
insert into public.expense_categories_years (category_id, year)
select distinct e.category_id, e.year
from public.expense_entries e
where e.year between 1900 and 3000
on conflict do nothing;

-- Expense categories: guarantee year 2025 exists for every category
insert into public.expense_categories_years (category_id, year)
select c.id as category_id, 2025 as year
from public.expense_categories c
on conflict do nothing;

-- Income categories: years from recorded entries
insert into public.income_categories_years (category_id, year)
select distinct e.category_id, e.year
from public.income_entries e
where e.year between 1900 and 3000
on conflict do nothing;

-- Income categories: guarantee year 2025 exists for every category
insert into public.income_categories_years (category_id, year)
select c.id as category_id, 2025 as year
from public.income_categories c
on conflict do nothing;

-- Asset categories: years from recorded values
insert into public.asset_categories_years (category_id, year)
select distinct v.category_id, v.year
from public.asset_values v
where v.year between 1900 and 3000
on conflict do nothing;

-- Asset categories: guarantee year 2025 exists for every category
insert into public.asset_categories_years (category_id, year)
select c.id as category_id, 2025 as year
from public.asset_categories c
on conflict do nothing;


