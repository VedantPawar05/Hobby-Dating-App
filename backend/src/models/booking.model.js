import mongoose from 'mongoose';
import crypto from 'crypto';
import {
  BOOKING_STATUSES,
  ALLOWED_BOOKING_STATUSES,
} from '../constants/booking.constants.js';

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event ID is required'],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ALLOWED_BOOKING_STATUSES,
        message: '{VALUE} is not a valid booking status',
      },
      default: BOOKING_STATUSES.CONFIRMED,
      index: true,
    },
    bookedAt: {
      type: Date,
      default: Date.now,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    checkedIn: {
      type: Boolean,
      default: false,
      index: true,
    },
    checkedInAt: {
      type: Date,
      default: null,
    },
    checkInCode: {
      type: String,
      default: () => crypto.randomBytes(8).toString('hex').toUpperCase(),
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound unique index to prevent duplicate bookings for the same user and event
bookingSchema.index({ user: 1, event: 1 }, { unique: true });

// Compound index for attendee queries & check-in lookups
bookingSchema.index({ event: 1, status: 1, checkedIn: 1 });

export const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
