import mongoose from 'mongoose';
import {
  EVENT_CATEGORIES,
  EVENT_STATUSES,
  ALLOWED_EVENT_STATUSES,
} from '../constants/event.constants.js';

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    description: {
      type: String,
      required: [true, 'Event description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Event category is required'],
      enum: {
        values: EVENT_CATEGORIES,
        message: '{VALUE} is not an allowed event category',
      },
      index: true,
    },
    activityType: {
      type: String,
      trim: true,
      default: '',
    },
    coverImage: {
      type: String,
      default: null,
      trim: true,
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Organizer ID is required'],
      index: true,
    },
    location: {
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true,
        index: true,
      },
      address: {
        type: String,
        required: [true, 'Address is required'],
        trim: true,
      },
      latitude: {
        type: Number,
        default: null,
      },
      longitude: {
        type: Number,
        default: null,
      },
    },
    startDateTime: {
      type: Date,
      required: [true, 'Start date and time is required'],
      index: true,
    },
    endDateTime: {
      type: Date,
      required: [true, 'End date and time is required'],
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: 'Capacity must be a positive integer',
      },
    },
    bookedCount: {
      type: Number,
      default: 0,
      min: [0, 'Booked count cannot be negative'],
    },
    price: {
      type: Number,
      default: 0,
      min: [0, 'Price cannot be negative'],
    },
    status: {
      type: String,
      enum: {
        values: ALLOWED_EVENT_STATUSES,
        message: '{VALUE} is not a valid event status',
      },
      default: EVENT_STATUSES.DRAFT,
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

// Compound index for high performance event discovery
eventSchema.index({ status: 1, city: 1, category: 1, startDateTime: 1 });
eventSchema.index({ organizer: 1, status: 1 });

/**
 * Pre-validation hook to ensure end time is strictly after start time.
 */
eventSchema.pre('validate', function (next) {
  if (this.startDateTime && this.endDateTime) {
    if (new Date(this.endDateTime) <= new Date(this.startDateTime)) {
      this.invalidate('endDateTime', 'End date and time must be after start date and time');
    }
  }
  next();
});

export const Event = mongoose.model('Event', eventSchema);
export default Event;

