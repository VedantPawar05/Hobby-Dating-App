import { Router } from 'express';
import { BookingController } from '../controllers/booking.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { bookingRateLimiter } from '../middlewares/rate-limit.middleware.js';
import {
  validateQuery,
  validateObjectId,
} from '../middlewares/validate.middleware.js';
import { bookingQuerySchema } from '../validators/booking.validator.js';

const router = Router();

// User: Get personal booking history
router.get(
  '/my-bookings',
  authenticate,
  validateQuery(bookingQuerySchema),
  BookingController.getMyBookings
);

// User: Get QR check-in ticket for a confirmed booking
router.get(
  '/:bookingId/ticket',
  authenticate,
  validateObjectId('bookingId'),
  BookingController.getTicket
);

// User: Book an event
router.post(
  '/:eventId',
  authenticate,
  bookingRateLimiter,
  validateObjectId('eventId'),
  BookingController.createBooking
);

// User: Cancel a booking
router.delete(
  '/:bookingId',
  authenticate,
  validateObjectId('bookingId'),
  BookingController.cancelBooking
);

export default router;
