import { executeQuery } from '../config/database.js';
import { createNotification } from './notificationController.js';
import { createAppointmentReminders } from '../services/reminderService.js';
import { validateTimeSlot } from '../services/slotValidationService.js';

// Get all appointments (admin only)
export const getAllAppointmentsAdmin = async (req, res) => {
  try {
    // In a real app, verify user is admin
    const query = `
      SELECT 
        a.*,
        u.firstName as userFirstName, u.lastName as userLastName, u.email, u.phone,
        d.firstName as doctorFirstName, d.lastName as doctorLastName, d.specialty, d.email as doctorEmail
      FROM appointments a
      JOIN users u ON a.userId = u.id
      JOIN doctors d ON a.doctorId = d.id
      ORDER BY a.date DESC, a.time DESC
    `;
    const appointments = await executeQuery(query);
    
    res.json(appointments);
  } catch (error) {
    console.error('Get all appointments error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT a.*, d.firstName as doctorFirstName, d.lastName as doctorLastName, d.specialty
      FROM appointments a
      JOIN doctors d ON a.doctorId = d.id
      WHERE a.id = ? AND a.userId = ?
    `;
    const appointments = await executeQuery(query, [id, req.user.id]);
    
    if (appointments.length === 0) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    res.json(appointments[0]);
  } catch (error) {
    console.error('Get appointment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get appointments for a specific doctor
export const getDoctorAppointments = async (req, res) => {
  try {
    const { doctorId } = req.params;
    
    // Verify the requesting user is the doctor (in real app, check user role)
    if (req.user.id !== parseInt(doctorId)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const query = `
      SELECT 
        a.*,
        u.firstName as userFirstName, u.lastName as userLastName, u.email, u.phone,
        d.firstName as doctorFirstName, d.lastName as doctorLastName, d.specialty
      FROM appointments a
      JOIN users u ON a.userId = u.id
      JOIN doctors d ON a.doctorId = d.id
      WHERE a.doctorId = ?
      ORDER BY a.date ASC, a.time ASC
    `;
    const appointments = await executeQuery(query, [doctorId]);
    
    res.json(appointments);
  } catch (error) {
    console.error('Get doctor appointments error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createAppointment = async (req, res) => {
  try {
    const { doctorId, date, time, reason, notes } = req.body;
    const userId = req.user.id;

    // Input validation
    if (!doctorId || !date || !time || !reason) {
      return res.status(400).json({ message: 'Missing required fields: doctorId, date, time, reason' });
    }

    // Validate time slot using the new validation service
    const slotValidation = await validateTimeSlot(doctorId, date, time);
    if (!slotValidation.valid) {
      return res.status(409).json({ 
        success: false,
        message: slotValidation.error,
        type: slotValidation.type,
        details: slotValidation
      });
    }

    // Validate reason length
    if (reason.trim().length < 5) {
      return res.status(400).json({ message: 'Reason must be at least 5 characters long' });
    }
    
    if (reason.trim().length > 500) {
      return res.status(400).json({ message: 'Reason must be less than 500 characters' });
    }

    // Validate notes if provided
    if (notes && notes.trim().length > 1000) {
      return res.status(400).json({ message: 'Notes must be less than 1000 characters' });
    }

    // Get doctor information
    const doctorQuery = 'SELECT id, available, consultationFee FROM doctors WHERE id = ?';
    const doctorResults = await executeQuery(doctorQuery, [doctorId]);
    
    if (doctorResults.length === 0) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    const consultationFee = doctorResults[0].consultationFee || 0;
    
    // Create appointment with transaction-like behavior
    const insertQuery = `
      INSERT INTO appointments (userId, doctorId, date, time, reason, notes, consultationFee, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', NOW())
    `;
    
    const result = await executeQuery(insertQuery, [
      userId, doctorId, date, time.trim(), reason.trim(), notes ? notes.trim() : null, consultationFee
    ]);

    // Get the complete appointment with doctor and user info
    const appointmentQuery = `
      SELECT 
        a.*,
        d.firstName as doctorFirstName, d.lastName as doctorLastName, d.specialty, d.consultationFee as doctorFee,
        u.firstName as userFirstName, u.lastName as userLastName, u.email, u.phone
      FROM appointments a
      JOIN doctors d ON a.doctorId = d.id
      JOIN users u ON a.userId = u.id
      WHERE a.id = ?
    `;
    
    const appointments = await executeQuery(appointmentQuery, [result.insertId]);
    const appointment = appointments[0];
    
    // Create appointment reminders
    try {
      await createAppointmentReminders(
        result.insertId,
        appointment.date,
        appointment.time,
        userId,
        doctorId
      );
      console.log(`✅ Reminders created for appointment ${result.insertId}`);
    } catch (reminderError) {
      console.error('❌ Failed to create reminders:', reminderError);
      // Continue with appointment creation even if reminders fail
    }
    
    // Create notification for the user
    await createNotification(
      userId,
      doctorId,
      result.insertId,
      'appointment',
      'Appointment Booked Successfully',
      `Your appointment with Dr. ${appointment.doctorFirstName} ${appointment.doctorLastName} is scheduled for ${new Date(date).toLocaleDateString()} at ${time}`,
      'high',
      `/appointments/${result.insertId}`,
      'View Appointment'
    );
    
    // Create notification for the doctor
    await createNotification(
      null, // No specific userId for doctor notification
      doctorId,
      result.insertId,
      'appointment',
      'New Appointment Booking',
      `New appointment booked with ${appointment.userFirstName} ${appointment.userLastName} on ${new Date(date).toLocaleDateString()} at ${time}`,
      'medium',
      `/doctor-dashboard`,
      'View Dashboard'
    );

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      appointment: {
        id: appointment.id,
        date: appointment.date,
        time: appointment.time,
        reason: appointment.reason,
        status: appointment.status,
        consultationFee: appointment.consultationFee,
        createdAt: appointment.createdAt,
        doctor: {
          id: appointment.doctorId,
          firstName: appointment.doctorFirstName,
          lastName: appointment.doctorLastName,
          specialty: appointment.specialty
        },
        user: {
          firstName: appointment.userFirstName,
          lastName: appointment.userLastName,
          email: appointment.email,
          phone: appointment.phone
        }
      }
    });
  } catch (error) {
    console.error('Create appointment error:', error);
    
    // Handle specific database errors
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ 
        success: false,
        message: 'This time slot is already booked. Please choose a different time.' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Failed to book appointment. Please try again later.' 
    });
  }
};

export const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    // Input validation
    if (!id) {
      return res.status(400).json({ message: 'Appointment ID is required' });
    }
    
    // Validate status if provided
    const validStatuses = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }
    
    // Validate notes length if provided
    if (notes && notes.trim().length > 1000) {
      return res.status(400).json({ message: 'Notes must be less than 1000 characters' });
    }
    
    // Get appointment to verify permissions and current status
    const checkQuery = 'SELECT * FROM appointments WHERE id = ?';
    const appointments = await executeQuery(checkQuery, [id]);
    
    if (appointments.length === 0) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    const appointment = appointments[0];
    
    // Check if user is the appointment's doctor or the patient
    const isDoctor = req.user.id === appointment.doctorId;
    const isPatient = req.user.id === appointment.userId;
    
    if (!isDoctor && !isPatient) {
      return res.status(403).json({ message: 'Access denied. You can only update your own appointments.' });
    }
    
    // Define valid status transitions
    const validStatusTransitions = {
      'scheduled': ['confirmed', 'cancelled'],
      'confirmed': ['completed', 'cancelled'],
      'completed': [], // No further transitions
      'cancelled': [], // No further transitions
      'no-show': [] // No further transitions
    };
    
    // Validate status transitions
    if (status && status !== appointment.status) {
      if (!validStatusTransitions[appointment.status] || !validStatusTransitions[appointment.status].includes(status)) {
        return res.status(400).json({ 
          message: `Cannot change status from ${appointment.status} to ${status}. Valid transitions: ${validStatusTransitions[appointment.status].join(', ') || 'none'}` 
        });
      }
    }
    
    // Permission checks for specific status changes
    if (status === 'confirmed' && !isDoctor) {
      return res.status(403).json({ message: 'Only doctors can confirm appointments' });
    }
    
    if (status === 'completed' && !isDoctor) {
      return res.status(403).json({ message: 'Only doctors can mark appointments as completed' });
    }
    
    // Patients can only cancel their own appointments
    if (status === 'cancelled' && !isPatient && !isDoctor) {
      return res.status(403).json({ message: 'Only patients or doctors can cancel appointments' });
    }
    
    // Business rule: Cannot cancel appointments less than 24 hours in advance (patients only)
    if (status === 'cancelled' && isPatient) {
      const appointmentDateTime = new Date(`${appointment.date} ${appointment.time}`);
      const now = new Date();
      const timeDiff = appointmentDateTime - now;
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      if (hoursDiff < 24) {
        return res.status(400).json({ 
          message: 'Cannot cancel appointments less than 24 hours in advance. Please call the clinic.' 
        });
      }
    }
    
    // Business rule: Cannot confirm appointments in the past
    if (status === 'confirmed') {
      const appointmentDateTime = new Date(`${appointment.date} ${appointment.time}`);
      const now = new Date();
      
      if (appointmentDateTime < now) {
        return res.status(400).json({ 
          message: 'Cannot confirm appointments that are in the past' 
        });
      }
    }
    
    // Update appointment
    const updateFields = {};
    if (status) updateFields.status = status;
    if (notes !== undefined) updateFields.notes = notes.trim() || null;
    updateFields.updatedAt = new Date();
    
    // If status is being changed to cancelled/no-show, update payment status
    if (status === 'cancelled' || status === 'no-show') {
      updateFields.paymentStatus = 'refunded';
    }
    
    const updateQuery = `
      UPDATE appointments 
      SET ${Object.keys(updateFields).map(field => `${field} = ?`).join(', ')}
      WHERE id = ?
    `;
    
    await executeQuery(updateQuery, [...Object.values(updateFields), id]);
    
    // Get updated appointment with full details
    const updatedAppointmentQuery = `
      SELECT 
        a.*,
        u.firstName as userFirstName, u.lastName as userLastName, u.email, u.phone,
        d.firstName as doctorFirstName, d.lastName as doctorLastName, d.specialty, d.phone as doctorPhone
      FROM appointments a
      JOIN users u ON a.userId = u.id
      JOIN doctors d ON a.doctorId = d.id
      WHERE a.id = ?
    `;
    const updatedAppointments = await executeQuery(updatedAppointmentQuery, [id]);
    const updatedAppointment = updatedAppointments[0];
    
    // Create notifications for status changes
    if (status && status !== appointment.status) {
      let notificationTitle = 'Appointment Status Updated';
      let notificationMessage = '';
      let notificationPriority = 'medium';
      
      switch (status) {
        case 'confirmed':
          notificationTitle = 'Appointment Confirmed';
          notificationMessage = `Your appointment with Dr. ${updatedAppointment.doctorFirstName} ${updatedAppointment.doctorLastName} on ${new Date(updatedAppointment.date).toLocaleDateString()} at ${updatedAppointment.time} has been confirmed.`;
          notificationPriority = 'high';
          break;
        case 'cancelled':
          notificationTitle = 'Appointment Cancelled';
          notificationMessage = `Your appointment with Dr. ${updatedAppointment.doctorFirstName} ${updatedAppointment.doctorLastName} on ${new Date(updatedAppointment.date).toLocaleDateString()} at ${updatedAppointment.time} has been cancelled.`;
          notificationPriority = 'high';
          break;
        case 'completed':
          notificationTitle = 'Appointment Completed';
          notificationMessage = `Your appointment with Dr. ${updatedAppointment.doctorFirstName} ${updatedAppointment.doctorLastName} has been completed. Thank you for visiting!`;
          notificationPriority = 'medium';
          break;
        case 'no-show':
          notificationTitle = 'Missed Appointment';
          notificationMessage = `You missed your appointment with Dr. ${updatedAppointment.doctorFirstName} ${updatedAppointment.doctorLastName} on ${new Date(updatedAppointment.date).toLocaleDateString()} at ${updatedAppointment.time}. Please contact the clinic to reschedule.`;
          notificationPriority = 'high';
          break;
      }
      
      // Send notification to user
      await createNotification(
        appointment.userId,
        appointment.doctorId,
        id,
        'appointment',
        notificationTitle,
        notificationMessage,
        notificationPriority,
        `/appointments/${id}`,
        'View Appointment'
      );
      
      // Send notification to doctor for patient cancellations
      if (status === 'cancelled' && isPatient) {
        await createNotification(
          null, // No specific userId for doctor notification
          appointment.doctorId,
          id,
          'cancellation',
          'Patient Cancelled Appointment',
          `Patient ${updatedAppointment.userFirstName} ${updatedAppointment.userLastName} cancelled their appointment on ${new Date(updatedAppointment.date).toLocaleDateString()} at ${updatedAppointment.time}.`,
          'medium',
          `/doctor-dashboard`,
          'View Dashboard'
        );
      }
    }
    
    res.json({
      success: true,
      message: 'Appointment updated successfully',
      appointment: {
        id: updatedAppointment.id,
        date: updatedAppointment.date,
        time: updatedAppointment.time,
        status: updatedAppointment.status,
        paymentStatus: updatedAppointment.paymentStatus,
        notes: updatedAppointment.notes,
        updatedAt: updatedAppointment.updatedAt,
        doctor: {
          id: updatedAppointment.doctorId,
          firstName: updatedAppointment.doctorFirstName,
          lastName: updatedAppointment.doctorLastName,
          specialty: updatedAppointment.specialty,
          phone: updatedAppointment.doctorPhone
        },
        user: {
          id: updatedAppointment.userId,
          firstName: updatedAppointment.userFirstName,
          lastName: updatedAppointment.userLastName,
          email: updatedAppointment.email,
          phone: updatedAppointment.phone
        }
      }
    });
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update appointment. Please try again.' 
    });
  }
};

export const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if appointment belongs to user
    const checkQuery = 'SELECT userId FROM appointments WHERE id = ?';
    const appointments = await executeQuery(checkQuery, [id]);
    
    if (appointments.length === 0) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    if (appointments[0].userId != req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const deleteQuery = 'DELETE FROM appointments WHERE id = ?';
    await executeQuery(deleteQuery, [id]);
    
    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Delete appointment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get available time slots for a doctor on a specific date
export const getAvailableTimeSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }
    
    // Check if doctor exists and is available
    const doctorQuery = 'SELECT * FROM doctors WHERE id = ? AND available = TRUE';
    const doctors = await executeQuery(doctorQuery, [doctorId]);
    
    if (doctors.length === 0) {
      return res.status(400).json({ message: 'Doctor not available' });
    }
    
    // Get booked slots for that date
    const bookedQuery = `
      SELECT time FROM appointments 
      WHERE doctorId = ? AND date = ? AND status != 'cancelled'
      ORDER BY time
    `;
    const bookedSlots = await executeQuery(bookedQuery, [doctorId, date]);
    
    // Generate all possible time slots (9 AM to 5 PM, 30-minute intervals)
    const allSlots = [];
    for (let hour = 9; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 17 && minute > 0) break; // End at 5:30 PM
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        allSlots.push(timeString);
      }
    }
    
    // Filter out booked slots
    const bookedTimes = bookedSlots.map(slot => slot.time);
    const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot));
    
    res.json({
      doctorId,
      date,
      availableSlots
    });
  } catch (error) {
    console.error('Get available time slots error:', error);
    res.status(500).json({ message: 'Failed to get available time slots' });
  }
};
