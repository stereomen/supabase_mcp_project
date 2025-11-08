# analyze-data Function

## 개요
해양 관측 데이터를 분석하여 각 카테고리별로 데이터를 가지고 있는 관측소 위치 정보를 추출하고 `analysis_results` 테이블에 저장하는 Supabase Edge Function입니다.

## 주요 기능
- RPC 함수를 사용한 컬럼별 위치 데이터 조회
- 분석 결과의 안정성을 위한 별도 테이블 저장
- 기존 결과 삭제 후 최신 데이터로 갱신

## 분석 카테고리
1. **wind_direction**: 풍향 데이터가 있는 관측소
2. **water_temperature**: 수온 데이터가 있는 관측소  
3. **significant_wave_height**: 유의파고 데이터가 있는 관측소

## 데이터베이스 테이블

### 사용하는 RPC 함수
- **`get_locations_for_column`**: 특정 컬럼에 데이터가 있는 위치 정보 조회
  - 파라미터: `column_name` (string)
  - 반환값: `{name, latitude, longitude}[]`

### 쓰기 테이블
- **`analysis_results`**: 분석 결과 저장
  - 컬럼: `category`, `name`, `latitude`, `longitude`
  - 저장 방식: 기존 데이터 삭제 후 새 데이터 삽입

## 실행 프로세스
1. **기존 분석 결과 삭제**: 항상 최신 상태 유지
2. **병렬 데이터 조회**: 3개 카테고리 동시 조회
3. **데이터 가공**: 각 위치에 카테고리 정보 추가
4. **결과 저장**: `analysis_results` 테이블에 일괄 삽입

## 환경 변수
- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_SERVICE_ROLE_KEY`: 서비스 롤 키
- `SERVICE_ROLE_KEY`: Authorization 헤더용 키

## 호출 방법
```bash
curl -X GET https://your-project.supabase.co/functions/v1/analyze-data
```

## 응답 형태

### 성공
```json
{
  "message": "분석이 성공적으로 완료되었습니다. 'analysis_results' 테이블에서 결과를 확인하세요.",
  "timestamp": "2025-08-20T10:30:00.000Z",
  "inserted_rows": 45
}
```

### 실패
```json
{
  "error": "Failed to clear previous analysis results."
}
```

## 데이터 구조
저장되는 분석 결과:
```json
{
  "category": "wind_direction_locations",
  "name": "부산",
  "latitude": 35.1796,
  "longitude": 129.0756
}
```

## 주의사항
- RPC 함수 `get_locations_for_column`이 데이터베이스에 사전 생성되어야 함
- 서비스 롤 키를 사용한 관리자 권한 필요
- 기존 분석 결과는 매번 완전히 삭제됨