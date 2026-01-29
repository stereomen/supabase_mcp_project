# API 업데이트 공지 - 타임스탬프 타임존 수정

**배포일**: 2025-12-18 (최종 업데이트: 2025-12-19)
**영향 API**: `get-weather-tide-data`
**변경 유형**: 버그 수정 (Breaking Change)

## 변경 내용 요약

타임스탬프 필드들이 올바른 타임존으로 반환되도록 수정되었습니다:
1. **중기예보 데이터**: KST 필드가 올바른 한국 표준시로 반환
2. **OpenWeatherMap 데이터**: 로컬 시간 필드가 올바른 로컬 타임존으로 반환

---

## 1. 중기예보 데이터 (marine, temper)

중기예보 데이터의 KST 타임스탬프 필드(`tm_fc_kr`, `tm_ef_kr`)가 올바른 한국 표준시(KST)로 반환되도록 수정되었습니다.

### 수정 전 (버그)
모든 타임스탬프가 UTC로 반환되었습니다:
```json
{
  "marine": [
    {
      "tm_fc": "2025-12-03T21:00:00.000Z",
      "tm_fc_kr": "2025-12-03T21:00:00.000Z",  // ❌ UTC로 잘못 반환
      "tm_ef": "2025-12-04T21:00:00.000Z",
      "tm_ef_kr": "2025-12-04T21:00:00.000Z"   // ❌ UTC로 잘못 반환
    }
  ],
  "temper": [
    {
      "tm_fc": "2025-12-03T21:00:00.000Z",
      "tm_fc_kr": "2025-12-03T21:00:00.000Z",  // ❌ UTC로 잘못 반환
      "tm_ef": "2025-12-04T21:00:00.000Z",
      "tm_ef_kr": "2025-12-04T21:00:00.000Z"   // ❌ UTC로 잘못 반환
    }
  ]
}
```

### 수정 후 (정상)
KST 필드가 올바른 한국 시간대로 반환됩니다:
```json
{
  "marine": [
    {
      "tm_fc": "2025-12-03T21:00:00.000Z",
      "tm_fc_kr": "2025-12-04T06:00:00+09:00",  // ✅ KST로 정상 반환
      "tm_ef": "2025-12-04T21:00:00.000Z",
      "tm_ef_kr": "2025-12-05T06:00:00+09:00"   // ✅ KST로 정상 반환
    }
  ],
  "temper": [
    {
      "tm_fc": "2025-12-03T21:00:00.000Z",
      "tm_fc_kr": "2025-12-04T06:00:00+09:00",  // ✅ KST로 정상 반환
      "tm_ef": "2025-12-04T21:00:00.000Z",
      "tm_ef_kr": "2025-12-05T06:00:00+09:00"   // ✅ KST로 정상 반환
    }
  ]
}
```

### 중기예보 필드 설명

| 필드 | 타임존 | 설명 | 예시 |
|------|--------|------|------|
| `tm_fc` | UTC | 예보 발표 시각 (협정 세계시) | `2025-12-03T21:00:00.000Z` |
| `tm_fc_kr` | KST | 예보 발표 시각 (한국 표준시) | `2025-12-04T06:00:00+09:00` |
| `tm_ef` | UTC | 예보 대상 시각 (협정 세계시) | `2025-12-04T21:00:00.000Z` |
| `tm_ef_kr` | KST | 예보 대상 시각 (한국 표준시) | `2025-12-05T06:00:00+09:00` |

---

## 2. OpenWeatherMap 데이터 (openweathermap)

OpenWeatherMap 데이터의 로컬 시간 필드(`observation_time_local`)가 올바른 로컬 타임존으로 반환되도록 수정되었습니다.

### 수정 전 (버그)
로컬 시간 값은 맞지만 타임존이 UTC(`+00`)로 잘못 표시되었습니다:
```json
{
  "openweathermap": {
    "current": [
      {
        "observation_time_utc": "2025-12-08T14:22:12.000Z",
        "observation_time_local": "2025-12-08T23:22:12.000Z",  // ❌ UTC로 잘못 반환
        "temp": 5.2,
        "weather_main": "Clear"
      }
    ],
    "forecast": [
      {
        "observation_time_utc": "2025-12-09T03:00:00.000Z",
        "observation_time_local": "2025-12-09T12:00:00.000Z",  // ❌ UTC로 잘못 반환
        "temp": 7.8,
        "weather_main": "Clouds"
      }
    ]
  }
}
```

### 수정 후 (정상)
로컬 시간 필드가 올바른 타임존으로 반환됩니다:
```json
{
  "openweathermap": {
    "current": [
      {
        "observation_time_utc": "2025-12-08T14:22:12.000Z",
        "observation_time_local": "2025-12-08T23:22:12+09:00",  // ✅ KST로 정상 반환
        "timezone_offset": 32400,  // ✅ 신규 필드 추가
        "temp": 5.2,
        "weather_main": "Clear"
      }
    ],
    "forecast": [
      {
        "observation_time_utc": "2025-12-09T03:00:00.000Z",
        "observation_time_local": "2025-12-09T12:00:00+09:00",  // ✅ KST로 정상 반환
        "timezone_offset": 32400,  // ✅ 신규 필드 추가
        "temp": 7.8,
        "weather_main": "Clouds"
      }
    ]
  }
}
```

### 신규 필드

| 필드 | 타입 | 설명 | 예시 |
|------|------|------|------|
| `timezone_offset` | number | UTC 기준 타임존 오프셋 (초 단위) | `32400` (KST = UTC+9) |

### OpenWeatherMap 필드 설명

| 필드 | 타임존 | 설명 | 예시 |
|------|--------|------|------|
| `observation_time_utc` | UTC | 관측/예보 시각 (협정 세계시) | `2025-12-08T14:22:12.000Z` |
| `observation_time_local` | Local | 관측/예보 시각 (지역 표준시) | `2025-12-08T23:22:12+09:00` |
| `timezone_offset` | - | 타임존 오프셋 (초) | `32400` |

---

## 통합 클라이언트 조치 사항

### ⚠️ 필수 확인 사항 (모든 데이터)

**중기예보(`marine`, `temper`) 또는 OpenWeatherMap 데이터를 사용하고 계셨다면**, 다음을 확인해주세요:

1. **타임존 파싱 로직 점검**
   - **중기예보**: `tm_fc_kr`, `tm_ef_kr` 필드를 KST(`+09:00`)로 파싱
   - **OpenWeatherMap**: `observation_time_local` 필드를 해당 지역 타임존으로 파싱
   - ISO 8601 형식 문자열을 지원하는 라이브러리 사용 **필수**

2. **시간 변환 로직 제거**
   - 기존에 UTC를 받아서 로컬 시간으로 변환하는 로직이 있었다면 **제거 필요**
   - `_kr` 및 `_local` 필드는 이미 변환되어 제공됩니다

3. **UI 표시 확인**
   - 사용자에게 표시되는 시간이 올바른지 확인
   - 중기예보: 9시간 차이 확인 (UTC vs KST)
   - OpenWeatherMap: 각 지역의 타임존 오프셋 확인

4. **신규 필드 활용**
   - OpenWeatherMap의 `timezone_offset` 필드를 활용하여 타임존 정보 표시 가능

### 권장 사항

- **UTC 필드 사용**: 서버 내부 로직, 비교, 정렬에는 UTC 필드 사용 권장
  - 중기예보: `tm_fc`, `tm_ef`
  - OpenWeatherMap: `observation_time_utc`

- **로컬 필드 사용**: 사용자에게 표시할 때만 로컬 타임존 필드 사용
  - 중기예보: `tm_fc_kr`, `tm_ef_kr`
  - OpenWeatherMap: `observation_time_local`

- **타임존 명시**: 앱에서 시간을 표시할 때 타임존을 명시적으로 표시 권장
  - 예: "2025-12-08 23:22 (KST)", "12월 8일 오후 11:22"

---

## 통합 코드 예시

### JavaScript/TypeScript
```typescript
// 중기예보 KST 파싱
const kstTime = new Date("2025-12-04T06:00:00+09:00");
const utcTime = new Date("2025-12-03T21:00:00.000Z");
console.log(kstTime.getTime() === utcTime.getTime()); // true (같은 시점)

// OpenWeatherMap 로컬 시간 파싱
const localTime = new Date("2025-12-08T23:22:12+09:00");
console.log(localTime.toLocaleString('ko-KR', {
  timeZone: 'Asia/Seoul',
  dateStyle: 'short',
  timeStyle: 'short'
})); // "25. 12. 8. 오후 11:22"

// timezone_offset 활용
const offset = 32400; // seconds
const offsetHours = offset / 3600; // 9
console.log(`UTC+${offsetHours}`); // "UTC+9"
```

### Kotlin (Android)
```kotlin
// 중기예보 KST 파싱
val kstTime = Instant.parse("2025-12-04T06:00:00+09:00")
val utcTime = Instant.parse("2025-12-03T21:00:00.000Z")
println(kstTime == utcTime) // true (같은 시점)

// OpenWeatherMap 로컬 시간 파싱
val localTime = Instant.parse("2025-12-08T23:22:12+09:00")
val formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
    .withZone(ZoneId.of("Asia/Seoul"))
println(formatter.format(localTime)) // "2025-12-08 23:22"

// timezone_offset 활용
val offset = 32400L // seconds
val zoneOffset = ZoneOffset.ofTotalSeconds(offset.toInt())
println(zoneOffset) // "+09:00"
```

### Swift (iOS)
```swift
// 중기예보 KST 파싱
let isoFormatter = ISO8601DateFormatter()
isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

let kstTime = isoFormatter.date(from: "2025-12-04T06:00:00+09:00")
let utcTime = isoFormatter.date(from: "2025-12-03T21:00:00.000Z")
print(kstTime == utcTime) // true (같은 시점)

// OpenWeatherMap 로컬 시간 파싱
let localTime = isoFormatter.date(from: "2025-12-08T23:22:12+09:00")
let dateFormatter = DateFormatter()
dateFormatter.dateStyle = .medium
dateFormatter.timeStyle = .short
dateFormatter.timeZone = TimeZone(identifier: "Asia/Seoul")
print(dateFormatter.string(from: localTime!)) // "Dec 8, 2025 at 11:22 PM"

// timezone_offset 활용
let offset = 32400 // seconds
let hours = offset / 3600
print("UTC+\(hours)") // "UTC+9"
```

---

## 문의

변경 사항에 대한 문의사항이 있으시면 개발팀에 연락주시기 바랍니다.

---
**업데이트 히스토리**
- 2025-12-18: 중기예보 KST 타임스탬프 필드 수정
- 2025-12-19: OpenWeatherMap 로컬 타임스탬프 필드 수정 및 `timezone_offset` 필드 추가
