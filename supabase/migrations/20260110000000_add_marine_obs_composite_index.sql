-- Add composite index for efficient marine observations lookup
-- This enables fast queries with station_id + observation_time_kst filters

-- Create composite index for (station_id, observation_time_kst DESC)
-- This allows PostgreSQL to quickly find the latest observation for a station
CREATE INDEX IF NOT EXISTS idx_marine_observations_station_time_kst
  ON public.marine_observations(station_id, observation_time_kst DESC);

-- Add index on observation_time_kst for queries without station_id filter
CREATE INDEX IF NOT EXISTS idx_marine_observations_observation_time_kst
  ON public.marine_observations(observation_time_kst DESC);

-- Performance notes:
-- With composite index, query plan will:
-- 1. Use idx_marine_observations_station_time_kst
-- 2. Scan in reverse order (DESC)
-- 3. Find first matching row and STOP immediately
-- 4. No full table scan needed!
