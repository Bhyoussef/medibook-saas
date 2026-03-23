import { getDoctorDashboardStats, getAdminDashboardStats, getPatientDashboardStats, getLiveStats } from '../services/dashboardService.js';

// Get doctor dashboard statistics
export const getDoctorDashboardController = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const doctorId = req.user.id; // Get from authenticated user
    
    // Validate period
    const periodNum = parseInt(period);
    if (isNaN(periodNum) || periodNum < 1 || periodNum > 365) {
      return res.status(400).json({ message: 'Period must be between 1 and 365 days' });
    }
    
    // Verify user is a doctor
    const doctorCheck = await executeQuery('SELECT id FROM doctors WHERE id = ?', [doctorId]);
    if (doctorCheck.length === 0) {
      return res.status(403).json({ message: 'Access denied. Only doctors can access their dashboard.' });
    }
    
    const stats = await getDoctorDashboardStats(doctorId, period);
    
    res.json({
      success: true,
      period: periodNum,
      stats
    });
  } catch (error) {
    console.error('Get doctor dashboard error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get dashboard statistics' 
    });
  }
};

// Get admin dashboard statistics
export const getAdminDashboardController = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    
    // Validate period
    const periodNum = parseInt(period);
    if (isNaN(periodNum) || periodNum < 1 || periodNum > 365) {
      return res.status(400).json({ message: 'Period must be between 1 and 365 days' });
    }
    
    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only admins can access admin dashboard.' });
    }
    
    const stats = await getAdminDashboardStats(period);
    
    res.json({
      success: true,
      period: periodNum,
      stats
    });
  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get admin dashboard statistics' 
    });
  }
};

// Get patient dashboard statistics
export const getPatientDashboardController = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const userId = req.user.id; // Get from authenticated user
    
    // Validate period
    const periodNum = parseInt(period);
    if (isNaN(periodNum) || periodNum < 1 || periodNum > 365) {
      return res.status(400).json({ message: 'Period must be between 1 and 365 days' });
    }
    
    // Verify user exists
    const userCheck = await executeQuery('SELECT id FROM users WHERE id = ?', [userId]);
    if (userCheck.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const stats = await getPatientDashboardStats(userId, period);
    
    res.json({
      success: true,
      period: periodNum,
      stats
    });
  } catch (error) {
    console.error('Get patient dashboard error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get patient dashboard statistics' 
    });
  }
};

// Get live statistics for real-time dashboard
export const getLiveStatsController = async (req, res) => {
  try {
    // Verify user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const stats = await getLiveStats();
    
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get live stats error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get live statistics' 
    });
  }
};

// Get appointment trends for charts
export const getAppointmentTrendsController = async (req, res) => {
  try {
    const { period = '30', doctorId } = req.query;
    
    // Validate period
    const periodNum = parseInt(period);
    if (isNaN(periodNum) || periodNum < 1 || periodNum > 365) {
      return res.status(400).json({ message: 'Period must be between 1 and 365 days' });
    }
    
    // Check authorization
    if (doctorId && req.user.role !== 'admin' && req.user.id != doctorId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodNum);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    let query = `
      SELECT 
        DATE(date) as date,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'no-show' THEN 1 ELSE 0 END) as noShow,
        SUM(consultationFee) as revenue
      FROM appointments 
      WHERE date >= ?
    `;
    
    const params = [startDateStr];
    
    if (doctorId) {
      query += ' AND doctorId = ?';
      params.push(doctorId);
    }
    
    query += ' GROUP BY DATE(date) ORDER BY date ASC';
    
    const trends = await executeQuery(query, params);
    
    res.json({
      success: true,
      period: periodNum,
      trends
    });
  } catch (error) {
    console.error('Get appointment trends error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get appointment trends' 
    });
  }
};

// Get revenue statistics
export const getRevenueStatsController = async (req, res) => {
  try {
    const { period = '30', doctorId } = req.query;
    
    // Validate period
    const periodNum = parseInt(period);
    if (isNaN(periodNum) || periodNum < 1 || periodNum > 365) {
      return res.status(400).json({ message: 'Period must be between 1 and 365 days' });
    }
    
    // Check authorization
    if (doctorId && req.user.role !== 'admin' && req.user.id != doctorId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodNum);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    let query = `
      SELECT 
        DATE(date) as date,
        SUM(consultationFee) as dailyRevenue,
        COUNT(*) as appointmentCount,
        AVG(consultationFee) as avgFee
      FROM appointments 
      WHERE date >= ?
        AND status = 'completed'
        AND paymentStatus = 'paid'
    `;
    
    const params = [startDateStr];
    
    if (doctorId) {
      query += ' AND doctorId = ?';
      params.push(doctorId);
    }
    
    query += ' GROUP BY DATE(date) ORDER BY date ASC';
    
    const revenueStats = await executeQuery(query, params);
    
    // Calculate totals
    const totalRevenue = revenueStats.reduce((sum, day) => sum + parseFloat(day.dailyRevenue), 0);
    const totalAppointments = revenueStats.reduce((sum, day) => sum + parseInt(day.appointmentCount), 0);
    const avgRevenue = totalAppointments > 0 ? totalRevenue / totalAppointments : 0;
    
    res.json({
      success: true,
      period: periodNum,
      stats: {
        totalRevenue,
        totalAppointments,
        avgRevenue: Math.round(avgRevenue * 100) / 100,
        dailyStats: revenueStats
      }
    });
  } catch (error) {
    console.error('Get revenue stats error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get revenue statistics' 
    });
  }
};

// Get patient demographics and statistics
export const getPatientStatsController = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    
    // Verify user is admin or doctor
    if (req.user.role !== 'admin' && req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Validate period
    const periodNum = parseInt(period);
    if (isNaN(periodNum) || periodNum < 1 || periodNum > 365) {
      return res.status(400).json({ message: 'Period must be between 1 and 365 days' });
    }
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodNum);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    // Patient demographics
    const demographicsQuery = `
      SELECT 
        COUNT(DISTINCT u.id) as totalPatients,
        COUNT(DISTINCT CASE WHEN a.createdAt >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN u.id END) as newPatients,
        COUNT(DISTINCT CASE WHEN u.lastLogin >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN u.id END) as activePatients,
        AVG(YEAR(CURDATE()) - YEAR(u.dateOfBirth)) as avgAge,
        COUNT(CASE WHEN u.gender = 'male' THEN 1 END) as malePatients,
        COUNT(CASE WHEN u.gender = 'female' THEN 1 END) as femalePatients
      FROM users u
      LEFT JOIN appointments a ON u.id = a.userId AND a.date >= ?
      WHERE u.id IN (SELECT DISTINCT userId FROM appointments WHERE date >= ?)
    `;
    
    const demographics = await executeQuery(demographicsQuery, [startDateStr, startDateStr]);
    
    // Top patients by appointment count
    const topPatientsQuery = `
      SELECT 
        u.id,
        u.firstName,
        u.lastName,
        u.email,
        COUNT(a.id) as appointmentCount,
        SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completedCount,
        SUM(a.consultationFee) as totalSpent
      FROM users u
      JOIN appointments a ON u.id = a.userId
      WHERE a.date >= ?
        AND a.status = 'completed'
      GROUP BY u.id, u.firstName, u.lastName, u.email
      ORDER BY appointmentCount DESC
      LIMIT 10
    `;
    
    const topPatients = await executeQuery(topPatientsQuery, [startDateStr]);
    
    res.json({
      success: true,
      period: periodNum,
      demographics: demographics[0],
      topPatients
    });
  } catch (error) {
    console.error('Get patient stats error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get patient statistics' 
    });
  }
};
