# abs-fetch-log 배포 가이드

## 🚀 배포 단계

### 1. 데이터베이스 마이그레이션 적용

```bash
supabase db push
```

### 2. Edge Function 배포 (인증 없이)

**중요**: `--no-verify-jwt` 플래그를 사용하여 JWT 인증을 건너뜁니다.

```bash
supabase functions deploy abs-fetch-log --no-verify-jwt
```

### 3. 크론잡 등록

Supabase Dashboard → SQL Editor에서 다음 SQL 실행:

```sql
-- Extension 활성화
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 크론잡 생성 (매시간 정각)
SELECT cron.schedule(
    'abs-fetch-log-hourly',
    '0 * * * *',
    $$
    SELECT net.http_post(
        url := 'https://cwxcvcvjytsecbksgcgp.supabase.co/functions/v1/abs-fetch-log',
        headers := '{"Content-Type": "application/json"}'::jsonb
    ) AS request_id;
    $$
);
```

또는 `setup_abs_fetch_log_cron_simple.sql` 파일의 내용을 복사해서 실행하세요.

---

## ✅ 테스트

### 1. 수동으로 함수 호출 (인증 없이)

```bash
curl -X POST https://cwxcvcvjytsecbksgcgp.supabase.co/functions/v1/abs-fetch-log
```

### 2. 결과 확인

Supabase Dashboard → SQL Editor:

```sql
-- 최근 로그 확인
SELECT * FROM abs_fetch_log
ORDER BY request_time DESC
LIMIT 10;

-- 지점별 통계
SELECT
    station_name,
    station_id,
    COUNT(*) as record_count
FROM abs_fetch_log
GROUP BY station_name, station_id
ORDER BY record_count DESC
LIMIT 20;
```

### 3. 크론잡 실행 이력 확인

```sql
SELECT * FROM cron.job_run_details
WHERE jobname = 'abs-fetch-log-hourly'
ORDER BY start_time DESC
LIMIT 10;
```

---

## 📊 Netlify 페이지 배포

netlify 디렉토리를 배포하면 다음 URL에서 확인 가능:
- https://mancool.netlify.app/abs-fetch-log.html

---

## 🔧 관리 명령어

### 크론잡 목록 확인
```sql
SELECT * FROM cron.job;
```

### 크론잡 삭제
```sql
SELECT cron.unschedule('abs-fetch-log-hourly');
```

### 크론잡 일시정지 (삭제 후 재생성)
```sql
-- 삭제
SELECT cron.unschedule('abs-fetch-log-hourly');

-- 재생성
SELECT cron.schedule(
    'abs-fetch-log-hourly',
    '0 * * * *',
    $$
    SELECT net.http_post(
        url := 'https://cwxcvcvjytsecbksgcgp.supabase.co/functions/v1/abs-fetch-log',
        headers := '{"Content-Type": "application/json"}'::jsonb
    ) AS request_id;
    $$
);
```

---

## 🔒 보안 참고사항

함수는 인증 없이 실행되도록 배포되었지만, 다음과 같은 보안이 적용되어 있습니다:

1. **읽기 전용**: 함수는 KMA API에서 데이터를 읽어 로그만 기록합니다
2. **RLS 정책**: `abs_fetch_log` 테이블은 익명 읽기만 허용합니다
3. **선택적 토큰**: 필요시 `x-cron-secret` 헤더로 추가 보안 가능

필요하다면 환경 변수에 `CRON_SECRET`을 설정하고, 크론잡에서 헤더를 추가할 수 있습니다:

```sql
SELECT cron.schedule(
    'abs-fetch-log-hourly',
    '0 * * * *',
    $$
    SELECT net.http_post(
        url := 'https://cwxcvcvjytsecbksgcgp.supabase.co/functions/v1/abs-fetch-log',
        headers := '{"Content-Type": "application/json", "x-cron-secret": "your-secret-key"}'::jsonb
    ) AS request_id;
    $$
);
```

---

## 📝 크론 스케줄 예시

```
'0 * * * *'      매시간 정각
'*/30 * * * *'   30분마다
'0 */2 * * *'    2시간마다
'0 0 * * *'      매일 자정
'0 */6 * * *'    6시간마다
```

---

## 🐛 문제 해결

### 함수가 실행되지 않을 때

1. 함수 로그 확인:
   ```bash
   supabase functions logs abs-fetch-log
   ```

2. pg_net 응답 확인:
   ```sql
   SELECT * FROM net._http_response
   ORDER BY created DESC
   LIMIT 10;
   ```

3. 크론잡 실행 이력 확인:
   ```sql
   SELECT
       jobname,
       runid,
       job_pid,
       database,
       username,
       command,
       status,
       return_message,
       start_time,
       end_time
   FROM cron.job_run_details
   WHERE jobname = 'abs-fetch-log-hourly'
   ORDER BY start_time DESC
   LIMIT 10;
   ```

### 데이터가 수집되지 않을 때

```sql
-- 최근 수집 확인
SELECT
    request_time,
    COUNT(*) as stations_logged
FROM abs_fetch_log
WHERE request_time > NOW() - INTERVAL '1 day'
GROUP BY request_time
ORDER BY request_time DESC;
```
