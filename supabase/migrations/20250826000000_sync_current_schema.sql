-- Sync current schema with existing database structure
-- This migration recreates the current database schema to sync with local development

-- 1. Create marine_observations table
CREATE TABLE IF NOT EXISTS public.marine_observations (
    id SERIAL PRIMARY KEY,
    created_at timestamptz DEFAULT timezone('utc', now()),
    observation_type text,
    station_id text,
    station_name text,
    observation_time_kst timestamptz,
    observation_time_utc timestamptz,
    longitude numeric,
    latitude numeric,
    significant_wave_height numeric,
    wind_direction numeric,
    wind_speed numeric,
    gust_wind_speed numeric,
    water_temperature numeric,
    air_temperature numeric,
    pressure numeric,
    humidity numeric,
    location_code text,
    tide_name text,
    tide_latitude numeric,
    tide_longitude numeric
);

-- 2. Create weather_forecasts table  
CREATE TABLE IF NOT EXISTS public.weather_forecasts (
    nx integer,
    ny integer,
    한글지역명 text,
    fcst_datetime_kr timestamptz,
    updated_at_kr timestamptz,
    base_date text,
    base_time text,
    fcst_datetime timestamptz,
    pop numeric,
    pty numeric,
    pcp text,
    reh numeric,
    sno text,
    sky numeric,
    tmp numeric,
    tmn numeric,
    tmx numeric,
    uuu numeric,
    vvv numeric,
    wav numeric,
    vec numeric,
    wsd numeric,
    updated_at timestamptz DEFAULT timezone('utc', now()),
    location_code text,
    CONSTRAINT weather_forecasts_pkey UNIQUE (fcst_datetime, location_code)
);

COMMENT ON TABLE public.weather_forecasts IS '기상청 단기예보 격자 데이터를 저장하는 테이블';

-- 3. Create medium_term_forecasts table
CREATE TABLE IF NOT EXISTS public.medium_term_forecasts (
    id SERIAL PRIMARY KEY,
    reg_id text NOT NULL,
    reg_sp text NOT NULL CHECK (reg_sp IN ('A', 'C', 'I')),
    stn_id text,
    stn text,
    tm_fc timestamptz NOT NULL,
    tm_fc_kr timestamptz,
    tm_ef timestamptz NOT NULL,
    tm_ef_kr timestamptz,
    mod text,
    c text,
    sky text,
    pre text,
    conf text,
    wf text,
    rn_st numeric,
    min_temp numeric,
    max_temp numeric,
    min_temp_l numeric,
    min_temp_h numeric,
    max_temp_l numeric,
    max_temp_h numeric,
    wh_a numeric,
    wh_b numeric,
    forecast_type text NOT NULL,
    reg_name text,
    created_at timestamptz DEFAULT timezone('utc', now()),
    created_at_kr timestamptz,
    updated_at timestamptz DEFAULT timezone('utc', now()),
    updated_at_kr timestamptz,
    CONSTRAINT medium_term_forecasts_unique UNIQUE (reg_id, tm_fc, tm_ef, mod, forecast_type)
);

-- 4. Create tide_data table
CREATE TABLE IF NOT EXISTS public.tide_data (
    obs_date date,
    obs_post_name text,
    location_code text,
    location_name text,
    obs_lon numeric,
    obs_lat numeric,
    lvl1 text,
    lvl2 text,
    lvl3 text,
    lvl4 text,
    updated_at timestamptz DEFAULT timezone('utc', now()),
    updated_at_kr timestamptz,
    id SERIAL PRIMARY KEY,
    date_sun text,
    date_moon text,
    mool_normal text,
    mool7 text,
    mool8 text
);

COMMENT ON TABLE public.tide_data IS 'MongoDB에서 마이그레이션된 조수 데이터 (lvlX 컬럼 포함)';

-- 5. Create tide_weather_region table
CREATE TABLE IF NOT EXISTS public.tide_weather_region (
    code text PRIMARY KEY,
    nx integer,
    ny integer,
    name text
);

COMMENT ON TABLE public.tide_weather_region IS '날씨 예보 및 조수 정보와 연관된 지역 코드, 격자 좌표, 이름 매핑 테이블';

-- 6. Create tide_abs_region table
CREATE TABLE IF NOT EXISTS public.tide_abs_region (
    "Code" text,
    "Name" text,
    "Latitude" numeric,
    "Longitude" numeric,
    "a_지역명(한글)" text,
    "a_STN ID" text,
    "a_위도(LAT)" numeric,
    "a_경도(LON)" numeric,
    "a_제공 정보" text,
    "b_STN ID" text,
    "b_위도(LAT)" numeric,
    "b_경도(LON)" numeric,
    "b_제공 정보" text
);

COMMENT ON TABLE public.tide_abs_region IS '조위 관측소별 가장 가까운 a, b 해양 관측소 정보';

-- 7. Create weather_fetch_logs table
CREATE TABLE IF NOT EXISTS public.weather_fetch_logs (
    id SERIAL PRIMARY KEY,
    created_at timestamptz DEFAULT timezone('utc', now()),
    function_name text,
    status text,
    started_at timestamptz,
    finished_at timestamptz,
    locations_fetched integer,
    records_upserted integer,
    error_message text
);

COMMENT ON TABLE public.weather_fetch_logs IS '함수 실행 상태 및 결과를 기록하는 로그 테이블';

-- 8. Create analysis_results table
CREATE TABLE IF NOT EXISTS public.analysis_results (
    id SERIAL PRIMARY KEY,
    category text,
    name text,
    latitude numeric,
    longitude numeric,
    created_at timestamptz DEFAULT timezone('utc', now())
);

COMMENT ON TABLE public.analysis_results IS 'analyze-data 함수의 분석 결과를 저장하는 전용 테이블';

-- 9. Create keep_alive table
CREATE TABLE IF NOT EXISTS public.keep_alive (
    id SERIAL PRIMARY KEY,
    created_at timestamptz DEFAULT timezone('utc', now())
);

-- 10. Create locations table (if exists)
CREATE TABLE IF NOT EXISTS public.locations (
    code text PRIMARY KEY,
    name text,
    latitude numeric,
    longitude numeric,
    weather_supported boolean DEFAULT false,
    tide_supported boolean DEFAULT false,
    marine_supported boolean DEFAULT false
);

-- 11. Create station_codes table (legacy - not actively used)
CREATE TABLE IF NOT EXISTS public.station_codes (
    code text PRIMARY KEY,
    station_id text,
    station_name text,
    longitude numeric,
    latitude numeric
);

COMMENT ON COLUMN public.station_codes.station_name IS '관측소 이름';
COMMENT ON COLUMN public.station_codes.longitude IS '경도';  
COMMENT ON COLUMN public.station_codes.latitude IS '위도';

-- Row Level Security (RLS) policies can be added here if needed
-- ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_marine_observations_station_id ON public.marine_observations(station_id);
CREATE INDEX IF NOT EXISTS idx_marine_observations_observation_time ON public.marine_observations(observation_time_utc);
CREATE INDEX IF NOT EXISTS idx_weather_forecasts_location_code ON public.weather_forecasts(location_code);
CREATE INDEX IF NOT EXISTS idx_weather_forecasts_fcst_datetime ON public.weather_forecasts(fcst_datetime);
CREATE INDEX IF NOT EXISTS idx_medium_term_forecasts_reg_id ON public.medium_term_forecasts(reg_id);
CREATE INDEX IF NOT EXISTS idx_medium_term_forecasts_tm_fc ON public.medium_term_forecasts(tm_fc);
CREATE INDEX IF NOT EXISTS idx_tide_data_location_code ON public.tide_data(location_code);
CREATE INDEX IF NOT EXISTS idx_tide_data_obs_date ON public.tide_data(obs_date);

-- Grant permissions (adjust as needed)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;