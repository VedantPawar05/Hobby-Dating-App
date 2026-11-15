import api from './api.js';

export const chatService = {
  /**
   * Retrieves all conversations for the authenticated user with unread counts.
   */
  async getConversations(params = {}) {
    return api.get('/conversations', { params });
  },

  /**
   * Retrieves details for a specific conversation by ID.
   */
  async getConversation(conversationId) {
    return api.get(`/conversations/${conversationId}`);
  },

  /**
   * Initiates or retrieves an existing conversation for a mutual match.
   */
  async createOrGetConversation(matchId) {
    return api.post('/conversations', { matchId });
  },

  /**
   * Retrieves paginated messages for a conversation.
   */
  async getMessages(conversationId, params = {}) {
    return api.get(`/conversations/${conversationId}/messages`, { params });
  },

  /**
   * Sends a message within a conversation.
   */
  async sendMessage(conversationId, content) {
    return api.post(`/conversations/${conversationId}/messages`, { content });
  },

  /**
   * Marks unread messages in the conversation as read.
   */
  async markAsRead(conversationId) {
    return api.patch(`/conversations/${conversationId}/read`);
  },
};

export default chatService;
