# 광고 시스템 배포 가이드

## 📋 목차
1. [시스템 개요](#시스템-개요)
2. [데이터베이스 마이그레이션](#데이터베이스-마이그레이션)
3. [Edge Functions 배포](#edge-functions-배포)
4. [Netlify 페이지 배포](#netlify-페이지-배포)
5. [테스트 방법](#테스트-방법)
6. [사용 흐름](#사용-흐름)

---

## 시스템 개요

### 구성 요소

**데이터베이스:**
- `ad_repo`: 광고 캠페인 정보
- `ad_analytics`: 광고 조회/클릭 추적
- `ad_repo_view`: 광고+제휴사 통합 뷰
- `ad_analytics_daily_summary`: 일별 성과 집계
- `ad_analytics_campaign_summary`: 캠페인별 전체 성과

**Edge Functions:**
- `manage-ad-repo`: 광고 캠페인 CRUD
- `track-ad-event`: 조회/클릭 이벤트 추적
- `get-ad-weather-data`: 광고 통합 날씨 API

**관리 페이지:**
- `ad-partners.html`: 제휴사 관리
- `ad-post.html`: 광고 캠페인 등록
- `ad-analytics.html`: 성과 대시보드

---

## 데이터베이스 마이그레이션

### 1단계: Supabase SQL Editor 접속
https://supabase.com/dashboard/project/iwpgvdtfpwazzfeniusk/sql

### 2단계: 마이그레이션 실행 (순서대로)

#### 1) 광고 저장소 테이블 생성
파일: `supabase/migrations/20251223000001_create_ad_repo_table.sql`

```sql
-- 파일 내용 복사하여 실행
```

#### 2) 광고 분석 테이블 생성
파일: `supabase/migrations/20251223000002_create_ad_analytics_table.sql`

```sql
-- 파일 내용 복사하여 실행
```

#### 3) 뷰 및 함수 생성
파일: `supabase/migrations/20251223000003_create_ad_repo_view.sql`

```sql
-- 파일 내용 복사하여 실행
```

### 3단계: 생성 확인

```sql
-- 테이블 확인
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'ad_%';

-- 뷰 확인
SELECT table_name FROM information_schema.views
WHERE table_schema = 'public'
AND table_name LIKE 'ad_%';

-- 함수 확인
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%ad%';
```

예상 결과:
- 테이블: `ad_repo`, `ad_analytics`
- 뷰: `ad_repo_view`, `ad_repo_active_view`, `ad_analytics_daily_summary`, `ad_analytics_campaign_summary`
- 함수: `get_active_ads_for_station`, `get_active_ads_for_area`

---

## Edge Functions 배포

### 방법 1: CLI로 배포 (권장)

```bash
# 개별 배포
supabase functions deploy manage-ad-repo --project-ref iwpgvdtfpwazzfeniusk
supabase functions deploy track-ad-event --project-ref iwpgvdtfpwazzfeniusk
supabase functions deploy get-ad-weather-data --project-ref iwpgvdtfpwazzfeniusk

# 또는 한번에 배포
supabase functions deploy --project-ref iwpgvdtfpwazzfeniusk
```

### 방법 2: Supabase Dashboard

1. https://supabase.com/dashboard/project/iwpgvdtfpwazzfeniusk/functions
2. "Create a new function" 클릭
3. 함수 이름 입력 후 코드 붙여넣기
4. Deploy 클릭

### 배포 확인

각 함수 URL에 GET 요청:
- https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/manage-ad-repo
- https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/track-ad-event
- https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/get-ad-weather-data

---

## Netlify 페이지 배포

### 배포 명령

```bash
cd netlify
netlify deploy --prod --dir=.
```

### 배포 확인

https://mancool.netlify.app/

새로 추가된 카드 확인:
- 🎯 광고 캠페인 등록
- 📊 광고 성과 분석

---

## 테스트 방법

### 1단계: 제휴사 등록

1. https://mancool.netlify.app/ad-partners.html
2. 테스트 제휴사 등록:
   - 업체ID: `TEST_PARTNER_001`
   - 업체명: `테스트 낚시점`
   - 매칭 관측소: `DT_0001`
   - 매칭 해역: `서해북부`

### 2단계: 광고 캠페인 등록

1. https://mancool.netlify.app/ad-post.html
2. 제휴사 선택 드롭다운에서 위에서 등록한 제휴사 선택
3. 캠페인 정보 입력:
   - 캠페인명: `테스트 캠페인`
   - 광고 타입 A: `banner`
   - 이미지 A URL: `https://example.com/banner.jpg`
   - 랜딩 URL: `https://example.com`
   - 노출 시작일: 오늘
   - 노출 종료일: 1주일 후
   - 우선순위: `5`
4. "캠페인 등록" 클릭

### 3단계: 광고 조회 API 테스트

브라우저나 curl로 테스트:

```bash
# 광고가 포함된 날씨 API 호출
curl "https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/get-ad-weather-data?code=DT_0001&date=2025-12-23" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

응답에서 `ad` 필드 확인:
```json
{
  "ad": {
    "id": "uuid",
    "campaign_name": "테스트 캠페인",
    "partner_name": "테스트 낚시점",
    "image_a_url": "https://example.com/banner.jpg",
    ...
  },
  "weather_forecasts": [...],
  "tide_data": [...]
}
```

광고가 없는 관측소:
```bash
curl "https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/get-ad-weather-data?code=DT_0099&date=2025-12-23" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

응답:
```json
{
  "ad": null,
  "weather_forecasts": [...],
  "tide_data": [...]
}
```

### 4단계: 이벤트 추적 테스트

```bash
# 노출 이벤트 기록
curl -X POST "https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/track-ad-event" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "ad_repo_id": "캠페인-UUID",
    "event_type": "impression",
    "station_id": "DT_0001"
  }'

# 클릭 이벤트 기록
curl -X POST "https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/track-ad-event" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "ad_repo_id": "캠페인-UUID",
    "event_type": "click",
    "station_id": "DT_0001"
  }'
```

### 5단계: 성과 확인

1. https://mancool.netlify.app/ad-analytics.html
2. 캠페인별 노출 수, 클릭 수, CTR 확인

---

## 사용 흐름

### 제휴사 관리자 워크플로우

1. **제휴사 등록** (ad-partners.html)
   - 업체 정보 입력
   - 관측소/해역 매핑

2. **광고 캠페인 생성** (ad-post.html)
   - 제휴사 선택
   - 광고 소재 업로드
   - 노출 기간 설정
   - 타겟 설정 (관측소/해역)

3. **성과 모니터링** (ad-analytics.html)
   - 캠페인별 통계 확인
   - CTR 분석
   - 기간별 추이 파악

### 클라이언트 앱 통합

```javascript
// 1. 날씨 + 광고 데이터 조회
const response = await fetch(
  'https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/get-ad-weather-data?code=DT_0001&date=2025-12-23',
  {
    headers: {
      'Authorization': 'Bearer YOUR_ANON_KEY'
    }
  }
);

const data = await response.json();

// 2. 광고가 있으면 표시
if (data.ad) {
  showAd(data.ad);

  // 노출 이벤트 기록 (자동)
  // get-ad-weather-data 함수 내부에서 자동 처리됨
}

// 3. 사용자가 광고 클릭 시
function onAdClick(adId) {
  // 클릭 이벤트 기록
  fetch('https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/track-ad-event', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_ANON_KEY'
    },
    body: JSON.stringify({
      ad_repo_id: adId,
      event_type: 'click',
      station_id: 'DT_0001'
    })
  });

  // 랜딩 페이지로 이동
  window.open(data.ad.landing_url, '_blank');
}
```

---

## 주의사항

1. **RLS 정책**: `ad_repo`와 `ad_analytics` 테이블은 RLS가 비활성화되어 있습니다. Edge Function이 Service Role Key를 사용하므로 문제없습니다.

2. **우선순위 시스템**: 같은 관측소에 여러 광고가 있으면 `priority` 값이 높은 것이 노출됩니다.

3. **노출 기간**: `display_start_date`와 `display_end_date` 범위 내에서만 광고가 노출됩니다.

4. **자동 노출 추적**: `get-ad-weather-data` API 호출 시 광고가 있으면 자동으로 impression 이벤트가 기록됩니다.

5. **클릭 추적**: 클라이언트 앱에서 명시적으로 `track-ad-event` API를 호출해야 합니다.

---

## 문제 해결

### 광고가 조회되지 않을 때

```sql
-- 활성 광고 확인
SELECT * FROM ad_repo_view
WHERE is_currently_active = true;

-- 특정 관측소 광고 확인
SELECT * FROM get_active_ads_for_station('DT_0001', CURRENT_DATE);
```

### 성과 데이터가 없을 때

```sql
-- 이벤트 데이터 확인
SELECT * FROM ad_analytics
ORDER BY event_timestamp DESC
LIMIT 10;

-- 캠페인별 집계 확인
SELECT * FROM ad_analytics_campaign_summary;
```

---

## 완료 체크리스트

- [ ] 데이터베이스 마이그레이션 3개 실행
- [ ] Edge Functions 3개 배포
- [ ] Netlify 페이지 배포
- [ ] 제휴사 테스트 등록
- [ ] 광고 캠페인 테스트 등록
- [ ] API 응답에 광고 포함 확인
- [ ] 성과 대시보드 데이터 표시 확인

모든 항목이 완료되면 시스템이 정상 작동합니다! 🎉
