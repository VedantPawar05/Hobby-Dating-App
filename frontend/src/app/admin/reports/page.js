'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Info, CheckCircle2, XCircle, AlertCircle, History } from 'lucide-react';
import adminService from '../../../services/admin.service.js';
import Card, { CardHeader, CardBody } from '../../../components/common/Card.js';
import Button from '../../../components/common/Button.js';
import LoadingState from '../../../components/common/LoadingState.js';
import ErrorState from '../../../components/common/ErrorState.js';
import EmptyState from '../../../components/common/EmptyState.js';
import ConfirmDialog from '../../../components/common/ConfirmDialog.js';
import StatusBadge from '../../../components/admin/StatusBadge.js';
import PaginationBar from '../../../components/admin/PaginationBar.js';
import { formatDateTime } from '../../../utils/formatters.js';

export default function AdminReportsPage() {
  const [reports, setReports] = useState([]);
  const [reportsPagination, setReportsPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [reportFilter, setReportFilter] = useState({ status: '', page: 1 });
  const [dependencyNote, setDependencyNote] = useState('');

  const [logs, setLogs] = useState([]);
  const [logsPagination, setLogsPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [logsPage, setLogsPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const [dialogState, setDialogState] = useState({
    open: false,
    mode: null,
    report: null,
    submitting: false,
  });

  const fetchModerationData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [reportsRes, logsRes] = await Promise.all([
        adminService.getReports({ ...reportFilter, limit: 10 }),
        adminService.getModerationLogs({ page: logsPage, limit: 10 }),
      ]);

      setReports(reportsRes?.data?.reports || []);
      if (reportsRes?.data?.pagination) setReportsPagination(reportsRes.data.pagination);
      if (reportsRes?.data?.reportingDependency?.note) {
        setDependencyNote(reportsRes.data.reportingDependency.note);
      }

      setLogs(logsRes?.data?.logs || []);
      if (logsRes?.data?.pagination) setLogsPagination(logsRes.data.pagination);
    } catch (err) {
      setError(err.message || 'Failed to load moderation records.');
    } finally {
      setLoading(false);
    }
  }, [reportFilter, logsPage]);

  useEffect(() => {
    fetchModerationData();
  }, [fetchModerationData]);

  const handleConfirmReportReview = async (notes) => {
    const { mode, report } = dialogState;
    if (!report) return;
    setDialogState((prev) => ({ ...prev, submitting: true }));
    setFeedback({ type: '', message: '' });

    try {
      await adminService.reviewReport(report._id, {
        status: mode,
        resolutionNotes: notes,
      });
      setFeedback({
        type: 'success',
        message: `Report marked as ${mode.replace('_', ' ')}.`,
      });
      setDialogState({ open: false, mode: null, report: null, submitting: false });
      fetchModerationData();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update report.' });
      setDialogState((prev) => ({ ...prev, submitting: false }));
    }
  };

  if (loading) {
    return <LoadingState message="Loading reports & moderation audit trail..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Unable to load moderation data"
        message={error}
        onRetry={fetchModerationData}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-surface-900">
          Reports &amp; Moderation
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Review submitted user/event reports and inspect the persistent admin moderation audit log.
        </p>
      </div>

      {/* Transparent Dependency Notice */}
      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Admin-Side Reporting Foundation Active:</span>{' '}
          {dependencyNote ||
            'Public user-facing report submission endpoints have not been built yet. Reports submitted once that module ships will appear here automatically, while all user and event moderation actions are logged below right now.'}
        </div>
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

      {/* Reports Queue */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <h2 className="text-base font-bold text-surface-900">Submitted Reports</h2>
          </div>
          <select
            value={reportFilter.status}
            onChange={(e) => setReportFilter({ status: e.target.value, page: 1 })}
            className="px-3 py-1.5 text-xs border border-surface-200 rounded-lg bg-white"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="under_review">Under Review</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </CardHeader>
        <CardBody>
          {reports.length === 0 ? (
            <EmptyState
              icon={ShieldAlert}
              title="No submitted reports"
              description="No reports exist in the database yet. Once user-facing reporting endpoints are connected, incoming reports will appear here for review."
            />
          ) : (
            <>
              <div className="space-y-3">
                {reports.map((report) => (
                  <div
                    key={report._id}
                    className="p-4 rounded-xl border border-surface-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge value={report.status} />
                        <StatusBadge value={report.targetType} />
                        <span className="text-xs text-slate-500">
                          {formatDateTime(report.createdAt)}
                        </span>
                      </div>
                      <p className="font-semibold text-sm text-surface-900">{report.reason}</p>
                      {report.details && (
                        <p className="text-xs text-slate-600">{report.details}</p>
                      )}
                      <p className="text-xs text-slate-500">
                        Reported by {report.reportedBy?.fullName || 'Member'}
                      </p>
                    </div>

                    {['open', 'under_review'].includes(report.status) && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() =>
                            setDialogState({
                              open: true,
                              mode: 'resolved',
                              report,
                              submitting: false,
                            })
                          }
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Resolve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setDialogState({
                              open: true,
                              mode: 'dismissed',
                              report,
                              submitting: false,
                            })
                          }
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          Dismiss
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <PaginationBar
                pagination={reportsPagination}
                onPageChange={(page) => setReportFilter((prev) => ({ ...prev, page }))}
              />
            </>
          )}
        </CardBody>
      </Card>

      {/* Moderation Audit Log */}
      <Card>
        <CardHeader className="flex items-center gap-2">
          <History className="w-4 h-4 text-brand-700" />
          <h2 className="text-base font-bold text-surface-900">Moderation Action Log</h2>
        </CardHeader>
        <CardBody>
          {logs.length === 0 ? (
            <EmptyState
              icon={History}
              title="No moderation actions yet"
              description="User suspensions, reactivations, and event approvals or rejections will be logged here automatically."
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-surface-200 text-xs uppercase text-slate-500">
                      <th className="py-2.5 pr-4 font-semibold">Action</th>
                      <th className="py-2.5 px-4 font-semibold">Target</th>
                      <th className="py-2.5 px-4 font-semibold">Reason / Notes</th>
                      <th className="py-2.5 px-4 font-semibold">Admin</th>
                      <th className="py-2.5 pl-4 font-semibold text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {logs.map((log) => (
                      <tr key={log._id}>
                        <td className="py-3 pr-4 font-semibold text-surface-900 capitalize">
                          {log.actionType.replace(/_/g, ' ')}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge value={log.targetType} />
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                          {log.reason || '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {log.admin?.fullName || 'Admin'}
                        </td>
                        <td className="py-3 pl-4 text-right text-slate-500 whitespace-nowrap">
                          {formatDateTime(log.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationBar pagination={logsPagination} onPageChange={setLogsPage} />
            </>
          )}
        </CardBody>
      </Card>

      <ConfirmDialog
        isOpen={dialogState.open}
        title={
          dialogState.mode === 'resolved' ? 'Resolve this report?' : 'Dismiss this report?'
        }
        description="Update the report status and record resolution notes in the moderation log."
        confirmLabel={dialogState.mode === 'resolved' ? 'Mark Resolved' : 'Dismiss Report'}
        confirmVariant={dialogState.mode === 'resolved' ? 'primary' : 'secondary'}
        showReason
        requireReason={false}
        reasonLabel="Resolution Notes"
        reasonPlaceholder="Optional notes describing the moderation outcome..."
        loading={dialogState.submitting}
        onConfirm={handleConfirmReportReview}
        onClose={() =>
          setDialogState({ open: false, mode: null, report: null, submitting: false })
        }
      />
    </div>
  );
}

