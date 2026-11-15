/**
 * In-app notification types and enumerations.
 */

export const NOTIFICATION_TYPES = {
  ORGANIZER_APPLICATION_SUBMITTED: 'organizer_application_submitted',
  ORGANIZER_APPLICATION_APPROVED: 'organizer_application_approved',
  ORGANIZER_APPLICATION_REJECTED: 'organizer_application_rejected',
  BOOKING_CONFIRMED: 'booking_confirmed',
  BOOKING_CANCELLED: 'booking_cancelled',
  EVENT_APPROVED: 'event_approved',
  EVENT_REJECTED: 'event_rejected',
  EVENT_CANCELLED: 'event_cancelled',
  EVENT_UPDATED: 'event_updated',
  MUTUAL_MATCH: 'mutual_match',
  ADMIN_NEW_APPLICATION: 'admin_new_application',
  ADMIN_NEW_REPORT: 'admin_new_report',
};

export const ALLOWED_NOTIFICATION_TYPES = Object.values(NOTIFICATION_TYPES);

export const NOTIFICATION_ENTITY_TYPES = {
  EVENT: 'event',
  BOOKING: 'booking',
  MATCH: 'match',
  ORGANIZER_APPLICATION: 'organizer_application',
  REPORT: 'report',
};

export const ALLOWED_NOTIFICATION_ENTITY_TYPES = Object.values(
  NOTIFICATION_ENTITY_TYPES
);

