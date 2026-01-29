-- Add unique constraint for tide_data table on (obs_date, location_code)
-- This prevents duplicate entries for the same date and location

-- Step 1: Remove duplicate records, keeping only the one with the highest id
-- (assuming higher id means more recent insert)
DELETE FROM public.tide_data
WHERE id IN (
    SELECT id FROM (
        SELECT
            id,
            ROW_NUMBER() OVER (
                PARTITION BY obs_date, location_code
                ORDER BY id DESC
            ) as rn
        FROM public.tide_data
    ) t
    WHERE t.rn > 1
);

-- Step 2: Add unique constraint
ALTER TABLE public.tide_data
ADD CONSTRAINT tide_data_obs_date_location_code_unique
UNIQUE (obs_date, location_code);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT tide_data_obs_date_location_code_unique ON public.tide_data IS
'Ensures that each combination of observation date and location code is unique, preventing duplicate tide data entries';
