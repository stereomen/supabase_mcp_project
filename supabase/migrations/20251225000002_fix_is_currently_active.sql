-- ad_repo_view의 is_currently_active 계산 로직 수정
-- 생성일: 2025-12-25
-- 목적: is_active 상태를 고려하여 실제 노출 여부 정확하게 표시

CREATE OR REPLACE VIEW ad_repo_view AS
SELECT
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
    r.created_at,
    r.updated_at,

    -- 제휴사 정보 (실제 존재하는 컬럼만)
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

    -- 계산 필드 (is_active도 함께 체크)
    (r.is_active = true AND CURRENT_DATE BETWEEN r.display_start_date AND r.display_end_date) as is_currently_active,
    r.display_end_date - CURRENT_DATE as days_remaining,
    CURRENT_DATE - r.display_start_date as days_since_start

FROM ad_repo r
LEFT JOIN ad_partners p ON r.partner_id = p.partner_id;

COMMENT ON VIEW ad_repo_view IS '광고 캠페인과 제휴사 정보를 결합한 뷰 (is_currently_active는 활성 상태와 날짜 모두 고려)';
