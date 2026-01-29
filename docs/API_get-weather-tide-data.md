# get-weather-tide-data API 명세

## 개요
통합 날씨 및 조석 데이터를 제공하는 API입니다. 기상청 단기/중기 예보, 해양 관측 데이터, 조석 정보, OpenWeatherMap 예보 데이터를 통합하여 제공합니다.

**버전**: v15
**엔드포인트**: `https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/get-weather-tide-data`
**메서드**: GET
**인증**: Supabase Anon Key (Authorization 헤더)

---

## 요청 파라미터

### Query Parameters

| 파라미터 | 타입 | 필수 | 설명 | 예시 |
|---------|------|------|------|------|
| `code` | string | ✅ | 지역 코드 (locations 테이블 참조) | `DT_0063` |
| `date` | string | ✅ | 조회 시작 날짜 (YYYY-MM-DD) | `2025-12-09` |
| `time` | string | ❌ | 특정 시각 (HHMM, 해양 관측 데이터만 해당) | `1430` |

### 예시 요청
```bash
curl -X GET "https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/get-weather-tide-data?code=DT_0063&date=2025-12-09&time=1430" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

---

## 응답 구조

### 성공 응답 (200 OK)

```json
{
  "weather_forecasts": [...],
  "tide_data": [...],
  "marine_observations": {
    "a": [...],
    "b": [...]
  },
  "marine": [...],
  "temper": [...],
  "openweathermap": {
    "current": [...],
    "forecast": [...]
  }
}
```

---

## 응답 필드 상세

### 1. weather_forecasts
**기상청 단기 예보 데이터 (3일치)**

요청 날짜부터 +2일까지의 날씨 예보 데이터

| 필드 | 타입 | 설명 |
|------|------|------|
| `fcst_datetime_kr` | string | 예보 시각 (KST, YYYY-MM-DD) |
| `tmp` | number | 기온 (°C) |
| `tmn` | number | 최저 기온 (°C) |
| `tmx` | number | 최고 기온 (°C) |
| `uuu` | number | 동서바람성분 (m/s) |
| `vvv` | number | 남북바람성분 (m/s) |
| `vec` | number | 풍향 (도) |
| `wsd` | number | 풍속 (m/s) |
| `sky` | string | 하늘 상태 (1:맑음, 3:구름많음, 4:흐림) |
| `pty` | string | 강수 형태 (0:없음, 1:비, 2:비/눈, 3:눈, 4:소나기) |
| `pop` | number | 강수 확률 (%) |
| `wav` | number | 파고 (m) |
| `pcp` | string | 1시간 강수량 (mm) |
| `reh` | number | 습도 (%) |
| `sno` | string | 1시간 신적설 (cm) |

**데이터 기간**: 요청 날짜 ~ 요청 날짜 +2일

---

### 2. tide_data
**조석 데이터 (14일치)**

| 필드 | 타입 | 설명 |
|------|------|------|
| `obs_date` | string | 관측 날짜 (YYYY-MM-DD) |
| `lvl1` | string | 1차 조석 시각 및 높이 |
| `lvl2` | string | 2차 조석 시각 및 높이 |
| `lvl3` | string | 3차 조석 시각 및 높이 |
| `lvl4` | string | 4차 조석 시각 및 높이 |
| `date_sun` | string | 일출/일몰 시각 |
| `date_moon` | string | 월출/월몰 시각 |
| `mool_normal` | string | 물때 (조석 주기) |
| `mool7` | string | 음력 7일 기준 물때 |
| `mool8` | string | 음력 8일 기준 물때 |

**데이터 기간**: 요청 날짜 ~ 요청 날짜 +13일 (총 14일)

---

### 3. marine_observations
**해양 관측 데이터 (실시간/당일)**

두 개의 관측소(A, B) 데이터를 분리하여 제공

#### 3.1 marine_observations.a
수온 및 파고 중심 관측소

| 필드 | 타입 | 설명 |
|------|------|------|
| `station_id` | string | 관측소 ID |
| `observation_time_kst` | string | 관측 시각 (KST, YYYYMMDDHHmm) |
| `water_temperature` | number | 수온 (°C) |
| `significant_wave_height` | number | 유의파고 (m) |

#### 3.2 marine_observations.b
기상 관측 중심 관측소

| 필드 | 타입 | 설명 |
|------|------|------|
| `station_id` | string | 관측소 ID |
| `observation_time_kst` | string | 관측 시각 (KST, YYYYMMDDHHmm) |
| `air_temperature` | number | 기온 (°C) |
| `wind_direction` | number | 풍향 (도) |
| `wind_speed` | number | 풍속 (m/s) |

**동작 방식**:
- `time` 파라미터 제공 시: 해당 시각 이전 가장 최근 관측 데이터 1건
- `time` 파라미터 미제공 시: 요청 날짜의 모든 관측 데이터

---

### 4. marine
**중기 해상 예보 (4~11일째)**

요청 날짜 +3일부터 +10일까지의 해상 예보 (총 8일)

| 필드 | 타입 | 설명 |
|------|------|------|
| `reg_id` | string | 예보 구역 ID |
| `reg_sp` | string | 예보 구역 상세 |
| `reg_name` | string | 예보 구역 이름 |
| `mod` | string | 예보 모델 |
| `tm_fc` | string | 예보 발표 시각 (UTC) |
| `tm_fc_kr` | string | 예보 발표 시각 (KST) |
| `tm_ef` | string | 예보 유효 시각 (UTC) |
| `tm_ef_kr` | string | 예보 유효 시각 (KST) |
| `wh_a` | number | 파고 범위 시작 (m) |
| `wh_b` | number | 파고 범위 끝 (m) |
| `wf` | string | 날씨 설명 |
| `sky` | string | 하늘 상태 |
| `pre` | string | 강수 정보 |
| `conf` | number | 신뢰도 |
| `rn_st` | number | 강수 시작 확률 (%) |
| `forecast_type` | string | `"marine"` (고정값) |
| `location_code` | string | 지역 코드 |

**데이터 기간**: 요청 날짜 +3일 ~ 요청 날짜 +10일 (총 8일)

---

### 5. temper
**중기 기온 예보 (4~11일째)**

요청 날짜 +3일부터 +10일까지의 기온 예보 (총 8일)

| 필드 | 타입 | 설명 |
|------|------|------|
| `reg_id` | string | 예보 구역 ID |
| `reg_sp` | string | 예보 구역 상세 |
| `reg_name` | string | 예보 구역 이름 |
| `mod` | string | 예보 모델 |
| `tm_fc` | string | 예보 발표 시각 (UTC) |
| `tm_fc_kr` | string | 예보 발표 시각 (KST) |
| `tm_ef` | string | 예보 유효 시각 (UTC) |
| `tm_ef_kr` | string | 예보 유효 시각 (KST) |
| `c` | string | 온도 카테고리 |
| `min_temp` | number | 최저 기온 (°C) |
| `max_temp` | number | 최고 기온 (°C) |
| `min_temp_l` | number | 최저 기온 하한 (°C) |
| `min_temp_h` | number | 최저 기온 상한 (°C) |
| `max_temp_l` | number | 최고 기온 하한 (°C) |
| `max_temp_h` | number | 최고 기온 상한 (°C) |
| `sky` | string | 하늘 상태 |
| `pre` | string | 강수 정보 |
| `conf` | number | 신뢰도 |
| `wf` | string | 날씨 설명 |
| `rn_st` | number | 강수 시작 확률 (%) |
| `forecast_type` | string | `"temperature"` (고정값) |
| `location_code` | string | 지역 코드 |

**데이터 기간**: 요청 날짜 +3일 ~ 요청 날짜 +10일 (총 8일)

---

### 6. openweathermap ⭐ UPDATED (v16)
**OpenWeatherMap 날씨 데이터**

#### 6.1 openweathermap.current
현재 날씨 데이터

| 필드 | 타입 | 설명 |
|------|------|------|
| `observation_time_utc` | string | 관측 시각 (UTC) |
| `observation_time_local` | string | 관측 시각 (Local) |
| `forecast_date` | string | 관측 날짜 (YYYY-MM-DD) |
| `forecast_time` | string | `"00:00:00"` (고정값) |
| `weather_id` | number | OpenWeatherMap 날씨 조건 ID |
| `weather_main` | string | 날씨 주 카테고리 (Rain, Snow, Clouds 등) |
| `weather_description` | string | 날씨 상태 설명 |
| `weather_icon` | string | 날씨 아이콘 코드 |
| `temp` | number | 현재 기온 (°C) |
| `feels_like` | number | 체감 온도 (°C) |
| `pressure` | number | 기압 (hPa) |
| `humidity` | number | 습도 (%) |
| `wind_speed` | number | 풍속 (m/s) |
| `wind_deg` | number | 풍향 (도) |
| `wind_gust` | number | 돌풍 (m/s) |
| `clouds` | number | 구름량 (%) |
| `visibility` | number | 가시거리 (m) |
| `rain_1h` | number | 1시간 강우량 (mm) |
| `snow_1h` | number | 1시간 적설량 (mm) |
| `data_type` | string | `"current"` (고정값) |

**데이터 개수**: 1개 (현재 시각 기준)

#### 6.2 openweathermap.forecast
예보 데이터 (단기 상세 + 장기 일별)

##### 6.2.1 단기 상세 예보 (5 Day / 3 Hour Forecast)
**5일간 3시간 간격 상세 예보 (약 40개)**

| 필드 | 타입 | 설명 |
|------|------|------|
| `observation_time_utc` | string | 예보 시각 (UTC) |
| `observation_time_local` | string | 예보 시각 (Local) |
| `forecast_date` | string | 예보 날짜 (YYYY-MM-DD) |
| `forecast_time` | string | 예보 시각 (00:00:00, 03:00:00, 06:00:00...) |
| `weather_id` | number | 날씨 조건 ID |
| `weather_main` | string | 날씨 주 카테고리 |
| `weather_description` | string | 날씨 상태 설명 |
| `weather_icon` | string | 날씨 아이콘 코드 |
| `temp` | number | 기온 (°C) |
| `feels_like` | number | 체감 온도 (°C) |
| `temp_min` | number | **3시간대 최저** 기온 (°C) |
| `temp_max` | number | **3시간대 최고** 기온 (°C) |
| `pressure` | number | 기압 (hPa) |
| `humidity` | number | 습도 (%) |
| `sea_level` | number | 해면 기압 (hPa) ⭐ |
| `ground_level` | number | 지면 기압 (hPa) ⭐ |
| `wind_speed` | number | 풍속 (m/s) |
| `wind_deg` | number | 풍향 (도) |
| `wind_gust` | number | 돌풍 (m/s) |
| `clouds` | number | 구름량 (%) |
| `visibility` | number | 가시거리 (m) |
| `rain_3h` | number | **3시간 누적** 강우량 (mm) |
| `snow_3h` | number | **3시간 누적** 적설량 (mm) |
| `pop` | number | 강수 확률 (%) |
| `location_country` | string | 국가 코드 (예: "KR") ⭐ |
| `data_type` | string | `"forecast"` |

**데이터 기간**: 5일 (현재 시각 ~ +5일)
**시간 간격**: 3시간마다 (00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00)
**데이터 개수**: 약 40개

##### 6.2.2 장기 일별 예보 (One Call Daily)
**8일간 하루 1회 예보 (8개)**

| 필드 | 타입 | 설명 |
|------|------|------|
| `observation_time_utc` | string | 예보 시각 (UTC) |
| `observation_time_local` | string | 예보 시각 (Local) |
| `forecast_date` | string | 예보 날짜 (YYYY-MM-DD) |
| `forecast_time` | string | `"12:00:00"` (정오 고정) |
| `weather_id` | number | 날씨 조건 ID |
| `weather_main` | string | 날씨 주 카테고리 |
| `weather_description` | string | 날씨 상태 설명 |
| `weather_icon` | string | 날씨 아이콘 코드 |
| `temp` | number | 낮 기온 (°C) |
| `feels_like` | number | 낮 체감 온도 (°C) |
| `temp_min` | number | **하루 전체 최저** 기온 (°C) |
| `temp_max` | number | **하루 전체 최고** 기온 (°C) |
| `pressure` | number | 기압 (hPa) |
| `humidity` | number | 습도 (%) |
| `wind_speed` | number | 풍속 (m/s) |
| `wind_deg` | number | 풍향 (도) |
| `wind_gust` | number | 돌풍 (m/s) |
| `clouds` | number | 구름량 (%) |
| `rain_3h` | number | **하루 총** 강우량 (mm) |
| `snow_3h` | number | **하루 총** 적설량 (mm) |
| `pop` | number | 강수 확률 (%) |
| `sunrise` | string | 일출 시각 (UTC) |
| `sunset` | string | 일몰 시각 (UTC) |
| `data_type` | string | `"forecast"` |

**데이터 기간**: 8일 (현재일 ~ +7일)
**시간**: 정오(12:00) 기준
**데이터 개수**: 8개

#### 구분 방법
```javascript
if (forecast_time === "12:00:00") {
  // 장기 일별 예보: temp_min/max는 하루 전체, rain/snow는 일 총량
} else if (forecast_time === "00:00:00") {
  // 현재 날씨
} else {
  // 단기 상세 예보: temp_min/max는 3시간대, rain/snow는 3시간 누적
}
```

**⭐ 표시**: 단기 상세 예보에만 있는 필드

---

## 데이터 기간 요약

| 데이터 유형 | 기간 | 설명 |
|------------|------|------|
| `weather_forecasts` | 3일 | 요청일 ~ +2일 |
| `tide_data` | 14일 | 요청일 ~ +13일 |
| `marine_observations` | 1일 | 요청일 당일 (또는 특정 시각) |
| `marine` | 8일 | 요청일 +3일 ~ +10일 |
| `temper` | 8일 | 요청일 +3일 ~ +10일 |
| `openweathermap` | 5~8일 | 5일(3시간 간격) + 8일(일별) |

**전체 커버 범위**: 요청일부터 최대 14일간의 날씨/조석 정보

**OpenWeatherMap 상세**:
- 단기 상세 예보: 5일간 3시간 간격 (약 40개)
- 장기 일별 예보: 8일간 하루 1회 (8개)

---

## 에러 응답

### 400 Bad Request
필수 파라미터 누락

```json
{
  "error": "Missing required parameters: code and date are required."
}
```

### 405 Method Not Allowed
GET 이외의 메서드 사용 시

```json
{
  "error": "Method not allowed"
}
```

### 500 Internal Server Error
서버 내부 오류

```json
{
  "error": "An unexpected critical error occurred."
}
```

---

## 변경 이력

### v16 (2025-12-09) - 현재 버전
- **개선**: OpenWeatherMap 예보 데이터 최적화
  - **5 Day / 3 Hour Forecast API** 추가: 5일간 3시간 간격 상세 예보 (약 40개)
  - **One Call API 48h hourly** 제거: 중복 데이터 제거 및 효율성 향상
  - **데이터 구성**:
    - 현재 날씨: 1개
    - 5일 3시간 간격: 40개
    - 8일 일별 예보: 8개
  - **레코드 감소**: 10,146개 → 8,722개 (더 긴 기간을 더 효율적으로 커버)
  - **장점**: 단기(5일)는 상세하게, 장기(8일)는 일별로 제공

### v15 (2025-12-09)
- **변경**: WeatherAPI 데이터 제외 (플래그로 제어)
  - `INCLUDE_WEATHERAPI = false`로 설정
  - `weatherapi` 필드가 응답에서 제거됨
  - 나중에 플래그를 `true`로 변경하여 재활성화 가능

### v14 (2025-12-09)
- **추가**: OpenWeatherMap 데이터 통합
  - `openweathermap.current`: 현재 날씨
  - `openweathermap.forecast`: 시간별 예보

### v13
- **변경**: 해양 관측 데이터에 `station_id` 필드 추가
  - `marine_observations.a`와 `marine_observations.b`에 각각 관측소 ID 포함

---

## 참고 사항

1. **시간대**:
   - 기상청 데이터는 KST (UTC+9) 기준
   - OpenWeatherMap 데이터는 UTC 및 Local 시간 모두 제공

2. **데이터 가용성**:
   - 일부 지역은 특정 데이터 타입을 지원하지 않을 수 있음
   - 지원하지 않는 데이터는 빈 배열(`[]`) 또는 `null` 값으로 반환

3. **성능 최적화**:
   - 병렬 쿼리로 응답 시간 최소화
   - 필요한 필드만 선택하여 데이터 전송량 감소

4. **관측소 매핑**:
   - A 관측소: 수온, 파고 데이터 중심
   - B 관측소: 기온, 풍향/풍속 데이터 중심
   - 지역에 따라 한 개 또는 두 개의 관측소 매핑

5. **중기 예보 공백**:
   - 단기 예보(0~2일)와 중기 예보(3~10일) 사이 1일 공백 존재
   - 전체 기간 커버를 위해 두 예보를 조합 사용 권장
