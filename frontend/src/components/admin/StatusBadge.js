'use client';

import React from 'react';

const STATUS_STYLES = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  checked_in: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  suspended: 'bg-red-50 text-red-700 border-red-200',
  published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  open: 'bg-amber-50 text-amber-800 border-amber-200',
  under_review: 'bg-blue-50 text-blue-700 border-blue-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  dismissed: 'bg-slate-100 text-slate-700 border-slate-200',
  admin: 'bg-purple-50 text-purple-700 border-purple-200',
  organizer: 'bg-brand-50 text-brand-700 border-brand-200',
  user: 'bg-slate-100 text-slate-700 border-slate-200',
};

export function StatusBadge({ value, label }) {
  const key = String(value || '').toLowerCase();
  const style = STATUS_STYLES[key] || 'bg-slate-100 text-slate-700 border-slate-200';
  const display = label || String(value || '').replace(/_/g, ' ');

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${style}`}
    >
      {display}
    </span>
  );
}

export default StatusBadge;

