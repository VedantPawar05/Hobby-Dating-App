import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Event } from '../src/models/event.model.js';
import { ModerationLog } from '../src/models/moderation-log.model.js';
import { OrganizerApplication } from '../src/models/organizer-application.model.js';
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

describe('Organizer Application & Approval Workflow', () => {
  const userId = new mongoose.Types.ObjectId().toString();
  const organizerId = new mongoose.Types.ObjectId().toString();
  const adminId = new mongoose.Types.ObjectId().toString();
  const applicationId = new mongoose.Types.ObjectId().toString();

  const normalUser = new User({
    _id: userId,
    fullName: 'Applicant Priya',
    email: 'priya@example.com',
    role: 'user',
    city: 'Bengaluru',
    isActive: true,
  });

  const approvedOrganizerUser = new User({
    _id: organizerId,
    fullName: 'Existing Organizer',
    email: 'org@example.com',
    role: 'organizer',
    city: 'Mumbai',
    isActive: true,
  });

  const adminUser = new User({
    _id: adminId,
    fullName: 'Platform Admin',
    email: 'admin@ricoz.app',
    role: 'admin',
    city: 'Delhi',
    isActive: true,
  });

  const userToken = generateToken({ id: userId, role: 'user' });
  const organizerToken = generateToken({ id: organizerId, role: 'organizer' });
  const adminToken = generateToken({ id: adminId, role: 'admin' });

  const validPayload = {
    organizationName: 'Indiranagar Morning Run Club',
    hostingCity: 'Bengaluru',
    hobbyCategories: ['Running', 'Hiking'],
    experience: 'Organized weekly 5K community runs and weekend trail hikes for 2 years.',
    reason: 'I want to bring local runners together safely through curated Ricoz meetups.',
    contactEmail: 'priya@example.com',
    contactPhone: '+91 98765 43210',
    websiteOrSocial: 'https://instagram.com/indiranagar.runs',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('User Application Submission (POST /api/organizer-applications)', () => {
    it('allows a normal user to submit a valid organizer application', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(normalUser);
      vi.spyOn(OrganizerApplication, 'findOne').mockResolvedValue(null);

      const createdApp = new OrganizerApplication({
        _id: applicationId,
        applicant: userId,
        ...validPayload,
        status: 'pending',
      });
      const createSpy = vi.spyOn(OrganizerApplication, 'create').mockResolvedValue(createdApp);

      const res = await request(app)
        .post('/api/organizer-applications')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.application.status).toBe('pending');
      expect(res.body.data.application.organizationName).toBe(validPayload.organizationName);
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          applicant: normalUser._id,
          status: 'pending',
        })
      );
    });

    it('prevents duplicate pending applications with 409', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(normalUser);
      vi.spyOn(OrganizerApplication, 'findOne').mockResolvedValue({
        _id: applicationId,
        applicant: userId,
        status: 'pending',
      });

      const res = await request(app)
        .post('/api/organizer-applications')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validPayload);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('rejects invalid application data and attempts to self-assign status or role', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(normalUser);

      const invalidRes = await request(app)
        .post('/api/organizer-applications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          organizationName: 'A',
          hostingCity: 'B',
          experience: 'short',
          reason: 'short',
          contactEmail: 'not-an-email',
          contactPhone: '123',
        });

      expect(invalidRes.status).toBe(400);
      expect(invalidRes.body.success).toBe(false);

      const selfApproveRes = await request(app)
        .post('/api/organizer-applications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          ...validPayload,
          status: 'approved',
        });

      expect(selfApproveRes.status).toBe(400);
    });
  });

  describe('Application Status & History (GET /api/organizer-applications/me)', () => {
    it('retrieves current status, rejection reason, and full application history', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(normalUser);

      const rejectedApp = {
        _id: applicationId,
        applicant: userId,
        organizationName: validPayload.organizationName,
        hostingCity: validPayload.hostingCity,
        status: 'rejected',
        rejectionReason: 'Please include verifiable past event links.',
        reviewedAt: new Date(),
        reviewedBy: { _id: adminId, fullName: 'Platform Admin', email: 'admin@ricoz.app' },
        createdAt: new Date(),
      };

      vi.spyOn(OrganizerApplication, 'find').mockReturnValue(mockQueryChain([rejectedApp]));
      vi.spyOn(OrganizerApplication, 'countDocuments').mockResolvedValue(1);
      vi.spyOn(OrganizerApplication, 'findOne').mockReturnValue(mockQueryChain(rejectedApp));

      const res = await request(app)
        .get('/api/organizer-applications/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.currentStatus).toBe('rejected');
      expect(res.body.data.latestApplication.rejectionReason).toBe(
        'Please include verifiable past event links.'
      );
      expect(res.body.data.applications).toHaveLength(1);
      expect(res.body.data.pagination.total).toBe(1);
    });

    it('allows a rejected user to submit a new application when no pending one exists', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(normalUser);
      vi.spyOn(OrganizerApplication, 'findOne').mockResolvedValue(null);

      const newAppId = new mongoose.Types.ObjectId().toString();
      vi.spyOn(OrganizerApplication, 'create').mockResolvedValue(
        new OrganizerApplication({
          _id: newAppId,
          applicant: userId,
          ...validPayload,
          status: 'pending',
        })
      );

      const res = await request(app)
        .post('/api/organizer-applications')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.data.application.status).toBe('pending');
    });
  });

  describe('Admin Review & Role Assignment (/api/admin/organizer-applications)', () => {
    it('blocks non-admin and unauthenticated users from reviewing applications', async () => {
      const unauthRes = await request(app).get('/api/admin/organizer-applications');
      expect(unauthRes.status).toBe(401);

      vi.spyOn(User, 'findById').mockResolvedValue(normalUser);
      const userListRes = await request(app)
        .get('/api/admin/organizer-applications')
        .set('Authorization', `Bearer ${userToken}`);
      expect(userListRes.status).toBe(403);

      const userApproveRes = await request(app)
        .patch(`/api/admin/organizer-applications/${applicationId}/approve`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({});
      expect(userApproveRes.status).toBe(403);

      vi.spyOn(User, 'findById').mockResolvedValue(approvedOrganizerUser);
      const orgRejectRes = await request(app)
        .patch(`/api/admin/organizer-applications/${applicationId}/reject`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ reason: 'Not authorized' });
      expect(orgRejectRes.status).toBe(403);
    });

    it('allows admin to approve an application, assign organizer role, and log moderation action', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(adminUser);

      const approvedAppDoc = {
        _id: applicationId,
        applicant: {
          _id: userId,
          fullName: 'Applicant Priya',
          email: 'priya@example.com',
          role: 'user',
        },
        organizationName: validPayload.organizationName,
        contactEmail: validPayload.contactEmail,
        status: 'approved',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        decisionNote: 'Verified community organizer',
      };

      const promotedUser = new User({
        _id: userId,
        fullName: 'Applicant Priya',
        email: 'priya@example.com',
        role: 'organizer',
        isActive: true,
      });

      vi.spyOn(OrganizerApplication, 'findOneAndUpdate').mockReturnValue(
        mockQueryChain(approvedAppDoc)
      );
      const userUpdateSpy = vi
        .spyOn(User, 'findOneAndUpdate')
        .mockReturnValue(mockQueryChain(promotedUser));
      const logSpy = vi.spyOn(ModerationLog, 'create').mockResolvedValue({});

      const res = await request(app)
        .patch(`/api/admin/organizer-applications/${applicationId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Verified community organizer' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.application.status).toBe('approved');
      expect(res.body.data.user.role).toBe('organizer');
      expect(userUpdateSpy).toHaveBeenCalledWith(
        { _id: userId, role: 'user' },
        { $set: { role: 'organizer' } },
        { new: true }
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'approve_organizer_application',
          targetType: 'organizer_application',
          targetId: applicationId,
        })
      );
    });

    it('requires a rejection reason and allows admin to reject an application', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(adminUser);

      const missingReasonRes = await request(app)
        .patch(`/api/admin/organizer-applications/${applicationId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(missingReasonRes.status).toBe(400);

      const rejectedAppDoc = {
        _id: applicationId,
        applicant: {
          _id: userId,
          fullName: 'Applicant Priya',
          email: 'priya@example.com',
          role: 'user',
        },
        organizationName: validPayload.organizationName,
        contactEmail: validPayload.contactEmail,
        status: 'rejected',
        rejectionReason: 'Insufficient event hosting details provided.',
        reviewedBy: adminId,
        reviewedAt: new Date(),
      };

      vi.spyOn(OrganizerApplication, 'findOneAndUpdate').mockReturnValue(
        mockQueryChain(rejectedAppDoc)
      );
      const logSpy = vi.spyOn(ModerationLog, 'create').mockResolvedValue({});

      const res = await request(app)
        .patch(`/api/admin/organizer-applications/${applicationId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Insufficient event hosting details provided.' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.application.status).toBe('rejected');
      expect(res.body.data.application.rejectionReason).toBe(
        'Insufficient event hosting details provided.'
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'reject_organizer_application',
          targetType: 'organizer_application',
          targetId: applicationId,
        })
      );
    });

    it('prevents duplicate or conflicting reviews on already-decided applications', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(adminUser);
      vi.spyOn(OrganizerApplication, 'findOneAndUpdate').mockReturnValue(mockQueryChain(null));
      vi.spyOn(OrganizerApplication, 'findById').mockResolvedValue({
        _id: applicationId,
        status: 'approved',
      });

      const res = await request(app)
        .patch(`/api/admin/organizer-applications/${applicationId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Conflicting decision attempt' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Organizer Studio Backend Access Control', () => {
    it('blocks normal users (pending or rejected applicants) from Organizer Studio APIs', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(normalUser);

      const studioListRes = await request(app)
        .get('/api/events/organizer/my-events')
        .set('Authorization', `Bearer ${userToken}`);
      expect(studioListRes.status).toBe(403);

      const createEventRes = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Unauthorized Event',
          description: 'Should be blocked by role middleware before approval.',
          category: 'Running',
          location: { city: 'Bengaluru', address: 'Cubbon Park' },
          startDateTime: new Date(Date.now() + 86400000).toISOString(),
          endDateTime: new Date(Date.now() + 90000000).toISOString(),
          capacity: 20,
        });
      expect(createEventRes.status).toBe(403);
    });

    it('grants Organizer Studio API access once user has organizer role', async () => {
      const newlyApprovedUser = new User({
        _id: userId,
        fullName: 'Applicant Priya',
        email: 'priya@example.com',
        role: 'organizer',
        isActive: true,
      });
      vi.spyOn(User, 'findById').mockResolvedValue(newlyApprovedUser);
      vi.spyOn(Event, 'find').mockReturnValue(mockQueryChain([]));
      vi.spyOn(Event, 'countDocuments').mockResolvedValue(0);
      vi.spyOn(Event, 'aggregate').mockResolvedValue([]);

      const res = await request(app)
        .get('/api/events/organizer/my-events')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});

