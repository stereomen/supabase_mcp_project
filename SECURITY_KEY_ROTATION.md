# ANON_KEY 재생성 가이드

## 왜 재생성이 필요한가?

기존 ANON_KEY가 Git 히스토리에 노출되었으므로, 새 키로 교체 후 config.js를 커밋하는 것이 안전합니다.

## 단계별 가이드

### 1. Supabase에서 새 ANON_KEY 생성

**⚠️ 주의: 이 작업은 기존 키를 무효화합니다. 클라이언트 앱도 함께 업데이트해야 합니다!**

```
1. https://supabase.com/dashboard 접속
2. 프로젝트 선택 (iwpgvdtfpwazzfeniusk)
3. Settings → API 클릭
4. Project API keys 섹션에서 "Reset anon/public key" 클릭
5. 확인 후 새로운 ANON_KEY 복사
```

### 2. config.js 업데이트

```bash
# netlify/config.js 파일 열기
nano netlify/config.js

# 새 ANON_KEY로 교체:
const SUPABASE_CONFIG = {
  url: 'https://iwpgvdtfpwazzfeniusk.supabase.co',
  anonKey: 'NEW_ANON_KEY_HERE'  // 새 키 붙여넣기
};
```

### 3. .gitignore에서 제거

```bash
# .gitignore 파일 수정
# 다음 줄 삭제:
# netlify/config.js
```

### 4. Git 커밋 및 푸시

```bash
git add netlify/config.js .gitignore
git commit -m "feat: Add config.js with rotated ANON_KEY for production"
git push
```

### 5. 클라이언트 앱 업데이트

새 ANON_KEY를 클라이언트 앱 개발자에게 전달하여 앱 코드를 업데이트하도록 합니다.

---

## 보안 참고사항

### ANON_KEY는 공개되어도 안전합니다

- ANON_KEY는 **클라이언트 측에서 사용하도록 설계됨**
- RLS 정책이 데이터베이스를 보호함
- API 인증 (CLIENT_API_KEY, ADMIN_SECRET)이 추가 보호 제공

### 정말로 보호해야 하는 키

- ❌ **SERVICE_ROLE_KEY** - 절대 노출 금지!
- ❌ **ADMIN_SECRET** - 관리자 전용
- ✅ ANON_KEY - 클라이언트용, 공개 가능
