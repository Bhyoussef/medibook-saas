// Input validation patterns
const PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\d\s\-\+\(\)]+$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  name: /^[a-zA-Z\s'-]{2,50}$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  numeric: /^[0-9]+$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
  time: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  html: /<[^>]*>/g,
  sql: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
  xss: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi
};

// Sanitization functions
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    return input;
  }

  return input
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/expression\s*\(/gi, '') // Remove CSS expressions
    .replace(/@import/gi, '') // Remove CSS imports
    .replace(/-->/g, '') // Remove HTML comments
    .replace(/<!--/g, '');
};

// Deep sanitize object
export const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeInput(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeObject(value);
  }

  return sanitized;
};

// Validate email
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  const sanitizedEmail = sanitizeInput(email);
  
  if (!PATTERNS.email.test(sanitizedEmail)) {
    return { valid: false, error: 'Invalid email format' };
  }

  if (sanitizedEmail.length > 254) {
    return { valid: false, error: 'Email is too long' };
  }

  return { valid: true, value: sanitizedEmail.toLowerCase() };
};

// Validate phone number
export const validatePhone = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'Phone number is required' };
  }

  const sanitizedPhone = sanitizeInput(phone);
  
  if (!PATTERNS.phone.test(sanitizedPhone)) {
    return { valid: false, error: 'Invalid phone number format' };
  }

  // Remove all non-digit characters for length check
  const digitsOnly = sanitizedPhone.replace(/\D/g, '');
  
  if (digitsOnly.length < 10) {
    return { valid: false, error: 'Phone number must have at least 10 digits' };
  }

  if (digitsOnly.length > 15) {
    return { valid: false, error: 'Phone number is too long' };
  }

  return { valid: true, value: sanitizedPhone };
};

// Validate password
export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }

  if (password.length > 128) {
    return { valid: false, error: 'Password is too long' };
  }

  if (!PATTERNS.password.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' };
  }

  // Check for common passwords
  const commonPasswords = ['password', '123456', 'qwerty', 'abc123', 'password123'];
  if (commonPasswords.includes(password.toLowerCase())) {
    return { valid: false, error: 'Password is too common' };
  }

  return { valid: true, value: password };
};

// Validate name
export const validateName = (name, fieldName = 'Name') => {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: `${fieldName} is required` };
  }

  const sanitizedName = sanitizeInput(name);
  
  if (!PATTERNS.name.test(sanitizedName)) {
    return { valid: false, error: `Invalid ${fieldName} format` };
  }

  if (sanitizedName.length < 2) {
    return { valid: false, error: `${fieldName} must be at least 2 characters long` };
  }

  if (sanitizedName.length > 50) {
    return { valid: false, error: `${fieldName} is too long` };
  }

  return { valid: true, value: sanitizedName };
};

// Validate date
export const validateDate = (date) => {
  if (!date || typeof date !== 'string') {
    return { valid: false, error: 'Date is required' };
  }

  const sanitizedDate = sanitizeInput(date);
  
  if (!PATTERNS.date.test(sanitizedDate)) {
    return { valid: false, error: 'Invalid date format. Use YYYY-MM-DD' };
  }

  const dateObj = new Date(sanitizedDate);
  
  if (isNaN(dateObj.getTime())) {
    return { valid: false, error: 'Invalid date' };
  }

  // Check if date is in the past (for future appointments)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (dateObj < today) {
    return { valid: false, error: 'Date cannot be in the past' };
  }

  // Check if date is too far in the future (more than 1 year)
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1);
  
  if (dateObj > maxDate) {
    return { valid: false, error: 'Date cannot be more than 1 year in the future' };
  }

  return { valid: true, value: sanitizedDate };
};

// Validate time
export const validateTime = (time) => {
  if (!time || typeof time !== 'string') {
    return { valid: false, error: 'Time is required' };
  }

  const sanitizedTime = sanitizeInput(time);
  
  if (!PATTERNS.time.test(sanitizedTime)) {
    return { valid: false, error: 'Invalid time format. Use HH:MM' };
  }

  const [hours, minutes] = sanitizedTime.split(':').map(Number);
  
  // Check business hours (9 AM - 5 PM)
  if (hours < 9 || hours > 17 || (hours === 17 && minutes > 0)) {
    return { valid: false, error: 'Time must be between 9:00 AM and 5:00 PM' };
  }

  return { valid: true, value: sanitizedTime };
};

// Validate text input
export const validateText = (text, options = {}) => {
  const {
    required = true,
    minLength = 1,
    maxLength = 1000,
    fieldName = 'Text',
    allowEmpty = false
  } = options;

  if (!text || typeof text !== 'string') {
    if (required) {
      return { valid: false, error: `${fieldName} is required` };
    }
    return { valid: true, value: '' };
  }

  const sanitizedText = sanitizeInput(text);
  
  if (!allowEmpty && sanitizedText.length === 0) {
    return { valid: false, error: `${fieldName} cannot be empty` };
  }

  if (sanitizedText.length < minLength) {
    return { valid: false, error: `${fieldName} must be at least ${minLength} characters long` };
  }

  if (sanitizedText.length > maxLength) {
    return { valid: false, error: `${fieldName} is too long` };
  }

  return { valid: true, value: sanitizedText };
};

// Validate numeric input
export const validateNumeric = (value, options = {}) => {
  const {
    required = true,
    min = 0,
    max = Number.MAX_SAFE_INTEGER,
    integer = true,
    fieldName = 'Number'
  } = options;

  if (value === null || value === undefined) {
    if (required) {
      return { valid: false, error: `${fieldName} is required` };
    }
    return { valid: true, value: null };
  }

  const numValue = Number(value);
  
  if (isNaN(numValue)) {
    return { valid: false, error: `${fieldName} must be a number` };
  }

  if (integer && !Number.isInteger(numValue)) {
    return { valid: false, error: `${fieldName} must be an integer` };
  }

  if (numValue < min) {
    return { valid: false, error: `${fieldName} must be at least ${min}` };
  }

  if (numValue > max) {
    return { valid: false, error: `${fieldName} must be at most ${max}` };
  }

  return { valid: true, value: numValue };
};

// Validate appointment data
export const validateAppointmentData = (data) => {
  const errors = {};
  const sanitized = {};

  // Validate doctorId
  const doctorIdValidation = validateNumeric(data.doctorId, {
    required: true,
    min: 1,
    fieldName: 'Doctor ID'
  });
  
  if (!doctorIdValidation.valid) {
    errors.doctorId = doctorIdValidation.error;
  } else {
    sanitized.doctorId = doctorIdValidation.value;
  }

  // Validate date
  const dateValidation = validateDate(data.date);
  if (!dateValidation.valid) {
    errors.date = dateValidation.error;
  } else {
    sanitized.date = dateValidation.value;
  }

  // Validate time
  const timeValidation = validateTime(data.time);
  if (!timeValidation.valid) {
    errors.time = timeValidation.error;
  } else {
    sanitized.time = timeValidation.value;
  }

  // Validate reason
  const reasonValidation = validateText(data.reason, {
    required: true,
    minLength: 5,
    maxLength: 500,
    fieldName: 'Reason'
  });
  
  if (!reasonValidation.valid) {
    errors.reason = reasonValidation.error;
  } else {
    sanitized.reason = reasonValidation.value;
  }

  // Validate notes (optional)
  if (data.notes) {
    const notesValidation = validateText(data.notes, {
      required: false,
      maxLength: 1000,
      fieldName: 'Notes'
    });
    
    if (!notesValidation.valid) {
      errors.notes = notesValidation.error;
    } else {
      sanitized.notes = notesValidation.value;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized
  };
};

// Validate user registration data
export const validateUserRegistration = (data) => {
  const errors = {};
  const sanitized = {};

  // Validate firstName
  const firstNameValidation = validateName(data.firstName, 'First name');
  if (!firstNameValidation.valid) {
    errors.firstName = firstNameValidation.error;
  } else {
    sanitized.firstName = firstNameValidation.value;
  }

  // Validate lastName
  const lastNameValidation = validateName(data.lastName, 'Last name');
  if (!lastNameValidation.valid) {
    errors.lastName = lastNameValidation.error;
  } else {
    sanitized.lastName = lastNameValidation.value;
  }

  // Validate email
  const emailValidation = validateEmail(data.email);
  if (!emailValidation.valid) {
    errors.email = emailValidation.error;
  } else {
    sanitized.email = emailValidation.value;
  }

  // Validate phone
  const phoneValidation = validatePhone(data.phone);
  if (!phoneValidation.valid) {
    errors.phone = phoneValidation.error;
  } else {
    sanitized.phone = phoneValidation.value;
  }

  // Validate password
  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.valid) {
    errors.password = passwordValidation.error;
  } else {
    sanitized.password = passwordValidation.value;
  }

  // Validate dateOfBirth
  if (data.dateOfBirth) {
    const dobValidation = validateDate(data.dateOfBirth);
    if (!dobValidation.valid) {
      errors.dateOfBirth = dobValidation.error;
    } else {
      // Check if user is at least 18 years old
      const dob = new Date(dobValidation.value);
      const minAge = new Date();
      minAge.setFullYear(minAge.getFullYear() - 18);
      
      if (dob > minAge) {
        errors.dateOfBirth = 'You must be at least 18 years old';
      } else {
        sanitized.dateOfBirth = dobValidation.value;
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized
  };
};

// Check for SQL injection attempts
export const detectSQLInjection = (input) => {
  if (typeof input !== 'string') {
    return false;
  }

  return PATTERNS.sql.test(input);
};

// Check for XSS attempts
export const detectXSS = (input) => {
  if (typeof input !== 'string') {
    return false;
  }

  return PATTERNS.xss.test(input);
};

// Comprehensive security validation
export const securityValidation = (data) => {
  const threats = [];

  const checkThreats = (obj, path = '') => {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (typeof value === 'string') {
        if (detectSQLInjection(value)) {
          threats.push({
            type: 'SQL_INJECTION',
            path: currentPath,
            value: value.substring(0, 100) // Limit value length in logs
          });
        }

        if (detectXSS(value)) {
          threats.push({
            type: 'XSS',
            path: currentPath,
            value: value.substring(0, 100)
          });
        }
      } else if (typeof value === 'object' && value !== null) {
        checkThreats(value, currentPath);
      }
    }
  };

  checkThreats(data);

  return {
    safe: threats.length === 0,
    threats
  };
};

// Validate pagination parameters
export const validatePagination = (query) => {
  const errors = {};
  const sanitized = {};

  // Validate page
  const pageValidation = validateNumeric(query.page, {
    required: false,
    min: 1,
    fieldName: 'Page'
  });
  
  if (!pageValidation.valid) {
    errors.page = pageValidation.error;
  } else {
    sanitized.page = pageValidation.value || 1;
  }

  // Validate limit
  const limitValidation = validateNumeric(query.limit, {
    required: false,
    min: 1,
    max: 100,
    fieldName: 'Limit'
  });
  
  if (!limitValidation.valid) {
    errors.limit = limitValidation.error;
  } else {
    sanitized.limit = limitValidation.value || 10;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized
  };
};

// Export patterns for external use
export { PATTERNS };
