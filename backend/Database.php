<?php
/**
 * Database Connection Handler
 * Singleton pattern for MySQL connection management
 */

class Database {
    private static $instance = null;
    private $connection;
    
    private function __construct() {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
            ];
            
            $this->connection = new PDO($dsn, DB_USER, DB_PASS, $options);
            logMessage("Database connection established", "INFO");
        } catch (PDOException $e) {
            logMessage("Database connection failed: " . $e->getMessage(), "ERROR");
            throw new Exception("Database connection failed");
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function getConnection() {
        return $this->connection;
    }
    
    // Prevent cloning
    private function __clone() {}
    
    // Prevent unserialization
    public function __wakeup() {
        throw new Exception("Cannot unserialize singleton");
    }
}

/**
 * Weather Data Model
 */
class WeatherModel {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }
    
    /**
     * Get latest weather data for a location
     */
    public function getLatestWeather($locationId) {
        $stmt = $this->db->prepare("
            SELECT w.*, l.location_name, l.body_of_water, l.city, l.state
            FROM weather_data w
            JOIN locations l ON w.location_id = l.location_id
            WHERE w.location_id = :location_id
            ORDER BY w.fetched_at DESC
            LIMIT 1
        ");
        $stmt->execute(['location_id' => $locationId]);
        return $stmt->fetch();
    }
    
    /**
     * Get weather data by customer API key and location
     */
    public function getWeatherByApiKey($apiKey, $locationId = null) {
        $sql = "
            SELECT w.*, l.location_name, l.body_of_water, l.city, l.state, c.customer_name
            FROM weather_data w
            JOIN locations l ON w.location_id = l.location_id
            JOIN customers c ON l.customer_id = c.customer_id
            WHERE c.api_key = :api_key AND c.status = 'active' AND l.status = 'active'
        ";
        
        if ($locationId) {
            $sql .= " AND l.location_id = :location_id";
        }
        
        $sql .= " ORDER BY w.fetched_at DESC LIMIT 1";
        
        $stmt = $this->db->prepare($sql);
        $params = ['api_key' => $apiKey];
        if ($locationId) {
            $params['location_id'] = $locationId;
        }
        $stmt->execute($params);
        return $stmt->fetch();
    }
    
    /**
     * Insert new weather data
     */
    public function insertWeatherData($data) {
        $stmt = $this->db->prepare("
            INSERT INTO weather_data (
                location_id, wind_speed, wind_gust, wind_direction, 
                wave_height, water_temp, air_temp, visibility, 
                weather_condition, condition_level, condition_message, 
                raw_api_response
            ) VALUES (
                :location_id, :wind_speed, :wind_gust, :wind_direction,
                :wave_height, :water_temp, :air_temp, :visibility,
                :weather_condition, :condition_level, :condition_message,
                :raw_api_response
            )
        ");
        return $stmt->execute($data);
    }
    
    /**
     * Get all active locations that need weather updates
     */
    public function getActiveLocations() {
        $stmt = $this->db->query("
            SELECT l.*, c.customer_name, c.email
            FROM locations l
            JOIN customers c ON l.customer_id = c.customer_id
            WHERE l.status = 'active' AND c.status = 'active'
        ");
        return $stmt->fetchAll();
    }
}

/**
 * Customer Model
 */
class CustomerModel {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }
    
    /**
     * Get customer by API key
     */
    public function getCustomerByApiKey($apiKey) {
        $stmt = $this->db->prepare("
            SELECT * FROM customers WHERE api_key = :api_key AND status = 'active'
        ");
        $stmt->execute(['api_key' => $apiKey]);
        return $stmt->fetch();
    }
    
    /**
     * Get all customers
     */
    public function getAllCustomers() {
        $stmt = $this->db->query("SELECT * FROM customers ORDER BY customer_name");
        return $stmt->fetchAll();
    }
    
    /**
     * Create new customer
     */
    public function createCustomer($data) {
        $stmt = $this->db->prepare("
            INSERT INTO customers (customer_name, website_url, email, api_key, status)
            VALUES (:customer_name, :website_url, :email, :api_key, :status)
        ");
        return $stmt->execute($data);
    }
    
    /**
     * Generate unique API key
     */
    public function generateApiKey() {
        do {
            $apiKey = 'pp_' . bin2hex(random_bytes(API_KEY_LENGTH));
            $stmt = $this->db->prepare("SELECT COUNT(*) FROM customers WHERE api_key = :api_key");
            $stmt->execute(['api_key' => $apiKey]);
            $exists = $stmt->fetchColumn() > 0;
        } while ($exists);
        
        return $apiKey;
    }
}

/**
 * Location Model
 */
class LocationModel {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }
    
    /**
     * Get locations by customer ID
     */
    public function getLocationsByCustomer($customerId) {
        $stmt = $this->db->prepare("
            SELECT * FROM locations WHERE customer_id = :customer_id ORDER BY location_name
        ");
        $stmt->execute(['customer_id' => $customerId]);
        return $stmt->fetchAll();
    }
    
    /**
     * Create new location
     */
    public function createLocation($data) {
        $stmt = $this->db->prepare("
            INSERT INTO locations (
                customer_id, location_name, body_of_water, city, state, 
                zip_code, country, latitude, longitude, water_type, status
            ) VALUES (
                :customer_id, :location_name, :body_of_water, :city, :state,
                :zip_code, :country, :latitude, :longitude, :water_type, :status
            )
        ");
        return $stmt->execute($data);
    }
    
    /**
     * Get location by ID
     */
    public function getLocationById($locationId) {
        $stmt = $this->db->prepare("SELECT * FROM locations WHERE location_id = :location_id");
        $stmt->execute(['location_id' => $locationId]);
        return $stmt->fetch();
    }
}

/**
 * Refresh Log Model
 */
class RefreshLogModel {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }
    
    /**
     * Create new refresh log entry
     */
    public function createLog($data) {
        $stmt = $this->db->prepare("
            INSERT INTO refresh_log (
                location_id, refresh_type, status, api_calls_made, 
                locations_updated, error_message, execution_time_ms, completed_at
            ) VALUES (
                :location_id, :refresh_type, :status, :api_calls_made,
                :locations_updated, :error_message, :execution_time_ms, NOW()
            )
        ");
        return $stmt->execute($data);
    }
    
    /**
     * Get recent refresh logs
     */
    public function getRecentLogs($limit = 100) {
        $stmt = $this->db->prepare("
            SELECT rl.*, l.location_name, l.city
            FROM refresh_log rl
            LEFT JOIN locations l ON rl.location_id = l.location_id
            ORDER BY rl.started_at DESC
            LIMIT :limit
        ");
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }
}
