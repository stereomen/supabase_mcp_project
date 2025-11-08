  사용되는 RPC 함수

  1. get_locations_for_column

  - 사용 위치: analyze-data/index.ts:13
  - 용도: 특정 컬럼에 데이터가 있는 위치 정보 조회
  - 파라미터: { column_name: string }

  2. get_marine_observations_by_station_id

  - 사용 위치: get-weather-tide-data/index.ts:25
  - 용도: 관측소 ID로 해양 관측 데이터 조회
  - 파라미터: { p_station_id: number, p_date: string, p_time?: string }

  다른 함수들의 데이터 접근 방식

  - get-kma-weather: 직접 테이블 쿼리 (from(), select())
  - fetch-kma-data: 직접 테이블 쿼리 (from(), upsert())
  - import-tide-data: 직접 테이블 쿼리 (from(), upsert())
  - mcp-server: 직접 테이블 쿼리 (from(), select())

  결론: 6개 함수 중 2개만 RPC를 사용하고, 나머지 4개는 모두 직접 테이블 접근 방식을 사용합니다.