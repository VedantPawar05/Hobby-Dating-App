import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from './Button.js';

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while loading content.',
  onRetry,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center max-w-md mx-auto">
      <div className="p-3 bg-red-50 text-red-600 rounded-full mb-3">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-surface-900 mb-1">{title}</h3>
      <p className="text-sm text-surface-600 mb-5">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="w-3.5 h-3.5 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  );
}

export default ErrorState;
