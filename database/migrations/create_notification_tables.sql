-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    preferences JSON NOT NULL,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_preferences (userId),
    INDEX idx_notification_preferences_user (userId)
);

-- Create push subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    type ENUM('web', 'fcm') NOT NULL,
    subscription JSON NULL,
    token VARCHAR(255) NULL,
    userAgent TEXT NULL,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    removedAt TIMESTAMP NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_push_subscriptions_user (userId),
    INDEX idx_push_subscriptions_type (type),
    INDEX idx_push_subscriptions_active (isActive),
    INDEX idx_push_subscriptions_token (token)
);

-- Create email logs table
CREATE TABLE IF NOT EXISTS email_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipient VARCHAR(255) NOT NULL,
    template VARCHAR(100) NOT NULL,
    messageId VARCHAR(255) NULL,
    status ENUM('sent', 'failed', 'bounced') DEFAULT 'sent',
    error TEXT NULL,
    sentAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email_logs_recipient (recipient),
    INDEX idx_email_logs_template (template),
    INDEX idx_email_logs_status (status),
    INDEX idx_email_logs_sent (sentAt)
);

-- Create SMS logs table
CREATE TABLE IF NOT EXISTS sms_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipient VARCHAR(20) NOT NULL,
    template VARCHAR(100) NOT NULL,
    messageId VARCHAR(255) NULL,
    status ENUM('sent', 'failed', 'delivered', 'undelivered') DEFAULT 'sent',
    error TEXT NULL,
    sentAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sms_logs_recipient (recipient),
    INDEX idx_sms_logs_template (template),
    INDEX idx_sms_logs_status (status),
    INDEX idx_sms_logs_sent (sentAt)
);

-- Create push notification logs table
CREATE TABLE IF NOT EXISTS push_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    template VARCHAR(100) NOT NULL,
    totalSent INT NOT NULL DEFAULT 0,
    successful INT NOT NULL DEFAULT 0,
    failed INT NOT NULL DEFAULT 0,
    status ENUM('sent', 'failed', 'partial') DEFAULT 'sent',
    error TEXT NULL,
    sentAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_push_logs_user (userId),
    INDEX idx_push_logs_template (template),
    INDEX idx_push_logs_status (status),
    INDEX idx_push_logs_sent (sentAt)
);

-- Create OTP logs table
CREATE TABLE IF NOT EXISTS otp_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    messageId VARCHAR(255) NULL,
    status ENUM('sent', 'failed', 'verified', 'expired') DEFAULT 'sent',
    error TEXT NULL,
    sentAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verifiedAt TIMESTAMP NULL,
    INDEX idx_otp_logs_phone (phone),
    INDEX idx_otp_logs_status (status),
    INDEX idx_otp_logs_sent (sentAt)
);

-- Create preference change logs table
CREATE TABLE IF NOT EXISTS preference_change_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    action ENUM('update', 'reset', 'import') NOT NULL,
    preferences JSON NOT NULL,
    metadata JSON NULL,
    changedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_preference_logs_user (userId),
    INDEX idx_preference_logs_action (action),
    INDEX idx_preference_logs_changed (changedAt)
);

-- Create notification templates table
CREATE TABLE IF NOT EXISTS notification_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    type ENUM('email', 'sms', 'push') NOT NULL,
    category VARCHAR(50) NOT NULL,
    subject VARCHAR(255) NULL,
    content TEXT NOT NULL,
    variables JSON NULL,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_notification_templates_type (type),
    INDEX idx_notification_templates_category (category),
    INDEX idx_notification_templates_active (isActive)
);

-- Create notification campaigns table
CREATE TABLE IF NOT EXISTS notification_campaigns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type ENUM('email', 'sms', 'push', 'multi') NOT NULL,
    template VARCHAR(100) NOT NULL,
    filters JSON NULL,
    scheduledAt TIMESTAMP NULL,
    sentAt TIMESTAMP NULL,
    status ENUM('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled') DEFAULT 'draft',
    totalRecipients INT DEFAULT 0,
    sentCount INT DEFAULT 0,
    failedCount INT DEFAULT 0,
    createdBy INT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notification_campaigns_status (status),
    INDEX idx_notification_campaigns_type (type),
    INDEX idx_notification_campaigns_scheduled (scheduledAt),
    INDEX idx_notification_campaigns_created (createdBy)
);

-- Create campaign recipients table
CREATE TABLE IF NOT EXISTS campaign_recipients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campaignId INT NOT NULL,
    userId INT NOT NULL,
    status ENUM('pending', 'sent', 'delivered', 'failed', 'bounced') DEFAULT 'pending',
    sentAt TIMESTAMP NULL,
    deliveredAt TIMESTAMP NULL,
    error TEXT NULL,
    FOREIGN KEY (campaignId) REFERENCES notification_campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_campaign_recipients_campaign (campaignId),
    INDEX idx_campaign_recipients_user (userId),
    INDEX idx_campaign_recipients_status (status)
);

-- Add columns to existing notifications table
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS emailSent BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS emailSentAt TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS smsSent BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS smsSentAt TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS pushSent BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pushSentAt TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS readAt TIMESTAMP NULL;

-- Add columns to existing users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS welcomeEmailSent BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS welcomeEmailSentAt TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS welcomeSmsSent BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS welcomeSmsSentAt TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS welcomePushSent BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS welcomePushSentAt TIMESTAMP NULL;

-- Create indexes for notifications table
ALTER TABLE notifications 
ADD INDEX IF NOT EXISTS idx_notifications_email_sent (emailSent),
ADD INDEX IF NOT EXISTS idx_notifications_sms_sent (smsSent),
ADD INDEX IF NOT EXISTS idx_notifications_push_sent (pushSent),
ADD INDEX IF NOT EXISTS idx_notifications_read_at (readAt);

-- Create indexes for users table
ALTER TABLE users 
ADD INDEX IF NOT EXISTS idx_users_welcome_email_sent (welcomeEmailSent),
ADD INDEX IF NOT EXISTS idx_users_welcome_sms_sent (welcomeSmsSent),
ADD INDEX IF NOT EXISTS idx_users_welcome_push_sent (welcomePushSent);

-- Insert default notification templates
INSERT IGNORE INTO notification_templates (name, type, category, subject, content, variables) VALUES
('appointment_booked_email', 'email', 'appointment', 'Appointment Booked - MediBook', '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Appointment Booked</title></head><body><h1>Appointment Booked</h1><p>Your appointment with Dr. {{doctorFirstName}} {{doctorLastName}} is confirmed for {{date}} at {{time}}.</p></body></html>', JSON_OBJECT('doctorFirstName', 'string', 'doctorLastName', 'string', 'date', 'string', 'time', 'string')),

('appointment_booked_sms', 'sms', 'appointment', NULL, 'MediBook: Your appointment with Dr. {{doctorFirstName}} {{doctorLastName}} is confirmed for {{date}} at {{time}}.', JSON_OBJECT('doctorFirstName', 'string', 'doctorLastName', 'string', 'date', 'string', 'time', 'string')),

('appointment_booked_push', 'push', 'appointment', 'Appointment Booked', 'Your appointment has been successfully booked', JSON_OBJECT('doctorFirstName', 'string', 'doctorLastName', 'string', 'date', 'string', 'time', 'string')),

('appointment_confirmed_email', 'email', 'appointment', 'Appointment Confirmed - MediBook', '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Appointment Confirmed</title></head><body><h1>Appointment Confirmed</h1><p>Your appointment with Dr. {{doctorFirstName}} {{doctorLastName}} on {{date}} at {{time}} has been confirmed.</p></body></html>', JSON_OBJECT('doctorFirstName', 'string', 'doctorLastName', 'string', 'date', 'string', 'time', 'string')),

('appointment_cancelled_email', 'email', 'appointment', 'Appointment Cancelled - MediBook', '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Appointment Cancelled</title></head><body><h1>Appointment Cancelled</h1><p>Your appointment with Dr. {{doctorFirstName}} {{doctorLastName}} on {{date}} at {{time}} has been cancelled.</p></body></html>', JSON_OBJECT('doctorFirstName', 'string', 'doctorLastName', 'string', 'date', 'string', 'time', 'string')),

('appointment_reminder_email', 'email', 'reminder', 'Appointment Reminder - MediBook', '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Appointment Reminder</title></head><body><h1>Appointment Reminder</h1><p>Reminder: Your appointment with Dr. {{doctorFirstName}} {{doctorLastName}} is {{timeUntil}} at {{time}}.</p></body></html>', JSON_OBJECT('doctorFirstName', 'string', 'doctorLastName', 'string', 'timeUntil', 'string', 'time', 'string')),

('welcome_email', 'email', 'welcome', 'Welcome to MediBook', '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Welcome to MediBook</title></head><body><h1>Welcome to MediBook</h1><p>Hi {{firstName}}, welcome to MediBook! Your account has been created successfully.</p></body></html>', JSON_OBJECT('firstName', 'string')),

('welcome_sms', 'sms', 'welcome', NULL, 'MediBook: Welcome {{firstName}}! Your account has been created. Download our app to manage your appointments.', JSON_OBJECT('firstName', 'string')),

('welcome_push', 'push', 'welcome', 'Welcome to MediBook', 'Your account has been created successfully', JSON_OBJECT('firstName', 'string'));

-- Create view for notification statistics
CREATE OR REPLACE VIEW notification_stats AS
SELECT 
    'email' as channel,
    COUNT(*) as total,
    SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
    SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END) as bounced
FROM email_logs
UNION ALL
SELECT 
    'sms' as channel,
    COUNT(*) as total,
    SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
    SUM(CASE WHEN status = 'undelivered' THEN 1 ELSE 0 END) as bounced
FROM sms_logs
UNION ALL
SELECT 
    'push' as channel,
    COUNT(*) as total,
    SUM(totalSent) as sent,
    SUM(failed) as failed,
    0 as bounced
FROM push_logs;

-- Create view for user notification preferences summary
CREATE OR REPLACE VIEW user_preferences_summary AS
SELECT 
    u.id as userId,
    u.firstName,
    u.lastName,
    u.email,
    u.role,
    COALESCE(JSON_EXTRACT(np.preferences, '$.email'), 'true') = 'true' as emailEnabled,
    COALESCE(JSON_EXTRACT(np.preferences, '$.sms'), 'true') = 'true' as smsEnabled,
    COALESCE(JSON_EXTRACT(np.preferences, '$.push'), 'true') = 'true' as pushEnabled,
    COALESCE(JSON_EXTRACT(np.preferences, '$.inApp'), 'true') = 'true' as inAppEnabled,
    COALESCE(JSON_EXTRACT(np.preferences, '$.appointmentReminders'), 'true') = 'true' as remindersEnabled,
    COALESCE(JSON_EXTRACT(np.preferences, '$.marketingEmails'), 'false') = 'true' as marketingEnabled,
    np.updatedAt as preferencesUpdatedAt
FROM users u
LEFT JOIN notification_preferences np ON u.id = np.userId
WHERE u.isActive = TRUE;

-- Create stored procedure to clean up old notification logs
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS CleanupNotificationLogs()
BEGIN
    -- Clean up email logs older than 90 days
    DELETE FROM email_logs 
    WHERE sentAt < DATE_SUB(NOW(), INTERVAL 90 DAY);
    
    -- Clean up SMS logs older than 90 days
    DELETE FROM sms_logs 
    WHERE sentAt < DATE_SUB(NOW(), INTERVAL 90 DAY);
    
    -- Clean up push logs older than 90 days
    DELETE FROM push_logs 
    WHERE sentAt < DATE_SUB(NOW(), INTERVAL 90 DAY);
    
    -- Clean up OTP logs older than 7 days
    DELETE FROM otp_logs 
    WHERE sentAt < DATE_SUB(NOW(), INTERVAL 7 DAY);
    
    -- Clean up preference change logs older than 1 year
    DELETE FROM preference_change_logs 
    WHERE changedAt < DATE_SUB(NOW(), INTERVAL 1 YEAR);
    
    SELECT ROW_COUNT() as cleaned_records;
END//
DELIMITER ;

-- Create trigger to log notification preference changes
DELIMITER //
CREATE TRIGGER IF NOT EXISTS log_notification_preference_change
AFTER INSERT ON notification_preferences
FOR EACH ROW
BEGIN
    INSERT INTO preference_change_logs (userId, action, preferences, changedAt)
    VALUES (NEW.userId, 'update', NEW.preferences, NOW());
END//
DELIMITER ;

-- Create trigger to log notification preference updates
DELIMITER //
CREATE TRIGGER IF NOT EXISTS log_notification_preference_update
AFTER UPDATE ON notification_preferences
FOR EACH ROW
BEGIN
    INSERT INTO preference_change_logs (userId, action, preferences, changedAt)
    VALUES (NEW.userId, 'update', NEW.preferences, NOW());
END//
DELIMITER ;
