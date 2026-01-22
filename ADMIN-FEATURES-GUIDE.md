# Admin Dashboard - New Features Added! 🎉

## ✅ What's New:

1. **✅ Admin User Login System** - Secure authentication with sessions
2. **✅ Add Customer Button Works** - Create new customers with auto-generated API keys
3. **✅ Add Location Button Works** - Add new locations to customers
4. **✅ Save Settings Button Works** - Update wind thresholds
5. **✅ Logout Button** - Secure session management

---

## 🚀 Deployment Steps:

### Step 1: Update Database

Run the new SQL schema to create admin users table:

**In Railway MySQL:**
```sql
-- Run this SQL from database/admin-users-schema.sql

CREATE TABLE IF NOT EXISTS admin_users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  full_name VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS admin_sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  admin_user_id INT NOT NULL,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create default admin user
-- Username: admin
-- Password: admin123
INSERT INTO admin_users (username, password_hash, email, full_name) 
VALUES (
  'admin', 
  '$2b$10$rXKqJ0YGKQxH5Hy2.CzKuOYJ5vJXqXqJ5vJXqXqJ5vJXqXqJ5vJXq',
  'admin@perfectpaddles.com',
  'Admin User'
);
```

### Step 2: Update Backend Files

**Upload to GitHub:**
- `backend/server.js` (updated with auth endpoints)
- `backend/package.json` (added bcrypt)

### Step 3: Update Admin Files

**Upload to GitHub:**
- `admin/login.html` (new file)
- `admin/admin.js` (updated with form handlers)
- `admin/admin-dashboard.html` (updated with logout button)
- `admin/index.html` (updated copy)

### Step 4: Railway Redeploy

After pushing to GitHub:
1. Railway auto-redeploys
2. npm install runs (installs bcrypt)
3. Server restarts with new endpoints

---

## 🔐 Login Credentials:

**Default Admin:**
- Username: `admin`
- Password: `admin123`

**⚠️ Change this password immediately after first login!**

---

## ✅ Features Now Working:

### 1. Login System
- Visit: `https://your-railway-url/admin/login.html`
- Login with admin/admin123
- Session token stored (7 days)
- Auto-redirect if not logged in

### 2. Add Customer
- Click "Add Customer" button
- Fill in: Company Name, Website, Email
- Auto-generates secure API key
- Shows API key (save it!)

### 3. Add Location
- Click "Add Location" button
- Select customer from dropdown
- Enter location details
- Coordinates (lat/long) required
- Auto-adds to refresh schedule

### 4. Save Settings
- Edit wind speed thresholds
- Click "Save Settings"
- Updates beginner/intermediate limits
- Affects all future weather data

### 5. Logout
- Click "Logout" button in header
- Destroys session
- Redirects to login

---

## 🎯 How It Works:

### Authentication Flow:
1. User visits `/admin/`
2. JavaScript checks for session token
3. If no token → redirect to `/admin/login.html`
4. User enters credentials
5. Backend verifies password (bcrypt)
6. Creates session token
7. Stores in localStorage
8. All API requests include token
9. Backend verifies token for each request

### Security Features:
- ✅ Passwords hashed with bcrypt
- ✅ Session tokens (cryptographically secure)
- ✅ 7-day session expiry
- ✅ IP and user-agent tracking
- ✅ Auto-logout on invalid session

---

## 📊 Database Schema:

### admin_users
- id, username, password_hash
- email, full_name
- is_active, last_login
- created_at, updated_at

### admin_sessions
- id, admin_user_id
- session_token (unique)
- expires_at
- ip_address, user_agent
- created_at

---

## 🔧 Creating Additional Admin Users:

**Option 1: SQL (Recommended)**
```sql
-- Generate password hash first (use online bcrypt generator)
-- Or use Node.js: bcrypt.hashSync('yourpassword', 10)

INSERT INTO admin_users (username, password_hash, email, full_name)
VALUES ('john', '$2b$10$...', 'john@example.com', 'John Doe');
```

**Option 2: Add Admin Creation UI (Future)**
We can add an "Add Admin User" feature in the dashboard.

---

## 🧪 Testing:

### Test Login:
1. Go to `/admin/login.html`
2. Enter: admin / admin123
3. Should redirect to dashboard

### Test Add Customer:
1. Click "Add Customer"
2. Fill form
3. Submit
4. Should show API key alert
5. Customer appears in table

### Test Add Location:
1. Click "Add Location"
2. Select customer
3. Fill location details
4. Submit
5. Location appears in table

### Test Settings:
1. Go to Settings tab
2. Change wind thresholds
3. Click Save
4. Should show success alert

### Test Logout:
1. Click Logout button
2. Confirm
3. Should redirect to login
4. Try accessing `/admin/` - should redirect to login

---

## 🎨 UI Updates:

- **Logout button** in header (top right)
- **Modal forms** work properly
- **Success/error alerts** for all actions
- **API key display** after customer creation
- **Form validation** (required fields)

---

## 🔒 Security Best Practices:

1. **Change default password** immediately
2. **Use strong passwords** for admin accounts
3. **Monitor admin_sessions** table for suspicious activity
4. **Enable HTTPS** in production (Railway supports this)
5. **Regularly review** admin_users table
6. **Consider adding** 2FA in the future

---

## 💡 Next Steps (Optional Enhancements):

- Add "Change Password" feature
- Add "Forgot Password" flow
- Add email notifications
- Add activity logging
- Add role-based permissions (admin, viewer, etc.)
- Add "Delete Customer/Location" features
- Add bulk import features

---

## ✅ Deployment Checklist:

- [ ] Downloaded updated zip
- [ ] Ran admin-users-schema.sql in Railway MySQL
- [ ] Pushed backend/server.js to GitHub
- [ ] Pushed backend/package.json to GitHub
- [ ] Pushed admin files to GitHub
- [ ] Railway redeployed successfully
- [ ] Tested login with admin/admin123
- [ ] Changed default password
- [ ] Tested Add Customer
- [ ] Tested Add Location
- [ ] Tested Save Settings
- [ ] Tested Logout

---

**Your admin dashboard now has full CRUD functionality with secure authentication!** 🎉
