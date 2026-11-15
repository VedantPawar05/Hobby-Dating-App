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
  HeartHandshake,
  MapPin,
  X,
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
  const [eventMatches, setEventMatches] = useState([]);
  const [revealedMatch, setRevealedMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [taggingId, setTaggingId] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [reportTarget, setReportTarget] = useState(null);

  const loadMixer = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [availRes, matchesRes] = await Promise.all([
        mixerService.getMixerAvailability(eventId),
        mixerService.getMyMatches({ eventId, limit: 24 }).catch(() => null),
      ]);
      const availData = availRes?.data;
      setEventInfo(availData?.event || null);
      setMixerInfo(availData?.mixer || null);
      setEventMatches(matchesRes?.data?.matches || []);

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
      const isMatched = Boolean(res?.data?.matched && res?.data?.match);
      const newMatch = res?.data?.match || null;

      setAttendees((prev) =>
        prev.map((item) =>
          item._id === toUserId
            ? { ...item, taggedByMe: true, taggedAt: createdTag?.createdAt || new Date().toISOString() }
            : item
        )
      );

      if (isMatched && newMatch) {
        setEventMatches((prev) => {
          const exists = prev.some((m) => m._id === newMatch._id);
          return exists ? prev : [newMatch, ...prev];
        });
        setRevealedMatch(newMatch);
        setFeedback({
          type: 'success',
          message: `Mutual match unlocked with ${newMatch.matchedUser?.fullName || 'this attendee'}!`,
        });
      } else {
        setFeedback({
          type: 'success',
          message: 'Private tag saved. Only you can see the tags you cast.',
        });
      }
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

      {/* Mutual Matches Revealed for This Event */}
      {eventMatches.length > 0 && (
        <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold text-surface-900">
                Mutual Matches from This Event ({eventMatches.length})
              </h2>
            </div>
            <Link
              href="/matches"
              className="text-xs font-semibold text-brand-700 hover:underline"
            >
              View All Mutual Matches
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {eventMatches.map((match) => {
              const person = match.matchedUser;
              return (
                <div
                  key={match._id}
                  className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2"
                >
                  <div className="flex items-center gap-3">
                    {person?.profilePicture ? (
                      <img
                        src={person.profilePicture}
                        alt={person.fullName}
                        className="w-10 h-10 rounded-full object-cover border border-emerald-200 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0">
                        {person?.fullName?.charAt(0) || 'M'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-surface-900 truncate">
                        {person?.fullName || 'Matched Member'}
                      </p>
                      {person?.city && (
                        <p className="text-xs text-slate-500 flex items-center">
                          <MapPin className="w-3 h-3 mr-1 shrink-0" />
                          <span>{person.city}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  {person?.bio && (
                    <p className="text-xs text-slate-600 line-clamp-2">{person.bio}</p>
                  )}
                  <p className="text-[11px] text-emerald-700 font-medium">
                    Matched {formatDateTime(match.matchedAt)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Match Reveal Modal */}
      {revealedMatch && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-emerald-200 rounded-2xl max-w-md w-full shadow-xl overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-brand-700 to-teal-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-5 h-5" />
                <h3 className="text-base font-bold">It&apos;s a Mutual Match!</h3>
              </div>
              <button
                type="button"
                onClick={() => setRevealedMatch(null)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
                aria-label="Close match reveal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-center">
              <div className="flex flex-col items-center space-y-2">
                {revealedMatch.matchedUser?.profilePicture ? (
                  <img
                    src={revealedMatch.matchedUser.profilePicture}
                    alt={revealedMatch.matchedUser.fullName}
                    className="w-20 h-20 rounded-full object-cover border-2 border-emerald-300"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-2xl flex items-center justify-center border-2 border-emerald-200">
                    {revealedMatch.matchedUser?.fullName?.charAt(0) || 'M'}
                  </div>
                )}
                <h4 className="text-lg font-extrabold text-surface-900">
                  {revealedMatch.matchedUser?.fullName}
                </h4>
                {revealedMatch.matchedUser?.city && (
                  <p className="text-xs text-slate-500 flex items-center">
                    <MapPin className="w-3.5 h-3.5 mr-1" />
                    <span>{revealedMatch.matchedUser.city}</span>
                  </p>
                )}
              </div>

              {revealedMatch.matchedUser?.bio && (
                <p className="text-sm text-slate-600">{revealedMatch.matchedUser.bio}</p>
              )}

              <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                You and {revealedMatch.matchedUser?.fullName} both privately tagged each other
                after <span className="font-semibold">{revealedMatch.event?.title}</span>.
              </p>

              <div className="flex items-center justify-center gap-2 pt-1">
                <Link href="/matches">
                  <Button variant="primary" size="sm">
                    View All Matches
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={() => setRevealedMatch(null)}>
                  Keep Exploring
                </Button>
              </div>
            </div>
          </div>
        </div>
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
