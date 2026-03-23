-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS clinic_booking;
USE clinic_booking;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    firstName VARCHAR(50) NOT NULL,
    lastName VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255),
    phone VARCHAR(20) UNIQUE NOT NULL,
    address TEXT,
    dateOfBirth DATE,
    emailVerified BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    lastLogin TIMESTAMP NULL
);

-- Doctors table
CREATE TABLE IF NOT EXISTS doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
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
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    doctorId INT NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    reason TEXT NOT NULL,
    status ENUM('scheduled', 'completed', 'cancelled', 'no-show') DEFAULT 'scheduled',
    notes TEXT,
    consultationFee DECIMAL(10,2),
    paymentStatus ENUM('pending', 'paid', 'refunded') DEFAULT 'pending',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (doctorId) REFERENCES doctors(id) ON DELETE CASCADE,
    UNIQUE KEY unique_appointment (doctorId, date, time, status)
);

-- Time slots table for doctor availability
CREATE TABLE IF NOT EXISTS time_slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doctorId INT NOT NULL,
    date DATE NOT NULL,
    startTime TIME NOT NULL,
    endTime TIME NOT NULL,
    isAvailable BOOLEAN DEFAULT TRUE,
    maxAppointments INT DEFAULT 1,
    currentAppointments INT DEFAULT 0,
    slotType ENUM('regular', 'emergency', 'consultation') DEFAULT 'regular',
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (doctorId) REFERENCES doctors(id) ON DELETE CASCADE,
    INDEX idx_timeslot_doctor_date (doctorId, date),
    INDEX idx_timeslot_available (isAvailable, date)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    doctorId INT NULL,
    appointmentId INT NULL,
    type ENUM('appointment', 'reminder', 'cancellation', 'reschedule', 'payment', 'system', 'promotion', 'feedback') NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    isRead BOOLEAN DEFAULT FALSE,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    actionUrl VARCHAR(500),
    actionText VARCHAR(100),
    expiresAt TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    readAt TIMESTAMP NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (doctorId) REFERENCES doctors(id) ON DELETE SET NULL,
    FOREIGN KEY (appointmentId) REFERENCES appointments(id) ON DELETE CASCADE,
    INDEX idx_notification_user (userId, isRead),
    INDEX idx_notification_type (type),
    INDEX idx_notification_priority (priority),
    INDEX idx_notification_expires (expiresAt)
);

-- Medical records table
CREATE TABLE IF NOT EXISTS medical_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    doctorId INT NOT NULL,
    appointmentId INT NOT NULL,
    diagnosis TEXT,
    treatment TEXT,
    prescription TEXT,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (doctorId) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (appointmentId) REFERENCES appointments(id) ON DELETE CASCADE
);

-- Prescriptions table
CREATE TABLE IF NOT EXISTS prescriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    doctorId INT NOT NULL,
    appointmentId INT NOT NULL,
    medication VARCHAR(200) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    duration VARCHAR(100) NOT NULL,
    instructions TEXT,
    status ENUM('active', 'completed', 'discontinued') DEFAULT 'active',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (doctorId) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (appointmentId) REFERENCES appointments(id) ON DELETE CASCADE
);

-- OTP table for authentication
CREATE TABLE IF NOT EXISTS otp_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(6) NOT NULL,
    attempts INT DEFAULT 0,
    isUsed BOOLEAN DEFAULT FALSE,
    expiresAt TIMESTAMP NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_otp_phone (phone),
    INDEX idx_otp_expires (expiresAt)
);

-- Insert sample doctors
INSERT INTO doctors (firstName, lastName, specialty, experience, rating, available, bio, education) VALUES
('Sarah', 'Johnson', 'General Medicine', '10+ years', 4.8, TRUE, 'Experienced general practitioner with expertise in preventive care and chronic disease management.', 'MD from Harvard Medical School'),
('Michael', 'Chen', 'Dentistry', '8+ years', 4.9, TRUE, 'Specialized in cosmetic dentistry and oral surgery.', 'DDS from UCLA School of Dentistry'),
('Emily', 'Davis', 'Ophthalmology', '12+ years', 4.7, FALSE, 'Expert in laser eye surgery and treatment of retinal diseases.', 'MD from Johns Hopkins University'),
('James', 'Wilson', 'Cardiology', '15+ years', 4.9, TRUE, 'Specialized in interventional cardiology and heart disease prevention.', 'MD from Mayo Clinic College of Medicine'),
('Lisa', 'Anderson', 'Pediatrics', '7+ years', 4.8, TRUE, 'Dedicated to providing comprehensive care for children from infancy through adolescence.', 'MD from Stanford University School of Medicine'),
('Robert', 'Taylor', 'Orthopedics', '11+ years', 4.6, TRUE, 'Expert in joint replacement and sports medicine.', 'MD from Columbia University Vagelos College of Physicians and Surgeons');

-- Create indexes for better performance
CREATE INDEX idx_appointments_user_id ON appointments(userId);
CREATE INDEX idx_appointments_doctor_id ON appointments(doctorId);
CREATE INDEX idx_appointments_date ON appointments(date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_medical_records_user_id ON medical_records(userId);
CREATE INDEX idx_prescriptions_user_id ON prescriptions(userId);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_doctors_specialty ON doctors(specialty);
