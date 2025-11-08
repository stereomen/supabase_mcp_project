# mcp-server Function

## 개요
해양 관측 데이터를 조회할 수 있는 MCP(Model Calling Platform) 서버 기능과 RESTful API를 제공하는 하이브리드 Function입니다. GET/POST 두 가지 방식을 지원합니다.

## 주요 기능
- GET API: 쿼리 파라미터 기반 데이터 조회
- POST API: MCP 형식의 도구 호출
- 인증 시스템 (authKey 검증)
- 위치별 데이터 지원 여부 확인
- 시간 기반 데이터 필터링

## API 엔드포인트

### GET 방식
```
GET /functions/v1/mcp-server?name={location}&info={data_type}&authKey={key}&tm={time}
```

### POST 방식  
```
POST /functions/v1/mcp-server
Content-Type: application/json

{
  "tool_name": "get_marine_observations",
  "tool_input": {}
}
```

## GET API 파라미터

### 필수 파라미터
- **name**: 위치명 (예: "부산", "여수")
- **info**: 데이터 타입
  - `wd`: 풍향 (Wind Direction)  
  - `tw`: 수온 (Water Temperature)
  - `wh`: 유의파고 (Wave Height)
- **authKey**: 인증 키 (SUPABASE_ANON_KEY와 일치해야 함)

### 선택 파라미터
- **tm**: 특정 시간 데이터 조회 (YYYYMMDDHHMM 형식)
  - 미제공시: 가장 최근 데이터 반환

## 예시 요청

### GET 요청 예시
```bash
# 부산의 최신 수온 데이터
curl "https://your-project.supabase.co/functions/v1/mcp-server?name=부산&info=tw&authKey=your-key"

# 특정 시간의 풍향 데이터  
curl "https://your-project.supabase.co/functions/v1/mcp-server?name=여수&info=wd&authKey=your-key&tm=202508201400"
```

### POST 요청 예시
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/mcp-server" \
  -H "Content-Type: application/json" \
  -d '{"tool_name": "get_marine_observations", "tool_input": {}}'
```

## 데이터베이스 테이블

### 읽기 테이블
- **`locations`**: 위치 정보 및 지원 데이터 타입
  - 컬럼: `id`, `name`, `supports_wind_direction`, `supports_water_temperature`, `supports_wave_height`

- **`marine_observations`**: 해양 관측 데이터
  - 조회 컬럼: `observation_time`, 요청한 데이터 타입별 컬럼

## 데이터 타입 매핑

| info | 컬럼명 | 지원 플래그 |
|------|--------|------------|
| wd   | wind_direction | supports_wind_direction |
| tw   | water_temperature | supports_water_temperature |  
| wh   | wave_height | supports_wave_height |

## 응답 형태

### 성공 응답 (GET)
```json
{
  "location": "부산",
  "observation_time": "2025-08-20T14:00:00.000Z",
  "tw": 24.5
}
```

### 성공 응답 (POST)
```json
{
  "tool_output": [
    {
      "observation_time": "2025-08-20T14:00:00.000Z",
      "wind_direction": 180,
      "locations": {
        "name": "부산"
      }
    }
  ]
}
```

### 에러 응답
```json
// 인증 실패
{
  "error": "Unauthorized: Invalid authKey"
}

// 위치 없음
{
  "error": "Location not found: 제주도"
}

// 지원하지 않는 데이터 타입
{
  "error": "The location '부산' does not support the requested info 'wh'."
}

// 데이터 없음
{
  "error": "No matching observation found for the given criteria."
}
```

## 인증 시스템
```javascript
if (!authKey || authKey !== Deno.env.get('SUPABASE_ANON_KEY')) {
  return new Response(JSON.stringify({ 
    error: 'Unauthorized: Invalid authKey' 
  }), { status: 401 });
}
```

## 시간 처리
### 시간 변환 함수
```javascript
// YYYYMMDDHHMM → ISO 8601 변환
function parseTmToISO(tm: string): string | null {
  const year = parseInt(tm.substring(0, 4));
  const month = parseInt(tm.substring(4, 6)) - 1;
  const day = parseInt(tm.substring(6, 8));
  const hour = parseInt(tm.substring(8, 10));
  const minute = parseInt(tm.substring(10, 12));
  return new Date(year, month, day, hour, minute).toISOString();
}
```

## 쿼리 최적화
### 조건별 쿼리 구성
```javascript
// 기본 쿼리
let query = supabaseClient
  .from('marine_observations')
  .select(`observation_time, ${column}`)
  .eq('location_id', location.id)
  .not(column, 'is', null)
  .order('observation_time', { ascending: false });

// 특정 시간 조회 vs 최신 데이터 조회
if (tm) {
  query = query.eq('observation_time', observationTime);
} else {
  query = query.limit(1);
}
```

## 환경 변수
- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_ANON_KEY`: 익명 키 (인증용)
- `SERVICE_ROLE_KEY`: 서비스 롤 키

## MCP 도구 확장
현재 지원하는 도구:
- `get_marine_observations`: 모든 해양 관측 데이터 조회

새 도구 추가 방법:
```javascript
case 'new_tool_name':
  // 새 도구 로직 구현
  tool_output = processNewTool(tool_input);
  break;
```

## 에러 코드
- **400**: 잘못된 파라미터 또는 요청 형식
- **401**: 인증 실패  
- **404**: 위치 또는 데이터를 찾을 수 없음
- **405**: 허용되지 않은 HTTP 메서드
- **500**: 데이터베이스 조회 실패

## 활용 사례
- 외부 시스템에서 해양 데이터 API 호출
- AI/ML 모델의 해양 데이터 접근
- 실시간 해양 모니터링 시스템
- MCP 프로토콜 기반 서비스 통합

## 주의사항
- authKey는 SUPABASE_ANON_KEY와 정확히 일치해야 함
- 위치명은 데이터베이스에 등록된 정확한 이름 사용
- tm 파라미터는 정확한 12자리 형식 필요
- 지원하지 않는 데이터 타입 요청시 400 에러 반환