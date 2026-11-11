import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Sends HTTP-only cookies across requests
});

// Request interceptor to attach JWT token if present in localStorage
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to format errors and handle authorization expiration
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorResponse = error.response?.data || {
      success: false,
      message: error.message || 'An unexpected network error occurred.',
    };

    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Clear client storage if unauthorized
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }

    return Promise.reject(errorResponse);
  }
);

export default api;
