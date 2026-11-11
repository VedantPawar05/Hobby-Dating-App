import React from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingState({ message = 'Loading activities...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <Loader2 className="w-8 h-8 text-brand-600 animate-spin mb-3" />
      <p className="text-sm font-medium text-surface-600">{message}</p>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white border border-surface-200 rounded-xl overflow-hidden animate-pulse">
      <div className="h-48 bg-surface-100" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-surface-100 rounded w-1/4" />
        <div className="h-6 bg-surface-100 rounded w-3/4" />
        <div className="space-y-2 pt-2">
          <div className="h-3.5 bg-surface-100 rounded w-1/2" />
          <div className="h-3.5 bg-surface-100 rounded w-2/3" />
        </div>
      </div>
    </div>
  );
}

export default LoadingState;
