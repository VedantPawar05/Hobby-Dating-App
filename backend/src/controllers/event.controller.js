import { EventService } from '../services/event.service.js';
import { ApiResponse } from '../utils/api-response.js';

export class EventController {
  /**
   * Creates a new event.
   */
  static async createEvent(req, res, next) {
    try {
      const event = await EventService.createEvent(req.user._id, req.body);

      return ApiResponse.success(res, {
        statusCode: 201,
        message: 'Event created successfully',
        data: { event },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves events created by the authenticated organizer.
   */
  static async getOrganizerEvents(req, res, next) {
    try {
      const result = await EventService.getOrganizerEvents(req.user._id, req.query);

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Organizer events retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Public discovery endpoint for published upcoming events with filtering & pagination.
   */
  static async discoverEvents(req, res, next) {
    try {
      const result = await EventService.discoverEvents(req.query);

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Events retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves single event details.
   */
  static async getEventById(req, res, next) {
    try {
      const event = await EventService.getEventById(req.params.eventId, req.user || null);

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Event details retrieved successfully',
        data: { event },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates an existing event.
   */
  static async updateEvent(req, res, next) {
    try {
      const event = await EventService.updateEvent(req.params.eventId, req.user, req.body);

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Event updated successfully',
        data: { event },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deletes an event (only if no active bookings exist).
   */
  static async deleteEvent(req, res, next) {
    try {
      const result = await EventService.deleteEvent(req.params.eventId, req.user);

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Event deleted successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves attendee list for an event (organizer/admin only).
   */
  static async getAttendees(req, res, next) {
    try {
      const result = await EventService.getEventAttendees(
        req.params.eventId,
        req.user,
        req.query
      );

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Event attendees retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verifies a QR code or manual check-in code and marks attendee as checked in.
   */
  static async checkInAttendee(req, res, next) {
    try {
      const booking = await EventService.checkInAttendee(
        req.params.eventId,
        req.user,
        req.body
      );

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Attendee checked in successfully',
        data: { booking },
      });
    } catch (error) {
      next(error);
    }
  }
}
