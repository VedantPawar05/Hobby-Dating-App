import { Server } from 'socket.io';
import { verifyToken } from '../utils/token.js';
import { User } from '../models/user.model.js';
import { env } from '../config/env.js';
import { SOCKET_EVENTS } from '../constants/chat.constants.js';

let io = null;

/**
 * Initializes and configures the Socket.io server instance attached to the HTTP server.
 * @param {import('http').Server} httpServer
 */
export function initSocketServer(httpServer) {
  const allowedOrigins = env.CLIENT_URL
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  io = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        const normalizedOrigin = origin.replace(/\/+$/, '');
        if (allowedOrigins.includes('*') || allowedOrigins.includes(normalizedOrigin)) {
          return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const authHeader = socket.handshake.headers?.authorization;
      const bearerToken =
        authHeader && authHeader.startsWith('Bearer ')
          ? authHeader.split(' ')[1].trim()
          : null;

      const token =
        socket.handshake.auth?.token ||
        bearerToken ||
        socket.handshake.headers?.cookie
          ?.split(';')
          .find((c) => c.trim().startsWith('access_token='))
          ?.split('=')[1];

      if (!token) {
        return next(new Error('Authentication required. No token provided.'));
      }

      const decoded = verifyToken(token);
      if (!decoded || !decoded.id) {
        return next(new Error('Invalid authentication token.'));
      }

      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) {
        return next(new Error('User account not found or deactivated.'));
      }

      socket.user = user;
      next();
    } catch (error) {
      return next(new Error(`Authentication failed: ${error.message}`));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    registerSocketEvents(socket, userId);
  });

  return io;
}

/**
 * Registers all real-time events on an authenticated socket connection.
 * Exported to allow direct isolated unit testing without booting HTTP server.
 *
 * @param {import('socket.io').Socket} socket
 * @param {string} userId
 */
export function registerSocketEvents(socket, userId) {
  // Join personal user notification room
  if (typeof socket.join === 'function') {
    socket.join(`user:${userId}`);
  }

  // Track active verified conversation rooms for this socket
  if (!socket.activeConversationRooms) {
    socket.activeConversationRooms = new Set();
  }

  // Join a specific conversation room with server-side participant authorization
  socket.on(SOCKET_EVENTS.JOIN_CONVERSATION, async (data, callback) => {
    const conversationId = data?.conversationId || data;
    try {
      const { ChatService } = await import('../services/chat.service.js');
      await ChatService.verifyParticipant(conversationId, userId);

      socket.join(`conversation:${conversationId}`);
      socket.activeConversationRooms.add(conversationId.toString());
      if (typeof callback === 'function') {
        callback({ success: true, conversationId });
      }
      socket.emit(SOCKET_EVENTS.CONVERSATION_JOINED, { conversationId });
    } catch (err) {
      const statusCode = err.statusCode || 403;
      if (typeof callback === 'function') {
        callback({ success: false, error: err.message, statusCode });
      }
      socket.emit(SOCKET_EVENTS.ERROR, {
        message: err.message,
        statusCode,
      });
    }
  });

  // Leave conversation room
  socket.on(SOCKET_EVENTS.LEAVE_CONVERSATION, (data) => {
    const conversationId = data?.conversationId || data;
    if (conversationId) {
      if (typeof socket.leave === 'function') {
        socket.leave(`conversation:${conversationId}`);
      }
      socket.activeConversationRooms.delete(conversationId.toString());
      socket.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.USER_STOP_TYPING, {
        conversationId,
        userId,
      });
    }
  });

  // Send a real-time message
  socket.on(SOCKET_EVENTS.SEND_MESSAGE, async (data, callback) => {
    try {
      const { conversationId, content } = data || {};
      const { ChatService } = await import('../services/chat.service.js');
      const message = await ChatService.sendMessage(conversationId, userId, content);

      if (typeof callback === 'function') {
        callback({ success: true, message });
      }
    } catch (err) {
      if (typeof callback === 'function') {
        callback({
          success: false,
          error: err.message,
          statusCode: err.statusCode || 400,
        });
      }
      socket.emit(SOCKET_EVENTS.ERROR, {
        message: err.message,
        statusCode: err.statusCode || 400,
      });
    }
  });

  // Mark messages in conversation as read
  socket.on(SOCKET_EVENTS.MARK_READ, async (data, callback) => {
    try {
      const conversationId = data?.conversationId || data;
      const { ChatService } = await import('../services/chat.service.js');
      const result = await ChatService.markMessagesAsRead(conversationId, userId);

      if (typeof callback === 'function') {
        callback({ success: true, ...result });
      }
    } catch (err) {
      if (typeof callback === 'function') {
        callback({ success: false, error: err.message });
      }
    }
  });

  // Ephemeral typing status (authorized to verified conversation room participants only)
  socket.on(SOCKET_EVENTS.TYPING, ({ conversationId } = {}) => {
    const convIdStr = conversationId?.toString();
    if (convIdStr && socket.activeConversationRooms.has(convIdStr)) {
      socket.to(`conversation:${convIdStr}`).emit(SOCKET_EVENTS.USER_TYPING, {
        conversationId: convIdStr,
        userId,
        fullName: socket.user?.fullName || 'User',
      });
    }
  });

  socket.on(SOCKET_EVENTS.STOP_TYPING, ({ conversationId } = {}) => {
    const convIdStr = conversationId?.toString();
    if (convIdStr && socket.activeConversationRooms.has(convIdStr)) {
      socket.to(`conversation:${convIdStr}`).emit(SOCKET_EVENTS.USER_STOP_TYPING, {
        conversationId: convIdStr,
        userId,
      });
    }
  });

  socket.on('disconnect', () => {
    // Clear lingering typing indicators across joined rooms upon disconnect
    if (socket.activeConversationRooms && socket.activeConversationRooms.size > 0) {
      for (const convId of socket.activeConversationRooms) {
        socket.to(`conversation:${convId}`).emit(SOCKET_EVENTS.USER_STOP_TYPING, {
          conversationId: convId,
          userId,
        });
      }
      socket.activeConversationRooms.clear();
    }
  });
}

/**
 * Returns the current active Socket.io instance if initialized.
 */
export function getIO() {
  return io;
}

/**
 * Emits an event to all sockets connected to a specific conversation room.
 */
export function emitToConversation(conversationId, event, payload) {
  if (io && conversationId) {
    io.to(`conversation:${conversationId}`).emit(event, payload);
  }
}

/**
 * Emits an event directly to a user's private notification room.
 */
export function emitToUser(userId, event, payload) {
  if (io && userId) {
    io.to(`user:${userId.toString()}`).emit(event, payload);
  }
}

/**
 * Closes the active Socket.io server instance (used during graceful shutdown or tests).
 */
export function closeSocketServer() {
  if (io) {
    io.close();
    io = null;
  }
}
