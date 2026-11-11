'use client';

import React from 'react';
import { MapPin, Heart, CheckCircle2, Lock } from 'lucide-react';
import Card from '../common/Card.js';
import Button from '../common/Button.js';

export function AttendeeCard({ attendee, tagging, disabled, onTag }) {
  const {
    _id,
    fullName,
    city,
    bio,
    interests = [],
    profilePicture,
    taggedByMe,
  } = attendee;

  const initials = fullName
    ? fullName
        .split(' ')
        .map((n) => n.charAt(0))
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'M';

  return (
    <Card className="p-5 flex flex-col justify-between h-full">
      <div className="space-y-3">
        <div className="flex items-center space-x-3.5">
          {profilePicture ? (
            <img
              src={profilePicture}
              alt={fullName}
              className="w-12 h-12 rounded-full object-cover border border-surface-200 shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-sm border border-brand-200 shrink-0">
              {initials}
            </div>
          )}

          <div className="min-w-0">
            <h3 className="font-bold text-base text-surface-900 truncate">{fullName}</h3>
            {city && (
              <p className="text-xs text-slate-500 flex items-center mt-0.5">
                <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />
                <span className="truncate">{city}</span>
              </p>
            )}
          </div>
        </div>

        <p className="text-sm text-slate-600 line-clamp-3 min-h-[2.5rem]">
          {bio || 'Joined this activity to connect with fellow enthusiasts.'}
        </p>

        {interests.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {interests.slice(0, 4).map((interest) => (
              <span
                key={interest}
                className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-surface-100 text-slate-700 border border-surface-200 capitalize"
              >
                {interest}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="pt-4 mt-4 border-t border-surface-100">
        {taggedByMe ? (
          <div className="w-full py-2 px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-center">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600 shrink-0" />
            <span>Privately Tagged</span>
          </div>
        ) : (
          <Button
            variant="primary"
            size="sm"
            loading={tagging}
            disabled={disabled}
            onClick={() => onTag(_id)}
            className="w-full"
          >
            <Heart className="w-3.5 h-3.5 mr-1.5" />
            Tag Privately
          </Button>
        )}
        <p className="mt-2 text-[11px] text-slate-400 flex items-center justify-center">
          <Lock className="w-3 h-3 mr-1 shrink-0" />
          One-way tags are never revealed
        </p>
      </div>
    </Card>
  );
}

export default AttendeeCard;

