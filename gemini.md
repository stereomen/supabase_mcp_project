# GEMINI.md

이 파일은 Gemini가 이 저장소의 코드 작업 시 참고할 가이드를 제공합니다.

한국어로 답변해주세요.
테이블 스키마는 협정 세계시(UTC)와 한국 표준시(KST)를 모두 별도 컬럼으로 포함해야 합니다.

Python 함수를 작성할 때는 맨 위에 기능에 대한 간략한 요약을 작성하세요. 입력/출력 파일이 있다면 함께 포함하세요.

## 개발 명령어

### Supabase 로컬 개발
- 로컬 Supabase 시작: `supabase start`
- 프로젝트 연결: `supabase link --project-ref <PROJECT_ID>`
- 함수 배포: `supabase functions deploy <FUNCTION_NAME>`
- 마이그레이션 적용: `supabase db push`
- 로컬 데이터베이스 초기화: `supabase db reset`
- 로그 확인: `supabase functions logs <FUNCTION_NAME>`

### 배포 가능한 함수 목록
- `mcp-server`: 해양 관측 데이터 API 서버 (하이브리드 GET/POST)
- `fetch-kma-data`: KMA API 데이터 수집 (스케줄링)
- `get-kma-weather`: 기상 데이터 수집
- `get-medm-weather`: KMA API 중기예보 데이터 수집 (스케줄링)
- `get-weather-tide-data`: 날씨 및 조석 데이터 통합 API
- `import-tide-data`: 조석 데이터 가져오기 기능
- `analyze-data`: 데이터 분석 함수
- `send-firebase-notification`: Android 앱용 Firebase Cloud Messaging 푸시 알림 발송
- `manage-firebase-remote-config`: 웹 UI가 있는 Firebase Remote Config 관리 API

### Node.js 명령어
- 의존성 설치: `npm install`
- Python 스크립트 실행: `python3 <script_name>.py`

## 아키텍처 개요

이것은 대한민국 기상청(KMA)의 해양 기상 데이터를 수집하고 제공하는 **해양 기상 관측 플랫폼** (MCP - Marine Weather Observation Platform)입니다. 시스템은 서버리스 Edge Functions를 사용하는 Supabase 기반으로 구축되었습니다.

### 핵심 데이터 흐름
1. **데이터 수집**: `fetch-kma-data` 함수가 주기적으로 KMA API에서 데이터 수집
2. **데이터 저장**: 해양 관측 데이터를 UTC와 KST 타임스탬프와 함께 PostgreSQL 테이블에 저장
3. **데이터 제공**: 여러 API 엔드포인트가 다양한 데이터 조합(날씨, 조석, 관측 데이터) 제공

### 주요 Supabase Edge Functions
- **mcp-server**: RESTful GET 요청과 MCP 프로토콜 POST 요청을 모두 지원하는 하이브리드 API (해양 관측 데이터)
- **get-weather-tide-data**: 날씨 예보, 조석 데이터, 해양 관측 데이터를 통합하여 제공하는 메인 API 엔드포인트
- **fetch-kma-data**: KMA API에서 데이터를 수집하여 `marine_observations` 테이블에 저장하는 스케줄 데이터 수집기
- **get-medm-weather**: 3가지 유형의 KMA 중기예보(육상/기온/해상)를 수집하여 `medium_term_forecasts` 테이블에 저장하는 중기예보 수집기

### 데이터베이스 스키마
- **marine_observations**: UTC/KST 타임스탬프와 함께 해양 기상 데이터를 저장하는 핵심 테이블
- **weather_forecasts**: 위치별 7일 날씨 예보 데이터
- **medium_term_forecasts**: 중기 날씨 예보 데이터 (3-7일 예보, 육상/기온/해상 유형)
- **tide_data**: 14일 조석 수위 정보
- **locations**: 다양한 데이터 유형에 대한 지원 플래그가 포함된 위치 마스터 데이터
- **tide_abs_region** & **tide_weather_region**: 지역 매핑 테이블

### 인증 및 보안
- 함수는 데이터베이스 접근을 위해 Supabase service role key 사용
- mcp-server는 SUPABASE_ANON_KEY에 대한 authKey 검증 포함
- CORS 헤더는 `_shared/cors.ts`에서 구성

## 파일 구조 규칙

### 함수 구성
- 각 함수는 `supabase/functions/` 하위의 별도 디렉토리에 위치
- 각 함수는 import 구성을 위한 자체 `deno.json` 보유
- 공유 유틸리티는 `supabase/functions/_shared/`에 위치

### 데이터베이스 마이그레이션
- 모든 스키마 변경은 `supabase/migrations/`의 마이그레이션 파일을 통해 수행
- 마이그레이션에는 상세한 주석과 한국어 명명 규칙이 포함됨

### 문서화
- 함수 문서는 `docs/functions/`에 한국어 설명으로 작성
- API 사양은 `API_SPECIFICATION.md`에 작성

### Netlify Admin UI
- `netlify/` 디렉토리의 웹 기반 관리 인터페이스
- Firebase Remote Config 관리 및 푸시 알림 발송을 위한 정적 HTML 페이지
- Edge Function GET 엔드포인트 없이 쉽게 접근할 수 있도록 Netlify를 통해 별도 배포
- 배포 지침은 `netlify/README.md` 참조

## 필수 환경 변수

```bash
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
KMA_AUTH_KEY=your-kma-api-key  # get-kma-weather 및 get-medm-weather 함수에 필수
FIREBASE_SERVICE_ACCOUNT_KEY=your-firebase-service-account-json  # send-firebase-notification 및 manage-firebase-remote-config 함수에 필수 (JSON 문자열)
FIREBASE_SERVER_KEY=your-firebase-server-key  # 선택사항: Firebase legacy server key (대체용)
ADMIN_SECRET=your-admin-password  # manage-firebase-remote-config 함수에 필수
```

## 코드 스타일 가이드라인

기존 코드 패턴 기반:
- Edge Functions에는 Deno 런타임과 함께 TypeScript 사용
- `console.error` 로깅을 포함한 포괄적인 에러 처리
- 한국어 문서화 표준 준수 (적절한 경우 주석/로그를 한국어로 작성)
- 데이터베이스 연결에는 `@supabase/supabase-js@2`의 `createClient` 사용
- 공유 cors 모듈을 사용한 적절한 CORS 처리 구현
- 데이터베이스 컬럼 명명은 snake_case 사용
- 시간 처리: 타임스탬프의 UTC와 KST 버전 모두 저장

## API 디자인 패턴

- GET API는 필터링을 위해 쿼리 파라미터 사용 (code, date, time)
- `error` 필드가 포함된 일관된 에러 응답 형식
- HHMM 형식의 선택적 시간 필터링 지원
- 누락된 데이터에 대해 null 대신 빈 배열 반환
- 복잡한 데이터베이스 쿼리에는 RPC 함수 사용
- 데이터 타입 매핑 구현 (wd=풍향, tw=수온, wh=파고)

## 지역 데이터 지원

시스템은 다음을 포함한 한국 해양 기상 관측소를 지원합니다:
- 다양한 관측 유형을 위한 관측소 ID 매핑
- 위치 기반 데이터 가용성 플래그
- 다양한 데이터 소스(ABS, KMA) 간 지역 코드 매핑
