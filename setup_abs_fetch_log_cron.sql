-- abs-fetch-log 크론잡 설정
-- Supabase Dashboard의 SQL Editor에서 실행하세요

-- Step 1: Extension 활성화
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 2: 크론잡 생성 (매시간 정각에 실행)
-- 주의: YOUR_SERVICE_ROLE_KEY를 실제 서비스 역할 키로 교체하세요
SELECT cron.schedule(
    'abs-fetch-log-hourly',           -- 크론잡 이름
    '0 * * * *',                       -- 매시간 정각 (분 시 일 월 요일)
    $$
    SELECT net.http_post(
        url := 'https://cwxcvcvjytsecbksgcgp.supabase.co/functions/v1/abs-fetch-log',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
    ) AS request_id;
    $$
);

-- Step 3: 크론잡 확인
SELECT * FROM cron.job WHERE jobname = 'abs-fetch-log-hourly';

-- Step 4: 크론잡 즉시 실행해보기 (테스트용)
-- 다음 쿼리를 별도로 실행하여 즉시 테스트할 수 있습니다:
/*
SELECT net.http_post(
    url := 'https://cwxcvcvjytsecbksgcgp.supabase.co/functions/v1/abs-fetch-log',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
) AS request_id;
*/

-- Step 5: 실행 이력 확인 (나중에)
-- SELECT * FROM cron.job_run_details
-- WHERE jobname = 'abs-fetch-log-hourly'
-- ORDER BY start_time DESC
-- LIMIT 10;

-- 크론잡 삭제 (필요시)
-- SELECT cron.unschedule('abs-fetch-log-hourly');
