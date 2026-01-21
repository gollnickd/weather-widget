# Water Conditions Widget System

A comprehensive, production-ready widget system for displaying real-time water and wind conditions for watersports businesses. Features Perfect Paddles branding, automatic 10-minute refresh cycles, and robust backend infrastructure.

## 🌊 Features

- **Real-time Weather Data**: Automatic fetching and display of wind, temperature, and water conditions
- **Color-Coded Indicators**: 
  - 🟢 Green (Beginner): Wind < 10 mph
  - 🟠 Orange (Intermediate): Wind 10-18 mph
  - 🔴 Red (Advanced): Wind > 18 mph
- **Auto-Refresh**: Updates every 10 minutes with timestamp display
- **Multiple Installation Methods**: Script tag, iframe, and WordPress plugin
- **Admin Dashboard**: Full management interface for customers, locations, and monitoring
- **Performance Optimized**: Cached data, rate limiting, and efficient database queries
- **Scalable Architecture**: Built to handle hundreds of customer locations

## 📦 System Architecture

```
water-conditions-widget/
├── backend/              # Node.js/Express API server
│   ├── server.js        # Main server with weather fetching and API
│   ├── package.json     # Dependencies
│   └── .env.example     # Configuration template
├── database/            # MySQL schema and setup
│   └── schema.sql       # Complete database structure
├── frontend/            # Widget client code
│   ├── widget.html      # Standalone widget demo
│   └── widget.js        # Embeddable widget library
├── admin/               # Admin dashboard
│   ├── admin-dashboard.html
│   └── admin-dashboard.js
└── install-methods/     # Installation guides
    ├── simple-embed.html
    ├── iframe-embed.html
    └── wordpress-plugin/
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- MySQL 8.0+
- WeatherAPI.com free account (1M calls/month)

### 1. Database Setup

```bash
# Create database and tables
mysql -u root -p < database/schema.sql

# Verify setup
mysql -u root -p water_conditions_widget
SHOW TABLES;
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env  # Edit with your settings

# Required .env settings:
# - DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
# - WEATHER_API_KEY (from weatherapi.com)

# Start server
npm start

# Or use nodemon for development
npm run dev
```

The API server will start on `http://localhost:3000`

### 3. Get API Key for Weather Data

1. Sign up at https://www.weatherapi.com/signup.aspx (FREE)
2. Get your API key from the dashboard
3. Add to `.env` file: `WEATHER_API_KEY=your_key_here`
4. Update database: 
   ```sql
   UPDATE system_config 
   SET config_value = 'your_key_here' 
   WHERE config_key = 'weather_api_key';
   ```

### 4. Create First Customer

```sql
USE water_conditions_widget;

INSERT INTO customers (company_name, website_url, contact_email, api_key) 
VALUES (
  'Your Company', 
  'https://yoursite.com', 
  'you@yoursite.com',
  SHA2(CONCAT('your-company-', NOW()), 256)
);

-- Get the API key to use in widget
SELECT api_key FROM customers ORDER BY id DESC LIMIT 1;
```

### 5. Add Location

```sql
INSERT INTO locations 
  (customer_id, location_name, water_body_name, city, state, 
   zip_code, latitude, longitude, timezone) 
VALUES 
  (1, 'Mother\'s Beach', 'Marina del Rey', 'Marina del Rey', 
   'California', '90292', 33.9806, -118.4517, 'America/Los_Angeles');

-- Create refresh schedule
INSERT INTO refresh_schedule (location_id, next_refresh_at) 
VALUES (LAST_INSERT_ID(), NOW());
```

## 📝 Installation Methods

### Method 1: Simple Script Embed (Recommended)

Add to your HTML:

```html
<!-- 1. Add container -->
<div id="pp-water-widget"></div>

<!-- 2. Load widget script -->
<script src="https://your-domain.com/widget.js"></script>

<!-- 3. Initialize with your API key -->
<script>
  PPWaterWidget.init({
    containerId: 'pp-water-widget',
    apiKey: 'YOUR_API_KEY_HERE'
  });
</script>
```

### Method 2: iFrame Embed

Perfect for site builders (Wix, Squarespace, etc.):

```html
<iframe 
  src="https://your-domain.com/widget-iframe.html?apiKey=YOUR_API_KEY_HERE"
  width="340"
  height="450"
  frameborder="0"
  style="border: none;">
</iframe>
```

### Method 3: WordPress Plugin

1. Copy `install-methods/wordpress-plugin/` to `wp-content/plugins/pp-water-widget/`
2. Activate in WordPress admin → Plugins
3. Configure at Settings → Water Conditions Widget
4. Use shortcode: `[pp_water_widget]`

## 🎛️ Admin Dashboard

Access the admin dashboard at `http://your-domain.com/admin/`

Features:
- **Dashboard**: Real-time statistics and system status
- **Customers**: Manage customer accounts and API keys
- **Locations**: Add/edit locations with coordinates
- **Refresh Schedule**: Monitor and control data refresh cycles
- **API Logs**: Track widget usage and performance
- **Settings**: Configure thresholds and system parameters

## 🔧 Configuration

### Weather Thresholds

Edit in database or admin dashboard:

```sql
UPDATE system_config SET config_value = '10' 
WHERE config_key = 'beginner_wind_max';

UPDATE system_config SET config_value = '18' 
WHERE config_key = 'intermediate_wind_max';
```

### Refresh Interval

Default: 10 minutes. Change per location:

```sql
UPDATE refresh_schedule 
SET refresh_interval_minutes = 15 
WHERE location_id = 1;
```

## 📊 Database Schema

### Key Tables

- **customers**: Customer accounts with API keys
- **locations**: Geographic locations with coordinates
- **weather_data**: Cached weather information
- **refresh_schedule**: Controls automatic data updates
- **api_logs**: Request tracking and analytics
- **system_config**: Global settings

## 🚦 API Endpoints

### Widget API

```
GET /api/widget/conditions/:apiKey
```

Returns current conditions for the customer's location:

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
    "description": "Calm conditions - Light winds and smooth water...",
    "windSpeed": 7,
    "gustSpeed": 9,
    "temperature": 72,
    "weatherText": "Partly cloudy"
  },
  "lastUpdated": "2024-01-20T10:30:00Z",
  "nextUpdate": "2024-01-20T10:40:00Z"
}
```

### Admin API (Future)

- `POST /api/admin/customers` - Create customer
- `GET /api/admin/locations` - List all locations
- `POST /api/admin/locations/:id/refresh` - Force refresh
- `GET /api/admin/logs` - Get API logs

## 🔐 Security

- API keys use SHA-256 hashing
- Rate limiting: 100 requests/minute per IP
- Input validation on all endpoints
- SQL injection protection via parameterized queries
- CORS configured for approved domains only

## 📈 Monitoring

The system logs:
- All API requests with response times
- Weather fetch failures
- Refresh schedule status
- Customer usage patterns

View in admin dashboard or query directly:

```sql
-- Recent API activity
SELECT * FROM api_logs 
ORDER BY created_at DESC 
LIMIT 100;

-- Failed refreshes
SELECT * FROM refresh_schedule 
WHERE consecutive_failures > 0;
```

## 🐛 Troubleshooting

### Widget Not Loading

1. Check browser console for errors
2. Verify API key is correct
3. Ensure backend server is running
4. Check CORS settings if different domain

### No Weather Data

1. Verify WeatherAPI.com key is valid
2. Check refresh_schedule table
3. Look for errors in api_logs
4. Ensure coordinates are correct

### Database Connection Issues

1. Verify MySQL credentials in .env
2. Check if database exists
3. Ensure MySQL service is running
4. Test connection: `mysql -u root -p water_conditions_widget`

## 🌐 Production Deployment

### Backend

1. Use process manager (PM2):
   ```bash
   npm install -g pm2
   pm2 start backend/server.js --name water-widget
   pm2 save
   pm2 startup
   ```

2. Set up nginx reverse proxy
3. Enable SSL certificate
4. Configure environment variables
5. Set up database backups

### Frontend

1. Upload widget.js to CDN
2. Update API endpoint in widget
3. Configure CORS on backend
4. Enable caching headers

## 📞 Support

- Email: support@perfectpaddles.com
- Documentation: https://perfectpaddles.com/widget-docs
- GitHub Issues: [Report bugs]

## 📄 License

Copyright © 2024 Perfect Paddles. All rights reserved.

## 🎨 Customization

To match your branding:

1. Edit colors in `frontend/widget.js`
2. Replace logo/branding text
3. Adjust size/layout in CSS
4. Modify condition thresholds in backend

## 🔄 Updates

Check for updates regularly:

```bash
cd water-conditions-widget
git pull origin main
npm install
pm2 restart water-widget
```

---

**Built with ❤️ for the watersports community by Perfect Paddles**
