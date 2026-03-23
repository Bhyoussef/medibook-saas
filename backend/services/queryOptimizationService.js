import { executeQuery } from '../config/database.js';
import { cacheGet, cacheSet } from './cacheService.js';

// Query optimization configuration
const QUERY_CONFIG = {
  slowQueryThreshold: 1000, // milliseconds
  maxQueryTime: 5000, // milliseconds
  enableQueryCache: true,
  enableQueryLogging: true,
  enableSlowQueryAlerts: true
};

// Query performance tracking
class QueryPerformanceTracker {
  constructor() {
    this.queryStats = new Map();
    this.slowQueries = [];
    this.maxSlowQueries = 100;
  }

  trackQuery(query, duration, success = true, error = null) {
    const queryHash = this.hashQuery(query);
    const stats = this.queryStats.get(queryHash) || {
      query,
      count: 0,
      totalTime: 0,
      avgTime: 0,
      minTime: Infinity,
      maxTime: 0,
      errors: 0,
      lastExecuted: null
    };

    stats.count++;
    stats.totalTime += duration;
    stats.avgTime = stats.totalTime / stats.count;
    stats.minTime = Math.min(stats.minTime, duration);
    stats.maxTime = Math.max(stats.maxTime, duration);
    stats.lastExecuted = new Date();

    if (!success) {
      stats.errors++;
    }

    this.queryStats.set(queryHash, stats);

    // Track slow queries
    if (duration > QUERY_CONFIG.slowQueryThreshold) {
      this.addSlowQuery({
        query,
        duration,
        timestamp: new Date(),
        error
      });
    }

    return stats;
  }

  hashQuery(query) {
    // Simple hash for query identification
    return query.replace(/\s+/g, ' ').trim().substring(0, 100);
  }

  addSlowQuery(slowQuery) {
    this.slowQueries.unshift(slowQuery);
    
    // Keep only the most recent slow queries
    if (this.slowQueries.length > this.maxSlowQueries) {
      this.slowQueries = this.slowQueries.slice(0, this.maxSlowQueries);
    }

    // Log slow query
    if (QUERY_CONFIG.enableSlowQueryAlerts) {
      console.warn(`Slow query detected (${slowQuery.duration}ms): ${slowQuery.query.substring(0, 100)}...`);
    }
  }

  getStats() {
    return {
      totalQueries: this.queryStats.size,
      slowQueries: this.slowQueries.length,
      queryStats: Array.from(this.queryStats.values()).sort((a, b) => b.avgTime - a.avgTime)
    };
  }

  getSlowQueries() {
    return this.slowQueries;
  }
}

const performanceTracker = new QueryPerformanceTracker();

// Optimized query execution
export const executeOptimizedQuery = async (query, params = [], options = {}) => {
  const startTime = Date.now();
  const queryHash = performanceTracker.hashQuery(query);

  try {
    let result;

    // Check cache if enabled
    if (QUERY_CONFIG.enableQueryCache && options.cacheKey) {
      const cached = await cacheGet(options.cacheKey);
      if (cached !== null) {
        const duration = Date.now() - startTime;
        performanceTracker.trackQuery(query, duration, true);
        return cached;
      }
    }

    // Execute query with timeout
    result = await executeQueryWithTimeout(query, params, options.timeout || QUERY_CONFIG.maxQueryTime);

    // Cache result if enabled
    if (QUERY_CONFIG.enableQueryCache && options.cacheKey && options.cacheTTL) {
      await cacheSet(options.cacheKey, result, options.cacheTTL);
    }

    const duration = Date.now() - startTime;
    performanceTracker.trackQuery(query, duration, true);

    // Log query if enabled
    if (QUERY_CONFIG.enableQueryLogging) {
      console.log(`Query executed in ${duration}ms: ${queryHash}`);
    }

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    performanceTracker.trackQuery(query, duration, false, error.message);

    console.error(`Query failed in ${duration}ms: ${queryHash}`, error);
    throw error;
  }
};

// Execute query with timeout
const executeQueryWithTimeout = async (query, params, timeout) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Query timeout after ${timeout}ms`));
    }, timeout);

    executeQuery(query, params)
      .then(result => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timer);
        reject(error);
      });
  });
};

// Optimized user queries
export const getUserOptimized = async (userId) => {
  const cacheKey = `user:${userId}`;
  const query = `
    SELECT 
      u.id, u.firstName, u.lastName, u.email, u.phone, u.role, u.isActive,
      u.createdAt, u.lastLogin,
      CASE 
        WHEN d.id IS NOT NULL THEN JSON_OBJECT('id', d.id, 'specialty', d.specialty, 'consultationFee', d.consultationFee, 'available', d.available)
        ELSE NULL
      END as doctorInfo
    FROM users u
    LEFT JOIN doctors d ON u.id = d.id
    WHERE u.id = ?
  `;

  return await executeOptimizedQuery(query, [userId], {
    cacheKey,
    cacheTTL: 600 // 10 minutes
  });
};

export const getUserAppointmentsOptimized = async (userId, limit = 10, offset = 0) => {
  const cacheKey = `appointments:user:${userId}:${limit}:${offset}`;
  const query = `
    SELECT 
      a.id, a.date, a.time, a.status, a.reason, a.consultationFee,
      d.firstName as doctorFirstName, d.lastName as doctorLastName, 
      d.specialty, d.consultationFee as doctorFee,
      CASE 
        WHEN a.date >= CURDATE() THEN 'upcoming'
        ELSE 'past'
      END as appointmentType
    FROM appointments a
    JOIN doctors d ON a.doctorId = d.id
    WHERE a.userId = ?
    ORDER BY a.date DESC, a.time DESC
    LIMIT ? OFFSET ?
  `;

  return await executeOptimizedQuery(query, [userId, limit, offset], {
    cacheKey,
    cacheTTL: 300 // 5 minutes
  });
};

export const getDoctorAppointmentsOptimized = async (doctorId, date = null) => {
  const cacheKey = `appointments:doctor:${doctorId}:${date || 'all'}`;
  let query = `
    SELECT 
      a.id, a.date, a.time, a.status, a.reason,
      u.firstName as userFirstName, u.lastName as userLastName, 
      u.phone, u.email,
      TIMESTAMPDIFF(MINUTE, CONCAT(a.date, ' ', a.time), NOW()) as timeUntil
    FROM appointments a
    JOIN users u ON a.userId = u.id
    WHERE a.doctorId = ?
  `;
  
  const params = [doctorId];

  if (date) {
    query += ' AND a.date = ?';
    params.push(date);
  }

  query += ' ORDER BY a.date ASC, a.time ASC';

  return await executeOptimizedQuery(query, params, {
    cacheKey,
    cacheTTL: 300 // 5 minutes
  });
};

export const getDoctorsOptimized = async (filters = {}) => {
  const cacheKey = `doctors:${JSON.stringify(filters)}`;
  let query = `
    SELECT 
      d.id, d.firstName, d.lastName, d.specialty, d.consultationFee, 
      d.available, d.rating, d.experience,
      (SELECT COUNT(*) FROM appointments WHERE doctorId = d.id AND status = 'completed') as completedAppointments,
      (SELECT AVG(rating) FROM appointments WHERE doctorId = d.id AND status = 'completed' AND rating IS NOT NULL) as avgRating
    FROM doctors d
    WHERE 1=1
  `;
  
  const params = [];

  if (filters.specialty) {
    query += ' AND d.specialty = ?';
    params.push(filters.specialty);
  }

  if (filters.available !== undefined) {
    query += ' AND d.available = ?';
    params.push(filters.available);
  }

  if (filters.minRating) {
    query += ' AND d.rating >= ?';
    params.push(filters.minRating);
  }

  query += ' ORDER BY d.rating DESC, d.lastName ASC';

  return await executeOptimizedQuery(query, params, {
    cacheKey,
    cacheTTL: 600 // 10 minutes
  });
};

export const getNotificationsOptimized = async (userId, limit = 20, unreadOnly = false) => {
  const cacheKey = `notifications:${userId}:${limit}:${unreadOnly}`;
  let query = `
    SELECT 
      n.id, n.title, n.message, n.type, n.priority, n.createdAt,
      n.readAt, d.firstName as doctorFirstName, d.lastName as doctorLastName,
      CASE 
        WHEN n.readAt IS NULL THEN true
        ELSE false
      END as isUnread
    FROM notifications n
    LEFT JOIN doctors d ON n.doctorId = d.id
    WHERE n.userId = ?
  `;
  
  const params = [userId];

  if (unreadOnly) {
    query += ' AND n.readAt IS NULL';
  }

  query += ' ORDER BY n.createdAt DESC LIMIT ?';
  params.push(limit);

  return await executeOptimizedQuery(query, params, {
    cacheKey,
    cacheTTL: 180 // 3 minutes
  });
};

// Dashboard queries optimization
export const getDashboardStatsOptimized = async (userId, role, period = '30') => {
  const cacheKey = `dashboard:${userId}:${role}:${period}`;
  const periodDays = parseInt(period);

  let query = '';
  const params = [];

  if (role === 'doctor') {
    query = `
      SELECT 
        COUNT(*) as totalAppointments,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'no-show' THEN 1 ELSE 0 END) as noShow,
        SUM(consultationFee) as totalRevenue,
        AVG(consultationFee) as avgRevenue
      FROM appointments 
      WHERE doctorId = ? 
        AND date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    `;
    params.push(userId, periodDays);
  } else if (role === 'patient') {
    query = `
      SELECT 
        COUNT(*) as totalAppointments,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        COUNT(CASE WHEN date >= CURDATE() AND status NOT IN ('cancelled', 'no-show') THEN 1 END) as upcoming
      FROM appointments 
      WHERE userId = ? 
        AND date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    `;
    params.push(userId, periodDays);
  } else if (role === 'admin') {
    query = `
      SELECT 
        COUNT(*) as totalAppointments,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(consultationFee) as totalRevenue,
        COUNT(DISTINCT userId) as totalPatients,
        COUNT(DISTINCT doctorId) as totalDoctors
      FROM appointments 
      WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    `;
    params.push(periodDays);
  }

  return await executeOptimizedQuery(query, params, {
    cacheKey,
    cacheTTL: 300 // 5 minutes
  });
};

// Batch query execution
export const executeBatchQueries = async (queries) => {
  const results = [];
  const startTime = Date.now();

  try {
    // Execute all queries in parallel
    const promises = queries.map(async (queryInfo) => {
      const { query, params, options } = queryInfo;
      return await executeOptimizedQuery(query, params, options);
    });

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);

    const duration = Date.now() - startTime;
    console.log(`Batch of ${queries.length} queries executed in ${duration}ms`);

    return results;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Batch query failed in ${duration}ms:`, error);
    throw error;
  }
};

// Query optimization suggestions
export const analyzeQueryPerformance = () => {
  const stats = performanceTracker.getStats();
  const suggestions = [];

  // Analyze slow queries
  const slowQueries = stats.slowQueries.slice(0, 10);
  
  for (const slowQuery of slowQueries) {
    const suggestion = {
      query: slowQuery.query.substring(0, 100) + '...',
      duration: slowQuery.duration,
      suggestions: []
    };

    // Check for missing indexes
    if (slowQuery.query.includes('WHERE') && !slowQuery.query.includes('INDEX')) {
      suggestion.suggestions.push('Consider adding indexes for WHERE clause columns');
    }

    // Check for JOIN operations
    if (slowQuery.query.includes('JOIN')) {
      suggestion.suggestions.push('Optimize JOIN conditions and ensure proper indexes');
    }

    // Check for ORDER BY
    if (slowQuery.query.includes('ORDER BY')) {
      suggestion.suggestions.push('Consider adding indexes for ORDER BY columns');
    }

    // Check for SELECT *
    if (slowQuery.query.includes('SELECT *')) {
      suggestion.suggestions.push('Avoid SELECT *, specify only needed columns');
    }

    // Check for subqueries
    if (slowQuery.query.includes('(SELECT')) {
      suggestion.suggestions.push('Consider rewriting subqueries as JOINs');
    }

    suggestions.push(suggestion);
  }

  return {
    stats,
    slowQueries: slowQueries,
    suggestions
  };
};

// Database health check
export const checkDatabaseHealth = async () => {
  try {
    const startTime = Date.now();

    // Test basic connectivity
    await executeQuery('SELECT 1');

    const connectivityTime = Date.now() - startTime;

    // Check table sizes and indexes
    const tableStats = await executeQuery(`
      SELECT 
        TABLE_NAME as tableName,
        TABLE_ROWS as rowCount,
        DATA_LENGTH as dataSize,
        INDEX_LENGTH as indexSize
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY DATA_LENGTH DESC
      LIMIT 10
    `);

    // Check slow queries
    const slowQueryCount = performanceTracker.getSlowQueries().length;

    // Check cache hit rate
    const cacheStats = await cacheGet('stats') || { hitRate: 0 };

    return {
      status: 'healthy',
      connectivityTime,
      tableStats,
      slowQueryCount,
      cacheHitRate: cacheStats.hitRate,
      timestamp: new Date()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date()
    };
  }
};

// Get query performance statistics
export const getQueryPerformanceStats = () => {
  return performanceTracker.getStats();
};

// Clear query performance data
export const clearQueryPerformanceData = () => {
  performanceTracker.queryStats.clear();
  performanceTracker.slowQueries = [];
};

// Export performance tracker for advanced usage
export { performanceTracker };
