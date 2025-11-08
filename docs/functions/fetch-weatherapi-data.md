# fetch-weatherapi-data Function

## 개요
WeatherAPI.com 날씨 API를 호출하여 한국 전 연안 지역의 실시간 날씨 데이터와 14일 예보를 수집하고 데이터베이스에 저장하는 Supabase Edge Function입니다.

## 주요 기능
- WeatherAPI.com API 호출 (현재 날씨 + 14일 예보)
- 134개 연안 지역 동시 처리 (병렬 처리)
- tide_abs_region 테이블 연동으로 지역 코드 매핑
- 현재/일일/시간별 예보 데이터 통합 저장

## API 정보
- **WeatherAPI 현재 날씨**: `http://api.weatherapi.com/v1/current.json`
- **WeatherAPI 예보**: `http://api.weatherapi.com/v1/forecast.json`
- **예보 기간**: 14일 (336시간)
- **데이터 주기**: 현재(실시간) + 시간별(1시간) + 일일(1일)
- **좌표 기반**: 위도, 경도로 정확한 지역별 데이터 수집

## 수집 데이터 유형

### 1. 현재 날씨 (data_type: 'current')
- **온도**: 현재 온도, 체감 온도 (°C, °F)
- **바람**: 풍속, 풍향, 돌풍 (mph, kph, degree)
- **대기**: 기압, 습도, 가시거리, 구름량 (%)
- **강수**: 강수량 (mm, in)
- **기타**: 자외선 지수, 날씨 상태

### 2. 일일 예보 (data_type: 'forecast')
- **온도**: 최고/최저/평균 온도
- **바람**: 최대 풍속
- **강수**: 총 강수량, 강우/강설 확률
- **기타**: 평균 습도, 가시거리

### 3. 시간별 예보 (data_type: 'forecast')
- 모든 현재 날씨 항목의 시간별 상세 예보
- 14일 × 24시간 = 336개 시간별 데이터

## 데이터 수집 규모

### 지역별 레코드 수
- **현재 날씨**: 1개/지역
- **일일 예보**: 14개/지역 (14일)
- **시간별 예보**: 336개/지역 (14일 × 24시간)
- **지역당 총계**: 351개 레코드

### 전체 수집량
- **대상 지역**: 134개 연안 지역
- **총 레코드**: 47,034개 (134 × 351)
- **API 호출**: 268회 (현재 134회 + 예보 134회)

## 데이터베이스 테이블

### 쓰기 테이블
- **`weatherapi_data`**: 날씨 데이터 저장
  - 중복 체크: `location_key`, `observation_time_utc`, `data_type`, `forecast_date`, `forecast_time` 조합
  - 저장 방식: `upsert` (중복 시 업데이트)

- **`weatherapi_collection_logs`**: 수집 로그 저장
  - 수집 시간, 상태, 레코드 수, 처리 지역 수, 에러 메시지

### 읽기 테이블
- **`tide_abs_region`**: 지역 좌표 정보 조회
  - Code, Name, Latitude, Longitude 컬럼 사용
  - 위도/경도가 null이 아닌 지역만 처리

## 병렬 처리 최적화

### 배치 처리
- **동시 처리**: 10개 지역씩 병렬 실행
- **API Rate Limit**: 배치 간 500ms 대기
- **개별 지역**: 현재/예보 간 100ms 대기
- **실패 처리**: 일부 지역 실패 시에도 전체 처리 계속

### 성능 지표
- **처리 시간**: 약 38초 (134개 지역 전체)
- **성공률**: 100% (모든 지역 처리 성공)
- **처리량**: 초당 약 1,240개 레코드

## 지역 코드 연동

### tide_abs_region 테이블 연동
```javascript
// 지역 정보 조회
const result = await supabaseClient
  .from('tide_abs_region')
  .select('Code, Name, Latitude, Longitude')
  .not('Latitude', 'is', null)
  .not('Longitude', 'is', null);

// 좌표 기반 API 호출
const locationKey = `${lat},${lng}`;
```

### 저장 시 매핑
- **location_key**: 위도,경도 형식 (`37.5665,126.9780`)
- **code**: tide_abs_region의 Code 값
- **location_name**: API에서 반환하는 실제 지명

## 환경 변수
- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_SERVICE_ROLE_KEY`: 서비스 롤 키
- `WEATHER_API_KEY`: WeatherAPI.com API 키 (14일 예보 지원)

## 호출 방법

### 기본 호출 (모든 지역, 14일 예보)
```bash
curl -X POST https://your-project.supabase.co/functions/v1/fetch-weatherapi-data \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 옵션 설정
```bash
curl -X POST https://your-project.supabase.co/functions/v1/fetch-weatherapi-data \
  -H "Content-Type: application/json" \
  -d '{
    "forecastDays": 7,
    "includeAqi": true,
    "includeForecast": true
  }'
```

### 특정 지역만 처리
```bash
curl -X POST https://your-project.supabase.co/functions/v1/fetch-weatherapi-data \
  -H "Content-Type: application/json" \
  -d '{
    "locations": [
      {"key": "Seoul", "code": "SEOUL", "name": "서울", "lat": 37.5665, "lng": 126.9780}
    ]
  }'
```

## 요청 매개변수

| 매개변수 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| `locations` | Array | null | 사용자 정의 지역 배열 (null시 tide_abs_region 사용) |
| `includeForecast` | boolean | true | 예보 데이터 포함 여부 |
| `includeAqi` | boolean | false | 대기질 데이터 포함 여부 |
| `forecastDays` | number | 14 | 예보 일수 (1-14) |

## 응답 형태

### 성공
```json
{
  "message": "Successfully collected weather data",
  "recordsCollected": 47034,
  "locationsProcessed": 134,
  "totalLocations": 134,
  "failedLocations": 0,
  "status": "success"
}
```

### 부분 성공
```json
{
  "message": "Successfully collected weather data",
  "recordsCollected": 45683,
  "locationsProcessed": 130,
  "totalLocations": 134,
  "failedLocations": 4,
  "status": "partial"
}
```

### 실패
```json
{
  "error": "Internal server error",
  "message": "WEATHER_API_KEY environment variable is required"
}
```

## 로그 기록
모든 실행 결과는 `weatherapi_collection_logs` 테이블에 저장:
```json
{
  "started_at": "2025-10-03T04:30:00.000Z",
  "finished_at": "2025-10-03T04:30:38.000Z",
  "status": "success",
  "records_collected": 47034,
  "locations_processed": 134,
  "error_message": null,
  "function_name": "fetch-weatherapi-data"
}
```

## 에러 처리

### API 레벨 에러
- WeatherAPI 호출 실패 시 해당 지역 스킵
- 네트워크 타임아웃 시 재시도 없이 다음 지역 처리
- API 키 문제 시 전체 함수 종료

### 데이터 레벨 에러
- 좌표 변환 실패 시 해당 지역 스킵
- JSON 파싱 실패 시 에러 로그 후 계속 진행
- 데이터베이스 저장 실패 시 개별 지역 실패 처리

### 복구 전략
- Promise.allSettled 사용으로 일부 실패가 전체에 영향 없음
- 상세한 에러 로그로 실패 원인 추적 가능
- 부분 성공도 유효한 결과로 처리

## 성능 최적화

### API 호출 최적화
- 병렬 처리로 처리 시간 단축 (순차 대비 90% 감소)
- 배치 크기 조정으로 Rate Limit 회피
- 개별 지역 실패가 전체 성능에 미치는 영향 최소화

### 데이터베이스 최적화
- Upsert 방식으로 중복 데이터 자동 처리
- 대용량 배치 삽입 대신 개별 처리로 안정성 확보
- 인덱스 활용으로 중복 체크 성능 향상

## 모니터링 지표

### 처리 성능
- **평균 처리 시간**: 38초/47,034레코드
- **처리율**: 약 1,240레코드/초
- **API 효율성**: 268호출/47,034레코드 (175배 효율)

### 성공률
- **지역 처리 성공률**: 100% (134/134)
- **API 호출 성공률**: 100% (268/268)
- **데이터 저장 성공률**: 100%

## 활용 사례

### 실시간 기상 모니터링
- 연안 지역 현재 날씨 대시보드
- 기상 경보 및 알림 시스템
- 해양 활동 안전성 평가

### 예보 기반 서비스
- 14일간 상세 날씨 예보 제공
- 시간별 기상 변화 예측
- 해양 레저 활동 계획 지원

### 데이터 분석
- 지역별 기상 패턴 분석
- 계절별 날씨 트렌드 분석
- 기상 예보 정확도 검증

## 주의사항

### API 사용량
- WeatherAPI.com 무료 플랜 한도 고려
- 과도한 호출 시 요금 발생 가능
- API 키 관리 및 보안 중요

### 데이터 저장
- 47,034개 레코드는 상당한 저장 공간 사용
- 정기적인 데이터 정리 정책 필요
- 중복 방지를 위한 upsert 로직 중요

### 성능 고려사항
- 대용량 데이터 처리 시 메모리 사용량 모니터링
- Edge Function 실행 시간 제한 (최대 45초) 고려
- 동시 실행 시 API Rate Limit 충돌 가능성