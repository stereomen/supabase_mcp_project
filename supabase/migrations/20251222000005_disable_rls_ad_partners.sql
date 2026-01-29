-- 광고 제휴사 테이블 RLS 완전 비활성화
-- 생성일: 2025-12-22
-- 목적: Service Role Key를 사용하는 Edge Function에서 문제없이 접근하도록 RLS 비활성화

-- 모든 기존 정책 삭제
DROP POLICY IF EXISTS "Enable read access for active partners" ON ad_partners;
DROP POLICY IF EXISTS "Enable insert for service role only" ON ad_partners;
DROP POLICY IF EXISTS "Enable update for service role only" ON ad_partners;
DROP POLICY IF EXISTS "Enable delete for service role only" ON ad_partners;
DROP POLICY IF EXISTS "Enable read access for all users" ON ad_partners;
DROP POLICY IF EXISTS "Enable insert for all users" ON ad_partners;
DROP POLICY IF EXISTS "Enable update for all users" ON ad_partners;
DROP POLICY IF EXISTS "Enable delete for all users" ON ad_partners;

-- RLS 비활성화
ALTER TABLE ad_partners DISABLE ROW LEVEL SECURITY;

-- 확인
COMMENT ON TABLE ad_partners IS '광고 제휴사 정보 관리 테이블 (RLS 비활성화 - Edge Function에서 Service Role Key 사용)';
