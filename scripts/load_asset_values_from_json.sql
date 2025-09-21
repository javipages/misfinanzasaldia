-- Upsert monthly asset values into public.asset_values (one value per month)
-- Uses the same payload format as load_asset_entries_from_json.sql

with
payload as (
  select '{
  "year": 2024,
  "assets": [
    { "name": "IMAGIN",              "map_to": "Imagin",             "monthly": { "1": 46.63,  "2": 26.59,  "3": 207.49, "4": 5.84,  "5": 444.69, "6": 187.23, "7": 676.34, "8": 480.56, "9": 179.94, "10": 838.45, "11": 610.14, "12": 1057.72 } },
    { "name": "ING",                  "map_to": "ING",                 "monthly": { "1": 85.85,  "2": 67.86,  "3": 149.87, "4": 131.88, "5": 95.90,  "6": 113.86, "7": 113.86, "8": 95.87,  "9": 70.89,  "10": 52.90,  "11": 36.04,  "12": 18.05 } },
    { "name": "REVOLUT",              "map_to": "Revolut",             "monthly": { "1": 78.17,  "2": 179.61, "3": 180.05, "4": 360.63, "5": 561.80, "6": 564.02, "7": 3565.10, "8": 8279.80, "9": 8298.56, "10": 8315.50, "11": 8331.92, "12": 8650.03 } },
    { "name": "ING AHORRO",           "map_to": "ING",                 "monthly": { "1": 11715.09, "2": 11026.45, "3": 11410.04, "4": 11043.40, "5": 10343.40, "6": 10357.55, "7": 7847.04, "8": 2933.28, "9": 3125.55, "10": 2279.26, "11": 1212.59, "12": 1463.50 } },
    { "name": "MYINVESTOR AHORRO",    "map_to": "MyInvestor Ahorro",  "monthly": { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 4100.36, "8": 5202.00, "9": 0, "10": 0, "11": 0, "12": 0 } },
    { "name": "DERECHOS DE COBRO",    "map_to": "Derechos/Obligaciones","monthly": { "1": 18.54, "2": 5.59,  "3": 8.77,  "4": 0.53,  "5": 139.00, "6": 0.00,  "7": 0.00,  "8": 0.00,  "9": 30.00,  "10": 12.24, "11": 19.70, "12": 14.01 } },
    { "name": "CAJA",                 "map_to": "Caja",                "monthly": { "1": 50.00, "2": 5.00,  "3": 25.00, "4": 55.00, "5": 110.00, "6": 10.00, "7": 10.00, "8": 10.00, "9": 20.00, "10": 10.00, "11": 9.20,  "12": 36.70 } },
    { "name": "DERECHO FINDIT",       "map_to": "Derecho Findit",     "monthly": { "1": 0.00,  "2": 0.00,  "3": 0.00,  "4": 0.00,  "5": 0.00,  "6": 0.00,  "7": 0.00,  "8": 0.00,  "9": 0.00,  "10": 400.00, "11": 331.00, "12": 519.00 } },
    { "name": "INTERACTIVE BROKERS",  "map_to": "IBKR",                "monthly": { } },
    { "name": "MYINVESTOR",           "map_to": "MyInvestor",          "monthly": { "1": 0.00,  "2": 0.00,  "3": 0.00,  "4": 0.00,  "5": 0.00,  "6": 0.00,  "7": 0.00,  "8": 217.00,  "9": 223.10, "10": 223.50, "11": 239.00, "12": 238.70 } },
    { "name": "EXCHANGE",             "map_to": "Binance",             "monthly": { "1": 750.00, "2": 1360.00, "3": 1750.00, "4": 1520.00, "5": 1700.00, "6": 1540.00, "7": 1570.00, "8": 1280.00, "9": 1400.00, "10": 1420.00, "11": 2300.00, "12": 2100.00 } }
  ]
}'::jsonb as j
),
target_user as (
  select id as user_id from auth.users where email = 'javi@gmail.com'
),
raw as (
  select
    (p.j->>'year')::int as year,
    nullif(trim(coalesce(val->>'map_to', val->>'name')), '') as target_name,
    jsonb_each_text(coalesce(val->'monthly','{}'::jsonb)) as kv
  from payload p
  cross join lateral jsonb_array_elements(p.j->'assets') as val
),
prepared as (
  select year,
         target_name,
         (kv).key::int as month,
         (kv).value::numeric as amount
  from raw
),
aggregated as (
  -- Sum duplicates that map to the same category and month (e.g., ING + ING AHORRO -> ING)
  select year, target_name, month, sum(amount)::numeric(14,2) as amount
  from prepared
  group by year, target_name, month
),
upserted as (
  insert into public.asset_values (user_id, category_id, year, month, amount)
  select tu.user_id, ac.id, p.year, p.month, p.amount
  from aggregated p
  join target_user tu on true
  join public.asset_categories ac
    on ac.user_id = tu.user_id
   and upper(ac.name) = upper(p.target_name)
  on conflict (user_id, category_id, year, month)
  do update set amount = excluded.amount, updated_at = now()
  returning 1
)
select coalesce((select count(*) from upserted),0) as rows_upserted,
       (select (j->>'year')::int from payload) as year_loaded;


