import api from './api.js';

function cleanQuery(params = {}) {
  const cleaned = {};
  Object.keys(params).forEach((key) => {
    const val = params[key];
    if (val !== '' && val !== null && val !== undefined) {
      cleaned[key] = val;
    }
  });
  return cleaned;
}

export const adminService = {
  async getStats() {
    return api.get('/admin/stats');
  },

  async getUsers(params = {}) {
    return api.get('/admin/users', { params: cleanQuery(params) });
  },

  async getUserDetails(userId) {
    return api.get(`/admin/users/${userId}`);
  },

  async suspendUser(userId, reason) {
    return api.patch(`/admin/users/${userId}/suspend`, { reason });
  },

  async reactivateUser(userId, reason = '') {
    return api.patch(`/admin/users/${userId}/reactivate`, { reason });
  },

  async updateUserRole(userId, { role, reason = '' }) {
    return api.patch(`/admin/users/${userId}/role`, { role, reason });
  },

  async getOrganizers(params = {}) {
    return api.get('/admin/organizers', { params: cleanQuery(params) });
  },

  async getEvents(params = {}) {
    return api.get('/admin/events', { params: cleanQuery(params) });
  },

  async getEventDetails(eventId) {
    return api.get(`/admin/events/${eventId}`);
  },

  async approveEvent(eventId, reason = '') {
    return api.patch(`/admin/events/${eventId}/approve`, { reason });
  },

  async rejectEvent(eventId, reason) {
    return api.patch(`/admin/events/${eventId}/reject`, { reason });
  },

  async cancelEvent(eventId, reason) {
    return api.patch(`/admin/events/${eventId}/cancel`, { reason });
  },

  async getReports(params = {}) {
    return api.get('/admin/reports', { params: cleanQuery(params) });
  },

  async reviewReport(reportId, payload) {
    return api.patch(`/admin/reports/${reportId}/review`, payload);
  },

  async getModerationLogs(params = {}) {
    return api.get('/admin/moderation-logs', { params: cleanQuery(params) });
  },

  async getBookings(params = {}) {
    return api.get('/admin/bookings', { params: cleanQuery(params) });
  },

  async getBookingDetails(bookingId) {
    return api.get(`/admin/bookings/${bookingId}`);
  },

  async cancelBooking(bookingId, reason) {
    return api.patch(`/admin/bookings/${bookingId}/cancel`, { reason });
  },
};

export default adminService;
