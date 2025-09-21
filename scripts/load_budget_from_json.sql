-- Ingest budget data (incomes/expenses) from a JSON payload for a target user.
-- Usage:
--  - Replace {{USER_EMAIL}} with the target user's email in auth.users
--  - Replace {{JSON_PAYLOAD}} with your JSON (see data/2025_budget.example.json)
--  - Run this whole script once. It will create missing categories and insert entries.
--  - Safe to re-run: it will skip rows that already exist (same year/month/category/amount/description).

with
payload as (
  select '{
  "year": 2025,
  "incomes": [
    { "category": "Trabajo", "monthly": { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0, "8": 4456.13, "9": 2756.13 } },
    { "category": "Beca", "monthly": { "1": 0, "2": 2575.00, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0, "8": 0, "9": 0 } },
    { "category": "Paga", "monthly": { "1": 0, "2": 0, "3": 200.00, "4": 0, "5": 0, "6": 100.00, "7": 0, "8": 0, "9": 0 } },
    { "category": "Intereses", "monthly": { "1": 15.87, "2": 14.43, "3": 12.56, "4": 10.22, "5": 12.03, "6": 10.44, "7": 7.58, "8": 3.35, "9": 7.11 } },
    { "category": "Otros", "monthly": { "1": 326.00, "2": 0, "3": 60.00, "4": 67.00, "5": 0, "6": 18.00, "7": 409.00, "8": 0, "9": 0 } }
  ],
  "expenses": [
    { "category": "Vivienda", "monthly": { "1": 290.35, "2": 237.25, "3": 228.25, "4": 228.25, "5": 333.42, "6": 228.25, "7": 0, "8": 0, "9": 0 } },
    { "category": "Gimnasio", "monthly": { "1": 75.00, "2": 25.00, "3": 36.95, "4": 78.90, "5": 97.30, "6": 88.13, "7": 25.00, "8": 0, "9": 123.15 } },
    { "category": "Ropa", "monthly": { "1": 9.99, "2": 0, "3": 0, "4": 0, "5": 74.32, "6": 54.87, "7": 0, "8": 0, "9": 0 } },
    { "category": "Ocio", "monthly": { "1": 12.78, "2": 16.00, "3": 29.00, "4": 0, "5": 0, "6": 0, "7": 20.00, "8": 0, "9": 18.00 } },
    { "category": "Suscripciones", "monthly": { "1": 21.14, "2": 20.98, "3": 20.90, "4": 18.95, "5": 20.29, "6": 22.98, "7": 22.98, "8": 22.98, "9": 22.98 } },
    { "category": "Transporte", "monthly": { "1": 0.00, "2": 2.40, "3": 0.00, "4": 58.63, "5": 55.18, "6": 40.00, "7": 136.10, "8": 10.00, "9": 0.00 } },
    { "category": "Comida", "monthly": { "1": 169.08, "2": 217.79, "3": 157.78, "4": 160.31, "5": 160.14, "6": 66.85, "7": 59.82, "8": 42.15, "9": 29.53 } },
    { "category": "Educacion", "monthly": { "1": 0.00, "2": 0.00, "3": 0.00, "4": 0.00, "5": 0.00, "6": 0.00, "7": 0.00, "8": 0.00, "9": 347.28 } },
    { "category": "Comida fuera", "monthly": { "1": 28.00, "2": 13.82, "3": 46.20, "4": 57.80, "5": 27.45, "6": 37.18, "7": 31.30, "8": 46.20, "9": 75.20 } },
    { "category": "Cafe", "map_to": "Comida fuera", "description": "café", "monthly": { } },
    { "category": "Viaje", "monthly": { "1": 148.35, "2": 0.00, "3": 181.30, "4": 0.00, "5": 0.00, "6": 0.00, "7": 0.00, "8": 0.00, "9": 0.00 } },
    { "category": "Higiéne, Salud", "monthly": { "1": 12.00, "2": 12.00, "3": 12.00, "4": 12.00, "5": 12.00, "6": 12.00, "7": 12.00, "8": 0.00, "9": 99.25 } },
    { "category": "Extraordinarios", "monthly": { "1": 12.90, "2": 20.00, "3": 24.95, "4": 563.97, "5": 66.60, "6": 29.00, "7": 229.00, "8": 99.75, "9": 99.75 } }
  ]
}'


::jsonb as j
),
target_user as (
  select id as user_id from auth.users where email = 'javi@gmail.com'
),
insert_income as (
  insert into public.income_entries (id, user_id, category_id, year, month, amount, description)
  select
    gen_random_uuid(),
    tu.user_id,
    ic.id,
    (p.j->>'year')::int,
    m.k::int,
    m.v::numeric,
    nullif(trim(coalesce(val->>'description','')),'') as description
  from payload p
  join target_user tu on true
  cross join lateral jsonb_array_elements(p.j->'incomes') as val
  join public.income_categories ic
    on ic.user_id = tu.user_id
   and upper(ic.name) = trim(upper(coalesce(val->>'map_to', val->>'category')))
  cross join lateral jsonb_each_text(coalesce(val->'monthly','{}'::jsonb)) as m(k,v)
  where coalesce(m.v::numeric,0) <> 0
    and not exists (
      select 1 from public.income_entries e
      where e.user_id = tu.user_id
        and e.category_id = ic.id
        and e.year = (p.j->>'year')::int
        and e.month = m.k::int
        and e.amount = m.v::numeric
        and coalesce(e.description,'') = coalesce(nullif(trim(coalesce(val->>'description','')),''), '')
    )
  returning 1
),
insert_expense as (
  insert into public.expense_entries (id, user_id, category_id, year, month, amount, description)
  select
    gen_random_uuid(),
    tu.user_id,
    ec.id,
    (p.j->>'year')::int,
    m.k::int,
    m.v::numeric,
    nullif(trim(coalesce(val->>'description','')),'') as description
  from payload p
  join target_user tu on true
  cross join lateral jsonb_array_elements(p.j->'expenses') as val
  join public.expense_categories ec
    on ec.user_id = tu.user_id
   and upper(ec.name) = trim(upper(coalesce(val->>'map_to', val->>'category')))
  cross join lateral jsonb_each_text(coalesce(val->'monthly','{}'::jsonb)) as m(k,v)
  where coalesce(m.v::numeric,0) <> 0
    and not exists (
      select 1 from public.expense_entries e
      where e.user_id = tu.user_id
        and e.category_id = ec.id
        and e.year = (p.j->>'year')::int
        and e.month = m.k::int
        and e.amount = m.v::numeric
        and coalesce(e.description,'') = coalesce(nullif(trim(coalesce(val->>'description','')),''), '')
    )
  returning 1
)
select
  coalesce((select count(*) from insert_income),0) as income_inserted,
  coalesce((select count(*) from insert_expense),0) as expense_inserted,
  (select (j->>'year')::int from payload) as year_loaded;