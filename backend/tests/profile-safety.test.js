import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Block } from '../src/models/block.model.js';
import { Match } from '../src/models/match.model.js';
import { Message } from '../src/models/message.model.js';
import { Conversation } from '../src/models/conversation.model.js';
import { Report } from '../src/models/report.model.js';
import { ModerationLog } from '../src/models/moderation-log.model.js';
import { generateToken } from '../src/utils/token.js';
import { UserService } from '../src/services/user.service.js';
import { BlockService } from '../src/services/block.service.js';
import { ChatService } from '../src/services/chat.service.js';

describe('Phase 7 — Profile Management, Privacy Controls & User Safety', () => {
  const userAId = new mongoose.Types.ObjectId().toString();
  const userBId = new mongoose.Types.ObjectId().toString();
  const userCId = new mongoose.Types.ObjectId().toString();

  let userA;
  let userB;
  let tokenA;
  let tokenB;

  beforeEach(() => {
    vi.restoreAllMocks();

    userA = new User({
      _id: userAId,
      fullName: 'Alice Walker',
      email: 'alice@example.com',
      password: 'hashed_password_123',
      dateOfBirth: new Date('1995-05-15'),
      city: 'Seattle',
      bio: 'Loves rock climbing and photography',
      interests: ['climbing', 'photography'],
      profilePicture: 'https://example.com/alice.jpg',
      role: 'user',
      isActive: true,
      privacy: {
        profileVisibility: 'public',
        showCity: true,
        showInterests: true,
        allowDiscovery: true,
      },
    });
    userA.comparePassword = vi.fn().mockImplementation(async (pw) => pw === 'correct_password');

    userB = new User({
      _id: userBId,
      fullName: 'Bob Smith',
      email: 'bob@example.com',
      password: 'hashed_password_456',
      dateOfBirth: new Date('1993-08-20'),
      city: 'Portland',
      bio: 'Board games and specialty coffee',
      interests: ['coffee', 'boardgames'],
      profilePicture: 'https://example.com/bob.jpg',
      role: 'user',
      isActive: true,
      privacy: {
        profileVisibility: 'members_only',
        showCity: false,
        showInterests: true,
        allowDiscovery: true,
      },
    });
    userB.comparePassword = vi.fn().mockImplementation(async (pw) => pw === 'correct_password');

    tokenA = generateToken({
      id: userAId,
      email: userA.email,
      role: userA.role,
    });

    tokenB = generateToken({
      id: userBId,
      email: userB.email,
      role: userB.role,
    });
  });

  describe('Profile Management & Updates', () => {
    it('updates permitted profile fields and privacy settings', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(userA);
      const updatedUser = new User({
        ...userA.toObject(),
        bio: 'Updated bio for photography enthusiast',
        privacy: {
          profileVisibility: 'matches_only',
          showCity: false,
          showInterests: true,
          allowDiscovery: false,
        },
      });
      vi.spyOn(User, 'findByIdAndUpdate').mockResolvedValue(updatedUser);

      const res = await request(app)
        .patch('/api/users/profile')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          bio: 'Updated bio for photography enthusiast',
          privacy: {
            profileVisibility: 'matches_only',
            showCity: false,
            showInterests: true,
            allowDiscovery: false,
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profile.bio).toBe('Updated bio for photography enthusiast');
      expect(res.body.data.profile.privacy.profileVisibility).toBe('matches_only');
      expect(res.body.data.profile.privacy.showCity).toBe(false);
    });

    it('rejects update requests containing unpermitted protected fields', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(userA);

      const res = await request(app)
        .patch('/api/users/profile')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          role: 'admin',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('calculates profile completion status and identifies missing fields', async () => {
      const incompleteUser = new User({
        _id: userAId,
        fullName: 'Alice Incomplete',
        email: 'alice@example.com',
        city: 'Seattle',
        dateOfBirth: new Date('1995-05-15'),
        gender: null,
        bio: '',
        interests: [],
        profilePicture: '',
        role: 'user',
        isActive: true,
      });
      vi.spyOn(User, 'findById').mockResolvedValue(incompleteUser);

      const res = await request(app)
        .get('/api/users/profile/completion')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.percentage).toBeLessThan(100);
      expect(res.body.data.isComplete).toBe(false);
      expect(res.body.data.missingFields).toContain('bio');
      expect(res.body.data.missingFields).toContain('interests');
      expect(res.body.data.missingFields).toContain('profilePicture');
    });
  });

  describe('Public Profile Visibility & Privacy Controls', () => {
    it('returns sanitized public profile without exposing sensitive fields', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(userA);
      vi.spyOn(Block, 'findOne').mockResolvedValue(null);

      const res = await request(app).get(`/api/users/${userAId}/public`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profile.fullName).toBe('Alice Walker');
      expect(res.body.data.profile.email).toBeUndefined();
      expect(res.body.data.profile.password).toBeUndefined();
      expect(res.body.data.profile.role).toBeUndefined();
      expect(res.body.data.profile.isActive).toBeUndefined();
    });

    it('enforces members_only visibility requiring authentication', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(userB);

      // Anonymous access should fail
      const anonRes = await request(app).get(`/api/users/${userBId}/public`);
      expect(anonRes.status).toBe(401);

      // Authenticated access should succeed
      vi.spyOn(User, 'findById').mockImplementation(async (id) => {
        if (id.toString() === userAId) return userA;
        if (id.toString() === userBId) return userB;
        return null;
      });
      vi.spyOn(Block, 'findOne').mockResolvedValue(null);

      const authRes = await request(app)
        .get(`/api/users/${userBId}/public`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(authRes.status).toBe(200);
      expect(authRes.body.data.profile.fullName).toBe('Bob Smith');
      // showCity was set to false on Bob's privacy settings
      expect(authRes.body.data.profile.city).toBeUndefined();
    });

    it('enforces matches_only visibility and denies non-matched viewers', async () => {
      const matchOnlyUser = new User({
        ...userB.toObject(),
        privacy: {
          profileVisibility: 'matches_only',
          showCity: true,
          showInterests: true,
          allowDiscovery: true,
        },
      });

      vi.spyOn(User, 'findById').mockImplementation(async (id) => {
        if (id.toString() === userAId) return userA;
        if (id.toString() === userBId) return matchOnlyUser;
        return null;
      });
      vi.spyOn(Block, 'findOne').mockResolvedValue(null);
      vi.spyOn(Match, 'findOne').mockResolvedValue(null); // No mutual match

      const res = await request(app)
        .get(`/api/users/${userBId}/public`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/only visible to mutual matches/i);
    });

    it('allows mutual matches to view matches_only profiles', async () => {
      const matchOnlyUser = new User({
        ...userB.toObject(),
        privacy: {
          profileVisibility: 'matches_only',
          showCity: true,
          showInterests: true,
          allowDiscovery: true,
        },
      });

      vi.spyOn(User, 'findById').mockImplementation(async (id) => {
        if (id.toString() === userAId) return userA;
        if (id.toString() === userBId) return matchOnlyUser;
        return null;
      });
      vi.spyOn(Block, 'findOne').mockResolvedValue(null);
      vi.spyOn(Match, 'findOne').mockResolvedValue({ _id: 'match123', users: [userAId, userBId] });

      const res = await request(app)
        .get(`/api/users/${userBId}/public`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.profile.fullName).toBe('Bob Smith');
    });
  });

  describe('User Blocking & Social Safety', () => {
    it('blocks another user successfully', async () => {
      vi.spyOn(User, 'findById').mockImplementation(async (id) => {
        if (id.toString() === userAId) return userA;
        if (id.toString() === userBId) return userB;
        return null;
      });
      vi.spyOn(Block, 'findOne').mockResolvedValue(null);
      const mockBlock = {
        _id: 'block123',
        blocker: userAId,
        blocked: userBId,
        reason: 'Harassment',
      };
      vi.spyOn(Block, 'create').mockResolvedValue(mockBlock);

      const res = await request(app)
        .post('/api/users/block')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          targetUserId: userBId,
          reason: 'Harassment',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.block.blocked).toBe(userBId);
    });

    it('prevents self-blocking with 400 Bad Request', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(userA);

      const res = await request(app)
        .post('/api/users/block')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          targetUserId: userAId,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/cannot block your own account/i);
    });

    it('prevents duplicate blocks with 409 Conflict', async () => {
      vi.spyOn(User, 'findById').mockImplementation(async (id) => {
        if (id.toString() === userAId) return userA;
        if (id.toString() === userBId) return userB;
        return null;
      });
      vi.spyOn(Block, 'findOne').mockResolvedValue({ _id: 'existingBlock' });

      const res = await request(app)
        .post('/api/users/block')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          targetUserId: userBId,
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/already blocked this user/i);
    });

    it('unblocks a blocked user successfully', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(userA);
      vi.spyOn(Block, 'findOneAndDelete').mockResolvedValue({ _id: 'deletedBlock' });

      const res = await request(app)
        .delete(`/api/users/block/${userBId}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.unblocked).toBe(true);
    });

    it('lists blocked users for authenticated caller', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(userA);
      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        populate: vi.fn().mockResolvedValue([
          {
            _id: 'block1',
            blocker: userAId,
            blocked: {
              _id: userBId,
              fullName: 'Bob Smith',
              city: 'Portland',
            },
          },
        ]),
      };
      vi.spyOn(Block, 'find').mockReturnValue(mockQuery);
      vi.spyOn(Block, 'countDocuments').mockResolvedValue(1);

      const res = await request(app)
        .get('/api/users/blocked')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.blockedUsers[0]._id).toBe(userBId);
    });

    it('blocks messaging in private chat when a block is active', async () => {
      const convId = new mongoose.Types.ObjectId().toString();
      vi.spyOn(Conversation, 'findById').mockResolvedValue({
        _id: convId,
        participants: [userAId, userBId],
      });
      vi.spyOn(Block, 'findOne').mockResolvedValue({ _id: 'activeBlock' });

      await expect(
        ChatService.sendMessage(convId, userAId, 'Hello!')
      ).rejects.toMatchObject({
        statusCode: 403,
        message: expect.stringMatching(/block is active/i),
      });
    });
  });

  describe('Report System Extension for Messages', () => {
    it('allows reporting an abusive message by an authorized user', async () => {
      const messageId = new mongoose.Types.ObjectId().toString();
      const mockMessage = {
        _id: messageId,
        sender: userBId,
        content: 'Abusive text',
        conversation: 'conv123',
      };
      vi.spyOn(User, 'findById').mockResolvedValue(userA);
      vi.spyOn(Message, 'findById').mockResolvedValue(mockMessage);
      vi.spyOn(Report, 'findOne').mockResolvedValue(null);
      vi.spyOn(Report, 'create').mockResolvedValue({
        _id: 'report123',
        reporter: userAId,
        targetType: 'message',
        targetId: messageId,
        reason: 'Harassment in private chat',
      });

      const res = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          targetType: 'message',
          targetId: messageId,
          reason: 'Harassment in private chat',
          details: 'User sent inappropriate messages',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.report.targetType).toBe('message');
    });

    it('rejects reporting one own message with 400 Bad Request', async () => {
      const messageId = new mongoose.Types.ObjectId().toString();
      const mockMyMessage = {
        _id: messageId,
        sender: userAId, // Sent by caller
        content: 'My own message',
      };
      vi.spyOn(User, 'findById').mockResolvedValue(userA);
      vi.spyOn(Message, 'findById').mockResolvedValue(mockMyMessage);

      const res = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          targetType: 'message',
          targetId: messageId,
          reason: 'Self report attempt',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/cannot report your own message/i);
    });
  });

  describe('Account Lifecycle & Safety (Deactivation & Deletion)', () => {
    it('deactivates account with valid password verification', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(userA);
      userA.save = vi.fn().mockResolvedValue(userA);
      vi.spyOn(ModerationLog, 'create').mockResolvedValue({});

      const res = await request(app)
        .post('/api/users/deactivate')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          password: 'correct_password',
          reason: 'Taking a break',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.deactivated).toBe(true);
      expect(userA.isActive).toBe(false);
    });

    it('rejects account deactivation when password is incorrect', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(userA);

      const res = await request(app)
        .post('/api/users/deactivate')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          password: 'wrong_password',
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/invalid password/i);
    });

    it('permanently deletes and anonymizes user account with password and DELETE confirmation', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(userA);
      userA.save = vi.fn().mockResolvedValue(userA);
      vi.spyOn(ModerationLog, 'create').mockResolvedValue({});

      const res = await request(app)
        .post('/api/users/delete-account')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          password: 'correct_password',
          confirmation: 'DELETE',
          reason: 'Account closure',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(true);
      expect(userA.fullName).toBe('Deleted User');
      expect(userA.email).toMatch(/^deleted_/);
      expect(userA.isActive).toBe(false);
    });

    it('rejects deletion if confirmation string is missing or not DELETE', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(userA);

      const res = await request(app)
        .post('/api/users/delete-account')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          password: 'correct_password',
          confirmation: 'delete_please',
        });

      expect(res.status).toBe(400);
    });
  });
});
