-- Create refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    token TEXT NOT NULL,
    sessionId VARCHAR(255) NOT NULL,
    expiresAt DATETIME NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    revokedAt DATETIME NULL,
    lastUsed DATETIME DEFAULT CURRENT_TIMESTAMP,
    userAgent TEXT NULL,
    ipAddress VARCHAR(45) NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_token (token(255)),
    INDEX idx_refresh_tokens_user (userId),
    INDEX idx_refresh_tokens_session (sessionId),
    INDEX idx_refresh_tokens_expires (expiresAt),
    INDEX idx_refresh_tokens_revoked (revoked)
);

-- Create audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NULL,
    action VARCHAR(100) NOT NULL,
    resourceType VARCHAR(50) NOT NULL,
    resourceId VARCHAR(100) NULL,
    ip VARCHAR(45) NULL,
    userAgent TEXT NULL,
    success BOOLEAN DEFAULT TRUE,
    details JSON NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_logs_user (userId),
    INDEX idx_audit_logs_action (action),
    INDEX idx_audit_logs_resource (resourceType, resourceId),
    INDEX idx_audit_logs_created (createdAt),
    INDEX idx_audit_logs_ip (ip)
);

-- Create security logs table
CREATE TABLE IF NOT EXISTS security_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NULL,
    ip VARCHAR(45) NOT NULL,
    method VARCHAR(10) NOT NULL,
    path VARCHAR(255) NOT NULL,
    statusCode INT NOT NULL,
    duration INT NULL,
    userAgent TEXT NULL,
    threatType VARCHAR(50) NULL,
    blocked BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_security_logs_user (userId),
    INDEX idx_security_logs_ip (ip),
    INDEX idx_security_logs_status (statusCode),
    INDEX idx_security_logs_created (createdAt),
    INDEX idx_security_logs_threat (threatType)
);

-- Create rate limit logs table
CREATE TABLE IF NOT EXISTS rate_limit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    userRole VARCHAR(50) NULL,
    type ENUM('first_request', 'limit_exceeded', 'blocked') NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_rate_limit_identifier (identifier),
    INDEX idx_rate_limit_endpoint (endpoint),
    INDEX idx_rate_limit_role (userRole),
    INDEX idx_rate_limit_type (type),
    INDEX idx_rate_limit_created (createdAt)
);

-- Create user sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    sessionId VARCHAR(255) NOT NULL,
    ipAddress VARCHAR(45) NOT NULL,
    userAgent TEXT NULL,
    isActive BOOLEAN DEFAULT TRUE,
    lastActivity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiresAt TIMESTAMP NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_session (sessionId),
    INDEX idx_user_sessions_user (userId),
    INDEX idx_user_sessions_active (isActive),
    INDEX idx_user_sessions_expires (expiresAt),
    INDEX idx_user_sessions_ip (ipAddress)
);

-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expiresAt DATETIME NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    usedAt DATETIME NULL,
    ipAddress VARCHAR(45) NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_password_reset_user (userId),
    INDEX idx_password_reset_token (token),
    INDEX idx_password_reset_expires (expiresAt),
    INDEX idx_password_reset_used (used)
);

-- Create login attempts table for brute force protection
CREATE TABLE IF NOT EXISTS login_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL, -- IP address or email
    success BOOLEAN NOT NULL,
    ipAddress VARCHAR(45) NOT NULL,
    userAgent TEXT NULL,
    attemptAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_login_attempts_identifier (identifier),
    INDEX idx_login_attempts_ip (ipAddress),
    INDEX idx_login_attempts_success (success),
    INDEX idx_login_attempts_created (attemptAt)
);

-- Create API keys table for external integrations
CREATE TABLE IF NOT EXISTS api_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    keyHash VARCHAR(255) NOT NULL UNIQUE,
    userId INT NOT NULL,
    permissions JSON NULL,
    isActive BOOLEAN DEFAULT TRUE,
    lastUsed DATETIME NULL,
    expiresAt DATETIME NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_api_keys_user (userId),
    INDEX idx_api_keys_hash (keyHash),
    INDEX idx_api_keys_active (isActive),
    INDEX idx_api_keys_expires (expiresAt)
);

-- Create security events table for monitoring
CREATE TABLE IF NOT EXISTS security_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    eventType VARCHAR(50) NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    userId INT NULL,
    description TEXT NOT NULL,
    details JSON NULL,
    ipAddress VARCHAR(45) NULL,
    userAgent TEXT NULL,
    resolved BOOLEAN DEFAULT FALSE,
    resolvedAt DATETIME NULL,
    resolvedBy INT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_security_events_type (eventType),
    INDEX idx_security_events_severity (severity),
    INDEX idx_security_events_user (userId),
    INDEX idx_security_events_resolved (resolved),
    INDEX idx_security_events_created (createdAt)
);

-- Add role column to users table if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role ENUM('super_admin', 'admin', 'doctor', 'patient', 'receptionist') DEFAULT 'patient' AFTER email;

-- Add isActive column to users table if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS isActive BOOLEAN DEFAULT TRUE AFTER role;

-- Add lastLogin column to users table if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS lastLogin DATETIME NULL AFTER isActive;

-- Add gender column to users table if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS gender ENUM('male', 'female', 'other') NULL AFTER dateOfBirth;

-- Add password column to users table if it doesn't exist (for traditional login)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password VARCHAR(255) NULL AFTER phone;

-- Add emailVerified column to users table if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS emailVerified BOOLEAN DEFAULT FALSE AFTER password;

-- Add indexes for users table
ALTER TABLE users 
ADD INDEX IF NOT EXISTS idx_users_role (role),
ADD INDEX IF NOT EXISTS idx_users_active (isActive),
ADD INDEX IF NOT EXISTS idx_users_email_verified (emailVerified),
ADD INDEX IF NOT EXISTS idx_users_last_login (lastLogin);

-- Create trigger to log user role changes
DELIMITER //
CREATE TRIGGER IF NOT EXISTS log_role_change
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    IF OLD.role != NEW.role THEN
        INSERT INTO audit_logs (userId, action, resourceType, resourceId, oldValue, newValue, createdAt)
        VALUES (NEW.id, 'role_change', 'user', NEW.id, OLD.role, NEW.role, NOW());
    END IF;
END//
DELIMITER ;

-- Create trigger to log user activation changes
DELIMITER //
CREATE TRIGGER IF NOT EXISTS log_activation_change
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    IF OLD.isActive != NEW.isActive THEN
        INSERT INTO audit_logs (userId, action, resourceType, resourceId, oldValue, newValue, createdAt)
        VALUES (NEW.id, 'activation_change', 'user', NEW.id, OLD.isActive, NEW.isActive, NOW());
    END IF;
END//
DELIMITER ;

-- Create view for active users statistics
CREATE OR REPLACE VIEW active_users_stats AS
SELECT 
    role,
    COUNT(*) as total,
    SUM(CASE WHEN isActive = TRUE THEN 1 ELSE 0 END) as active,
    SUM(CASE WHEN lastLogin >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as recently_active,
    SUM(CASE WHEN lastLogin >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as monthly_active
FROM users
GROUP BY role;

-- Create view for security events summary
CREATE OR REPLACE VIEW security_events_summary AS
SELECT 
    eventType,
    severity,
    COUNT(*) as count,
    MAX(createdAt) as last_occurrence,
    SUM(CASE WHEN resolved = FALSE THEN 1 ELSE 0 END) as unresolved
FROM security_events
WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY eventType, severity
ORDER BY severity DESC, count DESC;

-- Create stored procedure to clean up expired tokens
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS CleanupExpiredTokens()
BEGIN
    -- Clean up expired refresh tokens
    DELETE FROM refresh_tokens 
    WHERE expiresAt < NOW() 
    OR (revoked = TRUE AND revokedAt < DATE_SUB(NOW(), INTERVAL 30 DAY));
    
    -- Clean up expired password reset tokens
    DELETE FROM password_reset_tokens 
    WHERE expiresAt < NOW() OR used = TRUE;
    
    -- Clean up inactive user sessions
    DELETE FROM user_sessions 
    WHERE isActive = FALSE 
    AND lastActivity < DATE_SUB(NOW(), INTERVAL 7 DAY);
    
    -- Clean up old login attempts (older than 30 days)
    DELETE FROM login_attempts 
    WHERE attemptAt < DATE_SUB(NOW(), INTERVAL 30 DAY);
    
    -- Clean up old rate limit logs (older than 7 days)
    DELETE FROM rate_limit_logs 
    WHERE createdAt < DATE_SUB(NOW(), INTERVAL 7 DAY);
    
    SELECT ROW_COUNT() as cleaned_records;
END//
DELIMITER ;

-- Create event to schedule cleanup (MySQL 8.0+)
-- SET GLOBAL event_scheduler = ON;
-- CREATE EVENT IF NOT EXISTS cleanup_security_data
-- ON SCHEDULE EVERY 1 DAY
-- STARTS CURRENT_TIMESTAMP
-- DO CALL CleanupExpiredTokens();
