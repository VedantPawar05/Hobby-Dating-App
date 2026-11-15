import mongoose from 'mongoose';
import {
  ORGANIZER_APPLICATION_STATUSES,
  ALLOWED_ORGANIZER_APPLICATION_STATUSES,
} from '../constants/organizer-application.constants.js';

const organizerApplicationSchema = new mongoose.Schema(
  {
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Applicant user ID is required'],
    },
    organizationName: {
      type: String,
      required: [true, 'Organization or club name is required'],
      trim: true,
      minlength: [2, 'Organization name must be at least 2 characters'],
      maxlength: [120, 'Organization name cannot exceed 120 characters'],
    },
    hostingCity: {
      type: String,
      required: [true, 'Primary hosting city is required'],
      trim: true,
      minlength: [2, 'Hosting city must be at least 2 characters'],
      maxlength: [100, 'Hosting city cannot exceed 100 characters'],
    },
    hobbyCategories: {
      type: [String],
      default: [],
    },
    experience: {
      type: String,
      required: [true, 'Hosting or community experience is required'],
      trim: true,
      minlength: [20, 'Experience description must be at least 20 characters'],
      maxlength: [1500, 'Experience description cannot exceed 1500 characters'],
    },
    reason: {
      type: String,
      required: [true, 'Reason for applying is required'],
      trim: true,
      minlength: [20, 'Reason must be at least 20 characters'],
      maxlength: [1500, 'Reason cannot exceed 1500 characters'],
    },
    contactEmail: {
      type: String,
      required: [true, 'Contact email is required'],
      trim: true,
      lowercase: true,
    },
    contactPhone: {
      type: String,
      required: [true, 'Contact phone number is required'],
      trim: true,
      minlength: [7, 'Contact phone must be at least 7 characters'],
      maxlength: [30, 'Contact phone cannot exceed 30 characters'],
    },
    websiteOrSocial: {
      type: String,
      trim: true,
      maxlength: [300, 'Website or social URL cannot exceed 300 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: ALLOWED_ORGANIZER_APPLICATION_STATUSES,
        message: '{VALUE} is not a valid application status',
      },
      default: ORGANIZER_APPLICATION_STATUSES.PENDING,
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
    decisionNote: {
      type: String,
      trim: true,
      maxlength: [500, 'Decision note cannot exceed 500 characters'],
      default: '',
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
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

organizerApplicationSchema.index({ applicant: 1, createdAt: -1 });
organizerApplicationSchema.index(
  { applicant: 1 },
  {
    name: 'uniq_pending_applicant',
    unique: true,
    partialFilterExpression: { status: ORGANIZER_APPLICATION_STATUSES.PENDING },
  }
);

export const OrganizerApplication = mongoose.model(
  'OrganizerApplication',
  organizerApplicationSchema
);

export default OrganizerApplication;

