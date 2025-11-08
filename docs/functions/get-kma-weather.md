# get-kma-weather Function

API 엔드포인트

  https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/getVilageFcst

  요청 파라미터

  - pageNo: '1'
  - numOfRows: '1000' (최대 1000개 레코드)
  - dataType: 'JSON'
  - base_date: 발표 기준일 (YYYYMMDD 형식)
  - base_time: 발표 기준시간 (HHMM 형식)
  - nx: 격자 X 좌표
  - ny: 격자 Y 좌표
  - authKey: KMA 인증키

  발표 시간

  매일 02, 05, 08, 11, 14, 17, 20, 23시 (총 8회 발표)

  API 응답 구조

  {
    "response": {
      "header": {
        "resultCode": "00",
        "resultMsg": "NORMAL_SERVICE"
      },
      "body": {
        "items": {
          "item": [
            {
              "baseDate": "20250903",
              "baseTime": "1400",
              "category": "TMP",
              "fcstDate": "20250903",
              "fcstTime": "1500",
              "fcstValue": "25",
              "nx": 60,
              "ny": 127
            }
          ]
        }
      }
    }
  }

  데이터 카테고리

  - TMP: 기온(℃)
  - UUU: 동서바람성분(m/s)
  - VVV: 남북바람성분(m/s)
  - VEC: 풍향(deg)
  - WSD: 풍속(m/s)
  - SKY: 하늘상태(코드값)
  - PTY: 강수형태(코드값)
  - POP: 강수확률(%)
  - WAV: 파고(m)
  - PCP: 1시간 강수량(mm)
  - REH: 습도(%)
  - SNO: 1시간 신적설(cm)

● get-kma-weather 함수에서 기상청 정보를 받아오는 날짜 로직:

  기준 시간 설정 (base_date, base_time):
  - 발표 시간: 매일 02, 05, 08, 11, 14, 17, 20, 23시 (총 8회)
  - 현재 시간(KST) 기준으로 가장 최근 발표된 시간을 선택
  - 예: 현재 15시면 → 14시 발표 데이터 사용
  - 예: 현재 01시면 → 전날 23시 발표 데이터 사용

  예측 날짜 범위:
  - 기준 시간부터 3일 후까지 예보 데이터 수집
  - 기상청 API에서 최대 1000개 레코드 요청 (numOfRows: '1000')

  시간대 처리:
  - 모든 시간은 한국 표준시(KST, UTC+9) 기준
  - DB 저장 시 UTC와 KST 둘 다 저장 (fcst_datetime, fcst_datetime_kr)

  현재 시점에서 가장 최신 기상청 발표 데이터를 기준으로 향후 3일간의 예보를 수집합니다.

● 기상청에서 3일 이상 장기 예보 데이터를 제공하는 API가 있습니다:

  1. 중기예보 API (5~10일)
  - getMidFcst - 중기예보 조회
  - 3일 후부터 10일까지 예보
  - 하루 2회 발표 (06:00, 18:00)

  2. 중기기온예보 API
  - getMidTa - 중기기온예보 조회
  - 3일 후부터 10일까지 최고/최저기온

  3. 중기강수확률예보 API
  - getMidLandFcst - 중기육상예보 조회
  - 3일 후부터 10일까지 강수확률

  4. 장기예보 API (1개월, 3개월)
  - 월별/계절별 기후 전망
  - 평년 대비 기온/강수량 경향

  하지만 중기예보는 단기예보와 다른 특징이 있습니다:
  - 격자 좌표(nx, ny) 대신 지역 코드 사용
  - 시간별이 아닌 일별 데이터
  - 상세도가 낮음 (AM/PM 구분 정도)


## 개요
기상청 단기예보 API를 호출하여 3일간의 날씨 예보 데이터를 수집하고 데이터베이스에 저장하는 Supabase Edge Function입니다.

## 주요 기능
- 기상청 단기예보 API (`getVilageFcst`) 호출
- 배치 처리를 통한 대량 데이터 수집
- 격자 좌표 기반 중복 제거 최적화
- 자동 체인 호출을 통한 전체 지역 처리

## API 정보
- **기상청 API**: `VilageFcstInfoService_2.0/getVilageFcst`
- **발표 시간**: 매일 02, 05, 08, 11, 14, 17, 20, 23시 (총 8회)
- **예보 기간**: 기준 시간부터 3일 후까지
- **최대 요청**: 1000개 레코드 (`numOfRows: '1000'`)

## 데이터베이스 테이블

### 읽기 테이블
- **`tide_weather_region`**: 위치 정보 조회
  - 컬럼: `code`, `name`, `nx`, `ny`
  - 용도: 기상청 격자 좌표 정보

### 쓰기 테이블
- **`weather_forecasts`**: 단기예보 데이터 저장 (3일)
  - 저장 방식: `upsert` (중복 시 업데이트)
  - 중복 체크: `fcst_datetime`, `location_code` 조합
  - 데이터: 기온, 습도, 강수량, 풍속 등

- **`weather_fetch_logs`**: 함수 실행 로그
  - 저장 방식: `insert`
  - 데이터: 실행 시간, 상태, 처리 레코드 수, 에러 메시지

## 관련 함수
- **`get-medm-weather`**: 중기예보 데이터 수집 (4-7일)
- **`get-medm-weather-data`**: 중기예보 데이터 조회 API

## 실행 방식

### 배치 처리
- **배치 크기**: 기본 10개 위치씩 처리
- **지연 시간**: API 요청 간 200ms씩 증가하는 지연
- **재시도 로직**: 실패 시 최대 3회 재시도

### 자동 체인 호출
1. 현재 배치 처리 완료
2. 다음 배치가 있으면 자동으로 다음 함수 호출
3. 모든 배치 완료까지 반복

### 시간 처리
- **기준 시간**: 현재 시간(KST)에서 가장 최근 발표 시간 선택
- **시간대**: UTC와 KST 둘 다 저장
- **예제**: 현재 15시 → 14시 발표 데이터 사용

## 환경 변수
- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_SERVICE_ROLE_KEY`: 서비스 롤 키
- `KMA_AUTH_KEY`: 기상청 API 인증키

## 호출 방법

### Cron 트리거 (초기 호출)
```json
{}
```

### 배치 체인 호출
```json
{
  "startIndex": 10,
  "batchSize": 10,
  "totalRecordsUpserted": 690
}
```

## 응답 형태

### 성공
```json
{
  "message": "Batch starting at 0 processed."
}
```

### 실패
```json
{
  "error": "Internal server error",
  "message": "에러 메시지"
}
```

## 성능 최적화
- CPU 시간 초과 방지를 위한 배치 크기 조정 (50 → 10)
- API 요청 간격 조정 (200ms * index)
- 격자 좌표 기반 중복 제거로 API 호출 최소화
- Promise.allSettled 사용으로 병렬 처리

## 모니터링
- `weather_fetch_logs` 테이블에서 실행 이력 확인
- 배치별 처리 레코드 수와 에러 추적
- 전체 프로세스 완료 시점 로깅

## 주의사항
- 기상청 API 호출 제한에 주의
- 배치 크기 조정 시 CPU 시간 제한 고려
- 네트워크 오류 시 재시도 로직 작동
- 환경 변수 누락 시 함수 실행 실패