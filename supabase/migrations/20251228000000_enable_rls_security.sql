-- RLS (Row Level Security) 활성화 - 광고 시스템 필수 테이블만
-- 생성일: 2025-12-28
-- 목적: 프로덕션 배포를 위한 보안 강화 (광고 관련 테이블)

-- ============================================================================
-- 1. 광고 제휴사 테이블 (ad_partners)
-- ============================================================================

-- 기존 정책 제거 (있다면)
DROP POLICY IF EXISTS "Allow read access for active partners" ON ad_partners;
DROP POLICY IF EXISTS "Allow all operations for service role" ON ad_partners;
DROP POLICY IF EXISTS "Enable read access for active partners" ON ad_partners;
DROP POLICY IF EXISTS "Enable insert for service role only" ON ad_partners;
DROP POLICY IF EXISTS "Enable update for service role only" ON ad_partners;
DROP POLICY IF EXISTS "Enable delete for service role only" ON ad_partners;
DROP POLICY IF EXISTS "Enable read access for all users" ON ad_partners;
DROP POLICY IF EXISTS "Enable insert for all users" ON ad_partners;
DROP POLICY IF EXISTS "Enable update for all users" ON ad_partners;
DROP POLICY IF EXISTS "Enable delete for all users" ON ad_partners;

-- RLS 활성화
ALTER TABLE ad_partners ENABLE ROW LEVEL SECURITY;

-- 정책: 활성 파트너만 조회 가능
CREATE POLICY "Allow read access for active partners" ON ad_partners
  FOR SELECT
  USING (is_active = true);

-- 정책: Service Role만 모든 작업 가능
CREATE POLICY "Allow all operations for service role" ON ad_partners
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ============================================================================
-- 2. 광고 캠페인 테이블 (ad_repo)
-- ============================================================================

-- 기존 정책 제거 (있다면)
DROP POLICY IF EXISTS "Allow read access for active ads" ON ad_repo;
DROP POLICY IF EXISTS "Allow all operations for service role on ad_repo" ON ad_repo;

-- RLS 활성화
ALTER TABLE ad_repo ENABLE ROW LEVEL SECURITY;

-- 정책: 활성 광고만 조회 가능
CREATE POLICY "Allow read access for active ads" ON ad_repo
  FOR SELECT
  USING (is_active = true);

-- 정책: Service Role만 모든 작업 가능
CREATE POLICY "Allow all operations for service role on ad_repo" ON ad_repo
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ============================================================================
-- 3. 광고 분석 테이블 (ad_analytics)
-- ============================================================================

-- 기존 정책 제거 (있다면)
DROP POLICY IF EXISTS "Allow insert for event tracking" ON ad_analytics;
DROP POLICY IF EXISTS "Allow read for service role on analytics" ON ad_analytics;
DROP POLICY IF EXISTS "Allow all operations for service role on analytics" ON ad_analytics;

-- RLS 활성화
ALTER TABLE ad_analytics ENABLE ROW LEVEL SECURITY;

-- 정책: 이벤트 삽입은 누구나 가능 (Edge Function의 인증 통과 필요)
CREATE POLICY "Allow insert for event tracking" ON ad_analytics
  FOR INSERT
  WITH CHECK (true);

-- 정책: Service Role만 조회/수정/삭제 가능 (관리자만)
CREATE POLICY "Allow all operations for service role on analytics" ON ad_analytics
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ============================================================================
-- 4. 확인 및 로깅
-- ============================================================================

COMMENT ON TABLE ad_partners IS '광고 제휴사 정보 관리 테이블 (RLS 활성화 - 읽기 전용 공개)';
COMMENT ON TABLE ad_repo IS '광고 캠페인 관리 테이블 (RLS 활성화 - 활성 광고만 공개)';
COMMENT ON TABLE ad_analytics IS '광고 분석 테이블 (RLS 활성화 - 삽입은 공개, 조회는 관리자만)';

-- 적용 결과 출력
DO $$
DECLARE
  ad_partners_rls boolean;
  ad_repo_rls boolean;
  ad_analytics_rls boolean;
BEGIN
  -- RLS 상태 확인
  SELECT relrowsecurity INTO ad_partners_rls FROM pg_class WHERE relname = 'ad_partners';
  SELECT relrowsecurity INTO ad_repo_rls FROM pg_class WHERE relname = 'ad_repo';
  SELECT relrowsecurity INTO ad_analytics_rls FROM pg_class WHERE relname = 'ad_analytics';

  RAISE NOTICE '===========================================';
  RAISE NOTICE '✅ RLS 정책 적용 완료';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'ad_partners RLS: %', CASE WHEN ad_partners_rls THEN 'ENABLED ✓' ELSE 'DISABLED ✗' END;
  RAISE NOTICE 'ad_repo RLS: %', CASE WHEN ad_repo_rls THEN 'ENABLED ✓' ELSE 'DISABLED ✗' END;
  RAISE NOTICE 'ad_analytics RLS: %', CASE WHEN ad_analytics_rls THEN 'ENABLED ✓' ELSE 'DISABLED ✗' END;
  RAISE NOTICE '===========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📌 다음 환경 변수를 Supabase에 설정하세요:';
  RAISE NOTICE '   1. CLIENT_API_KEY - 클라이언트 앱 인증용';
  RAISE NOTICE '   2. ADMIN_SECRET - 관리자 인증용';
  RAISE NOTICE '   3. ALLOWED_ORIGINS - CORS 허용 도메인';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 다음 단계:';
  RAISE NOTICE '   1. Edge Functions 재배포';
  RAISE NOTICE '   2. 클라이언트 앱에 x-api-key 헤더 추가';
  RAISE NOTICE '===========================================';
END $$;
