# import-tide-data Function

## 개요
Supabase Storage에 저장된 JSON 파일에서 조석 데이터를 읽어와 데이터베이스에 일괄 삽입하는 백그라운드 처리 Function입니다.

## 주요 기능
- Supabase Storage에서 JSON 파일 다운로드
- 대용량 데이터 배치 처리 (1000개씩)
- 백그라운드 비동기 실행
- 중복 데이터 방지 (upsert 처리)

## 데이터 소스
### Storage 정보
- **버킷**: `tidedatadb.tidedata.json`
- **파일**: `Results_ tideDataDB.tideData.json`
- **위치**: Supabase Storage

### 데이터 구조
```json
[
  {
    "location": {
      "code": "KR001",
      "name": "부산"
    },
    "tideData": [
      {
        "date": "2025-08-20",
        "data": {
          "obsPostName": "부산 관측소",
          "obsLon": "129.0756",
          "obsLat": "35.1796",
          "lvl1": 4.2,
          "lvl2": 1.8,
          "lvl3": 4.5,
          "lvl4": 2.1
        }
      }
    ]
  }
]
```

## 데이터베이스 테이블

### 쓰기 테이블
- **`tide_data`**: 조석 데이터 저장
  - 중복 체크: `obs_date`, `obs_post_name` 조합
  - 저장 방식: `upsert` (중복 시 업데이트)

### 저장 컬럼
- `location_code`: 위치 코드
- `location_name`: 위치명
- `obs_date`: 관측 날짜
- `obs_post_name`: 관측소명
- `obs_lon`: 관측소 경도 (float)
- `obs_lat`: 관측소 위도 (float)
- `lvl1~4`: 조석 레벨 데이터
- `updated_at`: UTC 업데이트 시간
- `updated_at_kr`: KST 업데이트 시간

## 처리 프로세스
1. **파일 다운로드**: Storage에서 JSON 파일 읽기
2. **데이터 검증**: 필수 필드 유효성 확인
3. **데이터 변환**: 좌표 데이터 float 변환
4. **배치 처리**: 1000개씩 나누어 upsert
5. **에러 처리**: 실패 시 로그 출력

## 데이터 검증
### 필수 필드 확인
```javascript
// location 정보
if (!locationCode || !locationName || !tideDataArray) {
  console.warn('Skipping entry due to missing location or tideData');
  continue;
}

// 개별 조석 데이터  
if (!obsDate || !obsPostName || obsLon === null || obsLat === null) {
  console.warn('Skipping tideItem due to missing essential data');
  continue;
}
```

### 좌표 변환
```javascript
const obsLon = !isNaN(parseFloat(rawObsLon)) ? parseFloat(rawObsLon) : null;
const obsLat = !isNaN(parseFloat(rawObsLat)) ? parseFloat(rawObsLat) : null;
```

## 환경 변수
- `SUPABASE_URL`: Supabase 프로젝트 URL  
- `SUPABASE_SERVICE_ROLE_KEY`: 서비스 롤 키

## 호출 방법
```bash
curl -X POST https://your-project.supabase.co/functions/v1/import-tide-data
```

## 응답 형태
### 즉시 응답 (202 Accepted)
```json
{
  "message": "Tide data import process initiated in the background."
}
```

### 처리 로그 (콘솔)
```
Starting tide data import process...
Attempting to download file from Storage...
Prepared 2450 records for insertion.
Inserting batch 1/3 with 1000 records...
Inserting batch 2/3 with 1000 records...  
Inserting batch 3/3 with 450 records...
Tide data import process finished successfully.
```

## 백그라운드 처리
```javascript
// 백그라운드에서 비동기 실행
const timer = setTimeout(importTideData, 0);
Deno.unrefTimer(timer);

// 즉시 202 응답 반환
return new Response(JSON.stringify({ message: "..." }), {
  status: 202  // Accepted
});
```

## 배치 처리 최적화
### 배치 크기
- **기본값**: 1000개 레코드
- **조정 가능**: `batchSize` 변수로 조정

### 메모리 효율성
```javascript
for (let i = 0; i < dataToInsert.length; i += batchSize) {
  const batch = dataToInsert.slice(i, i + batchSize);
  // 배치별 처리로 메모리 사용량 최적화
}
```

## 에러 처리
- **Storage 접근 실패**: 파일 다운로드 에러 시 중단
- **JSON 파싱 실패**: 파일 형식 오류 시 중단  
- **데이터베이스 에러**: upsert 실패 시 중단
- **모든 에러는 콘솔에 로그 출력**

## 성능 특성
- **비동기 처리**: HTTP 응답 즉시 반환
- **배치 처리**: 대용량 데이터 효율적 처리
- **중복 방지**: upsert로 데이터 무결성 보장
- **메모리 최적화**: 청크 단위 처리

## 활용 사례
- 정기적인 조석 데이터 업데이트
- 외부 시스템에서 제공한 대량 데이터 임포트
- 데이터 마이그레이션 작업

## 주의사항
- Storage 파일 경로와 버킷명 정확성 확인 필요
- JSON 파일 형식이 예상 구조와 일치해야 함
- 백그라운드 처리로 완료 시점 별도 확인 필요
- 대용량 처리 시 실행 시간 제한 고려