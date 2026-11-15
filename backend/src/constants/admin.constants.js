/**
 * Admin moderation and reporting constants.
 */

export const MODERATION_ACTIONS = {
  SUSPEND_USER: 'suspend_user',
  REACTIVATE_USER: 'reactivate_user',
  UPDATE_USER_ROLE: 'update_user_role',
  APPROVE_ORGANIZER_APPLICATION: 'approve_organizer_application',
  REJECT_ORGANIZER_APPLICATION: 'reject_organizer_application',
  APPROVE_EVENT: 'approve_event',
  REJECT_EVENT: 'reject_event',
  CANCEL_EVENT: 'cancel_event',
  CANCEL_BOOKING: 'cancel_booking',
  REVIEW_REPORT: 'review_report',
  RESOLVE_REPORT: 'resolve_report',
  DISMISS_REPORT: 'dismiss_report',
};

export const ALLOWED_MODERATION_ACTIONS = Object.values(MODERATION_ACTIONS);

export const MODERATION_TARGET_TYPES = {
  USER: 'user',
  EVENT: 'event',
  BOOKING: 'booking',
  REPORT: 'report',
  ORGANIZER_APPLICATION: 'organizer_application',
  MESSAGE: 'message',
};

export const ALLOWED_MODERATION_TARGET_TYPES = Object.values(MODERATION_TARGET_TYPES);

export const REPORT_TARGET_TYPES = {
  USER: 'user',
  EVENT: 'event',
  MESSAGE: 'message',
};

export const ALLOWED_REPORT_TARGET_TYPES = Object.values(REPORT_TARGET_TYPES);

export const REPORT_STATUSES = {
  OPEN: 'open',
  UNDER_REVIEW: 'under_review',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
};

export const ALLOWED_REPORT_STATUSES = Object.values(REPORT_STATUSES);
