import { verifyAccessToken, blacklistToken } from '../services/tokenService.js';
import { hasPermission, getUserRole } from '../services/rbacService.js';
import { checkRateLimit, isIdentifierBlocked } from '../services/rateLimitService.js';
import { sanitizeInput, validateInput } from '../services/validationService.js';

// Authentication middleware
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Verify token
    const decoded = verifyAccessToken(token);
    
    // Add user info to request
    req.user = decoded;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    let message = 'Authentication failed';
    if (error.message.includes('expired')) {
      message = 'Token expired';
    } else if (error.message.includes('revoked')) {
      message = 'Token revoked';
    }
    
    return res.status(401).json({
      success: false,
      message
    });
  }
};

// Role-based authorization middleware
export const requireRole = (roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userRole = req.user.role;
      
      // Check if user has required role
      if (Array.isArray(roles)) {
        if (!roles.includes(userRole)) {
          return res.status(403).json({
            success: false,
            message: 'Insufficient permissions'
          });
        }
      } else {
        if (userRole !== roles) {
          return res.status(403).json({
            success: false,
            message: 'Insufficient permissions'
          });
        }
      }

      next();
    } catch (error) {
      console.error('Role authorization error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authorization check failed'
      });
    }
  };
};

// Permission-based authorization middleware
export const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userRole = req.user.role;
      
      // Check if user has permission
      if (!hasPermission(userRole, permission)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      next();
    } catch (error) {
      console.error('Permission authorization error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authorization check failed'
      });
    }
  };
};

// Resource ownership middleware
export const requireOwnership = (resourceType, resourceIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const resourceId = req.params[resourceIdParam];
      const userId = req.user.id;
      const userRole = req.user.role;

      // Admin and super admin can access any resource
      if (userRole === 'admin' || userRole === 'super_admin') {
        return next();
      }

      // Check resource ownership
      const { canPerformAction } = await import('../services/rbacService.js');
      const result = await canPerformAction(userId, resourceType, resourceId, 'read');

      if (!result.allowed) {
        return res.status(403).json({
          success: false,
          message: result.reason || 'Access denied'
        });
      }

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Ownership check failed'
      });
    }
  };
};

// Rate limiting middleware
export const rateLimit = (endpointType) => {
  return async (req, res, next) => {
    try {
      // Check if identifier is blocked
      const identifier = req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
      
      if (isIdentifierBlocked(identifier)) {
        return res.status(429).json({
          success: false,
          message: 'Access temporarily blocked due to suspicious activity'
        });
      }

      // Check rate limit
      const { createRateLimitMiddleware } = await import('../services/rateLimitService.js');
      const middleware = createRateLimitMiddleware(endpointType);
      
      // Apply rate limiting
      await middleware(req, res, next);
    } catch (error) {
      console.error('Rate limiting error:', error);
      next(); // Allow request if rate limiting fails
    }
  };
};

// Input validation and sanitization middleware
export const validateInput = (schema) => {
  return (req, res, next) => {
    try {
      const errors = {};
      
      // Validate request body
      if (req.body && schema.body) {
        const bodyErrors = validateObject(req.body, schema.body);
        if (bodyErrors.length > 0) {
          errors.body = bodyErrors;
        }
        
        // Sanitize body
        req.body = sanitizeObject(req.body, schema.body);
      }
      
      // Validate query parameters
      if (req.query && schema.query) {
        const queryErrors = validateObject(req.query, schema.query);
        if (queryErrors.length > 0) {
          errors.query = queryErrors;
        }
        
        // Sanitize query
        req.query = sanitizeObject(req.query, schema.query);
      }
      
      // Validate path parameters
      if (req.params && schema.params) {
        const paramErrors = validateObject(req.params, schema.params);
        if (paramErrors.length > 0) {
          errors.params = paramErrors;
        }
        
        // Sanitize params
        req.params = sanitizeObject(req.params, schema.params);
      }

      if (Object.keys(errors).length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors
        });
      }

      next();
    } catch (error) {
      console.error('Input validation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Input validation failed'
      });
    }
  };
};

// Security headers middleware
export const securityHeaders = (req, res, next) => {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'");
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  next();
};

// CORS middleware
export const cors = (options = {}) => {
  const defaultOptions = {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400 // 24 hours
  };

  const corsOptions = { ...defaultOptions, ...options };

  return (req, res, next) => {
    const origin = req.headers.origin;
    
    // Check if origin is allowed
    if (corsOptions.origin.includes('*') || corsOptions.origin.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    
    res.setHeader('Access-Control-Allow-Methods', corsOptions.methods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(', '));
    res.setHeader('Access-Control-Allow-Credentials', corsOptions.credentials);
    res.setHeader('Access-Control-Max-Age', corsOptions.maxAge);
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    next();
  };
};

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${req.ip} - User: ${req.user?.id || 'anonymous'}`);
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    
    // Log security events
    if (res.statusCode >= 400) {
      logSecurityEvent(req, res, duration);
    }
    
    originalEnd.apply(this, args);
  };
  
  next();
};

// Audit logging middleware
export const auditLog = (action, resourceType) => {
  return async (req, res, next) => {
    // Store original res.json to intercept response
    const originalJson = res.json;
    
    res.json = function(data) {
      // Log audit event
      logAuditEvent(req, action, resourceType, data);
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// Log security events
const logSecurityEvent = async (req, res, duration) => {
  try {
    const { executeQuery } = await import('../config/database.js');
    
    const query = `
      INSERT INTO security_logs (userId, ip, method, path, statusCode, duration, userAgent, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    
    await executeQuery(query, [
      req.user?.id || null,
      req.ip,
      req.method,
      req.path,
      res.statusCode,
      duration,
      req.headers['user-agent'] || null
    ]);
  } catch (error) {
    console.error('Log security event error:', error);
  }
};

// Log audit events
const logAuditEvent = async (req, action, resourceType, responseData) => {
  try {
    const { executeQuery } = await import('../config/database.js');
    
    const resourceId = req.params.id || req.body.id || null;
    const success = responseData?.success !== false;
    
    const query = `
      INSERT INTO audit_logs (userId, action, resourceType, resourceId, ip, userAgent, success, details, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    
    await executeQuery(query, [
      req.user?.id || null,
      action,
      resourceType,
      resourceId,
      req.ip,
      req.headers['user-agent'] || null,
      success,
      JSON.stringify({ body: req.body, query: req.query, response: responseData })
    ]);
  } catch (error) {
    console.error('Log audit event error:', error);
  }
};

// Validate object against schema
const validateObject = (obj, schema) => {
  const errors = [];
  
  for (const [key, rules] of Object.entries(schema)) {
    const value = obj[key];
    
    // Check required fields
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${key} is required`);
      continue;
    }
    
    // Skip validation if field is not provided and not required
    if (value === undefined || value === null) {
      continue;
    }
    
    // Type validation
    if (rules.type && typeof value !== rules.type) {
      errors.push(`${key} must be of type ${rules.type}`);
    }
    
    // Length validation
    if (rules.minLength && value.length < rules.minLength) {
      errors.push(`${key} must be at least ${rules.minLength} characters`);
    }
    
    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push(`${key} must be at most ${rules.maxLength} characters`);
    }
    
    // Pattern validation
    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push(`${key} format is invalid`);
    }
    
    // Custom validation
    if (rules.validate && !rules.validate(value)) {
      errors.push(`${key} is invalid`);
    }
  }
  
  return errors;
};

// Sanitize object
const sanitizeObject = (obj, schema) => {
  const sanitized = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const rules = schema[key];
    
    if (!rules) {
      // If no schema rules, sanitize as string
      sanitized[key] = typeof value === 'string' ? sanitizeInput(value) : value;
      continue;
    }
    
    // Apply sanitization based on type
    if (rules.type === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (rules.type === 'number') {
      sanitized[key] = parseFloat(value);
    } else if (rules.type === 'boolean') {
      sanitized[key] = Boolean(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

// Session validation middleware
export const validateSession = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if user session is still valid
    const { getUserSessions } = await import('../services/tokenService.js');
    const sessions = await getUserSessions(req.user.id);
    
    if (sessions.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Session expired'
      });
    }

    next();
  } catch (error) {
    console.error('Session validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Session validation failed'
    });
  }
};

// IP whitelist middleware
export const ipWhitelist = (allowedIPs) => {
  return (req, res, next) => {
    const clientIP = req.ip;
    
    if (!allowedIPs.includes(clientIP)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied from this IP address'
      });
    }
    
    next();
  };
};
