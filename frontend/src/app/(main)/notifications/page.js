'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Trash2,
  HeartHandshake,
  Calendar,
  Award,
  ShieldAlert,
  Sparkles,
  Ban,
  ExternalLink,
} from 'lucide-react';
import ProtectedRoute from '../../../components/auth/ProtectedRoute.js';
import notificationService from '../../../services/notification.service.js';
import Card from '../../../components/common/Card.js';
import Button from '../../../components/common/Button.js';
import LoadingState from '../../../components/common/LoadingState.js';
import ErrorState from '../../../components/common/ErrorState.js';
import EmptyState from '../../../components/common/EmptyState.js';
import PaginationBar from '../../../components/admin/PaginationBar.js';
import { formatDateTime } from '../../../utils/formatters.js';

function getNotificationIcon(type) {
  switch (type) {
    case 'mutual_match':
      return <HeartHandshake className="w-5 h-5 text-rose-500 shrink-0" />;
    case 'booking_confirmed':
      return <Calendar className="w-5 h-5 text-emerald-600 shrink-0" />;
    case 'booking_cancelled':
    case 'event_cancelled':
      return <Ban className="w-5 h-5 text-red-500 shrink-0" />;
    case 'organizer_application_approved':
    case 'organizer_application_submitted':
      return <Award className="w-5 h-5 text-brand-600 shrink-0" />;
    case 'organizer_application_rejected':
    case 'event_rejected':
    case 'admin_new_report':
      return <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />;
    case 'event_approved':
      return <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />;
    default:
      return <Bell className="w-5 h-5 text-brand-600 shrink-0" />;
  }
}

function NotificationsContent() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'unread'
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 15 };
      if (filterTab === 'unread') {
        params.isRead = false;
      }
      const res = await notificationService.getNotifications(params);
      setNotifications(res?.data?.notifications || []);
      if (res?.data?.pagination) {
        setPagination(res.data.pagination);
      }
      if (typeof res?.data?.unreadCount === 'number') {
        setUnreadCount(res.data.unreadCount);
      }
    } catch (err) {
      setError(err.message || 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  }, [page, filterTab]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // Ignore
    }
  };

  const handleMarkAllAsRead = async () => {
    setActionLoading('read-all');
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      setError(err.message || 'Failed to mark all as read.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (notificationId) => {
    setActionLoading(notificationId);
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
      fetchNotifications();
    } catch (err) {
      setError(err.message || 'Failed to delete notification.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleNotificationClick = (notif) => {
    if (!notif.isRead) {
      handleMarkAsRead(notif._id);
    }
    if (notif.link) {
      router.push(notif.link);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-surface-900">
            Notifications
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Stay informed about your event bookings, mutual matches, hosting updates, and platform activity.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            loading={actionLoading === 'read-all'}
          >
            <CheckCheck className="w-4 h-4 mr-1.5" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-surface-200 pb-2">
        <button
          type="button"
          onClick={() => {
            setFilterTab('all');
            setPage(1);
          }}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors ${
            filterTab === 'all'
              ? 'bg-brand-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-surface-100 hover:text-surface-900'
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => {
            setFilterTab('unread');
            setPage(1);
          }}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
            filterTab === 'unread'
              ? 'bg-brand-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-surface-100 hover:text-surface-900'
          }`}
        >
          <span>Unread</span>
          {unreadCount > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                filterTab === 'unread'
                  ? 'bg-white/30 text-white'
                  : 'bg-rose-500 text-white font-semibold'
              }`}
            >
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <LoadingState message="Loading your notifications..." />
      ) : error ? (
        <ErrorState title="Unable to load notifications" message={error} onRetry={fetchNotifications} />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={filterTab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          description={
            filterTab === 'unread'
              ? 'You are all caught up! Check back when you book activities or connect with attendees.'
              : 'You will receive updates about event registrations, QR passes, mutual matches, and host applications here.'
          }
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <Card
              key={notif._id}
              className={`p-4 transition-colors ${
                notif.isRead
                  ? 'bg-white hover:border-surface-300'
                  : 'bg-brand-50/30 border-brand-200 hover:bg-brand-50/50 shadow-2xs'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-white border border-surface-200 shadow-2xs mt-0.5">
                  {getNotificationIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <h2 className="text-sm font-bold text-surface-900 truncate">{notif.title}</h2>
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-brand-600 shrink-0" />
                      )}
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">
                      {formatDateTime(notif.createdAt)}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed">{notif.message}</p>

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {notif.link && (
                        <button
                          type="button"
                          onClick={() => handleNotificationClick(notif)}
                          className="text-xs font-semibold text-brand-700 hover:text-brand-900 inline-flex items-center gap-1"
                        >
                          <span>Open details</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center space-x-1">
                      {!notif.isRead && (
                        <button
                          type="button"
                          onClick={() => handleMarkAsRead(notif._id)}
                          className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 hover:bg-surface-100 rounded-lg transition-colors"
                          title="Mark as read"
                        >
                          Mark read
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(notif._id)}
                        disabled={actionLoading === notif._id}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete notification"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}

          <PaginationBar
            pagination={pagination}
            onPageChange={(nextPage) => setPage(nextPage)}
          />
        </div>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <ProtectedRoute>
      <NotificationsContent />
    </ProtectedRoute>
  );
}

