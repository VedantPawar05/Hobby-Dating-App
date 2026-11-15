import api from './api.js';

export const organizerApplicationService = {
  async submitApplication(payload) {
    return api.post('/organizer-applications', payload);
  },

  async getMyApplications(params = {}) {
    return api.get('/organizer-applications/me', { params });
  },
};

export default organizerApplicationService;

