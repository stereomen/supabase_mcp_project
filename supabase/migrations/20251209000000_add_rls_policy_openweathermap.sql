-- Disable RLS for all weather-related tables
-- 모든 날씨 관련 테이블의 RLS 비활성화 (공개 데이터이므로 인증 불필요)

-- OpenWeatherMap 테이블
ALTER TABLE IF EXISTS public.openweathermap_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.openweathermap_collection_logs DISABLE ROW LEVEL SECURITY;

-- WeatherAPI 테이블
ALTER TABLE IF EXISTS public.weatherapi_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.weatherapi_collection_logs DISABLE ROW LEVEL SECURITY;

-- 기상청 날씨 예보 테이블
ALTER TABLE IF EXISTS public.weather_forecasts DISABLE ROW LEVEL SECURITY;

-- 중기 예보 테이블
ALTER TABLE IF EXISTS public.medium_term_forecasts DISABLE ROW LEVEL SECURITY;

-- 해양 관측 테이블
ALTER TABLE IF EXISTS public.marine_observations DISABLE ROW LEVEL SECURITY;

-- 조석 데이터 테이블
ALTER TABLE IF EXISTS public.tide_data DISABLE ROW LEVEL SECURITY;

-- 지역 정보 테이블
ALTER TABLE IF EXISTS public.locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tide_abs_region DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tide_weather_region DISABLE ROW LEVEL SECURITY;
