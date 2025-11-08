html다운 명령어
curl "https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/manage-firebase-remote-config" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3cGd2ZHRmcHdhenpmZW5pdXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNzEzOTQsImV4cCI6MjA2NjY0NzM5NH0.d0pjIvnOdPGbc_-cfqRNu9yOIutyO1eex848k1yNZJE" -o firebase-remote-config-ui-updated.html  

# Firebase Remote Config 관리 API

Firebase Remote Config를 REST API를 통해 관리할 수 있는 Supabase Edge Function입니다.

## 기능 개요

- **Remote Config 조회**: 현재 설정된 매개변수와 조건 조회
- **Remote Config 업데이트**: 매개변수 추가/수정 및 조건부 값 설정
- **웹 UI 제공**: HTML 기반 관리 인터페이스
- **인증 시스템**: 관리자 비밀번호 기반 2단계 인증

## 환경 변수 설정

```bash
# Supabase secrets에 다음 환경 변수들을 설정해야 합니다
FIREBASE_SERVICE_ACCOUNT_KEY="{\"type\":\"service_account\",\"project_id\":\"your-project\",...}"
ADMIN_SECRET="your-admin-password"
```

## API 엔드포인트

### 기본 URL
```
https://your-project.supabase.co/functions/v1/manage-firebase-remote-config
```

## API 사용법

### 1. 웹 UI 다운로드 (GET 요청)

```bash
curl "https://your-project.supabase.co/functions/v1/manage-firebase-remote-config" -o remote-config-ui.html
```

### 2. 인증 테스트 (POST 요청)

```bash
curl -X POST "https://your-project.supabase.co/functions/v1/manage-firebase-remote-config" \
  -H "Content-Type: application/json" \
  -d '{
    "adminPassword": "your-admin-password",
    "testAuth": true
  }'
```

**응답 예시:**
```json
{
  "authenticated": true,
  "message": "인증 성공"
}
```

### 3. Remote Config 조회

```bash
curl -X POST "https://your-project.supabase.co/functions/v1/manage-firebase-remote-config" \
  -H "Content-Type: application/json" \
  -d '{
    "adminPassword": "your-admin-password",
    "authenticated": true,
    "action": "get",
    "projectId": "your-firebase-project-id"
  }'
```

**응답 예시:**
```json
{
  "success": true,
  "config": {
    "parameters": {
      "feature_enabled": {
        "defaultValue": {
          "value": "true"
        },
        "description": "새 기능 활성화 여부",
        "valueType": "BOOLEAN"
      }
    },
    "conditions": [
      {
        "name": "android_users",
        "expression": "device.os == 'android'",
        "tagColor": "BLUE"
      }
    ],
    "etag": "etag-12345",
    "version": {
      "versionNumber": "1"
    }
  },
  "message": "Remote Config 조회 성공"
}
```

### 4. Remote Config 업데이트

#### 기본 매개변수 추가/수정

```bash
curl -X POST "https://your-project.supabase.co/functions/v1/manage-firebase-remote-config" \
  -H "Content-Type: application/json" \
  -d '{
    "adminPassword": "your-admin-password",
    "authenticated": true,
    "action": "update",
    "projectId": "your-firebase-project-id",
    "paramKey": "app_version",
    "paramValue": "1.2.0",
    "paramType": "STRING",
    "paramDescription": "현재 앱 버전"
  }'
```

#### 조건부 값이 있는 매개변수 추가/수정

```bash
curl -X POST "https://your-project.supabase.co/functions/v1/manage-firebase-remote-config" \
  -H "Content-Type: application/json" \
  -d '{
    "adminPassword": "your-admin-password",
    "authenticated": true,
    "action": "update",
    "projectId": "your-firebase-project-id",
    "paramKey": "banner_message",
    "paramValue": "일반 메시지",
    "paramType": "STRING",
    "paramDescription": "배너에 표시할 메시지",
    "conditionName": "premium_users",
    "conditionExpression": "user.premium == true",
    "conditionValue": "프리미엄 사용자 전용 메시지"
  }'
```

**업데이트 응답 예시:**
```json
{
  "success": true,
  "config": {
    "parameters": {
      "app_version": {
        "defaultValue": {
          "value": "1.2.0"
        },
        "description": "현재 앱 버전",
        "valueType": "STRING"
      }
    },
    "etag": "etag-67890",
    "version": {
      "versionNumber": "2"
    }
  },
  "message": "매개변수 'app_version' 업데이트 성공"
}
```

## 매개변수 타입

- `STRING`: 문자열 값
- `BOOLEAN`: 불린 값 (true/false)
- `NUMBER`: 숫자 값
- `JSON`: JSON 객체

## 조건 표현식 예시

Firebase Remote Config에서 사용할 수 있는 조건 표현식:

```javascript
// 운영체제별 조건
device.os == 'android'
device.os == 'ios'

// 앱 버전별 조건
app.version >= '1.0.0'
app.version < '2.0.0'

// 국가별 조건
device.country in ['KR', 'US', 'JP']

// 사용자 속성 조건
user.premium == true
user.language == 'ko'

// 복합 조건
device.os == 'android' && app.version >= '1.2.0'
user.premium == true || device.country == 'KR'
```

## 웹 UI 사용법

1. **HTML 파일 다운로드:**
   ```bash
   curl "https://your-project.supabase.co/functions/v1/manage-firebase-remote-config" -o remote-config-ui.html
   ```

2. **브라우저에서 HTML 파일 열기**

3. **관리자 인증:**
   - 관리자 비밀번호 입력 후 '확인' 버튼 클릭
   - 인증 성공 메시지 확인

4. **Remote Config 조회:**
   - '조회' 탭에서 Firebase 프로젝트 ID 입력
   - '조회' 버튼 클릭하여 현재 설정 확인

5. **Remote Config 업데이트:**
   - '업데이트' 탭에서 매개변수 정보 입력
   - 필요시 조건부 값도 설정
   - '업데이트' 버튼 클릭

6. **작업 로그 확인:**
   - '로그' 탭에서 모든 작업 내역 확인

## 오류 처리

### 일반적인 오류

- **401 Unauthorized**: 인증 실패
- **400 Bad Request**: 잘못된 요청 매개변수
- **500 Internal Server Error**: 서버 내부 오류

### 오류 응답 예시

```json
{
  "error": "인증이 필요합니다.",
  "message": "관리자 UI를 통해 인증 후 사용하거나 adminPassword를 제공하세요."
}
```

## 보안 고려사항

1. **ADMIN_SECRET**: Supabase Secrets에 안전하게 저장
2. **Firebase Service Account Key**: JSON 형태로 환경변수에 저장
3. **HTTPS**: 모든 통신은 HTTPS를 통해 암호화
4. **2단계 인증**: 웹 UI 사용시 비밀번호 인증 필수

## 제한사항

- Firebase 프로젝트당 최대 3,000개 매개변수
- 최대 2,000개 조건
- ETag 기반 동시성 제어로 충돌 방지

## 함수 배포

```bash
supabase functions deploy manage-firebase-remote-config
```