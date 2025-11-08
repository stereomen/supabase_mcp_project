# 푸시 알림 API 가이드 (앱 개발자용)

이 문서는 앱에서 푸시 알림 내역을 조회하고 활용하는 방법을 설명합니다.

---

## 📋 목차
1. [API 개요](#api-개요)
2. [알림 목록 조회 API](#알림-목록-조회-api)
3. [Android 구현 예시](#android-구현-예시)
4. [iOS 구현 예시](#ios-구현-예시)
5. [Flutter 구현 예시](#flutter-구현-예시)
6. [React Native 구현 예시](#react-native-구현-예시)
7. [테스트 방법](#테스트-방법)
8. [FAQ](#faq)

---

## API 개요

### 기본 정보

- **Base URL**: `https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1`
- **Endpoint**: `/send-firebase-notification`
- **Method**: `POST`
- **Content-Type**: `application/json`
- **인증**: 불필요 (알림 조회는 공개 API)

### 주요 기능

- ✅ 푸시 알림 발송 내역 조회
- ✅ 타입별 필터링 (프로모션/공지/메시지/뉴스)
- ✅ 페이지네이션 지원
- ✅ 성공한 알림만 반환 (실패한 알림은 제외)

---

## 알림 목록 조회 API

### Request

#### Endpoint
```
POST https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/send-firebase-notification
```

#### Headers
```
Content-Type: application/json
```

#### Body Parameters

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| `action` | String | ✅ | - | `"getNotifications"` 고정값 |
| `type` | String | ❌ | `null` | 알림 타입 필터 (`promotion`, `notice`, `message`, `news`) |
| `limit` | Integer | ❌ | `50` | 조회할 알림 개수 (최대 100 권장) |
| `offset` | Integer | ❌ | `0` | 페이지네이션 오프셋 |

#### Request 예시

**전체 알림 조회:**
```json
{
  "action": "getNotifications"
}
```

**프로모션만 조회:**
```json
{
  "action": "getNotifications",
  "type": "promotion",
  "limit": 20
}
```

**페이지네이션 (2페이지):**
```json
{
  "action": "getNotifications",
  "limit": 10,
  "offset": 10
}
```

### Response

#### Success Response (200 OK)

```json
{
  "success": true,
  "notifications": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "🎉 특별 할인",
      "body": "50% 할인 이벤트 진행중!",
      "type": "promotion",
      "promotion_url": "https://sale.company.com",
      "target_type": "topic",
      "target_value": "all_users",
      "priority": "high",
      "data_only": true,
      "status": "success",
      "fcm_message_id": "projects/...",
      "sent_at": "2024-11-08T12:30:00Z",
      "created_at": "2024-11-08T12:30:00Z",
      "updated_at": "2024-11-08T12:30:00Z",
      "additional_data": {
        "title": "🎉 특별 할인",
        "body": "50% 할인 이벤트 진행중!",
        "type": "promotion",
        "promotion_url": "https://sale.company.com"
      }
    }
  ],
  "count": 1
}
```

#### Response Fields

| 필드 | 타입 | 설명 |
|------|------|------|
| `success` | Boolean | 요청 성공 여부 |
| `notifications` | Array | 알림 목록 |
| `notifications[].id` | String (UUID) | 알림 고유 ID |
| `notifications[].title` | String | 알림 제목 |
| `notifications[].body` | String | 알림 본문 |
| `notifications[].type` | String | 알림 타입 (`promotion`, `notice`, `message`, `news`) |
| `notifications[].promotion_url` | String (nullable) | 프로모션 URL (없으면 `null`) |
| `notifications[].sent_at` | String (ISO 8601) | 발송 시각 |
| `notifications[].created_at` | String (ISO 8601) | 생성 시각 |
| `count` | Integer | 반환된 알림 개수 |

#### Error Response (500)

```json
{
  "error": "알림 내역 조회 실패",
  "message": "상세 오류 메시지"
}
```

---

## Android 구현 예시

### 1. Retrofit 설정

#### build.gradle (Module)
```gradle
dependencies {
    implementation 'com.squareup.retrofit2:retrofit:2.9.0'
    implementation 'com.squareup.retrofit2:converter-gson:2.9.0'
    implementation 'com.squareup.okhttp3:logging-interceptor:4.11.0'
}
```

#### API 인터페이스 정의

```kotlin
// NotificationApi.kt
interface NotificationApi {
    @POST("send-firebase-notification")
    suspend fun getNotifications(
        @Body request: NotificationRequest
    ): NotificationResponse
}

// Request 모델
data class NotificationRequest(
    val action: String = "getNotifications",
    val type: String? = null,
    val limit: Int = 50,
    val offset: Int = 0
)

// Response 모델
data class NotificationResponse(
    val success: Boolean,
    val notifications: List<Notification>,
    val count: Int
)

data class Notification(
    val id: String,
    val title: String,
    val body: String,
    val type: String,
    val promotion_url: String?,
    val target_type: String,
    val priority: String,
    val status: String,
    val sent_at: String,
    val created_at: String,
    val additional_data: Map<String, Any>? = null
)
```

#### Retrofit 인스턴스 생성

```kotlin
// RetrofitClient.kt
object RetrofitClient {
    private const val BASE_URL = "https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/"

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val client = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .build()

    val api: NotificationApi by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(NotificationApi::class.java)
    }
}
```

### 2. Repository 구현

```kotlin
// NotificationRepository.kt
class NotificationRepository {
    private val api = RetrofitClient.api

    // 전체 알림 조회
    suspend fun getAllNotifications(): Result<List<Notification>> {
        return try {
            val response = api.getNotifications(
                NotificationRequest(action = "getNotifications")
            )
            if (response.success) {
                Result.success(response.notifications)
            } else {
                Result.failure(Exception("알림 조회 실패"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // 타입별 알림 조회
    suspend fun getNotificationsByType(type: String): Result<List<Notification>> {
        return try {
            val response = api.getNotifications(
                NotificationRequest(
                    action = "getNotifications",
                    type = type
                )
            )
            if (response.success) {
                Result.success(response.notifications)
            } else {
                Result.failure(Exception("알림 조회 실패"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // 페이지네이션
    suspend fun getNotificationsPage(
        type: String? = null,
        limit: Int = 20,
        offset: Int = 0
    ): Result<List<Notification>> {
        return try {
            val response = api.getNotifications(
                NotificationRequest(
                    action = "getNotifications",
                    type = type,
                    limit = limit,
                    offset = offset
                )
            )
            if (response.success) {
                Result.success(response.notifications)
            } else {
                Result.failure(Exception("알림 조회 실패"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
```

### 3. ViewModel 구현

```kotlin
// NotificationViewModel.kt
class NotificationViewModel : ViewModel() {
    private val repository = NotificationRepository()

    private val _notifications = MutableLiveData<List<Notification>>()
    val notifications: LiveData<List<Notification>> = _notifications

    private val _loading = MutableLiveData<Boolean>()
    val loading: LiveData<Boolean> = _loading

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    fun loadNotifications(type: String? = null) {
        viewModelScope.launch {
            _loading.value = true
            val result = if (type != null) {
                repository.getNotificationsByType(type)
            } else {
                repository.getAllNotifications()
            }

            result.fold(
                onSuccess = {
                    _notifications.value = it
                    _error.value = null
                },
                onFailure = {
                    _error.value = it.message
                }
            )
            _loading.value = false
        }
    }
}
```

### 4. Activity/Fragment 사용 예시

```kotlin
// NotificationListActivity.kt
class NotificationListActivity : AppCompatActivity() {
    private val viewModel: NotificationViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_notification_list)

        setupObservers()

        // 전체 알림 로드
        viewModel.loadNotifications()

        // 또는 특정 타입만 로드
        // viewModel.loadNotifications("promotion")
    }

    private fun setupObservers() {
        viewModel.notifications.observe(this) { notifications ->
            updateUI(notifications)
        }

        viewModel.loading.observe(this) { isLoading ->
            // 로딩 상태 UI 업데이트
            progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
        }

        viewModel.error.observe(this) { error ->
            error?.let {
                Toast.makeText(this, it, Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun updateUI(notifications: List<Notification>) {
        // RecyclerView 등에 데이터 표시
        adapter.submitList(notifications)
    }
}
```

---

## iOS 구현 예시

### Swift + URLSession

```swift
// NotificationService.swift
import Foundation

struct NotificationRequest: Codable {
    let action: String
    let type: String?
    let limit: Int
    let offset: Int

    init(type: String? = nil, limit: Int = 50, offset: Int = 0) {
        self.action = "getNotifications"
        self.type = type
        self.limit = limit
        self.offset = offset
    }
}

struct NotificationResponse: Codable {
    let success: Bool
    let notifications: [PushNotification]
    let count: Int
}

struct PushNotification: Codable {
    let id: String
    let title: String
    let body: String
    let type: String
    let promotionUrl: String?
    let sentAt: String
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id, title, body, type
        case promotionUrl = "promotion_url"
        case sentAt = "sent_at"
        case createdAt = "created_at"
    }
}

class NotificationService {
    static let shared = NotificationService()

    private let baseURL = "https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/send-firebase-notification"

    func fetchNotifications(
        type: String? = nil,
        limit: Int = 50,
        offset: Int = 0,
        completion: @escaping (Result<[PushNotification], Error>) -> Void
    ) {
        guard let url = URL(string: baseURL) else {
            completion(.failure(NSError(domain: "Invalid URL", code: -1)))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let requestBody = NotificationRequest(type: type, limit: limit, offset: offset)

        do {
            request.httpBody = try JSONEncoder().encode(requestBody)
        } catch {
            completion(.failure(error))
            return
        }

        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }

            guard let data = data else {
                completion(.failure(NSError(domain: "No data", code: -1)))
                return
            }

            do {
                let response = try JSONDecoder().decode(NotificationResponse.self, from: data)
                if response.success {
                    completion(.success(response.notifications))
                } else {
                    completion(.failure(NSError(domain: "API Error", code: -1)))
                }
            } catch {
                completion(.failure(error))
            }
        }.resume()
    }
}
```

### 사용 예시 (SwiftUI)

```swift
// NotificationListView.swift
import SwiftUI

class NotificationViewModel: ObservableObject {
    @Published var notifications: [PushNotification] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    func loadNotifications(type: String? = nil) {
        isLoading = true

        NotificationService.shared.fetchNotifications(type: type) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success(let notifications):
                    self?.notifications = notifications
                    self?.errorMessage = nil
                case .failure(let error):
                    self?.errorMessage = error.localizedDescription
                }
            }
        }
    }
}

struct NotificationListView: View {
    @StateObject private var viewModel = NotificationViewModel()

    var body: some View {
        NavigationView {
            Group {
                if viewModel.isLoading {
                    ProgressView()
                } else if let error = viewModel.errorMessage {
                    Text("오류: \(error)")
                } else {
                    List(viewModel.notifications, id: \.id) { notification in
                        NotificationRow(notification: notification)
                    }
                }
            }
            .navigationTitle("알림")
            .onAppear {
                viewModel.loadNotifications()
            }
        }
    }
}

struct NotificationRow: View {
    let notification: PushNotification

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(notification.title)
                .font(.headline)
            Text(notification.body)
                .font(.body)
                .foregroundColor(.secondary)
            Text(formatDate(notification.sentAt))
                .font(.caption)
                .foregroundColor(.gray)
        }
        .padding(.vertical, 4)
    }

    private func formatDate(_ dateString: String) -> String {
        // ISO 8601 날짜 포맷팅
        let formatter = ISO8601DateFormatter()
        if let date = formatter.date(from: dateString) {
            let displayFormatter = DateFormatter()
            displayFormatter.dateStyle = .medium
            displayFormatter.timeStyle = .short
            return displayFormatter.string(from: date)
        }
        return dateString
    }
}
```

---

## Flutter 구현 예시

### pubspec.yaml

```yaml
dependencies:
  http: ^1.1.0
  flutter:
    sdk: flutter
```

### API 서비스

```dart
// notification_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class NotificationService {
  static const String baseUrl =
    'https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/send-firebase-notification';

  Future<NotificationResponse> getNotifications({
    String? type,
    int limit = 50,
    int offset = 0,
  }) async {
    final response = await http.post(
      Uri.parse(baseUrl),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'action': 'getNotifications',
        'type': type,
        'limit': limit,
        'offset': offset,
      }),
    );

    if (response.statusCode == 200) {
      return NotificationResponse.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('알림 조회 실패: ${response.statusCode}');
    }
  }
}

// 모델 클래스
class NotificationResponse {
  final bool success;
  final List<PushNotification> notifications;
  final int count;

  NotificationResponse({
    required this.success,
    required this.notifications,
    required this.count,
  });

  factory NotificationResponse.fromJson(Map<String, dynamic> json) {
    return NotificationResponse(
      success: json['success'],
      notifications: (json['notifications'] as List)
          .map((e) => PushNotification.fromJson(e))
          .toList(),
      count: json['count'],
    );
  }
}

class PushNotification {
  final String id;
  final String title;
  final String body;
  final String type;
  final String? promotionUrl;
  final String sentAt;

  PushNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.type,
    this.promotionUrl,
    required this.sentAt,
  });

  factory PushNotification.fromJson(Map<String, dynamic> json) {
    return PushNotification(
      id: json['id'],
      title: json['title'],
      body: json['body'],
      type: json['type'],
      promotionUrl: json['promotion_url'],
      sentAt: json['sent_at'],
    );
  }
}
```

### UI 구현

```dart
// notification_list_screen.dart
import 'package:flutter/material.dart';

class NotificationListScreen extends StatefulWidget {
  @override
  _NotificationListScreenState createState() => _NotificationListScreenState();
}

class _NotificationListScreenState extends State<NotificationListScreen> {
  final NotificationService _service = NotificationService();
  List<PushNotification> _notifications = [];
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications({String? type}) async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final response = await _service.getNotifications(type: type);
      setState(() {
        _notifications = response.notifications;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('알림'),
        actions: [
          PopupMenuButton<String>(
            onSelected: (type) {
              _loadNotifications(type: type == 'all' ? null : type);
            },
            itemBuilder: (context) => [
              PopupMenuItem(value: 'all', child: Text('전체')),
              PopupMenuItem(value: 'promotion', child: Text('프로모션')),
              PopupMenuItem(value: 'notice', child: Text('공지사항')),
              PopupMenuItem(value: 'message', child: Text('메시지')),
              PopupMenuItem(value: 'news', child: Text('뉴스')),
            ],
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return Center(child: CircularProgressIndicator());
    }

    if (_errorMessage != null) {
      return Center(child: Text('오류: $_errorMessage'));
    }

    if (_notifications.isEmpty) {
      return Center(child: Text('알림이 없습니다'));
    }

    return RefreshIndicator(
      onRefresh: () => _loadNotifications(),
      child: ListView.builder(
        itemCount: _notifications.length,
        itemBuilder: (context, index) {
          final notification = _notifications[index];
          return ListTile(
            title: Text(notification.title),
            subtitle: Text(notification.body),
            trailing: Text(
              _formatDate(notification.sentAt),
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
            onTap: () {
              if (notification.promotionUrl != null) {
                // URL 열기
              }
            },
          );
        },
      ),
    );
  }

  String _formatDate(String dateString) {
    final date = DateTime.parse(dateString);
    return '${date.month}/${date.day} ${date.hour}:${date.minute}';
  }
}
```

---

## React Native 구현 예시

### API 서비스

```javascript
// notificationService.js
const BASE_URL = 'https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/send-firebase-notification';

export const getNotifications = async (type = null, limit = 50, offset = 0) => {
  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'getNotifications',
        type,
        limit,
        offset,
      }),
    });

    const data = await response.json();

    if (data.success) {
      return data.notifications;
    } else {
      throw new Error('알림 조회 실패');
    }
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};
```

### 컴포넌트

```javascript
// NotificationList.js
import React, { useState, useEffect } from 'react';
import { View, FlatList, Text, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { getNotifications } from './notificationService';

const NotificationList = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadNotifications = async (type = null) => {
    setLoading(true);
    setError(null);

    try {
      const data = await getNotifications(type);
      setNotifications(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.body}>{item.body}</Text>
      <Text style={styles.date}>{formatDate(item.sent_at)}</Text>
    </View>
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR');
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text>오류: {error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={notifications}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Text>알림이 없습니다</Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  item: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  body: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default NotificationList;
```

---

## 테스트 방법

### 1. curl 테스트

```bash
# 전체 알림 조회
curl -X POST https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/send-firebase-notification \
  -H "Content-Type: application/json" \
  -d '{
    "action": "getNotifications"
  }'

# 프로모션만 조회
curl -X POST https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/send-firebase-notification \
  -H "Content-Type: application/json" \
  -d '{
    "action": "getNotifications",
    "type": "promotion",
    "limit": 10
  }'
```

### 2. Postman 테스트

1. **New Request** 생성
2. **Method**: POST
3. **URL**: `https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/send-firebase-notification`
4. **Headers**:
   - `Content-Type: application/json`
5. **Body** (raw, JSON):
   ```json
   {
     "action": "getNotifications",
     "type": "promotion"
   }
   ```
6. **Send** 클릭

---

## FAQ

### Q1. 인증이 필요한가요?
**A:** 알림 조회 API는 인증 없이 사용 가능합니다. 성공한 알림만 공개되도록 설정되어 있습니다.

### Q2. 실시간 업데이트가 가능한가요?
**A:** 현재는 REST API로 구현되어 있어 폴링 방식을 사용해야 합니다. 실시간 업데이트가 필요하다면 주기적으로 API를 호출하거나, WebSocket 구현을 요청하세요.

### Q3. 페이지네이션은 어떻게 구현하나요?
**A:** `limit`와 `offset` 파라미터를 사용합니다.
```json
// 1페이지 (0-9)
{ "limit": 10, "offset": 0 }

// 2페이지 (10-19)
{ "limit": 10, "offset": 10 }

// 3페이지 (20-29)
{ "limit": 10, "offset": 20 }
```

### Q4. 알림 타입 종류는?
**A:**
- `promotion`: 프로모션
- `notice`: 공지사항
- `message`: 일반 메시지
- `news`: 뉴스

### Q5. 날짜 포맷은?
**A:** ISO 8601 형식 (UTC): `2024-11-08T12:30:00Z`

### Q6. 최대 조회 개수는?
**A:** 제한은 없지만 성능을 위해 `limit`은 100 이하로 권장합니다.

### Q7. 실패한 알림도 조회되나요?
**A:** 아니오, `status = 'success'`인 알림만 반환됩니다.

### Q8. promotion_url이 없는 경우는?
**A:** `null` 값이 반환됩니다. 앱에서는 이 경우 기본 동작(예: 알림 센터 열기)을 수행하면 됩니다.

---

## 추가 지원

### 웹 알림 센터
API 외에도 웹 기반 알림 센터가 제공됩니다:
- URL: `https://mancool.netlify.app/notifications.html`
- 웹뷰로 열거나 외부 브라우저로 열기 가능

### 문의
API 사용 중 문제가 발생하면 백엔드 팀에 문의하세요.

---

**문서 버전:** 1.0.0
**최종 업데이트:** 2024-11-08
