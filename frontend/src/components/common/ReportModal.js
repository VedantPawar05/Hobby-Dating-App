'use client';

import React, { useState, useEffect } from 'react';
import { Flag, X, CheckCircle2, AlertCircle } from 'lucide-react';
import reportService from '../../services/report.service.js';
import Button from './Button.js';

const PRESET_REASONS = {
  event: [
    'Misleading event details or location',
    'Suspicious or unsafe activity',
    'Spam or duplicate listing',
    'Inappropriate content',
  ],
  user: [
    'Harassment or inappropriate behavior',
    'Suspicious or fake profile',
    'Spam or solicitation',
    'Safety concern at event',
  ],
};

export function ReportModal({ isOpen, targetType, targetId, targetLabel, onClose }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setDetails('');
      setError('');
      setSubmitted(false);
    }
  }, [isOpen, targetId, targetType]);

  if (!isOpen) return null;

  const presets = PRESET_REASONS[targetType] || PRESET_REASONS.event;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 3) {
      setError('Please select or enter a reason (at least 3 characters).');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await reportService.submitReport({
        targetType,
        targetId,
        reason: trimmedReason,
        details: details.trim(),
      });
      setSubmitted(true);
    } catch (err) {
      const firstValidation = err?.errors?.[0]?.message;
      setError(firstValidation || err.message || 'Unable to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white border border-surface-200 rounded-2xl max-w-md w-full shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Flag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-surface-900">
                Report {targetType === 'user' ? 'Member' : 'Activity'}
              </h3>
              {targetLabel && (
                <p className="text-xs text-slate-500 truncate max-w-[240px]">{targetLabel}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-surface-100"
            aria-label="Close report modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-surface-900">Report Submitted</h4>
              <p className="text-sm text-slate-600">
                Thank you for helping keep Hobby Dating safe. Our moderation team will review your
                report.
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={onClose} className="w-full">
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Quick Reasons
              </label>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setReason(preset);
                      setError('');
                    }}
                    className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                      reason === preset
                        ? 'bg-brand-50 border-brand-600 text-brand-800 font-semibold'
                        : 'bg-surface-50 border-surface-200 text-slate-600 hover:bg-surface-100'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700">
                Reason <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Briefly describe the issue..."
                maxLength={200}
                required
                className="w-full px-3.5 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
              />
            </div>

            <div>
              <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700">
                Additional Details (Optional)
              </label>
              <textarea
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Share any context that helps moderators investigate..."
                maxLength={1000}
                className="w-full px-3.5 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" variant="danger" size="sm" loading={submitting}>
                Submit Report
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ReportModal;
