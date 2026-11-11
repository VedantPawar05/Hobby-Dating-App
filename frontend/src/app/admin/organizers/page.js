'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Award, UserX, UserCheck, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import adminService from '../../../services/admin.service.js';
import Card from '../../../components/common/Card.js';
import Button from '../../../components/common/Button.js';
import LoadingState from '../../../components/common/LoadingState.js';
import ErrorState from '../../../components/common/ErrorState.js';
import EmptyState from '../../../components/common/EmptyState.js';
import ConfirmDialog from '../../../components/common/ConfirmDialog.js';
import StatusBadge from '../../../components/admin/StatusBadge.js';
import PaginationBar from '../../../components/admin/PaginationBar.js';
import { formatDate } from '../../../utils/formatters.js';

export default function AdminOrganizersPage() {
  const [organizers, setOrganizers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({ search: '', isActive: '', page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [dialogState, setDialogState] = useState({
    open: false,
    mode: null,
    organizer: null,
    submitting: false,
  });

  const fetchOrganizers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getOrganizers({ ...filters, limit: 10 });
      setOrganizers(res?.data?.organizers || []);
      if (res?.data?.pagination) setPagination(res.data.pagination);
    } catch (err) {
      setError(err.message || 'Failed to load organizer accounts.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchOrganizers();
  }, [fetchOrganizers]);

  const handleConfirmAction = async (reason) => {
    const { mode, organizer } = dialogState;
    if (!organizer) return;
    setDialogState((prev) => ({ ...prev, submitting: true }));
    setFeedback({ type: '', message: '' });

    try {
      if (mode === 'suspend') {
        await adminService.suspendUser(organizer._id, reason);
        setFeedback({ type: 'success', message: `Organizer ${organizer.fullName} suspended.` });
      } else {
        await adminService.reactivateUser(organizer._id, reason);
        setFeedback({ type: 'success', message: `Organizer ${organizer.fullName} reactivated.` });
      }
      setDialogState({ open: false, mode: null, organizer: null, submitting: false });
      fetchOrganizers();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update organizer status.' });
      setDialogState((prev) => ({ ...prev, submitting: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-surface-900">
          Organizer Management
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Inspect organizer accounts, track their hosted activity counts, and manage account access.
        </p>
      </div>

      {/* Honest dependency notice for organizer application workflow */}
      <div className="p-3.5 rounded-xl bg-surface-100 border border-surface-200 text-xs text-slate-700 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-brand-700 shrink-0 mt-0.5" />
        <span>
          Organizer accounts are currently assigned via the <code>organizer</code> role. No
          self-service organizer application workflow exists in the current backend, so this view
          manages active and suspended organizers directly.
        </span>
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
            <CheckCircle2 className="w-4 h-4 mr-2 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Search & Status Filter */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
              placeholder="Search organizers by name or email..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
            />
          </div>
          <select
            value={filters.isActive}
            onChange={(e) => setFilters((prev) => ({ ...prev, isActive: e.target.value, page: 1 }))}
            className="px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white focus:outline-none focus:border-brand-600"
          >
            <option value="">All Statuses</option>
            <option value="true">Active Organizers</option>
            <option value="false">Suspended Organizers</option>
          </select>
        </div>
      </Card>

      {/* Organizers List */}
      <Card className="p-4 sm:p-5">
        {loading ? (
          <LoadingState message="Loading organizers..." />
        ) : error ? (
          <ErrorState title="Could not load organizers" message={error} onRetry={fetchOrganizers} />
        ) : organizers.length === 0 ? (
          <EmptyState
            icon={Award}
            title="No organizers found"
            description="No organizer accounts match your current filters."
            actionLabel="Clear filters"
            onAction={() => setFilters({ search: '', isActive: '', page: 1 })}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {organizers.map((org) => (
                <div
                  key={org._id}
                  className="p-4 rounded-xl border border-surface-200 bg-white flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-surface-900">{org.fullName}</h3>
                        <p className="text-xs text-slate-500">{org.email}</p>
                      </div>
                      <StatusBadge value={org.isActive ? 'active' : 'suspended'} />
                    </div>
                    <p className="text-xs text-slate-600">
                      {org.city} • Joined {formatDate(org.createdAt)}
                    </p>
                    {org.bio && <p className="text-xs text-slate-600 line-clamp-2">{org.bio}</p>}
                  </div>

                  <div className="pt-3 border-t border-surface-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 text-xs text-slate-600">
                      <span>
                        <strong className="text-surface-900">
                          {org.eventStats?.totalEvents ?? 0}
                        </strong>{' '}
                        events
                      </span>
                      <span>
                        <strong className="text-emerald-700">
                          {org.eventStats?.publishedEvents ?? 0}
                        </strong>{' '}
                        published
                      </span>
                      <span>
                        <strong className="text-amber-700">
                          {org.eventStats?.pendingEvents ?? 0}
                        </strong>{' '}
                        pending
                      </span>
                    </div>

                    {org.isActive ? (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() =>
                          setDialogState({
                            open: true,
                            mode: 'suspend',
                            organizer: org,
                            submitting: false,
                          })
                        }
                      >
                        <UserX className="w-3.5 h-3.5 mr-1" />
                        Suspend
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          setDialogState({
                            open: true,
                            mode: 'reactivate',
                            organizer: org,
                            submitting: false,
                          })
                        }
                      >
                        <UserCheck className="w-3.5 h-3.5 mr-1" />
                        Reactivate
                      </Button>
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

      <ConfirmDialog
        isOpen={dialogState.open}
        title={
          dialogState.mode === 'suspend'
            ? `Suspend Organizer ${dialogState.organizer?.fullName}?`
            : `Reactivate Organizer ${dialogState.organizer?.fullName}?`
        }
        description={
          dialogState.mode === 'suspend'
            ? 'Suspended organizers cannot sign in or manage/create events until reactivated.'
            : 'Restores organizer access to sign in and host events.'
        }
        confirmLabel={dialogState.mode === 'suspend' ? 'Suspend Organizer' : 'Reactivate'}
        confirmVariant={dialogState.mode === 'suspend' ? 'danger' : 'primary'}
        showReason
        requireReason={dialogState.mode === 'suspend'}
        loading={dialogState.submitting}
        onConfirm={handleConfirmAction}
        onClose={() =>
          setDialogState({ open: false, mode: null, organizer: null, submitting: false })
        }
      />
    </div>
  );
}

