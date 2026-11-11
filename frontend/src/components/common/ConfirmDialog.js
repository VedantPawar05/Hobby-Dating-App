'use client';

import React, { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import Button from './Button.js';

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  showReason = false,
  requireReason = false,
  reasonLabel = 'Moderation Reason',
  reasonPlaceholder = 'Enter a brief reason (minimum 3 characters)...',
  loading = false,
  onConfirm,
  onClose,
}) {
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setValidationError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirmClick = () => {
    const trimmed = reason.trim();
    if (requireReason && trimmed.length < 3) {
      setValidationError('Please provide a reason of at least 3 characters.');
      return;
    }
    onConfirm(trimmed);
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
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                confirmVariant === 'danger'
                  ? 'bg-red-50 text-red-600'
                  : 'bg-brand-50 text-brand-700'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-surface-900">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-surface-100"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">{description}</p>

          {showReason && (
            <div>
              <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700">
                {reasonLabel} {requireReason && <span className="text-red-500">*</span>}
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (validationError) setValidationError('');
                }}
                placeholder={reasonPlaceholder}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-surface-200 rounded-lg text-surface-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
              />
              {validationError && (
                <p className="mt-1.5 text-xs font-medium text-red-600">{validationError}</p>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-surface-50 border-t border-surface-100 flex items-center justify-end gap-2.5">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant}
            size="sm"
            loading={loading}
            onClick={handleConfirmClick}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;

