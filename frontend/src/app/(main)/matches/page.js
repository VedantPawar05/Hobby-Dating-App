'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { HeartHandshake, MapPin, Calendar, Sparkles, Compass } from 'lucide-react';
import ProtectedRoute from '../../../components/auth/ProtectedRoute.js';
import mixerService from '../../../services/mixer.service.js';
import Card from '../../../components/common/Card.js';
import Button from '../../../components/common/Button.js';
import LoadingState from '../../../components/common/LoadingState.js';
import ErrorState from '../../../components/common/ErrorState.js';
import EmptyState from '../../../components/common/EmptyState.js';
import PaginationBar from '../../../components/admin/PaginationBar.js';
import { formatDateTime } from '../../../utils/formatters.js';

function MatchesContent() {
  const [matches, setMatches] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await mixerService.getMyMatches({ page, limit: 12 });
      setMatches(res?.data?.matches || []);
      if (res?.data?.pagination) {
        setPagination(res.data.pagination);
      }
    } catch (err) {
      setError(err.message || 'Unable to load your mutual matches.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  if (loading) {
    return <LoadingState message="Loading your mutual matches..." />;
  }

  if (error) {
    return <ErrorState title="Could not load matches" message={error} onRetry={fetchMatches} />;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-3 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mutual Connections</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-surface-900 mt-2">
            Your Mutual Matches
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Matches are only revealed when you and another checked-in attendee privately tag each
            other after an event.
          </p>
        </div>

        <Link href="/events">
          <Button variant="outline" size="sm">
            <Compass className="w-4 h-4 mr-1.5" />
            Explore Activities
          </Button>
        </Link>
      </div>

      {matches.length === 0 ? (
        <EmptyState
          icon={HeartHandshake}
          title="No mutual matches yet"
          description="Check in at an event and privately tag attendees you enjoyed meeting during the 24-hour post-event mixer."
          action={
            <Link href="/dashboard">
              <Button variant="primary" size="sm">
                View My Bookings
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {matches.map((match) => {
              const person = match.matchedUser;
              const initials = person?.fullName
                ? person.fullName
                    .split(' ')
                    .map((n) => n.charAt(0))
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()
                : 'M';

              return (
                <Card key={match._id} className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3.5 min-w-0">
                      {person?.profilePicture ? (
                        <img
                          src={person.profilePicture}
                          alt={person.fullName}
                          className="w-14 h-14 rounded-full object-cover border border-surface-200 shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-base border border-brand-200 shrink-0">
                          {initials}
                        </div>
                      )}

                      <div className="min-w-0">
                        <h2 className="font-bold text-base text-surface-900 truncate">
                          {person?.fullName || 'Ricoz Member'}
                        </h2>
                        {person?.city && (
                          <p className="text-xs text-slate-500 flex items-center mt-0.5">
                            <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />
                            <span>{person.city}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                      Mutual Match
                    </span>
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed">
                    {person?.bio || 'Connected with you through a shared Ricoz activity.'}
                  </p>

                  {person?.interests?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {person.interests.slice(0, 5).map((interest) => (
                        <span
                          key={interest}
                          className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-surface-100 text-slate-700 border border-surface-200 capitalize"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="pt-3 border-t border-surface-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Calendar className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                      {match.event?._id ? (
                        <Link
                          href={`/events/${match.event._id}`}
                          className="font-semibold text-brand-700 hover:underline truncate"
                        >
                          {match.event.title}
                        </Link>
                      ) : (
                        <span className="truncate">{match.event?.title || 'Event'}</span>
                      )}
                    </div>
                    <span className="shrink-0">Matched {formatDateTime(match.matchedAt)}</span>
                  </div>
                </Card>
              );
            })}
          </div>

          <PaginationBar
            pagination={pagination}
            onPageChange={(nextPage) => setPage(nextPage)}
          />
        </>
      )}
    </div>
  );
}

export default function MatchesPage() {
  return (
    <ProtectedRoute>
      <MatchesContent />
    </ProtectedRoute>
  );
}

