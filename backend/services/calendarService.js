import { executeQuery } from '../config/database.js';
import { getAvailableTimeSlots } from './slotValidationService.js';

// Get doctor's monthly calendar with availability
export const getDoctorCalendar = async (doctorId, year, month) => {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of month
    
    const calendar = {
      doctorId,
      year,
      month,
      days: [],
      summary: {
        totalDays: endDate.getDate(),
        availableDays: 0,
        fullyBookedDays: 0,
        unavailableDays: 0,
        totalAppointments: 0
      }
    };

    // Get doctor's availability settings
    const doctorQuery = `
      SELECT available, workingHours, breakTime, consultationDuration
      FROM doctors 
      WHERE id = ?
    `;
    
    const doctors = await executeQuery(doctorQuery, [doctorId]);
    
    if (doctors.length === 0) {
      throw new Error('Doctor not found');
    }

    const doctor = doctors[0];
    
    // Get blocked dates
    const blockedDatesQuery = `
      SELECT date, isAvailable, notes
      FROM doctor_blocked_dates 
      WHERE doctorId = ? 
        AND date BETWEEN ? AND ?
      ORDER BY date
    `;
    
    const blockedDates = await executeQuery(blockedDatesQuery, [
      doctorId, 
      formatDateForDB(startDate), 
      formatDateForDB(endDate)
    ]);

    const blockedDatesMap = new Map(
      blockedDates.map(date => [date.date, date])
    );

    // Get existing appointments for the month
    const appointmentsQuery = `
      SELECT date, COUNT(*) as appointmentCount,
             SUM(CASE WHEN status = 'cancelled' OR status = 'no-show' THEN 1 ELSE 0 END) as cancelledCount
      FROM appointments 
      WHERE doctorId = ? 
        AND date BETWEEN ? AND ?
        AND status NOT IN ('cancelled', 'no-show')
      GROUP BY date
      ORDER BY date
    `;
    
    const appointments = await executeQuery(appointmentsQuery, [
      doctorId,
      formatDateForDB(startDate),
      formatDateForDB(endDate)
    ]);

    const appointmentsMap = new Map(
      appointments.map(apt => [apt.date, apt.appointmentCount])
    );

    // Generate calendar days
    for (let day = 1; day <= endDate.getDate(); day++) {
      const currentDate = new Date(year, month - 1, day);
      const dateStr = formatDateForDB(currentDate);
      const dayOfWeek = currentDate.getDay();
      
      // Determine availability
      let availability = determineDayAvailability(
        dayOfWeek,
        doctor.available,
        blockedDatesMap.get(dateStr),
        appointmentsMap.get(dateStr)
      );

      // Get available time slots for available days
      let availableSlots = [];
      if (availability.isAvailable && !availability.isFullyBooked) {
        try {
          const slots = await getAvailableTimeSlots(doctorId, dateStr);
          availableSlots = slots.availableSlots.filter(slot => slot.available);
        } catch (error) {
          console.error(`Error getting slots for ${dateStr}:`, error);
        }
      }

      const dayInfo = {
        date: dateStr,
        day,
        dayOfWeek,
        availability,
        appointmentCount: appointmentsMap.get(dateStr) || 0,
        availableSlots: availableSlots.length,
        maxSlots: 12, // Standard business slots
        blockedInfo: blockedDatesMap.get(dateStr),
        isToday: isToday(currentDate),
        isPast: currentDate < new Date().setHours(0, 0, 0, 0)
      };

      calendar.days.push(dayInfo);

      // Update summary
      if (availability.isAvailable) {
        calendar.summary.availableDays++;
        if (availability.isFullyBooked) {
          calendar.summary.fullyBookedDays++;
        }
      } else {
        calendar.summary.unavailableDays++;
      }
      
      calendar.summary.totalAppointments += dayInfo.appointmentCount;
    }

    return calendar;
    
  } catch (error) {
    console.error('Get doctor calendar error:', error);
    throw error;
  }
};

// Determine day availability
const determineDayAvailability = (dayOfWeek, doctorAvailable, blockedInfo, appointmentCount) => {
  // Check if it's a weekend
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return {
      isAvailable: false,
      reason: 'Weekend',
      type: 'weekend'
    };
  }

  // Check if doctor is available
  if (!doctorAvailable) {
    return {
      isAvailable: false,
      reason: 'Doctor unavailable',
      type: 'doctor_unavailable'
    };
  }

  // Check if date is blocked
  if (blockedInfo && !blockedInfo.isAvailable) {
    return {
      isAvailable: false,
      reason: blockedInfo.notes || 'Doctor unavailable on this date',
      type: 'blocked_date',
      blockedInfo
    };
  }

  // Check if fully booked (8 appointments max per day)
  if (appointmentCount >= 8) {
    return {
      isAvailable: true,
      isFullyBooked: true,
      reason: 'All slots booked',
      type: 'fully_booked'
    };
  }

  return {
    isAvailable: true,
    isFullyBooked: false,
    type: 'available'
  };
};

// Get doctor's weekly availability
export const getDoctorWeeklyAvailability = async (doctorId, startDate) => {
  try {
    const weeklyCalendar = {
      doctorId,
      startDate: formatDateForDB(startDate),
      days: [],
      summary: {
        totalDays: 7,
        availableDays: 0,
        totalAvailableSlots: 0,
        totalBookedSlots: 0
      }
    };

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateStr = formatDateForDB(currentDate);

      try {
        const dayCalendar = await getDoctorCalendar(doctorId, currentDate.getFullYear(), currentDate.getMonth() + 1);
        const dayInfo = dayCalendar.days.find(day => day.date === dateStr);

        if (dayInfo) {
          weeklyCalendar.days.push(dayInfo);
          
          if (dayInfo.availability.isAvailable) {
            weeklyCalendar.summary.availableDays++;
            weeklyCalendar.summary.totalAvailableSlots += dayInfo.availableSlots;
            weeklyCalendar.summary.totalBookedSlots += dayInfo.appointmentCount;
          }
        }
      } catch (error) {
        console.error(`Error getting calendar for ${dateStr}:`, error);
      }
    }

    return weeklyCalendar;
    
  } catch (error) {
    console.error('Get doctor weekly availability error:', error);
    throw error;
  }
};

// Set doctor availability for specific dates
export const setDoctorAvailability = async (doctorId, availabilityData) => {
  try {
    const results = [];

    for (const data of availabilityData) {
      const { date, isAvailable, notes } = data;
      
      // Check if date already exists
      const existingQuery = `
        SELECT id FROM doctor_blocked_dates 
        WHERE doctorId = ? AND date = ?
      `;
      
      const existing = await executeQuery(existingQuery, [doctorId, date]);
      
      if (existing.length > 0) {
        // Update existing record
        const updateQuery = `
          UPDATE doctor_blocked_dates 
          SET isAvailable = ?, notes = ?, updatedAt = NOW()
          WHERE doctorId = ? AND date = ?
        `;
        
        await executeQuery(updateQuery, [isAvailable, notes, doctorId, date]);
        results.push({ date, action: 'updated', isAvailable });
      } else {
        // Insert new record
        const insertQuery = `
          INSERT INTO doctor_blocked_dates (doctorId, date, isAvailable, notes, createdAt)
          VALUES (?, ?, ?, ?, NOW())
        `;
        
        await executeQuery(insertQuery, [doctorId, date, isAvailable, notes]);
        results.push({ date, action: 'created', isAvailable });
      }
    }

    return results;
    
  } catch (error) {
    console.error('Set doctor availability error:', error);
    throw error;
  }
};

// Get doctor's availability patterns
export const getDoctorAvailabilityPatterns = async (doctorId) => {
  try {
    const patterns = {
      regularSchedule: {},
      exceptions: [],
      statistics: {
        totalDays: 0,
        availableDays: 0,
        averageAppointmentsPerDay: 0
      }
    };

    // Get regular weekly schedule
    const scheduleQuery = `
      SELECT dayOfWeek, isAvailable, startTime, endTime, maxAppointments
      FROM doctor_weekly_schedule 
      WHERE doctorId = ?
      ORDER BY dayOfWeek
    `;
    
    const schedule = await executeQuery(scheduleQuery, [doctorId]);
    
    patterns.regularSchedule = schedule.reduce((acc, item) => {
      acc[item.dayOfWeek] = item;
      return acc;
    }, {});

    // Get exceptions (blocked dates) for next 3 months
    const exceptionsQuery = `
      SELECT date, isAvailable, notes
      FROM doctor_blocked_dates 
      WHERE doctorId = ? 
        AND date >= CURDATE()
        AND date <= DATE_ADD(CURDATE(), INTERVAL 3 MONTH)
      ORDER BY date
    `;
    
    patterns.exceptions = await executeQuery(exceptionsQuery, [doctorId]);

    // Calculate statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as totalDays,
        SUM(CASE WHEN isAvailable THEN 1 ELSE 0 END) as availableDays,
        AVG(appointmentCount) as avgAppointments
      FROM (
        SELECT 
          d.date,
          COALESCE(bd.isAvailable, TRUE) as isAvailable,
          COUNT(a.id) as appointmentCount
        FROM (
          SELECT CURDATE() + INTERVAL seq DAY as date
          FROM (
            SELECT 0 as seq UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
            UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
            UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14
            UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19
            UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24
            UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29
            UNION SELECT 30 UNION SELECT 31 UNION SELECT 32 UNION SELECT 33 UNION SELECT 34
            UNION SELECT 35 UNION SELECT 36 UNION SELECT 37 UNION SELECT 38 UNION SELECT 39
            UNION SELECT 40 UNION SELECT 41 UNION SELECT 42 UNION SELECT 43 UNION SELECT 44
            UNION SELECT 45 UNION SELECT 46 UNION SELECT 47 UNION SELECT 48 UNION SELECT 49
            UNION SELECT 50 UNION SELECT 51 UNION SELECT 52 UNION SELECT 53 UNION SELECT 54
            UNION SELECT 55 UNION SELECT 56 UNION SELECT 57 UNION SELECT 58 UNION SELECT 59
            UNION SELECT 60 UNION SELECT 61 UNION SELECT 62 UNION SELECT 63 UNION SELECT 64
            UNION SELECT 65 UNION SELECT 66 UNION SELECT 67 UNION SELECT 68 UNION SELECT 69
            UNION SELECT 70 UNION SELECT 71 UNION SELECT 72 UNION SELECT 73 UNION SELECT 74
            UNION SELECT 75 UNION SELECT 76 UNION SELECT 77 UNION SELECT 78 UNION SELECT 79
            UNION SELECT 80 UNION SELECT 81 UNION SELECT 82 UNION SELECT 83 UNION SELECT 84
            UNION SELECT 85 UNION SELECT 86 UNION SELECT 87 UNION SELECT 88 UNION SELECT 89
            UNION SELECT 90
          ) as seq_numbers
          WHERE CURDATE() + INTERVAL seq DAY <= DATE_ADD(CURDATE(), INTERVAL 3 MONTH)
        ) d
        LEFT JOIN doctor_blocked_dates bd ON d.date = bd.date
        LEFT JOIN appointments a ON d.date = a.date AND a.doctorId = ? AND a.status NOT IN ('cancelled', 'no-show')
        WHERE DAYOFWEEK(d.date) NOT IN (1, 7) -- Exclude weekends
        GROUP BY d.date, bd.isAvailable
      ) as stats
    `;
    
    const stats = await executeQuery(statsQuery, [doctorId]);
    
    if (stats.length > 0) {
      patterns.statistics = {
        totalDays: stats[0].totalDays,
        availableDays: stats[0].availableDays,
        averageAppointmentsPerDay: Math.round(stats[0].avgAppointments * 10) / 10
      };
    }

    return patterns;
    
  } catch (error) {
    console.error('Get doctor availability patterns error:', error);
    throw error;
  }
};

// Helper functions
const formatDateForDB = (date) => {
  return date.toISOString().split('T')[0];
};

const isToday = (date) => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

// Create recurring availability pattern
export const createRecurringAvailability = async (doctorId, pattern) => {
  try {
    const { 
      startDate, 
      endDate, 
      dayOfWeek, 
      isAvailable, 
      startTime, 
      endTime, 
      maxAppointments,
      notes 
    } = pattern;

    // Validate pattern
    if (!startDate || !endDate || dayOfWeek === undefined) {
      throw new Error('Start date, end date, and day of week are required');
    }

    // Create recurring dates
    const dates = [];
    const current = new Date(startDate);
    
    while (current <= new Date(endDate)) {
      if (current.getDay() === dayOfWeek) {
        dates.push(formatDateForDB(current));
      }
      current.setDate(current.getDate() + 1);
    }

    // Set availability for all dates
    const availabilityData = dates.map(date => ({
      date,
      isAvailable,
      notes: notes || `Recurring ${isAvailable ? 'available' : 'unavailable'}`
    }));

    return await setDoctorAvailability(doctorId, availabilityData);
    
  } catch (error) {
    console.error('Create recurring availability error:', error);
    throw error;
  }
};
