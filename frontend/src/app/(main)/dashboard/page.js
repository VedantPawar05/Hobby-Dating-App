'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ProtectedRoute from '../../../components/auth/ProtectedRoute.js';
import { useAuth } from '../../../context/AuthContext.js';
import { eventService } from '../../../services/event.service.js';
import Card from '../../../components/common/Card.js';
import Button from '../../../components/common/Button.js';
import LoadingState from '../../../components/common/LoadingState.js';
import EmptyState from '../../../components/common/EmptyState.js';
import {
  Calendar,
  MapPin,
  Compass,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { formatDateTime, formatPrice } from '../../../utils/formatters.js';

function DashboardContent() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [feedback, setFeedback] = useState({ type: null, message: '' });

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await eventService.getMyBookings({ limit: 20 });
      if (res?.data?.bookings) {
        setBookings(res.data.bookings);
      }
    } catch {
      // Handle gracefully
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleCancelBooking = async (bookingId) => {
    setActionLoading(bookingId);
    setFeedback({ type: null, message: '' });

    try {
      await eventService.cancelBooking(bookingId);
      setFeedback({
        type: 'success',
        message: 'Booking cancelled successfully.',
      });
      fetchBookings();
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
            Track your upcoming run clubs, trail sessions, and hobby events.
          </p>
        </div>

        <Link href="/events">
          <Button variant="secondary" size="md" className="shrink-0 font-semibold">
            <Compass className="w-4 h-4 mr-1.5" />
            Discover New Activities
          </Button>
        </Link>
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
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full">
                        {eventItem.category}
                      </span>
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Confirmed
                      </span>
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

                  <div className="pt-3 border-t border-surface-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-surface-900">
                      {formatPrice(eventItem.price)}
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
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
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={actionLoading === b._id}
                        onClick={() => handleCancelBooking(b._id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancelled Bookings Accordion/List if any */}
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
