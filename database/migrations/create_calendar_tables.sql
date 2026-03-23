-- Create doctor blocked dates table
CREATE TABLE IF NOT EXISTS doctor_blocked_dates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doctorId INT NOT NULL,
    date DATE NOT NULL,
    isAvailable BOOLEAN DEFAULT FALSE,
    notes TEXT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (doctorId) REFERENCES doctors(id) ON DELETE CASCADE,
    UNIQUE KEY unique_doctor_date (doctorId, date),
    INDEX idx_blocked_dates_doctor (doctorId),
    INDEX idx_blocked_dates_date (date)
);

-- Create doctor weekly schedule table
CREATE TABLE IF NOT EXISTS doctor_weekly_schedule (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doctorId INT NOT NULL,
    dayOfWeek TINYINT NOT NULL, -- 0 = Sunday, 1 = Monday, etc.
    isAvailable BOOLEAN DEFAULT TRUE,
    startTime TIME NOT NULL DEFAULT '09:00:00',
    endTime TIME NOT NULL DEFAULT '17:00:00',
    maxAppointments INT DEFAULT 8,
    breakStartTime TIME NULL,
    breakEndTime TIME NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (doctorId) REFERENCES doctors(id) ON DELETE CASCADE,
    UNIQUE KEY unique_doctor_day (doctorId, dayOfWeek),
    INDEX idx_weekly_schedule_doctor (doctorId)
);

-- Insert default weekly schedule for all existing doctors
INSERT IGNORE INTO doctor_weekly_schedule (doctorId, dayOfWeek, isAvailable, startTime, endTime, maxAppointments)
SELECT id, day, available, '09:00:00', '17:00:00', 8
FROM doctors d
CROSS JOIN (
  SELECT 1 as day UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
  UNION SELECT 5 UNION SELECT 6 UNION SELECT 7
) as days
WHERE day NOT IN (0, 6); -- Exclude weekends

-- Create appointment statistics view
CREATE OR REPLACE VIEW appointment_statistics AS
SELECT 
    doctorId,
    DATE(createdAt) as date,
    COUNT(*) as totalAppointments,
    SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
    SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
    SUM(CASE WHEN status = 'no-show' THEN 1 ELSE 0 END) as noShow,
    SUM(consultationFee) as totalRevenue
FROM appointments
GROUP BY doctorId, DATE(createdAt);

-- Create doctor performance view
CREATE OR REPLACE VIEW doctor_performance AS
SELECT 
    d.id as doctorId,
    d.firstName,
    d.lastName,
    d.specialty,
    COALESCE(stats.totalAppointments, 0) as totalAppointments,
    COALESCE(stats.completed, 0) as completedAppointments,
    COALESCE(stats.cancelled, 0) as cancelledAppointments,
    COALESCE(stats.noShow, 0) as noShowAppointments,
    CASE 
        WHEN stats.totalAppointments > 0 
        THEN ROUND((stats.completed / stats.totalAppointments) * 100, 2) 
        ELSE 0 
    END as completionRate,
    CASE 
        WHEN stats.totalAppointments > 0 
        THEN ROUND(((stats.totalAppointments - stats.cancelled - stats.noShow) / stats.totalAppointments) * 100, 2) 
        ELSE 0 
    END as showRate,
    COALESCE(stats.totalRevenue, 0) as totalRevenue,
    CASE 
        WHEN stats.totalAppointments > 0 
        THEN ROUND(stats.totalRevenue / stats.totalAppointments, 2) 
        ELSE 0 
    END as averageRevenuePerAppointment
FROM doctors d
LEFT JOIN (
    SELECT 
        doctorId,
        COUNT(*) as totalAppointments,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'no-show' THEN 1 ELSE 0 END) as noShow,
        SUM(consultationFee) as totalRevenue
    FROM appointments
    WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    GROUP BY doctorId
) stats ON d.id = stats.doctorId;
