import api from './api.js';

export const reportService = {
  async submitReport({ targetType, targetId, reason, details = '' }) {
    return api.post('/reports', {
      targetType,
      targetId,
      reason,
      details,
    });
  },

  async getMyReports(params = {}) {
    return api.get('/reports/my-reports', { params });
  },
};

export default reportService;
