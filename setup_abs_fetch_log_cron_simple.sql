-- abs-fetch-log 크론잡 설정 (인증 없이 실행)
-- Supabase Dashboard의 SQL Editor에서 실행하세요

-- Step 1: Extension 활성화
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 2: 크론잡 생성 (매시간 정각에 실행)
SELECT cron.schedule(
    'abs-fetch-log-hourly',           -- 크론잡 이름
    '0 * * * *',                       -- 매시간 정각 (분 시 일 월 요일)
    $$
    SELECT net.http_post(
        url := 'https://cwxcvcvjytsecbksgcgp.supabase.co/functions/v1/abs-fetch-log',
        headers := '{"Content-Type": "application/json"}'::jsonb
    ) AS request_id;
    $$
);

-- Step 3: 크론잡 확인
SELECT * FROM cron.job WHERE jobname = 'abs-fetch-log-hourly';

-- Step 4: 크론잡 즉시 실행해보기 (테스트용)
/*
SELECT net.http_post(
    url := 'https://cwxcvcvjytsecbksgcgp.supabase.co/functions/v1/abs-fetch-log',
    headers := '{"Content-Type": "application/json"}'::jsonb
) AS request_id;
*/

-- Step 5: 실행 이력 확인
/*
SELECT * FROM cron.job_run_details
WHERE jobname = 'abs-fetch-log-hourly'
ORDER BY start_time DESC
LIMIT 10;
*/

-- 크론잡 삭제 (필요시)
-- SELECT cron.unschedule('abs-fetch-log-hourly');
