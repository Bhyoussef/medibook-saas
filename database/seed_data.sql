-- MediBook Demo Data for Presentation
-- This script creates sample data to make the application look presentable

-- Insert sample doctors
INSERT INTO doctors (id, firstName, lastName, email, phone, specialty, consultationFee, available, rating, experience, createdAt) VALUES
(1, 'Sarah', 'Johnson', 'sarah.johnson@medibook.com', '+1234567890', 'Cardiology', 150.00, 1, 4.8, 12, NOW()),
(2, 'Michael', 'Chen', 'michael.chen@medibook.com', '+1234567891', 'Dermatology', 120.00, 1, 4.9, 8, NOW()),
(3, 'Emily', 'Rodriguez', 'emily.rodriguez@medibook.com', '+1234567892', 'Pediatrics', 100.00, 1, 4.7, 15, NOW()),
(4, 'David', 'Kim', 'david.kim@medibook.com', '+1234567893', 'Orthopedics', 180.00, 1, 4.6, 10, NOW()),
(5, 'Lisa', 'Thompson', 'lisa.thompson@medibook.com', '+1234567894', 'General Practice', 80.00, 1, 4.8, 20, NOW()),
(6, 'James', 'Wilson', 'james.wilson@medibook.com', '+1234567895', 'Neurology', 200.00, 1, 4.9, 12, NOW()),
(7, 'Maria', 'Garcia', 'maria.garcia@medibook.com', '+1234567896', 'Gynecology', 130.00, 1, 4.7, 18, NOW()),
(8, 'Robert', 'Taylor', 'robert.taylor@medibook.com', '+1234567897', 'Psychiatry', 140.00, 1, 4.5, 25, NOW());

-- Insert sample users
INSERT INTO users (id, firstName, lastName, email, phone, role, isActive, createdAt, lastLogin) VALUES
(1, 'John', 'Doe', 'john.doe@email.com', '+1234567890', 'patient', 1, NOW(), NOW()),
(2, 'Jane', 'Smith', 'jane.smith@email.com', '+1234567891', 'patient', 1, NOW(), NOW() - INTERVAL 2 HOUR),
(3, 'Alice', 'Brown', 'alice.brown@email.com', '+1234567892', 'patient', 1, NOW(), NOW() - INTERVAL 1 DAY),
(4, 'Bob', 'Johnson', 'bob.johnson@email.com', '+1234567893', 'patient', 1, NOW(), NOW() - INTERVAL 3 DAY),
(5, 'Carol', 'Williams', 'carol.williams@email.com', '+1234567894', 'patient', 1, NOW(), NOW() - INTERVAL 5 DAY),
(6, 'Admin', 'User', 'admin@medibook.com', '+1234567899', 'admin', 1, NOW(), NOW());

-- Insert sample appointments (upcoming)
INSERT INTO appointments (id, userId, doctorId, date, time, status, reason, consultationFee, paymentStatus, createdAt, updatedAt) VALUES
(1, 1, 1, CURDATE() + INTERVAL 1 DAY, '09:00', 'scheduled', 'Regular checkup', 150.00, 'pending', NOW(), NOW()),
(2, 1, 3, CURDATE() + INTERVAL 3 DAY, '14:30', 'confirmed', 'Child wellness visit', 100.00, 'paid', NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 1 DAY),
(3, 2, 2, CURDATE() + INTERVAL 2 DAY, '11:00', 'scheduled', 'Skin consultation', 120.00, 'pending', NOW(), NOW()),
(4, 3, 5, CURDATE() + INTERVAL 5 DAY, '10:00', 'confirmed', 'Annual physical', 80.00, 'paid', NOW() - INTERVAL 2 DAY, NOW() - INTERVAL 2 DAY),
(5, 4, 4, CURDATE() + INTERVAL 7 DAY, '15:30', 'scheduled', 'Joint pain consultation', 180.00, 'pending', NOW(), NOW()),
(6, 5, 6, CURDATE() + INTERVAL 4 DAY, '13:00', 'confirmed', 'Mental health evaluation', 140.00, 'paid', NOW() - INTERVAL 3 DAY, NOW() - INTERVAL 3 DAY);

-- Insert sample appointments (past/completed)
INSERT INTO appointments (id, userId, doctorId, date, time, status, reason, consultationFee, paymentStatus, createdAt, updatedAt) VALUES
(7, 1, 1, CURDATE() - INTERVAL 7 DAY, '10:00', 'completed', 'Heart checkup', 150.00, 'paid', NOW() - INTERVAL 8 DAY, NOW() - INTERVAL 7 DAY),
(8, 2, 2, CURDATE() - INTERVAL 14 DAY, '09:30', 'completed', 'Acne treatment', 120.00, 'paid', NOW() - INTERVAL 15 DAY, NOW() - INTERVAL 14 DAY),
(9, 3, 3, CURDATE() - INTERVAL 21 DAY, '11:00', 'completed', 'Vaccination', 100.00, 'paid', NOW() - INTERVAL 22 DAY, NOW() - INTERVAL 21 DAY),
(10, 4, 4, CURDATE() - INTERVAL 10 DAY, '14:00', 'completed', 'Knee examination', 180.00, 'paid', NOW() - INTERVAL 11 DAY, NOW() - INTERVAL 10 DAY),
(11, 5, 5, CURDATE() - INTERVAL 5 DAY, '08:30', 'completed', 'Follow-up visit', 80.00, 'paid', NOW() - INTERVAL 6 DAY, NOW() - INTERVAL 5 DAY);

-- Insert sample notifications
INSERT INTO notifications (id, userId, doctorId, appointmentId, title, message, type, priority, isRead, createdAt) VALUES
(1, 1, 1, 1, 'Appointment Confirmed', 'Your appointment with Dr. Sarah Johnson has been confirmed for tomorrow at 9:00 AM', 'appointment', 'medium', 0, NOW()),
(2, 2, 2, 3, 'Appointment Reminder', 'Reminder: Your appointment with Dr. Michael Chen is tomorrow at 11:00 AM', 'reminder', 'medium', 0, NOW()),
(3, 3, 3, 4, 'Appointment Confirmed', 'Your appointment with Dr. Lisa Thompson has been confirmed', 'appointment', 'medium', 1, NOW() - INTERVAL 1 DAY),
(4, 4, 4, 5, 'New Appointment Booked', 'Your appointment with Dr. David Kim has been successfully booked', 'appointment', 'medium', 0, NOW()),
(5, 1, NULL, NULL, 'Welcome to MediBook', 'Thank you for joining MediBook! Your account has been created successfully.', 'system', 'low', 1, NOW() - INTERVAL 7 DAY);

-- Insert doctor availability (weekly schedule)
INSERT INTO doctor_weekly_schedule (doctorId, dayOfWeek, startTime, endTime, isAvailable, maxAppointments) VALUES
(1, 1, '08:00', '17:00', 1, 8), -- Monday
(1, 2, '08:00', '17:00', 1, 8), -- Tuesday
(1, 3, '08:00', '17:00', 1, 8), -- Wednesday
(1, 4, '08:00', '17:00', 1, 8), -- Thursday
(1, 5, '08:00', '15:00', 1, 6), -- Friday
(2, 1, '09:00', '18:00', 1, 8),
(2, 2, '09:00', '18:00', 1, 8),
(2, 3, '09:00', '18:00', 1, 8),
(2, 4, '09:00', '18:00', 1, 8),
(2, 5, '09:00', '16:00', 1, 6),
(3, 1, '07:30', '16:30', 1, 9),
(3, 2, '07:30', '16:30', 1, 9),
(3, 3, '07:30', '16:30', 1, 9),
(3, 4, '07:30', '16:30', 1, 9),
(3, 5, '07:30', '15:30', 1, 7);

-- Insert some blocked dates (doctor vacations)
INSERT INTO doctor_blocked_dates (doctorId, date, reason, createdAt) VALUES
(1, CURDATE() + INTERVAL 14 DAY, 'Medical conference', NOW()),
(2, CURDATE() + INTERVAL 21 DAY, 'Personal leave', NOW()),
(3, CURDATE() + INTERVAL 10 DAY, 'Training', NOW());

-- Insert notification preferences for users
INSERT INTO notification_preferences (userId, preferences, updatedAt) VALUES
(1, '{"email": true, "sms": true, "push": true, "inApp": true, "appointmentReminders": true, "marketingEmails": false}', NOW()),
(2, '{"email": true, "sms": false, "push": true, "inApp": true, "appointmentReminders": true, "marketingEmails": false}', NOW()),
(3, '{"email": true, "sms": true, "push": false, "inApp": true, "appointmentReminders": true, "marketingEmails": false}', NOW());

-- Insert sample time slots for demonstration
INSERT INTO time_slots (id, doctorId, date, startTime, endTime, isAvailable, maxCapacity, currentBookings, createdAt) VALUES
(1, 1, CURDATE() + INTERVAL 1 DAY, '09:00', '09:30', 1, 1, 1, NOW()),
(2, 1, CURDATE() + INTERVAL 1 DAY, '09:30', '10:00', 1, 1, 0, NOW()),
(3, 1, CURDATE() + INTERVAL 1 DAY, '10:00', '10:30', 1, 1, 0, NOW()),
(4, 2, CURDATE() + INTERVAL 2 DAY, '11:00', '11:30', 1, 1, 1, NOW()),
(5, 2, CURDATE() + INTERVAL 2 DAY, '11:30', '12:00', 1, 1, 0, NOW()),
(6, 3, CURDATE() + INTERVAL 3 DAY, '14:30', '15:00', 1, 1, 1, NOW()),
(7, 4, CURDATE() + INTERVAL 5 DAY, '15:30', '16:00', 1, 1, 1, NOW()),
(8, 5, CURDATE() + INTERVAL 4 DAY, '13:00', '13:30', 1, 1, 1, NOW());

-- Insert sample reminders
INSERT INTO reminders (id, appointmentId, userId, type, scheduledAt, sentAt, status, message, createdAt) VALUES
(1, 1, 1, '24h', CURDATE() + INTERVAL 1 DAY - INTERVAL 1 DAY, NULL, 'pending', 'Your appointment with Dr. Sarah Johnson is tomorrow at 9:00 AM', NOW()),
(2, 2, 2, '2h', CURDATE() + INTERVAL 2 DAY - INTERVAL 2 HOUR, NULL, 'pending', 'Your appointment with Dr. Michael Chen is in 2 hours', NOW()),
(3, 3, 3, '24h', CURDATE() + INTERVAL 3 DAY - INTERVAL 1 DAY, CURDATE() - INTERVAL 1 DAY, 'sent', 'Your appointment with Dr. Lisa Thompson is tomorrow', NOW() - INTERVAL 1 DAY);

-- Update some statistics for demo
UPDATE doctors SET rating = 4.8 WHERE id = 1;
UPDATE doctors SET rating = 4.9 WHERE id = 2;
UPDATE doctors SET rating = 4.7 WHERE id = 3;
UPDATE doctors SET rating = 4.6 WHERE id = 4;
UPDATE doctors SET rating = 4.8 WHERE id = 5;

-- Mark some appointments as paid
UPDATE appointments SET paymentStatus = 'paid' WHERE id IN (2, 3, 4, 6);

-- Update user last login times
UPDATE users SET lastLogin = NOW() WHERE id IN (1, 2, 3);

-- Create some audit log entries
INSERT INTO audit_logs (userId, action, resource, details, ipAddress, userAgent, createdAt) VALUES
(1, 'login', 'auth', 'User logged in successfully', '192.168.1.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW()),
(1, 'appointment_created', 'appointment', 'Created appointment with Dr. Sarah Johnson', '192.168.1.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL 1 HOUR),
(2, 'appointment_confirmed', 'appointment', 'Confirmed appointment with Dr. Michael Chen', '192.168.1.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', NOW() - INTERVAL 2 HOUR);

-- Create some error logs for demo
INSERT INTO error_logs (code, message, statusCode, severity, details, userId, ip, url, method, createdAt) VALUES
('VALIDATION_ERROR', 'Invalid phone number format', 400, 'low', '{"field": "phone", "value": "invalid"}', 1, '192.168.1.1', '/api/users/profile', 'PUT', NOW() - INTERVAL 3 HOUR),
('RATE_LIMIT_EXCEEDED', 'Too many requests', 429, 'medium', '{"limit": 100, "window": 900}', NULL, '192.168.1.100', '/api/auth/login', 'POST', NOW() - INTERVAL 5 HOUR);

-- Create some email logs for demo
INSERT INTO email_logs (recipient, template, messageId, status, sentAt) VALUES
('john.doe@email.com', 'appointment_confirmed', 'msg_123', 'sent', NOW() - INTERVAL 1 HOUR),
('jane.smith@email.com', 'appointment_reminder', 'msg_124', 'sent', NOW() - INTERVAL 2 HOUR),
('alice.brown@email.com', 'welcome_email', 'msg_125', 'sent', NOW() - INTERVAL 1 DAY);

-- Create some SMS logs for demo
INSERT INTO sms_logs (recipient, template, messageId, status, sentAt) VALUES
('+1234567890', 'appointment_reminder', 'sms_123', 'sent', NOW() - INTERVAL 30 MINUTE),
('+1234567891', 'otp_verification', 'sms_124', 'sent', NOW() - INTERVAL 1 HOUR),
('+1234567892', 'appointment_booked', 'sms_125', 'sent', NOW() - INTERVAL 3 HOUR);
