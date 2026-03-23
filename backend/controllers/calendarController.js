import { getDoctorCalendar, getDoctorWeeklyAvailability, setDoctorAvailability, getDoctorAvailabilityPatterns, createRecurringAvailability } from '../services/calendarService.js';
import { getAvailableTimeSlots, validateReschedule } from '../services/slotValidationService.js';

// Get doctor's calendar for a specific month
export const getDoctorCalendarController = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { year, month } = req.query;
    
    // Validate parameters
    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID is required' });
    }
    
    if (!year || !month) {
      return res.status(400).json({ message: 'Year and month are required' });
    }
    
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    
    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ message: 'Invalid year or month' });
    }
    
    // Check if user is authorized (doctor can view their own calendar, admin can view any)
    if (req.user.role !== 'admin' && req.user.id != doctorId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const calendar = await getDoctorCalendar(doctorId, yearNum, monthNum);
    
    res.json({
      success: true,
      calendar
    });
  } catch (error) {
    console.error('Get doctor calendar error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get calendar' 
    });
  }
};

// Get doctor's weekly availability
export const getDoctorWeeklyAvailabilityController = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { startDate } = req.query;
    
    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID is required' });
    }
    
    if (!startDate) {
      return res.status(400).json({ message: 'Start date is required' });
    }
    
    // Validate date format
    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      return res.status(400).json({ message: 'Invalid start date format' });
    }
    
    // Check authorization
    if (req.user.role !== 'admin' && req.user.id != doctorId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const weeklyAvailability = await getDoctorWeeklyAvailability(doctorId, start);
    
    res.json({
      success: true,
      weeklyAvailability
    });
  } catch (error) {
    console.error('Get doctor weekly availability error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get weekly availability' 
    });
  }
};

// Set doctor availability for specific dates
export const setDoctorAvailabilityController = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { availabilityData } = req.body;
    
    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID is required' });
    }
    
    if (!availabilityData || !Array.isArray(availabilityData)) {
      return res.status(400).json({ message: 'Availability data array is required' });
    }
    
    // Check authorization (only doctors can set their own availability, admin can set any)
    if (req.user.role !== 'admin' && req.user.id != doctorId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Validate availability data
    for (const data of availabilityData) {
      if (!data.date || typeof data.isAvailable !== 'boolean') {
        return res.status(400).json({ 
          message: 'Each availability entry must have date and isAvailable fields' 
        });
      }
      
      // Validate date format
      const date = new Date(data.date);
      if (isNaN(date.getTime())) {
        return res.status(400).json({ message: `Invalid date format: ${data.date}` });
      }
    }
    
    const results = await setDoctorAvailability(doctorId, availabilityData);
    
    res.json({
      success: true,
      message: 'Availability updated successfully',
      results
    });
  } catch (error) {
    console.error('Set doctor availability error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to set availability' 
    });
  }
};

// Get doctor's availability patterns
export const getDoctorAvailabilityPatternsController = async (req, res) => {
  try {
    const { doctorId } = req.params;
    
    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID is required' });
    }
    
    // Check authorization
    if (req.user.role !== 'admin' && req.user.id != doctorId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const patterns = await getDoctorAvailabilityPatterns(doctorId);
    
    res.json({
      success: true,
      patterns
    });
  } catch (error) {
    console.error('Get doctor availability patterns error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get availability patterns' 
    });
  }
};

// Create recurring availability pattern
export const createRecurringAvailabilityController = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const pattern = req.body;
    
    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID is required' });
    }
    
    if (!pattern) {
      return res.status(400).json({ message: 'Pattern data is required' });
    }
    
    // Check authorization
    if (req.user.role !== 'admin' && req.user.id != doctorId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Validate pattern data
    const { startDate, endDate, dayOfWeek, isAvailable } = pattern;
    
    if (!startDate || !endDate || dayOfWeek === undefined || typeof isAvailable !== 'boolean') {
      return res.status(400).json({ 
        message: 'Pattern must include startDate, endDate, dayOfWeek, and isAvailable' 
      });
    }
    
    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
    
    if (start > end) {
      return res.status(400).json({ message: 'Start date must be before end date' });
    }
    
    // Validate day of week
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return res.status(400).json({ message: 'Day of week must be between 0 (Sunday) and 6 (Saturday)' });
    }
    
    const results = await createRecurringAvailability(doctorId, pattern);
    
    res.json({
      success: true,
      message: 'Recurring availability created successfully',
      results
    });
  } catch (error) {
    console.error('Create recurring availability error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create recurring availability' 
    });
  }
};

// Get available time slots for a doctor on a specific date
export const getAvailableTimeSlotsController = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;
    
    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID is required' });
    }
    
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }
    
    // Validate date format
    const appointmentDate = new Date(date);
    if (isNaN(appointmentDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
    
    // Check authorization (any authenticated user can view available slots)
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const timeSlots = await getAvailableTimeSlots(doctorId, date);
    
    res.json({
      success: true,
      timeSlots
    });
  } catch (error) {
    console.error('Get available time slots error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get available time slots' 
    });
  }
};

// Validate appointment rescheduling
export const validateRescheduleController = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { newDate, newTime } = req.body;
    
    if (!appointmentId) {
      return res.status(400).json({ message: 'Appointment ID is required' });
    }
    
    if (!newDate || !newTime) {
      return res.status(400).json({ message: 'New date and time are required' });
    }
    
    // Validate date format
    const appointmentDate = new Date(newDate);
    if (isNaN(appointmentDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
    
    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(newTime)) {
      return res.status(400).json({ message: 'Invalid time format. Use HH:MM format' });
    }
    
    // Get appointment details to check authorization
    const appointmentQuery = `
      SELECT userId, doctorId, status
      FROM appointments 
      WHERE id = ?
    `;
    
    const appointments = await executeQuery(appointmentQuery, [appointmentId]);
    
    if (appointments.length === 0) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    const appointment = appointments[0];
    
    // Check authorization (user can reschedule their own appointments, doctors can reschedule their appointments, admin can reschedule any)
    if (req.user.role !== 'admin' && 
        req.user.id != appointment.userId && 
        req.user.id != appointment.doctorId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const validation = await validateReschedule(appointmentId, newDate, newTime);
    
    res.json({
      success: validation.valid,
      validation
    });
  } catch (error) {
    console.error('Validate reschedule error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to validate reschedule' 
    });
  }
};
