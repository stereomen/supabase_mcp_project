-- 마이그레이션 상태 확인 및 완료 스크립트
-- Supabase Dashboard SQL Editor에서 실행하세요

-- 1. 현재 ad_repo 테이블 구조 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'ad_repo'
  AND column_name IN ('landing_page_type', 'landing_page_title', 'landing_page_content', 'landing_page_image_url')
ORDER BY column_name;

-- 2. 제약 조건 확인
SELECT conname, contype, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'ad_repo'::regclass
  AND conname = 'check_landing_page_type';

-- 3. 뷰 확인
SELECT table_name, view_definition
FROM information_schema.views
WHERE table_name = 'ad_repo_view';

-- 위 쿼리들을 실행하여 현재 상태를 확인한 후,
-- 아래 마이그레이션을 실행하세요
-- (이미 적용된 부분은 자동으로 건너뜁니다)

-- =============================================================================
-- 마이그레이션 실행
-- =============================================================================

-- ad_repo 테이블에 랜딩 페이지 관련 필드 추가
ALTER TABLE ad_repo
ADD COLUMN IF NOT EXISTS landing_page_type TEXT DEFAULT 'external',
ADD COLUMN IF NOT EXISTS landing_page_title TEXT,
ADD COLUMN IF NOT EXISTS landing_page_content TEXT,
ADD COLUMN IF NOT EXISTS landing_page_image_url TEXT;

-- landing_page_type 제약 조건 추가 (이미 존재하면 건너뛰기)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_landing_page_type'
    ) THEN
        ALTER TABLE ad_repo
        ADD CONSTRAINT check_landing_page_type
        CHECK (landing_page_type IN ('external', 'auto'));
    END IF;
END $$;

-- 컬럼 설명
COMMENT ON COLUMN ad_repo.landing_page_type IS '랜딩 페이지 타입: external(외부 URL), auto(자동 생성)';
COMMENT ON COLUMN ad_repo.landing_page_title IS '자동 생성 랜딩 페이지 제목';
COMMENT ON COLUMN ad_repo.landing_page_content IS '자동 생성 랜딩 페이지 내용';
COMMENT ON COLUMN ad_repo.landing_page_image_url IS '자동 생성 랜딩 페이지 이미지 URL';

-- 기존 데이터 업데이트: landing_url이 있으면 external, 없으면 external
UPDATE ad_repo
SET landing_page_type = CASE
    WHEN landing_url IS NOT NULL AND landing_url != '' THEN 'external'
    ELSE 'external'
END
WHERE landing_page_type IS NULL;

-- ad_repo_view 삭제 후 재생성 (새 필드 포함)
DROP VIEW IF EXISTS ad_repo_view CASCADE;

CREATE VIEW ad_repo_view AS
SELECT
    r.id,
    r.partner_id,
    p.partner_name,
    p.business_type,
    p.business_level,
    r.campaign_name,
    r.matched_station_id,
    r.matched_area,
    r.ad_type_a,
    r.ad_type_b,
    r.image_a_url,
    r.image_b_url,
    r.landing_url,
    r.landing_page_type,
    r.landing_page_title,
    r.landing_page_content,
    r.landing_page_image_url,
    r.priority,
    r.display_start_date,
    r.display_end_date,
    r.is_active,
    r.created_at,
    r.updated_at,
    -- 현재 활성 상태 계산
    CASE
        WHEN r.is_active = true
         AND CURRENT_DATE BETWEEN r.display_start_date AND r.display_end_date
        THEN true
        ELSE false
    END as is_currently_active
FROM ad_repo r
LEFT JOIN ad_partners p ON r.partner_id = p.partner_id
ORDER BY r.created_at DESC;

COMMENT ON VIEW ad_repo_view IS '광고 캠페인 정보와 제휴사 정보를 조인한 뷰 (랜딩 페이지 필드 포함)';

-- 마이그레이션 완료 확인
SELECT 'Migration completed successfully!' as status;
