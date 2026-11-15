import mongoose from 'mongoose';

const blockSchema = new mongoose.Schema(
  {
    blocker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Blocker user ID is required'],
      index: true,
    },
    blocked: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Blocked user ID is required'],
      index: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [200, 'Block reason cannot exceed 200 characters'],
      default: '',
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

// Prevent duplicate blocks between the same two users
blockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });
blockSchema.index({ blocker: 1, createdAt: -1 });

export const Block = mongoose.model('Block', blockSchema);
export default Block;
