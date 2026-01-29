-- 광고 조회 함수 생성

-- 1. 관측소별 활성 광고 조회 함수
CREATE OR REPLACE FUNCTION get_active_ads_for_station(p_station_id TEXT, p_date DATE DEFAULT CURRENT_DATE)
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
      AND (r.matched_station_id = p_station_id OR r.matched_station_id IS NULL)
    ORDER BY r.priority DESC, r.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 2. 해역별 활성 광고 조회 함수
CREATE OR REPLACE FUNCTION get_active_ads_for_area(p_area TEXT, p_date DATE DEFAULT CURRENT_DATE)
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
      AND (r.matched_area = p_area OR r.matched_area IS NULL)
    ORDER BY r.priority DESC, r.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 테스트
SELECT '✅ 광고 조회 함수 생성 완료!' as message;

-- 함수 확인
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE 'get_active_ads%'
ORDER BY routine_name;
