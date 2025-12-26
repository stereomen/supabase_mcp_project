-- 광고 캠페인 다중 관측소 타겟팅: matched_station_id를 TEXT[]로 변환
-- 생성일: 2025-12-26
-- 목적: 하나의 광고 캠페인이 여러 관측소를 타겟팅할 수 있도록 스키마 변경

-- 1. 기존 인덱스 삭제
DROP INDEX IF EXISTS idx_ad_repo_station_active;
DROP INDEX IF EXISTS idx_ad_repo_station_date_active;

-- 2. 임시 배열 컬럼 추가
ALTER TABLE ad_repo ADD COLUMN matched_station_ids TEXT[];

-- 3. 기존 데이터 마이그레이션
-- NULL이 아니고 빈 문자열이 아닌 값만 단일 원소 배열로 변환
UPDATE ad_repo
SET matched_station_ids = ARRAY[matched_station_id]
WHERE matched_station_id IS NOT NULL AND matched_station_id != '';

-- NULL 값은 그대로 NULL 유지 (전체 관측소 대상을 의미)

-- 4. 기존 컬럼 삭제
ALTER TABLE ad_repo DROP COLUMN matched_station_id;

-- 5. 임시 컬럼 이름을 원래 이름으로 변경
ALTER TABLE ad_repo RENAME COLUMN matched_station_ids TO matched_station_id;

-- 6. GIN 인덱스 생성 (배열 검색 최적화)
-- GIN (Generalized Inverted Index)은 = ANY(array) 연산에 최적화됨
CREATE INDEX idx_ad_repo_station_active ON ad_repo USING GIN (matched_station_id)
    WHERE is_active = true;

-- 7. 복합 인덱스 재생성 (날짜 범위 검색용)
-- 배열 컬럼은 GIN 인덱스만 지원하므로 날짜 범위용 B-tree 인덱스는 별도 생성
CREATE INDEX idx_ad_repo_display_period_active ON ad_repo(display_start_date, display_end_date)
    WHERE is_active = true;

-- 8. 코멘트 업데이트
COMMENT ON COLUMN ad_repo.matched_station_id IS '관측소 ID 배열 (예: {DT_0001, DT_0005}) - NULL이면 전체 관측소 대상, 빈 배열도 전체로 처리';

-- 마이그레이션 검증 쿼리 (수동 실행용)
-- SELECT column_name, data_type, udt_name FROM information_schema.columns
-- WHERE table_name = 'ad_repo' AND column_name = 'matched_station_id';
-- 예상 결과: data_type = 'ARRAY', udt_name = '_text'
