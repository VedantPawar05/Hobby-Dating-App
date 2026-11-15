import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event ID is required'],
      index: true,
    },
    userA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'First participant ID is required'],
      index: true,
    },
    userB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Second participant ID is required'],
      index: true,
    },
    users: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
      ],
      validate: {
        validator(val) {
          return Array.isArray(val) && val.length === 2 && val[0].toString() !== val[1].toString();
        },
        message: 'A match must belong to exactly two distinct users',
      },
      index: true,
    },
    matchedAt: {
      type: Date,
      default: Date.now,
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

// Guarantee at most one mutual match per (event, user pair) regardless of tag order
matchSchema.index({ event: 1, userA: 1, userB: 1 }, { unique: true });
matchSchema.index({ users: 1, matchedAt: -1 });

export const Match = mongoose.model('Match', matchSchema);
export default Match;

