# 공지사항 API 명세서

## 개요
앱 사용자를 위한 공지사항 조회 API (읽기 전용)

**Base URL:** `https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1`

---

## API 엔드포인트

### 1. 공지사항 목록 조회

전체 공지사항 목록을 조회합니다. 상단 고정 공지가 먼저 표시되고, 그 다음 최신순으로 정렬됩니다.

#### 요청

```
GET /get-notice-posts
```

#### Query Parameters

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| limit | integer | 선택 | 100 | 반환할 최대 공지사항 개수 |

#### 응답 (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "앱 업데이트 안내",
      "content": "새로운 기능이 추가되었습니다.",
      "image_url": "https://iwpgvdtfpwazzfeniusk.supabase.co/storage/v1/object/public/ad-images/notices/notice_1234567890.jpg",
      "is_pinned": true,
      "author": "Admin",
      "created_at": "2026-01-02T10:30:00.000Z",
      "updated_at": "2026-01-02T10:30:00.000Z"
    },
    {
      "id": 2,
      "title": "점검 안내",
      "content": "서버 점검이 예정되어 있습니다.",
      "image_url": null,
      "is_pinned": false,
      "author": "Admin",
      "created_at": "2026-01-01T15:20:00.000Z",
      "updated_at": "2026-01-01T15:20:00.000Z"
    }
  ],
  "count": 2
}
```

#### 필드 설명

| 필드 | 타입 | 설명 |
|------|------|------|
| id | integer | 공지사항 고유 ID |
| title | string | 공지사항 제목 (필수) |
| content | string | 공지사항 내용 (선택, null 가능) |
| image_url | string | 첨부 이미지 URL (선택, null 가능) |
| is_pinned | boolean | 상단 고정 여부 |
| author | string | 작성자 |
| created_at | string | 작성일시 (ISO 8601 형식) |
| updated_at | string | 수정일시 (ISO 8601 형식) |

#### 예시 요청

```bash
# 전체 목록 조회
curl "https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/get-notice-posts"

# 최근 10개만 조회
curl "https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/get-notice-posts?limit=10"
```

#### Kotlin 예시

```kotlin
// Retrofit Interface
interface NoticeApiService {
    @GET("get-notice-posts")
    suspend fun getNotices(
        @Query("limit") limit: Int? = null
    ): NoticeResponse
}

// Data Classes
data class NoticeResponse(
    val success: Boolean,
    val data: List<Notice>,
    val count: Int
)

data class Notice(
    val id: Int,
    val title: String,
    val content: String?,
    val image_url: String?,
    val is_pinned: Boolean,
    val author: String,
    val created_at: String,
    val updated_at: String
)

// 사용 예시
val notices = apiService.getNotices(limit = 20)
if (notices.success) {
    notices.data.forEach { notice ->
        println("${notice.title}: ${notice.content}")
        notice.image_url?.let { imageUrl ->
            // 이미지 로드
        }
    }
}
```

---

### 2. 특정 공지사항 조회

단일 공지사항의 상세 내용을 조회합니다.

#### 요청

```
GET /get-notice-posts?id={notice_id}
```

#### Query Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| id | integer | 필수 | 조회할 공지사항 ID |

#### 응답 (200 OK)

```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "앱 업데이트 안내",
    "content": "새로운 기능이 추가되었습니다.\n\n주요 변경사항:\n- 공지사항 기능 추가\n- 성능 개선",
    "image_url": "https://iwpgvdtfpwazzfeniusk.supabase.co/storage/v1/object/public/ad-images/notices/notice_1234567890.jpg",
    "is_pinned": true,
    "author": "Admin",
    "created_at": "2026-01-02T10:30:00.000Z",
    "updated_at": "2026-01-02T10:30:00.000Z"
  }
}
```

#### 예시 요청

```bash
curl "https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/get-notice-posts?id=1"
```

#### Kotlin 예시

```kotlin
// Retrofit Interface
@GET("get-notice-posts")
suspend fun getNoticeById(
    @Query("id") id: Int
): NoticeDetailResponse

// Data Class
data class NoticeDetailResponse(
    val success: Boolean,
    val data: Notice
)

// 사용 예시
val response = apiService.getNoticeById(id = 1)
if (response.success) {
    val notice = response.data
    // UI에 공지사항 표시
}
```

---

## 에러 응답

### 404 Not Found

존재하지 않는 공지사항 ID를 조회한 경우

```json
{
  "success": false,
  "error": "공지사항을 찾을 수 없습니다.",
  "message": "The result contains 0 rows"
}
```

### 500 Internal Server Error

서버 오류 발생 시

```json
{
  "success": false,
  "error": "공지사항 목록 조회 실패",
  "message": "Database connection error"
}
```

---

## 정렬 규칙

공지사항 목록은 다음 순서로 정렬됩니다:

1. **상단 고정 공지** (`is_pinned: true`) - 최신순
2. **일반 공지** (`is_pinned: false`) - 최신순

---

## Rate Limiting

- IP당 분당 100회 요청 제한
- 제한 초과 시 429 Too Many Requests 응답

```json
{
  "success": false,
  "error": "Too many requests. Please try again later."
}
```

---

## 이미지 처리 가이드

### 이미지 URL
- `image_url` 필드가 `null`이 아닌 경우 이미지가 첨부된 공지사항
- Supabase Storage의 Public URL 제공
- 직접 이미지 로드 가능 (인증 불필요)

### Kotlin 이미지 로드 예시 (Glide)

```kotlin
import com.bumptech.glide.Glide

// 이미지가 있는 경우에만 표시
notice.image_url?.let { imageUrl ->
    imageView.visibility = View.VISIBLE
    Glide.with(context)
        .load(imageUrl)
        .placeholder(R.drawable.placeholder)
        .error(R.drawable.error_image)
        .into(imageView)
} ?: run {
    imageView.visibility = View.GONE
}
```

---

## 사용 시나리오

### 1. 앱 시작 시 공지사항 확인

```kotlin
suspend fun checkNotices() {
    try {
        val response = apiService.getNotices(limit = 5)
        if (response.success && response.data.isNotEmpty()) {
            // 상단 고정 공지가 있으면 다이얼로그 표시
            response.data.firstOrNull { it.is_pinned }?.let { notice ->
                showNoticeDialog(notice)
            }
        }
    } catch (e: Exception) {
        Log.e("Notice", "Failed to fetch notices", e)
    }
}
```

### 2. 공지사항 목록 화면

```kotlin
class NoticeListViewModel : ViewModel() {
    private val _notices = MutableStateFlow<List<Notice>>(emptyList())
    val notices: StateFlow<List<Notice>> = _notices

    fun loadNotices() {
        viewModelScope.launch {
            try {
                val response = apiService.getNotices()
                if (response.success) {
                    _notices.value = response.data
                }
            } catch (e: Exception) {
                // 에러 처리
            }
        }
    }
}
```

### 3. 공지사항 상세 화면

```kotlin
fun showNoticeDetail(noticeId: Int) {
    viewModelScope.launch {
        try {
            val response = apiService.getNoticeById(id = noticeId)
            if (response.success) {
                // 상세 내용 표시
                displayNoticeDetail(response.data)
            }
        } catch (e: Exception) {
            // 에러 처리
        }
    }
}
```

---

## UI 디자인 권장사항

### 공지사항 카드

```
┌─────────────────────────────────┐
│ 📌 [상단고정] 앱 업데이트 안내     │
│ ─────────────────────────────── │
│ [이미지 썸네일]                   │
│                                 │
│ 새로운 기능이 추가되었습니다...   │
│                                 │
│ Admin · 2026.01.02             │
└─────────────────────────────────┘
```

### 상단 고정 공지 표시

- 배지 또는 핀 아이콘으로 강조 (📌)
- 배경색을 다르게 하여 구분
- 목록 최상단에 고정 표시

### 이미지 처리

- 썸네일: 16:9 비율 권장
- 상세보기: 전체 이미지 표시
- 이미지 탭 시 확대 보기

---

## 버전 히스토리

| 버전 | 날짜 | 변경사항 |
|------|------|----------|
| 1.0 | 2026-01-02 | 초기 버전 공개 |

---

## 문의

API 관련 문의사항은 관리자에게 연락해주세요.
