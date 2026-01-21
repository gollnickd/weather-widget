# Testing & Development Guide

Complete guide for testing the Water Conditions Widget system locally and in production.

## Local Development Setup

### 1. Prerequisites Check

```bash
# Check Node.js version (need 18+)
node --version

# Check npm
npm --version

# Check MySQL
mysql --version

# Check if MySQL is running
sudo systemctl status mysql
```

### 2. Quick Local Setup

```bash
# Clone repository
git clone <repo-url>
cd water-conditions-widget

# Setup database
mysql -u root -p < database/schema.sql

# Setup backend
cd backend
cp .env.example .env
# Edit .env with your settings
npm install
npm run dev

# In another terminal, test API
curl http://localhost:3000/api/health
```

### 3. Get Free Weather API Key

1. Go to https://www.weatherapi.com/signup.aspx
2. Sign up for free account (1M calls/month)
3. Get API key from dashboard
4. Add to `.env`: `WEATHER_API_KEY=your_key`

## Testing Checklist

### Backend API Tests

#### Health Check
```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

#### Widget API Test
```bash
# First, get an API key from database
mysql -u root -p water_conditions_widget
SELECT api_key FROM customers LIMIT 1;

# Then test the endpoint
curl http://localhost:3000/api/widget/conditions/YOUR_API_KEY
```

Expected response:
```json
{
  "location": {
    "name": "Mother's Beach",
    "waterBody": "Marina del Rey",
    "city": "Marina del Rey",
    "state": "California"
  },
  "conditions": {
    "level": "beginner",
    "color": "#06A77D",
    "description": "Calm conditions...",
    "windSpeed": 7,
    "gustSpeed": 9,
    "temperature": 72,
    "weatherText": "Partly cloudy"
  },
  "lastUpdated": "2024-01-20T10:30:00Z",
  "nextUpdate": "2024-01-20T10:40:00Z"
}
```

### Frontend Widget Tests

#### 1. Test Script Embed

Create test HTML file:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Widget Test</title>
</head>
<body>
  <h1>Water Conditions Widget Test</h1>
  <div id="test-widget"></div>
  
  <script src="http://localhost:3000/widget.js"></script>
  <script>
    PPWaterWidget.init({
      containerId: 'test-widget',
      apiKey: 'YOUR_API_KEY_HERE',
      apiEndpoint: 'http://localhost:3000/api/widget/conditions'
    });
  </script>
</body>
</html>
```

Open in browser and verify:
- [ ] Widget loads without errors
- [ ] Displays location information
- [ ] Shows color-coded condition indicator
- [ ] Displays wind speed and temperature
- [ ] Shows last updated timestamp
- [ ] Perfect Paddles branding visible

#### 2. Test iFrame Embed

```html
<!DOCTYPE html>
<html>
<body>
  <h1>iFrame Widget Test</h1>
  <iframe 
    src="http://localhost:3000/widget-iframe.html?apiKey=YOUR_API_KEY"
    width="340"
    height="450"
    frameborder="0">
  </iframe>
</body>
</html>
```

Verify:
- [ ] Widget displays correctly in iframe
- [ ] No CORS errors in console
- [ ] Isolated from page styles
- [ ] Auto-refresh works

### Database Tests

#### Check Data Flow

```sql
USE water_conditions_widget;

-- 1. Verify customers exist
SELECT * FROM customers;

-- 2. Verify locations exist
SELECT * FROM locations;

-- 3. Check weather data is being fetched
SELECT * FROM weather_data ORDER BY fetched_at DESC LIMIT 5;

-- 4. Check refresh schedule is working
SELECT 
  l.location_name,
  rs.last_refresh_at,
  rs.next_refresh_at,
  rs.consecutive_failures,
  rs.is_enabled
FROM refresh_schedule rs
JOIN locations l ON l.id = rs.location_id;

-- 5. Check API logs
SELECT * FROM api_logs ORDER BY created_at DESC LIMIT 10;
```

#### Test Data Refresh

```sql
-- Trigger immediate refresh for a location
UPDATE refresh_schedule 
SET next_refresh_at = NOW() 
WHERE location_id = 1;

-- Wait 1-2 minutes, then check if data updated
SELECT * FROM weather_data 
WHERE location_id = 1 
ORDER BY fetched_at DESC 
LIMIT 1;
```

### Admin Dashboard Tests

1. Open `http://localhost:3000/admin/admin-dashboard.html`
2. Verify all tabs load:
   - [ ] Dashboard with statistics
   - [ ] Customers table
   - [ ] Locations table
   - [ ] Refresh schedule
   - [ ] API logs
   - [ ] Settings form

3. Test modals:
   - [ ] Add Customer modal opens
   - [ ] Add Location modal opens
   - [ ] Forms have all fields

### Performance Tests

#### Response Time Test

```bash
# Test API response time
time curl http://localhost:3000/api/widget/conditions/YOUR_API_KEY

# Should be under 100ms for cached data
# Should be under 2s for fresh fetch
```

#### Load Test with Apache Bench

```bash
# Install Apache Bench
sudo apt install apache2-utils

# Test 100 requests, 10 concurrent
ab -n 100 -c 10 http://localhost:3000/api/widget/conditions/YOUR_API_KEY

# Look for:
# - Requests per second > 50
# - Mean response time < 200ms
# - Zero failed requests
```

#### Database Performance

```sql
-- Check slow queries
SHOW FULL PROCESSLIST;

-- Check table sizes
SELECT 
  table_name, 
  round(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
FROM information_schema.TABLES 
WHERE table_schema = 'water_conditions_widget';

-- Analyze query performance
EXPLAIN SELECT * FROM weather_data 
WHERE location_id = 1 
ORDER BY fetched_at DESC 
LIMIT 1;
```

## Integration Tests

### Test with Real Website

1. Deploy to staging server
2. Add widget to test page
3. Verify from multiple devices:
   - [ ] Desktop Chrome
   - [ ] Desktop Firefox
   - [ ] Desktop Safari
   - [ ] Mobile Safari (iOS)
   - [ ] Mobile Chrome (Android)
   - [ ] Tablet

### Test Different Conditions

Manually update weather data to test all condition levels:

```sql
-- Test BEGINNER conditions
UPDATE weather_data 
SET wind_speed_mph = 7, 
    wind_gust_mph = 9,
    condition_level = 'beginner'
WHERE location_id = 1 
ORDER BY fetched_at DESC 
LIMIT 1;

-- Test INTERMEDIATE conditions
UPDATE weather_data 
SET wind_speed_mph = 15, 
    wind_gust_mph = 18,
    condition_level = 'intermediate'
WHERE location_id = 1 
ORDER BY fetched_at DESC 
LIMIT 1;

-- Test ADVANCED conditions
UPDATE weather_data 
SET wind_speed_mph = 22, 
    wind_gust_mph = 28,
    condition_level = 'advanced'
WHERE location_id = 1 
ORDER BY fetched_at DESC 
LIMIT 1;
```

Verify widget displays:
- [ ] Green for beginner
- [ ] Orange for intermediate
- [ ] Red for advanced

## Error Handling Tests

### Test Invalid API Key

```bash
curl http://localhost:3000/api/widget/conditions/invalid_key
```

Should return 404 error.

### Test Network Failure

Stop backend server and verify widget shows error message gracefully.

### Test Database Connection Loss

```bash
# Stop MySQL temporarily
sudo systemctl stop mysql

# Check logs
pm2 logs water-widget

# Restart MySQL
sudo systemctl start mysql
```

### Test Weather API Failure

Use invalid weather API key in .env and verify error handling.

## Common Issues & Solutions

### Issue: Widget Not Loading

**Check:**
1. Backend server is running: `pm2 status`
2. No CORS errors in browser console
3. API endpoint is correct
4. API key is valid

**Solution:**
```bash
# Restart backend
pm2 restart water-widget

# Check logs
pm2 logs water-widget --lines 50
```

### Issue: No Weather Data

**Check:**
1. Weather API key is valid
2. Refresh schedule is enabled
3. Location coordinates are correct

**Solution:**
```sql
-- Check refresh schedule
SELECT * FROM refresh_schedule WHERE is_enabled = FALSE;

-- Enable if disabled
UPDATE refresh_schedule SET is_enabled = TRUE WHERE location_id = 1;

-- Force refresh
UPDATE refresh_schedule SET next_refresh_at = NOW() WHERE location_id = 1;
```

### Issue: Incorrect Conditions

**Check:**
1. Wind thresholds in system_config
2. Weather data is recent
3. Calculation logic in backend

**Solution:**
```sql
-- Check thresholds
SELECT * FROM system_config WHERE config_key LIKE '%wind%';

-- Adjust if needed
UPDATE system_config SET config_value = '12' WHERE config_key = 'beginner_wind_max';
```

## Development Workflow

### Making Changes

1. **Backend Changes:**
```bash
# Edit code
nano backend/server.js

# Restart server
pm2 restart water-widget

# Watch logs
pm2 logs water-widget
```

2. **Frontend Changes:**
```bash
# Edit widget
nano frontend/widget.js

# Clear browser cache
# Reload page
```

3. **Database Changes:**
```bash
# Edit schema
nano database/schema.sql

# Apply changes
mysql -u root -p water_conditions_widget < database/schema.sql
```

### Version Control

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "Add new feature"

# Push to remote
git push origin feature/new-feature

# Create pull request
```

## Production Testing

Before deploying to production:

- [ ] All unit tests pass
- [ ] Load tests show acceptable performance
- [ ] Error handling works correctly
- [ ] Widget displays on all browsers/devices
- [ ] Admin dashboard functions properly
- [ ] Database backups are configured
- [ ] Monitoring is set up
- [ ] SSL certificate is valid
- [ ] API rate limiting works
- [ ] Logs are rotating properly

## Monitoring in Production

### Check System Health

```bash
# Server status
pm2 status

# CPU/Memory usage
pm2 monit

# Recent errors
pm2 logs water-widget --err --lines 20

# Database connections
mysql -u root -p -e "SHOW PROCESSLIST;"

# Nginx access
sudo tail -f /var/log/nginx/water-widget-access.log
```

### Performance Metrics

```sql
-- API response times
SELECT 
  DATE(created_at) as date,
  AVG(response_time_ms) as avg_response_ms,
  MAX(response_time_ms) as max_response_ms,
  COUNT(*) as requests
FROM api_logs
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(created_at);

-- Refresh success rate
SELECT 
  COUNT(*) as total_locations,
  SUM(CASE WHEN consecutive_failures = 0 THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN consecutive_failures > 0 THEN 1 ELSE 0 END) as failing
FROM refresh_schedule;
```

## Support & Documentation

- Report bugs: GitHub Issues
- Feature requests: GitHub Discussions
- Email support: support@perfectpaddles.com
- Documentation: README.md and DEPLOYMENT.md

---

**Happy Testing! 🌊**
