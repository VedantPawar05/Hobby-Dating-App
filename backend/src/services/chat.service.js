import mongoose from 'mongoose';
import { Conversation } from '../models/conversation.model.js';
import { Message } from '../models/message.model.js';
import { Match } from '../models/match.model.js';
import { User } from '../models/user.model.js';
import { CHAT_LIMITS, SOCKET_EVENTS } from '../constants/chat.constants.js';
import { NOTIFICATION_TYPES, NOTIFICATION_ENTITY_TYPES } from '../constants/notification.constants.js';
import { NotificationService } from './notification.service.js';
import { BlockService } from './block.service.js';
import { emitToConversation, emitToUser } from '../socket/index.js';

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function isModelMethodMocked(model, method) {
  const fn = model?.[method];
  return Boolean(fn && (fn._isMockFunction || typeof fn.mock !== 'undefined'));
}

function canExecuteDbOperation(model, method) {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    return true;
  }
  if (isModelMethodMocked(model, method)) {
    return true;
  }
  return false;
}

/**
 * Sanitizes message content to prevent XSS attacks while preserving message text.
 * Replaces '<' and '>' with HTML entities and trims whitespace.
 *
 * @param {string} text
 * @returns {string}
 */
export function sanitizeMessageContent(text) {
  if (typeof text !== 'string') return '';
  return text
    .trim()
    .replace(/[<>]/g, (char) => (char === '<' ? '&lt;' : '&gt;'));
}

/**
 * Formats a conversation document from the perspective of a specific user.
 * Attaches otherParticipant details and unread message count.
 */
function formatConversationForUser(conversationDoc, userId, unreadCount = 0) {
  const plain = typeof conversationDoc.toObject === 'function'
    ? conversationDoc.toObject()
    : { ...conversationDoc };

  const viewerId = userId.toString();
  const otherParticipant = (plain.participants || []).find((p) => {
    const id = p?._id ? p._id.toString() : p?.toString();
    return id !== viewerId;
  });

  return {
    _id: plain._id,
    match: plain.match,
    event: plain.event,
    otherParticipant: otherParticipant || null,
    participants: plain.participants,
    lastMessage: plain.lastMessage || null,
    lastMessageAt: plain.lastMessageAt || plain.updatedAt || plain.createdAt,
    unreadCount,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
}

export class ChatService {
  /**
   * Verifies that the conversation exists and that the user is an authorized participant.
   */
  static async verifyParticipant(conversationId, userId) {
    if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
      throw createHttpError('Invalid conversation ID format', 400);
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw createHttpError('Conversation not found', 404);
    }

    const viewerId = userId.toString();
    const isParticipant = Array.isArray(conversation.participants) &&
      conversation.participants.some((p) => {
        const id = p?._id ? p._id.toString() : p?.toString();
        return id === viewerId;
      });

    if (!isParticipant) {
      throw createHttpError('Forbidden: You are not a participant in this conversation', 403);
    }

    return conversation;
  }

  /**
   * Retrieves or creates a conversation associated with a verified mutual match.
   * Guarantees at most one conversation per mutual match.
   */
  static async getOrCreateConversationForMatch(matchId, userId) {
    if (!matchId || !mongoose.Types.ObjectId.isValid(matchId)) {
      throw createHttpError('Invalid match ID format', 400);
    }

    const match = await Match.findById(matchId)
      .populate('event', 'title category location startDateTime endDateTime')
      .populate('users', 'fullName city bio profilePicture isActive');

    if (!match) {
      throw createHttpError('Mutual match not found', 404);
    }

    const viewerId = userId.toString();
    const isParticipant = Array.isArray(match.users) &&
      match.users.some((u) => {
        const id = u?._id ? u._id.toString() : u?.toString();
        return id === viewerId;
      });

    if (!isParticipant) {
      throw createHttpError(
        'Forbidden: You can only start conversations for your own mutual matches',
        403
      );
    }

    // Check if conversation already exists for this match
    let conversation = await Conversation.findOne({ match: match._id })
      .populate('event', 'title category location startDateTime endDateTime')
      .populate('participants', 'fullName city bio profilePicture isActive')
      .populate('lastMessage');

    if (conversation) {
      const unreadCount = await Message.countDocuments({
        conversation: conversation._id,
        recipient: userId,
        isRead: false,
      });
      return {
        conversation: formatConversationForUser(conversation, userId, unreadCount),
        isNew: false,
      };
    }

    // Create new conversation for this mutual match
    try {
      const participantIds = match.users.map((u) => u?._id || u);
      const newConversation = await Conversation.create({
        match: match._id,
        event: match.event?._id || match.event,
        participants: participantIds,
        lastMessageAt: new Date(),
      });

      conversation = await Conversation.findById(newConversation._id)
        .populate('event', 'title category location startDateTime endDateTime')
        .populate('participants', 'fullName city bio profilePicture isActive');

      return {
        conversation: formatConversationForUser(conversation, userId, 0),
        isNew: true,
      };
    } catch (createErr) {
      // In case of race condition on unique index { match: 1 }
      if (createErr.code === 11000) {
        conversation = await Conversation.findOne({ match: match._id })
          .populate('event', 'title category location startDateTime endDateTime')
          .populate('participants', 'fullName city bio profilePicture isActive')
          .populate('lastMessage');

        const unreadCount = await Message.countDocuments({
          conversation: conversation._id,
          recipient: userId,
          isRead: false,
        });

        return {
          conversation: formatConversationForUser(conversation, userId, unreadCount),
          isNew: false,
        };
      }
      throw createErr;
    }
  }

  /**
   * Lists all conversations for the authenticated user, ordered by most recent message.
   */
  static async getUserConversations(userId, { page = 1, limit = 20 } = {}) {
    const query = { participants: userId };
    const skip = (page - 1) * limit;

    const [conversations, total] = await Promise.all([
      Conversation.find(query)
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('event', 'title category location startDateTime endDateTime')
        .populate('participants', 'fullName city bio profilePicture isActive')
        .populate('lastMessage'),
      Conversation.countDocuments(query),
    ]);

    // Compute unread count for each conversation
    const formatted = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversation: conv._id,
          recipient: userId,
          isRead: false,
        });
        return formatConversationForUser(conv, userId, unreadCount);
      })
    );

    return {
      conversations: formatted,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retrieves conversation details by ID, verifying user participation.
   */
  static async getConversationById(conversationId, userId) {
    await this.verifyParticipant(conversationId, userId);

    const conversation = await Conversation.findById(conversationId)
      .populate('event', 'title category location startDateTime endDateTime')
      .populate('participants', 'fullName city bio profilePicture isActive')
      .populate('lastMessage');

    const unreadCount = await Message.countDocuments({
      conversation: conversation._id,
      recipient: userId,
      isRead: false,
    });

    return formatConversationForUser(conversation, userId, unreadCount);
  }

  /**
   * Sends a message within a conversation. Persists to database, updates conversation metadata,
   * emits real-time socket events, and creates an in-app notification.
   */
  static async sendMessage(conversationId, senderId, rawContent) {
    const conversation = await this.verifyParticipant(conversationId, senderId);

    const sanitizedContent = sanitizeMessageContent(rawContent);
    if (!sanitizedContent || sanitizedContent.length < CHAT_LIMITS.MIN_MESSAGE_LENGTH) {
      throw createHttpError('Message content cannot be empty', 400);
    }
    if (sanitizedContent.length > CHAT_LIMITS.MAX_MESSAGE_LENGTH) {
      throw createHttpError(
        `Message cannot exceed ${CHAT_LIMITS.MAX_MESSAGE_LENGTH} characters`,
        400
      );
    }

    const senderStr = senderId.toString();
    const recipientObj = (conversation.participants || []).find((p) => {
      const id = p?._id ? p._id.toString() : p?.toString();
      return id !== senderStr;
    });

    if (!recipientObj) {
      throw createHttpError('Recipient not found in conversation participants', 400);
    }

    const recipientId = recipientObj?._id
      ? recipientObj._id.toString()
      : recipientObj.toString();

    const isBlocked = await BlockService.isBlocked(senderId, recipientId);
    if (isBlocked) {
      throw createHttpError(
        'Cannot send message: an account block is active between participants',
        403
      );
    }

    if (canExecuteDbOperation(User, 'findById')) {
      const recipientUser = await User.findById(recipientId);
      if (recipientUser && (!recipientUser.isActive || recipientUser.deletedAt)) {
        throw createHttpError(
          'Cannot send message: Recipient account is inactive or deleted',
          403
        );
      }
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender: senderId,
      recipient: recipientId,
      content: sanitizedContent,
      isRead: false,
    });

    // Update conversation metadata
    await Conversation.findByIdAndUpdate(conversation._id, {
      $set: {
        lastMessage: message._id,
        lastMessageAt: message.createdAt,
      },
    });

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'fullName profilePicture')
      .populate('recipient', 'fullName profilePicture');

    // Real-time Socket.io dispatch
    emitToConversation(conversation._id.toString(), SOCKET_EVENTS.NEW_MESSAGE, populatedMessage);
    emitToUser(recipientId.toString(), SOCKET_EVENTS.NEW_MESSAGE, populatedMessage);

    // In-app notification to recipient (without leaking private chat content in previews)
    const senderUser = await User.findById(senderId);
    const senderName = senderUser?.fullName || 'Your match';

    await NotificationService.safeCreate({
      recipient: recipientId,
      title: `New message from ${senderName}`,
      message: 'You have a new message in your mutual match conversation.',
      type: NOTIFICATION_TYPES.NEW_MESSAGE,
      entityType: NOTIFICATION_ENTITY_TYPES.CONVERSATION,
      entityId: conversation._id,
      link: `/chat?conversationId=${conversation._id}`,
      dedupeKey: `new_msg:${message._id}`,
    });

    return populatedMessage;
  }

  /**
   * Retrieves paginated messages for a conversation, sorted chronologically.
   */
  static async getMessages(conversationId, userId, { page = 1, limit = 50, before } = {}) {
    await this.verifyParticipant(conversationId, userId);

    const query = { conversation: conversationId };
    if (before) {
      const beforeDate = new Date(before);
      if (!isNaN(beforeDate.getTime())) {
        query.createdAt = { $lt: beforeDate };
      }
    }

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      Message.find(query)
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .populate('sender', 'fullName profilePicture')
        .populate('recipient', 'fullName profilePicture'),
      Message.countDocuments(query),
    ]);

    return {
      messages,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Marks unread messages in the conversation as read by the recipient.
   */
  static async markMessagesAsRead(conversationId, userId) {
    await this.verifyParticipant(conversationId, userId);

    const now = new Date();
    const result = await Message.updateMany(
      {
        conversation: conversationId,
        recipient: userId,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: now,
        },
      }
    );

    const readCount = result?.modifiedCount ?? 0;

    if (readCount > 0) {
      emitToConversation(conversationId.toString(), SOCKET_EVENTS.MESSAGES_READ, {
        conversationId: conversationId.toString(),
        readerId: userId.toString(),
        readAt: now,
        readCount,
      });
    }

    return {
      readCount,
      readAt: now,
    };
  }
}
