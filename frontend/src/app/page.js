'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Compass, Sparkles, MapPin, ArrowRight, ShieldCheck, HeartHandshake } from 'lucide-react';
import { eventService } from '../services/event.service.js';
import EventCard from '../components/events/EventCard.js';
import Button from '../components/common/Button.js';
import { CardSkeleton } from '../components/common/LoadingState.js';

export default function HomePage() {
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeatured() {
      try {
        const res = await eventService.getEvents({ limit: 6 });
        if (res?.data?.events) {
          setUpcomingEvents(res.data.events);
        }
      } catch {
        // Fallback gracefully if backend is offline during render
      } finally {
        setLoading(false);
      }
    }
    loadFeatured();
  }, []);

  const featurePillars = [
    {
      icon: Compass,
      title: 'Activity-First Discovery',
      description: 'Find organized 5K runs, mountain hikes, padel matches, and hobbies near your city.',
    },
    {
      icon: HeartHandshake,
      title: 'Organic Connections',
      description: 'Connect naturally by participating in shared hobbies instead of swiping through digital catalogs.',
    },
    {
      icon: ShieldCheck,
      title: 'Verified Hosts & Real People',
      description: 'Every event is hosted by authorized community organizers with transparent capacities.',
    },
  ];

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white border-b border-surface-200">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-50/50 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 relative">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-800 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              <span>Ditch the swipe. Meet in real life.</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-surface-900 leading-[1.15]">
              Real Run Clubs, Hobbies &amp; Meaningful Connections.
            </h1>

            <p className="text-lg text-surface-600 leading-relaxed max-w-2xl">
              Ricoz is the activity-first platform where community and dating meet.
              Lace up for a morning 5K, join a weekend hiking group, or hit the padel court.
              Meet people through the sports you love.
            </p>

            <div className="pt-2 flex flex-wrap gap-3">
              <Link href="/events">
                <Button size="lg" className="shadow-sm">
                  <Compass className="w-4 h-4 mr-2" />
                  Explore Activities
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="outline" size="lg">
                  Join Ricoz Club
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Value Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featurePillars.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="bg-white p-6 rounded-2xl border border-surface-200 shadow-sm space-y-3"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-surface-900">{item.title}</h3>
                <p className="text-sm text-surface-600 leading-relaxed">{item.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Featured Upcoming Events */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center space-x-1.5 text-brand-700 text-xs font-semibold uppercase tracking-wider mb-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>Real World Gatherings</span>
            </div>
            <h2 className="text-2xl font-bold text-surface-900">Upcoming Activities</h2>
          </div>
          <Link
            href="/events"
            className="inline-flex items-center text-sm font-semibold text-brand-700 hover:text-brand-800 transition-colors"
          >
            Browse all events
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : upcomingEvents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingEvents.map((event) => (
              <EventCard key={event._id} event={event} />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-surface-200 rounded-2xl p-10 text-center space-y-3">
            <p className="text-sm text-surface-600">
              No upcoming events published yet. Check back soon or be the first organizer!
            </p>
            <Link href="/events">
              <Button variant="outline" size="sm">
                View Event Directory
              </Button>
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
