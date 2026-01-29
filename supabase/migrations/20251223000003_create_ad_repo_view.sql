-- 광고 저장소 뷰 생성
-- 생성일: 2025-12-23
-- 목적: ad_repo와 ad_partners를 조인하여 완전한 광고 정보 제공

CREATE OR REPLACE VIEW ad_repo_view AS
SELECT
    -- ad_repo 정보
    r.id,
    r.partner_id,
    r.campaign_name,
    r.matched_station_id,
    r.matched_area,
    r.ad_type_a,
    r.ad_type_b,
    r.image_a_url,
    r.image_b_url,
    r.landing_url,
    r.display_start_date,
    r.display_end_date,
    r.is_active,
    r.priority,
    r.description,
    r.additional_data as ad_additional_data,
    r.created_at,
    r.updated_at,

    -- ad_partners 정보
    p.partner_name,
    p.address,
    p.phone,
    p.contact_name,
    p.business_type,
    p.business_level,
    p.staff_name_1,
    p.staff_name_2,
    p.staff_name_3,
    p.additional_data as partner_additional_data,

    -- 계산 필드
    CURRENT_DATE BETWEEN r.display_start_date AND r.display_end_date as is_currently_active,
    r.display_end_date - CURRENT_DATE as days_remaining,
    CURRENT_DATE - r.display_start_date as days_since_start

FROM ad_repo r
LEFT JOIN ad_partners p ON r.partner_id = p.partner_id
ORDER BY r.priority DESC, r.created_at DESC;

COMMENT ON VIEW ad_repo_view IS '광고 저장소와 제휴사 정보를 조인한 통합 뷰';

-- 현재 활성 광고만 보는 뷰
CREATE OR REPLACE VIEW ad_repo_active_view AS
SELECT *
FROM ad_repo_view
WHERE is_active = true
  AND CURRENT_DATE BETWEEN display_start_date AND display_end_date
ORDER BY priority DESC, created_at DESC;

COMMENT ON VIEW ad_repo_active_view IS '현재 노출 기간 중인 활성 광고만 조회';

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
