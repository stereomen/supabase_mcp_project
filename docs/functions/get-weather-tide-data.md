# get-weather-tide-data Function

## 개요
특정 위치 코드에 대한 종합 해양 기상 데이터를 조회하는 GET API Function입니다. 기상예보, 조석정보, 해양관측 데이터를 통합하여 반환합니다.

## 주요 기능
- 위치 코드 기반 통합 데이터 조회
- 기상예보 3일치 데이터 제공 (단기예보)
- 조석정보 10일치 데이터 제공
- 중기예보 8일치 데이터 제공 (해상/기온, D+3~D+10)
- A/B 관측소별 해양관측 데이터 분리 제공
- 시간 필터링 지원 (선택사항)

## API 엔드포인트
```
GET /functions/v1/get-weather-tide-data
```

## 요청 파라미터
- **code** (필수): 위치 코드 (예: "DT_0001")
- **date** (필수): 기준 날짜 (YYYY-MM-DD 형식)
- **time** (선택): 시간 필터 (HHMM 형식)

## 예시 요청
```bash
# 기본 요청
curl "https://iwpgvdtfpwazzfeniusk.supabase.co/functions/v1/get-weather-tide-data?code=DT_0001&date=2025-09-02"

# 시간 필터 포함
curl "https://your-project.supabase.co/functions/v1/get-weather-tide-data?code=DT_0001&date=2025-09-02&time=1430"
```

## 데이터베이스 테이블

### 읽기 테이블
- **`tide_abs_region`**: A/B 관측소 ID 매핑
  - 조회 컬럼: `"a_STN ID"`, `"b_STN ID"`
  - 매핑 키: `Code` (위치 코드)

- **`weather_forecasts`**: 기상예보 데이터
  - 조회 기간: 기준일부터 3일간 (D+0 ~ D+2)
  - 정렬: 예보 시간 오름차순

- **`tide_data`**: 조석 정보
  - 조회 기간: 기준일부터 10일간 (D+0 ~ D+9)
  - 정렬: 관측 날짜 오름차순

- **`medium_term_forecasts`**: 중기예보 데이터 (해상/기온)
  - 조회 기간: 기준일+3일부터 +10일까지 (D+3 ~ D+10)
  - 해상예보와 기온예보 별도 조회
  - 정렬: 예보 시간 오름차순

### 데이터 조회 방식
- **직접 테이블 쿼리**: 성능 향상을 위해 RPC 함수 대신 직접 쿼리 사용
- **병렬 처리**: 다중 데이터 소스 동시 조회로 응답 시간 단축
- **marine_observations**: 관측소별 데이터 직접 조회 및 필터링

## 응답 데이터 구조

### 성공 응답
```json
{
  "weather_forecasts": [
    {
      "fcst_datetime_kr": "2025-09-02T14:00:00.000+09:00",
      "tmp": 28,
      "reh": 65,
      "wsd": 3.2,
      "wdr": 180,
      "pcp": 0.0,
      "pop": 30,
      "pty": 0,
      "sky": 3,
      "location_code": "DT_0001"
    }
  ],
  "tide_data": [
    {
      "obs_date": "2025-09-02",
      "location_code": "DT_0001",
      "lvl1": 420,
      "lvl2": 180,
      "lvl3": 450,
      "lvl4": 210,
      "tm1": "0312",
      "tm2": "0945",
      "tm3": "1534",
      "tm4": "2156"
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
  },
  "marine": [
    {
      "reg_id": "12A00000",
      "tm_ef_kr": "2025-09-13T12:00:00+09:00",
      "wh_a": 1.0,
      "wh_b": 1.5,
      "wf": "약간 거칠다",
      "forecast_type": "marine"
    }
  ],
  "temper": [
    {
      "reg_id": "11A00101", 
      "tm_ef_kr": "2025-09-13T00:00:00+09:00",
      "min_temp": 18,
      "max_temp": 25,
      "forecast_type": "temperature"
    }
  ]
}
```

### 에러 응답
```json
{
  "error": "Missing required parameters: code and date are required."
}
```

## 데이터 필드 설명

### 기상예보 데이터 (weather_forecasts)
- **`fcst_datetime_kr`**: 예보 시각 (KST)
- **`tmp`**: 기온 (°C)
- **`reh`**: 습도 (%)
- **`wsd`**: 풍속 (m/s)
- **`wdr`**: 풍향 (°)
- **`pcp`**: 강수량 (mm)
- **`pop`**: 강수확률 (%)
- **`pty`**: 강수형태 (0: 없음, 1: 비, 2: 비/눈, 3: 눈, 4: 소나기)
- **`sky`**: 하늘상태 (1: 맑음, 3: 구름많음, 4: 흐림)

### 조석 데이터 (tide_data)
- **`obs_date`**: 관측 날짜
- **`lvl1~4`**: 조위 (cm) - 1일 4회 간조/만조
- **`tm1~4`**: 시간 (HHMM) - 조위 발생 시각

### 해양관측 데이터 (marine_observations)
#### A 관측소 (수온/파고 중심)
- **`water_temperature`**: 수온 (°C)
- **`significant_wave_height`**: 유의파고 (m)

#### B 관측소 (기상 중심)  
- **`air_temperature`**: 기온 (°C)
- **`wind_direction`**: 풍향 (°)
- **`wind_speed`**: 풍속 (m/s)

## 데이터 기간 설정

### 단기예보 (3일)
```javascript
// 기준일부터 3일 후까지 (exclusive)
const weatherEndDateObj = new Date(date);
weatherEndDateObj.setDate(weatherEndDateObj.getDate() + 3);
```

### 조석정보 (10일)
```javascript
// 기준일부터 9일 후까지 (inclusive, 총 10일)
const tideEndDate = new Date(tideStartDate);
tideEndDate.setDate(tideEndDate.getDate() + 9);
```

### 중기예보 (8일)
```javascript
// 기준일+3일부터 +10일까지 (D+3 ~ D+10)
const mediumStartDateObj = new Date(date);
mediumStartDateObj.setDate(mediumStartDateObj.getDate() + 3); // 4일째부터
const mediumEndDateObj = new Date(date);
mediumEndDateObj.setDate(mediumEndDateObj.getDate() + 10); // 11일째까지
```

## 해양관측 데이터 분리
### A 관측소 (수온/파고 중심)
- `station_id`: A_STN ID
- `water_temperature`: 수온
- `significant_wave_height`: 유의파고

### B 관측소 (기상 중심)  
- `station_id`: B_STN ID
- `air_temperature`: 기온
- `wind_direction`: 풍향
- `wind_speed`: 풍속

## 환경 변수
- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_ANON_KEY`: 익명 키
- `SERVICE_ROLE_KEY`: 서비스 롤 키 (Authorization 헤더)

## 에러 처리
- **400**: 필수 파라미터 누락
- **404**: 위치 코드에 해당하는 데이터 없음
- **500**: 데이터베이스 조회 실패

## 성능 최적화
- **병렬 쿼리**: 6개 데이터 소스 동시 조회 (2그룹으로 분할)
  - Group 1: weather_forecasts, tide_data
  - Group 2: marine_observations A/B, marine/temper 중기예보
- **직접 테이블 쿼리**: RPC 함수 대신 직접 쿼리로 성능 향상
- **필요한 컬럼만 조회**: SELECT 최적화
- **인덱스 활용**: 위치 코드, 날짜 기반 조회
- **KST 시간대 처리**: UTC와 KST 혼용 오류 방지

## 관련 함수
- **`get-medm-weather-data`**: 중기예보 데이터 조회 API
- **`get-kma-weather`**: 단기예보 데이터 수집 함수
- **`mcp-server`**: 해양관측 데이터 전용 API

## 활용 사례
- 해양 기상 정보 대시보드
- 선박 운항 계획 수립
- 해양 레저 활동 계획
- 기상/조석 데이터 분석

## 주의사항
- 시간 파라미터 없이 호출 시 해당 날짜 전체 데이터 반환
- 관측소 ID가 없는 위치는 빈 배열 반환
- KST 시간대 기준으로 모든 시간 처리
- A/B 관측소는 서로 다른 데이터 유형 제공