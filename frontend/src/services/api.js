import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;

    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error);
      const networkError = new Error('Network error. Please check your internet connection.');
      networkError.code = 'NETWORK_ERROR';
      return Promise.reject(networkError);
    }

    // Handle timeout errors
    if (error.code === 'ECONNABORTED') {
      const timeoutError = new Error('Request timed out. Please try again.');
      timeoutError.code = 'TIMEOUT_ERROR';
      return Promise.reject(timeoutError);
    }

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401) {
      // Don't redirect for login/register endpoints
      const isAuthEndpoint = originalRequest.url?.includes('/auth/login') || 
                           originalRequest.url?.includes('/auth/register');
      
      if (!isAuthEndpoint) {
        // Clear invalid token
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Redirect to login with return URL
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/register') {
          window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
        }
      }
    }

    // Handle 403 Forbidden errors
    if (error.response?.status === 403) {
      const forbiddenError = new Error('Access denied. You do not have permission to perform this action.');
      forbiddenError.code = 'FORBIDDEN';
      forbiddenError.response = error.response;
      return Promise.reject(forbiddenError);
    }

    // Handle 404 Not Found errors
    if (error.response?.status === 404) {
      const notFoundError = new Error('The requested resource was not found.');
      notFoundError.code = 'NOT_FOUND';
      notFoundError.response = error.response;
      return Promise.reject(notFoundError);
    }

    // Handle 500 Server errors
    if (error.response?.status >= 500) {
      const serverError = new Error('Server error. Please try again later.');
      serverError.code = 'SERVER_ERROR';
      serverError.response = error.response;
      return Promise.reject(serverError);
    }

    // Handle other HTTP errors
    const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred.';
    const httpError = new Error(errorMessage);
    httpError.code = 'HTTP_ERROR';
    httpError.response = error.response;
    httpError.status = error.response?.status;
    
    return Promise.reject(httpError);
  }
);

// Enhanced API wrapper with error handling
const apiWrapper = {
  get: async (url, config = {}) => {
    try {
      const response = await api.get(url, config);
      return response;
    } catch (error) {
      console.error(`GET ${url} failed:`, error);
      throw error;
    }
  },
  
  post: async (url, data = {}, config = {}) => {
    try {
      const response = await api.post(url, data, config);
      return response;
    } catch (error) {
      console.error(`POST ${url} failed:`, error);
      throw error;
    }
  },
  
  put: async (url, data = {}, config = {}) => {
    try {
      const response = await api.put(url, data, config);
      return response;
    } catch (error) {
      console.error(`PUT ${url} failed:`, error);
      throw error;
    }
  },
  
  delete: async (url, config = {}) => {
    try {
      const response = await api.delete(url, config);
      return response;
    } catch (error) {
      console.error(`DELETE ${url} failed:`, error);
      throw error;
    }
  }
};

// Auth API
export const authAPI = {
  login: (credentials) => apiWrapper.post('/auth/login', credentials),
  register: (userData) => apiWrapper.post('/auth/register', userData),
  logout: () => apiWrapper.post('/auth/logout'),
  
  // OTP-based authentication
  sendOTP: (phone) => apiWrapper.post('/auth/send-otp', { phone }),
  verifyOTP: (phone, code) => apiWrapper.post('/auth/verify-otp', { phone, code }),
  completeProfile: (profileData) => apiWrapper.post('/auth/complete-profile', profileData),
};

// Doctors API
export const doctorsAPI = {
  getAll: (params) => apiWrapper.get('/doctors', { params }),
  getById: (id) => apiWrapper.get(`/doctors/${id}`),
  getBySpecialty: (specialty) => apiWrapper.get(`/doctors/specialty/${specialty}`),
  search: (query) => apiWrapper.get('/doctors/search', { params: { q: query } }),
  getSpecialties: () => apiWrapper.get('/doctors/specialties'),
  getTopRated: () => apiWrapper.get('/doctors/top-rated'),
  getAvailable: (date) => apiWrapper.get('/doctors/available', { params: { date } }),
  
  // Admin CRUD operations
  create: (doctorData) => apiWrapper.post('/doctors', doctorData),
  update: (id, data) => apiWrapper.put(`/doctors/${id}`, data),
  delete: (id) => apiWrapper.delete(`/doctors/${id}`),
  getStats: (id) => apiWrapper.get(`/doctors/${id}/stats`),
};

// Appointments API
export const appointmentAPI = {
  create: (appointmentData) => apiWrapper.post('/appointments', appointmentData),
  getAll: () => apiWrapper.get('/appointments'),
  getAllAdmin: () => apiWrapper.get('/appointments/admin/all'),
  getById: (id) => apiWrapper.get(`/appointments/${id}`),
  update: (id, data) => apiWrapper.put(`/appointments/${id}`, data),
  delete: (id) => apiWrapper.delete(`/appointments/${id}`),
  getUserAppointments: (userId) => apiWrapper.get(`/appointments/user/${userId}`),
  getDoctorAppointments: (doctorId) => apiWrapper.get(`/appointments/doctor/${doctorId}`),
  getAvailableTimeSlots: (doctorId, date) => 
    apiWrapper.get(`/appointments/available-slots/${doctorId}?date=${date}`),
};

// Time Slots API
export const timeSlotAPI = {
  getAvailableSlots: (doctorId, startDate, endDate) => 
    apiWrapper.get(`/time-slots/available/${doctorId}`, { params: { startDate, endDate } }),
  getDoctorSchedule: (doctorId, startDate, endDate) => 
    apiWrapper.get(`/time-slots/schedule/${doctorId}`, { params: { startDate, endDate } }),
  generateDailySlots: (doctorId, date) => 
    apiWrapper.post(`/time-slots/generate/${doctorId}`, { date }),
};

// Notifications API
export const notificationAPI = {
  getAll: (params) => apiWrapper.get('/notifications', { params }),
  markAsRead: (id) => apiWrapper.put(`/notifications/${id}/read`),
  markAllAsRead: () => apiWrapper.put('/notifications/read-all'),
  getUnreadCount: () => apiWrapper.get('/notifications/unread-count'),
  create: (notificationData) => apiWrapper.post('/notifications', notificationData),
  delete: (id) => apiWrapper.delete(`/notifications/${id}`),
  getStats: () => apiWrapper.get('/notifications/stats'),
};

// User API
export const userAPI = {
  getProfile: () => apiWrapper.get('/user/profile'),
  updateProfile: (data) => apiWrapper.put('/user/profile', data),
  updatePassword: (data) => apiWrapper.put('/user/password', data),
  getStats: () => apiWrapper.get('/user/stats'),
};

// Medical Records API
export const medicalRecordAPI = {
  getAll: () => apiWrapper.get('/medical-records'),
  getById: (id) => apiWrapper.get(`/medical-records/${id}`),
  create: (data) => apiWrapper.post('/medical-records', data),
  update: (id, data) => apiWrapper.put(`/medical-records/${id}`, data),
};

// Prescriptions API
export const prescriptionAPI = {
  getAll: () => apiWrapper.get('/prescriptions'),
  getById: (id) => apiWrapper.get(`/prescriptions/${id}`),
  create: (data) => apiWrapper.post('/prescriptions', data),
  update: (id, data) => apiWrapper.put(`/prescriptions/${id}`, data),
};

// Health check API
export const healthAPI = {
  check: () => apiWrapper.get('/health'),
};

export default api;
