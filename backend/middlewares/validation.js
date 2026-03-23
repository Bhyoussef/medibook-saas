import { validationResult } from 'express-validator';

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

export const validateAppointment = [
  (req, res, next) => {
    const { doctorId, date, time, reason } = req.body;
    
    if (!doctorId || !date || !time) {
      return res.status(400).json({
        message: 'Doctor ID, date, and time are required'
      });
    }
    
    const appointmentDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (appointmentDate < today) {
      return res.status(400).json({
        message: 'Appointment date cannot be in the past'
      });
    }
    
    next();
  }
];
