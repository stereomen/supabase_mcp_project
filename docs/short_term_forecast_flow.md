# 단기예보 데이터 처리 흐름도

## 개요

이 문서는 기상청(KMA) 동네예보 API로부터 단기예보 데이터를 수집하고, 저장하며, 외부 API로 제공하는 전체 프로세스를 설명합니다.

**단기예보 범위**: 현재 시점부터 **3일 후**까지 (0~72시간)

---

## 전체 데이터 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│              KMA 동네예보 API (기상청)                            │
│  https://apihub.kma.go.kr/.../VilageFcstInfoService_2.0         │
│  - 초단기실황 (현재 상태)                                          │
│  - 초단기예보 (6시간 예보)                                         │
│  - 단기예보 (3일 예보) ← 이것을 수집                                │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  │ 1. 데이터 수집 (매 3시간, 8회/일)
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│           get-kma-weather (Edge Function)                       │
│  - tide_weather_region에서 전체 지역 조회                        │
│  - 격자 좌표(nx, ny)로 중복 제거                                  │
│  - 각 격자에 대해 KMA API 호출                                    │
│  - location_code별로 데이터 복제                                  │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  │ 2. 데이터 저장 (UPSERT)
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│        weather_forecasts 테이블 (PostgreSQL)                    │
│  - location_code: 지역코드 (DT_XXXX, SO_XXXX)                   │
│  - nx, ny: 격자 좌표                                             │
│  - fcst_datetime: 예보 시각                                      │
│  - 기상 요소: tmp, sky, pty, pop, wav, pcp, reh, sno 등         │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  │ 3. 데이터 조회 (GET)
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│      get-weather-tide-data (Public API)                         │
│  - location_code 기반 조회                                       │
│  - 날짜 범위: 요청일부터 3일                                       │
│  - 시간별 예보 데이터 반환                                         │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  │ 4. API 응답
                  ▼
            ┌─────────────┐
            │  클라이언트  │
            │  (앱/웹)     │
            └─────────────┘
```

---

## 1. 데이터 수집 (get-kma-weather)

### 함수 정보

**파일**: `supabase/functions/get-kma-weather/index.ts`

**실행 주기**: 매 3시간 (하루 8회)

**발표 시간** (KST):
- 02:00, 05:00, 08:00, 11:00, 14:00, 17:00, 20:00, 23:00

**사용 키**: `SUPABASE_SERVICE_ROLE_KEY`

### 발표 시간 계산

**로직**:
```typescript
const PUBLISH_TIMES = [2, 5, 8, 11, 14, 17, 20, 23];

function getLatestBaseDateTime() {
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const currentHourKST = kstNow.getUTCHours();

  // 현재 시각 이전 가장 최근 발표 시간 찾기
  const latestPublishHour = PUBLISH_TIMES
    .slice()
    .reverse()
    .find(hour => hour <= currentHourKST);

  let baseHour;
  let baseDate = new Date(kstNow.getTime());

  if (latestPublishHour !== undefined) {
    baseHour = latestPublishHour.toString().padStart(2, '0') + '00';
  } else {
    // 00:00~01:59 시간대는 전날 23:00 데이터 사용
    baseHour = '2300';
    baseDate.setUTCDate(baseDate.getUTCDate() - 1);
  }

  const baseDateStr = baseDate.getUTCFullYear().toString() +
                      (baseDate.getUTCMonth() + 1).toString().padStart(2, '0') +
                      baseDate.getUTCDate().toString().padStart(2, '0');

  return { baseDate: baseDateStr, baseTime: baseHour };
}
```

**예시**:
- 현재 시각: 15:30 (KST) → 발표 시간: 14:00
- 현재 시각: 01:30 (KST) → 발표 시간: 전날 23:00
- 현재 시각: 11:00 (KST) → 발표 시간: 11:00 (정각에 실행 시)

### 지역 목록 조회

**1. tide_weather_region 테이블에서 전체 지역 조회**:
```typescript
const { data: allLocations } = await supabaseClient
  .from('tide_weather_region')
  .select('code, name, nx, ny');

// 결과 예시:
// [
//   { code: 'DT_0001', name: '인천', nx: 55, ny: 124 },
//   { code: 'DT_0008', name: '안산', nx: 55, ny: 124 },  // 같은 격자
//   { code: 'SO_0536', name: '덕적도', nx: 55, ny: 124 }, // 같은 격자
//   { code: 'DT_0002', name: '평택', nx: 60, ny: 120 },
//   ...
// ]
```

**총 134개 지역** (DT_XXXX 78개 + SO_XXXX 86개)

**2. 격자 좌표(nx, ny)로 중복 제거**:
```typescript
const uniqueGridLocations = new Map();

for (const loc of allLocations) {
  const gridKey = `${loc.nx},${loc.ny}`;

  if (!uniqueGridLocations.has(gridKey)) {
    uniqueGridLocations.set(gridKey, {
      nx: loc.nx,
      ny: loc.ny,
      locations: []
    });
  }

  uniqueGridLocations.get(gridKey).locations.push(loc);
}

const locationsToFetch = Array.from(uniqueGridLocations.values());
// 결과: 고유한 격자 좌표만 (예: 50~70개)
```

**왜 중복 제거?**
- 기상청 API는 격자 좌표(nx, ny)로 데이터 제공
- 여러 location_code가 같은 격자 좌표를 공유
- 같은 격자는 한 번만 API 호출하여 비용/시간 절약

### KMA API 호출

**엔드포인트**:
```
https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/getVilageFcst
```

**요청 파라미터**:
```typescript
const params = new URLSearchParams({
  pageNo: '1',
  numOfRows: '1000',          // 최대 1000개 레코드
  dataType: 'JSON',
  base_date: '20250115',      // 발표 날짜 (YYYYMMDD)
  base_time: '1400',          // 발표 시간 (HHMM)
  nx: '55',                   // 격자 X 좌표
  ny: '124',                  // 격자 Y 좌표
  authKey: KMA_AUTH_KEY
});
```

**배치 처리**:
```typescript
// 격자를 배치로 나눠서 처리 (기본: 10개씩)
const batchSize = 10;
const batchLocations = locationsToFetch.slice(startIndex, startIndex + batchSize);

// 각 격자에 대해 API 호출 (딜레이 추가)
const fetchPromises = batchLocations.map(async (location, index) => {
  // CPU 부하 감소를 위한 딜레이
  if (index > 0) {
    await delay(200 * index);  // 200ms, 400ms, 600ms, ...
  }

  const response = await fetch(`${KMA_API_URL}?${params.toString()}`);
  // 재시도 로직 (최대 3회)
  // ...
});

const results = await Promise.allSettled(fetchPromises);
```

### API 응답 구조

```json
{
  "response": {
    "header": {
      "resultCode": "00",
      "resultMsg": "NORMAL_SERVICE"
    },
    "body": {
      "dataType": "JSON",
      "items": {
        "item": [
          {
            "baseDate": "20250115",
            "baseTime": "1400",
            "category": "TMP",
            "fcstDate": "20250115",
            "fcstTime": "1500",
            "fcstValue": "3",
            "nx": 55,
            "ny": 124
          },
          {
            "baseDate": "20250115",
            "baseTime": "1400",
            "category": "SKY",
            "fcstDate": "20250115",
            "fcstTime": "1500",
            "fcstValue": "3",
            "nx": 55,
            "ny": 124
          },
          // ... 더 많은 데이터
        ]
      },
      "pageNo": 1,
      "numOfRows": 1000,
      "totalCount": 864
    }
  }
}
```

### 기상 요소 (category)

| 코드 | 이름 | 단위 | 설명 |
|------|------|------|------|
| TMP | 기온 | ℃ | 1시간 기온 |
| TMN | 최저기온 | ℃ | 일 최저기온 (06:00 발표) |
| TMX | 최고기온 | ℃ | 일 최고기온 (15:00 발표) |
| UUU | 동서바람성분 | m/s | 동(+)/서(-) 바람 |
| VVV | 남북바람성분 | m/s | 북(+)/남(-) 바람 |
| VEC | 풍향 | deg | 0~360도 |
| WSD | 풍속 | m/s | 1시간 풍속 |
| SKY | 하늘상태 | 코드 | 1:맑음, 3:구름많음, 4:흐림 |
| PTY | 강수형태 | 코드 | 0:없음, 1:비, 2:비/눈, 3:눈, 4:소나기 |
| POP | 강수확률 | % | 0~100 |
| WAV | 파고 | m | 해상 파고 |
| PCP | 1시간 강수량 | mm | 범주: 0.1~1.0, 1.0~30.0, 30.0~50.0, 50.0~ |
| REH | 습도 | % | 0~100 |
| SNO | 1시간 신적설 | cm | 범주: 0.1~1.0, 1.0~5.0, 5.0~ |

### 데이터 변환 및 저장

**1. 시간별/지역별 데이터 집계**:
```typescript
const forecasts = {};

for (const item of items) {
  for (const locInfo of location.locations) {
    const key = `${item.fcstDate}${item.fcstTime}${locInfo.code}`;

    if (!forecasts[key]) {
      // 새로운 시간대 + 지역 조합
      const fcstTimestamp = new Date(
        Date.UTC(
          parseInt(item.fcstDate.substring(0, 4)),
          parseInt(item.fcstDate.substring(4, 6)) - 1,
          parseInt(item.fcstDate.substring(6, 8)),
          parseInt(item.fcstTime.substring(0, 2))
        )
      );

      forecasts[key] = {
        nx: item.nx,
        ny: item.ny,
        base_date: item.baseDate,
        base_time: item.baseTime,
        fcst_datetime: fcstTimestamp.toISOString(),
        fcst_datetime_kr: new Date(fcstTimestamp.getTime() + 9 * 60 * 60 * 1000).toISOString(),
        한글지역명: locInfo.name,
        location_code: locInfo.code,
        updated_at: new Date().toISOString()
      };
    }

    // 기상 요소 추가
    const category = item.category.toLowerCase();
    const value = ['pcp', 'sno'].includes(category)
      ? item.fcstValue  // 문자열 유지 (범주값)
      : Number(item.fcstValue);

    forecasts[key][category] = value;
  }
}
```

**2. UPSERT**:
```typescript
const dataToUpsert = Object.values(forecasts);

// 예시:
// [
//   {
//     location_code: 'DT_0001',
//     한글지역명: '인천',
//     nx: 55, ny: 124,
//     base_date: '20250115', base_time: '1400',
//     fcst_datetime: '2025-01-15T06:00:00.000Z',  // UTC
//     fcst_datetime_kr: '2025-01-15T15:00:00+09:00',  // KST
//     tmp: 3, sky: 3, pty: 0, pop: 20, wav: 0.5, ...
//   },
//   {
//     location_code: 'DT_0008',  // 같은 격자, 다른 지역
//     한글지역명: '안산',
//     nx: 55, ny: 124,
//     // ... 동일한 예보 데이터
//   },
//   // ...
// ]

const { error } = await supabaseClient
  .from('weather_forecasts')
  .upsert(dataToUpsert, {
    onConflict: 'fcst_datetime,location_code'
  });
```

### 배치 체인 처리

**다음 배치 자동 호출**:
```typescript
const nextStartIndex = startIndex + batchSize;

if (nextStartIndex < totalUniqueLocations) {
  // 다음 배치를 자기 자신 호출 (비동기)
  fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      startIndex: nextStartIndex,
      batchSize: batchSize,
      totalRecordsUpserted: newTotalUpserted
    })
  });
}
```

**왜 배치 체인?**
- Edge Function 타임아웃 제한 (일반적으로 5분)
- 50~70개 격자를 한 번에 처리하면 시간 초과
- 10개씩 배치로 나눠서 순차 처리

---

## 2. 데이터 저장 (weather_forecasts 테이블)

### 테이블 스키마

```sql
CREATE TABLE public.weather_forecasts (
  -- 격자 좌표
  nx INTEGER,
  ny INTEGER,

  -- 지역 정보
  한글지역명 TEXT,
  location_code TEXT,

  -- 발표 정보
  base_date TEXT,              -- 발표 날짜 (YYYYMMDD)
  base_time TEXT,              -- 발표 시간 (HHMM)

  -- 예보 시각
  fcst_datetime TIMESTAMPTZ,   -- UTC
  fcst_datetime_kr TIMESTAMPTZ, -- KST

  -- 기온
  tmp NUMERIC,                 -- 기온 (℃)
  tmn NUMERIC,                 -- 최저기온 (℃)
  tmx NUMERIC,                 -- 최고기온 (℃)

  -- 바람
  uuu NUMERIC,                 -- 동서바람성분 (m/s)
  vvv NUMERIC,                 -- 남북바람성분 (m/s)
  vec NUMERIC,                 -- 풍향 (deg)
  wsd NUMERIC,                 -- 풍속 (m/s)

  -- 하늘/강수
  sky NUMERIC,                 -- 하늘상태 (1/3/4)
  pty NUMERIC,                 -- 강수형태 (0/1/2/3/4)
  pop NUMERIC,                 -- 강수확률 (%)
  pcp TEXT,                    -- 1시간 강수량 (범주)

  -- 해상
  wav NUMERIC,                 -- 파고 (m)

  -- 습도/적설
  reh NUMERIC,                 -- 습도 (%)
  sno TEXT,                    -- 1시간 신적설 (범주)

  -- 메타데이터
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  updated_at_kr TIMESTAMPTZ,

  -- 제약조건
  CONSTRAINT weather_forecasts_pkey UNIQUE (fcst_datetime, location_code)
);

-- 인덱스
CREATE INDEX idx_weather_forecasts_location_code
  ON weather_forecasts(location_code);

CREATE INDEX idx_weather_forecasts_fcst_datetime
  ON weather_forecasts(fcst_datetime);
```

### 예시 데이터

```sql
SELECT
  location_code,
  한글지역명,
  fcst_datetime_kr,
  tmp, sky, pty, pop, wav
FROM weather_forecasts
WHERE location_code = 'DT_0001'
  AND fcst_datetime_kr >= '2025-01-15T00:00:00+09:00'
  AND fcst_datetime_kr < '2025-01-18T00:00:00+09:00'
ORDER BY fcst_datetime_kr;
```

**결과**:
```
location_code | 한글지역명 | fcst_datetime_kr         | tmp | sky | pty | pop | wav
--------------|-----------|--------------------------|-----|-----|-----|-----|-----
DT_0001       | 인천      | 2025-01-15T15:00:00+09:00| 3   | 3   | 0   | 20  | 0.5
DT_0001       | 인천      | 2025-01-15T16:00:00+09:00| 2   | 4   | 0   | 30  | 0.6
DT_0001       | 인천      | 2025-01-15T17:00:00+09:00| 1   | 4   | 1   | 60  | 0.8
...
DT_0001       | 인천      | 2025-01-18T14:00:00+09:00| 5   | 1   | 0   | 10  | 0.3
```

### 로그 기록

```typescript
const logPayload = {
  started_at: collectionTime.toISOString(),
  status: 'success',  // 'success' 또는 'failure'
  records_upserted: dataToUpsert.length,
  error_message: null,
  function_name: `get-kma-weather-batch-${startIndex}`,
  finished_at: new Date().toISOString()
};

await supabaseClient
  .from('weather_fetch_logs')
  .insert([logPayload]);
```

---

## 3. 데이터 조회 (get-weather-tide-data)

### API 요청

**엔드포인트**:
```
GET /functions/v1/get-weather-tide-data
```

**쿼리 파라미터**:
```
?code=DT_0001&date=2025-01-15
```

**파라미터 설명**:
- `code` (필수): location_code (DT_XXXX, SO_XXXX)
- `date` (필수): 조회 시작 날짜 (YYYY-MM-DD)

### 쿼리 로직

**날짜 범위 계산**:
```typescript
const startDateKST = date; // '2025-01-15'

// 3일 후 (exclusive)
const weatherEndDateObj = new Date(date);
weatherEndDateObj.setDate(weatherEndDateObj.getDate() + 3);
const weatherExclusiveEndDateKST = weatherEndDateObj.toISOString().split('T')[0];
// '2025-01-18'
```

**데이터베이스 조회**:
```typescript
const { data: weatherResult } = await supabaseClient
  .from('weather_forecasts')
  .select(`
    fcst_datetime_kr,
    tmp, tmn, tmx, uuu, vvv, vec, wsd,
    sky, pty, pop, wav, pcp, reh, sno
  `)
  .eq('location_code', locationCode)      // 'DT_0001'
  .gte('fcst_datetime_kr', startDateKST)  // >= 2025-01-15 00:00
  .lt('fcst_datetime_kr', weatherExclusiveEndDateKST)  // < 2025-01-18 00:00
  .order('fcst_datetime_kr', { ascending: true });
```

**결과**: 2025-01-15 00:00 ~ 2025-01-17 23:00 (3일치, 72시간)

---

## 4. API 응답

### 응답 구조

```json
{
  "weather_forecasts": [
    {
      "fcst_datetime_kr": "2025-01-15T15:00:00+09:00",
      "tmp": 3,
      "tmn": null,
      "tmx": null,
      "uuu": -1.2,
      "vvv": 2.3,
      "vec": 270,
      "wsd": 2.6,
      "sky": 3,
      "pty": 0,
      "pop": 20,
      "wav": 0.5,
      "pcp": "강수없음",
      "reh": 65,
      "sno": "적설없음"
    },
    {
      "fcst_datetime_kr": "2025-01-15T16:00:00+09:00",
      "tmp": 2,
      "sky": 4,
      "pty": 0,
      "pop": 30,
      // ...
    },
    // ... 총 72개 시간대
  ],
  "tide_data": [...],
  "marine_observations": {...},
  "marine": [...],
  "temper": [...]
}
```

### 기상 요소 해석

**하늘상태 (sky)**:
- `1`: 맑음
- `3`: 구름많음
- `4`: 흐림

**강수형태 (pty)**:
- `0`: 없음
- `1`: 비
- `2`: 비/눈
- `3`: 눈
- `4`: 소나기

**강수량 (pcp)**:
- `"강수없음"`
- `"1mm 미만"`
- `"1.0mm"`
- `"30.0~50.0mm"`
- `"50.0mm 이상"`

**적설량 (sno)**:
- `"적설없음"`
- `"1cm 미만"`
- `"1.0cm"`
- `"5.0cm 이상"`

---

## 5. 성능 최적화

### 1. 격자 좌표 중복 제거

**Before**:
```typescript
// 134개 location_code × 1 API 호출 = 134회 API 호출
for (const location of allLocations) {
  await fetch(`${KMA_API_URL}?nx=${location.nx}&ny=${location.ny}`);
}
```

**After**:
```typescript
// 고유 격자 좌표만 (50~70개) × 1 API 호출 = 50~70회 API 호출
const uniqueGrids = deduplicateByGrid(allLocations);
for (const grid of uniqueGrids) {
  await fetch(`${KMA_API_URL}?nx=${grid.nx}&ny=${grid.ny}`);
  // 결과를 grid.locations 모든 location_code에 복제
}
```

**절감**: 약 50% API 호출 감소

### 2. 병렬 API 호출

```typescript
// 10개 격자를 병렬 처리
const fetchPromises = batchLocations.map(async (location, index) => {
  await delay(200 * index);  // 순차 딜레이
  return fetch(KMA_API_URL);
});

const results = await Promise.allSettled(fetchPromises);
```

**이점**: 순차 처리 대비 80% 시간 단축

### 3. 배치 체인 처리

```typescript
// 10개 → 10개 → 10개 → ... (자기 자신 호출)
if (nextStartIndex < totalLocations) {
  fetch(functionUrl, {
    method: 'POST',
    body: JSON.stringify({ startIndex: nextStartIndex })
  });
}
```

**이점**: Edge Function 타임아웃 회피

### 4. 재시도 로직

```typescript
for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    const response = await fetch(KMA_API_URL);
    if (response.ok) return response;
  } catch (e) {
    if (attempt < 3) {
      await delay(1000 + attempt * 500);  // 1.5초, 2초, 2.5초
    }
  }
}
```

**이점**: 일시적 네트워크 오류 극복

---

## 6. 데이터 품질 관리

### 유효성 검사

**1. API 응답 구조 검증**:
```typescript
if (!data || !data.response || !data.response.header) {
  throw new Error('Invalid API response structure');
}

if (data.response.header.resultCode !== '00') {
  throw new Error(`API error: ${data.response.header.resultMsg}`);
}
```

**2. 예보 시각 검증**:
```typescript
const fcstTimestamp = new Date(
  Date.UTC(year, month, day, hour)
);

if (isNaN(fcstTimestamp.getTime())) {
  console.error(`Invalid forecast time: ${item.fcstDate}${item.fcstTime}`);
  continue;
}
```

**3. 기상 요소 값 검증**:
```typescript
const category = item.category.toLowerCase();

// PCP, SNO는 문자열 유지
const value = ['pcp', 'sno'].includes(category)
  ? item.fcstValue
  : Number(item.fcstValue);

if (!['pcp', 'sno'].includes(category) && isNaN(value)) {
  console.warn(`Invalid value for ${category}: ${item.fcstValue}`);
}
```

### 데이터 완정성 확인

**시간별 데이터 개수 확인**:
```sql
SELECT
  DATE(fcst_datetime_kr) AS forecast_date,
  COUNT(*) AS hourly_count
FROM weather_forecasts
WHERE location_code = 'DT_0001'
  AND fcst_datetime_kr >= '2025-01-15T00:00:00+09:00'
  AND fcst_datetime_kr < '2025-01-18T00:00:00+09:00'
GROUP BY DATE(fcst_datetime_kr)
ORDER BY forecast_date;
```

**기대 결과**:
```
forecast_date | hourly_count
--------------|-------------
2025-01-15    | 24
2025-01-16    | 24
2025-01-17    | 24
```

---

## 7. 모니터링

### 로그 분석

**최근 실행 이력**:
```sql
SELECT
  function_name,
  started_at,
  finished_at,
  status,
  records_upserted,
  error_message,
  EXTRACT(EPOCH FROM (finished_at - started_at)) AS duration_seconds
FROM weather_fetch_logs
WHERE function_name LIKE 'get-kma-weather-batch-%'
ORDER BY started_at DESC
LIMIT 20;
```

**배치별 성공률**:
```sql
SELECT
  status,
  COUNT(*) AS count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM weather_fetch_logs
WHERE started_at >= NOW() - INTERVAL '7 days'
GROUP BY status;
```

**평균 처리 시간**:
```sql
SELECT
  AVG(EXTRACT(EPOCH FROM (finished_at - started_at))) AS avg_duration_seconds,
  MAX(EXTRACT(EPOCH FROM (finished_at - started_at))) AS max_duration_seconds
FROM weather_fetch_logs
WHERE status = 'success'
  AND started_at >= NOW() - INTERVAL '7 days';
```

---

## 8. 문제 해결 (Troubleshooting)

### 1. 데이터 수집이 안됨

**증상**: `weather_fetch_logs`에 최근 로그 없음

**확인 사항**:
1. Cron 스케줄 동작 확인
2. `SUPABASE_SERVICE_ROLE_KEY` 환경변수 확인
3. KMA API 키 유효성 확인

**해결**:
```bash
# 수동 실행
curl -X POST \
  "https://your-project.supabase.co/functions/v1/get-kma-weather" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"startIndex": 0, "batchSize": 10}'
```

### 2. 특정 지역 데이터가 없음

**증상**: API 응답에서 특정 location_code 데이터가 빈 배열

**확인**:
```sql
-- 1. tide_weather_region에 등록되어 있는지 확인
SELECT * FROM tide_weather_region WHERE code = 'DT_XXXX';

-- 2. weather_forecasts에 데이터가 있는지 확인
SELECT COUNT(*) FROM weather_forecasts
WHERE location_code = 'DT_XXXX'
  AND fcst_datetime_kr >= NOW() - INTERVAL '1 day';
```

**원인**:
- `tide_weather_region`에 미등록
- 격자 좌표(nx, ny)가 잘못됨
- 최근 데이터 수집 실패

### 3. 일부 시간대 데이터 누락

**증상**: 72시간 중 일부 시간대만 데이터 있음

**확인**:
```sql
SELECT
  fcst_datetime_kr,
  tmp, sky, pty
FROM weather_forecasts
WHERE location_code = 'DT_0001'
  AND fcst_datetime_kr >= '2025-01-15T00:00:00+09:00'
  AND fcst_datetime_kr < '2025-01-18T00:00:00+09:00'
ORDER BY fcst_datetime_kr;
```

**원인**:
- KMA API 응답에 해당 시간대 데이터 없음 (드물게 발생)
- UPSERT 충돌로 일부 레코드 누락
- 배치 체인 중단

**해결**:
- 다음 수집 주기(3시간 후) 대기
- 수동으로 함수 재실행

### 4. API 호출 실패 (403 Forbidden)

**증상**: `weather_fetch_logs`에 "KMA API request failed: 403" 에러

**원인**:
- API 키 만료
- 일일 호출 한도 초과
- IP 차단

**해결**:
1. KMA API 키 갱신
2. 환경변수 `KMA_AUTH_KEY` 업데이트
3. 함수 재배포: `supabase functions deploy get-kma-weather`

---

## 9. 배포 및 설정

### 환경 변수

```bash
# .env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
KMA_AUTH_KEY=your-kma-api-key
```

### 함수 배포

```bash
# 배포
supabase functions deploy get-kma-weather

# 로그 확인
supabase functions logs get-kma-weather

# 환경 변수 설정
supabase secrets set KMA_AUTH_KEY=your-kma-api-key
```

### Cron 설정

```yaml
# supabase/functions/cron.yaml (예상)
functions:
  get-kma-weather:
    # 매 3시간마다 (발표 시간에 맞춰)
    schedule: "0 2,5,8,11,14,17,20,23 * * *"
    body:
      startIndex: 0
      batchSize: 10
```

---

## 10. 참고 자료

### 관련 파일
- `supabase/functions/get-kma-weather/index.ts`: 데이터 수집
- `supabase/functions/get-weather-tide-data/index.ts`: 데이터 조회 API
- `supabase/migrations/20250826000000_sync_current_schema.sql`: 스키마

### 외부 API
- 기상청 동네예보 API: `https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/getVilageFcst`
- 응답 형식: JSON
- 인증: `authKey` 파라미터

### 기상청 격자 좌표 변환
- 위경도 ↔ 격자(nx, ny) 변환 필요
- 변환 공식: 기상청 문서 참조
- 현재는 `tide_weather_region` 테이블에 사전 변환된 값 저장

---

## 버전 이력

- **v1.0** (2025-01-15): 초기 문서 작성
- 배치 체인 처리 방식
- 격자 좌표 중복 제거 최적화
- 3일(72시간) 예보 데이터 제공

---

**작성일**: 2025-01-15
**최종 수정**: 2025-01-15
