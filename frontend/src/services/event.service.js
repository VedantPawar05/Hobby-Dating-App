import api from './api.js';

export const eventService = {
  /**
   * Retrieves public upcoming events with optional filters and pagination.
   */
  async getEvents(params = {}) {
    // Strip empty string filters
    const cleanParams = {};
    Object.keys(params).forEach((key) => {
      if (params[key] !== '' && params[key] !== null && params[key] !== undefined) {
        cleanParams[key] = params[key];
      }
    });

    return api.get('/events', { params: cleanParams });
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
    return api.get('/bookings/my-bookings', { params });
  },
};

export default eventService;
