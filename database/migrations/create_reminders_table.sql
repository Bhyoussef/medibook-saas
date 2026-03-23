-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    appointmentId INT NOT NULL,
    userId INT NOT NULL,
    doctorId INT NOT NULL,
    reminderTime DATETIME NOT NULL,
    type ENUM('day_before', 'hours_before', 'hour_before', 'minutes_before') NOT NULL,
    priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL,
    status ENUM('scheduled', 'sent', 'failed', 'cancelled') DEFAULT 'scheduled',
    sentAt DATETIME NULL,
    error TEXT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (appointmentId) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (doctorId) REFERENCES doctors(id) ON DELETE CASCADE,
    INDEX idx_reminder_time (reminderTime),
    INDEX idx_reminder_status (status),
    INDEX idx_reminder_user (userId, status),
    INDEX idx_reminder_doctor (doctorId, status)
);

-- Create index for efficient reminder processing
CREATE INDEX idx_reminders_due ON reminders (status, reminderTime) WHERE status = 'scheduled';
