# 관리자 로그인 시스템 가이드

## 🔐 개요

Netlify 관리 페이지에 로그인 시스템이 추가되었습니다.

---

## 📁 추가된 파일

### 1. `admin-login.html`
- 관리자 로그인 페이지
- 비밀번호 입력 → 검증 → sessionStorage 저장

### 2. `_shared/auth-check.js`
- 모든 관리 페이지에서 로드
- 자동 로그인 체크 및 리다이렉트
- API 호출용 헤더 제공

---

## 🚀 사용 방법

### 1단계: 로그인

```
https://mancool.netlify.app/admin-login.html
```

접속 후 **ADMIN_SECRET** 입력

### 2단계: 관리 페이지 접속

로그인 성공 후 자동으로 `index.html`로 이동

아래 페이지들에 자동 접근 가능:
- ✅ ad-post.html - 광고 캠페인 관리
- ✅ ad-partners.html - 제휴사 관리
- ✅ ad-analytics.html - 광고 분석
- ✅ ad-partner-analytics.html - 파트너별 분석

### 3단계: 로그아웃

각 페이지 우측 상단 **"🚪 로그아웃"** 버튼 클릭

---

## 🔒 보안 특징

### sessionStorage 사용
- 브라우저 탭을 닫으면 자동 로그아웃
- 다른 탭에서는 로그인 상태 공유 안 됨
- XSS 공격에 대비한 안전한 저장소

### 24시간 자동 만료
- 로그인 후 24시간이 지나면 자동 로그아웃
- 재로그인 필요

### 실시간 검증
- API 호출 시마다 ADMIN_SECRET 검증
- 잘못된 비밀번호는 즉시 차단

---

## 🛠️ 개발자를 위한 정보

### API 호출 방법

모든 관리 페이지에서 `getAuthHeaders()` 함수 사용:

```javascript
// ✅ 올바른 방법
const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: getAuthHeaders(),  // ← 이 함수 사용
    body: JSON.stringify({ action: 'list' })
});

// ❌ 잘못된 방법 (더 이상 사용 안 함)
headers: {
    'Authorization': `Bearer ${ANON_KEY}`
}
```

### getAuthHeaders() 반환 값

```javascript
{
    'Content-Type': 'application/json',
    'Authorization': 'Bearer {ANON_KEY}',
    'x-admin-secret': '{sessionStorage에 저장된 비밀번호}'
}
```

---

## 🧪 테스트

### 로그인 테스트

1. `admin-login.html` 접속
2. 잘못된 비밀번호 입력 → 에러 메시지 확인
3. 올바른 비밀번호 입력 → `index.html`로 리다이렉트

### 인증 체크 테스트

1. 로그아웃 상태에서 관리 페이지 직접 접속
2. 자동으로 `admin-login.html`로 리다이렉트 확인

### 세션 만료 테스트

```javascript
// 개발자 도구 콘솔에서 실행
// 로그인 시간을 25시간 전으로 변경
const past = new Date();
past.setHours(past.getHours() - 25);
sessionStorage.setItem('adminLoginTime', past.toISOString());

// 페이지 새로고침 → 로그인 페이지로 이동 확인
location.reload();
```

---

## 🔧 문제 해결

### "관리자 로그인이 필요합니다" 알림

- 로그인하지 않은 상태
- `admin-login.html`에서 로그인

### "세션이 만료되었습니다" 알림

- 24시간 경과
- 다시 로그인 필요

### "잘못된 비밀번호입니다" 에러

- ADMIN_SECRET이 일치하지 않음
- 백엔드 담당자에게 비밀번호 확인

### 로그아웃 버튼이 안 보임

- `auth-check.js`가 로드되지 않음
- 브라우저 캐시 삭제 후 새로고침

---

## 📝 추가 개선 사항 (선택)

### 1. Remember Me 기능

```javascript
// localStorage 사용 (브라우저 닫아도 유지)
localStorage.setItem('adminSecret', password);
```

### 2. 다중 관리자 지원

```javascript
// 사용자 이름 추가
sessionStorage.setItem('adminName', '홍길동');
```

### 3. 접근 로그

```javascript
// 로그인 시간 기록
console.log(`[${new Date().toISOString()}] Admin login`);
```

---

## ⚠️ 주의사항

### ADMIN_SECRET 관리

- ✅ 안전한 비밀번호 사용 (16자 이상, 대소문자+숫자+특수문자)
- ✅ 정기적으로 변경 (3-6개월)
- ❌ 소스 코드에 하드코딩 금지
- ❌ 이메일/메신저로 전송 금지

### 공유 주의

- 관리자 비밀번호는 최소 인원만 공유
- 퇴사자 발생 시 즉시 비밀번호 변경

---

## 📞 지원

문제 발생 시 백엔드 담당자에게 연락:
- ADMIN_SECRET 분실 시 재발급 요청
- 로그인 오류 발생 시 로그 공유

---

**보안을 위해 정기적으로 비밀번호를 변경하세요!** 🔒
