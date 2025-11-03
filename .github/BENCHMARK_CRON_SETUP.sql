-- ⏰ Benchmark Auto-Fetch Cron Job Configuration
-- Execute this in Supabase SQL Editor
--
-- IMPORTANT: Replace the following values:
--   - YOUR_PROJECT_REF: Find it in Project Settings → API → Project URL
--     (e.g., if URL is https://abcdefg.supabase.co, then ref is 'abcdefg')
--   - YOUR_ANON_KEY: Find it in Project Settings → API → Project API keys → anon/public

-- Step 1: Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 2: Schedule daily benchmark fetch at 5:05 AM UTC (5 minutes after IBKR sync)
SELECT cron.schedule(
  'daily-benchmark-fetch',              -- Job name
  '5 5 * * *',                          -- Every day at 5:05 AM UTC
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/fetch-benchmarks',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);

-- Step 3: Verify the cron job was created
SELECT * FROM cron.job WHERE jobname = 'daily-benchmark-fetch';

-- Expected output:
-- jobid | schedule  | jobname                | ...
-- ------|-----------|------------------------|----
-- 2     | 5 5 * * * | daily-benchmark-fetch  | ...

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
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-benchmark-fetch')
ORDER BY start_time DESC
LIMIT 10;

-- Check today's benchmark data
SELECT
  benchmark_name,
  date,
  close_value,
  change_percent
FROM benchmark_history
WHERE date = CURRENT_DATE
ORDER BY benchmark_name;

-- Check all benchmarks (last 7 days)
SELECT
  benchmark_name,
  date,
  close_value,
  change_percent
FROM benchmark_history
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC, benchmark_name;

-- ========================================
-- MANAGEMENT COMMANDS
-- ========================================

-- To disable the cron job temporarily:
-- SELECT cron.unschedule('daily-benchmark-fetch');

-- To re-enable after disabling:
-- Run the schedule command again (Step 2 above)

-- To change the schedule (e.g., run at 6 AM UTC instead of 5:05 AM):
-- SELECT cron.unschedule('daily-benchmark-fetch');
-- Then run Step 2 with '0 6 * * *' instead of '5 5 * * *'
