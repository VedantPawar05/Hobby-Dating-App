import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import {
  validateRequest,
  validateQuery,
  validateObjectId,
} from '../middlewares/validate.middleware.js';
import { createRateLimiter } from '../middlewares/rate-limit.middleware.js';
import {
  createConversationSchema,
  sendMessageSchema,
  conversationQuerySchema,
  messageQuerySchema,
} from '../validators/chat.validator.js';
import { ChatController } from '../controllers/chat.controller.js';

const router = Router();

// Protect all chat endpoints with JWT authentication
router.use(authenticate);

// Rate limiter for message dispatch (60 messages per minute per user)
const messageRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: 'Message rate limit exceeded. Please wait a moment before sending more messages.',
  keyGenerator: (req) => `chat_send:${req.user?._id || req.ip}`,
});

// Conversation management
router.post(
  '/',
  validateRequest(createConversationSchema),
  ChatController.createConversation
);

router.get(
  '/',
  validateQuery(conversationQuerySchema),
  ChatController.getUserConversations
);

router.get('/:id', validateObjectId('id'), ChatController.getConversation);

// Message operations
router.get(
  '/:id/messages',
  validateObjectId('id'),
  validateQuery(messageQuerySchema),
  ChatController.getMessages
);

router.post(
  '/:id/messages',
  validateObjectId('id'),
  messageRateLimiter,
  validateRequest(sendMessageSchema),
  ChatController.sendMessage
);

router.patch(
  '/:id/read',
  validateObjectId('id'),
  ChatController.markAsRead
);

export default router;
