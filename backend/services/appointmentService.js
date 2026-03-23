import { executeQuery } from '../config/database.js';

export const checkAppointmentConflict = async (doctorId, date, time, excludeId = null) => {
  try {
    let query = `
      SELECT id FROM appointments 
      WHERE doctorId = ? AND date = ? AND time = ? AND status != 'cancelled'
    `;
    const params = [doctorId, date, time];
    
    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    
    const conflicts = await executeQuery(query, params);
    return conflicts.length > 0;
  } catch (error) {
    throw new Error('Error checking appointment conflict');
  }
};

export const getAvailableTimeSlots = async (doctorId, date) => {
  try {
    const bookedQuery = `
      SELECT time FROM appointments 
      WHERE doctorId = ? AND date = ? AND status != 'cancelled'
      ORDER BY time
    `;
    const bookedSlots = await executeQuery(bookedQuery, [doctorId, date]);
    
    const allTimeSlots = generateTimeSlots('09:00', '17:00', 30);
    const bookedTimes = bookedSlots.map(slot => slot.time);
    
    return allTimeSlots.filter(slot => !bookedTimes.includes(slot));
  } catch (error) {
    throw new Error('Error getting available time slots');
  }
};

export const generateTimeSlots = (startTime, endTime, intervalMinutes) => {
  const slots = [];
  const start = new Date(`2000-01-01T${startTime}`);
  const end = new Date(`2000-01-01T${endTime}`);
  
  while (start < end) {
    const timeString = start.toTimeString().slice(0, 5);
    slots.push(timeString);
    start.setMinutes(start.getMinutes() + intervalMinutes);
  }
  
  return slots;
};

export const getAppointmentsByDateRange = async (userId, startDate, endDate) => {
  try {
    const query = `
      SELECT a.*, d.firstName as doctorFirstName, d.lastName as doctorLastName, d.specialty
      FROM appointments a
      JOIN doctors d ON a.doctorId = d.id
      WHERE a.userId = ? AND a.date BETWEEN ? AND ?
      ORDER BY a.date DESC, a.time DESC
    `;
    const appointments = await executeQuery(query, [userId, startDate, endDate]);
    return appointments;
  } catch (error) {
    throw new Error('Error getting appointments by date range');
  }
};
