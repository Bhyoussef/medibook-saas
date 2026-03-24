-- MediBook PostgreSQL Schema
-- This creates the database structure for PostgreSQL

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    firstName VARCHAR(50) NOT NULL,
    lastName VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255),
    phone VARCHAR(20) UNIQUE NOT NULL,
    address TEXT,
    dateOfBirth DATE,
    emailVerified BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lastLogin TIMESTAMP NULL
);

-- Doctors table
CREATE TABLE IF NOT EXISTS doctors (
    id SERIAL PRIMARY KEY,
    firstName VARCHAR(50) NOT NULL,
    lastName VARCHAR(50) NOT NULL,
    specialty VARCHAR(100) NOT NULL,
    experience VARCHAR(50) NOT NULL,
    rating DECIMAL(3,2) DEFAULT 0.00,
    available BOOLEAN DEFAULT TRUE,
    bio TEXT,
    education TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    consultationFee DECIMAL(10,2),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    userId INTEGER NOT NULL,
    doctorId INTEGER NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no-show')),
    notes TEXT,
    consultationFee DECIMAL(10,2),
    paymentStatus VARCHAR(20) DEFAULT 'pending' CHECK (paymentStatus IN ('pending', 'paid', 'refunded')),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (doctorId) REFERENCES doctors(id) ON DELETE CASCADE
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    userId INTEGER,
    doctorId INTEGER,
    appointmentId INTEGER,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'system' CHECK (type IN ('appointment', 'reminder', 'system', 'payment')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    isRead BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (doctorId) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (appointmentId) REFERENCES appointments(id) ON DELETE CASCADE
);

-- Doctor weekly schedule table
CREATE TABLE IF NOT EXISTS doctor_weekly_schedule (
    id SERIAL PRIMARY KEY,
    doctorId INTEGER NOT NULL,
    dayOfWeek INTEGER NOT NULL CHECK (dayOfWeek BETWEEN 0 AND 6),
    startTime TIME NOT NULL,
    endTime TIME NOT NULL,
    isAvailable BOOLEAN DEFAULT TRUE,
    maxAppointments INTEGER DEFAULT 4,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctorId) REFERENCES doctors(id) ON DELETE CASCADE
);

-- Doctor blocked dates table
CREATE TABLE IF NOT EXISTS doctor_blocked_dates (
    id SERIAL PRIMARY KEY,
    doctorId INTEGER NOT NULL,
    date DATE NOT NULL,
    reason TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctorId) REFERENCES doctors(id) ON DELETE CASCADE
);

-- Notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    userId INTEGER NOT NULL,
    emailNotifications BOOLEAN DEFAULT TRUE,
    smsNotifications BOOLEAN DEFAULT TRUE,
    appointmentReminders BOOLEAN DEFAULT TRUE,
    marketingEmails BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Time slots table
CREATE TABLE IF NOT EXISTS time_slots (
    id SERIAL PRIMARY KEY,
    doctorId INTEGER NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    isAvailable BOOLEAN DEFAULT TRUE,
    appointmentId INTEGER,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctorId) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (appointmentId) REFERENCES appointments(id) ON DELETE SET NULL
);

-- Reminders table
CREATE TABLE IF NOT EXISTS reminders (
    id SERIAL PRIMARY KEY,
    appointmentId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    doctorId INTEGER NOT NULL,
    reminderType VARCHAR(50) NOT NULL CHECK (reminderType IN ('email', 'sms', 'push')),
    scheduledAt TIMESTAMP NOT NULL,
    sentAt TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointmentId) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (doctorId) REFERENCES doctors(id) ON DELETE CASCADE
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    userId INTEGER,
    action VARCHAR(100) NOT NULL,
    tableName VARCHAR(50),
    recordId INTEGER,
    oldValues JSONB,
    newValues JSONB,
    ipAddress VARCHAR(45),
    userAgent TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
);

-- Error logs table
CREATE TABLE IF NOT EXISTS error_logs (
    id SERIAL PRIMARY KEY,
    userId INTEGER,
    errorType VARCHAR(100) NOT NULL,
    errorMessage TEXT NOT NULL,
    stackTrace TEXT,
    url VARCHAR(500),
    method VARCHAR(10),
    requestBody JSONB,
    userAgent TEXT,
    ipAddress VARCHAR(45),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
);

-- Email logs table
CREATE TABLE IF NOT EXISTS email_logs (
    id SERIAL PRIMARY KEY,
    userId INTEGER,
    toEmail VARCHAR(100) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    errorMessage TEXT,
    sentAt TIMESTAMP,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
);

-- SMS logs table
CREATE TABLE IF NOT EXISTS sms_logs (
    id SERIAL PRIMARY KEY,
    userId INTEGER,
    toPhone VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    errorMessage TEXT,
    sentAt TIMESTAMP,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON doctors(specialty);
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(userId);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctorId);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(userId);
CREATE INDEX IF NOT EXISTS idx_notifications_doctor_id ON notifications(doctorId);
CREATE INDEX IF NOT EXISTS idx_time_slots_doctor_date ON time_slots(doctorId, date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(userId);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(createdAt);
