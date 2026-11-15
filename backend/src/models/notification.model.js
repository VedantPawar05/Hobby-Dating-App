import mongoose from 'mongoose';
import {
  ALLOWED_NOTIFICATION_TYPES,
  ALLOWED_NOTIFICATION_ENTITY_TYPES,
} from '../constants/notification.constants.js';

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Notification recipient ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      minlength: [1, 'Title must not be empty'],
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
      minlength: [1, 'Message must not be empty'],
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    type: {
      type: String,
      required: [true, 'Notification type is required'],
      enum: {
        values: ALLOWED_NOTIFICATION_TYPES,
        message: '{VALUE} is not a valid notification type',
      },
      index: true,
    },
    entityType: {
      type: String,
      enum: {
        values: ALLOWED_NOTIFICATION_ENTITY_TYPES,
        message: '{VALUE} is not a valid entity type',
      },
      default: null,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    link: {
      type: String,
      trim: true,
      maxlength: [300, 'Link cannot exceed 300 characters'],
      default: '',
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    dedupeKey: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
    bufferTimeoutMS: 2000,
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

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index(
  { recipient: 1, dedupeKey: 1 },
  { unique: true, sparse: true }
);

export const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;

