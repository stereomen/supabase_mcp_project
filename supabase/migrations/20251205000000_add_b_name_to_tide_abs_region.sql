ALTER TABLE public.tide_abs_region
ADD COLUMN "b_지역명(한글)" text;

COMMENT ON COLUMN public.tide_abs_region."b_지역명(한글)" IS '가장 가까운 b 관측소의 한글 지역명';
