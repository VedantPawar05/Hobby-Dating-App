'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileCheck2,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  AlertCircle,
} from 'lucide-react';
import adminService from '../../../services/admin.service.js';
import Card from '../../../components/common/Card.js';
import Button from '../../../components/common/Button.js';
import LoadingState from '../../../components/common/LoadingState.js';
import ErrorState from '../../../components/common/ErrorState.js';
import EmptyState from '../../../components/common/EmptyState.js';
import StatusBadge from '../../../components/admin/StatusBadge.js';
import PaginationBar from '../../../components/admin/PaginationBar.js';
import ConfirmDialog from '../../../components/common/ConfirmDialog.js';
import { formatDateTime } from '../../../utils/formatters.js';

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export default function AdminOrganizerApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({ status: 'pending', search: '', page: 1 });
  const [searchInput, setSearchInput] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const [detailApp, setDetailApp] = useState(null);
  const [confirmState, setConfirmState] = useState({
    open: false,
    mode: null,
    application: null,
    submitting: false,
  });

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getOrganizerApplications({ ...filters, limit: 10 });
      setApplications(res?.data?.applications || []);
      if (res?.data?.pagination) {
        setPagination(res.data.pagination);
      }
    } catch (err) {
      setError(err.message || 'Failed to load organizer applications.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, search: searchInput.trim(), page: 1 }));
  };

  const handleConfirmDecision = async (reason) => {
    const { mode, application } = confirmState;
    if (!application) return;

    setConfirmState((prev) => ({ ...prev, submitting: true }));
    setFeedback({ type: '', message: '' });

    try {
      if (mode === 'approve') {
        await adminService.approveOrganizerApplication(application._id, reason);
        setFeedback({
          type: 'success',
          message: `Approved "${application.organizationName}" — ${
            application.applicant?.fullName || 'User'
          } is now an Organizer.`,
        });
      } else {
        await adminService.rejectOrganizerApplication(application._id, reason);
        setFeedback({
          type: 'success',
          message: `Rejected organizer application for "${application.organizationName}".`,
        });
      }
      setConfirmState({ open: false, mode: null, application: null, submitting: false });
      if (detailApp?._id === application._id) {
        setDetailApp(null);
      }
      fetchApplications();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Could not process organizer application decision.',
      });
      setConfirmState((prev) => ({ ...prev, submitting: false }));
    }
  };

  const isApprove = confirmState.mode === 'approve';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-surface-900">
          Organizer Applications
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Review member applications to host activities and grant verified Organizer access.
        </p>
      </div>

      {feedback.message && (
        <div
          className={`p-3.5 rounded-xl text-sm flex items-center ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 mr-2 text-red-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <Card className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value || 'all'}
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, status: tab.value, page: 1 }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filters.status === tab.value
                    ? 'bg-brand-600 text-white'
                    : 'bg-surface-100 text-slate-600 hover:bg-surface-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-grow sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search club, city, or applicant..."
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
              />
            </div>
            <Button type="submit" variant="outline" size="sm">
              Search
            </Button>
          </form>
        </div>

        {loading ? (
          <LoadingState message="Loading organizer applications..." />
        ) : error ? (
          <ErrorState title="Unable to load applications" message={error} onRetry={fetchApplications} />
        ) : applications.length === 0 ? (
          <EmptyState
            icon={FileCheck2}
            title="No organizer applications found"
            message="Applications matching your current filter will appear here."
          />
        ) : (
          <>
            <div className="divide-y divide-surface-100">
              {applications.map((app) => (
                <div
                  key={app._id}
                  className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-surface-900 truncate">
                        {app.organizationName}
                      </h3>
                      <StatusBadge value={app.status} />
                      <span className="text-xs text-slate-500">{app.hostingCity}</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Applicant:{' '}
                      <span className="font-semibold text-surface-800">
                        {app.applicant?.fullName || 'Member'}
                      </span>{' '}
                      ({app.applicant?.email || app.contactEmail}) • Submitted{' '}
                      {formatDateTime(app.createdAt)}
                    </p>
                    {app.hobbyCategories?.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {app.hobbyCategories.map((cat) => (
                          <span
                            key={cat}
                            className="px-2 py-0.5 rounded-md bg-surface-100 text-slate-700 text-[11px] font-medium"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}
                    {app.status === 'rejected' && app.rejectionReason && (
                      <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1 mt-1">
                        Rejection reason: {app.rejectionReason}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDetailApp(app)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      View
                    </Button>

                    {app.status === 'pending' && (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() =>
                            setConfirmState({
                              open: true,
                              mode: 'approve',
                              application: app,
                              submitting: false,
                            })
                          }
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() =>
                            setConfirmState({
                              open: true,
                              mode: 'reject',
                              application: app,
                              submitting: false,
                            })
                          }
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <PaginationBar
              pagination={pagination}
              onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
            />
          </>
        )}
      </Card>

      {/* Application Detail Modal */}
      {detailApp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-surface-200 rounded-2xl max-w-xl w-full shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-surface-900">
                  {detailApp.organizationName}
                </h3>
                <p className="text-xs text-slate-500">
                  Submitted {formatDateTime(detailApp.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailApp(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-surface-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <StatusBadge value={detailApp.status} />
                <span className="text-xs text-slate-500">City: {detailApp.hostingCity}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-surface-50 rounded-xl border border-surface-200 text-xs">
                <div>
                  <p className="text-slate-500 font-semibold uppercase">Applicant</p>
                  <p className="font-bold text-surface-900 mt-0.5">
                    {detailApp.applicant?.fullName || 'N/A'}
                  </p>
                  <p className="text-slate-600">{detailApp.applicant?.email}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-semibold uppercase">Contact</p>
                  <p className="text-surface-900 mt-0.5">{detailApp.contactEmail}</p>
                  <p className="text-slate-600">{detailApp.contactPhone}</p>
                  {detailApp.websiteOrSocial && (
                    <a
                      href={detailApp.websiteOrSocial}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-700 hover:underline break-all"
                    >
                      {detailApp.websiteOrSocial}
                    </a>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Hosting Experience
                </h4>
                <p className="text-slate-700 whitespace-pre-line">{detailApp.experience}</p>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Reason for Applying
                </h4>
                <p className="text-slate-700 whitespace-pre-line">{detailApp.reason}</p>
              </div>

              {detailApp.reviewedAt && (
                <div className="p-3 rounded-xl bg-surface-50 border border-surface-200 text-xs space-y-1">
                  <p className="font-semibold text-surface-800">
                    Reviewed by {detailApp.reviewedBy?.fullName || 'Admin'} on{' '}
                    {formatDateTime(detailApp.reviewedAt)}
                  </p>
                  {detailApp.rejectionReason && (
                    <p className="text-red-700">Rejection reason: {detailApp.rejectionReason}</p>
                  )}
                  {detailApp.decisionNote && !detailApp.rejectionReason && (
                    <p className="text-slate-600">Note: {detailApp.decisionNote}</p>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 border-t border-surface-100 flex items-center justify-end gap-2">
              {detailApp.status === 'pending' && (
                <>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() =>
                      setConfirmState({
                        open: true,
                        mode: 'reject',
                        application: detailApp,
                        submitting: false,
                      })
                    }
                  >
                    Reject
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() =>
                      setConfirmState({
                        open: true,
                        mode: 'approve',
                        application: detailApp,
                        submitting: false,
                      })
                    }
                  >
                    Approve & Promote
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={() => setDetailApp(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmState.open}
        title={
          isApprove
            ? `Approve "${confirmState.application?.organizationName}"?`
            : `Reject "${confirmState.application?.organizationName}"?`
        }
        description={
          isApprove
            ? `This grants ${
                confirmState.application?.applicant?.fullName || 'the applicant'
              } the Organizer role and unlocks Organizer Studio.`
            : 'Please provide a clear rejection reason so the applicant understands what to improve.'
        }
        confirmLabel={isApprove ? 'Approve & Grant Organizer Role' : 'Reject Application'}
        confirmVariant={isApprove ? 'primary' : 'danger'}
        showReason={true}
        requireReason={!isApprove}
        reasonLabel={isApprove ? 'Approval Note (Optional)' : 'Rejection Reason'}
        reasonPlaceholder={
          isApprove
            ? 'Optional note recorded in moderation logs...'
            : 'Explain why this application was rejected (minimum 3 characters)...'
        }
        loading={confirmState.submitting}
        onConfirm={handleConfirmDecision}
        onClose={() =>
          setConfirmState({ open: false, mode: null, application: null, submitting: false })
        }
      />
    </div>
  );
}

