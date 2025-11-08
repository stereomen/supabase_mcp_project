# 푸시 알림 랜딩 페이지 배포 가이드

## 📋 완료된 작업 요약

### A안 (빠른 프로토타입) 완료 사항

1. **데이터베이스 테이블 생성** ✅
   - `notification_history` 테이블 생성
   - 발송 내역 저장용 스키마 설계
   - RLS 정책 설정 (공개 읽기, 서비스 역할 쓰기)

2. **백엔드 API 구현** ✅
   - `send-firebase-notification` 함수에 발송 내역 자동 저장 기능 추가
   - 알림 목록 조회 API 통합 (`action: 'getNotifications'`)
   - 타입별 필터링 지원

3. **프론트엔드 랜딩 페이지** ✅
   - `notifications.html` - 알림 센터 게시판 UI
   - 실제 API 연동 완료
   - 샘플 데이터 fallback 구현
   - 타입별 필터 탭 (전체/프로모션/공지/메시지/뉴스)

---

## 🚀 다음 단계

### 1. 데이터베이스 마이그레이션 적용

```bash
# Supabase Dashboard에서 실행
# Settings → Database → SQL Editor에서 다음 파일 내용 실행:
```

파일: `supabase/migrations/20251108000000_create_notification_history_table.sql`

**또는 CLI 사용:**
```bash
cd /home/coder/project/ts140/code-server_mount/supabase_mcp_project
supabase db push
```

### 2. Supabase Function 배포

```bash
# send-firebase-notification 함수 재배포 (업데이트된 버전)
supabase functions deploy send-firebase-notification
```

### 3. Netlify에 업데이트 배포

#### 방법 1: 수동 업로드 (가장 빠름)
1. [https://app.netlify.com/drop](https://app.netlify.com/drop) 접속
2. `netlify-admin` 폴더 드래그 앤 드롭
3. 기존 사이트 업데이트 또는 새 사이트 생성

#### 방법 2: 기존 사이트 업데이트
1. Netlify Dashboard → Sites → `stalwart-syrniki-a38212` 선택
2. Deploys → Drag and drop
3. `netlify-admin` 폴더 업로드

---

## 📌 URL 구조

### 배포 후 사용 가능한 URL:

```
메인 대시보드:
https://690e93418529e7d09ccec241--stalwart-syrniki-a38212.netlify.app/

알림 센터 (게시판):
https://690e93418529e7d09ccec241--stalwart-syrniki-a38212.netlify.app/notifications.html

Remote Config 관리:
https://690e93418529e7d09ccec241--stalwart-syrniki-a38212.netlify.app/firebase-remote-config.html

푸시 알림 발송:
https://690e93418529e7d09ccec241--stalwart-syrniki-a38212.netlify.app/firebase-notification.html
```

---

## 🔄 워크플로우

### 1. 푸시 알림 발송

1. 관리자가 `firebase-notification.html`에서 알림 작성
2. 발송 버튼 클릭
3. **자동 처리:**
   - FCM으로 푸시 전송
   - DB에 발송 내역 저장
   - `promotion_url`이 없으면 자동으로 알림 센터 URL 설정

### 2. 사용자 경험

1. 앱에서 푸시 알림 수신
2. 알림 클릭 시 랜딩 페이지로 이동
3. 알림 센터에서 해당 알림 + 과거 알림 목록 확인

---

## 🛠️ API 사용법

### 알림 목록 조회

```javascript
const response = await fetch('https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/send-firebase-notification', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        action: 'getNotifications',
        type: 'promotion',  // 또는 'notice', 'message', 'news', null (전체)
        limit: 50,
        offset: 0
    })
});

const result = await response.json();
console.log(result.notifications);
```

### 응답 형식

```json
{
  "success": true,
  "notifications": [
    {
      "id": "uuid",
      "title": "🎉 특별 할인",
      "body": "50% 할인 이벤트 진행중!",
      "type": "promotion",
      "promotion_url": "https://...",
      "target_type": "topic",
      "target_value": "all_users",
      "priority": "high",
      "status": "success",
      "sent_at": "2024-11-08T12:30:00Z",
      "created_at": "2024-11-08T12:30:00Z"
    }
  ],
  "count": 1
}
```

---

## 🎨 커스터마이징

### 알림 센터 URL 변경

파일: `supabase/functions/send-firebase-notification/index.ts`

```typescript
// 341번째 줄 근처
const NOTIFICATION_CENTER_URL = 'https://your-custom-domain.com/notifications.html';
```

### 랜딩 페이지 디자인 수정

파일: `netlify-admin/notifications.html`
- CSS는 `<style>` 태그 내부
- 색상, 레이아웃 등 자유롭게 수정 가능

---

## 🧪 테스트 방법

### 1. 로컬 테스트

```bash
cd netlify-admin
python3 -m http.server 8000
```

브라우저에서 `http://localhost:8000/notifications.html` 접속

### 2. 알림 발송 테스트

1. Netlify 배포 URL의 `firebase-notification.html` 접속
2. 관리자 비밀번호 입력
3. 테스트 알림 발송
4. `notifications.html`에서 발송 내역 확인

---

## 📊 데이터 확인

### Supabase Dashboard에서 확인

```sql
-- 발송 내역 조회
SELECT * FROM notification_history ORDER BY sent_at DESC LIMIT 10;

-- 타입별 통계
SELECT type, COUNT(*) as count FROM notification_history GROUP BY type;

-- 최근 성공한 알림
SELECT title, body, sent_at FROM notification_history
WHERE status = 'success' ORDER BY sent_at DESC LIMIT 5;
```

---

## ⚠️ 주의사항

1. **마이그레이션 적용 필수**
   - `notification_history` 테이블이 없으면 알림 발송은 되지만 저장되지 않음

2. **환경변수 확인**
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_SECRET`

3. **RLS 정책**
   - 공개 읽기: 게시판은 누구나 볼 수 있음
   - 쓰기 제한: 서비스 역할만 가능 (보안)

---

## 🎯 다음 개선 사항 (옵션)

- [ ] 페이지네이션 구현
- [ ] 개별 알림 상세 페이지
- [ ] 검색 기능
- [ ] 날짜 범위 필터
- [ ] 알림 이미지 업로드
- [ ] 실시간 업데이트 (웹소켓)
- [ ] 관리자 UI에서 URL 미리보기

---

## 📞 문의

문제 발생 시:
1. 브라우저 개발자 도구 콘솔 확인
2. Supabase Functions 로그 확인: `supabase functions logs send-firebase-notification`
3. Netlify 배포 로그 확인

---

**작성일:** 2025-11-08
**버전:** 1.0.0 (A안 프로토타입)
