-- Ingest budget data (incomes/expenses) from a JSON payload for a target user.
-- Usage:
--  - Replace {{USER_EMAIL}} with the target user's email in auth.users
--  - Replace {{JSON_PAYLOAD}} with your JSON (see data/2025_budget.example.json)
--  - Run this whole script once. It will create missing categories and insert entries.
--  - Safe to re-run: it will skip rows that already exist (same year/month/category/amount/description).

with
payload as (
  select '{
  "year": 2024,
  "incomes": [
    { "category": "Trabajo", "monthly": { "1": 0.00, "2": 0.00, "3": 0.00, "4": 0.00, "5": 0.00, "6": 0.00, "7": 708.49, "8": 979.00, "9": 489.49, "10": 250.00, "11": 250.00, "12": 250.00 } },
    { "category": "Beca", "monthly": { "1": 0.00, "2": 0.00, "3": 883.59, "4": 0.00, "5": 0.00, "6": 0.00, "7": 0.00, "8": 0.00, "9": 0.00, "10": 0.00, "11": 0.00, "12": 0.00 } },
    { "category": "Paga", "monthly": { "1": 500.00, "2": 400.00, "3": 500.00, "4": 400.00, "5": 800.00, "6": 800.00, "7": 800.00, "8": 400.00, "9": 300.00, "10": 0.00, "11": 0.00, "12": 0.00 } },
    { "category": "Intereses", "monthly": { "1": 6.95, "2": 6.49, "3": 8.55, "4": 27.31, "5": 6.05, "6": 7.31, "7": 8.87, "8": 15.00, "9": 21.94, "10": 20.32, "11": 18.19, "12": 13.17 } },
    { "category": "Otros", "monthly": { "1": 0.00, "2": 61.00, "3": 41.00, "4": 24.00, "5": 11.05, "6": 52.95, "7": 25.00, "8": 10.00, "9": 0.00, "10": 35.25, "11": 40.00, "12": 895.00 } }
  ],
  "expenses": [
    { "category": "Vivienda", "monthly": { "1": 218.50, "2": 226.00, "3": 218.50, "4": 362.52, "5": 367.66, "6": 184.50, "7": 152.00, "8": 333.76, "9": 238.75, "10": 238.75, "11": 290.15, "12": 238.75 } },
    { "category": "Gimnasio", "monthly": { "1": 114.11, "2": 45.94, "3": 38.79, "4": 6.07, "5": 58.09, "6": 57.49, "7": 42.49, "8": 96.37, "9": 33.90, "10": 39.79, "11": 19.26, "12": 25.00 } },
    { "category": "Ropa", "monthly": { "1": 0.00, "2": 0.00, "3": 0.00, "4": 0.00, "5": 17.80, "6": 12.98, "7": 30.00, "8": 0.00, "9": 0.00, "10": 0.00, "11": 0.00, "12": 0.00 } },
    { "category": "Ocio", "monthly": { "1": 0.00, "2": 12.00, "3": 0.00, "4": 0.00, "5": 0.00, "6": 0.00, "7": 10.50, "8": 5.00, "9": 1.91, "10": 10.45, "11": 11.99, "12": 0.00 } },
    { "category": "Suscripciones", "monthly": { "1": 20.99, "2": 20.99, "3": 20.99, "4": 20.99, "5": 20.99, "6": 20.99, "7": 20.99, "8": 20.99, "9": 20.99, "10": 20.99, "11": 20.99, "12": 0.00 } },
    { "category": "Transporte", "monthly": { "1": 64.25, "2": 56.48, "3": 0.00, "4": 1.15, "5": 74.68, "6": 44.85, "7": 71.74, "8": 132.64, "9": 84.86, "10": 77.56, "11": 70.26, "12": 57.76 } },
    { "category": "Comida", "monthly": { "1": 209.79, "2": 238.05, "3": 174.71, "4": 195.74, "5": 228.16, "6": 84.85, "7": 150.77, "8": 89.39, "9": 216.26, "10": 217.07, "11": 146.41, "12": 228.69 } },
    { "category": "Educacion", "monthly": { "1": 12.07, "2": 53.50, "3": 0.00, "4": 2.36, "5": 0.00, "6": 0.00, "7": 0.00, "8": 0.00, "9": 0.00, "10": 24.70, "11": 0.00, "12": 0.00 } },
    { "category": "Comida fuera", "monthly": { "1": 57.57, "2": 34.90, "3": 58.07, "4": 20.00, "5": 27.00, "6": 26.75, "7": 39.81, "8": 90.71, "9": 152.40, "10": 0.00, "11": 34.75, "12": 35.65 } },
    { "category": "Cafe", "map_to": "Comida fuera", "description": "café", "monthly": { "1": 12.60, "2": 2.00, "3": 3.05, "4": 0.00, "5": 2.30, "6": 10.15, "7": 0.00, "8": 0.00, "9": 0.00, "10": 0.00, "11": 0.00, "12": 0.00 } },
    { "category": "Viaje", "monthly": { "1": 0.00, "2": 66.87, "3": 0.00, "4": 427.34, "5": 0.00, "6": 0.00, "7": 0.00, "8": 148.13, "9": 54.50, "10": 0.00, "11": 471.55, "12": 0.00 } },
    { "category": "Higiéne, Salud", "monthly": { "1": 0.00, "2": 0.00, "3": 0.00, "4": 0.00, "5": 0.00, "6": 0.00, "7": 0.00, "8": 0.00, "9": 0.00, "10": 0.00, "11": 0.00, "12": 0.00 } },
    { "category": "Extraordinarios", "monthly": { "1": 88.05, "2": 71.80, "3": 54.78, "4": 114.30, "5": 112.55, "6": 30.00, "7": 49.50, "8": 307.66, "9": 43.00, "10": 12.47, "11": 70.70, "12": 57.72 } }
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