-- Migration: Create Binance integration tables
-- Date: 2025-12-12

-- ============================================================================
-- 1. BINANCE_CONFIG TABLE - Stores encrypted API credentials
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.binance_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Encrypted credentials
  api_key text NOT NULL,      -- Encrypted API Key
  api_secret text NOT NULL,   -- Encrypted API Secret
  
  -- Sync metadata
  last_sync_at timestamptz,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_binance_config_user_id ON public.binance_config(user_id);

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_binance_config_updated_at ON public.binance_config;
CREATE TRIGGER trg_binance_config_updated_at
BEFORE UPDATE ON public.binance_config
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.binance_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Binance config - select own" ON public.binance_config;
CREATE POLICY "Binance config - select own" ON public.binance_config
FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Binance config - insert own" ON public.binance_config;
CREATE POLICY "Binance config - insert own" ON public.binance_config
FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Binance config - update own" ON public.binance_config;
CREATE POLICY "Binance config - update own" ON public.binance_config
FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Binance config - delete own" ON public.binance_config;
CREATE POLICY "Binance config - delete own" ON public.binance_config
FOR DELETE USING (user_id = auth.uid());

-- Service role policy for CRON jobs
DROP POLICY IF EXISTS "Service role can manage binance_config" ON public.binance_config;
CREATE POLICY "Service role can manage binance_config" ON public.binance_config
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 2. UPDATE EXISTING TABLES - Add 'binance' as valid source
-- ============================================================================

-- Update holdings source constraint
ALTER TABLE public.holdings DROP CONSTRAINT IF EXISTS holdings_source_check;
ALTER TABLE public.holdings ADD CONSTRAINT holdings_source_check 
  CHECK (source IN ('ibkr', 'myinvestor', 'manual', 'binance'));

-- Update cash_balances source constraint
ALTER TABLE public.cash_balances DROP CONSTRAINT IF EXISTS cash_balances_source_check;
ALTER TABLE public.cash_balances ADD CONSTRAINT cash_balances_source_check 
  CHECK (source IN ('ibkr', 'myinvestor', 'manual', 'binance'));

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE public.binance_config IS 'Encrypted Binance API credentials per user';
COMMENT ON COLUMN public.binance_config.api_key IS 'Encrypted Binance API Key';
COMMENT ON COLUMN public.binance_config.api_secret IS 'Encrypted Binance API Secret';
