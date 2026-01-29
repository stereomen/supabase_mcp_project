-- 제휴사 테이블에 비밀번호 필드 추가
-- 생성일: 2025-12-23
-- 목적: 제휴사 로그인 및 인증을 위한 비밀번호 관리

-- password 컬럼 추가
ALTER TABLE ad_partners
ADD COLUMN IF NOT EXISTS password TEXT;

-- 기본 비밀번호 설정 (partner_id와 동일하게 초기화)
-- 실제 사용 시 관리자가 개별 설정 필요
UPDATE ad_partners
SET password = partner_id
WHERE password IS NULL;

-- 비밀번호 변경 이력 테이블 (선택사항)
CREATE TABLE IF NOT EXISTS ad_partner_password_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id TEXT NOT NULL REFERENCES ad_partners(partner_id),
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    changed_by TEXT, -- 'admin' 또는 'self'
    CONSTRAINT fk_partner FOREIGN KEY (partner_id) REFERENCES ad_partners(partner_id) ON DELETE CASCADE
);

-- RLS 비활성화
ALTER TABLE ad_partner_password_history DISABLE ROW LEVEL SECURITY;

-- 인덱스
CREATE INDEX idx_password_history_partner ON ad_partner_password_history(partner_id);
CREATE INDEX idx_password_history_date ON ad_partner_password_history(changed_at DESC);

-- 테이블 설명
COMMENT ON COLUMN ad_partners.password IS '제휴사 로그인 비밀번호 (평문 저장 - 실제 운영시 해싱 권장)';
COMMENT ON TABLE ad_partner_password_history IS '제휴사 비밀번호 변경 이력';
