# Production Deployment Guide

This guide covers deploying the Water Conditions Widget system to a production environment.

## Server Requirements

### Minimum Specifications
- **OS**: Ubuntu 20.04+ or CentOS 8+
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **Node.js**: 18.x or higher
- **MySQL**: 8.0+
- **Ports**: 80, 443, 3000

### Recommended for High Traffic
- **CPU**: 4+ cores
- **RAM**: 8GB+
- **Storage**: 50GB+ SSD
- **Load Balancer**: Nginx or HAProxy
- **Database**: Separate dedicated MySQL server

## Step-by-Step Deployment

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Install nginx
sudo apt install -y nginx

# Install PM2 for process management
sudo npm install -g pm2
```

### 2. Create Application User

```bash
# Create dedicated user
sudo useradd -m -s /bin/bash waterwidget
sudo usermod -aG sudo waterwidget

# Switch to user
sudo su - waterwidget
```

### 3. Deploy Application

```bash
# Clone or upload your code
cd /home/waterwidget
git clone <your-repo-url> water-conditions-widget
cd water-conditions-widget/backend

# Install dependencies
npm install --production

# Create .env file
cp .env.example .env
nano .env
```

**Configure .env:**
```bash
PORT=3000
NODE_ENV=production

# Database
DB_HOST=localhost
DB_USER=waterwidget_user
DB_PASSWORD=strong_password_here
DB_NAME=water_conditions_widget

# Weather API
WEATHER_API_KEY=your_weatherapi_key

# API Configuration
CACHE_EXPIRY_MINUTES=15
REFRESH_INTERVAL_MINUTES=10

# Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=very_strong_password
```

### 4. Setup MySQL Database

```bash
# Login to MySQL
sudo mysql -u root -p
```

```sql
-- Create database user
CREATE USER 'waterwidget_user'@'localhost' IDENTIFIED BY 'strong_password_here';

-- Create database
CREATE DATABASE water_conditions_widget;

-- Grant permissions
GRANT ALL PRIVILEGES ON water_conditions_widget.* TO 'waterwidget_user'@'localhost';
FLUSH PRIVILEGES;

-- Exit
EXIT;
```

```bash
# Import schema
mysql -u waterwidget_user -p water_conditions_widget < ../database/schema.sql
```

### 5. Configure PM2

```bash
cd /home/waterwidget/water-conditions-widget/backend

# Start application with PM2
pm2 start server.js --name water-widget

# Configure PM2 to start on boot
pm2 startup
# Run the command that PM2 outputs

# Save PM2 configuration
pm2 save

# Monitor logs
pm2 logs water-widget

# Check status
pm2 status
```

### 6. Configure Nginx as Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/water-widget
```

**Nginx Configuration:**
```nginx
# HTTP - Redirect to HTTPS
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration (update paths after obtaining certificate)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # API Backend
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static Files (Widget JS)
    location /widget.js {
        alias /home/waterwidget/water-conditions-widget/frontend/widget.js;
        expires 1h;
        add_header Cache-Control "public, max-age=3600";
        add_header Access-Control-Allow-Origin "*";
    }

    # Widget iFrame
    location /widget-iframe.html {
        alias /home/waterwidget/water-conditions-widget/frontend/widget.html;
        expires 10m;
        add_header Cache-Control "public, max-age=600";
        add_header X-Frame-Options "ALLOWALL";
    }

    # Admin Dashboard
    location /admin/ {
        alias /home/waterwidget/water-conditions-widget/admin/;
        index admin-dashboard.html;
        
        # Optional: Add basic auth
        # auth_basic "Admin Area";
        # auth_basic_user_file /etc/nginx/.htpasswd;
    }

    # Security Headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Logging
    access_log /var/log/nginx/water-widget-access.log;
    error_log /var/log/nginx/water-widget-error.log;
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/water-widget /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### 7. Setup SSL with Let's Encrypt

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### 8. Configure Firewall

```bash
# Install UFW if not present
sudo apt install -y ufw

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https

# Enable firewall
sudo ufw enable
sudo ufw status
```

### 9. Setup Monitoring

```bash
# Install monitoring tools
npm install -g pm2-logrotate

# Configure log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# Setup system monitoring
pm2 install pm2-server-monit
```

### 10. Database Backups

Create backup script:

```bash
sudo nano /usr/local/bin/backup-water-widget.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/water-widget"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="water_conditions_widget"
DB_USER="waterwidget_user"
DB_PASS="your_password"

mkdir -p $BACKUP_DIR

# Backup database
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/backup-water-widget.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
# Add line:
0 2 * * * /usr/local/bin/backup-water-widget.sh
```

## Performance Optimization

### MySQL Optimization

Edit `/etc/mysql/mysql.conf.d/mysqld.cnf`:

```ini
[mysqld]
# Connection settings
max_connections = 200
wait_timeout = 300

# Buffer settings
innodb_buffer_pool_size = 2G
innodb_log_file_size = 256M
innodb_flush_log_at_trx_commit = 2

# Query cache
query_cache_type = 1
query_cache_size = 64M
query_cache_limit = 2M
```

```bash
sudo systemctl restart mysql
```

### Node.js Clustering

Update PM2 configuration for clustering:

```bash
pm2 delete water-widget
pm2 start server.js --name water-widget -i max
pm2 save
```

### Enable Caching

Add Redis for caching (optional):

```bash
sudo apt install -y redis-server
sudo systemctl enable redis-server
```

## Monitoring & Maintenance

### Health Checks

Add to crontab:

```bash
*/5 * * * * curl -f http://localhost:3000/api/health || echo "API Down" | mail -s "Water Widget Alert" admin@yourdomain.com
```

### View Logs

```bash
# Application logs
pm2 logs water-widget

# Nginx logs
sudo tail -f /var/log/nginx/water-widget-access.log
sudo tail -f /var/log/nginx/water-widget-error.log

# System logs
journalctl -u nginx -f
```

### Update Application

```bash
cd /home/waterwidget/water-conditions-widget
git pull origin main
cd backend
npm install --production
pm2 restart water-widget
```

## Scaling Considerations

### Load Balancing

For high traffic, deploy multiple backend servers:

1. Setup additional servers following steps 1-5
2. Configure nginx as load balancer:

```nginx
upstream water_widget_backend {
    least_conn;
    server 10.0.0.1:3000;
    server 10.0.0.2:3000;
    server 10.0.0.3:3000;
}

server {
    location /api/ {
        proxy_pass http://water_widget_backend;
        # ... other proxy settings
    }
}
```

### Database Replication

Setup MySQL master-slave replication for read scaling.

### CDN Integration

Use Cloudflare or AWS CloudFront for:
- Widget JavaScript file
- Static assets
- API caching for widget endpoint

## Security Checklist

- [ ] Strong passwords for all accounts
- [ ] SSL certificate installed and auto-renewal working
- [ ] Firewall configured (UFW)
- [ ] Database user has minimal permissions
- [ ] Regular security updates applied
- [ ] Backup system tested
- [ ] Monitoring alerts configured
- [ ] Rate limiting enabled
- [ ] API keys properly secured
- [ ] Admin dashboard protected (basic auth or IP whitelist)

## Troubleshooting

### Service Won't Start

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs water-widget --lines 100

# Restart
pm2 restart water-widget
```

### High CPU Usage

```bash
# Check process
pm2 monit

# Review database queries
mysql -u waterwidget_user -p
SHOW PROCESSLIST;
```

### Database Connection Issues

```bash
# Test connection
mysql -u waterwidget_user -p water_conditions_widget

# Check MySQL status
sudo systemctl status mysql

# Review MySQL logs
sudo tail -f /var/log/mysql/error.log
```

## Support & Resources

- PM2 Documentation: https://pm2.keymetrics.io/
- Nginx Documentation: https://nginx.org/en/docs/
- MySQL Documentation: https://dev.mysql.com/doc/
- Let's Encrypt: https://letsencrypt.org/

---

**Deployment completed! Your Water Conditions Widget is now live.**
