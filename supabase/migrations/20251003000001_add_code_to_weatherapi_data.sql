-- Add code column to weatherapi_data table for integration with tide_abs_region

ALTER TABLE public.weatherapi_data ADD COLUMN IF NOT EXISTS code text;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_weatherapi_data_code ON public.weatherapi_data (code);

-- Add comment for documentation
COMMENT ON COLUMN public.weatherapi_data.code IS 'tide_abs_region 테이블의 Code와 연동되는 지역 코드';