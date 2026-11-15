import React from 'react';
import Link from 'next/link';
import Button from '../components/common/Button.js';
import Card from '../components/common/Card.js';
import { Compass, Calendar, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <Card className="max-w-md w-full p-8 text-center space-y-6 border border-surface-200 shadow-sm">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 shadow-2xs">
          <Compass className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-3 py-1 rounded-full">
            404 Error
          </span>
          <h1 className="text-2xl font-extrabold text-surface-900 mt-2">
            Page Not Found
          </h1>
          <p className="text-xs text-surface-500 leading-relaxed max-w-sm mx-auto">
            The club activity, mixer room, or link you are seeking does not exist or has been relocated.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/events" className="w-full sm:w-auto">
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="w-full inline-flex items-center justify-center gap-1.5"
            >
              <Calendar className="w-4 h-4" />
              Explore Events
            </Button>
          </Link>

          <Link href="/" className="w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full inline-flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Return Home
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
