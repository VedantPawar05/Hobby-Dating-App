'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  UserCheck,
  UserX,
  Eye,
  X,
  CheckCircle2,
  AlertCircle,
  Users as UsersIcon,
} from 'lucide-react';
import adminService from '../../../services/admin.service.js';
import Card from '../../../components/common/Card.js';
import Button from '../../../components/common/Button.js';
import LoadingState from '../../../components/common/LoadingState.js';
import ErrorState from '../../../components/common/ErrorState.js';
import EmptyState from '../../../components/common/EmptyState.js';
import ConfirmDialog from '../../../components/common/ConfirmDialog.js';
import StatusBadge from '../../../components/admin/StatusBadge.js';
import PaginationBar from '../../../components/admin/PaginationBar.js';
import { formatDate } from '../../../utils/formatters.js';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({ search: '', role: '', isActive: '', page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Detail modal state
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Confirm suspension / reactivation dialog state
  const [dialogState, setDialogState] = useState({
    open: false,
    mode: null,
    user: null,
    submitting: false,
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getUsers({ ...filters, limit: 10 });
      setUsers(res?.data?.users || []);
      if (res?.data?.pagination) setPagination(res.data.pagination);
    } catch (err) {
      setError(err.message || 'Failed to load registered users.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenDetails = async (userId) => {
    setDetailsLoading(true);
    setSelectedDetails({ loading: true });
    try {
      const res = await adminService.getUserDetails(userId);
      setSelectedDetails(res?.data || null);
    } catch (err) {
      setSelectedDetails(null);
      setFeedback({ type: 'error', message: err.message || 'Could not load user details.' });
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleConfirmAction = async (reason) => {
    const { mode, user } = dialogState;
    if (!user) return;
    setDialogState((prev) => ({ ...prev, submitting: true }));
    setFeedback({ type: '', message: '' });

    try {
      if (mode === 'suspend') {
        await adminService.suspendUser(user._id, reason);
        setFeedback({ type: 'success', message: `${user.fullName}'s account has been suspended.` });
      } else {
        await adminService.reactivateUser(user._id, reason);
        setFeedback({ type: 'success', message: `${user.fullName}'s account has been reactivated.` });
      }
      setDialogState({ open: false, mode: null, user: null, submitting: false });
      fetchUsers();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Action failed.' });
      setDialogState((prev) => ({ ...prev, submitting: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-surface-900">User Management</h1>
        <p className="text-sm text-slate-600 mt-1">
          Search registered members, inspect account details, and suspend or reactivate accounts.
        </p>
      </div>

      {feedback.message && (
        <div
          className={`p-3.5 rounded-xl text-sm flex items-center ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 mr-2 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
              placeholder="Search by name or email..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
            />
          </div>
          <select
            value={filters.role}
            onChange={(e) => setFilters((prev) => ({ ...prev, role: e.target.value, page: 1 }))}
            className="px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white focus:outline-none focus:border-brand-600"
          >
            <option value="">All Roles</option>
            <option value="user">User</option>
            <option value="organizer">Organizer</option>
            <option value="admin">Admin</option>
          </select>
          <select
            value={filters.isActive}
            onChange={(e) => setFilters((prev) => ({ ...prev, isActive: e.target.value, page: 1 }))}
            className="px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white focus:outline-none focus:border-brand-600"
          >
            <option value="">All Statuses</option>
            <option value="true">Active</option>
            <option value="false">Suspended</option>
          </select>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="p-4 sm:p-5">
        {loading ? (
          <LoadingState message="Loading users..." />
        ) : error ? (
          <ErrorState title="Could not load users" message={error} onRetry={fetchUsers} />
        ) : users.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="No matching users found"
            description="Adjust your search query or filters to see other registered accounts."
            actionLabel="Clear filters"
            onAction={() => setFilters({ search: '', role: '', isActive: '', page: 1 })}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-surface-200 text-xs uppercase text-slate-500">
                    <th className="py-3 pr-4 font-semibold">Member</th>
                    <th className="py-3 px-4 font-semibold">City</th>
                    <th className="py-3 px-4 font-semibold">Role</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 pl-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-surface-50/70">
                      <td className="py-3.5 pr-4">
                        <p className="font-semibold text-surface-900">{u.fullName}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{u.city}</td>
                      <td className="py-3.5 px-4">
                        <StatusBadge value={u.role} />
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge value={u.isActive ? 'active' : 'suspended'} />
                      </td>
                      <td className="py-3.5 pl-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDetails(u._id)}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            View
                          </Button>
                          {u.role !== 'admin' &&
                            (u.isActive ? (
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() =>
                                  setDialogState({
                                    open: true,
                                    mode: 'suspend',
                                    user: u,
                                    submitting: false,
                                  })
                                }
                              >
                                <UserX className="w-3.5 h-3.5 mr-1" />
                                Suspend
                              </Button>
                            ) : (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() =>
                                  setDialogState({
                                    open: true,
                                    mode: 'reactivate',
                                    user: u,
                                    submitting: false,
                                  })
                                }
                              >
                                <UserCheck className="w-3.5 h-3.5 mr-1" />
                                Reactivate
                              </Button>
                            ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationBar
              pagination={pagination}
              onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
            />
          </>
        )}
      </Card>

      {/* User Details Modal */}
      {selectedDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white border border-surface-200 rounded-2xl max-w-lg w-full shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-surface-900">Account Details</h3>
              <button
                type="button"
                onClick={() => setSelectedDetails(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 max-h-[75vh] overflow-y-auto">
              {detailsLoading || selectedDetails.loading ? (
                <LoadingState message="Loading account details..." />
              ) : (
                <div className="space-y-4 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-bold text-surface-900">
                        {selectedDetails.user?.fullName}
                      </p>
                      <p className="text-slate-500">{selectedDetails.user?.email}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <StatusBadge value={selectedDetails.user?.role} />
                      <StatusBadge
                        value={selectedDetails.user?.isActive ? 'active' : 'suspended'}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 bg-surface-50 p-3.5 rounded-xl border border-surface-100 text-xs">
                    <div>
                      <p className="text-slate-500">City</p>
                      <p className="font-semibold text-surface-900">{selectedDetails.user?.city}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Joined</p>
                      <p className="font-semibold text-surface-900">
                        {formatDate(selectedDetails.user?.createdAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Bookings</p>
                      <p className="font-semibold text-surface-900">
                        {selectedDetails.activitySummary?.bookingsCount ?? 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Hosted Events</p>
                      <p className="font-semibold text-surface-900">
                        {selectedDetails.activitySummary?.hostedEventsCount ?? 0}
                      </p>
                    </div>
                  </div>
                  {selectedDetails.user?.bio && (
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-500 mb-1">Bio</p>
                      <p className="text-slate-700">{selectedDetails.user.bio}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Suspend / Reactivate Confirmation */}
      <ConfirmDialog
        isOpen={dialogState.open}
        title={
          dialogState.mode === 'suspend'
            ? `Suspend ${dialogState.user?.fullName}?`
            : `Reactivate ${dialogState.user?.fullName}?`
        }
        description={
          dialogState.mode === 'suspend'
            ? 'Suspending this account will immediately block sign-in and invalidate authenticated requests until reactivated.'
            : 'Reactivating this account restores normal login and booking access.'
        }
        confirmLabel={dialogState.mode === 'suspend' ? 'Suspend Account' : 'Reactivate Account'}
        confirmVariant={dialogState.mode === 'suspend' ? 'danger' : 'primary'}
        showReason
        requireReason={dialogState.mode === 'suspend'}
        reasonPlaceholder={
          dialogState.mode === 'suspend'
            ? 'Explain why this account is being suspended...'
            : 'Optional note for reactivation audit log...'
        }
        loading={dialogState.submitting}
        onConfirm={handleConfirmAction}
        onClose={() => setDialogState({ open: false, mode: null, user: null, submitting: false })}
      />
    </div>
  );
}

