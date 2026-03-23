import { executeQuery } from '../config/database.js';

// Rate limiting configuration
const RATE_LIMITS = {
  // Global limits
  global: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per 15 minutes
    message: 'Too many requests from this IP, please try again later'
  },
  
  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later'
  },
  
  otp: {
    windowMs: 60 * 1000, // 1 minute
    max: 3, // 3 OTP requests per minute
    message: 'Too many OTP requests, please wait before trying again'
  },
  
  // API endpoints by role
  patient: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    message: 'Rate limit exceeded for patient account'
  },
  
  doctor: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 requests per 15 minutes
    message: 'Rate limit exceeded for doctor account'
  },
  
  admin: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // 500 requests per 15 minutes
    message: 'Rate limit exceeded for admin account'
  },
  
  // Specific endpoints
  appointment: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 appointment bookings per hour
    message: 'Too many appointment bookings, please try again later'
  },
  
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 uploads per hour
    message: 'Too many file uploads, please try again later'
  }
};

// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore = new Map();

// Generate rate limit key
const generateKey = (identifier, endpoint, windowMs) => {
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  return `${identifier}:${endpoint}:${windowStart}`;
};

// Check rate limit
export const checkRateLimit = async (identifier, endpoint, userRole = null) => {
  try {
    // Determine rate limit configuration
    let config;
    
    if (endpoint.includes('/auth/')) {
      config = RATE_LIMITS.auth;
    } else if (endpoint.includes('/otp')) {
      config = RATE_LIMITS.otp;
    } else if (endpoint.includes('/appointment')) {
      config = RATE_LIMITS.appointment;
    } else if (endpoint.includes('/upload')) {
      config = RATE_LIMITS.upload;
    } else if (userRole && RATE_LIMITS[userRole]) {
      config = RATE_LIMITS[userRole];
    } else {
      config = RATE_LIMITS.global;
    }
    
    const key = generateKey(identifier, endpoint, config.windowMs);
    const now = Date.now();
    
    // Get current rate limit data
    let rateLimitData = rateLimitStore.get(key);
    
    if (!rateLimitData) {
      rateLimitData = {
        count: 0,
        resetTime: now + config.windowMs,
        firstRequest: now
      };
    }
    
    // Check if window has expired
    if (now > rateLimitData.resetTime) {
      rateLimitData = {
        count: 0,
        resetTime: now + config.windowMs,
        firstRequest: now
      };
    }
    
    // Increment request count
    rateLimitData.count++;
    
    // Store updated data
    rateLimitStore.set(key, rateLimitData);
    
    // Log rate limit hit
    if (rateLimitData.count === 1) {
      await logRateLimitHit(identifier, endpoint, userRole, 'first_request');
    } else if (rateLimitData.count >= config.max) {
      await logRateLimitHit(identifier, endpoint, userRole, 'limit_exceeded');
    }
    
    // Check if limit exceeded
    if (rateLimitData.count > config.max) {
      return {
        allowed: false,
        limit: config.max,
        current: rateLimitData.count,
        resetTime: rateLimitData.resetTime,
        retryAfter: Math.ceil((rateLimitData.resetTime - now) / 1000),
        message: config.message
      };
    }
    
    return {
      allowed: true,
      limit: config.max,
      current: rateLimitData.count,
      resetTime: rateLimitData.resetTime,
      remaining: config.max - rateLimitData.count
    };
  } catch (error) {
    console.error('Check rate limit error:', error);
    // Allow request if rate limiting fails
    return {
      allowed: true,
      error: 'Rate limiting service unavailable'
    };
  }
};

// Rate limiting middleware factory
export const createRateLimitMiddleware = (endpointType) => {
  return async (req, res, next) => {
    try {
      // Get identifier (IP address and/or user ID)
      const identifier = req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
      const endpoint = `${req.method}:${req.route?.path || req.path}`;
      const userRole = req.user?.role;
      
      // Check rate limit
      const result = await checkRateLimit(identifier, endpoint, userRole);
      
      if (!result.allowed) {
        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': result.limit,
          'X-RateLimit-Remaining': 0,
          'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000),
          'Retry-After': result.retryAfter
        });
        
        return res.status(429).json({
          success: false,
          message: result.message,
          retryAfter: result.retryAfter
        });
      }
      
      // Set rate limit headers for allowed requests
      res.set({
        'X-RateLimit-Limit': result.limit,
        'X-RateLimit-Remaining': result.remaining,
        'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000)
      });
      
      next();
    } catch (error) {
      console.error('Rate limit middleware error:', error);
      next(); // Allow request if rate limiting fails
    }
  };
};

// Log rate limit hits
export const logRateLimitHit = async (identifier, endpoint, userRole, type) => {
  try {
    const query = `
      INSERT INTO rate_limit_logs (identifier, endpoint, userRole, type, createdAt)
      VALUES (?, ?, ?, ?, NOW())
    `;
    
    await executeQuery(query, [identifier, endpoint, userRole, type]);
  } catch (error) {
    console.error('Log rate limit hit error:', error);
    // Don't throw error to avoid breaking the main operation
  }
};

// Get rate limit statistics
export const getRateLimitStats = async (period = '24') => {
  try {
    const periodHours = parseInt(period);
    const query = `
      SELECT 
        endpoint,
        userRole,
        type,
        COUNT(*) as hits,
        COUNT(DISTINCT identifier) as uniqueIdentifiers,
        MAX(createdAt) as lastHit
      FROM rate_limit_logs 
      WHERE createdAt >= DATE_SUB(NOW(), INTERVAL ? HOUR)
      GROUP BY endpoint, userRole, type
      ORDER BY hits DESC
    `;
    
    const stats = await executeQuery(query, [periodHours]);
    
    return {
      period: `${periodHours} hours`,
      stats
    };
  } catch (error) {
    console.error('Get rate limit stats error:', error);
    throw error;
  }
};

// Reset rate limit for specific identifier
export const resetRateLimit = (identifier, endpoint) => {
  try {
    // Find and remove all keys for this identifier and endpoint
    for (const [key, data] of rateLimitStore.entries()) {
      if (key.startsWith(`${identifier}:${endpoint}`)) {
        rateLimitStore.delete(key);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Reset rate limit error:', error);
    return false;
  }
};

// Get current rate limit status
export const getRateLimitStatus = (identifier, endpoint, userRole = null) => {
  try {
    // Determine configuration
    let config;
    
    if (endpoint.includes('/auth/')) {
      config = RATE_LIMITS.auth;
    } else if (endpoint.includes('/otp')) {
      config = RATE_LIMITS.otp;
    } else if (userRole && RATE_LIMITS[userRole]) {
      config = RATE_LIMITS[userRole];
    } else {
      config = RATE_LIMITS.global;
    }
    
    const key = generateKey(identifier, endpoint, config.windowMs);
    const rateLimitData = rateLimitStore.get(key);
    
    if (!rateLimitData) {
      return {
        limit: config.max,
        current: 0,
        remaining: config.max,
        resetTime: Date.now() + config.windowMs,
        allowed: true
      };
    }
    
    const now = Date.now();
    
    // Check if window has expired
    if (now > rateLimitData.resetTime) {
      return {
        limit: config.max,
        current: 0,
        remaining: config.max,
        resetTime: now + config.windowMs,
        allowed: true
      };
    }
    
    return {
      limit: config.max,
      current: rateLimitData.count,
      remaining: Math.max(0, config.max - rateLimitData.count),
      resetTime: rateLimitData.resetTime,
      allowed: rateLimitData.count <= config.max
    };
  } catch (error) {
    console.error('Get rate limit status error:', error);
    return null;
  }
};

// Clean up expired rate limit entries
export const cleanupRateLimitStore = () => {
  try {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, data] of rateLimitStore.entries()) {
      if (now > data.resetTime) {
        rateLimitStore.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired rate limit entries`);
    }
    
    return cleanedCount;
  } catch (error) {
    console.error('Cleanup rate limit store error:', error);
    return 0;
  }
};

// Get rate limit configuration
export const getRateLimitConfig = (type) => {
  return RATE_LIMITS[type] || RATE_LIMITS.global;
};

// Update rate limit configuration
export const updateRateLimitConfig = (type, newConfig) => {
  try {
    if (RATE_LIMITS[type]) {
      RATE_LIMITS[type] = { ...RATE_LIMITS[type], ...newConfig };
      return true;
    }
    return false;
  } catch (error) {
    console.error('Update rate limit config error:', error);
    return false;
  }
};

// Block identifier temporarily
export const blockIdentifier = (identifier, duration = 15 * 60 * 1000) => {
  try {
    const blockKey = `blocked:${identifier}`;
    const blockData = {
      blocked: true,
      blockedAt: Date.now(),
      expiresAt: Date.now() + duration
    };
    
    rateLimitStore.set(blockKey, blockData);
    
    // Auto-unblock after duration
    setTimeout(() => {
      rateLimitStore.delete(blockKey);
    }, duration);
    
    return true;
  } catch (error) {
    console.error('Block identifier error:', error);
    return false;
  }
};

// Check if identifier is blocked
export const isIdentifierBlocked = (identifier) => {
  try {
    const blockKey = `blocked:${identifier}`;
    const blockData = rateLimitStore.get(blockKey);
    
    if (!blockData) {
      return false;
    }
    
    const now = Date.now();
    
    // Check if block has expired
    if (now > blockData.expiresAt) {
      rateLimitStore.delete(blockKey);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Check identifier blocked error:', error);
    return false;
  }
};

// Schedule cleanup
setInterval(cleanupRateLimitStore, 5 * 60 * 1000); // Cleanup every 5 minutes
