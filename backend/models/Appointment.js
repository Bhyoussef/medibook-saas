import { findOne, findMany, insert, update, deleteRecord, count } from '../config/db.js';

export class Appointment {
  constructor(data) {
    this.id = data.id;
    this.userId = data.userId;
    this.doctorId = data.doctorId;
    this.date = data.date;
    this.time = data.time;
    this.reason = data.reason;
    this.status = data.status;
    this.notes = data.notes;
    this.consultationFee = data.consultationFee;
    this.paymentStatus = data.paymentStatus;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  get formattedDate() {
    return new Date(this.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  get formattedTime() {
    const [hours, minutes] = this.time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  get isUpcoming() {
    const appointmentDateTime = new Date(`${this.date} ${this.time}`);
    return appointmentDateTime > new Date();
  }

  get isPast() {
    return !this.isUpcoming;
  }

  get isToday() {
    const today = new Date();
    const appointmentDate = new Date(this.date);
    return today.toDateString() === appointmentDate.toDateString();
  }

  get statusColor() {
    const colors = {
      'scheduled': 'blue',
      'completed': 'green',
      'cancelled': 'red',
      'no-show': 'orange'
    };
    return colors[this.status] || 'gray';
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      doctorId: this.doctorId,
      date: this.date,
      time: this.time,
      reason: this.reason,
      status: this.status,
      notes: this.notes,
      consultationFee: this.consultationFee,
      paymentStatus: this.paymentStatus,
      formattedDate: this.formattedDate,
      formattedTime: this.formattedTime,
      isUpcoming: this.isUpcoming,
      isPast: this.isPast,
      isToday: this.isToday,
      statusColor: this.statusColor,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export class AppointmentModel {
  static async findById(id) {
    try {
      const query = `
        SELECT a.*, u.firstName as userFirstName, u.lastName as userLastName, u.phone as userPhone,
               d.firstName as doctorFirstName, d.lastName as doctorLastName, d.specialty, d.consultationFee as doctorFee
        FROM appointments a
        JOIN users u ON a.userId = u.id
        JOIN doctors d ON a.doctorId = d.id
        WHERE a.id = ?
      `;
      const appointment = await findOne(query, [id]);
      return appointment ? new Appointment(appointment) : null;
    } catch (error) {
      console.error('Error finding appointment by ID:', error);
      throw error;
    }
  }

  static async findByUserId(userId, status = null, limit = 50, offset = 0) {
    try {
      let query = `
        SELECT a.*, u.firstName as userFirstName, u.lastName as userLastName,
               d.firstName as doctorFirstName, d.lastName as doctorLastName, d.specialty
        FROM appointments a
        JOIN users u ON a.userId = u.id
        JOIN doctors d ON a.doctorId = d.id
        WHERE a.userId = ?
      `;
      const params = [userId];
      
      if (status) {
        query += ' AND a.status = ?';
        params.push(status);
      }
      
      query += ' ORDER BY a.date DESC, a.time DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);
      
      const appointments = await findMany(query, params);
      return appointments.map(appointment => new Appointment(appointment));
    } catch (error) {
      console.error('Error finding appointments by user ID:', error);
      throw error;
    }
  }

  static async findByDoctorId(doctorId, date = null, status = null) {
    try {
      let query = `
        SELECT a.*, u.firstName as userFirstName, u.lastName as userLastName, u.phone as userPhone
        FROM appointments a
        JOIN users u ON a.userId = u.id
        WHERE a.doctorId = ?
      `;
      const params = [doctorId];
      
      if (date) {
        query += ' AND a.date = ?';
        params.push(date);
      }
      
      if (status) {
        query += ' AND a.status = ?';
        params.push(status);
      }
      
      query += ' ORDER BY a.date ASC, a.time ASC';
      
      const appointments = await findMany(query, params);
      return appointments.map(appointment => new Appointment(appointment));
    } catch (error) {
      console.error('Error finding appointments by doctor ID:', error);
      throw error;
    }
  }

  static async findByDateRange(startDate, endDate, doctorId = null) {
    try {
      let query = `
        SELECT a.*, u.firstName as userFirstName, u.lastName as userLastName,
               d.firstName as doctorFirstName, d.lastName as doctorLastName, d.specialty
        FROM appointments a
        JOIN users u ON a.userId = u.id
        JOIN doctors d ON a.doctorId = d.id
        WHERE a.date BETWEEN ? AND ?
      `;
      const params = [startDate, endDate];
      
      if (doctorId) {
        query += ' AND a.doctorId = ?';
        params.push(doctorId);
      }
      
      query += ' ORDER BY a.date ASC, a.time ASC';
      
      const appointments = await findMany(query, params);
      return appointments.map(appointment => new Appointment(appointment));
    } catch (error) {
      console.error('Error finding appointments by date range:', error);
      throw error;
    }
  }

  static async create(appointmentData) {
    try {
      // Check for conflicting appointments
      const conflictQuery = `
        SELECT id FROM appointments 
        WHERE doctorId = ? AND date = ? AND time = ? AND status != 'cancelled'
      `;
      const conflicts = await findMany(conflictQuery, [
        appointmentData.doctorId, 
        appointmentData.date, 
        appointmentData.time
      ]);
      
      if (conflicts.length > 0) {
        throw new Error('Time slot is already booked');
      }
      
      const result = await insert('appointments', appointmentData);
      
      if (result.insertId) {
        return await this.findById(result.insertId);
      }
      return null;
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw error;
    }
  }

  static async update(id, appointmentData) {
    try {
      appointmentData.updatedAt = new Date();
      const result = await update('appointments', appointmentData, 'id = ?', [id]);
      
      if (result.affectedRows > 0) {
        return await this.findById(id);
      }
      return null;
    } catch (error) {
      console.error('Error updating appointment:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const result = await deleteRecord('appointments', 'id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting appointment:', error);
      throw error;
    }
  }

  static async updateStatus(id, status) {
    try {
      const result = await update('appointments', { 
        status, 
        updatedAt: new Date() 
      }, 'id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating appointment status:', error);
      throw error;
    }
  }

  static async updatePaymentStatus(id, paymentStatus) {
    try {
      const result = await update('appointments', { 
        paymentStatus, 
        updatedAt: new Date() 
      }, 'id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  }

  static async getAvailableTimeSlots(doctorId, date) {
    try {
      // Get booked slots
      const bookedQuery = `
        SELECT time FROM appointments 
        WHERE doctorId = ? AND date = ? AND status != 'cancelled'
        ORDER BY time
      `;
      const bookedSlots = await findMany(bookedQuery, [doctorId, date]);
      
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
      
      return availableSlots;
    } catch (error) {
      console.error('Error getting available time slots:', error);
      throw error;
    }
  }

  static async getAppointmentStats(userId = null, doctorId = null) {
    try {
      let whereClause = '1=1';
      const params = [];
      
      if (userId) {
        whereClause += ' AND userId = ?';
        params.push(userId);
      }
      
      if (doctorId) {
        whereClause += ' AND doctorId = ?';
        params.push(doctorId);
      }
      
      const totalAppointments = await count('appointments', whereClause, params);
      const scheduledAppointments = await count('appointments', `${whereClause} AND status = 'scheduled'`, params);
      const completedAppointments = await count('appointments', `${whereClause} AND status = 'completed'`, params);
      const cancelledAppointments = await count('appointments', `${whereClause} AND status = 'cancelled'`, params);
      
      const todayAppointments = await count('appointments', `${whereClause} AND DATE(date) = CURDATE()`, params);
      const upcomingAppointments = await count('appointments', `${whereClause} AND date >= CURDATE() AND status = 'scheduled'`, params);
      
      return {
        totalAppointments,
        scheduledAppointments,
        completedAppointments,
        cancelledAppointments,
        todayAppointments,
        upcomingAppointments
      };
    } catch (error) {
      console.error('Error getting appointment stats:', error);
      throw error;
    }
  }

  static async getTodayAppointments(doctorId = null) {
    try {
      let query = `
        SELECT a.*, u.firstName as userFirstName, u.lastName as userLastName, u.phone as userPhone,
               d.firstName as doctorFirstName, d.lastName as doctorLastName, d.specialty
        FROM appointments a
        JOIN users u ON a.userId = u.id
        JOIN doctors d ON a.doctorId = d.id
        WHERE DATE(a.date) = CURDATE() AND a.status = 'scheduled'
      `;
      const params = [];
      
      if (doctorId) {
        query += ' AND a.doctorId = ?';
        params.push(doctorId);
      }
      
      query += ' ORDER BY a.time ASC';
      
      const appointments = await findMany(query, params);
      return appointments.map(appointment => new Appointment(appointment));
    } catch (error) {
      console.error('Error getting today appointments:', error);
      throw error;
    }
  }

  static async getUpcomingAppointments(userId, days = 7) {
    try {
      const query = `
        SELECT a.*, d.firstName as doctorFirstName, d.lastName as doctorLastName, d.specialty
        FROM appointments a
        JOIN doctors d ON a.doctorId = d.id
        WHERE a.userId = ? AND a.date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
        AND a.status = 'scheduled'
        ORDER BY a.date ASC, a.time ASC
      `;
      const appointments = await findMany(query, [userId, days]);
      return appointments.map(appointment => new Appointment(appointment));
    } catch (error) {
      console.error('Error getting upcoming appointments:', error);
      throw error;
    }
  }
}

export class AppointmentFactory {
  static fromDatabase(data) {
    return new Appointment(data);
  }

  static create(appointmentData) {
    return new Appointment({
      id: null,
      userId: appointmentData.userId,
      doctorId: appointmentData.doctorId,
      date: appointmentData.date,
      time: appointmentData.time,
      reason: appointmentData.reason,
      status: appointmentData.status || 'scheduled',
      notes: appointmentData.notes || null,
      consultationFee: appointmentData.consultationFee || null,
      paymentStatus: appointmentData.paymentStatus || 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
}
