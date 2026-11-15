import api from './api.js';

export const notificationService = {
  /**
   * Fetches paginated notifications for current authenticated user.
   */
  async getNotifications(params = {}) {
    return api.get('/notifications', { params });
  },

  /**
   * Retrieves the unread notification count.
   */
  async getUnreadCount() {
    return api.get('/notifications/unread-count');
  },

  /**
   * Marks a specific notification as read.
   */
  async markAsRead(notificationId) {
    return api.patch(`/notifications/${notificationId}/read`);
  },

  /**
   * Marks all unread notifications as read.
   */
  async markAllAsRead() {
    return api.patch('/notifications/read-all');
  },

  /**
   * Deletes a notification by ID.
   */
  async deleteNotification(notificationId) {
    return api.delete(`/notifications/${notificationId}`);
  },
};

export default notificationService;

