# 클라이언트 앱 업데이트 가이드

## 🔒 API 보안 강화 안내

백엔드 API에 보안 인증이 추가되었습니다. 앱에서 API 호출 시 **두 개의 헤더**를 추가해야 정상 작동합니다.

---

## 📋 변경 사항 요약

### 이전
```
GET /functions/v1/get-ad-weather-data?code=DT_0001&date=2025-12-28
(헤더 없음)
```

### 현재 (2025-12-28 이후)
```
GET /functions/v1/get-ad-weather-data?code=DT_0001&date=2025-12-28

Headers:
  Authorization: Bearer {SUPABASE_ANON_KEY}
  x-api-key: {CLIENT_API_KEY}
```

---

## 🔑 필요한 키 정보

### 1. SUPABASE_ANON_KEY (Supabase 공개 키)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3cGd2ZHRmcHdhenpmZW5pdXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNzEzOTQsImV4cCI6MjA2NjY0NzM5NH0.d0pjIvnOdPGbc_-cfqRNu9yOIutyO1eex848k1yNZJE
```

### 2. CLIENT_API_KEY (앱 전용 인증 키)
```
[별도 전달 예정 - 보안상 이 문서에 포함하지 않음]
```
**⚠️ 주의**: CLIENT_API_KEY는 별도로 안전하게 전달받으세요.

---

## 📱 Android 구현 방법

### 방법 1: BuildConfig 사용 (권장)

#### 1단계: build.gradle.kts에 키 추가

```kotlin
// app/build.gradle.kts
android {
    defaultConfig {
        // Supabase 공개 키
        buildConfigField(
            "String",
            "SUPABASE_ANON_KEY",
            "\"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3cGd2ZHRmcHdhenpmZW5pdXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNzEzOTQsImV4cCI6MjA2NjY0NzM5NH0.d0pjIvnOdPGbc_-cfqRNu9yOIutyO1eex848k1yNZJE\""
        )

        // 앱 전용 API 키 (별도 전달받은 값)
        buildConfigField(
            "String",
            "CLIENT_API_KEY",
            "\"여기에_CLIENT_API_KEY_입력\""
        )
    }

    buildFeatures {
        buildConfig = true
    }
}
```

#### 2단계: OkHttp 인터셉터에 헤더 추가

```kotlin
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Response

class AuthInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()

        val newRequest = originalRequest.newBuilder()
            .addHeader("Authorization", "Bearer ${BuildConfig.SUPABASE_ANON_KEY}")
            .addHeader("x-api-key", BuildConfig.CLIENT_API_KEY)
            .build()

        return chain.proceed(newRequest)
    }
}

// OkHttpClient 생성 시 인터셉터 추가
val client = OkHttpClient.Builder()
    .addInterceptor(AuthInterceptor())
    .build()
```

#### 3단계: Retrofit 사용 시

```kotlin
val retrofit = Retrofit.Builder()
    .baseUrl("https://iwpgvdtfpwazzfeniusk.supabase.co/")
    .client(client) // 위에서 만든 client
    .addConverterFactory(GsonConverterFactory.create())
    .build()
```

---

### 방법 2: local.properties 사용 (더 안전)

#### 1단계: local.properties에 키 추가

```properties
# local.properties (Git에 커밋하지 말 것!)
supabase.anon.key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
client.api.key=여기에_CLIENT_API_KEY_입력
```

#### 2단계: build.gradle.kts에서 읽기

```kotlin
// app/build.gradle.kts
import java.util.Properties

val localProperties = Properties()
localProperties.load(project.rootProject.file("local.properties").inputStream())

android {
    defaultConfig {
        buildConfigField(
            "String",
            "SUPABASE_ANON_KEY",
            "\"${localProperties.getProperty("supabase.anon.key")}\""
        )
        buildConfigField(
            "String",
            "CLIENT_API_KEY",
            "\"${localProperties.getProperty("client.api.key")}\""
        )
    }
}
```

---

## 🍎 iOS 구현 방법

### 방법 1: Config 구조체 사용

#### 1단계: Config.swift 파일 생성

```swift
// Config.swift
import Foundation

struct APIConfig {
    static let supabaseURL = "https://iwpgvdtfpwazzfeniusk.supabase.co"

    static let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3cGd2ZHRmcHdhenpmZW5pdXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNzEzOTQsImV4cCI6MjA2NjY0NzM5NH0.d0pjIvnOdPGbc_-cfqRNu9yOIutyO1eex848k1yNZJE"

    static let clientAPIKey = "여기에_CLIENT_API_KEY_입력"
}
```

⚠️ **주의**: Config.swift는 `.gitignore`에 추가하세요!

#### 2단계: URLRequest에 헤더 추가

```swift
// URLSession 사용 예시
func fetchWeatherData(code: String, date: String) async throws -> WeatherData {
    let urlString = "\(APIConfig.supabaseURL)/functions/v1/get-ad-weather-data?code=\(code)&date=\(date)"

    guard let url = URL(string: urlString) else {
        throw APIError.invalidURL
    }

    var request = URLRequest(url: url)

    // 인증 헤더 추가
    request.setValue("Bearer \(APIConfig.supabaseAnonKey)", forHTTPHeaderField: "Authorization")
    request.setValue(APIConfig.clientAPIKey, forHTTPHeaderField: "x-api-key")

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode == 200 else {
        throw APIError.unauthorized
    }

    return try JSONDecoder().decode(WeatherData.self, from: data)
}
```

#### 3단계: Alamofire 사용 시

```swift
import Alamofire

class APIManager {
    static let shared = APIManager()

    private let session: Session = {
        let interceptor = AuthInterceptor()
        return Session(interceptor: interceptor)
    }()

    func fetchWeatherData(code: String, date: String) async throws -> WeatherData {
        let url = "\(APIConfig.supabaseURL)/functions/v1/get-ad-weather-data"
        let parameters = ["code": code, "date": date]

        return try await session.request(url, parameters: parameters)
            .validate()
            .serializingDecodable(WeatherData.self)
            .value
    }
}

// AuthInterceptor
class AuthInterceptor: RequestInterceptor {
    func adapt(_ urlRequest: URLRequest, for session: Session, completion: @escaping (Result<URLRequest, Error>) -> Void) {
        var urlRequest = urlRequest
        urlRequest.setValue("Bearer \(APIConfig.supabaseAnonKey)", forHTTPHeaderField: "Authorization")
        urlRequest.setValue(APIConfig.clientAPIKey, forHTTPHeaderField: "x-api-key")
        completion(.success(urlRequest))
    }
}
```

---

### 방법 2: xcconfig 파일 사용 (권장)

#### 1단계: Config.xcconfig 파일 생성

```
// Config.xcconfig (Git에 커밋하지 말 것!)
SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
CLIENT_API_KEY = 여기에_CLIENT_API_KEY_입력
```

#### 2단계: Info.plist에 추가

```xml
<key>SupabaseAnonKey</key>
<string>$(SUPABASE_ANON_KEY)</string>
<key>ClientAPIKey</key>
<string>$(CLIENT_API_KEY)</string>
```

#### 3단계: Swift에서 읽기

```swift
struct APIConfig {
    static var supabaseAnonKey: String {
        Bundle.main.object(forInfoDictionaryKey: "SupabaseAnonKey") as? String ?? ""
    }

    static var clientAPIKey: String {
        Bundle.main.object(forInfoDictionaryKey: "ClientAPIKey") as? String ?? ""
    }
}
```

---

## 🧪 테스트 방법

### 1. 헤더 없이 호출 (실패해야 정상)

```bash
curl "https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/get-ad-weather-data?code=DT_0001&date=2025-12-28"
```

**예상 결과**:
```json
{"code":401,"message":"Missing authorization header"}
```

### 2. Authorization만 있을 때 (실패해야 정상)

```bash
curl -H "Authorization: Bearer {ANON_KEY}" \
  "https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/get-ad-weather-data?code=DT_0001&date=2025-12-28"
```

**예상 결과**:
```json
{"success":false,"error":"Unauthorized","message":"인증되지 않은 요청입니다."}
```

### 3. 두 헤더 모두 있을 때 (성공)

```bash
curl -H "Authorization: Bearer {ANON_KEY}" \
     -H "x-api-key: {CLIENT_API_KEY}" \
  "https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/get-ad-weather-data?code=DT_0001&date=2025-12-28"
```

**예상 결과**: 날씨 데이터 JSON 정상 반환

---

## 📡 영향받는 API 엔드포인트

다음 API들이 모두 두 개의 헤더를 필요로 합니다:

### 클라이언트 앱용 API (x-api-key 필요)
- ✅ `/functions/v1/get-ad-weather-data` - 광고 포함 날씨 데이터
- ✅ `/functions/v1/get-weather-tide-data` - 날씨 + 조석 데이터
- ✅ `/functions/v1/track-ad-event` - 광고 이벤트 추적 (POST)

### 관리자 API (x-admin-secret 필요)
- `/functions/v1/manage-ad-repo` - 광고 관리 (관리 페이지 전용)

---

## ⚠️ 주의사항

### 1. API 키 보안
- ✅ BuildConfig / local.properties / xcconfig 사용
- ✅ Git에 키 커밋하지 않기 (.gitignore 추가)
- ❌ 소스 코드에 직접 하드코딩 금지

### 2. 에러 처리
```kotlin
// Android 예시
try {
    val response = apiService.getWeatherData(code, date)
    // 성공 처리
} catch (e: HttpException) {
    when (e.code()) {
        401 -> {
            // 인증 실패 - API 키 확인 필요
            showError("인증 오류. 앱을 업데이트해주세요.")
        }
        429 -> {
            // Rate limit 초과
            showError("요청이 너무 많습니다. 잠시 후 다시 시도해주세요.")
        }
        else -> {
            showError("네트워크 오류")
        }
    }
}
```

### 3. Rate Limiting
- 분당 100회 제한
- 초과 시 429 에러 발생
- 적절한 캐싱 및 재시도 로직 구현 권장

---

## 📅 적용 일정

- **적용 완료일**: 2025-12-28
- **기존 앱 지원**: 기존 버전은 2026-01-31까지 동작 (유예 기간)
- **필수 업데이트**: 2026-02-01부터 인증 헤더 필수

---

## 🆘 문제 해결

### 401 Unauthorized 에러
1. `Authorization` 헤더가 올바른지 확인
2. `x-api-key` 헤더가 포함되었는지 확인
3. CLIENT_API_KEY 값이 정확한지 확인

### 429 Too Many Requests
- 요청 빈도 줄이기
- 캐싱 구현
- 재시도 간격 증가

### CORS 에러 (웹뷰 사용 시)
- 네이티브 HTTP 클라이언트 사용 (WebView 아님)
- OkHttp / URLSession 사용 권장

---

## 📞 연락처

질문이나 문제가 있으면 백엔드 담당자에게 연락하세요.

- CLIENT_API_KEY 분실 시 재발급 요청
- 테스트 계정 필요 시 요청
- API 문제 발생 시 즉시 보고

---

**업데이트 완료 후 꼭 테스트해주세요!** ✅
