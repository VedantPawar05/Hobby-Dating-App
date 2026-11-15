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

  /**
   * Calculates profile completion status and missing fields.
   */
  async getProfileCompletion() {
    return api.get('/users/profile/completion');
  },

  /**
   * Retrieves public profile for a user with privacy rules and blocking enforced.
   */
  async getPublicProfile(userId) {
    return api.get(`/users/${userId}/public`);
  },

  /**
   * Lists blocked users for the authenticated caller.
   */
  async getBlockedUsers(params = {}) {
    return api.get('/users/blocked', { params });
  },

  /**
   * Blocks another user.
   */
  async blockUser(targetUserId, reason = '') {
    return api.post('/users/block', { targetUserId, reason });
  },

  /**
   * Unblocks a previously blocked user.
   */
  async unblockUser(targetUserId) {
    return api.delete(`/users/block/${targetUserId}`);
  },

  /**
   * Deactivates the authenticated user's account.
   */
  async deactivateAccount(password, reason = '') {
    return api.post('/users/deactivate', { password, reason });
  },

  /**
   * Permanently deletes and anonymizes the authenticated user's account.
   */
  async deleteAccount(password, confirmation, reason = '') {
    return api.post('/users/delete-account', { password, confirmation, reason });
  },
};

export default userService;
