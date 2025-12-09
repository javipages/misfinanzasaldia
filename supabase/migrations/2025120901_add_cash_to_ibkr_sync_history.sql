-- Add cash balance fields to ibkr_sync_history
-- This allows tracking of cash/liquidity from IBKR alongside positions

ALTER TABLE ibkr_sync_history 
ADD COLUMN IF NOT EXISTS total_cash_eur NUMERIC DEFAULT 0;

ALTER TABLE ibkr_sync_history 
ADD COLUMN IF NOT EXISTS total_cash_usd NUMERIC DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN ibkr_sync_history.total_cash_eur IS 'Total cash balance in EUR from IBKR CashReport';
COMMENT ON COLUMN ibkr_sync_history.total_cash_usd IS 'Total cash balance in USD from IBKR CashReport';
