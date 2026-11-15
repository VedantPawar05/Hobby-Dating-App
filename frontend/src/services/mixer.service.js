import api from './api.js';

export const mixerService = {
  /**
   * Checks attendee eligibility and 24-hour window timing for an event's mixer.
   */
  async getMixerAvailability(eventId) {
    return api.get(`/mixer/${eventId}/availability`);
  },

  /**
   * Retrieves eligible QR-verified attendees for an active mixer window.
   */
  async getMixerAttendees(eventId, params = {}) {
    return api.get(`/mixer/${eventId}`, { params });
  },

  /**
   * Sends a private one-way tag toward another verified attendee of the same event.
   */
  async tagAttendee(eventId, toUserId) {
    return api.post(`/mixer/${eventId}/tags`, { toUserId });
  },

  /**
   * Retrieves authenticated user's mutual matches (optionally filtered by eventId).
   */
  async getMyMatches(params = {}) {
    return api.get('/mixer/matches', { params });
  },

  /**
   * Retrieves details for a specific mutual match the user participates in.
   */
  async getMatchById(matchId) {
    return api.get(`/mixer/matches/${matchId}`);
  },
};

export default mixerService;

