/**
 * Organizer application workflow constants and enumerations.
 */

export const ORGANIZER_APPLICATION_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const ALLOWED_ORGANIZER_APPLICATION_STATUSES = Object.values(
  ORGANIZER_APPLICATION_STATUSES
);

