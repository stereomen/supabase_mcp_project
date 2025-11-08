# Marine Weather Observation Platform (MCP) API 명세서

## 개요
해양 기상 관측 플랫폼의 RESTful API 명세서입니다. 기상청 데이터 기반으로 단기/중기 기상예보, 조석정보, 해양관측 데이터를 제공합니다.

## Base URL
```
https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1
```

## 인증
대부분의 API는 인증이 필요하지 않습니다. (`--no-verify-jwt` 플래그로 배포됨)

---

## API 목록

### 1. 통합 기상/조석 데이터 조회
종합적인 해양 기상 데이터를 한 번에 조회합니다.

**`GET /get-weather-tide-data`**

#### 파라미터
| 파라미터 | 타입 | 필수 | 설명 | 예시 |
|---------|------|------|------|------|
| code | string | ✅ | 위치 코드 | DT_0001 |
| date | string | ✅ | 기준 날짜 (YYYY-MM-DD) | 2025-09-02 |
| time | string | ❌ | 시간 필터 (HHMM) | 1430 |

#### 응답 데이터
```json
{
  "weather_forecasts": [
    {
      "fcst_datetime_kr": "2025-09-02T14:00:00.000+09:00",
      "tmp": 28,
      "reh": 65,
      "wsd": 3.2,
      "location_code": "DT_0001"
    }
  ],
  "tide_data": [
    {
      "obs_date": "2025-09-02",
      "location_code": "DT_0001", 
      "lvl1": 4.2,
      "lvl2": 1.8,
      "lvl3": 4.5,
      "lvl4": 2.1
    }
  ],
  "marine_observations": {
    "a": [
      {
        "station_id": "101",
        "observation_time_kst": "202509021400",
        "water_temperature": 24.5,
        "significant_wave_height": 1.2
      }
    ],
    "b": [
      {
        "station_id": "102",
        "observation_time_kst": "202509021400", 
        "air_temperature": 28.3,
        "wind_direction": 180,
        "wind_speed": 3.2
      }
    ]
  }
}
```

#### 데이터 기간
- **기상예보**: 7일치
- **조석정보**: 14일치  
- **해양관측**: 당일 (시간 필터 적용 시 해당 시간)

---

### 2. 중기예보 데이터 조회
4-7일 중기 해상/기온 예보 데이터를 조회합니다.

**`GET /get-medm-weather-data`**

#### 파라미터
| 파라미터 | 타입 | 필수 | 설명 | 예시 |
|---------|------|------|------|------|
| code | string | ✅ | 위치 코드 | DT_0001 |
| date | string | ✅ | 기준 날짜 (YYYY-MM-DD) | 2025-09-02 |

#### 응답 데이터
```json
{
  "marine": [
    {
      "reg_id": "12A10000",
      "reg_name": "서해북부",
      "tm_ef": "2025-09-05T15:00:00+00:00",
      "tm_ef_kr": "2025-09-06T00:00:00+00:00",
      "wh_a": 1.0,
      "wh_b": 2.0,
      "wf": "흐리고 비",
      "sky": "WB04",
      "pre": "WB09",
      "rn_st": 80,
      "conf": null
    }
  ],
  "temper": [
    {
      "reg_id": "11B20201", 
      "reg_name": "인천",
      "tm_ef": "2025-09-05T15:00:00+00:00",
      "tm_ef_kr": "2025-09-06T00:00:00+00:00",
      "min_temp": 24,
      "max_temp": 29,
      "min_temp_l": 1,ahems epd
      "min_temp_h": 1,
      "max_temp_l": 1,
      "max_temp_h": 1,
      "c": "2",
      "rn_st": 80
    }
  ]
}
```

#### 데이터 기간
- **조회 범위**: 기준일부터 7일간
- **업데이트**: 최신 예보로 자동 갱신

---

### 3. MCP 서버 (하이브리드 API)
GET/POST 방식을 모두 지원하는 해양관측 데이터 전용 API입니다.

**`GET /mcp-server`** 또는 **`POST /mcp-server`**

#### GET 방식
```
GET /mcp-server?code=DT_0001&date=2025-09-02&time=1400
```

#### POST 방식 (MCP Protocol)
```json
{
  "method": "get_marine_observations",
  "params": {
    "code": "DT_0001",
    "date": "2025-09-02",
    "time": "1400"
  }
}
```

#### 응답 데이터
```json
{
  "observations": [
    {
      "station_id": "101",
      "observation_time_kst": "202509021400",
      "water_temperature": 24.5,
      "significant_wave_height": 1.2,
      "air_temperature": 28.3,
      "wind_direction": 180,
      "wind_speed": 3.2
    }
  ]
}
```

---

## 데이터 구조 상세

### 위치 코드 (Location Codes)
- **DT_xxxx**: 조석관측소 (예: DT_0001 = 인천)
- **SO_xxxx**: 해양관측부이 (예: SO_0326 = 미조항)

### 시간 형식
- **날짜**: `YYYY-MM-DD` (ISO 8601)
- **시간**: `HHMM` (24시간 형식)
- **타임스탬프**: `YYYY-MM-DDTHH:mm:ss+00:00` (UTC/KST)

### 기상청 코드값

#### 하늘상태 (SKY)
| 코드 | 의미 |
|------|------|
| WB01 | 맑음 |
| WB02 | 구름조금 |
| WB03 | 구름많음 |
| WB04 | 흐림 |

#### 강수유무 (PRE)
| 코드 | 의미 |
|------|------|
| WB00 | 강수없음 |
| WB09 | 비 |
| WB11 | 비/눈 |
| WB12 | 눈 |
| WB13 | 눈/비 |

### 데이터 단위
- **기온**: °C (섭씨)
- **파고**: m (미터)
- **풍속**: m/s (초속)
- **풍향**: ° (도, 0-360)
- **강수확률**: % (0-100)
- **조위**: cm (센티미터)

---

## 에러 응답

### 공통 에러 형식
```json
{
  "error": "에러 메시지"
}
```

### HTTP 상태 코드
- **200**: 성공
- **400**: 잘못된 요청 (파라미터 오류)
- **404**: 데이터 없음 (위치 코드 없음)
- **405**: 허용되지 않는 메소드
- **500**: 서버 내부 오류

### 에러 예시
```json
{
  "error": "Missing required parameters: code and date are required."
}
```

```json
{
  "error": "해당 코드에 대한 지역 정보를 찾을 수 없습니다."
}
```

---

## 사용 예시

### JavaScript (Fetch API)
```javascript
// 통합 기상/조석 데이터 조회
const response = await fetch(
  'https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/get-weather-tide-data?code=DT_0001&date=2025-09-02'
);
const data = await response.json();

// 중기예보 데이터 조회
const mediumResponse = await fetch(
  'https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/get-medm-weather-data?code=DT_0001&date=2025-09-02'
);
const mediumData = await mediumResponse.json();
```

### cURL
```bash
# 통합 데이터 조회
curl "https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/get-weather-tide-data?code=DT_0001&date=2025-09-02"

# 중기예보 데이터 조회
curl "https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/get-medm-weather-data?code=DT_0001&date=2025-09-02"

# 시간 필터 적용
curl "https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/get-weather-tide-data?code=DT_0001&date=2025-09-02&time=1430"
```

### Python (requests)
```python
import requests

# 통합 데이터 조회
url = "https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/get-weather-tide-data"
params = {"code": "DT_0001", "date": "2025-09-02"}
response = requests.get(url, params=params)
data = response.json()

# 중기예보 데이터 조회
medium_url = "https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/get-medm-weather-data"
medium_response = requests.get(medium_url, params=params)
medium_data = medium_response.json()
```

---

## 데이터 소스
- **기상청 단기예보**: 3일 기상 예보 (get-kma-weather)
- **기상청 중기예보**: 4-7일 해상/기온 예보 (get-medm-weather)
- **국립해양조사원**: 조석 예보 데이터
- **해양 관측부이**: 실시간 해양 관측 데이터

## 업데이트 주기
- **단기예보**: 매일 8회 (02, 05, 08, 11, 14, 17, 20, 23시)
- **중기예보**: 매일 2회 (06:00, 18:00)
- **해양관측**: 실시간 (매시간)
- **조석정보**: 일 1회

## 지원 브라우저
- 모든 최신 브라우저에서 CORS 지원
- IE11 이상 권장

## 문의
API 관련 문의사항은 프로젝트 관리자에게 연락해주세요.