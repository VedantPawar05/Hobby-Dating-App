'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  CalendarDays,
  Users,
  Edit3,
  Trash2,
  Ban,
  Send,
  QrCode,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import ProtectedRoute from '../../../components/auth/ProtectedRoute.js';
import { useAuth } from '../../../context/AuthContext.js';
import eventService from '../../../services/event.service.js';
import Card from '../../../components/common/Card.js';
import Button from '../../../components/common/Button.js';
import LoadingState from '../../../components/common/LoadingState.js';
import ErrorState from '../../../components/common/ErrorState.js';
import EmptyState from '../../../components/common/EmptyState.js';
import ConfirmDialog from '../../../components/common/ConfirmDialog.js';
import StatusBadge from '../../../components/admin/StatusBadge.js';
import PaginationBar from '../../../components/admin/PaginationBar.js';
import EventFormModal from '../../../components/organizer/EventFormModal.js';
import { formatDateTime, formatPrice } from '../../../utils/formatters.js';

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'pending', label: 'Pending' },
  { value: 'draft', label: 'Draft' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

function OrganizerStudioContent() {
  const { user } = useAuth();
  const isAuthorized = user?.role === 'organizer' || user?.role === 'admin';

  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    pending: 0,
    published: 0,
    rejected: 0,
    cancelled: 0,
    completed: 0,
    totalBooked: 0,
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({ status: '', search: '', page: 1 });
  const [searchInput, setSearchInput] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const [formModal, setFormModal] = useState({ open: false, event: null });
  const [confirmState, setConfirmState] = useState({
    open: false,
    mode: null,
    event: null,
    submitting: false,
  });

  const fetchMyEvents = useCallback(async () => {
    if (!isAuthorized) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await eventService.getOrganizerEvents({ ...filters, limit: 10 });
      setEvents(res?.data?.events || []);
      if (res?.data?.pagination) setPagination(res.data.pagination);
      if (res?.data?.stats) setStats(res.data.stats);
    } catch (err) {
      setError(err.message || 'Failed to load your organized activities.');
    } finally {
      setLoading(false);
    }
  }, [filters, isAuthorized]);

  useEffect(() => {
    fetchMyEvents();
  }, [fetchMyEvents]);

  if (!isAuthorized) {
    return (
      <div className="max-w-lg mx-auto my-12">
        <Card className="p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-surface-900">Organizer Access Required</h1>
          <p className="text-sm text-slate-600">
            Only verified community organizers or platform administrators can host and manage
            events. Contact an admin to promote your account.
          </p>
          <Link href="/events">
            <Button variant="primary" size="sm">
              Explore Activities
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const handleConfirmAction = async () => {
    const { mode, event } = confirmState;
    if (!event) return;

    setConfirmState((prev) => ({ ...prev, submitting: true }));
    setFeedback({ type: '', message: '' });

    try {
      if (mode === 'delete') {
        await eventService.deleteEvent(event._id);
        setFeedback({ type: 'success', message: `"${event.title}" has been deleted.` });
      } else if (mode === 'cancel') {
        await eventService.updateEvent(event._id, { status: 'cancelled' });
        setFeedback({ type: 'success', message: `"${event.title}" has been cancelled.` });
      } else if (mode === 'submit') {
        await eventService.updateEvent(event._id, { status: 'pending' });
        setFeedback({
          type: 'success',
          message: `"${event.title}" submitted for admin approval.`,
        });
      }
      setConfirmState({ open: false, mode: null, event: null, submitting: false });
      fetchMyEvents();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Action failed.' });
      setConfirmState((prev) => ({ ...prev, submitting: false }));
    }
  };

  const statCards = [
    { label: 'Total Hosted', value: stats.total },
    { label: 'Published', value: stats.published },
    { label: 'Pending / Draft', value: (stats.pending || 0) + (stats.draft || 0) },
    { label: 'Completed', value: stats.completed },
    { label: 'Total Attendees', value: stats.totalBooked },
  ];

  const dialogContent = {
    delete: {
      title: `Delete "${confirmState.event?.title}"?`,
      description: 'This permanently deletes the event listing because it has zero bookings.',
      confirmLabel: 'Delete Event',
      variant: 'danger',
    },
    cancel: {
      title: `Cancel "${confirmState.event?.title}"?`,
      description:
        'Cancelling takes this event offline from discovery while preserving booking records.',
      confirmLabel: 'Cancel Event',
      variant: 'danger',
    },
    submit: {
      title: `Submit "${confirmState.event?.title}" for Approval?`,
      description: 'Moves this event to Pending status so admins can review and publish it.',
      confirmLabel: 'Submit for Review',
      variant: 'primary',
    },
  };
  const activeDialog = dialogContent[confirmState.mode] || dialogContent.submit;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-surface-900">
            Organizer Studio
          </h1>
          <p className="text-sm text-surface-600 mt-1">
            Create, manage, and verify QR check-ins for your hosted activities.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setFormModal({ open: true, event: null })}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Create Activity
        </Button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {statCards.map((item) => (
          <Card key={item.label} className="p-4">
            <p className="text-xs font-medium text-slate-500">{item.label}</p>
            <p className="text-2xl font-extrabold text-surface-900 mt-1">{item.value ?? 0}</p>
          </Card>
        ))}
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

      {/* Status Tabs & Search */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value || 'all'}
              type="button"
              onClick={() => setFilters((prev) => ({ ...prev, status: tab.value, page: 1 }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filters.status === tab.value
                  ? 'bg-brand-600 text-white'
                  : 'bg-surface-100 text-slate-700 hover:bg-surface-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setFilters((prev) => ({ ...prev, search: searchInput.trim(), page: 1 }));
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search your events by title, activity type, or city..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
            />
          </div>
          <Button type="submit" variant="primary" size="sm">
            Search
          </Button>
          {(filters.search || filters.status) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchInput('');
                setFilters({ status: '', search: '', page: 1 });
              }}
            >
              Reset
            </Button>
          )}
        </form>
      </Card>

      {/* Events List */}
      <Card className="p-4 sm:p-5">
        {loading ? (
          <LoadingState message="Loading your organized activities..." />
        ) : error ? (
          <ErrorState title="Could not load events" message={error} onRetry={fetchMyEvents} />
        ) : events.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No activities found"
            description="Create your first community activity or clear active filters to view your listings."
            actionLabel="Create Activity"
            onAction={() => setFormModal({ open: true, event: null })}
          />
        ) : (
          <>
            <div className="space-y-3">
              {events.map((ev) => {
                const isMutable = !['cancelled', 'completed'].includes(ev.status);
                const hasStarted = new Date(ev.startDateTime) <= new Date();

                return (
                  <div
                    key={ev._id}
                    className="p-4 rounded-xl border border-surface-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-surface-50/50"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge value={ev.status} />
                        <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full">
                          {ev.category}
                        </span>
                        <span className="text-xs font-semibold text-surface-700">
                          {formatPrice(ev.price)}
                        </span>
                      </div>
                      <h3 className="font-bold text-base text-surface-900 truncate">{ev.title}</h3>
                      <p className="text-xs text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>{formatDateTime(ev.startDateTime)}</span>
                        <span>
                          {ev.location?.city} • {ev.location?.address}
                        </span>
                        <span className="inline-flex items-center font-semibold text-surface-800">
                          <Users className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          {ev.bookedCount ?? 0} / {ev.capacity} booked
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Link href={`/organizer/events/${ev._id}`}>
                        <Button variant="primary" size="sm">
                          <QrCode className="w-3.5 h-3.5 mr-1.5" />
                          Attendees &amp; Check-In
                        </Button>
                      </Link>

                      {isMutable && !hasStarted && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setFormModal({ open: true, event: ev })}
                        >
                          <Edit3 className="w-3.5 h-3.5 mr-1" />
                          Edit
                        </Button>
                      )}

                      {['draft', 'rejected'].includes(ev.status) && !hasStarted && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setConfirmState({
                              open: true,
                              mode: 'submit',
                              event: ev,
                              submitting: false,
                            })
                          }
                        >
                          <Send className="w-3.5 h-3.5 mr-1" />
                          Submit
                        </Button>
                      )}

                      {isMutable && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-rose-600 border-rose-200 hover:bg-rose-50"
                          onClick={() =>
                            setConfirmState({
                              open: true,
                              mode: 'cancel',
                              event: ev,
                              submitting: false,
                            })
                          }
                        >
                          <Ban className="w-3.5 h-3.5 mr-1" />
                          Cancel
                        </Button>
                      )}

                      {(ev.bookedCount ?? 0) === 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() =>
                            setConfirmState({
                              open: true,
                              mode: 'delete',
                              event: ev,
                              submitting: false,
                            })
                          }
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Delete
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

      <EventFormModal
        isOpen={formModal.open}
        initialEvent={formModal.event}
        onClose={() => setFormModal({ open: false, event: null })}
        onSaved={(savedEvent, isEditing) => {
          setFeedback({
            type: 'success',
            message: isEditing
              ? `"${savedEvent?.title}" updated successfully.`
              : `"${savedEvent?.title}" created successfully.`,
          });
          fetchMyEvents();
        }}
      />

      <ConfirmDialog
        isOpen={confirmState.open}
        title={activeDialog.title}
        description={activeDialog.description}
        confirmLabel={activeDialog.confirmLabel}
        confirmVariant={activeDialog.variant}
        loading={confirmState.submitting}
        onConfirm={handleConfirmAction}
        onClose={() => setConfirmState({ open: false, mode: null, event: null, submitting: false })}
      />
    </div>
  );
}

export default function OrganizerDashboardPage() {
  return (
    <ProtectedRoute>
      <OrganizerStudioContent />
    </ProtectedRoute>
  );
}
