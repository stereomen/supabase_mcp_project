# get-ad-weather-data API 명세서 (v19)

## 버전 정보
- **최신 버전**: v19 (2026-01-19)
- **주요 변경사항**: 해상관측 정보 구조 변경 - a/b 필드에서 5개 개별 필드(wt, swh, wd, ws, at)로 분리

## 개요
조석 관측소 코드를 기준으로 날씨, 조석, 해상관측, 광고 정보를 통합하여 제공하는 API입니다.

## Endpoint
```
GET /get-ad-weather-data
```

## 인증
- **Client API Key**: `X-Client-API-Key` 헤더 필요
- **Admin Key**: `Authorization: Bearer {SUPABASE_ANON_KEY}` 헤더 허용

## Request Parameters

| 파라미터 | 타입 | 필수 | 설명 | 예시 |
|---------|------|------|------|------|
| `code` | string | O | 조석 관측소 코드 (DT_0001, AD_0001 등) | `DT_0001` |
| `date` | string | O | 조회 날짜 (YYYY-MM-DD 또는 YYYYMMDD) | `2026-01-19` |
| `time` | string | X | 특정 시각 조회 (HHMM 형식, 미제공 시 하루 전체) | `1430` |

### 요청 예시
```bash
curl -X GET "https://your-project.supabase.co/functions/v1/get-ad-weather-data?code=DT_0001&date=2026-01-19&time=1430" \
  -H "X-Client-API-Key: your-client-api-key"
```

## Response Structure

### 기본 구조
```json
{
  "version": "2026-01-19-v1",
  "ads": [...],
  "weather_forecasts": [...],
  "tide_data": [...],
  "marine_observations": {
    "wt": [...],
    "swh": [...],
    "wd": [...],
    "ws": [...],
    "at": [...]
  },
  "marine": [...],
  "temper": [...],
  "openweathermap": {...}
}
```

---

## 1. 광고 데이터 (ads)

해당 조석 관측소에서 활성화된 광고 목록 (우선순위 순 정렬)

```typescript
ads: Array<{
  id: number;
  campaign_name: string;
  partner_name: string;
  image_url: string | null;
  link_url: string;
  display_start_date: string;
  display_end_date: string;
  priority: number;
  matched_station_id: string | null;
  matched_area: string | null;
}>
```

### 예시
```json
{
  "ads": [
    {
      "id": 1,
      "campaign_name": "봄맞이 낚시용품 할인",
      "partner_name": "바다낚시",
      "image_url": "https://storage.supabase.co/ad-images/spring-sale.jpg",
      "link_url": "https://example.com/landing",
      "display_start_date": "2026-01-01",
      "display_end_date": "2026-03-31",
      "priority": 10,
      "matched_station_id": "DT_0001",
      "matched_area": null
    }
  ]
}
```

---

## 2. 단기 날씨 예보 (weather_forecasts)

3일간의 시간별 날씨 예보 데이터 (KMA API)

```typescript
weather_forecasts: Array<{
  fcst_datetime_kr: string;  // KST 타임스탬프
  tmp: number | null;        // 기온 (℃)
  tmn: number | null;        // 최저기온 (℃)
  tmx: number | null;        // 최고기온 (℃)
  uuu: number | null;        // 동서바람성분 (m/s)
  vvv: number | null;        // 남북바람성분 (m/s)
  vec: number | null;        // 풍향 (deg)
  wsd: number | null;        // 풍속 (m/s)
  sky: number | null;        // 하늘상태 (1:맑음, 3:구름많음, 4:흐림)
  pty: number | null;        // 강수형태 (0:없음, 1:비, 2:비/눈, 3:눈, 4:소나기)
  pop: number | null;        // 강수확률 (%)
  wav: number | null;        // 파고 (m)
  pcp: string | null;        // 1시간 강수량 (mm)
  reh: number | null;        // 습도 (%)
  sno: string | null;        // 1시간 신적설 (cm)
}>
```

---

## 3. 조석 데이터 (tide_data)

14일간의 일별 조석 정보

```typescript
tide_data: Array<{
  obs_date: string;          // 날짜 (YYYY-MM-DD)
  lvl1: string | null;       // 만조/간조 시각 1
  lvl2: string | null;       // 만조/간조 시각 2
  lvl3: string | null;       // 만조/간조 시각 3
  lvl4: string | null;       // 만조/간조 시각 4
  date_sun: string | null;   // 일출/일몰 시각
  date_moon: string | null;  // 월출/월몰 시각
  mool_normal: string | null;// 물때 정보
  mool7: string | null;      // 7물 정보
  mool8: string | null;      // 8물 정보
}>
```

---

## 4. 해상 관측 데이터 (marine_observations) ⭐ **v19 변경사항**

### 구조 변경 (v18 → v19)

**기존 구조 (v18 이하)**
```json
{
  "marine_observations": {
    "a": [...],  // 수온, 파고
    "b": [...]   // 풍향, 풍속, 기온
  }
}
```

**신규 구조 (v19)**
```json
{
  "marine_observations": {
    "wt": [...],   // 수온 (Water Temperature)
    "swh": [...],  // 파고 (Significant Wave Height)
    "wd": [...],   // 풍향 (Wind Direction)
    "ws": [...],   // 풍속 (Wind Speed)
    "at": [...]    // 기온 (Air Temperature)
  }
}
```

### 각 필드 상세 정보

#### 4.1. wt (수온 - Water Temperature)
```typescript
wt: Array<{
  station_id: string;           // 관측소 ID
  observation_time_kst: string; // 관측 시각 (YYYYMMDDHHMM)
  water_temperature: number | null; // 수온 (℃)
}>
```

#### 4.2. swh (파고 - Significant Wave Height)
```typescript
swh: Array<{
  station_id: string;
  observation_time_kst: string;
  significant_wave_height: number | null; // 유의파고 (m)
}>
```

#### 4.3. wd (풍향 - Wind Direction)
```typescript
wd: Array<{
  station_id: string;
  observation_time_kst: string;
  wind_direction: number | null; // 풍향 (16방위, 0-15)
}>
```

#### 4.4. ws (풍속 - Wind Speed)
```typescript
ws: Array<{
  station_id: string;
  observation_time_kst: string;
  wind_speed: number | null; // 풍속 (m/s)
}>
```

#### 4.5. at (기온 - Air Temperature)
```typescript
at: Array<{
  station_id: string;
  observation_time_kst: string;
  air_temperature: number | null; // 기온 (℃)
}>
```

### 예시 데이터
```json
{
  "marine_observations": {
    "wt": [
      {
        "station_id": "IE_0062",
        "observation_time_kst": "202601191400",
        "water_temperature": 8.5
      }
    ],
    "swh": [
      {
        "station_id": "IE_0062",
        "observation_time_kst": "202601191400",
        "significant_wave_height": 1.2
      }
    ],
    "wd": [
      {
        "station_id": "TW_0003",
        "observation_time_kst": "202601191400",
        "wind_direction": 4
      }
    ],
    "ws": [
      {
        "station_id": "TW_0003",
        "observation_time_kst": "202601191400",
        "wind_speed": 5.3
      }
    ],
    "at": [
      {
        "station_id": "TW_0003",
        "observation_time_kst": "202601191400",
        "air_temperature": 3.2
      }
    ]
  }
}
```

### 주요 특징
1. **독립적인 관측소**: 각 필드는 서로 다른 해양관측소 데이터를 참조할 수 있음
2. **station_id 포함**: 각 데이터에 출처 관측소 ID가 명시됨
3. **시간 파라미터 동작**:
   - `time` 미제공: 해당 날짜의 모든 관측 데이터 반환 (배열)
   - `time` 제공: 해당 시각 이전의 최신 관측 데이터 1건만 반환

---

## 5. 중기 예보 - 해상 (marine)

11일간의 해상 중기 예보 (KMA API)

```typescript
marine: Array<{
  tm_ef_kr: string;          // 예보 유효 시각 (KST)
  wh_a: string | null;       // 해상 상태 A
  wh_b: string | null;       // 해상 상태 B
  wf: string | null;         // 날씨
  reg_id: string | null;     // 해역 코드
  reg_sp: string | null;     // 해역 영문명
  reg_name: string | null;   // 해역 한글명
}>
```

---

## 6. 중기 예보 - 기온 (temper)

11일간의 기온 중기 예보 (KMA API)

```typescript
temper: Array<{
  tm_ef_kr: string;
  reg_id: string | null;
  reg_sp: string | null;
  reg_name: string | null;
  min_temp: number | null;   // 최저기온 (℃)
  max_temp: number | null;   // 최고기온 (℃)
  min_temp_l: number | null; // 최저기온 하한
  min_temp_h: number | null; // 최저기온 상한
  max_temp_l: number | null; // 최고기온 하한
  max_temp_h: number | null; // 최고기온 상한
  sky: string | null;        // 하늘상태
  pre: string | null;        // 강수확률
  wf: string | null;         // 날씨
  rn_st: number | null;      // 강수확률 (숫자)
}>
```

---

## 7. OpenWeatherMap 예보 (openweathermap)

14일간의 시간별 날씨 예보 (OpenWeatherMap API)

```typescript
openweathermap: {
  forecast: Array<{
    forecast_date: string;     // 날짜 (YYYY-MM-DD)
    forecast_time: string;     // 시각 (HH:MM:SS)
    weather_main: string;      // 날씨 상태 (Rain, Clear 등)
    weather_description: string; // 날씨 설명
    weather_icon: string;      // 아이콘 코드
    temp: number;              // 기온 (℃)
    temp_min: number;          // 최저기온 (℃)
    temp_max: number;          // 최고기온 (℃)
    humidity: number;          // 습도 (%)
    wind_speed: number;        // 풍속 (m/s)
    wind_deg: number;          // 풍향 (도)
    pop: number;               // 강수확률 (0~1)
  }>
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Missing required parameters: code and date are required."
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 429 Too Many Requests
```json
{
  "error": "Too many requests. Please try again later."
}
```

### 500 Internal Server Error
```json
{
  "error": "An unexpected critical error occurred."
}
```

---

## 클라이언트 마이그레이션 가이드 (v18 → v19)

### 기존 코드 (v18)
```javascript
// ❌ 기존 방식 (더 이상 동작하지 않음)
const waterTemp = response.marine_observations.a[0]?.water_temperature;
const waveHeight = response.marine_observations.a[0]?.significant_wave_height;
const windDir = response.marine_observations.b[0]?.wind_direction;
const windSpeed = response.marine_observations.b[0]?.wind_speed;
const airTemp = response.marine_observations.b[0]?.air_temperature;
```

### 신규 코드 (v19)
```javascript
// ✅ 신규 방식
const waterTemp = response.marine_observations.wt[0]?.water_temperature;
const waveHeight = response.marine_observations.swh[0]?.significant_wave_height;
const windDir = response.marine_observations.wd[0]?.wind_direction;
const windSpeed = response.marine_observations.ws[0]?.wind_speed;
const airTemp = response.marine_observations.at[0]?.air_temperature;
```

### 주요 변경사항 체크리스트
- [ ] `marine_observations.a` → `marine_observations.wt`, `marine_observations.swh`
- [ ] `marine_observations.b` → `marine_observations.wd`, `marine_observations.ws`, `marine_observations.at`
- [ ] 각 필드의 `station_id`가 서로 다를 수 있음을 고려
- [ ] 버전 필드 확인: `version === "2026-01-19-v1"`

---

## Rate Limiting
- **제한**: IP당 분당 100회
- **초과 시**: 429 Too Many Requests 응답

---

## Notes
1. 모든 타임스탬프는 KST (UTC+9) 기준입니다.
2. `marine_observations`의 각 필드는 서로 다른 해양관측소 데이터일 수 있습니다.
3. 광고 노출 이벤트는 자동 기록되지 않으며, 클라이언트에서 실제 노출 시 `track-ad-event` API를 호출해야 합니다.
4. 광고 클릭 이벤트는 반드시 클라이언트에서 `track-ad-event` API로 기록해야 합니다.

---

## 관련 문서
- [track-ad-event API](./API_track-ad-event.md)
- [Ad System Deployment Guide](./AD_SYSTEM_DEPLOYMENT_GUIDE.md)
- [KMA API Data Fields](./KMA_API_DATA_FIELDS.md)
