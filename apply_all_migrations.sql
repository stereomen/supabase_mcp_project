-- ============================================
-- 광고 시스템 통합 마이그레이션
-- 실행일: 2025-12-23
-- ============================================

-- 1. ad_repo 테이블 생성
CREATE TABLE IF NOT EXISTS ad_repo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id TEXT NOT NULL REFERENCES ad_partners(partner_id),
    campaign_name TEXT NOT NULL,
    matched_station_id TEXT,
    matched_area TEXT,
    ad_type_a TEXT,
    ad_type_b TEXT,
    image_a_url TEXT,
    image_b_url TEXT,
    landing_url TEXT,
    display_start_date DATE NOT NULL,
    display_end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    description TEXT,
    additional_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_display_period CHECK (display_end_date >= display_start_date),
    CONSTRAINT valid_priority CHECK (priority >= 0)
);

CREATE INDEX IF NOT EXISTS idx_ad_repo_station_active ON ad_repo(matched_station_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ad_repo_area_active ON ad_repo(matched_area, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ad_repo_display_period ON ad_repo(display_start_date, display_end_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ad_repo_partner_id ON ad_repo(partner_id);
CREATE INDEX IF NOT EXISTS idx_ad_repo_station_date_active ON ad_repo(matched_station_id, display_start_date, display_end_date, is_active) WHERE is_active = true;

ALTER TABLE ad_repo DISABLE ROW LEVEL SECURITY;

-- 2. ad_analytics 테이블 생성
CREATE TABLE IF NOT EXISTS ad_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_repo_id UUID NOT NULL REFERENCES ad_repo(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    station_id TEXT,
    event_timestamp TIMESTAMPTZ DEFAULT NOW(),
    event_date DATE,
    user_agent TEXT,
    ip_address TEXT,
    additional_data JSONB,
    CONSTRAINT valid_event_type CHECK (event_type IN ('impression', 'click'))
);

-- event_date 자동 설정 트리거 함수
CREATE OR REPLACE FUNCTION set_ad_analytics_event_date()
RETURNS TRIGGER AS $$
BEGIN
    NEW.event_date := (NEW.event_timestamp AT TIME ZONE 'UTC')::DATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS trg_set_ad_analytics_event_date ON ad_analytics;
CREATE TRIGGER trg_set_ad_analytics_event_date
    BEFORE INSERT OR UPDATE ON ad_analytics
    FOR EACH ROW
    EXECUTE FUNCTION set_ad_analytics_event_date();

CREATE INDEX IF NOT EXISTS idx_ad_analytics_repo_id ON ad_analytics(ad_repo_id);
CREATE INDEX IF NOT EXISTS idx_ad_analytics_event_type ON ad_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_ad_analytics_date ON ad_analytics(event_date);
CREATE INDEX IF NOT EXISTS idx_ad_analytics_repo_date ON ad_analytics(ad_repo_id, event_date);
CREATE INDEX IF NOT EXISTS idx_ad_analytics_timestamp ON ad_analytics(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ad_analytics_repo_event_date ON ad_analytics(ad_repo_id, event_type, event_date);

ALTER TABLE ad_analytics DISABLE ROW LEVEL SECURITY;

-- 3. 성과 요약 뷰
CREATE OR REPLACE VIEW ad_analytics_daily_summary AS
SELECT
    ad_repo_id,
    event_date,
    COUNT(*) FILTER (WHERE event_type = 'impression') as impressions,
    COUNT(*) FILTER (WHERE event_type = 'click') as clicks,
    CASE
        WHEN COUNT(*) FILTER (WHERE event_type = 'impression') > 0
        THEN ROUND((COUNT(*) FILTER (WHERE event_type = 'click')::NUMERIC / COUNT(*) FILTER (WHERE event_type = 'impression')::NUMERIC) * 100, 2)
        ELSE 0
    END as ctr_percentage
FROM ad_analytics
GROUP BY ad_repo_id, event_date
ORDER BY event_date DESC, ad_repo_id;

CREATE OR REPLACE VIEW ad_analytics_campaign_summary AS
SELECT
    a.ad_repo_id,
    r.campaign_name,
    r.partner_id,
    p.partner_name,
    COUNT(*) FILTER (WHERE a.event_type = 'impression') as total_impressions,
    COUNT(*) FILTER (WHERE a.event_type = 'click') as total_clicks,
    CASE
        WHEN COUNT(*) FILTER (WHERE a.event_type = 'impression') > 0
        THEN ROUND((COUNT(*) FILTER (WHERE a.event_type = 'click')::NUMERIC / COUNT(*) FILTER (WHERE a.event_type = 'impression')::NUMERIC) * 100, 2)
        ELSE 0
    END as overall_ctr_percentage,
    MIN(a.event_timestamp) as first_event,
    MAX(a.event_timestamp) as last_event
FROM ad_analytics a
JOIN ad_repo r ON a.ad_repo_id = r.id
LEFT JOIN ad_partners p ON r.partner_id = p.partner_id
GROUP BY a.ad_repo_id, r.campaign_name, r.partner_id, p.partner_name
ORDER BY total_impressions DESC;

-- 4. 광고 저장소 뷰
CREATE OR REPLACE VIEW ad_repo_view AS
SELECT
    r.id, r.partner_id, r.campaign_name, r.matched_station_id, r.matched_area,
    r.ad_type_a, r.ad_type_b, r.image_a_url, r.image_b_url, r.landing_url,
    r.display_start_date, r.display_end_date, r.is_active, r.priority,
    r.description, r.additional_data as ad_additional_data, r.created_at, r.updated_at,
    p.partner_name, p.address, p.phone, p.contact_name, p.business_type, p.business_level,
    p.staff_name_1, p.staff_name_2, p.staff_name_3, p.additional_data as partner_additional_data,
    CURRENT_DATE BETWEEN r.display_start_date AND r.display_end_date as is_currently_active,
    r.display_end_date - CURRENT_DATE as days_remaining,
    CURRENT_DATE - r.display_start_date as days_since_start
FROM ad_repo r
LEFT JOIN ad_partners p ON r.partner_id = p.partner_id
ORDER BY r.priority DESC, r.created_at DESC;

CREATE OR REPLACE VIEW ad_repo_active_view AS
SELECT * FROM ad_repo_view
WHERE is_active = true AND CURRENT_DATE BETWEEN display_start_date AND display_end_date
ORDER BY priority DESC, created_at DESC;

-- 5. 광고 조회 함수
CREATE OR REPLACE FUNCTION get_active_ads_for_station(p_station_id TEXT, p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    id UUID, partner_id TEXT, partner_name TEXT, campaign_name TEXT,
    matched_station_id TEXT, matched_area TEXT, ad_type_a TEXT, ad_type_b TEXT,
    image_a_url TEXT, image_b_url TEXT, landing_url TEXT, priority INTEGER,
    business_type TEXT, business_level INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT r.id, r.partner_id, r.partner_name, r.campaign_name, r.matched_station_id,
           r.matched_area, r.ad_type_a, r.ad_type_b, r.image_a_url, r.image_b_url,
           r.landing_url, r.priority, r.business_type, r.business_level
    FROM ad_repo_view r
    WHERE r.is_active = true
      AND p_date BETWEEN r.display_start_date AND r.display_end_date
      AND (r.matched_station_id = p_station_id OR r.matched_station_id IS NULL)
    ORDER BY r.priority DESC, r.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_active_ads_for_area(p_area TEXT, p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    id UUID, partner_id TEXT, partner_name TEXT, campaign_name TEXT,
    matched_station_id TEXT, matched_area TEXT, ad_type_a TEXT, ad_type_b TEXT,
    image_a_url TEXT, image_b_url TEXT, landing_url TEXT, priority INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT r.id, r.partner_id, r.partner_name, r.campaign_name, r.matched_station_id,
           r.matched_area, r.ad_type_a, r.ad_type_b, r.image_a_url, r.image_b_url,
           r.landing_url, r.priority
    FROM ad_repo_view r
    WHERE r.is_active = true
      AND p_date BETWEEN r.display_start_date AND r.display_end_date
      AND (r.matched_area = p_area OR r.matched_area IS NULL)
    ORDER BY r.priority DESC, r.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 6. 제휴사 비밀번호 필드 추가
ALTER TABLE ad_partners ADD COLUMN IF NOT EXISTS password TEXT;

UPDATE ad_partners SET password = partner_id WHERE password IS NULL;

CREATE TABLE IF NOT EXISTS ad_partner_password_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id TEXT NOT NULL REFERENCES ad_partners(partner_id) ON DELETE CASCADE,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    changed_by TEXT
);

ALTER TABLE ad_partner_password_history DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_password_history_partner ON ad_partner_password_history(partner_id);
CREATE INDEX IF NOT EXISTS idx_password_history_date ON ad_partner_password_history(changed_at DESC);
