import api from './api.js';

function cleanParams(params = {}) {
  const cleaned = {};
  Object.keys(params).forEach((key) => {
    if (params[key] !== '' && params[key] !== null && params[key] !== undefined) {
      cleaned[key] = params[key];
    }
  });
  return cleaned;
}

export const eventService = {
  /**
   * Retrieves public upcoming events with optional filters and pagination.
   */
  async getEvents(params = {}) {
    return api.get('/events', { params: cleanParams(params) });
  },

  /**
   * Retrieves detailed information for a specific event.
   */
  async getEventById(eventId) {
    return api.get(`/events/${eventId}`);
  },

  /**
   * Books a spot in an event for the authenticated user.
   */
  async bookEvent(eventId) {
    return api.post(`/bookings/${eventId}`);
  },

  /**
   * Cancels a previously confirmed event booking.
   */
  async cancelBooking(bookingId) {
    return api.delete(`/bookings/${bookingId}`);
  },

  /**
   * Retrieves user's booking history.
   */
  async getMyBookings(params = {}) {
    return api.get('/bookings/my-bookings', { params: cleanParams(params) });
  },

  /**
   * Generates QR check-in ticket data for a confirmed booking.
   */
  async getBookingTicket(bookingId) {
    return api.get(`/bookings/${bookingId}/ticket`);
  },

  /**
   * Organizer: Retrieves events created by the authenticated organizer along with stats.
   */
  async getOrganizerEvents(params = {}) {
    return api.get('/events/organizer/my-events', { params: cleanParams(params) });
  },

  /**
   * Organizer: Creates a new event.
   */
  async createEvent(eventData) {
    return api.post('/events', eventData);
  },

  /**
   * Organizer: Updates an existing event.
   */
  async updateEvent(eventId, eventData) {
    return api.patch(`/events/${eventId}`, eventData);
  },

  /**
   * Organizer: Deletes an event with zero bookings.
   */
  async deleteEvent(eventId) {
    return api.delete(`/events/${eventId}`);
  },

  /**
   * Organizer/Admin: Retrieves confirmed attendees and check-in status for an event.
   */
  async getEventAttendees(eventId, params = {}) {
    return api.get(`/events/${eventId}/attendees`, { params: cleanParams(params) });
  },

  /**
   * Organizer/Admin: Verifies a scanned QR payload or manual check-in code.
   */
  async checkInAttendee(eventId, payload) {
    return api.post(`/events/${eventId}/check-in`, payload);
  },
};

export default eventService;
