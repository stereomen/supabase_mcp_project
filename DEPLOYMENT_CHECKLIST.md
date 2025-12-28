# 🚀 앱 스토어 배포 전 보안 체크리스트

## ✅ 자동 완료된 항목

- [x] **9. `.env` 파일이 `.gitignore`에 포함** - Git에 커밋되지 않도록 설정됨
- [x] **3. CORS 설정을 앱 도메인으로 제한** - 환경 변수(`ALLOWED_ORIGINS`)로 제어
- [x] **4. API 인증 메커니즘 추가** - 클라이언트 API 키 및 관리자 인증 구현
- [x] **5. RLS 정책 활성화 및 설정** - 마이그레이션 파일 생성 완료
- [x] **6. Rate limiting 구현** - 기본적인 Rate limiting 추가
- [x] **7. 환경 변수 관리 방식 변경** - 템플릿 및 빌드 스크립트 생성

---

## 🔴 사용자가 직접 완료해야 할 항목

### 1. Supabase에서 새 ANON_KEY 발급 ⚠️ **최우선 작업**

**이유**: 기존 키가 Git 히스토리에 노출되어 있음

**방법**:
1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. Your Project → Settings → API
3. "Reset anon key" 클릭
4. 새 키를 안전한 곳에 저장

---

### 2. Supabase Edge Functions 환경 변수 설정

**위치**: Supabase Dashboard → Project Settings → Edge Functions → Environment Variables

**추가할 변수**:
```bash
# 클라이언트 앱 인증용 (직접 생성 필요)
CLIENT_API_KEY=your-random-32-char-key

# 관리자 페이지 인증용 (직접 생성 필요)
ADMIN_SECRET=your-strong-password

# CORS 허용 도메인 (실제 도메인으로 변경)
ALLOWED_ORIGINS=https://your-app.com,https://mancool.netlify.app
```

**키 생성 방법**:
```bash
# Terminal에서 실행
openssl rand -base64 32
```

---

### 3. RLS 정책 적용

**방법 A - 로컬에서**:
```bash
supabase db push
```

**방법 B - Dashboard에서**:
1. Supabase Dashboard → Database → Migrations
2. `20251228000000_enable_rls_security.sql` 내용 복사/붙여넣기 후 실행

---

### 4. HTML 파일에서 하드코딩된 API 키 제거

**현재 상태**: API 키가 HTML에 직접 노출됨
**목표**: 환경 변수로 관리

**상세 가이드**: `SECURITY_DEPLOYMENT_GUIDE.md` 참조

---

### 5. 클라이언트 앱 코드 수정

**Android 앱에 추가**:
```kotlin
// HTTP 클라이언트에 인증 헤더 추가
.addHeader("x-api-key", BuildConfig.CLIENT_API_KEY)
```

**iOS 앱에 추가**:
```swift
request.setValue("YOUR_CLIENT_API_KEY", forHTTPHeaderField: "x-api-key")
```

---

### 6. Edge Functions 재배포

```bash
supabase functions deploy get-ad-weather-data
supabase functions deploy track-ad-event
supabase functions deploy manage-ad-repo
```

---

### 7. Git 히스토리에서 민감 정보 제거

⚠️ **주의**: 협업 중이면 팀원과 협의 필요

**권장 방법**: 새 ANON_KEY 발급만으로도 충분 (기존 키는 무효화됨)

---

### 8. Netlify 환경 변수 설정

**위치**: Netlify Dashboard → Site Settings → Environment Variables

```bash
SUPABASE_URL=https://iwpgvdtfpwazzfeniusk.supabase.co
SUPABASE_ANON_KEY=새로_발급받은_키
ADMIN_SECRET=관리자_비밀번호
ENVIRONMENT=production
```

---

### 10. 프로덕션 환경 변수 Supabase 대시보드에서 설정

→ **항목 2번에 포함됨**

---

## 📝 최종 배포 전 검증

```bash
# 1. 인증 테스트 (실패해야 정상)
curl https://your-supabase-url/functions/v1/get-ad-weather-data?code=DT_0001&date=2025-12-28

# 2. 인증 테스트 (성공해야 정상)
curl -H "x-api-key: YOUR_CLIENT_API_KEY" \
  https://your-supabase-url/functions/v1/get-ad-weather-data?code=DT_0001&date=2025-12-28

# 3. Rate limiting 테스트 (429 에러 발생해야 정상)
for i in {1..150}; do curl -H "x-api-key: YOUR_KEY" ...; done
```

---

## 📚 상세 문서

- **전체 가이드**: `SECURITY_DEPLOYMENT_GUIDE.md`
- **광고 시스템**: `docs/AD_SYSTEM_DEPLOYMENT_GUIDE.md`
- **API 문서**: `API_SPECIFICATION.md`

---

## 🆘 문제 해결

### 401 Unauthorized 에러
- [ ] 환경 변수 설정 확인
- [ ] Edge Functions 재배포 확인
- [ ] 헤더 이름 확인 (`x-api-key`)

### CORS 에러
- [ ] `ALLOWED_ORIGINS`에 실제 도메인 추가
- [ ] 프로토콜 포함 (`https://`)

### Rate Limit 에러 (429)
- [ ] 정상 사용인지 확인
- [ ] 필요시 한도 조정 (`_shared/auth.ts`)

---

**작업 완료 후 이 체크리스트를 다시 확인하세요!**
