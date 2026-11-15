import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Notification } from '../src/models/notification.model.js';
import { NotificationService } from '../src/services/notification.service.js';
import { NOTIFICATION_TYPES } from '../src/constants/notification.constants.js';
import { generateToken } from '../src/utils/token.js';

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

describe('In-App Notification System (/api/notifications)', () => {
  const userId = new mongoose.Types.ObjectId().toString();
  const otherUserId = new mongoose.Types.ObjectId().toString();
  const notificationId = new mongoose.Types.ObjectId().toString();

  const user = new User({
    _id: userId,
    fullName: 'Rohan Member',
    email: 'rohan@example.com',
    role: 'user',
    city: 'Pune',
    isActive: true,
  });

  const otherUser = new User({
    _id: otherUserId,
    fullName: 'Ananya User',
    email: 'ananya@example.com',
    role: 'user',
    city: 'Mumbai',
    isActive: true,
  });

  const userToken = generateToken({ id: userId, email: user.email, role: 'user' });
  const otherToken = generateToken({ id: otherUserId, email: otherUser.email, role: 'user' });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/notifications & GET /api/notifications/unread-count', () => {
    it('requires authentication for notification endpoints', async () => {
      const unauthRes = await request(app).get('/api/notifications');
      expect(unauthRes.status).toBe(401);

      const countRes = await request(app).get('/api/notifications/unread-count');
      expect(countRes.status).toBe(401);
    });

    it('returns paginated notifications and unread count for authenticated user', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(user);

      const mockNotifications = [
        {
          _id: notificationId,
          recipient: userId,
          title: 'Booking Confirmed!',
          message: 'Your spot for Morning 5K is reserved.',
          type: NOTIFICATION_TYPES.BOOKING_CONFIRMED,
          isRead: false,
          link: '/dashboard',
          createdAt: new Date(),
        },
      ];

      vi.spyOn(Notification, 'find').mockReturnValue(mockQueryChain(mockNotifications));
      vi.spyOn(Notification, 'countDocuments')
        .mockResolvedValueOnce(1) // total
        .mockResolvedValueOnce(1); // unreadCount

      const res = await request(app)
        .get('/api/notifications?isRead=false&page=1&limit=10')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notifications).toHaveLength(1);
      expect(res.body.data.unreadCount).toBe(1);
      expect(res.body.data.pagination.total).toBe(1);
    });

    it('fetches unread count endpoint correctly', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(user);
      vi.spyOn(Notification, 'countDocuments').mockResolvedValue(3);

      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.unreadCount).toBe(3);
    });
  });

  describe('PATCH /api/notifications/:notificationId/read & PATCH /api/notifications/read-all', () => {
    it('marks an individual notification as read for the recipient', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(user);

      const readNotification = {
        _id: notificationId,
        recipient: userId,
        title: 'Event Approved! 🎉',
        isRead: true,
      };

      vi.spyOn(Notification, 'findOneAndUpdate').mockResolvedValue(readNotification);

      const res = await request(app)
        .patch(`/api/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notification.isRead).toBe(true);
    });

    it('returns 404 when marking a non-existent or other user notification as read', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(otherUser);
      vi.spyOn(Notification, 'findOneAndUpdate').mockResolvedValue(null);

      const res = await request(app)
        .patch(`/api/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('marks all notifications as read for current user', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(user);
      vi.spyOn(Notification, 'updateMany').mockResolvedValue({ modifiedCount: 4 });

      const res = await request(app)
        .patch('/api/notifications/read-all')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.modifiedCount).toBe(4);
    });
  });

  describe('DELETE /api/notifications/:notificationId', () => {
    it('allows recipient to delete their notification', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(user);
      vi.spyOn(Notification, 'findOneAndDelete').mockResolvedValue({
        _id: notificationId,
        recipient: userId,
      });

      const res = await request(app)
        .delete(`/api/notifications/${notificationId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.deleted).toBe(true);
    });

    it('rejects deletion of a notification belonging to another user with 404', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(otherUser);
      vi.spyOn(Notification, 'findOneAndDelete').mockResolvedValue(null);

      const res = await request(app)
        .delete(`/api/notifications/${notificationId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('NotificationService & Deduplication', () => {
    it('prevents duplicate notifications when dedupeKey is provided', async () => {
      const existingDoc = {
        _id: notificationId,
        recipient: userId,
        dedupeKey: 'match_notif:123',
        title: "It's a Mutual Match! ✨",
      };

      vi.spyOn(Notification, 'findOne').mockResolvedValue(existingDoc);
      const createSpy = vi.spyOn(Notification, 'create');

      const outcome = await NotificationService.createNotification({
        recipient: userId,
        title: "It's a Mutual Match! ✨",
        message: 'You and Aarav matched.',
        type: NOTIFICATION_TYPES.MUTUAL_MATCH,
        dedupeKey: 'match_notif:123',
      });

      expect(outcome._id).toBe(notificationId);
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('safeCreate handles failures gracefully without throwing', async () => {
      vi.spyOn(Notification, 'create').mockRejectedValue(new Error('DB connection dropped'));

      const result = await NotificationService.safeCreate({
        recipient: userId,
        title: 'Test Warning',
        message: 'This should not throw.',
        type: NOTIFICATION_TYPES.BOOKING_CONFIRMED,
      });

      expect(result).toBeNull();
    });

    it('safeCreate handles disconnected unmocked state cleanly without buffering', async () => {
      // In disconnected state with unmocked Notification methods, safeCreate should return null
      const result = await NotificationService.safeCreate({
        recipient: userId,
        title: 'Safe Disconnected Test',
        message: 'Should return null without buffering.',
        type: NOTIFICATION_TYPES.BOOKING_CONFIRMED,
      });

      expect(result).toBeNull();
    });

    it('safeNotifyAdmins handles errors gracefully without throwing', async () => {
      vi.spyOn(User, 'find').mockImplementation(() => {
        throw new Error('Database unreachable');
      });

      const result = await NotificationService.safeNotifyAdmins({
        title: 'Admin Alert',
        message: 'Something happened',
        type: NOTIFICATION_TYPES.ADMIN_NEW_APPLICATION,
      });

      expect(result).toEqual([]);
    });
  });

  describe('Notification Triggers Integration', () => {
    it('notifies active administrators on admin broadcasts', async () => {
      const adminA = new User({ _id: new mongoose.Types.ObjectId(), role: 'admin', isActive: true });
      const adminB = new User({ _id: new mongoose.Types.ObjectId(), role: 'admin', isActive: true });

      vi.spyOn(User, 'find').mockReturnValue({
        select: vi.fn().mockResolvedValue([adminA, adminB]),
      });
      const createSpy = vi.spyOn(NotificationService, 'createNotification').mockResolvedValue({});

      await NotificationService.notifyAdmins({
        title: 'New Moderation Report Submitted',
        message: 'A report was filed.',
        type: NOTIFICATION_TYPES.ADMIN_NEW_REPORT,
        link: '/admin/reports',
      });

      expect(createSpy).toHaveBeenCalledTimes(2);
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: adminA._id,
          type: NOTIFICATION_TYPES.ADMIN_NEW_REPORT,
        })
      );
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: adminB._id,
          type: NOTIFICATION_TYPES.ADMIN_NEW_REPORT,
        })
      );
    });
  });
});
