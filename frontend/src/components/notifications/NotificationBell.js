'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Check,
  CheckCheck,
  HeartHandshake,
  Calendar,
  Award,
  ShieldAlert,
  Sparkles,
  Ban,
  ArrowRight,
} from 'lucide-react';
import notificationService from '../../services/notification.service.js';
import { formatDateTime } from '../../utils/formatters.js';

function getNotificationIcon(type) {
  switch (type) {
    case 'mutual_match':
      return <HeartHandshake className="w-4 h-4 text-rose-500 shrink-0" />;
    case 'booking_confirmed':
      return <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />;
    case 'booking_cancelled':
    case 'event_cancelled':
      return <Ban className="w-4 h-4 text-red-500 shrink-0" />;
    case 'organizer_application_approved':
    case 'organizer_application_submitted':
      return <Award className="w-4 h-4 text-brand-600 shrink-0" />;
    case 'organizer_application_rejected':
    case 'event_rejected':
    case 'admin_new_report':
      return <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />;
    case 'event_approved':
      return <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />;
    default:
      return <Bell className="w-4 h-4 text-brand-600 shrink-0" />;
  }
}

export function NotificationBell() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await notificationService.getUnreadCount();
      setUnreadCount(res?.data?.unreadCount || 0);
    } catch {
      // Ignore background unread polling errors
    }
  }, []);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleToggle = async () => {
    const nextState = !isOpen;
    setIsOpen(nextState);

    if (nextState) {
      setLoading(true);
      try {
        const res = await notificationService.getNotifications({ limit: 5 });
        setNotifications(res?.data?.notifications || []);
        if (typeof res?.data?.unreadCount === 'number') {
          setUnreadCount(res.data.unreadCount);
        }
      } catch {
        // Handle gracefully
      } finally {
        setLoading(false);
      }
    }
  };

  const handleItemClick = async (notif) => {
    if (!notif.isRead) {
      try {
        await notificationService.markAsRead(notif._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // Continue navigation regardless
      }
    }

    setIsOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Ignore
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="relative p-2 rounded-xl text-surface-600 hover:text-surface-900 hover:bg-surface-100 transition-colors focus:outline-none"
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-500 rounded-full ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-surface-200 rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[480px]">
          {/* Header */}
          <div className="px-4 py-3 border-b border-surface-100 flex items-center justify-between bg-surface-50">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-surface-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-brand-100 text-brand-800">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs text-brand-700 hover:text-brand-900 font-medium inline-flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List Content */}
          <div className="divide-y divide-surface-100 overflow-y-auto flex-1">
            {loading ? (
              <div className="p-6 text-center text-xs text-slate-500">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center space-y-1">
                <Bell className="w-6 h-6 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-surface-800">No notifications yet</p>
                <p className="text-[11px] text-slate-500">
                  Updates on your bookings, matches, and hosting will appear here.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => handleItemClick(notif)}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                    notif.isRead
                      ? 'bg-white hover:bg-surface-50 text-slate-600'
                      : 'bg-brand-50/40 hover:bg-brand-50/70 text-surface-900'
                  }`}
                >
                  <div className="p-2 rounded-xl bg-white border border-surface-200 shadow-2xs mt-0.5">
                    {getNotificationIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs font-bold truncate ${notif.isRead ? 'text-surface-800' : 'text-surface-900'}`}>
                        {notif.title}
                      </p>
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-brand-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-slate-400 pt-0.5">
                      {formatDateTime(notif.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-surface-100 bg-surface-50 text-center">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-brand-700 hover:text-brand-900 inline-flex items-center gap-1"
            >
              <span>View all notifications</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;

