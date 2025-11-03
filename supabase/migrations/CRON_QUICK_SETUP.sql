-- ⏰ IBKR Auto-Sync Cron Job Configuration
-- Execute this in Supabase SQL Editor
--
-- IMPORTANT: Replace the following values:
--   - YOUR_PROJECT_REF: Find it in Project Settings → API → Project URL
--     (e.g., if URL is https://abcdefg.supabase.co, then ref is 'abcdefg')
--   - YOUR_ANON_KEY: Find it in Project Settings → API → Project API keys → anon/public

-- Step 1: Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 2: Schedule daily IBKR sync at 5 AM UTC
SELECT cron.schedule(
  'daily-ibkr-sync',                    -- Job name
  '0 5 * * *',                          -- Every day at 5:00 AM UTC (6-7 AM Spain)
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-ibkr-cron',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuamN3cm9jYmZ3aHRvZnhmanlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTkwOTEsImV4cCI6MjA3Mzk3NTA5MX0.BnVNOoVowrrJYAmjaLeYImMtB3oaK5waVNO3hW-omRg"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);

-- Step 3: Verify the cron job was created
SELECT * FROM cron.job WHERE jobname = 'daily-ibkr-sync';

-- Expected output:
-- jobid | schedule  | jobname           | ...
-- ------|-----------|-------------------|----
-- 1     | 0 5 * * * | daily-ibkr-sync   | ...

-- ========================================
-- OPTIONAL: Monitoring queries
-- ========================================

-- Check recent cron executions
SELECT
  jobid,
  runid,
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-ibkr-sync')
ORDER BY start_time DESC
LIMIT 10;

-- Check today's sync results
SELECT
  user_id,
  sync_date,
  positions_count,
  total_value_usd,
  status,
  error_message
FROM ibkr_sync_history
WHERE sync_date::date = CURRENT_DATE
ORDER BY sync_date DESC;

-- ========================================
-- MANAGEMENT COMMANDS
-- ========================================

-- To disable the cron job temporarily:
-- SELECT cron.unschedule('daily-ibkr-sync');

-- To re-enable after disabling:
-- Run the schedule command again (Step 2 above)

-- To change the schedule (e.g., run at 4 AM UTC instead of 5 AM):
-- SELECT cron.unschedule('daily-ibkr-sync');
-- Then run Step 2 with '0 4 * * *' instead of '0 5 * * *'
