import { BookingService } from '../services/booking.service.js';
import { ApiResponse } from '../utils/api-response.js';

export class BookingController {
  /**
   * Registers user for an event with atomic concurrency checks.
   */
  static async createBooking(req, res, next) {
    try {
      const booking = await BookingService.createBooking(
        req.user._id,
        req.params.eventId
      );

      return ApiResponse.success(res, {
        statusCode: 201,
        message: 'Event booked successfully',
        data: { booking },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancels a confirmed booking.
   */
  static async cancelBooking(req, res, next) {
    try {
      const booking = await BookingService.cancelBooking(
        req.user._id,
        req.params.bookingId
      );

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Booking cancelled successfully',
        data: { booking },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves user's booking history with pagination & optional status filter.
   */
  static async getMyBookings(req, res, next) {
    try {
      const result = await BookingService.getUserBookings(req.user._id, req.query);

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'User bookings retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generates and returns QR check-in ticket for a confirmed booking.
   */
  static async getTicket(req, res, next) {
    try {
      const ticket = await BookingService.getBookingTicket(
        req.user._id,
        req.params.bookingId
      );

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Booking QR ticket generated successfully',
        data: ticket,
      });
    } catch (error) {
      next(error);
    }
  }
}
