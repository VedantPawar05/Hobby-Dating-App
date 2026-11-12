'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { History, Search, Filter } from 'lucide-react';
import adminService from '../../../services/admin.service.js';
import Card from '../../../components/common/Card.js';
import Button from '../../../components/common/Button.js';
import LoadingState from '../../../components/common/LoadingState.js';
import ErrorState from '../../../components/common/ErrorState.js';
import EmptyState from '../../../components/common/EmptyState.js';
import StatusBadge from '../../../components/admin/StatusBadge.js';
import PaginationBar from '../../../components/admin/PaginationBar.js';
import { formatDateTime } from '../../../utils/formatters.js';

const ACTION_OPTIONS = [
  { value: 'suspend_user', label: 'Suspend User' },
  { value: 'reactivate_user', label: 'Reactivate User' },
  { value: 'update_user_role', label: 'Update User Role' },
  { value: 'approve_event', label: 'Approve Event' },
  { value: 'reject_event', label: 'Reject Event' },
  { value: 'cancel_event', label: 'Cancel Event' },
  { value: 'cancel_booking', label: 'Cancel Booking' },
  { value: 'review_report', label: 'Review Report' },
  { value: 'resolve_report', label: 'Resolve Report' },
  { value: 'dismiss_report', label: 'Dismiss Report' },
];

export default function AdminModerationLogsPage() {
  const [logs, setLogs] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({
    search: '',
    actionType: '',
    targetType: '',
    adminId: '',
    startDate: '',
    endDate: '',
    page: 1,
  });
  const [searchInput, setSearchInput] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    adminService
      .getUsers({ role: 'admin', limit: 50 })
      .then((res) => {
        if (mounted && res?.data?.users) {
          setAdmins(res.data.users);
        }
      })
      .catch(() => {
        // Admin dropdown remains optional if lookup fails
      });
    return () => {
      mounted = false;
    };
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getModerationLogs({ ...filters, limit: 15 });
      setLogs(res?.data?.logs || []);
      if (res?.data?.pagination) {
        setPagination(res.data.pagination);
      }
    } catch (err) {
      const firstValidationError = err?.errors?.[0]?.message;
      setError(firstValidationError || err.message || 'Failed to load moderation activity logs.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, search: searchInput.trim(), page: 1 }));
  };

  const hasActiveFilters = Boolean(
    filters.search ||
      filters.actionType ||
      filters.targetType ||
      filters.adminId ||
      filters.startDate ||
      filters.endDate
  );

  const handleResetFilters = () => {
    setSearchInput('');
    setFilters({
      search: '',
      actionType: '',
      targetType: '',
      adminId: '',
      startDate: '',
      endDate: '',
      page: 1,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-surface-900">
          Moderation Activity Logs
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Searchable audit trail of all admin moderation actions recorded across users, events, and reports.
        </p>
      </div>

      {/* Filters Card */}
      <Card className="p-4 space-y-3">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by reason, target email/title, or admin name..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button type="submit" variant="primary" size="sm" className="flex-1">
              Search
            </Button>
            {hasActiveFilters && (
              <Button type="button" variant="outline" size="sm" onClick={handleResetFilters}>
                Reset
              </Button>
            )}
          </div>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          <select
            value={filters.actionType}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, actionType: e.target.value, page: 1 }))
            }
            className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
          >
            <option value="">All Action Types</option>
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={filters.targetType}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, targetType: e.target.value, page: 1 }))
            }
            className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
          >
            <option value="">All Targets</option>
            <option value="user">Users</option>
            <option value="event">Events</option>
            <option value="booking">Bookings</option>
            <option value="report">Reports</option>
          </select>

          <select
            value={filters.adminId}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, adminId: e.target.value, page: 1 }))
            }
            className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
          >
            <option value="">All Admins</option>
            {admins.map((admin) => (
              <option key={admin._id} value={admin._id}>
                {admin.fullName}
              </option>
            ))}
          </select>

          <input
            type="date"
            aria-label="Start Date"
            value={filters.startDate}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, startDate: e.target.value, page: 1 }))
            }
            className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
          />

          <input
            type="date"
            aria-label="End Date"
            value={filters.endDate}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, endDate: e.target.value, page: 1 }))
            }
            className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
          />
        </div>
      </Card>

      {loading ? (
        <LoadingState message="Loading moderation activity logs..." />
      ) : error ? (
        <ErrorState
          title="Unable to load moderation logs"
          message={error}
          onRetry={fetchLogs}
        />
      ) : logs.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={hasActiveFilters ? Filter : History}
            title="No moderation logs found"
            description={
              hasActiveFilters
                ? 'No moderation activity matched your current search or date filters.'
                : 'Moderation log entries are created automatically when admins suspend/reactivate users, moderate events, or review reports.'
            }
            actionLabel={hasActiveFilters ? 'Reset Filters' : undefined}
            onAction={hasActiveFilters ? handleResetFilters : undefined}
          />
        </Card>
      ) : (
        <Card className="p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 pr-4">Timestamp</th>
                  <th className="py-3 px-4">Admin</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Affected Target</th>
                  <th className="py-3 pl-4">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 text-sm">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-surface-50/70">
                    <td className="py-3.5 pr-4 text-xs text-slate-600 whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-surface-900">
                        {log.admin?.fullName || 'Admin'}
                      </p>
                      <p className="text-xs text-slate-500">{log.admin?.email || ''}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge value={log.actionType} />
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                        {log.targetType}
                      </p>
                      <p className="text-xs text-slate-500 truncate max-w-[220px]">
                        {log.metadata?.title || log.metadata?.email || log.targetId}
                      </p>
                    </td>
                    <td className="py-3.5 pl-4 text-xs text-slate-600 max-w-xs">
                      {log.reason || <span className="italic text-slate-400">No reason recorded</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <PaginationBar
            pagination={pagination}
            onPageChange={(nextPage) => setFilters((prev) => ({ ...prev, page: nextPage }))}
          />
        </Card>
      )}
    </div>
  );
}
