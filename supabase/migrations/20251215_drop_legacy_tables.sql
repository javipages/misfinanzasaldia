-- Migration: Drop deprecated tables after unified holdings migration
-- Date: 2025-12-15
-- IMPORTANT: Run this ONLY after verifying that data migration was successful
-- and that the new holdings system is working in production

-- ============================================================================
-- DROP LEGACY TABLES
-- These tables are no longer used after the unified holdings refactor
-- ============================================================================

-- 1. Drop myinvestor_fund_mappings (ISIN now stored directly in holdings)
DROP TABLE IF EXISTS public.myinvestor_fund_mappings CASCADE;

-- 2. Drop investment_values (transactions now in holding_transactions)
DROP TABLE IF EXISTS public.investment_values CASCADE;

-- 3. Drop investments (all data migrated to holdings)
DROP TABLE IF EXISTS public.investments CASCADE;

-- 4. Drop ibkr_positions (now in holdings with source='ibkr')
DROP TABLE IF EXISTS public.ibkr_positions CASCADE;

-- ============================================================================
-- VERIFICATION
-- Run this after the migration to confirm tables are gone
-- ============================================================================
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('investments', 'investment_values', 'myinvestor_fund_mappings', 'ibkr_positions');
-- Should return 0 rows
