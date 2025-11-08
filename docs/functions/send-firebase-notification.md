# send-firebase-notification 함수

## 함수 개요
Firebase Cloud Messaging(FCM)을 통해 안드로이드 앱에 푸시 알림을 전송하는 하이브리드 Edge Function입니다.

## 주요 특징
- **하이브리드 지원**: GET 요청시 웹 UI 제공, POST 요청시 API 동작
- **토픽 지원**: 전체 사용자 및 특정 그룹 대상 일괄 전송
- **Data-Only 메시지**: 안드로이드 14 호환성 보장
- **Firebase HTTP v1 API**: 최신 권장 방식 사용
- **실시간 웹 UI**: 푸시 알림 관리 인터페이스 제공

## 배포 명령어
```bash
supabase functions deploy send-firebase-notification --project-ref iwpgvdtfpwazzfeniusk --no-verify-jwt
```

## 환경변수
### Supabase Secrets 설정 필요
```bash
# 인증용 ANON KEY
supabase secrets set ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Firebase 서비스 계정 키 (JSON 형태)
supabase secrets set FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"mancooltime-83e29",...}'
```

## 함수 구조

### 1. 메인 서빙 함수
```typescript
serve(async (req) => {
  // GET: HTML UI 반환
  // POST: 푸시 알림 전송
  // OPTIONS: CORS 처리
})
```

### 2. 핵심 컴포넌트
- `getHTML()`: 웹 UI HTML 생성
- `getAccessToken()`: Firebase OAuth 2.0 토큰 획득
- `sendPushNotificationV1()`: FCM v1 API 호출
- `validateAuth()`: 인증 검증
- `sendBulkPushNotifications()`: 일괄 전송

### 3. 지원 기능
- **토픽 전송**: `all_users`, `push_enabled_users`
- **개별 전송**: FCM 토큰 기반
- **일괄 전송**: 여러 토큰 동시 처리
- **Data-Only**: notification 없이 data만 전송

## 기술 스택
- **Runtime**: Deno (Supabase Edge Functions)
- **인증**: OAuth 2.0 with JWT (RSA-256)
- **API**: Firebase Cloud Messaging HTTP v1
- **UI**: Vanilla JavaScript + CSS
- **보안**: Bearer Token + Referer 검증

## 로그 확인
```bash
# Supabase 대시보드에서 함수 로그 확인
# https://supabase.com/dashboard/project/iwpgvdtfpwazzfeniusk/functions
```

## 사용 시나리오

### 마케팅 캠페인
```json
{
  "topic": "all_users",
  "dataOnly": true,
  "data": {
    "title": "🎉 특별 할인",
    "body": "50% 할인 이벤트 진행중!",
    "type": "promotion",
    "promotion_url": "https://sale.company.com"
  }
}
```

### 시스템 공지
```json
{
  "topic": "push_enabled_users", 
  "dataOnly": true,
  "data": {
    "title": "📢 시스템 점검 안내",
    "body": "2025년 9월 7일 오후 2시-4시",
    "type": "notice"
  }
}
```

### 개인 메시지
```json
{
  "token": "FCM_TOKEN",
  "dataOnly": true,
  "data": {
    "title": "새 메시지",
    "body": "안녕하세요!",
    "type": "message"
  }
}
```

## 성능 최적화
- JWT 토큰 1시간 캐싱
- 일괄 전송시 순차 처리
- 실패한 토큰 개별 처리
- CORS 헤더 최적화

## 보안 고려사항
- 환경변수를 통한 키 관리
- Referer 기반 내부 호출 검증
- Bearer 토큰 외부 API 호출 인증
- Firebase 서비스 계정 권한 최소화

## 모니터링 지표
- 전송 성공률
- 응답 시간
- 오류 유형별 분석
- 토픽별 전송량

## 문제 해결

### 일반적인 문제
1. **토큰 만료**: FCM 토큰 갱신 필요
2. **권한 오류**: Firebase 서비스 계정 권한 확인
3. **네트워크 오류**: Supabase와 Firebase 간 연결 확인
4. **인증 실패**: ANON_KEY 정확성 확인

### 디버깅 명령어
```bash
# 함수 상태 확인
curl -I https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/send-firebase-notification

# 테스트 전송
curl -X POST \
  https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/send-firebase-notification \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{"topic":"all_users","dataOnly":true,"data":{"title":"test","body":"test"}}'
```

## 업데이트 히스토리
- **v1.0**: 기본 푸시 알림 기능
- **v1.1**: 토픽 지원 추가
- **v1.2**: Data-Only 메시지 지원
- **v1.3**: 웹 UI 통합
- **v1.4**: Firebase v1 API 전환