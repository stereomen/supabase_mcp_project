Speak in Korean.
The table schema should include separate columns for both Coordinated Universal Time (UTC) and Korean Standard Time (KST).

프로젝트: 해양 기상 관측 플랫폼 (MCP - Marine Collection Platform)

1. 프로젝트 개요
이 프로젝트는 대한민국 기상청(KMA) API에서 제공하는 해양 기상 관측 데이터를 주기적으로 수집하여 Supabase 데이터베이스에 저장하고, 저장된 데이터를 외부에 제공하는 API 서버를 구축하는 것을 목표로 합니다.

주요 기능:

기상청 API로부터 해양 관측 데이터 수집 (fetch-kma-data, get-kma-weather 함수)

수집된 데이터를 제공하는 API 서버 (mcp-server 함수)

데이터 수집 과정을 기록하는 로그 테이블 운영

2. 기술 스택
플랫폼: Supabase

데이터베이스: Supabase Postgres

서버리스 함수: Supabase Edge Functions

런타임: Deno

주요 언어: TypeScript

3. 개발 환경 및 주요 명령어
Supabase 로컬 환경 시작: supabase start

Supabase 프로젝트 연결: supabase link --project-ref <PROJECT_ID>

함수 배포: supabase functions deploy <FUNCTION_NAME>

환경 변수: .env 파일에 다음 키들이 필수로 존재해야 합니다.

SUPABASE_URL

SUPABASE_ANON_KEY

SUPABASE_SERVICE_ROLE_KEY

4. 프로젝트 구조
supabase/functions/: 모든 Edge Function의 소스 코드가 위치합니다.

_shared/: 여러 함수에서 공통으로 사용하는 모듈 (예: cors.ts)

fetch-kma-data/: 기상청 데이터를 수집하여 marine_observations 테이블에 저장하는 함수. Cron Job으로 주기적으로 실행됩니다.

mcp-server/: 저장된 기상 데이터를 클라이언트에게 제공하는 API 서버 함수.

supabase/migrations/: 데이터베이스 스키마(테이블 구조 등) 변경 이력을 관리합니다.

supabase/config.toml: Supabase 프로젝트의 핵심 설정 파일입니다.

5. 나(Gemini)에게 바라는 점
코드 수정 시, 기존 코드의 스타일과 구조를 최대한 유지해주세요.

새로운 기능을 추가할 때는 Deno와 TypeScript의 최신 모범 사례를 따라주세요.

에러가 발생할 가능성이 있는 부분에는 try...catch 구문을 사용하고, console.error로 명확한 로그를 남겨주세요.이 방식으로 

