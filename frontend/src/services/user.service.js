import api from './api.js';

export const userService = {
  /**
   * Retrieves the authenticated user's profile.
   */
  async getProfile() {
    return api.get('/users/profile');
  },

  /**
   * Updates permitted profile fields for the authenticated user.
   */
  async updateProfile(profileData) {
    return api.patch('/users/profile', profileData);
  },
};

export default userService;
