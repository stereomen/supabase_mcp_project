# 타임존 버그 수정 기록 (2025-12-04)

## 개요

Supabase Edge Functions에서 KST(한국 표준시) 관련 시간 처리 버그를 발견하고 수정했습니다.
총 3개 함수에서 시간 관련 버그가 있었으며, **모두 수정 완료**했습니다.

---

## 수정된 함수

### 1. get-medm-weather (중기예보 수집 함수)

**수정 일자**: 2025-12-04

**문제점**:
- `tm_fc_kr`, `tm_ef_kr`: 원본 KST 시간에서 9시간이 더해진 값으로 저장됨
- `created_at_kr`, `updated_at_kr`: 실제 시간에서 9시간이 더해진 값으로 저장됨

**수정 내용**:
```typescript
// 수정 전
function parseKSTTime(kstString) {
  const kstDate = new Date(year, month - 1, day, hour, minute);
  const utcDate = new Date(kstDate.getTime() - 9 * 60 * 60 * 1000);
  const kstWithTz = new Date(kstDate.getTime()).toLocaleString('sv-SE', {
    timeZone: 'Asia/Seoul'
  }).replace(' ', 'T') + '+09:00';
  // 결과: 9시간 중복 추가
}

// 수정 후
function parseKSTTime(kstString) {
  const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute) - 9 * 60 * 60 * 1000);
  const kstWithTz = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+09:00`;
  // 결과: 원본 시간 그대로 유지
}
```

**영향 범위**:
- `medium_term_forecasts` 테이블의 모든 KST 시간 컬럼
- 약 4개 컬럼: `tm_fc_kr`, `tm_ef_kr`, `created_at_kr`, `updated_at_kr`

**조치 필요 사항**:
- ✅ 코드 수정 완료
- ⚠️ get-medm-weather 함수 재실행하여 DB 데이터 갱신 필요

---

### 2. get-kma-weather (단기예보 수집 함수)

**수정 일자**: 2025-12-04

**문제점**:
- `fcst_datetime_kr`: 9시간 더한 후 `.toISOString()` 사용 → "Z" (UTC) 표기
- `updated_at_kr`: 9시간 더한 후 `.toISOString()` 사용 → "Z" (UTC) 표기
- 시간 값은 맞지만 타임존 표기가 잘못되어 클라이언트가 오해할 수 있음

**수정 내용**:

#### fcst_datetime_kr (line 181-184)
```typescript
// 수정 전
const fcstDatetimeKr = new Date(fcstTimestamp.getTime() + 9 * 60 * 60 * 1000).toISOString();
// 결과: "2025-12-04T09:00:00.000Z" (UTC로 오해 가능)

// 수정 후
const fcstDatetimeKr = fcstTimestamp.toLocaleString('sv-SE', {
  timeZone: 'Asia/Seoul'
}).replace(' ', 'T') + '+09:00';
// 결과: "2025-12-04T09:00:00+09:00" (명확한 KST 표기)
```

#### updated_at_kr (line 146-149)
```typescript
// 수정 전
const updatedAtKr = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString();
// 결과: "2025-12-04T09:00:00.000Z" (UTC로 오해 가능)

// 수정 후
const updatedAtKr = now.toLocaleString('sv-SE', {
  timeZone: 'Asia/Seoul'
}).replace(' ', 'T') + '+09:00';
// 결과: "2025-12-04T09:00:00+09:00" (명확한 KST 표기)
```

**영향 범위**:
- `weather_forecasts` 테이블의 KST 시간 컬럼
- 약 2개 컬럼: `fcst_datetime_kr`, `updated_at_kr`

**조치 필요 사항**:
- ✅ 코드 수정 완료
- ⚠️ get-kma-weather 함수 재실행하여 DB 데이터 갱신 필요

---

### 3. fetch-kma-data (해양 관측 데이터 수집 함수)

**수정 일자**: 2025-12-04

**문제점**:
- `convertKstToUtc` 함수에서 `setUTCHours(getUTCHours() - 9)` 사용
- 개념적으로 잘못된 접근 (결과는 우연히 맞음)
- 명확성과 유지보수성을 위해 수정

**수정 내용**:
```typescript
// 수정 전
function convertKstToUtc(kstTime) {
  const kstDate = new Date(Date.UTC(year, month, day, hour, minute));
  kstDate.setUTCHours(kstDate.getUTCHours() - 9);
  return kstDate;
}

// 수정 후
function convertKstToUtc(kstTime) {
  // KST 시간 값을 UTC timestamp로 생성 후 9시간을 빼서 실제 UTC로 변환
  const kstTimestamp = Date.UTC(year, month, day, hour, minute);
  const utcTimestamp = kstTimestamp - 9 * 60 * 60 * 1000;
  return new Date(utcTimestamp);
}
```

**영향 범위**:
- `marine_observations` 테이블의 `observation_time_utc` 컬럼
- 기존 데이터는 우연히 정확한 값으로 저장되어 있음

**조치 필요 사항**:
- ✅ 코드 수정 완료
- ✅ 기존 DB 데이터는 정확하므로 갱신 불필요

---

## 수정하지 않은 함수

### fetch-weatherapi-data
- **상태**: 정상
- **이유**: 외부 API의 timestamp를 그대로 사용하므로 문제 없음

### get-medm-weather-data
- **상태**: 정상
- **이유**: 데이터 조회만 수행하며, 저장된 데이터를 필터링하는 로직은 올바름

---

## 데이터 갱신 필요 사항

### 우선순위 1: get-medm-weather 재실행
```bash
# 중기예보 데이터 재수집
curl -X POST https://your-project.supabase.co/functions/v1/get-medm-weather \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**이유**:
- 모든 KST 컬럼이 9시간 미래로 저장되어 있음
- get-weather-tide-data API의 날짜 필터링에 영향
- **즉시 갱신 필요**

### 우선순위 2: get-kma-weather 재실행
```bash
# 단기예보 데이터 재수집
curl -X POST https://your-project.supabase.co/functions/v1/get-kma-weather \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**이유**:
- KST 컬럼이 "Z" (UTC) 표기로 저장되어 있음
- 클라이언트가 오해할 가능성
- **가능한 빨리 갱신 권장**

---

## 테스트 계획

### 1. get-medm-weather 테스트
```sql
-- 수정 전/후 비교
SELECT
  reg_id,
  tm_ef_kr,
  created_at_kr,
  updated_at_kr
FROM medium_term_forecasts
LIMIT 5;

-- 예상 결과 (수정 후)
-- tm_ef_kr: "2025-12-04T06:00:00+09:00" (원본 시간)
-- created_at_kr: "2025-12-04T15:30:00+09:00" (실제 시간)
```

### 2. get-kma-weather 테스트
```sql
-- 수정 전/후 비교
SELECT
  location_code,
  fcst_datetime_kr,
  updated_at_kr
FROM weather_forecasts
LIMIT 5;

-- 예상 결과 (수정 후)
-- fcst_datetime_kr: "2025-12-04T09:00:00+09:00" (명확한 KST)
-- updated_at_kr: "2025-12-04T15:30:00+09:00" (명확한 KST)
```

### 3. fetch-kma-data 테스트
```sql
-- 정확성 확인
SELECT
  station_id,
  observation_time_kst,
  observation_time_utc
FROM marine_observations
WHERE observation_time_kst = '202512040600'
LIMIT 1;

-- 예상 결과
-- observation_time_kst: "202512040600"
-- observation_time_utc: "2025-12-03T21:00:00Z" (KST - 9시간)
```

---

## 교훈 및 개선 사항

### 교훈
1. **타임존 표기의 중요성**: "Z"와 "+09:00"의 차이가 클라이언트 해석에 큰 영향
2. **명시적 변환**: `Date.UTC()` 사용 시 명확한 주석 필요
3. **0-based month**: JavaScript Date의 month는 0부터 시작 (항상 주의)

### 향후 개선 사항
1. **타임존 유틸리티 함수 작성**: `_shared/timezone.ts` 생성 권장
2. **단위 테스트 추가**: 시간 변환 로직에 대한 테스트 코드
3. **타입 정의**: TypeScript 인터페이스로 시간 필드 명확화

---

## 참고 자료

- ISO 8601 타임존 표기: https://en.wikipedia.org/wiki/ISO_8601
- JavaScript Date 타임존 처리: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date
- Supabase Edge Functions 환경: UTC 기준 실행

---

**작성자**: Claude Code
**작성일**: 2025-12-04
**버전**: 1.0
