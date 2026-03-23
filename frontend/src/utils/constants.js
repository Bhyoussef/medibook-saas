// Application constants
export const APP_CONFIG = {
  NAME: 'MediBook',
  VERSION: '1.0.0',
  DESCRIPTION: 'Healthcare Management System',
  SUPPORT_EMAIL: 'support@medibook.com',
  SUPPORT_PHONE: '+1-800-MEDIBOOK',
};

// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

// Route paths
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  DOCTORS: '/doctors',
  APPOINTMENTS: '/appointments',
  PROFILE: '/profile',
  BOOKING: '/booking',
  DOCTOR_DASHBOARD: '/doctor-dashboard',
  ADMIN_PANEL: '/admin',
  NOT_FOUND: '*',
};

// User roles
export const USER_ROLES = {
  PATIENT: 'patient',
  DOCTOR: 'doctor',
  ADMIN: 'admin',
};

// Appointment status
export const APPOINTMENT_STATUS = {
  SCHEDULED: 'scheduled',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no-show',
};

// Payment status
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  REFUNDED: 'refunded',
};

// Notification types
export const NOTIFICATION_TYPES = {
  APPOINTMENT: 'appointment',
  REMINDER: 'reminder',
  CANCELLATION: 'cancellation',
  RESCHEDULE: 'reschedule',
  PAYMENT: 'payment',
  SYSTEM: 'system',
  PROMOTION: 'promotion',
  FEEDBACK: 'feedback',
};

// Priority levels
export const PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

// Time constants
export const TIME_CONSTANTS = {
  BUSINESS_HOURS: {
    START: '09:00',
    END: '17:00',
  },
  APPOINTMENT_DURATION: 30, // minutes
  BOOKING_ADVANCE_DAYS: 30,
  CANCELLATION_DEADLINE_HOURS: 24,
};

// Validation patterns
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s\-\(\)]+$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  NAME: /^[a-zA-Z\s'-]{2,50}$/,
};

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your internet connection.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  SERVER_ERROR: 'Server error. Please try again later.',
  NOT_FOUND: 'The requested resource was not found.',
  FORBIDDEN: 'Access denied. You do not have permission to perform this action.',
  UNAUTHORIZED: 'You must be logged in to access this resource.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
};

// Success messages
export const SUCCESS_MESSAGES = {
  LOGIN: 'Login successful! Redirecting to dashboard...',
  REGISTER: 'Registration successful! Please check your email.',
  LOGOUT: 'You have been logged out successfully.',
  APPOINTMENT_BOOKED: 'Appointment booked successfully!',
  APPOINTMENT_CANCELLED: 'Appointment cancelled successfully.',
  PROFILE_UPDATED: 'Profile updated successfully!',
  PASSWORD_CHANGED: 'Password changed successfully!',
};

// Loading messages
export const LOADING_MESSAGES = {
  AUTHENTICATING: 'Authenticating...',
  LOADING: 'Loading...',
  SAVING: 'Saving...',
  DELETING: 'Deleting...',
  SEARCHING: 'Searching...',
  BOOKING: 'Booking appointment...',
  UPDATING: 'Updating...',
};

// Local storage keys
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  THEME: 'theme',
  LANGUAGE: 'language',
  NOTIFICATIONS: 'notifications_enabled',
  LAST_ACTIVE: 'last_active',
};

// Environment detection
export const isDevelopment = () => import.meta.env.DEV;
export const isProduction = () => import.meta.env.PROD;
export const isTest = () => import.meta.env.MODE === 'test';

// Feature flags
export const FEATURES = {
  NOTIFICATIONS: true,
  DARK_MODE: false,
  MULTI_LANGUAGE: false,
  ONLINE_PAYMENTS: false,
  VIDEO_CONSULTATION: false,
};

// Default values
export const DEFAULTS = {
  PAGINATION_SIZE: 10,
  DEBOUNCE_DELAY: 300,
  TOAST_DURATION: 5000,
  SESSION_TIMEOUT: 60 * 60 * 1000, // 1 hour
};
