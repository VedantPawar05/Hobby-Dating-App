import { ChatService } from '../services/chat.service.js';
import { ApiResponse } from '../utils/api-response.js';

export class ChatController {
  /**
   * POST /api/conversations
   * Retrieves or initiates a conversation for a valid mutual match.
   */
  static async createConversation(req, res, next) {
    try {
      const { matchId } = req.body;
      const { conversation, isNew } = await ChatService.getOrCreateConversationForMatch(
        matchId,
        req.user._id
      );

      return ApiResponse.success(res, {
        statusCode: isNew ? 201 : 200,
        message: isNew
          ? 'Conversation created successfully'
          : 'Existing conversation retrieved',
        data: { conversation },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/conversations
   * Lists all conversations for the authenticated user with unread counts.
   */
  static async getUserConversations(req, res, next) {
    try {
      const { page, limit } = req.query;
      const result = await ChatService.getUserConversations(req.user._id, {
        page: Number(page) || 1,
        limit: Number(limit) || 20,
      });

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Conversations retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/conversations/:id
   * Retrieves conversation details for an authorized participant.
   */
  static async getConversation(req, res, next) {
    try {
      const conversation = await ChatService.getConversationById(
        req.params.id,
        req.user._id
      );

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Conversation details retrieved successfully',
        data: { conversation },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/conversations/:id/messages
   * Lists paginated messages for a conversation.
   */
  static async getMessages(req, res, next) {
    try {
      const { page, limit, before } = req.query;
      const result = await ChatService.getMessages(req.params.id, req.user._id, {
        page: Number(page) || 1,
        limit: Number(limit) || 50,
        before,
      });

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Messages retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/conversations/:id/messages
   * Sends a message within a conversation.
   */
  static async sendMessage(req, res, next) {
    try {
      const { content } = req.body;
      const message = await ChatService.sendMessage(
        req.params.id,
        req.user._id,
        content
      );

      return ApiResponse.success(res, {
        statusCode: 201,
        message: 'Message sent successfully',
        data: { message },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/conversations/:id/read
   * Marks unread messages in the conversation as read.
   */
  static async markAsRead(req, res, next) {
    try {
      const result = await ChatService.markMessagesAsRead(
        req.params.id,
        req.user._id
      );

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Messages marked as read',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
