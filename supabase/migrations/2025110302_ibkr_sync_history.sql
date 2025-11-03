-- Create table for IBKR sync history
CREATE TABLE IF NOT EXISTS public.ibkr_sync_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sync_date timestamptz NOT NULL DEFAULT now(),
  positions_count int NOT NULL DEFAULT 0,
  total_value_usd numeric(14, 2) NOT NULL DEFAULT 0,
  total_cost_usd numeric(14, 2) NOT NULL DEFAULT 0,
  total_pnl_usd numeric(14, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'success', -- 'success' | 'error'
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_ibkr_sync_history_user_date
  ON public.ibkr_sync_history(user_id, sync_date DESC);

-- Enable Row Level Security
ALTER TABLE public.ibkr_sync_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own sync history"
  ON public.ibkr_sync_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync history"
  ON public.ibkr_sync_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE public.ibkr_sync_history IS 'Stores history of IBKR synchronizations for tracking portfolio performance over time';
