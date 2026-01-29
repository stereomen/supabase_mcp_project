-- 광고 제휴사 테이블 RLS 정책 수정 (안전 버전)
-- 생성일: 2025-12-22
-- 목적: anon role에서도 CRUD 작업이 가능하도록 정책 수정

-- 기존 정책 삭제 (모든 가능한 이름)
DROP POLICY IF EXISTS "Enable read access for active partners" ON ad_partners;
DROP POLICY IF EXISTS "Enable insert for service role only" ON ad_partners;
DROP POLICY IF EXISTS "Enable update for service role only" ON ad_partners;
DROP POLICY IF EXISTS "Enable delete for service role only" ON ad_partners;
DROP POLICY IF EXISTS "Enable read access for all users" ON ad_partners;
DROP POLICY IF EXISTS "Enable insert for all users" ON ad_partners;
DROP POLICY IF EXISTS "Enable update for all users" ON ad_partners;
DROP POLICY IF EXISTS "Enable delete for all users" ON ad_partners;

-- 새로운 정책: anon role에서 모든 작업 허용
CREATE POLICY "Enable read access for all users" ON ad_partners
    FOR SELECT
    USING (true);

CREATE POLICY "Enable insert for all users" ON ad_partners
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON ad_partners
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable delete for all users" ON ad_partners
    FOR DELETE
    USING (true);

-- 확인용 주석
COMMENT ON TABLE ad_partners IS '광고 제휴사 정보 관리 테이블 (모든 사용자 접근 가능)';
