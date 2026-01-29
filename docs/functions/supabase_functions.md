# Supabase Functions Documentation

이 문서는 MCP (Marine Collection Platform) 프로젝트에서 사용하는 주요 Supabase Edge Function의 역할과 데이터 흐름을 설명합니다.

---

## 1. get-kma-weather

기상청 단기예보 API를 호출하여 격자 좌표(nx, ny) 기반의 날씨 예보 데이터를 수집하고 `weather_forecasts` 테이블에 저장합니다.

### 읽기 테이블

-   **`tide_weather_region`**: 예보를 조회할 지역의 격자 좌표(`nx`, `ny`)와 지역 코드(`code`), 이름(`name`) 정보를 가져옵니다.
    -   **주요 컬럼**: `code`, `name`, `nx`, `ny`

### 쓰기 테이블

-   **`weather_forecasts`**
    -   **설명**: 기상청 단기예보(3일) 데이터를 저장합니다.
    -   **저장 방식**: `upsert` (데이터가 중복될 경우 덮어쓰기).
    -   **중복 체크 기준**: `fcst_datetime`(예보 시각 UTC)와 `location_code`(지역 코드)의 조합.
    -   **주요 컬럼**:
        -   `nx`, `ny`: 기상청 격자 좌표
        -   `base_date`: 발표 일자 (예: `20251202`)
        -   `base_time`: 발표 시각 (예: `0500`)
        -   `fcst_datetime`: 예보 시각 (UTC)
        -   `fcst_datetime_kr`: 예보 시각 (KST)
        -   `location_code`: 지역 코드 (예: `KO_0001`)
        -   `한글지역명`: 지역 이름
        -   `pop`: 강수 확률 (%)
        -   `pty`: 강수 형태 (코드값)
        -   `pcp`: 1시간 강수량 (mm)
        -   `reh`: 습도 (%)
        -   `sno`: 1시간 신적설 (cm)
        -   `sky`: 하늘 상태 (코드값)
        -   `tmp`: 1시간 기온 (°C)
        -   `tmn`: 일 최저 기온 (°C)
        -   `tmx`: 일 최고 기온 (°C)
        -   `uuu`: 풍속 (동서성분, m/s)
        -   `vvv`: 풍속 (남북성분, m/s)
        -   `wav`: 파고 (M)
        -   `vec`: 풍향 (deg)
        -   `wsd`: 풍속 (m/s)
        -   `updated_at`: 업데이트 시각 (UTC)
        -   `updated_at_kr`: 업데이트 시각 (KST)

-   **`weather_fetch_logs`**
    -   **설명**: 함수 실행 성공/실패 로그를 기록합니다.
    -   **저장 방식**: `insert`
    -   **주요 컬럼**:
        -   `function_name`: 실행된 함수 이름 (예: `get-kma-weather-batch-0`)
        -   `status`: 실행 상태 (`started`, `success`, `failure`)
        -   `records_upserted`: 저장/업데이트된 레코드 수
        -   `error_message`: 에러 발생 시 메시지
        -   `started_at`: 함수 시작 시간
        -   `finished_at`: 함수 종료 시간

---

## 2. fetch-kma-data

기상청 해양관측 API를 호출하여 관측소별 실시간 해양 기상 데이터를 수집하고 `marine_observations` 테이블에 저장합니다.

### 읽기 테이블

-   이 함수는 외부 API에서만 데이터를 가져오므로 직접적으로 읽는 데이터베이스 테이블은 없습니다.

### 쓰기 테이블

-   **`marine_observations`**
    -   **설명**: 기상청의 해양 관측소에서 수집된 실시간 데이터를 저장합니다.
    -   **저장 방식**: `upsert`
    -   **중복 체크 기준**: `station_id`(관측소 ID)와 `observation_time_kst`(관측 시각 KST)의 조합.
    -   **주요 컬럼**:
        -   `station_id`: 관측소 ID
        -   `station_name`: 관측소 이름
        -   `observation_time_kst`: 관측 시각 (KST, `YYYYMMDDHHMI` 형식)
        -   `observation_time_utc`: 관측 시각 (UTC)
        -   `longitude`, `latitude`: 경도, 위도
        -   `significant_wave_height`: 유의 파고 (m)
        -   `wind_direction`: 풍향 (deg)
        -   `wind_speed`: 풍속 (m/s)
        -   `gust_wind_speed`: 돌풍 풍속 (m/s)
        -   `water_temperature`: 수온 (°C)
        -   `air_temperature`: 기온 (°C)
        -   `pressure`: 기압 (hPa)
        -   `humidity`: 습도 (%)

-   **`data_collection_logs`**
    -   **설명**: 함수 실행 로그를 기록합니다.
    -   **저장 방식**: `insert`
    -   **주요 컬럼**:
        -   `function_name`: 실행된 함수 이름 (`fetch-kma-data`)
        -   `collection_time`: 데이터 수집 시간
        -   `target_time`: 조회 대상 데이터 시간
        -   `status`: 실행 상태 (`success`, `no_data`, `error`)
        -   `records_collected`: 수집된 레코드 수
        -   `error_message`: 에러 발생 시 메시지

---

## 3. fetch-weatherapi-data <= 안 쓸것

[WeatherAPI.com](http://WeatherAPI.com) 유료 API를 사용하여 `tide_abs_region` 테이블에 등록된 모든 위치의 현재 및 예보 날씨 데이터를 수집하고 `weatherapi_data` 테이블에 저장합니다.

### 읽기 테이블

-   **`tide_abs_region`**: 날씨를 조회할 대상 지역의 위도(`Latitude`), 경도(`Longitude`), 지역 코드(`Code`) 정보를 가져옵니다.
    -   **주요 컬럼**: `Code`, `Name`, `Latitude`, `Longitude`

### 쓰기 테이블

-   **`weatherapi_data`**
    -   **설명**: WeatherAPI.com에서 수집한 현재, 일별, 시간별 예보 데이터를 저장합니다.
    -   **저장 방식**: `upsert`
    -   **중복 체크 기준**: `location_key`, `observation_time_utc`, `data_type`, `forecast_date`, `forecast_time` 의 조합.
    -   **주요 컬럼**:
        -   `location_key`: 위치 키 (예: `37.57,126.98`)
        -   `code`: 지역 코드 (`tide_abs_region`의 `Code`)
        -   `location_name`: 위치 이름
        -   `observation_time_utc`: 관측/예보 기준 시각 (UTC)
        -   `data_type`: 데이터 종류 (`current`, `forecast`)
        -   `temp_c`: 기온 (°C)
        -   `feelslike_c`: 체감 기온 (°C)
        -   `wind_kph`: 풍속 (kph)
        -   `wind_direction`: 풍향 (방위)
        -   `humidity`: 습도 (%)
        -   `precip_mm`: 강수량 (mm)
        -   `cloud`: 구름 양 (%)
        -   `uv`: 자외선 지수
        -   `air_quality_pm2_5`: 초미세먼지 (PM2.5)
        -   `maxtemp_c`, `mintemp_c`: (일별 예보) 최고/최저 기온
        -   `daily_chance_of_rain`: (일별 예보) 강수 확률

-   **`weatherapi_collection_logs`**
    -   **설명**: 함수 실행 로그를 기록합니다.
    -   **저장 방식**: `insert`
    -   **주요 컬럼**:
        -   `function_name`: 실행된 함수 이름 (`fetch-weatherapi-data`)
        -   `status`: 실행 상태 (`success`, `partial`, `error`)
        -   `records_collected`: 총 수집된 레코드 수
        -   `locations_processed`: 성공적으로 처리된 위치 수
        -   `error_message`: 에러 발생 시 메시지
        -   `started_at`: 함수 시작 시간
        -   `finished_at`: 함수 종료 시간

---

## 4. get-medm-weather

기상청 중기예보(해상, 육상 기온) API를 호출하여 예보 데이터를 수집하고 `medium_term_forecasts` 테이블에 저장합니다.

### 읽기 테이블

- 이 함수는 외부 API에서만 데이터를 가져오므로 직접적으로 읽는 데이터베이스 테이블은 없습니다.
- 코드안에 하드코딩된 지역 - 기상청 지역 매핑 데이터 있음

### 쓰기 테이블

-   **`medium_term_forecasts`**
    -   **설명**: 기상청의 중기(3일~10일) 해상 예보 및 육상 기온 예보 데이터를 저장합니다.
    -   **저장 방식**: `upsert`
    -   **중복 체크 기준**: `reg_id`, `tm_ef`, `mod`, `forecast_type`, `location_code` 의 조합.
    -   **주요 컬럼**:
        -   `reg_id`: 지역 ID
        -   `location_code`: 매핑된 조위 관측소 지역 코드
        -   `forecast_type`: 예보 종류 (`marine` 또는 `temperature`)
        -   `tm_fc_kr`: 예보 발표 시각 (KST)
        -   `tm_ef_kr`: 예보 적용 시각 (KST)
        -   `wh_a`, `wh_b`: 파고 (m) (해상 예보)
        -   `wf`: 날씨 예보 (문자열) (해상 예보)
        -   `sky`: 하늘 상태 (코드값)
        -   `min_temp`, `max_temp`: 최저/최고 기온 (°C) (육상 예보)
        -   `rn_st`: 강수 확률 (%)

  기상청 중기예보 API 엔드포인트

  1. 육상 기온 중기예보 (Temperature)

  https://apihub.kma.go.kr/api/typ01/url/fct_afs_wc.php?disp=1&authKey={인증키}

  2. 해상 중기예보 (Marine)

  https://apihub.kma.go.kr/api/typ01/url/fct_afs_wo.php?disp=1&authKey={인증키}
---

## 5. get-medm-weather-data

특정 지역 코드(`code`)와 날짜(`date`)를 기준으로 단기, 중기 예보 데이터를 종합하여 제공하는 API 함수입니다. 데이터 수집 기능은 없습니다.

### 읽기 테이블

-   **`tide_weather_region`**: 요청된 `code`에 해당하는 중기예보 지역 ID(`marine_reg_id`, `temper_reg_id`)를 조회합니다.
    -   **주요 컬럼**: `code`, `marine_reg_id`, `temper_reg_id`
-   **`weather_forecasts`**: 요청된 `code`와 날짜 범위(요청일로부터 +3일)에 해당하는 단기 예보 데이터를 조회합니다.
    -   **주요 컬럼**: `fcst_datetime_kr`, `tmp`, `tmn`, `tmx`, `sky`, `pty`, `pop`, `wav` 등
-   **`medium_term_forecasts`**: `tide_weather_region`에서 찾은 `marine_reg_id`와 `temper_reg_id`를 사용하여 중기(4일~10일) 해상 및 기온 예보를 조회합니다.
    -   **주요 컬럼**: `tm_ef_kr`, `wh_a`, `wh_b`, `wf`, `min_temp`, `max_temp`, `rn_st` 등

### 쓰기 테이블

- 이 함수는 데이터를 조회하여 반환만 하므로 쓰기 테이블이 없습니다.

---

## 6. get-weather-tide-data

특정 지역(`code`)과 날짜(`date`)를 기준으로 필요한 모든 기상 및 조위 데이터를 종합하여 제공하는 API의 메인 함수입니다.

### 읽기 테이블

-   **`tide_abs_region`**: 요청된 `code`에 해당하는 해양 관측소 ID(`a_STN ID`, `b_STN ID`)를 조회합니다.
-   **`weather_forecasts`**: 단기 예보 데이터를 조회합니다.
-   **`tide_data`**: 14일치 조위(물때) 데이터를 조회합니다.
-   **`marine_observations`**: 실시간 해양 관측 데이터를 조회합니다.
-   **`medium_term_forecasts`**: 중기 해상 및 기온 예보를 조회합니다.
-   **`weatherapi_data`**: WeatherAPI.com의 14일치 시간별 예보 데이터를 조회합니다.

### 쓰기 테이블

- 이 함수는 데이터를 조회하여 반환만 하므로 쓰기 테이블이 없습니다.

---

## 7. cleanup-old-data

데이터베이스에 저장된 오래된 데이터(30일 이상 경과)를 정리하는 유지보수 함수입니다. Cron Job으로 스케줄링되어 주기적으로 실행됩니다.

### 읽기 테이블

- 이 함수는 데이터를 읽지 않고 삭제만 수행합니다.

### 삭제 대상 테이블

다음 10개 테이블에서 30일 이상 경과한 데이터를 삭제합니다:

1. **`analysis_results`**
   - **삭제 기준**: `created_at < now() - interval '30 days'`
   - **설명**: 분석 결과 데이터

2. **`data_collection_logs`**
   - **삭제 기준**: `collection_time < now() - interval '30 days'`
   - **설명**: 데이터 수집 로그

3. **`marine_observations`**
   - **삭제 기준**: `created_at < now() - interval '30 days'`
   - **설명**: 해양 관측 데이터

4. **`medium_term_forecasts`**
   - **삭제 기준**: `tm_fc_kr < now() - interval '30 days'`
   - **설명**: 중기예보 데이터

5. **`openweathermap_collection_logs`**
   - **삭제 기준**: `created_at < now() - interval '30 days'`
   - **설명**: OpenWeatherMap 수집 로그

6. **`openweathermap_data`**
   - **삭제 기준**: `created_at < now() - interval '30 days'`
   - **설명**: OpenWeatherMap 데이터

7. **`weather_fetch_logs`**
   - **삭제 기준**: `created_at < now() - interval '30 days'`
   - **설명**: 날씨 조회 로그

8. **`weather_forecasts`**
   - **삭제 기준**: `updated_at < now() - interval '30 days'`
   - **설명**: 날씨 예보 데이터

9. **`weatherapi_collection_logs`**
   - **삭제 기준**: `created_at < now() - interval '30 days'`
   - **설명**: WeatherAPI 수집 로그

10. **`weatherapi_data`**
    - **삭제 기준**: `updated_at < now() - interval '30 days'`
    - **설명**: WeatherAPI 데이터

### 응답 형식

함수는 다음과 같은 JSON 형식으로 정리 결과를 반환합니다:

```json
{
  "success": true,
  "message": "오래된 데이터 정리 완료",
  "summary": {
    "totalDeleted": 1234,
    "successCount": 10,
    "failureCount": 0,
    "totalTables": 10,
    "retentionDays": 30
  },
  "details": [
    {
      "table": "marine_observations",
      "description": "해양 관측 데이터",
      "success": true,
      "deletedCount": 500
    }
  ],
  "timestamp": "2025-12-12T10:00:00.000Z"
}
```

### 실행 방법

```bash
# 함수 배포
supabase functions deploy cleanup-old-data

# 수동 실행 (테스트)
curl -X POST https://your-project.supabase.co/functions/v1/cleanup-old-data \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Cron Job 설정 (supabase/config.toml에 추가)
# 예: 매일 새벽 2시 실행
```