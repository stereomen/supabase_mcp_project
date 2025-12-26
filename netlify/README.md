# Firebase 관리자 웹 UI - Netlify 배포

이 디렉토리에는 Firebase Remote Config 관리 및 푸시 알림 발송을 위한 웹 UI가 포함되어 있습니다. Netlify를 통해 정적 웹사이트로 배포할 수 있습니다.

## 📁 파일 구조

```
netlify/
├── index.html                      # 대시보드 메인 페이지
├── firebase-remote-config.html     # Firebase Remote Config 관리 UI
├── firebase-notification.html      # Firebase 푸시 알림 발송 UI
├── netlify.toml                    # Netlify 배포 설정
├── .gitignore                      # Git 무시 파일 목록
└── README.md                       # 이 문서
```

## 🚀 Netlify 배포 방법

### 방법 1: Netlify CLI를 사용한 배포 (권장)

1. **Netlify CLI 설치**
   ```bash
   npm install -g netlify-cli
   ```

2. **Netlify 로그인**
   ```bash
   netlify login
   ```

3. **사이트 초기화 및 배포**
   ```bash
   cd netlify
   netlify init
   ```

   - "Create & configure a new site" 선택
   - Team 선택
   - Site name 입력 (예: `firebase-admin-dashboard`)
   - Build command: (비워둠 - 정적 HTML)
   - Publish directory: `.` (현재 디렉토리)

4. **배포**
   ```bash
   netlify deploy --prod
   ```

### 방법 2: Netlify 웹 인터페이스를 통한 배포

1. [Netlify](https://netlify.com)에 로그인
2. "Add new site" → "Deploy manually" 클릭
3. `netlify` 폴더를 드래그 앤 드롭
4. 배포 완료 후 생성된 URL 확인

### 방법 3: Git 연동 자동 배포

1. GitHub/GitLab/Bitbucket에 저장소 생성
2. `netlify` 폴더를 저장소에 푸시
3. Netlify에서 "New site from Git" 선택
4. 저장소 연결 및 다음 설정 입력:
   - **Build command**: (비워둠)
   - **Publish directory**: `.` 또는 `netlify`
   - **Branch**: `main` 또는 `master`
5. "Deploy site" 클릭

## ⚙️ 배포 후 설정

### 1. Supabase Function URL 확인

각 HTML 파일에서 Supabase Function URL이 올바른지 확인하세요:

**firebase-remote-config.html** (193번째 줄 근처):
```javascript
const FUNCTION_URL = 'https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/manage-firebase-remote-config';
```

**firebase-notification.html** (508번째 줄 근처):
```javascript
const SUPABASE_URL = 'https://iwpgvdtfpwazzfeniusk.supabase.co';
const FUNCTION_URL = SUPABASE_URL + '/functions/v1/send-firebase-notification';
```

프로젝트에 맞게 URL을 수정하세요.

### 2. 커스텀 도메인 설정 (선택사항)

1. Netlify 대시보드에서 "Domain settings" 이동
2. "Add custom domain" 클릭
3. 도메인 입력 후 DNS 설정 (Netlify 안내 따르기)
4. SSL/TLS 자동 적용 확인

### 3. 환경 변수 설정 (선택사항)

현재는 HTML에 직접 URL이 하드코딩되어 있지만, 보안을 강화하려면:

1. Netlify 환경 변수 사용 고려
2. 또는 별도의 JavaScript 설정 파일 생성

## 🔒 보안 고려사항

### 인증 시스템
- 두 UI 모두 관리자 비밀번호 인증 필요
- `ADMIN_SECRET` 환경변수를 Supabase Edge Functions에 설정해야 함

### HTTPS 강제
- Netlify는 자동으로 HTTPS를 제공
- `netlify.toml`에서 보안 헤더 설정됨

### CORS 설정
- Supabase Functions에서 CORS가 허용되어야 함
- `_shared/cors.ts`에서 설정 확인

## 📋 사용 방법

### 1. Firebase Remote Config 관리

1. 배포된 URL 접속 (예: `https://your-site.netlify.app`)
2. "Remote Config 관리" 카드 클릭
3. 관리자 비밀번호 입력 후 인증
4. Remote Config 조회/업데이트 수행

### 2. Firebase 푸시 알림 발송

1. 배포된 URL 접속
2. "푸시 알림 발송" 카드 클릭
3. 관리자 비밀번호 입력 후 인증
4. 알림 내용 작성 및 발송

## 🛠️ 개발 및 테스트

로컬에서 테스트하려면:

```bash
# 간단한 HTTP 서버 실행
cd netlify
python3 -m http.server 8000
```

브라우저에서 `http://localhost:8000` 접속

또는 Netlify Dev 사용:

```bash
cd netlify
netlify dev
```

## 📝 업데이트 방법

### CLI를 통한 업데이트
```bash
cd netlify
# 파일 수정 후
netlify deploy --prod
```

### Git 연동 시 자동 업데이트
```bash
git add .
git commit -m "Update admin UI"
git push origin main
# Netlify가 자동으로 배포
```

## 🔍 트러블슈팅

### CORS 오류 발생 시
- Supabase Functions의 CORS 설정 확인
- `_shared/cors.ts`에서 허용된 origin 확인

### 인증 실패 시
- Supabase Functions에 `ADMIN_SECRET` 환경변수 설정 확인
- 비밀번호 입력 오류 확인

### 페이지가 로드되지 않을 때
- Netlify 배포 로그 확인
- 브라우저 개발자 도구 콘솔 확인

## 📞 지원

문제가 발생하면:
1. Netlify 배포 로그 확인
2. 브라우저 개발자 도구에서 네트워크 탭 확인
3. Supabase Functions 로그 확인: `supabase functions logs <function-name>`

## 📄 라이선스

이 프로젝트는 Supabase MCP Project의 일부입니다.
