# M4 환경에서 Supabase CLI 설치 및 연결 가이드

맥미니 M4 위 Docker 환경에서 Supabase CLI를 설치하고 데이터베이스에 연결하는 방법을 정리한 문서입니다.

## 환경 정보

- **하드웨어**: 맥미니 M4 (ARM64 아키텍처)
- **가상화**: Docker 컨테이너
- **OS**: Linux (Debian 기반)
- **아키텍처**: aarch64 (ARM64)

## 1. 시스템 아키텍처 확인

```bash
uname -m
# 결과: aarch64
```

## 2. Supabase CLI 설치

### ❌ 실패한 방법들

```bash
# NPM으로 설치 시도 - 실패
npm install -g supabase
# 오류: Installing Supabase CLI as a global module is not supported.

# AMD64 바이너리 시도 - 실패 (아키텍처 불일치)
curl -sSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz
```

### ✅ 성공한 방법 - 전역 설치

```bash
# ARM64 바이너리 다운로드
curl -sSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_arm64.tar.gz | tar -xz -C /tmp

# 실행 권한 부여
chmod +x /tmp/supabase

# 전역 설치 (권장)
sudo cp /tmp/supabase /usr/local/bin/supabase

# 설치 확인 (PATH 설정 불필요)
supabase --version
# 결과: 2.39.2
```

## 3. 데이터베이스 연결 시 발생한 문제들

### ❌ 직접 PostgreSQL 연결 실패

```bash
# 호스트명 해석 실패
pg_dump "postgresql://postgres:$SUPABASE_SERVICE_ROLE_KEY@db.iwpgvdtfpwazzfeniusk.supabase.co:5432/postgres"
# 오류: could not translate host name to address
```

**원인**: Docker 컨테이너 내부에서 외부 데이터베이스 호스트명 해석 문제

### ❌ Supabase CLI 인증 실패

```bash
# 프로젝트 링크 시도 실패
/tmp/supabase link --project-ref iwpgvdtfpwazzfeniusk
# 오류: Access token not provided
```

**원인**: CLI 사용을 위한 Personal Access Token 미설정

### ✅ 토큰 설정으로 해결

```bash
# Personal Access Token 생성
# https://supabase.com/dashboard/account/tokens 접속하여 토큰 생성

# 환경변수 설정
export SUPABASE_ACCESS_TOKEN="sbp_your_token_here"

# 영구 설정
echo 'export SUPABASE_ACCESS_TOKEN="sbp_your_token_here"' >> ~/.bashrc

# CLI 사용 가능
supabase projects list
supabase functions deploy FUNCTION_NAME --project-ref iwpgvdtfpwazzfeniusk --no-verify-jwt
```

### ❌ Docker 연결 실패

```bash
# 스키마 비교 시도 실패
/tmp/supabase db diff --schema public
# 오류: Cannot connect to the Docker daemon at unix:///var/run/docker.sock
```

**원인**: Docker-in-Docker 환경에서 Docker 소켓 접근 제한

## 4. 성공한 해결 방법

### ✅ REST API를 통한 스키마 확인

```bash
# Supabase REST API 호출로 테이블 구조 확인
source .env
curl -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     "$SUPABASE_URL/rest/v1/" | head -200
```

**결과**: 모든 테이블 구조와 API 엔드포인트 확인 성공

### ✅ PostgreSQL 클라이언트 설치

```bash
# PostgreSQL 클라이언트 도구 설치
sudo apt-get update && sudo apt-get install -y postgresql-client

# 설치 확인
which pg_dump psql
```

## 5. 환경 변수 설정

```bash
# .env 파일 내용
SUPABASE_URL="https://iwpgvdtfpwazzfeniusk.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## 6. 최종 동기화 프로세스

### 단계별 수행 과정

1. **환경 변수 로드**
   ```bash
   source .env
   ```

2. **REST API로 현재 스키마 확인**
   ```bash
   curl -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        "$SUPABASE_URL/rest/v1/"
   ```

3. **스키마 정보 분석 및 Migration 생성**
   ```sql
   -- supabase/migrations/20250826000000_sync_current_schema.sql
   CREATE TABLE IF NOT EXISTS public.marine_observations (...);
   CREATE TABLE IF NOT EXISTS public.weather_forecasts (...);
   -- ... 기타 테이블들
   ```

## 7. 주요 학습 사항

### 아키텍처 호환성
- **중요**: M4 맥미니는 ARM64 아키텍처이므로 `linux_arm64` 바이너리 필수
- AMD64 바이너리는 실행 불가

### Docker 환경 제약
- Docker 컨테이너 내에서 외부 Docker 소켓 접근 제한
- 네트워크 도구들 (`ping`, `nslookup`) 기본 설치되지 않음

### 대안적 접근 방법
- 직접 DB 연결 실패 시 REST API 활용
- Supabase CLI 인증 문제 시 서비스 역할 키로 직접 API 호출

## 8. 추천 워크플로우

### M4 환경에서의 Supabase 개발 (업데이트)

1. **CLI 전역 설치**: ARM64 바이너리를 `/usr/local/bin`에 설치
2. **토큰 설정**: Personal Access Token 환경변수 설정
3. **스키마 확인**: REST API 또는 CLI 사용
4. **Migration 작성**: 수동 또는 CLI로 테이블 구조 작성
5. **함수 배포**: `supabase functions deploy --project-ref` 사용

### 주요 개선사항

- **전역 설치**: PATH 설정 불필요, 모든 디렉토리에서 `supabase` 명령어 사용 가능
- **토큰 인증**: Personal Access Token으로 모든 CLI 기능 사용 가능
- **간편 배포**: 배포 스크립트로 한 번에 함수 배포
- **네트워크**: Docker 컨테이너에서 외부 DB 직접 연결 제한적 (REST API 권장)

## 9. 문제 해결 체크리스트

### CLI 설치 문제
- [ ] 시스템 아키텍처 확인 (`uname -m`)
- [ ] 올바른 바이너리 다운로드 (ARM64)
- [ ] PATH 설정 확인

### 데이터베이스 연결 문제
- [ ] 환경 변수 설정 확인 (`.env` 파일)
- [ ] REST API 연결 테스트
- [ ] 서비스 역할 키 권한 확인

### Docker 관련 문제
- [ ] Docker 소켓 접근 권한 확인
- [ ] 컨테이너 네트워크 설정 확인
- [ ] 대안 방법 (REST API) 사용

## 10. 참고 자료

- [Supabase CLI 공식 문서](https://supabase.com/docs/reference/cli)
- [Supabase REST API 문서](https://supabase.com/docs/reference/api)
- [Docker 네트워킹 문서](https://docs.docker.com/network/)


## 11. 최종 사용 방법 (전역 설치 완료)

### 빠른 시작

```bash
# 1. 토큰 설정 (한 번만)
export SUPABASE_ACCESS_TOKEN="sbp_your_token_here"

# 2. CLI 사용 (전역 설치로 바로 사용 가능)
supabase --version
supabase projects list

# 3. 함수 배포
supabase functions deploy FUNCTION_NAME --project-ref iwpgvdtfpwazzfeniusk --no-verify-jwt

# 4. 또는 간편 스크립트 사용
./deploy.sh FUNCTION_NAME
```

### 영구 설정 (권장)

```bash
# ~/.bashrc에 토큰 추가
echo 'export SUPABASE_ACCESS_TOKEN="sbp_your_token_here"' >> ~/.bashrc
source ~/.bashrc

# 이제 새 터미널에서 바로 사용 가능
supabase functions logs get-medm-weather --project-ref iwpgvdtfpwazzfeniusk
```