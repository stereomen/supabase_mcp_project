-- Update medium_term_forecasts unique constraint to remove tm_fc
-- This allows keeping only the latest forecast for each reg_id, tm_ef, mod, forecast_type combination

-- Drop the existing constraint
ALTER TABLE public.medium_term_forecasts 
DROP CONSTRAINT IF EXISTS medium_term_forecasts_unique;

-- Add the new constraint without tm_fc
ALTER TABLE public.medium_term_forecasts 
ADD CONSTRAINT medium_term_forecasts_unique 
UNIQUE (reg_id, tm_ef, mod, forecast_type);

-- Create comment
COMMENT ON CONSTRAINT medium_term_forecasts_unique ON public.medium_term_forecasts 
IS 'Unique constraint for medium-term forecasts: one record per region/effective_time/model/type (tm_fc removed to allow latest forecast updates)';