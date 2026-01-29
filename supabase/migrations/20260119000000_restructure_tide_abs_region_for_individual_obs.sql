-- ============================================================================
-- Migration: Restructure tide_abs_region for individual observation types
-- Date: 2026-01-19
-- Description:
--   기존 a/b 구조에서 5개 개별 관측 정보(수온, 파고, 풍향, 풍속, 기온)로 분리
--   각 정보별로 독립적인 해양관측소 지정 가능하도록 구조 변경
-- ============================================================================

BEGIN;

-- Step 1: 새로운 컬럼 추가 (5개 관측 정보별)
-- wt: Water Temperature (수온)
ALTER TABLE public.tide_abs_region
  ADD COLUMN IF NOT EXISTS "wt_STN_ID" text,
  ADD COLUMN IF NOT EXISTS "wt_위도(LAT)" numeric,
  ADD COLUMN IF NOT EXISTS "wt_경도(LON)" numeric,
  ADD COLUMN IF NOT EXISTS "wt_지역명(한글)" text;

-- swh: Significant Wave Height (파고)
ALTER TABLE public.tide_abs_region
  ADD COLUMN IF NOT EXISTS "swh_STN_ID" text,
  ADD COLUMN IF NOT EXISTS "swh_위도(LAT)" numeric,
  ADD COLUMN IF NOT EXISTS "swh_경도(LON)" numeric,
  ADD COLUMN IF NOT EXISTS "swh_지역명(한글)" text;

-- wd: Wind Direction (풍향)
ALTER TABLE public.tide_abs_region
  ADD COLUMN IF NOT EXISTS "wd_STN_ID" text,
  ADD COLUMN IF NOT EXISTS "wd_위도(LAT)" numeric,
  ADD COLUMN IF NOT EXISTS "wd_경도(LON)" numeric,
  ADD COLUMN IF NOT EXISTS "wd_지역명(한글)" text;

-- ws: Wind Speed (풍속)
ALTER TABLE public.tide_abs_region
  ADD COLUMN IF NOT EXISTS "ws_STN_ID" text,
  ADD COLUMN IF NOT EXISTS "ws_위도(LAT)" numeric,
  ADD COLUMN IF NOT EXISTS "ws_경도(LON)" numeric,
  ADD COLUMN IF NOT EXISTS "ws_지역명(한글)" text;

-- at: Air Temperature (기온)
ALTER TABLE public.tide_abs_region
  ADD COLUMN IF NOT EXISTS "at_STN_ID" text,
  ADD COLUMN IF NOT EXISTS "at_위도(LAT)" numeric,
  ADD COLUMN IF NOT EXISTS "at_경도(LON)" numeric,
  ADD COLUMN IF NOT EXISTS "at_지역명(한글)" text;

-- Step 2: 데이터 마이그레이션
-- 기존 a 정보 → wt(수온), swh(파고)로 복사
UPDATE public.tide_abs_region
SET
  "wt_STN_ID" = "a_STN ID",
  "wt_위도(LAT)" = "a_위도(LAT)",
  "wt_경도(LON)" = "a_경도(LON)",
  "wt_지역명(한글)" = "a_지역명(한글)",
  "swh_STN_ID" = "a_STN ID",
  "swh_위도(LAT)" = "a_위도(LAT)",
  "swh_경도(LON)" = "a_경도(LON)",
  "swh_지역명(한글)" = "a_지역명(한글)";

-- 기존 b 정보 → wd(풍향), ws(풍속), at(기온)로 복사
UPDATE public.tide_abs_region
SET
  "wd_STN_ID" = "b_STN ID",
  "wd_위도(LAT)" = "b_위도(LAT)",
  "wd_경도(LON)" = "b_경도(LON)",
  "wd_지역명(한글)" = "b_지역명(한글)",
  "ws_STN_ID" = "b_STN ID",
  "ws_위도(LAT)" = "b_위도(LAT)",
  "ws_경도(LON)" = "b_경도(LON)",
  "ws_지역명(한글)" = "b_지역명(한글)",
  "at_STN_ID" = "b_STN ID",
  "at_위도(LAT)" = "b_위도(LAT)",
  "at_경도(LON)" = "b_경도(LON)",
  "at_지역명(한글)" = "b_지역명(한글)";

-- Step 3: 불필요한 컬럼 삭제
ALTER TABLE public.tide_abs_region
  DROP COLUMN IF EXISTS "a_제공 정보",
  DROP COLUMN IF EXISTS "b_제공 정보";

-- Step 4: 컬럼 코멘트 추가
COMMENT ON COLUMN public.tide_abs_region."wt_STN_ID" IS '수온 관측소 ID';
COMMENT ON COLUMN public.tide_abs_region."wt_위도(LAT)" IS '수온 관측소 위도';
COMMENT ON COLUMN public.tide_abs_region."wt_경도(LON)" IS '수온 관측소 경도';
COMMENT ON COLUMN public.tide_abs_region."wt_지역명(한글)" IS '수온 관측소 한글 지역명';

COMMENT ON COLUMN public.tide_abs_region."swh_STN_ID" IS '파고 관측소 ID';
COMMENT ON COLUMN public.tide_abs_region."swh_위도(LAT)" IS '파고 관측소 위도';
COMMENT ON COLUMN public.tide_abs_region."swh_경도(LON)" IS '파고 관측소 경도';
COMMENT ON COLUMN public.tide_abs_region."swh_지역명(한글)" IS '파고 관측소 한글 지역명';

COMMENT ON COLUMN public.tide_abs_region."wd_STN_ID" IS '풍향 관측소 ID';
COMMENT ON COLUMN public.tide_abs_region."wd_위도(LAT)" IS '풍향 관측소 위도';
COMMENT ON COLUMN public.tide_abs_region."wd_경도(LON)" IS '풍향 관측소 경도';
COMMENT ON COLUMN public.tide_abs_region."wd_지역명(한글)" IS '풍향 관측소 한글 지역명';

COMMENT ON COLUMN public.tide_abs_region."ws_STN_ID" IS '풍속 관측소 ID';
COMMENT ON COLUMN public.tide_abs_region."ws_위도(LAT)" IS '풍속 관측소 위도';
COMMENT ON COLUMN public.tide_abs_region."ws_경도(LON)" IS '풍속 관측소 경도';
COMMENT ON COLUMN public.tide_abs_region."ws_지역명(한글)" IS '풍속 관측소 한글 지역명';

COMMENT ON COLUMN public.tide_abs_region."at_STN_ID" IS '기온 관측소 ID';
COMMENT ON COLUMN public.tide_abs_region."at_위도(LAT)" IS '기온 관측소 위도';
COMMENT ON COLUMN public.tide_abs_region."at_경도(LON)" IS '기온 관측소 경도';
COMMENT ON COLUMN public.tide_abs_region."at_지역명(한글)" IS '기온 관측소 한글 지역명';

COMMIT;

-- 마이그레이션 완료 후 데이터 확인 쿼리 (참고용)
-- SELECT "Code", "Name",
--        "wt_STN_ID", "swh_STN_ID", "wd_STN_ID", "ws_STN_ID", "at_STN_ID"
-- FROM public.tide_abs_region
-- LIMIT 5;
