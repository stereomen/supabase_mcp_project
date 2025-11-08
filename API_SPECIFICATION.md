# Weather & Tide Data API 명세서

## 개요
`get-weather-tide-data` 함수는 지역 코드를 기반으로 날씨 예보, 조수 데이터, 해양 관측 데이터를 통합하여 제공하는 Supabase Edge Function API입니다.

## 기본 정보
- **Base URL**: `https://your-supabase-url.supabase.co/functions/v1/get-weather-tide-data`
- **HTTP Method**: `GET`
- **Content-Type**: `application/json`

## 요청 (Request)

### Query Parameters
| 파라미터 | 타입 | 필수 | 설명 | 예시 |
|----------|------|------|------|------|
| `code` | string | ✓ | 지역 코드 | `DT_0031` |
| `date` | string | ✓ | 조회 기준 날짜 (YYYY-MM-DD 형식) | `2024-01-15` |
| `time` | string | ✗ | 시간 필터 (HHMM 형식) | `1400` |

### 요청 예시
```bash
GET /functions/v1/get-weather-tide-data?code=DT_0031&date=2024-01-15&time=1400
```

## 응답 (Response)

### 성공 응답 (200 OK)
```json
{
  "weather_forecasts": [
    {
      "id": "number",
      "location_code": "string",
      "fcst_datetime_kr": "string",
      "temperature": "number",
      "humidity": "number",
      "wind_speed": "number",
      "wind_direction": "number",
      "precipitation": "number",
      "weather_condition": "string"
    }
  ],
  "tide_data": [
    {
      "id": "number",
      "location_code": "string", 
      "obs_date": "string",
      "obs_time": "string",
      "tide_level": "number",
      "tide_type": "string"
    }
  ],
  "marine_observations": {
    "a": [
      {
        "station_id": "string",
        "observation_time_kst": "string",
        "water_temperature": "number",
        "significant_wave_height": "number"
      }
    ],
    "b": [
      {
        "station_id": "string", 
        "observation_time_kst": "string",
        "air_temperature": "number",
        "wind_direction": "number",
        "wind_speed": "number"
      }
    ]
  }
}
```

### 데이터 범위
- **weather_forecasts**: 기준 날짜부터 7일간의 예보 데이터
- **tide_data**: 기준 날짜부터 14일간의 조수 데이터
- **marine_observations**: 
  - 기준 날짜와 시간에 해당하는 해양 관측 데이터
  - `time` 파라미터가 없으면 해당 날짜 전체 데이터

### 오류 응답

#### 400 Bad Request - 필수 파라미터 누락
```json
{
  "error": "Missing required parameters: code and date are required."
}
```

#### 405 Method Not Allowed - 잘못된 HTTP 메소드
```json
{
  "error": "Method not allowed"
}
```

#### 500 Internal Server Error - 서버 오류
```json
{
  "error": "An unexpected critical error occurred."
}
```

## 데이터 구조 상세

### Weather Forecasts (날씨 예보)
- 지역 코드별 7일간의 기상 예보 데이터
- KST 기준 시간으로 정렬되어 반환

### Tide Data (조수 데이터)  
- 지역 코드별 14일간의 조수 정보
- 관측 날짜 기준으로 정렬되어 반환

### Marine Observations (해양 관측)
해양 관측 데이터는 두 개의 관측소(A, B)로 구분됩니다:

#### A 관측소
- `water_temperature`: 수온
- `significant_wave_height`: 유의파고

#### B 관측소  
- `air_temperature`: 기온
- `wind_direction`: 풍향
- `wind_speed`: 풍속

## 사용 예시

### JavaScript/TypeScript
```typescript
const response = await fetch(
  'https://your-supabase-url.supabase.co/functions/v1/get-weather-tide-data?code=DT_0031&date=2024-01-15&time=1400'
);
const data = await response.json();

if (response.ok) {
  console.log('Weather forecasts:', data.weather_forecasts);
  console.log('Tide data:', data.tide_data);
  console.log('Marine observations A:', data.marine_observations.a);
  console.log('Marine observations B:', data.marine_observations.b);
} else {
  console.error('API Error:', data.error);
}
```

### Python
```python
import requests

url = "https://your-supabase-url.supabase.co/functions/v1/get-weather-tide-data"
params = {
    "code": "DT_0031",
    "date": "2024-01-15",
    "time": "1400"
}

response = requests.get(url, params=params)
data = response.json()

if response.status_code == 200:
    print("Weather forecasts:", data["weather_forecasts"])
    print("Tide data:", data["tide_data"])
    print("Marine observations A:", data["marine_observations"]["a"])
    print("Marine observations B:", data["marine_observations"]["b"])
else:
    print("API Error:", data["error"])
```

## 참고사항
- 모든 시간은 KST(한국표준시) 기준입니다
- 해양 관측 데이터는 `tide_abs_region` 테이블의 지역 코드 매핑을 기반으로 합니다
- 데이터가 없는 경우 빈 배열([])이 반환됩니다
- API는 CORS를 지원합니다