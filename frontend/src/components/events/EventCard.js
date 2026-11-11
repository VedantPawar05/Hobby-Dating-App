'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, MapPin, Users, ArrowUpRight } from 'lucide-react';
import Card from '../common/Card.js';
import { formatDateTime, formatPrice, getAvailableSlots } from '../../utils/formatters.js';

export function EventCard({ event }) {
  const {
    _id,
    title,
    category,
    coverImage,
    location,
    startDateTime,
    capacity,
    bookedCount = 0,
    price = 0,
    organizer,
  } = event;

  const availableSlots = getAvailableSlots(bookedCount, capacity);
  const isSoldOut = capacity > 0 && availableSlots === 0;

  // Category fallback banner styling
  const categoryGradients = {
    Running: 'from-emerald-600 to-teal-800',
    Hiking: 'from-amber-600 to-stone-800',
    Badminton: 'from-blue-600 to-indigo-800',
    Football: 'from-green-600 to-emerald-900',
    Cycling: 'from-cyan-600 to-blue-800',
    Padel: 'from-purple-600 to-indigo-900',
    Climbing: 'from-orange-600 to-amber-900',
    Cooking: 'from-rose-600 to-red-800',
    Other: 'from-slate-600 to-slate-800',
  };

  const bgGradient = categoryGradients[category] || categoryGradients.Other;

  return (
    <Card hover className="flex flex-col h-full group">
      <Link href={`/events/${_id}`} className="block relative">
        {coverImage ? (
          <div className="h-48 w-full overflow-hidden bg-surface-100">
            <img
              src={coverImage}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        ) : (
          <div
            className={`h-48 w-full bg-gradient-to-br ${bgGradient} flex flex-col justify-end p-5 text-white relative`}
          >
            <span className="text-3xl opacity-30 font-black absolute top-4 right-4 uppercase tracking-widest">
              {category}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full w-max">
              {category}
            </span>
          </div>
        )}

        {/* Price & Sold out badges */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/95 text-surface-900 shadow-sm backdrop-blur-sm">
            {formatPrice(price)}
          </span>
          {isSoldOut ? (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-600 text-white shadow-sm">
              Full
            </span>
          ) : (
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-surface-900/75 text-white backdrop-blur-sm">
              {availableSlots} left
            </span>
          )}
        </div>
      </Link>

      <div className="p-5 flex flex-col flex-grow">
        {/* Category & Title */}
        <div className="mb-2">
          <span className="text-xs font-semibold text-brand-700 tracking-wide uppercase">
            {category}
          </span>
          <Link href={`/events/${_id}`} className="block group-hover:text-brand-700 transition-colors">
            <h3 className="font-bold text-base text-surface-900 line-clamp-1 mt-0.5">
              {title}
            </h3>
          </Link>
        </div>

        {/* Date, Location, Slots */}
        <div className="space-y-1.5 text-xs text-surface-600 mb-4 flex-grow">
          <div className="flex items-center">
            <Calendar className="w-3.5 h-3.5 mr-2 text-surface-400 shrink-0" />
            <span className="truncate">{formatDateTime(startDateTime)}</span>
          </div>
          <div className="flex items-center">
            <MapPin className="w-3.5 h-3.5 mr-2 text-surface-400 shrink-0" />
            <span className="truncate">
              {location?.city} {location?.address ? `• ${location.address}` : ''}
            </span>
          </div>
          <div className="flex items-center">
            <Users className="w-3.5 h-3.5 mr-2 text-surface-400 shrink-0" />
            <span>
              {bookedCount} / {capacity} attendees booked
            </span>
          </div>
        </div>

        {/* Organizer & Action footer */}
        <div className="pt-3 border-t border-surface-100 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-[10px]">
              {organizer?.fullName?.charAt(0) || 'O'}
            </div>
            <span className="font-medium text-surface-700 truncate max-w-[120px]">
              {organizer?.fullName || 'Club Organizer'}
            </span>
          </div>

          <Link
            href={`/events/${_id}`}
            className="flex items-center font-semibold text-brand-700 hover:text-brand-800 transition-colors"
          >
            Details
            <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
          </Link>
        </div>
      </div>
    </Card>
  );
}

export default EventCard;
