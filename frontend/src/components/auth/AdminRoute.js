'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import LoadingState from '../common/LoadingState.js';
import Button from '../common/Button.js';

export function AdminRoute({ children }) {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, loading, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingState message="Verifying admin privileges..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (user?.role !== 'admin') {
    return (
      <div className="max-w-lg mx-auto my-16 px-4 text-center">
        <div className="bg-white border border-surface-200 rounded-2xl p-8 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-surface-900">Admin Access Restricted</h1>
          <p className="text-sm text-slate-600">
            This area is restricted to authorized Ricoz Club administrators. Your current account
            role (<span className="font-semibold text-surface-800">{user?.role || 'user'}</span>)
            does not have permission to view this dashboard.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link href="/events">
              <Button variant="primary" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back to Activities
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

export default AdminRoute;

