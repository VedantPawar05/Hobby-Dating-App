'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Award,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ArrowRight,
  History,
} from 'lucide-react';
import ProtectedRoute from '../../../components/auth/ProtectedRoute.js';
import { useAuth } from '../../../context/AuthContext.js';
import organizerApplicationService from '../../../services/organizer-application.service.js';
import { EVENT_CATEGORIES } from '../../../constants/categories.js';
import Card, { CardHeader, CardBody } from '../../../components/common/Card.js';
import Button from '../../../components/common/Button.js';
import Input from '../../../components/common/Input.js';
import LoadingState from '../../../components/common/LoadingState.js';
import StatusBadge from '../../../components/admin/StatusBadge.js';
import { formatDateTime } from '../../../utils/formatters.js';

const CATEGORY_CHOICES = EVENT_CATEGORIES.filter((c) => c !== 'All');

function BecomeOrganizerContent() {
  const { user, checkAuth } = useAuth();

  const [applications, setApplications] = useState([]);
  const [latestApplication, setLatestApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState({
    organizationName: '',
    hostingCity: user?.city || '',
    hobbyCategories: [],
    experience: '',
    reason: '',
    contactEmail: user?.email || '',
    contactPhone: '',
    websiteOrSocial: '',
  });

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      hostingCity: prev.hostingCity || user?.city || '',
      contactEmail: prev.contactEmail || user?.email || '',
    }));
  }, [user]);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await organizerApplicationService.getMyApplications({ limit: 20 });
      const data = res?.data;
      setApplications(data?.applications || []);
      setLatestApplication(data?.latestApplication || null);

      // Refresh auth user if application was approved while session was active
      if (data?.latestApplication?.status === 'approved' && user?.role === 'user') {
        await checkAuth();
      }
    } catch (err) {
      setError(err.message || 'Could not load your organizer application status.');
    } finally {
      setLoading(false);
    }
  }, [checkAuth, user?.role]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const toggleCategory = (category) => {
    setFormData((prev) => {
      const exists = prev.hobbyCategories.includes(category);
      if (exists) {
        return {
          ...prev,
          hobbyCategories: prev.hobbyCategories.filter((c) => c !== category),
        };
      }
      if (prev.hobbyCategories.length >= 10) return prev;
      return {
        ...prev,
        hobbyCategories: [...prev.hobbyCategories, category],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      await organizerApplicationService.submitApplication(formData);
      setSuccessMessage('Your organizer application has been submitted and is pending admin review.');
      setFormData((prev) => ({
        ...prev,
        organizationName: '',
        hobbyCategories: [],
        experience: '',
        reason: '',
        websiteOrSocial: '',
      }));
      await fetchApplications();
    } catch (err) {
      const firstValidation = err?.errors?.[0]?.message;
      setError(firstValidation || err.message || 'Failed to submit organizer application.');
    } finally {
      setSubmitting(false);
    }
  };

  const isAlreadyOrganizer = user?.role === 'organizer' || user?.role === 'admin';
  const hasPending = latestApplication?.status === 'pending';

  if (loading) {
    return <LoadingState message="Loading organizer application status..." />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-surface-900">
            Become an Event Organizer
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Apply to host curated hobby clubs, run clubs, and community meetups on Ricoz.
          </p>
        </div>
        {isAlreadyOrganizer && (
          <Link href="/organizer">
            <Button variant="primary" size="md">
              Open Organizer Studio
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>
        )}
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Current Status Banner */}
      {isAlreadyOrganizer ? (
        <Card className="p-6 border-emerald-200 bg-emerald-50/40">
          <div className="flex items-start gap-3">
            <Award className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="text-base font-bold text-surface-900">
                You Have Verified Organizer Access
              </h2>
              <p className="text-sm text-slate-600">
                Your account ({user?.role}) is authorized to create events, manage attendees, and run
                QR check-ins in Organizer Studio.
              </p>
            </div>
          </div>
        </Card>
      ) : hasPending ? (
        <Card className="p-6 border-amber-200 bg-amber-50/40">
          <div className="flex items-start gap-3">
            <Clock className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-surface-900">Application Under Review</h2>
                <StatusBadge value="pending" />
              </div>
              <p className="text-sm text-slate-700">
                Your application for{' '}
                <span className="font-semibold">{latestApplication.organizationName}</span> was
                submitted on {formatDateTime(latestApplication.createdAt)}. You will gain access to
                Organizer Studio once an administrator approves it.
              </p>
            </div>
          </div>
        </Card>
      ) : latestApplication?.status === 'rejected' ? (
        <Card className="p-6 border-red-200 bg-red-50/40">
          <div className="flex items-start gap-3">
            <XCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-surface-900">
                  Previous Application Rejected
                </h2>
                <StatusBadge value="rejected" />
              </div>
              <p className="text-sm text-red-800 font-medium">
                Reason: {latestApplication.rejectionReason || 'No reason provided.'}
              </p>
              <p className="text-xs text-slate-600">
                You may submit a new application below with updated details.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      {/* Application Submission Form (visible for normal users with no pending application) */}
      {!isAlreadyOrganizer && !hasPending && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-bold text-surface-900">Organizer Application Form</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tell our moderation team about your club, hosting experience, and safety practices.
            </p>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Organization / Club Name"
                  name="organizationName"
                  value={formData.organizationName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, organizationName: e.target.value }))
                  }
                  placeholder="e.g., Cubbon Park Dawn Runners"
                  required
                />
                <Input
                  label="Primary Hosting City"
                  name="hostingCity"
                  value={formData.hostingCity}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, hostingCity: e.target.value }))
                  }
                  placeholder="e.g., Bengaluru"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Contact Email"
                  name="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, contactEmail: e.target.value }))
                  }
                  required
                />
                <Input
                  label="Contact Phone"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, contactPhone: e.target.value }))
                  }
                  placeholder="e.g., +91 98765 43210"
                  required
                />
              </div>

              <Input
                label="Website or Social Link (Optional)"
                name="websiteOrSocial"
                type="url"
                value={formData.websiteOrSocial}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, websiteOrSocial: e.target.value }))
                }
                placeholder="https://instagram.com/yourclub"
              />

              <div>
                <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider text-surface-700">
                  Hobby Categories You Plan to Host
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORY_CHOICES.map((cat) => {
                    const selected = formData.hobbyCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                          selected
                            ? 'bg-brand-600 text-white border-brand-600'
                            : 'bg-white text-slate-600 border-surface-200 hover:bg-surface-50'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider text-surface-700">
                  Hosting & Community Experience <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={formData.experience}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, experience: e.target.value }))
                  }
                  placeholder="Describe previous clubs, group meetups, or events you have led (minimum 20 characters)..."
                  minLength={20}
                  maxLength={1500}
                  required
                  className="w-full px-3.5 py-2.5 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
                />
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider text-surface-700">
                  Reason for Applying <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={formData.reason}
                  onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
                  placeholder="Share the kinds of hobby sessions you want to host and how you keep attendees safe (minimum 20 characters)..."
                  minLength={20}
                  maxLength={1500}
                  required
                  className="w-full px-3.5 py-2.5 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" variant="primary" size="md" loading={submitting}>
                  Submit Organizer Application
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* Application History */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <h2 className="text-base font-bold text-surface-900">
              Application History ({applications.length})
            </h2>
          </div>
        </CardHeader>
        <CardBody>
          {applications.length === 0 ? (
            <p className="text-sm text-slate-500">You have not submitted any organizer applications yet.</p>
          ) : (
            <div className="divide-y divide-surface-100">
              {applications.map((app) => (
                <div key={app._id} className="py-3.5 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-surface-900">
                        {app.organizationName}
                      </span>
                      <StatusBadge value={app.status} />
                    </div>
                    <span className="text-xs text-slate-500">{formatDateTime(app.createdAt)}</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    City: {app.hostingCity} • Contact: {app.contactEmail}
                  </p>
                  {app.reviewedAt && (
                    <p className="text-xs text-slate-500">
                      Reviewed on {formatDateTime(app.reviewedAt)}
                      {app.reviewedBy?.fullName ? ` by ${app.reviewedBy.fullName}` : ''}
                    </p>
                  )}
                  {app.status === 'rejected' && app.rejectionReason && (
                    <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5 mt-1">
                      Rejection reason: {app.rejectionReason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

export default function BecomeOrganizerPage() {
  return (
    <ProtectedRoute>
      <BecomeOrganizerContent />
    </ProtectedRoute>
  );
}

