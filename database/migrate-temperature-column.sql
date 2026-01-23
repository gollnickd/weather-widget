-- Migration: Copy temperature_f to temp_fahrenheit and remove old column

-- Step 1: Add new columns if they don't exist
ALTER TABLE weather_data 
ADD COLUMN IF NOT EXISTS temp_celsius DECIMAL(5,2) COMMENT 'Temperature in Celsius from API',
ADD COLUMN IF NOT EXISTS temp_fahrenheit DECIMAL(5,2) COMMENT 'Temperature in Fahrenheit from API';

-- Step 2: Copy existing temperature_f data to temp_fahrenheit
UPDATE weather_data
SET temp_fahrenheit = temperature_f
WHERE temp_fahrenheit IS NULL 
  AND temperature_f IS NOT NULL;

-- Step 3: Calculate temp_celsius from temperature_f for existing records
-- (This is for backward compatibility with old data)
UPDATE weather_data
SET temp_celsius = (temperature_f - 32) * 5 / 9
WHERE temp_celsius IS NULL 
  AND temperature_f IS NOT NULL;

-- Step 4: Verify the migration (check a few rows)
SELECT 
  id,
  location_id,
  temperature_f as old_column,
  temp_celsius as new_celsius,
  temp_fahrenheit as new_fahrenheit,
  fetched_at
FROM weather_data
ORDER BY fetched_at DESC
LIMIT 10;

-- Step 5: Remove the old temperature_f column (ONLY after verifying Step 4!)
-- IMPORTANT: Make sure data is copied correctly before running this!
ALTER TABLE weather_data
DROP COLUMN temperature_f;

-- Step 6: Verify the old column is gone
DESCRIBE weather_data;
