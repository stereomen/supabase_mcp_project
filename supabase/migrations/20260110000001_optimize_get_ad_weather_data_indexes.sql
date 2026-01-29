-- Optimize indexes for get-ad-weather-data function queries
-- This migration adds composite indexes to improve query performance

-- 1. weather_forecasts: location_code + fcst_datetime_kr 범위 쿼리 최적화
-- Query: WHERE location_code = X AND fcst_datetime_kr >= Y AND fcst_datetime_kr < Z
CREATE INDEX IF NOT EXISTS idx_weather_forecasts_location_datetime_kr
  ON public.weather_forecasts(location_code, fcst_datetime_kr);

-- 2. tide_data: location_code + obs_date 범위 쿼리 최적화
-- Query: WHERE location_code = X AND obs_date >= Y AND obs_date <= Z
CREATE INDEX IF NOT EXISTS idx_tide_data_location_obs_date
  ON public.tide_data(location_code, obs_date);

-- 3. medium_term_forecasts: tm_ef_kr 범위 쿼리 최적화
-- 기존: (location_code, forecast_type, tm_ef) 인덱스 있음
-- 추가: tm_ef_kr로 WHERE 절 필터링하는 쿼리를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_medium_term_forecasts_location_type_tm_ef_kr
  ON public.medium_term_forecasts(location_code, forecast_type, tm_ef_kr);

-- tm_ef_kr 단독 인덱스 (범위 쿼리용)
CREATE INDEX IF NOT EXISTS idx_medium_term_forecasts_tm_ef_kr
  ON public.medium_term_forecasts(tm_ef_kr);

-- 4. openweathermap_data: location_code + forecast_date + forecast_time 정렬 최적화
-- Query: WHERE location_code = X AND forecast_date >= Y AND forecast_date <= Z
--        ORDER BY forecast_date, forecast_time
-- 기존 복합 인덱스가 있지만 ORDER BY 최적화를 위해 forecast_time까지 포함
CREATE INDEX IF NOT EXISTS idx_openweathermap_location_forecast_datetime
  ON public.openweathermap_data(location_code, forecast_date, forecast_time);

-- 5. tide_abs_region: Code 컬럼 조회 최적화
-- Query: WHERE Code = locationCode
CREATE INDEX IF NOT EXISTS idx_tide_abs_region_code
  ON public.tide_abs_region("Code");

-- Performance notes:
-- 1. weather_forecasts: 복합 인덱스로 범위 검색 + 정렬 한 번에 처리
-- 2. tide_data: 복합 인덱스로 location 필터 + 날짜 범위 검색 최적화
-- 3. medium_term_forecasts: WHERE tm_ef_kr + ORDER BY tm_ef 패턴 최적화
-- 4. openweathermap_data: 날짜/시간 순 정렬까지 인덱스로 처리
-- 5. tide_abs_region: station_id 조회를 위한 Code 인덱스
