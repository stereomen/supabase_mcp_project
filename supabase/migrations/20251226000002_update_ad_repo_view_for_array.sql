-- 광고 캠페인 다중 관측소 타겟팅: 뷰 재생성
-- 생성일: 2025-12-26
-- 목적: matched_station_id가 TEXT[]로 변경됨에 따라 뷰 재생성 (타입 일관성 확보)

-- 기존 뷰 삭제 (CASCADE로 의존 객체도 함께 삭제)
DROP VIEW IF EXISTS ad_repo_active_view CASCADE;
DROP VIEW IF EXISTS ad_repo_view CASCADE;

-- ad_repo_view 재생성
CREATE OR REPLACE VIEW ad_repo_view AS
SELECT
    -- ad_repo 정보
    r.id,
    r.partner_id,
    r.campaign_name,
    r.matched_station_id,  -- 이제 TEXT[] 타입
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

COMMENT ON VIEW ad_repo_view IS '광고 저장소와 제휴사 정보를 조인한 통합 뷰 (matched_station_id는 TEXT[] 배열)';

-- 현재 활성 광고만 보는 뷰
CREATE OR REPLACE VIEW ad_repo_active_view AS
SELECT *
FROM ad_repo_view
WHERE is_active = true
  AND CURRENT_DATE BETWEEN display_start_date AND display_end_date
ORDER BY priority DESC, created_at DESC;

COMMENT ON VIEW ad_repo_active_view IS '현재 노출 기간 중인 활성 광고만 조회';

-- 뷰 검증 쿼리 (수동 실행용)
-- SELECT viewname, definition FROM pg_views WHERE viewname LIKE 'ad_repo%';
