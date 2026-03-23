import { findOne, findMany, insert, update, deleteRecord, count } from '../config/db.js';

export class Doctor {
  constructor(data) {
    this.id = data.id;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.specialty = data.specialty;
    this.experience = data.experience;
    this.rating = data.rating;
    this.available = data.available;
    this.bio = data.bio;
    this.education = data.education;
    this.phone = data.phone;
    this.email = data.email;
    this.consultationFee = data.consultationFee;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  get formattedRating() {
    return parseFloat(this.rating).toFixed(1);
  }

  get availabilityStatus() {
    return this.available ? 'Available' : 'Unavailable';
  }

  get experienceYears() {
    const match = this.experience.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  toJSON() {
    return {
      id: this.id,
      firstName: this.firstName,
      lastName: this.lastName,
      fullName: this.fullName,
      specialty: this.specialty,
      experience: this.experience,
      experienceYears: this.experienceYears,
      rating: this.rating,
      formattedRating: this.formattedRating,
      available: this.available,
      availabilityStatus: this.availabilityStatus,
      bio: this.bio,
      education: this.education,
      phone: this.phone,
      email: this.email,
      consultationFee: this.consultationFee,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export class DoctorModel {
  static async findById(id) {
    try {
      const query = 'SELECT * FROM doctors WHERE id = ?';
      const doctor = await findOne(query, [id]);
      return doctor ? new Doctor(doctor) : null;
    } catch (error) {
      console.error('Error finding doctor by ID:', error);
      throw error;
    }
  }

  static async findBySpecialty(specialty) {
    try {
      const query = 'SELECT * FROM doctors WHERE specialty = ? AND available = TRUE ORDER BY rating DESC';
      const doctors = await findMany(query, [specialty]);
      return doctors.map(doctor => new Doctor(doctor));
    } catch (error) {
      console.error('Error finding doctors by specialty:', error);
      throw error;
    }
  }

  static async findAll(availableOnly = false, limit = 50, offset = 0) {
    try {
      let query = 'SELECT * FROM doctors';
      const params = [];
      
      if (availableOnly) {
        query += ' WHERE available = TRUE';
      }
      
      query += ' ORDER BY rating DESC, lastName ASC LIMIT ? OFFSET ?';
      params.push(limit, offset);
      
      const doctors = await findMany(query, params);
      return doctors.map(doctor => new Doctor(doctor));
    } catch (error) {
      console.error('Error finding all doctors:', error);
      throw error;
    }
  }

  static async searchDoctors(searchTerm, specialty = null) {
    try {
      let query = `
        SELECT * FROM doctors 
        WHERE (firstName LIKE ? OR lastName LIKE ? OR specialty LIKE ? OR bio LIKE ?)
      `;
      const searchPattern = `%${searchTerm}%`;
      const params = [searchPattern, searchPattern, searchPattern, searchPattern];
      
      if (specialty) {
        query += ' AND specialty = ?';
        params.push(specialty);
      }
      
      query += ' ORDER BY rating DESC, lastName ASC LIMIT 20';
      
      const doctors = await findMany(query, params);
      return doctors.map(doctor => new Doctor(doctor));
    } catch (error) {
      console.error('Error searching doctors:', error);
      throw error;
    }
  }

  static async create(doctorData) {
    try {
      const result = await insert('doctors', doctorData);
      
      if (result.insertId) {
        return await this.findById(result.insertId);
      }
      return null;
    } catch (error) {
      console.error('Error creating doctor:', error);
      throw error;
    }
  }

  static async update(id, doctorData) {
    try {
      doctorData.updatedAt = new Date();
      const result = await update('doctors', doctorData, 'id = ?', [id]);
      
      if (result.affectedRows > 0) {
        return await this.findById(id);
      }
      return null;
    } catch (error) {
      console.error('Error updating doctor:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const result = await deleteRecord('doctors', 'id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting doctor:', error);
      throw error;
    }
  }

  static async updateAvailability(id, available) {
    try {
      const result = await update('doctors', { 
        available, 
        updatedAt: new Date() 
      }, 'id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating availability:', error);
      throw error;
    }
  }

  static async updateRating(id, newRating) {
    try {
      const result = await update('doctors', { 
        rating: newRating, 
        updatedAt: new Date() 
      }, 'id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating rating:', error);
      throw error;
    }
  }

  static async getSpecialties() {
    try {
      const query = `
        SELECT DISTINCT specialty, COUNT(*) as count 
        FROM doctors 
        WHERE available = TRUE
        GROUP BY specialty 
        ORDER BY count DESC, specialty ASC
      `;
      const specialties = await findMany(query);
      return specialties;
    } catch (error) {
      console.error('Error getting specialties:', error);
      throw error;
    }
  }

  static async getTopRatedDoctors(limit = 10) {
    try {
      const query = `
        SELECT * FROM doctors 
        WHERE available = TRUE AND rating > 0
        ORDER BY rating DESC, lastName ASC
        LIMIT ?
      `;
      const doctors = await findMany(query, [limit]);
      return doctors.map(doctor => new Doctor(doctor));
    } catch (error) {
      console.error('Error getting top rated doctors:', error);
      throw error;
    }
  }

  static async getDoctorStats() {
    try {
      const totalDoctors = await count('doctors');
      const availableDoctors = await count('doctors', 'available = TRUE');
      const specialties = await count('doctors', 'DISTINCT specialty');
      
      return {
        totalDoctors,
        availableDoctors,
        specialties
      };
    } catch (error) {
      console.error('Error getting doctor stats:', error);
      throw error;
    }
  }

  static async getDoctorsByExperience(minYears = 0) {
    try {
      const query = `
        SELECT * FROM doctors 
        WHERE available = TRUE 
        AND CAST(SUBSTRING(experience, 1, LOCATE(' ', experience) - 1) AS UNSIGNED) >= ?
        ORDER BY experience DESC, rating DESC
      `;
      const doctors = await findMany(query, [minYears]);
      return doctors.map(doctor => new Doctor(doctor));
    } catch (error) {
      console.error('Error getting doctors by experience:', error);
      throw error;
    }
  }

  static async getDoctorWithAppointments(doctorId, startDate, endDate) {
    try {
      const doctorQuery = 'SELECT * FROM doctors WHERE id = ?';
      const doctor = await findOne(doctorQuery, [doctorId]);
      
      if (!doctor) {
        return null;
      }
      
      const appointmentsQuery = `
        SELECT a.*, u.firstName as userFirstName, u.lastName as userLastName
        FROM appointments a
        JOIN users u ON a.userId = u.id
        WHERE a.doctorId = ? AND a.date BETWEEN ? AND ?
        ORDER BY a.date ASC, a.time ASC
      `;
      const appointments = await findMany(appointmentsQuery, [doctorId, startDate, endDate]);
      
      return {
        doctor: new Doctor(doctor),
        appointments
      };
    } catch (error) {
      console.error('Error getting doctor with appointments:', error);
      throw error;
    }
  }
}

export class DoctorFactory {
  static fromDatabase(data) {
    return new Doctor(data);
  }

  static create(doctorData) {
    return new Doctor({
      id: null,
      firstName: doctorData.firstName,
      lastName: doctorData.lastName,
      specialty: doctorData.specialty,
      experience: doctorData.experience,
      rating: doctorData.rating || 0.0,
      available: doctorData.available !== undefined ? doctorData.available : true,
      bio: doctorData.bio || null,
      education: doctorData.education || null,
      phone: doctorData.phone || null,
      email: doctorData.email || null,
      consultationFee: doctorData.consultationFee || null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
}
