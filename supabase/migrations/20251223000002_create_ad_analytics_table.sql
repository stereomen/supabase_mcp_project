-- 광고 분석 테이블 생성
-- 생성일: 2025-12-23
-- 목적: 광고 조회수, 클릭수 등 성과 추적

CREATE TABLE IF NOT EXISTS ad_analytics (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_repo_id UUID NOT NULL REFERENCES ad_repo(id) ON DELETE CASCADE,

    -- 이벤트 정보
    event_type TEXT NOT NULL,  -- 'impression', 'click'
    station_id TEXT,           -- 어느 관측소에서 발생했는지

    -- 타임스탬프
    event_timestamp TIMESTAMPTZ DEFAULT NOW(),
    event_date DATE GENERATED ALWAYS AS (event_timestamp::DATE) STORED,  -- 날짜별 집계용

    -- 사용자 정보 (선택적)
    user_agent TEXT,
    ip_address TEXT,

    -- 추가 데이터
    additional_data JSONB,

    -- 제약조건
    CONSTRAINT valid_event_type CHECK (event_type IN ('impression', 'click'))
);

-- 인덱스 생성 (빠른 분석 쿼리를 위함)
CREATE INDEX idx_ad_analytics_repo_id ON ad_analytics(ad_repo_id);
CREATE INDEX idx_ad_analytics_event_type ON ad_analytics(event_type);
CREATE INDEX idx_ad_analytics_date ON ad_analytics(event_date);
CREATE INDEX idx_ad_analytics_repo_date ON ad_analytics(ad_repo_id, event_date);
CREATE INDEX idx_ad_analytics_timestamp ON ad_analytics(event_timestamp DESC);

-- 복합 인덱스: 캠페인별 이벤트 타입 분석
CREATE INDEX idx_ad_analytics_repo_event_date ON ad_analytics(ad_repo_id, event_type, event_date);

-- RLS 비활성화 (Edge Function에서 Service Role Key 사용)
ALTER TABLE ad_analytics DISABLE ROW LEVEL SECURITY;

-- 테이블 설명
COMMENT ON TABLE ad_analytics IS '광고 성과 추적 테이블 (조회수, 클릭수)';
COMMENT ON COLUMN ad_analytics.event_type IS '이벤트 타입: impression(노출), click(클릭)';
COMMENT ON COLUMN ad_analytics.event_date IS '날짜별 집계를 위한 자동 생성 컬럼';

-- 성과 요약 뷰 생성 (일별 집계)
CREATE OR REPLACE VIEW ad_analytics_daily_summary AS
SELECT
    ad_repo_id,
    event_date,
    COUNT(*) FILTER (WHERE event_type = 'impression') as impressions,
    COUNT(*) FILTER (WHERE event_type = 'click') as clicks,
    CASE
        WHEN COUNT(*) FILTER (WHERE event_type = 'impression') > 0
        THEN ROUND(
            (COUNT(*) FILTER (WHERE event_type = 'click')::NUMERIC /
             COUNT(*) FILTER (WHERE event_type = 'impression')::NUMERIC) * 100,
            2
        )
        ELSE 0
    END as ctr_percentage
FROM ad_analytics
GROUP BY ad_repo_id, event_date
ORDER BY event_date DESC, ad_repo_id;

COMMENT ON VIEW ad_analytics_daily_summary IS '일별 광고 성과 요약 (노출수, 클릭수, CTR)';

-- 캠페인별 전체 성과 뷰
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
        THEN ROUND(
            (COUNT(*) FILTER (WHERE a.event_type = 'click')::NUMERIC /
             COUNT(*) FILTER (WHERE a.event_type = 'impression')::NUMERIC) * 100,
            2
        )
        ELSE 0
    END as overall_ctr_percentage,
    MIN(a.event_timestamp) as first_event,
    MAX(a.event_timestamp) as last_event
FROM ad_analytics a
JOIN ad_repo r ON a.ad_repo_id = r.id
LEFT JOIN ad_partners p ON r.partner_id = p.partner_id
GROUP BY a.ad_repo_id, r.campaign_name, r.partner_id, p.partner_name
ORDER BY total_impressions DESC;

COMMENT ON VIEW ad_analytics_campaign_summary IS '캠페인별 전체 성과 요약';
