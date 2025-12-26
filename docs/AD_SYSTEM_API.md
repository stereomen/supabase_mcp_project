# 광고 시스템 API 문서 (클라이언트용)

Android 앱에서 광고 데이터를 조회하고 이벤트를 전송하기 위한 API 문서입니다.

**Base URL:** `https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1`

---

## ⚠️ 중요 변경사항

### 2025-12-26: 다중 관측소 타겟팅 지원

**`matched_station_id` 타입 변경: `string` → `string[]` (배열)**

하나의 광고 캠페인이 여러 관측소를 타겟팅할 수 있도록 변경되었습니다.

**변경 전:**
```json
{
  "ads": [{
    "matched_station_id": "DT_0001"  // ← 단일 문자열
  }]
}
```

**변경 후:**
```json
{
  "ads": [{
    "matched_station_id": ["DT_0001", "DT_0005", "DT_0012"]  // ← 배열
  }]
}
```

**클라이언트 코드 수정 필요:**
```kotlin
// 변경 전
data class Ad(
    val matched_station_id: String?
)

// 변경 후
data class Ad(
    val matched_station_id: List<String>?  // ← List로 변경
)
```

**하위 호환성:** 기존 단일 관측소 캠페인은 `["DT_0001"]` 형태의 단일 원소 배열로 자동 변환됨

---

### 2025-12-25: API 응답 구조 변경: `ad` → `ads` (배열)

**변경 전 (구버전):**
```json
{
  "ad": {
    "id": "...",
    "campaign_name": "...",
    "priority": 10
  }
}
```

**변경 후 (신규버전):**
```json
{
  "ads": [
    {
      "id": "...",
      "campaign_name": "...",
      "priority": 80
    },
    {
      "id": "...",
      "campaign_name": "...",
      "priority": 10
    }
  ]
}
```

### 주요 변경점

1. **필드명 변경**: `ad` (객체) → `ads` (배열)
2. **다중 광고 지원**: 서버가 활성 광고를 **모두** 반환 (우선순위 순 정렬)
3. **클라이언트 선택**: 앱에서 `ads[0]` (최우선순위) 광고를 표시하거나 자체 로직으로 선택
4. **우선순위 정렬**: 서버가 `priority` 내림차순으로 정렬하여 전송
5. **빈 배열 처리**: 광고 없으면 `"ads": []` (빈 배열)

### 마이그레이션 가이드

**기존 코드:**
```kotlin
response.ad?.let { ad ->
    showAdBanner(ad)
}
```

**신규 코드:**
```kotlin
// 방법 1: 최우선순위 광고만 표시
response.ads.firstOrNull()?.let { ad ->
    showAdBanner(ad)
}

// 방법 2: 여러 광고 중 선택 (예: 랜덤)
response.ads.takeIf { it.isNotEmpty() }?.let { ads ->
    val selectedAd = ads.random()
    showAdBanner(selectedAd)
}

// 방법 3: 모든 광고 캐러셀로 표시
if (response.ads.isNotEmpty()) {
    showAdCarousel(response.ads)
}
```

### Impression 이벤트 처리 변경

- **변경 전**: 서버가 자동으로 광고 반환 시 impression 기록
- **변경 후**: **클라이언트가 실제 노출한 광고에 대해서만** `track-ad-event` 호출 필요

```kotlin
// 광고 표시 후 impression 이벤트 전송
response.ads.firstOrNull()?.let { ad ->
    showAdBanner(ad)

    // Impression 이벤트 전송 (새로 추가됨)
    trackAdEvent(ad.id, "impression", stationCode)
}
```

---

## 목차

1. [인증](#인증)
2. [광고 조회 API](#광고-조회-api)
3. [광고 이벤트 전송](#광고-이벤트-전송)
4. [데이터 모델](#데이터-모델)
5. [에러 처리](#에러-처리)
6. [Android 통합 가이드](#android-통합-가이드)

---

## 인증

모든 API 요청에는 Supabase Anon Key를 사용한 Bearer 토큰 인증이 필요합니다.

```http
Authorization: Bearer YOUR_SUPABASE_ANON_KEY
```

---

## 광고 조회 API

### GET /get-ad-weather-data

날씨, 조석 데이터와 함께 관측소별 활성 광고를 **모두** 조회합니다.

#### 요청 파라미터

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| code | string | Yes | 관측소 코드 (예: DT_0001, DT_0005) |
| date | string | Yes | 조회 날짜 (YYYYMMDD 또는 YYYY-MM-DD) |
| time | string | No | 조회 시각 (HHMM 형식) |

#### 요청 예시

```bash
curl "https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/get-ad-weather-data?code=DT_0001&date=20251223" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

#### Kotlin/Retrofit 예시

```kotlin
interface WeatherAdService {
    @GET("get-ad-weather-data")
    suspend fun getWeatherWithAd(
        @Query("code") stationCode: String,
        @Query("date") date: String,
        @Header("Authorization") auth: String
    ): WeatherAdResponse
}

// 사용
val response = weatherAdService.getWeatherWithAd(
    stationCode = "DT_0001",
    date = "20251223",
    auth = "Bearer $SUPABASE_ANON_KEY"
)
```

#### 응답 구조

```json
{
  "version": "2025-12-25-v3",
  "ads": [
    {
      "id": "c6c86206-4c83-4160-8bd3-8e1bb2886660",
      "partner_id": "PARTNER_0015",
      "partner_name": "고성 낚시포인트",
      "campaign_name": "겨울 낚시 장비 할인",
      "matched_station_id": ["DT_0001"],
      "matched_area": "동해북부",
      "image_a_url": "https://example.com/banner.jpg",
      "image_b_url": null,
      "landing_url": "https://example.com/winter-sale",
      "ad_type_a": "banner",
      "ad_type_b": null,
      "priority": 80,
      "business_type": "낚시가게",
      "business_level": 6
    },
    {
      "id": "d58d50c2-7b9c-49af-8c82-bd97f6cfb832",
      "partner_id": "PARTNER_004",
      "partner_name": "서해 피싱샵",
      "campaign_name": "태안 갯바위 낚시투어",
      "matched_station_id": ["DT_0001"],
      "matched_area": "서해중부",
      "image_a_url": "https://example.com/tour-banner.jpg",
      "image_b_url": "https://example.com/tour-popup.jpg",
      "landing_url": "https://example.com/taean-tour",
      "ad_type_a": "banner",
      "ad_type_b": "popup",
      "priority": 10,
      "business_type": "낚시가게",
      "business_level": 4
    }
  ],
  "weather_forecasts": [...],
  "tide_data": [...],
  "marine_observations": {...},
  "marine": [...],
  "temper": [...]
}
```

#### 광고 데이터 필드

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | 광고 캠페인 고유 ID (이벤트 전송 시 필요) |
| partner_id | string | 제휴사 ID |
| partner_name | string | 제휴사 이름 |
| campaign_name | string | 캠페인명 |
| matched_station_id | string[]\|null | 매칭된 관측소 코드 배열 (null이면 전체 관측소 대상) |
| matched_area | string\|null | 매칭된 해역 (null이면 전체 해역 대상) |
| image_a_url | string | 광고 이미지 A URL |
| image_b_url | string\|null | 광고 이미지 B URL (선택) |
| landing_url | string | 랜딩 페이지 URL |
| ad_type_a | string | 광고 타입 A (banner/popup/inline/native) |
| ad_type_b | string\|null | 광고 타입 B (선택) |
| priority | integer | 우선순위 (0-100, 높을수록 우선) |
| business_type | string | 업종 |
| business_level | integer | 사업자 등급 |

**중요:**
- 광고가 없는 경우 `ads` 필드는 `[]` (빈 배열)
- **배열은 이미 우선순위 순으로 정렬됨** (priority 내림차순)
- 첫 번째 광고(`ads[0]`)가 최우선순위 광고
- **클라이언트가 실제로 노출한 광고에 대해 impression 이벤트를 전송해야 함**

---

## 광고 이벤트 전송

사용자가 광고를 **보거나(impression)** **클릭했을(click)** 때 이벤트를 전송합니다.

### POST /track-ad-event

#### 요청 Body

```json
{
  "ad_repo_id": "c6c86206-4c83-4160-8bd3-8e1bb2886660",
  "event_type": "impression",
  "station_id": "DT_0001"
}
```

#### 요청 필드

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| ad_repo_id | UUID | Yes | 광고 캠페인 ID (`ads[i].id`) |
| event_type | string | Yes | 이벤트 타입 ("impression" 또는 "click") |
| station_id | string | No | 관측소 코드 |

#### Kotlin/Retrofit 예시

```kotlin
interface AdEventService {
    @POST("track-ad-event")
    suspend fun trackEvent(
        @Body request: TrackEventRequest,
        @Header("Authorization") auth: String
    ): TrackEventResponse
}

data class TrackEventRequest(
    val ad_repo_id: String,
    val event_type: String,
    val station_id: String?
)

// 사용 - Impression 이벤트
fun onAdShown(adId: String, stationId: String) {
    lifecycleScope.launch {
        try {
            adEventService.trackEvent(
                request = TrackEventRequest(
                    ad_repo_id = adId,
                    event_type = "impression",
                    station_id = stationId
                ),
                auth = "Bearer $SUPABASE_ANON_KEY"
            )
        } catch (e: Exception) {
            Log.e("AdEvent", "Failed to track impression", e)
        }
    }
}

// 사용 - Click 이벤트
fun onAdClick(adId: String, stationId: String) {
    lifecycleScope.launch {
        try {
            adEventService.trackEvent(
                request = TrackEventRequest(
                    ad_repo_id = adId,
                    event_type = "click",
                    station_id = stationId
                ),
                auth = "Bearer $SUPABASE_ANON_KEY"
            )
        } catch (e: Exception) {
            Log.e("AdEvent", "Failed to track click", e)
        }
    }
}
```

#### 응답

```json
{
  "message": "Event tracked successfully",
  "event_id": "770e8400-e29b-41d4-a716-446655440000"
}
```

---

## 데이터 모델

### Ad (광고)

```kotlin
data class Ad(
    val id: String,                          // UUID
    val partner_id: String?,                 // 제휴사 ID
    val partner_name: String?,               // 제휴사 이름
    val campaign_name: String,               // 캠페인명
    val matched_station_id: List<String>?,   // 매칭 관측소 배열 (null = 전체)
    val matched_area: String?,               // 매칭 해역 (null = 전체)
    val image_a_url: String,                 // 이미지 A URL
    val image_b_url: String?,                // 이미지 B URL (선택)
    val landing_url: String,                 // 랜딩 URL
    val ad_type_a: String?,                  // 광고 타입 A
    val ad_type_b: String?,                  // 광고 타입 B (선택)
    val priority: Int,                       // 우선순위 (0-100)
    val business_type: String?,              // 업종
    val business_level: Int?                 // 사업자 등급
)
```

### WeatherAdResponse (전체 응답)

```kotlin
data class WeatherAdResponse(
    val version: String?,                // API 버전
    val ads: List<Ad>,                   // 광고 목록 (우선순위 순 정렬, 빈 배열 가능)
    val weather_forecasts: List<WeatherForecast>,
    val tide_data: List<TideData>,
    val marine_observations: MarineObservations,
    val marine: List<MediumForecast>,
    val temper: List<TempForecast>
)
```

---

## 에러 처리

### HTTP 상태 코드

| Status | Description |
|--------|-------------|
| 200 | 성공 |
| 400 | 잘못된 요청 파라미터 |
| 401 | 인증 실패 |
| 500 | 서버 내부 오류 |

### 에러 응답 형식

```json
{
  "error": "Missing required parameter: code"
}
```

### 권장 에러 처리

```kotlin
try {
    val response = weatherAdService.getWeatherWithAd(...)

    // 광고 표시 (최우선순위 광고 선택)
    response.ads.firstOrNull()?.let { ad ->
        showAdBanner(ad)

        // Impression 이벤트 전송
        trackAdImpression(ad.id, stationCode)
    }

    // 날씨/조석 데이터 표시
    showWeatherData(response.weather_forecasts)
    showTideData(response.tide_data)

} catch (e: HttpException) {
    when (e.code()) {
        400 -> Log.e("API", "Invalid parameters")
        401 -> Log.e("API", "Authentication failed")
        500 -> Log.e("API", "Server error")
        else -> Log.e("API", "Unknown error: ${e.code()}")
    }
} catch (e: Exception) {
    Log.e("API", "Network error", e)
}
```

---

## Android 통합 가이드

### 1. Retrofit 설정

```kotlin
// build.gradle.kts
dependencies {
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.11.0")
}
```

```kotlin
// RetrofitClient.kt
object RetrofitClient {
    private const val BASE_URL = "https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/"
    private const val SUPABASE_ANON_KEY = "YOUR_ANON_KEY"

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val client = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .addInterceptor { chain ->
            val request = chain.request().newBuilder()
                .addHeader("Authorization", "Bearer $SUPABASE_ANON_KEY")
                .build()
            chain.proceed(request)
        }
        .build()

    val weatherAdService: WeatherAdService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(WeatherAdService::class.java)
    }

    val adEventService: AdEventService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(AdEventService::class.java)
    }
}
```

### 2. API 인터페이스

```kotlin
// WeatherAdService.kt
interface WeatherAdService {
    @GET("get-ad-weather-data")
    suspend fun getWeatherWithAd(
        @Query("code") stationCode: String,
        @Query("date") date: String,
        @Query("time") time: String? = null
    ): WeatherAdResponse
}

// AdEventService.kt
interface AdEventService {
    @POST("track-ad-event")
    suspend fun trackEvent(
        @Body request: TrackEventRequest
    ): TrackEventResponse
}

data class TrackEventRequest(
    val ad_repo_id: String,
    val event_type: String,  // "impression" or "click"
    val station_id: String? = null
)

data class TrackEventResponse(
    val message: String,
    val event_id: String
)
```

### 3. ViewModel 사용 예시

```kotlin
class WeatherViewModel : ViewModel() {
    private val weatherAdService = RetrofitClient.weatherAdService
    private val adEventService = RetrofitClient.adEventService

    private val _weatherData = MutableLiveData<WeatherAdResponse>()
    val weatherData: LiveData<WeatherAdResponse> = _weatherData

    fun loadWeatherWithAd(stationCode: String, date: String) {
        viewModelScope.launch {
            try {
                val response = weatherAdService.getWeatherWithAd(stationCode, date)
                _weatherData.value = response
            } catch (e: Exception) {
                Log.e("WeatherViewModel", "Failed to load data", e)
            }
        }
    }

    fun trackAdImpression(adId: String, stationId: String) {
        viewModelScope.launch {
            try {
                adEventService.trackEvent(
                    TrackEventRequest(
                        ad_repo_id = adId,
                        event_type = "impression",
                        station_id = stationId
                    )
                )
            } catch (e: Exception) {
                Log.e("WeatherViewModel", "Failed to track impression", e)
            }
        }
    }

    fun onAdClick(adId: String, stationId: String, landingUrl: String) {
        // 1. 클릭 이벤트 전송 (비동기, 실패해도 무시)
        viewModelScope.launch {
            try {
                adEventService.trackEvent(
                    TrackEventRequest(
                        ad_repo_id = adId,
                        event_type = "click",
                        station_id = stationId
                    )
                )
            } catch (e: Exception) {
                Log.e("WeatherViewModel", "Failed to track click", e)
            }
        }

        // 2. 랜딩 페이지 열기 (즉시)
        openBrowser(landingUrl)
    }
}
```

### 4. UI 컴포넌트 예시

```kotlin
class WeatherFragment : Fragment() {
    private val viewModel: WeatherViewModel by viewModels()
    private var currentAdId: String? = null

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // 데이터 로드
        val stationCode = "DT_0001"
        val today = SimpleDateFormat("yyyyMMdd", Locale.getDefault()).format(Date())
        viewModel.loadWeatherWithAd(stationCode, today)

        // 데이터 관찰
        viewModel.weatherData.observe(viewLifecycleOwner) { response ->
            // 날씨 표시
            updateWeatherUI(response.weather_forecasts)

            // 광고 표시 (최우선순위 광고)
            response.ads.firstOrNull()?.let { ad ->
                showAd(ad, stationCode)
            } ?: hideAd()
        }
    }

    private fun showAd(ad: Ad, stationCode: String) {
        binding.adContainer.visibility = View.VISIBLE
        currentAdId = ad.id

        // 이미지 로드 (Glide 사용)
        Glide.with(this)
            .load(ad.image_a_url)
            .into(binding.adImage)

        // 캠페인명 표시
        binding.adTitle.text = ad.campaign_name

        // Impression 이벤트 전송
        viewModel.trackAdImpression(ad.id, stationCode)

        // 클릭 이벤트
        binding.adContainer.setOnClickListener {
            viewModel.onAdClick(
                adId = ad.id,
                stationId = stationCode,
                landingUrl = ad.landing_url
            )
        }
    }

    private fun hideAd() {
        binding.adContainer.visibility = View.GONE
        currentAdId = null
    }
}
```

### 5. 광고 표시 플로우

```
┌─────────────────────┐
│  앱 실행            │
│  (날씨 화면)        │
└──────────┬──────────┘
           │
           v
┌─────────────────────────────┐
│ API 호출                    │
│ get-ad-weather-data         │
│ - code: DT_0001            │
│ - date: 20251223           │
└──────────┬──────────────────┘
           │
           v
┌─────────────────────────────┐
│ 응답 수신                   │
│ - ads: [ad1, ad2, ...]     │
│   (우선순위 순 정렬)        │
│ - weather_forecasts: [...] │
│ - tide_data: [...]         │
└──────────┬──────────────────┘
           │
           v
┌─────────────────────────────┐
│ 광고 선택                   │
│ - ads[0] (최우선순위)      │
│   또는 자체 로직으로 선택   │
└──────────┬──────────────────┘
           │
           v
┌─────────────────────────────┐
│ UI 업데이트                 │
│ - 날씨 정보 표시            │
│ - 광고 배너 표시            │
│ - Impression 이벤트 전송    │
└──────────┬──────────────────┘
           │
           v (사용자 클릭 시)
           │
┌─────────────────────────────┐
│ 광고 클릭 처리              │
│ 1. track-ad-event 호출      │
│    - event_type: "click"   │
│    - ad_repo_id: adId      │
│ 2. 브라우저로 랜딩 URL 열기 │
└─────────────────────────────┘
```

---

## 광고 선택 전략

서버가 여러 광고를 반환하므로 클라이언트에서 다양한 전략으로 광고를 선택할 수 있습니다:

### 전략 1: 최우선순위 광고 (권장)

```kotlin
val selectedAd = response.ads.firstOrNull()
```
- 가장 간단하고 서버의 우선순위를 존중
- 높은 우선순위 = 높은 광고 단가 또는 중요도

### 전략 2: 랜덤 선택

```kotlin
val selectedAd = response.ads.takeIf { it.isNotEmpty() }?.random()
```
- 여러 광고를 공정하게 노출
- 특정 광고에 편중되지 않음

### 전략 3: 가중치 랜덤

```kotlin
fun selectAdByWeightedRandom(ads: List<Ad>): Ad? {
    if (ads.isEmpty()) return null

    val totalWeight = ads.sumOf { it.priority }
    var random = Random.nextInt(totalWeight)

    for (ad in ads) {
        random -= ad.priority
        if (random < 0) return ad
    }

    return ads.first()
}
```
- 우선순위를 가중치로 사용
- 높은 우선순위일수록 선택 확률 높음

### 전략 4: 사용자 맞춤 필터링

```kotlin
// 예: 특정 업종만 표시
val fishingAds = response.ads.filter { it.business_type == "낚시가게" }
val selectedAd = fishingAds.firstOrNull()

// 예: 특정 등급 이상만 표시
val premiumAds = response.ads.filter { (it.business_level ?: 0) >= 5 }
val selectedAd = premiumAds.firstOrNull()
```

---

## 테스트

### 테스트 요청

```bash
# 광고 조회
curl "https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/get-ad-weather-data?code=DT_0050&date=20251225" \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Impression 이벤트
curl -X POST "https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/track-ad-event" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "ad_repo_id": "c6c86206-4c83-4160-8bd3-8e1bb2886660",
    "event_type": "impression",
    "station_id": "DT_0050"
  }'

# Click 이벤트
curl -X POST "https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/track-ad-event" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "ad_repo_id": "c6c86206-4c83-4160-8bd3-8e1bb2886660",
    "event_type": "click",
    "station_id": "DT_0050"
  }'
```

---

## 주의사항

1. **다중 광고 반환**
   - 서버는 조건에 맞는 **모든 활성 광고**를 우선순위 순으로 반환
   - 클라이언트가 표시할 광고를 선택 (보통 `ads[0]`)
   - 빈 배열(`[]`)인 경우 광고 없음

2. **Impression 이벤트는 클라이언트가 전송**
   - 광고를 실제로 화면에 표시한 후 `track-ad-event` 호출
   - `event_type: "impression"` 사용

3. **Click 이벤트 전송**
   - 사용자가 광고를 실제로 클릭했을 때만 전송
   - 클릭 이벤트 전송 실패는 무시 (사용자 경험에 영향 없음)

4. **광고 없을 때 처리**
   - `ads` 필드가 `[]` (빈 배열)인 경우 광고 UI를 숨김
   - 날씨/조석 데이터는 광고 유무와 관계없이 항상 제공됨

5. **이미지 캐싱**
   - 광고 이미지 로드 시 캐싱 라이브러리 사용 권장 (Glide, Coil 등)
   - 네트워크 사용량 절감 및 성능 향상

6. **날짜 형식**
   - YYYYMMDD (예: 20251225) 또는 YYYY-MM-DD (예: 2025-12-25) 모두 지원
   - 서버가 자동 변환

---

**문의:** 광고 시스템 관련 문의는 관리자에게 연락하세요.

**관리 페이지:** https://mancool.netlify.app (관리자 전용)

**API 검증 도구:** https://mancool.netlify.app/api-validator.html
