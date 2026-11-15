/**
 * Chat and real-time messaging constants.
 */

export const CHAT_LIMITS = {
  MIN_MESSAGE_LENGTH: 1,
  MAX_MESSAGE_LENGTH: 2000,
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
};

export const SOCKET_EVENTS = {
  // Connection / Lifecycle
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',

  // Room management
  JOIN_CONVERSATION: 'join_conversation',
  LEAVE_CONVERSATION: 'leave_conversation',
  CONVERSATION_JOINED: 'conversation_joined',

  // Messages
  SEND_MESSAGE: 'send_message',
  NEW_MESSAGE: 'new_message',

  // Read status
  MARK_READ: 'mark_read',
  MESSAGES_READ: 'messages_read',

  // Ephemeral typing status
  TYPING: 'typing',
  STOP_TYPING: 'stop_typing',
  USER_TYPING: 'user_typing',
  USER_STOP_TYPING: 'user_stop_typing',
};
