# get-ad-weather-data API - 해상관측 구조 변경 (v19)

**변경 일자**: 2026-01-19
**버전**: v18 → v19

---

## 변경 요약

해상관측 데이터(`marine_observations`) 구조를 **a/b 필드**에서 **5개 개별 필드**로 분리했습니다.

이제 수온, 파고, 풍향, 풍속, 기온 각각에 대해 독립적인 해양관측소를 지정할 수 있습니다.

---

## 응답 구조 변경

### ❌ 기존 (v18)
```json
{
  "version": "2025-12-31-v5",
  "marine_observations": {
    "a": [
      {
        "station_id": "IE_0062",
        "observation_time_kst": "202601191400",
        "water_temperature": 8.5,
        "significant_wave_height": 1.2
      }
    ],
    "b": [
      {
        "station_id": "TW_0003",
        "observation_time_kst": "202601191400",
        "air_temperature": 3.2,
        "wind_direction": 4,
        "wind_speed": 5.3
      }
    ]
  }
}
```

### ✅ 신규 (v19)
```json
{
  "version": "2026-01-19-v1",
  "marine_observations": {
    "wt": [
      {
        "station_id": "IE_0062",
        "observation_time_kst": "202601191400",
        "water_temperature": 8.5
      }
    ],
    "swh": [
      {
        "station_id": "IE_0062",
        "observation_time_kst": "202601191400",
        "significant_wave_height": 1.2
      }
    ],
    "wd": [
      {
        "station_id": "TW_0003",
        "observation_time_kst": "202601191400",
        "wind_direction": 4
      }
    ],
    "ws": [
      {
        "station_id": "TW_0003",
        "observation_time_kst": "202601191400",
        "wind_speed": 5.3
      }
    ],
    "at": [
      {
        "station_id": "TW_0003",
        "observation_time_kst": "202601191400",
        "air_temperature": 3.2
      }
    ]
  }
}
```

---

## 필드 설명

| 필드 | 전체 명칭 | 설명 | 데이터 |
|-----|----------|------|--------|
| `wt` | Water Temperature | 수온 | `water_temperature` (℃) |
| `swh` | Significant Wave Height | 파고 | `significant_wave_height` (m) |
| `wd` | Wind Direction | 풍향 | `wind_direction` (16방위, 0-15) |
| `ws` | Wind Speed | 풍속 | `wind_speed` (m/s) |
| `at` | Air Temperature | 기온 | `air_temperature` (℃) |

---

## 클라이언트 코드 수정 가이드

### 1. 데이터 접근 방식 변경

#### ❌ 기존 코드 (동작 안 함)
```javascript
const data = response.marine_observations;

// a 필드에서 수온, 파고 가져오기
const waterTemp = data.a[0]?.water_temperature;
const waveHeight = data.a[0]?.significant_wave_height;

// b 필드에서 풍향, 풍속, 기온 가져오기
const windDir = data.b[0]?.wind_direction;
const windSpeed = data.b[0]?.wind_speed;
const airTemp = data.b[0]?.air_temperature;
```

#### ✅ 신규 코드
```javascript
const data = response.marine_observations;

// 각 필드에서 개별적으로 가져오기
const waterTemp = data.wt[0]?.water_temperature;
const waveHeight = data.swh[0]?.significant_wave_height;
const windDir = data.wd[0]?.wind_direction;
const windSpeed = data.ws[0]?.wind_speed;
const airTemp = data.at[0]?.air_temperature;
```

### 2. 관측소 ID 확인

각 필드의 `station_id`가 서로 다를 수 있으므로 필요시 확인:

```javascript
const wtStationId = data.wt[0]?.station_id;    // 수온 관측소
const swhStationId = data.swh[0]?.station_id;  // 파고 관측소
const wdStationId = data.wd[0]?.station_id;    // 풍향 관측소
const wsStationId = data.ws[0]?.station_id;    // 풍속 관측소
const atStationId = data.at[0]?.station_id;    // 기온 관측소

// 예: IE_0062 (수온, 파고), TW_0003 (풍향, 풍속, 기온)
```

### 3. 널 체크 처리

각 필드가 독립적이므로 개별 널 체크 필요:

```javascript
// ❌ 기존: a 또는 b가 없으면 모든 데이터 없음
if (data.a && data.a.length > 0) {
  // 수온, 파고 사용
}

// ✅ 신규: 각 필드별로 체크
if (data.wt && data.wt.length > 0) {
  const waterTemp = data.wt[0].water_temperature;
}
if (data.swh && data.swh.length > 0) {
  const waveHeight = data.swh[0].significant_wave_height;
}
if (data.wd && data.wd.length > 0) {
  const windDir = data.wd[0].wind_direction;
}
if (data.ws && data.ws.length > 0) {
  const windSpeed = data.ws[0].wind_speed;
}
if (data.at && data.at.length > 0) {
  const airTemp = data.at[0].air_temperature;
}
```

---

## 체크리스트

클라이언트 앱 수정 시 확인할 항목:

- [ ] `marine_observations.a` 참조를 `marine_observations.wt`, `marine_observations.swh`로 변경
- [ ] `marine_observations.b` 참조를 `marine_observations.wd`, `marine_observations.ws`, `marine_observations.at`로 변경
- [ ] 각 필드별 널 체크 로직 수정
- [ ] UI에 표시되는 관측소 ID가 여러 개일 수 있음을 고려
- [ ] API 응답의 `version` 필드 확인 로직 추가 (선택 사항)
- [ ] 테스트: 모든 필드가 정상적으로 표시되는지 확인

---

## 데이터베이스 변경사항

`tide_abs_region` 테이블 구조 변경:

### 삭제된 컬럼
- `a_제공 정보`
- `b_제공 정보`

### 추가된 컬럼
- `wt_STN_ID`, `wt_위도(LAT)`, `wt_경도(LON)`, `wt_지역명(한글)` - 수온
- `swh_STN_ID`, `swh_위도(LAT)`, `swh_경도(LON)`, `swh_지역명(한글)` - 파고
- `wd_STN_ID`, `wd_위도(LAT)`, `wd_경도(LON)`, `wd_지역명(한글)` - 풍향
- `ws_STN_ID`, `ws_위도(LAT)`, `ws_경도(LON)`, `ws_지역명(한글)` - 풍속
- `at_STN_ID`, `at_위도(LAT)`, `at_경도(LON)`, `at_지역명(한글)` - 기온

### 데이터 마이그레이션
- 기존 `a_STN ID` 데이터 → `wt_STN_ID`, `swh_STN_ID`로 복사됨
- 기존 `b_STN ID` 데이터 → `wd_STN_ID`, `ws_STN_ID`, `at_STN_ID`로 복사됨

---

## 주요 이점

1. **유연성**: 각 관측 항목마다 최적의 관측소를 개별 지정 가능
2. **명확성**: 필드명이 관측 항목을 명확하게 표현 (`wt`, `swh` 등)
3. **확장성**: 새로운 관측 항목 추가 시 기존 구조에 영향 없음
4. **추적성**: 각 데이터의 출처 관측소를 명확하게 확인 가능

---

## 문의사항

전체 API 명세는 `docs/API_get-ad-weather-data_v19.md` 참조
