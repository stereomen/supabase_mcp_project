-- Create abs_fetch_log table for tracking KMA API data availability by station
-- 기상청 API 호출 시 지점별 데이터 수집 현황을 추적하는 테이블

CREATE TABLE IF NOT EXISTS abs_fetch_log (
    id BIGSERIAL PRIMARY KEY,
    request_time TIMESTAMPTZ NOT NULL,                    -- API 요청 시간 (UTC)
    observation_time_kst TEXT,                            -- 관측 시간 (KST, YYYYMMDDHHMI 형식)
    station_id INTEGER NOT NULL,                          -- 지점 ID
    station_name TEXT,                                    -- 지점명
    observation_type TEXT,                                -- 관측 타입 (BUOY, TW, AWS, LIGHTHOUSE 등)
    longitude DOUBLE PRECISION,                           -- 경도
    latitude DOUBLE PRECISION,                            -- 위도

    -- Data availability flags (각 데이터 필드의 존재 여부)
    significant_wave_height_available BOOLEAN DEFAULT FALSE,  -- 파고 (wh)
    wind_direction_available BOOLEAN DEFAULT FALSE,           -- 풍향 (wd)
    wind_speed_available BOOLEAN DEFAULT FALSE,               -- 풍속 (ws)
    gust_wind_speed_available BOOLEAN DEFAULT FALSE,          -- 돌풍 (wsGst)
    water_temperature_available BOOLEAN DEFAULT FALSE,        -- 수온 (tw)
    air_temperature_available BOOLEAN DEFAULT FALSE,          -- 기온 (ta)
    pressure_available BOOLEAN DEFAULT FALSE,                 -- 기압 (pa)
    humidity_available BOOLEAN DEFAULT FALSE,                 -- 습도 (hm)

    -- Metadata
    raw_line TEXT,                                        -- 원본 데이터 라인 (디버깅용)
    created_at TIMESTAMPTZ DEFAULT NOW(),                 -- 레코드 생성 시간

    -- Indexing for efficient queries
    CONSTRAINT abs_fetch_log_unique_entry UNIQUE (station_id, observation_time_kst, request_time)
);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_abs_fetch_log_request_time ON abs_fetch_log(request_time DESC);
CREATE INDEX IF NOT EXISTS idx_abs_fetch_log_station_id ON abs_fetch_log(station_id);
CREATE INDEX IF NOT EXISTS idx_abs_fetch_log_observation_type ON abs_fetch_log(observation_type);
CREATE INDEX IF NOT EXISTS idx_abs_fetch_log_station_name ON abs_fetch_log(station_name);
CREATE INDEX IF NOT EXISTS idx_abs_fetch_log_observation_time_kst ON abs_fetch_log(observation_time_kst);

-- Add comments for documentation
COMMENT ON TABLE abs_fetch_log IS '기상청 API 호출 시 지점별 데이터 수집 현황 추적 테이블';
COMMENT ON COLUMN abs_fetch_log.request_time IS 'API 요청 시간 (UTC)';
COMMENT ON COLUMN abs_fetch_log.observation_time_kst IS '관측 시간 (KST, YYYYMMDDHHMI 형식)';
COMMENT ON COLUMN abs_fetch_log.station_id IS '관측 지점 ID';
COMMENT ON COLUMN abs_fetch_log.station_name IS '관측 지점명';
COMMENT ON COLUMN abs_fetch_log.observation_type IS '관측 타입 (BUOY, TW, AWS, LIGHTHOUSE 등)';
COMMENT ON COLUMN abs_fetch_log.significant_wave_height_available IS '파고 데이터 존재 여부';
COMMENT ON COLUMN abs_fetch_log.water_temperature_available IS '수온 데이터 존재 여부';
COMMENT ON COLUMN abs_fetch_log.air_temperature_available IS '기온 데이터 존재 여부';

-- Enable RLS (Row Level Security)
ALTER TABLE abs_fetch_log ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anonymous read access (for Netlify admin page)
CREATE POLICY "Allow anonymous read access to abs_fetch_log"
    ON abs_fetch_log
    FOR SELECT
    USING (true);

-- Create policy to allow service role full access
CREATE POLICY "Allow service role full access to abs_fetch_log"
    ON abs_fetch_log
    FOR ALL
    USING (auth.role() = 'service_role');
