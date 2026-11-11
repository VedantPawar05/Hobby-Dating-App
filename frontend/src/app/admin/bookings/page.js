'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Ticket,
  Eye,
  X,
  CalendarDays,
  Users,
  MapPin,
  Info,
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
import {
  formatDateTime,
  formatPrice,
  getAvailableSlots,
} from '../../../utils/formatters.js';

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({ search: '', status: '', page: 1 });
  const [searchInput, setSearchInput] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedbackError, setFeedbackError] = useState('');

  const [selectedDetails, setSelectedDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getBookings({ ...filters, limit: 10 });
      setBookings(res?.data?.bookings || []);
      if (res?.data?.pagination) {
        setPagination(res.data.pagination);
      }
    } catch (err) {
      setError(err.message || 'Failed to load platform bookings.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, search: searchInput.trim(), page: 1 }));
  };

  const handleOpenDetails = async (bookingId) => {
    setFeedbackError('');
    setDetailsLoading(true);
    setSelectedDetails({ loading: true });
    try {
      const res = await adminService.getBookingDetails(bookingId);
      setSelectedDetails(res?.data?.booking || null);
    } catch (err) {
      setSelectedDetails(null);
      setFeedbackError(err.message || 'Could not load booking details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-surface-900">
          Booking Management
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Read-only oversight of event bookings, attendee statuses, and capacity utilization across the platform.
        </p>
      </div>

      <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/70 text-blue-900 flex items-start space-x-3">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed">
          Booking records are read-only in the admin panel to preserve booking integrity, attendee capacity counts, and member-initiated cancellation workflows.
        </p>
      </div>

      {feedbackError && (
        <div className="p-3.5 rounded-xl border bg-red-50 border-red-200 text-red-800 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{feedbackError}</span>
        </div>
      )}

      {/* Search & Status Filters */}
      <Card className="p-4">
        <form
          onSubmit={handleSearchSubmit}
          className="grid grid-cols-1 sm:grid-cols-4 gap-3"
        >
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by user name, email, event title, or city..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
            />
          </div>

          <select
            value={filters.status}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))
            }
            className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
          >
            <option value="">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <div className="flex items-center gap-2">
            <Button type="submit" variant="primary" size="sm" className="flex-1">
              Search
            </Button>
            {(filters.search || filters.status) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchInput('');
                  setFilters({ search: '', status: '', page: 1 });
                }}
              >
                Reset
              </Button>
            )}
          </div>
        </form>
      </Card>

      {loading ? (
        <LoadingState message="Loading platform bookings..." />
      ) : error ? (
        <ErrorState title="Unable to load bookings" message={error} onRetry={fetchBookings} />
      ) : bookings.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={Ticket}
            title="No bookings match your filters"
            description="Try clearing the status filter or searching with another member name, email, or event title."
            actionLabel={filters.search || filters.status ? 'Clear Filters' : undefined}
            onAction={() => {
              setSearchInput('');
              setFilters({ search: '', status: '', page: 1 });
            }}
          />
        </Card>
      ) : (
        <Card className="p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 pr-4">Attendee</th>
                  <th className="py-3 px-4">Event</th>
                  <th className="py-3 px-4">Capacity</th>
                  <th className="py-3 px-4">Booked Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 pl-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 text-sm">
                {bookings.map((booking) => {
                  const attendee = booking.user;
                  const event = booking.event;
                  const bookedCount = event?.bookedCount ?? 0;
                  const capacity = event?.capacity ?? 0;

                  return (
                    <tr key={booking._id} className="hover:bg-surface-50/70">
                      <td className="py-3.5 pr-4">
                        <p className="font-semibold text-surface-900">
                          {attendee?.fullName || 'Unknown User'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {attendee?.email || 'No email'}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-surface-900">
                          {event?.title || 'Deleted Event'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {event?.category || 'Activity'}
                          {event?.location?.city ? ` • ${event.location.city}` : ''}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-700">
                        <span className="font-semibold text-surface-900">
                          {bookedCount} / {capacity}
                        </span>{' '}
                        spots
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                        {formatDateTime(booking.bookedAt || booking.createdAt)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusBadge value={booking.status} />
                          {booking.checkedIn && (
                            <StatusBadge value="checked_in" label="Checked In" />
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 pl-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDetails(booking._id)}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1.5" />
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <PaginationBar
            pagination={pagination}
            onPageChange={(nextPage) => setFilters((prev) => ({ ...prev, page: nextPage }))}
          />
        </Card>
      )}

      {/* Read-only Booking Detail Modal */}
      {selectedDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-surface-200 shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-start justify-between border-b border-surface-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-surface-900">Booking Details</h3>
                <p className="text-xs text-slate-500">Read-only reservation &amp; capacity overview</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetails(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-surface-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {detailsLoading ? (
              <LoadingState message="Loading booking details..." />
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge value={selectedDetails.status} />
                  {selectedDetails.checkedIn && (
                    <StatusBadge value="checked_in" label="QR Checked In" />
                  )}
                  <span className="text-xs text-slate-500">
                    Booking ID: <span className="font-mono">{selectedDetails._id}</span>
                  </span>
                </div>

                {/* Attendee Card */}
                <div className="p-4 bg-surface-50 rounded-xl border border-surface-200 space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Attendee Information
                  </p>
                  <p className="text-sm font-bold text-surface-900">
                    {selectedDetails.user?.fullName || 'Unknown User'}
                  </p>
                  <p className="text-xs text-slate-600">
                    {selectedDetails.user?.email}
                    {selectedDetails.user?.city ? ` • ${selectedDetails.user.city}` : ''}
                  </p>
                  {selectedDetails.user?.role && (
                    <div className="pt-1 flex items-center gap-2">
                      <StatusBadge value={selectedDetails.user.role} />
                      <StatusBadge
                        value={selectedDetails.user.isActive !== false ? 'active' : 'suspended'}
                      />
                    </div>
                  )}
                </div>

                {/* Event & Capacity Card */}
                <div className="p-4 bg-surface-50 rounded-xl border border-surface-200 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Event &amp; Capacity
                  </p>
                  <p className="text-sm font-bold text-surface-900">
                    {selectedDetails.event?.title || 'Event unavailable'}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                    <p className="flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                      {selectedDetails.event?.startDateTime
                        ? formatDateTime(selectedDetails.event.startDateTime)
                        : 'No schedule'}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {[
                        selectedDetails.event?.location?.address,
                        selectedDetails.event?.location?.city,
                      ]
                        .filter(Boolean)
                        .join(', ') || 'No location'}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {selectedDetails.event?.bookedCount ?? 0} /{' '}
                      {selectedDetails.event?.capacity ?? 0} booked (
                      {getAvailableSlots(
                        selectedDetails.event?.bookedCount,
                        selectedDetails.event?.capacity
                      )}{' '}
                      left)
                    </p>
                    <p className="font-medium text-surface-800">
                      Price: {formatPrice(selectedDetails.event?.price)}
                    </p>
                  </div>
                  {selectedDetails.event?.organizer && (
                    <p className="text-xs text-slate-500 pt-1 border-t border-surface-200">
                      Organizer: {selectedDetails.event.organizer.fullName} (
                      {selectedDetails.event.organizer.email})
                    </p>
                  )}
                </div>

                {/* Timestamps */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white border border-surface-200 rounded-xl">
                    <p className="text-slate-500">Booked At</p>
                    <p className="font-semibold text-surface-900 mt-0.5">
                      {formatDateTime(selectedDetails.bookedAt || selectedDetails.createdAt)}
                    </p>
                  </div>
                  <div className="p-3 bg-white border border-surface-200 rounded-xl">
                    <p className="text-slate-500">
                      {selectedDetails.cancelledAt ? 'Cancelled At' : 'Check-in Time'}
                    </p>
                    <p className="font-semibold text-surface-900 mt-0.5">
                      {selectedDetails.cancelledAt
                        ? formatDateTime(selectedDetails.cancelledAt)
                        : selectedDetails.checkedInAt
                          ? formatDateTime(selectedDetails.checkedInAt)
                          : 'Not checked in'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

