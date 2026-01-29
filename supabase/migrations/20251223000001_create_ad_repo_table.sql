-- 광고 저장소 테이블 생성
-- 생성일: 2025-12-23
-- 목적: 광고 캠페인 정보 관리

CREATE TABLE IF NOT EXISTS ad_repo (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id TEXT NOT NULL REFERENCES ad_partners(partner_id),
    campaign_name TEXT NOT NULL,

    -- 타겟팅 정보
    matched_station_id TEXT,  -- DT_0001 등
    matched_area TEXT,         -- 서해중부, 서해남부 등

    -- 광고 타입 및 소재
    ad_type_a TEXT,            -- banner, popup, inline 등
    ad_type_b TEXT,            -- secondary type (optional)
    image_a_url TEXT,          -- 이미지 A 경로/URL
    image_b_url TEXT,          -- 이미지 B 경로/URL
    landing_url TEXT,          -- 랜딩 페이지 URL

    -- 노출 기간
    display_start_date DATE NOT NULL,
    display_end_date DATE NOT NULL,

    -- 상태 및 우선순위
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,  -- 높을수록 우선 노출

    -- 추가 정보
    description TEXT,
    additional_data JSONB,

    -- 메타데이터
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- 제약조건
    CONSTRAINT valid_display_period CHECK (display_end_date >= display_start_date),
    CONSTRAINT valid_priority CHECK (priority >= 0)
);

-- 인덱스 생성 (효율적인 광고 조회를 위함)
CREATE INDEX idx_ad_repo_station_active ON ad_repo(matched_station_id, is_active)
    WHERE is_active = true;

CREATE INDEX idx_ad_repo_area_active ON ad_repo(matched_area, is_active)
    WHERE is_active = true;

CREATE INDEX idx_ad_repo_display_period ON ad_repo(display_start_date, display_end_date)
    WHERE is_active = true;

CREATE INDEX idx_ad_repo_partner_id ON ad_repo(partner_id);

-- 복합 인덱스: 관측소 + 날짜 범위로 빠른 검색
CREATE INDEX idx_ad_repo_station_date_active ON ad_repo(matched_station_id, display_start_date, display_end_date, is_active)
    WHERE is_active = true;

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_ad_repo_updated_at
    BEFORE UPDATE ON ad_repo
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS 비활성화 (Edge Function에서 Service Role Key 사용)
ALTER TABLE ad_repo DISABLE ROW LEVEL SECURITY;

-- 테이블 설명
COMMENT ON TABLE ad_repo IS '광고 캠페인 정보 저장 테이블';
COMMENT ON COLUMN ad_repo.priority IS '우선순위 (높을수록 먼저 노출)';
COMMENT ON COLUMN ad_repo.matched_station_id IS '관측소 ID (DT_0001 등) - NULL이면 전체 관측소 대상';
COMMENT ON COLUMN ad_repo.matched_area IS '해역 (서해중부, 서해남부 등) - NULL이면 전체 해역 대상';
