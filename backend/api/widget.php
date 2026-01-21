<?php
/**
 * Widget API Endpoint
 * Serves weather data to embedded widgets
 */

header('Content-Type: application/json');

// CORS headers
$allowedOrigins = ALLOWED_ORIGINS;
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array('*', $allowedOrigins) || in_array($origin, $allowedOrigins)) {
    header('Access-Control-Allow-Origin: ' . ($origin ?: '*'));
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-API-Key');
    header('Access-Control-Max-Age: 86400');
}

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../config.php';
require_once '../Database.php';
require_once '../WeatherService.php';

/**
 * Send JSON response
 */
function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

/**
 * Validate API key
 */
function validateApiKey() {
    $apiKey = null;
    
    // Check header
    if (isset($_SERVER['HTTP_X_API_KEY'])) {
        $apiKey = $_SERVER['HTTP_X_API_KEY'];
    }
    // Check query parameter
    elseif (isset($_GET['api_key'])) {
        $apiKey = $_GET['api_key'];
    }
    // Check POST body
    elseif (isset($_POST['api_key'])) {
        $apiKey = $_POST['api_key'];
    }
    
    if (!$apiKey) {
        sendResponse(['error' => 'API key required'], 401);
    }
    
    $customerModel = new CustomerModel();
    $customer = $customerModel->getCustomerByApiKey($apiKey);
    
    if (!$customer) {
        sendResponse(['error' => 'Invalid API key'], 403);
    }
    
    return $customer;
}

/**
 * Track widget analytics
 */
function trackAnalytics($customerId, $locationId) {
    if (!ENABLE_ANALYTICS) {
        return;
    }
    
    try {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare("
            INSERT INTO widget_analytics (customer_id, location_id, page_url, user_ip, user_agent)
            VALUES (:customer_id, :location_id, :page_url, :user_ip, :user_agent)
        ");
        
        $stmt->execute([
            'customer_id' => $customerId,
            'location_id' => $locationId,
            'page_url' => $_SERVER['HTTP_REFERER'] ?? null,
            'user_ip' => $_SERVER['REMOTE_ADDR'] ?? null,
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null
        ]);
    } catch (Exception $e) {
        logMessage("Analytics tracking failed: " . $e->getMessage(), "WARNING");
    }
}

// Main endpoint logic
try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        sendResponse(['error' => 'Method not allowed'], 405);
    }
    
    // Validate API key
    $customer = validateApiKey();
    
    // Get location ID (optional)
    $locationId = $_GET['location_id'] ?? null;
    
    if (!$locationId) {
        sendResponse(['error' => 'location_id parameter required'], 400);
    }
    
    // Get weather data
    $weatherService = new WeatherService();
    
    // Try to get cached data first
    $weather = $weatherService->getCachedWeather($locationId);
    
    // If no cache or cache expired, fetch new data
    if (!$weather) {
        $updateResult = $weatherService->updateWeatherForLocation($locationId);
        
        if (!$updateResult['success']) {
            sendResponse(['error' => 'Failed to fetch weather data', 'details' => $updateResult['error']], 500);
        }
        
        $weather = $weatherService->getCachedWeather($locationId);
    }
    
    if (!$weather) {
        sendResponse(['error' => 'No weather data available'], 404);
    }
    
    // Track analytics
    trackAnalytics($customer['customer_id'], $locationId);
    
    // Format response
    $response = [
        'success' => true,
        'location' => [
            'id' => $weather['location_id'],
            'name' => $weather['location_name'],
            'body_of_water' => $weather['body_of_water'],
            'city' => $weather['city'],
            'state' => $weather['state']
        ],
        'conditions' => [
            'level' => $weather['condition_level'],
            'message' => $weather['condition_message'],
            'color' => [
                'beginner' => '#28a745',
                'intermediate' => '#ffc107',
                'advanced' => '#dc3545'
            ][$weather['condition_level']]
        ],
        'weather' => [
            'wind_speed' => round($weather['wind_speed'], 1),
            'wind_gust' => round($weather['wind_gust'], 1),
            'wind_direction' => $weather['wind_direction'],
            'wave_height' => round($weather['wave_height'], 1),
            'water_temp' => round($weather['water_temp'], 1),
            'air_temp' => round($weather['air_temp'], 1),
            'visibility' => round($weather['visibility'], 1),
            'condition' => $weather['weather_condition']
        ],
        'last_updated' => $weather['fetched_at'],
        'refresh_interval' => WIDGET_REFRESH_INTERVAL
    ];
    
    sendResponse($response, 200);
    
} catch (Exception $e) {
    logMessage("API Error: " . $e->getMessage(), "ERROR");
    sendResponse(['error' => 'Internal server error', 'message' => DEBUG_MODE ? $e->getMessage() : null], 500);
}
