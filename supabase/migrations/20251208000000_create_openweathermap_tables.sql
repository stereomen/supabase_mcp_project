-- Create OpenWeatherMap data table
-- OpenWeatherMap API로부터 수집한 날씨 데이터 저장

CREATE TABLE IF NOT EXISTS public.openweathermap_data (
    id SERIAL PRIMARY KEY,

    -- 위치 정보
    location_code TEXT NOT NULL,
    location_name TEXT,
    location_country TEXT,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    timezone_offset INTEGER, -- UTC 오프셋 (초)

    -- 관측 시간
    observation_time_utc TIMESTAMPTZ NOT NULL,
    observation_time_local TIMESTAMPTZ,

    -- 날씨 상태
    weather_id INTEGER, -- OpenWeatherMap weather condition id
    weather_main TEXT, -- Weather parameter (Rain, Snow, Clouds 등)
    weather_description TEXT, -- 날씨 상태 설명 (한글)
    weather_icon TEXT, -- 날씨 아이콘 코드

    -- 온도 (°C)
    temp NUMERIC,
    feels_like NUMERIC, -- 체감 온도
    temp_min NUMERIC,
    temp_max NUMERIC,

    -- 기압 및 습도
    pressure INTEGER, -- hPa
    humidity INTEGER, -- %
    sea_level INTEGER, -- hPa (해면 기압)
    ground_level INTEGER, -- hPa (지면 기압)

    -- 바람
    wind_speed NUMERIC, -- m/s
    wind_deg INTEGER, -- 풍향 (도)
    wind_gust NUMERIC, -- m/s (돌풍)

    -- 구름 및 가시거리
    clouds INTEGER, -- % (구름량)
    visibility INTEGER, -- m (가시거리)

    -- 강수/강설
    rain_1h NUMERIC, -- mm (1시간 강우량)
    rain_3h NUMERIC, -- mm (3시간 강우량)
    snow_1h NUMERIC, -- mm (1시간 적설량)
    snow_3h NUMERIC, -- mm (3시간 적설량)
    pop NUMERIC, -- % (강수 확률, 예보 데이터만)

    -- 일출/일몰 (현재 날씨 데이터만)
    sunrise TIMESTAMPTZ,
    sunset TIMESTAMPTZ,

    -- 메타데이터
    data_type TEXT NOT NULL CHECK (data_type IN ('current', 'forecast')),
    forecast_date DATE, -- 예보 날짜 (예보 데이터만)
    forecast_time TIME, -- 예보 시각 (예보 데이터만)
    api_source TEXT DEFAULT 'openweathermap',

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()),

    -- 중복 방지 제약조건
    CONSTRAINT openweathermap_data_unique
    UNIQUE (location_code, observation_time_utc, data_type, forecast_date, forecast_time)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_openweathermap_location_code
ON public.openweathermap_data(location_code);

CREATE INDEX IF NOT EXISTS idx_openweathermap_observation_time
ON public.openweathermap_data(observation_time_utc DESC);

CREATE INDEX IF NOT EXISTS idx_openweathermap_data_type
ON public.openweathermap_data(data_type);

CREATE INDEX IF NOT EXISTS idx_openweathermap_forecast_date
ON public.openweathermap_data(forecast_date)
WHERE forecast_date IS NOT NULL;

-- 복합 인덱스 (일반적인 쿼리 패턴)
CREATE INDEX IF NOT EXISTS idx_openweathermap_location_time_type
ON public.openweathermap_data(location_code, observation_time_utc DESC, data_type);

-- 테이블 코멘트
COMMENT ON TABLE public.openweathermap_data
IS 'OpenWeatherMap API로부터 수집한 날씨 데이터 (현재 날씨 + 5일 예보)';

COMMENT ON COLUMN public.openweathermap_data.location_code
IS '조위 관측소 코드 (tide_abs_region 테이블 참조)';

COMMENT ON COLUMN public.openweathermap_data.data_type
IS '데이터 유형: current (현재 날씨) 또는 forecast (예보)';

COMMENT ON COLUMN public.openweathermap_data.weather_id
IS 'OpenWeatherMap 날씨 조건 ID (https://openweathermap.org/weather-conditions 참조)';

-- 데이터 수집 로그 테이블
CREATE TABLE IF NOT EXISTS public.openweathermap_collection_logs (
    id SERIAL PRIMARY KEY,
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ,
    status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'error')),
    records_collected INTEGER DEFAULT 0,
    locations_processed INTEGER DEFAULT 0,
    error_message TEXT,
    function_name TEXT DEFAULT 'fetch-openweather-data',
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_openweathermap_logs_started_at
ON public.openweathermap_collection_logs(started_at DESC);

COMMENT ON TABLE public.openweathermap_collection_logs
IS 'OpenWeatherMap 데이터 수집 작업 로그';
