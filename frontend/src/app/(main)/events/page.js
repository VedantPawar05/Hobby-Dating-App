'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { eventService } from '../../../services/event.service.js';
import EventCard from '../../../components/events/EventCard.js';
import EventFilters from '../../../components/events/EventFilters.js';
import LoadingState, { CardSkeleton } from '../../../components/common/LoadingState.js';
import ErrorState from '../../../components/common/ErrorState.js';
import EmptyState from '../../../components/common/EmptyState.js';
import Button from '../../../components/common/Button.js';
import { ChevronLeft, ChevronRight, Compass } from 'lucide-react';

function EventsDiscoveryContent() {
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    city: searchParams.get('city') || '',
    activityType: searchParams.get('activityType') || '',
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
    sortBy: 'startDateTime',
    sortOrder: 'asc',
  });

  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 9,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEvents = useCallback(
    async (currentPage = 1, currentFilters = filters) => {
      setLoading(true);
      setError(null);

      try {
        const queryParams = {
          ...currentFilters,
          page: currentPage,
          limit: pagination.limit,
        };

        const res = await eventService.getEvents(queryParams);
        if (res?.data) {
          setEvents(res.data.events || []);
          if (res.data.pagination) {
            setPagination(res.data.pagination);
          }
        }
      } catch (err) {
        setError(
          err.message ||
            'Failed to load activities. Please verify your connection or try again.'
        );
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.limit]
  );

  useEffect(() => {
    fetchEvents(pagination.page, filters);
  }, [fetchEvents, pagination.page, filters]);

  const handleFilterChange = (key, value) => {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleResetFilters = () => {
    const reset = {
      search: '',
      category: '',
      city: '',
      activityType: '',
      startDate: '',
      endDate: '',
      sortBy: 'startDateTime',
      sortOrder: 'asc',
    };
    setFilters(reset);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, page: newPage }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-surface-900">
          Discover Real-World Activities
        </h1>
        <p className="text-sm text-surface-600">
          Explore upcoming run clubs, trail hikes, padel sessions, and hobby gatherings.
        </p>
      </div>

      {/* Filter Toolbar */}
      <EventFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* Content State */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, idx) => (
            <CardSkeleton key={idx} />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Could not load events"
          message={error}
          onRetry={() => fetchEvents(pagination.page, filters)}
        />
      ) : events.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="No activities match your filters"
          description="Try broadening your city or category filter to discover more upcoming gatherings."
          actionLabel="Clear all filters"
          onAction={handleResetFilters}
        />
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-surface-500 font-medium px-1">
            <span>
              Showing {events.length} of {pagination.total} published activities
            </span>
            <span>
              Page {pagination.page} of {pagination.totalPages}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard key={event._id} event={event} />
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="pt-8 flex items-center justify-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>

              <span className="text-xs font-semibold px-4 py-2 text-surface-700 bg-white border border-surface-200 rounded-lg">
                {pagination.page} / {pagination.totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function EventsDiscoveryPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading activities directory..." />}>
      <EventsDiscoveryContent />
    </Suspense>
  );
}
