-- Water Conditions Widget Database Schema
-- MySQL 8.0+

CREATE DATABASE IF NOT EXISTS water_conditions_widget;
USE water_conditions_widget;

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    website_url VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    api_key VARCHAR(64) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_api_key (api_key),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Locations table
CREATE TABLE IF NOT EXISTS locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    location_name VARCHAR(255) NOT NULL COMMENT 'Display name (e.g., Mothers Beach)',
    water_body_name VARCHAR(255) COMMENT 'Named body of water',
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    zip_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'USA',
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    timezone VARCHAR(50) DEFAULT 'America/Los_Angeles',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_customer (customer_id),
    INDEX idx_coordinates (latitude, longitude),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Weather data cache table
CREATE TABLE IF NOT EXISTS weather_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    location_id INT NOT NULL,
    wind_speed_mph DECIMAL(5, 2),
    wind_gust_mph DECIMAL(5, 2),
    wind_direction_degrees INT,
    wave_height_ft DECIMAL(4, 2),
    temperature_f DECIMAL(5, 2),
    conditions_text VARCHAR(255),
    condition_level ENUM('beginner', 'intermediate', 'advanced') NOT NULL,
    raw_data JSON COMMENT 'Store full API response for debugging',
    data_source VARCHAR(50) DEFAULT 'weatherapi',
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    INDEX idx_location_fetch (location_id, fetched_at DESC),
    INDEX idx_expires (expires_at),
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- API request logs
CREATE TABLE IF NOT EXISTS api_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT,
    location_id INT,
    endpoint VARCHAR(100),
    response_time_ms INT,
    status_code INT,
    error_message TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_customer_date (customer_id, created_at DESC),
    INDEX idx_location_date (location_id, created_at DESC),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Refresh schedule tracking
CREATE TABLE IF NOT EXISTS refresh_schedule (
    id INT AUTO_INCREMENT PRIMARY KEY,
    location_id INT NOT NULL,
    last_refresh_at TIMESTAMP,
    next_refresh_at TIMESTAMP NOT NULL,
    refresh_interval_minutes INT DEFAULT 10,
    consecutive_failures INT DEFAULT 0,
    last_error TEXT,
    is_enabled BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
    INDEX idx_next_refresh (next_refresh_at, is_enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- System configuration
CREATE TABLE IF NOT EXISTS system_config (
    config_key VARCHAR(100) PRIMARY KEY,
    config_value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default configuration
INSERT INTO system_config (config_key, config_value, description) VALUES
('weather_api_key', '', 'WeatherAPI.com API key'),
('refresh_interval_minutes', '10', 'Default refresh interval for weather data'),
('cache_expiry_minutes', '15', 'Weather data cache expiry time'),
('max_api_calls_per_day', '1000', 'Maximum API calls per day per location'),
('beginner_wind_max', '10', 'Maximum wind speed (mph) for beginner conditions'),
('intermediate_wind_max', '18', 'Maximum wind speed (mph) for intermediate conditions')
ON DUPLICATE KEY UPDATE config_value=VALUES(config_value);

-- Sample data for testing
INSERT INTO customers (company_name, website_url, contact_email, contact_name, api_key) VALUES
('Perfect Paddles', 'https://perfectpaddles.com', 'admin@perfectpaddles.com', 'Admin User', SHA2(CONCAT('perfectpaddles-', NOW()), 256));

SET @customer_id = LAST_INSERT_ID();

INSERT INTO locations (customer_id, location_name, water_body_name, city, state, zip_code, latitude, longitude, timezone) VALUES
(@customer_id, 'Mother''s Beach', 'Marina del Rey', 'Marina del Rey', 'California', '90292', 33.9806, -118.4517, 'America/Los_Angeles');

SET @location_id = LAST_INSERT_ID();

INSERT INTO refresh_schedule (location_id, next_refresh_at, refresh_interval_minutes) VALUES
(@location_id, NOW(), 10);
