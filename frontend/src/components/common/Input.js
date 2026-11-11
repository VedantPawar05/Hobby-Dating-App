'use client';

import React from 'react';

export function Input({
  label,
  error,
  helperText,
  id,
  type = 'text',
  className = '',
  required = false,
  ...props
}) {
  const inputId = id || props.name;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block mb-1.5 text-xs font-semibold uppercase tracking-wider text-surface-700"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        required={required}
        className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-lg transition-colors text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 disabled:bg-surface-50 disabled:text-surface-500 ${
          error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-surface-200'
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
      {helperText && !error && (
        <p className="mt-1 text-xs text-surface-500">{helperText}</p>
      )}
    </div>
  );
}

export default Input;
