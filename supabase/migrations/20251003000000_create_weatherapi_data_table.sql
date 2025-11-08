-- Create table for WeatherAPI.com data storage
-- This table will store current weather and forecast data from weatherapi.com

CREATE TABLE IF NOT EXISTS public.weatherapi_data (
    id SERIAL PRIMARY KEY,
    created_at timestamptz DEFAULT timezone('utc', now()),
    updated_at timestamptz DEFAULT timezone('utc', now()),

    -- Location information
    location_key text NOT NULL, -- API location key/identifier
    location_name text,
    location_region text,
    location_country text,
    latitude numeric,
    longitude numeric,
    timezone_id text,

    -- Time information
    observation_time_utc timestamptz NOT NULL,
    observation_time_local timestamptz,

    -- Current weather data
    condition_text text,
    condition_icon text,
    condition_code integer,

    -- Temperature data
    temp_c numeric,
    temp_f numeric,
    feelslike_c numeric,
    feelslike_f numeric,

    -- Wind data
    wind_mph numeric,
    wind_kph numeric,
    wind_degree integer,
    wind_direction text,
    gust_mph numeric,
    gust_kph numeric,

    -- Atmospheric data
    pressure_mb numeric,
    pressure_in numeric,
    humidity integer,
    visibility_km numeric,
    visibility_miles numeric,

    -- Weather conditions
    cloud integer, -- cloud coverage percentage
    uv numeric,
    precip_mm numeric,
    precip_in numeric,

    -- Air quality (if available)
    air_quality_co numeric,
    air_quality_no2 numeric,
    air_quality_o3 numeric,
    air_quality_so2 numeric,
    air_quality_pm2_5 numeric,
    air_quality_pm10 numeric,
    air_quality_us_epa_index integer,
    air_quality_gb_defra_index integer,

    -- Data type indicator
    data_type text NOT NULL CHECK (data_type IN ('current', 'forecast', 'history')),

    -- For forecast data
    forecast_date date,
    forecast_time time,
    is_day boolean,

    -- Forecast specific fields
    maxtemp_c numeric,
    maxtemp_f numeric,
    mintemp_c numeric,
    mintemp_f numeric,
    avgtemp_c numeric,
    avgtemp_f numeric,
    maxwind_mph numeric,
    maxwind_kph numeric,
    totalprecip_mm numeric,
    totalprecip_in numeric,
    totalsnow_cm numeric,
    avgvis_km numeric,
    avgvis_miles numeric,
    avghumidity integer,
    daily_will_it_rain integer,
    daily_chance_of_rain integer,
    daily_will_it_snow integer,
    daily_chance_of_snow integer,

    CONSTRAINT weatherapi_data_unique UNIQUE (location_key, observation_time_utc, data_type, forecast_date, forecast_time)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_weatherapi_data_location_key ON public.weatherapi_data (location_key);
CREATE INDEX IF NOT EXISTS idx_weatherapi_data_observation_time ON public.weatherapi_data (observation_time_utc);
CREATE INDEX IF NOT EXISTS idx_weatherapi_data_data_type ON public.weatherapi_data (data_type);
CREATE INDEX IF NOT EXISTS idx_weatherapi_data_forecast_date ON public.weatherapi_data (forecast_date);
CREATE INDEX IF NOT EXISTS idx_weatherapi_data_created_at ON public.weatherapi_data (created_at);

-- Add comments for documentation
COMMENT ON TABLE public.weatherapi_data IS 'WeatherAPI.com 날씨 데이터를 저장하는 테이블 - 현재 날씨, 예보, 과거 데이터 포함';
COMMENT ON COLUMN public.weatherapi_data.location_key IS 'WeatherAPI.com의 위치 식별자 (예: Seoul, 37.5665,126.9780)';
COMMENT ON COLUMN public.weatherapi_data.data_type IS '데이터 유형: current(현재), forecast(예보), history(과거)';
COMMENT ON COLUMN public.weatherapi_data.observation_time_utc IS 'UTC 기준 관측/예보 시간';
COMMENT ON COLUMN public.weatherapi_data.observation_time_local IS '현지 시간 기준 관측/예보 시간';

-- Create a table for storing WeatherAPI.com collection logs
CREATE TABLE IF NOT EXISTS public.weatherapi_collection_logs (
    id SERIAL PRIMARY KEY,
    started_at timestamptz NOT NULL,
    finished_at timestamptz,
    status text NOT NULL CHECK (status IN ('success', 'error', 'partial')),
    records_collected integer DEFAULT 0,
    locations_processed integer DEFAULT 0,
    error_message text,
    function_name text DEFAULT 'fetch-weatherapi-data',
    created_at timestamptz DEFAULT timezone('utc', now())
);

COMMENT ON TABLE public.weatherapi_collection_logs IS 'WeatherAPI.com 데이터 수집 로그';