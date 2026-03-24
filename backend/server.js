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

// Database setup endpoint (for initial setup)
app.post('/api/setup-database', async (req, res) => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    // Read schema file
    const schemaPath = path.join(process.cwd(), '..', 'database', 'schema_postgresql.sql');
    const seedPath = path.join(process.cwd(), '..', 'database', 'seed_data_postgresql.sql');
    
    let schemaSQL = '';
    let seedSQL = '';
    
    try {
      schemaSQL = fs.readFileSync(schemaPath, 'utf8');
      seedSQL = fs.readFileSync(seedPath, 'utf8');
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        message: 'Could not read database files',
        error: error.message 
      });
    }
    
    // Execute schema
    const schemaStatements = schemaSQL.split(';').filter(stmt => stmt.trim());
    for (const statement of schemaStatements) {
      if (statement.trim()) {
        await executeQuery(statement);
      }
    }
    
    // Execute seed data
    const seedStatements = seedSQL.split(';').filter(stmt => stmt.trim());
    for (const statement of seedStatements) {
      if (statement.trim()) {
        await executeQuery(statement);
      }
    }
    
    res.json({ 
      success: true, 
      message: 'Database setup completed successfully!',
      tablesCreated: schemaStatements.length,
      recordsInserted: seedStatements.length
    });
  } catch (error) {
    console.error('Database setup error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Database setup failed',
      error: error.message 
    });
  }
});

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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
