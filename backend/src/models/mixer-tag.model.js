import mongoose from 'mongoose';

const mixerTagSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event ID is required'],
      index: true,
    },
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Source user ID is required'],
      index: true,
    },
    toUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Target user ID is required'],
      index: true,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Mixer expiry timestamp is required'],
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

// Prevent duplicate private tags from the same user to the same attendee in an event
mixerTagSchema.index({ event: 1, fromUser: 1, toUser: 1 }, { unique: true });

// Optimize querying private tags cast by a user within an event
mixerTagSchema.index({ event: 1, fromUser: 1, createdAt: -1 });

export const MixerTag = mongoose.model('MixerTag', mixerTagSchema);
export default MixerTag;

