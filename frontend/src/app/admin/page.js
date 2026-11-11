'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  Award,
  CalendarDays,
  Clock,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Ticket,
} from 'lucide-react';
import adminService from '../../services/admin.service.js';
import Card, { CardHeader, CardBody } from '../../components/common/Card.js';
import LoadingState from '../../components/common/LoadingState.js';
import ErrorState from '../../components/common/ErrorState.js';
import StatusBadge from '../../components/admin/StatusBadge.js';
import { formatDateTime } from '../../utils/formatters.js';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getStats();
      setStats(res?.data?.stats || null);
    } catch (err) {
      setError(err.message || 'Failed to load admin dashboard statistics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return <LoadingState message="Loading platform metrics..." />;
  }

  if (error) {
    return <ErrorState title="Unable to load dashboard" message={error} onRetry={fetchStats} />;
  }

  const statCards = [
    {
      label: 'Total Registered Users',
      value: stats?.users?.total ?? 0,
      sub: `${stats?.users?.active ?? 0} active • ${stats?.users?.suspended ?? 0} suspended`,
      icon: Users,
      href: '/admin/users',
      accent: 'bg-brand-50 text-brand-700',
    },
    {
      label: 'Total Organizers',
      value: stats?.users?.organizers ?? 0,
      sub: `${stats?.users?.members ?? 0} standard members`,
      icon: Award,
      href: '/admin/organizers',
      accent: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Total Events',
      value: stats?.events?.total ?? 0,
      sub: `${stats?.events?.published ?? 0} published • ${stats?.events?.cancelled ?? 0} cancelled`,
      icon: CalendarDays,
      href: '/admin/events',
      accent: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Upcoming Events',
      value: stats?.events?.upcoming ?? 0,
      sub: `${stats?.bookings?.confirmed ?? 0} confirmed bookings`,
      icon: CheckCircle2,
      href: '/admin/events?status=published',
      accent: 'bg-teal-50 text-teal-700',
    },
    {
      label: 'Pending Event Approvals',
      value: stats?.events?.pendingApprovals ?? 0,
      sub: `${stats?.events?.draft ?? 0} drafts • ${stats?.events?.rejected ?? 0} rejected`,
      icon: Clock,
      href: '/admin/events?status=pending',
      accent: 'bg-amber-50 text-amber-700',
    },
    {
      label: 'Open Reports',
      value: stats?.reports?.open ?? 0,
      sub: stats?.reports?.userReportingAvailable
        ? `${stats?.reports?.total ?? 0} total reports`
        : 'User reporting UI pending future phase',
      icon: ShieldAlert,
      href: '/admin/reports',
      accent: 'bg-rose-50 text-rose-700',
    },
  ];

  const recentLogs = stats?.recentModerationLogs || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-surface-900">
          Admin Overview
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Real-time platform metrics, pending event approvals, and recent moderation activity.
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {statCards.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} href={item.href} className="block group">
              <Card hover className="p-5 h-full flex flex-col justify-between">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {item.label}
                    </p>
                    <p className="text-3xl font-extrabold text-surface-900 mt-1.5">
                      {item.value}
                    </p>
                  </div>
                  <div className={`p-2.5 rounded-xl ${item.accent}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-surface-100 flex items-center justify-between text-xs text-slate-600">
                  <span>{item.sub}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-700 transition-colors" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Platform Activity Breakdown & Recent Moderation Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-surface-900">Platform Activity Overview</h2>
              <Ticket className="w-4 h-4 text-brand-600" />
            </div>
          </CardHeader>
          <CardBody className="space-y-3 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-surface-100">
              <span className="text-slate-600">Active / Suspended Accounts</span>
              <span className="font-semibold text-surface-900">
                {stats?.users?.active ?? 0} active / {stats?.users?.suspended ?? 0} suspended
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-surface-100">
              <span className="text-slate-600">Total Bookings (Confirmed)</span>
              <Link
                href="/admin/bookings"
                className="font-semibold text-brand-700 hover:underline"
              >
                {stats?.bookings?.total ?? 0} ({stats?.bookings?.confirmed ?? 0} confirmed)
              </Link>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-surface-100">
              <span className="text-slate-600">Events Awaiting Moderation</span>
              <Link
                href="/admin/events?status=pending"
                className="font-semibold text-brand-700 hover:underline"
              >
                {stats?.events?.pendingApprovals ?? 0} pending review
              </Link>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-600">Admin Accounts</span>
              <span className="font-semibold text-surface-900">{stats?.users?.admins ?? 0}</span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-surface-900">Recent Moderation Actions</h2>
              <Link
                href="/admin/logs"
                className="text-xs font-semibold text-brand-700 hover:underline"
              >
                View audit trail
              </Link>
            </div>
          </CardHeader>
          <CardBody>
            {recentLogs.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">
                No moderation actions recorded yet.
              </p>
            ) : (
              <div className="space-y-3">
                {recentLogs.map((log) => (
                  <div
                    key={log._id}
                    className="p-3 rounded-xl bg-surface-50 border border-surface-100 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge value={log.targetType} />
                        <span className="text-xs font-semibold text-surface-900 capitalize">
                          {log.actionType.replace(/_/g, ' ')}
                        </span>
                      </div>
                      {log.reason && (
                        <p className="text-xs text-slate-600 mt-1 line-clamp-1">{log.reason}</p>
                      )}
                      <p className="text-[11px] text-slate-400 mt-1">
                        By {log.admin?.fullName || 'Admin'} • {formatDateTime(log.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

