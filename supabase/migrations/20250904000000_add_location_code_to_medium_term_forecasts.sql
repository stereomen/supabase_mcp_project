-- Add location_code column to medium_term_forecasts table
-- This optimization allows direct querying by location_code instead of joining with tide_weather_region table

-- Add the new column
ALTER TABLE public.medium_term_forecasts 
ADD COLUMN location_code TEXT;

-- Create index for better query performance
CREATE INDEX idx_medium_term_forecasts_location_code 
ON public.medium_term_forecasts(location_code);

-- Create composite index for the most common query pattern
CREATE INDEX idx_medium_term_forecasts_location_code_type_date 
ON public.medium_term_forecasts(location_code, forecast_type, tm_ef);

-- Add comment explaining the optimization
COMMENT ON COLUMN public.medium_term_forecasts.location_code 
IS 'Location code for direct querying without joining tide_weather_region table. Performance optimization.';