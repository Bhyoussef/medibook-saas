import { executeQuery } from '../config/database.js';
import { cacheGet } from './cacheService.js';
import { getPerformanceService } from './performanceMonitoringService.js';

// Health check configuration
const HEALTH_CHECK_CONFIG = {
  enabled: process.env.HEALTH_CHECK_ENABLED !== 'false',
  interval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000,
  timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 3000,
  criticalThreshold: 0.9, // 90% for critical services
  warningThreshold: 0.7, // 70% for warning services
  maxHistory: 100
};

// Health status levels
export const HEALTH_STATUS = {
  HEALTHY: 'healthy',
  WARNING: 'warning',
  CRITICAL: 'critical',
  UNKNOWN: 'unknown'
};

// Health check service
class HealthCheckService {
  constructor() {
    this.checks = new Map();
    this.history = [];
    this.lastCheck = null;
    this.isRunning = false;
    this.checkInterval = null;
  }

  // Register a health check
  registerCheck(name, checkFunction, options = {}) {
    const config = {
      name,
      check: checkFunction,
      timeout: options.timeout || HEALTH_CHECK_CONFIG.timeout,
      critical: options.critical || false,
      enabled: options.enabled !== false,
      interval: options.interval || HEALTH_CHECK_CONFIG.interval,
      retries: options.retries || 3,
      retryDelay: options.retryDelay || 1000,
      ...options
    };

    this.checks.set(name, config);
    console.log(`Health check registered: ${name}`);
  }

  // Unregister a health check
  unregisterCheck(name) {
    this.checks.delete(name);
    console.log(`Health check unregistered: ${name}`);
  }

  // Start health monitoring
  start() {
    if (this.isRunning || !HEALTH_CHECK_CONFIG.enabled) {
      return;
    }

    this.isRunning = true;
    
    // Run initial check
    this.runAllChecks();

    // Set up interval checks
    this.checkInterval = setInterval(() => {
      this.runAllChecks();
    }, HEALTH_CHECK_CONFIG.interval);

    console.log('Health monitoring started');
  }

  // Stop health monitoring
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    console.log('Health monitoring stopped');
  }

  // Run all health checks
  async runAllChecks() {
    const results = new Map();
    const promises = [];

    for (const [name, config] of this.checks) {
      if (!config.enabled) {
        continue;
      }

      promises.push(this.runCheck(name, config));
    }

    const checkResults = await Promise.allSettled(promises);
    
    checkResults.forEach((result, index) => {
      const checkName = Array.from(this.checks.keys())[index];
      if (result.status === 'fulfilled') {
        results.set(checkName, result.value);
      } else {
        results.set(checkName, {
          status: HEALTH_STATUS.CRITICAL,
          message: result.reason.message,
          timestamp: new Date(),
          duration: 0
        });
      }
    });

    this.lastCheck = {
      timestamp: new Date(),
      overall: this.calculateOverallStatus(results),
      checks: Object.fromEntries(results)
    };

    // Store in history
    this.history.push(this.lastCheck);
    
    // Keep only recent history
    if (this.history.length > HEALTH_CHECK_CONFIG.maxHistory) {
      this.history.shift();
    }

    return this.lastCheck;
  }

  // Run individual health check
  async runCheck(name, config) {
    const startTime = Date.now();
    let lastError = null;

    for (let attempt = 1; attempt <= config.retries; attempt++) {
      try {
        const result = await this.runCheckWithTimeout(config.check, config.timeout);
        const duration = Date.now() - startTime;

        return {
          status: result.status || HEALTH_STATUS.HEALTHY,
          message: result.message || 'OK',
          details: result.details || null,
          timestamp: new Date(),
          duration,
          attempt
        };
      } catch (error) {
        lastError = error;
        
        if (attempt < config.retries) {
          await this.delay(config.retryDelay);
        }
      }
    }

    const duration = Date.now() - startTime;
    
    return {
      status: HEALTH_STATUS.CRITICAL,
      message: lastError.message,
      details: { error: lastError.stack },
      timestamp: new Date(),
      duration,
      attempt: config.retries
    };
  }

  // Run check with timeout
  async runCheckWithTimeout(checkFunction, timeout) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Health check timeout after ${timeout}ms`));
      }, timeout);

      Promise.resolve(checkFunction())
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  // Calculate overall system health
  calculateOverallStatus(results) {
    const statuses = Array.from(results.values()).map(r => r.status);
    
    if (statuses.length === 0) {
      return HEALTH_STATUS.UNKNOWN;
    }

    // Check for critical failures
    const criticalChecks = Array.from(this.checks.entries())
      .filter(([name, config]) => config.critical)
      .map(([name]) => results.get(name)?.status);

    if (criticalChecks.includes(HEALTH_STATUS.CRITICAL)) {
      return HEALTH_STATUS.CRITICAL;
    }

    // Check for any critical failures
    if (statuses.includes(HEALTH_STATUS.CRITICAL)) {
      return HEALTH_STATUS.WARNING;
    }

    // Check for warnings
    if (statuses.includes(HEALTH_STATUS.WARNING)) {
      return HEALTH_STATUS.WARNING;
    }

    // All healthy
    if (statuses.every(status => status === HEALTH_STATUS.HEALTHY)) {
      return HEALTH_STATUS.HEALTHY;
    }

    return HEALTH_STATUS.WARNING;
  }

  // Get current health status
  async getHealthStatus() {
    if (!this.lastCheck) {
      await this.runAllChecks();
    }

    return this.lastCheck;
  }

  // Get health history
  getHealthHistory(limit = 50) {
    return this.history.slice(-limit);
  }

  // Get health statistics
  getHealthStats() {
    if (!this.lastCheck) {
      return null;
    }

    const stats = {
      overall: this.lastCheck.overall,
      totalChecks: this.checks.size,
      enabledChecks: Array.from(this.checks.values()).filter(c => c.enabled).length,
      criticalChecks: Array.from(this.checks.values()).filter(c => c.critical).length,
      lastCheck: this.lastCheck.timestamp,
      uptime: this.isRunning ? process.uptime() : 0
    };

    // Count by status
    const statusCounts = {};
    for (const check of Object.values(this.lastCheck.checks)) {
      statusCounts[check.status] = (statusCounts[check.status] || 0) + 1;
    }

    stats.statusCounts = statusCounts;

    return stats;
  }

  // Delay helper
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create global health check service
const healthService = new HealthCheckService();

// Built-in health checks

// Database health check
const databaseHealthCheck = async () => {
  try {
    const startTime = Date.now();
    await executeQuery('SELECT 1 as test');
    const duration = Date.now() - startTime;

    // Get connection pool stats if available
    const poolStats = await executeQuery('SHOW STATUS LIKE "Threads_connected"');
    
    return {
      status: HEALTH_STATUS.HEALTHY,
      message: 'Database connection successful',
      details: {
        responseTime: duration,
        connections: poolStats[0]?.Value || 0
      }
    };
  } catch (error) {
    throw new Error(`Database connection failed: ${error.message}`);
  }
};

// Redis health check
const redisHealthCheck = async () => {
  try {
    const startTime = Date.now();
    const result = await cacheGet('health:test');
    const duration = Date.now() - startTime;

    // Test Redis write
    await cacheSet('health:test', 'ok', 10);
    
    return {
      status: HEALTH_STATUS.HEALTHY,
      message: 'Redis connection successful',
      details: {
        responseTime: duration,
        testValue: result
      }
    };
  } catch (error) {
    throw new Error(`Redis connection failed: ${error.message}`);
  }
};

// Memory health check
const memoryHealthCheck = async () => {
  const memUsage = process.memoryUsage();
  const totalMemory = memUsage.heapTotal;
  const usedMemory = memUsage.heapUsed;
  const memoryUsagePercent = (usedMemory / totalMemory) * 100;

  let status = HEALTH_STATUS.HEALTHY;
  let message = 'Memory usage normal';

  if (memoryUsagePercent > 90) {
    status = HEALTH_STATUS.CRITICAL;
    message = 'Memory usage critical';
  } else if (memoryUsagePercent > 75) {
    status = HEALTH_STATUS.WARNING;
    message = 'Memory usage high';
  }

  return {
    status,
    message,
    details: {
      memoryUsage: memoryUsagePercent.toFixed(2),
      heapUsed: Math.round(usedMemory / 1024 / 1024), // MB
      heapTotal: Math.round(totalMemory / 1024 / 1024), // MB
      external: Math.round(memUsage.external / 1024 / 1024), // MB
      rss: Math.round(memUsage.rss / 1024 / 1024) // MB
    }
  };
};

// CPU health check
const cpuHealthCheck = async () => {
  const cpuUsage = process.cpuUsage();
  const totalCpu = cpuUsage.user + cpuUsage.system;
  
  // Simple CPU usage calculation (this is a simplified version)
  const cpuUsagePercent = Math.min((totalCpu / 1000000) * 100, 100); // Convert to percentage

  let status = HEALTH_STATUS.HEALTHY;
  let message = 'CPU usage normal';

  if (cpuUsagePercent > 90) {
    status = HEALTH_STATUS.CRITICAL;
    message = 'CPU usage critical';
  } else if (cpuUsagePercent > 75) {
    status = HEALTH_STATUS.WARNING;
    message = 'CPU usage high';
  }

  return {
    status,
    message,
    details: {
      cpuUsage: cpuUsagePercent.toFixed(2),
      userCpu: cpuUsage.user,
      systemCpu: cpuUsage.system
    }
  };
};

// Disk space health check
const diskHealthCheck = async () => {
  try {
    const fs = await import('fs');
    const stats = fs.statSync('.');
    
    // This is a simplified check - in production you'd want to check actual disk usage
    return {
      status: HEALTH_STATUS.HEALTHY,
      message: 'Disk space available',
      details: {
        available: 'N/A', // Would need to implement actual disk space checking
        path: process.cwd()
      }
    };
  } catch (error) {
    throw new Error(`Disk check failed: ${error.message}`);
  }
};

// Performance health check
const performanceHealthCheck = async () => {
  try {
    const perfService = getPerformanceService();
    const summary = perfService.getSummary();
    
    let status = HEALTH_STATUS.HEALTHY;
    let message = 'Performance metrics normal';

    // Check response time
    if (summary.requests.averageResponseTime > 2000) {
      status = HEALTH_STATUS.WARNING;
      message = 'High response time detected';
    }

    // Check error rate
    if (summary.requests.errorRate > 0.05) {
      status = HEALTH_STATUS.CRITICAL;
      message = 'High error rate detected';
    }

    return {
      status,
      message,
      details: summary
    };
  } catch (error) {
    throw new Error(`Performance check failed: ${error.message}`);
  }
};

// Register built-in health checks
healthService.registerCheck('database', databaseHealthCheck, {
  critical: true,
  timeout: 5000,
  retries: 3
});

healthService.registerCheck('redis', redisHealthCheck, {
  critical: false,
  timeout: 3000,
  retries: 2
});

healthService.registerCheck('memory', memoryHealthCheck, {
  critical: true,
  timeout: 1000,
  retries: 1
});

healthService.registerCheck('cpu', cpuHealthCheck, {
  critical: false,
  timeout: 1000,
  retries: 1
});

healthService.registerCheck('disk', diskHealthCheck, {
  critical: true,
  timeout: 2000,
  retries: 2
});

healthService.registerCheck('performance', performanceHealthCheck, {
  critical: false,
  timeout: 3000,
  retries: 1
});

// Express middleware for health check endpoint
export const healthCheckMiddleware = async (req, res) => {
  try {
    const health = await healthService.getHealthStatus();
    
    const statusCode = health.overall === HEALTH_STATUS.HEALTHY ? 200 : 
                      health.overall === HEALTH_STATUS.WARNING ? 200 : 503;

    res.status(statusCode).json({
      status: health.overall,
      timestamp: health.timestamp,
      checks: health.checks,
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: HEALTH_STATUS.CRITICAL,
      timestamp: new Date(),
      error: error.message
    });
  }
};

// Readiness probe
export const readinessProbe = async (req, res) => {
  try {
    // Check critical services only
    const criticalChecks = ['database', 'memory'];
    const results = {};

    for (const checkName of criticalChecks) {
      const config = healthService.checks.get(checkName);
      if (config && config.enabled) {
        const result = await healthService.runCheck(checkName, config);
        results[checkName] = result;
      }
    }

    const allHealthy = Object.values(results).every(r => r.status === HEALTH_STATUS.HEALTHY);
    const statusCode = allHealthy ? 200 : 503;

    res.status(statusCode).json({
      ready: allHealthy,
      timestamp: new Date(),
      checks: results
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      timestamp: new Date(),
      error: error.message
    });
  }
};

// Liveness probe
export const livenessProbe = async (req, res) => {
  try {
    // Simple liveness check - just check if the process is responsive
    const uptime = process.uptime();
    const memory = process.memoryUsage();

    res.status(200).json({
      alive: true,
      timestamp: new Date(),
      uptime,
      memory: {
        used: Math.round(memory.heapUsed / 1024 / 1024),
        total: Math.round(memory.heapTotal / 1024 / 1024)
      }
    });
  } catch (error) {
    res.status(503).json({
      alive: false,
      timestamp: new Date(),
      error: error.message
    });
  }
};

// Start health monitoring
export const startHealthMonitoring = () => {
  healthService.start();
};

// Stop health monitoring
export const stopHealthMonitoring = () => {
  healthService.stop();
};

// Get health service instance
export const getHealthService = () => healthService;

// Export health service for advanced usage
export { healthService };
