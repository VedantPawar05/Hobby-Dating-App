'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  CheckCircle2,
  XCircle,
  Ban,
  Eye,
  X,
  AlertCircle,
  CalendarDays,
  MapPin,
  Users,
} from 'lucide-react';
import adminService from '../../../services/admin.service.js';
import Card from '../../../components/common/Card.js';
import Button from '../../../components/common/Button.js';
import LoadingState from '../../../components/common/LoadingState.js';
import ErrorState from '../../../components/common/ErrorState.js';
import EmptyState from '../../../components/common/EmptyState.js';
import ConfirmDialog from '../../../components/common/ConfirmDialog.js';
import StatusBadge from '../../../components/admin/StatusBadge.js';
import PaginationBar from '../../../components/admin/PaginationBar.js';
import { EVENT_CATEGORIES } from '../../../constants/categories.js';
import { formatDateTime, formatPrice } from '../../../utils/formatters.js';

const STATUS_TABS = [
  { value: '', label: 'All Events' },
  { value: 'pending', label: 'Pending Approval' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

function AdminEventsContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') || '';

  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({
    search: '',
    status: initialStatus,
    category: '',
    page: 1,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const [selectedDetails, setSelectedDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [dialogState, setDialogState] = useState({
    open: false,
    mode: null,
    event: null,
    submitting: false,
  });

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getEvents({ ...filters, limit: 10 });
      setEvents(res?.data?.events || []);
      if (res?.data?.pagination) setPagination(res.data.pagination);
    } catch (err) {
      setError(err.message || 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    const paramStatus = searchParams.get('status') || '';
    setFilters((prev) =>
      prev.status === paramStatus ? prev : { ...prev, status: paramStatus, page: 1 }
    );
  }, [searchParams]);

  const handleOpenDetails = async (eventId) => {
    setDetailsLoading(true);
    setSelectedDetails({ loading: true });
    try {
      const res = await adminService.getEventDetails(eventId);
      setSelectedDetails(res?.data || null);
    } catch (err) {
      setSelectedDetails(null);
      setFeedback({ type: 'error', message: err.message || 'Failed to load event details.' });
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleConfirmModeration = async (reason) => {
    const { mode, event } = dialogState;
    if (!event) return;
    setDialogState((prev) => ({ ...prev, submitting: true }));
    setFeedback({ type: '', message: '' });

    try {
      if (mode === 'approve') {
        await adminService.approveEvent(event._id, reason);
        setFeedback({ type: 'success', message: `"${event.title}" approved and published.` });
      } else if (mode === 'reject') {
        await adminService.rejectEvent(event._id, reason);
        setFeedback({ type: 'success', message: `"${event.title}" has been rejected.` });
      } else if (mode === 'cancel') {
        await adminService.cancelEvent(event._id, reason);
        setFeedback({
          type: 'success',
          message: `"${event.title}" cancelled due to moderation.`,
        });
      }
      setDialogState({ open: false, mode: null, event: null, submitting: false });
      fetchEvents();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Moderation action failed.' });
      setDialogState((prev) => ({ ...prev, submitting: false }));
    }
  };

  const dialogConfig = {
    approve: {
      title: `Approve "${dialogState.event?.title}"?`,
      description: 'Approving this event publishes it immediately to the public activity feed.',
      confirmLabel: 'Approve & Publish',
      confirmVariant: 'primary',
      requireReason: false,
      placeholder: 'Optional approval note...',
    },
    reject: {
      title: `Reject "${dialogState.event?.title}"?`,
      description:
        'Rejecting moves this event out of the approval queue and records the reason in moderation logs.',
      confirmLabel: 'Reject Event',
      confirmVariant: 'danger',
      requireReason: true,
      placeholder: 'Explain why this event cannot be published...',
    },
    cancel: {
      title: `Cancel "${dialogState.event?.title}"?`,
      description:
        'Use moderation cancellation to take down inappropriate or policy-violating events from discovery.',
      confirmLabel: 'Cancel Event',
      confirmVariant: 'danger',
      requireReason: true,
      placeholder: 'Enter policy/safety reason for cancelling this event...',
    },
  };

  const activeDialog = dialogConfig[dialogState.mode] || dialogConfig.approve;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-surface-900">
          Event Management &amp; Approvals
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Review pending submissions, approve or reject events, and moderate published gatherings.
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
            <CheckCircle2 className="w-4 h-4 mr-2 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const active = filters.status === tab.value;
          return (
            <button
              key={tab.value || 'all'}
              type="button"
              onClick={() => setFilters((prev) => ({ ...prev, status: tab.value, page: 1 }))}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                active
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-slate-700 border-surface-200 hover:bg-surface-50'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search & Category Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
              placeholder="Search events by title..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
            />
          </div>
          <select
            value={filters.category}
            onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value, page: 1 }))}
            className="px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white focus:outline-none focus:border-brand-600"
          >
            <option value="">All Categories</option>
            {EVENT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Events List */}
      <Card className="p-4 sm:p-5">
        {loading ? (
          <LoadingState message="Loading events..." />
        ) : error ? (
          <ErrorState title="Could not load events" message={error} onRetry={fetchEvents} />
        ) : events.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No events match your filters"
            description="Try switching status tabs or clearing your search filters."
            actionLabel="Reset filters"
            onAction={() => setFilters({ search: '', status: '', category: '', page: 1 })}
          />
        ) : (
          <>
            <div className="space-y-3">
              {events.map((ev) => {
                const canApproveOrReject = ['pending', 'draft'].includes(ev.status);
                const canCancel = !['cancelled', 'completed'].includes(ev.status);

                return (
                  <div
                    key={ev._id}
                    className="p-4 rounded-xl border border-surface-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge value={ev.status} />
                        <span className="text-xs font-semibold text-brand-700 uppercase">
                          {ev.category}
                        </span>
                        <span className="text-xs text-slate-500">{formatPrice(ev.price)}</span>
                      </div>
                      <h3 className="font-bold text-surface-900 truncate">{ev.title}</h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                        <span className="inline-flex items-center">
                          <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          {ev.location?.city}
                        </span>
                        <span>{formatDateTime(ev.startDateTime)}</span>
                        <span className="inline-flex items-center">
                          <Users className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          {ev.bookedCount} / {ev.capacity} booked
                        </span>
                        <span>Host: {ev.organizer?.fullName || 'Unknown'}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDetails(ev._id)}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Details
                      </Button>

                      {canApproveOrReject && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() =>
                              setDialogState({
                                open: true,
                                mode: 'approve',
                                event: ev,
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
                              setDialogState({
                                open: true,
                                mode: 'reject',
                                event: ev,
                                submitting: false,
                              })
                            }
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}

                      {canCancel && ev.status === 'published' && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() =>
                            setDialogState({
                              open: true,
                              mode: 'cancel',
                              event: ev,
                              submitting: false,
                            })
                          }
                        >
                          <Ban className="w-3.5 h-3.5 mr-1" />
                          Take Down
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <PaginationBar
              pagination={pagination}
              onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
            />
          </>
        )}
      </Card>

      {/* Event Details Modal */}
      {selectedDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white border border-surface-200 rounded-2xl max-w-lg w-full shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-surface-900">Event Inspection</h3>
              <button
                type="button"
                onClick={() => setSelectedDetails(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-4 text-sm">
              {detailsLoading || selectedDetails.loading ? (
                <LoadingState message="Loading event details..." />
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-lg font-bold text-surface-900">
                        {selectedDetails.event?.title}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {selectedDetails.event?.category} •{' '}
                        {selectedDetails.event?.activityType || 'Community Gathering'}
                      </p>
                    </div>
                    <StatusBadge value={selectedDetails.event?.status} />
                  </div>
                  <p className="text-slate-700">{selectedDetails.event?.description}</p>
                  <div className="grid grid-cols-2 gap-3 bg-surface-50 p-3.5 rounded-xl border border-surface-100 text-xs">
                    <div>
                      <p className="text-slate-500">Organizer</p>
                      <p className="font-semibold text-surface-900">
                        {selectedDetails.event?.organizer?.fullName}
                      </p>
                      <p className="text-slate-500">{selectedDetails.event?.organizer?.email}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Capacity</p>
                      <p className="font-semibold text-surface-900">
                        {selectedDetails.event?.bookedCount} / {selectedDetails.event?.capacity}{' '}
                        spots
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Location</p>
                      <p className="font-semibold text-surface-900">
                        {selectedDetails.event?.location?.city}
                      </p>
                      <p className="text-slate-500">{selectedDetails.event?.location?.address}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Schedule</p>
                      <p className="font-semibold text-surface-900">
                        {formatDateTime(selectedDetails.event?.startDateTime)}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Moderation Confirmation */}
      <ConfirmDialog
        isOpen={dialogState.open}
        title={activeDialog.title}
        description={activeDialog.description}
        confirmLabel={activeDialog.confirmLabel}
        confirmVariant={activeDialog.confirmVariant}
        showReason
        requireReason={activeDialog.requireReason}
        reasonPlaceholder={activeDialog.placeholder}
        loading={dialogState.submitting}
        onConfirm={handleConfirmModeration}
        onClose={() => setDialogState({ open: false, mode: null, event: null, submitting: false })}
      />
    </div>
  );
}

export default function AdminEventsPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading event management..." />}>
      <AdminEventsContent />
    </Suspense>
  );
}

