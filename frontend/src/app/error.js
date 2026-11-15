'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Button from '../components/common/Button.js';
import Card from '../components/common/Card.js';
import { AlertTriangle, RotateCcw, Home, Calendar } from 'lucide-react';

export default function GlobalErrorPage({ error, reset }) {
  useEffect(() => {
    // Log unexpected client-side rendering exceptions for observability
    console.error('[Client Error Boundary]', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <Card className="max-w-md w-full p-8 text-center space-y-6 border border-surface-200 shadow-sm">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shadow-2xs">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-extrabold text-surface-900">
            Something unexpected occurred
          </h1>
          <p className="text-xs text-surface-500 leading-relaxed">
            An application error was encountered while rendering this view. Your session and account data remain secure.
          </p>
          {error?.message && process.env.NODE_ENV === 'development' && (
            <div className="mt-3 p-3 bg-surface-100 rounded-lg text-left text-xs font-mono text-red-700 overflow-auto max-h-32">
              {error.message}
            </div>
          )}
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            Try Again
          </Button>

          <Link href="/events" className="w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full inline-flex items-center justify-center gap-1.5"
            >
              <Calendar className="w-4 h-4" />
              Discover Events
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
