# Firebase 푸시 알림 전송 API PushAdmin2025!

## 개요
Firebase Cloud Messaging(FCM)을 통해 안드로이드 앱에 푸시 알림을 전송하는 Supabase Edge Function입니다.

## 엔드포인트
```
https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/send-firebase-notification
```

## 지원하는 HTTP 메서드

### GET - 웹 UI 반환
- **용도**: 푸시 알림 관리 웹 인터페이스 제공
- **인증**: 불필요
- **응답**: HTML 페이지 (다운로드 필요)

### POST - 푸시 알림 전송
- **용도**: 실제 푸시 알림 전송
- **인증**: Bearer 토큰 또는 Referer 검증
- **응답**: JSON 형태의 전송 결과

## API 요청 형식

### 인증
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 헤더
```http
Content-Type: application/json
```

## 요청 파라미터

### 기본 파라미터
| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| `token` | string | 선택* | FCM 디바이스 토큰 |
| `topic` | string | 선택* | FCM 토픽명 (`all_users`, `push_enabled_users`) |
| `dataOnly` | boolean | 선택 | true: data-only 메시지 (기본값: false) |
| `priority` | string | 선택 | 우선순위 (`high`, `normal`) |

*`token` 또는 `topic` 중 하나는 필수

### 알림 내용
| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| `title` | string | 조건부* | 알림 제목 |
| `body` | string | 조건부* | 알림 내용 |

*일반 알림일 경우 필수, data-only 메시지일 경우 선택사항

### Data 객체
```json
{
  "data": {
    "title": "string",           // 알림 제목
    "body": "string",            // 알림 내용  
    "type": "string",            // 알림 타입 (promotion, notice, message, news)
    "promotion_url": "string",   // 프로모션 URL (선택사항)
    "custom_field": "string"     // 추가 사용자 정의 필드
  }
}
```

## 요청 예시

### 1. 토픽으로 전체 사용자에게 Data-Only 알림
```json
POST /functions/v1/send-firebase-notification
{
  "topic": "all_users",
  "dataOnly": true,
  "data": {
    "title": "🎉 특별 할인",
    "body": "50% 할인 이벤트 진행중!",
    "type": "promotion",
    "promotion_url": "https://sale.company.com"
  },
  "priority": "high"
}
```

### 2. 개별 디바이스에 일반 알림
```json
POST /functions/v1/send-firebase-notification
{
  "token": "eoih84RuTbKBA50Aa6tuqY:APA91bF...",
  "title": "새 메시지",
  "body": "안녕하세요!",
  "data": {
    "type": "message",
    "message_id": "12345"
  }
}
```

### 3. 푸시 활성화 사용자에게 공지
```json
POST /functions/v1/send-firebase-notification
{
  "topic": "push_enabled_users",
  "dataOnly": true,
  "data": {
    "title": "📢 중요 공지",
    "body": "서비스 업데이트 안내",
    "type": "notice"
  }
}
```

### 4. 여러 디바이스에 일괄 전송
```json
POST /functions/v1/send-firebase-notification
{
  "tokens": ["token1", "token2", "token3"],
  "dataOnly": true,
  "data": {
    "title": "일괄 알림",
    "body": "모든 디바이스에 전송",
    "type": "bulk"
  }
}
```

## 응답 형식

### 성공 응답
```json
{
  "success": true,
  "result": {
    "name": "projects/mancooltime-83e29/messages/7169457403075624504"
  }
}
```

### 일괄 전송 성공 응답
```json
{
  "success": true,
  "results": [
    {
      "token": "token1",
      "success": true,
      "result": {"name": "projects/..."}
    },
    {
      "token": "token2", 
      "success": false,
      "error": "Invalid registration token"
    }
  ]
}
```

### 오류 응답
```json
{
  "error": "인증이 필요합니다. Authorization 헤더에 올바른 Bearer 토큰을 제공하세요."
}
```

## HTTP 상태 코드
- `200` - 성공
- `400` - 잘못된 요청 (필수 파라미터 누락, 잘못된 토픽 등)
- `401` - 인증 실패
- `405` - 지원하지 않는 HTTP 메서드
- `500` - 서버 내부 오류

## 특별 기능

### Data-Only 메시지 (안드로이드 14 대응)
```json
{
  "dataOnly": true,
  "data": {
    "title": "제목",
    "body": "내용"
  }
}
```
- 안드로이드 14에서 `onMessageReceived()` 호출 보장
- `notification` 객체 없이 `data`만 전송
- 앱에서 직접 알림을 생성하여 완전한 제어 가능

### 지원 토픽
- `all_users`: 전체 사용자 대상
- `push_enabled_users`: 푸시 알림 활성화 사용자 대상

## 환경변수 설정
Supabase Secrets에서 설정 필요:
```bash
ANON_KEY=your-supabase-anon-key
FIREBASE_SERVICE_ACCOUNT_KEY=your-firebase-service-account-json
```

## 웹 UI 사용법

### 1. HTML 파일 다운로드
```bash
curl "https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/send-firebase-notification" -o firebase-ui.html
```

### 2. 브라우저에서 열기
- 다운로드한 `firebase-ui.html` 파일을 더블클릭
- 또는 브라우저에서 직접 열기

### 3. 웹 UI 기능
- 🎯 토픽/개별 디바이스 선택
- 📝 알림 내용 작성
- 🚀 실시간 전송
- 📋 전송 로그 확인

## cURL 예시

### 토픽으로 전송
```bash
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X POST \
  https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/send-firebase-notification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{
    "topic": "all_users",
    "dataOnly": true,
    "data": {
      "title": "🎉 특별 할인",
      "body": "50% 할인 이벤트 진행중!",
      "type": "promotion",
      "promotion_url": "https://sale.company.com"
    }
  }'
```

### 개별 디바이스로 전송
```bash
curl -X POST \
  https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/send-firebase-notification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{
    "token": "FCM_DEVICE_TOKEN",
    "dataOnly": true,
    "data": {
      "title": "개인 메시지",
      "body": "안녕하세요!",
      "type": "message"
    }
  }'
```

## 오류 처리

### 일반적인 오류 상황
1. **토큰 불일치**: FCM 토큰이 유효하지 않음
2. **인증 실패**: ANON_KEY가 올바르지 않음
3. **필수 파라미터 누락**: token/topic, title/body 등
4. **잘못된 토픽**: 허용되지 않은 토픽명 사용
5. **Firebase 인증 실패**: 서비스 계정 키 문제

### 디버깅 팁
- 함수 로그 확인: Supabase Dashboard > Functions > Logs
- FCM 토큰 유효성 확인
- 환경변수 설정 확인
- 네트워크 연결 상태 확인

## 버전 정보
- **Firebase API**: HTTP v1 (최신 권장 버전)
- **인증 방식**: OAuth 2.0 with JWT
- **지원 플랫폼**: Android (FCM)
- **Supabase**: Edge Functions (Deno Runtime)

## 관련 문서
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [FCM HTTP v1 API](https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)