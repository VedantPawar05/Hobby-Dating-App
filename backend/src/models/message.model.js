import mongoose from 'mongoose';
import { CHAT_LIMITS } from '../constants/chat.constants.js';

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Conversation ID is required'],
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender ID is required'],
      index: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient ID is required'],
      index: true,
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
      minlength: [CHAT_LIMITS.MIN_MESSAGE_LENGTH, 'Message cannot be empty'],
      maxlength: [CHAT_LIMITS.MAX_MESSAGE_LENGTH, `Message cannot exceed ${CHAT_LIMITS.MAX_MESSAGE_LENGTH} characters`],
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
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

messageSchema.index({ conversation: 1, createdAt: 1 });
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ conversation: 1, recipient: 1, isRead: 1 });

export const Message = mongoose.model('Message', messageSchema);
export default Message;
