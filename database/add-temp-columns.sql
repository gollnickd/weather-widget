-- Migration: Add separate Celsius and Fahrenheit temperature columns
-- This allows us to store BOTH values from WeatherAPI to avoid conversion issues

-- Add new columns
ALTER TABLE weather_data 
ADD COLUMN IF NOT EXISTS temp_celsius DECIMAL(5,2) COMMENT 'Temperature in Celsius from API',
ADD COLUMN IF NOT EXISTS temp_fahrenheit DECIMAL(5,2) COMMENT 'Temperature in Fahrenheit from API';

-- Migrate existing data (convert current temperature_f to both columns)
-- This is a one-time migration for existing data
UPDATE weather_data
SET 
  temp_fahrenheit = temperature_f,
  temp_celsius = (temperature_f - 32) * 5/9
WHERE temp_fahrenheit IS NULL 
  AND temperature_f IS NOT NULL;

-- Verify migration
SELECT 
  id,
  location_id,
  temperature_f as old_temp_f,
  temp_celsius as new_temp_c,
  temp_fahrenheit as new_temp_f,
  fetched_at
FROM weather_data
ORDER BY fetched_at DESC
LIMIT 10;

-- After verifying, we can eventually deprecate temperature_f column
-- But keep it for now for backward compatibility
