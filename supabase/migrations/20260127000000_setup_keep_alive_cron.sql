-- Migration: Setup Keep-Alive Cron Job for Edge Functions
-- Purpose: Prevent cold starts by periodically pinging health-check function
-- Created: 2026-01-27

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Grant permissions to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- 3. Create keep-alive cron job for health-check function
-- Runs every 5 minutes to keep Edge Functions warm
SELECT cron.schedule(
    'keep-alive-health-check',  -- Job name
    '*/5 * * * *',              -- Run every 5 minutes
    $cmd$
    SELECT net.http_get(
        url := 'https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/health-check',
        headers := '{"Content-Type": "application/json"}'::jsonb
    ) AS request_id;
    $cmd$
);

-- 4. Create helper function to check cron job status
CREATE OR REPLACE FUNCTION get_keep_alive_status()
RETURNS TABLE (
    job_id bigint,
    schedule text,
    command text,
    active boolean,
    last_run timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        j.jobid,
        j.schedule,
        j.command,
        j.active,
        d.start_time AS last_run
    FROM cron.job j
    LEFT JOIN LATERAL (
        SELECT start_time
        FROM cron.job_run_details
        WHERE cron.job_run_details.jobid = j.jobid
        ORDER BY start_time DESC
        LIMIT 1
    ) d ON true
    WHERE j.jobname = 'keep-alive-health-check';
END;
$$;

-- 5. Create function to view recent keep-alive ping results
CREATE OR REPLACE FUNCTION get_keep_alive_history(limit_count int DEFAULT 20)
RETURNS TABLE (
    run_id bigint,
    job_name text,
    start_time timestamptz,
    end_time timestamptz,
    status text,
    return_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.runid,
        j.jobname,
        d.start_time,
        d.end_time,
        d.status,
        d.return_message
    FROM cron.job_run_details d
    JOIN cron.job j ON j.jobid = d.jobid
    WHERE j.jobname = 'keep-alive-health-check'
    ORDER BY d.start_time DESC
    LIMIT limit_count;
END;
$$;

-- 6. Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION get_keep_alive_status() TO authenticated;
GRANT EXECUTE ON FUNCTION get_keep_alive_history(int) TO authenticated;

-- 7. Add comments for documentation
COMMENT ON FUNCTION get_keep_alive_status() IS 'Returns current status of keep-alive cron job';
COMMENT ON FUNCTION get_keep_alive_history(int) IS 'Returns recent execution history of keep-alive pings';

-- Verification queries:
-- SELECT * FROM get_keep_alive_status();
-- SELECT * FROM get_keep_alive_history(10);
-- SELECT * FROM cron.job WHERE jobname = 'keep-alive-health-check';

-- To disable the cron job:
-- SELECT cron.unschedule('keep-alive-health-check');
