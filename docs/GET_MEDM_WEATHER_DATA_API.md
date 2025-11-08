# GET Medium-term Weather Data API 명세서

## 개요
단기예보와 중기예보를 통합하여 총 10일간의 연속적인 날씨 정보를 제공하는 API

## 기본 정보
- **URL**: `/functions/v1/get-medm-weather-data`
- **Method**: `GET`
- **Authentication**: 불필요 (JWT 검증 비활성화)

## 요청 파라미터

### Query Parameters
| 파라미터 | 타입 | 필수 | 설명 | 예시 |
|----------|------|------|------|------|
| `code` | string | 필수 | 지역 코드 | `DT_0001` |
| `date` | string | 필수 | 기준 날짜 (YYYY-MM-DD) | `2025-09-04` |

### 요청 예시
```
GET /functions/v1/get-medm-weather-data?code=DT_0001&date=2025-09-04
```

## 응답 구조

### 성공 응답 (200 OK)
```json
{
  "short_forecasts": [
    {
      "fcst_datetime_kr": "2025-09-04T15:00:00+09:00",
      "tmp": 25.0,
      "tmn": 20.0,
      "tmx": 28.0,
      "uuu": 2.5,
      "vvv": -1.2,
      "vec": 225,
      "wsd": 3.5,
      "sky": 3,
      "pty": 0,
      "pop": 20,
      "wav": 0.5,
      "pcp": "강수없음",
      "reh": 65,
      "sno": "적설없음"
    }
  ],
  "marine": [
    {
      "reg_id": "12A10000",
      "reg_sp": "I",
      "reg_name": "서해북부",
      "mod": "A02",
      "tm_fc": "2025-09-04T09:00:00Z",
      "tm_fc_kr": "2025-09-04T18:00:00+09:00",
      "tm_ef": "2025-09-07T15:00:00Z",
      "tm_ef_kr": "2025-09-08T00:00:00+09:00",
      "wh_a": 1.0,
      "wh_b": 2.0,
      "wf": "흐리고 비",
      "sky": "WB04",
      "pre": "WB09",
      "conf": null,
      "rn_st": 0,
      "forecast_type": "marine"
    }
  ],
  "temper": [
    {
      "reg_id": "11B20201",
      "reg_sp": "C",
      "reg_name": "인천",
      "mod": "A01",
      "tm_fc": "2025-09-04T09:00:00Z",
      "tm_fc_kr": "2025-09-04T18:00:00+09:00",
      "tm_ef": "2025-09-07T15:00:00Z",
      "tm_ef_kr": "2025-09-08T00:00:00+09:00",
      "c": "2",
      "min_temp": 22,
      "max_temp": 28,
      "min_temp_l": 1,
      "min_temp_h": 1,
      "max_temp_l": 1,
      "max_temp_h": 1,
      "sky": null,
      "pre": null,
      "conf": null,
      "wf": null,
      "rn_st": 0,
      "forecast_type": "temperature"
    }
  ]
}
```

## 데이터 필드 상세 설명

### 1. short_forecasts (단기예보 - 3일치)
| 필드 | 타입 | 단위 | 설명 |
|------|------|------|------|
| `fcst_datetime_kr` | string | - | 예보시각 (KST) |
| `tmp` | number | ℃ | 기온 |
| `tmn` | number | ℃ | 최저기온 |
| `tmx` | number | ℃ | 최고기온 |
| `uuu` | number | m/s | 동서바람성분 |
| `vvv` | number | m/s | 남북바람성분 |
| `vec` | number | deg | 풍향 |
| `wsd` | number | m/s | 풍속 |
| `sky` | number | - | 하늘상태 (1:맑음, 3:구름많음, 4:흐림) |
| `pty` | number | - | 강수형태 (0:없음, 1:비, 2:비/눈, 3:눈, 5:빗방울, 6:빗방울눈날림, 7:눈날림) |
| `pop` | number | % | 강수확률 |
| `wav` | number | m | 파고 |
| `pcp` | string | mm | 1시간 강수량 |
| `reh` | number | % | 습도 |
| `sno` | string | cm | 1시간 신적설 |

### 2. marine (중기 해상예보 - 4~10일째)
| 필드 | 타입 | 설명 |
|------|------|------|
| `reg_id` | string | 지역 ID |
| `reg_sp` | string | 지역 구분 (I: 해상) |
| `reg_name` | string | 지역명 |
| `mod` | string | 모델 구분 |
| `tm_fc` | string | 발표시각 (UTC) |
| `tm_fc_kr` | string | 발표시각 (KST) |
| `tm_ef` | string | 예보시각 (UTC) |
| `tm_ef_kr` | string | 예보시각 (KST) |
| `wh_a` | number | 파고 범위 시작값 |
| `wh_b` | number | 파고 범위 끝값 |
| `wf` | string | 날씨 예보 |
| `sky` | string | 하늘상태 코드 |
| `pre` | string | 강수 코드 |
| `conf` | string | 신뢰도 |
| `rn_st` | number | 강수상태 |
| `forecast_type` | string | 예보 타입 ("marine") |

### 3. temper (중기 기온예보 - 4~10일째)
| 필드 | 타입 | 단위 | 설명 |
|------|------|------|------|
| `reg_id` | string | - | 지역 ID |
| `reg_sp` | string | - | 지역 구분 (C: 시군구) |
| `reg_name` | string | - | 지역명 |
| `mod` | string | - | 모델 구분 |
| `tm_fc` | string | - | 발표시각 (UTC) |
| `tm_fc_kr` | string | - | 발표시각 (KST) |
| `tm_ef` | string | - | 예보시각 (UTC) |
| `tm_ef_kr` | string | - | 예보시각 (KST) |
| `c` | string | - | 일자 구분 |
| `min_temp` | number | ℃ | 최저기온 |
| `max_temp` | number | ℃ | 최고기온 |
| `min_temp_l` | number | - | 최저기온 하한 |
| `min_temp_h` | number | - | 최저기온 상한 |
| `max_temp_l` | number | - | 최고기온 하한 |
| `max_temp_h` | number | - | 최고기온 상한 |
| `sky` | string | - | 하늘상태 |
| `pre` | string | - | 강수확률 |
| `conf` | string | - | 신뢰도 |
| `wf` | string | - | 날씨 예보 |
| `rn_st` | number | - | 강수상태 |
| `forecast_type` | string | - | 예보 타입 ("temperature") |

## 데이터 범위
- **단기예보**: 기준일부터 3일치 (D+0 ~ D+2)
- **중기 해상예보**: 기준일 4일째부터 10일째까지 (D+3 ~ D+9)
- **중기 기온예보**: 기준일 4일째부터 10일째까지 (D+3 ~ D+9)

## 성능 최적화
- **선택적 필드 조회**: 클라이언트 사용 필드만 선별적으로 조회
- **제외된 불필요 필드**:
  - 격자 좌표 (nx, ny)
  - 지역명 (한글지역명)
  - 발표 시각 (base_date, base_time)
  - 업데이트 시간 (updated_at, updated_at_kr)
  - UTC 예보시간 (fcst_datetime)
  - 지역코드 (location_code)

## 오류 응답

### 400 Bad Request
```json
{
  "error": "Missing required parameters: code and date are required."
}
```

### 404 Not Found
```json
{
  "error": "해당 코드에 대한 지역 정보를 찾을 수 없습니다."
}
```

### 500 Internal Server Error
```json
{
  "error": "서버 오류가 발생했습니다."
}
```

## 사용 예시

### cURL
```bash
curl -X GET "https://your-project.supabase.co/functions/v1/get-medm-weather-data?code=DT_0001&date=2025-09-04"
```

### JavaScript
```javascript
const response = await fetch(
  'https://your-project.supabase.co/functions/v1/get-medm-weather-data?code=DT_0001&date=2025-09-04'
);
const data = await response.json();
console.log(`단기예보: ${data.short_forecasts.length}건`);
console.log(`해상예보: ${data.marine.length}건`);
console.log(`기온예보: ${data.temper.length}건`);
```

## 주요 특징

### **3가지 데이터 유형 통합 제공**
1. **단기예보** (3일) - 시간별 상세 예보 정보
2. **중기 해상예보** (4~10일) - 파고, 해상 날씨
3. **중기 기온예보** (4~10일) - 최고/최저기온

### **10일간 연속 예보**
- 단기예보 3일 + 중기예보 7일 = 총 10일간 끊김없는 예보
- D+0부터 D+9까지 완전한 날씨 정보 제공

### **최적화된 성능**
- 클라이언트 실사용 필드만 선별 전송
- 불필요한 메타데이터 완전 제거
- 약 50% 데이터 전송량 감소

### **병렬 처리**
- 3개 데이터 소스 동시 조회로 빠른 응답
- 독립적인 오류 처리로 안정성 보장

## 관련 함수
- `get-weather-tide-data`: 조석 정보 포함한 통합 API
- `get-kma-weather`: 단기예보 데이터 수집 함수
- `get-medm-weather`: 중기예보 데이터 수집 함수

## 주의사항
- 모든 시간은 KST(한국표준시) 기준으로 제공
- 중기예보 데이터는 해당 지역의 marine_reg_id, temper_reg_id가 설정된 경우에만 반환
- 중기예보는 단기예보보다 정확도가 낮을 수 있음