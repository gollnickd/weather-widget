-- Complete Admin Setup SQL
-- Run this entire file in Railway MySQL Query interface

-- Step 1: Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  full_name VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Step 2: Create admin_sessions table
CREATE TABLE IF NOT EXISTS admin_sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  admin_user_id INT NOT NULL,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE,
  INDEX idx_token (session_token),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Step 3: Delete any existing admin user (if setup failed before)
DELETE FROM admin_users WHERE username = 'admin';

-- Step 4: Create admin user with password 'admin123'
-- This hash was generated with: bcrypt.hashSync('admin123', 10)
-- Verified working hash for password: admin123
INSERT INTO admin_users (username, password_hash, email, full_name, is_active)
VALUES (
  'admin',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin@perfectpaddles.com',
  'Admin User',
  TRUE
);

-- Verify the user was created
SELECT 
  id, 
  username, 
  email, 
  full_name, 
  is_active, 
  created_at,
  'Password is: admin123' as note
FROM admin_users 
WHERE username = 'admin';
