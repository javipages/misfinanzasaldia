-- Migration: Create unified holdings system
-- This migration creates the core tables for the new unified investment tracking system
-- Date: 2025-12-12

-- ============================================================================
-- 1. HOLDINGS TABLE - Consolidated positions from all sources
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Asset identification
  symbol text,                     -- Ticker symbol (VOO, AAPL, etc.)
  isin text,                       -- International Securities ID (for funds)
  name text NOT NULL,              -- Human-readable name
  
  -- Source and classification
  source text NOT NULL CHECK (source IN ('ibkr', 'myinvestor', 'manual')),
  asset_type text NOT NULL CHECK (asset_type IN ('etf', 'stock', 'fund', 'crypto', 'bond', 'other')),
  account_id uuid REFERENCES public.asset_categories(id) ON DELETE SET NULL,
  
  -- Position data
  quantity numeric(14,6) NOT NULL DEFAULT 0,
  cost_basis numeric(14,4),        -- Average purchase price per unit
  current_price numeric(14,4),     -- Latest known price per unit
  currency text NOT NULL DEFAULT 'EUR',
  
  -- Sync metadata
  external_id text,                -- External identifier (conid for IBKR)
  exchange text,                   -- Exchange (NASDAQ, etc.)
  last_price_update timestamptz,   -- When current_price was last updated
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint: one position per source + identifier
CREATE UNIQUE INDEX IF NOT EXISTS idx_holdings_unique_position 
ON public.holdings (user_id, source, COALESCE(external_id, isin, symbol));

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_holdings_user_id ON public.holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_holdings_source ON public.holdings(source);
CREATE INDEX IF NOT EXISTS idx_holdings_isin ON public.holdings(isin) WHERE isin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_holdings_symbol ON public.holdings(symbol) WHERE symbol IS NOT NULL;

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_holdings_updated_at ON public.holdings;
CREATE TRIGGER trg_holdings_updated_at
BEFORE UPDATE ON public.holdings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Holdings - select own" ON public.holdings;
CREATE POLICY "Holdings - select own" ON public.holdings
FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Holdings - insert own" ON public.holdings;
CREATE POLICY "Holdings - insert own" ON public.holdings
FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Holdings - update own" ON public.holdings;
CREATE POLICY "Holdings - update own" ON public.holdings
FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Holdings - delete own" ON public.holdings;
CREATE POLICY "Holdings - delete own" ON public.holdings
FOR DELETE USING (user_id = auth.uid());

-- Service role policies for CRON jobs
DROP POLICY IF EXISTS "Service role can manage holdings" ON public.holdings;
CREATE POLICY "Service role can manage holdings" ON public.holdings
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 2. HOLDING_TRANSACTIONS TABLE - Transaction history
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.holding_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  holding_id uuid NOT NULL REFERENCES public.holdings(id) ON DELETE CASCADE,
  
  -- Transaction details
  type text NOT NULL DEFAULT 'buy' CHECK (type IN ('buy', 'sell', 'dividend', 'transfer')),
  quantity numeric(14,6),          -- Number of units (shares/participaciones)
  price numeric(14,4),             -- Price per unit at transaction time
  amount numeric(14,2) NOT NULL,   -- Total transaction amount
  transaction_date date NOT NULL,
  
  -- Metadata
  description text,
  imported_from text,              -- 'myinvestor_csv', 'ibkr_sync', 'manual'
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint to prevent duplicate imports
CREATE UNIQUE INDEX IF NOT EXISTS idx_holding_transactions_unique 
ON public.holding_transactions (holding_id, transaction_date, amount);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_holding_transactions_user_id ON public.holding_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_holding_transactions_holding_id ON public.holding_transactions(holding_id);
CREATE INDEX IF NOT EXISTS idx_holding_transactions_date ON public.holding_transactions(transaction_date);

-- RLS
ALTER TABLE public.holding_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Holding transactions - select own" ON public.holding_transactions;
CREATE POLICY "Holding transactions - select own" ON public.holding_transactions
FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Holding transactions - insert own" ON public.holding_transactions;
CREATE POLICY "Holding transactions - insert own" ON public.holding_transactions
FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Holding transactions - update own" ON public.holding_transactions;
CREATE POLICY "Holding transactions - update own" ON public.holding_transactions
FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Holding transactions - delete own" ON public.holding_transactions;
CREATE POLICY "Holding transactions - delete own" ON public.holding_transactions
FOR DELETE USING (user_id = auth.uid());

-- Service role policies for CRON jobs
DROP POLICY IF EXISTS "Service role can manage holding_transactions" ON public.holding_transactions;
CREATE POLICY "Service role can manage holding_transactions" ON public.holding_transactions
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 3. CASH_BALANCES TABLE - Cash/liquidity tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cash_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  source text NOT NULL CHECK (source IN ('ibkr', 'myinvestor', 'manual')),
  currency text NOT NULL CHECK (currency IN ('EUR', 'USD', 'GBP', 'CHF')),
  amount numeric(14,2) NOT NULL DEFAULT 0,
  
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, source, currency)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cash_balances_user_id ON public.cash_balances(user_id);

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_cash_balances_updated_at ON public.cash_balances;
CREATE TRIGGER trg_cash_balances_updated_at
BEFORE UPDATE ON public.cash_balances
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.cash_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cash balances - select own" ON public.cash_balances;
CREATE POLICY "Cash balances - select own" ON public.cash_balances
FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Cash balances - insert own" ON public.cash_balances;
CREATE POLICY "Cash balances - insert own" ON public.cash_balances
FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Cash balances - update own" ON public.cash_balances;
CREATE POLICY "Cash balances - update own" ON public.cash_balances
FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Cash balances - delete own" ON public.cash_balances;
CREATE POLICY "Cash balances - delete own" ON public.cash_balances
FOR DELETE USING (user_id = auth.uid());

-- Service role policies for CRON jobs
DROP POLICY IF EXISTS "Service role can manage cash_balances" ON public.cash_balances;
CREATE POLICY "Service role can manage cash_balances" ON public.cash_balances
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE public.holdings IS 'Unified investment positions from all sources (IBKR, MyInvestor, manual)';
COMMENT ON TABLE public.holding_transactions IS 'Transaction history for holdings (buys, sells, dividends)';
COMMENT ON TABLE public.cash_balances IS 'Cash/liquidity balances by source and currency';

COMMENT ON COLUMN public.holdings.source IS 'Data source: ibkr, myinvestor, manual';
COMMENT ON COLUMN public.holdings.external_id IS 'External identifier (e.g., IBKR conid)';
COMMENT ON COLUMN public.holdings.cost_basis IS 'Average purchase price per unit';
COMMENT ON COLUMN public.holdings.current_price IS 'Latest known market price per unit';
