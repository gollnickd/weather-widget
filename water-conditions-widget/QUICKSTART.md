# Quick Start Guide
## Perfect Paddles Water Conditions Widget

Get up and running in 15 minutes!

---

## Prerequisites

- Web server with PHP 7.4+ and MySQL 8.0+
- OpenWeatherMap API key (free at https://openweathermap.org/api)
- SSH/FTP access to your server

---

## Step 1: Database Setup (2 minutes)

```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE water_conditions_widget;
CREATE USER 'widget_user'@'localhost' IDENTIFIED BY 'YourSecurePassword123';
GRANT ALL PRIVILEGES ON water_conditions_widget.* TO 'widget_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Import schema
mysql -u widget_user -p water_conditions_widget < database/schema.sql
```

---

## Step 2: Configure Backend (3 minutes)

Edit `backend/config.php`:

```php
// Line 9-12: Update database credentials
define('DB_HOST', 'localhost');
define('DB_NAME', 'water_conditions_widget');
define('DB_USER', 'widget_user');
define('DB_PASS', 'YourSecurePassword123');

// Line 16: Add your OpenWeather API key
define('OPENWEATHER_API_KEY', 'your_openweather_api_key');

// Line 73: In production, set this to false
define('DEBUG_MODE', false);
```

---

## Step 3: Upload Files (2 minutes)

Upload entire directory to your web server:

```
/var/www/html/water-widget/
├── backend/
├── widget/
├── admin/
└── database/
```

Set permissions:
```bash
chmod -R 755 /var/www/html/water-widget
chmod 755 /var/www/html/water-widget/backend/cron
```

---

## Step 4: Setup Cron Job (2 minutes)

```bash
crontab -e

# Add this line (update path):
*/10 * * * * /usr/bin/php /var/www/html/water-widget/backend/cron/cron_refresh.php >> /var/www/html/water-widget/logs/cron.log 2>&1
```

---

## Step 5: Test Installation (3 minutes)

### Test Database Connection

Visit: `https://your-domain.com/water-widget/backend/api/widget.php`

You should see:
```json
{"error":"API key required"}
```
✅ This means the API is working!

### Test Initial Data Refresh

Run manually:
```bash
php /var/www/html/water-widget/backend/cron/cron_refresh.php
```

You should see:
```
[2026-01-20 14:30:00] Starting weather data refresh...
[2026-01-20 14:30:02] Refresh completed:
  Total locations: 1
  Successfully updated: 1
  Failed: 0
  Execution time: 1523ms
```

---

## Step 6: Access Admin Dashboard (1 minute)

Visit: `https://your-domain.com/water-widget/admin/`

**Login:**
- Username: `admin`
- Password: `admin123`

⚠️ **IMMEDIATELY** change password in database:
```sql
UPDATE admin_users 
SET password_hash = PASSWORD('YourNewSecurePassword') 
WHERE username = 'admin';
```

---

## Step 7: Add Your First Location (2 minutes)

In admin dashboard:

1. Go to "Locations" tab
2. Click "+ Add Location"
3. Fill in:
   - Customer: Perfect Paddles (already exists)
   - Location Name: Your beach name
   - Body of Water: Your water body
   - City, State, Zip
   - **Latitude and Longitude** (get from Google Maps)
   - Water Type
4. Click "Create Location"

Note the **Location ID** (shown in table) - you'll need this!

---

## Step 8: Get Your API Key

In admin dashboard:

1. Go to "Customers" tab
2. Find "Perfect Paddles" customer
3. Copy the API Key (looks like: `pp_test_key_1234567890abcdef`)

---

## Step 9: Test Widget (1 minute)

Create `test.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Widget Test</title>
</head>
<body>
    <h1>Widget Test</h1>
    
    <div id="pp-water-widget" 
         data-pp-widget 
         data-api-key="pp_test_key_1234567890abcdef" 
         data-location-id="1">
    </div>
    
    <script src="https://your-domain.com/water-widget/widget/water-conditions-widget.js"></script>
</body>
</html>
```

Replace:
- `your-domain.com` with your actual domain
- `pp_test_key_1234567890abcdef` with your API key
- `1` with your location ID

Open in browser - you should see the widget with current conditions! 🎉

---

## Troubleshooting

### Widget shows "Loading..." forever

1. Open browser console (F12)
2. Check for errors
3. Verify API endpoint URL is correct
4. Check CORS is enabled on server

### "No weather data available"

1. Check cron job ran: `cat /var/www/html/water-widget/logs/cron.log`
2. Verify OpenWeather API key is valid
3. Check coordinates are correct (latitude/longitude)

### Can't access admin dashboard

1. Check admin user exists: `SELECT * FROM admin_users;`
2. Verify session is enabled in PHP: `php -i | grep session`
3. Check file permissions

---

## Next Steps

1. **Add more customers** in admin dashboard
2. **Add more locations** for each customer
3. **Customize thresholds** in `backend/config.php`
4. **Set up monitoring** for cron job
5. **Configure backups** for database

---

## Production Checklist

Before going live:

- [ ] Change default admin password
- [ ] Set `DEBUG_MODE` to `false` in config.php
- [ ] Enable HTTPS
- [ ] Configure proper CORS for specific domains
- [ ] Set up automated database backups
- [ ] Configure error email alerts
- [ ] Test widget on actual customer sites
- [ ] Monitor cron job logs for first 24 hours
- [ ] Review security headers
- [ ] Test mobile responsiveness

---

## Support

Need help? Contact support@perfectpaddles.com

---

**Congratulations!** Your water conditions widget system is now live! 🌊🏄‍♂️
