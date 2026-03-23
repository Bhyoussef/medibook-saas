import { findOne, findMany, insert, update, deleteRecord, count } from '../config/db.js';

export class TimeSlot {
  constructor(data) {
    this.id = data.id;
    this.doctorId = data.doctorId;
    this.date = data.date;
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.isAvailable = data.isAvailable;
    this.maxAppointments = data.maxAppointments;
    this.currentAppointments = data.currentAppointments;
    this.slotType = data.slotType;
    this.notes = data.notes;
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

  get formattedTimeRange() {
    const formatTime = (time) => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    };
    
    return `${formatTime(this.startTime)} - ${formatTime(this.endTime)}`;
  }

  get duration() {
    const start = new Date(`2000-01-01T${this.startTime}`);
    const end = new Date(`2000-01-01T${this.endTime}`);
    return (end - start) / (1000 * 60); // Duration in minutes
  }

  get isFullyBooked() {
    return this.currentAppointments >= this.maxAppointments;
  }

  get availabilityStatus() {
    if (!this.isAvailable) return 'Unavailable';
    if (this.isFullyBooked) return 'Fully Booked';
    return 'Available';
  }

  get availableSlots() {
    return Math.max(0, this.maxAppointments - this.currentAppointments);
  }

  toJSON() {
    return {
      id: this.id,
      doctorId: this.doctorId,
      date: this.date,
      startTime: this.startTime,
      endTime: this.endTime,
      isAvailable: this.isAvailable,
      maxAppointments: this.maxAppointments,
      currentAppointments: this.currentAppointments,
      slotType: this.slotType,
      notes: this.notes,
      formattedDate: this.formattedDate,
      formattedTimeRange: this.formattedTimeRange,
      duration: this.duration,
      isFullyBooked: this.isFullyBooked,
      availabilityStatus: this.availabilityStatus,
      availableSlots: this.availableSlots,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export class TimeSlotModel {
  static async findById(id) {
    try {
      const query = `
        SELECT ts.*, d.firstName as doctorFirstName, d.lastName as doctorLastName, d.specialty
        FROM time_slots ts
        JOIN doctors d ON ts.doctorId = d.id
        WHERE ts.id = ?
      `;
      const timeSlot = await findOne(query, [id]);
      return timeSlot ? new TimeSlot(timeSlot) : null;
    } catch (error) {
      console.error('Error finding time slot by ID:', error);
      throw error;
    }
  }

  static async findByDoctorId(doctorId, date = null, availableOnly = false) {
    try {
      let query = `
        SELECT ts.*, d.firstName as doctorFirstName, d.lastName as doctorLastName, d.specialty
        FROM time_slots ts
        JOIN doctors d ON ts.doctorId = d.id
        WHERE ts.doctorId = ?
      `;
      const params = [doctorId];
      
      if (date) {
        query += ' AND ts.date = ?';
        params.push(date);
      }
      
      if (availableOnly) {
        query += ' AND ts.isAvailable = TRUE AND ts.currentAppointments < ts.maxAppointments';
      }
      
      query += ' ORDER BY ts.date ASC, ts.startTime ASC';
      
      const timeSlots = await findMany(query, params);
      return timeSlots.map(timeSlot => new TimeSlot(timeSlot));
    } catch (error) {
      console.error('Error finding time slots by doctor ID:', error);
      throw error;
    }
  }

  static async findByDate(date, specialty = null) {
    try {
      let query = `
        SELECT ts.*, d.firstName as doctorFirstName, d.lastName as doctorLastName, d.specialty
        FROM time_slots ts
        JOIN doctors d ON ts.doctorId = d.id
        WHERE ts.date = ? AND ts.isAvailable = TRUE AND ts.currentAppointments < ts.maxAppointments
      `;
      const params = [date];
      
      if (specialty) {
        query += ' AND d.specialty = ?';
        params.push(specialty);
      }
      
      query += ' ORDER BY ts.startTime ASC, d.lastName ASC';
      
      const timeSlots = await findMany(query, params);
      return timeSlots.map(timeSlot => new TimeSlot(timeSlot));
    } catch (error) {
      console.error('Error finding time slots by date:', error);
      throw error;
    }
  }

  static async findAvailableSlots(doctorId, startDate, endDate) {
    try {
      const query = `
        SELECT ts.*, d.firstName as doctorFirstName, d.lastName as doctorLastName, d.specialty
        FROM time_slots ts
        JOIN doctors d ON ts.doctorId = d.id
        WHERE ts.doctorId = ? AND ts.date BETWEEN ? AND ?
        AND ts.isAvailable = TRUE AND ts.currentAppointments < ts.maxAppointments
        ORDER BY ts.date ASC, ts.startTime ASC
      `;
      const timeSlots = await findMany(query, [doctorId, startDate, endDate]);
      return timeSlots.map(timeSlot => new TimeSlot(timeSlot));
    } catch (error) {
      console.error('Error finding available time slots:', error);
      throw error;
    }
  }

  static async create(timeSlotData) {
    try {
      const result = await insert('time_slots', timeSlotData);
      
      if (result.insertId) {
        return await this.findById(result.insertId);
      }
      return null;
    } catch (error) {
      console.error('Error creating time slot:', error);
      throw error;
    }
  }

  static async update(id, timeSlotData) {
    try {
      timeSlotData.updatedAt = new Date();
      const result = await update('time_slots', timeSlotData, 'id = ?', [id]);
      
      if (result.affectedRows > 0) {
        return await this.findById(id);
      }
      return null;
    } catch (error) {
      console.error('Error updating time slot:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const result = await deleteRecord('time_slots', 'id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting time slot:', error);
      throw error;
    }
  }

  static async updateAvailability(id, isAvailable) {
    try {
      const result = await update('time_slots', { 
        isAvailable, 
        updatedAt: new Date() 
      }, 'id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating time slot availability:', error);
      throw error;
    }
  }

  static async incrementAppointments(id) {
    try {
      const query = `
        UPDATE time_slots 
        SET currentAppointments = currentAppointments + 1, updatedAt = NOW()
        WHERE id = ? AND currentAppointments < maxAppointments
      `;
      const result = await update('time_slots', {}, 'id = ? AND currentAppointments < maxAppointments', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error incrementing appointments:', error);
      throw error;
    }
  }

  static async decrementAppointments(id) {
    try {
      const query = `
        UPDATE time_slots 
        SET currentAppointments = GREATEST(0, currentAppointments - 1), updatedAt = NOW()
        WHERE id = ?
      `;
      const result = await update('time_slots', {}, 'id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error decrementing appointments:', error);
      throw error;
    }
  }

  static async generateDailyTimeSlots(doctorId, date, slotType = 'regular') {
    try {
      const timeSlots = [];
      
      // Generate time slots from 9 AM to 5 PM with 30-minute intervals
      for (let hour = 9; hour <= 17; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          if (hour === 17 && minute > 0) break; // End at 5:30 PM
          
          const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          const endHour = minute === 30 ? hour + 1 : hour;
          const endTime = `${endHour.toString().padStart(2, '0')}:${minute === 30 ? '00' : '30'}`;
          
          const slotData = {
            doctorId,
            date,
            startTime,
            endTime,
            isAvailable: true,
            maxAppointments: 1,
            currentAppointments: 0,
            slotType
          };
          
          timeSlots.push(slotData);
        }
      }
      
      // Bulk insert time slots
      const results = [];
      for (const slotData of timeSlots) {
        try {
          const slot = await this.create(slotData);
          if (slot) results.push(slot);
        } catch (error) {
          console.error('Error creating individual time slot:', error);
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error generating daily time slots:', error);
      throw error;
    }
  }

  static async getTimeSlotStats(doctorId = null, date = null) {
    try {
      let whereClause = '1=1';
      const params = [];
      
      if (doctorId) {
        whereClause += ' AND doctorId = ?';
        params.push(doctorId);
      }
      
      if (date) {
        whereClause += ' AND date = ?';
        params.push(date);
      }
      
      const totalSlots = await count('time_slots', whereClause, params);
      const availableSlots = await count('time_slots', `${whereClause} AND isAvailable = TRUE`, params);
      const fullyBookedSlots = await count('time_slots', `${whereClause} AND currentAppointments >= maxAppointments`, params);
      
      return {
        totalSlots,
        availableSlots,
        fullyBookedSlots,
        partiallyBookedSlots: totalSlots - fullyBookedSlots
      };
    } catch (error) {
      console.error('Error getting time slot stats:', error);
      throw error;
    }
  }

  static async getDoctorSchedule(doctorId, startDate, endDate) {
    try {
      const query = `
        SELECT ts.*, 
               COUNT(a.id) as actualAppointments
        FROM time_slots ts
        LEFT JOIN appointments a ON ts.doctorId = a.doctorId 
                                  AND ts.date = a.date 
                                  AND a.time >= ts.startTime 
                                  AND a.time < ts.endTime
                                  AND a.status != 'cancelled'
        WHERE ts.doctorId = ? AND ts.date BETWEEN ? AND ?
        GROUP BY ts.id
        ORDER BY ts.date ASC, ts.startTime ASC
      `;
      const timeSlots = await findMany(query, [doctorId, startDate, endDate]);
      
      return timeSlots.map(slot => {
        const timeSlot = new TimeSlot({
          ...slot,
          currentAppointments: slot.actualAppointments
        });
        return timeSlot.toJSON();
      });
    } catch (error) {
      console.error('Error getting doctor schedule:', error);
      throw error;
    }
  }

  static async deleteByDate(doctorId, date) {
    try {
      const result = await deleteRecord('time_slots', 'doctorId = ? AND date = ?', [doctorId, date]);
      return result.affectedRows;
    } catch (error) {
      console.error('Error deleting time slots by date:', error);
      throw error;
    }
  }
}

export class TimeSlotFactory {
  static fromDatabase(data) {
    return new TimeSlot(data);
  }

  static create(timeSlotData) {
    return new TimeSlot({
      id: null,
      doctorId: timeSlotData.doctorId,
      date: timeSlotData.date,
      startTime: timeSlotData.startTime,
      endTime: timeSlotData.endTime,
      isAvailable: timeSlotData.isAvailable !== undefined ? timeSlotData.isAvailable : true,
      maxAppointments: timeSlotData.maxAppointments || 1,
      currentAppointments: timeSlotData.currentAppointments || 0,
      slotType: timeSlotData.slotType || 'regular',
      notes: timeSlotData.notes || null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
}
