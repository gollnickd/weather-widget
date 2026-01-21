<?php
/**
 * Weather Service
 * Handles fetching weather data from OpenWeatherMap API and processing conditions
 */

require_once 'config.php';
require_once 'Database.php';

class WeatherService {
    private $apiKey;
    private $weatherModel;
    private $locationModel;
    
    public function __construct() {
        $this->apiKey = OPENWEATHER_API_KEY;
        $this->weatherModel = new WeatherModel();
        $this->locationModel = new LocationModel();
    }
    
    /**
     * Fetch weather data from OpenWeatherMap API
     */
    private function fetchWeatherData($latitude, $longitude) {
        $url = API_BASE_URL . "/weather?" . http_build_query([
            'lat' => $latitude,
            'lon' => $longitude,
            'appid' => $this->apiKey,
            'units' => 'imperial' // Fahrenheit and mph
        ]);
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($error) {
            logMessage("cURL Error: " . $error, "ERROR");
            throw new Exception("Failed to fetch weather data: " . $error);
        }
        
        if ($httpCode !== 200) {
            logMessage("API returned HTTP {$httpCode}: {$response}", "ERROR");
            throw new Exception("Weather API error (HTTP {$httpCode})");
        }
        
        $data = json_decode($response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception("Invalid JSON response from weather API");
        }
        
        return $data;
    }
    
    /**
     * Calculate wave height estimate (OpenWeather free tier doesn't include waves)
     * We'll estimate based on wind speed - this is a rough approximation
     */
    private function estimateWaveHeight($windSpeed, $windGust) {
        // Very rough estimation: wave height in feet ≈ wind speed * 0.1
        // This is just for demonstration - real wave data requires marine APIs
        $effectiveWind = max($windSpeed, $windGust * 0.8);
        $waveHeight = $effectiveWind * 0.1;
        return round($waveHeight, 2);
    }
    
    /**
     * Determine condition level based on weather data
     */
    private function determineConditionLevel($windSpeed, $windGust, $waveHeight) {
        $effectiveWind = max($windSpeed, $windGust);
        
        // Check wind conditions
        if ($effectiveWind > WIND_INTERMEDIATE_MAX || $waveHeight > WAVE_INTERMEDIATE_MAX) {
            return 'advanced';
        } elseif ($effectiveWind > WIND_BEGINNER_MAX || $waveHeight > WAVE_BEGINNER_MAX) {
            return 'intermediate';
        } else {
            return 'beginner';
        }
    }
    
    /**
     * Generate condition message based on level
     */
    private function generateConditionMessage($level, $windSpeed, $waveHeight, $weatherCondition) {
        $messages = [
            'beginner' => "Perfect conditions for beginners! Light winds (" . round($windSpeed) . " mph) and calm waters. Great day to paddle!",
            'intermediate' => "Moderate conditions. Winds at " . round($windSpeed) . " mph with " . round($waveHeight, 1) . "ft waves. Good for experienced paddlers.",
            'advanced' => "Challenging conditions! Strong winds (" . round($windSpeed) . " mph) and rough waters (" . round($waveHeight, 1) . "ft waves). Only for advanced paddlers."
        ];
        
        // Add weather condition context
        $weatherLower = strtolower($weatherCondition);
        if (strpos($weatherLower, 'rain') !== false || strpos($weatherLower, 'storm') !== false) {
            $messages[$level] .= " Precipitation detected - use caution.";
        } elseif (strpos($weatherLower, 'clear') !== false || strpos($weatherLower, 'sun') !== false) {
            $messages[$level] .= " Clear skies!";
        }
        
        return $messages[$level];
    }
    
    /**
     * Process weather data for a location
     */
    public function updateWeatherForLocation($locationId) {
        try {
            $location = $this->locationModel->getLocationById($locationId);
            if (!$location) {
                throw new Exception("Location not found: {$locationId}");
            }
            
            // Fetch weather data from API
            $weatherData = $this->fetchWeatherData($location['latitude'], $location['longitude']);
            
            // Extract relevant data
            $windSpeed = $weatherData['wind']['speed'] ?? 0; // mph
            $windGust = $weatherData['wind']['gust'] ?? $windSpeed; // mph
            $windDirection = $weatherData['wind']['deg'] ?? 0; // degrees
            $airTemp = $weatherData['main']['temp'] ?? 0; // Fahrenheit
            $visibility = isset($weatherData['visibility']) ? $weatherData['visibility'] * 0.000621371 : 10; // meters to miles
            $weatherCondition = $weatherData['weather'][0]['main'] ?? 'Unknown';
            
            // Estimate wave height (rough approximation)
            $waveHeight = $this->estimateWaveHeight($windSpeed, $windGust);
            
            // For water temp, we'll use air temp as proxy (OpenWeather free tier limitation)
            // In production, use a marine-specific API like NOAA or Stormglass
            $waterTemp = $airTemp - 5; // Rough estimate
            
            // Determine condition level
            $conditionLevel = $this->determineConditionLevel($windSpeed, $windGust, $waveHeight);
            
            // Generate message
            $conditionMessage = $this->generateConditionMessage($conditionLevel, $windSpeed, $waveHeight, $weatherCondition);
            
            // Prepare data for database
            $dbData = [
                'location_id' => $locationId,
                'wind_speed' => $windSpeed,
                'wind_gust' => $windGust,
                'wind_direction' => $windDirection,
                'wave_height' => $waveHeight,
                'water_temp' => $waterTemp,
                'air_temp' => $airTemp,
                'visibility' => $visibility,
                'weather_condition' => $weatherCondition,
                'condition_level' => $conditionLevel,
                'condition_message' => $conditionMessage,
                'raw_api_response' => json_encode($weatherData)
            ];
            
            // Insert into database
            $this->weatherModel->insertWeatherData($dbData);
            
            logMessage("Weather updated for location {$locationId}: {$conditionLevel}", "INFO");
            
            return [
                'success' => true,
                'location_id' => $locationId,
                'condition_level' => $conditionLevel
            ];
            
        } catch (Exception $e) {
            logMessage("Error updating weather for location {$locationId}: " . $e->getMessage(), "ERROR");
            return [
                'success' => false,
                'location_id' => $locationId,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Update weather for all active locations
     */
    public function updateAllLocations() {
        $startTime = microtime(true);
        $locations = $this->weatherModel->getActiveLocations();
        $results = [];
        $successCount = 0;
        $failCount = 0;
        
        foreach ($locations as $location) {
            $result = $this->updateWeatherForLocation($location['location_id']);
            $results[] = $result;
            
            if ($result['success']) {
                $successCount++;
            } else {
                $failCount++;
            }
            
            // Rate limiting - avoid hitting API limits
            if (count($locations) > 1) {
                usleep(1000000 / API_RATE_LIMIT); // Sleep to respect rate limit
            }
        }
        
        $executionTime = round((microtime(true) - $startTime) * 1000);
        
        // Log the refresh
        $logModel = new RefreshLogModel();
        $logModel->createLog([
            'location_id' => null,
            'refresh_type' => 'scheduled',
            'status' => $failCount > 0 ? 'partial' : 'success',
            'api_calls_made' => count($locations),
            'locations_updated' => $successCount,
            'error_message' => $failCount > 0 ? "{$failCount} locations failed to update" : null,
            'execution_time_ms' => $executionTime
        ]);
        
        return [
            'total' => count($locations),
            'success' => $successCount,
            'failed' => $failCount,
            'execution_time_ms' => $executionTime,
            'results' => $results
        ];
    }
    
    /**
     * Get cached weather data (if still valid)
     */
    public function getCachedWeather($locationId) {
        $weather = $this->weatherModel->getLatestWeather($locationId);
        
        if (!$weather) {
            return null;
        }
        
        // Check if cache is still valid
        $fetchedTime = strtotime($weather['fetched_at']);
        $currentTime = time();
        $cacheAge = $currentTime - $fetchedTime;
        
        if ($cacheAge <= DATA_CACHE_DURATION) {
            return $weather;
        }
        
        return null;
    }
}
