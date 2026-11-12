'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Clock,
  Lock,
  Sparkles,
  Users,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import ProtectedRoute from '../../../../../components/auth/ProtectedRoute.js';
import mixerService from '../../../../../services/mixer.service.js';
import Button from '../../../../../components/common/Button.js';
import LoadingState from '../../../../../components/common/LoadingState.js';
import ErrorState from '../../../../../components/common/ErrorState.js';
import EmptyState from '../../../../../components/common/EmptyState.js';
import MixerCountdown from '../../../../../components/mixer/MixerCountdown.js';
import AttendeeCard from '../../../../../components/mixer/AttendeeCard.js';
import ReportModal from '../../../../../components/common/ReportModal.js';
import { formatDateTime } from '../../../../../utils/formatters.js';

function MixerContent() {
  const { eventId } = useParams();

  const [eventInfo, setEventInfo] = useState(null);
  const [mixerInfo, setMixerInfo] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [taggingId, setTaggingId] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [reportTarget, setReportTarget] = useState(null);

  const loadMixer = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const availRes = await mixerService.getMixerAvailability(eventId);
      const availData = availRes?.data;
      setEventInfo(availData?.event || null);
      setMixerInfo(availData?.mixer || null);

      if (availData?.mixer?.isActive) {
        const listRes = await mixerService.getMixerAttendees(eventId, { page: 1, limit: 24 });
        setAttendees(listRes?.data?.attendees || []);
        if (listRes?.data?.mixer) {
          setMixerInfo(listRes.data.mixer);
        }
      } else {
        setAttendees([]);
      }
    } catch (err) {
      setError(err.message || 'Unable to access the post-event mixer for this event.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadMixer();
  }, [loadMixer]);

  const handleWindowExpired = useCallback(() => {
    setMixerInfo((prev) =>
      prev ? { ...prev, state: 'expired', isActive: false, remainingMs: 0 } : prev
    );
  }, []);

  const handleTagAttendee = async (toUserId) => {
    setTaggingId(toUserId);
    setFeedback({ type: '', message: '' });

    try {
      const res = await mixerService.tagAttendee(eventId, toUserId);
      const createdTag = res?.data?.tag;
      setAttendees((prev) =>
        prev.map((item) =>
          item._id === toUserId
            ? { ...item, taggedByMe: true, taggedAt: createdTag?.createdAt || new Date().toISOString() }
            : item
        )
      );
      setFeedback({
        type: 'success',
        message: 'Private tag saved. Only you can see the tags you cast.',
      });
    } catch (err) {
      if (err.status === 410 || err.code === 'MIXER_EXPIRED') {
        handleWindowExpired();
      }
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to save private tag.',
      });
    } finally {
      setTaggingId(null);
    }
  };

  if (loading) {
    return <LoadingState message="Verifying attendance & mixer window..." />;
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-8 space-y-6">
        <Link
          href={`/events/${eventId}`}
          className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-surface-900"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to event
        </Link>
        <div className="bg-white border border-surface-200 rounded-2xl p-6 shadow-sm">
          <ErrorState
            title="Mixer Access Unavailable"
            message={error}
            onRetry={loadMixer}
          />
          <div className="mt-4 pt-4 border-t border-surface-100 text-xs text-slate-500 flex items-start gap-2 max-w-md mx-auto">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Mixer entry requires a confirmed booking, completed QR attendance check-in, and an
              ended event within its 24-hour post-event window.
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div>
        <Link
          href={`/events/${eventId}`}
          className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-surface-900"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to event details
        </Link>
      </div>

      {/* Mixer Header Banner */}
      <div className="bg-gradient-to-r from-brand-700 to-teal-900 rounded-3xl p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            <span>24-Hour Post-Event Mixer</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {eventInfo?.title || 'Post-Event Mixer'}
          </h1>
          <p className="text-sm text-brand-100 max-w-2xl">
            Privately tag verified attendees you enjoyed meeting at this event. Tags stay completely
            private—one-sided interest is never revealed or notified.
          </p>
        </div>

        {mixerInfo?.isActive && (
          <MixerCountdown expiresAt={mixerInfo.expiresAt} onExpire={handleWindowExpired} />
        )}
      </div>

      {/* Feedback Banner */}
      {feedback.message && (
        <div
          className={`p-3.5 rounded-xl text-sm flex items-center ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 mr-2 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 mr-2 shrink-0 text-red-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Not Started State */}
      {mixerInfo?.state === 'not_started' && (
        <div className="bg-white border border-surface-200 rounded-2xl p-10 text-center max-w-lg mx-auto space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-surface-900">Mixer Opens After the Event Ends</h2>
          <p className="text-sm text-slate-600">
            This 24-hour mixer unlocks automatically at{' '}
            <span className="font-semibold text-surface-900">
              {formatDateTime(mixerInfo.startsAt)}
            </span>
            .
          </p>
        </div>
      )}

      {/* Expired State */}
      {mixerInfo?.state === 'expired' && (
        <div className="bg-white border border-surface-200 rounded-2xl p-10 text-center max-w-lg mx-auto space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-surface-900">24-Hour Mixer Window Closed</h2>
          <p className="text-sm text-slate-600">
            This event&apos;s mixer window closed on{' '}
            <span className="font-semibold text-surface-900">
              {formatDateTime(mixerInfo.expiresAt)}
            </span>
            . New private tags can no longer be created, while all existing records remain preserved.
          </p>
          <div className="pt-2">
            <Link href="/events">
              <Button variant="primary" size="sm">
                Explore Upcoming Events
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Active Attendee Grid */}
      {mixerInfo?.isActive && (
        <>
          <div className="p-3.5 rounded-xl bg-surface-100 border border-surface-200 text-xs text-slate-700 flex items-center gap-2">
            <Lock className="w-4 h-4 text-brand-700 shrink-0" />
            <span>
              Only confirmed attendees who completed QR check-in for this event appear here.
            </span>
          </div>

          {attendees.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No other verified attendees yet"
              description="No other QR-checked-in attendees are visible in this event mixer yet. Check back before the 24-hour window closes."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {attendees.map((attendee) => (
                <AttendeeCard
                  key={attendee._id}
                  attendee={attendee}
                  tagging={taggingId === attendee._id}
                  disabled={Boolean(taggingId) || !mixerInfo?.isActive}
                  onTag={handleTagAttendee}
                  onReport={(target) => setReportTarget(target)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <ReportModal
        isOpen={Boolean(reportTarget)}
        targetType="user"
        targetId={reportTarget?._id}
        targetLabel={reportTarget?.fullName}
        onClose={() => setReportTarget(null)}
      />
    </div>
  );
}

export default function EventMixerPage() {
  return (
    <ProtectedRoute>
      <MixerContent />
    </ProtectedRoute>
  );
}
