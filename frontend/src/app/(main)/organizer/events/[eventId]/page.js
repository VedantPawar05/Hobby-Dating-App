'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  QrCode,
  Camera,
  CameraOff,
  CheckCircle2,
  AlertCircle,
  Users,
  Flag,
} from 'lucide-react';
import ProtectedRoute from '../../../../../components/auth/ProtectedRoute.js';
import { useAuth } from '../../../../../context/AuthContext.js';
import eventService from '../../../../../services/event.service.js';
import Card, { CardHeader, CardBody } from '../../../../../components/common/Card.js';
import Button from '../../../../../components/common/Button.js';
import LoadingState from '../../../../../components/common/LoadingState.js';
import ErrorState from '../../../../../components/common/ErrorState.js';
import EmptyState from '../../../../../components/common/EmptyState.js';
import StatusBadge from '../../../../../components/admin/StatusBadge.js';
import PaginationBar from '../../../../../components/admin/PaginationBar.js';
import ReportModal from '../../../../../components/common/ReportModal.js';
import { formatDateTime } from '../../../../../utils/formatters.js';

function OrganizerEventManageContent() {
  const { eventId } = useParams();
  const { user } = useAuth();

  const [event, setEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Check-in scanner state
  const [manualInput, setManualInput] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [scanFeedback, setScanFeedback] = useState({ type: '', message: '' });
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraNotice, setCameraNotice] = useState('');
  const [reportTarget, setReportTarget] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanLoopRef = useRef(null);
  const processingCodeRef = useRef(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [eventRes, attendeesRes] = await Promise.all([
        eventService.getEventById(eventId),
        eventService.getEventAttendees(eventId, { page, limit: 20 }),
      ]);
      setEvent(eventRes?.data?.event || null);
      setAttendees(attendeesRes?.data?.attendees || []);
      if (attendeesRes?.data?.pagination) {
        setPagination(attendeesRes.data.pagination);
      }
    } catch (err) {
      setError(err.message || 'Unable to load event attendees or permissions.');
    } finally {
      setLoading(false);
    }
  }, [eventId, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stopCamera = useCallback(() => {
    if (scanLoopRef.current) {
      clearInterval(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const submitCheckIn = useCallback(
    async (rawInput) => {
      const trimmed = String(rawInput || '').trim();
      if (!trimmed || processingCodeRef.current) return;

      processingCodeRef.current = true;
      setCheckingIn(true);
      setScanFeedback({ type: '', message: '' });

      try {
        const payload = trimmed.startsWith('{')
          ? { qrData: trimmed }
          : { checkInCode: trimmed };
        const res = await eventService.checkInAttendee(eventId, payload);
        const checkedBooking = res?.data?.booking;
        setScanFeedback({
          type: 'success',
          message: `${checkedBooking?.user?.fullName || 'Attendee'} checked in at ${formatDateTime(
            checkedBooking?.checkedInAt || new Date()
          )}.`,
        });
        setManualInput('');
        await loadData();
      } catch (err) {
        const firstValidation = err?.errors?.[0]?.message;
        setScanFeedback({
          type: 'error',
          message: firstValidation || err.message || 'Check-in verification failed.',
        });
      } finally {
        setCheckingIn(false);
        processingCodeRef.current = false;
      }
    },
    [eventId, loadData]
  );

  const startCameraScanner = async () => {
    setCameraNotice('');
    if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
      setCameraNotice(
        'Camera access is unavailable in this browser context. Enter the 16-character ticket code manually below.'
      );
      return;
    }

    if (typeof window.BarcodeDetector === 'undefined') {
      setCameraNotice(
        'Automatic browser QR decoding (BarcodeDetector) is not supported in this browser. Enter or scan-gun paste the code manually below.'
      );
      return;
    }

    try {
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setCameraActive(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);

      scanLoopRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2 || processingCodeRef.current) {
          return;
        }
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0 && barcodes[0].rawValue) {
            await submitCheckIn(barcodes[0].rawValue);
            stopCamera();
          }
        } catch {
          // Ignore transient frame detection errors
        }
      }, 600);
    } catch {
      stopCamera();
      setCameraNotice(
        'Camera permission denied or no camera available. Use manual ticket code entry below.'
      );
    }
  };

  if (loading) {
    return <LoadingState message="Loading event attendees & scanner..." />;
  }

  if (error || !event) {
    return (
      <div className="space-y-4">
        <Link
          href="/organizer"
          className="inline-flex items-center text-xs font-semibold text-surface-600 hover:text-surface-900"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to Organizer Studio
        </Link>
        <ErrorState
          title="Unable to load event roster"
          message={error || 'Event unavailable.'}
          onRetry={loadData}
        />
      </div>
    );
  }

  const checkedInCount = attendees.filter((a) => a.checkedIn).length;
  const canCheckIn = ['published', 'completed'].includes(event.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <Link
            href="/organizer"
            className="inline-flex items-center text-xs font-semibold text-surface-600 hover:text-surface-900"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to Organizer Studio
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold text-surface-900">{event.title}</h1>
            <StatusBadge value={event.status} />
          </div>
          <p className="text-xs text-slate-600">
            {formatDateTime(event.startDateTime)} • {event.location?.city} • {event.bookedCount ?? 0} /{' '}
            {event.capacity} booked • {checkedInCount} checked in on this page
          </p>
        </div>
      </div>

      {/* QR Check-In Scanner & Code Verification */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-brand-700" />
            <h2 className="text-base font-bold text-surface-900">QR Ticket Check-In</h2>
          </div>
          {canCheckIn && (
            <div>
              {cameraActive ? (
                <Button variant="outline" size="sm" onClick={stopCamera}>
                  <CameraOff className="w-3.5 h-3.5 mr-1.5" />
                  Stop Camera
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={startCameraScanner}>
                  <Camera className="w-3.5 h-3.5 mr-1.5" />
                  Scan with Camera
                </Button>
              )}
            </div>
          )}
        </CardHeader>
        <CardBody className="space-y-4">
          {!canCheckIn && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              Check-in is only enabled once this event is <strong>Published</strong> or{' '}
              <strong>Completed</strong> (current status: {event.status}).
            </div>
          )}

          {cameraNotice && (
            <div className="p-3 rounded-xl bg-surface-100 border border-surface-200 text-slate-700 text-xs">
              {cameraNotice}
            </div>
          )}

          {cameraActive && (
            <div className="max-w-sm rounded-xl overflow-hidden border border-surface-200 bg-black">
              <video ref={videoRef} className="w-full h-56 object-cover" muted playsInline />
            </div>
          )}

          {scanFeedback.message && (
            <div
              className={`p-3.5 rounded-xl text-sm flex items-center ${
                scanFeedback.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {scanFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 mr-2 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
              )}
              <span>{scanFeedback.message}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitCheckIn(manualInput);
            }}
            className="flex flex-col sm:flex-row gap-2.5"
          >
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              disabled={!canCheckIn || checkingIn}
              placeholder="Enter 16-character ticket code or paste QR payload..."
              className="flex-1 px-3.5 py-2 text-sm font-mono border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
            />
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={checkingIn}
              disabled={!canCheckIn || !manualInput.trim()}
            >
              Verify &amp; Check In
            </Button>
          </form>
        </CardBody>
      </Card>

      {/* Confirmed Attendees Roster */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-700" />
            <h2 className="text-base font-bold text-surface-900">
              Confirmed Attendees ({pagination.total})
            </h2>
          </div>
        </CardHeader>
        <CardBody>
          {attendees.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No confirmed attendees yet"
              description="Members who book this activity will appear here with their check-in status."
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-surface-200 text-xs uppercase text-slate-500">
                      <th className="py-3 pr-4 font-semibold">Attendee</th>
                      <th className="py-3 px-4 font-semibold">City</th>
                      <th className="py-3 px-4 font-semibold">Booked At</th>
                      <th className="py-3 px-4 font-semibold">Check-In Status</th>
                      <th className="py-3 pl-4 text-right font-semibold">Safety</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {attendees.map((row) => (
                      <tr key={row.bookingId} className="hover:bg-surface-50/70">
                        <td className="py-3 pr-4">
                          <p className="font-semibold text-surface-900">
                            {row.user?.fullName || 'Member'}
                          </p>
                          <p className="text-xs text-slate-500">{row.user?.email}</p>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          {row.user?.city || '—'}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                          {formatDateTime(row.bookedAt)}
                        </td>
                        <td className="py-3 px-4">
                          {row.checkedIn ? (
                            <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Checked in {row.checkedInAt ? formatDateTime(row.checkedInAt) : ''}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">Awaiting check-in</span>
                          )}
                        </td>
                        <td className="py-3 pl-4 text-right">
                          {row.user?._id && row.user._id !== user?._id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setReportTarget(row.user)}
                              className="text-slate-500 hover:text-rose-600"
                            >
                              <Flag className="w-3.5 h-3.5 mr-1" />
                              Report
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationBar pagination={pagination} onPageChange={setPage} />
            </>
          )}
        </CardBody>
      </Card>

      <ReportModal
        isOpen={Boolean(reportTarget)}
        targetType="user"
        targetId={reportTarget?._id}
        targetLabel={reportTarget?.fullName}
        onClose={() => setReportTarget(null)}
      />
    </div>
  );
}

export default function OrganizerEventManagePage() {
  return (
    <ProtectedRoute>
      <OrganizerEventManageContent />
    </ProtectedRoute>
  );
}
