# get-medm-weather xNM8m0T_SZyTPJtE__mcsQ

중기예보 데이터의 정확한 시간 범위

  발표 시점 (TM_FC)

  - 2025-09-10 06:00 (KST)

  예보 대상 기간 (TM_EF)

  기온 중기예보 (fct_afs_wc.php)

  시작: 2025-09-14 00:00 (발표일 +4일 자정)
  종료: 2025-09-20 00:00 (발표일 +10일 자정)
  간격: 24시간 단위 (하루 1회)
  총 7일간 예보

  정확한 해상 중기예보 패턴

  12시간 간격 제공 (오전/오후 구분)

  - +4일 ~ +7일: 00:00, 12:00 (4일간)
    - 2025-09-14: 00:00, 12:00
    - 2025-09-15: 00:00, 12:00
    - 2025-09-16: 00:00, 12:00
    - 2025-09-17: 00:00, 12:00

  24시간 간격 제공 (일 단위)

  - +8일 ~ +10일: 00:00만 (3일간)
    - 2025-09-18: 00:00만
    - 2025-09-19: 00:00만
    - 2025-09-20: 00:00만

  결론: 06:00에 발표되는 데이터는 발표일 +4일 00:00부터 +10일 00:00까지의 중기예보이며, 해상예보는 12시간 간격(+4일 ~ +7일)으로 더 세밀한 예보를 제공합니다.

기상청 중기예보 데이터를 수집하는 Supabase Edge Function입니다.

API 엔드포인트

  3개 타입의 중기예보 API를 사용:
이 중 해상, 기온만 사용
  1. 육상 중기예보: https://apihub.kma.go.kr/api/typ01/url/fct_afs_wl.php
  2. 기온 중기예보: https://apihub.kma.go.kr/api/typ01/url/fct_afs_wc.php
  3. 해상 중기예보: https://apihub.kma.go.kr/api/typ01/url/fct_afs_wo.php

  요청 파라미터

  - disp: 1 (고정값)
  - authKey: KMA 인증키

  API 응답 형식

  CSV 형태의 응답을 EUC-KR 인코딩으로 반환

  응답 구조

  #START7777
  # REG_ID REG_SP STN_ID TM_FC TM_EF MOD C SKY PRE CONF WF RN_ST ...
  11B00000,A,,202509031800,202509040600,12,1,3,0,0,흐림,0
  11B00000,A,,202509031800,202509041800,12,2,3,0,0,흐림,0
  ...
  #7777END

  주요 데이터 필드

  - REG_ID: 지역 ID
  - TM_FC: 발표시각 (YYYYMMDDHHMM)
  - TM_EF: 예보시각 (YYYYMMDDHHMM)
  - MOD: 모델 구분
  - C: 일자 구분
  - SKY: 하늘상태
  - PRE: 강수확률
  - CONF: 신뢰도
  - WF: 날씨 예보
  - RN_ST: 강수상태
  - MIN/MAX: 최저/최고기온 (기온예보)
  - WH_A/WH_B: 파고 정보 (해상예보)

  지역 정보

  223개 지역의 하드코딩된 지역 정보를 사용:
  - 육상 지역 (11X 접두사): 서울, 인천, 경기 등
  - 해상 지역 (12X 접두사): 서해, 남해, 동해 등







● 🌤️ 기상청 중기예보 3가지 유형별 제공 정보

  🌊 Marine 예보 (해상 기상) - 13개 구역

  해상 안전을 위한 바다 날씨 정보
  - 파고 (wave height) - 파도 높이 (wh_a, wh_b)
  - 풍향/풍속 (wind direction/speed) - 바람 정보 (wf)
  - 날씨 상황 (weather condition) - 맑음/흐림/비 등 (sky, pre)
  - 강수확률 (precipitation probability) (rn_st)
  - 해상 특보 정보 - 풍랑/해일 경보 등 (conf43.533..)

  🏞️ Land 예보 (육상 날씨) - 15개 광역구역

  광역 단위 일반 날씨 전망
  - 하늘상태 (sky condition) - 맑음/구름/흐림 (sky)
  - 강수형태 (precipitation type) - 비/눈/진눈깨비 (pre)
  - 강수확률 (precipitation probability) (rn_st)
  - 날씨 전망 (weather outlook) - 종합적 날씨 예측 (wf)
  - 신뢰도 정보 (confidence level) - 예보 정확도 (conf)

  🌡️ Temperature 예보 (기온 정보) - 203개 상세구역

  상세 지역별 기온 변화 예측
  - 최저기온 (minimum temperature) (min_temp)
  - 최고기온 (maximum temperature) (max_temp)
  - 최저기온 범위 (min_temp_low, min_temp_high) - 변동폭 (min_temp_l, min_temp_h)
  - 최고기온 범위 (max_temp_low, max_temp_high) - 변동폭 (max_temp_l, max_temp_h)
  - 시간대별 상세 기온 예보 - 3시간/6시간 단위 (tm_ef, c)

  ---
  📊 공통 메타데이터:
  - 예보 발표시각 (tm_fc, tm_fc_kr)
  - 예보 유효시각 (tm_ef, tm_ef_kr)
  - 지역 정보 (reg_id, reg_sp, reg_name)
  - 모델 정보 (mod)

  핵심 차이점:
  - Marine: 바다 = wh_a/wh_b (파고) 중심
  - Land: 육지 = sky/pre (날씨상황) 중심
  - Temperature: 기온 = min_temp/max_temp (온도정보) 전용

============
#--------------------------------------------------------------------------------------------------
#  주간/중기예보 육상 조회 [입력인수형태][예] ?reg=&tmfc1=2013121018&tmfc2=2013121106&tmef1=20131212&tmef2=20131219&disp=0&help=1
#--------------------------------------------------------------------------------------------------
#  1. REG_ID   : 예보구역코드
#  2. TM_FC    : 발표시각(년월일시분,KST)
#  3. TM_EF    : 발효시각(년월일시분,KST)
#  4. MOD      : 구간 (A01(24시간),A02(12시간))
#  5. STN      : 발표관서
#  6. C        : 발표코드
#  7. MAN_ID   : 예보관ID
#  8. MAN_FC   : 예보관명
#  9. REG_NAME : 예보구역명
# 10. SKY      : 하늘상태코드 (WB01(맑음),WB02(구름조금),WB03(구름많음),WB04(흐림))
# 11. PRE      : 강수유무코드 (WB09(비),WB11(비/눈),WB13(눈/비),WB12(눈))
# 12. CONF     : 신뢰도
# 13. WF       : 예보
# 14. RN_ST    : 강수확률
============
#  주간/중기예보 기온 조회 [입력인수형태][예] ?reg=&tmfc1=2013121018&tmfc2=2013121106&tmef1=20131212&tmef2=20131219&disp=0&help=1
#--------------------------------------------------------------------------------------------------
#  1. REG_ID   : 예보구역코드
#  2. TM_FC    : 발표시각(년월일시분,KST)
#  3. TM_EF    : 발효시각(년월일시분,KST)
#  4. MOD      : 구간 (A01(24시간),A02(12시간))
#  5. STN      : 발표관서
#  6. C        : 발표코드
#  7. MAN_ID   : 예보관ID
#  8. MAN_FC   : 예보관명
#  9. REG_NAME : 예보구역명
# 10. MIN      : 아침최저기온
# 11. MAX      : 낮최고기온
# 11. MIN_L    : 아침최저기온 하한 기온범위
# 11. MIN_H    : 아침최저기온 상한 기온범위
# 11. MAX_L    : 낮최고기온 하한 기온범위
# 11. MAX_H    : 낮최고기온 상한 기온범위

===============해상
  #  1. REG_ID   : 예보구역코드
#  2. TM_FC    : 발표시각(년월일시분,KST)
#  3. TM_EF    : 발효시각(년월일시분,KST)
#  4. MOD      : 구간 (A01(24시간),A02(12시간))
#  5. STN      : 발표관서
#  6. C        : 발표코드
#  7. MAN_ID   : 예보관ID
#  8. MAN_FC   : 예보관명
#  9. REG_NAME : 예보구역명
# 10. WH_A     : 파고1(m)
# 11. WH_B     : 파고2(m)
# 12. SKY      : 하늘상태코드 (WB01(맑음),WB02(구름조금),WB03(구름많음),WB04(흐림))
# 13. PRE      : 강수유무코드 (WB09(비),WB11(비/눈),WB13(눈/비),WB12(눈))
# 14. WF       : 예보

================
  
## 개요
- **함수명**: get-medm-weather  
- **목적**: 기상청 중기 육상예보, 중기 기온예보, 중기 해상예보 데이터를 수집하여 데이터베이스에 저장
- **실행방식**: 수동 호출 또는 크론잡 등록을 통한 자동 실행
- **저장테이블**: medium_term_forecasts

## API 엔드포인트
세 가지 기상청 중기예보 API를 호출합니다:

1. **중기 육상예보**: `https://apihub.kma.go.kr/api/typ01/url/fct_afs_wl.php`
2. **중기 기온예보**: `https://apihub.kma.go.kr/api/typ01/url/fct_afs_wc.php`  
3. **중기 해상예보**: `https://apihub.kma.go.kr/api/typ01/url/fct_afs_wo.php`

## 환경변수
- `KMA_AUTH_KEY`: 기상청 API 인증키 (필수) - get-kma-weather와 동일
- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase 서비스 역할 키

## 주요 기능

### 1. 지역 정보 로딩
- **223개 공식 KMA 지역 정보** 하드코딩 (CSV 파일 의존성 제거)
- 육상(A), 도시(C), 해상(I) 모든 지역 타입 지원
- 지역별 `REG_SP` 타입 자동 매핑

### 2. API 데이터 수집
- 세 가지 예보 타입을 순차적으로 호출
- **EUC-KR 인코딩** 지원으로 한글 데이터 정상 처리
- CSV 형태의 응답을 파싱 (`#START7777` 마커 이후 데이터 추출)
- KST 시간을 UTC로 변환 (양방향 타임스탬프 저장)

### 3. 데이터베이스 저장  
- `medium_term_forecasts` 테이블에 upsert 방식으로 저장
- 중복 데이터 방지: (reg_id, tm_fc, tm_ef, mod, forecast_type) 조합으로 구분
- 생성/수정 시간 KST/UTC 병행 저장

## API별 수집 데이터 현황

### 1. 중기 육상예보 (land) - 135개 레코드
**API**: `https://apihub.kma.go.kr/api/typ01/url/fct_afs_wl.php`
**대상 지역**: 육상(A), 도시(C) 지역
**예보 기간**: 발표일로부터 3-7일 후
**주요 데이터**:
- `sky`: 하늘상태코드 (1:맑음, 2:구름조금, 3:구름많음, 4:흐림)
- `pre`: 강수유무코드 (0:없음, 1:있음)  
- `conf`: 신뢰도 (한글: 높음/보통/낮음)
- `wf`: 날씨예보 (한글: 맑음, 구름많음, 흐림, 비 등)
- `rn_st`: 강수확률 (%, 정수)
- 기온 관련 필드는 **null**

### 2. 중기 기온예보 (temperature) - 1218개 레코드  
**API**: `https://apihub.kma.go.kr/api/typ01/url/fct_afs_wc.php`
**대상 지역**: 모든 육상(A), 도시(C) 지역
**예보 기간**: 발표일로부터 3-7일 후
**주요 데이터**:
- `min_temp`: 최저기온 (°C, 정수)
- `max_temp`: 최고기온 (°C, 정수)
- `min_temp_l`: 최저기온 하한 (°C, 정수)
- `min_temp_h`: 최저기온 상한 (°C, 정수)
- `max_temp_l`: 최고기온 하한 (°C, 정수)  
- `max_temp_h`: 최고기온 상한 (°C, 정수)
- `conf`: 신뢰도 (한글)
- 날씨/파고 관련 필드는 **null**

### 3. 중기 해상예보 (marine) - 117개 레코드
**API**: `https://apihub.kma.go.kr/api/typ01/url/fct_afs_wo.php`  
**대상 지역**: 해상(I) 지역만
**예보 기간**: 발표일로부터 3-7일 후
**주요 데이터**:
- `wh_a`: 파고1 (m, 실수)
- `wh_b`: 파고2 (m, 실수)
- `sky`, `pre`, `wf`: 해상 날씨 정보
- 일부 기온 필드는 **null**

## 데이터 구조

### 공통 필드
- `reg_id`: 예보구역코드 (예: 11B00000)
- `reg_sp`: 특성 (A:육상, C:도시, I:해상)
- `reg_name`: 지역명 (한글: 서울.인천.경기 등)
- `stn_id`: 발표관서번호  
- `tm_fc`: 발표시각 (UTC)
- `tm_fc_kr`: 발표시각 (KST, +09:00)
- `tm_ef`: 발효시각 (UTC)
- `tm_ef_kr`: 발효시각 (KST, +09:00)
- `mod`: 구간 (A01:24시간, A02:12시간)
- `forecast_type`: 예보 타입 (land/temperature/marine)
- `created_at_kr`: 생성시간 (KST)
- `updated_at`: 수정시간 (UTC)
- `updated_at_kr`: 수정시간 (KST)

## 응답 형태

### 성공 응답
```json
{
  "success": true,
  "message": "중기예보 데이터 수집 완료: 1470개 레코드",
  "results": {
    "land": { "count": 135, "errors": [] },
    "temperature": { "count": 1218, "errors": [] }, 
    "marine": { "count": 117, "errors": [] }
  },
  "timestamp": "2025-08-25T14:15:12.908Z"
}
```

### 부분 성공 응답 (207 Multi-Status)
```json
{
  "success": false,
  "message": "중기예보 데이터 수집 완료: 1353개 레코드",
  "results": {
    "land": { "count": 135, "errors": [] },
    "temperature": { "count": 1218, "errors": [] },
    "marine": { "count": 0, "errors": ["EUC-KR 디코딩 오류"] }
  },
  "timestamp": "2025-08-25T14:15:12.908Z"
}
```

### 오류 응답
```json
{
  "success": false,
  "error": "KMA_AUTH_KEY 환경변수가 설정되지 않았습니다",
  "timestamp": "2025-08-25T10:00:00.000Z"
}
```

## 배포 명령어
```bash
supabase functions deploy get-medm-weather --no-verify-jwt
```

## 수동 실행
```bash
curl -X POST https://your-project.supabase.co/functions/v1/get-medm-weather \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## 크론잡 등록 예시
- **권장 실행 주기**: 하루 2회 (오전 6시 10분, 오후 6시 10분)
- **이유**: 중기예보는 하루 2회 (06:00, 18:00 KST) 발표됨

## 로그 및 모니터링
- 각 API 호출 결과를 콘솔에 로깅
- 성공/실패 건수를 응답에 포함
- 부분 실패 시에도 성공한 데이터는 저장

## 수집 데이터 특성

### 날짜별 데이터 분포
- **예보 기간**: 현재 시점부터 약 5일간 (3-7일 중기예보)
- **총 1470개 레코드** = 223개 지역 × 다중 구간 × 5일간 예보
- **갱신 주기**: 하루 2회 (06:00, 18:00 KST) 새로운 중기예보 발표

### null 값이 정상인 경우
- **land 예보**: 기온 관련 컬럼 (`min_temp`, `max_temp` 등) → null
- **temperature 예보**: 파고 관련 컬럼 (`wh_a`, `wh_b`) → null  
- **marine 예보**: 일부 기온 컬럼 → null (해상 특성상)

### 한글 데이터 처리
- **EUC-KR 인코딩** 자동 디코딩으로 한글 정상 표시
- `conf`: "높음", "보통", "낮음" 등 한글 신뢰도
- `wf`: "맑음", "구름많음", "흐림", "비" 등 한글 날씨 표현

## 기술적 세부사항

### 지역 정보 관리
- **223개 공식 KMA 지역** 하드코딩 (파일 의존성 제거)
- 지역 타입별 분포: A(육상) + C(도시) + I(해상)
- 런타임에서 `regionInfo.get(REG_ID)`로 지역 정보 조회

### CSV 파싱 로직
- `#START7777` 마커 이후 실제 데이터 시작점 식별
- 헤더 라인과 데이터 라인 구분 처리
- 빈 라인 및 형식 오류 데이터 필터링

### 데이터베이스 최적화
- **upsert 방식**: 기존 데이터 자동 갱신
- **복합 키**: `(reg_id, tm_fc, tm_ef, mod, forecast_type)` 조합으로 중복 방지
- **시간대 병행**: UTC/KST 양방향 타임스탬프 저장

## 주의사항
- 기상청 API 호출량 제한에 주의 (과도한 호출 시 차단 가능)
- 대량 데이터 처리 (1470개 레코드)로 인한 메모리 사용량 모니터링 필요
- EUC-KR 디코딩 실패 시 해당 API 데이터만 누락됨 (다른 API는 정상 처리)