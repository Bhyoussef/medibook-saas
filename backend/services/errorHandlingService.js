import { executeQuery } from '../config/database.js';

// Error types and codes
export const ERROR_CODES = {
  // Validation errors (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_RANGE: 'INVALID_RANGE',
  
  // Authentication errors (401)
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  
  // Authorization errors (403)
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  ACCESS_DENIED: 'ACCESS_DENIED',
  
  // Not found errors (404)
  NOT_FOUND: 'NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  APPOINTMENT_NOT_FOUND: 'APPOINTMENT_NOT_FOUND',
  DOCTOR_NOT_FOUND: 'DOCTOR_NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  
  // Conflict errors (409)
  CONFLICT: 'CONFLICT',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  SLOT_CONFLICT: 'SLOT_CONFLICT',
  
  // Rate limiting errors (429)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  
  // Server errors (500)
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  
  // Service unavailable (503)
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  MAINTENANCE_MODE: 'MAINTENANCE_MODE'
};

// Error severity levels
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Custom error class
export class AppError extends Error {
  constructor(message, code = ERROR_CODES.INTERNAL_SERVER_ERROR, statusCode = 500, severity = ERROR_SEVERITY.MEDIUM, details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.severity = severity;
    this.details = details;
    this.timestamp = new Date();
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Validation error
export class ValidationError extends AppError {
  constructor(message, field = null, value = null) {
    super(message, ERROR_CODES.VALIDATION_ERROR, 400, ERROR_SEVERITY.LOW, { field, value });
    this.name = 'ValidationError';
  }
}

// Authentication error
export class AuthenticationError extends AppError {
  constructor(message, code = ERROR_CODES.UNAUTHORIZED) {
    super(message, code, 401, ERROR_SEVERITY.MEDIUM);
    this.name = 'AuthenticationError';
  }
}

// Authorization error
export class AuthorizationError extends AppError {
  constructor(message, resource = null, action = null) {
    super(message, ERROR_CODES.FORBIDDEN, 403, ERROR_SEVERITY.MEDIUM, { resource, action });
    this.name = 'AuthorizationError';
  }
}

// Not found error
export class NotFoundError extends AppError {
  constructor(resource, identifier = null) {
    const message = `${resource}${identifier ? ` with identifier ${identifier}` : ''} not found`;
    super(message, ERROR_CODES.NOT_FOUND, 404, ERROR_SEVERITY.LOW, { resource, identifier });
    this.name = 'NotFoundError';
  }
}

// Conflict error
export class ConflictError extends AppError {
  constructor(message, conflictingResource = null) {
    super(message, ERROR_CODES.CONFLICT, 409, ERROR_SEVERITY.MEDIUM, { conflictingResource });
    this.name = 'ConflictError';
  }
}

// Database error
export class DatabaseError extends AppError {
  constructor(message, query = null, params = null) {
    super(message, ERROR_CODES.DATABASE_ERROR, 500, ERROR_SEVERITY.HIGH, { query, params });
    this.name = 'DatabaseError';
  }
}

// External service error
export class ExternalServiceError extends AppError {
  constructor(message, service = null, response = null) {
    super(message, ERROR_CODES.EXTERNAL_SERVICE_ERROR, 502, ERROR_SEVERITY.MEDIUM, { service, response });
    this.name = 'ExternalServiceError';
  }
}

// Error handling service
class ErrorHandlingService {
  constructor() {
    this.errorStats = new Map();
    this.errorCallbacks = new Map();
    this.maxErrorHistory = 1000;
  }

  // Handle error and create appropriate response
  handleError(error, req = null) {
    let appError;

    if (error instanceof AppError) {
      appError = error;
    } else if (error.name === 'ValidationError') {
      appError = new ValidationError(error.message);
    } else if (error.name === 'JsonWebTokenError') {
      appError = new AuthenticationError('Invalid token', ERROR_CODES.INVALID_TOKEN);
    } else if (error.name === 'TokenExpiredError') {
      appError = new AuthenticationError('Token expired', ERROR_CODES.TOKEN_EXPIRED);
    } else if (error.code === 'ER_DUP_ENTRY') {
      appError = new ConflictError('Duplicate entry', error.message);
    } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      appError = new ValidationError('Referenced resource does not exist');
    } else {
      // Unknown error - wrap in AppError
      appError = new AppError(
        process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        500,
        ERROR_SEVERITY.HIGH,
        process.env.NODE_ENV === 'production' ? null : { stack: error.stack }
      );
    }

    // Log error
    this.logError(appError, req);

    // Update statistics
    this.updateErrorStats(appError);

    // Trigger callbacks
    this.triggerErrorCallbacks(appError, req);

    return appError;
  }

  // Log error to database
  async logError(error, req = null) {
    try {
      const query = `
        INSERT INTO error_logs (
          code, message, statusCode, severity, details, stackTrace,
          userId, ip, userAgent, url, method, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;

      const params = [
        error.code,
        error.message,
        error.statusCode,
        error.severity,
        error.details ? JSON.stringify(error.details) : null,
        error.stack,
        req?.user?.id || null,
        req?.ip || null,
        req?.headers['user-agent'] || null,
        req?.originalUrl || req?.url || null,
        req?.method || null
      ];

      await executeQuery(query, params);
    } catch (logError) {
      console.error('Failed to log error:', logError);
      // Don't throw error to avoid infinite loop
    }
  }

  // Update error statistics
  updateErrorStats(error) {
    const key = `${error.code}:${error.statusCode}`;
    const stats = this.errorStats.get(key) || {
      count: 0,
      firstOccurrence: new Date(),
      lastOccurrence: new Date(),
      severity: error.severity
    };

    stats.count++;
    stats.lastOccurrence = new Date();

    this.errorStats.set(key, stats);
  }

  // Trigger error callbacks
  triggerErrorCallbacks(error, req) {
    for (const [code, callback] of this.errorCallbacks) {
      if (error.code === code) {
        try {
          callback(error, req);
        } catch (callbackError) {
          console.error('Error callback failed:', callbackError);
        }
      }
    }

    // Trigger general error callbacks
    const generalCallbacks = this.errorCallbacks.get('*') || [];
    for (const callback of generalCallbacks) {
      try {
        callback(error, req);
      } catch (callbackError) {
        console.error('General error callback failed:', callbackError);
      }
    }
  }

  // Register error callback
  registerCallback(code, callback) {
    if (!this.errorCallbacks.has(code)) {
      this.errorCallbacks.set(code, []);
    }
    this.errorCallbacks.get(code).push(callback);
  }

  // Get error statistics
  getErrorStats() {
    return {
      totalErrors: Array.from(this.errorStats.values()).reduce((sum, stats) => sum + stats.count, 0),
      errorTypes: this.errorStats.size,
      errorsByCode: Object.fromEntries(this.errorStats)
    };
  }

  // Get recent errors
  async getRecentErrors(limit = 50, severity = null) {
    try {
      let query = `
        SELECT code, message, statusCode, severity, details, stackTrace,
               userId, ip, url, method, createdAt
        FROM error_logs
        WHERE 1=1
      `;
      
      const params = [];

      if (severity) {
        query += ' AND severity = ?';
        params.push(severity);
      }

      query += ' ORDER BY createdAt DESC LIMIT ?';
      params.push(limit);

      const errors = await executeQuery(query, params);

      return errors.map(error => ({
        ...error,
        details: error.details ? JSON.parse(error.details) : null
      }));
    } catch (error) {
      console.error('Failed to get recent errors:', error);
      return [];
    }
  }

  // Clear error statistics
  clearErrorStats() {
    this.errorStats.clear();
  }

  // Create error response
  createErrorResponse(error) {
    const response = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode
      }
    };

    // Add details in development or for low severity errors
    if (process.env.NODE_ENV === 'development' || error.severity === ERROR_SEVERITY.LOW) {
      response.error.details = error.details;
      response.error.timestamp = error.timestamp;
    }

    return response;
  }

  // Validate error input
  validateInput(value, rules, fieldName = 'field') {
    const errors = [];

    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${fieldName} is required`);
      return errors;
    }

    if (value === undefined || value === null || value === '') {
      return errors; // Skip other validations if field is optional and empty
    }

    // Type validation
    if (rules.type) {
      if (rules.type === 'string' && typeof value !== 'string') {
        errors.push(`${fieldName} must be a string`);
      } else if (rules.type === 'number' && isNaN(Number(value))) {
        errors.push(`${fieldName} must be a number`);
      } else if (rules.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors.push(`${fieldName} must be a valid email`);
      } else if (rules.type === 'phone' && !/^[\d\s\-\+\(\)]+$/.test(value)) {
        errors.push(`${fieldName} must be a valid phone number`);
      }
    }

    // Length validation
    if (rules.minLength && value.length < rules.minLength) {
      errors.push(`${fieldName} must be at least ${rules.minLength} characters`);
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push(`${fieldName} must be at most ${rules.maxLength} characters`);
    }

    // Range validation for numbers
    if (rules.min !== undefined && Number(value) < rules.min) {
      errors.push(`${fieldName} must be at least ${rules.min}`);
    }

    if (rules.max !== undefined && Number(value) > rules.max) {
      errors.push(`${fieldName} must be at most ${rules.max}`);
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push(`${fieldName} format is invalid`);
    }

    // Custom validation
    if (rules.validate && !rules.validate(value)) {
      errors.push(`${fieldName} is invalid`);
    }

    return errors;
  }

  // Validate request body
  validateRequestBody(body, schema) {
    const errors = {};

    for (const [field, rules] of Object.entries(schema)) {
      const fieldErrors = this.validateInput(body[field], rules, field);
      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors;
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  // Handle async errors
  async handleAsync(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  // Error recovery strategies
  async recoverFromError(error, context = {}) {
    const recoveryStrategies = {
      [ERROR_CODES.DATABASE_ERROR]: async () => {
        // Try to reconnect to database
        console.log('Attempting database reconnection...');
        // Implementation would go here
        return { recovered: false, message: 'Database reconnection failed' };
      },
      
      [ERROR_CODES.EXTERNAL_SERVICE_ERROR]: async () => {
        // Try fallback service
        console.log('Attempting fallback service...');
        // Implementation would go here
        return { recovered: false, message: 'Fallback service unavailable' };
      },
      
      [ERROR_CODES.RATE_LIMIT_EXCEEDED]: async () => {
        // Implement backoff strategy
        console.log('Implementing exponential backoff...');
        // Implementation would go here
        return { recovered: false, message: 'Rate limit exceeded' };
      }
    };

    const strategy = recoveryStrategies[error.code];
    if (strategy) {
      try {
        return await strategy();
      } catch (recoveryError) {
        console.error('Recovery strategy failed:', recoveryError);
      }
    }

    return { recovered: false, message: 'No recovery strategy available' };
  }
}

// Global error handling service instance
const errorService = new ErrorHandlingService();

// Error handling middleware
export const errorHandler = (error, req, res, next) => {
  const appError = errorService.handleError(error, req);
  const response = errorService.createErrorResponse(appError);

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = appError.stack;
  }

  res.status(appError.statusCode).json(response);
};

// 404 handler middleware
export const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError('Route', req.originalUrl);
  const response = errorService.createErrorResponse(error);
  res.status(404).json(response);
};

// Validation middleware
export const validateRequest = (schema) => {
  return (req, res, next) => {
    const validation = errorService.validateRequestBody(req.body, schema);
    
    if (!validation.isValid) {
      const error = new ValidationError('Validation failed');
      error.details = validation.errors;
      return next(error);
    }

    next();
  };
};

// Async error wrapper
export const asyncHandler = (fn) => {
  return errorService.handleAsync(fn);
};

// Get error service instance
export const getErrorService = () => errorService;

// Export error handling utilities
export {
  errorService
};
