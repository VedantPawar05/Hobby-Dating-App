import mongoose from 'mongoose';
import {
  ALLOWED_MODERATION_ACTIONS,
  ALLOWED_MODERATION_TARGET_TYPES,
} from '../constants/admin.constants.js';

const moderationLogSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Admin ID is required'],
      index: true,
    },
    actionType: {
      type: String,
      required: [true, 'Moderation action type is required'],
      enum: {
        values: ALLOWED_MODERATION_ACTIONS,
        message: '{VALUE} is not a valid moderation action type',
      },
      index: true,
    },
    targetType: {
      type: String,
      required: [true, 'Target type is required'],
      enum: {
        values: ALLOWED_MODERATION_TARGET_TYPES,
        message: '{VALUE} is not a valid moderation target type',
      },
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Target ID is required'],
      index: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters'],
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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

moderationLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

export const ModerationLog = mongoose.model('ModerationLog', moderationLogSchema);
export default ModerationLog;

