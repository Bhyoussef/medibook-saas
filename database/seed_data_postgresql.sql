-- MediBook Demo Data for PostgreSQL
-- This script creates sample data to make the application look presentable

-- Insert sample doctors
INSERT INTO doctors (id, firstName, lastName, email, phone, specialty, consultationFee, available, rating, experience, createdAt) VALUES
(1, 'Sarah', 'Johnson', 'sarah.johnson@medibook.com', '+1234567890', 'Cardiology', 150.00, true, 4.8, '12 years', NOW()),
(2, 'Michael', 'Chen', 'michael.chen@medibook.com', '+1234567891', 'Dermatology', 120.00, true, 4.9, '8 years', NOW()),
(3, 'Emily', 'Rodriguez', 'emily.rodriguez@medibook.com', '+1234567892', 'Pediatrics', 100.00, true, 4.7, '15 years', NOW()),
(4, 'David', 'Kim', 'david.kim@medibook.com', '+1234567893', 'Orthopedics', 180.00, true, 4.6, '10 years', NOW()),
(5, 'Lisa', 'Thompson', 'lisa.thompson@medibook.com', '+1234567894', 'General Practice', 80.00, true, 4.8, '20 years', NOW()),
(6, 'James', 'Wilson', 'james.wilson@medibook.com', '+1234567895', 'Neurology', 200.00, true, 4.9, '12 years', NOW()),
(7, 'Maria', 'Garcia', 'maria.garcia@medibook.com', '+1234567896', 'Gynecology', 130.00, true, 4.7, '18 years', NOW()),
(8, 'Robert', 'Taylor', 'robert.taylor@medibook.com', '+1234567897', 'Psychiatry', 140.00, true, 4.5, '25 years', NOW());

-- Insert sample users
INSERT INTO users (id, firstName, lastName, email, phone, role, isActive, createdAt, lastLogin) VALUES
(1, 'John', 'Doe', 'john.doe@email.com', '+1234567890', 'patient', true, NOW(), NOW()),
(2, 'Jane', 'Smith', 'jane.smith@email.com', '+1234567891', 'patient', true, NOW(), NOW() - INTERVAL '2 hours'),
(3, 'Alice', 'Brown', 'alice.brown@email.com', '+1234567892', 'patient', true, NOW(), NOW() - INTERVAL '1 day'),
(4, 'Bob', 'Johnson', 'bob.johnson@email.com', '+1234567893', 'patient', true, NOW(), NOW() - INTERVAL '3 days'),
(5, 'Carol', 'Williams', 'carol.williams@email.com', '+1234567894', 'patient', true, NOW(), NOW() - INTERVAL '5 days'),
(6, 'Admin', 'User', 'admin@medibook.com', '+1234567899', 'admin', true, NOW(), NOW());

-- Insert sample appointments (upcoming)
INSERT INTO appointments (id, userId, doctorId, date, time, status, reason, consultationFee, paymentStatus, createdAt, updatedAt) VALUES
(1, 1, 1, CURRENT_DATE + INTERVAL '1 day', '09:00', 'scheduled', 'Regular checkup', 150.00, 'pending', NOW(), NOW()),
(2, 1, 3, CURRENT_DATE + INTERVAL '3 days', '14:30', 'confirmed', 'Child wellness visit', 100.00, 'paid', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
(3, 2, 2, CURRENT_DATE + INTERVAL '2 days', '11:00', 'scheduled', 'Skin consultation', 120.00, 'pending', NOW(), NOW()),
(4, 3, 5, CURRENT_DATE + INTERVAL '5 days', '10:00', 'confirmed', 'Annual physical', 80.00, 'paid', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
(5, 4, 4, CURRENT_DATE + INTERVAL '7 days', '15:30', 'scheduled', 'Joint pain consultation', 180.00, 'pending', NOW(), NOW()),
(6, 5, 6, CURRENT_DATE + INTERVAL '4 days', '13:00', 'confirmed', 'Mental health evaluation', 140.00, 'paid', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days');

-- Insert sample appointments (past/completed)
INSERT INTO appointments (id, userId, doctorId, date, time, status, reason, consultationFee, paymentStatus, createdAt, updatedAt) VALUES
(7, 1, 1, CURRENT_DATE - INTERVAL '7 days', '10:00', 'completed', 'Heart checkup', 150.00, 'paid', NOW() - INTERVAL '8 days', NOW() - INTERVAL '7 days'),
(8, 2, 2, CURRENT_DATE - INTERVAL '14 days', '09:30', 'completed', 'Acne treatment', 120.00, 'paid', NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days'),
(9, 3, 3, CURRENT_DATE - INTERVAL '21 days', '11:00', 'completed', 'Vaccination', 100.00, 'paid', NOW() - INTERVAL '22 days', NOW() - INTERVAL '21 days'),
(10, 4, 4, CURRENT_DATE - INTERVAL '10 days', '14:00', 'completed', 'Knee examination', 180.00, 'paid', NOW() - INTERVAL '11 days', NOW() - INTERVAL '10 days'),
(11, 5, 5, CURRENT_DATE - INTERVAL '5 days', '08:30', 'completed', 'Follow-up visit', 80.00, 'paid', NOW() - INTERVAL '6 days', NOW() - INTERVAL '5 days');

-- Insert sample notifications
INSERT INTO notifications (id, userId, doctorId, appointmentId, title, message, type, priority, isRead, createdAt) VALUES
(1, 1, 1, 1, 'Appointment Confirmed', 'Your appointment with Dr. Sarah Johnson has been confirmed for tomorrow at 9:00 AM', 'appointment', 'medium', false, NOW()),
(2, 2, 2, 3, 'Appointment Reminder', 'Reminder: Your appointment with Dr. Michael Chen is tomorrow at 11:00 AM', 'reminder', 'medium', false, NOW()),
(3, 3, 3, 4, 'Appointment Confirmed', 'Your appointment with Dr. Lisa Thompson has been confirmed', 'appointment', 'medium', true, NOW() - INTERVAL '1 day'),
(4, 4, 4, 5, 'New Appointment Booked', 'Your appointment with Dr. David Kim has been successfully booked', 'appointment', 'medium', false, NOW()),
(5, 1, NULL, NULL, 'Welcome to MediBook', 'Thank you for joining MediBook! Your account has been created successfully.', 'system', 'low', true, NOW() - INTERVAL '7 days');

-- Insert doctor availability (weekly schedule)
INSERT INTO doctor_weekly_schedule (doctorId, dayOfWeek, startTime, endTime, isAvailable, maxAppointments) VALUES
(1, 1, '09:00', '17:00', true, 4),  -- Monday
(1, 2, '09:00', '17:00', true, 4),  -- Tuesday
(1, 3, '09:00', '17:00', true, 4),  -- Wednesday
(1, 4, '09:00', '17:00', true, 4),  -- Thursday
(1, 5, '09:00', '17:00', true, 4),  -- Friday
(1, 6, '10:00', '14:00', true, 2),  -- Saturday
(1, 0, false, NULL, false, 0),     -- Sunday

(2, 1, '08:00', '16:00', true, 3),
(2, 2, '08:00', '16:00', true, 3),
(2, 3, '08:00', '16:00', true, 3),
(2, 4, '08:00', '16:00', true, 3),
(2, 5, '08:00', '16:00', true, 3),
(2, 6, '09:00', '13:00', true, 2),
(2, 0, false, NULL, false, 0),

(3, 1, '08:30', '16:30', true, 5),
(3, 2, '08:30', '16:30', true, 5),
(3, 3, '08:30', '16:30', true, 5),
(3, 4, '08:30', '16:30', true, 5),
(3, 5, '08:30', '16:30', true, 5),
(3, 6, '09:00', '12:00', true, 2),
(3, 0, false, NULL, false, 0),

(4, 1, '09:00', '18:00', true, 3),
(4, 2, '09:00', '18:00', true, 3),
(4, 3, '09:00', '18:00', true, 3),
(4, 4, '09:00', '18:00', true, 3),
(4, 5, '09:00', '18:00', true, 3),
(4, 6, '10:00', '15:00', true, 2),
(4, 0, false, NULL, false, 0),

(5, 1, '08:00', '17:00', true, 4),
(5, 2, '08:00', '17:00', true, 4),
(5, 3, '08:00', '17:00', true, 4),
(5, 4, '08:00', '17:00', true, 4),
(5, 5, '08:00', '17:00', true, 4),
(5, 6, '09:00', '13:00', true, 3),
(5, 0, false, NULL, false, 0),

(6, 1, '10:00', '18:00', true, 2),
(6, 2, '10:00', '18:00', true, 2),
(6, 3, '10:00', '18:00', true, 2),
(6, 4, '10:00', '18:00', true, 2),
(6, 5, '10:00', '18:00', true, 2),
(6, 6, '10:00', '14:00', true, 1),
(6, 0, false, NULL, false, 0),

(7, 1, '09:00', '17:00', true, 3),
(7, 2, '09:00', '17:00', true, 3),
(7, 3, '09:00', '17:00', true, 3),
(7, 4, '09:00', '17:00', true, 3),
(7, 5, '09:00', '17:00', true, 3),
(7, 6, '09:00', '12:00', true, 2),
(7, 0, false, NULL, false, 0),

(8, 1, '09:00', '16:00', true, 3),
(8, 2, '09:00', '16:00', true, 3),
(8, 3, '09:00', '16:00', true, 3),
(8, 4, '09:00', '16:00', true, 3),
(8, 5, '09:00', '16:00', true, 3),
(8, 6, '10:00', '14:00', true, 2),
(8, 0, false, NULL, false, 0);

-- Insert notification preferences
INSERT INTO notification_preferences (userId, emailNotifications, smsNotifications, appointmentReminders, marketingEmails, createdAt) VALUES
(1, true, true, true, false, NOW()),
(2, true, false, true, false, NOW()),
(3, true, true, true, false, NOW()),
(4, false, true, true, false, NOW()),
(5, true, true, false, true, NOW()),
(6, true, true, true, false, NOW());

-- Insert sample time slots for the next 7 days
INSERT INTO time_slots (doctorId, date, time, isAvailable, createdAt) VALUES
(1, CURRENT_DATE + INTERVAL '1 day', '09:00', true, NOW()),
(1, CURRENT_DATE + INTERVAL '1 day', '10:00', true, NOW()),
(1, CURRENT_DATE + INTERVAL '1 day', '11:00', true, NOW()),
(1, CURRENT_DATE + INTERVAL '1 day', '14:00', true, NOW()),
(1, CURRENT_DATE + INTERVAL '1 day', '15:00', true, NOW()),
(1, CURRENT_DATE + INTERVAL '1 day', '16:00', true, NOW()),

(2, CURRENT_DATE + INTERVAL '2 days', '08:00', true, NOW()),
(2, CURRENT_DATE + INTERVAL '2 days', '09:00', true, NOW()),
(2, CURRENT_DATE + INTERVAL '2 days', '10:00', true, NOW()),
(2, CURRENT_DATE + INTERVAL '2 days', '11:00', true, NOW()),
(2, CURRENT_DATE + INTERVAL '2 days', '14:00', true, NOW()),
(2, CURRENT_DATE + INTERVAL '2 days', '15:00', true, NOW()),

(3, CURRENT_DATE + INTERVAL '3 days', '08:30', true, NOW()),
(3, CURRENT_DATE + INTERVAL '3 days', '09:30', true, NOW()),
(3, CURRENT_DATE + INTERVAL '3 days', '10:30', true, NOW()),
(3, CURRENT_DATE + INTERVAL '3 days', '11:30', true, NOW()),
(3, CURRENT_DATE + INTERVAL '3 days', '14:30', true, NOW()),
(3, CURRENT_DATE + INTERVAL '3 days', '15:30', true, NOW());

-- Insert sample reminders
INSERT INTO reminders (appointmentId, userId, doctorId, reminderType, scheduledAt, status, createdAt) VALUES
(1, 1, 1, 'email', CURRENT_DATE + INTERVAL '1 day' - INTERVAL '1 hour', 'pending', NOW()),
(1, 1, 1, 'sms', CURRENT_DATE + INTERVAL '1 day' - INTERVAL '2 hours', 'pending', NOW()),
(2, 1, 3, 'email', CURRENT_DATE + INTERVAL '3 days' - INTERVAL '1 hour', 'pending', NOW()),
(3, 2, 2, 'email', CURRENT_DATE + INTERVAL '2 days' - INTERVAL '1 hour', 'pending', NOW());

-- Insert sample audit logs
INSERT INTO audit_logs (userId, action, tableName, recordId, newValues, ipAddress, userAgent, createdAt) VALUES
(1, 'CREATE', 'appointments', 1, '{"status": "scheduled", "reason": "Regular checkup"}', '127.0.0.1', 'Mozilla/5.0', NOW()),
(2, 'CREATE', 'appointments', 2, '{"status": "confirmed", "reason": "Child wellness visit"}', '127.0.0.1', 'Mozilla/5.0', NOW()),
(1, 'UPDATE', 'appointments', 2, '{"status": "confirmed"}', '127.0.0.1', 'Mozilla/5.0', NOW() - INTERVAL '1 day');

-- Insert sample error logs
INSERT INTO error_logs (userId, errorType, errorMessage, url, method, userAgent, ipAddress, createdAt) VALUES
(NULL, 'ValidationError', 'Phone number is required', '/api/auth/send-otp', 'POST', 'Mozilla/5.0', '127.0.0.1', NOW() - INTERVAL '2 hours'),
(1, 'NetworkError', 'Failed to connect to database', '/api/doctors', 'GET', 'Mozilla/5.0', '127.0.0.1', NOW() - INTERVAL '1 day');

-- Insert sample email logs
INSERT INTO email_logs (userId, toEmail, subject, body, status, sentAt, createdAt) VALUES
(1, 'john.doe@email.com', 'Appointment Confirmed', 'Your appointment has been confirmed...', 'sent', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours'),
(2, 'jane.smith@email.com', 'Appointment Reminder', 'Reminder: Your appointment is tomorrow...', 'sent', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day');

-- Insert sample SMS logs
INSERT INTO sms_logs (userId, toPhone, message, status, sentAt, createdAt) VALUES
(1, '+1234567890', 'Your OTP is 123456', 'sent', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes'),
(2, '+1234567891', 'Appointment reminder for tomorrow', 'sent', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours');
