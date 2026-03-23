import { executeQuery } from '../config/database.js';

// Validate time slot availability with strict rules
export const validateTimeSlot = async (doctorId, date, time, excludeAppointmentId = null) => {
  try {
    // Input validation
    if (!doctorId || !date || !time) {
      throw new Error('Doctor ID, date, and time are required');
    }

    // Validate date format
    const appointmentDate = new Date(date);
    if (isNaN(appointmentDate.getTime())) {
      throw new Error('Invalid date format');
    }

    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      throw new Error('Invalid time format. Use HH:MM format');
    }

    // Parse time for calculations
    const [hours, minutes] = time.split(':').map(Number);
    const appointmentDateTime = new Date(appointmentDate);
    appointmentDateTime.setHours(hours, minutes, 0, 0);

    // Business rules validation
    const businessRules = validateBusinessRules(appointmentDate, time);
    if (!businessRules.valid) {
      return {
        valid: false,
        error: businessRules.error,
        type: 'business_rule_violation'
      };
    }

    // Check doctor availability
    const doctorAvailability = await checkDoctorAvailability(doctorId, appointmentDate);
    if (!doctorAvailability.available) {
      return {
        valid: false,
        error: doctorAvailability.error,
        type: 'doctor_unavailable'
      };
    }

    // Check for existing appointments with strict validation
    const conflicts = await checkAppointmentConflicts(doctorId, date, time, excludeAppointmentId);
    if (conflicts.hasConflict) {
      return {
        valid: false,
        error: conflicts.error,
        type: conflicts.type,
        conflictingAppointments: conflicts.appointments
      };
    }

    // Check user's existing appointments at the same time
    const userConflicts = await checkUserConflicts(null, date, time, excludeAppointmentId);
    if (userConflicts.hasConflict) {
      return {
        valid: false,
        error: userConflicts.error,
        type: 'user_time_conflict',
        conflictingAppointments: userConflicts.appointments
      };
    }

    // Check slot capacity limits
    const capacityCheck = await checkSlotCapacity(doctorId, date, time);
    if (!capacityCheck.available) {
      return {
        valid: false,
        error: capacityCheck.error,
        type: 'capacity_exceeded',
        currentCapacity: capacityCheck.current,
        maxCapacity: capacityCheck.max
      };
    }

    return {
      valid: true,
      message: 'Time slot is available',
      appointmentDateTime: appointmentDateTime.toISOString()
    };

  } catch (error) {
    console.error('Validate time slot error:', error);
    return {
      valid: false,
      error: error.message,
      type: 'validation_error'
    };
  }
};

// Validate business rules
const validateBusinessRules = (date, time) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const appointmentDate = new Date(date);
  
  // Don't allow appointments in the past
  if (appointmentDate < today) {
    return {
      valid: false,
      error: 'Cannot book appointments in the past'
    };
  }

  // Check if it's a weekend
  const dayOfWeek = appointmentDate.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return {
      valid: false,
      error: 'Appointments can only be booked on weekdays (Monday-Friday)'
    };
  }

  // Parse time for business hours check
  const [hours, minutes] = time.split(':').map(Number);
  
  // Business hours: 9:00 AM - 5:00 PM
  if (hours < 9 || hours > 17 || (hours === 17 && minutes > 0)) {
    return {
      valid: false,
      error: 'Appointment must be between 9:00 AM and 5:00 PM'
    };
  }

  // Don't allow appointments within the next 2 hours
  const appointmentDateTime = new Date(appointmentDate);
  appointmentDateTime.setHours(hours, minutes, 0, 0);
  const minBookingTime = new Date(now.getTime() + (2 * 60 * 60 * 1000)); // 2 hours from now
  
  if (appointmentDateTime < minBookingTime) {
    return {
      valid: false,
      error: 'Appointments must be booked at least 2 hours in advance'
    };
  }

  return { valid: true };
};

// Check doctor availability
const checkDoctorAvailability = async (doctorId, date) => {
  try {
    const query = `
      SELECT available, workingHours, breakTime 
      FROM doctors 
      WHERE id = ?
    `;
    
    const doctors = await executeQuery(query, [doctorId]);
    
    if (doctors.length === 0) {
      return {
        available: false,
        error: 'Doctor not found'
      };
    }

    const doctor = doctors[0];
    
    if (!doctor.available) {
      return {
        available: false,
        error: 'Doctor is currently unavailable for appointments'
      };
    }

    // Check if doctor has any blocked dates
    const blockedDateQuery = `
      SELECT id FROM doctor_blocked_dates 
      WHERE doctorId = ? AND date = ? AND isAvailable = FALSE
    `;
    
    const blockedDates = await executeQuery(blockedDateQuery, [doctorId, date]);
    
    if (blockedDates.length > 0) {
      return {
        available: false,
        error: 'Doctor is not available on this date'
      };
    }

    return { available: true };
    
  } catch (error) {
    console.error('Check doctor availability error:', error);
    return {
      available: false,
      error: 'Failed to check doctor availability'
    };
  }
};

// Check for appointment conflicts with strict validation
const checkAppointmentConflicts = async (doctorId, date, time, excludeAppointmentId = null) => {
  try {
    // Check for appointments within 30 minutes (strict validation)
    const conflictQuery = `
      SELECT id, time, status, reason 
      FROM appointments 
      WHERE doctorId = ? 
        AND date = ? 
        AND status NOT IN ('cancelled', 'no-show')
        AND id != ?
        AND ABS(TIMESTAMPDIFF(MINUTE, time, ?)) < 30
      ORDER BY time
    `;
    
    const conflicts = await executeQuery(conflictQuery, [doctorId, date, excludeAppointmentId || 0, time]);
    
    if (conflicts.length > 0) {
      const conflictingTimes = conflicts.map(c => c.time).join(', ');
      return {
        hasConflict: true,
        error: `Time slot conflicts with existing appointment(s) at ${conflictingTimes}. Please choose a different time.`,
        type: 'time_conflict',
        appointments: conflicts
      };
    }

    // Check for same-day appointment limits (max 8 appointments per day per doctor)
    const dailyLimitQuery = `
      SELECT COUNT(*) as appointmentCount
      FROM appointments 
      WHERE doctorId = ? 
        AND date = ? 
        AND status NOT IN ('cancelled', 'no-show')
    `;
    
    const dailyLimit = await executeQuery(dailyLimitQuery, [doctorId, date]);
    
    if (dailyLimit[0].appointmentCount >= 8) {
      return {
        hasConflict: true,
        error: 'Doctor has reached the maximum number of appointments for this day',
        type: 'daily_limit_exceeded',
        appointments: conflicts,
        currentCount: dailyLimit[0].appointmentCount,
        maxCount: 8
      };
    }

    return { hasConflict: false };
    
  } catch (error) {
    console.error('Check appointment conflicts error:', error);
    return {
      hasConflict: true,
      error: 'Failed to check appointment conflicts',
      type: 'system_error'
    };
  }
};

// Check user's existing appointments at the same time
const checkUserConflicts = async (userId, date, time, excludeAppointmentId = null) => {
  try {
    if (!userId) return { hasConflict: false };

    const conflictQuery = `
      SELECT id, time, doctorId, d.firstName as doctorFirstName, d.lastName as doctorLastName
      FROM appointments a
      JOIN doctors d ON a.doctorId = d.id
      WHERE a.userId = ? 
        AND a.date = ? 
        AND a.status NOT IN ('cancelled', 'no-show')
        AND a.id != ?
        AND ABS(TIMESTAMPDIFF(MINUTE, a.time, ?)) < 30
    `;
    
    const conflicts = await executeQuery(conflictQuery, [userId, date, excludeAppointmentId || 0, time]);
    
    if (conflicts.length > 0) {
      const conflict = conflicts[0];
      return {
        hasConflict: true,
        error: `You already have an appointment at ${conflict.time} with Dr. ${conflict.doctorFirstName} ${conflict.doctorLastName}`,
        type: 'user_time_conflict',
        appointments: conflicts
      };
    }

    return { hasConflict: false };
    
  } catch (error) {
    console.error('Check user conflicts error:', error);
    return {
      hasConflict: true,
      error: 'Failed to check user conflicts',
      type: 'system_error'
    };
  }
};

// Check slot capacity limits
const checkSlotCapacity = async (doctorId, date, time) => {
  try {
    // Check time slot capacity from time_slots table
    const slotQuery = `
      SELECT maxAppointments, currentAppointments
      FROM time_slots 
      WHERE doctorId = ? AND date = ? AND startTime <= ? AND endTime > ?
    `;
    
    const slots = await executeQuery(slotQuery, [doctorId, date, time, time]);
    
    if (slots.length > 0) {
      const slot = slots[0];
      if (slot.currentAppointments >= slot.maxAppointments) {
        return {
          available: false,
          error: 'This time slot is fully booked',
          current: slot.currentAppointments,
          max: slot.maxAppointments
        };
      }
    }

    return { available: true };
    
  } catch (error) {
    console.error('Check slot capacity error:', error);
    return {
      available: false,
      error: 'Failed to check slot capacity'
    };
  }
};

// Get available time slots for a doctor on a specific date
export const getAvailableTimeSlots = async (doctorId, date) => {
  try {
    const availableSlots = [];
    const businessHours = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
    ];

    for (const time of businessHours) {
      const validation = await validateTimeSlot(doctorId, date, time);
      if (validation.valid) {
        availableSlots.push({
          time,
          available: true
        });
      } else {
        availableSlots.push({
          time,
          available: false,
          reason: validation.error,
          type: validation.type
        });
      }
    }

    return {
      doctorId,
      date,
      availableSlots,
      totalSlots: businessHours.length,
      availableCount: availableSlots.filter(slot => slot.available).length
    };
    
  } catch (error) {
    console.error('Get available time slots error:', error);
    throw error;
  }
};

// Validate appointment rescheduling
export const validateReschedule = async (appointmentId, newDate, newTime) => {
  try {
    // Get existing appointment details
    const appointmentQuery = `
      SELECT doctorId, userId, date, time, status
      FROM appointments 
      WHERE id = ?
    `;
    
    const appointments = await executeQuery(appointmentQuery, [appointmentId]);
    
    if (appointments.length === 0) {
      return {
        valid: false,
        error: 'Appointment not found'
      };
    }

    const appointment = appointments[0];
    
    // Check if appointment can be rescheduled
    if (['cancelled', 'completed', 'no-show'].includes(appointment.status)) {
      return {
        valid: false,
        error: `Cannot reschedule ${appointment.status} appointments`
      };
    }

    // Check rescheduling time limits (24 hours before appointment)
    const currentDateTime = new Date(`${appointment.date} ${appointment.time}`);
    const now = new Date();
    const timeDiff = currentDateTime - now;
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    if (hoursDiff < 24) {
      return {
        valid: false,
        error: 'Cannot reschedule appointments less than 24 hours in advance'
      };
    }

    // Validate new time slot
    const validation = await validateTimeSlot(
      appointment.doctorId, 
      newDate, 
      newTime, 
      appointmentId
    );

    return validation;
    
  } catch (error) {
    console.error('Validate reschedule error:', error);
    return {
      valid: false,
      error: 'Failed to validate reschedule'
    };
  }
};
