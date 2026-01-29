# fetch-openweather-data

OpenWeatherMap API를 사용하여 날씨 데이터를 수집하는 Supabase Edge Function입니다.

## 📋 개요

이 함수는 tide_abs_region 테이블에 저장된 모든 위치의 날씨 데이터를 수집합니다:
- **현재 날씨**: 실시간 기상 데이터
- **5일 예보**: 3시간 간격 예보 데이터 (40개 시간대)

## 🔑 환경 변수

```bash
OPENWEATHER_API_KEY=your-openweathermap-api-key
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### OpenWeatherMap API Key 발급

1. [OpenWeatherMap](https://openweathermap.org/) 회원가입
2. API Keys 페이지에서 키 발급
3. Free tier: 60 calls/minute, 1,000,000 calls/month

## 📊 수집 데이터

### 현재 날씨 (Current Weather)
- 온도, 체감온도, 최저/최고 온도
- 기압, 습도
- 풍속, 풍향, 돌풍
- 구름량, 가시거리
- 강우량, 적설량
- 일출/일몰 시각

### 예보 데이터 (5-Day Forecast)
- 3시간 간격 예보 (40개 시간대)
- 온도, 체감온도
- 기압, 습도
- 풍속, 풍향
- 구름량, 가시거리
- 강수 확률
- 3시간 강우량/적설량

## 🗄️ 데이터베이스 구조

### openweathermap_data 테이블

```sql
-- 위치 정보
location_code TEXT         -- 조위 관측소 코드
latitude NUMERIC          -- 위도
longitude NUMERIC         -- 경도
timezone_offset INTEGER   -- UTC 오프셋

-- 날씨 정보
weather_id INTEGER        -- 날씨 조건 ID
weather_description TEXT  -- 날씨 설명 (한글)
temp NUMERIC             -- 기온 (°C)
feels_like NUMERIC       -- 체감 온도
wind_speed NUMERIC       -- 풍속 (m/s)
wind_deg INTEGER         -- 풍향 (도)
humidity INTEGER         -- 습도 (%)
clouds INTEGER          -- 구름량 (%)
visibility INTEGER      -- 가시거리 (m)

-- 예보 데이터
pop NUMERIC             -- 강수 확률 (%)
rain_3h NUMERIC         -- 3시간 강우량 (mm)
snow_3h NUMERIC         -- 3시간 적설량 (mm)

-- 메타데이터
data_type TEXT          -- 'current' 또는 'forecast'
forecast_date DATE      -- 예보 날짜
forecast_time TIME      -- 예보 시각
```

## 🚀 배포 및 실행

### 1. 마이그레이션 적용
```bash
supabase db push
```

### 2. 함수 배포
```bash
supabase functions deploy fetch-openweather-data
```

### 3. 환경 변수 설정
```bash
supabase secrets set OPENWEATHER_API_KEY=your-api-key
```

### 4. 함수 실행

#### 기본 실행 (모든 위치 수집)
```bash
curl -X POST https://your-project.supabase.co/functions/v1/fetch-openweather-data \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

#### 예보 없이 현재 날씨만 수집
```bash
curl -X POST https://your-project.supabase.co/functions/v1/fetch-openweather-data \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"includeForecast": false}'
```

#### 특정 위치만 수집
```bash
curl -X POST https://your-project.supabase.co/functions/v1/fetch-openweather-data \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "locations": [
      {"code": "DT_0001", "name": "인천", "lat": 37.4519, "lng": 126.5922}
    ]
  }'
```

## ⏰ 자동 스케줄링

Supabase Cron으로 정기적인 데이터 수집 설정:

```sql
-- 매 시간마다 실행
SELECT cron.schedule(
  'fetch-openweather-hourly',
  '0 * * * *', -- 매시 정각
  $$
  SELECT
    net.http_post(
      url:='https://your-project.supabase.co/functions/v1/fetch-openweather-data',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);
```

## 📈 API Rate Limit

**OpenWeatherMap Free Tier**:
- 60 calls/minute
- 1,000,000 calls/month

**처리 속도 제어**:
- 배치 크기: 5개 위치씩 처리
- 배치 간 대기: 12초 (5개 * 12초 = 60초/분)
- 약 178개 위치 전체 처리 시간: 약 7-8분

## 🔍 로그 확인

```sql
-- 최근 수집 로그
SELECT * FROM openweathermap_collection_logs
ORDER BY started_at DESC
LIMIT 10;

-- 수집 성공률
SELECT
  status,
  COUNT(*) as count,
  AVG(records_collected) as avg_records,
  AVG(locations_processed) as avg_locations
FROM openweathermap_collection_logs
WHERE started_at > NOW() - INTERVAL '7 days'
GROUP BY status;
```

## 📊 데이터 조회

```sql
-- 특정 위치의 최신 현재 날씨
SELECT *
FROM openweathermap_data
WHERE location_code = 'DT_0001'
  AND data_type = 'current'
ORDER BY observation_time_utc DESC
LIMIT 1;

-- 특정 위치의 5일 예보
SELECT
  forecast_date,
  forecast_time,
  temp,
  weather_description,
  pop as rain_probability,
  wind_speed
FROM openweathermap_data
WHERE location_code = 'DT_0001'
  AND data_type = 'forecast'
  AND forecast_date >= CURRENT_DATE
ORDER BY observation_time_utc;

-- 오늘 수집된 데이터 통계
SELECT
  data_type,
  COUNT(*) as total_records,
  COUNT(DISTINCT location_code) as unique_locations
FROM openweathermap_data
WHERE DATE(observation_time_utc) = CURRENT_DATE
GROUP BY data_type;
```

## 🌐 Weather Condition Codes

OpenWeatherMap 날씨 상태 코드:

| 코드 범위 | 설명 |
|----------|------|
| 200-232 | 뇌우 (Thunderstorm) |
| 300-321 | 이슬비 (Drizzle) |
| 500-531 | 비 (Rain) |
| 600-622 | 눈 (Snow) |
| 701-781 | 대기 현상 (Atmosphere - 안개, 연무 등) |
| 800 | 맑음 (Clear) |
| 801-804 | 구름 (Clouds) |

상세 정보: https://openweathermap.org/weather-conditions

## 🔗 관련 함수

- `fetch-weatherapi-data`: WeatherAPI.com 데이터 수집
- `get-kma-weather`: 기상청 단기예보 수집
- `fetch-kma-data`: 기상청 해양 관측 데이터 수집
- `get-medm-weather`: 기상청 중기예보 수집

## 📝 참고사항

1. **API 키 관리**: 환경 변수로 안전하게 관리
2. **Rate Limit**: Free tier 한도 내에서 배치 처리
3. **중복 방지**: UPSERT로 동일 시간대 데이터 중복 방지
4. **재시도 로직**: 실패 시 자동 2회 재시도
5. **에러 로깅**: 모든 수집 작업은 로그 테이블에 기록

## 🐛 트러블슈팅

### API 키 오류
```
Error: OPENWEATHER_API_KEY environment variable is required
```
→ Supabase secrets에 API 키 설정 확인

### Rate Limit 초과
```
Error: OpenWeatherMap request failed: 429
```
→ 배치 크기 줄이기 또는 대기 시간 증가

### 타임아웃
```
Error: OpenWeatherMap request timeout
```
→ 네트워크 연결 확인, 재시도 로직이 자동 처리

## 📧 문의

문제가 발생하면 로그를 확인하고 필요시 Supabase 함수 로그를 검토하세요:
```bash
supabase functions logs fetch-openweather-data
```
