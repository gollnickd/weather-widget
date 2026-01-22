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
 * Convert wind direction degrees to compass direction
 */
function getWindDirectionText(degrees) {
  if (degrees === null || degrees === undefined) return 'N';
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(((degrees % 360) / 45)) % 8;
  return directions[index];
}

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
    
    // WeatherAPI bug detection: Sometimes temp_f contains Celsius values
    let temperature;
    
    if (current.temp_f !== null && current.temp_f !== undefined && 
        current.temp_c !== null && current.temp_c !== undefined) {
      
      // Check if temp_f is actually Celsius (WeatherAPI bug)
      // If temp_f and temp_c are very close (within 2 degrees), temp_f is mislabeled
      const tempDiff = Math.abs(current.temp_f - current.temp_c);
      
      if (tempDiff < 2) {
        // temp_f is actually Celsius! Convert it
        temperature = (current.temp_f * 9/5) + 32;
        console.log(`🔧 BUG DETECTED: API returned temp_f=${current.temp_f} which is actually Celsius!`);
        console.log(`   temp_c=${current.temp_c}, temp_f=${current.temp_f} (difference: ${tempDiff}°)`);
        console.log(`   Converted ${current.temp_f}°C to ${temperature}°F`);
      } else {
        // temp_f looks correct (different from temp_c as expected)
        temperature = current.temp_f;
        console.log(`✅ Using temp_f: ${temperature}°F (temp_c: ${current.temp_c}°C, difference: ${tempDiff}°)`);
      }
    } else if (current.temp_f !== null && current.temp_f !== undefined) {
      // Only temp_f available, use it
      temperature = current.temp_f;
      console.log(`Using temp_f: ${temperature}°F (no temp_c to compare)`);
    } else if (current.temp_c !== null && current.temp_c !== undefined) {
      // Only temp_c available, convert it
      temperature = (current.temp_c * 9/5) + 32;
      console.log(`Converted temperature from ${current.temp_c}°C to ${temperature}°F`);
    } else {
      console.error('No temperature data available from WeatherAPI');
      temperature = 0;
    }
    
    // Log what we received from API for debugging
    console.log(`Weather API response for ${latitude},${longitude}:`, {
      temp_c: current.temp_c,
      temp_f: current.temp_f,
      using_temp: temperature,
      wind_mph: current.wind_mph,
      condition: current.condition.text
    });
    
    return {
      windSpeed: current.wind_mph,
      gustSpeed: current.gust_mph,
      windDirection: current.wind_degree,
      temperature: temperature,
      conditionsText: current.condition.text,
      cloudCover: current.cloud,
      humidity: current.humidity,
      weatherCondition: current.condition.text,
      waveHeight: 0,
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
       (location_id, wind_speed_mph, wind_gust_mph, wind_direction_degrees, wind_direction,
        wave_height_ft, temperature_f, conditions_text, condition_level, 
        cloud_cover, humidity, weather_condition, raw_data, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        locationId,
        weatherData.windSpeed,
        weatherData.gustSpeed,
        weatherData.windDirection,
        getWindDirectionText(weatherData.windDirection),
        weatherData.waveHeight,
        weatherData.temperature,
        weatherData.conditionsText,
        condition.level,
        weatherData.cloudCover,
        weatherData.humidity,
        weatherData.weatherCondition,
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
      `SELECT id, company_name, website_url, contact_email, contact_name, api_key, is_active, created_at 
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

// Get weather data
app.get('/api/admin/weather-data', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const [data] = await connection.query(
      `SELECT 
         wd.*, 
         l.location_name, 
         l.water_body_name, 
         c.company_name,
         (SELECT MAX(created_at) 
          FROM api_logs 
          WHERE location_id = l.id 
          AND endpoint = '/api/widget/conditions') as last_customer_view
       FROM weather_data wd
       JOIN locations l ON l.id = wd.location_id
       JOIN customers c ON c.id = l.customer_id
       ORDER BY wd.fetched_at DESC`
    );
    res.json(data);
  } catch (error) {
    console.error('Admin weather data error:', error);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  } finally {
    connection.release();
  }
});

// Manual refresh all locations (immediate weather update)
app.post('/api/admin/refresh-all-now', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    console.log('🔄 Manual refresh triggered by admin');
    
    // Get all active locations
    const [locations] = await connection.query(
      'SELECT id, location_name, latitude, longitude FROM locations WHERE is_active = TRUE'
    );
    
    if (locations.length === 0) {
      return res.json({ success: true, message: 'No active locations to refresh' });
    }
    
    let successCount = 0;
    let failCount = 0;
    const results = [];
    
    // Refresh each location
    for (const location of locations) {
      try {
        await updateLocationWeather(location.id);
        successCount++;
        results.push({
          location: location.location_name,
          status: 'success'
        });
        console.log(`✅ Refreshed: ${location.location_name}`);
      } catch (error) {
        failCount++;
        results.push({
          location: location.location_name,
          status: 'failed',
          error: error.message
        });
        console.error(`❌ Failed to refresh ${location.location_name}:`, error.message);
      }
    }
    
    console.log(`🔄 Manual refresh complete: ${successCount} success, ${failCount} failed`);
    
    res.json({
      success: true,
      message: `Refreshed ${successCount} of ${locations.length} locations`,
      total: locations.length,
      successful: successCount,
      failed: failCount,
      results: results
    });
    
  } catch (error) {
    console.error('Manual refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh locations' });
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
// ADMIN AUTHENTICATION
// ============================================

const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Helper: Generate session token
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Helper: Verify session token
async function verifySession(token) {
  if (!token) return null;
  
  const connection = await pool.getConnection();
  try {
    const [sessions] = await connection.query(
      `SELECT s.*, u.username, u.email, u.full_name 
       FROM admin_sessions s
       JOIN admin_users u ON u.id = s.admin_user_id
       WHERE s.session_token = ? AND s.expires_at > NOW() AND u.is_active = TRUE`,
      [token]
    );
    
    return sessions.length > 0 ? sessions[0] : null;
  } finally {
    connection.release();
  }
}

// Setup endpoint - creates default admin user (ONE TIME USE)
app.get('/api/admin/setup', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    // Check if any admin users exist
    const [existing] = await connection.query('SELECT COUNT(*) as count FROM admin_users');
    
    if (existing[0].count > 0) {
      return res.status(400).json({ 
        error: 'Setup already completed. Admin users already exist.',
        hint: 'If you forgot your password, manually reset it in the database.'
      });
    }
    
    // Create default admin user
    const password = 'admin123';
    const passwordHash = await bcrypt.hash(password, 10);
    
    await connection.query(
      `INSERT INTO admin_users (username, password_hash, email, full_name, is_active)
       VALUES (?, ?, ?, ?, TRUE)`,
      ['admin', passwordHash, 'admin@perfectpaddles.com', 'Admin User']
    );
    
    res.json({
      success: true,
      message: 'Default admin user created successfully!',
      username: 'admin',
      password: password,
      warning: 'Please change this password immediately after first login!'
    });
    
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ error: 'Setup failed: ' + error.message });
  } finally {
    connection.release();
  }
});

// Debug endpoint - check if user exists and bcrypt is working
app.get('/api/admin/debug', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    // Check if bcrypt is available
    let bcryptAvailable = false;
    let bcryptTest = null;
    try {
      const testHash = await bcrypt.hash('admin123', 10);
      const testVerify = await bcrypt.compare('admin123', testHash);
      bcryptAvailable = true;
      bcryptTest = { hash: testHash, verify: testVerify };
    } catch (e) {
      bcryptAvailable = false;
      bcryptTest = { error: e.message };
    }
    
    // Check admin users
    const [users] = await connection.query('SELECT id, username, password_hash, email, is_active, created_at FROM admin_users');
    
    // Test password against existing hash
    let passwordTests = [];
    for (const user of users) {
      try {
        const matches = await bcrypt.compare('admin123', user.password_hash);
        passwordTests.push({
          username: user.username,
          hash_starts_with: user.password_hash.substring(0, 20) + '...',
          password_admin123_matches: matches
        });
      } catch (e) {
        passwordTests.push({
          username: user.username,
          error: e.message
        });
      }
    }
    
    res.json({
      bcrypt_available: bcryptAvailable,
      bcrypt_test: bcryptTest,
      admin_users_count: users.length,
      password_tests: passwordTests,
      note: 'If password_admin123_matches is false, the hash is wrong'
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Fix endpoint - regenerate hash and update user
app.get('/api/admin/fix-password', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    // Generate correct hash
    const password = 'admin123';
    const correctHash = await bcrypt.hash(password, 10);
    
    // Update admin user
    const [result] = await connection.query(
      'UPDATE admin_users SET password_hash = ? WHERE username = ?',
      [correctHash, 'admin']
    );
    
    // Test it
    const [users] = await connection.query('SELECT password_hash FROM admin_users WHERE username = ?', ['admin']);
    const testMatch = await bcrypt.compare(password, users[0].password_hash);
    
    res.json({
      success: true,
      message: 'Password hash updated successfully!',
      rows_affected: result.affectedRows,
      password: password,
      test_match: testMatch,
      instruction: 'Now try logging in with admin/admin123'
    });
    
  } catch (error) {
    console.error('Fix password error:', error);
    res.status(500).json({ error: 'Failed to fix password: ' + error.message });
  } finally {
    connection.release();
  }
});

// Login endpoint
app.post('/api/admin/login', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    // Get user
    const [users] = await connection.query(
      'SELECT * FROM admin_users WHERE username = ? AND is_active = TRUE',
      [username]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = users[0];
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Create session
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    await connection.query(
      `INSERT INTO admin_sessions (admin_user_id, session_token, expires_at, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?)`,
      [user.id, sessionToken, expiresAt, req.ip, req.get('user-agent')]
    );
    
    // Update last login
    await connection.query(
      'UPDATE admin_users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );
    
    res.json({
      success: true,
      token: sessionToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  } finally {
    connection.release();
  }
});

// Logout endpoint
app.post('/api/admin/logout', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      await connection.query(
        'DELETE FROM admin_sessions WHERE session_token = ?',
        [token]
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  } finally {
    connection.release();
  }
});

// Verify session endpoint
app.get('/api/admin/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const session = await verifySession(token);
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }
    
    res.json({
      valid: true,
      user: {
        id: session.admin_user_id,
        username: session.username,
        email: session.email,
        full_name: session.full_name
      }
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ============================================
// ADMIN CRUD OPERATIONS
// ============================================

// Add customer
app.post('/api/admin/customers', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { company_name, website_url, contact_email, contact_name } = req.body;
    
    if (!company_name || !website_url || !contact_email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Generate API key
    const api_key = crypto.randomBytes(32).toString('hex');
    
    const [result] = await connection.query(
      `INSERT INTO customers (company_name, website_url, contact_email, contact_name, api_key, is_active)
       VALUES (?, ?, ?, ?, ?, TRUE)`,
      [company_name, website_url, contact_email, contact_name || null, api_key]
    );
    
    res.json({
      success: true,
      id: result.insertId,
      api_key: api_key
    });
    
  } catch (error) {
    console.error('Add customer error:', error);
    res.status(500).json({ error: 'Failed to add customer' });
  } finally {
    connection.release();
  }
});

// Update customer
app.put('/api/admin/customers/:id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const customerId = req.params.id;
    const { company_name, website_url, contact_email, contact_name, is_active } = req.body;
    
    if (!company_name) {
      return res.status(400).json({ error: 'Company name is required' });
    }
    
    const [result] = await connection.query(
      `UPDATE customers 
       SET company_name = ?, website_url = ?, contact_email = ?, contact_name = ?, is_active = ?
       WHERE id = ?`,
      [company_name, website_url || null, contact_email || null, contact_name || null, is_active ? 1 : 0, customerId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json({
      success: true,
      message: 'Customer updated successfully'
    });
    
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  } finally {
    connection.release();
  }
});

// Change password endpoint
app.post('/api/admin/change-password', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { current_password, new_password, confirm_password } = req.body;
    
    // Validate input
    if (!current_password || !new_password || !confirm_password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    if (new_password !== confirm_password) {
      return res.status(400).json({ error: 'New passwords do not match' });
    }
    
    if (new_password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    
    // Verify session and get user
    const session = await verifySession(token);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get current user
    const [users] = await connection.query(
      'SELECT * FROM admin_users WHERE id = ?',
      [session.admin_user_id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = users[0];
    
    // Verify current password
    const validPassword = await bcrypt.compare(current_password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password
    const newPasswordHash = await bcrypt.hash(new_password, 10);
    
    // Update password
    await connection.query(
      'UPDATE admin_users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [newPasswordHash, user.id]
    );
    
    // Invalidate all other sessions (keep current)
    await connection.query(
      'DELETE FROM admin_sessions WHERE admin_user_id = ? AND session_token != ?',
      [user.id, token]
    );
    
    res.json({
      success: true,
      message: 'Password changed successfully. Other sessions have been logged out.'
    });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  } finally {
    connection.release();
  }
});

// Add location
app.post('/api/admin/locations', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const {
      customer_id, location_name, water_body_name,
      city, state, zip_code, latitude, longitude, timezone
    } = req.body;
    
    if (!customer_id || !location_name || !latitude || !longitude) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const [result] = await connection.query(
      `INSERT INTO locations (
        customer_id, location_name, water_body_name,
        city, state, zip_code, latitude, longitude, timezone, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [customer_id, location_name, water_body_name, city, state, zip_code, 
       latitude, longitude, timezone || 'America/Los_Angeles']
    );
    
    // Add to refresh schedule
    await connection.query(
      `INSERT INTO refresh_schedule (location_id, next_refresh_at, refresh_interval_minutes)
       VALUES (?, NOW(), 10)`,
      [result.insertId]
    );
    
    res.json({
      success: true,
      id: result.insertId
    });
    
  } catch (error) {
    console.error('Add location error:', error);
    res.status(500).json({ error: 'Failed to add location' });
  } finally {
    connection.release();
  }
});

// Update location
app.put('/api/admin/locations/:id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const locationId = req.params.id;
    const {
      customer_id, location_name, water_body_name,
      city, state, zip_code, latitude, longitude, timezone, is_active
    } = req.body;
    
    if (!customer_id || !location_name || !latitude || !longitude) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const [result] = await connection.query(
      `UPDATE locations 
       SET customer_id = ?, location_name = ?, water_body_name = ?,
           city = ?, state = ?, zip_code = ?, latitude = ?, longitude = ?,
           timezone = ?, is_active = ?
       WHERE id = ?`,
      [customer_id, location_name, water_body_name || null, city || null, 
       state || null, zip_code || null, latitude, longitude, 
       timezone || 'America/Los_Angeles', is_active ? 1 : 0, locationId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    res.json({
      success: true,
      message: 'Location updated successfully'
    });
    
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ error: 'Failed to update location' });
  } finally {
    connection.release();
  }
});

// Update settings
app.post('/api/admin/settings', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const settings = req.body;
    
    // Update each setting
    for (const [key, value] of Object.entries(settings)) {
      await connection.query(
        `INSERT INTO system_config (config_key, config_value)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE config_value = ?`,
        [key, value, value]
      );
    }
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
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
