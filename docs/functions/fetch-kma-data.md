# fetch-kma-data Function

## 개요
기상청 해양관측 API를 호출하여 실시간 해양 기상 데이터를 수집하고 데이터베이스에 저장하는 Supabase Edge Function입니다.

## 주요 기능
- 기상청 해양관측 API (`sea_obs.php`) 호출
- KST(한국 표준시) 기준 시간 처리
- EUC-KR 인코딩 데이터 디코딩
- 데이터 유효성 검증 및 정제

## API 정보
- **기상청 API**: `https://apihub.kma.go.kr/api/typ01/url/sea_obs.php`
- **데이터 주기**: 30분 단위 (정시, 30분)
- **인코딩**: EUC-KR
- **요청 시간**: 현재 시간(KST) 기준 가장 가까운 이전 시간

## 데이터 수집 항목
- **파고 정보**: 유의파고 (`significant_wave_height`)
- **기상 정보**: 풍향, 풍속, 돌풍 (`wind_direction`, `wind_speed`, `gust_wind_speed`)
- **온도 정보**: 수온, 기온 (`water_temperature`, `air_temperature`)
- **기타**: 기압, 습도 (`pressure`, `humidity`)

## 시간 처리
### KST → UTC 변환
```javascript
// KST 시간을 9시간 빼서 UTC로 변환
const kstDate = new Date(Date.UTC(year, month, day, hour, minute));
kstDate.setUTCHours(kstDate.getUTCHours() - 9);
```

### 요청 시간 결정
- 현재 시간이 15:45 → 15:30 데이터 요청
- 현재 시간이 16:20 → 16:00 데이터 요청

## 데이터베이스 테이블

### 쓰기 테이블
- **`marine_observations`**: 해양 관측 데이터 저장
  - 중복 체크: `station_id`, `observation_time_kst` 조합
  - 저장 방식: `upsert` (중복 시 업데이트)

- **`data_collection_logs`**: 수집 로그 저장
  - 수집 시간, 대상 시간, 상태, 레코드 수, 에러 메시지

## 데이터 검증
### 무효값 처리
- `-99.0`, `-99`, 빈 문자열 → `null` 변환
- 숫자 변환 실패 시 → `null` 변환
- 모든 측정값이 `null`인 레코드는 저장하지 않음

### 필수 검증 항목
- 관측소 ID: 숫자 형식 검증
- 관측 시간: 12자리 형식 (`YYYYMMDDHHMM`) 검증
- 좌표 정보: 경도, 위도 유효성 검증

## 환경 변수
- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_SERVICE_ROLE_KEY`: 서비스 롤 키
- `KMA_API_KEY`: 기상청 API 인증키 (기본값 제공)

## 호출 방법
```bash
curl -X GET https://your-project.supabase.co/functions/v1/fetch-kma-data
```

## 응답 형태

### 성공
```json
{
  "message": "Successfully collected 45 observations."
}
```

### 실패
```json
{
  "error": "KMA API request failed: 500 Internal Server Error"
}
```

## 로그 기록
모든 실행 결과는 `data_collection_logs` 테이블에 저장:
```json
{
  "collection_time": "2025-08-20T10:30:00.000Z",
  "target_time": "2025-08-20T10:00:00.000Z",
  "status": "success",
  "records_collected": 45,
  "error_message": null,
  "function_name": "fetch-kma-data"
}
```

## 에러 처리
- API 호출 실패 시 상태 코드와 함께 에러 반환
- 인코딩 문제 시 EUC-KR 디코딩 시도
- 데이터 파싱 실패 시 해당 행 스킵
- 최종 로그는 항상 기록

## 성능 최적화
- 유효하지 않은 데이터 사전 필터링
- 배치 upsert 처리
- 에러 발생 시에도 로그 기록 보장

## 주의사항
- 기상청 API 사용량 제한 고려
- KST/UTC 시간대 변환 정확성 중요
- EUC-KR 인코딩 처리 필수