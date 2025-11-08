# Supabase 함수별 지역코드 사용 가이드

## 개요

이 문서는 Supabase Edge Functions에서 사용하는 지역코드(DT_XXXX, SO_XXXX 형식)의 관리 및 활용 방법을 설명합니다.

### 지역코드 체계

1. **DT_XXXX**: 조위(tide) 관측소 지역코드 (78개 지역)
2. **SO_XXXX**: 해양 관측소 지역코드 (86개 지역)
3. **총 134개** 지역코드가 시스템에 등록되어 있음

---

## 데이터베이스 테이블 구조

### 1. tide_weather_region (지역 마스터 테이블)

**역할**: 전체 134개 지역의 메타데이터를 저장하는 중앙 테이블

**컬럼 구조**:
- `code`: 지역코드 (Primary Key) - DT_XXXX 또는 SO_XXXX 형식
- `name`: 지역명 (한글)
- `nx`, `ny`: 기상청 격자 좌표 (단기예보용)
- `marine_reg_id`: 중기 해상예보 지역 ID (예: 12A10000)
- `marine_reg_sp`: 해상예보 구분 ('I'=해상)
- `marine_reg_name`: 해상예보 지역명 (예: '서해북부')
- `temper_reg_id`: 중기 육상예보 지역 ID (예: 11B20201)
- `temper_reg_sp`: 육상예보 구분 ('C'=도시)
- `temper_reg_name`: 육상예보 지역명 (예: '인천')
- `division`: 행정구역 (예: '수도권', '강원영동')

**데이터 소스**: `supabase/migrations/20250901145111_update_tide_weather_region_table.sql`에 134개 지역의 INSERT 문으로 하드코딩

**예시 데이터**:
```sql
('DT_0001', '인천', 0, 0, '12A10000', 'I', '서해북부', '11B20201', 'C', '인천', '수도권')
('SO_0536', '덕적도', 0, 0, '12A10000', 'I', '서해북부', '11B20201', 'C', '인천', '수도권')
```

---

### 2. tide_abs_region (해양관측소 매핑 테이블)

**역할**: 조위 관측소별로 가장 가까운 해양 관측소(a, b) 정보를 저장

**컬럼 구조**:
- `Code`: 조위 지역코드 (DT_XXXX 또는 SO_XXXX)
- `Name`: 관측소명
- `Latitude`, `Longitude`: 조위 관측소 좌표
- `a_STN ID`: A 해양관측소 station_id
- `a_지역명(한글)`, `a_위도(LAT)`, `a_경도(LON)`, `a_제공 정보`
- `b_STN ID`: B 해양관측소 station_id
- `b_위도(LAT)`, `b_경도(LON)`, `b_제공 정보`

**용도**: `get-weather-tide-data` 함수에서 해양 관측 데이터를 조회할 때 사용

---

### 3. medium_term_forecasts (중기예보 데이터 테이블)

**역할**: 기상청 중기예보 데이터를 저장 (3~10일 예보)

**주요 컬럼**:
- `reg_id`: 기상청 예보 지역 ID (예: 11B20201, 12A10000)
- `reg_sp`: 지역 구분 ('A'=광역, 'C'=도시, 'I'=해상)
- `reg_name`: 지역명
- `forecast_type`: 예보 타입 ('marine', 'temperature', 'land')
- `location_code`: **성능 최적화를 위해 추가된 컬럼** (DT_XXXX, SO_XXXX)
- `tm_fc`, `tm_fc_kr`: 발표시각 (UTC, KST)
- `tm_ef`, `tm_ef_kr`: 예보시각 (UTC, KST)
- 기온/해상 데이터 컬럼들 (min_temp, max_temp, wh_a, wh_b 등)

**UNIQUE 제약조건**: `(reg_id, tm_ef, mod, forecast_type, location_code)`

**인덱스**:
- `idx_medium_term_forecasts_location_code`
- `idx_medium_term_forecasts_location_code_type_date` (location_code, forecast_type, tm_ef)

---

### 4. weather_forecasts (단기예보 데이터 테이블)

**역할**: 기상청 단기예보 데이터 저장 (0~3일 예보)

**주요 컬럼**:
- `location_code`: 지역코드 (DT_XXXX, SO_XXXX)
- `nx`, `ny`: 격자 좌표
- `한글지역명`: 지역명
- `fcst_datetime`, `fcst_datetime_kr`: 예보시각 (UTC, KST)
- 기상 요소들 (tmp, sky, pty, pop, wav, pcp 등)

**UNIQUE 제약조건**: `(fcst_datetime, location_code)`

---

### 5. tide_data (조위 데이터 테이블)

**역할**: 조위(물때) 데이터 저장 (14일치)

**주요 컬럼**:
- `location_code`: 지역코드
- `location_name`: 지역명
- `obs_date`: 관측 날짜
- `obs_post_name`: 관측소명
- `lvl1`, `lvl2`, `lvl3`, `lvl4`: 조위 레벨 정보
- `date_sun`, `date_moon`: 일출/월출 정보
- `mool_normal`, `mool7`, `mool8`: 물때 정보

**UNIQUE 제약조건**: `(obs_date, obs_post_name)`

---

### 6. marine_observations (해양 관측 데이터 테이블)

**역할**: 실시간 해양 기상 관측 데이터 저장

**주요 컬럼**:
- `station_id`: 관측소 ID (숫자)
- `station_name`: 관측소명
- `observation_time_kst`, `observation_time_utc`: 관측시각
- `significant_wave_height`: 파고
- `wind_direction`, `wind_speed`: 풍향/풍속
- `water_temperature`, `air_temperature`: 수온/기온
- `pressure`, `humidity`: 기압/습도

**특징**: `location_code`를 직접 저장하지 않고 `station_id`로 식별

---

## 함수별 지역코드 사용 방법

### 1. get-kma-weather (단기예보 수집)

**경로**: `supabase/functions/get-kma-weather/index.ts`

**지역코드 소스**:
- `tide_weather_region` 테이블에서 전체 지역 조회
- 컬럼: `code`, `name`, `nx`, `ny`

**처리 로직**:
```typescript
// 1. 테이블에서 지역 목록 조회
const { data: allLocations } = await supabaseClient
  .from('tide_weather_region')
  .select('code, name, nx, ny');

// 2. 격자 좌표(nx, ny)로 중복 제거
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

// 3. 각 격자에 대해 KMA API 호출
// 4. 응답 데이터를 location_code별로 복제하여 저장
for (const locInfo of location.locations) {
  forecasts[key] = {
    location_code: locInfo.code,  // DT_XXXX 또는 SO_XXXX
    한글지역명: locInfo.name,
    // ... 기상 데이터
  };
}

// 5. weather_forecasts 테이블에 upsert
await supabaseClient.from('weather_forecasts').upsert(dataToUpsert, {
  onConflict: 'fcst_datetime,location_code'
});
```

**지역코드 저장 방식**:
- `weather_forecasts.location_code` 컬럼에 직접 저장
- 같은 격자(nx, ny)를 공유하는 여러 location_code에 대해 동일한 예보 데이터를 중복 저장

---

### 2. fetch-kma-data (해양 관측 데이터 수집)

**경로**: `supabase/functions/fetch-kma-data/index.ts`

**지역코드 사용**:
- KMA API에서 `station_id`로 데이터 수집
- **지역코드를 직접 사용하지 않음**
- `marine_observations` 테이블에 `station_id`로 저장

**처리 로직**:
```typescript
// 1. KMA API 호출 (전체 관측소 데이터)
const apiUrl = `${KMA_API_ENDPOINT}?tm=${requestTime}&stn=0`;

// 2. CSV 파싱하여 station_id별로 데이터 추출
const [obsType, tm, stnIdStr, stnKo, ...] = parts;
const stationId = parseInt(stnIdStr, 10);

// 3. marine_observations 테이블에 저장
const dataToInsert = {
  station_id: stationId,  // 숫자 station_id
  station_name: stnKo,
  observation_time_kst: tm,
  // ... 관측 데이터
};

await supabaseClient.from('marine_observations').upsert(observationsToInsert, {
  onConflict: 'station_id,observation_time_kst'
});
```

**중요**: 이 함수는 location_code가 아닌 station_id를 사용합니다.

---

### 3. get-medm-weather (중기예보 수집)

**경로**: `supabase/functions/get-medm-weather/index.ts`

**지역코드 소스**:
- **함수 내부에 하드코딩된 매핑 테이블** 사용
- `getLocationCodeMapping()` 함수에서 반환

**매핑 구조**:
```typescript
function getLocationCodeMapping() {
  return {
    marine: {
      '12A10000': ['DT_0001', 'DT_0008', 'DT_0017', ...],
      '12A20000': ['DT_0002', 'DT_0018', ...],
      // ... 전체 8개 해상 지역
    },
    temperature: {
      '11B20201': ['DT_0001', 'DT_0038', 'SO_0554', ...],
      '11B20605': ['DT_0002'],
      // ... 전체 46개 육상 지역
    }
  };
}
```

**처리 로직**:
```typescript
// 1. KMA API에서 중기예보 데이터 수집
const forecastData = await fetchMediumTermForecast('marine', authKey);
// 응답에 포함된 REG_ID 예시: 12A10000, 11B20201

// 2. 각 REG_ID를 location_code로 변환
const locationMapping = getLocationCodeMapping();
const mappingType = item.forecast_type === 'marine' ? 'marine' : 'temperature';
const locationCodes = locationMapping[mappingType][item.REG_ID] || [];

// 3. 각 location_code별로 데이터 생성 (중복 저장)
for (const locationCode of locationCodes) {
  processedData.push({
    reg_id: item.REG_ID,          // 12A10000
    location_code: locationCode,   // DT_0001, DT_0008, ...
    forecast_type: item.forecast_type,
    // ... 예보 데이터
  });
}

// 4. medium_term_forecasts 테이블에 upsert
await supabase.from('medium_term_forecasts').upsert(processedData, {
  onConflict: 'reg_id,tm_ef,mod,forecast_type,location_code'
});
```

**지역 정보 소스**:
- `getRegionInfo()` 함수 내부에 **223개 지역 정보를 하드코딩**
- REG_ID, REG_SP, REG_NAME 정보 포함

**하드코딩 이유**:
- 파일 경로 문제 회피
- Deno Edge Runtime에서 파일 시스템 접근 제한

---

### 4. get-weather-tide-data (통합 데이터 조회 API)

**경로**: `supabase/functions/get-weather-tide-data/index.ts`

**지역코드 입력**:
- 쿼리 파라미터로 `code` 받음
- 예: `?code=DT_0001&date=2025-01-15&time=1200`

**처리 로직**:
```typescript
// 1. 입력값 파싱
const locationCode = params.get('code');  // 'DT_0001'
const date = params.get('date');          // '2025-01-15'
const time = params.get('time');          // '1200' (선택)

// 2. tide_abs_region에서 station_id 조회
const { data: absRegionResult } = await supabaseClient
  .from('tide_abs_region')
  .select('"a_STN ID", "b_STN ID"')
  .eq('Code', locationCode)
  .single();

const stationIdA = absRegionResult['a_STN ID'];
const stationIdB = absRegionResult['b_STN ID'];

// 3. 병렬로 여러 테이블 조회
const [weatherResult, tideResult, marineObsA, marineObsB, marineResult, temperResult] =
  await Promise.all([
    // 단기예보 (location_code로 조회)
    supabaseClient.from('weather_forecasts')
      .select('...')
      .eq('location_code', locationCode),

    // 조위 데이터 (location_code로 조회)
    supabaseClient.from('tide_data')
      .select('...')
      .eq('location_code', locationCode),

    // 해양 관측 A (station_id로 조회)
    supabaseClient.from('marine_observations')
      .select('...')
      .eq('station_id', stationIdA),

    // 해양 관측 B (station_id로 조회)
    supabaseClient.from('marine_observations')
      .select('...')
      .eq('station_id', stationIdB),

    // 중기 해상예보 (location_code로 직접 조회 - 최적화!)
    supabaseClient.from('medium_term_forecasts')
      .select('...')
      .eq('location_code', locationCode)
      .eq('forecast_type', 'marine'),

    // 중기 기온예보 (location_code로 직접 조회 - 최적화!)
    supabaseClient.from('medium_term_forecasts')
      .select('...')
      .eq('location_code', locationCode)
      .eq('forecast_type', 'temperature')
  ]);

// 4. 통합 응답 반환
return {
  weather_forecasts: weatherResult.data,
  tide_data: tideResult.data,
  marine_observations: { a: marineObsA.data, b: marineObsB.data },
  marine: marineResult.data,
  temper: temperResult.data
};
```

**핵심 최적화**:
- `medium_term_forecasts.location_code` 컬럼 활용
- `tide_weather_region` 테이블과의 JOIN 제거
- 쿼리 성능 20% 향상 (5개 → 4개 쿼리 감소)

---

### 5. get-medm-weather-data (중기예보 조회 API)

**경로**: `supabase/functions/get-medm-weather-data/index.ts`

**지역코드 사용**:
- 쿼리 파라미터로 `code` 받음
- **tide_weather_region 테이블 JOIN 사용** (구버전 방식)

**처리 로직**:
```typescript
// 1. 입력값 파싱
const code = params.get('code');  // 'DT_0001'
const date = params.get('date');  // '2025-01-15'

// 2. tide_weather_region에서 reg_id 조회
const { data: regionData } = await supabase
  .from('tide_weather_region')
  .select('marine_reg_id, temper_reg_id')
  .eq('code', code)
  .single();

// marine_reg_id = '12A10000', temper_reg_id = '11B20201'

// 3. reg_id로 중기예보 조회
const [marineResult, temperResult] = await Promise.all([
  supabase.from('medium_term_forecasts')
    .select('...')
    .eq('reg_id', marine_reg_id)  // 12A10000
    .eq('forecast_type', 'marine'),

  supabase.from('medium_term_forecasts')
    .select('...')
    .eq('reg_id', temper_reg_id)  // 11B20201
    .eq('forecast_type', 'temperature')
]);
```

**비교**: `get-weather-tide-data`와 달리 `location_code` 직접 조회를 사용하지 않음

---

### 6. import-tide-data (조위 데이터 임포트)

**경로**: `supabase/functions/import-tide-data/index.ts`

**지역코드 소스**:
- Supabase Storage에 저장된 JSON 파일
- 경로: `tidedatadb.tidedata.json/Results_ tideDataDB.tideData.json`

**처리 로직**:
```typescript
// 1. Storage에서 JSON 다운로드
const { data: fileData } = await supabaseClient.storage
  .from('tidedatadb.tidedata.json')
  .download('Results_ tideDataDB.tideData.json');

// 2. JSON 파싱 및 location_code 추출
const rawData = JSON.parse(jsonContent);
for (const entry of rawData) {
  const locationCode = entry.location?.code;  // 'DT_0001'
  const locationName = entry.location?.name;  // '인천'

  for (const tideItem of entry.tideData) {
    dataToInsert.push({
      location_code: locationCode,
      location_name: locationName,
      obs_date: tideItem.date,
      lvl1: tideItem.data?.lvl1,
      // ... 조위 데이터
    });
  }
}

// 3. tide_data 테이블에 upsert
await supabaseClient.from('tide_data').upsert(dataToInsert, {
  onConflict: 'obs_date,obs_post_name'
});
```

---

### 7. check-region-overlap (지역 중복 분석 도구)

**경로**: `supabase/functions/check-region-overlap/index.ts`

**용도**: 개발/디버깅용 - 예보 유형별 지역 중복 분석

**처리 로직**:
```typescript
// 1. medium_term_forecasts 테이블에서 reg_id 통계
const { data: typeCounts } = await supabase
  .from('medium_term_forecasts')
  .select('forecast_type, reg_id')
  .in('forecast_type', ['land', 'temperature', 'marine']);

// 2. 각 예보 유형별 고유 지역 개수 계산
const stats = {};
typeCounts?.forEach(row => {
  if (!stats[row.forecast_type]) {
    stats[row.forecast_type] = new Set();
  }
  stats[row.forecast_type].add(row.reg_id);
});

// 3. 중복 지역 분석
const overlaps = {
  temperature_land: [...allTempRegions].filter(id => allLandRegions.has(id)),
  temperature_marine: [...allTempRegions].filter(id => allMarineRegions.has(id)),
  // ...
};

// 4. 지역 코드 패턴 분석 (접두사별)
patterns[type][prefix].push(regId);  // '11B', '12A' 등
```

---

## 지역코드 매핑 관계도

```
tide_weather_region (중앙 테이블)
├── code (PK): DT_XXXX, SO_XXXX
├── marine_reg_id → medium_term_forecasts.reg_id (해상)
├── temper_reg_id → medium_term_forecasts.reg_id (육상)
└── nx, ny → 기상청 격자 좌표

tide_abs_region
├── Code: DT_XXXX, SO_XXXX
├── a_STN ID → marine_observations.station_id
└── b_STN ID → marine_observations.station_id

weather_forecasts
└── location_code: DT_XXXX, SO_XXXX (직접 저장)

medium_term_forecasts
├── reg_id: 11BXXXXX, 12AXXXXX (KMA 지역 ID)
└── location_code: DT_XXXX, SO_XXXX (성능 최적화용 복제)

tide_data
└── location_code: DT_XXXX, SO_XXXX (직접 저장)

marine_observations
└── station_id: 숫자 (location_code 사용 안함)
```

---

## 지역코드 관리 워크플로우

### 데이터 수집 (Scheduled Functions)

1. **fetch-kma-data** (매 30분마다)
   - KMA API → `marine_observations` (station_id로 저장)

2. **get-kma-weather** (매 3시간마다)
   - `tide_weather_region` 조회 → KMA API 호출
   - → `weather_forecasts` (location_code로 저장)

3. **get-medm-weather** (하루 2회)
   - 하드코딩 매핑 → KMA API 호출
   - → `medium_term_forecasts` (reg_id + location_code 저장)

### 데이터 조회 (API Functions)

1. **get-weather-tide-data** (클라이언트 메인 API)
   - Input: `code` (DT_XXXX, SO_XXXX)
   - 5~6개 테이블 병렬 조회
   - `location_code` 직접 사용 (최적화)

2. **get-medm-weather-data** (구버전 API)
   - Input: `code` (DT_XXXX, SO_XXXX)
   - `tide_weather_region` JOIN 사용 (레거시)

---

## 성능 최적화 이력

### 2025년 9월 4일: location_code 컬럼 추가

**Before**:
```sql
-- tide_weather_region과 JOIN 필요
SELECT mtf.*
FROM medium_term_forecasts mtf
JOIN tide_weather_region twr
  ON mtf.reg_id = twr.marine_reg_id
WHERE twr.code = 'DT_0001';
```

**After**:
```sql
-- 직접 조회 (20% 성능 향상)
SELECT *
FROM medium_term_forecasts
WHERE location_code = 'DT_0001'
  AND forecast_type = 'marine';
```

**마이그레이션**: `20250904000000_add_location_code_to_medium_term_forecasts.sql`

**인덱스 추가**:
- `idx_medium_term_forecasts_location_code`
- `idx_medium_term_forecasts_location_code_type_date`

---

## 지역코드 목록

### DT 코드 (조위 관측소, 78개)

| 코드 | 지역명 | 해상구역 | 육상구역 | 행정구역 |
|------|--------|----------|----------|----------|
| DT_0001 | 인천 | 서해북부 (12A10000) | 인천 (11B20201) | 수도권 |
| DT_0002 | 평택 | 서해중부 (12A20000) | 평택 (11B20605) | 수도권 |
| DT_0003 | 영광 | 서해남부 (12A30000) | 영광 (21F20102) | 서남해안 |
| DT_0004 | 제주 | 제주도해상 (12B10500) | 제주 (11G00201) | 제주도 |
| DT_0005 | 부산 | 남해동부 (12B20000) | 부산 (11H20201) | 경상남도 |
| ... | ... | ... | ... | ... |

(전체 78개 - 마이그레이션 파일 참조)

### SO 코드 (해양 관측소, 86개)

| 코드 | 지역명 | 해상구역 | 육상구역 | 행정구역 |
|------|--------|----------|----------|----------|
| SO_0326 | 미조항 | 남해동부 (12B20000) | 남해 (11H20405) | 경상남도 |
| SO_0536 | 덕적도 | 서해북부 (12A10000) | 인천 (11B20201) | 수도권 |
| SO_0537 | 벽파진 | 서해남부 (12A30000) | 진도 (21F20201) | 서남해안 |
| ... | ... | ... | ... | ... |

(전체 86개 - 마이그레이션 파일 참조)

---

## 지역 ID 체계 설명

### KMA 중기예보 지역 ID (REG_ID)

**육상 지역** (11로 시작):
- `11B20201`: 인천 (C=도시)
- `11G00201`: 제주 (C=도시)
- `11H20201`: 부산 (C=도시)

**해상 지역** (12로 시작):
- `12A10000`: 서해북부 (I=해상)
- `12A20000`: 서해중부 (I=해상)
- `12A30000`: 서해남부 (I=해상)
- `12B10000`: 남해서부 (I=해상)
- `12B10500`: 제주도해상 (I=해상)
- `12B20000`: 남해동부 (I=해상)
- `12C10000`: 동해남부 (I=해상)
- `12C20000`: 동해중부 (I=해상)

**REG_SP 구분**:
- `A`: 광역 (예: '충청도', '전라도')
- `C`: 도시 (예: '인천', '부산')
- `I`: 해상 (예: '서해북부', '남해동부')

---

## 개발 가이드

### 새로운 지역 추가 시

1. **tide_weather_region 테이블 업데이트**
   ```sql
   INSERT INTO tide_weather_region (
     code, name, nx, ny,
     marine_reg_id, marine_reg_sp, marine_reg_name,
     temper_reg_id, temper_reg_sp, temper_reg_name,
     division
   ) VALUES ('DT_XXXX', '지역명', 0, 0, ...);
   ```

2. **get-medm-weather 함수 매핑 업데이트**
   - `getLocationCodeMapping()` 함수에 매핑 추가
   - `marineMapping` 또는 `temperMapping` 배열에 location_code 추가

3. **tide_abs_region 테이블 업데이트** (필요 시)
   - 조위 관측소의 경우 a/b station_id 매핑 추가

### 지역코드 유효성 검증

```typescript
// API 함수에서 사용하는 패턴
const locationCode = params.get('code');

// 패턴 검증
if (!/^(DT|SO)_\d{4}$/.test(locationCode)) {
  return new Response(
    JSON.stringify({ error: 'Invalid location code format' }),
    { status: 400 }
  );
}

// 존재 여부 확인
const { data: region } = await supabase
  .from('tide_weather_region')
  .select('code')
  .eq('code', locationCode)
  .single();

if (!region) {
  return new Response(
    JSON.stringify({ error: 'Location code not found' }),
    { status: 404 }
  );
}
```

---

## 문제 해결 (Troubleshooting)

### 1. 특정 지역코드에 대한 데이터가 없음

**원인**:
- `tide_weather_region`에는 등록되어 있으나, 실제 데이터 수집이 안된 경우
- `get-medm-weather`의 매핑에서 누락된 경우

**확인 방법**:
```sql
-- 1. tide_weather_region에 존재하는지 확인
SELECT * FROM tide_weather_region WHERE code = 'DT_XXXX';

-- 2. weather_forecasts에 데이터가 있는지 확인
SELECT COUNT(*) FROM weather_forecasts WHERE location_code = 'DT_XXXX';

-- 3. medium_term_forecasts에 데이터가 있는지 확인
SELECT COUNT(*) FROM medium_term_forecasts WHERE location_code = 'DT_XXXX';
```

### 2. 중기예보 데이터가 특정 location_code에 없음

**원인**: `get-medm-weather` 함수의 매핑 테이블에서 누락

**해결**:
1. 함수 코드에서 `getLocationCodeMapping()` 확인
2. 해당 `reg_id`에 `location_code` 추가
3. 함수 재배포: `supabase functions deploy get-medm-weather`
4. 수동 실행으로 데이터 수집: 함수 트리거

### 3. 해양 관측 데이터가 없음

**원인**: `tide_abs_region`에 station_id 매핑이 없음

**해결**:
```sql
-- 매핑 확인
SELECT "Code", "a_STN ID", "b_STN ID"
FROM tide_abs_region
WHERE "Code" = 'DT_XXXX';

-- 매핑 추가 (필요 시)
UPDATE tide_abs_region
SET "a_STN ID" = '12345', "b_STN ID" = '67890'
WHERE "Code" = 'DT_XXXX';
```

---

## 참고 자료

### 관련 마이그레이션 파일
- `20250826000000_sync_current_schema.sql`: 초기 스키마
- `20250901145111_update_tide_weather_region_table.sql`: 134개 지역 데이터
- `20250904000000_add_location_code_to_medium_term_forecasts.sql`: 성능 최적화

### 관련 Edge Functions
- `get-kma-weather`: 단기예보 수집
- `fetch-kma-data`: 해양 관측 데이터 수집
- `get-medm-weather`: 중기예보 수집
- `get-weather-tide-data`: 통합 API (최적화 버전)
- `get-medm-weather-data`: 중기예보 API (레거시)
- `import-tide-data`: 조위 데이터 임포트
- `check-region-overlap`: 지역 중복 분석 도구

### 외부 API
- 기상청 단기예보 API: `apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/getVilageFcst`
- 기상청 해양 관측 API: `apihub.kma.go.kr/api/typ01/url/sea_obs.php`
- 기상청 중기예보 API:
  - 기온: `apihub.kma.go.kr/api/typ01/url/fct_afs_wc.php`
  - 해상: `apihub.kma.go.kr/api/typ01/url/fct_afs_wo.php`

---

## 버전 이력

- **v1.0** (2025-01-15): 초기 문서 작성
- 134개 지역코드 체계 정리
- 함수별 사용 방법 문서화
- 성능 최적화 이력 기록
