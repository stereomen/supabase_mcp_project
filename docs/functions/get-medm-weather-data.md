# get-medm-weather-data Function

## 개요
특정 위치 코드에 대한 중기예보 데이터를 조회하는 GET API Function입니다. 해상(Marine)과 기온(Temperature) 중기예보 데이터를 통합하여 반환합니다.

## 주요 기능
- 위치 코드 기반 중기예보 데이터 조회
- 해상예보와 기온예보 데이터 분리 제공
- 7일간의 중기예보 데이터 제공
- 최신 예보 데이터만 반환 (중복 제거)

## API 엔드포인트
```
GET /functions/v1/get-medm-weather-data
```

## 요청 파라미터
- **code** (필수): 위치 코드 (예: "DT_0001")
- **date** (필수): 기준 날짜 (YYYY-MM-DD 형식)

## 예시 요청
```bash
# 기본 요청
curl "https://your-project.supabase.co/functions/v1/get-medm-weather-data?code=DT_0001&date=2025-09-02"
```

## 데이터베이스 테이블

### 읽기 테이블
- **`tide_weather_region`**: 지역 매핑 정보
  - 조회 컬럼: `marine_reg_id`, `temper_reg_id`
  - 매핑 키: `code` (위치 코드)

- **`weather_forecasts`**: 단기예보 데이터
  - 조회 기간: 기준일부터 3일간
  - 정렬: 예보시각 오름차순
  - 필터: `location_code` (위치 코드)

- **`medium_term_forecasts`**: 중기예보 데이터
  - 조회 기간: 기준일 4일째부터 10일째까지 (7일간)
  - 정렬: 예보 유효시각 오름차순
  - 필터: `forecast_type` (marine/temperature)

## 데이터 처리 로직

### 1. 지역 매핑
```javascript
// tide_weather_region 테이블에서 지역 ID 조회
const { marine_reg_id, temper_reg_id } = await supabase
  .from('tide_weather_region')
  .select('marine_reg_id, temper_reg_id')
  .eq('code', code)
  .single()
```

### 2. 날짜 범위 계산
- **단기예보**: 기준일부터 3일 (D+0 ~ D+2)
- **중기예보**: 4일째부터 10일째까지 (D+3 ~ D+9)

### 3. 병행 데이터 조회
- **Short Forecasts**: `weather_forecasts` 테이블에서 3일치 단기예보
- **Marine 데이터**: `marine_reg_id` + `forecast_type='marine'` (7일치)
- **Temperature 데이터**: `temper_reg_id` + `forecast_type='temperature'` (7일치)

### 4. 중복 제거
- 각 `tm_ef`(예보 유효시각)별로 최신 `tm_fc`(예보 발표시각)만 유지
- 데이터베이스 constraint: `reg_id,tm_ef,mod,forecast_type`

## 응답 데이터 구조

### 성공 응답
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
      "tm_fc": "2025-09-01T21:00:00+00:00",
      "tm_fc_kr": "2025-09-02T06:00:00+00:00",
      "tm_ef": "2025-09-05T15:00:00+00:00",
      "tm_ef_kr": "2025-09-06T00:00:00+00:00",
      "wh_a": 1.0,
      "wh_b": 2.0,
      "wf": "흐리고 비",
      "sky": "WB04",
      "pre": "WB09",
      "conf": null,
      "rn_st": 80,
      "forecast_type": "marine"
    }
  ],
  "temper": [
    {
      "reg_id": "11B20201",
      "reg_sp": "C",
      "reg_name": "인천",
      "mod": "A01",
      "tm_fc": "2025-09-01T21:00:00+00:00",
      "tm_fc_kr": "2025-09-02T06:00:00+00:00",
      "tm_ef": "2025-09-05T15:00:00+00:00",
      "tm_ef_kr": "2025-09-06T00:00:00+00:00",
      "min_temp": 24,
      "max_temp": 29,
      "min_temp_l": 1,
      "min_temp_h": 1,
      "max_temp_l": 1,
      "max_temp_h": 1,
      "c": "2",
      "sky": "WB04",
      "pre": "WB09",
      "conf": null,
      "wf": "흐리고 비",
      "rn_st": 80,
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

## 반환 데이터 컬럼

### Short Forecasts 데이터 (단기예보) - 14개 컬럼
```javascript
{
  "fcst_datetime_kr": "2025-09-04T15:00:00+09:00",  // 예보시각 (KST)
  "tmp": 25.0,                    // 기온 (°C)
  "tmn": 20.0,                    // 최저기온 (°C)
  "tmx": 28.0,                    // 최고기온 (°C)
  "uuu": 2.5,                     // 동서바람성분 (m/s)
  "vvv": -1.2,                    // 남북바람성분 (m/s)
  "vec": 225,                     // 풍향 (deg)
  "wsd": 3.5,                     // 풍속 (m/s)
  "sky": 3,                       // 하늘상태 (1:맑음, 3:구름많음, 4:흐림)
  "pty": 0,                       // 강수형태 (0:없음, 1:비, 2:비/눈, 3:눈)
  "pop": 20,                      // 강수확률 (%)
  "wav": 0.5,                     // 파고 (m)
  "pcp": "강수없음",              // 1시간 강수량
  "reh": 65,                      // 습도 (%)
  "sno": "적설없음"               // 1시간 신적설
}
```

### Marine 데이터 (해상 정보) - 15개 컬럼
```javascript
{
  // 공통 메타데이터 (7개)
  "reg_id": "12A10000",           // 예보구역코드
  "reg_sp": "I",                  // 특성 (I: 해상, C: 육상, A: 광역)
  "reg_name": "서해북부",         // 지역명
  "mod": "A02",                   // 구간 (A01: 24시간, A02: 12시간)
  "tm_fc": "2025-09-01T21:00:00+00:00",      // 발표시각 (UTC)
  "tm_fc_kr": "2025-09-02T06:00:00+00:00",   // 발표시각 (KST)
  "tm_ef": "2025-09-05T15:00:00+00:00",      // 발효시각 (UTC)
  "tm_ef_kr": "2025-09-06T00:00:00+00:00",   // 발효시각 (KST)
  
  // 해상 전용 데이터 (6개)
  "wh_a": 1.0,                    // 파고1 (m)
  "wh_b": 2.0,                    // 파고2 (m)
  "wf": "흐리고 비",              // 예보 (텍스트)
  "sky": "WB04",                  // 하늘상태코드
  "pre": "WB09",                  // 강수유무코드
  "rn_st": 80,                    // 강수확률 (%)
  "conf": null,                   // 신뢰도
  
  // 시스템 컬럼 (1개)
  "forecast_type": "marine"       // 예보 타입
}
```

### Temperature 데이터 (기온 정보) - 19개 컬럼
```javascript
{
  // 공통 메타데이터 (7개)
  "reg_id": "11B20201",           // 예보구역코드
  "reg_sp": "C",                  // 특성 (I: 해상, C: 육상, A: 광역)
  "reg_name": "인천",             // 지역명
  "mod": "A01",                   // 구간 (A01: 24시간, A02: 12시간)
  "tm_fc": "2025-09-01T21:00:00+00:00",      // 발표시각 (UTC)
  "tm_fc_kr": "2025-09-02T06:00:00+00:00",   // 발표시각 (KST)
  "tm_ef": "2025-09-05T15:00:00+00:00",      // 발효시각 (UTC)
  "tm_ef_kr": "2025-09-06T00:00:00+00:00",   // 발효시각 (KST)
  
  // 기온 전용 데이터 (10개)
  "min_temp": 24,                 // 아침최저기온 (°C)
  "max_temp": 29,                 // 낮최고기온 (°C)
  "min_temp_l": 1,                // 최저기온 하한 범위 (°C)
  "min_temp_h": 1,                // 최저기온 상한 범위 (°C)
  "max_temp_l": 1,                // 최고기온 하한 범위 (°C)
  "max_temp_h": 1,                // 최고기온 상한 범위 (°C)
  "c": "2",                       // 발표코드
  "sky": "WB04",                  // 하늘상태코드
  "pre": "WB09",                  // 강수유무코드
  "wf": "흐리고 비",              // 예보 (텍스트)
  "rn_st": 80,                    // 강수확률 (%)
  "conf": null,                   // 신뢰도
  
  // 시스템 컬럼 (1개)
  "forecast_type": "temperature"  // 예보 타입
}
```

## 데이터 필드 설명

### Marine 전용 필드
- **`wh_a`**: 파고1 (m) - 평균 파고
- **`wh_b`**: 파고2 (m) - 최대 파고

### Temperature 전용 필드
- **`min_temp`**: 아침최저기온 (°C)
- **`max_temp`**: 낮최고기온 (°C) 
- **`min_temp_l`**: 최저기온 하한 범위 (°C)
- **`min_temp_h`**: 최저기온 상한 범위 (°C)
- **`max_temp_l`**: 최고기온 하한 범위 (°C)
- **`max_temp_h`**: 최고기온 상한 범위 (°C)
- **`c`**: 발표코드

### 공통 필드
- **`wf`**: 예보 (텍스트 형태의 날씨 설명)
- **`sky`**: 하늘상태코드 (WB01~WB04)
- **`pre`**: 강수유무코드 (WB00, WB09, WB11~WB13)
- **`rn_st`**: 강수확률 (0~100%)
- **`conf`**: 신뢰도 (예보 신뢰도 정보)

### 메타데이터 필드
- **`reg_id`**: 예보구역코드 (기상청 지역 식별자)
- **`reg_sp`**: 특성 (I: 해상, C: 육상, A: 광역)
- **`reg_name`**: 지역명 (한글 지역명)
- **`mod`**: 구간 (A01: 24시간, A02: 12시간)
- **`tm_fc`/`tm_fc_kr`**: 발표시각 (UTC/KST)
- **`tm_ef`/`tm_ef_kr`**: 발효시각 (UTC/KST)
- **`forecast_type`**: 예보 타입 ("marine" 또는 "temperature")

## 기상청 데이터 코드

### 하늘상태 (SKY)
- `WB01`: 맑음
- `WB02`: 구름조금  
- `WB03`: 구름많음
- `WB04`: 흐림

### 강수유무 (PRE)
- `WB00`: 강수없음
- `WB09`: 비
- `WB11`: 비/눈
- `WB12`: 눈
- `WB13`: 눈/비

## 데이터 기간 설정
- **조회 범위**: 기준일부터 7일간
- **시간대**: 모든 시간은 UTC/KST 병행 저장
- **업데이트**: 새로운 예보 발표 시 이전 데이터 자동 갱신

## 환경 변수
- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_ANON_KEY`: 익명 키
- `SERVICE_ROLE_KEY`: 서비스 롤 키 (Authorization 헤더)

## 에러 처리
- **400**: 필수 파라미터 누락 또는 날짜 형식 오류
- **404**: 위치 코드에 해당하는 지역 정보 없음
- **500**: 데이터베이스 조회 실패

## 성능 최적화
- **병렬 쿼리**: Marine과 Temperature 데이터 동시 조회
- **필요한 컬럼만 조회**: SELECT 최적화
- **인덱스 활용**: reg_id, tm_ef 기반 조회
- **중복 제거**: 데이터베이스 레벨에서 최신 데이터만 유지

## 관련 함수
- **`get-medm-weather`**: 중기예보 데이터 수집 함수
- **`get-kma-weather`**: 단기예보 데이터 수집 함수  
- **`get-weather-tide-data`**: 통합 기상/조석 데이터 조회 API

## 활용 사례
- 해양 기상 정보 대시보드
- 중기 해상 계획 수립
- 기온 변화 추세 분석
- 강수 확률 예측

## 주의사항
- 중기예보는 단기예보보다 정확도가 낮음
- 파라미터 검증을 통한 안전한 날짜 처리
- 지역 코드가 없는 경우 404 에러 반환
- 모든 시간은 KST 기준으로 사용자에게 제공