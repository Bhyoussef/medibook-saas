import { executeQuery } from '../config/database.js';

// Create appointment reminders
export const createAppointmentReminders = async (appointmentId, appointmentDate, appointmentTime, userId, doctorId) => {
  try {
    const reminders = [];
    const appointmentDateTime = new Date(`${appointmentDate} ${appointmentTime}`);
    const now = new Date();

    // Calculate reminder times
    const reminderTimes = [
      { hours: 24, type: 'day_before', priority: 'high' },    // 24 hours before
      { hours: 2, type: 'hours_before', priority: 'medium' },   // 2 hours before
      { hours: 1, type: 'hour_before', priority: 'high' },     // 1 hour before
      { hours: 0.5, type: 'minutes_before', priority: 'urgent' } // 30 minutes before
    ];

    for (const reminder of reminderTimes) {
      const reminderTime = new Date(appointmentDateTime.getTime() - (reminder.hours * 60 * 60 * 1000));
      
      // Only create reminders that are in the future
      if (reminderTime > now) {
        const reminderQuery = `
          INSERT INTO reminders (appointmentId, userId, doctorId, reminderTime, type, priority, status, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, 'scheduled', NOW())
        `;
        
        const result = await executeQuery(reminderQuery, [
          appointmentId,
          userId,
          doctorId,
          reminderTime,
          reminder.type,
          reminder.priority
        ]);
        
        reminders.push({
          id: result.insertId,
          appointmentId,
          reminderTime,
          type: reminder.type,
          priority: reminder.priority
        });
      }
    }

    return reminders;
  } catch (error) {
    console.error('Create appointment reminders error:', error);
    throw error;
  }
};

// Send reminder notifications
export const sendReminderNotifications = async () => {
  try {
    // Get reminders that are due to be sent
    const dueRemindersQuery = `
      SELECT r.*, a.date as appointmentDate, a.time as appointmentTime,
             u.firstName as userFirstName, u.lastName as userLastName, u.email, u.phone,
             d.firstName as doctorFirstName, d.lastName as doctorLastName, d.specialty
      FROM reminders r
      JOIN appointments a ON r.appointmentId = a.id
      JOIN users u ON r.userId = u.id
      JOIN doctors d ON r.doctorId = d.id
      WHERE r.status = 'scheduled' 
        AND r.reminderTime <= NOW()
        AND r.reminderTime > DATE_SUB(NOW(), INTERVAL 1 HOUR)
        AND a.status NOT IN ('cancelled', 'no-show')
    `;

    const dueReminders = await executeQuery(dueRemindersQuery);

    for (const reminder of dueReminders) {
      try {
        // Create notification for user
        const notificationMessage = getReminderMessage(reminder.type, reminder);
        
        await executeQuery(`
          INSERT INTO notifications (userId, doctorId, appointmentId, type, title, message, priority, createdAt)
          VALUES (?, ?, ?, 'reminder', ?, ?, ?, NOW())
        `, [
          reminder.userId,
          reminder.doctorId,
          reminder.appointmentId,
          getReminderTitle(reminder.type),
          notificationMessage,
          reminder.priority
        ]);

        // Mark reminder as sent
        await executeQuery(`
          UPDATE reminders 
          SET status = 'sent', sentAt = NOW() 
          WHERE id = ?
        `, [reminder.id]);

        console.log(`✅ Reminder sent: ${reminder.type} for appointment ${reminder.appointmentId}`);
      } catch (error) {
        console.error(`❌ Failed to send reminder ${reminder.id}:`, error);
        
        // Mark as failed
        await executeQuery(`
          UPDATE reminders 
          SET status = 'failed', error = ?, updatedAt = NOW() 
          WHERE id = ?
        `, [error.message, reminder.id]);
      }
    }

    return {
      sent: dueReminders.length,
      reminders: dueReminders
    };
  } catch (error) {
    console.error('Send reminder notifications error:', error);
    throw error;
  }
};

// Get reminder message based on type
const getReminderMessage = (type, reminder) => {
  const appointmentDate = new Date(reminder.appointmentDate).toLocaleDateString();
  const appointmentTime = reminder.appointmentTime;
  const doctorName = `Dr. ${reminder.doctorFirstName} ${reminder.doctorLastName}`;

  const messages = {
    day_before: `Your appointment with ${doctorName} is scheduled for tomorrow, ${appointmentDate} at ${appointmentTime}. Please arrive 15 minutes early.`,
    hours_before: `Reminder: Your appointment with ${doctorName} is today at ${appointmentTime}. Please make sure you're on time.`,
    hour_before: `Your appointment with ${doctorName} is in 1 hour at ${appointmentTime}. Please prepare for your visit.`,
    minutes_before: `Your appointment with ${doctorName} starts in 30 minutes at ${appointmentTime}. Please head to the clinic now.`
  };

  return messages[type] || messages.hours_before;
};

// Get reminder title based on type
const getReminderTitle = (type) => {
  const titles = {
    day_before: 'Appointment Tomorrow',
    hours_before: 'Appointment Today',
    hour_before: 'Appointment in 1 Hour',
    minutes_before: 'Appointment in 30 Minutes'
  };

  return titles[type] || 'Appointment Reminder';
};

// Get user's upcoming reminders
export const getUserReminders = async (userId) => {
  try {
    const query = `
      SELECT r.*, a.date as appointmentDate, a.time as appointmentTime,
             d.firstName as doctorFirstName, d.lastName as doctorLastName, d.specialty
      FROM reminders r
      JOIN appointments a ON r.appointmentId = a.id
      JOIN doctors d ON r.doctorId = d.id
      WHERE r.userId = ? 
        AND r.status = 'scheduled'
        AND r.reminderTime > NOW()
        AND a.status NOT IN ('cancelled', 'no-show')
      ORDER BY r.reminderTime ASC
    `;

    return await executeQuery(query, [userId]);
  } catch (error) {
    console.error('Get user reminders error:', error);
    throw error;
  }
};

// Get doctor's upcoming reminders
export const getDoctorReminders = async (doctorId) => {
  try {
    const query = `
      SELECT r.*, a.date as appointmentDate, a.time as appointmentTime,
             u.firstName as userFirstName, u.lastName as userLastName, u.phone
      FROM reminders r
      JOIN appointments a ON r.appointmentId = a.id
      JOIN users u ON r.userId = u.id
      WHERE r.doctorId = ? 
        AND r.status = 'scheduled'
        AND r.reminderTime > NOW()
        AND a.status NOT IN ('cancelled', 'no-show')
      ORDER BY r.reminderTime ASC
    `;

    return await executeQuery(query, [doctorId]);
  } catch (error) {
    console.error('Get doctor reminders error:', error);
    throw error;
  }
};

// Cancel reminders for an appointment
export const cancelAppointmentReminders = async (appointmentId) => {
  try {
    await executeQuery(`
      UPDATE reminders 
      SET status = 'cancelled', updatedAt = NOW() 
      WHERE appointmentId = ? AND status = 'scheduled'
    `, [appointmentId]);

    return true;
  } catch (error) {
    console.error('Cancel appointment reminders error:', error);
    throw error;
  }
};

// Get reminder statistics
export const getReminderStats = async (doctorId = null) => {
  try {
    let query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
      FROM reminders
    `;

    const params = [];
    
    if (doctorId) {
      query += ' WHERE doctorId = ?';
      params.push(doctorId);
    }

    const result = await executeQuery(query, params);
    return result[0];
  } catch (error) {
    console.error('Get reminder stats error:', error);
    throw error;
  }
};
