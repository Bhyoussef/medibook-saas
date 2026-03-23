import { executeQuery } from '../config/database.js';

export const getAllDoctors = async (req, res) => {
  try {
    const query = `
      SELECT id, firstName, lastName, specialty, experience, rating, available
      FROM doctors
      ORDER BY lastName, firstName
    `;
    const doctors = await executeQuery(query);
    res.json(doctors);
  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT id, firstName, lastName, specialty, experience, rating, available,
             bio, education, phone, email
      FROM doctors
      WHERE id = ?
    `;
    const doctors = await executeQuery(query, [id]);
    
    if (doctors.length === 0) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    res.json(doctors[0]);
  } catch (error) {
    console.error('Get doctor error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getDoctorsBySpecialty = async (req, res) => {
  try {
    const { specialty } = req.params;
    const query = `
      SELECT id, firstName, lastName, specialty, experience, rating, available
      FROM doctors
      WHERE specialty = ?
      ORDER BY rating DESC
    `;
    const doctors = await executeQuery(query, [specialty]);
    res.json(doctors);
  } catch (error) {
    console.error('Get doctors by specialty error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getDoctorAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    
    const doctorQuery = 'SELECT available FROM doctors WHERE id = ?';
    const doctors = await executeQuery(doctorQuery, [id]);
    
    if (doctors.length === 0) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    const availabilityQuery = `
      SELECT date, time, status
      FROM appointments
      WHERE doctorId = ? AND date >= CURDATE() AND status != 'cancelled'
      ORDER BY date, time
    `;
    const appointments = await executeQuery(availabilityQuery, [id]);
    
    const workingHours = {
      monday: { start: '09:00', end: '17:00' },
      tuesday: { start: '09:00', end: '17:00' },
      wednesday: { start: '09:00', end: '17:00' },
      thursday: { start: '09:00', end: '17:00' },
      friday: { start: '09:00', end: '17:00' },
      saturday: { start: '10:00', end: '14:00' },
      sunday: { start: null, end: null }
    };
    
    res.json({
      available: doctors[0].available,
      workingHours,
      bookedSlots: appointments
    });
  } catch (error) {
    console.error('Get doctor availability error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Admin CRUD operations for doctors
export const createDoctor = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      specialty,
      experience,
      rating = 0,
      available = true,
      bio,
      education,
      phone,
      email,
      consultationFee = 0
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !specialty || !experience) {
      return res.status(400).json({ message: 'Required fields are missing' });
    }

    const insertQuery = `
      INSERT INTO doctors (firstName, lastName, specialty, experience, rating, available, bio, education, phone, email, consultationFee, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const result = await executeQuery(insertQuery, [
      firstName, lastName, specialty, experience, rating, available, bio, education, phone, email, consultationFee
    ]);

    // Get the created doctor
    const getQuery = 'SELECT * FROM doctors WHERE id = ?';
    const doctors = await executeQuery(getQuery, [result.insertId]);

    res.status(201).json({
      message: 'Doctor created successfully',
      doctor: doctors[0]
    });
  } catch (error) {
    console.error('Create doctor error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      specialty,
      experience,
      rating,
      available,
      bio,
      education,
      phone,
      email,
      consultationFee
    } = req.body;

    // Check if doctor exists
    const checkQuery = 'SELECT id FROM doctors WHERE id = ?';
    const doctors = await executeQuery(checkQuery, [id]);

    if (doctors.length === 0) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Update doctor
    const updateQuery = `
      UPDATE doctors 
      SET firstName = ?, lastName = ?, specialty = ?, experience = ?, rating = ?, 
          available = ?, bio = ?, education = ?, phone = ?, email = ?, consultationFee = ?, updatedAt = NOW()
      WHERE id = ?
    `;

    await executeQuery(updateQuery, [
      firstName, lastName, specialty, experience, rating, available, bio, education, phone, email, consultationFee, id
    ]);

    // Get updated doctor
    const getQuery = 'SELECT * FROM doctors WHERE id = ?';
    const updatedDoctors = await executeQuery(getQuery, [id]);

    res.json({
      message: 'Doctor updated successfully',
      doctor: updatedDoctors[0]
    });
  } catch (error) {
    console.error('Update doctor error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if doctor exists
    const checkQuery = 'SELECT id FROM doctors WHERE id = ?';
    const doctors = await executeQuery(checkQuery, [id]);

    if (doctors.length === 0) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Check if doctor has upcoming appointments
    const appointmentCheckQuery = `
      SELECT COUNT(*) as count FROM appointments 
      WHERE doctorId = ? AND date >= CURDATE() AND status != 'cancelled'
    `;
    const appointmentCheck = await executeQuery(appointmentCheckQuery, [id]);

    if (appointmentCheck[0].count > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete doctor with upcoming appointments' 
      });
    }

    // Delete doctor
    const deleteQuery = 'DELETE FROM doctors WHERE id = ?';
    await executeQuery(deleteQuery, [id]);

    res.json({ message: 'Doctor deleted successfully' });
  } catch (error) {
    console.error('Delete doctor error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getDoctorStats = async (req, res) => {
  try {
    const { id } = req.params;

    // Get doctor info
    const doctorQuery = 'SELECT * FROM doctors WHERE id = ?';
    const doctors = await executeQuery(doctorQuery, [id]);

    if (doctors.length === 0) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Get appointment stats
    const statsQuery = `
      SELECT 
        COUNT(*) as totalAppointments,
        SUM(status = 'completed') as completedAppointments,
        SUM(status = 'cancelled') as cancelledAppointments,
        SUM(status = 'scheduled') as scheduledAppointments,
        SUM(status = 'confirmed') as confirmedAppointments
      FROM appointments 
      WHERE doctorId = ?
    `;
    const stats = await executeQuery(statsQuery, [id]);

    // Get upcoming appointments
    const upcomingQuery = `
      SELECT COUNT(*) as upcomingAppointments
      FROM appointments 
      WHERE doctorId = ? AND date >= CURDATE() AND status != 'cancelled'
    `;
    const upcoming = await executeQuery(upcomingQuery, [id]);

    res.json({
      doctor: doctors[0],
      stats: stats[0],
      upcoming: upcoming[0]
    });
  } catch (error) {
    console.error('Get doctor stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
