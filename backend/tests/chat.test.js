import { describe, it, expect, vi, beforeEach, afterAll, beforeAll } from 'vitest';
import request from 'supertest';
import http from 'http';
import mongoose from 'mongoose';
import { io as Client } from 'socket.io-client';
import app from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Match } from '../src/models/match.model.js';
import { Conversation } from '../src/models/conversation.model.js';
import { Message } from '../src/models/message.model.js';
import { NotificationService } from '../src/services/notification.service.js';
import { generateToken } from '../src/utils/token.js';
import { initSocketServer, closeSocketServer } from '../src/socket/index.js';
import { SOCKET_EVENTS } from '../src/constants/chat.constants.js';

function mockQueryChain(resolvedValue) {
  return {
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    populate: vi.fn().mockReturnThis(),
    then: (onFulfilled, onRejected) =>
      Promise.resolve(resolvedValue).then(onFulfilled, onRejected),
  };
}

describe('Post-Match Private Chat API & Real-Time Socket (/api/conversations)', () => {
  const userAId = new mongoose.Types.ObjectId().toString();
  const userBId = new mongoose.Types.ObjectId().toString();
  const outsiderId = new mongoose.Types.ObjectId().toString();
  const eventId = new mongoose.Types.ObjectId().toString();
  const matchId = new mongoose.Types.ObjectId().toString();
  const conversationId = new mongoose.Types.ObjectId().toString();
  const messageId = new mongoose.Types.ObjectId().toString();

  const userA = new User({
    _id: userAId,
    fullName: 'Aarav Runner',
    email: 'aarav@example.com',
    city: 'Mumbai',
    role: 'user',
    isActive: true,
  });

  const userB = new User({
    _id: userBId,
    fullName: 'Maya Climber',
    email: 'maya@example.com',
    city: 'Mumbai',
    role: 'user',
    isActive: true,
  });

  const outsiderUser = new User({
    _id: outsiderId,
    fullName: 'Sam Outsider',
    email: 'sam@example.com',
    city: 'Delhi',
    role: 'user',
    isActive: true,
  });

  const tokenA = generateToken({ id: userAId, email: userA.email, role: 'user' });
  const tokenB = generateToken({ id: userBId, email: userB.email, role: 'user' });
  const tokenOutsider = generateToken({ id: outsiderId, email: outsiderUser.email, role: 'user' });

  const mockMatch = {
    _id: matchId,
    event: {
      _id: eventId,
      title: 'Sunset Trail Run',
      category: 'Running',
      location: { city: 'Mumbai' },
    },
    userA: userAId,
    userB: userBId,
    users: [userA, userB],
    matchedAt: new Date(),
  };

  const mockConversation = {
    _id: conversationId,
    match: matchId,
    event: {
      _id: eventId,
      title: 'Sunset Trail Run',
      category: 'Running',
    },
    participants: [userA, userB],
    lastMessage: null,
    lastMessageAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication & Security', () => {
    it('requires authentication for conversation endpoints', async () => {
      const listRes = await request(app).get('/api/conversations');
      expect(listRes.status).toBe(401);

      const createRes = await request(app).post('/api/conversations').send({ matchId });
      expect(createRes.status).toBe(401);

      const detailRes = await request(app).get(`/api/conversations/${conversationId}`);
      expect(detailRes.status).toBe(401);

      const msgRes = await request(app).get(`/api/conversations/${conversationId}/messages`);
      expect(msgRes.status).toBe(401);

      const sendRes = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .send({ content: 'Hello' });
      expect(sendRes.status).toBe(401);
    });

    it('rejects invalid ObjectId parameters with 400 Bad Request', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(userA);

      const res = await request(app)
        .get('/api/conversations/not-a-valid-id')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Conversation Creation & Access Control (POST /api/conversations)', () => {
    it('creates a new conversation for an authorized mutual match', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(userA);

      // Match lookup
      vi.spyOn(Match, 'findById').mockReturnValue(mockQueryChain(mockMatch));
      // No existing conversation
      vi.spyOn(Conversation, 'findOne').mockReturnValue(mockQueryChain(null));
      // Creation
      vi.spyOn(Conversation, 'create').mockResolvedValue({ _id: conversationId });
      vi.spyOn(Conversation, 'findById').mockReturnValue(mockQueryChain(mockConversation));

      const res = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ matchId });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.conversation._id).toBe(conversationId);
      expect(res.body.data.conversation.otherParticipant._id).toBe(userBId);
    });

    it('idempotently returns existing conversation without creating duplicates', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(userA);

      vi.spyOn(Match, 'findById').mockReturnValue(mockQueryChain(mockMatch));
      vi.spyOn(Conversation, 'findOne').mockReturnValue(mockQueryChain(mockConversation));
      vi.spyOn(Message, 'countDocuments').mockResolvedValue(0);
      const createSpy = vi.spyOn(Conversation, 'create');

      const res = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ matchId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.conversation._id).toBe(conversationId);
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('rejects conversation creation by an unauthorized user not in the match with 403', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(outsiderUser);
      vi.spyOn(Match, 'findById').mockReturnValue(mockQueryChain(mockMatch));

      const res = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${tokenOutsider}`)
        .send({ matchId });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    it('returns 404 if mutual match does not exist', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(userA);
      vi.spyOn(Match, 'findById').mockReturnValue(mockQueryChain(null));

      const res = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ matchId });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Conversation Listing & Details (GET /api/conversations)', () => {
    it('lists conversations for the authenticated participant with unread counts', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(userA);

      vi.spyOn(Conversation, 'find').mockReturnValue(mockQueryChain([mockConversation]));
      vi.spyOn(Conversation, 'countDocuments').mockResolvedValue(1);
      vi.spyOn(Message, 'countDocuments').mockResolvedValue(2); // 2 unread messages

      const res = await request(app)
        .get('/api/conversations?page=1&limit=20')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.conversations).toHaveLength(1);
      expect(res.body.data.conversations[0].unreadCount).toBe(2);
      expect(res.body.data.conversations[0].otherParticipant._id).toBe(userBId);
      expect(res.body.data.pagination.total).toBe(1);
    });

    it('retrieves conversation details for an authorized participant', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(userB);

      // Participant verification
      vi.spyOn(Conversation, 'findById')
        .mockResolvedValueOnce(mockConversation)
        .mockReturnValueOnce(mockQueryChain(mockConversation));
      vi.spyOn(Message, 'countDocuments').mockResolvedValue(0);

      const res = await request(app)
        .get(`/api/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.conversation.otherParticipant._id).toBe(userAId);
    });

    it('denies access to conversation details for a non-participant with 403', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(outsiderUser);
      vi.spyOn(Conversation, 'findById').mockResolvedValue(mockConversation);

      const res = await request(app)
        .get(`/api/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${tokenOutsider}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Message Operations (POST & GET /api/conversations/:id/messages)', () => {
    it('allows an authorized participant to send a valid message and dispatches notifications', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(userA);
      vi.spyOn(Conversation, 'findById').mockResolvedValue(mockConversation);

      const mockSavedMessage = {
        _id: messageId,
        conversation: conversationId,
        sender: userA,
        recipient: userB,
        content: 'Hey Maya! Great meeting you at the trail run.',
        isRead: false,
        createdAt: new Date(),
      };

      vi.spyOn(Message, 'create').mockResolvedValue(mockSavedMessage);
      vi.spyOn(Conversation, 'findByIdAndUpdate').mockResolvedValue({});
      vi.spyOn(Message, 'findById').mockReturnValue(mockQueryChain(mockSavedMessage));
      const notifSpy = vi.spyOn(NotificationService, 'safeCreate').mockResolvedValue({});

      const res = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ content: 'Hey Maya! Great meeting you at the trail run.' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message.content).toBe('Hey Maya! Great meeting you at the trail run.');

      // Verify notification sent to recipient and NOT to sender
      expect(notifSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: userBId,
          type: 'new_message',
        })
      );
    });

    it('locks sender identity to the authenticated user preventing identity spoofing', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(userA);
      vi.spyOn(Conversation, 'findById').mockResolvedValue(mockConversation);

      const createSpy = vi.spyOn(Message, 'create').mockResolvedValue({
        _id: messageId,
        conversation: conversationId,
        sender: userAId,
        recipient: userBId,
        content: 'Legitimate sender',
        isRead: false,
        createdAt: new Date(),
      });
      vi.spyOn(Conversation, 'findByIdAndUpdate').mockResolvedValue({});
      vi.spyOn(Message, 'findById').mockReturnValue(mockQueryChain({
        _id: messageId,
        sender: userA,
        recipient: userB,
        content: 'Legitimate sender',
      }));
      vi.spyOn(NotificationService, 'safeCreate').mockResolvedValue({});

      // Attempt to spoof sender by passing sender: userBId in request body
      await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          content: 'Legitimate sender',
          sender: userBId,
        });

      const createArgs = createSpy.mock.calls[0][0];
      expect(createArgs.sender.toString()).toBe(userAId);
      expect(createArgs.recipient.toString()).toBe(userBId);
      expect(createArgs.sender.toString()).not.toBe(userBId);
    });

    it('rejects empty and whitespace-only messages with 400 Bad Request', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(userA);

      const resEmpty = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ content: '' });

      expect(resEmpty.status).toBe(400);

      const resWhitespace = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ content: '     ' });

      expect(resWhitespace.status).toBe(400);
    });

    it('rejects oversized messages (>2000 characters) with 400 Bad Request', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(userA);

      const oversizedContent = 'a'.repeat(2001);
      const res = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ content: oversizedContent });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('sanitizes HTML characters to prevent XSS attacks', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(userA);
      vi.spyOn(Conversation, 'findById').mockResolvedValue(mockConversation);

      const createSpy = vi.spyOn(Message, 'create').mockResolvedValue({
        _id: messageId,
        conversation: conversationId,
        sender: userAId,
        recipient: userBId,
        content: '&lt;script&gt;alert(1)&lt;/script&gt;',
        isRead: false,
        createdAt: new Date(),
      });
      vi.spyOn(Conversation, 'findByIdAndUpdate').mockResolvedValue({});
      vi.spyOn(Message, 'findById').mockReturnValue(mockQueryChain({
        _id: messageId,
        content: '&lt;script&gt;alert(1)&lt;/script&gt;',
      }));
      vi.spyOn(NotificationService, 'safeCreate').mockResolvedValue({});

      await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ content: '<script>alert(1)</script>' });

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          content: '&lt;script&gt;alert(1)&lt;/script&gt;',
        })
      );
    });

    it('denies message sending from a non-participant with 403 Forbidden', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(outsiderUser);
      vi.spyOn(Conversation, 'findById').mockResolvedValue(mockConversation);

      const res = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${tokenOutsider}`)
        .send({ content: 'Unauthorized intrusion' });

      expect(res.status).toBe(403);
    });

    it('retrieves paginated messages for conversation participants', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(userA);
      vi.spyOn(Conversation, 'findById').mockResolvedValue(mockConversation);

      const mockMessages = [
        {
          _id: messageId,
          conversation: conversationId,
          sender: userA,
          recipient: userB,
          content: 'Hey Maya!',
          isRead: true,
          createdAt: new Date(),
        },
      ];

      vi.spyOn(Message, 'find').mockReturnValue(mockQueryChain(mockMessages));
      vi.spyOn(Message, 'countDocuments').mockResolvedValue(1);

      const res = await request(app)
        .get(`/api/conversations/${conversationId}/messages?page=1&limit=50`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.messages).toHaveLength(1);
      expect(res.body.data.pagination.total).toBe(1);
    });
  });

  describe('Read Receipts (PATCH /api/conversations/:id/read)', () => {
    it('marks unread messages as read for the recipient', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(userB);
      vi.spyOn(Conversation, 'findById').mockResolvedValue(mockConversation);
      vi.spyOn(Message, 'updateMany').mockResolvedValue({ modifiedCount: 3 });

      const res = await request(app)
        .patch(`/api/conversations/${conversationId}/read`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.readCount).toBe(3);
    });

    it('denies mark-as-read to a non-participant with 403 Forbidden', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(outsiderUser);
      vi.spyOn(Conversation, 'findById').mockResolvedValue(mockConversation);

      const res = await request(app)
        .patch(`/api/conversations/${conversationId}/read`)
        .set('Authorization', `Bearer ${tokenOutsider}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Real-Time Socket.io Connection & Room Security', () => {
    let httpServer;
    let socketPort;

    beforeAll(async () => {
      httpServer = http.createServer(app);
      initSocketServer(httpServer);
      await new Promise((resolve) => {
        httpServer.listen(0, () => {
          socketPort = httpServer.address().port;
          resolve();
        });
      });
    });

    afterAll(() => {
      closeSocketServer();
      if (httpServer) {
        httpServer.close();
      }
    });

    it('connects successfully with a valid JWT token', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(userA);

      const client = Client(`http://localhost:${socketPort}`, {
        auth: { token: tokenA },
        transports: ['websocket'],
      });

      await new Promise((resolve, reject) => {
        client.on('connect', () => {
          client.disconnect();
          resolve();
        });
        client.on('connect_error', (err) => {
          client.disconnect();
          reject(err);
        });
      });
    });

    it('rejects connection when token is missing or invalid', async () => {
      const client = Client(`http://localhost:${socketPort}`, {
        auth: { token: 'invalid-or-missing-token' },
        transports: ['websocket'],
      });

      await new Promise((resolve) => {
        client.on('connect_error', (err) => {
          expect(err.message).toMatch(/Authentication/i);
          client.disconnect();
          resolve();
        });
      });
    });

    it('allows a conversation participant to join the room and rejects non-participants', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(userA);
      vi.spyOn(Conversation, 'findById').mockResolvedValue(mockConversation);

      const client = Client(`http://localhost:${socketPort}`, {
        auth: { token: tokenA },
        transports: ['websocket'],
      });

      await new Promise((resolve, reject) => {
        client.on('connect', () => {
          client.emit(SOCKET_EVENTS.JOIN_CONVERSATION, { conversationId }, (ack) => {
            expect(ack.success).toBe(true);
            client.disconnect();
            resolve();
          });
        });
        client.on('connect_error', reject);
      });

      // Outsider user
      vi.spyOn(User, 'findById').mockResolvedValue(outsiderUser);
      const outsiderClient = Client(`http://localhost:${socketPort}`, {
        auth: { token: tokenOutsider },
        transports: ['websocket'],
      });

      await new Promise((resolve, reject) => {
        outsiderClient.on('connect', () => {
          outsiderClient.emit(SOCKET_EVENTS.JOIN_CONVERSATION, { conversationId }, (ack) => {
            expect(ack.success).toBe(false);
            expect(ack.statusCode).toBe(403);
            outsiderClient.disconnect();
            resolve();
          });
        });
        outsiderClient.on('connect_error', reject);
      });
    });
  });
});
