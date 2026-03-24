import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { executeQuery } from './config/database.js';

import authRoutes from './routes/auth.js';
import appointmentRoutes from './routes/appointments.js';
import userRoutes from './routes/users.js';
import doctorRoutes from './routes/doctors.js';
import notificationRoutes from './routes/notifications.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});

app.use(helmet());
app.use(cors({
  origin: ['https://medibook-saas-1.onrender.com', 'http://localhost:3000'],
  credentials: true
}));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Error logging endpoint
app.post('/api/errors', (req, res) => {
  try {
    const { error, stack, componentStack, timestamp, userAgent, url } = req.body;
    console.error('Frontend Error:', {
      error,
      stack,
      componentStack,
      timestamp,
      userAgent,
      url
    });
    res.status(200).json({ message: 'Error logged successfully' });
  } catch (error) {
    console.error('Error logging failed:', error);
    res.status(500).json({ message: 'Failed to log error' });
  }
});

// Initialize database tables on startup
const initializeDatabase = async () => {
  try {
    console.log('🔧 Initializing database tables...');
    
    // Create users table
    await executeQuery(`
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
      )
    `);
    
    // Create doctors table
    await executeQuery(`
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
      )
    `);
    
    // Create appointments table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        userId INTEGER NOT NULL,
        doctorId INTEGER NOT NULL,
        date DATE NOT NULL,
        time TIME NOT NULL,
        reason TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'scheduled',
        notes TEXT,
        consultationFee DECIMAL(10,2),
        paymentStatus VARCHAR(20) DEFAULT 'pending',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (doctorId) REFERENCES doctors(id) ON DELETE CASCADE
      )
    `);
    
    // Create OTP codes table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS otp_codes (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(20) NOT NULL,
        code VARCHAR(6) NOT NULL,
        expiresAt TIMESTAMP NOT NULL,
        isUsed BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Insert sample doctors if table is empty
    const doctorCount = await executeQuery('SELECT COUNT(*) as count FROM doctors');
    if (doctorCount[0].count === 0) {
      await executeQuery(`
        INSERT INTO doctors (firstName, lastName, specialty, experience, rating, consultationFee, available) VALUES
        ('Sarah', 'Johnson', 'Cardiology', '12 years', 4.8, 150.00, true),
        ('Michael', 'Chen', 'Dermatology', '8 years', 4.9, 120.00, true),
        ('Emily', 'Rodriguez', 'Pediatrics', '15 years', 4.7, 100.00, true),
        ('David', 'Kim', 'Orthopedics', '10 years', 4.6, 180.00, true),
        ('Lisa', 'Thompson', 'General Practice', '20 years', 4.8, 80.00, true),
        ('James', 'Wilson', 'Neurology', '12 years', 4.9, 200.00, true),
        ('Maria', 'Garcia', 'Gynecology', '18 years', 4.7, 130.00, true),
        ('Robert', 'Taylor', 'Psychiatry', '25 years', 4.5, 140.00, true)
      `);
      console.log('✅ Sample doctors inserted');
    }
    
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
};

app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/notifications', notificationRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  
  // Initialize database on startup
  await initializeDatabase();
});
