// Backend API Server - Node.js with Express
// Handles weather data fetching, caching, and widget API

const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');
const axios = require('axios');
const cron = require('node-cron');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy - Required for Railway, Heroku, etc.
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'water_conditions_widget',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Weather API configuration
const WEATHER_API_KEY = process.env.WEATHER_API_KEY || '';
const WEATHER_API_BASE = 'http://api.weatherapi.com/v1';

// Condition thresholds
const THRESHOLDS = {
  BEGINNER_WIND_MAX: 10,    // mph
  INTERMEDIATE_WIND_MAX: 18, // mph
  BEGINNER_WAVE_MAX: 1.5,   // feet
  INTERMEDIATE_WAVE_MAX: 3.5 // feet
};

/**
 * Determine condition level based on weather data
 */
function determineConditionLevel(windSpeed, gustSpeed, waveHeight) {
  const maxWind = Math.max(windSpeed || 0, gustSpeed || 0);
  const waves = waveHeight || 0;
  
  // Check for advanced conditions
  if (maxWind > THRESHOLDS.INTERMEDIATE_WIND_MAX || waves > THRESHOLDS.INTERMEDIATE_WAVE_MAX) {
    return {
      level: 'advanced',
      color: '#E63946',
      description: 'Advanced conditions - Strong winds and challenging water. Experienced paddlers only.'
    };
  }
  
  // Check for intermediate conditions
  if (maxWind > THRESHOLDS.BEGINNER_WIND_MAX || waves > THRESHOLDS.BEGINNER_WAVE_MAX) {
    return {
      level: 'intermediate',
      color: '#F77F00',
      description: 'Moderate conditions - Some wind and chop. Suitable for intermediate paddlers.'
    };
  }
  
  // Beginner conditions
  return {
    level: 'beginner',
    color: '#06A77D',
    description: 'Calm conditions - Light winds and smooth water. Perfect for beginners!'
  };
}

/**
 * Fetch weather data from WeatherAPI.com
 */
async function fetchWeatherData(latitude, longitude) {
  try {
    const response = await axios.get(`${WEATHER_API_BASE}/current.json`, {
      params: {
        key: WEATHER_API_KEY,
        q: `${latitude},${longitude}`,
        aqi: 'no'
      },
      timeout: 5000
    });
    
    const current = response.data.current;
    
    return {
      windSpeed: current.wind_mph,
      gustSpeed: current.gust_mph,
      windDirection: current.wind_degree,
      temperature: current.temp_f,
      conditionsText: current.condition.text,
      waveHeight: 0, // WeatherAPI doesn't provide wave data, would need marine-specific API
      raw: response.data
    };
  } catch (error) {
    console.error('Error fetching weather data:', error.message);
    throw error;
  }
}

/**
 * Update weather data for a location
 */
async function updateLocationWeather(locationId) {
  const connection = await pool.getConnection();
  
  try {
    // Get location details
    const [locations] = await connection.query(
      'SELECT * FROM locations WHERE id = ? AND is_active = TRUE',
      [locationId]
    );
    
    if (locations.length === 0) {
      throw new Error('Location not found or inactive');
    }
    
    const location = locations[0];
    
    // Fetch weather data
    const weatherData = await fetchWeatherData(location.latitude, location.longitude);
    
    // Determine condition level
    const condition = determineConditionLevel(
      weatherData.windSpeed,
      weatherData.gustSpeed,
      weatherData.waveHeight
    );
    
    // Calculate expiry time (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    // Insert weather data
    await connection.query(
      `INSERT INTO weather_data 
       (location_id, wind_speed_mph, wind_gust_mph, wind_direction_degrees, 
        wave_height_ft, temperature_f, conditions_text, condition_level, 
        raw_data, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        locationId,
        weatherData.windSpeed,
        weatherData.gustSpeed,
        weatherData.windDirection,
        weatherData.waveHeight,
        weatherData.temperature,
        weatherData.conditionsText,
        condition.level,
        JSON.stringify(weatherData.raw),
        expiresAt
      ]
    );
    
    // Update refresh schedule
    await connection.query(
      `UPDATE refresh_schedule 
       SET last_refresh_at = NOW(), 
           next_refresh_at = DATE_ADD(NOW(), INTERVAL refresh_interval_minutes MINUTE),
           consecutive_failures = 0,
           last_error = NULL
       WHERE location_id = ?`,
      [locationId]
    );
    
    console.log(`Updated weather for location ${locationId} (${location.location_name})`);
    return true;
    
  } catch (error) {
    console.error(`Error updating location ${locationId}:`, error.message);
    
    // Update refresh schedule with error
    await connection.query(
      `UPDATE refresh_schedule 
       SET consecutive_failures = consecutive_failures + 1,
           last_error = ?,
           next_refresh_at = DATE_ADD(NOW(), INTERVAL refresh_interval_minutes MINUTE)
       WHERE location_id = ?`,
      [error.message, locationId]
    );
    
    return false;
  } finally {
    connection.release();
  }
}

/**
 * Scheduled task to refresh weather data
 */
async function scheduledWeatherRefresh() {
  const connection = await pool.getConnection();
  
  try {
    // Get locations that need refresh
    const [schedules] = await connection.query(
      `SELECT rs.location_id, l.location_name
       FROM refresh_schedule rs
       JOIN locations l ON l.id = rs.location_id
       WHERE rs.next_refresh_at <= NOW() 
         AND rs.is_enabled = TRUE
         AND l.is_active = TRUE
       LIMIT 50`
    );
    
    console.log(`Found ${schedules.length} locations to refresh`);
    
    // Update each location (with slight delay to avoid API rate limits)
    for (const schedule of schedules) {
      await updateLocationWeather(schedule.location_id);
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
    }
    
  } catch (error) {
    console.error('Error in scheduled refresh:', error.message);
  } finally {
    connection.release();
  }
}

// Run scheduled refresh every minute
cron.schedule('* * * * *', scheduledWeatherRefresh);

/**
 * API ENDPOINTS
 */

// Widget API - Get current conditions for a location
app.get('/api/widget/conditions/:apiKey', async (req, res) => {
  const startTime = Date.now();
  const connection = await pool.getConnection();
  
  try {
    const { apiKey } = req.params;
    
    // Verify API key and get customer/location
    const [results] = await connection.query(
      `SELECT 
         l.id as location_id,
         l.customer_id,
         l.location_name,
         l.water_body_name,
         l.city,
         l.state,
         l.zip_code,
         l.latitude,
         l.longitude,
         l.timezone,
         c.id as customer_id, 
         c.company_name,
         wd.id as weather_data_id,
         wd.wind_speed_mph,
         wd.wind_gust_mph,
         wd.wind_direction_degrees,
         wd.wave_height_ft,
         wd.temperature_f,
         wd.conditions_text,
         wd.condition_level,
         wd.fetched_at,
         wd.expires_at
       FROM customers c
       JOIN locations l ON l.customer_id = c.id
       LEFT JOIN weather_data wd ON wd.location_id = l.id
       WHERE c.api_key = ? 
         AND c.is_active = TRUE 
         AND l.is_active = TRUE
       ORDER BY wd.fetched_at DESC
       LIMIT 1`,
      [apiKey]
    );
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Invalid API key or no active location' });
    }
    
    const location = results[0];
    
    // Check if data is expired or doesn't exist
    if (!location.fetched_at || new Date(location.expires_at) < new Date()) {
      // Trigger immediate refresh
      await updateLocationWeather(location.location_id);
      
      // Fetch updated data
      const [updated] = await connection.query(
        `SELECT * FROM weather_data WHERE location_id = ? ORDER BY fetched_at DESC LIMIT 1`,
        [location.location_id]
      );
      
      if (updated.length > 0) {
        Object.assign(location, updated[0]);
      }
    }
    
    // Determine current condition
    const condition = determineConditionLevel(
      location.wind_speed_mph,
      location.wind_gust_mph,
      location.wave_height_ft
    );
    
    const response = {
      location: {
        name: location.location_name,
        waterBody: location.water_body_name,
        city: location.city,
        state: location.state
      },
      conditions: {
        level: condition.level,
        color: condition.color,
        description: condition.description,
        windSpeed: Math.round(location.wind_speed_mph || 0),
        gustSpeed: Math.round(location.wind_gust_mph || 0),
        temperature: Math.round(location.temperature_f || 0),
        weatherText: location.conditions_text
      },
      lastUpdated: location.fetched_at,
      nextUpdate: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    };
    
    // Log request (use valid location_id or NULL to avoid foreign key errors)
    const responseTime = Date.now() - startTime;
    try {
      await connection.query(
        `INSERT INTO api_logs (customer_id, location_id, endpoint, response_time_ms, status_code, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [location.customer_id || null, location.location_id || null, '/api/widget/conditions', responseTime, 200, 
         req.ip, req.get('user-agent')]
      );
    } catch (logError) {
      // Don't fail the request if logging fails
      console.error('Failed to log API request:', logError.message);
    }
    
    res.json(response);
    
  } catch (error) {
    console.error('API Error:', error);
    
    const responseTime = Date.now() - startTime;
    try {
      await connection.query(
        `INSERT INTO api_logs (endpoint, response_time_ms, status_code, error_message, ip_address)
         VALUES (?, ?, ?, ?, ?)`,
        ['/api/widget/conditions', responseTime, 500, error.message, req.ip]
      );
    } catch (logError) {
      console.error('Failed to log API error:', logError.message);
    }
    
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

// ============================================
// ADMIN API ENDPOINTS
// ============================================

// Get dashboard statistics
app.get('/api/admin/stats', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    // Get total customers
    const [customers] = await connection.query('SELECT COUNT(*) as total FROM customers WHERE is_active = TRUE');
    
    // Get total locations
    const [locations] = await connection.query('SELECT COUNT(*) as total FROM locations WHERE is_active = TRUE');
    
    // Get API calls in last 24 hours
    const [apiCalls] = await connection.query(
      'SELECT COUNT(*) as total FROM api_logs WHERE created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)'
    );
    
    // Get system status
    const [schedule] = await connection.query(
      'SELECT COUNT(*) as failing FROM refresh_schedule WHERE consecutive_failures > 0'
    );
    
    res.json({
      totalCustomers: customers[0].total,
      totalLocations: locations[0].total,
      apiCallsLast24h: apiCalls[0].total,
      systemStatus: schedule[0].failing === 0 ? 'healthy' : 'warning'
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  } finally {
    connection.release();
  }
});

// Get all customers
app.get('/api/admin/customers', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const [customers] = await connection.query(
      `SELECT id, company_name, website_url, contact_email, api_key, is_active, created_at 
       FROM customers 
       ORDER BY created_at DESC`
    );
    res.json(customers);
  } catch (error) {
    console.error('Admin customers error:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  } finally {
    connection.release();
  }
});

// Get all locations
app.get('/api/admin/locations', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const [locations] = await connection.query(
      `SELECT l.*, c.company_name, wd.condition_level, wd.wind_speed_mph, wd.temperature_f, wd.fetched_at
       FROM locations l
       JOIN customers c ON c.id = l.customer_id
       LEFT JOIN weather_data wd ON wd.location_id = l.id
       ORDER BY l.created_at DESC`
    );
    res.json(locations);
  } catch (error) {
    console.error('Admin locations error:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  } finally {
    connection.release();
  }
});

// Get refresh schedule
app.get('/api/admin/refresh-schedule', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const [schedule] = await connection.query(
      `SELECT rs.*, l.location_name, c.company_name
       FROM refresh_schedule rs
       JOIN locations l ON l.id = rs.location_id
       JOIN customers c ON c.id = l.customer_id
       ORDER BY rs.next_refresh_at ASC`
    );
    res.json(schedule);
  } catch (error) {
    console.error('Admin refresh schedule error:', error);
    res.status(500).json({ error: 'Failed to fetch refresh schedule' });
  } finally {
    connection.release();
  }
});

// Get API logs
app.get('/api/admin/logs', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const [logs] = await connection.query(
      `SELECT al.*, c.company_name, l.location_name
       FROM api_logs al
       LEFT JOIN customers c ON c.id = al.customer_id
       LEFT JOIN locations l ON l.id = al.location_id
       ORDER BY al.created_at DESC
       LIMIT 100`
    );
    res.json(logs);
  } catch (error) {
    console.error('Admin logs error:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  } finally {
    connection.release();
  }
});

// Get system settings
app.get('/api/admin/settings', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const [settings] = await connection.query('SELECT * FROM system_config');
    
    // Convert to key-value object
    const config = {};
    settings.forEach(row => {
      config[row.config_key] = row.config_value;
    });
    
    res.json(config);
  } catch (error) {
    console.error('Admin settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  } finally {
    connection.release();
  }
});

// ============================================
// END ADMIN API ENDPOINTS
// ============================================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve widget.js
app.get('/widget.js', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'widget.js'));
});

// Serve widget iframe
app.get('/widget-iframe.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'widget-iframe.html'));
});

// Serve admin dashboard
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

// Start server
app.listen(PORT, () => {
  console.log(`Water Conditions Widget API running on port ${PORT}`);
  console.log(`Weather refresh scheduled every minute`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await pool.end();
  process.exit(0);
});
