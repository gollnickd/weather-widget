-- Customer Messages Feature Schema

-- Table to store customer messages
CREATE TABLE IF NOT EXISTS customer_messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  customer_id INT NOT NULL,
  location_id INT NULL COMMENT 'Optional: specific location, NULL = all locations',
  
  -- Message content
  message_type ENUM('quick_post', 'custom') NOT NULL DEFAULT 'quick_post',
  quick_post_template VARCHAR(100) NULL COMMENT 'Template name if quick post',
  message_text VARCHAR(255) NOT NULL COMMENT 'Message to display',
  
  -- Call to action
  cta_type ENUM('phone', 'url', 'none') NOT NULL DEFAULT 'none',
  cta_value VARCHAR(255) NULL COMMENT 'Phone number or URL',
  
  -- Expiration
  expires_at DATETIME NOT NULL COMMENT 'When message auto-expires',
  expire_type ENUM('minutes', 'hours', 'end_of_day') NOT NULL DEFAULT 'end_of_day',
  expire_duration INT NULL COMMENT 'Number of minutes/hours if not end_of_day',
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_expired BOOLEAN DEFAULT FALSE,
  
  -- Tracking
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by_ip VARCHAR(45) NULL,
  view_count INT DEFAULT 0 COMMENT 'How many times message was shown',
  click_count INT DEFAULT 0 COMMENT 'How many times CTA was clicked',
  
  -- Indexes
  INDEX idx_customer_active (customer_id, is_active, is_expired),
  INDEX idx_location_active (location_id, is_active, is_expired),
  INDEX idx_expires_at (expires_at),
  
  -- Foreign keys
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Quick post templates (preset messages)
CREATE TABLE IF NOT EXISTS message_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  template_name VARCHAR(100) NOT NULL UNIQUE,
  message_text VARCHAR(255) NOT NULL,
  is_default BOOLEAN DEFAULT TRUE COMMENT 'Available to all customers',
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default quick post templates
INSERT INTO message_templates (template_name, message_text, display_order) VALUES
('last_minute_opening', 'Last-minute opening today!', 1),
('beginner_lesson', 'Beginner-friendly lesson in protected water', 2),
('wind_update', 'Wind picked up—call us for best session time', 3),
('bogo_tuesday', 'BOGO Tuesday today!', 4),
('one_spot_left', '1 spot left—call now!', 5),
('calm_conditions', 'Perfect calm conditions today!', 6),
('lesson_available', 'Drop-in lessons available now', 7),
('group_discount', 'Group discount today only', 8);

-- View for active messages (easier querying)
CREATE OR REPLACE VIEW active_customer_messages AS
SELECT 
  cm.*,
  c.company_name,
  c.api_key,
  l.location_name
FROM customer_messages cm
JOIN customers c ON c.id = cm.customer_id
LEFT JOIN locations l ON l.id = cm.location_id
WHERE cm.is_active = TRUE 
  AND cm.is_expired = FALSE 
  AND cm.expires_at > NOW();
