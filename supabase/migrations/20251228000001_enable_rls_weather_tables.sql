-- RLS 활성화 - 날씨/조석 데이터 테이블
-- 생성일: 2025-12-28
-- 목적: 날씨 및 조석 데이터 테이블 보호 (읽기는 공개, 쓰기는 Service Role만)

-- ============================================================================
-- 1. 날씨 예보 테이블 (weather_forecasts)
-- ============================================================================

-- 기존 정책 제거
DROP POLICY IF EXISTS "Allow read access for all on weather_forecasts" ON weather_forecasts;
DROP POLICY IF EXISTS "Allow write for service role on weather_forecasts" ON weather_forecasts;

-- RLS 활성화
ALTER TABLE weather_forecasts ENABLE ROW LEVEL SECURITY;

-- 정책: 모든 사용자 읽기 가능 (공개 데이터)
CREATE POLICY "Allow read access for all on weather_forecasts" ON weather_forecasts
  FOR SELECT
  USING (true);

-- 정책: Service Role만 쓰기 가능 (데이터 수집 함수)
CREATE POLICY "Allow write for service role on weather_forecasts" ON weather_forecasts
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ============================================================================
-- 2. 조석 데이터 테이블 (tide_data)
-- ============================================================================

DROP POLICY IF EXISTS "Allow read access for all on tide_data" ON tide_data;
DROP POLICY IF EXISTS "Allow write for service role on tide_data" ON tide_data;

ALTER TABLE tide_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access for all on tide_data" ON tide_data
  FOR SELECT
  USING (true);

CREATE POLICY "Allow write for service role on tide_data" ON tide_data
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ============================================================================
-- 3. 해양 관측 테이블 (marine_observations)
-- ============================================================================

DROP POLICY IF EXISTS "Allow read access for all on marine_observations" ON marine_observations;
DROP POLICY IF EXISTS "Allow write for service role on marine_observations" ON marine_observations;

ALTER TABLE marine_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access for all on marine_observations" ON marine_observations
  FOR SELECT
  USING (true);

CREATE POLICY "Allow write for service role on marine_observations" ON marine_observations
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ============================================================================
-- 4. 중기 예보 테이블 (medium_term_forecasts)
-- ============================================================================

DROP POLICY IF EXISTS "Allow read access for all on medium_term_forecasts" ON medium_term_forecasts;
DROP POLICY IF EXISTS "Allow write for service role on medium_term_forecasts" ON medium_term_forecasts;

ALTER TABLE medium_term_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access for all on medium_term_forecasts" ON medium_term_forecasts
  FOR SELECT
  USING (true);

CREATE POLICY "Allow write for service role on medium_term_forecasts" ON medium_term_forecasts
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ============================================================================
-- 5. OpenWeatherMap 데이터 (openweathermap_data)
-- ============================================================================

DROP POLICY IF EXISTS "Allow read access for all on openweathermap_data" ON openweathermap_data;
DROP POLICY IF EXISTS "Allow write for service role on openweathermap_data" ON openweathermap_data;

ALTER TABLE openweathermap_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access for all on openweathermap_data" ON openweathermap_data
  FOR SELECT
  USING (true);

CREATE POLICY "Allow write for service role on openweathermap_data" ON openweathermap_data
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ============================================================================
-- 6. 조석 지역 정보 (tide_abs_region)
-- ============================================================================

DROP POLICY IF EXISTS "Allow read access for all on tide_abs_region" ON tide_abs_region;
DROP POLICY IF EXISTS "Allow write for service role on tide_abs_region" ON tide_abs_region;

ALTER TABLE tide_abs_region ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access for all on tide_abs_region" ON tide_abs_region
  FOR SELECT
  USING (true);

CREATE POLICY "Allow write for service role on tide_abs_region" ON tide_abs_region
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ============================================================================
-- 7. 확인 및 로깅
-- ============================================================================

COMMENT ON TABLE weather_forecasts IS '날씨 예보 (RLS 활성화 - 읽기 공개, 쓰기 제한)';
COMMENT ON TABLE tide_data IS '조석 데이터 (RLS 활성화 - 읽기 공개, 쓰기 제한)';
COMMENT ON TABLE marine_observations IS '해양 관측 (RLS 활성화 - 읽기 공개, 쓰기 제한)';
COMMENT ON TABLE medium_term_forecasts IS '중기 예보 (RLS 활성화 - 읽기 공개, 쓰기 제한)';
COMMENT ON TABLE openweathermap_data IS 'OpenWeatherMap 데이터 (RLS 활성화 - 읽기 공개, 쓰기 제한)';
COMMENT ON TABLE tide_abs_region IS '조석 지역 정보 (RLS 활성화 - 읽기 공개, 쓰기 제한)';

-- 적용 결과 확인
DO $$
DECLARE
  rls_count int;
BEGIN
  -- RLS 활성화된 테이블 수 확인
  SELECT COUNT(*) INTO rls_count
  FROM pg_class
  WHERE relname IN (
    'weather_forecasts', 'tide_data', 'marine_observations',
    'medium_term_forecasts', 'openweathermap_data', 'tide_abs_region'
  )
  AND relrowsecurity = true;

  RAISE NOTICE '===========================================';
  RAISE NOTICE '✅ 날씨/조석 테이블 RLS 적용 완료';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '총 6개 테이블 중 % 개 RLS 활성화됨', rls_count;
  RAISE NOTICE '';
  RAISE NOTICE '📋 RLS 정책:';
  RAISE NOTICE '  - 읽기(SELECT): 모든 사용자 가능 ✓';
  RAISE NOTICE '  - 쓰기(INSERT/UPDATE/DELETE): Service Role만 가능 ✓';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 보안 효과:';
  RAISE NOTICE '  - ANON_KEY로 직접 접근 시 읽기만 가능';
  RAISE NOTICE '  - 데이터 변조/삭제 차단됨';
  RAISE NOTICE '  - Edge Functions는 정상 동작 (Service Role 사용)';
  RAISE NOTICE '===========================================';
END $$;
