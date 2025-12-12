-- Migration: Migrate existing data to unified holdings system
-- This migration moves data from old tables to the new unified structure
-- Date: 2025-12-12
-- IMPORTANT: Run this AFTER 20251212_create_holdings_tables.sql

-- ============================================================================
-- 1. MIGRATE IBKR POSITIONS → HOLDINGS
-- ============================================================================
INSERT INTO public.holdings (
  user_id,
  symbol,
  isin,
  name,
  source,
  asset_type,
  account_id,
  quantity,
  cost_basis,
  current_price,
  currency,
  external_id,
  exchange,
  last_price_update,
  created_at,
  updated_at
)
SELECT 
  user_id,
  symbol,
  isin,
  COALESCE(description, symbol) as name,
  'ibkr' as source,
  CASE 
    WHEN asset_category = 'STK' THEN 'stock'
    WHEN asset_category = 'OPT' THEN 'other'
    WHEN asset_category = 'FUT' THEN 'other'
    WHEN asset_category = 'ETF' THEN 'etf'
    ELSE 'other'
  END as asset_type,
  NULL as account_id,  -- IBKR doesn't use our account system
  quantity,
  cost_basis,
  current_price,
  COALESCE(currency, 'USD') as currency,
  conid as external_id,
  exchange,
  last_sync_at as last_price_update,
  created_at,
  updated_at
FROM public.ibkr_positions
WHERE quantity > 0
ON CONFLICT (user_id, source, COALESCE(external_id, isin, symbol)) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  cost_basis = EXCLUDED.cost_basis,
  current_price = EXCLUDED.current_price,
  last_price_update = EXCLUDED.last_price_update,
  updated_at = now();

-- ============================================================================
-- 2. MIGRATE MYINVESTOR INVESTMENTS → HOLDINGS
-- Uses myinvestor_fund_mappings for shares + investments for metadata
-- ============================================================================
INSERT INTO public.holdings (
  user_id,
  symbol,
  isin,
  name,
  source,
  asset_type,
  account_id,
  quantity,
  cost_basis,
  current_price,
  currency,
  external_id,
  exchange,
  last_price_update,
  created_at,
  updated_at
)
SELECT DISTINCT ON (i.user_id, m.isin)
  i.user_id,
  NULL as symbol,  -- MyInvestor funds typically don't have ticker symbols
  m.isin,
  i.name,
  'myinvestor' as source,
  CASE i.type
    WHEN 'etf' THEN 'etf'
    WHEN 'acciones' THEN 'stock'
    WHEN 'fondos' THEN 'fund'
    WHEN 'crypto' THEN 'crypto'
    WHEN 'bonos' THEN 'bond'
    ELSE 'other'
  END as asset_type,
  i.account_id,
  m.shares as quantity,
  -- Calculate cost basis from investment_values
  (
    SELECT COALESCE(SUM(iv.amount) / NULLIF(m.shares, 0), 0)
    FROM public.investment_values iv
    WHERE iv.investment_id = i.id
  ) as cost_basis,
  -- Get latest price from benchmark_history if available
  (
    SELECT bh.close_value
    FROM public.benchmark_history bh
    WHERE bh.benchmark_name = 'ISIN:' || m.isin
    ORDER BY bh.date DESC
    LIMIT 1
  ) as current_price,
  'EUR' as currency,
  m.isin as external_id,  -- Use ISIN as external_id for MyInvestor
  NULL as exchange,
  (
    SELECT bh.created_at
    FROM public.benchmark_history bh
    WHERE bh.benchmark_name = 'ISIN:' || m.isin
    ORDER BY bh.date DESC
    LIMIT 1
  ) as last_price_update,
  i.created_at,
  i.updated_at
FROM public.investments i
INNER JOIN public.myinvestor_fund_mappings m ON m.investment_id = i.id
ON CONFLICT (user_id, source, COALESCE(external_id, isin, symbol)) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  cost_basis = EXCLUDED.cost_basis,
  current_price = EXCLUDED.current_price,
  updated_at = now();

-- ============================================================================
-- 3. MIGRATE MANUAL INVESTMENTS → HOLDINGS (investments WITHOUT myinvestor mapping)
-- ============================================================================
INSERT INTO public.holdings (
  user_id,
  symbol,
  isin,
  name,
  source,
  asset_type,
  account_id,
  quantity,
  cost_basis,
  current_price,
  currency,
  external_id,
  created_at,
  updated_at
)
SELECT 
  i.user_id,
  NULL as symbol,
  NULL as isin,
  i.name,
  'manual' as source,
  CASE i.type
    WHEN 'etf' THEN 'etf'
    WHEN 'acciones' THEN 'stock'
    WHEN 'fondos' THEN 'fund'
    WHEN 'crypto' THEN 'crypto'
    WHEN 'bonos' THEN 'bond'
    ELSE 'other'
  END as asset_type,
  i.account_id,
  1 as quantity,  -- Manual investments don't track shares
  -- Total invested = current value for manual (no price updates)
  (
    SELECT COALESCE(SUM(iv.amount), 0)
    FROM public.investment_values iv
    WHERE iv.investment_id = i.id
  ) as cost_basis,
  -- Same as cost_basis (no real-time price for manual)
  (
    SELECT COALESCE(SUM(iv.amount), 0)
    FROM public.investment_values iv
    WHERE iv.investment_id = i.id
  ) as current_price,
  'EUR' as currency,
  i.id::text as external_id,  -- Use old investment id as external_id
  i.created_at,
  i.updated_at
FROM public.investments i
WHERE NOT EXISTS (
  SELECT 1 FROM public.myinvestor_fund_mappings m WHERE m.investment_id = i.id
)
ON CONFLICT (user_id, source, COALESCE(external_id, isin, symbol)) DO NOTHING;

-- ============================================================================
-- 4. MIGRATE INVESTMENT_VALUES → HOLDING_TRANSACTIONS
-- ============================================================================
INSERT INTO public.holding_transactions (
  user_id,
  holding_id,
  type,
  quantity,
  price,
  amount,
  transaction_date,
  description,
  imported_from,
  created_at
)
SELECT 
  iv.user_id,
  h.id as holding_id,
  'buy' as type,
  -- Extract quantity from description if available (format: "X.XX participaciones")
  CASE 
    WHEN iv.description ~ '^\d+\.?\d*\s+participaciones' 
    THEN (regexp_match(iv.description, '^(\d+\.?\d*)'))[1]::numeric
    ELSE NULL
  END as quantity,
  -- Calculate price per unit
  CASE 
    WHEN iv.description ~ '^\d+\.?\d*\s+participaciones' 
    THEN iv.amount / NULLIF((regexp_match(iv.description, '^(\d+\.?\d*)'))[1]::numeric, 0)
    ELSE iv.amount
  END as price,
  iv.amount,
  iv.contribution_date as transaction_date,
  iv.description,
  'migration' as imported_from,
  iv.created_at
FROM public.investment_values iv
-- Join to find the corresponding holding (could be myinvestor or manual)
LEFT JOIN public.holdings h ON (
  h.user_id = iv.user_id 
  AND (
    -- Match by old investment_id stored in external_id for manual
    (h.source = 'manual' AND h.external_id = (
      SELECT i.id::text FROM public.investments i WHERE i.id = iv.investment_id
    ))
    OR
    -- Match by ISIN for myinvestor
    (h.source = 'myinvestor' AND h.isin = (
      SELECT m.isin FROM public.myinvestor_fund_mappings m WHERE m.investment_id = iv.investment_id
    ))
  )
)
WHERE h.id IS NOT NULL
ON CONFLICT (holding_id, transaction_date, amount) DO NOTHING;

-- ============================================================================
-- 5. MIGRATE IBKR CASH → CASH_BALANCES
-- Get latest cash balances from ibkr_sync_history
-- ============================================================================
INSERT INTO public.cash_balances (user_id, source, currency, amount, last_sync_at)
SELECT DISTINCT ON (user_id)
  user_id,
  'ibkr' as source,
  'EUR' as currency,
  total_cash_eur as amount,
  sync_date as last_sync_at
FROM public.ibkr_sync_history
WHERE total_cash_eur IS NOT NULL AND total_cash_eur > 0
ORDER BY user_id, sync_date DESC
ON CONFLICT (user_id, source, currency) DO UPDATE SET
  amount = EXCLUDED.amount,
  last_sync_at = EXCLUDED.last_sync_at;

INSERT INTO public.cash_balances (user_id, source, currency, amount, last_sync_at)
SELECT DISTINCT ON (user_id)
  user_id,
  'ibkr' as source,
  'USD' as currency,
  total_cash_usd as amount,
  sync_date as last_sync_at
FROM public.ibkr_sync_history
WHERE total_cash_usd IS NOT NULL AND total_cash_usd > 0
ORDER BY user_id, sync_date DESC
ON CONFLICT (user_id, source, currency) DO UPDATE SET
  amount = EXCLUDED.amount,
  last_sync_at = EXCLUDED.last_sync_at;

-- ============================================================================
-- VERIFICATION QUERIES (run these to verify migration)
-- ============================================================================
-- SELECT source, COUNT(*) as count, SUM(quantity * COALESCE(current_price, 0)) as total_value 
-- FROM holdings GROUP BY source;

-- SELECT h.name, COUNT(t.id) as transactions 
-- FROM holdings h 
-- LEFT JOIN holding_transactions t ON t.holding_id = h.id 
-- GROUP BY h.id, h.name;

-- SELECT * FROM cash_balances;
