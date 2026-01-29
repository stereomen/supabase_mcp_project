# abs-fetch-log 크론잡 설정 가이드

## 방법 1: 외부 크론 서비스 사용 (권장)

가장 간단하고 안정적인 방법입니다.

### cron-job.org 사용

1. https://cron-job.org 에 가입
2. 새 크론잡 생성:
   - **Title**: KMA Data Fetch Log
   - **URL**: `https://cwxcvcvjytsecbksgcgp.supabase.co/functions/v1/abs-fetch-log`
   - **Schedule**: 매시간 (Every hour at :00)
   - **Request Method**: POST
   - **Headers**:
     ```
     Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3eGN2Y3ZqeXRzZWNia3NnY2dwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjUxMDMwMywiZXhwIjoyMDQ4MDg2MzAzfQ.YOUR_SERVICE_ROLE_KEY
     ```

3. 저장 후 활성화

### GitHub Actions 사용

리포지토리에 `.github/workflows/abs-fetch-log.yml` 파일 생성:

```yaml
name: KMA Data Fetch Log

on:
  schedule:
    # 매시간 정각에 실행 (UTC 기준)
    - cron: '0 * * * *'
  workflow_dispatch: # 수동 실행 가능

jobs:
  fetch-log:
    runs-on: ubuntu-latest
    steps:
      - name: Call abs-fetch-log function
        run: |
          curl -X POST https://cwxcvcvjytsecbksgcgp.supabase.co/functions/v1/abs-fetch-log \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json"
```

**주의**: GitHub Secrets에 `SUPABASE_SERVICE_ROLE_KEY`를 추가해야 합니다.

---

## 방법 2: Supabase pg_cron 사용

Supabase Dashboard의 SQL Editor에서 실행:

### Step 1: pg_cron과 pg_net extension 활성화

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### Step 2: Secrets 저장 (Supabase Vault 사용)

```sql
-- Supabase service role key를 vault에 저장
SELECT vault.create_secret(
  'YOUR_SERVICE_ROLE_KEY_HERE',
  'supabase_service_role_key'
);
```

### Step 3: 크론잡 생성

```sql
-- 매시간 정각에 abs-fetch-log 함수 호출
SELECT cron.schedule(
  'abs-fetch-log-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://cwxcvcvjytsecbksgcgp.supabase.co/functions/v1/abs-fetch-log',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key')
    )
  );
  $$
);
```

### 크론잡 확인

```sql
-- 등록된 크론잡 목록 확인
SELECT * FROM cron.job;

-- 크론잡 실행 이력 확인
SELECT * FROM cron.job_run_details
WHERE jobname = 'abs-fetch-log-hourly'
ORDER BY start_time DESC
LIMIT 10;
```

### 크론잡 삭제 (필요시)

```sql
SELECT cron.unschedule('abs-fetch-log-hourly');
```

---

## 방법 3: 간단한 버전 (인증 없음)

Edge Function을 수정하여 특정 조건에서만 인증 없이 실행되도록 하는 방법입니다.

### Edge Function 수정

`supabase/functions/abs-fetch-log/index.ts`에 다음과 같이 간단한 인증 추가:

```typescript
// 요청 헤더에서 간단한 토큰 확인
const authHeader = req.headers.get('x-cron-token');
const CRON_TOKEN = Deno.env.get('CRON_TOKEN') || 'your-secret-token';

if (authHeader !== CRON_TOKEN) {
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    { status: 401, headers: corsHeaders }
  );
}
```

### 크론잡 설정 (토큰 사용)

```sql
SELECT cron.schedule(
  'abs-fetch-log-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://cwxcvcvjytsecbksgcgp.supabase.co/functions/v1/abs-fetch-log',
    headers := '{"x-cron-token": "your-secret-token"}'::jsonb
  );
  $$
);
```

---

## 테스트

### 수동 테스트

```bash
curl -X POST https://cwxcvcvjytsecbksgcgp.supabase.co/functions/v1/abs-fetch-log \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

### 결과 확인

```sql
SELECT
  request_time,
  COUNT(*) as station_count,
  COUNT(DISTINCT station_id) as unique_stations
FROM abs_fetch_log
GROUP BY request_time
ORDER BY request_time DESC
LIMIT 10;
```

---

## 권장 사항

1. **외부 크론 서비스 사용 (cron-job.org 또는 GitHub Actions)** - 가장 안정적
2. 실패 알림 설정 (크론 서비스에서 제공)
3. 로그 모니터링을 위해 Netlify 페이지 정기적으로 확인

---

## 문제 해결

### 크론잡이 실행되지 않을 때

1. 크론잡 실행 이력 확인:
   ```sql
   SELECT * FROM cron.job_run_details
   WHERE jobname = 'abs-fetch-log-hourly'
   ORDER BY start_time DESC;
   ```

2. pg_net 로그 확인:
   ```sql
   SELECT * FROM net._http_response
   ORDER BY created DESC
   LIMIT 10;
   ```

3. Edge Function 로그 확인:
   ```bash
   supabase functions logs abs-fetch-log
   ```
