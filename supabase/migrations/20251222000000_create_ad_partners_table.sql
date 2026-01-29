-- 광고 제휴사 정보 관리 테이블
-- 생성일: 2025-12-22
-- 목적: 제휴광고상품 판매를 위한 제휴사(업체) 정보 저장 및 관리

CREATE TABLE IF NOT EXISTS ad_partners (
    -- 기본 키
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 업체 기본 정보
    partner_id TEXT UNIQUE NOT NULL,            -- 업체ID (고유 식별자, 예: PARTNER_0001)
    partner_name TEXT NOT NULL,                 -- 업체명
    address TEXT,                               -- 주소
    phone TEXT,                                 -- 전화번호
    contact_name TEXT,                          -- 담당자 이름

    -- 매칭 정보
    matched_station_id TEXT,                    -- 매칭되는 관측소 ID (예: DT_0001)
    matched_area TEXT,                          -- 매칭되는 해역 (예: 서해북부, 서해남부, 남해동부 등)

    -- 업체 분류
    business_type TEXT,                         -- 업체 구분 (낙시가게, 선박, 좌대, 낚시터, 펜션 등)
    business_level INTEGER DEFAULT 1,           -- 업체 레벨 (1-10등급, 1이 기본)

    -- 직원 정보
    staff_name_1 TEXT,                          -- 직원이름1
    staff_name_2 TEXT,                          -- 직원이름2
    staff_name_3 TEXT,                          -- 직원이름3

    -- 상태 정보
    is_active BOOLEAN DEFAULT true,             -- 활성 상태 (true: 활성, false: 비활성)

    -- 추가 데이터 (확장 가능)
    additional_data JSONB,                      -- 기타 추가 정보 (유연한 데이터 저장)

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),       -- 레코드 생성 시각
    updated_at TIMESTAMPTZ DEFAULT NOW()        -- 레코드 수정 시각
);

-- 인덱스 생성 (검색 및 필터링 성능 향상)
CREATE INDEX IF NOT EXISTS idx_ad_partners_partner_id ON ad_partners(partner_id);
CREATE INDEX IF NOT EXISTS idx_ad_partners_partner_name ON ad_partners(partner_name);
CREATE INDEX IF NOT EXISTS idx_ad_partners_matched_station_id ON ad_partners(matched_station_id);
CREATE INDEX IF NOT EXISTS idx_ad_partners_matched_area ON ad_partners(matched_area);
CREATE INDEX IF NOT EXISTS idx_ad_partners_business_type ON ad_partners(business_type);
CREATE INDEX IF NOT EXISTS idx_ad_partners_business_level ON ad_partners(business_level);
CREATE INDEX IF NOT EXISTS idx_ad_partners_is_active ON ad_partners(is_active);
CREATE INDEX IF NOT EXISTS idx_ad_partners_created_at ON ad_partners(created_at DESC);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_ad_partners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ad_partners_updated_at
    BEFORE UPDATE ON ad_partners
    FOR EACH ROW
    EXECUTE FUNCTION update_ad_partners_updated_at();

-- RLS (Row Level Security) 설정
ALTER TABLE ad_partners ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 정책 (활성 상태의 제휴사만 공개)
CREATE POLICY "Enable read access for active partners" ON ad_partners
    FOR SELECT
    USING (is_active = true);

-- 서비스 역할만 쓰기 가능
CREATE POLICY "Enable insert for service role only" ON ad_partners
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Enable update for service role only" ON ad_partners
    FOR UPDATE
    USING (auth.role() = 'service_role');

CREATE POLICY "Enable delete for service role only" ON ad_partners
    FOR DELETE
    USING (auth.role() = 'service_role');

-- 테이블 및 컬럼 코멘트
COMMENT ON TABLE ad_partners IS '광고 제휴사 정보 관리 테이블';
COMMENT ON COLUMN ad_partners.id IS '고유 식별자 (UUID)';
COMMENT ON COLUMN ad_partners.partner_id IS '업체 고유 ID (예: PARTNER_0001)';
COMMENT ON COLUMN ad_partners.partner_name IS '업체명';
COMMENT ON COLUMN ad_partners.address IS '업체 주소';
COMMENT ON COLUMN ad_partners.phone IS '업체 전화번호';
COMMENT ON COLUMN ad_partners.contact_name IS '담당자 이름';
COMMENT ON COLUMN ad_partners.matched_station_id IS '매칭되는 관측소 ID (예: DT_0001)';
COMMENT ON COLUMN ad_partners.matched_area IS '매칭되는 해역 (예: 서해북부, 서해남부)';
COMMENT ON COLUMN ad_partners.business_type IS '업체 구분 (낙시가게, 선박, 좌대, 낚시터, 펜션 등)';
COMMENT ON COLUMN ad_partners.business_level IS '업체 레벨 (1-10등급)';
COMMENT ON COLUMN ad_partners.staff_name_1 IS '직원 이름 1';
COMMENT ON COLUMN ad_partners.staff_name_2 IS '직원 이름 2';
COMMENT ON COLUMN ad_partners.staff_name_3 IS '직원 이름 3';
COMMENT ON COLUMN ad_partners.is_active IS '활성 상태 플래그';
COMMENT ON COLUMN ad_partners.additional_data IS '기타 추가 정보 (JSONB)';
COMMENT ON COLUMN ad_partners.created_at IS '레코드 생성 시각';
COMMENT ON COLUMN ad_partners.updated_at IS '레코드 수정 시각';
