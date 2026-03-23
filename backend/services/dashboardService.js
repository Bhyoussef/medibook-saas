import { executeQuery } from '../config/database.js';

// Get comprehensive dashboard statistics for doctors
export const getDoctorDashboardStats = async (doctorId, period = '30') => {
  try {
    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    const startDateStr = startDate.toISOString().split('T')[0];

    const stats = {
      overview: {},
      appointments: {},
      performance: {},
      revenue: {},
      trends: {},
      upcoming: []
    };

    // Overview statistics
    const overviewQuery = `
      SELECT 
        COUNT(*) as totalAppointments,
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'no-show' THEN 1 ELSE 0 END) as noShow
      FROM appointments 
      WHERE doctorId = ? 
        AND date >= ?
    `;
    
    const overview = await executeQuery(overviewQuery, [doctorId, startDateStr]);
    stats.overview = overview[0];

    // Today's appointments
    const todayQuery = `
      SELECT 
        COUNT(*) as todayTotal,
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as todayScheduled,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as todayConfirmed,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as todayCompleted
      FROM appointments 
      WHERE doctorId = ? AND date = CURDATE()
    `;
    
    const today = await executeQuery(todayQuery, [doctorId]);
    stats.overview.today = today[0];

    // Upcoming appointments (next 7 days)
    const upcomingQuery = `
      SELECT a.id, a.date, a.time, a.status, a.reason,
             u.firstName as patientFirstName, u.lastName as patientLastName, u.phone,
             d.consultationFee
      FROM appointments a
      JOIN users u ON a.userId = u.id
      LEFT JOIN doctors d ON a.doctorId = d.id
      WHERE a.doctorId = ? 
        AND a.date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
        AND a.status NOT IN ('cancelled', 'no-show')
      ORDER BY a.date, a.time
      LIMIT 10
    `;
    
    stats.upcoming = await executeQuery(upcomingQuery, [doctorId]);

    // Performance metrics
    const performanceQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'no-show' THEN 1 ELSE 0 END) as noShow,
        AVG(CASE WHEN status = 'completed' 
            THEN TIMESTAMPDIFF(MINUTE, CONCAT(date, ' ', time), updatedAt) 
            ELSE NULL END) as avgDurationMinutes
      FROM appointments 
      WHERE doctorId = ? 
        AND date >= ?
        AND status IN ('completed', 'cancelled', 'no-show')
    `;
    
    const performance = await executeQuery(performanceQuery, [doctorId, startDateStr]);
    const perfData = performance[0];
    
    stats.performance = {
      completionRate: perfData.total > 0 ? ((perfData.completed / perfData.total) * 100).toFixed(1) : 0,
      cancellationRate: perfData.total > 0 ? ((perfData.cancelled / perfData.total) * 100).toFixed(1) : 0,
      noShowRate: perfData.total > 0 ? ((perfData.noShow / perfData.total) * 100).toFixed(1) : 0,
      showRate: perfData.total > 0 ? (((perfData.completed + perfData.cancelled) / perfData.total) * 100).toFixed(1) : 0,
      avgDuration: perfData.avgDurationMinutes ? Math.round(perfData.avgDurationMinutes) : 0
    };

    // Revenue statistics
    const revenueQuery = `
      SELECT 
        SUM(consultationFee) as totalRevenue,
        AVG(consultationFee) as avgRevenue,
        COUNT(*) as paidAppointments
      FROM appointments 
      WHERE doctorId = ? 
        AND date >= ?
        AND status = 'completed'
        AND paymentStatus = 'paid'
    `;
    
    const revenue = await executeQuery(revenueQuery, [doctorId, startDateStr]);
    stats.revenue = {
      total: revenue[0].totalRevenue || 0,
      average: revenue[0].avgRevenue || 0,
      appointments: revenue[0].paidAppointments || 0
    };

    // Daily trends for the period
    const trendsQuery = `
      SELECT 
        DATE(date) as date,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'no-show' THEN 1 ELSE 0 END) as noShow,
        SUM(consultationFee) as revenue
      FROM appointments 
      WHERE doctorId = ? 
        AND date >= ?
      GROUP BY DATE(date)
      ORDER BY date ASC
    `;
    
    stats.trends = await executeQuery(trendsQuery, [doctorId, startDateStr]);

    // Patient demographics
    const demographicsQuery = `
      SELECT 
        COUNT(DISTINCT userId) as totalPatients,
        COUNT(DISTINCT CASE WHEN date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN userId END) as newPatients,
        COUNT(DISTINCT CASE WHEN date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND date < CURDATE() THEN userId END) as returningPatients
      FROM appointments 
      WHERE doctorId = ? 
        AND date >= ?
        AND status NOT IN ('cancelled', 'no-show')
    `;
    
    const demographics = await executeQuery(demographicsQuery, [doctorId, startDateStr]);
    stats.demographics = demographics[0];

    return stats;
    
  } catch (error) {
    console.error('Get doctor dashboard stats error:', error);
    throw error;
  }
};

// Get comprehensive dashboard statistics for admin
export const getAdminDashboardStats = async (period = '30') => {
  try {
    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    const startDateStr = startDate.toISOString().split('T')[0];

    const stats = {
      overview: {},
      appointments: {},
      doctors: {},
      patients: {},
      revenue: {},
      trends: {}
    };

    // System overview
    const overviewQuery = `
      SELECT 
        (SELECT COUNT(*) FROM doctors WHERE available = TRUE) as activeDoctors,
        (SELECT COUNT(*) FROM users) as totalUsers,
        (SELECT COUNT(*) FROM appointments WHERE date >= ?) as totalAppointments,
        (SELECT COUNT(*) FROM appointments WHERE date = CURDATE()) as todayAppointments
    `;
    
    const overview = await executeQuery(overviewQuery, [startDateStr]);
    stats.overview = overview[0];

    // Appointment statistics
    const appointmentsQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'no-show' THEN 1 ELSE 0 END) as noShow
      FROM appointments 
      WHERE date >= ?
    `;
    
    const appointments = await executeQuery(appointmentsQuery, [startDateStr]);
    stats.appointments = appointments[0];

    // Doctor statistics
    const doctorsQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN available = TRUE THEN 1 ELSE 0 END) as available,
        AVG(rating) as avgRating,
        COUNT(CASE WHEN rating >= 4.5 THEN 1 END) as topRated
      FROM doctors
    `;
    
    const doctors = await executeQuery(doctorsQuery);
    stats.doctors = doctors[0];

    // Patient statistics
    const patientsQuery = `
      SELECT 
        COUNT(DISTINCT userId) as totalPatients,
        COUNT(DISTINCT CASE WHEN createdAt >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN userId END) as newPatients,
        COUNT(DISTINCT CASE WHEN lastLogin >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN userId END) as activePatients
      FROM users
    `;
    
    const patients = await executeQuery(patientsQuery);
    stats.patients = patients[0];

    // Revenue statistics
    const revenueQuery = `
      SELECT 
        SUM(consultationFee) as totalRevenue,
        AVG(consultationFee) as avgRevenue,
        COUNT(*) as paidAppointments
      FROM appointments 
      WHERE date >= ?
        AND status = 'completed'
        AND paymentStatus = 'paid'
    `;
    
    const revenue = await executeQuery(revenueQuery, [startDateStr]);
    stats.revenue = {
      total: revenue[0].totalRevenue || 0,
      average: revenue[0].avgRevenue || 0,
      appointments: revenue[0].paidAppointments || 0
    };

    // Daily trends
    const trendsQuery = `
      SELECT 
        DATE(date) as date,
        COUNT(*) as totalAppointments,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(consultationFee) as revenue
      FROM appointments 
      WHERE date >= ?
      GROUP BY DATE(date)
      ORDER BY date ASC
    `;
    
    stats.trends = await executeQuery(trendsQuery, [startDateStr]);

    // Top performing doctors
    const topDoctorsQuery = `
      SELECT 
        d.id,
        d.firstName,
        d.lastName,
        d.specialty,
        COUNT(a.id) as appointmentCount,
        SUM(CASE WHEN a.status = 'completed' THEN a.consultationFee ELSE 0 END) as revenue,
        AVG(d.rating) as rating
      FROM doctors d
      LEFT JOIN appointments a ON d.id = a.doctorId AND a.date >= ?
      WHERE d.available = TRUE
      GROUP BY d.id, d.firstName, d.lastName, d.specialty, d.rating
      ORDER BY revenue DESC
      LIMIT 10
    `;
    
    stats.topDoctors = await executeQuery(topDoctorsQuery, [startDateStr]);

    return stats;
    
  } catch (error) {
    console.error('Get admin dashboard stats error:', error);
    throw error;
  }
};

// Get patient dashboard statistics
export const getPatientDashboardStats = async (userId, period = '30') => {
  try {
    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    const startDateStr = startDate.toISOString().split('T')[0];

    const stats = {
      overview: {},
      appointments: {},
      doctors: {},
      history: []
    };

    // Overview statistics
    const overviewQuery = `
      SELECT 
        COUNT(*) as totalAppointments,
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as upcoming,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'no-show' THEN 1 ELSE 0 END) as noShow
      FROM appointments 
      WHERE userId = ? 
        AND date >= ?
    `;
    
    const overview = await executeQuery(overviewQuery, [userId, startDateStr]);
    stats.overview = overview[0];

    // Upcoming appointments
    const upcomingQuery = `
      SELECT a.id, a.date, a.time, a.status, a.reason,
             d.firstName as doctorFirstName, d.lastName as doctorLastName, d.specialty,
             d.consultationFee
      FROM appointments a
      JOIN doctors d ON a.doctorId = d.id
      WHERE a.userId = ? 
        AND a.date >= CURDATE()
        AND a.status NOT IN ('cancelled', 'no-show')
      ORDER BY a.date, a.time
      LIMIT 5
    `;
    
    stats.upcoming = await executeQuery(upcomingQuery, [userId]);

    // Recent appointments
    const historyQuery = `
      SELECT a.id, a.date, a.time, a.status, a.reason,
             d.firstName as doctorFirstName, d.lastName as doctorLastName, d.specialty,
             d.consultationFee
      FROM appointments a
      JOIN doctors d ON a.doctorId = d.id
      WHERE a.userId = ? 
        AND a.date < CURDATE()
      ORDER BY a.date DESC, a.time DESC
      LIMIT 10
    `;
    
    stats.history = await executeQuery(historyQuery, [userId]);

    // Favorite doctors (most visited)
    const doctorsQuery = `
      SELECT 
        d.id,
        d.firstName,
        d.lastName,
        d.specialty,
        d.rating,
        COUNT(a.id) as visitCount,
        AVG(d.rating) as avgRating
      FROM doctors d
      JOIN appointments a ON d.id = a.doctorId
      WHERE a.userId = ? 
        AND a.status = 'completed'
      GROUP BY d.id, d.firstName, d.lastName, d.specialty, d.rating
      ORDER BY visitCount DESC
      LIMIT 5
    `;
    
    stats.favoriteDoctors = await executeQuery(doctorsQuery, [userId]);

    return stats;
    
  } catch (error) {
    console.error('Get patient dashboard stats error:', error);
    throw error;
  }
};

// Get real-time statistics for live dashboard
export const getLiveStats = async () => {
  try {
    const stats = {
      today: {},
      thisWeek: {},
      thisMonth: {},
      system: {}
    };

    // Today's stats
    const todayQuery = `
      SELECT 
        COUNT(*) as totalAppointments,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(consultationFee) as revenue
      FROM appointments 
      WHERE date = CURDATE()
    `;
    
    const today = await executeQuery(todayQuery);
    stats.today = today[0];

    // This week's stats
    const weekQuery = `
      SELECT 
        COUNT(*) as totalAppointments,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(consultationFee) as revenue
      FROM appointments 
      WHERE date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    `;
    
    const week = await executeQuery(weekQuery);
    stats.thisWeek = week[0];

    // This month's stats
    const monthQuery = `
      SELECT 
        COUNT(*) as totalAppointments,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(consultationFee) as revenue
      FROM appointments 
      WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `;
    
    const month = await executeQuery(monthQuery);
    stats.thisMonth = month[0];

    // System stats
    const systemQuery = `
      SELECT 
        (SELECT COUNT(*) FROM doctors WHERE available = TRUE) as activeDoctors,
        (SELECT COUNT(*) FROM users) as totalUsers,
        (SELECT COUNT(*) FROM appointments WHERE date = CURDATE() AND status = 'scheduled') as pendingToday,
        (SELECT COUNT(*) FROM appointments WHERE date = CURDATE() AND status = 'confirmed') as confirmedToday
    `;
    
    const system = await executeQuery(systemQuery);
    stats.system = system[0];

    return stats;
    
  } catch (error) {
    console.error('Get live stats error:', error);
    throw error;
  }
};
