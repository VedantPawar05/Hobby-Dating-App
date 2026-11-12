'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ProtectedRoute from '../../../components/auth/ProtectedRoute.js';
import { useAuth } from '../../../context/AuthContext.js';
import { eventService } from '../../../services/event.service.js';
import reportService from '../../../services/report.service.js';
import Card from '../../../components/common/Card.js';
import Button from '../../../components/common/Button.js';
import LoadingState from '../../../components/common/LoadingState.js';
import EmptyState from '../../../components/common/EmptyState.js';
import StatusBadge from '../../../components/admin/StatusBadge.js';
import {
  Calendar,
  MapPin,
  Compass,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  QrCode,
  X,
  Flag,
} from 'lucide-react';
import { formatDateTime, formatPrice } from '../../../utils/formatters.js';

function DashboardContent() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [myReports, setMyReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [feedback, setFeedback] = useState({ type: null, message: '' });

  // QR Ticket Modal state
  const [ticketModal, setTicketModal] = useState({
    open: false,
    loading: false,
    error: '',
    data: null,
  });

  const fetchHubData = useCallback(async () => {
    setLoading(true);
    try {
      const [bookingsRes, reportsRes] = await Promise.all([
        eventService.getMyBookings({ limit: 20 }),
        reportService.getMyReports({ limit: 10 }).catch(() => null),
      ]);
      if (bookingsRes?.data?.bookings) {
        setBookings(bookingsRes.data.bookings);
      }
      if (reportsRes?.data?.reports) {
        setMyReports(reportsRes.data.reports);
      }
    } catch {
      // Handle gracefully
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHubData();
  }, [fetchHubData]);

  const handleOpenTicket = async (bookingId) => {
    setTicketModal({ open: true, loading: true, error: '', data: null });
    try {
      const res = await eventService.getBookingTicket(bookingId);
      setTicketModal({
        open: true,
        loading: false,
        error: '',
        data: res?.data || null,
      });
    } catch (err) {
      setTicketModal({
        open: true,
        loading: false,
        error: err.message || 'Unable to generate QR check-in ticket.',
        data: null,
      });
    }
  };

  const handleCancelBooking = async (bookingId) => {
    setActionLoading(bookingId);
    setFeedback({ type: null, message: '' });

    try {
      await eventService.cancelBooking(bookingId);
      setFeedback({
        type: 'success',
        message: 'Booking cancelled successfully.',
      });
      fetchHubData();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to cancel booking.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const confirmedBookings = bookings.filter((b) => b.status === 'confirmed');
  const pastBookings = bookings.filter((b) => b.status === 'cancelled');

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-brand-600 to-teal-800 rounded-3xl p-6 sm:p-8 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full font-bold">
            Member Hub
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2">
            Welcome, {user?.fullName || 'Runner'}!
          </h1>
          <p className="text-sm text-brand-100 max-w-lg mt-1">
            Track your upcoming run clubs, QR entry passes, trail sessions, and hobby events.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          {(user?.role === 'organizer' || user?.role === 'admin') && (
            <Link href="/organizer">
              <Button variant="outline" size="md" className="bg-white/10 text-white border-white/30 hover:bg-white/20">
                Organizer Studio
              </Button>
            </Link>
          )}
          <Link href="/events">
            <Button variant="secondary" size="md" className="shrink-0 font-semibold">
              <Compass className="w-4 h-4 mr-1.5" />
              Discover New Activities
            </Button>
          </Link>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback.message && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center ${
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

      {/* Booked Events Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-surface-900">
            My Registered Activities ({confirmedBookings.length})
          </h2>
          <Link
            href="/events"
            className="text-xs font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center"
          >
            Find more <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        {loading ? (
          <LoadingState message="Loading your activity bookings..." />
        ) : confirmedBookings.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No upcoming activities booked"
            description="You haven't signed up for any activities yet. Join a 5K run, hiking trip, or hobby session!"
            actionLabel="Explore All Activities"
            onAction={() => window.location.assign('/events')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {confirmedBookings.map((b) => {
              const eventItem = b.event;
              if (!eventItem) return null;
              return (
                <Card key={b._id} className="p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full">
                        {eventItem.category}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Confirmed
                        </span>
                        {b.checkedIn && (
                          <span className="text-xs font-semibold text-brand-800 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-md">
                            Checked In
                          </span>
                        )}
                      </div>
                    </div>

                    <Link href={`/events/${eventItem._id}`}>
                      <h3 className="font-bold text-base text-surface-900 hover:text-brand-700 transition-colors">
                        {eventItem.title}
                      </h3>
                    </Link>

                    <div className="space-y-1 text-xs text-surface-600 pt-1">
                      <div className="flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-2 text-surface-400 shrink-0" />
                        <span>{formatDateTime(eventItem.startDateTime)}</span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="w-3.5 h-3.5 mr-2 text-surface-400 shrink-0" />
                        <span>
                          {eventItem.location?.city} • {eventItem.location?.address}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-surface-100 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-surface-900">
                      {formatPrice(eventItem.price)}
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenTicket(b._id)}
                      >
                        <QrCode className="w-3.5 h-3.5 mr-1.5" />
                        QR Ticket
                      </Button>

                      {eventItem.endDateTime &&
                        new Date(eventItem.endDateTime) <= new Date() &&
                        (b.checkedIn ? (
                          <Link href={`/events/${eventItem._id}/mixer`}>
                            <Button variant="primary" size="sm">
                              24h Mixer
                            </Button>
                          </Link>
                        ) : (
                          <span className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
                            QR Check-in Required
                          </span>
                        ))}

                      <Link href={`/events/${eventItem._id}`}>
                        <Button variant="outline" size="sm">
                          Details
                        </Button>
                      </Link>
                      {!b.checkedIn && (
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={actionLoading === b._id}
                          onClick={() => handleCancelBooking(b._id)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancelled Bookings List */}
      {pastBookings.length > 0 && (
        <div className="pt-6 border-t border-surface-200 space-y-3">
          <h3 className="text-sm font-bold text-surface-600 uppercase tracking-wider">
            Cancelled Bookings ({pastBookings.length})
          </h3>
          <div className="space-y-2">
            {pastBookings.map((b) => (
              <div
                key={b._id}
                className="p-3 bg-surface-100 rounded-xl flex items-center justify-between text-xs text-surface-500"
              >
                <div>
                  <span className="font-semibold text-surface-700 mr-2">
                    {b.event?.title || 'Activity'}
                  </span>
                  <span>Cancelled</span>
                </div>
                {b.event?._id && (
                  <Link
                    href={`/events/${b.event._id}`}
                    className="text-brand-700 hover:underline font-medium"
                  >
                    View
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User's Submitted Safety Reports */}
      {myReports.length > 0 && (
        <div className="pt-6 border-t border-surface-200 space-y-3">
          <h3 className="text-sm font-bold text-surface-600 uppercase tracking-wider flex items-center gap-1.5">
            <Flag className="w-3.5 h-3.5 text-rose-500" />
            <span>My Submitted Reports ({myReports.length})</span>
          </h3>
          <div className="space-y-2">
            {myReports.map((rep) => (
              <div
                key={rep._id}
                className="p-3.5 bg-white border border-surface-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <p className="font-semibold text-surface-900">{rep.reason}</p>
                  <p className="text-surface-500 mt-0.5">
                    Target: <span className="capitalize">{rep.targetType}</span> • Submitted{' '}
                    {formatDateTime(rep.createdAt)}
                  </p>
                </div>
                <StatusBadge value={rep.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QR Ticket Modal */}
      {ticketModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-surface-200 rounded-2xl max-w-md w-full shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <QrCode className="w-5 h-5 text-brand-700" />
                <h3 className="text-base font-bold text-surface-900">Event Check-In Pass</h3>
              </div>
              <button
                type="button"
                onClick={() => setTicketModal({ open: false, loading: false, error: '', data: null })}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-surface-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              {ticketModal.loading ? (
                <LoadingState message="Generating your QR check-in ticket..." />
              ) : ticketModal.error ? (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
                  {ticketModal.error}
                </div>
              ) : ticketModal.data ? (
                <div className="space-y-4 text-center">
                  <div>
                    <h4 className="font-bold text-lg text-surface-900">
                      {ticketModal.data.booking?.event?.title}
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {formatDateTime(ticketModal.data.booking?.event?.startDateTime)}
                    </p>
                  </div>

                  {ticketModal.data.qrCodeDataUrl && (
                    <div className="inline-block p-3 bg-white border-2 border-surface-200 rounded-2xl shadow-xs">
                      <img
                        src={ticketModal.data.qrCodeDataUrl}
                        alt="Event QR Check-In Code"
                        className="w-52 h-52 mx-auto"
                      />
                    </div>
                  )}

                  <div className="p-3 bg-surface-50 border border-surface-200 rounded-xl space-y-1">
                    <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                      Manual Check-In Code
                    </p>
                    <p className="font-mono text-base font-bold tracking-widest text-surface-900">
                      {ticketModal.data.checkInCode}
                    </p>
                  </div>

                  {ticketModal.data.booking?.checkedIn ? (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>
                        Checked in on {formatDateTime(ticketModal.data.booking.checkedInAt)}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Present this QR code to the organizer upon arrival to unlock the 24-hour
                      post-event mixer.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
