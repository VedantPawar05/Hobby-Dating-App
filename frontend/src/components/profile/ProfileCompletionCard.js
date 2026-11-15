'use client';

import React from 'react';
import Card from '../common/Card.js';
import { CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

const FIELD_LABELS = {
  fullName: 'Full Name',
  email: 'Email Address',
  city: 'Home City',
  dateOfBirth: 'Date of Birth',
  gender: 'Gender',
  bio: 'Bio / About You',
  interests: 'Hobbies & Interests',
  profilePicture: 'Profile Picture',
};

export default function ProfileCompletionCard({ completion, onNavigateTab }) {
  if (!completion) return null;

  const { percentage = 0, isComplete = false, missingFields = [] } = completion;

  return (
    <Card className="p-5 sm:p-6 bg-gradient-to-r from-brand-50/70 via-white to-brand-50/30 border border-brand-100 shadow-xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-brand-600 text-white shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-surface-900">
              Profile Strength: {percentage}%
            </h3>
            {isComplete ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Complete
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                <AlertCircle className="w-3.5 h-3.5" />
                Action Recommended
              </span>
            )}
          </div>

          <p className="text-xs text-surface-600">
            {isComplete
              ? 'Your profile is completely filled out! Attendees and matches can see full details based on your privacy settings.'
              : 'Complete your bio, picture, and interests to improve mutual match suggestions and mixer connection rates.'}
          </p>
        </div>

        <div className="w-full sm:w-48 shrink-0">
          <div className="flex justify-between text-xs font-semibold text-surface-700 mb-1">
            <span>Progress</span>
            <span>{percentage}%</span>
          </div>
          <div className="w-full h-3 bg-surface-200 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                percentage === 100
                  ? 'bg-emerald-500'
                  : percentage >= 60
                  ? 'bg-brand-500'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>

      {!isComplete && missingFields.length > 0 && (
        <div className="mt-4 pt-4 border-t border-brand-100/60 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-surface-500">Missing fields:</span>
          {missingFields.map((field) => (
            <button
              key={field}
              type="button"
              onClick={() => onNavigateTab && onNavigateTab('details')}
              className="px-2.5 py-1 text-xs rounded-md bg-white border border-amber-200 text-amber-900 hover:bg-amber-50 hover:border-amber-300 font-medium transition-colors shadow-2xs cursor-pointer"
            >
              + Add {FIELD_LABELS[field] || field}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
