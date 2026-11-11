import mongoose from 'mongoose';
import {
  ALLOWED_REPORT_STATUSES,
  ALLOWED_REPORT_TARGET_TYPES,
  REPORT_STATUSES,
} from '../constants/admin.constants.js';

const reportSchema = new mongoose.Schema(
  {
    targetType: {
      type: String,
      required: [true, 'Report target type is required'],
      enum: {
        values: ALLOWED_REPORT_TARGET_TYPES,
        message: '{VALUE} is not a valid report target type',
      },
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Target ID is required'],
      index: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reporter ID is required'],
      index: true,
    },
    reason: {
      type: String,
      required: [true, 'Report reason is required'],
      trim: true,
      minlength: [3, 'Reason must be at least 3 characters'],
      maxlength: [200, 'Reason cannot exceed 200 characters'],
    },
    details: {
      type: String,
      trim: true,
      maxlength: [1000, 'Details cannot exceed 1000 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: ALLOWED_REPORT_STATUSES,
        message: '{VALUE} is not a valid report status',
      },
      default: REPORT_STATUSES.OPEN,
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    resolutionNotes: {
      type: String,
      trim: true,
      maxlength: [500, 'Resolution notes cannot exceed 500 characters'],
      default: '',
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

reportSchema.index({ status: 1, targetType: 1, createdAt: -1 });

export const Report = mongoose.model('Report', reportSchema);
export default Report;

