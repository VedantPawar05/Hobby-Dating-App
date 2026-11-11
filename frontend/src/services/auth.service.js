import api from './api.js';

export const authService = {
  /**
   * Registers a new user.
   */
  async register(userData) {
    return api.post('/auth/register', userData);
  },

  /**
   * Authenticates user with email and password.
   */
  async login(credentials) {
    return api.post('/auth/login', credentials);
  },

  /**
   * Logs out user by clearing server cookies.
   */
  async logout() {
    return api.post('/auth/logout');
  },

  /**
   * Fetches the current authenticated user's details.
   */
  async getCurrentUser() {
    return api.get('/auth/me');
  },
};

export default authService;
