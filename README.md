# Marine Weather Observation Platform (MCP)

해양 기상 관측 플랫폼 - 기상청 데이터 수집, 조석 정보 제공 및 위치 기반 광고 시스템

[![Supabase](https://img.shields.io/badge/Supabase-Backend-green)](https://supabase.com)
[![Netlify](https://img.shields.io/badge/Netlify-Admin%20UI-blue)](https://mancool.netlify.app)

## 개요

Marine Weather Observation Platform은 한국 해양 기상 데이터를 수집하고 제공하는 종합 플랫폼입니다. 기상청 API로부터 실시간 해양 관측 데이터, 단기/중기 일기예보, 조석 정보를 수집하여 모바일 앱에 제공하며, 위치 기반 광고 시스템을 통합하여 제휴사 광고를 관리합니다.

**프로젝트 ID:** `iwpgvdtfpwazzfeniusk`
**관리 페이지:** https://mancool.netlify.app

## 주요 기능

### 🌊 해양 기상 데이터
- 실시간 해양 관측 데이터 (수온, 파고, 풍향, 풍속 등)
- 7일 단기 일기예보
- 3-7일 중기 일기예보 (육상/기온/해상)
- 14일 조석 정보

### 📢 광고 시스템
- 위치 기반 광고 타겟팅 (관측소/해역별)
- 우선순위 기반 광고 노출
- 실시간 성과 추적 (노출 수, 클릭 수, CTR)
- 웹 기반 관리 대시보드

### 🔔 Firebase 통합
- FCM 푸시 알림 발송
- Remote Config 관리

## 시스템 아키텍처

```
┌─────────────────┐
│   KMA API       │  기상청 데이터
└────────┬────────┘
         │
         v
┌─────────────────────────────┐
│  Supabase Edge Functions    │
│  - fetch-kma-data           │  데이터 수집 (스케줄)
│  - fetch-openweather-data   │
│  - get-ad-weather-data      │  광고 통합 API
│  - manage-ad-repo           │  광고 관리
│  - track-ad-event           │  이벤트 추적
└────────┬────────────────────┘
         │
         v
┌─────────────────────────────┐
│  PostgreSQL Database        │
│  - marine_observations      │  해양 관측
│  - weather_forecasts        │  일기예보
│  - tide_data                │  조석 정보
│  - ad_repo                  │  광고 캠페인
│  - ad_analytics             │  광고 성과
└─────────────────────────────┘
         │
         v
┌─────────────────────────────┐
│  Client Applications        │
│  - Android App              │
│  - Web Admin UI (Netlify)   │
└─────────────────────────────┘
```

## 빠른 시작

### 1. 환경 변수 설정

```bash
# Supabase
SUPABASE_URL=https://iwpgvdtfpwazzfeniusk.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# KMA API
KMA_AUTH_KEY=your-kma-api-key

# Firebase (선택사항)
FIREBASE_SERVICE_ACCOUNT_KEY=your-firebase-service-account-json
ADMIN_SECRET=your-admin-password
```

### 2. Edge Functions 배포

```bash
# 프로젝트 연결
supabase link --project-ref iwpgvdtfpwazzfeniusk

# 전체 함수 배포
supabase functions deploy

# 또는 개별 배포
supabase functions deploy get-ad-weather-data
supabase functions deploy manage-ad-repo
supabase functions deploy track-ad-event
```

### 3. 데이터베이스 마이그레이션

웹 UI를 통한 마이그레이션:
https://mancool.netlify.app/run-migration.html

또는 CLI:
```bash
supabase db push
```

### 4. 관리 페이지 배포

```bash
cd netlify
netlify deploy --prod --dir=.
```

## API 엔드포인트

### 날씨 + 광고 데이터 조회
```bash
GET /get-ad-weather-data?code=DT_0001&date=2025-12-23
```

### 광고 캠페인 관리
```bash
GET /manage-ad-repo          # 목록 조회
POST /manage-ad-repo         # 캠페인 생성
PUT /manage-ad-repo          # 캠페인 수정
DELETE /manage-ad-repo       # 캠페인 삭제
```

### 광고 이벤트 추적
```bash
POST /track-ad-event
Body: {
  "ad_repo_id": "uuid",
  "event_type": "click",
  "station_id": "DT_0001"
}
```

전체 API 문서: [docs/AD_SYSTEM_API.md](docs/AD_SYSTEM_API.md)

## 데이터베이스 스키마

### 핵심 테이블

**해양 기상 데이터**
- `marine_observations` - 실시간 해양 관측 데이터
- `weather_forecasts` - 7일 일기예보
- `medium_term_forecasts` - 중기예보 (3-7일)
- `tide_data` - 조석 정보
- `locations` - 관측소 마스터 데이터

**광고 시스템**
- `ad_partners` - 제휴사 정보
- `ad_repo` - 광고 캠페인
- `ad_analytics` - 이벤트 추적 (노출/클릭)
- `ad_repo_view` - 캠페인 통합 뷰
- `ad_analytics_campaign_summary` - 성과 집계

## 관리 페이지

https://mancool.netlify.app

- 🔧 **Remote Config 관리** - Firebase 설정 관리
- 📱 **푸시 알림 발송** - FCM 알림 전송
- 📋 **알림 내역 목록** - 발송 히스토리
- ⛵ **API 데이터 검증** - 날씨/조석 API 테스트
- 📢 **광고 제휴사 관리** - 제휴사 등록/관리
- 🎯 **광고 캠페인 등록** - 캠페인 생성/수정
- 📊 **광고 성과 분석** - 실시간 성과 대시보드

## 프로젝트 구조

```
supabase_mcp_project/
├── supabase/
│   ├── functions/           # Edge Functions
│   │   ├── get-ad-weather-data/
│   │   ├── manage-ad-repo/
│   │   ├── track-ad-event/
│   │   ├── fetch-kma-data/
│   │   └── _shared/         # 공통 유틸리티
│   └── migrations/          # 데이터베이스 마이그레이션
├── netlify/                 # 웹 관리 UI
│   ├── index.html
│   ├── ad-partners.html
│   ├── ad-post.html
│   ├── ad-analytics.html
│   └── run-migration.html
├── docs/                    # 문서
│   ├── AD_SYSTEM_API.md
│   ├── AD_SYSTEM_DEPLOYMENT_GUIDE.md
│   └── functions/
├── CLAUDE.md               # AI 개발 가이드
└── README.md               # 이 파일
```

## 개발 가이드

### Edge Function 개발

```bash
# 로컬 개발 서버 시작
supabase start

# 함수 로그 확인
supabase functions logs get-ad-weather-data

# 로컬 테스트
curl http://localhost:54321/functions/v1/get-ad-weather-data?code=DT_0001&date=2025-12-23
```

### 데이터베이스 변경

```bash
# 새 마이그레이션 생성
supabase migration new add_new_feature

# 로컬 DB 리셋
supabase db reset

# 원격 DB에 적용
supabase db push
```

### 코드 스타일

- TypeScript + Deno 런타임
- snake_case 데이터베이스 컬럼명
- UTC/KST 타임존 동시 저장
- 한글 주석 및 문서
- RPC 함수를 통한 복잡한 쿼리

자세한 내용: [CLAUDE.md](CLAUDE.md)

## 광고 시스템 사용 예시

### Android 앱 통합

```kotlin
// 1. 날씨 + 광고 조회
val response = weatherApi.getWeatherWithAd(
    code = "DT_0001",
    date = "2025-12-23"
)

// 2. 광고 표시
response.ad?.let { ad ->
    displayAd(ad)
    // impression 이벤트 자동 기록됨
}

// 3. 클릭 이벤트 전송
fun onAdClick(adId: String) {
    adApi.trackEvent(
        ad_repo_id = adId,
        event_type = "click",
        station_id = "DT_0001"
    )
    openUrl(ad.landing_url)
}
```

### 광고 타겟팅 전략

1. **관측소 기반**: 특정 관측소 사용자에게만 노출
2. **해역 기반**: 특정 해역(서해/남해/동해) 사용자에게 노출
3. **전국**: 모든 사용자에게 노출
4. **우선순위**: 여러 광고가 매칭되면 높은 priority 광고 노출

## 문서

- [광고 시스템 API 문서](docs/AD_SYSTEM_API.md)
- [광고 시스템 배포 가이드](docs/AD_SYSTEM_DEPLOYMENT_GUIDE.md)
- [get-ad-weather-data API](docs/GET-AD-WEATHER-DATA_MODIFICATION.md)
- [KMA API 데이터 필드](docs/KMA_API_DATA_FIELDS.md)
- [Firebase 알림 가이드](docs/NOTIFICATION_API_GUIDE.md)

## 배포 상태

- ✅ Supabase Edge Functions (2025-12-23)
- ✅ Netlify 관리 페이지 (2025-12-23)
- ✅ 광고 시스템 마이그레이션 (2025-12-23)
- ✅ PostgreSQL 데이터베이스 스키마

## 라이선스

이 프로젝트는 Marine Weather Observation Platform의 일부입니다.

## 기여자

Marine Weather Observation Platform Team

---

**마지막 업데이트:** 2025-12-23
