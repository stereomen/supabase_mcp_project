-- 광고 캠페인 다중 관측소 타겟팅: RPC 함수를 배열 검색으로 업데이트
-- 생성일: 2025-12-26
-- 목적: matched_station_id가 TEXT[]로 변경됨에 따라 RPC 함수 로직 업데이트

-- 기존 함수 삭제 (반환 타입 변경을 위해 필요)
DROP FUNCTION IF EXISTS get_active_ads_for_station(TEXT, DATE);
DROP FUNCTION IF EXISTS get_active_ads_for_area(TEXT, DATE);

-- 관측소별 활성 광고 조회 함수 (배열 포함 검사 지원)
CREATE OR REPLACE FUNCTION get_active_ads_for_station(
    p_station_id TEXT,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    id UUID,
    partner_id TEXT,
    partner_name TEXT,
    campaign_name TEXT,
    matched_station_id TEXT[],  -- TEXT에서 TEXT[]로 변경
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
          p_station_id = ANY(r.matched_station_id)           -- 배열 포함 검사
          OR r.matched_station_id IS NULL                    -- NULL = 전체 관측소
          OR array_length(r.matched_station_id, 1) IS NULL   -- 빈 배열 = 전체 관측소
      )
    ORDER BY r.priority DESC, r.created_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_active_ads_for_station IS '특정 관측소와 날짜에 대한 모든 활성 광고 조회 (배열 포함 검사, 우선순위 순 정렬)';

-- 해역별 활성 광고 조회 함수 (반환 타입만 업데이트)
CREATE OR REPLACE FUNCTION get_active_ads_for_area(
    p_area TEXT,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    id UUID,
    partner_id TEXT,
    partner_name TEXT,
    campaign_name TEXT,
    matched_station_id TEXT[],  -- TEXT에서 TEXT[]로 변경
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
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_active_ads_for_area IS '특정 해역과 날짜에 대한 모든 활성 광고 조회 (우선순위 순 정렬)';

-- 함수 검증 쿼리 (수동 실행용)
-- SELECT proname, pg_get_function_result(oid) FROM pg_proc WHERE proname LIKE 'get_active_ads_%';
