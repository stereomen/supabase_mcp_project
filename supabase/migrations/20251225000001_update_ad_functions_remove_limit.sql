-- 광고 함수 업데이트: LIMIT 제거하여 모든 활성 광고 반환
-- 생성일: 2025-12-25
-- 목적: 클라이언트에서 우선순위 기준으로 노출 순서를 결정하도록 모든 광고 전송

-- 관측소별 활성 광고 조회 함수
CREATE OR REPLACE FUNCTION get_active_ads_for_station(
    p_station_id TEXT,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    id UUID,
    partner_id TEXT,
    partner_name TEXT,
    campaign_name TEXT,
    matched_station_id TEXT,
    matched_area TEXT,
    ad_type_a TEXT,
    ad_type_b TEXT,
    image_a_url TEXT,
    image_b_url TEXT,
    landing_url TEXT,
    priority INTEGER,
    business_type TEXT,
    business_level INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id,
        r.partner_id,
        r.partner_name,
        r.campaign_name,
        r.matched_station_id,
        r.matched_area,
        r.ad_type_a,
        r.ad_type_b,
        r.image_a_url,
        r.image_b_url,
        r.landing_url,
        r.priority,
        r.business_type,
        r.business_level
    FROM ad_repo_view r
    WHERE r.is_active = true
      AND p_date BETWEEN r.display_start_date AND r.display_end_date
      AND (
          r.matched_station_id = p_station_id
          OR r.matched_station_id IS NULL  -- NULL이면 모든 관측소 대상
      )
    ORDER BY r.priority DESC, r.created_at DESC;
    -- LIMIT 제거: 모든 활성 광고를 반환하여 클라이언트에서 우선순위 기준으로 노출 순서 결정
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_active_ads_for_station IS '특정 관측소와 날짜에 대한 모든 활성 광고 조회 (우선순위 순 정렬)';

-- 해역별 활성 광고 조회 함수
CREATE OR REPLACE FUNCTION get_active_ads_for_area(
    p_area TEXT,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    id UUID,
    partner_id TEXT,
    partner_name TEXT,
    campaign_name TEXT,
    matched_station_id TEXT,
    matched_area TEXT,
    ad_type_a TEXT,
    ad_type_b TEXT,
    image_a_url TEXT,
    image_b_url TEXT,
    landing_url TEXT,
    priority INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id,
        r.partner_id,
        r.partner_name,
        r.campaign_name,
        r.matched_station_id,
        r.matched_area,
        r.ad_type_a,
        r.ad_type_b,
        r.image_a_url,
        r.image_b_url,
        r.landing_url,
        r.priority
    FROM ad_repo_view r
    WHERE r.is_active = true
      AND p_date BETWEEN r.display_start_date AND r.display_end_date
      AND (
          r.matched_area = p_area
          OR r.matched_area IS NULL  -- NULL이면 모든 해역 대상
      )
    ORDER BY r.priority DESC, r.created_at DESC;
    -- LIMIT 제거: 모든 활성 광고를 반환
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_active_ads_for_area IS '특정 해역과 날짜에 대한 모든 활성 광고 조회 (우선순위 순 정렬)';
