# M4 환경 Supabase 연결 문제 해결 가이드

## 자주 발생하는 문제들과 해결 방법

### 1. CLI 설치 관련 문제

#### 문제: `npm install -g supabase` 실패
```bash
npm error: Installing Supabase CLI as a global module is not supported.
```

**해결 방법**:
```bash
# NPM 대신 바이너리 직접 다운로드 후 전역 설치
curl -sSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_arm64.tar.gz | tar -xz -C /tmp
chmod +x /tmp/supabase
sudo cp /tmp/supabase /usr/local/bin/supabase
```

#### 문제: 아키텍처 불일치 오류
```bash
# AMD64 바이너리 실행 시 오류
/tmp/supabase: cannot execute binary file: Exec format error
```

**해결 방법**:
```bash
# 올바른 ARM64 바이너리 사용 후 전역 설치
uname -m  # aarch64 확인
curl -sSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_arm64.tar.gz | tar -xz -C /tmp
chmod +x /tmp/supabase
sudo cp /tmp/supabase /usr/local/bin/supabase
```

### 2. 데이터베이스 연결 문제

#### 문제: 호스트명 해석 실패
```bash
pg_dump: error: could not translate host name "db.iwpgvdtfpwazzfeniusk.supabase.co" to address
```

**원인**: Docker 컨테이너 내부 네트워크 제한

**해결 방법**:
```bash
# REST API 사용
source .env
curl -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     "$SUPABASE_URL/rest/v1/"
```

#### 문제: 액세스 토큰 미제공
```bash
supabase link --project-ref PROJECT_ID
# Error: Access token not provided
```

**해결 방법**:
```bash
# 1. Personal Access Token 생성 및 설정
# https://supabase.com/dashboard/account/tokens 접속하여 토큰 생성
export SUPABASE_ACCESS_TOKEN="sbp_your_token_here"

# 2. 영구 설정 (권장)
echo 'export SUPABASE_ACCESS_TOKEN="sbp_your_token_here"' >> ~/.bashrc

# 3. CLI 사용 (토큰 설정 후)
supabase projects list

# 4. 또는 REST API 직접 사용
source .env && curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_URL/rest/v1/"
```

### 3. Docker 관련 문제

#### 문제: Docker 소켓 접근 실패
```bash
supabase db diff --schema public
# Error: Cannot connect to the Docker daemon at unix:///var/run/docker.sock
```

**원인**: Docker-in-Docker 환경 제약

**해결 방법**:
```bash
# 로컬 스키마 비교 대신 REST API로 현재 스키마 확인
# 수동으로 migration 파일 작성
```

### 4. 환경변수 관련 문제

#### 문제: `.env` 파일 인식 안됨
```bash
echo $SUPABASE_URL
# 빈 결과
```

**해결 방법**:
```bash
# 명시적으로 환경변수 로드
source .env
echo $SUPABASE_URL  # 확인
```

#### 문제: 서비스 역할 키 권한 부족
```bash
curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_URL/rest/v1/"
# 401 Unauthorized
```

**해결 방법**:
```bash
# 1. 키 값 확인
echo $SUPABASE_SERVICE_ROLE_KEY | cut -c1-20  # 처음 20자만 표시

# 2. 올바른 헤더 형식 사용
curl -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     "$SUPABASE_URL/rest/v1/"
```

### 5. Migration 관련 문제

#### 문제: Migration 파일 누락
```bash
ls supabase/migrations/
# .smbdelete* 파일들만 존재
```

**해결 방법**:
```bash
# 현재 스키마 기반으로 새 migration 생성
# REST API로 테이블 구조 파악 후 수동 작성
```

### 6. 네트워크 도구 부족

#### 문제: 기본 네트워크 도구 없음
```bash
ping google.com
nslookup google.com
# command not found
```

**해결 방법**:
```bash
# 필요한 도구 설치
sudo apt-get update
sudo apt-get install -y iputils-ping dnsutils net-tools

# 또는 대안 도구 사용
curl -I https://google.com  # 연결 테스트용
```

## 권장 워크플로우

### 초기 설정
1. ARM64 CLI 바이너리 설치
2. PostgreSQL 클라이언트 설치
3. 환경변수 설정 확인
4. REST API 연결 테스트

### 개발 과정
1. REST API로 스키마 확인
2. 수동으로 migration 작성
3. 함수 개발 및 테스트
4. `supabase functions deploy` 배포

### 문제 해결 순서
1. 환경 확인 (아키텍처, Docker, 환경변수)
2. 네트워크 연결 테스트
3. 대안 방법 시도 (REST API)
4. 로그 및 오류 메시지 분석

## 유용한 디버깅 명령어

```bash
# 시스템 정보 확인
uname -a
cat /etc/os-release
docker --version

# 환경변수 확인
env | grep SUPABASE
source .env && env | grep SUPABASE

# 네트워크 연결 확인
curl -I $SUPABASE_URL
curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_URL/rest/v1/" | head -10

# CLI 상태 확인
which supabase
/tmp/supabase --version
/tmp/supabase --help
```

## 도움을 받을 수 있는 곳

1. **Supabase 공식 문서**: https://supabase.com/docs
2. **GitHub Issues**: https://github.com/supabase/cli/issues  
3. **Discord 커뮤니티**: https://discord.supabase.com
4. **Stack Overflow**: `supabase` 태그로 질문