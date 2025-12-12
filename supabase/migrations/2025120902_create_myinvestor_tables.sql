-- Migration: Create MyInvestor fund mappings table
-- Maps ISINs to investments for price tracking via CRON

-- Table to map ISINs to user investments
CREATE TABLE IF NOT EXISTS public.myinvestor_fund_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  isin text NOT NULL,
  investment_id uuid NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
  shares numeric(14, 6) NOT NULL DEFAULT 0,  -- Total participaciones acumuladas
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT myinvestor_fund_mappings_user_isin_unique UNIQUE (user_id, isin)
);

-- RLS
ALTER TABLE public.myinvestor_fund_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own fund mappings"
ON public.myinvestor_fund_mappings
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_myinvestor_fund_mappings_user_id ON public.myinvestor_fund_mappings(user_id);
CREATE INDEX idx_myinvestor_fund_mappings_isin ON public.myinvestor_fund_mappings(isin);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_myinvestor_fund_mappings_updated_at ON public.myinvestor_fund_mappings;
CREATE TRIGGER trg_myinvestor_fund_mappings_updated_at
BEFORE UPDATE ON public.myinvestor_fund_mappings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Comment
COMMENT ON TABLE public.myinvestor_fund_mappings IS 'Maps ISINs to investments with total shares for CRON price updates';
