-- Fix existing bad temperature data in database
-- This corrects Celsius values that are stored in the temperature_f column

-- Step 1: Find rows where temperature looks like Celsius (very low values)
SELECT 
    id,
    location_id,
    temperature_f as current_temp,
    (temperature_f * 9/5) + 32 as corrected_temp,
    fetched_at
FROM weather_data
WHERE temperature_f < 20  -- Suspiciously low for most US locations
ORDER BY fetched_at DESC;

-- Step 2: Update ALL bad data (ONLY run this if Step 1 shows bad data!)
-- This converts Celsius to Fahrenheit for temperatures below 20°F
UPDATE weather_data
SET temperature_f = (temperature_f * 9/5) + 32
WHERE temperature_f < 20
  AND temperature_f > -50;  -- Safety check: only convert reasonable Celsius values

-- Step 3: For Alki Beach specifically (if still wrong)
UPDATE weather_data
SET temperature_f = (temperature_f * 9/5) + 32
WHERE location_id IN (SELECT id FROM locations WHERE location_name LIKE '%Alki%')
  AND temperature_f < 20
  AND temperature_f > -50;

-- Step 4: Verify the fix
SELECT 
    l.location_name,
    wd.temperature_f,
    wd.fetched_at
FROM weather_data wd
JOIN locations l ON l.id = wd.location_id
WHERE l.location_name LIKE '%Alki%'
ORDER BY wd.fetched_at DESC
LIMIT 5;
