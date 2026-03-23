import { executeQuery } from '../config/database.js';
import { getErrorService } from './errorHandlingService.js';

// Performance monitoring configuration
const PERFORMANCE_CONFIG = {
  enabled: process.env.PERFORMANCE_MONITORING_ENABLED !== 'false',
  slowRequestThreshold: 1000, // milliseconds
  memoryThreshold: 0.8, // 80% of available memory
  cpuThreshold: 0.8, // 80% CPU usage
  diskThreshold: 0.9, // 90% disk usage
  alertThresholds: {
    errorRate: 0.05, // 5% error rate
    responseTime: 2000, // 2 seconds
    throughput: 100 // requests per minute
  }
};

// Performance metrics collector
class PerformanceMetrics {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        slow: 0,
        averageResponseTime: 0,
        responseTimeHistory: []
      },
      system: {
        memoryUsage: 0,
        cpuUsage: 0,
        diskUsage: 0,
        uptime: 0,
        loadAverage: []
      },
      database: {
        connections: 0,
        queryTime: 0,
        slowQueries: 0,
        connectionErrors: 0
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        size: 0
      }
    };
    
    this.alerts = [];
    this.maxMetricsHistory = 1000;
    this.collectionInterval = null;
  }

  // Start metrics collection
  startCollection() {
    if (!PERFORMANCE_CONFIG.enabled) return;

    this.collectionInterval = setInterval(() => {
      this.collectSystemMetrics();
      this.checkAlerts();
    }, 30000); // Collect every 30 seconds

    console.log('Performance monitoring started');
  }

  // Stop metrics collection
  stopCollection() {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
      console.log('Performance monitoring stopped');
    }
  }

  // Collect system metrics
  collectSystemMetrics() {
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      this.metrics.system.memoryUsage = memUsage.heapUsed / memUsage.heapTotal;
      this.metrics.system.uptime = process.uptime();
      
      // Calculate CPU usage (simplified)
      const totalCpu = cpuUsage.user + cpuUsage.system;
      this.metrics.system.cpuUsage = totalCpu / 1000000; // Convert to seconds
      
      // Store historical data
      this.metrics.system.loadAverage.push({
        timestamp: new Date(),
        memory: this.metrics.system.memoryUsage,
        cpu: this.metrics.system.cpuUsage
      });

      // Keep only recent history
      if (this.metrics.system.loadAverage.length > this.maxMetricsHistory) {
        this.metrics.system.loadAverage.shift();
      }
    } catch (error) {
      console.error('Failed to collect system metrics:', error);
    }
  }

  // Record request metrics
  recordRequest(duration, statusCode, route, method) {
    if (!PERFORMANCE_CONFIG.enabled) return;

    this.metrics.requests.total++;
    
    if (statusCode >= 200 && statusCode < 400) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }

    if (duration > PERFORMANCE_CONFIG.slowRequestThreshold) {
      this.metrics.requests.slow++;
    }

    // Update average response time
    const totalResponseTime = this.metrics.requests.averageResponseTime * (this.metrics.requests.total - 1) + duration;
    this.metrics.requests.averageResponseTime = totalResponseTime / this.metrics.requests.total;

    // Store response time history
    this.metrics.requests.responseTimeHistory.push({
      timestamp: new Date(),
      duration,
      statusCode,
      route,
      method
    });

    // Keep only recent history
    if (this.metrics.requests.responseTimeHistory.length > this.maxMetricsHistory) {
      this.metrics.requests.responseTimeHistory.shift();
    }
  }

  // Record database metrics
  recordDatabaseMetrics(connections, queryTime, slowQueries, connectionErrors) {
    if (!PERFORMANCE_CONFIG.enabled) return;

    this.metrics.database.connections = connections;
    this.metrics.database.queryTime = queryTime;
    this.metrics.database.slowQueries = slowQueries;
    this.metrics.database.connectionErrors = connectionErrors;
  }

  // Record cache metrics
  recordCacheMetrics(hits, misses, hitRate, size) {
    if (!PERFORMANCE_CONFIG.enabled) return;

    this.metrics.cache.hits = hits;
    this.metrics.cache.misses = misses;
    this.metrics.cache.hitRate = hitRate;
    this.metrics.cache.size = size;
  }

  // Check for performance alerts
  checkAlerts() {
    const alerts = [];

    // Check memory usage
    if (this.metrics.system.memoryUsage > PERFORMANCE_CONFIG.memoryThreshold) {
      alerts.push({
        type: 'memory',
        severity: 'high',
        message: `High memory usage: ${(this.metrics.system.memoryUsage * 100).toFixed(1)}%`,
        value: this.metrics.system.memoryUsage,
        threshold: PERFORMANCE_CONFIG.memoryThreshold
      });
    }

    // Check CPU usage
    if (this.metrics.system.cpuUsage > PERFORMANCE_CONFIG.cpuThreshold) {
      alerts.push({
        type: 'cpu',
        severity: 'high',
        message: `High CPU usage: ${(this.metrics.system.cpuUsage * 100).toFixed(1)}%`,
        value: this.metrics.system.cpuUsage,
        threshold: PERFORMANCE_CONFIG.cpuThreshold
      });
    }

    // Check error rate
    const errorRate = this.metrics.requests.failed / this.metrics.requests.total;
    if (errorRate > PERFORMANCE_CONFIG.alertThresholds.errorRate) {
      alerts.push({
        type: 'error_rate',
        severity: 'medium',
        message: `High error rate: ${(errorRate * 100).toFixed(1)}%`,
        value: errorRate,
        threshold: PERFORMANCE_CONFIG.alertThresholds.errorRate
      });
    }

    // Check response time
    if (this.metrics.requests.averageResponseTime > PERFORMANCE_CONFIG.alertThresholds.responseTime) {
      alerts.push({
        type: 'response_time',
        severity: 'medium',
        message: `High average response time: ${this.metrics.requests.averageResponseTime.toFixed(0)}ms`,
        value: this.metrics.requests.averageResponseTime,
        threshold: PERFORMANCE_CONFIG.alertThresholds.responseTime
      });
    }

    // Check cache hit rate
    if (this.metrics.cache.hitRate < 0.5 && this.metrics.cache.hits + this.metrics.cache.misses > 100) {
      alerts.push({
        type: 'cache_hit_rate',
        severity: 'low',
        message: `Low cache hit rate: ${(this.metrics.cache.hitRate * 100).toFixed(1)}%`,
        value: this.metrics.cache.hitRate,
        threshold: 0.5
      });
    }

    // Store alerts
    this.alerts.push(...alerts);
    
    // Keep only recent alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    // Log alerts
    for (const alert of alerts) {
      console.warn(`Performance Alert [${alert.severity.toUpperCase()}]: ${alert.message}`);
    }

    return alerts;
  }

  // Get performance metrics
  getMetrics() {
    return {
      ...this.metrics,
      alerts: this.alerts.slice(-10), // Last 10 alerts
      timestamp: new Date()
    };
  }

  // Get performance summary
  getSummary() {
    const uptime = this.metrics.system.uptime;
    const requestsPerMinute = this.metrics.requests.total / (uptime / 60);
    const errorRate = this.metrics.requests.failed / this.metrics.requests.total;
    const slowRequestRate = this.metrics.requests.slow / this.metrics.requests.total;

    return {
      uptime: uptime,
      requests: {
        total: this.metrics.requests.total,
        perMinute: requestsPerMinute,
        successRate: 1 - errorRate,
        errorRate: errorRate,
        slowRequestRate: slowRequestRate,
        averageResponseTime: this.metrics.requests.averageResponseTime
      },
      system: {
        memoryUsage: this.metrics.system.memoryUsage,
        cpuUsage: this.metrics.system.cpuUsage,
        uptime: uptime
      },
      database: {
        connections: this.metrics.database.connections,
        averageQueryTime: this.metrics.database.queryTime,
        slowQueries: this.metrics.database.slowQueries,
        connectionErrors: this.metrics.database.connectionErrors
      },
      cache: {
        hitRate: this.metrics.cache.hitRate,
        size: this.metrics.cache.size
      },
      alerts: {
        total: this.alerts.length,
        recent: this.alerts.slice(-5)
      }
    };
  }

  // Clear metrics
  clearMetrics() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        slow: 0,
        averageResponseTime: 0,
        responseTimeHistory: []
      },
      system: {
        memoryUsage: 0,
        cpuUsage: 0,
        diskUsage: 0,
        uptime: 0,
        loadAverage: []
      },
      database: {
        connections: 0,
        queryTime: 0,
        slowQueries: 0,
        connectionErrors: 0
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        size: 0
      }
    };
    this.alerts = [];
  }
}

// Performance monitoring service
class PerformanceMonitoringService {
  constructor() {
    this.metrics = new PerformanceMetrics();
    this.errorService = getErrorService();
    this.isStarted = false;
  }

  // Start monitoring
  start() {
    if (this.isStarted) return;
    
    this.metrics.startCollection();
    this.isStarted = true;
    
    // Register error callback for performance monitoring
    this.errorService.registerCallback('*', (error, req) => {
      // Log performance-related errors
      if (error.code === 'DATABASE_ERROR' || error.code === 'EXTERNAL_SERVICE_ERROR') {
        console.warn(`Performance-related error: ${error.code} - ${error.message}`);
      }
    });
  }

  // Stop monitoring
  stop() {
    if (!this.isStarted) return;
    
    this.metrics.stopCollection();
    this.isStarted = false;
  }

  // Get performance metrics
  getMetrics() {
    return this.metrics.getMetrics();
  }

  // Get performance summary
  getSummary() {
    return this.metrics.getSummary();
  }

  // Record request performance
  recordRequest(req, res, next) {
    if (!PERFORMANCE_CONFIG.enabled) return next();

    const startTime = Date.now();
    const originalSend = res.send;

    res.send = function(data) {
      const duration = Date.now() - startTime;
      const route = req.route?.path || req.path;
      const method = req.method;
      const statusCode = res.statusCode;

      // Record metrics
      this.metrics.recordRequest(duration, statusCode, route, method);

      // Log slow requests
      if (duration > PERFORMANCE_CONFIG.slowRequestThreshold) {
        console.warn(`Slow request: ${method} ${route} - ${duration}ms`);
      }

      // Call original send
      return originalSend.call(this, data);
    }.bind(this);

    next();
  }

  // Get performance alerts
  getAlerts(severity = null) {
    const alerts = this.metrics.alerts;
    
    if (severity) {
      return alerts.filter(alert => alert.severity === severity);
    }
    
    return alerts;
  }

  // Get performance trends
  getTrends(timeRange = '1h') {
    const now = new Date();
    let startTime;

    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
    }

    const responseTimeHistory = this.metrics.requests.responseTimeHistory.filter(
      entry => entry.timestamp >= startTime
    );

    const systemHistory = this.metrics.system.loadAverage.filter(
      entry => entry.timestamp >= startTime
    );

    return {
      responseTime: responseTimeHistory,
      system: systemHistory,
      timeRange
    };
  }

  // Get performance recommendations
  getRecommendations() {
    const recommendations = [];
    const summary = this.getSummary();

    // Memory recommendations
    if (summary.system.memoryUsage > 0.8) {
      recommendations.push({
        type: 'memory',
        priority: 'high',
        message: 'High memory usage detected. Consider optimizing memory usage or scaling resources.',
        action: 'Review memory-intensive operations and implement memory optimization.'
      });
    }

    // CPU recommendations
    if (summary.system.cpuUsage > 0.8) {
      recommendations.push({
        type: 'cpu',
        priority: 'high',
        message: 'High CPU usage detected. Consider optimizing CPU-intensive operations.',
        action: 'Profile CPU usage and optimize bottlenecks.'
      });
    }

    // Response time recommendations
    if (summary.requests.averageResponseTime > 1000) {
      recommendations.push({
        type: 'response_time',
        priority: 'medium',
        message: 'High average response time detected.',
        action: 'Optimize slow queries and implement caching where appropriate.'
      });
    }

    // Error rate recommendations
    if (summary.requests.errorRate > 0.05) {
      recommendations.push({
        type: 'error_rate',
        priority: 'high',
        message: 'High error rate detected.',
        action: 'Review recent errors and implement better error handling.'
      });
    }

    // Cache recommendations
    if (summary.cache.hitRate < 0.5 && summary.cache.hits + summary.cache.misses > 100) {
      recommendations.push({
        type: 'cache',
        priority: 'low',
        message: 'Low cache hit rate detected.',
        action: 'Review caching strategy and optimize cache keys.'
      });
    }

    return recommendations;
  }

  // Export performance data
  exportData(format = 'json') {
    const data = {
      metrics: this.getMetrics(),
      summary: this.getSummary(),
      trends: this.getTrends('24h'),
      alerts: this.getAlerts(),
      recommendations: this.getRecommendations(),
      exportedAt: new Date()
    };

    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'csv':
        return this.convertToCSV(data);
      default:
        return data;
    }
  }

  // Convert data to CSV
  convertToCSV(data) {
    // Simple CSV conversion for response time history
    const headers = 'timestamp,duration,statuscode,route,method\n';
    const rows = data.trends.responseTime.map(entry => 
      `${entry.timestamp},${entry.duration},${entry.statusCode},${entry.route},${entry.method}`
    ).join('\n');
    
    return headers + rows;
  }
}

// Global performance monitoring service instance
const performanceService = new PerformanceMonitoringService();

// Performance monitoring middleware
export const performanceMiddleware = (req, res, next) => {
  performanceService.recordRequest(req, res, next);
};

// Get performance monitoring service
export const getPerformanceService = () => performanceService;

// Start performance monitoring
export const startPerformanceMonitoring = () => {
  performanceService.start();
};

// Stop performance monitoring
export const stopPerformanceMonitoring = () => {
  performanceService.stop();
};

// Export performance service for advanced usage
export { performanceService };
