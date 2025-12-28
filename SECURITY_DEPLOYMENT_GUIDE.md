# 보안 강화 배포 가이드

앱 스토어 배포 전 보안 강화 작업이 완료되었습니다. 아래 단계를 따라 배포를 완료하세요.

## ✅ 자동 완료된 항목

- [x] `.env` 파일이 `.gitignore`에 포함되어 Git에 커밋되지 않음
- [x] CORS 설정이 환경 변수로 제어되도록 수정
- [x] Edge Functions에 API 인증 및 Rate Limiting 추가
- [x] RLS (Row Level Security) 정책 활성화 마이그레이션 파일 생성
- [x] Netlify HTML 환경 변수 템플릿 생성

## 🔴 수동으로 완료해야 할 항목

### 1. Supabase에서 새 ANON_KEY 발급 ⚠️ 긴급

**현재 문제**: 기존 ANON_KEY가 Git 히스토리와 HTML 파일에 노출되어 있음

**조치 방법**:
1. Supabase Dashboard 접속
2. Settings → API 메뉴
3. "Reset anon key" 버튼 클릭
4. 새로 발급된 키를 안전하게 보관

### 2. 환경 변수 설정

#### Supabase Edge Functions 환경 변수

Supabase Dashboard → Project Settings → Edge Functions → Environment Variables에서 설정:

```bash
# 클라이언트 앱 인증용 API 키 (직접 생성)
CLIENT_API_KEY=your-random-secure-key-here

# 관리자 페이지 인증용 시크릿 (직접 생성)
ADMIN_SECRET=your-admin-password-here

# CORS 허용 도메인 (실제 앱 도메인으로 변경)
ALLOWED_ORIGINS=https://your-app-domain.com,https://mancool.netlify.app

# 기존 환경 변수는 그대로 유지
# SUPABASE_URL
# SUPABASE_ANON_KEY (새로 발급받은 키)
# SUPABASE_SERVICE_ROLE_KEY
# KMA_AUTH_KEY
# FIREBASE_SERVICE_ACCOUNT_KEY
```

**CLIENT_API_KEY 생성 방법**:
```bash
# Linux/Mac
openssl rand -base64 32

# 또는 온라인 도구 사용
# https://www.random.org/strings/
```

#### Netlify 환경 변수

Netlify Dashboard → Site Settings → Environment Variables에서 설정:

```bash
SUPABASE_URL=https://iwpgvdtfpwazzfeniusk.supabase.co
SUPABASE_ANON_KEY=새로_발급받은_anon_key
ADMIN_SECRET=관리자_비밀번호
ENVIRONMENT=production
```

### 3. RLS 정책 적용

마이그레이션 파일을 Supabase에 적용:

```bash
# 로컬에서 테스트
supabase db reset

# 프로덕션에 적용
supabase db push
```

또는 Supabase Dashboard → Database → Migrations에서 직접 실행

### 4. HTML 파일 수정

현재 HTML 파일들에 하드코딩된 API 키를 제거하고 `config.js` 사용:

#### 방법 A: 모든 HTML 파일 수동 수정 (권장)

각 HTML 파일의 `<head>` 섹션에 추가:
```html
<!-- 환경 설정 로드 -->
<script src="config.js"></script>
```

JavaScript 코드 수정:
```javascript
// 기존 (제거)
const SUPABASE_URL = 'https://...';
const ANON_KEY = 'eyJ...';

// 새로운 방식 (추가)
const SUPABASE_URL = window.APP_CONFIG.SUPABASE_URL;
const ANON_KEY = window.APP_CONFIG.SUPABASE_ANON_KEY;
const ADMIN_SECRET = window.APP_CONFIG.ADMIN_SECRET; // 관리 페이지에서만
```

#### 방법 B: Netlify 빌드 스크립트 사용

`netlify.toml` 파일 수정:
```toml
[build]
  command = "bash netlify/build-config.sh"
  publish = "netlify"
```

### 5. 클라이언트 앱 코드 수정

Android/iOS 앱에서 API 호출 시 인증 헤더 추가:

#### Kotlin (Android) 예시
```kotlin
// API 호출 시 헤더 추가
val client = OkHttpClient.Builder()
    .addInterceptor { chain ->
        val request = chain.request().newBuilder()
            .addHeader("x-api-key", "YOUR_CLIENT_API_KEY")
            .build()
        chain.proceed(request)
    }
    .build()

// Retrofit 또는 직접 HTTP 호출 시 사용
```

#### Swift (iOS) 예시
```swift
// URLRequest에 헤더 추가
var request = URLRequest(url: url)
request.setValue("YOUR_CLIENT_API_KEY", forHTTPHeaderField: "x-api-key")
```

**중요**: `CLIENT_API_KEY`는 앱에 하드코딩하지 말고, 앱 빌드 시 환경 변수로 주입하거나 Firebase Remote Config 등을 통해 관리하세요.

### 6. Edge Functions 재배포

수정된 함수들을 Supabase에 배포:

```bash
# 개별 함수 배포
supabase functions deploy get-ad-weather-data
supabase functions deploy track-ad-event
supabase functions deploy manage-ad-repo

# 또는 모든 함수 일괄 배포
supabase functions deploy --no-verify-jwt
```

### 7. Git 히스토리에서 민감 정보 제거 (선택사항)

⚠️ **위험**: 이 작업은 Git 히스토리를 다시 쓰므로 팀원과 협의 후 진행하세요.

```bash
# git-filter-repo 설치 (한 번만)
pip install git-filter-repo

# 민감 정보가 포함된 파일 제거
git filter-repo --path netlify/ad-post.html --invert-paths
git filter-repo --path netlify/ad-partners.html --invert-paths

# 강제 푸시 (⚠️ 주의: 다른 사람과 협업 중이면 안 됨)
git push origin --force --all
```

### 8. 관리자 페이지 접근 제어

Netlify에서 관리자 페이지들을 비밀번호로 보호:

1. Netlify Dashboard → Site Settings → Visitor Access
2. "Password protection" 활성화
3. 비밀번호 설정

또는 `_headers` 파일로 특정 경로만 보호:
```
/ad-*.html
  X-Robots-Tag: noindex
```

### 9. 테스트

#### API 인증 테스트
```bash
# 인증 없이 호출 (실패해야 정상)
curl https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/get-ad-weather-data?code=DT_0001&date=2025-12-28

# 인증과 함께 호출 (성공해야 정상)
curl -H "x-api-key: YOUR_CLIENT_API_KEY" \
  https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/get-ad-weather-data?code=DT_0001&date=2025-12-28
```

#### Rate Limiting 테스트
```bash
# 짧은 시간에 많은 요청 (429 에러 발생해야 정상)
for i in {1..150}; do
  curl -H "x-api-key: YOUR_CLIENT_API_KEY" \
    https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/get-ad-weather-data?code=DT_0001&date=2025-12-28
done
```

### 10. 모니터링 설정

Supabase Dashboard에서 로그 확인:
- Functions → Logs
- 인증 실패, Rate limit 초과 등의 경고 확인

## 📋 최종 체크리스트

배포 전 모든 항목을 확인하세요:

```
[ ] 새 ANON_KEY 발급 및 적용
[ ] Supabase Edge Functions 환경 변수 설정 (CLIENT_API_KEY, ADMIN_SECRET, ALLOWED_ORIGINS)
[ ] Netlify 환경 변수 설정
[ ] RLS 정책 마이그레이션 적용
[ ] HTML 파일에서 하드코딩된 키 제거
[ ] 클라이언트 앱에 x-api-key 헤더 추가
[ ] Edge Functions 재배포
[ ] API 인증 테스트 통과
[ ] Rate Limiting 테스트 통과
[ ] CORS 설정 확인 (실제 도메인에서만 접근 가능)
[ ] 관리자 페이지 접근 제어 설정
[ ] Git에 민감 정보가 없는지 최종 확인
```

## 🔒 추가 보안 권장사항

1. **API 키 관리**:
   - CLIENT_API_KEY는 주기적으로 교체 (3-6개월)
   - 키 노출 시 즉시 재발급

2. **모니터링**:
   - Supabase Dashboard에서 이상 트래픽 감시
   - Rate limit 초과 로그 정기 확인

3. **HTTPS Only**:
   - 앱에서 HTTP 요청 차단
   - Certificate Pinning 고려

4. **백업**:
   - 데이터베이스 정기 백업 설정
   - 환경 변수 안전한 곳에 백업

## 🆘 문제 발생 시

### 인증 에러 (401)
- 환경 변수가 제대로 설정되었는지 확인
- Edge Functions 재배포 확인
- 클라이언트에서 `x-api-key` 헤더 전송 확인

### CORS 에러
- `ALLOWED_ORIGINS` 환경 변수에 실제 도메인 추가
- Edge Functions 재배포

### Rate Limit 초과 (429)
- 정상적인 사용 패턴인지 확인
- 필요시 `auth.ts`의 limit 값 조정

---

**완료 후 이 문서는 팀 내부에만 공유하고 공개 저장소에 올리지 마세요!**
