'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext.js';
import { eventService } from '../../../../services/event.service.js';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Flag,
  QrCode,
} from 'lucide-react';
import Button from '../../../../components/common/Button.js';
import LoadingState from '../../../../components/common/LoadingState.js';
import ErrorState from '../../../../components/common/ErrorState.js';
import ReportModal from '../../../../components/common/ReportModal.js';
import {
  formatDate,
  formatTime,
  formatPrice,
  getAvailableSlots,
} from '../../../../utils/formatters.js';

export default function EventDetailsPage() {
  const { eventId } = useParams();
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Booking & report state
  const [bookingLoading, setBookingLoading] = useState(false);
  const [existingBooking, setExistingBooking] = useState(null);
  const [feedback, setFeedback] = useState({ type: null, message: '' });
  const [reportTarget, setReportTarget] = useState(null);

  const loadEvent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await eventService.getEventById(eventId);
      if (res?.data?.event) {
        setEvent(res.data.event);
      }
    } catch (err) {
      setError(err.message || 'Event could not be found or has been removed.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  // Check if current user is already booked for this event
  const checkUserBooking = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await eventService.getMyBookings({ status: 'confirmed' });
      if (res?.data?.bookings) {
        const found = res.data.bookings.find(
          (b) => b.event?._id === eventId || b.event === eventId
        );
        if (found) {
          setExistingBooking(found);
        } else {
          setExistingBooking(null);
        }
      }
    } catch {
      // Ignore background booking lookup errors
    }
  }, [isAuthenticated, eventId]);

  useEffect(() => {
    loadEvent();
    checkUserBooking();
  }, [loadEvent, checkUserBooking]);

  const handleBookEvent = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/events/${eventId}`);
      return;
    }

    setBookingLoading(true);
    setFeedback({ type: null, message: '' });

    try {
      const res = await eventService.bookEvent(eventId);
      if (res?.data?.booking) {
        setExistingBooking(res.data.booking);
        setFeedback({
          type: 'success',
          message: 'Your spot is confirmed! See you at the activity.',
        });
        // Refresh event details to reflect updated capacity count
        loadEvent();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Could not complete booking. Please try again.',
      });
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!existingBooking?._id) return;

    setBookingLoading(true);
    setFeedback({ type: null, message: '' });

    try {
      await eventService.cancelBooking(existingBooking._id);
      setExistingBooking(null);
      setFeedback({
        type: 'success',
        message: 'Your booking has been cancelled.',
      });
      loadEvent();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to cancel booking. Please try again.',
      });
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20">
        <LoadingState message="Loading event details..." />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="py-16">
        <ErrorState
          title="Activity Not Found"
          message={error || 'The requested event does not exist.'}
          onRetry={loadEvent}
        />
        <div className="text-center mt-4">
          <Link href="/events">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              Back to Activities
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const {
    title,
    description,
    category,
    activityType,
    coverImage,
    location,
    startDateTime,
    endDateTime,
    capacity,
    bookedCount = 0,
    price = 0,
    organizer,
    status,
  } = event;

  const availableSlots = getAvailableSlots(bookedCount, capacity);
  const isFull = availableSlots === 0;
  const isPast = new Date(startDateTime) <= new Date();
  const hasEnded = endDateTime ? new Date(endDateTime) <= new Date() : false;
  const mixerExpiresAtMs = endDateTime
    ? new Date(endDateTime).getTime() + 24 * 60 * 60 * 1000
    : 0;
  const isMixerWindowActive = hasEnded && Date.now() < mixerExpiresAtMs;
  const isOwner = user && organizer?._id === user._id;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Back button */}
      <div>
        <Link
          href="/events"
          className="inline-flex items-center text-xs font-semibold text-surface-600 hover:text-surface-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to all events
        </Link>
      </div>

      {/* Hero / Cover */}
      <div className="bg-white border border-surface-200 rounded-3xl overflow-hidden shadow-sm">
        {coverImage ? (
          <div className="w-full h-72 sm:h-96 bg-surface-100 overflow-hidden">
            <img src={coverImage} alt={title} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-full h-56 sm:h-72 bg-gradient-to-br from-brand-700 to-emerald-950 flex flex-col justify-end p-8 text-white relative">
            <span className="text-5xl opacity-20 font-black absolute top-6 right-6 uppercase tracking-widest">
              {category}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md px-3 py-1 rounded-full w-max mb-3">
              {category}
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">{title}</h1>
          </div>
        )}

        <div className="p-6 sm:p-8 space-y-6">
          {coverImage && (
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-3 py-1 rounded-full">
                {category}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-900 mt-2">
                {title}
              </h1>
            </div>
          )}

          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-surface-100">
            <div className="flex items-start space-x-3 p-3.5 bg-surface-50 rounded-xl">
              <Calendar className="w-5 h-5 text-brand-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-surface-500 uppercase">Date</p>
                <p className="text-sm font-bold text-surface-900">{formatDate(startDateTime)}</p>
                <p className="text-xs text-surface-600">
                  {formatTime(startDateTime)} - {formatTime(endDateTime)}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3.5 bg-surface-50 rounded-xl">
              <MapPin className="w-5 h-5 text-brand-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-surface-500 uppercase">Location</p>
                <p className="text-sm font-bold text-surface-900">{location?.city}</p>
                <p className="text-xs text-surface-600 truncate">{location?.address}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3.5 bg-surface-50 rounded-xl">
              <Users className="w-5 h-5 text-brand-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-surface-500 uppercase">Availability</p>
                <p className="text-sm font-bold text-surface-900">
                  {isFull ? 'Sold Out' : `${availableSlots} spots available`}
                </p>
                <p className="text-xs text-surface-600">
                  {bookedCount} of {capacity} booked
                </p>
              </div>
            </div>
          </div>

          {/* Booking Feedback Alert */}
          {feedback.message && (
            <div
              className={`p-4 rounded-xl text-sm flex items-start ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 mr-2.5 text-emerald-600 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 mr-2.5 text-red-600 mt-0.5 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Description */}
          <div className="space-y-3 pt-2">
            <h2 className="text-base font-bold text-surface-900">About this activity</h2>
            <p className="text-sm text-surface-700 leading-relaxed whitespace-pre-line">
              {description}
            </p>
          </div>

          {/* Booking & Action Section */}
          <div className="p-5 bg-surface-50 rounded-2xl border border-surface-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase text-surface-500">Entry fee</span>
              <p className="text-2xl font-extrabold text-surface-900">
                {formatPrice(price)}
              </p>
            </div>

            <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-3">
              {isOwner ? (
                <div className="text-xs font-medium text-surface-600 bg-surface-200 px-4 py-2 rounded-lg text-center">
                  You are the organizer of this event
                </div>
              ) : existingBooking ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-lg flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" />
                    Spot Confirmed
                  </span>
                  <Link href="/dashboard">
                    <Button variant="outline" size="md">
                      <QrCode className="w-4 h-4 mr-1.5" />
                      View QR Ticket
                    </Button>
                  </Link>
                  {hasEnded && existingBooking.checkedIn && (
                    <Link href={`/events/${eventId}/mixer`}>
                      <Button
                        variant={isMixerWindowActive ? 'primary' : 'outline'}
                        size="md"
                      >
                        <Clock className="w-4 h-4 mr-1.5" />
                        {isMixerWindowActive ? 'Open 24h Mixer' : 'Mixer Closed'}
                      </Button>
                    </Link>
                  )}
                  {hasEnded && !existingBooking.checkedIn && (
                    <span className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg flex items-center">
                      <AlertCircle className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                      QR check-in required for 24h Mixer
                    </span>
                  )}
                  <Button
                    variant="outline"
                    size="md"
                    loading={bookingLoading}
                    onClick={handleCancelBooking}
                    className="text-red-600 hover:bg-red-50"
                  >
                    Cancel Booking
                  </Button>
                </div>
              ) : isPast ? (
                <Button variant="secondary" size="md" disabled>
                  Activity has ended
                </Button>
              ) : isFull ? (
                <Button variant="secondary" size="md" disabled>
                  Capacity Full
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  loading={bookingLoading}
                  onClick={handleBookEvent}
                  className="w-full sm:w-auto shadow-sm"
                >
                  Book My Spot ({formatPrice(price)})
                </Button>
              )}
            </div>
          </div>

          {/* Organizer Card & Reporting */}
          <div className="pt-6 border-t border-surface-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-800 font-bold flex items-center justify-center text-sm border border-brand-200">
                {organizer?.fullName?.charAt(0) || 'O'}
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-sm font-bold text-surface-900">
                    {organizer?.fullName || 'Event Organizer'}
                  </span>
                  <ShieldCheck className="w-4 h-4 text-brand-600" title="Verified Organizer" />
                </div>
                <p className="text-xs text-surface-500">
                  Community Host • {organizer?.city || 'Club Member'}
                </p>
              </div>
            </div>

            {!isOwner && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (!isAuthenticated) {
                      router.push(`/login?redirect=/events/${eventId}`);
                      return;
                    }
                    setReportTarget({
                      targetType: 'event',
                      targetId: eventId,
                      targetLabel: title,
                    });
                  }}
                  className="text-surface-500 hover:text-rose-600"
                >
                  <Flag className="w-3.5 h-3.5 mr-1.5" />
                  Report Event
                </Button>
                {organizer?._id && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (!isAuthenticated) {
                        router.push(`/login?redirect=/events/${eventId}`);
                        return;
                      }
                      setReportTarget({
                        targetType: 'user',
                        targetId: organizer._id,
                        targetLabel: organizer.fullName,
                      });
                    }}
                    className="text-surface-500 hover:text-rose-600"
                  >
                    <Flag className="w-3.5 h-3.5 mr-1.5" />
                    Report Host
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <ReportModal
        isOpen={Boolean(reportTarget)}
        targetType={reportTarget?.targetType}
        targetId={reportTarget?.targetId}
        targetLabel={reportTarget?.targetLabel}
        onClose={() => setReportTarget(null)}
      />
    </div>
  );
}
