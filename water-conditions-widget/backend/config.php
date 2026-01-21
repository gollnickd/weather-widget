<?php
/**
 * Water Conditions Widget - Configuration File
 * 
 * SECURITY: This file should be placed OUTSIDE the web root or protected by .htaccess
 */

// Database Configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'water_conditions_widget');
define('DB_USER', 'your_db_user');
define('DB_PASS', 'your_db_password');
define('DB_CHARSET', 'utf8mb4');

// API Configuration
define('OPENWEATHER_API_KEY', 'your_openweathermap_api_key'); // Get free key at https://openweathermap.org/api
define('API_BASE_URL', 'https://api.openweathermap.org/data/2.5');
define('API_RATE_LIMIT', 60); // Calls per minute (free tier allows 60/min)

// Weather Condition Thresholds
// These determine when conditions are beginner/intermediate/advanced
define('WIND_BEGINNER_MAX', 10);      // mph - under 10 mph is beginner friendly
define('WIND_INTERMEDIATE_MAX', 20);  // mph - 10-20 mph is intermediate
define('WAVE_BEGINNER_MAX', 2);       // feet - under 2 feet is beginner friendly
define('WAVE_INTERMEDIATE_MAX', 4);   // feet - 2-4 feet is intermediate

// Widget Configuration
define('WIDGET_REFRESH_INTERVAL', 600); // 600 seconds = 10 minutes
define('DATA_CACHE_DURATION', 600); // Cache weather data for 10 minutes
define('WIDGET_VERSION', '1.0.0');

// CORS Configuration (adjust for production)
define('ALLOWED_ORIGINS', ['*']); // In production, list specific domains

// Security
define('SESSION_TIMEOUT', 3600); // 1 hour for admin sessions
define('API_KEY_LENGTH', 32);
define('ENABLE_ANALYTICS', true); // Track widget loads

// Timezone
date_default_timezone_set('America/Los_Angeles'); // PST/PDT

// Error Reporting (set to 0 in production)
define('DEBUG_MODE', true);
if (DEBUG_MODE) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

// Paths
define('BASE_PATH', dirname(__FILE__));
define('API_PATH', BASE_PATH . '/api');
define('ADMIN_PATH', BASE_PATH . '/admin');
define('LOGS_PATH', BASE_PATH . '/logs');

// Create logs directory if it doesn't exist
if (!file_exists(LOGS_PATH)) {
    mkdir(LOGS_PATH, 0755, true);
}

// Perfect Paddles Branding
define('BRAND_NAME', 'Perfect Paddles');
define('BRAND_COLOR_PRIMARY', '#0099cc'); // Adjust based on actual brand colors
define('BRAND_COLOR_SUCCESS', '#28a745');
define('BRAND_COLOR_WARNING', '#ffc107');
define('BRAND_COLOR_DANGER', '#dc3545');

// Email Configuration (for notifications)
define('SMTP_HOST', 'smtp.example.com');
define('SMTP_PORT', 587);
define('SMTP_USER', 'notifications@perfectpaddles.com');
define('SMTP_PASS', 'your_smtp_password');
define('ALERT_EMAIL', 'admin@perfectpaddles.com');

// Logging
function logMessage($message, $level = 'INFO') {
    $timestamp = date('Y-m-d H:i:s');
    $logFile = LOGS_PATH . '/widget_' . date('Y-m-d') . '.log';
    $logEntry = "[{$timestamp}] [{$level}] {$message}" . PHP_EOL;
    file_put_contents($logFile, $logEntry, FILE_APPEND);
}
