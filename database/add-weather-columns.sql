-- Add missing weather columns to weather_data table
-- Run this in Railway MySQL

ALTER TABLE weather_data 
ADD COLUMN IF NOT EXISTS cloud_cover INT COMMENT 'Cloud cover percentage (0-100)',
ADD COLUMN IF NOT EXISTS humidity INT COMMENT 'Humidity percentage (0-100)',
ADD COLUMN IF NOT EXISTS weather_condition VARCHAR(100) COMMENT 'Weather description (e.g., Partly cloudy)',
ADD COLUMN IF NOT EXISTS wind_direction VARCHAR(10) COMMENT 'Wind direction (N, NE, E, etc.)';

-- Verify columns were added
DESCRIBE weather_data;
